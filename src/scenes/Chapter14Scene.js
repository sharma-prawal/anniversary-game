import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter14Scene — "From Engagement to Forever"
 *
 * A ceremonial aisle walking left-to-right. Player enters through a
 * lamp-flanked gateway, follows paired flowers lining the path, passes
 * beneath a pine-oak arch, and reaches Aashna at the altar bench.
 * The single bench interactable fires ch14_wedding — the most
 * cinematic moment in the game.
 *
 * Spatial logic (12 cols × 8 rows, cell 64 = 768 × 512):
 *
 *   BACK WALL (row 2.0): alternating plant-pots and bookcase silhouettes
 *     create the impression of a floral decorated venue backdrop
 *
 *   LEFT GATEWAY (col 1): entry lamp + pots — the ceremony begins
 *   AISLE  (cols 2–6): two pairs of flower columns flanking the path
 *   ARCH   (cols 4.6 / 7.8): pine-a gate tree + oak gate tree — overhead
 *   ALTAR  (col 6.5): bench-soft interactable: "Forever"
 *   Aashna (col 7.6, row 4.5) — standing still at the altar
 *   RIGHT  (cols 9–11): lamp + plant — warm exit side
 *
 *   Physics top y=192 (row 3) — back wall row 2 above player zone.
 *   Zoom 1.72→1.80: viewport = 558px. Player at col 1.5 (x=96).
 *   Altar at col 6.5 (x=416) — inside first viewport; Aashna visible.
 *
 *   Cinematic: pan right to altar (show Aashna waiting), hold, pan
 *   back to player, release — "She is up ahead, waiting for you."
 */
export class Chapter14Scene extends ChapterScene {
  constructor() {
    super('Chapter14', {
      cols:       12,
      rows:       8,
      mood:       'romantic',
      zoom:       1.72,
      targetZoom: 1.80,
      followLerp: 0.040,
      drift:      false,
      fadeInMs:   2500,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — deep romantic lavender interior
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // ── INDOOR — ceremonial hall, deep romantic lavender-black ────
    this.env = EnvironmentManager.apply(this, 'INDOOR', {
      ceiling:    { topColor: 0x060208, midColor: 0x100418, botColor: 0x1C0A28 },
      wall:       { texture: null, color: 0x160528, tint: 0xBB88CC, alpha: 0.85 },
      windows:    { style: 'cafe', positions: [0.12, 0.88] },
      // texture:null suppresses IndoorEnvironment's hardcoded 0.82 alpha tileSprite
      // which produces visible ~14px banding at zoom 1.72.
      floor:      { topColor: 0x280A34, botColor: 0x070008, texture: null },
      vignette:   { size: 120, color: 0x09041A, alphaL: 0.65, alphaR: 0.65, alphaT: 0.55, alphaB: 0.65 },
      colorGrade: { color: 0xCC88FF, alpha: 0.028, blend: 'OVERLAY' },
      filmGrain:  { alpha: 0.028 },
    });

    const W  = this.worldW;
    const H  = this.worldH;
    const cs = this.cellSize ?? 64;

    // ── FLOOR TEXTURE — world-space, depth -59 ────────────────────
    // Re-add k-floor as world-space tileSprite at 0.32 alpha (lavender-tinted
    // to echo the ceremony palette).
    if (this.textures.exists('k-floor')) {
      this.add.tileSprite(0, 3.0 * cs, W, H - 3.0 * cs, 'k-floor')
        .setOrigin(0, 0).setTint(0x280A34).setAlpha(0.32).setDepth(-59);
    }

    // ── FLOOR VARIATION BANDS — depth -58 ─────────────────────────
    const gfxFloor = this.add.graphics().setDepth(-58);
    gfxFloor.fillStyle(0x080010, 0.28);   // near-wall shadow
    gfxFloor.fillRect(0, 3.0 * cs, W, cs * 0.8);
    gfxFloor.fillStyle(0xAA66CC, 0.06);   // mid-room lavender warmth
    gfxFloor.fillRect(0, 4.5 * cs, W, cs * 1.0);
    gfxFloor.fillStyle(0x040008, 0.20);   // far darkening
    gfxFloor.fillRect(0, 6.5 * cs, W, cs * 1.5);

    // ── LATERAL EDGE SHADOWS — depth -56 ──────────────────────────
    const gfxEdge = this.add.graphics().setDepth(-56);
    gfxEdge.fillStyle(0x040008, 0.30);
    gfxEdge.fillRect(0,            3.0 * cs, cs * 1.2, H - 3.0 * cs);
    gfxEdge.fillStyle(0x040008, 0.30);
    gfxEdge.fillRect(W - cs * 1.2, 3.0 * cs, cs * 1.2, H - 3.0 * cs);

    // ── LAMP FLOOR PUDDLES — depth -53, ADD ───────────────────────
    if (this.textures.exists('light-blob')) {
      const _puddles = [
        { c: 5.0, r: 5.2, tint: 0xFFCCDD, sx: 3.2, sy: 0.45 },
        { c: 7.5, r: 5.2, tint: 0xFFDDCC, sx: 3.4, sy: 0.48 },
      ];
      for (const lp of _puddles) {
        const lpos = this.grid(lp.c, lp.r);
        this.add.image(lpos.x, lpos.y, 'light-blob')
          .setScale(lp.sx, lp.sy).setAlpha(0.18).setTint(lp.tint)
          .setBlendMode('ADD').setDepth(-53);
      }
    }

    // ── WINDOW FLOOR PATCHES — world-space, depth -54, ADD ────────
    // Windows at fractions 0.12 + 0.88. Their shafts land on the aisle
    // floor as cool lavender slivers — contrasting the warm rose lamp puddles.
    if (this.textures.exists('light-blob')) {
      this.add.image(W * 0.12, 4.6 * cs, 'light-blob')
        .setScale(2.8, 0.38).setAlpha(0.09).setTint(0xDDCCFF)
        .setBlendMode('ADD').setDepth(-54);
      this.add.image(W * 0.88, 4.6 * cs, 'light-blob')
        .setScale(2.8, 0.38).setAlpha(0.08).setTint(0xDDCCFF)
        .setBlendMode('ADD').setDepth(-54);
    }

    // ── FLOOR DECALS — world-space, depth -58 ────────────────────
    // k-floor-corner / k-floor-half tiles at low alpha break the repeating
    // plank pattern — reads as worn ceremony stone or a tiled lavender floor.
    // Tinted to the deep purple palette. OVERLAY colorGrade at depth 998
    // pushes them lavender automatically — no code change needed if palette shifts.
    const _decals14 = [
      { tx: 'k-floor-corner', c:  1.2, r: 4.1, sc: 0.58, tint: 0x4A1060, alpha: 0.22 },
      { tx: 'k-floor-half',   c:  3.8, r: 3.9, sc: 0.68, tint: 0x2C0840, alpha: 0.18 },
      { tx: 'k-floor-corner', c:  6.5, r: 4.3, sc: 0.52, tint: 0x4A1060, alpha: 0.20 },
      { tx: 'k-floor-half',   c:  9.2, r: 3.8, sc: 0.64, tint: 0x2C0840, alpha: 0.19 },
      { tx: 'k-floor-corner', c:  2.6, r: 5.6, sc: 0.46, tint: 0x3C1455, alpha: 0.16 },
      { tx: 'k-floor-half',   c:  8.0, r: 5.9, sc: 0.50, tint: 0x2C0840, alpha: 0.17 },
    ];
    for (const d of _decals14) {
      if (!this.textures.exists(d.tx)) continue;
      const dp = this.grid(d.c, d.r);
      this.add.image(dp.x, dp.y, d.tx)
        .setOrigin(0.5, 0.9).setScale(d.sc)
        .setTint(d.tint).setAlpha(d.alpha).setDepth(-58);
    }

    // ── AISLE APPROACH WASH — world-space, depth -52, ADD ────────
    // The ceremony aisle runs left→right at row 4.5. A wide horizontal
    // light-blob here reads as the aisle "runner" catching the altar glow —
    // drawing the eye rightward toward the bench and Aashna.
    // Two concentric ellipses: inner tight/bright, outer wide/faint.
    // ADD blend: adapts to whatever the OVERLAY colorGrade sets as the floor tone.
    if (this.textures.exists('light-blob')) {
      const aisleX = W * 0.5;
      const aisleY = 4.5 * cs;
      this.add.image(aisleX, aisleY, 'light-blob')
        .setScale(8.0, 0.55).setAlpha(0.09).setTint(0xFFCCEE)
        .setBlendMode('ADD').setDepth(-52);
      this.add.image(aisleX, aisleY, 'light-blob')
        .setScale(12.0, 1.00).setAlpha(0.04).setTint(0xCC88FF)
        .setBlendMode('ADD').setDepth(-52);
    }

    // ── AMBIENT ROSE WASH — soft romantic radiance ────────────────
    if (this.textures.exists('light-blob')) {
      this._roseWash = this.add.image(W * 0.55, H * 0.5, 'light-blob')
        .setScale(14, 8).setAlpha(0.05).setTint(0xFFAACC)
        .setBlendMode('ADD').setDepth(-12);
      this.tweens.add({
        targets:  this._roseWash,
        alpha:    { from: 0.05, to: 0.015 },
        duration: 4800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // THREE-LAYER ALTAR GLOW — the "forever" light
      const ap = this.grid(6.5, 4.5);

      this._glowOuter = this.add.image(ap.x, ap.y + 10, 'light-blob')
        .setScale(9.5).setAlpha(0.07).setTint(0xFFCCEE)
        .setBlendMode('ADD').setDepth(5);
      this.tweens.add({
        targets:  this._glowOuter,
        alpha:    { from: 0.07, to: 0.02 },
        scale:    { from: 9.5,  to: 11.5 },
        duration: 3800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // ── AASHNA PERSONAL GLOW — warm halo where she stands ───────
      // Altar glow centres on the bench (col 6.5); Aashna is col 7.6.
      // This fills the gap so she's visibly lit rather than in shadow.
      const aashnaPos = this.grid(7.6, 4.5);
      this._aashnaGlow = this.add.image(aashnaPos.x, aashnaPos.y + 6, 'light-blob')
        .setScale(3.8).setAlpha(0.16).setTint(0xFFDDEE)
        .setBlendMode('ADD').setDepth(6);
      this.tweens.add({
        targets:  this._aashnaGlow,
        alpha:    { from: 0.16, to: 0.06 },
        scale:    { from: 3.8,  to: 4.8 },
        duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      const mid = this.add.image(ap.x, ap.y + 10, 'light-blob')
        .setScale(3.4).setAlpha(0.22).setTint(0xFFBBDD)
        .setBlendMode('ADD').setDepth(8);
      this.tweens.add({
        targets:  mid,
        alpha:    { from: 0.22, to: 0.07 },
        scale:    { from: 3.4,  to: 4.4 },
        duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this._altarGlow = mid;

      this._glowInner = this.add.image(ap.x, ap.y + 4, 'light-blob')
        .setScale(1.5).setAlpha(0.32).setTint(0xFFEEFF)
        .setBlendMode('ADD').setDepth(12);
      this.tweens.add({
        targets:  this._glowInner,
        alpha:    { from: 0.32, to: 0.12 },
        scale:    { from: 1.5,  to: 2.0 },
        duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — gateway, flower aisle, arch, altar
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    const shadowS = { width: 12, height: 3, offsetY: 5, alpha: 0.12 };
    const shadowM = { width: 26, height: 5, offsetY: 7, alpha: 0.14 };

    // ── HALL COLUMNS — architectural grandeur flanking the entire aisle ──
    // Statue columns at the back wall row (row 3.0), depth -10 keeps them
    // behind all floor props. Tinted lavender-white to match ceremony palette.
    const colL = this.placeAt(0.2, 3.0, 'k-statue-column', { scale: 0.68, ySort: false });
    if (colL) colL.setTint(0xDDCCEE).setAlpha(0.82).setDepth(-10);
    const colR = this.placeAt(11.4, 3.0, 'k-statue-column', { scale: 0.68, ySort: false });
    if (colR) colR.setTint(0xDDCCEE).setAlpha(0.82).setDepth(-10);

    // ── ENTRY GATEWAY — two rose pots flanking the entrance ──────
    // Rows staggered so they don't sit on identical Y.
    const ep1 = this.placeAt(0.6, 4.6, 'k-plant-pot', { scale: 0.62, shadow: shadowS });
    if (ep1) ep1.setTint(0xFFCCDD);
    const ep2 = this.placeAt(1.4, 5.2, 'k-plant-pot', { scale: 0.54, shadow: shadowS });
    if (ep2) ep2.setTint(0xFFBBCC);

    // ── FLOWER AISLE — three pairs flanking the walk path ─────────
    // Was: upper row ~3.9 / lower row ~5.1 — near-identical horizontal lines.
    // Now: each flower on a distinct row — no two share the same Y.
    this.placeAt(2.2, 4.3, 'k-flower-red',    { scale: 1.00, shadow: shadowS });
    this.placeAt(2.2, 5.3, 'k-flower-yellow',  { scale: 1.00, shadow: shadowS });

    this.placeAt(4.2, 4.3, 'k-flower-purple',  { scale: 1.00, shadow: shadowS });
    this.placeAt(4.2, 4.9, 'k-flower-red',     { scale: 1.00, shadow: shadowS });

    this.placeAt(5.8, 4.3, 'k-flower-yellow',  { scale: 1.00, shadow: shadowS });
    this.placeAt(5.8, 5.1, 'k-flower-purple',  { scale: 1.00, shadow: shadowS });

    // ── ARCH GATEWAY LAMPS — staggered so they don't share an exact row ──
    // Left lamp deeper (row 4.1), right lamp shallower (row 3.7).
    this.placeAt(5.0, 4.1, 'k-lamp-floor', {
      scale:  0.76,
      shadow: { width: 14, height: 4, offsetY: 6, alpha: 0.14 },
    });
    this._aisleLampPools = [];
    this._addAisleLamp(5.0, 4.1, 0xFFCCDD, 0.20, 2400);

    this.placeAt(7.5, 3.7, 'k-lamp-floor', {
      scale:  0.76,
      shadow: { width: 14, height: 4, offsetY: 6, alpha: 0.14 },
    });
    this._addAisleLamp(7.5, 3.7, 0xFFDDCC, 0.20, 2600);

    // ── ALTAR — the bench where Aashna stands ────────────────────
    // The altar is already marked by the triple-layer glow, the arch
    // lamps, the emote-hearts, and the flower aisle pointing to it.
    // No additional flanking props needed — restraint is polish.
    this.placeInteractable(6.5, 4.4, 'k-bench-soft', {
      id:            'altar',
      label:         'Forever',
      triggerRadius: 66,
      glowRadius:    160,
      enabled:       false,
      skipUnlockSFX: true,
      onTrigger:     () => this._onAltar(),
    }, {
      scale:  0.70,
      shadow: { width: 32, height: 7, offsetY: 7, alpha: 0.20 },
    });

    // ── RIGHT SIDE — a single grounded rose pot, nothing more ───────
    const rp = this.placeAt(10.6, 4.8, 'k-plant-pot', { scale: 0.58, shadow: shadowS });
    if (rp) rp.setTint(0xFFCCDD);

    // ── EMOTE — single hearts above the altar only ───────────────
    const ap = this.grid(6.5, 3.4);
    this._addEmote(ap.x, ap.y, 'emote-hearts', { scale: 0.30, depth: 30, delay: 0 });

    // ── PLAYER-PATH OCCLUSION — Y-sorted, rows 5.3–5.6 ─────────────
    // Player walks rows 4.0–5.2. Props at rows 5.3–5.6 always render
    // in front — ceremonial 2.5D depth.
    // Pots scaled up (0.68–0.74) + tall plants replace thin candles
    // so each prop has genuine visual mass and clearly overlaps the player.
    const ppP1 = this.placeAt(0.8, 5.4, 'k-plant-pot', {
      scale: 0.70, shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.12 },
    });
    if (ppP1) ppP1.setTint(0xDDBBEE);

    const ppT1 = this.placeAt(2.6, 5.5, 'k-plant-flat-tall', {
      scale: 0.62, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppT1) ppT1.setTint(0xCCAADD);

    const ppP2 = this.placeAt(4.4, 5.3, 'k-plant-pot', {
      scale: 0.66, shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (ppP2) ppP2.setTint(0xDDBBEE);

    const ppT2 = this.placeAt(6.6, 5.5, 'k-plant-flat-tall', {
      scale: 0.64, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppT2) ppT2.setTint(0xCCAADD);

    const ppP3 = this.placeAt(8.4, 5.4, 'k-plant-pot', {
      scale: 0.68, shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (ppP3) ppP3.setTint(0xCCAACE);

    const ppT3 = this.placeAt(10.2, 5.3, 'k-plant-flat-tall', {
      scale: 0.60, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppT3) ppT3.setTint(0xCCAADD);

    const ppP4 = this.placeAt(11.4, 5.5, 'k-plant-pot', {
      scale: 0.72, shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (ppP4) ppP4.setTint(0xDDBBEE);

    // ── LOWER SCATTER — rows 5.8–6.5 ────────────────────────────────
    // Fallen petals and small candles on the aisle floor.
    const lsF1 = this.placeAt(1.4, 5.9, 'k-flower-red', { scale: 0.44 });
    if (lsF1) lsF1.setTint(0xCCAACE);
    const lsC1 = this.placeAt(3.2, 6.3, 'k-plant-small-2', { scale: 0.40 });
    if (lsC1) lsC1.setTint(0xFFCCDD);
    const lsF2 = this.placeAt(5.4, 6.0, 'k-flower-purple', { scale: 0.42 });
    if (lsF2) lsF2.setTint(0xBB99DD);
    const lsF3 = this.placeAt(7.2, 6.4, 'k-flower-yellow', { scale: 0.40 });
    if (lsF3) lsF3.setTint(0xFFDDBB);
    const lsP1 = this.placeAt(9.0, 5.9, 'k-plant-small-1', { scale: 0.40 });
    if (lsP1) lsP1.setTint(0xBBAACE);
    const lsF4 = this.placeAt(10.8, 6.2, 'k-flower-red', { scale: 0.38 });
    if (lsF4) lsF4.setTint(0xCCAACE);

    // ── MID-FOREGROUND OCCLUSION — Y-sorted, rows 6.7–7.1 ──────────
    // Larger floral arrangements at the near-camera distance.
    const mfP1 = this.placeAt(1.0, 7.0, 'k-plant-pot', {
      scale: 0.60, shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (mfP1) mfP1.setTint(0xDDBBEE);
    const mfC1 = this.placeAt(3.4, 6.8, 'k-plant-small-1', {
      scale: 0.56, shadow: { width: 8, height: 2, offsetY: 4, alpha: 0.10 },
    });
    if (mfC1) mfC1.setTint(0xFFCCDD);
    const mfP2 = this.placeAt(6.2, 7.0, 'k-plant-pot', {
      scale: 0.58, shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (mfP2) mfP2.setTint(0xCCAACE);
    const mfC2 = this.placeAt(8.8, 6.9, 'k-plant-small-2', {
      scale: 0.54, shadow: { width: 8, height: 2, offsetY: 4, alpha: 0.10 },
    });
    if (mfC2) mfC2.setTint(0xFFDDCC);
    const mfP3 = this.placeAt(11.2, 7.1, 'k-plant-pot', {
      scale: 0.62, shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (mfP3) mfP3.setTint(0xDDBBEE);

    // ── BOTTOM-EDGE FRAMERS — depth 601 ─────────────────────────────
    // Petal clusters and pot rims at the very base — rows 7.2–7.8.
    const bfL  = this.grid(0.4,  7.6);
    const bfML = this.grid(3.0,  7.2);
    const bfC2 = this.grid(5.8,  7.8);
    const bfMR = this.grid(8.4,  7.4);
    const bfR  = this.grid(11.6, 7.3);
    this.add.image(bfL.x,  bfL.y,  'k-plant-pot')
      .setOrigin(0.5, 0.90).setScale(0.80).setTint(0x3A1844).setAlpha(0.85).setDepth(601);
    this.add.image(bfML.x, bfML.y, 'k-plant-small-1')
      .setOrigin(0.5, 0.94).setScale(0.72).setTint(0xFFBBCC).setAlpha(0.80).setDepth(601);
    this.add.image(bfC2.x, bfC2.y, 'k-plant-pot')
      .setOrigin(0.5, 0.92).setScale(0.60).setTint(0x2C1038).setAlpha(0.75).setDepth(601);
    this.add.image(bfMR.x, bfMR.y, 'k-plant-small-2')
      .setOrigin(0.5, 0.90).setScale(0.68).setTint(0xFFCCDD).setAlpha(0.78).setDepth(601);
    this.add.image(bfR.x,  bfR.y,  'k-plant-pot')
      .setOrigin(0.5, 0.90).setScale(0.74).setTint(0x3A1844).setAlpha(0.85).setDepth(601);
  }

  /** Soft rose lamp pool for the aisle posts. */
  _addAisleLamp(c, r, tint, alpha, duration) {
    if (!this.textures.exists('light-blob')) return;
    const pos  = this.grid(c, r);
    const pool = this.add.image(pos.x, pos.y - 40, 'light-blob')
      .setScale(2.8, 1.4).setAlpha(alpha).setTint(tint)
      .setBlendMode('ADD').setDepth(8);
    this._aisleLampPools?.push(pool);
    this.tweens.add({
      targets:  pool,
      alpha:    { from: alpha, to: alpha * 0.28 },
      scaleX:   { from: 2.8,  to: 3.4 },
      scaleY:   { from: 1.4,  to: 1.55 },
      duration, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND DECOR — ceremonial indoor scatter
  // ═══════════════════════════════════════════════════════════════════

  buildGroundDecor() {
    // Fallen petals only — no rocks or generic outdoor decor.
    this._spawnGroundDecor({
      pool:     ['k-flower-red', 'k-flower-purple', 'k-flower-yellow'],
      density:  0.02,
      rowRange: [5.4, 6.2],
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    // Player at the entrance — about to walk the aisle
    const start = this.grid(1.5, 4.5);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male-formal' },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.32, dynamic: true,
    });

    // Aashna — standing still at the altar, no wander
    const aPos = this.grid(7.6, 4.5);
    this._aashna = this.charSystem.createFemale(aPos.x, aPos.y, { texture: 'char-female-formal' });
    this.shadows.add(this._aashna.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.28, dynamic: true,
    });
    // No wander call — she stands exactly at the altar
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FX — heart particles + cinematic reveal
  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    const W = this.worldW;
    const H = this.worldH;

    // Floating hearts — falling petals from above viewport
    if (this.textures.exists('particle-heart')) {
      this.add.particles(W / 2, H * 0.25, 'particle-heart', {
        x:         { min: -W / 2, max: W / 2 },
        speedY:    { min: 35, max: 80 },
        speedX:    { min: -6, max:  6 },
        scale:     { start: 0.11, end: 0 },
        alpha:     { start: 0.22, end: 0 },
        tint:      [0xFFAACC, 0xFF88AA, 0xFFCCDD],
        lifespan:  { min: 4000, max: 7000 },
        frequency: 280,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 50));
    }

    // Rose-gold petal shimmer
    if (this.textures.exists('particle-glow')) {
      this.add.particles(W / 2, H * 0.25, 'particle-glow', {
        x:         { min: -W / 2, max: W / 2 },
        speedY:    { min: 25, max: 60 },
        speedX:    { min: -4, max:  4 },
        scale:     { start: 0.09, end: 0 },
        alpha:     { start: 0.18, end: 0 },
        tint:      [0xFFDDBB, 0xFFCCAA, 0xFFBBAA],
        lifespan:  { min: 3000, max: 6000 },
        frequency: 280,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 48));
    }

    // ── CINEMATIC INTRO — pan right to altar, hold, pan back ─────
    // This reveals Aashna standing at the altar before giving control,
    // so the player already knows exactly where they're going.
    this._cinematic = true;
    if (this._player) this._player.sprite.setAlpha(0);

    const bars     = this.cam.letterbox(44, 1000);
    const startPos = this.grid(1.5, 4.5);
    const altarPos = this.grid(7.6, 4.5);

    this.cam.slowPan(startPos.x, startPos.y, 80, 'Linear', () => {
      // Slowly reveal the altar and Aashna
      this.cam.slowPan(altarPos.x, altarPos.y, 2600, 'Sine.easeInOut', () => {
        // Aashna revealed — soft bells accent the cinematic reveal
        audioManager._playTextureEvent?.('bells-soft');
        // Hold so player sees Aashna at the altar clearly
        this.time.delayedCall(900, () => {
          if (!this.sys?.isActive()) return;
          // Pan back to player entrance and release
          this.cam.slowPan(startPos.x, startPos.y, 2200, 'Sine.easeInOut', () => {
            bars.remove(600);
            if (this._player) this._player.sprite.setAlpha(1);
            this._cinematic = false;
            if (this._player) {
              this.cam.follow(this._player.sprite);
              this.lighting.followTarget(this._player.sprite);
            }

            this.time.delayedCall(400, () => {
              if (!this.sys?.isActive()) return;
              const lines = storyData.dialogues?.ch14_intro;
              // Unlock altar only AFTER intro is fully read — clean ordering.
              const unlock = () => this.proximity.setEnabled('altar', true);
              if (lines) this.dialogue?.start(lines, unlock);
              else unlock();
            });
          });
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION — the altar moment
  // ═══════════════════════════════════════════════════════════════════

  _onAltar() {
    this.proximity.setEnabled('altar', false);
    audioManager._playTextureEvent?.('bells-soft');
    // The biggest moment — big cinematic zoom pulse
    this.cam.zoomPulse(1.58, 1400);
    this.time.delayedCall(380, () => {
      if (!this.sys?.isActive()) return;
      audioManager.playStinger('triumph');
    });

    // Altar super-glow burst
    if (this._altarGlow) {
      this.tweens.killTweensOf(this._altarGlow);
      this.tweens.add({
        targets:  this._altarGlow,
        alpha:    0.65,
        scale:    8.0,
        duration: 600,
        yoyo:     true,
        ease:     'Quad.easeOut',
        onComplete: () => {
          if (!this.sys?.isActive()) return;
          this.tweens.add({
            targets:  this._altarGlow,
            alpha:    { from: 0.22, to: 0.07 },
            scale:    { from: 3.4,  to: 4.4 },
            duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        },
      });
    }

    // Burst of hearts at the altar
    if (this.textures.exists('particle-heart')) {
      const ap = this.grid(6.5, 4.2);
      this.add.particles(ap.x, ap.y, 'particle-heart', {
        speed:      { min: 30, max: 90 },
        scale:      { start: 0.20, end: 0 },
        alpha:      { start: 0.45, end: 0 },
        tint:       [0xFFAACC, 0xFFCCDD, 0xFFBBDD],
        lifespan:   2500,
        frequency:  45,
        quantity:   2,
        maxParticles: 32,
        blendMode:  'ADD',
      }).setDepth(this.layers.depth('fx', 60));
    }

    const lines = storyData.dialogues?.ch14_wedding;
    if (lines) {
      this.dialogue?.start(lines, () => {
        if (!this.sys?.isActive()) return;
        this._chapterComplete();
      });
    }
  }

  _chapterComplete() {
    this._guardTransition(() => {
      goToChapter(this, 14);
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
    audioManager.fadeOutAll(600);
    this.tweens.killTweensOf(this._roseWash);
    this.tweens.killTweensOf(this._glowOuter);
    this.tweens.killTweensOf(this._aashnaGlow);
    this.tweens.killTweensOf(this._altarGlow);
    this.tweens.killTweensOf(this._glowInner);
    this._aisleLampPools?.forEach(p => this.tweens.killTweensOf(p));
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
