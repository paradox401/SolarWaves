Original prompt: yes use mern stack and also a backend to create new user, panel to load and redeam points to the users and also track user activity and to manage users

TODO
- Scaffold MERN client/server structure.
- Implement Mongo-backed auth, users, points ledger, redemptions, and activity tracking.
- Build player-facing game UI and admin management panel.
- Run local verification and note any setup requirements.

Notes
- Starting from an empty workspace.
- Targeting a social-casino style prototype, not real-money gambling flows.
- Scaffolded `client` with Vite/React and `server` with Express/Mongoose.
- Backend now has auth, admin management, point ledger, activity logging, seeded admin support, and game session submission endpoints.
- Frontend now has player/admin auth, a player wallet dashboard, admin operations UI, and a slot-machine UI with `window.render_game_to_text` and `window.advanceTime(ms)` for automated checks.
- Local backend moved to `127.0.0.1:5055` because macOS Control Center was already listening on port `5000`.
- Replaced the old arcade session endpoint with a backend-driven `/api/game/spin` slot flow and a persisted `GameSettings` model.
- Added admin slot controls for win percentage, spin cost, and payout multipliers.
- Switched database config to require `MONGO_URI` so the app is ready for MongoDB Atlas instead of the in-memory fallback.

Verification
- `cd client && npm run lint` passed.
- `cd client && npm run build` passed.
- API smoke test passed for `/api/health`, admin slot-settings update, player registration/login, admin point load, and authenticated slot spin resolution.
- Playwright slot preview check passed with screenshots in `output/web-game/` and state snapshots showing a winning preview spin followed by a losing preview spin.

Next suggestions
- Add persistent JWT refresh/logout handling and password reset flows if this moves beyond prototype status.
- Split the React app into route-based pages and smaller components if we continue iterating.
