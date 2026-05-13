import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter7Scene — "Pizza & New Beginnings"
 *
 * Intimate evening cafe interior. A single glowing "hero table" near screen
 * centre guides the player from the doorway to Aashna.
 *
 * Spatial logic (12 cols × 8 rows, cell 64px = 768 × 512):
 *
 *   Back wall props at row 2.0 — behind physics top bound (y=192, row 3).
 *   Entry lamp at (1.0, 3.8) warms the doorway.
 *   Bg table LEFT  at (2.5, 3.8) — dimmed, peripheral.
 *   Bg table RIGHT at (9.5, 4.2) — dimmed, peripheral.
 *   Hero table     at (6.5, 4.5) — three-layer rose-gold glow, destination.
 *   Aashna wanders near (7.8, 4.5) — already at the table.
 *   Corner plants at (1.2, 6.2) and (10.8, 6.2) frame the floor.
 *
 *   Camera viewport at zoom 1.72 = 558px.
 *   Player at col 1.5 (x=128) → hero table at col 6.5 (x=448) is
 *   visible in the opening frame — player is immediately drawn to it.
 */
export class Chapter7Scene extends ChapterScene {
  constructor() {
    super('Chapter7', {
      cols:       12,
      rows:       8,
      mood:       'romantic',
      zoom:       1.72,
      targetZoom: 1.80,
      followLerp: 0.055,
      drift:      false,
      fadeInMs:   1800,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — evening cafe, warm candlelit interior
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // ── Environment — candlelit cafe interior with 'cafe' night windows ──
    // The INDOOR preset draws: ceiling gradient, warm-tinted back wall,
    // cafe-style windows (city skyline + amber streetlamp + candlelight
    // glow on glass), floor gradient, vignette, and film grain.
    this.env = EnvironmentManager.apply(this, 'INDOOR', {
      ceiling:  { topColor: 0x0E0804, midColor: 0x160C06, botColor: 0x1E1008, h: 0.34 },
      wall:     { color: 0x1C0E06, h: 0.46 },
      windows:  { style: 'cafe', positions: [0.28, 0.72], w: 92, h: 68, yFrac: 0.20 },
      trim:     { color: 0x120804, alpha: 0.14, yFrac: 0.46 },
      wainscoting: { color: 0x0E0602, alpha: 0.65 },
      chairRail:   { enabled: false },
      floor:    { topColor: 0x180C04, botColor: 0x050200, startFrac: 0.46, featherH: 0.032, featherAlpha: 0.32 },
      colorGrade: { color: 0xFFAA44, alpha: 0.022, blend: 'OVERLAY' },
      vignette: { size: 110, color: 0x100504, alphaL: 0.78, alphaR: 0.78, alphaT: 0.55, alphaB: 0.78 },
      wallBoundRows: 3,
    });

    const cx = this.worldW / 2;
    const cy = this.worldH / 2;

    // ── FLOOR VARIATION — warm candlelit cafe boards ──────────────────────
    // Visual theme: aged hardwood cafe floor — narrow plank lines with amber
    // grain bands, scuff & wax-drip marks along the walking corridor, and
    // warm candlelight pool reflections under each table and lamp.
    //
    // Depth stack (above INDOOR floor base, below props 0+):
    //   -85: plank grid lines     -80: amber grain bands
    //   -75: scuff / wax noise    -20: candlelight pool reflections (ADD)
    //
    // Floor surface: wH * 0.46 = 235px.  Walking corridor: Y ≈ 288–360.
    // All values stay within the dark amber cafe palette.

    const wW     = this.worldW;
    const wH     = this.worldH;
    const floorY = Math.round(wH * 0.46);   // matches INDOOR startFrac: 0.46
    const floorBot = wH;

    // ── 1. Plank grid lines — aged hardwood board pattern ────────────────
    // Narrow horizontal planks (24px apart) + wider vertical grain lines
    // (48px apart). Very low alpha — barely visible, suggestive not literal.
    // Warm dark-amber colour stays within the candlelit palette.
    const tileGfx = this.add.graphics().setDepth(-85);
    tileGfx.lineStyle(0.4, 0x3A1C08, 0.06);
    for (let y = floorY; y < floorBot; y += 24) {
      tileGfx.lineBetween(0, y, wW, y);           // horizontal plank rows
    }
    for (let x = 0; x <= wW; x += 48) {
      tileGfx.lineBetween(x, floorY, x, floorBot); // vertical grain seams
    }

    // ── 2. Amber grain bands — breaks the uniform dark floor gradient ──────
    // Alternating warm amber and cool dark-brown micro-bands between plank rows.
    // Alpha is very low (0.04–0.05) — perceived as material variation, not geometry.
    const bandGfx = this.add.graphics().setDepth(-80);
    [
      { yf: floorY + 18,  h: 14, col: 0x2A1006, a: 0.05 },
      { yf: floorY + 58,  h: 12, col: 0x341408, a: 0.04 },
      { yf: floorY + 100, h: 16, col: 0x260E04, a: 0.05 },
      { yf: floorY + 146, h: 14, col: 0x301208, a: 0.04 },
      { yf: floorY + 192, h: 16, col: 0x241006, a: 0.05 },
    ].forEach(b => {
      bandGfx.fillStyle(b.col, b.a);
      bandGfx.fillRect(0, b.yf, wW, b.h);
    });

    // ── 3. Scuff / wax-drip noise — walking corridor wear ────────────────
    // Deterministic scatter in the main corridor (Y ≈ floorY+50 to floorY+120).
    // Slightly lighter dots = polished high-traffic spots catching candlelight.
    // Slightly darker blobs = old wax drips and foot scuffs.
    const scuffGfx = this.add.graphics().setDepth(-75);
    const corrY = floorY + 80;   // centre of walking corridor
    for (let i = 0; i < 55; i++) {
      const sx = ((i * 137 + 61) % (wW - 20)) + 10;
      const sy = corrY + ((i * 79 + 23) % 70) - 35;
      const sr = 0.4 + (i % 3) * 0.3;
      const warm = (i % 5) !== 0;
      scuffGfx.fillStyle(warm ? 0x4A2810 : 0x0E0602, warm ? 0.07 : 0.05);
      scuffGfx.fillCircle(sx, sy, sr);
    }
    // Elongated wax-drip streaks / chair leg drag marks
    [
      { x1: 0.18, x2: 0.24, y: corrY + 12  },
      { x1: 0.40, x2: 0.47, y: corrY - 8   },
      { x1: 0.58, x2: 0.65, y: corrY + 16  },
      { x1: 0.74, x2: 0.80, y: corrY + 4   },
    ].forEach(s => {
      scuffGfx.lineStyle(0.6, 0x100402, 0.08);
      scuffGfx.lineBetween(wW * s.x1, s.y, wW * s.x2, s.y);
    });

    // ── 4. Candlelight + lamp pool reflections ────────────────────────────
    // ADD-blend warm pools mirrored on the floor directly below each light
    // source: the two cafe windows (city glow), the hero table candle, the
    // entry lamp, the right-wall lamp, and the background table lamps.
    // Depth -20 sits above all ground layers but below props.
    if (this.textures.exists('light-blob')) {
      // Wide room-wash — very faint amber lift across the whole floor
      this.add.image(cx, floorY + 80, 'light-blob')
        .setScale(14, 2.4).setAlpha(0.04).setTint(0xFFAA44)
        .setBlendMode('ADD').setDepth(-20);

      // Hero table candle pool — brightest floor reflection, rose-gold
      this.add.image(this.grid(6.5, 0).x, floorY + 90, 'light-blob')
        .setScale(3.0, 1.6).setAlpha(0.11).setTint(0xFFCC88)
        .setBlendMode('ADD').setDepth(-20);

      // Entry floor lamp at col 1.0 — warm amber pool stretching right
      this.add.image(this.grid(1.0, 0).x + 10, floorY + 70, 'light-blob')
        .setScale(2.2, 1.2).setAlpha(0.09).setTint(0xFFAA55)
        .setAngle(-6).setBlendMode('ADD').setDepth(-20);

      // Right-wall floor lamp at col 10.5
      this.add.image(this.grid(10.5, 0).x - 10, floorY + 75, 'light-blob')
        .setScale(2.2, 1.2).setAlpha(0.08).setTint(0xFFAA55)
        .setAngle(6).setBlendMode('ADD').setDepth(-20);

      // Left bg table lamp at col 2.5 (pool is secondary — dimmed)
      this.add.image(this.grid(2.5, 0).x, floorY + 85, 'light-blob')
        .setScale(1.6, 1.0).setAlpha(0.05).setTint(0xFFBB66)
        .setBlendMode('ADD').setDepth(-20);

      // Right bg table lamp at col 9.2 — same dim treatment
      this.add.image(this.grid(9.2, 0).x, floorY + 88, 'light-blob')
        .setScale(1.6, 1.0).setAlpha(0.05).setTint(0xFFBB66)
        .setBlendMode('ADD').setDepth(-20);

      // Window glow spill — two cool amber rectangles below the window sills
      // Matches window positions [0.28, 0.72] from EnvironmentManager
      this.add.image(wW * 0.28, floorY + 30, 'light-blob')
        .setScale(1.8, 0.9).setAlpha(0.06).setTint(0xFFDD88)
        .setBlendMode('ADD').setDepth(-20);
      this.add.image(wW * 0.72, floorY + 30, 'light-blob')
        .setScale(1.8, 0.9).setAlpha(0.06).setTint(0xFFDD88)
        .setBlendMode('ADD').setDepth(-20);
    }

    // ── Three-layer hero table glow ───────────────────────────────
    if (this.textures.exists('light-blob')) {
      const heroPos = this.grid(6.5, 4.5);

      this._glowOuter = this.add.image(heroPos.x, heroPos.y + 8, 'light-blob')
        .setScale(6.0).setAlpha(0.10).setTint(0xFFBB66)
        .setBlendMode('ADD').setDepth(-9);
      this.tweens.add({
        targets:  this._glowOuter,
        alpha:    { from: 0.10, to: 0.04 },
        scale:    { from: 6.0,  to: 7.2 },
        duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      const glowMid = this.add.image(heroPos.x, heroPos.y + 8, 'light-blob')
        .setScale(3.2).setAlpha(0.22).setTint(0xFFCC88)
        .setBlendMode('ADD').setDepth(-8);
      this.tweens.add({
        targets:  glowMid,
        alpha:    { from: 0.22, to: 0.09 },
        scale:    { from: 3.2,  to: 3.8 },
        duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this._heroGlow = glowMid;

      this._glowInner = this.add.image(heroPos.x, heroPos.y + 2, 'light-blob')
        .setScale(1.4).setAlpha(0.36).setTint(0xFFEECC)
        .setBlendMode('ADD').setDepth(-7);
      this.tweens.add({
        targets:  this._glowInner,
        alpha:    { from: 0.36, to: 0.16 },
        scale:    { from: 1.4,  to: 1.7 },
        duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }


  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — deliberate cafe composition
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    // Back wall shelves removed — at this zoom and wall brightness the bookcase
    // silhouette reads as a floating object regardless of depth. The two cafe
    // windows already fill the wall band with visual interest.

    // ── FLOOR LAMPS — entry at row 4.0, right wall at row 4.2 ─────────────
    // Staggered rows prevent both lamps sitting on a single read-across line.
    // Right lamp at 4.2 also steps away from the bookcase above it (row 3.9).
    for (const [lc, dur] of [[10.5, 2400]]) {
      this.placeAt(lc, 4.2, 'k-lamp-floor', {
        scale:  0.64,
        shadow: { width: 14, height: 4, offsetY: 6, alpha: 0.14 },
      });
      if (this.textures.exists('light-blob')) {
        const lp = this.grid(lc, 4.2);
        this._rightLampPool = this.add.image(lp.x, lp.y + 26, 'light-blob')
          .setScale(2.6, 1.3).setAlpha(0.18).setTint(0xFFAA44)
          .setBlendMode('ADD').setDepth(-4);
        this.tweens.add({
          targets:  this._rightLampPool,
          alpha:    { from: 0.18, to: 0.06 },
          scale:    { from: 2.6,  to: 3.1 },
          duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
    }

    // ── ENTRY FLOOR LAMP — col 1.0, warms the doorway ─────────────
    this.placeAt(1.0, 4.0, 'k-lamp-floor', {
      scale:  0.68,
      shadow: { width: 14, height: 4, offsetY: 6, alpha: 0.14 },
    });
    if (this.textures.exists('light-blob')) {
      const ep   = this.grid(1.0, 4.0);
      this._entryLampPool = this.add.image(ep.x, ep.y + 28, 'light-blob')
        .setScale(2.4, 1.2).setAlpha(0.20).setTint(0xFFAA44)
        .setBlendMode('ADD').setDepth(-4);
      this.tweens.add({
        targets:  this._entryLampPool,
        alpha:    { from: 0.20, to: 0.07 },
        scale:    { from: 2.4,  to: 2.9 },
        duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── BACKGROUND SEATING — two dimmed tables, left and right ──────────
    // Left at row 4.6, right at row 5.0: deliberately different depths so
    // they don't align horizontally and give the room a sense of perspective.
    this._placeBgTable(2.5, 4.6);   // left side, proper floor zone
    this._placeBgTable(9.2, 5.0);   // right side, offset row — no same-depth line

    // ── HERO TABLE — bright focal point, rose-gold glow ───────────
    // placeInteractable creates the visual sprite AND registers the trigger.
    // Do NOT also call placeAt — that would create a duplicate sprite.
    this.placeInteractable(6.5, 4.5, 'k-table-round', {
      id:            'pizza_table',
      label:         'Our Table',
      triggerRadius: 60,
      glowRadius:    145,
      skipUnlockSFX: true,
      onTrigger:     () => this._onTableReached(),
    }, {
      scale:  0.72,
      shadow: { width: 28, height: 6, offsetY: 6, alpha: 0.22 },
    });

    // Round rug under the hero table — anchors the dining alcove to the floor
    // and breaks the plain floor surface. Depth-pinned below table Y.
    const rugPos = this.grid(6.5, 5.1);
    this.add.image(rugPos.x, rugPos.y, 'k-rug-round')
      .setScale(0.70).setTint(0x5A2A0C).setAlpha(0.48)
      .setDepth(rugPos.y - 4);

    // Chairs flanking the hero table — left clearly behind, right clearly in front.
    // Row gap of 0.6 from the table (4.5) ensures both chairs clear the table edge.
    this.placeAt(5.5, 5.1, 'k-chair', {
      scale:  0.64,
      shadow: { width: 14, height: 4, offsetY: 4, alpha: 0.16 },
    });
    this.placeAt(7.5, 5.0, 'k-chair', {
      scale:  0.64,
      shadow: { width: 14, height: 4, offsetY: 4, alpha: 0.16 },
    });

    // Table lamp sitting ON the hero table — depth-pinned so it renders
    // on the table surface rather than behind or in front of characters.
    if (this.textures.exists('k-lamp-table')) {
      const heroPos = this.grid(6.5, 4.5);
      const tableLamp = this.add.image(heroPos.x, heroPos.y - 14, 'k-lamp-table')
        .setScale(0.50)
        .setOrigin(0.5, 0.9)
        .setDepth(heroPos.y - 14);  // fixed depth — must NOT Y-sort with player
      this.lighting.applyPipeline(tableLamp);

      // Soft halo from the table lamp
      if (this.textures.exists('light-blob')) {
        const haloDepth = this.layers.depth('gameplay') + heroPos.y - 2;  // 2px behind lamp
        this._tableLampHalo = this.add.image(heroPos.x, heroPos.y - 10, 'light-blob')
          .setScale(1.0).setAlpha(0.30).setTint(0xFFDD99)
          .setBlendMode('ADD').setDepth(haloDepth);
        this.tweens.add({
          targets:  this._tableLampHalo,
          alpha:    { from: 0.30, to: 0.14 },
          scale:    { from: 1.0,  to: 1.3 },
          duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
    }

    // ── CORNER PLANTS — staggered rows (5.4 left, 5.0 right) ─────────────
    // Asymmetric Y positions break the horizontal band and give the near-floor
    // zone a sense of irregular organic placement.
    this.placeAt(0.8, 5.4, 'k-plant-pot', {
      scale:  0.46,
      shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.12 },
    });
    this.placeAt(11.2, 5.0, 'k-plant-pot', {
      scale:  0.46,
      shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.12 },
    });

    // ── LOWER CORRIDOR FILL — rows 5.5–6.0, previously empty floor zone ───
    // Small utility and deco props scattered across the near-floor corridor
    // break the blank stretch between corner plants (rows 5.0–5.4) and the
    // FG occlusion layer (row 7.6).  Warm tints stay in the candlelit palette.
    const lcA = this.placeAt(2.2, 5.6, 'k-plant-small-1', { scale: 0.46 });
    if (lcA) lcA.setTint(0x3A1A08);
    const lcB = this.placeAt(3.8, 5.9, 'k-plant-small-2', { scale: 0.44 });
    if (lcB) lcB.setTint(0x3A1A08);
    const lcC = this.placeAt(11.0, 5.5, 'k-trashcan', {
      scale:  0.44,
      shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (lcC) lcC.setTint(0x4A2A10).setAlpha(0.82);

    // ── FOREGROUND OCCLUSION — near-camera cafe dressing at depth 602 ────
    // Depth: foreground(2) = 602.  Player Y-sorts to ≈ 288 (row 4.5 × 64px).
    // 602 > 288 → player renders BEHIND these elements — correct for a scene
    // where near-camera furniture and plants should occlude the walking corridor,
    // creating true parallax depth.
    //
    // Five elements span the full width at rows 6.0–6.5:
    //   Large potted plants at both edges anchor the near-camera wall space.
    //   Two dimmed sofa backs suggest a lounge area close to the camera —
    //   the player visually passes behind them as they cross the room.
    //   An accent plant breaks the sofa-to-sofa span at centre.
    // originY < 1.0 crops each base organically into the frame edge.

    const fgDepth = this.layers.depth('foreground', 2);  // 602

    const fgItem = (col, row, key, sc, tint, originY = 0.88) => {
      if (!this.textures.exists(key)) return null;
      const pos = this.grid(col, row);
      return this.add.image(pos.x, pos.y, key)
        .setScale(sc).setOrigin(0.5, originY)
        .setTint(tint).setAlpha(0.86)
        .setDepth(fgDepth + (col > 6 ? 1 : 0));
    };

    // Left edge — large potted plant anchors near-camera left boundary
    fgItem(0.7,  6.0, 'k-plant-pot',     0.82, 0x251005, 0.86);
    // Centre-left — sofa back visible from behind, cafe lounge near camera
    fgItem(3.0,  6.3, 'k-sofa-design',   0.56, 0x2E1608, 0.80);
    // Zone mid — small accent plant breaks the sofa-to-sofa span
    fgItem(5.6,  6.1, 'k-plant-small-1', 0.54, 0x2A1008, 0.90);
    // Centre-right — second sofa, flipped inward; player passes between the pair
    const sofaR = fgItem(8.2, 6.4, 'k-sofa', 0.60, 0x2E1608, 0.82);
    if (sofaR) sofaR.setFlipX(true);
    // Right edge — potted plant mirrors left, closes the near-camera frame
    fgItem(11.3, 6.0, 'k-plant-pot',     0.80, 0x251005, 0.86);

    // Very-near-camera absolute frame anchors at depth 601 — fixed row 7.6,
    // crop tightly into the bottom edge to prevent the viewport reading as void.
    const fgPosL = this.grid(0.6, 7.6);
    const fgPosR = this.grid(11.4, 7.6);
    this.add.image(fgPosL.x, fgPosL.y, 'k-plant-pot')
      .setOrigin(0.5, 0.85).setScale(0.78).setTint(0x3A1A0A).setAlpha(0.90).setDepth(601);
    this.add.image(fgPosR.x, fgPosR.y, 'k-plant-pot')
      .setOrigin(0.5, 0.85).setScale(0.78).setTint(0x3A1A0A).setAlpha(0.90).setDepth(601).setFlipX(true);

    // ── EMOTE above hero table — draws eye even before player arrives
    const ep = this.grid(6.5, 3.5);
    this._addEmote(ep.x, ep.y, 'emote-heart', { scale: 0.28, depth: 30, delay: 0 });

    // ── MUSIC EMOTE — notes float near the far bookcase ──────────
    // Cafe has ambience; a music emote near the right wall suggests a
    // jukebox / background playlist and adds life to the room.
    const mp = this.grid(9.5, 2.8);
    this._addEmote(mp.x, mp.y, 'emote-music', { scale: 0.24, depth: 30, delay: 800 });
  }

  // ─────────────────────────────────────────────────────────────────
  //  Helper — place a dimmed secondary cafe table (decorative only)
  // ─────────────────────────────────────────────────────────────────
  _placeBgTable(col, row) {
    const DIM_TINT  = 0x7A5A42;
    const DIM_ALPHA = 0.34;  // reduced — clearly secondary, avoids visual competition

    const tbl = this.placeAt(col, row, 'k-table-round', {
      scale:  0.68,
      shadow: { width: 20, height: 5, offsetY: 5, alpha: 0.10 },
    });
    if (tbl) tbl.setTint(DIM_TINT).setAlpha(DIM_ALPHA);

    for (const dc of [-0.9, 0.9]) {
      const ch = this.placeAt(col + dc, row + 0.6, 'k-chair', {
        scale:  0.60,
        shadow: { width: 12, height: 3, offsetY: 3, alpha: 0.08 },
      });
      if (ch) ch.setTint(DIM_TINT).setAlpha(DIM_ALPHA);
    }

    // Dim table lamp on each secondary table — depth-pinned
    if (this.textures.exists('k-lamp-table')) {
      const pos  = this.grid(col, row);
      const lamp = this.add.image(pos.x, pos.y - 14, 'k-lamp-table')
        .setScale(0.44)
        .setOrigin(0.5, 0.9)
        .setAlpha(0.48)
        .setTint(DIM_TINT)
        .setDepth(pos.y - 14);  // fixed depth — must NOT Y-sort with player
      this.lighting.applyPipeline(lamp);
    }

    // Faint light pool under secondary table
    if (this.textures.exists('light-blob')) {
      const pos  = this.grid(col, row);
      const pool = this.add.image(pos.x, pos.y + 8, 'light-blob')
        .setScale(2.0).setAlpha(0.07).setTint(0xFFAA55)
        .setBlendMode('ADD').setDepth(-5);
      if (!this._bgTablePools) this._bgTablePools = [];
      this._bgTablePools.push(pool);
      this.tweens.add({
        targets:  pool,
        alpha:    { from: 0.07, to: 0.02 },
        scale:    { from: 2.0,  to: 2.4 },
        duration: 2800 + col * 50,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    // Player at cafe entrance — left edge, mid-height
    const start = this.grid(1.5, 4.5);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male-casual', displayW: 40, displayH: 62 },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.28, dynamic: true,
    });

    // Aashna — standing beside the hero table on the floor, wanders within radius 18
    const aPos = this.grid(7.8, 5.0);
    this._aashna = this.charSystem.createFemale(aPos.x, aPos.y, { texture: 'char-female-yellow' });
    this.shadows.add(this._aashna.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.25, dynamic: true,
    });
    this._aashna.wander(aPos.x, aPos.y, 18);
  }

  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    const W = this.worldW;
    const H = this.worldH;

    // Warm golden dust motes — sparse, drifting in lamplight
    if (this.textures.exists('particle-glow')) {
      this.add.particles(W / 2, H * 0.55, 'particle-glow', {
        x:         { min: -W * 0.40, max: W * 0.40 },
        speedY:    { min: -5, max: -1 },
        speedX:    { min: -3, max: 3  },
        scale:     { start: 0.07, end: 0 },
        alpha:     { start: 0.18, end: 0 },
        tint:      [0xFFCC88, 0xFFAA66, 0xFFDDAA],
        lifespan:  { min: 5000, max: 9000 },
        frequency: 450,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 50));
    }

    // Intro narration — matches ch8_intro in story.json
    this.time.delayedCall(2000, () => {
      if (!this.sys?.isActive()) return;
      const lines = storyData.dialogues?.ch8_intro;
      if (lines) this.dialogue?.start(lines);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION
  // ═══════════════════════════════════════════════════════════════════

  _onTableReached() {
    audioManager._playTextureEvent?.('soft-click');
    this.cam.zoomPulse(1.55, 1000);

    // Flash the hero glow then settle back into its idle pulse
    if (this._heroGlow) {
      this.tweens.killTweensOf(this._heroGlow);
      this.tweens.add({
        targets:  this._heroGlow,
        alpha:    0.60,
        scale:    4.8,
        duration: 500,
        yoyo:     true,
        ease:     'Quad.easeOut',
        onComplete: () => {
          if (!this.sys?.isActive()) return;
          this.tweens.add({
            targets:  this._heroGlow,
            alpha:    { from: 0.22, to: 0.09 },
            scale:    { from: 3.2,  to: 3.8 },
            duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        },
      });
    }

    const lines = storyData.dialogues?.ch7_pizza;
    if (lines) {
      this.dialogue?.start(lines, () => this._chapterComplete());
    }
  }

  _chapterComplete() {
    // Delay stinger 280ms — separates emotional payoff from transition whoosh
    this.time.delayedCall(280, () => {
      if (this.sys?.isActive()) audioManager.playStinger('connection');
    });
    this._guardTransition(() => {
      goToChapter(this, 7);
    });
  }

  onUpdate(_time, _delta) {
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);
  }

  onShutdown() {
    this.tweens.killTweensOf(this._glowOuter);
    this.tweens.killTweensOf(this._glowInner);
    this.tweens.killTweensOf(this._heroGlow);
    this.tweens.killTweensOf(this._rightLampPool);
    this.tweens.killTweensOf(this._entryLampPool);
    this.tweens.killTweensOf(this._tableLampHalo);
    this._bgTablePools?.forEach(p => this.tweens.killTweensOf(p));
    audioManager.fadeOutAll(600);
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
