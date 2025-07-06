# Abyssal Feeders - EVE Online Killmail Tracker

A Bun + React + SQLite application for tracking EVE Online character killmail values in abyssal space. Features character search, portrait caching, and leaderboard functionality.

## Project Overview

This application allows users to:
- Search for EVE Online characters by name or ID
- Track killmail values from abyssal space encounters via Zkillboard API
- Cache character portraits from CCP's image API
- View a leaderboard of characters ranked by total ISK value

## Architecture

- **Backend**: Bun server with SQLite database
- **Frontend**: React with shadcn/ui components
- **APIs**: EVE ESI API for character data, Zkillboard API for killmails, CCP Image API for portraits
- **Caching**: Character portraits stored as BLOBs in SQLite with 7-day expiration

---

## Development Guidelines

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

---

## Project Structure

```
src/
├── index.tsx              # Main server file with API routes
├── App.tsx                # Main React application
├── frontend.tsx           # React root setup
├── index.html             # HTML entry point
├── components/            # React components
│   ├── CharacterSearch.tsx    # Debounced character name search
│   ├── CharacterIdInput.tsx   # Direct character ID input
│   ├── Leaderboard.tsx        # Ranked character display
│   └── ProcessingStatus.tsx   # Processing feedback UI
└── components/ui/         # shadcn/ui components
```

## API Endpoints

### `/api/search-character` (POST)
Searches for characters by name using EVE ESI API.
```json
{ "name": "Character Name" }
```

### `/api/lookup-character` (POST)
Looks up character name by ID using EVE ESI API.
```json
{ "characterId": 2114264203 }
```

### `/api/process-character` (POST)
Processes character killmail data and caches portrait.
```json
{ "characterId": 2114264203, "characterName": "Character Name" }
```

### `/api/leaderboard` (GET)
Retrieves ranked characters by total ISK value.

### `/api/character-image/:id` (GET)
Serves cached character portraits with automatic refresh.

## Database Schema

```sql
CREATE TABLE leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER UNIQUE,
  character_name TEXT,
  total_value INTEGER,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  image_data BLOB,
  image_content_type TEXT,
  image_fetched_at DATETIME
);
```

## Key Features

### Character Search
- 300ms debounced search to prevent API spam
- Dropdown with character selection
- Support for both name search and direct ID input

### Image Caching
- Character portraits fetched from `https://images.evetech.net/characters/{id}/portrait`
- Stored as BLOBs in SQLite database
- 7-day cache expiration with automatic refresh
- Graceful fallbacks for missing images

### Killmail Processing
- Fetches abyssal killmail data from Zkillboard API with pagination support
- Uses proper User-Agent header: "Abyssal Feeders - Felix Allistar <felixallistar@gmail.com>"
- Enables gzip compression for efficient data transfer
- Automatically fetches all pages of killmail data (200 results per page)
- Calculates total ISK value from all killmails across all pages
- Updates leaderboard with new values

## Running the Application

```bash
# Development
bun --hot src/index.tsx

# Production
NODE_ENV=production bun src/index.tsx
```

## External APIs Used

1. **EVE ESI API**: Character search and lookup
   - `https://esi.evetech.net/latest/universe/ids/`
   - `https://esi.evetech.net/latest/universe/names/`

2. **Zkillboard API**: Killmail data with pagination
   - `https://zkillboard.com/api/characterID/{id}/abyssal/` (page 1)
   - `https://zkillboard.com/api/characterID/{id}/abyssal/page/{page}/` (subsequent pages)

3. **CCP Image API**: Character portraits
   - `https://images.evetech.net/characters/{id}/portrait?tenant=tranquility&size=64`

## Important Notes

- All external API calls include proper error handling
- Character portraits are cached locally to minimize CCP API calls
- Debounced search prevents API spam during user input
- SQLite database automatically creates tables and columns on startup
- Images are served with proper HTTP caching headers
- Application supports both light and dark themes via shadcn/ui
