
import express, { Request, Response, RequestHandler } from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import path from 'path';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = process.env.DATABASE_PATH || "leaderboard.db";
const db = new Database(dbPath);

// Create leaderboard table and add columns if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER UNIQUE,
    character_name TEXT,
    total_value INTEGER,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    image_data BLOB,
    image_content_type TEXT,
    image_fetched_at DATETIME
  )
`);
console.log("Database initialized successfully");

// API Routes

app.post('/api/search-character', async (req, res) => {
  try {
    const { name } = req.body;
    const response = await fetch(
      "https://esi.evetech.net/latest/universe/ids/?datasource=tranquility&language=en",
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Accept-Language": "en",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify([name]),
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to search character" });
  }
});

app.post('/api/lookup-character', async (req, res) => {
  try {
    const { characterId } = req.body;
    const response = await fetch(
      "https://esi.evetech.net/latest/universe/names/?datasource=tranquility",
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify([characterId]),
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to lookup character" });
  }
});

app.post('/api/process-character', async (req, res) => {
    try {
        const { characterId, characterName } = req.body;

        // Fetch killmail data from Zkillboard with pagination
        const allKillmails = [];
        let page = 1;
        let hasMorePages = true;

        while (hasMorePages) {
            const url = `https://zkillboard.com/api/characterID/${characterId}/abyssal/page/${page}/`;
            console.log(`Fetching page ${page} from: ${url}`);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Abyssal Feeders - Felix Allistar <felixallistar@gmail.com>',
                    'Accept-Encoding': 'gzip',
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                console.warn(`Failed to fetch page ${page}: ${response.status}`);
                break;
            }

            const pageKillmails = await response.json();

            if (pageKillmails.length === 0 || pageKillmails.length < 200) {
                allKillmails.push(...pageKillmails);
                hasMorePages = false;
            } else {
                allKillmails.push(...pageKillmails);
                page++;
            }
        }

        const totalValue = allKillmails.reduce((sum, killmail) => sum + (killmail.zkb?.totalValue || 0), 0);

        // Fetch and cache character portrait
        let imageData = null;
        let imageContentType = null;
        let imageFetchedAt = new Date().toISOString();
        try {
            const imageUrl = `https://images.evetech.net/characters/${characterId}/portrait?tenant=tranquility&size=64`;
            const imageResponse = await fetch(imageUrl);
            if (imageResponse.ok) {
                const arrayBuffer = await imageResponse.arrayBuffer();
                imageData = Buffer.from(arrayBuffer);
                imageContentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            }
        } catch (e) {
            console.error('Image fetch error:', e);
        }

        const stmt = db.prepare(`
            INSERT INTO leaderboard (character_id, character_name, total_value, last_updated, image_data, image_content_type, image_fetched_at)
            VALUES (?, ?, ?, datetime('now'), ?, ?, ?)
            ON CONFLICT(character_id) DO UPDATE SET
            total_value = excluded.total_value,
            last_updated = excluded.last_updated,
            image_data = excluded.image_data,
            image_content_type = excluded.image_content_type,
            image_fetched_at = excluded.image_fetched_at
        `);
        stmt.run(characterId, characterName, totalValue, imageData, imageContentType, imageFetchedAt);

        res.json({
            characterId,
            characterName,
            totalValue,
            killmailCount: allKillmails.length,
        });

    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ error: "Failed to process character" });
    }
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT character_id, character_name, total_value, last_updated
      FROM leaderboard
      ORDER BY total_value DESC
      LIMIT 50
    `);
    const leaderboard = stmt.all();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
});

app.get('/api/character-image/:id', (async (req: Request<{ id: string }>, res: Response) => {
    try {
        const characterId = parseInt(req.params.id, 10);
        const stmt = db.prepare(`
            SELECT image_data, image_content_type, image_fetched_at
            FROM leaderboard WHERE character_id = ?
        `);
        const result = stmt.get(characterId) as { image_data: Buffer | null, image_content_type: string | null, image_fetched_at: string | null } | undefined;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let needsFetch = false;

        if (!result || !result.image_data || !result.image_fetched_at || new Date(result.image_fetched_at) < sevenDaysAgo) {
          needsFetch = true;
        }

        let imageData = result?.image_data || null;
        let contentType = result?.image_content_type || null;

        // If we need to fetch or refresh the image
        if (needsFetch) {
          try {
            const imageUrl = `https://images.evetech.net/characters/${characterId}/portrait?tenant=tranquility&size=64`;
            const imageResponse = await fetch(imageUrl);

            if (imageResponse.ok) {
              const arrayBuffer = await imageResponse.arrayBuffer();
              imageData = Buffer.from(arrayBuffer);
              contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

              // Update the database with new image data
              const updateStmt = db.prepare(`
                UPDATE leaderboard
                SET image_data = ?, image_content_type = ?, image_fetched_at = datetime('now')
                WHERE character_id = ?
              `);

              updateStmt.run(imageData, contentType, characterId);
              console.log(`Refreshed portrait for character ${characterId}`);
            } else {
              console.warn(`Failed to fetch portrait for character ${characterId}: ${imageResponse.status}`);
              // If fetch fails and we have old cached data, use it if available
              if (!result?.image_data) {
                return res.status(404).send("Character portrait not found");
              }
            }
          } catch (fetchError) {
            console.warn(`Error fetching portrait for character ${characterId}:`, fetchError);
            // If fetch fails and we have old cached data, use it if available
            if (!result?.image_data) {
              return res.status(500).send("Failed to fetch character portrait");
            }
          }
        }

        // Serve the image
        if (imageData && contentType) {
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
          res.send(imageData);
        } else {
          return res.status(404).send("Character portrait not available");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}) as RequestHandler<{ id: string }>);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.resolve(__dirname, '../../dist');
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Cleanup database on exit
process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});
