# Copilot Instructions — anniversary-game

## Commands

```bash
npm run dev          # Vite dev server (auto-opens browser)
npm run build        # Production build → dist/
npm run preview      # Preview the dist/ build locally
npm run firebase:deploy  # build + deploy to Firebase hosting
```

No tests, no linter — there is nothing to run for those.

## Architecture

### Scene flow
```
Boot → Preload → MainMenu → Chapter[N]Scene ↔ CinematicScene ↔ UIChapterScene
                                                              ↕
                                                         UIScene (persistent HUD overlay)
```
All 15 chapter scenes + supporting scenes are registered in `src/main.js`. Chapter routing lives in `src/systems/SceneManager.js` (`goToChapter(scene, index)`). Progress is persisted via `localStorage`.

### ChapterScene base class (`src/scenes/ChapterScene.js`)
Every chapter extends `ChapterScene`. Override these hooks — **do not override `create()` or `update()` directly**:
- `buildGround()` — floor/environment (call `EnvironmentManager.apply()` here)
- `buildGroundDecor()` — decorative tiles on top of ground
- `buildProps()` — furniture, trees, interactables
- `buildCharacters()` — player + NPC creation
- `buildFX()` — particles and chapter-specific effects
- `onUpdate(time, delta)` — per-frame logic
- `onShutdown()` — cleanup

ChapterScene constructor options: `cols`, `rows`, `cellSize` (default 64), `mood`, `zoom`, `targetZoom`, `followLerp`, `drift`, `fadeInMs`, `introMs`.

### Grid system
- 64px cells. Use `this.grid(col, row)` → `{ x, y }` for world-pixel positions.
- `this.gridSnap(x, y)` snaps arbitrary coords to nearest cell center.
- Design base: `960 × 540`. Zoom calculations are relative to this.

### Layer/depth system (`src/systems/LayerManager.js`)
Five named depth tiers — always use `this.layers.depth(name, offset)` or `this.layers.place(obj, name)`:
| Layer | Range | Use |
|---|---|---|
| `background` | −200 … −100 | Sky, parallax bg |
| `midground` | −99 … −1 | Ground, tiles |
| `gameplay` | 0 … 599 | Player, objects (Y-sorted here) |
| `foreground` | 600 … 799 | Labels, emotes, bubbles |
| `fx` | 800 … 999 | Vignette, grain, lighting |

Y-sorting: `DepthManager.addYSort(obj)` writes `base + obj.y` continuously — do **not** clamp Y-sorted objects.

### Environment presets (`src/systems/environment/EnvironmentManager.js`)
Call in `buildGround()`:
```js
this.env = EnvironmentManager.apply(this, 'OPEN' | 'INDOOR' | 'DARK', { ...overrides })
```
Returns the env instance; call `this.env.update(scrollX)` in `onUpdate()` for parallax. The instance is also stored as `this._env`.

### Characters (`src/systems/CharacterSystem.js`)
```js
this._player = this.chars.createPlayer(chapterData, config)
this._npc    = this.chars.createFemale(x, y, config)
```
Both are animated via tweens using Kenney Modular Characters PNGs composited at boot. Call `this.chars.update(time, delta)` in `onUpdate()`.

### Dialogue (`src/systems/DialogueSystem.js`)
Lines can be plain strings or `{ speaker, text }` objects. Speakers: `'Prawal'`, `'Aashna'`, `'Narrator'`.
```js
this.dlg = new DialogueSystem(this)
this.dlg.start(lines, onComplete)
```
DialogueSystem talks directly to `UIScene` — do **not** use `game.events` bus for dialogue events.

### Audio (`src/systems/AudioManager.js`)
Imported via the helper alias:
```js
import { audioManager } from '../utils/helpers.js'
audioManager.playChapter('profile_key')
```
All sound is procedural Web Audio synthesis — **never add audio files**. Per-chapter profiles (chord progression, ambient noise, texture events) are defined at the top of `AudioManager.js`.

### Asset generation (`src/scenes/BootScene.js`)
All sprites (player frames, NPC, UI elements, particles, backgrounds) are generated at runtime by `BootScene.generateAll()` using Canvas 2D into Phaser texture cache. The only loaded PNGs are Kenney tilesets in `public/assets/kenney/`. **Do not add image assets for characters, UI, or backgrounds** — generate them in BootScene via `this.tex(key, w, h, cb)`.

`tex()` auto-doubles resolution for `bg-*` and `player-f*` keys for HiDPI crispness. Store logical dimensions on `texture.logicalW / logicalH`.

### Story data (`src/data/story.json`)
All chapter metadata, dialogue lines, player start positions, and scene types live here. `SceneManager` reads this to route chapters. `sceneType: 'cinematic'` routes to `CinematicScene`; `sceneType: 'ui'` routes to `UIChapterScene`; default routes to the chapter's named `ChapterScene`.

## Key conventions

- **No semicolons.** ES6 module syntax throughout.
- **`_` prefix for private fields** (`this._player`, `this._env`, `this._cfg`).
- **PascalCase** classes, **camelCase** methods/variables.
- **JSDoc on all public methods.** Section headers use Unicode box-drawing (`═══`).
- Imports use relative paths with `.js` extension. No path aliases — Vite resolves from `/src`.
- Phaser is `WEBGL` + `RESIZE` scale mode. The canvas always maps 1:1 to device CSS pixels. Never force `powerPreference: 'high-performance'` (causes WebGL context loss when DevTools opens in Chrome).
- Mobile safe-area insets are CSS custom properties (`--safe-bottom`) set in `index.html`. Read them via `getSafeAreaBottom()` from `src/utils/helpers.js`.
- Arcade physics is loaded (`gravity: { y: 0 }`) but used minimally — mostly for player movement colliders, not gravity-based physics.
