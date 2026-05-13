import Phaser from 'phaser';
import storyData from '../data/story.json';
import { LayerManager } from '../systems/LayerManager.js';
import { DepthManager } from '../systems/DepthManager.js';
import { SceneLighting } from '../systems/SceneLighting.js';
import { ShadowRenderer } from '../systems/ShadowRenderer.js';
import { CameraController } from '../systems/CameraController.js';
import { CharacterSystem } from '../systems/CharacterSystem.js';
import { ProximityInteraction } from '../systems/ProximityInteraction.js';
import { audioManager } from '../utils/helpers.js';
import { TransitionFX } from '../systems/TransitionFX.js';
import { EnvironmentFX } from '../systems/EnvironmentFX.js';
import { ColorGrading } from '../systems/ColorGrading.js';
import { FootstepSystem } from '../systems/FootstepSystem.js';
import { cameraZoomBoost, isSmallLandscape } from '../systems/MobileAdaptationManager.js';

/** Design base resolution — zoom calculations are relative to this canvas size. */
const BASE_W = 960;
const BASE_H = 540;

/**
 * ChapterScene — reusable template for all story chapters.
 *
 * Provides a 64×64 grid-based layout with four built-in layers:
 *   ground    — floor tiles, paths, terrain               (layer: midground)
 *   props     — furniture, trees, decorations              (layer: gameplay, Y-sorted)
 *   characters — player + NPCs                             (layer: gameplay, Y-sorted)
 *   fx        — particles, overlays, screen effects        (layer: fx)
 *
 * Integrated systems (auto-created):
 *   • LayerManager + DepthManager   — 5-tier depth + Y-sort
 *   • SceneLighting                 — Light2D + mood ambient + glow
 *   • ShadowRenderer                — soft elliptical shadows
 *   • CameraController              — zoom intro + follow + drift
 *   • CharacterSystem               — Kenney Mini Characters factory
 *   • ProximityInteraction           — walk → reach → trigger
 *
 * Subclass hook methods (override in each chapter):
 *   buildGround()        — place floor tiles onto the grid
 *   buildProps()          — place decorative & interactable props
 *   buildCharacters()     — create player + NPCs
 *   buildFX()             — chapter-specific particle effects
 *   onUpdate(time, delta) — per-frame chapter logic
 *   onShutdown()          — chapter-specific cleanup
 *
 * Grid helper:
 *   grid(col, row)        — returns { x, y } in world pixels
 *   gridSnap(x, y)        — snaps arbitrary coords to nearest cell center
 *
 * Usage:
 *   class Chapter4Scene extends ChapterScene {
 *     constructor() { super('Chapter4', { ... }); }
 *     buildGround()  { ... }
 *     buildProps()   { ... }
 *     buildCharacters() { ... }
 *   }
 */
export class ChapterScene extends Phaser.Scene {

  /**
   * @param {string} key — Phaser scene key
   * @param {object} [config]
   * @param {number} [config.cols=22]            — grid columns (world width = cols × 64)
   * @param {number} [config.rows=12]            — grid rows    (world height = rows × 64)
   * @param {number} [config.cellSize=64]        — cell size in px
   * @param {string} [config.mood='default']     — SceneLighting mood
   * @param {number} [config.zoom=1.0]           — starting camera zoom
   * @param {number} [config.targetZoom=1.45]    — zoom-intro target
   * @param {number} [config.followLerp=0.055]   — camera follow smoothness
   * @param {boolean}[config.drift=false]        — camera idle drift
   * @param {number} [config.fadeInMs=1200]       — camera fade-in duration * @param {number} [config.introMs=2500]        — zoom-intro tween duration   */
  constructor(key, config = {}) {
    super(key);
    this._cfg = {
      cols:       config.cols       ?? 22,
      rows:       config.rows       ?? 12,
      cellSize:   config.cellSize   ?? 64,
      mood:       config.mood       ?? 'default',
      zoom:       config.zoom       ?? 1.0,
      targetZoom: config.targetZoom ?? 1.45,
      followLerp: config.followLerp ?? 0.055,
      drift:      config.drift      === true,
      fadeInMs:   config.fadeInMs   ?? 1200,
      introMs:    config.introMs    ?? 2500,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GRID HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /** World dimensions in pixels. */
  get worldW() { return this._cfg.cols * this._cfg.cellSize; }
  get worldH() { return this._cfg.rows * this._cfg.cellSize; }
  /** Cell size in pixels (public accessor for subsystems). */
  get cellSize() { return this._cfg.cellSize; }

  /**
   * Convert grid column/row to world center coordinates.
   * @param {number} col — 0-based column
   * @param {number} row — 0-based row
   * @returns {{ x: number, y: number }}
   */
  grid(col, row) {
    const s = this._cfg.cellSize;
    return { x: col * s + s / 2, y: row * s + s / 2 };
  }

  /**
   * Snap world coordinates to the nearest grid-cell center.
   * @param {number} x
   * @param {number} y
   * @returns {{ x: number, y: number }}
   */
  gridSnap(x, y) {
    const s = this._cfg.cellSize;
    return {
      x: Math.floor(x / s) * s + s / 2,
      y: Math.floor(y / s) * s + s / 2,
    };
  }

  /**
   * Create a blank Phaser tilemap covering the full world dimensions.
   * Uses 16×16px source tiles; one 64px chapter grid cell = 4×4 tilemap tiles.
   *
   * @param {string}  tsKey             — texture key (loaded in PreloadScene)
   * @param {string}  [tsName='tiles']  — internal tileset name
   * @param {object}  [opts]
   * @param {number}  [opts.spacing=1]  — pixel spacing between tiles in the PNG
   * @param {number}  [opts.depth=-100] — base depth for the ground layer
   * @returns {{ map, tileset, groundLayer, createDetailLayer }}
   */
  _makeTilemap(tsKey, tsName = 'tiles', { spacing = 1, depth = -100 } = {}) {
    const TILE = 16;
    const MW = Math.round(this.worldW / TILE);
    const MH = Math.round(this.worldH / TILE);

    const map = this.make.tilemap({
      tileWidth: TILE, tileHeight: TILE,
      width: MW, height: MH,
    });

    const tileset = map.addTilesetImage(tsName, tsKey, TILE, TILE, 0, spacing);

    if (!tileset) {
      console.warn(`[ChapterScene] Tileset '${tsKey}' not found in texture cache — ground tilemap skipped.`);
      this.map = map;
      this.groundLayer = null;
      return { map, tileset: null, groundLayer: null, createDetailLayer: () => null };
    }

    const groundLayer = map.createBlankLayer('ground', tileset, 0, 0, MW, MH, TILE, TILE);
    groundLayer.setDepth(depth);
    groundLayer.setPipeline('Light2D');

    this.map = map;
    this.groundLayer = groundLayer;

    return {
      map,
      tileset,
      groundLayer,
      /** Create an optional detail/accent layer above ground (e.g. aisle, path). */
      createDetailLayer: () => {
        const dl = map.createBlankLayer('detail', tileset, 0, 0, MW, MH, TILE, TILE);
        dl.setDepth(depth + 5);
        dl.setPipeline('Light2D');
        this.detailLayer = dl;
        return dl;
      },
    };
  }

  /**
   * Place a texture on a grid cell. Returns the created image.
   * @param {number} col
   * @param {number} row
   * @param {string} texture
   * @param {object} [opts]
   * @param {number} [opts.scale]
   * @param {number} [opts.originX=0.5]
   * @param {number} [opts.originY=0.9]
   * @param {string} [opts.layer='gameplay']
   * @param {boolean}[opts.ySort=false]
   * @param {boolean}[opts.lit=true]       — apply Light2D pipeline
   * @param {object} [opts.shadow]         — pass to ShadowRenderer.add()
   * @returns {Phaser.GameObjects.Image|null}
   */
  placeAt(col, row, texture, opts = {}) {
    if (!this.textures.exists(texture)) return null;
    const pos = this.grid(col, row);
    const img = this.add.image(pos.x, pos.y, texture)
      .setScale(opts.scale ?? 1)
      .setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.9);

    const layer = opts.layer ?? 'gameplay';
    if (layer === 'gameplay' && opts.ySort !== false) {
      this.depthMgr.addYSort(img);
    } else {
      this.layers.place(img, layer);
    }

    if (opts.lit !== false) this.lighting.applyPipeline(img);
    if (opts.shadow) this.shadows.add(img, opts.shadow);

    // Auto-animate known prop types unless explicitly disabled
    if (opts.envFX !== false && this.envFX) {
      const t = texture.toLowerCase();
      if (t.includes('tree') || t.includes('plant') || t.includes('flower') || t.includes('bush') || t.includes('fern')) {
        this.envFX.sway(img, { amplitude: 1.2, speed: 0.5 + Math.random() * 0.5 });
      } else if (t.includes('candle') || t.includes('torch')) {
        // Whole-sprite alpha flicker only for small emissive sources.
        // Floor lamps/lanterns have dedicated light-blob halos; don't whole-sprite flicker them.
        this.envFX.flicker(img, { min: 0.72, max: 1.0, speed: 1.8 });
      } else if (t.includes('flag') || t.includes('curtain') || t.includes('banner')) {
        this.envFX.sway(img, { amplitude: 2.0, speed: 0.7 });
      }
    }

    return img;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CREATE — orchestrates all systems + hooks
  // ═══════════════════════════════════════════════════════════════════

  create() {
    const W = this.worldW;
    const H = this.worldH;

    // ── 1. CORE SYSTEMS ────────────────────────────────────────────
    this.layers     = new LayerManager(this);
    this.depthMgr   = new DepthManager(this, this.layers);
    this.shadows    = new ShadowRenderer(this);
    this.charSystem = new CharacterSystem(this);
    this.proximity  = new ProximityInteraction(this);
    this.envFX      = new EnvironmentFX(this);

    this.physics.world.setBounds(0, 0, W, H);

    // ── 2. LIGHTING — before sprites so they can opt into Light2D ──
    this.lighting = new SceneLighting(this, { mood: this._cfg.mood });
    this.lighting.create();

    // ── 2b. COLOR GRADING — screen-space tint per chapter ─────────
    this.colorGrading = new ColorGrading(this);

    // ── 3. CAMERA ──────────────────────────────────────────────────
    // Dynamic zoom: designed for 960×540 base.
    // Portrait mode (phones/iPad): use rH×0.60 so the world fills screen
    // height (world is ~512px tall; factor keeps a small margin).
    // Landscape / desktop: use Math.min(rW, rH, 3) — never clips content.
    const _calcZoom = (base, target) => {
      const { width, height } = this.scale;
      const rW = width  / BASE_W;
      const rH = height / BASE_H;
      const mul = height > width
        ? Math.min(rH * 0.60, 3.0)   // portrait — fill height
        : Math.min(rW, rH, 3.0);     // landscape — fit both axes
      const boost = cameraZoomBoost(); // +10% on small phones; 1.0 on desktop
      return { z: base * mul * boost, tz: target * mul * boost };
    };
    const { z: _z, tz: _tz } = _calcZoom(this._cfg.zoom, this._cfg.targetZoom);

    this.cam = new CameraController(this, {
      zoom:       _z,
      targetZoom: _tz,
      introMs:    this._cfg.introMs,
      followLerp: this._cfg.followLerp,
      drift:      this._cfg.drift,
      fadeInMs:   this._cfg.fadeInMs,
      bounds:     [0, 0, W, H],
    });

    // On mobile landscape, round camera scroll to whole pixels so sprites
    // never render at sub-pixel positions. Non-integer zoom (e.g. 1.15× on
    // a 844×390 iPhone) + fractional scroll = visible texture blur.
    // Desktop / iPad: isSmallLandscape() returns false — no change.
    if (isSmallLandscape()) {
      this.cameras.main.roundPixels = true;
    }

    // Resize handler: recalculate zoom when screen rotates or window resizes.
    // Stored as a named field so shutdown() can remove it from the global Scale manager.
    this._onResize = (gameSize) => {
      const { width, height } = gameSize;
      // Guard: cameras.main can be null if this fires during a scene transition
      // or after OrientationManager's scale.refresh() hits a mid-shutdown scene.
      if (!this.cameras?.main) return;
      this.cameras.main.setSize(width, height);
      // Recompute zoom at the *target* only (avoids re-firing zoom intro)
      const rW  = width  / BASE_W;
      const rH  = height / BASE_H;
      const mul = height > width
        ? Math.min(rH * 0.60, 3.0)   // portrait
        : Math.min(rW, rH, 3.0);     // landscape
      const boost = cameraZoomBoost(); // +10% on small phones; 1.0 on desktop
      this.cameras.main.setZoom(this._cfg.targetZoom * mul * boost);
      // Keep CameraController._targetZoom in sync so zoomPulse restores to the
      // correct scaled value, not the original unscaled one.
      this.cam?.configure({ targetZoom: this._cfg.targetZoom * mul * boost });
      // Rebuild touch joystick at new position
      this._buildTouchJoystick();
      // Lighting + color-grading rebuild is expensive (44+ Graphics draw calls
      // for the DoF vignette). Debounce so rapid resize/orientation events during
      // an iOS rotation transition don't stack up multiple full rebuilds.
      clearTimeout(this._resizeLightingTimer);
      this._resizeLightingTimer = setTimeout(() => {
        if (!this.sys?.isActive()) return;
        // Guard: a rapid 360° rotation can fire this callback after shutdown()
        // has already destroyed lighting. Re-check the ref before any call.
        this._env?.rebuildOverlays?.();
        if (this.lighting && this.sys?.isActive()) {
          try {
            this.lighting.destroy();
          } catch (_) { /* already destroyed — safe to ignore */ }
          this.lighting = new SceneLighting(this, { mood: this._cfg.mood });
          this.lighting.create();
          if (this._lightingConfigure) this.lighting.configure(this._lightingConfigure);
          if (this._player) this.lighting.followTarget(this._player.sprite);
        }
        if (this.colorGrading && this._chData?.id && this.sys?.isActive()) {
          try {
            this.colorGrading.destroy();
          } catch (_) { /* already destroyed — safe to ignore */ }
          this.colorGrading = new ColorGrading(this);
          this.colorGrading.apply(this._chData.id);
        }
        if (isSmallLandscape()) {
          this.cameras.main.roundPixels = true;
        }
      }, 420); // 420 ms — iOS Safari needs ~300 ms to settle new orientation dims
    };
    this.scale.on('resize', this._onResize);

    // ── 4. INPUT ───────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd    = this.input.keyboard.addKeys('W,A,S,D');

    // SPACE / ENTER / pointer-down → advance active dialogue
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this._enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this._spaceKey.on('down', () => { if (this.dialogue?.active) this.dialogue.advance(); });
    this._enterKey.on('down', () => { if (this.dialogue?.active) this.dialogue.advance(); });
    this.input.on('pointerdown', () => {
      if (!this.dialogue?.active) return;
      // Only advance on click if the dialogue box is actually visible on screen.
      // Without this guard, background clicks silently exhaust dialogue lines.
      const ui = this.scene.get('UI');
      if (ui?._dlgVisible) this.dialogue.advance();
    });

    // ── 5. UI OVERLAY — launch FIRST so UIScene.create() runs on the very next frame,
    //        well before any delayedCall timers inside buildFX() could fire.
    const uiActive = this.scene.isActive('UI');
    const uiVisible = this.scene.isVisible('UI');
    if (!uiActive && !uiVisible) {
      this.scene.launch('UI');
    }

    // ── 5b. HUD RESET — force-hide collect counter and chat header at chapter start.
    //        Belt-and-suspenders: if the previous chapter's onShutdown() failed to hide
    //        these (e.g., a timing edge case during fast transitions), they would bleed
    //        into this chapter's scene. Only Ch3/Ch9/Ch11/Ch12 explicitly show them.
    {
      const _ui = this.scene.get('UI');
      if (_ui) {
        _ui._onCollectCounterHide?.();
        _ui._onChatHeaderHide?.();
      }
    }

    // ── 6. SUBCLASS HOOKS (order matters: ground → decor → props → chars → fx)
    this.buildGround();
    this.buildGroundDecor();
    this.buildProps();
    this.buildCharacters();
    this.buildFX();
    this._buildBaseParticles();  // ambient motes — after FX so they sit above scene

    // ── 6b. FOOTSTEP SYSTEM — after buildGround() so subclasses can call
    //     this.footsteps.setSurface() from within buildGround() and have it
    //     respected (FootstepSystem reads mood at construct time as default,
    //     setSurface() overrides it). Init after characters so the player
    //     position is valid on the first update frame.
    this.footsteps = new FootstepSystem(this, audioManager);

    // ── 7. CAMERA FOLLOW — after characters are built ──────────────
    // Skipped when a subclass cinematic has set this._cinematic = true;
    // those chapters call cam.follow() themselves at the end of the pan.
    if (this._player && !this._cinematic) {
      this.cam.follow(this._player.sprite);
      this.lighting.followTarget(this._player.sprite);
    }

    // ── 8. CHAPTER EVENTS — title, progress, hints ─────────────────
    const _chData  = storyData.chapters.find(c => c.sceneKey === this.sys.config.key);
    const _chIndex = _chData ? storyData.chapters.indexOf(_chData) : -1;

    /** Emit to game bus + call UIScene directly — belt-and-suspenders. */
    const _uiEmit = (event, data) => {
      this.game.events.emit(event, data);
      const ui = this.scene.get('UI');
      if (!ui) return;
      switch (event) {
        case 'chapter-intro':         ui._onChapterIntro?.(data);          break;
        case 'chapter-progress':      ui._onChapterProgress?.(data);       break;
        case 'show-controls-hint':    ui._onShowControlsHint?.();          break;
        case 'show-explore-hint':     ui._onShowExploreHint?.();           break;
        case 'collect-counter-init':  ui._onCollectCounterInit?.(data);   break;
        case 'collect-counter-update':ui._onCollectCounterUpdate?.(data); break;
        case 'collect-counter-hide':  ui._onCollectCounterHide?.();        break;
        case 'chat-header-show':      ui._onChatHeaderShow?.();            break;
        case 'chat-header-hide':      ui._onChatHeaderHide?.();            break;
      }
    };

    if (_chData) {
      this.time.delayedCall(500, () => {
        _uiEmit('chapter-intro', {
          title:       _chData.title       || '',
          subtitle:    _chData.subtitle    || '',
          description: _chData.description || '',
        });
        _uiEmit('chapter-progress', {
          current: _chIndex + 1,
          total:   storyData.chapters.length,
        });
      });
      this.time.delayedCall(2000, () => { _uiEmit('show-controls-hint'); });
      this.time.delayedCall(3200, () => { _uiEmit('show-explore-hint'); });
    }

    // ── Touch joystick (mobile / iPad) ──────────────────────────────
    this._buildTouchJoystick();

    // ── 9. AUDIO — chapter-aware layered audio ───────────────────
    audioManager.init();
    audioManager.resume();
    if (_chData?.id) {
      // Use per-chapter audio profile (ambient + music + texture layers)
      audioManager.transitionToChapter(_chData.id);
    } else if (this._cfg.mood) {
      // Fallback to mood-based audio for non-chapter scenes
      const moodMusic = { warm: 'warm', rain: 'melancholy', dawn: 'warm', office: 'warm', romantic: 'romantic' };
      audioManager.startAmbient(moodMusic[this._cfg.mood] || 'warm');
    }

    // ── 10. TRANSITION-IN — cinematic chapter reveal ─────────────
    if (_chData?.id) {
      const txCfg = TransitionFX.forChapter(_chData.id);
      this._chapterTransitionCfg = txCfg;
      TransitionFX.play(this, txCfg.in, txCfg.inMs);

      // Fade color grade in alongside the reveal transition — avoids a hard snap to full tint.
      this.colorGrading.transition(_chData.id, txCfg.inMs);
    }

    // Store chapter data ref for transition-out
    this._chData = _chData;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SUBCLASS HOOKS — override these in each chapter
  // ═══════════════════════════════════════════════════════════════════

  /** Place ground/floor tiles. Called first. */
  buildGround() { /* override */ }

  /**
   * Scatter small ambient ground decorations across the floor band.
   * Called automatically after buildGround() and before buildProps().
   *
   * Default implementation uses mood to decide:
   *   • outdoor moods → scatter grass, stones, flowers via _spawnGroundDecor()
   *   • 'office' / 'indoor' → skipped (no grass inside a building)
   *
   * Override in a chapter scene to customise the prop pool, row range,
   * or density — or supply an empty override to suppress entirely.
   */
  buildGroundDecor() {
    if (['office', 'indoor', 'dark', 'romantic'].includes(this._cfg.mood)) return;
    this._spawnGroundDecor();
  }

  /**
   * Utility: deterministically scatter small visual-only props across a
   * horizontal floor band. Never adds physics bodies.
   *
   * Depth: top of midground (-1) — in front of floor tiles (-100) but
   * always behind gameplay objects (0+), including all Y-sorted entities.
   *
   * Density is derived from scene width relative to the camera viewport:
   * wider worlds (more pan distance) receive proportionally more props so
   * the visual density reads the same however far the player walks.
   *
   * @param {object}   [cfg]
   * @param {number[]} [cfg.rowRange]   — [minRow, maxRow] placement band (default: [3.0, rows-1.5])
   * @param {number}   [cfg.density]    — override density 0..1 (default: auto from viewport)
   * @param {string[]} [cfg.pool]       — texture key array; defaults to outdoor mix
   * @param {number}   [cfg.scaleMin=0.26]
   * @param {number}   [cfg.scaleMax=0.44]
   * @param {number}   [cfg.alphaMin=0.55]
   * @param {number}   [cfg.alphaMax=0.85]
   */
  _spawnGroundDecor(cfg = {}) {
    const cs       = this._cfg.cellSize;          // 64
    const totalCols = this._cfg.cols;
    const totalRows = this._cfg.rows;

    const rowMin = cfg.rowRange?.[0] ?? 3.0;
    const rowMax = cfg.rowRange?.[1] ?? totalRows - 1.5;

    // Default outdoor pool: grass is most common (3× weight), flowers/rocks/bushes accent
    const defaultPool = [
      'k-grass', 'k-grass', 'k-grass',
      'k-grass-large',
      'k-grass-leafs',
      'k-rock-small-a', 'k-rock-small-b',
      'k-flower-red', 'k-flower-yellow', 'k-flower-purple',
      // foliage-pack flowers — cuter, larger blooms scattered on the ground
      'foliage-flower-red', 'foliage-flower-blue', 'foliage-flower-tulip',
      // foliage-pack low hedges — fill midground without blocking gameplay view
      'foliage-bush2', 'foliage-bush3',
    ];
    const pool = (cfg.pool ?? defaultPool).filter(k => this.textures.exists(k));
    if (!pool.length) return;

    // Density derived from scene width vs approximate camera viewport width.
    // viewCols = how many grid columns fit in one screen-width at the target zoom.
    // If the world is wider than one viewport (player must scroll), scale prop
    // count proportionally so coverage stays visually consistent throughout.
    const viewCols = Math.max(1, (this.scale.width / this._cfg.targetZoom) / cs);
    const scrollSpan = Math.max(1, totalCols / viewCols);   // how many viewports wide the world is
    const baseDensity = 0.22;                                // props per sub-slot at 1× zoom
    const density = Math.min(0.55, cfg.density ?? baseDensity * scrollSpan);

    const scaleMin = cfg.scaleMin ?? 0.26;
    const scaleMax = cfg.scaleMax ?? 0.44;
    const alphaMin = cfg.alphaMin ?? 0.55;
    const alphaMax = cfg.alphaMax ?? 0.85;

    // Depth: very top of midground → just below gameplay layer
    const decDepth = this.layers.depth('midground', 98);  // = -1

    // Deterministic seed per scene — stable across hot-reloads
    const seed = this.sys.settings.key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    // Sub-column subdivisions: 2 per cell gives natural scatter without exact grid feel
    const subDiv = 2;
    const subCols = totalCols * subDiv;
    const rowStep = 0.5;

    for (let sc = 0; sc < subCols; sc++) {
      for (let r = rowMin; r < rowMax; r += rowStep) {
        // Cheap deterministic hash [0, 99] — no Math.random() so layout is stable
        const ri = Math.round(r * 100);
        const h  = ((sc * 31 + ri * 17 + seed * 7) & 0x7FFFFFFF) % 100;
        if (h >= density * 100) continue;

        // Pick texture deterministically from pool
        const ki  = ((sc * 13 + ri * 11 + seed * 3) & 0x7FFFFFFF) % pool.length;
        const key = pool[ki];

        // Sub-cell jitter: ±20px X, ±10px Y — breaks up the grid
        const jx = ((sc * 7  + ri * 13 + seed)      % 41) - 20;
        const jy = ((sc * 11 + ri *  7 + seed + 5)  % 21) - 10;

        const wx = (sc / subDiv) * cs + cs / 2 + jx;
        const wy = r * cs + cs / 2 + jy;

        const t     = ((sc * 19 + ri * 23 + seed) & 0x7FFFFFFF) % 100 / 100;
        const scale = scaleMin + (scaleMax - scaleMin) * t;
        const alpha = alphaMin + (alphaMax - alphaMin) * t;
        const flipX = ((sc + Math.round(r * 2) + seed) % 2 === 0);

        const img = this.add.image(wx, wy, key)
          .setOrigin(0.5, 0.9)
          .setScale(scale)
          .setAlpha(alpha)
          .setDepth(decDepth)
          .setFlipX(flipX);

        if (this.lighting) this.lighting.applyPipeline(img);
      }
    }
  }

  /** Place decorative props, furniture, interactables. */
  buildProps() { /* override */ }

  /** Create player + NPCs. Set this._player to the PlayerCharacter. */
  buildCharacters() { /* override */ }

  /** Add chapter-specific particle effects, overlays, screen FX. */
  buildFX() { /* override */ }

  /**
   * Ambient base particles — runs automatically for every chapter.
   * Very subtle floating motes. Subclasses should NOT override this.
   */
  _buildBaseParticles() {
    if (!this.textures.exists('particle-glow')) return;
    const W = this.worldW;
    const H = this.worldH;
    // Barely-visible drifting dust motes — depth below dialogue/UI
    this.add.particles(W / 2, H / 2, 'particle-glow', {
      x: { min: -W / 2, max: W / 2 },
      y: { min: -H / 2, max: H / 2 },
      speedX: { min: -6, max: 6 },
      speedY: { min: -4, max: 4 },
      scale:   { start: 0.04, end: 0 },
      alpha:   { start: 0.09, end: 0 },
      tint:    [0xFFFFFF, 0xEEEEFF, 0xFFEEFF],
      lifespan: { min: 5000, max: 10000 },
      frequency: 500,
      quantity: 1,
      blendMode: 'ADD',
    }).setDepth(this.layers.depth('fx', 2));
  }

  /**
   * Transition guard — prevents double-fire on chapter completion.
   * Wraps the callback so it only runs once. All chapters should call
   * this._guardTransition(() => { fadeOut → goToChapter }) in _chapterComplete().
   * @param {Function} fn — the actual transition logic (fadeOut + goToChapter)
   */
  _guardTransition(fn) {
    if (this._transitionDone) return;
    this._transitionDone = true;
    if (this.dialogue?.active) this.dialogue.end();
    audioManager.playTransitionWhoosh();

    // Use chapter-specific transition-out effect
    const txCfg = this._chapterTransitionCfg ?? TransitionFX.forChapter(this._chData?.id);
    TransitionFX.play(this, txCfg.out, txCfg.outMs, () => fn(), { color: 0x020008 });
  }

  /** Per-frame chapter-specific logic (after system updates). */
  onUpdate(_time, _delta) { /* override */ }

  /** Chapter-specific cleanup (called before system destroy). */
  onShutdown() { /* override */ }

  // ═══════════════════════════════════════════════════════════════════
  //  TOUCH JOYSTICK — virtual joystick for mobile / iPad
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Build (or rebuild on resize) a floating virtual joystick in the
   * lower-left third of the screen. On desktop it stays invisible until
   * a touch event lands. Works alongside keyboard.
   */
  _buildTouchJoystick() {
    // Tear down any previous instance — destroy graphics AND remove ALL input
    // listeners BEFORE reading new dimensions. Stale closures that capture old
    // W/H/ZONE_X/R_BASE will otherwise fire after a resize and draw the joystick
    // at wrong coordinates or allow right-side taps through the stale ZONE_X guard.
    if (this._joystickPtrDown) {
      this.input.off('pointerdown',   this._joystickPtrDown);
      this.input.off('pointermove',   this._joystickPtrMove);
      this.input.off('pointerup',     this._joystickPtrUp);
      this.input.off('pointercancel', this._joystickPtrUp);
      this._joystickPtrDown = null;
      this._joystickPtrMove = null;
      this._joystickPtrUp   = null;
    }
    this._joystickBase?.destroy();  this._joystickBase  = null;
    this._joystickThumb?.destroy(); this._joystickThumb = null;
    this._joystickHint?.destroy();  this._joystickHint  = null;
    // Reset active state so a stuck pointer from before the resize cannot
    // keep feeding stale dx/dy into the movement system.
    this._joyActive    = false;
    this._joyDx        = 0;
    this._joyDy        = 0;
    this._joyPointerId = -1;

    const W = this.scale.width;
    const H = this.scale.height;
    const isPortrait = H > W;
    // Radius scales to screen size — portrait gets slightly larger thumbs (easier to hit).
    const R_BASE  = Math.round(Math.min(W, H) * (isPortrait ? 0.11 : 0.10));
    const R_THUMB = Math.round(R_BASE * 0.48);
    const DEAD    = R_BASE * 0.15;
    // In portrait, the left half of screen is the joystick zone; landscape 40%.
    const ZONE_X  = isPortrait ? W * 0.50 : W * 0.40;

    // Safe-area bottom margin so the joystick doesn't sit behind the home bar.
    // Read at build time (stable per orientation).
    let safeB = 0;
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom').trim();
      safeB = raw ? (parseFloat(raw) || 0) : 0;
    } catch { /* ignore */ }

    this._joystickBase  = this.add.graphics().setScrollFactor(0).setDepth(this.layers.depth('fx', 180));
    this._joystickThumb = this.add.graphics().setScrollFactor(0).setDepth(this.layers.depth('fx', 181));
    // (_joyActive / _joyDx / _joyDy / _joyPointerId already reset at top of method)

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window);
    if (isMobile) {
      // Persistent ghost ring — stays visible at low alpha after hint intro fades.
      // This lets players always see where the joystick zone is without cluttering the scene.
      const hintX = W * 0.18;
      const hintY = H - R_BASE - safeB - 28;   // above safe area + comfortable thumb gap
      this._joystickHint = this.add.graphics().setScrollFactor(0).setDepth(this.layers.depth('fx', 179));

      const _drawHint = (alpha) => {
        this._joystickHint.clear();
        this._joystickHint.lineStyle(2, 0xFFFFFF, alpha);
        this._joystickHint.strokeCircle(hintX, hintY, R_BASE);
        this._joystickHint.fillStyle(0xFFFFFF, alpha * 0.35);
        this._joystickHint.fillCircle(hintX, hintY, R_BASE);
        // Directional arrow cross inside to indicate "move here"
        const arm = Math.round(R_BASE * 0.42);
        this._joystickHint.lineStyle(2.5, 0xFFFFFF, alpha * 1.4);
        this._joystickHint.lineBetween(hintX - arm, hintY, hintX + arm, hintY);
        this._joystickHint.lineBetween(hintX, hintY - arm, hintX, hintY + arm);
        this._joystickHint.fillStyle(0xFFFFFF, alpha * 1.8);
        this._joystickHint.fillCircle(hintX - arm, hintY, 3.5);
        this._joystickHint.fillCircle(hintX + arm, hintY, 3.5);
        this._joystickHint.fillCircle(hintX, hintY - arm, 3.5);
        this._joystickHint.fillCircle(hintX, hintY + arm, 3.5);
      };

      // AAA standard: no hint ring at all — joystick appears dynamically at
      // the exact finger-down position. Nothing to teach, nothing to crop.
      _drawHint(0);
      this._joystickHint.setAlpha(0);
    }

    const _draw = (ox, oy, dx, dy) => {
      this._joystickBase.clear();
      this._joystickThumb.clear();
      // Outer ring — rose-tinted to match game palette
      this._joystickBase.lineStyle(2.5, 0xFFCCDD, 0.45);
      this._joystickBase.strokeCircle(ox, oy, R_BASE);
      this._joystickBase.fillStyle(0x200010, 0.30);
      this._joystickBase.fillCircle(ox, oy, R_BASE);
      // Thumb
      const len = Math.sqrt(dx * dx + dy * dy);
      const clamp = Math.min(len, R_BASE);
      const nx = len > 0 ? dx / len * clamp : 0;
      const ny = len > 0 ? dy / len * clamp : 0;
      this._joystickThumb.fillStyle(0xFFDDEE, 0.80);
      this._joystickThumb.fillCircle(ox + nx, oy + ny, R_THUMB);
      this._joystickThumb.lineStyle(1.5, 0xFFFFFF, 0.35);
      this._joystickThumb.strokeCircle(ox + nx, oy + ny, R_THUMB);
    };

    this._joystickPtrDown = (ptr) => {
      if (this._joyActive || ptr.x > ZONE_X) return;
      this._joyActive = true;  this._joyPointerId = ptr.id;
      this._joyOriginX = ptr.x;  this._joyOriginY = ptr.y;
      this._joyDx = 0;  this._joyDy = 0;
      _draw(ptr.x, ptr.y, 0, 0);
      // Collapse the ghost hint while active
      if (this._joystickHint) {
        this.tweens.killTweensOf(this._joystickHint);
        this.tweens.add({ targets: this._joystickHint, alpha: 0, duration: 120 });
      }
    };
    this._joystickPtrMove = (ptr) => {
      if (!this._joyActive || ptr.id !== this._joyPointerId) return;
      const dx = ptr.x - this._joyOriginX;
      const dy = ptr.y - this._joyOriginY;
      const len = Math.sqrt(dx * dx + dy * dy);
      this._joyDx = len > DEAD ? dx / len : 0;
      this._joyDy = len > DEAD ? dy / len : 0;
      _draw(this._joyOriginX, this._joyOriginY, dx, dy);
    };
    this._joystickPtrUp = (ptr) => {
      if (ptr.id !== this._joyPointerId) return;
      this._joyActive = false;  this._joyDx = 0;  this._joyDy = 0;
      this._joystickBase.clear();  this._joystickThumb.clear();
      // Restore ghost hint at persistent low alpha
      if (this._joystickHint) {
        this.tweens.killTweensOf(this._joystickHint);
        this.tweens.add({ targets: this._joystickHint, alpha: 0.18, duration: 300 });
      }
    };

    this.input.on('pointerdown',   this._joystickPtrDown);
    this.input.on('pointermove',   this._joystickPtrMove);
    this.input.on('pointerup',     this._joystickPtrUp);
    this.input.on('pointercancel', this._joystickPtrUp);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROP HELPERS — sugar for common prop patterns
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Place a parallax background scene image (1024×1024 Kenney backgrounds).
   * Pinned to the viewport (scrollFactor 0) so it always fills the screen.
   * Parallax depth perception comes from the strip layers instead.
   * @param {string}  key    - Asset key starting with 'bg-scene-*'
   * @param {number}  [alpha=0.75]
   * @param {number}  [tint=0xFFFFFF]
   */
  _addSceneBackground(key, alpha = 0.75, tint = 0xFFFFFF) {
    if (!this.textures.exists(key)) return;
    const vW = this.scale.width;
    const vH = this.scale.height;
    // Scale to always cover the full viewport with a small margin
    const scale = Math.max(vW / 1024, vH / 1024) * 1.15;
    this.add.image(vW / 2, vH / 2, key)
      .setScrollFactor(0)
      .setAlpha(alpha)
      .setScale(scale)
      .setDepth(this.layers.depth('background'))
      .setTint(tint);
  }

  /**
   * Add a single parallax element at a precise position.
   * @param {string}  key        — texture key
   * @param {number}  x          — world x position
   * @param {number}  y          — world y position
   * @param {object}  [opts]
   * @param {number}  [opts.scrollFactorX=0.06]
   * @param {number}  [opts.scrollFactorY=0.03]
   * @param {number}  [opts.depth=-190]
   * @param {number}  [opts.alpha=0.5]
   * @param {number}  [opts.scale=1]
   * @param {number}  [opts.scaleX]  — independent horizontal scale (overrides scale)
   * @param {number}  [opts.scaleY]  — independent vertical scale (overrides scale)
   * @param {number}  [opts.tint]
   * @param {boolean} [opts.flipX=false]
   * @returns {Phaser.GameObjects.Image|null}
   */
  _addParallaxElement(key, x, y, opts = {}) {
    if (!this.textures.exists(key)) return null;
    const img = this.add.image(x, y, key)
      .setScrollFactor(opts.scrollFactorX ?? 0.06, opts.scrollFactorY ?? 0.03)
      .setDepth(opts.depth ?? this.layers.depth('background', 10))
      .setAlpha(opts.alpha ?? 0.5)
      .setFlipX(opts.flipX ?? false);
    if (opts.scaleX !== undefined || opts.scaleY !== undefined) {
      img.setScale(opts.scaleX ?? opts.scale ?? 1, opts.scaleY ?? opts.scale ?? 1);
    } else {
      img.setScale(opts.scale ?? 1);
    }
    if (opts.tint !== undefined) img.setTint(opts.tint);
    return img;
  }

  /**
   * Add a horizontal parallax strip (mountains, hills, ground).
   *
   * Kenney element strips are 1024×400 silhouette shapes with transparent
   * tops and opaque bottoms. They stack: mountains → hills → ground.
   *
   * Scaled to 3× the larger of world width or viewport-at-min-zoom,
   * so edges never show during camera pan on any screen size.
   *
   * @param {string}  key          — texture key (bg-el-mountains, bg-el-hills, etc.)
   * @param {number}  yFraction    — vertical position as fraction of worldH (0=top, 1=bottom)
   * @param {object}  [opts]       — same as _addParallaxElement opts + scaleY override
   * @returns {Phaser.GameObjects.Image|null}
   */
  _addParallaxStrip(key, yFraction, opts = {}) {
    if (!this.textures.exists(key)) return null;
    const W = this.worldW;
    const texW = this.textures.get(key).getSourceImage().width;
    // Use the minimum expected zoom to calculate the widest possible viewport
    const vW = this.scale.width;
    const vH = this.scale.height;
    // Dynamic zoom base uses the same BASE_W/BASE_H reference resolution.
    const minZoom = Math.max(0.5, this._cfg.zoom * Math.min(vW / BASE_W, vH / BASE_H, 3.0));
    const maxViewW = vW / minZoom;
    // 3× the larger of world width or min-zoom viewport width
    const coverW = Math.max(W, maxViewW) * 3;
    const scaleX = coverW / texW;
    const scaleY = opts.scaleY ?? scaleX;
    return this._addParallaxElement(key, W / 2, this.worldH * yFraction, {
      ...opts,
      scaleX,
      scaleY,
    });
  }

  /**
   * Place a cloud that drifts slowly across the scene.
   * @param {string}  key    — texture key (bgr-cloud1..5, bg-cloud1..2, etc.)
   * @param {number}  x      — starting world-space X
   * @param {number}  y      — world-space Y
   * @param {object}  [opts]
   * @param {number}  [opts.scrollFactorX=0.15]
   * @param {number}  [opts.scrollFactorY=0.05]
   * @param {number}  [opts.depth=-195]
   * @param {number}  [opts.alpha=0.5]
   * @param {number}  [opts.scale=1]
   * @param {number}  [opts.tint]
   * @param {number}  [opts.speed=6]  — pixels per second of horizontal drift
   * @returns {Phaser.GameObjects.Image|null}
   */
  _addDriftingCloud(key, x, y, opts = {}) {
    const img = this._addParallaxElement(key, x, y, {
      scrollFactorX: opts.scrollFactorX ?? 0.15,
      scrollFactorY: opts.scrollFactorY ?? 0.05,
      depth:         opts.depth ?? -195,
      alpha:         opts.alpha ?? 0.5,
      scale:         opts.scale ?? 1,
      tint:          opts.tint,
    });
    if (!img) return null;
    const speed = opts.speed ?? 6;
    // Infinite slow horizontal drift — wraps across a 4×worldW range
    const range = this.worldW * 4;
    const dur   = (range / speed) * 1000;
    this.tweens.add({
      targets: img,
      x: img.x + range,
      duration: dur,
      repeat: -1,
      ease: 'Linear',
    });
    return img;
  }

  /**
   * Place a bobbing emote icon above a world position.
   * @param {number} x
   * @param {number} y
   * @param {string} key    - Asset key starting with 'emote-*'
   * @param {object} [opts] - { scale, depth, alpha, delay }
   * @returns {Phaser.GameObjects.Image|null}
   */
  _addEmote(x, y, key, opts = {}) {
    if (!this.textures.exists(key)) return null;
    const s = opts.scale ?? 0.30;
    const img = this.add.image(x, y, key)
      .setScale(s)
      .setDepth(opts.depth ?? this.layers.depth('foreground'))  // foreground band (600+) guarantees above all Y-sorted chars (max≈576)
      .setAlpha(opts.alpha ?? 0.90);
    this.tweens.add({
      targets: img,
      y: y - 10,
      scaleX: s * 1.12,
      scaleY: s * 1.12,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: opts.delay ?? 0,
    });
    return img;
  }

  /**
   * Place a prop and register it as an interactable.
   * @param {number} col
   * @param {number} row
   * @param {string} texture
   * @param {object} interaction — { id, label, onTrigger, ... } for ProximityInteraction
   * @param {object} [opts]      — same as placeAt opts + shadow defaults
   * @returns {Phaser.GameObjects.Image|null}
   */
  placeInteractable(col, row, texture, interaction, opts = {}) {
    const img = this.placeAt(col, row, texture, {
      shadow: { width: 32, height: 7, offsetY: 6, alpha: 0.20 },
      ...opts,
    });
    if (!img) return null;

    // Gentle bob so interactables "breathe" and feel discoverable
    if (this.envFX) {
      this.envFX.bob(img, { amplitude: 1.5, speed: 0.8 });
    }

    this.proximity.register({
      gameObject: img,
      triggerRadius: 60,
      glowRadius: 130,
      ...interaction,
    });
    return img;
  }

  /**
   * Fill a rectangular region of the grid with a ground tile.
   * @param {number} startCol
   * @param {number} startRow
   * @param {number} endCol — exclusive
   * @param {number} endRow — exclusive
   * @param {string} texture
   * @param {object} [opts]
   * @param {number} [opts.scale]
   */
  fillGround(startCol, startRow, endCol, endRow, texture, opts = {}) {
    if (!this.textures.exists(texture)) return;
    const s = this._cfg.cellSize;
    const w = (endCol - startCol) * s;
    const h = (endRow - startRow) * s;
    const tile = this.add.tileSprite(
      startCol * s + w / 2, startRow * s + h / 2, w, h, texture
    );
    if (opts.scale) tile.setScale(opts.scale);
    this.layers.place(tile, 'midground');
    this.lighting.applyPipeline(tile);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════════════

  /** Reset all movement key states so no direction is "held" when input re-enables. */
  _resetMovementKeys() {
    const keys = [
      this.cursors?.left, this.cursors?.right,
      this.cursors?.up,   this.cursors?.down,
      this.wasd?.A, this.wasd?.D, this.wasd?.W, this.wasd?.S,
    ];
    for (const k of keys) {
      if (k) k.reset();
    }
  }

  /** Zero out player physics velocity and internal inertia state immediately. */
  _stopPlayer() {
    if (!this._player) return;
    const body = this._player.sprite?.body;
    if (body) body.setVelocity(0, 0);
    // Also clear the interpolated velocity so inertia doesn't resume on unlock
    this._player._curVx = 0;
    this._player._curVy = 0;
  }

  update(time, delta) {
    const dialogueActive = this.dialogue?.active ?? false;

    // When dialogue becomes active this frame, immediately stop the player
    // so held-key inertia doesn't carry the character across the scene.
    // Also pause NPC AI so Aashna doesn't wander during cutscenes.
    if (!this._prevDialogueActive && dialogueActive) {
      this._stopPlayer();
      this.charSystem.stopNPCs();
    }

    // When dialogue just finished this frame, reset all held keys so the
    // player doesn't lurch forward because a key was held during the lock.
    // Resume NPC wander/follow.
    if (this._prevDialogueActive && !dialogueActive) {
      this._resetMovementKeys();
      this.charSystem.resumeNPCs();
    }
    this._prevDialogueActive = dialogueActive;

    // Block player movement and proximity triggers while dialogue is playing.
    // This prevents skipping intros by walking into interactables early.
    if (this._player && !dialogueActive) {
      // ── Touch joystick injection — feed virtual direction into physics body
      // when joystick is active. Keyboard input is handled by handleInput();
      // joystick can run in parallel (e.g. keyboard on desktop stays working).
      if (this._joyActive && (Math.abs(this._joyDx) > 0.05 || Math.abs(this._joyDy) > 0.05)) {
        const spd = 120;
        const vx  = this._joyDx * spd;
        const vy  = this._joyDy * spd;
        if (this._player.sprite?.body) {
          this._player.sprite.body.setVelocity(vx, vy);
          this._player._curVx = vx;
          this._player._curVy = vy;
        }
      } else {
        this._player.handleInput(this.cursors, this.wasd, delta);
      }
    }

    // System ticks — depthMgr MUST run before shadows so that shadows read
    // the same-frame depth value (not the previous frame's stale value).
    this.charSystem.update(time, delta);
    this.depthMgr.update();
    this.shadows.update();
    this.lighting.update(time);
    this.cam.update(time);
    this.envFX.update(time);

    // Proximity interaction — also gated behind dialogue check
    if (this._player && !dialogueActive) {
      this.proximity.update(this._player.sprite.x, this._player.sprite.y, time);
    }

    // Footstep audio — runs even during dialogue at reduced volume (see FootstepSystem)
    if (this._player) {
      this.footsteps?.update(time, delta, this._player, dialogueActive);
    }

    // Chapter-specific logic
    this.onUpdate(time, delta);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SHUTDOWN
  // ═══════════════════════════════════════════════════════════════════

  shutdown() {
    this.onShutdown();
    clearTimeout(this._resizeLightingTimer);
    audioManager.fadeOutAll(800);
    this.scale.off('resize', this._onResize);
    this.footsteps?.destroy();
    this.proximity?.destroy();
    this.lighting?.destroy();
    this.shadows?.destroy();
    this.charSystem?.destroy();
    this.depthMgr?.destroy();
    this.envFX?.destroy();
    this.colorGrading?.destroy();
    this.cam?.destroy();
  }
}
