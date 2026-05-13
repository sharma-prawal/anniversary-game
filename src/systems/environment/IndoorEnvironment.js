import { BaseEnvironment, deepMerge } from './BaseEnvironment.js';

/**
 * IndoorEnvironment — interior rooms (office, apartment, library, cafeteria).
 *
 * ─── Layer stack (back → front) ──────────────────────────────────────────────
 *
 *   Depth   Name                   Notes
 *   ─────   ─────────────────────  ─────────────────────────────────────────
 *  (-300)   Tilemap*               set this in the scene so env paints on top
 *   -85    Ceiling gradient        3-stop dark→mid→light at wall join
 *   -80    Back wall               solid fill (or tileSprite w/ parallax)
 *   -75    Ceiling trim strip      2px architectural line
 *   -70    Mid-wall shade          faint ADD luminance
 *   -68    Wainscoting             lower wall panel
 *   -65    Chair rail              thin divider strip
 *   -60    Floor gradient          warm→near-black feathered
 *   -55    Floor ambient           warm ADD floor wash
 *   -50    Skirting board          strip at floor/wall junction
 *    16    Windows                 screen-space; above world-space blobs
 *    997    Vignette
 *    998    Color grade
 *    999    Film grain
 *
 * IMPORTANT: scene tilemaps must be at depth ≤ -100 so they sit behind env.
 *
 * Window styles:
 *   'home'   — night apartment: deep navy glass, cold moonlight + amber streetlamp
 *   'office' — daytime office: steel-blue glass, pale grey-blue daylight, grid panes
 *   'cafe'   — night street-level: warm-toned dark glass, city silhouette, amber
 *              streetlamp wash, candlelight glow bleeding from inside onto glass
 */

const DEFAULTS = {

  // ── Ceiling ───────────────────────────────────────────────────────────────
  ceiling: {
    topColor:  0x08101C,
    midColor:  0x0F1A28,
    botColor:  0x1E2A38,
    depth:     -85,
    h:         0.30,   // compressed — wall is a narrow band at the top
  },

  // ── Back wall ─────────────────────────────────────────────────────────────
  // texture: 'k-wall' — 108×190 px kenney side-view wall panel, tiles seamlessly
  // into a grid of plaster panels. Tinted to match scene palette. Set null for
  // a flat graphics fill instead.
  wall: {
    texture:   'k-wall',
    color:     0x1E2A38,
    tint:      0xCCAA80,
    alpha:     0.88,
    y:         0.0,
    h:         0.46,   // covers ceiling→floor join, overlapped by floor gradient
    depth:     -80,
    factor:    0.05,
  },

  // ── Windows ───────────────────────────────────────────────────────────────
  // Screen-space (scrollFactor 0) so they are always anchored to the wall.
  // Built by IndoorEnvironment — do NOT duplicate in buildProps().
  windows: {
    enabled:   true,
    style:     'home',         // 'home' | 'office'
    positions: [0.28, 0.72],   // x positions as fraction of vW
    w:         90,             // width in screen pixels
    h:         70,             // height in screen pixels
    yFrac:     0.20,           // high on the wall — in the top band
    depth:     16,             // above atmospheric blobs (8–11), below props (50+)
  },

  // ── Ceiling trim ─────────────────────────────────────────────────────────
  trim: {
    enabled:  true,
    color:    0x0A0F18,
    alpha:    0.18,             // subtle — just a breath of structure
    yFrac:    0.38,            // at the floor/wall join
    h:        2,
    depth:    -75,
  },

  // ── Mid-wall shade ────────────────────────────────────────────────────────
  wallShade: {
    enabled:  true,
    color:    0xFFEECC,
    alpha:    0.04,
    yFrac:    0.04,
    h:        0.28,   // covers only the compressed wall band
    depth:    -70,
  },

  // ── Wainscoting ───────────────────────────────────────────────────────────
  // Lower wall panel — slightly darker/cooler than the mid-wall.
  // Sits between the chair rail and the floor join.
  wainscoting: {
    enabled:  true,
    color:    0x141E2C,
    alpha:    0.75,
    hFrac:    0.08,            // height as fraction of vH
    depth:    -68,
  },

  // ── Chair rail ────────────────────────────────────────────────────────────
  // Thin moulding strip at the top of the wainscoting. Disable in dark scenes
  // where even a subtle line reads as a hard horizontal cut.
  chairRail: {
    enabled:  true,
    color:    0x243040,
    alpha:    0.35,              // much softer default
    h:        2,
    depth:    -65,
  },

  // ── Floor ─────────────────────────────────────────────────────────────────
  // texture: 'k-floor' — 207×8 px kenney plank strip, tiles into ~22 horizontal
  // wood-plank rows. Tinted dark (topColor) to match scene. feather gradient
  // stays on top for soft wall→floor blend. Set texture: null for pure gradient.
  floor: {
    texture:      'k-floor',
    topColor:     0x2A1E10,
    botColor:     0x080402,
    startFrac:    0.38,   // floor dominates — wall is a narrow top band
    depth:        -60,
    featherH:     0.030,
    featherAlpha: 0.22,
  },

  // ── Window light cast ─────────────────────────────────────────────────────
  // A narrow 'light-blob' shaft angled inward from each window position toward
  // the floor — the single biggest cinematic upgrade for indoor scenes.
  // Lean direction auto-derived: windows on the left lean right, vice versa.
  windowCast: {
    enabled: true,
    alpha:   0.065,
    tint:    0xFFEECC,
    depth:   -54,
  },

  // ── Floor ambient ─────────────────────────────────────────────────────────
  floorAmbient: {
    enabled:  true,
    texture:  'light-blob',
    tint:     0xFFCC88,
    alpha:    0.06,
    depth:    -55,
  },

  // ── Skirting board ────────────────────────────────────────────────────────
  // Tiny strip at the very bottom of the wall, just above the floor.
  skirting: {
    enabled:  true,
    color:    0x080C14,
    alpha:    0.85,
    h:        3,               // pixels
    depth:    -50,
  },

  // ── World-space ground ────────────────────────────────────────────────────
  groundY:        288,
  groundCurveAmp: 0,

  // ── Physics wall barrier ─────────────────────────────────────────────────
  // Top N grid rows are wall/ceiling — player cannot enter that zone.
  // Physics world bounds Y top = wallBoundRows * cellSize.
  wallBoundRows:  3,

  // ── Post-processing ───────────────────────────────────────────────────────
  vignette: {
    size:   100,
    color:  0x05020A,
    alphaL: 0.45,
    alphaR: 0.45,
    alphaT: 0.28,
    alphaB: 0.38,
  },
  filmGrain:  { alpha: 0.028 },
  colorGrade: { color: 0xFFCC88, alpha: 0.022, blend: 'OVERLAY' },
};

export class IndoorEnvironment extends BaseEnvironment {
  constructor(scene, overrides = {}) {
    const merged = deepMerge(DEFAULTS, overrides);
    super(scene, DEFAULTS, merged);
  }

  build() {
    this._buildCeiling();
    this._buildWall();
    this._buildWindows();       // ← screen-space, depth -206, above wall
    this._buildWindowCast();    // ← angled light shaft from each window to floor
    this._buildTrim();
    this._buildWallShade();
    this._buildWainscoting();   // ← lower wall panel
    this._buildChairRail();     // ← thin moulding strip
    this._buildFloor();
    this._buildFloorAmbient();
    this._buildSkirting();      // ← base strip at floor/wall join

    // ── Physics wall barrier ─────────────────────────────────────────────
    // Top N rows are wall/ceiling — player must stay in the floor zone below.
    // wallBoundRows × cellSize gives the world-Y top of the walkable area.
    const cs       = this.scene.cellSize ?? 64;
    const wallTopY = (this.cfg.wallBoundRows ?? 3) * cs;
    this.scene.physics.world.setBounds(0, wallTopY, this.W, this.H - wallTopY);
    this._buildVignette(this.cfg.vignette);
    this._buildFilmGrain(this.cfg.filmGrain);
    this._buildColorGrade(this.cfg.colorGrade);
  }

  // ── Ceiling ───────────────────────────────────────────────────────────────

  _buildCeiling() {
    const { scene, vW, vH } = this;
    const c = this.cfg.ceiling;

    scene.cameras.main.setBackgroundColor(c.topColor);

    const ceilH = Math.round(vH * c.h);
    const g1 = this._track(scene.add.graphics().setScrollFactor(0).setDepth(c.depth));
    g1.fillGradientStyle(c.topColor, c.topColor, c.midColor, c.midColor, 1, 1, 1, 1);
    g1.fillRect(0, 0, vW, Math.ceil(ceilH * 0.5));
    const g2 = this._track(scene.add.graphics().setScrollFactor(0).setDepth(c.depth));
    g2.fillGradientStyle(c.midColor, c.midColor, c.botColor, c.botColor, 1, 1, 1, 1);
    g2.fillRect(0, Math.floor(ceilH * 0.5), vW, Math.ceil(ceilH * 0.5));
  }

  // ── Back wall ─────────────────────────────────────────────────────────────

  _buildWall() {
    const { scene, vW, vH } = this;
    const w = this.cfg.wall;

    if (w.texture && scene.textures.exists(w.texture)) {
      const strip = scene.add.tileSprite(
        0, Math.round(vH * w.y), vW, Math.round(vH * w.h), w.texture,
      ).setOrigin(0, 0).setScrollFactor(0)
       .setTint(w.tint).setAlpha(w.alpha).setDepth(w.depth);
      this._registerParallax(strip, w.factor);
    } else {
      const gfx = this._track(scene.add.graphics().setScrollFactor(0).setDepth(w.depth));
      gfx.fillStyle(w.color, w.alpha);
      gfx.fillRect(0, Math.round(vH * w.y), vW, Math.round(vH * w.h));
    }
  }

  // ── Windows ───────────────────────────────────────────────────────────────
  // Drawn in the GAME SCENE (not UIScene) so they depth-sort correctly with
  // all world objects.  depth=16 → behind Y-sorted props (depth ≥ ~192) and
  // in front of wall/ceiling/floor backgrounds (depth -85…-50).
  //
  // Screen-fixed positioning: each window lives in a Phaser Container with
  // setScrollFactor(0).  Because renderX = container.x × zoom we must set
  //   container.x = desiredScreenX / zoom
  // and redo it every frame in update() as the camera zoom changes.
  //
  // Layer order within each container (local coords, origin = outer frame TL):
  //   wall spill, reveal shadow, outer frame, bevel, sill,
  //   glass gradient, skyline/sky-wash, stars, light blobs,
  //   pane dividers, glass reflection

  _buildWindows() {
    const { scene, vW, vH } = this;
    const w = this.cfg.windows;
    if (!w.enabled) return;

    const WIN_W    = w.w;
    const WIN_H    = w.h;
    const WIN_Y    = Math.round(vH * w.yFrac);
    const isOffice = w.style === 'office';
    const isCafe   = w.style === 'cafe';
    const F  = 7;   // outer frame thickness
    const BV = 2;   // bevel strip width
    const SW = F + 5;  // sill overhang each side
    const SH = 8;      // sill height

    this._windowContainers = [];

    w.positions.forEach(xFrac => {
      const cx   = Math.round(vW * xFrac);
      const top  = WIN_Y - Math.round(WIN_H / 2);
      const bot  = top + WIN_H;

      // Container origin = outer frame top-left corner, in screen pixels
      const sx = cx - Math.round(WIN_W / 2) - F;   // desired screen X
      const sy = top - F;                            // desired screen Y
      const TW = WIN_W + F * 2;   // total container width  (frame + glass + frame)
      const TH = WIN_H + F * 2;   // total container height

      const zoom0 = scene.cameras.main.zoom || 1;
      const midX0 = vW / 2;
      const midY0 = vH / 2;
      const container = scene.add.container(
        midX0 + (sx - midX0) / zoom0,
        midY0 + (sy - midY0) / zoom0,
      );
      container.setScrollFactor(0).setDepth(w.depth);
      this._track(container);
      this._windowContainers.push({ container, sx, sy });

      // ── 0. Ambient wall spill (behind and larger than the frame)
      if (scene.textures.exists('light-blob')) {
        const spillTint = isOffice ? 0x4466AA : isCafe ? 0xAA5511 : 0x1A3366;
        const spill = scene.add.image(TW / 2, TH / 2 + WIN_H * 0.15, 'light-blob')
          .setScale(4.0, 2.8).setAlpha(0.16)
          .setTint(spillTint)
          .setBlendMode('ADD');
        container.add(spill);
      }

      // ── 1. Wall reveal — shadow strips implying wall thickness
      const rvl = scene.add.graphics();
      rvl.fillStyle(0x000000, 0.55);
      rvl.fillRect(-5, 0, 5, TH + SH);   // left
      rvl.fillRect(TW, 0, 5, TH + SH);   // right
      rvl.fillRect(0, -5, TW, 5);         // top
      container.add(rvl);

      // ── 2. Outer frame fill
      const frameBase = isOffice ? 0x3A4A5C : isCafe ? 0x2C1A0E : 0x1C2C3E;
      const frm = scene.add.graphics();
      frm.fillStyle(frameBase, 1);
      frm.fillRect(0, 0, TW, TH);
      container.add(frm);

      // ── 3. Frame bevel
      const bevelLt = isOffice ? 0x6A80A0 : isCafe ? 0x5A3A1E : 0x3A5068;
      const bevelDk = isOffice ? 0x1A2530 : isCafe ? 0x100806 : 0x080E16;
      const bv = scene.add.graphics();
      bv.fillStyle(bevelLt, 0.80);
      bv.fillRect(0,       0,       TW, BV); // top highlight
      bv.fillRect(0,       0,       BV, TH); // left highlight
      bv.fillStyle(bevelDk, 0.90);
      bv.fillRect(0,       TH - BV, TW, BV); // bottom shadow
      bv.fillRect(TW - BV, 0,       BV, TH); // right shadow
      container.add(bv);

      // ── 4. Window sill
      const sillColor  = isOffice ? 0x4A5A6E : isCafe ? 0x3A2010 : 0x243444;
      const sillShadow = isOffice ? 0x1A2030 : isCafe ? 0x100806 : 0x060C14;
      const sl = scene.add.graphics();
      sl.fillStyle(bevelLt,   0.50); sl.fillRect(F - SW, TH - 1,       WIN_W + SW * 2, 2);
      sl.fillStyle(sillColor, 1.00); sl.fillRect(F - SW, TH + 1,       WIN_W + SW * 2, SH - 2);
      sl.fillStyle(sillShadow, 0.70); sl.fillRect(F - SW + 1, TH + SH - 1, WIN_W + SW * 2, 3);
      container.add(sl);

      // ── 5. Glass gradient fill
      // cafe: very dark warm-tinted glass (night street-level, warm interior)
      const glassTop = isOffice ? 0x2A3E58 : isCafe ? 0x100806 : 0x080F1C;
      const glassBot = isOffice ? 0x18283C : isCafe ? 0x070402 : 0x030810;
      const gl = scene.add.graphics();
      gl.fillGradientStyle(glassTop, glassTop, glassBot, glassBot, 1, 1, 1, 1);
      gl.fillRect(F, F, WIN_W, WIN_H);
      container.add(gl);

      // ── 6. Night skyline (home/cafe) or sky wash strip (office)
      if (!isOffice) {
        // cafe uses a warmer sky fill; home uses deep navy
        const skyFill = isCafe ? 0x0A0604 : 0x030A14;
        const sky = scene.add.graphics();
        sky.fillStyle(skyFill, 1);
        const skylineData = [
          { xf:0.00,wf:0.13,hf:0.28 }, { xf:0.11,wf:0.08,hf:0.44 },
          { xf:0.21,wf:0.10,hf:0.20 }, { xf:0.33,wf:0.09,hf:0.36 },
          { xf:0.44,wf:0.13,hf:0.24 }, { xf:0.59,wf:0.08,hf:0.50 },
          { xf:0.69,wf:0.11,hf:0.30 }, { xf:0.82,wf:0.09,hf:0.42 },
          { xf:0.92,wf:0.08,hf:0.22 },
        ];
        for (const b of skylineData) {
          const bh = Math.round(b.hf * WIN_H * 0.38);
          sky.fillRect(F + Math.round(b.xf * WIN_W), F + WIN_H - bh,
            Math.round(b.wf * WIN_W), bh);
        }
        // cafe: amber streetlamp with wider warm scatter; home: cool white
        const lightCol = isCafe ? 0xFFAA33 : 0xFFAA44;
        const lightAlpha = isCafe ? 0.85 : 0.65;
        sky.fillStyle(lightCol, lightAlpha);
        for (const lw of [
          { xf:0.13,yf:0.10 }, { xf:0.36,yf:0.12 },
          { xf:0.61,yf:0.15 }, { xf:0.85,yf:0.11 },
        ]) {
          sky.fillRect(
            F + Math.round(lw.xf * WIN_W),
            F + WIN_H - Math.round(lw.yf * WIN_H), 2, 2);
        }
        // cafe extra: warm orange street glow at horizon base
        if (isCafe) {
          sky.fillStyle(0xFF8800, 0.12);
          sky.fillRect(F, F + WIN_H - Math.round(WIN_H * 0.28), WIN_W, Math.round(WIN_H * 0.28));
        }
        container.add(sky);
      } else {
        const skyWash = scene.add.graphics();
        skyWash.fillStyle(0xCCDDEE, 0.04);
        skyWash.fillRect(F, F + Math.round(WIN_H * 0.35), WIN_W, Math.round(WIN_H * 0.18));
        container.add(skyWash);
      }

      // ── 7. Stars (home only — cafe has too much light pollution, office is daytime)
      if (!isOffice && !isCafe) {
        const strs = scene.add.graphics();
        const starData = [
          { xf:0.10,yf:0.08,a:0.70 }, { xf:0.32,yf:0.06,a:0.55 },
          { xf:0.52,yf:0.12,a:0.65 }, { xf:0.76,yf:0.05,a:0.80 },
          { xf:0.20,yf:0.22,a:0.45 }, { xf:0.65,yf:0.18,a:0.50 },
          { xf:0.45,yf:0.32,a:0.40 }, { xf:0.88,yf:0.28,a:0.35 },
          { xf:0.06,yf:0.38,a:0.30 }, { xf:0.58,yf:0.40,a:0.25 },
        ];
        for (const s of starData) {
          strs.fillStyle(0xFFFFFF, s.a);
          strs.fillRect(F + Math.round(s.xf * WIN_W), F + Math.round(s.yf * WIN_H), 1, 1);
        }
        container.add(strs);
      }

      // ── 8. Atmospheric light inside glass
      if (scene.textures.exists('light-blob')) {
        if (isOffice) {
          container.add(
            scene.add.image(F + WIN_W / 2, F + WIN_H * 0.38, 'light-blob')
              .setScale(1.6, 1.1).setAlpha(0.52).setTint(0x88AACC).setBlendMode('ADD')
          );
        } else if (isCafe) {
          // Candlelight glow from the interior bleeds back up through the glass
          container.add(
            scene.add.image(F + WIN_W / 2, F + WIN_H * 0.85, 'light-blob')
              .setScale(1.8, 0.55).setAlpha(0.60).setTint(0xFFAA33).setBlendMode('ADD')
          );
          // Faint cool sky glow top — city sky above the roofline
          container.add(
            scene.add.image(F + WIN_W / 2, F + WIN_H * 0.10, 'light-blob')
              .setScale(1.3, 0.45).setAlpha(0.18).setTint(0x221810).setBlendMode('ADD')
          );
        } else {
          container.add(
            scene.add.image(F + WIN_W / 2, F + WIN_H * 0.20, 'light-blob')
              .setScale(1.5, 0.95).setAlpha(0.68).setTint(0x3377AA).setBlendMode('ADD')
          );
          container.add(
            scene.add.image(F + WIN_W / 2, F + WIN_H * 0.94, 'light-blob')
              .setScale(1.6, 0.38).setAlpha(0.55).setTint(0xFF9920).setBlendMode('ADD')
          );
        }
      }

      // ── 9. Pane dividers — thick with bevel
      // cafe: warm wood-toned bars (2 panes, simpler like a restaurant window)
      const barBase   = isOffice ? 0x3E5470 : isCafe ? 0x2C1808 : 0x243454;
      const barHi     = isOffice ? 0x7090B0 : isCafe ? 0x5A3418 : 0x445A72;
      const barSh     = isOffice ? 0x141C28 : isCafe ? 0x0E0604 : 0x060C14;
      const paneCount = isOffice ? 3 : 2;
      const bars      = scene.add.graphics();
      const midY_L    = F + Math.round(WIN_H * 0.50);
      bars.fillStyle(barHi,   0.60); bars.fillRect(F, midY_L - 1, WIN_W, 1);
      bars.fillStyle(barBase, 1.00); bars.fillRect(F, midY_L,     WIN_W, 3);
      bars.fillStyle(barSh,   0.50); bars.fillRect(F, midY_L + 3, WIN_W, 1);
      for (let p = 1; p < paneCount; p++) {
        const px_L = F + Math.round((WIN_W / paneCount) * p);
        bars.fillStyle(barHi,   0.60); bars.fillRect(px_L - 1, F, 1, WIN_H);
        bars.fillStyle(barBase, 1.00); bars.fillRect(px_L,     F, 3, WIN_H);
        bars.fillStyle(barSh,   0.45); bars.fillRect(px_L + 3, F, 1, WIN_H);
      }
      container.add(bars);

      // ── 10. Glass reflection streak
      const ref = scene.add.graphics();
      ref.lineStyle(3, 0xFFFFFF, 0.08);
      ref.beginPath();
      ref.moveTo(F + Math.round(WIN_W * 0.08), F + Math.round(WIN_H * 0.06));
      ref.lineTo(F + Math.round(WIN_W * 0.36), F + Math.round(WIN_H * 0.54));
      ref.strokePath();
      ref.lineStyle(1, 0xFFFFFF, 0.05);
      ref.beginPath();
      ref.moveTo(F + Math.round(WIN_W * 0.16), F + Math.round(WIN_H * 0.06));
      ref.lineTo(F + Math.round(WIN_W * 0.44), F + Math.round(WIN_H * 0.54));
      ref.strokePath();
      container.add(ref);
    });
  }

  // ── Ceiling trim ─────────────────────────────────────────────────────────

  _buildTrim() {
    const { scene, vW, vH } = this;
    const t = this.cfg.trim;
    if (!t.enabled) return;

    const gfx = this._track(scene.add.graphics().setScrollFactor(0).setDepth(t.depth));
    gfx.fillStyle(t.color, t.alpha);
    gfx.fillRect(0, Math.round(vH * t.yFrac), vW, t.h);
  }

  // ── Mid-wall luminance ────────────────────────────────────────────────────

  _buildWallShade() {
    const { scene, vW, vH } = this;
    const s = this.cfg.wallShade;
    if (!s.enabled) return;
    if (!scene.textures.exists('light-blob')) return;

    this._track(
      scene.add.image(vW * 0.5, Math.round(vH * (s.yFrac + s.h * 0.5)), 'light-blob')
        .setDisplaySize(vW * 1.6, Math.round(vH * s.h))
        .setTint(s.color).setAlpha(s.alpha)
        .setBlendMode('ADD').setScrollFactor(0).setDepth(s.depth)
    );
  }

  // ── Wainscoting ───────────────────────────────────────────────────────────
  // Lower wall panel — a slightly darker zone between chair rail and floor join.
  // Adds structural depth without needing a texture.

  _buildWainscoting() {
    const { scene, vW, vH } = this;
    const wn = this.cfg.wainscoting;
    if (!wn.enabled) return;

    const floorY  = Math.round(vH * this.cfg.floor.startFrac);
    const panelH  = Math.round(vH * wn.hFrac);
    const panelTop = floorY - panelH;

    const gfx = this._track(scene.add.graphics().setScrollFactor(0).setDepth(wn.depth));
    gfx.fillStyle(wn.color, wn.alpha);
    gfx.fillRect(0, panelTop, vW, panelH);
  }

  // ── Chair rail ────────────────────────────────────────────────────────────
  // Thin moulding strip at the top of the wainscoting.

  _buildChairRail() {
    const { scene, vW, vH } = this;
    const cr = this.cfg.chairRail;
    if (!cr.enabled) return;

    const floorY  = Math.round(vH * this.cfg.floor.startFrac);
    const panelTop = floorY - Math.round(vH * this.cfg.wainscoting.hFrac);

    const gfx = this._track(scene.add.graphics().setScrollFactor(0).setDepth(cr.depth));
    gfx.fillStyle(cr.color, cr.alpha);
    gfx.fillRect(0, panelTop - cr.h, vW, cr.h);
  }

  // ── Floor ─────────────────────────────────────────────────────────────────

  _buildFloor() {
    const { scene, vW, vH } = this;
    const f = this.cfg.floor;

    const FLOOR_Y = Math.round(vH * f.startFrac);
    const FLOOR_H = vH - FLOOR_Y;

    // Use tileSprite when a texture is available — k-floor (207×8 px plank strip)
    // tiles into ~22 warm wood rows. Tinted to topColor for scene-correct tone.
    if (f.texture && scene.textures.exists(f.texture)) {
      this._track(
        scene.add.tileSprite(0, FLOOR_Y, vW, FLOOR_H, f.texture)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setTint(f.topColor)
          .setAlpha(0.82)
          .setDepth(f.depth)
      );
    } else {
      const gfx = this._track(scene.add.graphics().setScrollFactor(0).setDepth(f.depth));
      gfx.fillGradientStyle(f.topColor, f.topColor, f.botColor, f.botColor, 1, 1, 1, 1);
      gfx.fillRect(0, FLOOR_Y, vW, FLOOR_H);
    }

    // Feather gradient always on top — soft wall→floor blend regardless of texture
    const featherH = Math.round(vH * f.featherH);
    const edge = this._track(scene.add.graphics().setScrollFactor(0).setDepth(f.depth + 1));
    edge.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000,
      f.featherAlpha, f.featherAlpha, 0, 0);
    edge.fillRect(0, FLOOR_Y, vW, featherH);
  }

  // ── Window light cast ───────────────────────────────────────────────────────────
  // A narrow light-blob ellipse angled inward from each window position toward
  // the floor. Lean angle auto-derived from window x (left windows lean right,
  // right windows lean left) so both shafts converge toward scene centre.

  _buildWindowCast() {
    const { scene, vW, vH } = this;
    const cfg = this.cfg.windowCast;
    if (!cfg?.enabled) return;
    if (!scene.textures.exists('light-blob')) return;
    if (!this.cfg.windows?.enabled) return;

    const WIN_Y    = Math.round(vH * this.cfg.windows.yFrac);
    const FLOOR_Y  = Math.round(vH * this.cfg.floor.startFrac);
    const castMidY = WIN_Y + Math.round((FLOOR_Y - WIN_Y) * 0.60);
    const castH    = FLOOR_Y - WIN_Y;   // full shaft length in px

    for (const xFrac of this.cfg.windows.positions) {
      const castX = Math.round(vW * xFrac);
      // Lean slightly toward centre: left windows tilt right (+), right tilt left (-)
      const lean  = (xFrac > 0.5 ? -1 : 1) * 0.14;
      this._track(
        scene.add.image(castX, castMidY, 'light-blob')
          .setScale(0.45, castH / (scene.textures.get('light-blob').source[0]?.height ?? 64))   // shaft height relative to actual texture px (H2)
          .setAlpha(cfg.alpha)
          .setTint(cfg.tint)
          .setBlendMode('ADD')
          .setScrollFactor(0)
          .setDepth(cfg.depth)
          .setRotation(lean)
      );
    }
  }

  // ── Floor ambient ─────────────────────────────────────────────────────────

  _buildFloorAmbient() {
    const { scene, vW, vH } = this;
    const fa = this.cfg.floorAmbient;
    if (!fa.enabled) return;
    if (!scene.textures.exists(fa.texture)) return;

    const floorY = Math.round(vH * this.cfg.floor.startFrac);

    this._track(
      scene.add.image(vW * 0.5, floorY + (vH - floorY) * 0.4, fa.texture)
        .setDisplaySize(vW * 1.8, (vH - floorY) * 1.2)
        .setTint(fa.tint).setAlpha(fa.alpha)
        .setBlendMode('ADD').setScrollFactor(0).setDepth(fa.depth)
    );
  }

  // ── Skirting board ────────────────────────────────────────────────────────
  // Tiny dark strip just below the floor/wall join — grounds the transition.

  _buildSkirting() {
    const { scene, vW, vH } = this;
    const sk = this.cfg.skirting;
    if (!sk.enabled) return;

    const floorY = Math.round(vH * this.cfg.floor.startFrac);

    const gfx = this._track(scene.add.graphics().setScrollFactor(0).setDepth(sk.depth));
    gfx.fillStyle(sk.color, sk.alpha);
    gfx.fillRect(0, floorY, vW, sk.h);
  }
}
