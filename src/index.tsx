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
          
          // Fetch killmail data from Zkillboard
          const response = await fetch(
            `https://zkillboard.com/api/characterID/${characterId}/abyssal/`
          );
          
          const killmails = await response.json();
          
          // Calculate total value
          const totalValue = killmails.reduce((sum: number, killmail: any) => {
            return sum + (killmail.zkb?.totalValue || 0);
          }, 0);
          
          // Store in database
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO leaderboard (character_id, character_name, total_value, last_updated)
            VALUES (?, ?, ?, datetime('now'))
          `);
          
          stmt.run(characterId, characterName, totalValue);
          
          return Response.json({
            characterId,
            characterName,
            totalValue,
            killmailCount: killmails.length,
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
