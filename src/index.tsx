import { serve } from "bun";
import { Database } from "bun:sqlite";
import index from "./index.html";

// Initialize SQLite database
const db = new Database("leaderboard.db");

// Create leaderboard table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER UNIQUE,
    character_name TEXT,
    total_value INTEGER,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add image storage columns if they don't exist
try {
  db.exec(`ALTER TABLE leaderboard ADD COLUMN image_data BLOB`);
  console.log("Added image_data column");
} catch (error) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE leaderboard ADD COLUMN image_content_type TEXT`);
  console.log("Added image_content_type column");
} catch (error) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE leaderboard ADD COLUMN image_fetched_at DATETIME`);
  console.log("Added image_fetched_at column");
} catch (error) {
  // Column already exists, ignore
}

console.log("Database initialized successfully");

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/api/search-character": {
      async POST(req) {
        try {
          const { name } = await req.json();
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
          return Response.json(data);
        } catch (error) {
          return Response.json({ error: "Failed to search character" }, { status: 500 });
        }
      },
    },

    "/api/lookup-character": {
      async POST(req) {
        try {
          const { characterId } = await req.json();
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
          return Response.json(data);
        } catch (error) {
          return Response.json({ error: "Failed to lookup character" }, { status: 500 });
        }
      },
    },

    "/api/process-character": {
      async POST(req) {
        try {
          const { characterId, characterName } = await req.json();
          
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
            
            if (pageKillmails.length === 0) {
              // No more killmails
              hasMorePages = false;
            } else if (pageKillmails.length < 200) {
              // This is the last page (less than full page)
              allKillmails.push(...pageKillmails);
              hasMorePages = false;
            } else {
              // Full page, there might be more
              allKillmails.push(...pageKillmails);
              page++;
            }
          }
          
          const killmails = allKillmails;
          
          // Calculate total value
          const totalValue = killmails.reduce((sum: number, killmail: any) => {
            return sum + (killmail.zkb?.totalValue || 0);
          }, 0);
          
          // Fetch character portrait from CCP
          let imageData = null;
          let imageContentType = null;
          let imageFetchedAt = null;
          
          try {
            const imageUrl = `https://images.evetech.net/characters/${characterId}/portrait?tenant=tranquility&size=64`;
            const imageResponse = await fetch(imageUrl);
            
            if (imageResponse.ok) {
              imageData = await imageResponse.bytes(); // Returns Uint8Array
              imageContentType = imageResponse.headers.get('content-type') || 'image/jpeg';
              imageFetchedAt = new Date().toISOString();
              console.log(`Successfully fetched portrait for character ${characterId}`);
            } else {
              console.warn(`Failed to fetch portrait for character ${characterId}: ${imageResponse.status}`);
            }
          } catch (imageError) {
            console.warn(`Error fetching portrait for character ${characterId}:`, imageError);
          }
          
          // Store in database with image data
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO leaderboard (
              character_id, character_name, total_value, last_updated,
              image_data, image_content_type, image_fetched_at
            )
            VALUES (?, ?, ?, datetime('now'), ?, ?, ?)
          `);
          
          stmt.run(characterId, characterName, totalValue, imageData, imageContentType, imageFetchedAt);
          
          return Response.json({
            characterId,
            characterName,
            totalValue,
            killmailCount: killmails.length,
            imagesCached: imageData ? true : false,
          });
        } catch (error) {
          return Response.json({ error: "Failed to process character" }, { status: 500 });
        }
      },
    },

    "/api/leaderboard": {
      async GET(req) {
        try {
          const stmt = db.prepare(`
            SELECT character_id, character_name, total_value, last_updated
            FROM leaderboard
            ORDER BY total_value DESC
            LIMIT 50
          `);
          
          const leaderboard = stmt.all();
          return Response.json(leaderboard);
        } catch (error) {
          return Response.json({ error: "Failed to get leaderboard" }, { status: 500 });
        }
      },
    },

    "/api/character-image/:id": {
      async GET(req) {
        try {
          const characterId = parseInt(req.params.id);
          
          if (!characterId || isNaN(characterId)) {
            return new Response("Invalid character ID", { status: 400 });
          }

          // Check if we have cached image data
          const stmt = db.prepare(`
            SELECT image_data, image_content_type, image_fetched_at
            FROM leaderboard
            WHERE character_id = ?
          `);
          
          const result = stmt.get(characterId);
          
          // Check if image exists and is not expired (7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          let imageData = result?.image_data;
          let contentType = result?.image_content_type;
          let needsFetch = false;
          
          if (!imageData || !result?.image_fetched_at || 
              new Date(result.image_fetched_at) < sevenDaysAgo) {
            needsFetch = true;
          }
          
          // If we need to fetch or refresh the image
          if (needsFetch) {
            try {
              const imageUrl = `https://images.evetech.net/characters/${characterId}/portrait?tenant=tranquility&size=64`;
              const imageResponse = await fetch(imageUrl);
              
              if (imageResponse.ok) {
                imageData = await imageResponse.bytes();
                contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
                
                // Update the database with new image data
                const updateStmt = db.prepare(`
                  UPDATE leaderboard 
                  SET image_data = ?, image_content_type = ?, image_fetched_at = ?
                  WHERE character_id = ?
                `);
                
                updateStmt.run(imageData, contentType, new Date().toISOString(), characterId);
                console.log(`Refreshed portrait for character ${characterId}`);
              } else {
                console.warn(`Failed to fetch portrait for character ${characterId}: ${imageResponse.status}`);
                // If fetch fails and we have old cached data, use it
                if (!result?.image_data) {
                  return new Response("Character portrait not found", { status: 404 });
                }
              }
            } catch (fetchError) {
              console.warn(`Error fetching portrait for character ${characterId}:`, fetchError);
              // If fetch fails and we have old cached data, use it
              if (!result?.image_data) {
                return new Response("Failed to fetch character portrait", { status: 500 });
              }
            }
          }
          
          // Serve the image
          if (imageData && contentType) {
            return new Response(imageData, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=604800', // 7 days
                'ETag': `"${characterId}-${result?.image_fetched_at || new Date().toISOString()}"`,
              },
            });
          } else {
            return new Response("Character portrait not available", { status: 404 });
          }
        } catch (error) {
          console.error("Error serving character image:", error);
          return new Response("Internal server error", { status: 500 });
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);

// Cleanup database on exit
process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});
