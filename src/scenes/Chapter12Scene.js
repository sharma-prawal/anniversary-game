import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter12Scene — "Two Families, One Story"
 *
 * Warm honey living room. Both families fill the space with their
 * presence. Four letters — one per person — are hidden around the
 * room. Find all four to hear the story of the day they met.
 *
 * Spatial logic (12 cols × 8 rows, cell 64px = 768 × 512):
 *
 *   BACK WALL (row 2.0): lib bookcases — warm home interior
 *   ZONE 1  (cols 1–3): entry sofa + floor lamp — Mom's corner
 *   ZONE 2  (cols 4–6): sofa + coffee table     — Dad's spot
 *   ZONE 3  (cols 6–8): round table + surface lamp — Sister's note
 *   ZONE 4  (cols 9–11): long sofa + floor lamp  — Together
 *
 *   4 letters evenly at: col 2.5 / 5.0 / 7.5 / 10.0
 *   Aashna wanders (8.0, 4.5) radius 20 — part of the family room.
 *
 *   CINEMATIC: letterbox + slowPan left→right across the full room
 *   before releasing control. Previews all four letters in one sweep.
 *
 *   Physics top y=192 (row 3) — back wall row 2 safely unreachable.
 *   Zoom 1.72→1.80: viewport = 558px. Player at col 1.5 sees letters 1–2
 *   on first frame; letters 3–4 revealed during pan or short walk.
 */
export class Chapter12Scene extends ChapterScene {
  constructor() {
    super('Chapter12', {
      cols:       12,
      rows:       8,
      mood:       'romantic',
      zoom:       1.72,
      targetZoom: 1.80,
      followLerp: 0.055,
      drift:      false,
      fadeInMs:   2000,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — honey-warm home interior
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // ── INDOOR — honey-amber evening: two families around one fire ─
    // Colour philosophy: warm low-temperature amber with a soft blue-indigo
    // bleed through the windows suggesting night outside. The centre of the
    // room is the warmest point — where the families actually met.
    this.env = EnvironmentManager.apply(this, 'INDOOR', {
      ceiling:    { topColor: 0x180C08, midColor: 0x2C1812, botColor: 0x401E14 },
      wall:       { color: 0x2A1408, tint: 0xCC7733, alpha: 0.88 },
      // 'cafe' style: warm dark-brown glass + amber blob inside.
      // 'home' style has a cold 0x3377AA blob — jarring against honey-amber.
      windows:    { style: 'cafe', positions: [0.25, 0.75] },
      // texture:null so we add our own world-space tileSprite at 0.38 alpha
      // (vs the hardcoded 0.82 that causes visible banding at zoom 1.72).
      floor:      { topColor: 0x321A0C, botColor: 0x080402, texture: null },
      vignette:   { size: 110, color: 0x140A04, alphaL: 0.72, alphaR: 0.72, alphaT: 0.44, alphaB: 0.68 },
      colorGrade: { color: 0xFF9933, alpha: 0.048, blend: 'OVERLAY' },
    });

    const W  = this.worldW;
    const H  = this.worldH;
    const cs = this.cellSize ?? 64;

    // ── FLOOR TEXTURE — world-space, depth -59 ───────────────────
    // Re-add k-floor as a world-space tileSprite at 0.38 alpha (IndoorEnvironment
    // hardcodes 0.82, which produces prominent ~14px stripes at zoom 1.72).
    if (this.textures.exists('k-floor')) {
      this.add.tileSprite(0, 3.0 * cs, W, H - 3.0 * cs, 'k-floor')
        .setOrigin(0, 0).setTint(0x321A0C).setAlpha(0.38).setDepth(-59);
    }

    // ── FLOOR VARIATION BANDS — world-space, depth -58 ────────────
    // Break the flat single-tint floor: near-wall shadow, mid-room warmth,
    // far-from-lamp darkening. Normal blend, small alpha = no neon.
    const gfxFloor = this.add.graphics().setDepth(-58);
    gfxFloor.fillStyle(0x080200, 0.25);   // near-wall overhead shadow
    gfxFloor.fillRect(0, 3.0 * cs, W, cs * 0.8);
    gfxFloor.fillStyle(0xCC7733, 0.08);   // mid-room honey warmth
    gfxFloor.fillRect(0, 4.5 * cs, W, cs * 1.0);
    gfxFloor.fillStyle(0x040100, 0.18);   // far-from-lamp darkening
    gfxFloor.fillRect(0, 6.5 * cs, W, cs * 1.5);

    // ── LATERAL EDGE SHADOWS — world-space, depth -56 ───────────
    const gfxEdge = this.add.graphics().setDepth(-56);
    gfxEdge.fillStyle(0x040100, 0.28);
    gfxEdge.fillRect(0,           3.0 * cs, cs * 1.2, H - 3.0 * cs);
    gfxEdge.fillStyle(0x040100, 0.28);
    gfxEdge.fillRect(W - cs * 1.2, 3.0 * cs, cs * 1.2, H - 3.0 * cs);

    // ── WINDOW FLOOR PATCHES — world-space, depth -54, ADD ─────
    // Where the window shafts (fractions 0.25 / 0.75) land on the floor.
    if (this.textures.exists('light-blob')) {
      this.add.image(W * 0.25, 4.6 * cs, 'light-blob')
        .setScale(3.2, 0.42).setAlpha(0.11).setTint(0xFFEEAA)
        .setBlendMode('ADD').setDepth(-54);
      this.add.image(W * 0.75, 4.6 * cs, 'light-blob')
        .setScale(3.2, 0.42).setAlpha(0.10).setTint(0xFFEEAA)
        .setBlendMode('ADD').setDepth(-54);
    }

    // ── LAMP FLOOR PUDDLES — world-space, depth -53, ADD ──────
    // Flat light-blob ellipses directly beneath each lamp — same tint as
    // each lamp's halo so they read as the same source pooling on the floor.
    if (this.textures.exists('light-blob')) {
      const _puddles = [
        { c:  1.0, r: 5.0, tint: 0xFFBB66, sx: 3.8, sy: 0.52 },  // Zone 1 floor lamp
        { c: 10.8, r: 5.0, tint: 0xFFAA44, sx: 4.0, sy: 0.55 },  // Zone 4 floor lamp
        { c:  6.8, r: 4.9, tint: 0xFFCC77, sx: 2.8, sy: 0.38 },  // Zone 3 table lamp
      ];
      for (const lp of _puddles) {
        const lpos = this.grid(lp.c, lp.r);
        this.add.image(lpos.x, lpos.y, 'light-blob')
          .setScale(lp.sx, lp.sy).setAlpha(0.22).setTint(lp.tint)
          .setBlendMode('ADD').setDepth(-53);
      }
    }

    // ── FLOOR DECALS — world-space, depth -58 ────────────────────
    // k-floor-corner / k-floor-half tiles scattered at low alpha break
    // the tileSprite's repeating plank pattern and read as worn patches,
    // aged wood grain, or slight tonal variation. Tinted to the honey-
    // terracotta palette of Ch12 (0xCC7733 range). The OVERLAY color
    // grade at depth 998 pushes them amber automatically so they adapt
    // to any colorGrade tweak without needing code changes.
    // No two decals share the same row — intentional variation.
    const _decals12 = [
      { tx: 'k-floor-corner', c:  1.2, r: 4.1, sc: 0.60, tint: 0x7A4A20, alpha: 0.26 },
      { tx: 'k-floor-half',   c:  4.6, r: 3.9, sc: 0.70, tint: 0x4A2C10, alpha: 0.22 },
      { tx: 'k-floor-corner', c:  7.0, r: 4.3, sc: 0.54, tint: 0x7A4A20, alpha: 0.20 },
      { tx: 'k-floor-half',   c:  9.8, r: 3.8, sc: 0.66, tint: 0x4A2C10, alpha: 0.24 },
      { tx: 'k-floor-corner', c:  3.0, r: 5.6, sc: 0.48, tint: 0x5C3418, alpha: 0.18 },
      { tx: 'k-floor-half',   c:  8.2, r: 5.9, sc: 0.52, tint: 0x4A2C10, alpha: 0.19 },
    ];
    for (const d of _decals12) {
      if (!this.textures.exists(d.tx)) continue;
      const dp = this.grid(d.c, d.r);
      this.add.image(dp.x, dp.y, d.tx)
        .setOrigin(0.5, 0.9).setScale(d.sc)
        .setTint(d.tint).setAlpha(d.alpha).setDepth(-58);
    }

    // ── CENTRE GATHERING PATCH — world-space, depth -52, ADD ─────
    // "The centre of the room is the warmest point — where the families
    // actually met." A wide flat light-blob at the midpoint (col 6, row 5)
    // reads as the floor brightening where two families converged.
    // ADD blend: brightens whatever plank texture sits beneath it.
    // Two concentric ellipses — inner tight/bright, outer wide/faint —
    // give a natural fall-off that adapts to the OVERLAY color grade.
    if (this.textures.exists('light-blob')) {
      const cpx = W * 0.50;
      const cpy = 5.0 * cs;
      this.add.image(cpx, cpy, 'light-blob')
        .setScale(5.5, 0.70).setAlpha(0.11).setTint(0xFFCC77)
        .setBlendMode('ADD').setDepth(-52);
      this.add.image(cpx, cpy, 'light-blob')
        .setScale(9.0, 1.10).setAlpha(0.05).setTint(0xFFAA44)
        .setBlendMode('ADD').setDepth(-52);
    }

    // ── ALTO-STYLE PARALLAX LIGHT LAYERS ─────────────────────────
    // Three distinct atmospheric depth planes before props appear:
    //   Plane A (depth -14): faint deep-amber room wash — "the air itself is warm"
    //   Plane B (depth -12): two window light shafts — cool night-blue tint outside
    //   Plane C (depth -10): warm centre bloom — the gathering point

    if (this.textures.exists('light-blob')) {
      // Plane A — deep amber room atmosphere
      this._roomWash = this.add.image(W * 0.5, H * 0.58, 'light-blob')
        .setScale(16, 9).setAlpha(0.055).setTint(0xFFAA55)
        .setBlendMode('ADD').setDepth(-14);
      this.tweens.add({
        targets: this._roomWash,
        alpha:   { from: 0.055, to: 0.022 },
        duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Plane B — left window light shaft (night-blue bleed through glass)
      this.add.image(W * 0.23, H * 0.38, 'light-blob')
        .setScale(3.8, 5.5).setAlpha(0.055).setTint(0x6688CC)
        .setBlendMode('ADD').setDepth(-12);

      // Plane B — right window light shaft
      this.add.image(W * 0.77, H * 0.38, 'light-blob')
        .setScale(3.8, 5.5).setAlpha(0.055).setTint(0x6688CC)
        .setBlendMode('ADD').setDepth(-12);

      // Plane C — warm centre bloom: families meeting point
      this._bloom = this.add.image(W * 0.5, H * 0.62, 'light-blob')
        .setScale(7, 4.5).setAlpha(0.09).setTint(0xFFCC77)
        .setBlendMode('ADD').setDepth(-10);
      this.tweens.add({
        targets: this._bloom,
        alpha:   { from: 0.09, to: 0.04 },
        scaleY:  { from: 4.5, to: 5.2 },
        duration: 4800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — four zones, four letters
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    this._lettersFound = 0;
    this._totalLetters = 4;

    // ── Letter counter — delegated to UIScene (immune to main camera zoom)
    this.time.delayedCall(0, () => {
      const d = { label: 'letters', total: this._totalLetters };
      this.game.events.emit('collect-counter-init', d);
      this.scene.get('UI')?._onCollectCounterInit?.(d);
    });

    const shadowS = { width: 14, height: 4, offsetY: 5, alpha: 0.14 };
    const shadowM = { width: 28, height: 6, offsetY: 7, alpha: 0.16 };

    // ── BACK WALL — bookcases rows 2.0–2.5, depth -10 ────────────
    // Header documents "lib bookcases across full width" — zero were placed.
    // Warmer/lighter tints (0xC08040 range) so they read against the dark
    // ceiling gradient rather than merging into it.
    const bc1 = this.placeAt(0.6,  2.2, 'k-bookcase-wide',   { scale: 0.60, ySort: false });
    if (bc1) bc1.setTint(0xC08040).setDepth(-10);
    const bc2 = this.placeAt(3.2,  2.0, 'k-bookcase',        { scale: 0.56, ySort: false });
    if (bc2) bc2.setTint(0xA86828).setDepth(-10);
    const bc3 = this.placeAt(5.8,  2.3, 'k-bookcase-closed', { scale: 0.58, ySort: false });
    if (bc3) bc3.setTint(0xC08040).setDepth(-10);
    const bc4 = this.placeAt(8.4,  2.1, 'k-bookcase-wide',   { scale: 0.60, ySort: false });
    if (bc4) bc4.setTint(0xA86828).setDepth(-10);
    const bc5 = this.placeAt(10.8, 2.4, 'k-bookcase',        { scale: 0.54, ySort: false });
    if (bc5) bc5.setTint(0xC08040).setDepth(-10);

    // ── ZONE 1 — MOM'S CORNER (cols 1–3) — entry warmth ──────────
    this._zoneLampPools = [];
    this.placeAt(1.0, 3.8, 'k-lamp-floor', { scale: 0.68, shadow: shadowS });
    this._addZoneLampPool(1.0, 3.8, 2.8, 1.4, 0xFFBB66, 0.18, 2400);

    this.placeAt(1.8, 5.2, 'k-sofa',      { scale: 0.70, shadow: shadowM });
    this.placeAt(0.8, 5.8, 'k-plant-pot', { scale: 0.52, shadow: shadowS });

    // ── ZONE 2 — DAD'S SPOT (cols 4–6) — central calm ────────────
    this.placeAt(4.0, 5.0, 'k-table-coffee', { scale: 0.62, shadow: shadowM });
    // Stagger chairs: one deeper (larger apparent scale), one shallower
    this.placeAt(3.6, 5.2, 'k-chair', { scale: 0.64, shadow: shadowS });
    this.placeAt(4.8, 4.8, 'k-chair', { scale: 0.56, shadow: shadowS });

    // ── ZONE 3 — SISTER'S CORNER (cols 6–8) — round table ────────
    this.placeAt(6.8, 4.8, 'k-table-round',  { scale: 0.66, shadow: shadowM });
    // Surface lamp depth-pinned on round table.
    // Row 4.9 (just in front of table row 4.8) gives static Y-sort depth ≈346 vs
    // table's dynamic depth ≈339 — lamp renders on the table surface correctly.
    const sLamp = this.placeAt(6.8, 4.9, 'k-lamp-table', { scale: 0.52, shadow: shadowS });
    // Use static Y-sort so depth is derived from LayerManager, not a hardcoded formula
    if (sLamp) this.depthMgr.addYSort(sLamp, { static: true });
    this._addZoneLampPool(6.8, 4.9, 2.4, 1.2, 0xFFCC77, 0.16, 3000);

    // ── ZONE 4 — TOGETHER (cols 9–11) — the family meeting point ──
    this.placeAt(9.8, 5.0, 'k-sofa-long',  { scale: 0.72, shadow: { width: 46, height: 7, offsetY: 9, alpha: 0.18 } });
    this.placeAt(10.8, 3.8, 'k-lamp-floor', { scale: 0.68, shadow: shadowS });
    this._addZoneLampPool(10.8, 3.8, 3.2, 1.6, 0xFFAA44, 0.20, 2800);
    this.placeAt(11.2, 5.6, 'k-plant-pot',  { scale: 0.52, shadow: shadowS });
    // Side table next to sofa — somewhere to set a cup
    this.placeAt(8.6, 5.4, 'k-table-coffee', { scale: 0.46, shadow: shadowS });

    // ── FLOOR RUG — side-view asset anchors the gathering zone ────
    // k-rug-rect is the correct 2D side-scroll version (not ISO).
    // Tinted terracotta to match the scene's festive palette.
    const rugR = this.placeAt(9.6, 5.2, 'k-rug-rect', { scale: 0.70 });
    if (rugR) rugR.setTint(0xCC7733).setAlpha(0.78).setDepth(-6);
    // Residual warm glow keeps the area reading as lit even on small screens
    if (this.textures.exists('light-blob')) {
      const rugGlowPos = this.grid(9.8, 5.6);
      this._rugGlow = this.add.image(rugGlowPos.x, rugGlowPos.y, 'light-blob')
        .setScale(4.0, 1.6).setAlpha(0.05).setTint(0xFFAA55)
        .setBlendMode('ADD').setDepth(-4);
      this.tweens.add({
        targets: this._rugGlow,
        alpha:   { from: 0.05, to: 0.02 },
        duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // Decorative flowers — foreground row so they sit in front of furniture
    this.placeAt(6.2, 5.8, 'k-flower-red',    { scale: 0.44, shadow: shadowS });
    this.placeAt(3.6, 5.9, 'k-flower-yellow',  { scale: 0.40, shadow: shadowS });

    // ── TABLE PLANTS — Zone 3 round table, domestic ambient warmth ─────
    // Small plants on and beside the round table surface. Rows intentionally differ
    // so they don't sit on an identical horizontal line.
    this.placeAt(6.5, 4.9, 'k-plant-small-1', { scale: 0.36, shadow: shadowS });
    this.placeAt(7.1, 4.9, 'k-plant-small-2', { scale: 0.36, shadow: shadowS });

    // ── 4 FAMILY LETTERS — evenly placed, left to right ──────────
    this._letterGlows = [];

    // Rows staggered: was 4.5 / 4.5 / 4.8 / 4.5 — three on an exact horizontal line.
    // Now: 4.5 / 5.1 / 4.8 / 4.9 — every letter on a distinct row.
    // letter_dad moved to row 5.1: sits ON the coffee table surface (table at 5.0).
    // letter_together moved to row 4.9: nestled beside the sofa-long (5.0).
    const letterDefs = [
      { c: 2.6,  r: 5.1, id: 'letter_mom',     label: "Mom's Blessing",   dialogue: 'ch12_letter_1' },
      { c: 4.2,  r: 5.1, id: 'letter_dad',     label: "Dad's Words",      dialogue: 'ch12_letter_2' },
      { c: 6.8,  r: 4.9, id: 'letter_sister',  label: "A Sister's Note",  dialogue: 'ch12_letter_3' },
      { c: 9.8,  r: 5.1, id: 'letter_together',label: "Written Together", dialogue: 'ch12_letter_4' },
    ];
    this._letterDefs = letterDefs;

    for (let i = 0; i < letterDefs.length; i++) {
      const ld  = letterDefs[i];
      const pos = this.grid(ld.c, ld.r);

      // Glowing envelope marker
      if (this.textures.exists('light-blob')) {
        const glow = this.add.image(pos.x, pos.y + 5, 'light-blob')
          .setScale(2.2).setAlpha(i === 0 ? 0.24 : 0).setTint(0xFFD080)
          .setBlendMode('ADD').setDepth(-3);
        if (i === 0) {
          this.tweens.add({
            targets:  glow,
            scale:    { from: 2.2, to: 2.8 },
            alpha:    { from: 0.24, to: 0.08 },
            duration: 1600 + i * 200,
            yoyo:     true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }
        this._letterGlows.push(glow);
      } else {
        this._letterGlows.push(null);
      }

      // First letter's emote shown immediately; rest revealed on each collect
      if (i === 0) {
        const ep = this.grid(ld.c, ld.r - 1.6);
        this._addEmote(ep.x, ep.y, 'emote-heart', { scale: 0.24, delay: 0 });
      }

      const dlgKey = ld.dialogue;
      this.placeInteractable(ld.c, ld.r, 'obj-letter', {
        id:            ld.id,
        label:         ld.label,
        triggerRadius: 70,
        glowRadius:    155,
        enabled:       false,  // All letters locked until intro dialogue finishes
        skipUnlockSFX: true,
        onTrigger:     () => this._onLetterFound(i, dlgKey),
      }, { scale: 0.52 });
    }

    // ── PLAYER-PATH OCCLUSION — Y-sorted, rows 5.3–5.6 ───────────
    // Player walks rows 4.5–5.2 (depth ≈320–365). Props at rows 5.3–5.6
    // (depth ≈371–390) always render above the player — 2.5D occlusion.
    // Indoor analogues: tall plant = tree base, plant-pot = bush,
    // lounge-chair = rock mass. 8 props spaced every ~1.5 cols so the
    // player is always passing through at least one on any horizontal path.
    //
    //  col 0.8  → k-plant-flat-tall  (tree base, left entrance)
    //  col 2.2  → k-plant-pot        (bush, left-of-sofa gap)   ← NEW
    //  col 3.6  → k-plant-pot        (bush, Zone 1/2 boundary)
    //  col 5.4  → k-plant-flat-tall  (tree base, mid-room)      ← NEW
    //  col 7.2  → k-lounge-chair     (rock mass, Zone 3 centre)
    //  col 9.0  → k-plant-flat-tall  (tree base, Zone 4 shoulder)
    //  col 10.5 → k-side-table       (rock/stump, near sofa-long) ← NEW
    //  col 11.4 → k-plant-pot        (bush, right edge)

    const ppL = this.placeAt(0.8, 5.5, 'k-plant-flat-tall', {
      scale: 0.62,
      shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppL) ppL.setTint(0x5C3820);

    // ── tree-base bush gap fill — col 2.2 ───────────────────────
    const ppBushL = this.placeAt(2.2, 5.4, 'k-plant-pot', {
      scale: 0.60,
      shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppBushL) ppBushL.setTint(0x5C3820);

    const ppM1 = this.placeAt(3.6, 5.4, 'k-plant-pot', {
      scale: 0.56,
      shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppM1) ppM1.setTint(0x5C3820);

    // ── tree-base gap fill — col 5.4 (dad/sister boundary) ──────
    const ppTreeM = this.placeAt(5.4, 5.5, 'k-plant-flat-tall', {
      scale: 0.64,
      shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppTreeM) ppTreeM.setTint(0x5A3210);

    const ppChair = this.placeAt(7.2, 5.6, 'k-lounge-chair', {
      scale: 0.50,
      shadow: { width: 16, height: 4, offsetY: 4, alpha: 0.10 },
    });
    if (ppChair) ppChair.setTint(0x884422);

    const ppM2 = this.placeAt(9.0, 5.3, 'k-plant-flat-tall', {
      scale: 0.58,
      shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppM2) ppM2.setTint(0x5C3820);

    // ── rock/stump analog — col 10.5 (near sofa-long) ───────────
    const ppStump = this.placeAt(10.5, 5.4, 'k-side-table', {
      scale: 0.46,
      shadow: { width: 14, height: 4, offsetY: 4, alpha: 0.10 },
    });
    if (ppStump) ppStump.setTint(0x7A4C1A);

    const ppR = this.placeAt(11.4, 5.5, 'k-plant-pot', {
      scale: 0.62,
      shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppR) ppR.setTint(0x5C3820);

    // ── LOWER-HALF DETAIL — rows 6.0–6.6 ────────────────────────
    // Rows 6.0–8.0 were completely empty. Warm family-room props at varied
    // Y positions — no two share the same row.
    const lhPot1 = this.placeAt(2.2, 6.3, 'k-plant-small-1', { scale: 0.46, shadow: { width: 10, height: 3, offsetY: 3, alpha: 0.20 } });
    if (lhPot1) lhPot1.setTint(0x5C3820);
    const lhRug = this.placeAt(5.0, 6.6, 'k-rug-round', { scale: 0.54 });
    if (lhRug) lhRug.setTint(0xCC7733).setAlpha(0.55).setDepth(-4);
    const lhPot2 = this.placeAt(7.4, 6.1, 'k-plant-small-2', { scale: 0.42, shadow: { width: 10, height: 3, offsetY: 3, alpha: 0.20 } });
    if (lhPot2) lhPot2.setTint(0x5C3820);
    const lhSide = this.placeAt(9.6, 6.4, 'k-side-table', {
      scale: 0.44,
      shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.22 },
    });
    if (lhSide) lhSide.setTint(0x9A6030);
    const lhPot3 = this.placeAt(11.4, 6.0, 'k-plant-pot', {
      scale: 0.48,
      shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.22 },
    });
    if (lhPot3) lhPot3.setTint(0x5C3820);

    // ── MID-FOREGROUND OCCLUSION — Y-sorted, rows 6.8–7.2 ────────
    // Five props filling the full width — col gaps at 3.5 and 8.5 added.
    const occL = this.placeAt(1.0, 7.0, 'k-lounge-chair', {
      scale: 0.52,
      shadow: { width: 18, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (occL) occL.setTint(0x884422);
    // ── bush analog col 3.5 ──────────────────────────────────────
    const occBushL = this.placeAt(3.5, 6.9, 'k-plant-pot', {
      scale: 0.56,
      shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (occBushL) occBushL.setTint(0x5C3820);
    const occM = this.placeAt(6.0, 6.8, 'k-table-coffee', { scale: 0.42, shadow: { width: 20, height: 5, offsetY: 5, alpha: 0.10 } });
    if (occM) occM.setTint(0x7A4C1A);
    // ── tree-base analog col 8.5 ─────────────────────────────────
    const occTreeR = this.placeAt(8.5, 7.1, 'k-plant-flat-tall', {
      scale: 0.54,
      shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (occTreeR) occTreeR.setTint(0x5C3820);
    const occR = this.placeAt(11.0, 7.0, 'k-plant-pot', {
      scale: 0.58,
      shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (occR) occR.setTint(0x5C3820);

    // ── BOTTOM-EDGE FRAMERS — depth 601, 5 elements ─────────────
    // These are the most "partial objects near bottom of screen":
    // originY 0.90–0.96 crops the top of each sprite leaving only
    // the base visible — a bush stub, a tree trunk base, a pot rim.
    // Depth 601 = always in front; not Y-sorted (player never walks
    // this far down, they exist purely as screen-edge framers).
    //
    //  col 0.4  row 7.6  → pot rim (left edge)
    //  col 3.0  row 7.2  → tree-trunk base (left-mid)   ← NEW
    //  col 5.8  row 7.8  → plant stub (centre)
    //  col 8.4  row 7.4  → pot rim (right-mid)           ← NEW
    //  col 11.6 row 7.3  → pot rim (right edge)
    const fwL = this.grid(0.4,  7.6);
    const fwML = this.grid(3.0, 7.2);
    const fwC = this.grid(5.8,  7.8);
    const fwMR = this.grid(8.4, 7.4);
    const fwR = this.grid(11.6, 7.3);
    this.add.image(fwL.x,  fwL.y,  'k-plant-pot')
      .setOrigin(0.5, 0.90).setScale(0.80).setTint(0x3C1A08).setAlpha(0.85).setDepth(601);
    this.add.image(fwML.x, fwML.y, 'k-plant-flat-tall')
      .setOrigin(0.5, 0.94).setScale(0.72).setTint(0x3A1608).setAlpha(0.80).setDepth(601);
    this.add.image(fwC.x,  fwC.y,  'k-plant-small-1')
      .setOrigin(0.5, 0.92).setScale(0.58).setTint(0x3A1606).setAlpha(0.75).setDepth(601);
    this.add.image(fwMR.x, fwMR.y, 'k-plant-pot')
      .setOrigin(0.5, 0.90).setScale(0.68).setTint(0x3C1A08).setAlpha(0.78).setDepth(601);
    this.add.image(fwR.x,  fwR.y,  'k-plant-pot')
      .setOrigin(0.5, 0.90).setScale(0.74).setTint(0x3C1A08).setAlpha(0.85).setDepth(601);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND DECOR — indoor warm pool, suppresses outdoor defaults
  // ═══════════════════════════════════════════════════════════════════

  buildGroundDecor() {
    // Default pool has outdoor grass, rocks, flowers — wrong for a family
    // living room. Very sparse warm plant scatter only.
    this._spawnGroundDecor({
      pool:     [ 'k-plant-small-1', 'k-plant-small-2' ],
      density:  0.02,
      rowRange: [5.6, 6.4],
    });
  }

  /** Pulsing warm light pool under a lamp. */
  _addZoneLampPool(c, r, scaleX, scaleY, tint, alpha, duration) {
    if (!this.textures.exists('light-blob')) return;
    const pos  = this.grid(c, r);
    const pool = this.add.image(pos.x, pos.y - 40, 'light-blob')
      .setScale(scaleX, scaleY).setAlpha(alpha).setTint(tint)
      .setBlendMode('ADD').setDepth(-5);
    this._zoneLampPools.push(pool);
    this.tweens.add({
      targets:  pool,
      alpha:    { from: alpha,   to: alpha * 0.28 },
      scaleX:   { from: scaleX,  to: scaleX * 1.28 },
      scaleY:   { from: scaleY,  to: scaleY * 1.10 },
      duration, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    const start = this.grid(1.5, 4.5);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male-formal' },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.30, dynamic: true,
    });

    // Aashna already at home, warm side of the room
    // Row 5.2 puts her feet solidly on the floor in front of the long sofa.
    // Wander radius 55px lets her visibly circulate in the family zone.
    const aPos = this.grid(9.2, 5.2);
    this._aashna = this.charSystem.createFemale(aPos.x, aPos.y, { texture: 'char-female-navy' });
    this._aashna.wander(aPos.x, aPos.y, 55);
    this.shadows.add(this._aashna.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.25, dynamic: true,
    });

    // Third NPC — Mom's corner (Zone 1) — grounds the "two families" premise.
    // Green shirt (char-female-green) distinguishes her from Aashna (red shirt).
    // Row 4.8 places her in front of the sofa, not hidden behind it.
    const momPos = this.grid(2.2, 4.8);
    this._npcMom = this.charSystem.createFemale(momPos.x, momPos.y, { texture: 'char-female-green' });
    this._npcMom.wander(momPos.x, momPos.y, 22);
    this.shadows.add(this._npcMom.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.25, dynamic: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FX — warm sparkles + cinematic intro pan
  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    const W = this.worldW;

    // Warm golden motes drifting upward
    if (this.textures.exists('particle-glow')) {
      this.add.particles(W / 2, 0, 'particle-glow', {
        x:         { min: -W / 2, max: W / 2 },
        speedY:    { min: 5, max: 16 },
        speedX:    { min: -3, max:  3 },
        scale:     { start: 0.11, end: 0 },
        alpha:     { start: 0.26, end: 0 },
        tint:      [0xFFD080, 0xFFBB66, 0xFFAA44],
        lifespan:  { min: 3000, max: 7000 },
        frequency: 220,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 50));
    }

    // Heart particles — the "love fills this room" layer
    if (this.textures.exists('particle-heart')) {
      this.add.particles(W / 2, 0, 'particle-heart', {
        x:         { min: -W / 2, max: W / 2 },
        speedY:    { min: 4, max: 10 },
        speedX:    { min: -2, max:  2 },
        scale:     { start: 0.09, end: 0 },
        alpha:     { start: 0.18, end: 0 },
        tint:      [0xFFAACC, 0xFF88AA],
        lifespan:  { min: 4000, max: 8000 },
        frequency: 700,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 52));
    }

    // ── CINEMATIC INTRO — letterbox + room reveal ────────────────
    // Snap to far end (shows Aashna, all four letters glowing),
    // then one slow pan left across the full room — player "arrives".
    // No back-and-forth: single deliberate sweep left to right.
    this._cinematic = true;
    if (this._player) this._player.sprite.setAlpha(0);

    const bars     = this.cam.letterbox(36, 1000);
    const startPos = this.grid(1.5,  4.5);
    const farPos   = this.grid(10.5, 4.5);

    // Snap instantly to far end, then pan left to where player enters
    this.cam.slowPan(farPos.x, farPos.y, 80, 'Linear', () => {
      this.cam.slowPan(startPos.x, startPos.y, 3400, 'Sine.easeInOut', () => {
        bars.remove(500);
        if (this._player) {
          this.tweens.add({ targets: this._player.sprite, alpha: 1, duration: 400 });
          this.cam.follow(this._player.sprite);
          this.lighting.followTarget(this._player.sprite);
        }
        this._cinematic = false;

        // Intro narration after control is released.
        // First letter only becomes interactive once the player has read the intro.
        this.time.delayedCall(400, () => {
          if (!this.sys?.isActive()) return;
          const lines = storyData.dialogues?.ch12_intro;
          const enableFirst = () => this.proximity.setEnabled('letter_mom', true);
          if (lines) this.dialogue?.start(lines, enableFirst);
          else enableFirst();
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION
  // ═══════════════════════════════════════════════════════════════════

  _onLetterFound(index, dialogueKey) {
    const letterIds = ['letter_mom', 'letter_dad', 'letter_sister', 'letter_together'];
    this.proximity.setEnabled(letterIds[index], false);
    // Per-letter escalating SFX: soft-click for Mom/Dad/Sister (quiet personal moments),
    // sparkle-chime for the final "Written Together" letter as prelude to the triumph stinger.
    const isLastLetter = index === this._totalLetters - 1;
    if (isLastLetter) {
      audioManager._playTextureEvent?.('sparkle-chime');
    } else {
      audioManager._playTextureEvent?.('soft-click');
    }
    this._lettersFound++;

    // Update UIScene counter (zoom-safe HUD)
    this.game.events.emit('collect-counter-update', { found: this._lettersFound, total: this._totalLetters });
    this.scene.get('UI')?._onCollectCounterUpdate?.({ found: this._lettersFound });

    // Burst glow then extinguish — letter "read"
    const glow = this._letterGlows[index];
    if (glow) {
      this.tweens.killTweensOf(glow);
      this.tweens.add({
        targets:  glow,
        alpha:    0.60,
        scale:    3.6,
        duration: 350,
        yoyo:     true,
        ease:     'Quad.easeOut',
        onComplete: () => { if (this.sys?.isActive()) glow.setAlpha(0); },
      });
    }

    // Enable next letter's proximity + reveal its scene glow
    const nextIdx = index + 1;
    if (nextIdx < this._totalLetters) {
      this.proximity.setEnabled(letterIds[nextIdx], true);
      // Reveal next letter's emote — earned, not front-loaded
      if (this._letterDefs?.[nextIdx]) {
        const nextLd = this._letterDefs[nextIdx];
        const nextEp = this.grid(nextLd.c, nextLd.r - 1.6);
        const nextEmoteTex = nextIdx === 3 ? 'emote-hearts' : 'emote-heart';
        this._addEmote(nextEp.x, nextEp.y, nextEmoteTex, { scale: 0.24, delay: 0 });
      }
      const nextGlow = this._letterGlows[nextIdx];
      if (nextGlow) {
        this.tweens.add({
          targets: nextGlow, alpha: 0.24, duration: 800, ease: 'Quad.easeOut',
          onComplete: () => {
            if (!this.sys?.isActive()) return;
            this.tweens.add({
              targets: nextGlow,
              scale: { from: 2.2, to: 2.8 },
              alpha: { from: 0.24, to: 0.08 },
              duration: 1600 + nextIdx * 200,
              yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
          },
        });
      }
    }

    this.cam.zoomPulse(1.55, 600);

    const lines = storyData.dialogues?.[dialogueKey];
    if (lines) {
      this.dialogue?.start(lines, () => {
        if (!this.sys?.isActive()) return;
        if (this._lettersFound >= this._totalLetters) {
          this._allLettersFound();
        }
      });
    }
  }

  _allLettersFound() {
    // All four voices heard — final family dialogue
    this.time.delayedCall(700, () => {
      if (!this.sys?.isActive()) return;
      const lines = storyData.dialogues?.ch12_family;
      if (lines) {
        this.dialogue?.start(lines, () => {
          if (!this.sys?.isActive()) return;
          this._chapterComplete();
        });
      } else {
        this._chapterComplete();
      }
    });
  }

  _chapterComplete() {
    // Delay stinger 280ms — family acceptance peak must land clean, not under the wipe
    this.time.delayedCall(280, () => { if (!this.sys?.isActive()) return; audioManager.playStinger('triumph'); });
    this._guardTransition(() => {
      goToChapter(this, 12);
    });
  }

  // Block movement during cinematic pan
  onUpdate(_time, _delta) {
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);
    if (this._cinematic && this._player?.sprite?.body) {
      this._player.sprite.body.setVelocity(0, 0);
    }
  }

  onShutdown() {
    this.tweens.killTweensOf(this._roomWash);
    this.tweens.killTweensOf(this._bloom);
    this.tweens.killTweensOf(this._rugGlow);
    for (const p of this._zoneLampPools ?? []) this.tweens.killTweensOf(p);
    for (const g of this._letterGlows ?? []) this.tweens.killTweensOf(g);
    this.game.events.emit('collect-counter-hide');
    this.scene.get('UI')?._onCollectCounterHide?.();
    audioManager.fadeOutAll(600);
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
