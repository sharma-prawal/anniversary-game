import { BaseEnvironment, deepMerge } from './BaseEnvironment.js';

/**
 * DarkEnvironment — emotional / night / spotlight / memory scenes.
 *
 * Design philosophy: the spotlight IS the scene.
 * Everything else exists to make that cone of light feel warm, real, and alive.
 *
 * ─── Layer stack ───────────────────────────────────────────────────────────
 *
 *   Depth   Name                    Notes
 *   ─────   ────────────────────    ─────────────────────────────────────────
 *   -220    Void background          near-black fill
 *   -210    Ambient BG glow          faint wide haze — memory feeling
 *   -205    Void starfield           particle-star-k scattered at near-zero alpha
 *   -200    Dead-tree silhouettes    bgr-tree-dead at screen edges (gothic framing)
 *   -190    Subtle floor hint        grounds the void, very dark gradient
 *   -8      Spotlight outer ring     large, soft, slow pulse (3.2s)
 *   -7      Spotlight mid ring       medium, offset pulse (2.0s)
 *   -6      Spotlight core           tight, bright, fast pulse (1.2s)
 *   -5      Ground pool              flat ellipse under player feet
 *    997    Vignette (heavy)         tunnel vision — pulls focus to centre
 *    998    Color grade (cool)       desaturates surroundings, makes light pop
 *    999    Film grain
 *
 * Three-ring spotlight is the key AAA upgrade over a single blob:
 *   • Outer/Mid/Core each pulse at different rates — never align
 *   • Result: the light is always subtly alive (like a candle or memory)
 */

const DEFAULTS = {

  // ── Void background ───────────────────────────────────────────────────────
  void: {
    color: 0x020005,
    depth: -220,
  },

  // ── Ambient background glow ───────────────────────────────────────────────
  // Ultra-faint wide blob — gives the "void" just enough texture to feel like
  // a memory, not a programmer's placeholder.
  bgGlow: {
    enabled: true,
    texture: 'light-blob',
    x:       0.50,
    y:       0.40,
    scaleX:  12.0,
    scaleY:   7.0,
    tint:    0x220044,
    alpha:   0.12,
    depth:   -210,
  },
  // ── Void starfield ────────────────────────────────────────────────────────────
  // particle-star-k (kenney star_04.png) scattered in the void at near-zero
  // alpha. Makes the void feel like a dreamscape / memory-space rather than a
  // flat programmer fill. Stars never animate — stillness = weight.
  voidStars: {
    enabled: true,
    texture: 'particle-star-k',
    count:   18,
    depth:   -205,
    // Positions as [xFrac, yFrac, scale, alpha] for each star. Handcrafted so
    // they avoid the spotlight cone (centre 40-60% x, 55-75% y).
    seeds: [
      [0.05, 0.10, 0.30, 0.16], [0.18, 0.05, 0.20, 0.10], [0.32, 0.08, 0.22, 0.12],
      [0.48, 0.04, 0.18, 0.08], [0.62, 0.09, 0.25, 0.13], [0.78, 0.06, 0.20, 0.11],
      [0.91, 0.08, 0.28, 0.15], [0.08, 0.24, 0.18, 0.09], [0.22, 0.30, 0.22, 0.12],
      [0.38, 0.22, 0.16, 0.07], [0.72, 0.28, 0.24, 0.11], [0.85, 0.20, 0.19, 0.08],
      [0.94, 0.32, 0.22, 0.10], [0.04, 0.42, 0.20, 0.07], [0.14, 0.52, 0.16, 0.06],
      [0.82, 0.48, 0.18, 0.07], [0.96, 0.55, 0.14, 0.05], [0.10, 0.68, 0.12, 0.05],
    ],
  },
  // ── Dead-tree silhouettes — gothic void framing ───────────────────────────
  // bgr-tree-dead (kenney remastered bare branches) pinned to screen edges at
  // depth -200 — behind the floor hint but above the void. The near-black tint
  // makes them invisible except as silhouettes against the bgGlow. Set
  // bgSilhouettes: { enabled: false } in scene overrides to suppress.
  bgSilhouettes: {
    enabled:  true,
    texture:  'bgr-tree-dead',
    scale:    3.4,
    tint:     0x030208,     // near-black with cool violet tint
    alpha:    0.44,
    leftX:    0.04,         // fraction of vW for left tree anchor
    rightX:   0.96,         // fraction of vW for right tree anchor (flipped)
    depth:    -200,
  },

  // ── Subtle floor hint ─────────────────────────────────────────────────────
  floor: {
    enabled:   true,
    topColor:  0x0C0A18,
    botColor:  0x020005,
    startFrac: 0.60,
    depth:     -190,
  },

  // ── Three-ring spotlight ──────────────────────────────────────────────────
  spotlightOuter: {
    texture:      'light-blob',
    scaleX:       9.0,
    scaleY:       5.5,
    alpha:        0.10,
    tint:         0xBBAACE,
    pulseDur:     3200,
    pulseAlphaTo: 0.04,
    pulseScaleX:  10.5,
    pulseScaleY:  6.5,
    depth:        -8,
  },
  spotlightMid: {
    texture:      'light-blob',
    scaleX:       5.0,
    scaleY:       3.0,
    alpha:        0.22,
    tint:         0xE8D8FF,
    pulseDur:     2000,
    pulseAlphaTo: 0.10,
    pulseScaleX:  5.8,
    pulseScaleY:  3.6,
    depth:        -7,
  },
  spotlightCore: {
    texture:      'light-blob',
    scaleX:       2.2,
    scaleY:       1.4,
    alpha:        0.40,
    tint:         0xFFEEFF,
    pulseDur:     1200,
    pulseAlphaTo: 0.28,
    pulseScaleX:  2.5,
    pulseScaleY:  1.6,
    depth:        -6,
  },

  // ── Ground pool ──────────────────────────────────────────────────────────
  groundPool: {
    enabled: true,
    texture: 'light-blob',
    scaleX:  3.0,
    scaleY:  0.6,
    alpha:   0.15,
    tint:    0xFFCC88,
    depth:   -5,
  },

  // ── World-space ground ────────────────────────────────────────────────────
  groundY:        288,
  groundCurveAmp: 0,

  // ── Post-processing ───────────────────────────────────────────────────────
  vignette: {
    size:   130,
    color:  0x000000,
    alphaL: 0.60,
    alphaR: 0.60,
    alphaT: 0.55,
    alphaB: 0.65,
  },
  filmGrain:  { alpha: 0.048, blend: 'OVERLAY' },
  colorGrade: { color: 0x6666AA, alpha: 0.038, blend: 'OVERLAY' },
};

export class DarkEnvironment extends BaseEnvironment {
  constructor(scene, overrides = {}) {
    const merged = deepMerge(DEFAULTS, overrides);
    super(scene, DEFAULTS, merged);

    this._spotOuter       = null;
    this._spotMid         = null;
    this._spotCore        = null;
    this._pool            = null;
    this._spotlightReady  = false;  // true once first valid playerSprite pos is known (M3)
  }

  build() {
    this._buildVoid();
    this._buildBgGlow();
    this._buildVoidStars();
    this._buildBgSilhouettes();
    this._buildFloor();
    this._buildSpotlight();
    this._buildGroundPool();
    this.scene.physics.world.setBounds(64, 64, this.W - 128, this.H - 128);
    this._buildVignette(this.cfg.vignette);
    this._buildFilmGrain(this.cfg.filmGrain);
    this._buildColorGrade(this.cfg.colorGrade);
  }

  /**
   * Per-frame: follow player + drive any parallax layers.
   * @param {number} scrollX
   * @param {Phaser.GameObjects.Sprite} [playerSprite]
   */
  update(scrollX, playerSprite) {
    super.update(scrollX);
    if (!playerSprite?.active) return;
    const px = playerSprite.x;
    const py = playerSprite.y;
    if (this._spotOuter) { this._spotOuter.x = px; this._spotOuter.y = py - 10; }
    if (this._spotMid)   { this._spotMid.x   = px; this._spotMid.y   = py -  5; }
    if (this._spotCore)  { this._spotCore.x   = px; this._spotCore.y  = py; }
    if (this._pool)      { this._pool.x       = px; this._pool.y      = py +  8; }
    // First valid frame: start pulse tweens now that rings are correctly positioned.
    if (!this._spotlightReady) {
      this._spotlightReady = true;
      this._startSpotlightTweens();
    }
  }

  // ── Void ──────────────────────────────────────────────────────────────────

  // ── Dead-tree silhouettes ─────────────────────────────────────────────────

  _buildVoidStars() {
    const { scene, vW, vH } = this;
    const cfg = this.cfg.voidStars;
    if (!cfg?.enabled) return;
    if (!scene.textures.exists(cfg.texture)) return;
    for (const [xf, yf, sc, al] of cfg.seeds) {
      this._track(
        scene.add.image(Math.round(vW * xf), Math.round(vH * yf), cfg.texture)
          .setScale(sc)
          .setAlpha(al)
          .setTint(0xCCBBFF)
          .setScrollFactor(0)
          .setDepth(cfg.depth)
      );
    }
  }

  // ── Dead-tree silhouettes ─────────────────────────────────────────────────

  _buildBgSilhouettes() {
    const { vW, vH, scene } = this;
    const s = this.cfg.bgSilhouettes;
    if (!s?.enabled) return;
    let tex = s.texture;
    if (!tex || !scene.textures.exists(tex)) {
      for (const k of ['bgr-tree-dead', 'bgr-tree-long', 'bgr-tree']) {
        if (scene.textures.exists(k)) { tex = k; break; }
      }
    }
    if (!tex || !scene.textures.exists(tex)) return;
    this._track(
      scene.add.image(Math.round(vW * s.leftX), vH + 24, tex)
        .setScale(s.scale).setOrigin(0.5, 1.0)
        .setTint(s.tint).setAlpha(s.alpha)
        .setScrollFactor(0).setDepth(s.depth)
    );
    this._track(
      scene.add.image(Math.round(vW * s.rightX), vH + 24, tex)
        .setScale(s.scale).setOrigin(0.5, 1.0)
        .setTint(s.tint).setAlpha(s.alpha)
        .setScrollFactor(0).setDepth(s.depth).setFlipX(true)
    );
  }

  _buildVoid() {
    const { scene } = this;
    const v = this.cfg.void;
    // setBackgroundColor fills the canvas every frame via the Phaser camera clear;
    // a Graphics overlay on top is redundant and burns a draw call each frame (M4).
    scene.cameras.main.setBackgroundColor(v.color);
  }

  // ── Ambient BG glow ───────────────────────────────────────────────────────

  _buildBgGlow() {
    const { scene, vW, vH } = this;
    const bg = this.cfg.bgGlow;
    if (!bg.enabled) return;
    if (!scene.textures.exists(bg.texture)) return;
    this._track(
      scene.add.image(Math.round(vW * bg.x), Math.round(vH * bg.y), bg.texture)
        .setScale(bg.scaleX, bg.scaleY)
        .setAlpha(bg.alpha)
        .setTint(bg.tint)
        .setBlendMode('ADD')
        .setScrollFactor(0)
        .setDepth(bg.depth)
    );
  }

  // ── Floor hint ────────────────────────────────────────────────────────────

  _buildFloor() {
    const { scene, vW, vH } = this;
    const f = this.cfg.floor;
    if (!f.enabled) return;
    const y = Math.round(vH * f.startFrac);
    const gfx = this._track(scene.add.graphics().setScrollFactor(0).setDepth(f.depth));
    gfx.fillGradientStyle(f.topColor, f.topColor, f.botColor, f.botColor, 1, 1, 1, 1);
    gfx.fillRect(0, y, vW, vH - y);
  }

  // ── Three-ring spotlight ──────────────────────────────────────────────────

  _buildSpotlight() {
    const { scene } = this;
    const cx = this.W / 2;
    const cy = this.groundY;

    const buildRing = (cfg, yOffset) => {
      if (!scene.textures.exists(cfg.texture)) return null;
      const img = this._track(
        scene.add.image(cx, cy + (yOffset ?? 0), cfg.texture)
          .setScale(cfg.scaleX, cfg.scaleY)
          .setAlpha(0)              // hidden until update() positions at correct player pos (M3)
          .setTint(cfg.tint)
          .setBlendMode('ADD')
          .setDepth(cfg.depth)
      );
      img._spotCfg = cfg;           // stored so _startSpotlightTweens() can read pulse params
      return img;
    };

    this._spotOuter = buildRing(this.cfg.spotlightOuter, -10);
    this._spotMid   = buildRing(this.cfg.spotlightMid,    -5);
    this._spotCore  = buildRing(this.cfg.spotlightCore,    0);
  }

  /** Start pulse tweens. Called once from update() after rings are correctly positioned. */
  _startSpotlightTweens() {
    const startTween = (img) => {
      if (!img?._spotCfg) return;
      const c = img._spotCfg;
      this.scene.tweens.add({
        targets:  img,
        alpha:    { from: c.alpha,        to: c.pulseAlphaTo },
        scaleX:   { from: c.scaleX,       to: c.pulseScaleX  },
        scaleY:   { from: c.scaleY,       to: c.pulseScaleY  },
        duration: c.pulseDur,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    };
    startTween(this._spotOuter);
    startTween(this._spotMid);
    startTween(this._spotCore);
  }

  // ── Ground pool ───────────────────────────────────────────────────────────

  _buildGroundPool() {
    const { scene } = this;
    const gp = this.cfg.groundPool;
    if (!gp.enabled) return;
    if (!scene.textures.exists(gp.texture)) return;
    this._pool = this._track(
      scene.add.image(this.W / 2, this.groundY + 8, gp.texture)
        .setScale(gp.scaleX, gp.scaleY)
        .setAlpha(gp.alpha)
        .setTint(gp.tint)
        .setBlendMode('ADD')
        .setDepth(gp.depth)
    );
  }
}
