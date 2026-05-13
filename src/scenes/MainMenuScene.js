import { audioManager, getSafeAreaBottom } from '../utils/helpers.js';
import storyData from '../data/story.json';
import { getSceneKey }   from '../systems/SceneManager.js';
import { LayerManager }   from '../systems/LayerManager.js';
import { DepthManager }   from '../systems/DepthManager.js';
import { SceneLighting }  from '../systems/SceneLighting.js';
import { ShadowRenderer } from '../systems/ShadowRenderer.js';
import { CameraController } from '../systems/CameraController.js';
import { Character }      from '../systems/Character.js';
import { FemaleCharacter } from '../systems/FemaleCharacter.js';

// ─── World constants ──────────────────────────────────────────────────────────
const CELL    = 64;
const COLS    = 14;
const ROWS    = 8;
const WORLD_W = COLS * CELL;   // 896 px
const WORLD_H = ROWS * CELL;   // 512 px

// Roguelike spritesheet tile indices (57 cols wide, 0-based)
const TILES = {
  GRASS:     [2, 3, 4, 5],
  GRASS_ALT: [57, 58, 59],
  STONE:     [119, 120],
  DIRT:      [518, 519, 520],
};

/** World-space center of a grid cell. */
function grid(col, row) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

// ─────────────────────────────────────────────────────────────────────────────

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  // ═══════════════════════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════════════════════

  create() {
    // Reset shutdown flag so _buildUI() works correctly on Play Again (scene restart).
    // Phaser reuses the same instance, so flags from the previous session persist.
    this._isShutdown    = false;
    // Reset the intro-animation flag so the full staggered entrance runs on scene
    // restart (Play Again).  Resize calls _buildUI() directly — not create() — so
    // after the first run _menuReady stays true for those skipped-intro redraws.
    this._menuReady     = false;
    // _transitioning is set true when Begin/Continue is clicked and only cleared in
    // shutdown(). On scene restart (Play Again) the instance is reused, so without
    // this reset the buttons are permanently dead.
    this._transitioning = false;
    // Null out _menuUI reference: on scene restart Phaser already destroyed all
    // group members via DisplayList.shutdown(), leaving the Group with an
    // inconsistent internal Set. Nulling here means _buildUIInner()'s guard
    // skips the broken clear()/destroy() and creates a fresh group instead.
    this._menuUI        = null;
    this._resizeDebounce = null;

    // Reset any stale camera FX (fade/flash) left from a previous run of this scene
    // or from another scene's camera that may have shared state. Then force the camera
    // to start at solid black so the scene is hidden until the fade-in completes.
    this.cameras.main.resetFX();
    this.cameras.main.setBackgroundColor(0x000000);

    try {

    // 1. Layer + depth systems (must exist before Character constructors)
    this.layers   = new LayerManager(this);
    this.depthMgr = new DepthManager(this, this.layers);
    this.shadows  = new ShadowRenderer(this);

    // 2. Warm lighting — low vignette, romantic tone
    this.lighting = new SceneLighting(this, {
      mood:           'warm',
      lightRadius:    280,
      lightIntensity: 0.95,
      blobScale:      2.4,
      blobAlpha:      0.18,
      // dofEdges: false — the painted backdrop in _buildShimmer replaces
      // the system vignette with something much richer; no need for the overlay.
      dofEdges:       false,
      sceneTint:      true,
    });
    this.lighting.create();

    // 3. Camera — starts at 1.0, zooms to target; gentle sinusoidal drift.
    // Mobile landscape (short viewports, e.g. 390px tall) need a lower zoom so
    // the world (512px tall) doesn't overflow the screen and make everything huge.
    // We cap zoom so the world height never exceeds ~90% of viewport height.
    // Desktop and iPad are unaffected — their viewport height is large enough
    // that the 1.20 cap is never hit (e.g. 900px viewport → 900/512*0.9 = 1.58).
    const _vH = this.scale.height;
    const _vW = this.scale.width;
    const _isMobileLandscape = _vH < _vW && _vH < 500;
    // Mobile landscape: fit by WIDTH so the world fills the screen edge-to-edge
    // and there is no empty void column on the right side.
    // e.g. iPhone 844×390 → 844/896 = 0.942, world fills screen width exactly.
    // Height overflow (~92px) is absorbed by the camera centering on the middle.
    // Desktop/iPad are unaffected (their vH >= 500 so this branch never runs).
    const _maxZoomByWidth = _vW / WORLD_W;
    const _targetZoom = _isMobileLandscape
      ? Math.min(1.20, _maxZoomByWidth)
      : 1.20;
    const _startZoom = Math.min(1.0, _targetZoom);
    // Stored so _buildUIInner() can compensate footer Y for the final zoom value.
    this._menuTargetZoom = _targetZoom;

    this.cam = new CameraController(this, {
      zoom:        _startZoom,
      targetZoom:  _targetZoom,
      introMs:     2800,
      drift:       true,
      driftAmpX:   9,
      driftAmpY:   5,
      driftSpeedX: 0.00022,
      driftSpeedY: 0.00038,
      fadeInMs:    1400,
      bounds:      [0, 0, WORLD_W, WORLD_H],
    });
    // Centre camera on world — no follow target
    this.cameras.main.centerOn(WORLD_W / 2, WORLD_H / 2);

    // 4. Build world
    this._buildGround();
    this._buildProps();
    this._buildFloatingMemories();
    this._buildCharacters();
    this._buildParticles();
    this._buildShimmer();

    // 5. UI overlay (scrollFactor 0, high depth — drawn last for clarity)
    this._buildUI();

    // Rebuild background + UI whenever Phaser detects a resize
    // (iOS Safari URL bar hide/show, device rotation, etc.)
    //
    // DEBOUNCED at 380ms for two reasons:
    //   1. iOS/Android fire the resize event before the layout has settled to
    //      the final orientation dimensions. Rebuilding immediately uses the
    //      still-portrait (or still-landscape) dimensions, so the card never
    //      switches layout. 380ms > 300ms iOS settle time.
    //   2. Chrome DevTools opens by firing 2–3 rapid resize events as the
    //      panel animates in. Without a debounce every intermediate size
    //      triggers a full shimmer + UI rebuild.
    this._resizeHandler = () => {
      clearTimeout(this._resizeDebounce);
      this._resizeDebounce = setTimeout(() => {
        if (this._isShutdown) return;
        const vH = this.scale.height;
        const vW = this.scale.width;
        // Guard: ignore transient 0-px frames that can fire during DevTools open.
        // A canvas with width or height < 50 is always momentary — skip the rebuild
        // and let the next settled event handle it.
        if (vW < 50 || vH < 50) return;
        // Guard: cameras.main can be null if scale.refresh() fires against a
        // mid-transition or not-yet-active scene (e.g. after 360° rotation).
        if (!this.cameras?.main) return;
        // Recalculate camera zoom for mobile landscape after orientation change.
        const isMob = vH < vW && vH < 500;
        if (isMob) {
          const newZoom = Math.min(1.20, vW / WORLD_W);
          this.cameras.main.setZoom(newZoom);
          this.cam?.configure({ targetZoom: newZoom });
        } else {
          // Restore desktop / tablet target zoom (no-op if already correct)
          this.cameras.main.setZoom(1.20);
          this.cam?.configure({ targetZoom: 1.20 });
        }
        // Keep _menuTargetZoom in sync so _buildUIInner footer Y is correct after resize.
        this._menuTargetZoom = isMob ? Math.min(1.20, vW / WORLD_W) : 1.20;
        this._buildShimmer();
        this._buildUI();
      }, 380);
    };
    this.scale.on('resize', this._resizeHandler, this);

    // Belt-and-suspenders final camera fade-in. CameraController already calls
    // cameras.main.fadeIn() in its constructor (early in create), but wrapping
    // all content setup in try-catch means some paths might reach here with a
    // partially-built scene. Calling fadeIn() here — after ALL content is placed —
    // ensures the black-to-scene reveal always starts from the correct point.
    // Camera.fadeIn() has force=true hardcoded, so this safely restarts the effect.
    this.cameras.main.fadeIn(1400, 0, 0, 0);

    } catch (err) {
      // If anything in create() throws, log it and still start the fade-in so the
      // game loop is NOT left in a broken black state. The backgroundColor was set
      // to 0x07040E in _buildGround(); fall back to dark so partial content is visible.
      console.error('[MainMenuScene] create() error:', err);
      this.cameras.main.setBackgroundColor(0x07040E);
      this.cameras.main.fadeIn(1400, 0, 0, 0);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — roguelike tilemap, grass + stone path
  // ═══════════════════════════════════════════════════════════════════

  _buildGround() {
    // Parallax background scene — always visible regardless of tileset status
    this.cameras.main.setBackgroundColor(0x07040E);
    if (this.textures.exists('bg-scene-grass')) {
      // Use screen diagonal to guarantee coverage on any aspect ratio / snapshot timing
      const vW = Math.max(this.scale.width,  1200);
      const vH = Math.max(this.scale.height, 1200);
      const scale = Math.max(vW / 1024, vH / 1024) * 1.15;
      this.add.image(vW / 2, vH / 2, 'bg-scene-grass')
        .setScrollFactor(0).setAlpha(0.28).setScale(scale)
        .setDepth(-200).setTint(0x2A0828);
    }

    const TILE = 16;
    const MW = Math.round(WORLD_W / TILE);  // 56
    const MH = Math.round(WORLD_H / TILE);  // 32

    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: MW, height: MH });
    const tileset = map.addTilesetImage('roguelikeTiles', 'roguelike-tiles', TILE, TILE, 0, 1);

    if (!tileset) {
      console.warn('[MainMenu] roguelike-tiles texture not found — tilemap skipped.');
      this._map = null;
      return;
    }

    // Ground layer — varied grass
    const groundLayer = map.createBlankLayer('ground', tileset);
    groundLayer.setDepth(-100);
    groundLayer.setPipeline('Light2D');
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const pool = (x + y) % 7 === 0 ? TILES.GRASS_ALT : TILES.GRASS;
        groundLayer.putTileAt(pool[(x * 7 + y * 13) % pool.length], x, y);
      }
    }

    // Path layer — horizontal stone walkway through grid row 4 (world y=288)
    // Grid row 4 in tile coords: rows 16–19 (4 tiles high = 64 px = 1 cell)
    const pathLayer = map.createBlankLayer('path', tileset);
    pathLayer.setDepth(-90);
    pathLayer.setPipeline('Light2D');

    const pathTop = 15, pathBot = 20;
    for (let x = 4; x < MW - 4; x++) {
      pathLayer.putTileAt(TILES.DIRT[x % 3], x, pathTop);
      pathLayer.putTileAt(TILES.DIRT[x % 3], x, pathBot);
    }
    for (let ty = pathTop + 1; ty < pathBot; ty++) {
      for (let x = 4; x < MW - 4; x++) {
        pathLayer.putTileAt(TILES.STONE[(x + ty) % 2], x, ty);
      }
    }

    this._map = map;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — Kenney k-* assets only
  // ═══════════════════════════════════════════════════════════════════

  _buildProps() {
    // ── Trees — left framing ──────────────────────────────────────
    // Tinted to blend with the rose-violet backdrop — no bright Kelly green.
    const tL1 = this._place(0.5, 1.0, 'k-tree-oak',     0.38); if (tL1) tL1.setTint(0xBBAABB).setAlpha(0.72);
    const tL2 = this._place(1.5, 0.5, 'k-tree-tall',    0.36); if (tL2) tL2.setTint(0xAA99AA).setAlpha(0.65);
    const tL3 = this._place(0.5, 6.5, 'k-tree-fat',     0.38); if (tL3) tL3.setTint(0xCCBBBB).setAlpha(0.78);
    const tL4 = this._place(1.5, 7.2, 'k-tree-default', 0.36); if (tL4) tL4.setTint(0xBBAABB).setAlpha(0.72);

    // ── Trees — right framing ─────────────────────────────────────
    const tR1 = this._place(12.5, 1.0, 'k-tree-pine-a',   0.36); if (tR1) tR1.setTint(0xAA99AA).setAlpha(0.65);
    const tR2 = this._place(13.5, 0.5, 'k-tree-oak',      0.38); if (tR2) tR2.setTint(0xBBAABB).setAlpha(0.72);
    const tR3 = this._place(12.5, 6.5, 'k-tree-detailed', 0.36); if (tR3) tR3.setTint(0xCCBBBB).setAlpha(0.78);
    const tR4 = this._place(13.5, 7.2, 'k-tree-fat',      0.38); if (tR4) tR4.setTint(0xBBAABB).setAlpha(0.72);

    // ── Mid-field foliage — left ──────────────────────────────────
    this._place(2.2, 2.5, 'k-bush',           0.26);
    this._place(2.0, 5.6, 'k-bush-small',     0.22);
    this._place(1.2, 4.8, 'k-flower-yellow',  0.22);

    // ── Mid-field foliage — right ─────────────────────────────────
    this._place(11.5, 2.5, 'k-bush-large',    0.26);
    this._place(11.8, 5.5, 'k-flower-purple', 0.22);
    this._place(12.5, 4.8, 'k-flower-red',    0.22);

    // ── Bench — beside where female character stands ──────────────
    const propShadow = { width: 34, height: 7, offsetY: 5, alpha: 0.18 };
    this._place(9.5, 4.1, 'k-bench', 0.34, propShadow);

    // ── Floor lamp — near player, left-center ─────────────────────
    this._place(5.5, 3.6, 'k-lamp-floor', 0.30, propShadow);

    // Warm additive glow beneath the lamp
    const lp = grid(5, 4);
    this.add.image(lp.x + 10, lp.y - 12, 'light-blob')
      .setScale(1.6).setAlpha(0.24).setBlendMode('ADD').setTint(0xFFBB66)
      .setDepth(50);
  }

  /**
   * Internal: place a Kenney prop with Y-sort + Light2D + optional shadow.
   */
  _place(col, row, texture, scale, shadow) {
    if (!this.textures.exists(texture)) return null;
    const pos = grid(col, row);
    const img = this.add.image(pos.x, pos.y, texture)
      .setScale(scale)
      .setOrigin(0.5, 0.9);
    this.depthMgr.addYSort(img);
    this.lighting.applyPipeline(img);
    if (shadow) this.shadows.add(img, shadow);
    return img;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FLOATING MEMORIES — translucent world objects drifting mid-layer
  // ═══════════════════════════════════════════════════════════════════

  _buildFloatingMemories() {
    // Objects from shared memories drift at very low opacity — evocative,
    // not literal. Each uses a slightly different parallax scroll-factor
    // so they separate in depth as the camera drifts.
    const mems = [
      { col:  4.8, row: 2.2, key: 'k-chair',      scale: 0.26, alpha: 0.13, tint: 0xFFDDEE, dur: 3800, delay:    0, sf: 0.45 },
      { col:  8.4, row: 5.4, key: 'k-lamp-table',  scale: 0.22, alpha: 0.11, tint: 0xFFCCBB, dur: 5100, delay:  900, sf: 0.55 },
      { col:  2.8, row: 5.8, key: 'k-sofa',        scale: 0.24, alpha: 0.09, tint: 0xEECCFF, dur: 4600, delay: 1700, sf: 0.40 },
      { col:  9.6, row: 2.0, key: 'k-chair-desk',  scale: 0.20, alpha: 0.10, tint: 0xFFDDCC, dur: 6200, delay: 2500, sf: 0.60 },
      { col:  6.2, row: 6.2, key: 'k-plant-pot',   scale: 0.22, alpha: 0.12, tint: 0xDDFFCC, dur: 4200, delay:  500, sf: 0.50 },
    ];

    for (const m of mems) {
      if (!this.textures.exists(m.key)) continue;
      const pos = grid(m.col, m.row);
      const obj = this.add.image(pos.x, pos.y, m.key)
        .setScale(m.scale)
        .setAlpha(m.alpha)
        .setDepth(180)
        .setTint(m.tint)
        .setScrollFactor(m.sf, m.sf);
      this.tweens.add({
        targets:  obj,
        y:        pos.y + 14,
        duration: m.dur,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
        delay:    m.delay,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS — Kenney Mini Characters, tween-animated
  // ═══════════════════════════════════════════════════════════════════

  _buildCharacters() {
    // Male character — idle only (pure Character base, no physics / no input)
    const mPos = grid(4, 4);
    this._maleChar = new Character(this, mPos.x, mPos.y, 'char-male', {
      displayW:   40,
      displayH:   62,
      shadowW:    24,
      shadowH:    8,
      lightTint:  0xFFBB99,
      lightScale: 1.6,
      lightAlpha: 0.12,
    });

    // Attach the lighting follow-light to the male character
    this.lighting.followTarget(this._maleChar.sprite);

    // Female character — right of scene, visible and present.
    // Camera is bounds-clamped to scrollX≈0 on wide viewports (world 896px < viewport).
    // Card right edge = cx+230 ≈ screen x 822. Need world x > 822 → col 13 (world x=864).
    const fPos = grid(15, 4);
    this._femaleChar = new FemaleCharacter(this, fPos.x, fPos.y, {
      displayW:     40,
      displayH:     62,
      shadowW:      24,
      shadowH:      8,
      lightTint:    0xFFAACC,
      lightScale:   1.4,
      lightAlpha:   0.10,
      wanderRadius: 18,
      wanderPause:  3500,
    });

    // Slightly soft — she's waiting, memory-like but clearly present
    this._femaleChar.sprite.setAlpha(0.88);
    this._femaleChar.light.setAlpha(0.32);

    // Push sprite + light ABOVE the vignette (depth 900) — she's at screen-edge
    // where the vignette is near-opaque. Shadow sits BELOW the vignette (depth 596)
    // so it doesn't compete with the glow pool above.
    // Remove from Y-sort first so DepthManager.update() doesn't override.
    this.depthMgr.removeYSort(this._femaleChar.sprite);
    this.depthMgr.removeYSort(this._femaleChar.light);
    this._femaleChar.sprite.resetPipeline();
    this._femaleChar.sprite.setDepth(920);
    this._femaleChar.light.setDepth(918);

    // Manual shadow ellipse — pinned at depth 596 (below vignette 900).
    // Character.shadow was removed from the base class; this replaces it for
    // the main menu where a fixed-depth shadow is needed, not a Y-sorted one.
    this._femaleCharShadow = this.add.ellipse(
      fPos.x, fPos.y + 12, 32, 8, 0x000000, 0.20
    ).setDepth(596);

    // Warm rose glow pool beneath Aashna — starts visible immediately
    if (this.textures.exists('light-blob')) {
      this._aGlow = this.add.image(fPos.x, fPos.y + 12, 'light-blob')
        .setScale(3.8, 2.2).setAlpha(0.22).setTint(0xFFCCDD)
        .setBlendMode('ADD').setDepth(919);
      this.tweens.add({
        targets:  this._aGlow,
        alpha:    { from: 0.22, to: 0.10 },
        scale:    { from: 3.8, to: 4.2 },
        duration: 3200,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    }

    // Very small wander — world right edge is at col 14 (x=896), only ~128px away.
    this._femaleChar.wander(fPos.x, fPos.y, 10);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PARTICLES — ambient petals + sparkles
  // ═══════════════════════════════════════════════════════════════════

  _buildParticles() {
    // Slow falling petals across the world
    this.add.particles(WORLD_W / 2, -10, 'particle-petal', {
      x:        { min: -WORLD_W / 2, max: WORLD_W / 2 },
      y:        0,
      speedY:   { min: 18, max: 40 },
      speedX:   { min: -18, max: 18 },
      scale:    { start: 0.45, end: 0.14 },
      alpha:    { start: 0.42, end: 0 },
      rotate:   { min: 0, max: 360 },
      lifespan: { min: 5500, max: 8500 },
      frequency: 420,
      quantity:  1,
      blendMode: 'ADD',
    }).setDepth(820);

    // Soft ambient sparkles — particle-star-k is a crisp Kenney 4-point star,
    // replacing the canvas-generated particle-sparkle with higher-quality art.
    this.add.particles(WORLD_W / 2, WORLD_H / 2, 'particle-star-k', {
      x:        { min: -WORLD_W / 2, max: WORLD_W / 2 },
      y:        { min: -WORLD_H / 2, max: WORLD_H / 2 },
      speed:    { min: 2, max: 9 },
      scale:    { start: 0.18, end: 0 },
      alpha:    { start: 0.32, end: 0 },
      lifespan: { min: 2500, max: 4500 },
      frequency: 550,
      quantity:  1,
      blendMode: 'ADD',
    }).setDepth(821);
  }

  // ═══════════════════════════════════════════════════════════════════  //  SHIMMER — memory particles, heartbeat orbs, soft edge blur
  // ═══════════════════════════════════════════════════════════════

  _buildShimmer() {
    // Teardown previous shimmer objects before recreating (handles resize)
    if (this._shimmerParticles) { this._shimmerParticles.destroy(); this._shimmerParticles = null; }
    if (this._shimmerOrbs)      { this._shimmerOrbs.forEach(o => o.destroy()); this._shimmerOrbs = null; }
    if (this._shimmerBg)    { this._shimmerBg.destroy();    this._shimmerBg    = null; }
    if (this._shimmerStars) { this._shimmerStars.destroy(); this._shimmerStars = null; }
    if (this._shimmerVeil)  { this._shimmerVeil.destroy();  this._shimmerVeil  = null; }
    if (this._shimmerVig)   { this._shimmerVig.destroy();   this._shimmerVig   = null; }

    // ── 1. Rising memory motes ────────────────────────────────────
    // Light particles drift upward from the ground, like memories
    // surfacing. speedY is negative = upward in Phaser.
    this._shimmerParticles = this.add.particles(WORLD_W / 2, WORLD_H + 10, 'particle-glow', {
      x:        { min: -WORLD_W / 2, max: WORLD_W / 2 },
      y:        0,
      speedY:   { min: -38, max: -10 },
      speedX:   { min: -10, max: 10 },
      scale:    { start: 0.15, end: 0 },
      alpha:    { start: 0.30, end: 0 },
      tint:     [0xFFEEDD, 0xFFCCEE, 0xFFDDFF, 0xCCEEFF],
      lifespan: { min: 4000, max: 7200 },
      frequency: 290,
      quantity:  1,
      blendMode: 'ADD',
    }).setDepth(822);

    // ── 2. Background heartbeat orbs ──────────────────────────────
    // Three large additive blobs at world depth 7, each breathing at
    // its own rate — creates organic "occasional glow pulse" feel.
    const orbs = [
      { x: WORLD_W * 0.22, y: WORLD_H * 0.42, tint: 0xFFBB88, scale: 6.5, alpha: 0.07, dur: 4400, delay:    0 },
      { x: WORLD_W * 0.68, y: WORLD_H * 0.38, tint: 0xFF99CC, scale: 7.0, alpha: 0.08, dur: 6200, delay: 1700 },
      { x: WORLD_W * 0.50, y: WORLD_H * 0.62, tint: 0xDDAAFF, scale: 5.5, alpha: 0.06, dur: 8100, delay: 3300 },
    ];
    this._shimmerOrbs = [];
    for (const o of orbs) {
      const blob = this.add.image(o.x, o.y, 'light-blob')
        .setScale(o.scale * 0.88)
        .setAlpha(0)
        .setBlendMode('ADD')
        .setTint(o.tint)
        .setDepth(7);
      this._shimmerOrbs.push(blob);
      this.tweens.add({
        targets:  blob,
        alpha:    { from: 0, to: o.alpha },
        scaleX:   { from: o.scale * 0.88, to: o.scale },
        scaleY:   { from: o.scale * 0.88, to: o.scale },
        duration: o.dur,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
        delay:    o.delay,
      });
    }

    // ── 3. Painted backdrop — ABOVE tiles, BELOW characters ──────
    // Depth -55 sits above tile layers (−100/−90) but below the
    // gameplay layer (0+), so characters/trees float on painted air.

    const { width: W, height: H } = this.scale;
    // Use a generous oversize so any iOS snapshot-timing shortfall is covered.
    const BW = Math.max(W, 1200);
    const BH = Math.max(H, 1200);

    const bg = this._shimmerBg = this.add.graphics().setScrollFactor(0).setDepth(-55);

    // Near-solid base: kills the tile pattern completely
    bg.fillStyle(0x04000C, 1.0);
    bg.fillRect(0, 0, BW, BH);

    // Deep violet night sky — upper 45%
    bg.fillStyle(0x120030, 0.78);
    bg.fillRect(0, 0, BW, BH * 0.45);

    // Warm rose-amber horizon — where the characters stand
    bg.fillStyle(0x2C0B20, 0.62);
    bg.fillRect(0, BH * 0.28, BW, BH * 0.50);

    // Dark footer fade — rich deep plum
    bg.fillStyle(0x060009, 0.65);
    bg.fillRect(0, BH * 0.72, BW, BH * 0.28);

    // ── 4. Bokeh star-field scattered across the sky ──────────────
    // Deterministic pseudo-random positions — tiny soft circles.
    const stars = this._shimmerStars = this.add.graphics().setScrollFactor(0).setDepth(-50);
    for (let i = 0; i < 55; i++) {
      const sx  = ((i * 137 + 29)  % 940) + 10;
      const sy  = ((i * 97  + 53)  % Math.floor(BH * 0.62));
      const rad = 0.4 + (i % 4) * 0.4;
      const a   = 0.12 + (i % 6) * 0.06;
      stars.fillStyle(0xFFEEFF, a);
      stars.fillCircle(sx, sy, rad);
    }
    // A handful of slightly brighter accent stars
    const accentStars = [[120,45],[380,28],[640,55],[820,38],[240,80],[700,22],[510,68]];
    for (let [sx, sy] of accentStars) {
      sx = Math.min(sx, W - 10);
      stars.fillStyle(0xFFDDEE, 0.55);
      stars.fillCircle(sx, sy, 1.2);
    }

    // ── 5. Soft character silhouette dim (fx layer) ───────────────
    // Light veil — dreamy atmosphere, kept thin so world reads clearly.
    const veil = this._shimmerVeil = this.add.graphics().setScrollFactor(0).setDepth(502);
    veil.fillStyle(0x03000A, 0.18);
    veil.fillRect(0, 0, BW, BH);

    // ── 6. Vignette: screen-edge softening ───────────────────────
    this._shimmerVig = this.add.image(W / 2, H / 2, 'vignette')
      .setScrollFactor(0)
      .setScale(Math.max(W, H) / 512 * 1.12)
      .setAlpha(0.55)
      .setTint(0xCCBBEE)
      .setDepth(900);
  }

  // ═══════════════════════════════════════════════════════════════  //  UI OVERLAY — fixed to screen (scrollFactor 0, depth 1000+)
  // ═══════════════════════════════════════════════════════════════════

  _buildUI() {
    // Guard against stale resize callbacks fired after scene shutdown
    if (this._isShutdown) return;
    try {
    this._buildUIInner();
    } catch (err) {
      console.error('[MainMenuScene] _buildUI() error:', err);
    }
  }

  _buildUIInner() {
    // ── Teardown previous UI on resize ────────────────────────────
    this._titleFloatTween?.stop();
    this._dedicFloatTween?.stop();
    this._btnPulseTween?.stop();
    this._btnTextPulse?.stop();
    if (this._typewriterEvent) { this.time.removeEvent(this._typewriterEvent); this._typewriterEvent = null; }
    // Guard: only clear/destroy if the Group is still active (not already destroyed
    // by Phaser's scene cleanup). Destroyed Groups have active=false and children=null;
    // calling clear() on them throws "undefined is not an object (evaluating 'children.size')".
    if (this._menuUI?.active) { this._menuUI.clear(true, true); this._menuUI.destroy(); }
    this._menuUI    = this.add.group();
    const skipIntro = !!this._menuReady;
    this._menuReady = true;

    const { width: W, height: H } = this.scale;
    const cx = W / 2;
    const cy = H / 2;
    const safeB = getSafeAreaBottom();

    // Helper — fixes object to screen + tracks it for teardown on resize
    const pin = (obj) => { this._menuUI.add(obj); return obj.setScrollFactor(0); };

    // ── Vertical layout anchors ──────────────────────────────────────
    // Portrait (phone): positions derived from screen-fraction so the card
    // always fills ~84% of screen height — no dead zones above/below.
    // Landscape (desktop/tablet): classic cy-based fixed offsets.
    const isPortrait = H > W;
    let titleY, ornY, dedicationY, taglineY, dividerY, btnY, contBtnY;
    if (isPortrait) {
      // Reserve 8% at top, 6% + safe area at bottom, distribute inside.
      const t0   = H * 0.08;
      const t1   = H - safeB - H * 0.06;
      const span = t1 - t0;
      titleY      = Math.round(t0 + span * 0.10);
      ornY        = Math.round(t0 + span * 0.20);
      dedicationY = Math.round(t0 + span * 0.28);
      // Increased gap: taglineY fraction raised from 0.36 → 0.39 so there
      // is visibly more air between “for PrAashi” and “A Love Quest”.
      taglineY    = Math.round(t0 + span * 0.39);
      dividerY    = Math.round(t0 + span * 0.47);
      btnY        = Math.round(t0 + span * 0.62);
      contBtnY    = Math.round(t0 + span * 0.76);
    } else {
      titleY      = cy - 120;
      ornY        = cy - 84;
      dedicationY = cy - 68;
      // Increased gap: was cy-52 (16px below dedication), now cy-42 (26px).
      // The extra 10px of breathing room between “for Praashi” and “A Love Quest”
      // reads as intentional luxury spacing rather than compressed layout.
      taglineY    = cy - 42;
      dividerY    = cy - 20;
      btnY        = cy + 38;
      contBtnY    = cy + 98;
    }

    // ── Card geometry (pre-computed so scrim and card share same bounds) ─
    const savedChapter = (() => {
      try {
        const v = localStorage.getItem('prawal-aashna-chapter');
        // Never show Continue if the saved chapter is the last one or out-of-range
        // (index 14 = Chapter15, the final chapter — there's nothing to continue to).
        if (v === null) return null;
        const idx = parseInt(v, 10);
        if (isNaN(idx) || idx <= 0 || idx >= storyData.chapters.length) return null;
        return v;
      } catch (_) { return null; }
    })();
    const cardW   = Math.min(460, W - 32);
    const cardX   = cx - cardW / 2;
    const cardTop = titleY - 32;
    // Card height includes space for Continue button only when it will be shown.
    const cardH   = savedChapter !== null
      ? (contBtnY + 24 + 24) - cardTop
      : (btnY    + 24 + 24) - cardTop;

    // ── Scrim — softens background behind card ────────────────────
    // MODAL_DEPTH: depths 1002–1050 intentionally exceed LayerManager.fx.max (999)
    const MODAL_DEPTH = 1002;
    const scrim = pin(this.add.graphics().setDepth(MODAL_DEPTH));
    scrim.fillStyle(0x030008, 0.30);
    scrim.fillRoundedRect(cardX - 8, cardTop - 8, cardW + 16, cardH + 16, 44);
    scrim.setAlpha(0);

    // ── Frosted glass card ────────────────────────────────────────
    // Deep dark panel with a soft rose border — anchors all UI text.
    const card = pin(this.add.graphics().setDepth(1005));
    // Main fill — deep dark with subtle transparency
    card.fillStyle(0x06000B, 0.82);
    card.fillRoundedRect(cardX, cardTop, cardW, cardH, 24);
    // Outer border — rose gold
    card.lineStyle(1, 0xBB7090, 0.55);
    card.strokeRoundedRect(cardX, cardTop, cardW, cardH, 24);
    // Inner highlight border — thin bright rose
    card.lineStyle(1, 0xFF99BB, 0.16);
    card.strokeRoundedRect(cardX + 3, cardTop + 3, cardW - 6, cardH - 6, 22);
    // Top edge gloss — subtle horizontal sheen
    card.fillStyle(0xFFCCDD, 0.05);
    card.fillRoundedRect(cardX + 4, cardTop + 4, cardW - 8, 24, { tl: 21, tr: 21, bl: 0, br: 0 });
    card.setAlpha(0);

    // ── Title ─────────────────────────────────────────────────────
    const title = pin(this.add.text(cx, titleY, 'Our Story', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize:   '56px',
      color:      '#FFF2F6',
      resolution: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#FF7AAA', blur: 36, fill: true },
    }).setOrigin(0.5).setAlpha(0).setDepth(1012));

    // ── Ornamental divider under title ───────────────────────────
    const orn = pin(this.add.graphics().setDepth(1012));
    this._drawOrnament(orn, cx, ornY);
    orn.setAlpha(0);

    // ── Dedication — italic love subtitle (closer to title) ──────
    const dedic = pin(this.add.text(cx, dedicationY, 'for PrAashi \u2764\uFE0F', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize:   '19px',
      color:      '#FFAABB',
      fontStyle:  'italic',
      letterSpacing: 2,
      resolution: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#FF5588', blur: 22, fill: true },
    }).setOrigin(0.5).setAlpha(0).setDepth(1012));

    // ── Tagline — typewriter reveal (tighter letter spacing) ──────
    const subtitleFull = 'A  L o v e  Q u e s t';
    const subtitle = pin(this.add.text(cx, taglineY, '', {
      fontFamily: 'Georgia, serif',
      fontSize:   '12px',
      color:      '#CC7A98',
      letterSpacing: 4,
      resolution: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(1012));

    // ── Thin horizontal rule ──────────────────────────────────────
    const rule = pin(this.add.graphics().setDepth(1012));
    rule.lineStyle(1, 0x993366, 0.45);
    rule.lineBetween(cx - 100, dividerY, cx + 100, dividerY);
    rule.setAlpha(0);

    // ── Primary button — "Begin Our Story" (visually dominant) ────
    const btnBg = pin(this.add.graphics().setDepth(1011));
    this._drawButton(btnBg, cx, btnY, false);
    btnBg.setAlpha(0);

    // Pulsing glow ring behind the primary button
    const btnGlow = pin(this.add.graphics().setDepth(1009));
    btnGlow.fillStyle(0xFF5588, 0.12);
    btnGlow.fillRoundedRect(cx - 130, btnY - 30, 260, 60, 30);
    btnGlow.setAlpha(0);

    const btnText = pin(this.add.text(cx, btnY, 'Begin Our Story', {
      fontFamily: 'Georgia, serif',
      fontSize:   '18px',
      color:      '#FFFFFF',
      letterSpacing: 1,
      resolution: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#FF5588', blur: 14, fill: true },
    }).setOrigin(0.5).setAlpha(0).setDepth(1012));

    // Idle pulse on button glow + text (starts after fade-in)
    this._btnPulseTween = this.tweens.create({
      targets:  btnGlow,
      alpha:    { from: 1.0, to: 0.35 },
      duration: 2000,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
      paused:   true,
    });
    this._btnTextPulse = this.tweens.create({
      targets:  btnText,
      alpha:    { from: 1.0, to: 0.82 },
      duration: 2000,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
      paused:   true,
    });

    // ── Continue button (de-emphasized) ─────────────────────────
    const contBg   = pin(this.add.graphics().setDepth(1011));
    const contText = pin(this.add.text(cx, contBtnY, 'Continue Our Story', {
      fontFamily: 'Georgia, serif',
      fontSize:   '13px',
      color:      '#C0899A',
      letterSpacing: 1,
      resolution: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(1012));
    if (savedChapter !== null) this._drawContButton(contBg, cx, contBtnY, false);

    // ── Footer ────────────────────────────────────────────────────
    // scrollFactor(0) objects are still displaced by camera zoom: an object at
    // distance D from cy appears at screenY = cy + D * zoom after zoom completes.
    // The footer is ~(H/2 - 42)px below cy — far enough that zoom 1.2 pushes it
    // ~60px below the viewport edge, making it invisible right after fading in.
    // Fix: worldY = cy + desiredOffset / zoom → screenY lands exactly where we want.
    const _fZoom = this._menuTargetZoom ?? 1.20;
    // Footer must always appear below the card. We compute the card's actual
    // screen-bottom (accounting for zoom displacement of a scrollFactor-0 object)
    // and push the footer at least 16px below it.
    // max() handles the "Continue" case: taller card → card-bottom > H*0.82,
    //   so footer rides down to stay below the card.
    // min() clamps to safe area so it never clips off the bottom.
    const _cardBottomWorld = cardTop + cardH;
    const _screenCardBottom = cy + (_cardBottomWorld - cy) * _fZoom;
    // Order matters: clamp to screen first, THEN always bump below the card.
    // If the card is tall (Continue button) and safeB is large (notched iPhone),
    // the screen clamp (H - safeB - 16) can be less than (cardBottom + 16).
    // Putting the card-bottom constraint outermost ensures it always wins.
    const _footerDesiredScreenY = Math.max(
      Math.min(H * 0.82 - safeB, H - safeB - 16),
      _screenCardBottom + 16
    );
    const _footerY = cy + (_footerDesiredScreenY - cy) / _fZoom;
    const footer = pin(this.add.text(cx, _footerY, '✦  A story of love, told through memories  ✦', {
      fontFamily: 'Georgia, serif',
      fontSize:   '11px',
      color:      '#EEC0D0',
      letterSpacing: 2,
      resolution: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#FF4488', blur: 22, fill: true },
    }).setOrigin(0.5).setAlpha(0).setDepth(1011));

    // ── Entrance animations (staggered, upward ease-out) ─────────
    const allUI = [scrim, card, title, orn, dedic, subtitle, rule, btnBg, btnGlow, btnText, contBg, contText, footer];

    if (!skipIntro) {
    // Scrim fades in first to soften the background
    this.tweens.add({ targets: scrim,    alpha: 1,    duration: 600, ease: 'Sine.easeOut', delay: 150 });
    this.tweens.add({ targets: card,     alpha: 1,    y: card.y,    duration: 700, ease: 'Sine.easeOut', delay: 250,
      onStart: () => { card.y += 12; },
    });
    this.tweens.add({
      targets: title, alpha: 1, y: titleY + 6,
      duration: 900, ease: 'Cubic.easeOut', delay: 450,
      onStart: () => { title.y = titleY + 18; },
    });
    this.tweens.add({ targets: orn,      alpha: 1,    duration: 500, ease: 'Sine.easeOut', delay: 650 });
    this.tweens.add({
      targets: dedic, alpha: 1, y: dedicationY + 5,
      duration: 700, ease: 'Cubic.easeOut', delay: 750,
      onStart: () => { dedic.y = dedicationY + 14; },
    });
    this.tweens.add({
      targets: subtitle, alpha: 1,
      duration: 500, ease: 'Sine.easeOut', delay: 920,
      onComplete: () => { this._typewriterEvent = this._typewriter(subtitle, subtitleFull, 58); },
    });
    this.tweens.add({ targets: rule,     alpha: 1,    duration: 600, ease: 'Sine.easeOut', delay: 1060 });
    this.tweens.add({
      targets: [btnBg, btnGlow, btnText], alpha: 1,
      duration: 500, ease: 'Sine.easeOut', delay: 1250,
      onStart: () => { btnBg.y = (btnBg.y || 0) + 8; btnText.y = btnY + 8; btnGlow.y = (btnGlow.y || 0) + 8; },
      onComplete: () => {
        btnBg.y = (btnBg.y || 0) - 8; btnText.y = btnY; btnGlow.y = (btnGlow.y || 0) - 8;
        this._btnPulseTween?.resume();
        this._btnTextPulse?.resume();
      },
    });
    if (savedChapter !== null) {
      this.tweens.add({ targets: [contBg, contText], alpha: { from: 0, to: 0.80 }, duration: 500, ease: 'Sine.easeOut', delay: 1400 });
    }
    this.tweens.add({ targets: footer,   alpha: 0.88, duration: 700, delay: 1500 });

    // ── Menu ambient audio ────────────────────────────────────────
    audioManager.init();
    audioManager.resume();
    audioManager.transitionToChapter('main_menu');
    } else {
      // ── Instant display on resize (no staggered entrance) ───────
      [scrim, card, title, orn, dedic, rule, btnBg, btnGlow, btnText].forEach(o => o.setAlpha(1));
      subtitle.setText(subtitleFull).setAlpha(1);
      footer.setAlpha(0.88);
      if (savedChapter !== null) { contBg.setAlpha(0.80); contText.setAlpha(0.80); }
      this.tweens.add({ targets: btnGlow, alpha: { from: 1.0, to: 0.35 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: btnText, alpha: { from: 1.0, to: 0.82 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Title gentle float
    this._titleFloatTween = this.tweens.add({
      targets:  title,
      y:        title.y + 4,
      duration: 3600,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
      delay:    1700,
    });

    // Dedication gentle float — slightly out of phase with title
    this._dedicFloatTween = this.tweens.add({
      targets:  dedic,
      y:        dedicationY + 4,
      duration: 4400,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
      delay:    1900,
    });

    // ── Slow-drifting light-dust particles behind UI ─────────────
    if (this.textures.exists('particle-glow')) {
      const _uiDust = this.add.particles(cx, cy, 'particle-glow', {
        x:        { min: -240, max: 240 },
        y:        { min: -160, max: 160 },
        speedX:   { min: -3, max: 3 },
        speedY:   { min: -2, max: 2 },
        scale:    { start: 0.06, end: 0 },
        alpha:    { start: 0.16, end: 0 },
        tint:     [0xFFDDEE, 0xFFCCDD, 0xEEBBDD],
        lifespan: { min: 4000, max: 7000 },
        frequency: 350,
        quantity:  1,
        blendMode: 'ADD',
      }).setScrollFactor(0).setDepth(1004);
      this._menuUI.add(_uiDust);
    }

    // ── Button interactions ───────────────────────────────────────
    const hitBegin = pin(
      this.add.rectangle(cx, btnY, 240, 46, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(1050)
    );
    hitBegin.on('pointerover', () => {
      if (this._transitioning) return;
      this._drawButton(btnBg, cx, btnY, true);
      this.tweens.add({ targets: [btnText, btnGlow], scaleX: 1.08, scaleY: 1.08, duration: 160, ease: 'Back.easeOut' });
      audioManager.playMenuHover();
    });
    hitBegin.on('pointerout', () => {
      if (this._transitioning) return;
      this._drawButton(btnBg, cx, btnY, false);
      this.tweens.add({ targets: [btnText, btnGlow], scaleX: 1, scaleY: 1, duration: 160 });
    });
    hitBegin.on('pointerdown', () => {
      audioManager.playClick();
      localStorage.setItem('prawal-aashna-chapter', '0');
      this._beginTransition(0, allUI);
    });

    if (savedChapter !== null) {
      const hitCont = pin(
        this.add.rectangle(cx, contBtnY, 240, 40, 0, 0)
          .setInteractive({ useHandCursor: true })
          .setDepth(1050)
      );
      hitCont.on('pointerover', () => {
        if (this._transitioning) return;
        this._drawContButton(contBg, cx, contBtnY, true);
        this.tweens.add({ targets: contText, scaleX: 1.04, scaleY: 1.04, alpha: 1, duration: 150, ease: 'Back.easeOut' });
        audioManager.playMenuHover();
      });
      hitCont.on('pointerout', () => {
        if (this._transitioning) return;
        this._drawContButton(contBg, cx, contBtnY, false);
        this.tweens.add({ targets: contText, scaleX: 1, scaleY: 1, alpha: 0.80, duration: 150 });
      });
      hitCont.on('pointerdown', () => {
        audioManager.playClick();
        const idx = parseInt(savedChapter, 10) || 0;
        this._beginTransition(idx, allUI);
      });
    }

  }

  // ═══════════════════════════════════════════════════════════════════
  //  TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Player takes 1–2 steps forward, camera zooms in, then fades to chapter.
   * @param {number} chapterIndex
   * @param {Phaser.GameObjects.GameObject[]} fadeTargets
   */
  _beginTransition(chapterIndex, fadeTargets) {
    if (this._transitioning) return;
    this._transitioning = true;

    // Emotional swell at the moment of commitment — plays immediately on click
    audioManager.playTransitionSwell();

    // Walk the male character 2 steps toward female (right)
    const tx = this._maleChar.x + 90;
    const ty = this._maleChar.y;

    // 200ms breath before the walk — world pauses when the story begins
    this.time.delayedCall(200, () => {
      if (!this.sys?.isActive()) return;
      this._maleChar.moveTo(tx, ty, () => {
      // Fade UI
      this.tweens.add({ targets: fadeTargets, alpha: 0, duration: 480, ease: 'Sine.easeIn' });
      // Begin audio fade-out in sync with camera — audio should be gone before chapter loads
      audioManager.fadeOutAll(700);
      // Slight zoom punch — use controller so drift is paused cleanly
      this.cam.slowZoom(1.40, 550);
      this.cam.fadeOut(700, 10, 0, 8);
        this.time.delayedCall(820, () => {
          if (!this.sys?.isActive()) return;
          const ch  = storyData.chapters[chapterIndex];
          const key = getSceneKey(ch);
          this.scene.start(key, { chapter: chapterIndex });
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════════════

  update(time, delta) {
    this.cam.update(time);
    this.depthMgr.update();
    this.shadows.update();  // sync prop shadow positions/depths after depthMgr
    this.lighting.update(time);

    if (this._maleChar)   this._maleChar.update(time, delta);
    if (this._femaleChar) this._femaleChar.update(time, delta);
  }

  shutdown() {
    this._isShutdown = true;
    clearTimeout(this._resizeDebounce);
    this._resizeDebounce = null;
    if (this._resizeHandler) {
      this.scale.off('resize', this._resizeHandler, this);
      this._resizeHandler = null;
    }
    this._menuUI = null;
    this._typewriterEvent = null;
    this._titleFloatTween?.stop();  this._titleFloatTween = null;
    this._dedicFloatTween?.stop();  this._dedicFloatTween = null;
    this._btnPulseTween?.stop();    this._btnPulseTween   = null;
    this._btnTextPulse?.stop();     this._btnTextPulse    = null;
    this.tweens.killTweensOf(this._aGlow);
    // Reset per-session flags so create() starts fresh on scene restart.
    // Without this, _menuReady=true on Play Again causes skipIntro=true
    // (empty screen) and stale shimmer refs point to Phaser-destroyed objects.
    this._menuReady  = false;
    this._shimmerParticles = null;
    this._shimmerOrbs = null;
    this._shimmerBg    = null;
    this._shimmerStars = null;
    this._shimmerVeil  = null;
    this._shimmerVig   = null;
    // Stop audio only if _beginTransition didn't already call fadeOutAll(700)
    if (!this._transitioning) audioManager.fadeOutAll(400);
    this._transitioning = false;
    // DepthManager holds sprite refs in _ySortItems — must be explicitly freed
    // so created character objects can be garbage-collected after scene transitions.
    this._maleChar?.destroy();
    this._femaleChar?.destroy();
    this._femaleCharShadow?.destroy();
    this.depthMgr?.destroy();
    this.layers?.destroy();
    this.shadows?.destroy();
    this.lighting?.destroy();
    this.cam?.destroy();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /** Reveal text one character at a time. */
  _typewriter(textObj, fullText, msPerChar = 65) {
    let i = 0;
    return this.time.addEvent({
      delay:    msPerChar,
      repeat:   fullText.length - 1,
      callback: () => { i++; textObj.setText(fullText.slice(0, i)); },
    });
  }

  _drawOrnament(g, cx, y) {
    // Horizontal arms
    g.lineStyle(1, 0xBB6080, 0.65);
    g.lineBetween(cx - 96, y, cx - 18, y);
    g.lineBetween(cx + 18, y, cx + 96, y);
    // Diamond tip — left
    g.fillStyle(0xBB6080, 0.80);
    g.fillTriangle(cx - 18, y, cx - 10, y - 4, cx - 10, y + 4);
    // Diamond tip — right
    g.fillTriangle(cx + 18, y, cx + 10, y - 4, cx + 10, y + 4);
    // Centre diamond (two triangles = diamond)
    g.fillStyle(0xFF99BB, 0.90);
    g.fillTriangle(cx, y - 6, cx - 5, y, cx + 5, y);
    g.fillTriangle(cx, y + 6, cx - 5, y, cx + 5, y);
  }

  _drawButton(g, cx, y, hover) {
    g.clear();
    // Wider, slightly taller for dominant presence
    const bw = 252, bh = 48, br = 24;
    const bx = cx - bw / 2, by = y - bh / 2;
    // Gradient fill — brighter rose for primary CTA
    g.fillStyle(hover ? 0xCC3068 : 0x9A2250, hover ? 0.98 : 0.90);
    g.fillRoundedRect(bx, by, bw, bh, br);
    // Inner gloss sheen — top third
    g.fillStyle(0xFFFFFF, hover ? 0.15 : 0.08);
    g.fillRoundedRect(bx + 4, by + 1, bw - 8, 16, { tl: br - 2, tr: br - 2, bl: 0, br: 0 });
    // Rose gold border
    g.lineStyle(hover ? 2 : 1.5, 0xFF88AA, hover ? 0.90 : 0.60);
    g.strokeRoundedRect(bx, by, bw, bh, br);
    // Outer glow on hover
    if (hover) {
      g.lineStyle(8, 0xFF5588, 0.22);
      g.strokeRoundedRect(bx - 6, by - 6, bw + 12, bh + 12, br + 5);
    }
  }

  _drawContButton(g, cx, y, hover) {
    g.clear();
    // Smaller, subtler — clearly secondary
    g.fillStyle(hover ? 0x5A1A3C : 0x2E0C22, hover ? 0.80 : 0.55);
    g.fillRoundedRect(cx - 110, y - 18, 220, 36, 18);
    g.fillStyle(0xFFFFFF, hover ? 0.07 : 0.03);
    g.fillRoundedRect(cx - 106, y - 17, 212, 10, { tl: 17, tr: 17, bl: 0, br: 0 });
    g.lineStyle(1, 0xC88AA0, hover ? 0.55 : 0.28);
    g.strokeRoundedRect(cx - 110, y - 18, 220, 36, 18);
    if (hover) {
      g.lineStyle(4, 0xDD7799, 0.12);
      g.strokeRoundedRect(cx - 115, y - 23, 230, 46, 22);
    }
  }
}
