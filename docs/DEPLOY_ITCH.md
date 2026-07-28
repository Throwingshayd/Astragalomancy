# Deploy to itch.io (browser)

Dice of Dionysus ships as a static web build. itch.io hosts it as an **HTML** project — no install required for players.

## One-command build

From the repo root:

```bash
npm install
npm run build:itch
```

This runs the production Vite build and writes **`DiceOfDionysus-itchio.zip`** at the repo root (gitignored). The zip has `index.html` at the **root** — required by itch.io.

The script also **prunes unused assets**, **optimizes PNG/MP3**, trims duplicate die PNGs from `dist/`, and prints a size audit. To run those steps alone:

```bash
npm run audit:size          # report dist/ breakdown (after build)
npm run optimize:release    # prune orphans + optimize art + music in public/
```

Test the build locally before uploading:

```bash
npm run preview
```

Open http://localhost:4173

## Upload on itch.io

1. Create a new project (or edit an existing one).
2. **Kind of project:** HTML
3. Upload **`DiceOfDionysus-itchio.zip`**
4. Enable **“This file will be played in the browser”**
5. **Embed options** (recommended):
   - Viewport: **1280 × 720** (or larger)
   - Orientation: **landscape** (matches `game/manifest.json`)
   - **Fullscreen** button: on
6. Save and click **Run game** to smoke-test.

## Player experience

- Click **Run game** on your itch page.
- Works in modern desktop browsers (Chrome, Edge, Firefox).
- Landscape / fullscreen gives the best layout.
- Saves use browser `localStorage` on that origin.

## Desktop build (optional)

For a downloadable Windows `.exe` instead of (or alongside) the browser build:

```bash
npm run tauri:build
```

Upload the Tauri output as a **Windows** download on itch — separate from the HTML zip.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Missing art / sounds locally | Run `npm install` (runs `ensure-art-junction.cjs`) |
| Zip too large for itch | Free projects have size limits; run `npm run optimize-art` or trim music |
| Blank page after upload | Confirm zip root contains `index.html`, not `dist/index.html` |
| 404 on `/js/...` scripts | Rebuild with current Vite config (`classic-dist-assets` copies `game/js` → `dist/js`) |
| Service worker warnings | Non-fatal on itch; offline cache may be limited until SW paths are relative |

## Version label

The main-menu pill reads from `game/index.html` (`start-version-pill`). Bump `package.json`, `game/manifest.json`, and `game/public/ServiceWorker.js` cache keys when cutting a release.
