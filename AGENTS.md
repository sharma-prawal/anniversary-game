# AGENTS.md — anniversary-game

## Commands
- `npm run dev` — Vite dev server (opens browser automatically)
- `npm run build` — outputs to `dist/`
- `npm run preview` — Vite preview of `dist/`
- `npm run firebase:deploy` — builds + deploys to Firebase project `praashi-rpg-game`

## Project structure
- **Phaser 3** (^3.80.x) game, **vanilla JS ESM**, **no TypeScript, no tests, no linting, no CI/CD**
- Single entry: `index.html` → `src/main.js` → `Phaser.Game` with 21 scenes, RESIZE scale, WEBGL renderer
- **Runtime deps**: phaser + vite

## Architecture
- All 15 chapter scenes extend `ChapterScene` (`src/scenes/ChapterScene.js`) — override hooks: `buildGround()`, `buildGroundDecor()`, `buildProps()`, `buildCharacters()`, `buildFX()`, `onUpdate()`, `onShutdown()`
- Grid system: 64px cells. Helpers `grid(col, row)` and `gridSnap(x, y)` in ChapterScene
- Environment presets (`OPEN` / `INDOOR` / `DARK`) — set per chapter via `EnvironmentManager.apply(this, preset, overrides)`
- Scene flow: `Boot → Preload → MainMenu → (Chapter[N]Scene ↔ CinematicScene ↔ UIChapterScene)`, with persistent `UIScene` HUD overlay

## Important quirks
- **No audio files** — all audio is procedural Web Audio synthesis (`src/systems/AudioManager.js`). Do not add audio assets.
- **No image assets to download** — character sprites, objects, particles, UI, backgrounds are all procedurally generated in `BootScene` via Canvas 2D. Kenney tilesets in `public/assets/kenney/` are the only loaded PNGs.
- **Story data**: all chapters + dialogue in `src/data/story.json`
- **Mobile**: orientation lock handled in JS (`OrientationManager`), safe-area CSS custom properties, fullscreen API button, iOS "Add to Home Screen" prompt — all built into `index.html`
- **Firebase hosting**: rewrites all routes to `/index.html` (SPA)

## Style conventions
- ES6 classes, PascalCase for classes, camelCase methods/vars, `_` prefix for private fields
- Extensive JSDoc, no semicolons, section headers with Unicode box-drawing
- All scenes import via bare module paths (aliased through Vite's default `/src` resolution)
