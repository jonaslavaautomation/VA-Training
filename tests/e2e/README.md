# Browser tests

| Command | What it does | Time |
|---|---|---|
| `npm run test:e2e` | Builds the production site, serves it like Vercel (headers, CSP and rewrite from `vercel.json`) and runs the 20-step acceptance workflow + 7 production checks in headless Chrome | ~2 min |
| `npm run test:responsive` | Checks 19 pages + 4 dialogs at 1920 / 1366 / 768 / 390 / 320 px for sideways scrolling, off-screen controls and tiny tap targets. Screenshots at 320 px land in `tests/e2e/.out/shots/` | ~3 min |

Requirements: Google Chrome installed (the tests drive it via `playwright-core`; no browser download).

Both use `fake-supabase.mjs`, an in-memory **simulation** of Supabase (auth, database rules, storage, the admin-members function). They prove the website works end to end, but they are not a substitute for testing your real Supabase project — use `PRODUCTION_CHECKLIST.md` for that. The real database rules are tested by `npm run test:db`.
