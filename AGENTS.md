# AGENTS.md

## Cursor Cloud specific instructions

Casino Royale is a small Node.js casino app (Blackjack, Baccarat, Texas Hold'em) with a
vanilla HTML/CSS/JS frontend in `public/`. There are no automated tests and no lint config.

### Running the app

- Dependencies: `npm install` (only `express` + `socket.io`). This is the update script.
- `npm start` (or `npm run dev`) starts the server from `server/index.js` on port `3000`
  (override with `PORT`). This serves the static site in `public/`.
- Single-player pages (`single-*.html`, backed by `public/js/ai.js`) are 100% client-side and
  work fully under `npm start` with no backend — this is the easiest thing to run/test.

### Multiplayer caveat (non-obvious)

The repo has **two independent backends** and the current frontend only talks to one of them:

- The multiplayer frontend (`public/js/multiplayer.js`, `public/js/lobby.js`) uses REST +
  polling against `/api/rooms`, `/api/poll`, `/api/game` — the **Vercel serverless functions**
  in `api/*.js` (backed by `lib/engine.js` + `lib/store.js`). See `vercel.json`.
- `server/index.js` (used by `npm start`, deployed on Render per `render.yaml`) is a
  **Socket.io** server and does **not** serve the `/api/*` routes.

Therefore multiplayer does **not** work under plain `npm start` (create-room returns
"Server error" because `/api/*` 404s). To run multiplayer locally you need the serverless
`api/` handlers served:

- Official path: `vercel dev` (Vercel CLI). This requires a one-time interactive `vercel login`
  (device auth), so it is not available out-of-the-box in a fresh cloud VM.
- No-auth path (recommended for local testing): mount the three handlers in a tiny Express
  app, since each `api/*.js` exports a standard `(req, res) => {}` handler. Serve `public/`
  statically and route `/api/rooms`→`api/rooms.js`, `/api/poll`→`api/poll.js`,
  `/api/game`→`api/game.js` (use `express.json()`). A single Node process keeps room state in
  `globalThis` (`lib/store.js`), so polling-based multiplayer works within that process.

### Build / lint / test

- No build step (vanilla frontend), no linter, no test suite. Fastest sanity check for the
  backend modules is `node --check` on the files in `server/`, `api/`, and `lib/`.
