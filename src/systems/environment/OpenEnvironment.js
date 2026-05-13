import { BaseEnvironment, deepMerge } from './BaseEnvironment.js';

/**
 * OpenEnvironment — outdoor scenes (golden afternoon, park, mountain vista).
 *
 * Alto's Adventure principle: depth through QUANTITY of layers, not contrast.
 * Every layer is a muted harmonic of the sky's hue. Parallax factors spread
 * across the range so movement unmistakably reveals depth.
 *
 * ─── Layer stack (back → front) ────────────────────────────────────────────
 *
 *   Depth   Name                scrollFactor   Parallax factor
 *   ─────   ────────────────    ────────────   ───────────────
 *   -220    Sky gradient (top)       0              —
 *   -219    Sky gradient (bot)       0              —
 *   -218    Sun / moon disc          0              —  (static, wide-field)
 *   -215    Clouds layer 1 (far)     0            0.06   very slow drift
 *   -214    Clouds layer 2 (near)    0            0.12   perceptibly slower than hills
 *   -210    Distant mountains        0            0.15
 *   -205    Mid hills                0            0.28
 *   -200    Near hills / treeline    0            0.42
 *   -195    Close treeline           0            0.58   the "present" layer
 *   -192    Horizon glow             0              —
 *   -190    Ground strip             0              —
 *   -189    Ground feather           0              —
 *    850    Foreground tree L        0              —  (hard silhouette frame)
 *    851    Foreground tree R        0              —
 *    997    Vignette                 0              —
 *    998    Color grade              0              —
 *    999    Film grain               0              —
 *
 * The key insight: each cloud/hill/treeline layer has a DIFFERENT parallax
 * factor. When the player walks, the camera moves, and every layer slides at
 * a different speed — this is what creates the sensation of depth.
 * Without distinct speeds the scene feels like a flat painting.
 *
 * All values are configurable per-scene via overrides.
 */

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULTS = {

  // ── Sky — 3-stop gradient split across two rects for smooth 3-stop ──────
  sky: {
    topColor:  0x7A2515,   // deep burnt sienna crown
    midColor:  0xC8622E,   // dominant warm amber
    botColor:  0xFFDFA0,   // pale cream horizon spill
    bgColor:   0x7A2515,
  },

  // ── Sun disc — faint atmospheric haze, no harsh circle ──────────────────
  // Uses light-blob texture. Scene can disable with sun: { enabled: false }.
  sun: {
    enabled:  true,
    texture:  'light-blob',
    x:        0.72,        // fraction of vW — right-of-center, golden-hour position
    y:        0.18,        // fraction of vH — near top, not dead center
    scaleX:   3.8,
    scaleY:   2.2,
    tint:     0xFFDD88,
    alpha:    0.28,
    depth:    -218,
  },

  // ── Moon disc — opt-in for night / twilight outdoor scenes ───────────────
  // Set moon: { enabled: true } in the scene's EnvironmentManager.apply() call.
  // Uses bg-moon (kenney moonFull.png) — a crisp circle vs the blurry light-blob sun.
  // Place left-of-centre at the top of sky = classic evening moon position.
  moon: {
    enabled:  false,
    texture:  'bg-moon',
    x:        0.22,         // left third of sky
    y:        0.12,
    scaleX:   0.60,
    scaleY:   0.60,
    tint:     0xE8F0FF,     // cool silver-white
    alpha:    0.62,
    depth:    -217,         // just above sun band (-218)
  },

  // ── Horizon glow — feathered atmospheric scatter band ───────────────────
  horizon: {
    color:     0xFFCC88,
    peakAlpha: 0.42,
    topStart:  0.34,       // fraction of vH
    topH:      0.06,
    botStart:  0.40,
    botH:      0.06,
    depth:     -192,
  },

  // ── Cloud layers — two independent speeds for sky depth ─────────────────
  // Far clouds: barely move. Near clouds: move at ~half the hill speed.
  cloudsA: {
    texture:  'bg-el-cloud1',   // resolved in _buildClouds(); uses bgr-cloud fallback
    y:        0.04,
    h:        0.28,
    tint:     0xFFEECC,
    alpha:    0.18,
    depth:    -215,
    factor:   0.06,             // barely moves — gives sky infinite depth
  },
  cloudsB: {
    texture:  'bg-el-cloud2',
    y:        0.08,
    h:        0.32,
    tint:     0xFFD9A0,
    alpha:    0.12,
    depth:    -214,
    factor:   0.12,
  },

  // ── Mountain / hill parallax layers ─────────────────────────────────────
  // Four layers instead of three: mountains → midHills → hills → treeline.
  // Each ~0.13 apart in factor → clear perceptual separation.
  // PARALLAX LAYER TINTS — each must be visually distinct.
  // Rule of thumb: each layer is ~30% darker and ~10% more saturated than
  // the one behind it. The treeline must be near-black to silhouette against sky.
  mountains: {
    texture:  'bg-el-mountains',
    y:        0.22,
    h:        0.50,
    tint:     0x9A6840,    // warm dark terracotta — clearly a mountain shape
    alpha:    0.45,
    depth:    -210,
    factor:   0.15,
  },
  midHills: {
    texture:  'bg-el-hills',
    y:        0.30,
    h:        0.55,
    tint:     0x6A8040,    // dark olive — step clearly darker than mountains
    alpha:    0.60,
    depth:    -205,
    factor:   0.28,
  },
  hills: {
    texture:  'bg-el-hills-large',
    y:        0.40,
    h:        0.56,
    tint:     0x4A6028,    // medium-dark forest green — present-world hills
    alpha:    0.72,
    depth:    -200,
    factor:   0.42,
  },
  treeline: {
    texture:  'bg-el-hills-large',
    y:        0.48,
    h:        0.52,
    tint:     0x141008,    // near-black with faint warm undertone
    alpha:    0.92,        // high alpha = hard silhouette — no sky bleeds through
    depth:    -195,
    factor:   0.58,
  },

  // ── Ground strip — thin atmospheric anchor at very bottom ───────────────
  // The treeline silhouette IS the visual ground plane.
  // This strip only exists to graduate to absolute black at screen bottom.
  ground: {
    topColor:       0x281808,   // very dark warm brown — barely visible
    botColor:       0x040200,
    startFrac:      0.84,       // bottom 16% only
    heightFrac:     0.16,
    depth:          -190,
    edgeAlpha:      0.35,
    edgeH:          0.030,
    vigAlpha:       0.65,       // heavy vignette pushes eye upward into the scene
  },

  // ── World-space ground ───────────────────────────────────────────────────
  // 288 = row 4.0 center in a 12×8 @ 64px world (4*64+32)
  groundY:    288,
  curveAmp1:  0,
  curveFreq1: 0.004,
  curveAmp2:  0,
  curveFreq2: 0.009,

  // ── Foreground ground strips — lush grass plane in front of treeline ──────
  // Two tileSprites of bg-el-ground1/2 (same series as bg-el-hills / mountains).
  // Parallax factors 0.72/0.82 — faster than treeline (0.58), creating a crisp
  // foreground grass plane. Depth -188/-187 = in front of treeline (-195) and
  // ground strip (-190), behind all world-space props.
  // This is the AAA upgrade that separates "flat painting" from "real depth".
  fgGround: {
    enabled:  true,
    layer1: {
      texture: 'bg-el-ground1',
      y:       0.72, h: 0.30,
      tint:    0x281808,    // very dark warm earth — silhouette strip
      alpha:   0.55,
      depth:   -188,
      factor:  0.72,
    },
    layer2: {
      texture: 'bg-el-ground2',
      y:       0.76, h: 0.26,
      tint:    0x180C04,    // near-black — hard silhouette closest to viewer
      alpha:   0.70,
      depth:   -187,
      factor:  0.82,
    },
  },

  // ── Foreground silhouette trees (viewport-locked frame) ─────────────────
  // These NEVER scroll — they are a cinematic border frame.
  // They should be very dark / nearly black, slightly translucent.
  fgTrees: {
    texture:  null,         // auto-detect: bgr-tree-long → bgr-tree-pine
    scale:    4.2,
    tint:     0x0A0603,     // almost black, faint warm undertone
    alpha:    0.90,
    leftX:    0.03,
    rightX:   0.97,
    depthL:   850,
    depthR:   851,
  },

  // ── Post-processing ──────────────────────────────────────────────────────
  vignette: {
    size:   85,
    color:  0x180800,
    alphaL: 0.35,
    alphaR: 0.35,
    alphaT: 0.40,
    alphaB: 0.30,
  },
  filmGrain:  { alpha: 0.038 },
  colorGrade: { color: 0xFFB060, alpha: 0.030, blend: 'OVERLAY' },
};

// ── Class ────────────────────────────────────────────────────────────────────────────────────
export class OpenEnvironment extends BaseEnvironment {
  constructor(scene, overrides = {}) {
    const merged = deepMerge(DEFAULTS, overrides);
    super(scene, DEFAULTS, merged);
  }

  build() {
    this._buildSky();
    this._buildSun();
    this._buildMoon();
    this._buildClouds();
    this._buildParallaxLayers();
    this._buildHorizon();
    this._buildGround();
    this._buildFgGround();
    this._buildFgTrees();
    this.scene.physics.world.setBounds(64, 64, this.W - 128, this.H - 128);
    this._buildVignette(this.cfg.vignette);
    this._buildFilmGrain(this.cfg.filmGrain);
    this._buildColorGrade(this.cfg.colorGrade);
  }

  // ── Sky ──────────────────────────────────────────────────────────────────

  _buildSky() {
    const { vW, vH, scene } = this;
    const sky = this.cfg.sky;

    scene.cameras.main.setBackgroundColor(sky.bgColor ?? sky.topColor);

    // 3-stop gradient rendered on ONE graphics object (single WebGL batch)
    // to avoid the 1-px seam that appears when two rects are on different
    // depth levels. Both passes are drawn onto the same Graphics instance
    // so they share a batching context and the mid-point is seamless.
    //   top → mid  (y 0 → vH*0.5 + 2px overlap)
    //   mid → bot  (y vH*0.5 → vH + 2px to guarantee full coverage)
    const skyGfx = this._track(scene.add.graphics().setScrollFactor(0).setDepth(-220));
    skyGfx.fillGradientStyle(sky.topColor, sky.topColor, sky.midColor, sky.midColor, 1, 1, 1, 1);
    skyGfx.fillRect(0, 0, vW, Math.ceil(vH * 0.5) + 2);
    skyGfx.fillGradientStyle(sky.midColor, sky.midColor, sky.botColor, sky.botColor, 1, 1, 1, 1);
    skyGfx.fillRect(0, Math.floor(vH * 0.5), vW, Math.ceil(vH * 0.5) + 2);
  }

  // ── Sun / moon disc ───────────────────────────────────────────────────────
  // Soft haze blob — adds warmth concentration to the sky without a hard circle.

  _buildSun() {
    const { vW, vH, scene } = this;
    const s = this.cfg.sun;
    if (!s.enabled) return;
    if (!scene.textures.exists(s.texture)) return;

    this._track(
      scene.add.image(Math.round(vW * s.x), Math.round(vH * s.y), s.texture)
        .setScale(s.scaleX, s.scaleY)
        .setAlpha(s.alpha)
        .setTint(s.tint)
        .setBlendMode('ADD')
        .setScrollFactor(0)
        .setDepth(s.depth)
    );
  }

  // ── Moon disc — crisp kenney moonFull.png sprite, opt-in ─────────────────
  // Enabled per scene by passing moon: { enabled: true } in overrides.
  // Positioned left-of-centre high in sky. NORMAL blend (not ADD) so the
  // disc stays opaque white, not a glow smear.

  _buildMoon() {
    const { vW, vH, scene } = this;
    const m = this.cfg.moon;
    if (!m || !m.enabled) return;
    if (!scene.textures.exists(m.texture)) return;
    this._track(
      scene.add.image(Math.round(vW * m.x), Math.round(vH * m.y), m.texture)
        .setScale(m.scaleX, m.scaleY)
        .setAlpha(m.alpha)
        .setTint(m.tint)
        .setScrollFactor(0)
        .setDepth(m.depth)
    );
  }

  // ── Foreground ground strips ──────────────────────────────────────────────
  // bg-el-ground1 / bg-el-ground2 tileSprites at higher parallax factors than
  // the treeline. Creates a dense near-ground plane between the treeline and
  // the physics floor. Disabled by default; enable per scene via overrides.

  _buildFgGround() {
    const { vW, vH, scene } = this;
    const fg = this.cfg.fgGround;
    if (!fg?.enabled) return;
    const buildStrip = (cfg) => {
      if (!scene.textures.exists(cfg.texture)) return;
      const strip = scene.add.tileSprite(
        0, Math.round(vH * cfg.y), vW, Math.round(vH * cfg.h), cfg.texture,
      ).setOrigin(0, 0).setScrollFactor(0)
       .setTint(cfg.tint).setAlpha(cfg.alpha).setDepth(cfg.depth);
      this._registerParallax(strip, cfg.factor);
    };
    buildStrip(fg.layer1);
    buildStrip(fg.layer2);
  }

  // ── Cloud layers ─────────────────────────────────────────────────────────
  // Two tileSprites at different parallax factors = sky has its own depth.
  // Far clouds (factor 0.06) barely move. Near clouds (0.12) move noticeably.

  _buildClouds() {
    const { vW, vH, scene } = this;

    const buildStrip = (cfg) => {
      // Try the configured key, then fallback to bgr-cloud family
      let tex = cfg.texture;
      if (!tex || !scene.textures.exists(tex)) {
        for (const k of ['bgr-cloud1', 'bgr-cloud2', 'bg-el-cloud1', 'bg-el-cloud2']) {
          if (scene.textures.exists(k)) { tex = k; break; }
        }
      }
      if (!tex || !scene.textures.exists(tex)) return;

      const strip = scene.add.tileSprite(
        0, Math.round(vH * cfg.y), vW, Math.round(vH * cfg.h), tex,
      ).setOrigin(0, 0).setScrollFactor(0)
       .setTint(cfg.tint).setAlpha(cfg.alpha).setDepth(cfg.depth);

      this._registerParallax(strip, cfg.factor);
    };

    buildStrip(this.cfg.cloudsA);
    buildStrip(this.cfg.cloudsB);
  }

  // ── Mountain / hill / treeline parallax layers ────────────────────────────
  // Four layers at factors 0.15 / 0.28 / 0.42 / 0.58.
  // Spacing of ~0.13 between each layer creates clear, readable depth.

  _buildParallaxLayers() {
    const { vW, vH, scene } = this;

    const buildStrip = (cfg) => {
      if (!scene.textures.exists(cfg.texture)) return;
      const strip = scene.add.tileSprite(
        0, Math.round(vH * cfg.y), vW, Math.round(vH * cfg.h), cfg.texture,
      ).setOrigin(0, 0).setScrollFactor(0)
       .setTint(cfg.tint).setAlpha(cfg.alpha).setDepth(cfg.depth);

      // Scale the tile so the texture fills the viewport width without repeating.
      // A seam appears wherever tilePositionX % texWidth === 0 — if tileScaleX
      // makes one tile wider than the viewport, no seam can enter the visible area.
      const frame  = scene.textures.getFrame(cfg.texture);
      const texW   = frame?.realWidth ?? 1024;
      const needed = vW / texW;
      // Ceiling to next 0.05 + 0.1 buffer guarantees coverage even at sub-pixel boundaries.
      strip.tileScaleX = Math.ceil(needed * 20) / 20 + 0.10;

      this._registerParallax(strip, cfg.factor);
    };

    buildStrip(this.cfg.mountains);
    buildStrip(this.cfg.midHills);
    buildStrip(this.cfg.hills);
    buildStrip(this.cfg.treeline);
  }

  // ── Horizon glow ─────────────────────────────────────────────────────────
  // Placed AFTER parallax layers so it sits on top of them, blending the
  // horizon seam where the hill silhouettes meet the sky.

  _buildHorizon() {
    const { vW, vH, scene } = this;
    const h = this.cfg.horizon;

    // Fade-in band from transparent → peak
    const seamTop = this._track(scene.add.graphics().setScrollFactor(0).setDepth(h.depth));
    seamTop.fillGradientStyle(h.color, h.color, h.color, h.color, 0, 0, h.peakAlpha, h.peakAlpha);
    seamTop.fillRect(0, Math.round(vH * h.topStart), vW, Math.round(vH * h.topH));

    // Fade-out band from peak → transparent
    const seamBot = this._track(scene.add.graphics().setScrollFactor(0).setDepth(h.depth));
    seamBot.fillGradientStyle(h.color, h.color, h.color, h.color, h.peakAlpha, h.peakAlpha, 0, 0);
    seamBot.fillRect(0, Math.round(vH * h.botStart), vW, Math.round(vH * h.botH));
  }

  // ── Ground strip ─────────────────────────────────────────────────────────
  // Thin atmospheric dark strip at the very bottom. No hard line—feathered
  // transition from treeline into darkness.

  _buildGround() {
    const { vW, vH, scene } = this;
    const g = this.cfg.ground;

    const GROUND_Y = Math.round(vH * g.startFrac);
    const GROUND_H = Math.round(vH * (1 - g.startFrac));

    // Main gradient
    const gfx = this._track(scene.add.graphics().setScrollFactor(0).setDepth(g.depth));
    gfx.fillGradientStyle(g.topColor, g.topColor, g.botColor, g.botColor, 1, 1, 1, 1);
    gfx.fillRect(0, GROUND_Y, vW, GROUND_H);

    // Soft feather at the top where treeline meets ground
    if (g.edgeAlpha > 0) {
      const edge = this._track(scene.add.graphics().setScrollFactor(0).setDepth(g.depth + 1));
      edge.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, g.edgeAlpha, g.edgeAlpha, 0, 0);
      edge.fillRect(0, GROUND_Y, vW, Math.round(vH * g.edgeH));
    }

    // Heavy bottom vignette — draws the eye upward
    const gVig = this._track(scene.add.graphics().setScrollFactor(0).setDepth(g.depth + 1));
    gVig.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, g.vigAlpha, g.vigAlpha);
    gVig.fillRect(0, Math.round(vH * 0.84), vW, Math.round(vH * 0.16));
  }

  // ── Foreground silhouette trees ───────────────────────────────────────────
  // Hard cinematic frame. Two dark trees at screen edges, never scroll.
  // They enforce Lower-Third composition (sky in top 2/3, action below).

  _buildFgTrees() {
    const { vW, vH, scene } = this;
    const fg = this.cfg.fgTrees;

    // Mobile landscape: at scale 4.2 a bgr-tree-long sprite (~200 px wide)
    // becomes ~840 px wide. With leftX 0.03 the right half of the left tree
    // lands at ~445 px — past the centre of a 844 px wide phone screen.
    // The cinematic framing benefit is lost and the scene is obscured.
    // Skip fgTrees entirely on mobile landscape; the vignette already frames
    // the edges adequately. Desktop/laptop screens are never this short
    // (threshold 500 px is safely below any normal laptop viewport height).
    if (vH < vW && vH < 500) return;

    let tex = fg.texture;
    if (!tex) {
      for (const k of ['bgr-tree-long', 'bgr-tree-pine', 'bg-tree', 'k-tree-tall']) {
        if (scene.textures.exists(k)) { tex = k; break; }
      }
    }
    if (!tex || !scene.textures.exists(tex)) return;

    this._track(
      scene.add.image(Math.round(vW * fg.leftX), vH + 24, tex)
        .setScale(fg.scale).setOrigin(0.5, 1.0)
        .setTint(fg.tint).setAlpha(fg.alpha)
        .setScrollFactor(0).setDepth(fg.depthL ?? 850)
    );
    this._track(
      scene.add.image(Math.round(vW * fg.rightX), vH + 24, tex)
        .setScale(fg.scale).setOrigin(0.5, 1.0)
        .setTint(fg.tint).setAlpha(fg.alpha)
        .setScrollFactor(0).setDepth(fg.depthR ?? 851).setFlipX(true)
    );
  }
}

