# Astragalomancy (repo/folder: `DICE-OF-DIONYSUS-WORKING`)

Vanilla JS, class-based roguelike dice game (Balatro-inspired) built with Vite. The web/PWA build is the primary dev target; Tauri (`src-tauri/`) is for optional desktop `.exe` packaging. See `.cursorrules` and `docs/GAME_TERMINOLOGY.md` for gameplay/architecture conventions.

## Cursor Cloud specific instructions

The update script runs `npm install` (and, for e2e, downloads the Playwright Chromium browser) on startup. Standard commands live in `package.json` scripts — prefer those. Notes below are the non-obvious bits.

- Run/dev: `npm run dev` serves the game with Vite on `http://localhost:3000/` (`strictPort`, listens on all interfaces). Start it in a long-lived terminal (tmux); it is a foreground process, not a one-shot.
- Asset symlinks are auto-managed: `postinstall` and `predev` run `scripts/ensure-art-junction.cjs`, which creates `game/ART`, `game/fonts`, `game/sounds` as symlinks into `game/public/*`. These links are gitignored and recreated automatically — do not commit them, and if absolute `/ART//fonts//sounds` URLs 404, re-run `node scripts/ensure-art-junction.cjs`.
- Lint: `npm run lint` (ESLint). A few pre-existing `no-unused-vars` warnings in `game/js/ui/BalatroEffects.js` are expected (0 errors). Type-check: `npm run type-check`.
- Unit tests: `npm test` (Vitest, jsdom-free node env, ~170 tests, a couple seconds). `architecture-guardrails.test.js` ratchets file size / global-coupling for god-object files — extract code rather than raising the ceiling.
- E2E: Playwright (`tests/e2e/`) needs the Chromium browser installed (the update script handles this via `npx playwright install chromium`). `playwright.config.js` reuses an already-running dev server on port 3000 when not in CI, otherwise starts its own. For a quick e2e sanity check use `npx playwright test tests/e2e/ui-checklist-playtest.spec.js tests/e2e/shop-worship-drop.spec.js` (~15s). Avoid `npm run playtest:boons` for smoke checks — it is an exhaustive per-boon suite that runs 20+ minutes.
- Scripted-testing hooks: URL params like `?test=boon:<ids>`, `?test=winning`, `?test=seven_sided` drive specific scenarios; set `localStorage['diceOfDionysus_tutorialShown'] = '1'` to skip the first-run tutorial overlay that otherwise blocks the roll button.
- Gameplay gotcha (not a bug): scoring is Favour x Dice, so a valid hand (e.g. three of a kind) can score 0 when the associated god has 0 favour. After scoring there is a multi-second offering animation before "Cast the Bones" accepts the next roll.
- Tauri desktop build (`npm run tauri:dev` / `npm run tauri:build`) requires the Rust toolchain and system webkit libs; it is not needed for normal web development and is not set up by the update script.
