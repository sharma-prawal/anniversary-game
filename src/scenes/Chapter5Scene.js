import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter6Scene — "Starting Over"
 *
 * Cool fluorescent office interior — a real floor plan, not scattered props.
 * Three deliberate zones guide the player LEFT → CENTER → RIGHT.
 *
 * Spatial logic (12 cols × 8 rows, cell 64px = 768 × 512):
 *
 *   ZONE 1 — ENTRY (cols 0.8–3.5): player starts here; floor lamp + his desk unit
 *   ZONE 2 — MID (cols 4.5–6.5): colleague desk + plant visual break
 *   ZONE 3 — AASHNA (cols 7.5–10.5): her glowing workstation — the focal point
 *
 *   Back wall (row 2.0): continuous bookcases/library props across all 12 cols
 *   Walking corridor: rows 4.5–5.5 (clear path, no obstacles)
 *
 *   At zoom 1.72 the camera shows x 0–558. Player at col 1.5 (x=128),
 *   Aashna's desk at col 8.0 (x=544) is just visible — a warm blue glow at
 *   the edge of the first frame telling the player where to go.
 *
 *   Visual hierarchy:
 *     PRIMARY    — Aashna's desk (brightest glow, largest scale)
 *     SECONDARY  — two background desk units (readable, no glow)
 *     TERTIARY   — floor lamp, plant pot, back-wall bookcases
 */
export class Chapter5Scene extends ChapterScene {
  constructor() {
    super('Chapter5', {
      cols:       12,
      rows:       8,
      mood:       'office',
      zoom:       1.72,
      targetZoom: 1.80,
      followLerp: 0.055,
      drift:      false,
      fadeInMs:   1400,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — cool office interior + fluorescent overhead glow + vignette
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // ── Environment preset — cool fluorescent office interior ──────
    this.env = EnvironmentManager.apply(this, 'INDOOR', {
      ceiling:  { topColor: 0x06080E, midColor: 0x0A0F18, botColor: 0x0C1420, h: 0.44 },
      wall:     { color: 0x0C1420, h: 0.46 },
      windows:  { style: 'office', positions: [0.26, 0.74], w: 96, h: 74, yFrac: 0.24 },
      trim:     { color: 0x1A2230, alpha: 0.10, yFrac: 0.50 },
      wainscoting: { color: 0x0A1018, alpha: 0.50 },
      chairRail:   { enabled: false },
      floor:    { topColor: 0x0A0E16, botColor: 0x040608, startFrac: 0.50, featherH: 0.030, featherAlpha: 0.30 },
      colorGrade: { color: 0x4488CC, alpha: 0.015, blend: 'OVERLAY' },
      vignette: { size: 90, color: 0x000408, alphaL: 0.70, alphaR: 0.70, alphaT: 0.70, alphaB: 0.70 },
      wallBoundRows: 3,
    });

    // Camera offset — tilt view upward so furniture zone is centred, less
    // empty floor visible below the player's walking corridor.
    this.cam.configure({ baseOffsetY: -60 });

    const wW = this.worldW;
    const wH = this.worldH;

    // ── FAR PARALLAX — city skyline through office windows ─────────────
    // scrollFactor 0.05 = distant horizon. Deep navy silhouettes sit behind
    // the window openings, adding the layered-world depth of Alto's Adventure.
    [
      { xf: 0.06, key: 'bgr-house1',    sx: 0.76, sy: 1.30 },
      { xf: 0.18, key: 'bgr-house2',    sx: 0.88, sy: 1.50 },
      { xf: 0.28, key: 'bgr-house-sm1', sx: 0.62, sy: 1.10 },
      { xf: 0.40, key: 'bgr-house1',    sx: 0.92, sy: 1.40 },
      { xf: 0.54, key: 'bgr-house-sm2', sx: 0.66, sy: 1.15 },
      { xf: 0.66, key: 'bgr-house2',    sx: 0.84, sy: 1.45 },
      { xf: 0.78, key: 'bgr-house-sm1', sx: 0.70, sy: 1.20 },
      { xf: 0.92, key: 'bgr-house1',    sx: 0.80, sy: 1.35 },
    ].forEach(d => {
      if (!this.textures.exists(d.key)) return;
      this.add.image(wW * d.xf, wH * 0.50, d.key)
        .setScrollFactor(0.05).setScale(d.sx, d.sy).setOrigin(0.5, 1.0)
        .setAlpha(0.22).setTint(0x04081A).setDepth(12);  // above wall (-85), below window frame (16) → visible through glass
    });

    // ── MORNING LIGHT SHAFTS — light-blob columns falling from the windows ──
    // Two angled pale cool columns. Using light-blob (same asset vocabulary as
    // the rest of the scene) at a visible alpha instead of the imperceptible
    // Graphics fill (was 0.028 — below human perception threshold).
    if (this.textures.exists('light-blob')) {
      this.add.image(wW * 0.26 + 28, wH * 0.53, 'light-blob')
        .setScale(0.9, 7).setAlpha(0.10).setTint(0x88BBFF)
        .setAngle(8).setBlendMode('ADD').setDepth(-8);
      this.add.image(wW * 0.74 + 28, wH * 0.53, 'light-blob')
        .setScale(0.9, 7).setAlpha(0.10).setTint(0x88BBFF)
        .setAngle(8).setBlendMode('ADD').setDepth(-8);
    }

    if (this.textures.exists('light-blob')) {
      // Overhead fluorescent wash — wide cool white, simulates ceiling lights
      this.add.image(wW / 2, wH * 0.48, 'light-blob')
        .setScale(16, 4)
        .setAlpha(0.07)
        .setTint(0xCCDDFF)
        .setBlendMode('ADD')
        .setDepth(-10);

      // Aashna's desk destination glow — blue-white beacon, visible from entry
      const aPos = this.grid(8.0, 5.0);
      this._destGlow = this.add.image(aPos.x, aPos.y + 5, 'light-blob')  // H3: stored for onShutdown cleanup
        .setScale(4.8, 3.0)
        .setAlpha(0.16)
        .setTint(0xAABBFF)
        .setBlendMode('ADD')
        .setDepth(-9);
      this.tweens.add({
        targets:  this._destGlow,
        alpha:    { from: 0.16, to: 0.06 },
        scale:    { from: 4.8,  to: 5.8  },
        duration: 2200,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });

      // Warm floor pool beneath Aashna's zone — floor glows near her desk
      this.add.image(aPos.x, aPos.y + 30, 'light-blob')
        .setScale(6.5, 0.45).setAlpha(0.08).setTint(0xAABBFF)
        .setBlendMode('ADD').setDepth(-2);
    }

    // ── FLOOR VARIATION — office linoleum texture ─────────────────────────
    // Visual theme: cool fluorescent office floor — pale linoleum with a subtle
    // tile grid, scuff marks along the main walking corridor, and bright
    // ceiling-reflection columns matching the two light shafts above.
    //
    // Depth stack (above floor base -190, below props 0+):
    //   -85: tile grid lines      -80: tint variation bands
    //   -75: scuff/wear noise     -20: fluorescent floor reflections (ADD)
    //
    // Floor surface: wH * 0.50 = 256. Walking corridor: Y ≈ 320–400.
    // All layers use world coordinates and match the scene's cool blue palette.

    const floorY  = Math.round(wH * 0.50);   // floor surface — matches INDOOR startFrac
    const floorBot = wH;

    // ── 1. Tile grid lines — subtle office floor tile pattern ────────────
    // 64px grid (matches cellSize) — very low alpha, barely perceptible.
    // Horizontal lines read as tile rows; vertical lines as columns.
    // Color sits just above the floor base (0x0A0E16) — cool steel-blue.
    const tileGfx = this.add.graphics().setDepth(-85);
    tileGfx.lineStyle(0.4, 0x1A2840, 0.06);
    // Horizontal tile lines
    for (let y = floorY; y < floorBot; y += 64) {
      tileGfx.lineBetween(0, y, wW, y);
    }
    // Vertical tile lines
    for (let x = 0; x <= wW; x += 64) {
      tileGfx.lineBetween(x, floorY, x, floorBot);
    }

    // ── 2. Tint variation bands — breaks uniform dark floor gradient ──────
    // Very subtle cool-to-warm tint shifts between tile rows.
    // Stays within the office palette: blue-black → slate → near-black.
    const bandGfx = this.add.graphics().setDepth(-80);
    [
      { yf: floorY + 16,  h: 18, col: 0x0C1420, a: 0.05 },
      { yf: floorY + 62,  h: 14, col: 0x101828, a: 0.04 },
      { yf: floorY + 108, h: 20, col: 0x0A1018, a: 0.05 },
      { yf: floorY + 158, h: 16, col: 0x0E1622, a: 0.04 },
      { yf: floorY + 208, h: 18, col: 0x0C1218, a: 0.05 },
    ].forEach(b => {
      bandGfx.fillStyle(b.col, b.a);
      bandGfx.fillRect(0, b.yf, wW, b.h);
    });

    // ── 3. Scuff / wear noise — walking corridor wear pattern ────────────
    // Deterministic scatter on the main corridor (Y ≈ floorY+60 to floorY+140).
    // Slightly brighter dots = polished/worn floor catching the overhead light.
    // Slightly darker smears = scuff marks from chair movement.
    const scuffGfx = this.add.graphics().setDepth(-75);
    const corrY = floorY + 64;  // centre of walking corridor
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 139 + 53) % (wW - 20)) + 10;
      const sy = corrY + ((i * 71 + 19) % 80) - 40;
      const sr = 0.4 + (i % 3) * 0.25;
      // Alternating bright (worn shine) and dark (scuff) marks
      const bright = (i % 4) !== 0;
      scuffGfx.fillStyle(bright ? 0x2A3A50 : 0x060810, bright ? 0.06 : 0.05);
      scuffGfx.fillCircle(sx, sy, sr);
    }
    // A few elongated scuff streaks — chair drag marks
    [
      { x1: 0.22, x2: 0.28, y: corrY + 10 },
      { x1: 0.44, x2: 0.52, y: corrY - 6  },
      { x1: 0.60, x2: 0.67, y: corrY + 14 },
      { x1: 0.76, x2: 0.82, y: corrY + 4  },
    ].forEach(s => {
      scuffGfx.lineStyle(0.6, 0x080C12, 0.08);
      scuffGfx.lineBetween(wW * s.x1, s.y, wW * s.x2, s.y);
    });

    // ── 4. Fluorescent floor reflections — ceiling light mirrored below ──
    // ADD-blend elongated pools directly below the two window light shafts
    // and one wide central wash. Matches the light shaft tint (0x88BBFF)
    // and the overhead fluorescent wash (0xCCDDFF).
    // Depth -20 places these above all ground layers but below props.
    if (this.textures.exists('light-blob')) {
      // Left shaft reflection — matches shaft at wW * 0.26
      this.add.image(wW * 0.26 + 12, floorY + 40, 'light-blob')
        .setScale(0.70, 2.8).setAlpha(0.07).setTint(0x88BBFF)
        .setAngle(4).setBlendMode('ADD').setDepth(-20);
      // Right shaft reflection — matches shaft at wW * 0.74
      this.add.image(wW * 0.74 + 12, floorY + 40, 'light-blob')
        .setScale(0.70, 2.8).setAlpha(0.07).setTint(0x88BBFF)
        .setAngle(4).setBlendMode('ADD').setDepth(-20);
      // Wide central fluorescent wash reflection
      this.add.image(wW / 2, floorY + 60, 'light-blob')
        .setScale(14, 1.8).setAlpha(0.05).setTint(0xCCDDFF)
        .setBlendMode('ADD').setDepth(-20);
      // Warm lamp pool reflection — matches Zone 1 floor lamp at col 1.0
      this.add.image(this.grid(1.0, 0).x, floorY + 50, 'light-blob')
        .setScale(1.4, 1.2).setAlpha(0.06).setTint(0xFFDD88)
        .setBlendMode('ADD').setDepth(-20);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — three deliberate zones, all scaled to Ch1 ratios
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    const cs = this._cfg.cellSize;  // 64

    // ── BACK WALL — bookcases pinned to the wall, clearly background ──────
    // Row 3.0 = hugging the wall behind all desk props.
    // Use k-bookcase (open, has visible book spines) at all three positions.
    // Staggered rows — break the rigid same-depth wall band
    const bc1 = this.placeAt(1.5,  3.2, 'k-bookcase', { scale: 0.50, ySort: false });
    const bc2 = this.placeAt(6.0,  3.7, 'k-bookcase', { scale: 0.52, ySort: false });
    const bc3 = this.placeAt(10.5, 3.4, 'k-bookcase', { scale: 0.50, ySort: false });
    // depth -20: midground band, in front of wall (-80) but behind all gameplay objects (0+)
    const bcDepth = this.layers.depth('midground', 79);
    if (bc1) bc1.setDepth(bcDepth);
    if (bc2) bc2.setDepth(bcDepth);
    if (bc3) bc3.setDepth(bcDepth);

    // Left entry accent plant — small, behind the lamp zone, not in the corridor
    this.placeAt(0.6, 5.3, 'k-plant-small-2', {
      scale:  0.38,
      shadow: { width: 8, height: 2, offsetY: 3, alpha: 0.08 },
    });
    // Zone 2/3 divider plant — pushed to row 4.4 (behind desk line) so it reads
    // as background wall dressing rather than a corridor obstacle.
    // Tinted to match the cool office palette — prevents saturated green standing out.
    const divPlant = this.placeAt(6.6, 4.4, 'k-plant-pot', { scale: 0.40, ySort: false });
    if (divPlant) divPlant.setDepth(this.layers.depth('midground', 79)).setTint(0x1A2E44).setAlpha(0.80);

    // ── ZONE 1: ENTRY (cols 0.8–3.5) ────────────────────────────
    // Floor lamp — warm amber welcome light just inside the door.
    // Row 5.2 = floor foreground, same level as player & chairs.
    this.placeAt(1.0, 5.2, 'k-lamp-floor', {
      scale:  0.68,
      shadow: { width: 16, height: 5, offsetY: 6, alpha: 0.14 },
    });
    const lampPos = this.grid(1.0, 5.2);
    this._lampHalo = this.add.image(lampPos.x + 6, lampPos.y - 24, 'light-blob')  // H2: stored for onShutdown cleanup
      .setScale(1.6).setAlpha(0.38).setTint(0xFFDD88)
      .setBlendMode('ADD').setDepth(14);
    this.tweens.add({
      targets:  this._lampHalo,
      alpha:    { from: 0.38, to: 0.18 },
      scale:    { from: 1.60, to: 2.00 },
      duration: 2000,
      yoyo:     true,
      repeat:   -1,
      ease: 'Sine.easeInOut',
    });

    // His desk — row 4.4 = sits on the visible floor, back-wall side.
    // Chair — row 5.0 = floor foreground (lower on screen = closer to viewer).
    const d1Row   = 5.0;  // on the floor plane — grounded near character depth
    const d1Chair = 5.4;
    const d1Depth = d1Row * cs + cs / 2 + 5;

    this.placeAt(2.8, d1Row, 'k-desk', {
      scale:  0.72,
      shadow: { width: 32, height: 7, offsetY: 7, alpha: 0.14 },
    });
    const c1 = this.placeAt(2.8, d1Row - 0.5, 'k-computer', {
      scale:  0.58,
      ySort:  false,
      shadow: { width: 12, height: 4, offsetY: 4, alpha: 0.10 },
    });
    if (c1) c1.setDepth(d1Depth);

    this.placeAt(2.8, d1Chair, 'k-chair-desk', {
      scale:  0.64,
      shadow: { width: 16, height: 5, offsetY: 5, alpha: 0.12 },
    });
    // Trashcan tucked beside the desk — grounded office detail
    const tc1 = this.placeAt(2.0, 5.6, 'k-trashcan', { scale: 0.48 });
    if (tc1) tc1.setTint(0x889988).setAlpha(0.80);

    // ── ZONE 2: CORRIDOR MID (cols 4.5–6.5) ──────────────────────
    // Colleague desk — row 4.4 (grounded on floor), chair row 5.1
    const d2Row   = 5.2;  // slightly closer than his desk — breaks three-way alignment
    const d2Chair = 5.5;
    const d2Depth = d2Row * cs + cs / 2 + 5;

    this.placeAt(5.0, d2Row, 'k-desk', {
      scale:  0.68,
      shadow: { width: 30, height: 7, offsetY: 7, alpha: 0.12 },
    });
    const c2 = this.placeAt(5.0, d2Row - 0.5, 'k-computer', {
      scale:  0.54,
      ySort:  false,
      shadow: { width: 10, height: 3, offsetY: 3, alpha: 0.08 },
    });
    if (c2) c2.setDepth(d2Depth);

    this.placeAt(5.0, d2Chair, 'k-chair-desk', {
      scale:  0.60,
      shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    // Trashcan beside colleague's desk — floor-level detail, lower half
    const tc2 = this.placeAt(4.2, 5.5, 'k-trashcan', { scale: 0.44 });
    if (tc2) tc2.setTint(0x778899).setAlpha(0.75);

    // ── ZONE 3: AASHNA'S WORKSTATION (cols 7.5–10.5) — PRIMARY ──
    // Aashna's zone — desk row 4.4 (grounded on floor), chair row 5.2 (foreground).
    const adRow   = 4.9;  // Aashna reference depth — other desks offset from this
    const adChair = 5.3;  // lower = closer to viewer, frames her more prominently
    const adDepth = adRow * cs + cs / 2 + 5;

    // Three-layer glow — blue-white, the emotional focal point of the scene
    const aPos = this.grid(8.0, adRow);

    this._ag1 = this.add.image(aPos.x, aPos.y + 8, 'light-blob')  // H1: stored for kill on trigger + onShutdown
      .setScale(5.0).setAlpha(0.10).setTint(0x6699FF).setBlendMode('ADD').setDepth(-5);
    this._ag2 = this.add.image(aPos.x, aPos.y + 8, 'light-blob')
      .setScale(2.8).setAlpha(0.22).setTint(0x99BBFF).setBlendMode('ADD').setDepth(-4);
    this._ag3 = this.add.image(aPos.x, aPos.y + 8, 'light-blob')  // H1: stored for kill on trigger + onShutdown
      .setScale(1.2).setAlpha(0.36).setTint(0xCCDDFF).setBlendMode('ADD').setDepth(-3);
    this._taskGlow = this._ag2;

    for (const { t, dur, sLo, sHi, aLo, aHi } of [
      { t: this._ag1, dur: 2600, sLo: 4.6, sHi: 5.6, aLo: 0.08, aHi: 0.12 },
      { t: this._ag2, dur: 2000, sLo: 2.5, sHi: 3.2, aLo: 0.18, aHi: 0.28 },
      { t: this._ag3, dur: 1600, sLo: 1.1, sHi: 1.4, aLo: 0.30, aHi: 0.42 },
    ]) {
      this.tweens.add({
        targets:  t,
        scale:    { from: sLo, to: sHi },
        alpha:    { from: aLo, to: aHi },
        duration: dur,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    }

    // Desk (primary — slightly larger than background desks)
    this.placeAt(8.0, adRow, 'k-desk', {
      scale:  0.76,
      shadow: { width: 36, height: 8, offsetY: 7, alpha: 0.16 },
    });

    // Laptop on her desk — cool screen tint + concentrated screen glow beacon
    const laptopImg = this.placeInteractable(8.0, adRow - 0.5, 'k-laptop', {
      id:            'help_task',
      label:         'Help Her Out',
      triggerRadius: 60,
      glowRadius:    140,
      onTrigger:     () => this._onHelpTask(),
    }, { scale: 0.62, ySort: false });
    if (laptopImg) {
      laptopImg.setDepth(adDepth);  // must sit ON the desk surface (depth > desk Y-sort ~346)
      laptopImg.setTint(0xAADDFF);
      if (this.textures.exists('light-blob')) {
        const lpPos = this.grid(8.0, adRow - 0.5);
        this.add.image(lpPos.x, lpPos.y - 8, 'light-blob')
          .setScale(0.8).setAlpha(0.45).setTint(0x88BBFF)
          .setBlendMode('ADD').setDepth(50);
      }
    }

    // Chair beside her desk — floor level, in front of the desk
    this.placeAt(9.0, adChair, 'k-chair-desk', {
      scale:  0.68,
      shadow: { width: 18, height: 5, offsetY: 5, alpha: 0.14 },
    });
    // Small plant beside Aashna's chair — anchors her zone at floor level
    this.placeAt(9.6, 5.7, 'k-plant-small-2', {
      scale:  0.44,
      shadow: { width: 10, height: 3, offsetY: 3, alpha: 0.08 },
    });

    // ── FOREGROUND OCCLUSION — near-camera office furniture ───────────────
    // Depth: gameplay(5) = 5 — player Y-sorts to depth ≈ 371 (row 5.3 × 64px),
    // so player always renders IN FRONT of these near-camera dressing elements.
    // The low depth still places them behind desks/chairs (depth ≈ 350+), so
    // the layering reads: background wall → foreground dressing → desks → player.

    const fgDepth = this.layers.depth('gameplay', 5);  // 5 — player (≈371) renders in front

    const fgItem = (col, row, key, sc, tint, alpha = 0.60) => {
      if (!this.textures.exists(key)) return;
      const pos = this.grid(col, row);
      this.add.image(pos.x, pos.y, key)
        .setScale(sc).setOrigin(0.5, 1.0)
        .setTint(tint).setAlpha(alpha)
        .setDepth(fgDepth);
    };

    // Left boundary — wide bookcase, mostly cropped, suggests room wall edge
    fgItem( 0.4, 6.9, 'k-bookcase-wide',   0.72, 0x1A2E44);
    // Zone 1 — large plant beside the lamp zone, frames the entry corridor
    fgItem( 2.0, 6.7, 'k-plant-pot',        0.68, 0x223050);
    // Zone 1/2 boundary — round table corner peeking in from the near edge
    fgItem( 3.8, 6.6, 'k-table-round',      0.60, 0x1C2A40);
    // Zone 2 — closed bookcase creates a visual zone divider
    fgItem( 5.9, 6.8, 'k-bookcase-closed',  0.64, 0x182438);
    // Zone 2/3 transition — small plant, slightly different depth for rhythm
    fgItem( 7.5, 6.7, 'k-plant-small-2',    0.70, 0x243650);
    // Zone 3 — large plant anchors Aashna's zone at the near edge
    fgItem( 9.3, 6.6, 'k-plant-pot',        0.72, 0x1E2E48);
    // Right boundary — mirrors left bookcase, closes the office frame
    fgItem(11.3, 6.9, 'k-bookcase-closed',  0.68, 0x1A2E44);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS — player at entry, Aashna beside her desk
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    const start = this.grid(1.5, 5.3);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male-casual', displayW: 40, displayH: 62 },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.28, dynamic: true,
    });

    // Zone 2 colleague — col 4.5 (beside desk), row 5.4 (in front of chair at 5.3)
    const col2Pos = this.grid(4.5, 5.4);
    const col2NPC = this.charSystem.createFemale(col2Pos.x, col2Pos.y, {
      texture: 'char-female-green',
    });
    this.shadows.add(col2NPC.sprite, {
      width: 18, height: 5, offsetY: 10, alpha: 0.20, dynamic: false,
    });
    col2NPC.wander(col2Pos.x, col2Pos.y, 0);

    // Aashna — col 9.8 (beside chair), row 5.5 (in front of chair at 5.4)
    const aPos = this.grid(9.8, 5.5);
    this._aashna = this.charSystem.createFemale(aPos.x, aPos.y);
    this.shadows.add(this._aashna.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.25, dynamic: true,
    });
    this._aashna.wander(aPos.x, aPos.y, 0);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FX — cool office motes + intro dialogue
  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    const W = this.worldW;
    const H = this.worldH;

    // Subtle cool dust motes drifting — fluorescent office air
    if (this.textures.exists('particle-glow')) {
      this.add.particles(W / 2, H / 2, 'particle-glow', {
        x:         { min: -W / 2, max: W / 2 },
        y:         { min: -H / 2, max: H / 2 },
        speedY:    { min: -4, max: 4 },
        speedX:    { min: -4, max: 4 },
        scale:     { start: 0.07, end: 0 },
        alpha:     { start: 0.18, end: 0 },
        tint:      [0xCCDDFF, 0xEEEEFF, 0xAABBDD],
        lifespan:  { min: 4000, max: 7000 },
        frequency: 550,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 50));
    }

    // Intro narration
    this.time.delayedCall(2000, () => {
      if (!this.sys?.isActive()) return;  // H4: guard against torn-down scene
      const lines = storyData.dialogues?.ch6_intro;
      if (lines) this.dialogue?.start(lines);
    });

    // Heart emote above Aashna's workstation — appears after scene settles
    this.time.delayedCall(2400, () => {
      if (!this.sys?.isActive()) return;  // H4: guard
      const ep = this.grid(9.2, 4.4);
      this._addEmote(ep.x, ep.y, 'emote-heart', { scale: 0.32 });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION — helping at Aashna's workstation
  // ═══════════════════════════════════════════════════════════════════

  _onHelpTask() {
    this.cam.zoomPulse(1.50, 800);

    // Soft-click confirms the laptop trigger before dialogue renders —
    // closes the audio-visual gap between touching the interaction and hearing anything.
    audioManager._playTextureEvent?.('soft-click');

    // Bloom then settle back to pulsing
    if (this._taskGlow) {
      this.tweens.killTweensOf(this._ag1);  // M3: kill all three so no idle pulse fights the burst
      this.tweens.killTweensOf(this._ag2);
      this.tweens.killTweensOf(this._ag3);  // M3
      this.tweens.add({
        targets:    this._taskGlow,
        alpha:      0.55,
        scale:      4.5,
        duration:   400,
        yoyo:       true,
        ease:       'Quad.easeOut',
        onComplete: () => {
          if (!this.sys?.isActive()) return;  // H5: scene may be destroyed during 400ms yoyo
          this.tweens.add({
            targets:  this._taskGlow,
            scale:    { from: 2.5, to: 3.2 },
            alpha:    { from: 0.18, to: 0.28 },
            duration: 2000,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut',
          });
        },
      });
    }

    const lines = storyData.dialogues?.ch6_help;
    if (lines) {
      this.dialogue.start(lines, () => this._chapterComplete());
    } else {
      this._chapterComplete();
    }
  }

  _chapterComplete() {
    // 'tenderness' is the correct stinger for this quiet workplace reconnection moment:
    // side by side at screens, helping without being asked = the start of something soft.
    // 'reunion' was Ch4's outdoor face-to-face payoff — re-firing it here dilutes that.
    // 280ms delay: lets the zoom-pulse camera jolt settle before the stinger arrives.
    this.time.delayedCall(280, () => {  // H4: guard — scene may be destroyed before 280ms fires
      if (this.sys?.isActive()) audioManager.playStinger('tenderness');
    });
    this._guardTransition(() => {
      goToChapter(this, 5);
    });
  }

  onUpdate(_time, _delta) {
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);  // M1: pass sprite for env tracking consistency
  }

  onShutdown() {
    audioManager.fadeOutAll(600);  // prevent hard cut when transitioning to Ch6
    // H1: kill all three glow tweens (ag1 + ag3 were anonymous locals, now stored fields)
    this.tweens.killTweensOf(this._ag1);
    this.tweens.killTweensOf(this._ag2);
    this.tweens.killTweensOf(this._ag3);
    // H2: kill lampHalo repeat:-1 tween
    this.tweens.killTweensOf(this._lampHalo);
    // H3: kill destGlow repeat:-1 tween
    this.tweens.killTweensOf(this._destGlow);
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}