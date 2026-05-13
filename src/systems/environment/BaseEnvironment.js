/**
 * Recursive deep-merge for environment config objects.
 * Unlike a 2-level shallow spread, this handles arbitrary nesting depth so
 * overrides like `fgGround: { layer1: { tint: 0xRRGGBB } }` merge into the
 * full layer1 defaults rather than silently replacing the whole layer object.
 */
import { vignetteAlphaMul, filmGrainAlphaMul } from '../MobileAdaptationManager.js';
export function deepMerge(base, over) {
  const out = { ...base };
  for (const key of Object.keys(over)) {
    if (over[key] && typeof over[key] === 'object' && !Array.isArray(over[key])
        && base[key] && typeof base[key] === 'object') {
      out[key] = deepMerge(base[key], over[key]);
    } else {
      out[key] = over[key];
    }
  }
  return out;
}

/**
 * BaseEnvironment — shared foundation for all environment presets.
 *
 * Provides:
 *  • Viewport / world dimension helpers
 *  • Vignette rendering
 *  • Film grain overlay
 *  • Color grade overlay
 *  • groundY — single source of truth (WORLD coordinates)
 *  • getGroundY(worldX) — terrain-curve-aware ground position
 *  • placeOnGround(worldX, offsetY) — returns { x, y } on terrain
 *  • update(scrollX) — per-frame parallax driver (override in subclass)
 *  • lockToGround(sprite) — snaps sprite Y to terrain curve
 *  • destroy() — cleanup tracked objects
 */
export class BaseEnvironment {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} defaults — preset default config
   * @param {object} overrides — per-scene customisations
   */
  constructor(scene, defaults, overrides) {
    this.scene = scene;
    this.cfg   = { ...defaults, ...overrides };

    // World + viewport shortcuts
    this.W  = scene.worldW;                 // world width (e.g. 768)
    this.H  = scene.worldH;                 // world height (e.g. 512)
    this.vW = scene.scale.width;            // viewport width
    this.vH = scene.scale.height;           // viewport height

    /** All Graphics/Images created by this environment, for cleanup. */
    this._objects = [];

    /**
     * Screen-space overlay objects (vignette, film grain, color grade).
     * Tracked separately from world objects so they can be destroyed and
     * recreated after orientation change without touching world geometry.
     * Also included in _objects so the normal destroy() path cleans them.
     */
    this._overlayObjs = [];
    // Last opts passed to each overlay builder — used by rebuildOverlays().
    this._vigOpts    = null;
    this._grainOpts  = null;
    this._cGradeOpts = null;

    /**
     * groundY — single source of truth in WORLD coordinates.
     * Default: row 4.0 center = 4 * 64 + 32 = 288px.
     * This is where gameplay happens — same coordinate space as grid().
     */
    this.groundY = this.cfg.groundY ?? Math.round(this.H * 0.5625);

    /** Terrain curve parameters (pure visual + gameplay undulation). */
    this._curveAmp1  = this.cfg.curveAmp1  ?? 0;
    this._curveFreq1 = this.cfg.curveFreq1 ?? 0.004;
    this._curveAmp2  = this.cfg.curveAmp2  ?? 0;
    this._curveFreq2 = this.cfg.curveFreq2 ?? 0.009;

    /** Parallax tileSprites driven each frame. */
    this._parallaxLayers = [];
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════

  /** Override in subclass. Called by EnvironmentManager.apply(). */
  build() { /* abstract */ }

  /**
   * Per-frame parallax driver. Call from onUpdate().
   * Also corrects window container positions for the camera's current zoom.
   * @param {number} scrollX — cameras.main.scrollX
   */
  update(scrollX) {
    for (const { strip, factor } of this._parallaxLayers) {
      strip.tilePositionX = scrollX * factor;
    }
    // Reposition window containers every frame.
    // For scrollFactor(0) objects the camera renders them at:
    //   screenX = x * zoom + midX * (1 - zoom)
    // So to hit a fixed screenX = sx:  x = midX + (sx - midX) / zoom
    if (this._windowContainers?.length) {
      const zoom = this.scene.cameras.main.zoom;
      const midX = this.scene.scale.width  / 2;
      const midY = this.scene.scale.height / 2;
      for (const wc of this._windowContainers) {
        wc.container.x = midX + (wc.sx - midX) / zoom;
        wc.container.y = midY + (wc.sy - midY) / zoom;
      }
    }
  }

  /**
   * Return walkable Y in WORLD coordinates for a given world X.
   * Uses a smooth dual-sine terrain curve for organic undulation.
   * @param {number} worldX
   * @returns {number}
   */
  getGroundY(worldX) {
    return this.groundY
      - Math.sin(worldX * this._curveFreq1) * this._curveAmp1
      - Math.sin(worldX * this._curveFreq2) * this._curveAmp2;
  }

  /**
   * Return { x, y } on the terrain curve in world coords.
   * Use for placing props, NPCs, anything that should sit on ground.
   * @param {number} worldX
   * @param {number} [offsetY=0] — negative = above ground
   * @returns {{ x: number, y: number }}
   */
  placeOnGround(worldX, offsetY = 0) {
    return { x: worldX, y: this.getGroundY(worldX) + offsetY };
  }

  /**
   * Snap a physics sprite to the terrain curve and zero Y velocity.
   * Uses WORLD-SPACE coordinates — same space as grid() and placeAt().
   * @param {Phaser.Physics.Arcade.Sprite} sprite
   */
  lockToGround(sprite) {
    if (!sprite?.body) return;
    sprite.body.velocity.y = 0;
    sprite.y = this.getGroundY(sprite.x);
  }

  /** Destroy all tracked objects. */
  destroy() {
    for (const obj of this._objects) {
      obj?.destroy();
    }
    this._objects.length = 0;
    this._overlayObjs.length = 0; // refs already destroyed above
    this._parallaxLayers.length = 0;
    // Clear the stash EnvironmentManager.apply() set so scene._env never
    // holds a reference to a destroyed instance (H3).
    if (this.scene) this.scene._env = null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SHARED BUILDERS (used by subclass build() methods)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Register a tileSprite for per-frame parallax scrolling.
   * @param {Phaser.GameObjects.TileSprite} strip
   * @param {number} factor — scrollX multiplier (0 = static, 1 = world-locked)
   */
  _registerParallax(strip, factor) {
    this._parallaxLayers.push({ strip, factor });
    this._objects.push(strip);
  }

  /** Track a game object for cleanup on destroy. */
  _track(obj) {
    this._objects.push(obj);
    return obj;
  }

  /**
   * Rebuild only the screen-space overlays (vignette, film grain, color grade)
   * after orientation change. Updates vW/vH to the current viewport then
   * recreates the three overlay layers using their last-used opts.
   *
   * Called by ChapterScene._onResize() after iOS dimensions have settled
   * (~420 ms debounce) so the graphics cover the correct screen area.
   * Safe to call even when overlays were never built (no-ops).
   */
  rebuildOverlays() {
    // Destroy existing overlay objects and remove their _objects refs too
    for (const obj of this._overlayObjs) {
      const idx = this._objects.indexOf(obj);
      if (idx !== -1) this._objects.splice(idx, 1);
      obj?.destroy();
    }
    this._overlayObjs = [];

    // Re-read settled viewport dimensions from Phaser
    this.vW = this.scene.scale.width;
    this.vH = this.scene.scale.height;

    // Recreate with the same opts used on original build
    if (this._vigOpts    !== null) this._buildVignette(this._vigOpts);
    if (this._grainOpts  !== null) this._buildFilmGrain(this._grainOpts);
    if (this._cGradeOpts !== null) this._buildColorGrade(this._cGradeOpts);
  }

  // ── Vignette ─────────────────────────────────────────────────────

  /**
   * Full-screen directional vignette.
   * @param {object} [opts]
   * @param {number} [opts.size=75]    — edge band width in px
   * @param {number} [opts.color=0x1A0800]
   * @param {number} [opts.alphaL=0.30]
   * @param {number} [opts.alphaR=0.30]
   * @param {number} [opts.alphaT=0.35]
   * @param {number} [opts.alphaB=0.25]
   * @param {number} [opts.depth=997]
   */
  _buildVignette(opts = {}) {
    this._vigOpts = opts; // store for rebuildOverlays()
    const vW = this.vW, vH = this.vH;
    // Cap the vignette band to 13% of the shorter dimension so it never
    // becomes an intrusive dark frame on narrow mobile screens (390px wide
    // → max 51px even if the preset asks for 130px).
    const rawVig = opts.size ?? 75;
    const maxVig = Math.round(Math.min(vW, vH) * 0.13);
    const vig   = Math.min(rawVig, maxVig);
    const c     = opts.color  ?? 0x1A0800;
    const d     = opts.depth  ?? 997;
    // On small landscape screens, reduce vignette darkness so the world
    // edges stay visible. Desktop/tablet returns mul=1.0 (no change).
    const vMul  = vignetteAlphaMul();
    const aL = (opts.alphaL ?? 0.30) * vMul;
    const aR = (opts.alphaR ?? 0.30) * vMul;
    const aT = (opts.alphaT ?? 0.35) * vMul;
    const aB = (opts.alphaB ?? 0.25) * vMul;

    const gL = this.scene.add.graphics().setScrollFactor(0).setDepth(d);
    this._overlayObjs.push(gL); this._objects.push(gL);
    gL.fillGradientStyle(c, 0x000000, 0x000000, c, aL, 0, 0, aL);
    gL.fillRect(0, 0, vig, vH);

    const gR = this.scene.add.graphics().setScrollFactor(0).setDepth(d);
    this._overlayObjs.push(gR); this._objects.push(gR);
    gR.fillGradientStyle(0x000000, c, c, 0x000000, 0, aR, aR, 0);
    gR.fillRect(vW - vig, 0, vig, vH);

    const gT = this.scene.add.graphics().setScrollFactor(0).setDepth(d);
    this._overlayObjs.push(gT); this._objects.push(gT);
    gT.fillGradientStyle(c, c, 0x000000, 0x000000, aT, aT, 0, 0);
    gT.fillRect(0, 0, vW, vig);

    const gB = this.scene.add.graphics().setScrollFactor(0).setDepth(d);
    this._overlayObjs.push(gB); this._objects.push(gB);
    gB.fillGradientStyle(0x000000, 0x000000, c, c, 0, 0, aB, aB);
    gB.fillRect(0, vH - vig, vW, vig);
  }

  // ── Film grain ───────────────────────────────────────────────────

  /**
   * Noise overlay for cinematic texture.
   * @param {object} [opts]
   * @param {number} [opts.alpha=0.035]
   * @param {string} [opts.blend='OVERLAY']
   * @param {number} [opts.depth=999]
   */
  _buildFilmGrain(opts = {}) {
    this._grainOpts = opts; // store for rebuildOverlays()
    if (!this.scene.textures.exists('noise')) return;
    // Reduce grain alpha on mobile landscape — full-strength grain reads as
    // blurry "fuzz" on text and sprite edges on small OLED screens.
    // Desktop / iPad returns mul=1.0 (no change).
    const grainAlpha = (opts.alpha ?? 0.035) * filmGrainAlphaMul();
    const grain = this.scene.add.image(this.vW / 2, this.vH / 2, 'noise')
      .setDisplaySize(this.vW, this.vH)
      .setAlpha(grainAlpha)
      .setScrollFactor(0)
      .setBlendMode(opts.blend ?? 'OVERLAY')
      .setDepth(opts.depth ?? 999);
    this._overlayObjs.push(grain); this._objects.push(grain);
  }

  // ── Color grade ──────────────────────────────────────────────────

  /**
   * Full-screen color wash for cinematic grading.
   * @param {object} [opts]
   * @param {number} [opts.color=0xFFB060]
   * @param {number} [opts.alpha=0.035]
   * @param {number} [opts.depth=998]
   * @param {string} [opts.blend='ADD']   — 'ADD' for warm wash, 'OVERLAY' for desaturation
   */
  _buildColorGrade(opts = {}) {
    this._cGradeOpts = opts; // store for rebuildOverlays()
    const g = this.scene.add.graphics().setScrollFactor(0).setDepth(opts.depth ?? 998);
    g.fillStyle(opts.color ?? 0xFFB060, 1);
    g.fillRect(0, 0, this.vW, this.vH);
    g.setAlpha(opts.alpha ?? 0.035);
    g.setBlendMode(opts.blend ?? 'ADD');
    this._overlayObjs.push(g); this._objects.push(g);
  }
}
