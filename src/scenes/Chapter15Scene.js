import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';
import { audioManager } from '../utils/helpers.js';

/**
 * Chapter15Scene — "4 Years & Counting"
 *
 * The Final Chapter. A near-empty void of soft, concentric rose light.
 * No rooms, no furniture — only warmth radiating from the centre where
 * Aashna waits. Prawal walks left-to-right through a trail of
 * anniversary flowers toward her. When they meet, the story ends.
 *
 * Spatial logic (12 × 8, cell 64px → 768 × 512):
 *
 *   LEFT   (cols 0–3):  player start, cool blue glow, first flower
 *   CENTRE (cols 3–8):  flower trail, concentric rings, warm light
 *   RIGHT  (cols 8–12): Aashna, small garden, silhouette trees
 *
 *   TRAIL:       red (2.2, 5.2) → purple (3.8, 5.0) → yellow (5.4, 5.2)
 *   INTERACTABLE: flower-yellow (6.6, 5.2) → ch15_finale → finale
 *   Aashna:      (7.6, 4.5) — no wander, standing in the light
 *
 *   CINEMATIC: slowPan right 2200ms → hold 600ms → slowPan back 1800ms
 *   Physics:   open-air (64, 64, W-128, H-128)
 *   Zoom:      1.72 → 1.80, followLerp 0.030 (dreamlike pace)
 */
export class Chapter15Scene extends ChapterScene {
  constructor() {
    super('Chapter15', {
      cols:        12,
      rows:        8,
      mood:        'romantic',
      zoom:        1.72,
      targetZoom:  1.80,
      followLerp:  0.030,
      drift:       false,
      fadeInMs:    2400,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — rose-violet void with concentric glow rings
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // ── DARK — rose-void, final chapter. DarkEnvironment spotlight
    // follows player; Ch15's concentric rings emanate from Aashna.
    this.env = EnvironmentManager.apply(this, 'DARK', {
      void:           { color: 0x060400 },
      bgGlow:         { tint: 0x1A0A00, alpha: 0.12, scaleX: 14, scaleY: 8 },
      floor:          { topColor: 0x120800, botColor: 0x040100, startFrac: 0.58 },
      // Spotlight (player-following): warm honey gold — Ch14 was rose ceremony,
      // Ch15 is the GOLDEN FOREVER. Rose became gold over four years.
      spotlightOuter: { tint: 0xBB8833, alpha: 0.08, scaleX: 6.0, scaleY: 3.5 },
      spotlightMid:   { tint: 0xDDAA55, alpha: 0.09, scaleX: 3.0, scaleY: 1.8 },
      spotlightCore:  { tint: 0xFFEEAA, alpha: 0.14, scaleX: 1.5, scaleY: 0.9 },
      groundPool:     { tint: 0xFFCC88, alpha: 0.16, scaleX: 4.2, scaleY: 0.9 },
      vignette:       { size: 110, color: 0x080400, alphaL: 0.80, alphaR: 0.80, alphaT: 0.80, alphaB: 0.80 },
      colorGrade:     { color: 0xFFCC66, alpha: 0.025, blend: 'OVERLAY' },
      filmGrain:      { alpha: 0.038 },
      bgSilhouettes:  { tint: 0x2A1020, alpha: 0.28 },
    });

    // ── Concentric glow rings centred on Aashna ─────────────────────
    const { x: cx, y: cy } = this.grid(7.6, 5.0);
    this._rings = [];
    const ringDefs = [
      { scale: 9.0, alpha: 0.04, tint: 0x2A1400, dur: 5200 },
      { scale: 6.2, alpha: 0.06, tint: 0x7A4400, dur: 4400 },
      { scale: 4.0, alpha: 0.09, tint: 0xCC8822, dur: 3600 },
      { scale: 2.2, alpha: 0.14, tint: 0xFFCC66, dur: 2800 },
      { scale: 1.0, alpha: 0.22, tint: 0xFFEECC, dur: 2000 },
    ];
    ringDefs.forEach((rd, i) => {
      const ring = this.add.image(cx, cy, 'light-blob')
        .setScale(rd.scale).setAlpha(rd.alpha).setTint(rd.tint)
        .setBlendMode('ADD').setDepth(-10 + i);
      this.tweens.add({
        targets:  ring,
        scale:    rd.scale * 1.12,
        alpha:    rd.alpha * 0.55,
        duration: rd.dur,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay:    i * 200,
      });
      this._rings.push(ring);
    });

    // ── Cool atmospheric haze — "alone in the cold" ─────────────────
    // Wide blue-violet zone fills the left third so the cold→warm colour
    // journey reads immediately when the scene fades in.
    const { x: px, y: py } = this.grid(1.5, 5.0);
    this.add.image(px, py, 'light-blob')
      .setScale(7.0, 4.0).setAlpha(0.10).setTint(0x6688FF)
      .setBlendMode('ADD').setDepth(-8);
    // Lavender bridge — where cold and warm atmospheres meet
    const { x: lx, y: ly } = this.grid(4.5, 5.0);
    this.add.image(lx, ly, 'light-blob')
      .setScale(4.5, 2.5).setAlpha(0.05).setTint(0x8855CC)
      .setBlendMode('ADD').setDepth(-8);

    // ── Warm glow stepping stones along the flower path ────────────
    // Three floor pools between player and Aashna — lit-aisle effect.
    // Tint 0xFFDD88 (bright warm gold) at alpha 0.32 cuts through the
    // amber background to be clearly visible as discrete light patches.
    this._stones = [];
    for (const [col, dur, delay] of [[2.5, 3200, 0], [4.0, 2800, 400], [5.5, 3600, 800]]) {
      const sp = this.grid(col, 5.2);
      const stone = this.add.image(sp.x, sp.y + 22, 'light-blob')
        .setScale(3.2, 0.9).setAlpha(0.16).setTint(0xFFDD88)
        .setBlendMode('ADD').setDepth(-2);
      this._stones.push(stone);
      this.tweens.add({
        targets:  stone,
        alpha:    { from: 0.16, to: 0.07 },
        scaleX:   { from: 3.2, to: 3.8 },
        duration: dur, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay,
      });
    }

    // ── Ground mist ribbons — cinematic floor dimension ──────────────
    // Three very flat light-blob strips at row 5.8 give the void floor
    // physical presence — characters feel grounded, not floating.
    this._mists = [];
    [
      { col: 2.0, alpha: 0.08, dur: 8000, delay:    0 },
      { col: 5.5, alpha: 0.10, dur: 6500, delay: 1200 },
      { col: 9.0, alpha: 0.08, dur: 7200, delay: 2800 },
    ].forEach(m => {
      const mp = this.grid(m.col, 5.8);
      const mist = this.add.image(mp.x, mp.y, 'light-blob')
        .setScale(8.0, 0.35).setAlpha(m.alpha).setTint(0xFFEECC)
        .setBlendMode('ADD').setDepth(12);
      this._mists.push(mist);
      this.tweens.add({
        targets: mist, alpha: { from: m.alpha, to: m.alpha * 0.35 },
        duration: m.dur, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: m.delay,
      });
    });

    // ── FLOOR VARIATION BANDS — break uniform void gradient, depth -57 ─
    // DarkEnvironment renders a simple topColor→botColor ramp starting at
    // 58% world height (~row 4.6). These graphics bands add lateral +
    // depth-axis variation so the void reads as layered rather than flat.
    // All adapt to the 0xFFCC66 OVERLAY colorGrade automatically.
    const W  = this.worldW;
    const H  = this.worldH;
    const cs = this.cellSize ?? 64;

    const gfxVoid = this.add.graphics().setDepth(-57);
    // Near-wall strip — extra darkness at the ceiling/floor seam
    gfxVoid.fillStyle(0x030100, 0.30);
    gfxVoid.fillRect(0, 4.6 * cs, W, cs * 0.55);
    // Mid-floor amber warmth — echoes the stepping-stone glow
    gfxVoid.fillStyle(0x4A2800, 0.07);
    gfxVoid.fillRect(0, 5.0 * cs, W, cs * 1.2);
    // Lower void darkening — far corners read deeper / further
    gfxVoid.fillStyle(0x010008, 0.14);
    gfxVoid.fillRect(0, 6.3 * cs, W, cs * 1.7);

    // ── LATERAL EDGE SHADOWS — depth -56 ──────────────────────────────
    const gfxEdge = this.add.graphics().setDepth(-56);
    gfxEdge.fillStyle(0x020000, 0.32);
    gfxEdge.fillRect(0,            4.5 * cs, cs * 1.4, H - 4.5 * cs);
    gfxEdge.fillRect(W - cs * 1.4, 4.5 * cs, cs * 1.4, H - 4.5 * cs);

    // ── FLOOR DECALS — depth -55 ──────────────────────────────────────
    // k-floor-corner / k-floor-half at alpha 0.06–0.09 add subliminal
    // surface complexity without breaking the void aesthetic.
    // OVERLAY colorGrade (0xFFCC66) shifts them golden automatically.
    const _decals15 = [
      { tx: 'k-floor-corner', c:  1.4, r: 4.8, sc: 0.52, tint: 0x2A1400, alpha: 0.09 },
      { tx: 'k-floor-half',   c:  4.2, r: 4.6, sc: 0.60, tint: 0x1A0A00, alpha: 0.07 },
      { tx: 'k-floor-corner', c:  6.8, r: 5.1, sc: 0.48, tint: 0x2A1400, alpha: 0.08 },
      { tx: 'k-floor-half',   c:  9.5, r: 4.7, sc: 0.56, tint: 0x1A0A00, alpha: 0.07 },
      { tx: 'k-floor-corner', c:  2.8, r: 5.8, sc: 0.42, tint: 0x200E00, alpha: 0.06 },
      { tx: 'k-floor-half',   c:  7.8, r: 5.6, sc: 0.46, tint: 0x1A0A00, alpha: 0.06 },
    ];
    for (const d of _decals15) {
      if (!this.textures.exists(d.tx)) continue;
      const dp = this.grid(d.c, d.r);
      this.add.image(dp.x, dp.y, d.tx)
        .setOrigin(0.5, 0.9).setScale(d.sc)
        .setTint(d.tint).setAlpha(d.alpha).setDepth(-55);
    }

    // ── COLD→WARM FLOOR WASH — story journey in light, depth -53, ADD ─
    // Player walks cold left → warm right toward Aashna. Three floor
    // ellipses mirror that arc in the ground plane — the floor itself
    // reflects the emotional journey. ADD blend accumulates with the
    // existing mist ribbons and stepping stones without clipping.
    if (this.textures.exists('light-blob')) {
      const { x: fw1x, y: fw1y } = this.grid(1.5, 5.5);
      this.add.image(fw1x, fw1y, 'light-blob')
        .setScale(5.0, 0.65).setAlpha(0.06).setTint(0x4455CC)
        .setBlendMode('ADD').setDepth(-53);
      const { x: fw2x, y: fw2y } = this.grid(5.0, 5.4);
      this.add.image(fw2x, fw2y, 'light-blob')
        .setScale(5.5, 0.70).setAlpha(0.05).setTint(0xCC8833)
        .setBlendMode('ADD').setDepth(-53);
      const { x: fw3x, y: fw3y } = this.grid(7.6, 5.3);
      this.add.image(fw3x, fw3y, 'light-blob')
        .setScale(4.5, 0.60).setAlpha(0.08).setTint(0xFFCC66)
        .setBlendMode('ADD').setDepth(-53);
    }

    // ── Bokeh memory orbs — atmospheric void depth ────────────────────
    // Five very faint large blobs breathing at ultra-slow rates.
    // At these alphas they are felt not seen — subconscious depth layers.
    this._orbs = [];
    [
      { col:  0.8, row: 3.5, scale: 4.8, alpha: 0.05, tint: 0xAA6633, dur: 14000, delay:    0 },
      { col:  3.2, row: 2.8, scale: 3.8, alpha: 0.04, tint: 0xFF8844, dur: 18000, delay: 2200 },
      { col:  5.8, row: 3.2, scale: 5.2, alpha: 0.04, tint: 0xCC7722, dur: 16000, delay: 4400 },
      { col:  9.4, row: 2.6, scale: 3.6, alpha: 0.05, tint: 0xFF9933, dur: 12000, delay: 1800 },
      { col: 11.0, row: 3.8, scale: 4.2, alpha: 0.04, tint: 0xAA5522, dur: 20000, delay: 3600 },
    ].forEach(b => {
      const bp = this.grid(b.col, b.row);
      const orb = this.add.image(bp.x, bp.y, 'light-blob')
        .setScale(b.scale).setAlpha(b.alpha * 0.5).setTint(b.tint)
        .setBlendMode('ADD').setDepth(-15);
      this._orbs.push(orb);
      this.tweens.add({
        targets: orb, alpha: b.alpha, scale: b.scale * 1.08, y: bp.y - 18,
        duration: b.dur, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: b.delay,
      });
    });

    // ── Three-layer glow centred on Aashna ──────────────────────────
    this.add.image(cx, cy, 'light-blob')
      .setScale(7.5).setAlpha(0.07).setTint(0xFF88CC)
      .setBlendMode('ADD').setDepth(-6);
    this._centreGlow = this.add.image(cx, cy, 'light-blob')
      .setScale(3.4).setAlpha(0.12).setTint(0xFFBBDD)
      .setBlendMode('ADD').setDepth(-5);
    this.add.image(cx, cy, 'light-blob')
      .setScale(1.5).setAlpha(0.15).setTint(0xFFEEF4)
      .setBlendMode('ADD').setDepth(-4);
    this.tweens.add({
      targets:  this._centreGlow,
      scale:    3.8, alpha: 0.16,
      duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── Room-filling Aashna halo — destination signal ─────────────────
    // Covers ~2/3 of the world width at alpha 0.03 — subliminally draws
    // the player right even before they see Aashna clearly.
    this.add.image(cx, cy, 'light-blob')
      .setScale(10.0, 5.5).setAlpha(0.03).setTint(0xFFCC66)
      .setBlendMode('ADD').setDepth(-9);

    // ── Aashna radiance corona — barely-perceptible breath ring ─────
    // Near-invisible line that pulses to a max alpha of 0.35 — felt not seen.
    // A solid 0.55-alpha stroke looked like a UI graphic; this is presence.
    this._corona = this.add.graphics().setDepth(8).setAlpha(0);
    this._corona.lineStyle(1.2, 0xFFDD88, 0.30);
    this._corona.strokeEllipse(cx, cy, 172, 64);
    this.tweens.add({
      targets:  this._corona,
      alpha:    { from: 0, to: 0.40 },
      duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — silhouette trees + flower trail + anniversary interactable
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    // ╔══════════════════════════════════════════════════════════════════╗
    // ║  LAYER 1 — Back silhouette trees (rows 2.8–3.8)                ║
    // ║  Staggered Y across a 1-row band — no two share the same row    ║
    // ╚══════════════════════════════════════════════════════════════════╝

    // LEFT bank — proper side-view tree silhouettes framing the void.
    // foliage-tree2/4/5 are quarter-view pyramids (pink at runtime) — replaced
    // with k-tree-* which are correct side-scroll silhouettes. Scale reduced so
    // the void reads minimal; tints kept very dark to stay atmospheric.
    const tL1 = this.placeAt(0.3,  2.8, 'k-tree-fat',      { scale: 0.24, ySort: false });
    if (tL1) { tL1.setTint(0x2A1018).setAlpha(0.82).setDepth(-14); }
    const tL2 = this.placeAt(1.4,  3.6, 'k-tree-detailed',  { scale: 0.20, ySort: false });
    if (tL2) { tL2.setTint(0x241230).setAlpha(0.72).setDepth(-13); }
    const tL3 = this.placeAt(2.2,  3.0, 'k-tree-oak',       { scale: 0.18, ySort: false });
    if (tL3) { tL3.setTint(0x2A1018).setAlpha(0.65).setDepth(-12); }

    // Centre sentinels — slender oaks, staggered: left 3.2, right 3.8
    const tC1 = this.placeAt(3.6,  3.2, 'k-tree-oak',       { scale: 0.14, ySort: false });
    if (tC1) { tC1.setTint(0x201028).setAlpha(0.60).setDepth(-11); }
    const tC2 = this.placeAt(8.2,  3.8, 'k-tree-oak',       { scale: 0.14, ySort: false });
    if (tC2) { tC2.setTint(0x201028).setAlpha(0.60).setDepth(-11); }

    // RIGHT bank — mirror of left
    const tR1 = this.placeAt(9.8,  3.0, 'k-tree-oak',       { scale: 0.18, ySort: false });
    if (tR1) { tR1.setTint(0x2A1018).setAlpha(0.65).setDepth(-12); }
    const tR2 = this.placeAt(10.8, 2.8, 'k-tree-detailed',  { scale: 0.20, ySort: false });
    if (tR2) { tR2.setTint(0x241230).setAlpha(0.72).setDepth(-13); }
    const tR3 = this.placeAt(11.7, 3.5, 'k-tree-fat',       { scale: 0.24, ySort: false });
    if (tR3) { tR3.setTint(0x2A1018).setAlpha(0.82).setDepth(-14); }

    // ── Anniversary flower trail — zigzag leading to Aashna ──────────
    // Was: all five at exact row 5.2 — perfect horizontal line.
    // Now: staggered 4.8–5.4 so each bloom sits on a distinct Y.
    this.placeAt(2.0, 5.1, 'k-flower-red',    { scale: 0.60, layer: 'midground' });
    this.placeAt(3.2, 4.8, 'k-flower-purple', { scale: 0.60, layer: 'midground' });
    this.placeAt(4.4, 5.4, 'k-flower-yellow', { scale: 0.60, layer: 'midground' });
    this.placeAt(5.6, 4.9, 'k-flower-red',    { scale: 0.60, layer: 'midground' });
    this.placeAt(6.4, 5.3, 'k-flower-purple', { scale: 0.60, layer: 'midground' });

    // ── Small warm garden behind Aashna — staggered rows 4.8–5.8 ────
    // Was: rows 5.0/5.2/5.0 and only 3 props. Extended and staggered.
    this.placeAt(8.2,  5.0, 'k-flower-red',    { scale: 0.46, layer: 'midground' });
    this.placeAt(9.0,  5.5, 'k-flower-purple', { scale: 0.44, layer: 'midground' });
    this.placeAt(9.6,  4.8, 'k-bush-small',    { scale: 0.46, layer: 'midground' });
    this.placeAt(8.6,  5.8, 'k-flower-yellow', { scale: 0.38, layer: 'midground' });
    this.placeAt(10.4, 5.2, 'k-flower-red',    { scale: 0.40, layer: 'midground' });

    // ── The anniversary interactable — final walk to her ─────────────
    // Disabled until intro dialogue completes so a held key cannot
    // fire the finale before the player has read the opening lines.
    this.placeInteractable(6.6, 5.2, 'k-flower-yellow', {
      id:           'forever',
      label:        'Happy Anniversary',
      triggerRadius: 72,
      glowRadius:   200,
      enabled:      false,
      skipUnlockSFX: true,
      onTrigger:    () => this._onForever(),
    }, { scale: 0.40 });

    // ── Emote above Aashna — hearts only, one message ────────────────
    const ep = this.grid(7.6, 3.6);
    this._addEmote(ep.x, ep.y, 'emote-hearts', { scale: 0.30, delay: 0 });

    // ── PLAYER-PATH OCCLUSION — Y-sorted, rows 5.3–5.6 ─────────────
    // Player walks rows 4.5–5.2. Dark silhouette foliage at rows 5.3–5.6
    // always renders in front — 2.5D depth in the void.
    // Gap at cols 7.0–9.0 keeps Aashna (col 7.6, row 5.0) unobstructed.
    const ppB1 = this.placeAt(0.8, 5.4, 'k-bush-small', {
      scale: 0.55, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.08 },
    });
    if (ppB1) ppB1.setTint(0x3A1828);

    const ppT1 = this.placeAt(2.4, 5.5, 'k-plant-flat-tall', {
      scale: 0.48, shadow: { width: 8, height: 2, offsetY: 3, alpha: 0.07 },
    });
    if (ppT1) ppT1.setTint(0x4A2438);

    const ppB2 = this.placeAt(4.2, 5.3, 'k-bush', {
      scale: 0.52, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.08 },
    });
    if (ppB2) ppB2.setTint(0x381420);

    const ppT2 = this.placeAt(5.8, 5.5, 'k-plant-flat-tall', {
      scale: 0.50, shadow: { width: 8, height: 2, offsetY: 3, alpha: 0.07 },
    });
    if (ppT2) ppT2.setTint(0x4C2048);

    const ppB3 = this.placeAt(9.4, 5.4, 'k-bush-small', {
      scale: 0.55, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.08 },
    });
    if (ppB3) ppB3.setTint(0x3A1828);

    const ppT3 = this.placeAt(10.8, 5.3, 'k-plant-flat-tall', {
      scale: 0.48, shadow: { width: 8, height: 2, offsetY: 3, alpha: 0.07 },
    });
    if (ppT3) ppT3.setTint(0x4A2438);

    const ppB4 = this.placeAt(11.6, 5.5, 'k-bush', {
      scale: 0.52, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.08 },
    });
    if (ppB4) ppB4.setTint(0x381420);

    // ── LOWER SCATTER — rows 5.8–6.5 ────────────────────────────────
    // Anniversary petals fallen in the void — warm accent colour vs dark bg.
    this.placeAt(1.0,  6.1, 'k-flower-red',    { scale: 0.34 });
    this.placeAt(3.4,  6.4, 'k-flower-purple', { scale: 0.36 });
    this.placeAt(5.2,  6.0, 'k-flower-yellow', { scale: 0.34 });
    this.placeAt(7.8,  6.3, 'k-flower-red',    { scale: 0.36 });
    this.placeAt(10.0, 6.0, 'k-flower-purple', { scale: 0.34 });
    const lsB = this.placeAt(11.6, 6.4, 'k-bush-small', { scale: 0.38 });
    if (lsB) lsB.setTint(0x4A2438);

    // ── MID-FOREGROUND OCCLUSION — Y-sorted, rows 6.7–7.1 ───────────
    // Heavier dark silhouettes at near-camera distance.
    const mfB1 = this.placeAt(0.6, 7.0, 'k-bush', {
      scale: 0.58, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.07 },
    });
    if (mfB1) mfB1.setTint(0x381420);

    const mfT1 = this.placeAt(3.2, 6.8, 'k-plant-flat-tall', {
      scale: 0.52, shadow: { width: 8, height: 2, offsetY: 3, alpha: 0.06 },
    });
    if (mfT1) mfT1.setTint(0x4A2438);

    const mfB2 = this.placeAt(6.0, 7.1, 'k-bush-small', {
      scale: 0.54, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.07 },
    });
    if (mfB2) mfB2.setTint(0x3A1828);

    const mfT2 = this.placeAt(9.0, 6.9, 'k-plant-flat-tall', {
      scale: 0.50, shadow: { width: 8, height: 2, offsetY: 3, alpha: 0.06 },
    });
    if (mfT2) mfT2.setTint(0x4A2438);

    const mfB3 = this.placeAt(11.2, 7.0, 'k-bush', {
      scale: 0.56, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.07 },
    });
    if (mfB3) mfB3.setTint(0x381420);

    // ── BOTTOM-EDGE FRAMERS — depth 601 ─────────────────────────────
    // Dark void foliage at screen bottom — player never reaches row 7.3+.
    const bf1 = this.grid(0.2,  7.5);
    const bf2 = this.grid(2.8,  7.3);
    const bf3 = this.grid(5.6,  7.7);
    const bf4 = this.grid(8.8,  7.4);
    const bf5 = this.grid(11.4, 7.6);
    this.add.image(bf1.x, bf1.y, 'k-bush')
      .setOrigin(0.5, 0.92).setScale(0.82).setTint(0x2A1020).setAlpha(0.88).setDepth(601);
    this.add.image(bf2.x, bf2.y, 'k-plant-flat-tall')
      .setOrigin(0.5, 0.90).setScale(0.74).setTint(0x381420).setAlpha(0.82).setDepth(601);
    this.add.image(bf3.x, bf3.y, 'k-bush-small')
      .setOrigin(0.5, 0.94).setScale(0.70).setTint(0x2A1020).setAlpha(0.78).setDepth(601);
    this.add.image(bf4.x, bf4.y, 'k-bush')
      .setOrigin(0.5, 0.90).setScale(0.76).setTint(0x381420).setAlpha(0.84).setDepth(601);
    this.add.image(bf5.x, bf5.y, 'k-plant-flat-tall')
      .setOrigin(0.5, 0.92).setScale(0.72).setTint(0x2A1020).setAlpha(0.80).setDepth(601);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND DECOR — void ambient scatter
  // ═══════════════════════════════════════════════════════════════════

  buildGroundDecor() {
    // DARK void — sparse flower petals only; no rocks or generic outdoor decor.
    this._spawnGroundDecor({
      pool:     ['k-flower-red', 'k-flower-purple', 'k-flower-yellow'],
      density:  0.015,
      rowRange: [5.6, 6.4],
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    const start = this.grid(1.5, 5.0);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male-formal' },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.20, dynamic: true,
    });

    // Aashna — standing still in the light, heart of everything
    // Row 5.0 places her on the same ground plane as the flower trail
    const aPos = this.grid(7.6, 5.0);
    this._aashna = this.charSystem.createFemale(aPos.x, aPos.y, { texture: 'char-female-formal' });
    this.shadows.add(this._aashna.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.22, dynamic: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);
    const W = this.worldW;  // 768
    const H = this.worldH;  // 512

    // ── Ethereal sparkles drifting through the void ──────────────────
    if (this.textures.exists('particle-glow')) {
      this.add.particles(W / 2, H / 2, 'particle-glow', {
        x: { min: -W / 2, max: W / 2 },
        y: { min: -H / 2, max: H / 2 },
        speedY: { min: -3, max: 3 }, speedX: { min: -3, max: 3 },
        scale: { start: 0.08, end: 0 }, alpha: { start: 0.14, end: 0 },
        tint: [0xFFDDEE, 0xCCBBFF, 0xFFAACC],
        lifespan: { min: 5000, max: 9000 },
        frequency: 220, quantity: 1, blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 50));
    }

    // ── Rising hearts — gentle, sparse, hopeful ──────────────────────
    if (this.textures.exists('particle-heart')) {
      this.add.particles(W / 2, H * 0.9, 'particle-heart', {
        x: { min: -W / 3, max: W / 3 },
        speedY: { min: -7, max: -2 }, speedX: { min: -2, max: 2 },
        scale: { start: 0.10, end: 0 }, alpha: { start: 0.16, end: 0 },
        tint: [0xFFAACC, 0xFFDDEE],
        lifespan: { min: 6000, max: 11000 },
        frequency: 700, quantity: 1, blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 52));
    }

    // ── Golden anniversary petals — screen-fixed, always visible ────────
    // setScrollFactor(0): emitter stays centred on screen regardless of
    // where the player is — petals fall across the full viewport at all times.
    if (this.textures.exists('particle-petal')) {
      const vW = this.scale.width;
      this.add.particles(vW / 2, -10, 'particle-petal', {
        x:        { min: -vW / 2, max: vW / 2 },
        speedY:   { min: 12, max: 28 },
        speedX:   { min: -8, max: 8 },
        scale:    { start: 0.38, end: 0.10 },
        alpha:    { start: 0.42, end: 0 },
        rotate:   { min: 0, max: 360 },
        tint:     [0xFFCC88, 0xFFBB66, 0xFFDD99, 0xFFAA55],
        lifespan: { min: 5000, max: 9000 },
        frequency: 600, quantity: 1, blendMode: 'ADD',
      }).setScrollFactor(0).setDepth(this.layers.depth('fx', 53));
    }

    // ── Golden star sparkles — screen-fixed ambient twinkle ─────────────
    // setScrollFactor(0): stars always cover the full screen regardless
    // of camera position — player walking to Aashna still sees them.
    // Scale reduced to 0.09 so they read as delicate sparkle, not shapes.
    if (this.textures.exists('particle-star-k')) {
      this.add.particles(this.scale.width / 2, H * 0.28, 'particle-star-k', {
        x:         { min: -this.scale.width / 2, max: this.scale.width / 2 },
        y:         { min: -H * 0.1, max: H * 0.4 },
        speedY:    { min: 5, max: 16 },
        speedX:    { min: -4, max: 4 },
        scale:     { start: 0.09, end: 0 },
        alpha:     { start: 0.18, end: 0 },
        tint:      [0xFFCC44, 0xFFEE88, 0xFFAA22, 0xFFDD66],
        rotate:    { min: 0, max: 360 },
        lifespan:  { min: 4500, max: 9000 },
        frequency: 380, quantity: 1, blendMode: 'ADD',
      }).setScrollFactor(0).setDepth(this.layers.depth('fx', 55));
    }

    // ── CINEMATIC — pan right to show Aashna, then return ────────────
    this._cinematic = true;
    this._player.sprite.setAlpha(0);
    const bars  = this.cam.letterbox(36, 1200);
    const aPos  = this.grid(7.6, 5.0);
    // FIX: slowPan signature is (x, y, duration, ease, onComplete).
    // Previously the callbacks were in the ease slot (4th arg) — onComplete
    // was never called, leaving _cinematic=true and the scene permanently stuck.
    this.cam.slowPan(aPos.x, aPos.y, 2200, 'Sine.easeInOut', () => {
      // Aashna revealed in the golden void — sparkle accent on arrival
      audioManager._playTextureEvent?.('sparkle-chime');
      this.time.delayedCall(600, () => {
        if (!this.sys?.isActive()) return;
        this.cam.slowPan(this._player.sprite.x, this._player.sprite.y, 1800, 'Sine.easeInOut', () => {
          bars.remove(900);
          this._player.sprite.setAlpha(1);
          this.cam.follow(this._player.sprite, 0.030, 0.030);
          this.lighting.followTarget(this._player.sprite);
          this._cinematic = false;
          this.time.delayedCall(400, () => {
            if (!this.sys?.isActive()) return;
            const lines = storyData.dialogues?.ch15_intro;
            // Unlock forever only after player reads the intro.
            const unlock = () => this.proximity.setEnabled('forever', true);
            if (lines) this.dialogue?.start(lines, unlock);
            else unlock();
          });
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION — the final forever moment
  // ═══════════════════════════════════════════════════════════════════

  _onForever() {
    this.proximity.setEnabled('forever', false);
    audioManager._playTextureEvent?.('sparkle-chime');
    this.cam.zoomPulse(1.62, 1400);
    this.time.delayedCall(380, () => {
      if (!this.sys?.isActive()) return;
      audioManager.playStinger('triumph');
    });

    // All rings surge bright in sequence
    this._rings.forEach((ring, i) => {
      this.tweens.killTweensOf(ring);
      this.tweens.add({
        targets:  ring,
        alpha:    Math.min(ring.alpha * 3.5, 0.70),
        scale:    ring.scaleX * 1.35,
        duration: 800 + i * 80,
        yoyo: true, ease: 'Quad.easeOut',
      });
    });

    // Burst of hearts
    if (this.textures.exists('particle-heart')) {
      const { x: bx, y: by } = this.grid(7.0, 5.0);
      this.add.particles(bx, by, 'particle-heart', {
        speed:  { min: 18, max: 55 },
        scale:  { start: 0.16, end: 0 },
        alpha:  { start: 0.35, end: 0 },
        tint:   [0xFFAACC, 0xFFDDEE, 0xFFBBDD, 0xFFCCEE],
        lifespan: 3500, frequency: 40, quantity: 2, maxParticles: 40,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 60));
    }

    const lines = storyData.dialogues?.ch15_finale;
    if (lines) this.dialogue?.start(lines, () => {
      if (!this.sys?.isActive()) return;
      this._showFinalMessage();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FINALE — the game's closing screen
  // ═══════════════════════════════════════════════════════════════════

  _showFinalMessage() {
    if (this._finaleStarted) return;
    this._finaleStarted = true;
    // Story is complete — clear saved chapter progress so the Continue button
    // does not appear on the main menu after the player has finished the game.
    try { localStorage.removeItem('prawal-aashna-chapter'); } catch (_) {}

    const SW = this.scale.width;
    const SH = this.scale.height;
    const cx = SW / 2;
    const cy = SH / 2;

    if (this.cameras.main.zoom < 1.79) this.cam.slowZoom(1.80, 4000);

    // ── 0. Void backdrop — fades over the game world ─────────────────
    // Depth 9400: above all game content (max depth ~999), below card UI.
    const bgv = this.add.graphics().setScrollFactor(0).setDepth(9400);
    bgv.fillStyle(0x020005, 1);
    bgv.fillRect(0, 0, SW, SH);
    bgv.setAlpha(0);
    this.tweens.add({ targets: bgv, alpha: 1, duration: 2200, ease: 'Sine.easeIn' });

    // ── 1. Deterministic bokeh star-field ────────────────────────────
    // Appears as bg fades in — same algorithm as MainMenuScene._buildShimmer.
    this.time.delayedCall(300, () => {
      if (!this.sys?.isActive()) return;
      const stars = this.add.graphics().setScrollFactor(0).setDepth(9450);
      stars.setAlpha(0);
      for (let i = 0; i < 52; i++) {
        const sx = ((i * 137 + 29) % (SW - 20)) + 10;
        const sy = ((i * 97  + 53) % Math.floor(SH * 0.68));
        stars.fillStyle(0xFFEECC, 0.10 + (i % 5) * 0.055);
        stars.fillCircle(sx, sy, 0.4 + (i % 4) * 0.35);
      }
      const acc = [[120,40],[380,22],[640,50],[820,32],[240,76],[700,20],[510,62]];
      for (let [sx, sy] of acc) {
        sx = Math.min(sx, SW - 10);
        stars.fillStyle(0xFFDDBB, 0.55);
        stars.fillCircle(sx, sy, 1.2);
      }
      this.tweens.add({ targets: stars, alpha: 1, duration: 1400, ease: 'Sine.easeIn' });
    });

    // ── 2. Ambient rose-gold orb behind card ─────────────────────────
    this.time.delayedCall(500, () => {
      if (!this.sys?.isActive()) return;
      if (!this.textures.exists('light-blob')) return;
      this._finaleOrb = this.add.image(cx, cy, 'light-blob')
        .setScale(7.5).setAlpha(0).setTint(0xFF9ABB)
        .setBlendMode('ADD').setScrollFactor(0).setDepth(9460);
      this.tweens.add({ targets: this._finaleOrb, alpha: 0.09, duration: 2000, ease: 'Sine.easeIn' });
      this.tweens.add({
        targets: this._finaleOrb, scaleX: 8.2, scaleY: 8.2, alpha: 0.06,
        duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 2200,
      });
    });

    // ── 3. Vignette ──────────────────────────────────────────────────
    this.time.delayedCall(700, () => {
      if (!this.sys?.isActive()) return;
      if (!this.textures.exists('vignette')) return;
      const vig = this.add.image(cx, cy, 'vignette')
        .setScrollFactor(0).setScale(1.12).setAlpha(0)
        .setTint(0xBB88AA).setDepth(9470);
      this.tweens.add({ targets: vig, alpha: 0.72, duration: 1800, ease: 'Sine.easeIn' });
    });

    // ── 4. Card + all content ─────────────────────────────────────────
    // Delayed 1400ms so the void + stars are clearly visible first.
    this.time.delayedCall(1400, () => {
      if (!this.sys?.isActive()) return;
      const finalMsg = storyData.finalMessage || 'Happy Anniversary \u2764';
      const btnLabel = storyData.finalButton  || 'Play Again';

      // ── Adaptive layout for mobile landscape ───────────────────────
      // On small phones (h < 430 CSS px) the desktop card (276px tall, 22px
      // fonts) consumes >70% of the screen. Scale both geometry and type.
      const isMobLandscape = SW > SH && SH < 430;
      const cardW    = isMobLandscape ? Math.min(SW - 32, 380) : 480;
      const of       = isMobLandscape ? 0.65 : 1.0; // offset scale factor

      const titleY   = cy - Math.round(112 * of);
      const ornTopY  = cy - Math.round(78  * of);
      const msgY     = cy - Math.round(26  * of);
      const ornBotY  = cy + Math.round(26  * of);
      const dateY    = cy + Math.round(52  * of);
      const btnY     = cy + Math.round(100 * of);
      const cardTop  = titleY - Math.round(24 * of);
      const cardH    = btnY + Math.round(40 * of) - cardTop;
      const cardX    = cx - cardW / 2;

      const titleFontSize = isMobLandscape ? '11px' : '14px';
      const msgFontSize   = isMobLandscape ? '15px' : '22px';
      const dateFontSize  = isMobLandscape ? '9px'  : '11px';
      const btnFontSize   = isMobLandscape ? '13px' : '16px';
      const msgWrapW      = cardW - (isMobLandscape ? 32 : 64);
      const cardRadius    = isMobLandscape ? 18 : 26;
      const btnW          = isMobLandscape ? 190 : 220;
      const btnH          = isMobLandscape ? 38  : 46;

      const pin = (o) => o.setScrollFactor(0);

      // ── Frosted-glass card — mirrors MainMenuScene card style ──────
      const card = pin(this.add.graphics().setDepth(9490));
      card.fillStyle(0x04000A, 0.88);
      card.fillRoundedRect(cardX, cardTop, cardW, cardH, cardRadius);
      card.lineStyle(1.5, 0xCC7090, 0.60);
      card.strokeRoundedRect(cardX, cardTop, cardW, cardH, cardRadius);
      card.lineStyle(1, 0xFF99BB, 0.18);
      card.strokeRoundedRect(cardX + 3, cardTop + 3, cardW - 6, cardH - 6, cardRadius - 2);
      card.fillStyle(0xFFCCDD, 0.05);
      card.fillRoundedRect(cardX + 4, cardTop + 4, cardW - 8, 20, { tl: cardRadius - 3, tr: cardRadius - 3, bl: 0, br: 0 });
      card.setAlpha(0);

      // ── Ornamental dividers ────────────────────────────────────────
      const ornTop = pin(this.add.graphics().setDepth(9500));
      this._drawFinalOrnament(ornTop, cx, ornTopY);
      ornTop.setAlpha(0);

      const ornBot = pin(this.add.graphics().setDepth(9500));
      this._drawFinalOrnament(ornBot, cx, ornBotY);
      ornBot.setAlpha(0);

      // ── Title heading ──────────────────────────────────────────────
      const titleText = pin(this.add.text(cx, titleY, 'Happy Anniversary  ❖', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontStyle:  'italic',
        fontSize:   titleFontSize,
        color:      '#FFCC88',
        letterSpacing: 3,
        resolution: 2,
        shadow:     { offsetX: 0, offsetY: 0, color: '#FF9933', blur: 20, fill: true },
      }).setOrigin(0.5).setAlpha(0).setDepth(9510));

      // ── Final message ──────────────────────────────────────────────
      const msg = pin(this.add.text(cx, msgY, finalMsg, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize:   msgFontSize,
        color:      '#FFDDEE',
        align:      'center',
        resolution: 2,
        wordWrap:   { width: msgWrapW },
        shadow:     { offsetX: 0, offsetY: 0, color: '#FF7AAA', blur: 28, fill: true },
      }).setOrigin(0.5).setAlpha(0).setDepth(9510));

      // ── Date / dedication line ─────────────────────────────────────
      const dateText = pin(this.add.text(cx, dateY, '\u2756  Four Years of Us  \u2756', {
        fontFamily:    'Georgia, serif',
        fontSize:      dateFontSize,
        color:         '#C08898',
        letterSpacing: 3,
        resolution:    2,
      }).setOrigin(0.5).setAlpha(0).setDepth(9510));

      // ── Styled "Play Again" button — mirrors MainMenuScene._drawButton ─
      const btnBg = pin(this.add.graphics().setDepth(9509));
      this._drawFinalButton(btnBg, cx, btnY, false, btnW, btnH);
      btnBg.setAlpha(0);

      const btnGlow = pin(this.add.graphics().setDepth(9507));
      btnGlow.fillStyle(0xFF5588, 0.10);
      btnGlow.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2 - 2, btnW, btnH + 4, Math.round(btnH / 2) + 1);
      btnGlow.setAlpha(0);

      const btnTxt = pin(this.add.text(cx, btnY, btnLabel, {
        fontFamily:    'Georgia, serif',
        fontSize:      btnFontSize,
        color:         '#FFFFFF',
        letterSpacing: 1,
        resolution:    2,
        shadow:        { offsetX: 0, offsetY: 0, color: '#FF5588', blur: 12, fill: true },
      }).setOrigin(0.5).setAlpha(0).setDepth(9511));

      // ── Staggered entrance animations ─────────────────────────────
      this.tweens.add({ targets: card,      alpha: 1, duration: 700, ease: 'Sine.easeOut', delay: 0 });
      this.tweens.add({ targets: titleText, alpha: 1, duration: 700, ease: 'Sine.easeOut', delay: 150 });
      this.tweens.add({
        targets: msg, alpha: 1, y: msgY,
        duration: 800, ease: 'Cubic.easeOut', delay: 350,
        onStart: () => { msg.y = msgY + 16; },
      });
      this.tweens.add({ targets: ornTop,   alpha: 1, duration: 500, ease: 'Sine.easeOut', delay: 480 });
      this.tweens.add({ targets: ornBot,   alpha: 1, duration: 500, ease: 'Sine.easeOut', delay: 560 });
      this.tweens.add({ targets: dateText, alpha: 0.65, duration: 600, ease: 'Sine.easeOut', delay: 660 });
      this.tweens.add({
        targets: [btnBg, btnGlow, btnTxt], alpha: 1,
        duration: 500, ease: 'Sine.easeOut', delay: 900,
        onComplete: () => {
          if (!this.sys?.isActive()) return;
          this.tweens.add({ targets: btnGlow, alpha: { from: 1, to: 0.35 },
            duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.tweens.add({ targets: btnTxt, alpha: { from: 1, to: 0.82 },
            duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        },
      });

      // Gentle float on the message (starts after entrance)
      this.time.delayedCall(1400, () => {
        if (!this.sys?.isActive()) return;
        this._msgFloatTween = this.tweens.add({
          targets: msg, y: msgY + 4,
          duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        // Soft golden pulse on the title
        this._titlePulseTween = this.tweens.add({
          targets: titleText, alpha: { from: 1, to: 0.70 },
          duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      });

      // ── Floating particle burst when card appears ──────────────────
      if (this.textures.exists('particle-heart')) {
        this.add.particles(cx, cy - 40, 'particle-heart', {
          x: { min: -200, max: 200 },
          speedY: { min: -18, max: -6 }, speedX: { min: -10, max: 10 },
          scale:  { start: 0.12, end: 0 }, alpha: { start: 0.30, end: 0 },
          tint:   [0xFFAACC, 0xFFDDEE],
          lifespan: 4000, frequency: 110, quantity: 1, maxParticles: 24,
          blendMode: 'ADD',
        }).setScrollFactor(0).setDepth(9505);
      }
      if (this.textures.exists('particle-star-k')) {
        this.add.particles(cx, cy, 'particle-star-k', {
          x: { min: -220, max: 220 }, y: { min: -120, max: 120 },
          speed:  { min: 4, max: 16 }, angle: { min: 0, max: 360 },
          scale:  { start: 0.22, end: 0 }, alpha: { start: 0.38, end: 0 },
          tint:   [0xFFCC44, 0xFFEE88, 0xFFDD66],
          rotate: { min: 0, max: 360 },
          lifespan: { min: 3000, max: 5000 },
          frequency: 190, quantity: 1, maxParticles: 36,
          blendMode: 'ADD',
        }).setScrollFactor(0).setDepth(9505);
      }

      // ── Button interactions ────────────────────────────────────────
      const hitArea = pin(this.add.rectangle(cx, btnY, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(9520));
      hitArea.on('pointerover', () => {
        if (this._playAgainStarted) return;
        this._drawFinalButton(btnBg, cx, btnY, true, btnW, btnH);
        this.tweens.add({ targets: [btnTxt, btnGlow], scaleX: 1.06, scaleY: 1.06, duration: 160, ease: 'Back.easeOut' });
      });
      hitArea.on('pointerout', () => {
        if (this._playAgainStarted) return;
        this._drawFinalButton(btnBg, cx, btnY, false, btnW, btnH);
        this.tweens.add({ targets: [btnTxt, btnGlow], scaleX: 1, scaleY: 1, duration: 160 });
      });
      hitArea.on('pointerdown', () => {
        if (this._playAgainStarted) return;
        this._playAgainStarted = true;
        audioManager._playTextureEvent?.('bells-soft');

        // Clear chapter progress so the Continue button does NOT appear on the
        // main menu after completing the full story.
        try { localStorage.removeItem('prawal-aashna-chapter'); } catch (_) {}

        // Manual black overlay tweened to full opacity. Using cameras.main.fadeOut() +
        // camerafadeoutcomplete is unreliable because in Phaser 3.90 WebGL, the
        // FADE_OUT_COMPLETE event fires from inside the camera's postDraw render step —
        // i.e. in the middle of the renderer loop — making scene.start() unsafe at that
        // point. A tween onComplete fires during TweenManager.update() (before rendering),
        // which is the correct window for scene management operations.
        const W = this.scale.width;
        const H = this.scale.height;
        const overlay = this.add.graphics()
          .setScrollFactor(0)
          .setDepth(9900)
          .setAlpha(0);
        overlay.fillStyle(0x000000, 1);
        overlay.fillRect(0, 0, W, H);

        this.tweens.add({
          targets:  overlay,
          alpha:    1,
          duration: 1800,
          ease:     'Sine.easeIn',
          onComplete: () => {
            // Do NOT stop UIScene here — letting it keep running removes one
            // scene operation from the queue, making the transition simpler and
            // more reliable. UIScene is invisible during MainMenu (all elements
            // at alpha=0). ChapterScene.create() will reuse the existing UIScene
            // instance on the next chapter without needing a relaunch.
            this.scene.start('MainMenu');
          },
        });
      });
    });
  }

  // ── End-screen helpers (mirrors MainMenuScene ornament + button style) ──

  _drawFinalOrnament(g, cx, y) {
    g.lineStyle(1, 0xBB6080, 0.65);
    g.lineBetween(cx - 96, y, cx - 18, y);
    g.lineBetween(cx + 18, y, cx + 96, y);
    g.fillStyle(0xBB6080, 0.80);
    g.fillTriangle(cx - 18, y, cx - 10, y - 4, cx - 10, y + 4);
    g.fillTriangle(cx + 18, y, cx + 10, y - 4, cx + 10, y + 4);
    g.fillStyle(0xFF99BB, 0.90);
    g.fillTriangle(cx, y - 6, cx - 5, y, cx + 5, y);
    g.fillTriangle(cx, y + 6, cx - 5, y, cx + 5, y);
  }

  _drawFinalButton(g, cx, y, hover, bw = 220, bh = 46) {
    g.clear();
    const br = Math.round(bh / 2);
    const bx = cx - bw / 2, by = y - bh / 2;
    g.fillStyle(hover ? 0xCC3068 : 0x9A2250, hover ? 0.98 : 0.90);
    g.fillRoundedRect(bx, by, bw, bh, br);
    g.fillStyle(0xFFFFFF, hover ? 0.15 : 0.08);
    g.fillRoundedRect(bx + 4, by + 1, bw - 8, 14, { tl: br - 1, tr: br - 1, bl: 0, br: 0 });
    g.lineStyle(hover ? 2 : 1.5, 0xFF88AA, hover ? 0.90 : 0.60);
    g.strokeRoundedRect(bx, by, bw, bh, br);
    if (hover) {
      g.lineStyle(8, 0xFF5588, 0.22);
      g.strokeRoundedRect(bx - 6, by - 6, bw + 12, bh + 12, br + 5);
    }
  }

  // Block movement during cinematic pan — prevents a held key from
  // walking the player into the 'forever' trigger before intro fires.
  onUpdate(_time, _delta) {
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);
    if (this._cinematic && this._player?.sprite?.body) {
      this._player.sprite.body.setVelocity(0, 0);
    }
  }

  onShutdown() {
    this._playAgainStarted = false;
    this._finaleStarted = false;
    this._msgFloatTween?.stop();
    this._titlePulseTween?.stop();
    audioManager.fadeOutAll(600);
    this._rings?.forEach(r => this.tweens.killTweensOf(r));
    this._stones?.forEach(s => this.tweens.killTweensOf(s));
    this._mists?.forEach(m => this.tweens.killTweensOf(m));
    this._orbs?.forEach(o => this.tweens.killTweensOf(o));
    this.tweens.killTweensOf(this._corona);
    this.tweens.killTweensOf(this._centreGlow);
    this.tweens.killTweensOf(this._finaleOrb);
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
