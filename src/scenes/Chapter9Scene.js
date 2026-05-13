import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter4Scene — "Letters Never Sent"
 *
 * Dawn garden. Five morning letters rest on bookstands arranged in a
 * gentle arc through a golden autumn clearing. The player drifts from
 * letter to letter, guided by flowers and warm light.
 *
 * Spatial logic (12 cols × 8 rows, cell 64px = 768 × 512):
 *
 *   Arc layout — player left-center, letters curve up then back down:
 *     [P col2,r4] → L1(col4,r3.2) → L2(col6,r2.5) → L3(col8,r3.2)
 *                → L4(col9.5,r4.5) → L5(col8.5,r5.5) ← FINAL
 *
 *   Trees frame all four edges (layer: midground).
 *   Flowers serve as breadcrumbs between each letter.
 *   Final letter: peak glow + candle — the emotional destination.
 */
export class Chapter9Scene extends ChapterScene {
  constructor() {
    super('Chapter9', {
      cols:       12,
      rows:       8,
      mood:       'dawn',
      zoom:       1.72,
      targetZoom: 1.80,
      followLerp: 0.055,
      drift:      false,
      fadeInMs:   1800,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — warm dawn sky + soft clearing glow + vignette
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // ── Environment preset — warm dawn garden clearing ─────────────
    this.env = EnvironmentManager.apply(this, 'OPEN', {
      // Deep indigo crown → warm crimson dawn → soft gold horizon
      sky:        { topColor: 0x0C0618, midColor: 0x8B1810, botColor: 0xFFBB44, bgColor: 0x0C0618 },
      sun:        { tint: 0xFFCC66, alpha: 0.26, x: 0.70, y: 0.20, scaleX: 4.0, scaleY: 2.2 },
      horizon:    { color: 0xFFAA33, peakAlpha: 0.30, topStart: 0.36, topH: 0.08, botStart: 0.44, botH: 0.08 },
      cloudsA:    { tint: 0x8B2810, alpha: 0.20 },
      cloudsB:    { tint: 0x5A1808, alpha: 0.12 },
      mountains:  { tint: 0x3A0C10, alpha: 0.58 },
      midHills:   { tint: 0x280810, alpha: 0.72 },
      hills:      { tint: 0x180406, alpha: 0.84 },
      treeline:   { tint: 0x080204, alpha: 0.94 },
      ground:     { topColor: 0x200808, botColor: 0x180808, vigAlpha: 0.60 },
      curveAmp1:  0, curveAmp2: 0,
      vignette:   { size: 95, color: 0x0C0410, alphaL: 0.68, alphaR: 0.68, alphaT: 0.40, alphaB: 0.62 },
      colorGrade: { color: 0xFFAA44, alpha: 0.022, blend: 'OVERLAY' },
    });

    // ── Parallax depth layers — crimson dawn depth bands ─────────
    const wW = this.worldW;
    const wH = this.worldH;
    if (this.textures.exists('bg-el-mountains')) {
      this.add.image(wW * 0.50, wH * 0.38, 'bg-el-mountains')
        .setScrollFactor(0.03).setScale(4.5, 1.6)
        .setAlpha(0.30).setTint(0x3A0C10).setDepth(-178);
    }
    if (this.textures.exists('bg-el-hills-large')) {
      this.add.image(wW * 0.28, wH * 0.50, 'bg-el-hills-large')
        .setScrollFactor(0.07).setScale(3.8, 1.1)
        .setAlpha(0.38).setTint(0x200808).setDepth(-160);
      this.add.image(wW * 0.74, wH * 0.48, 'bg-el-hills-large')
        .setScrollFactor(0.07).setScale(3.4, 1.0)
        .setAlpha(0.32).setTint(0x280810).setDepth(-159);
    }

    if (this.textures.exists('light-blob')) {
      // Ground plane lift — warm rust strip so player stands on something visible
      this.add.image(wW / 2, wH * 0.80, 'light-blob')
        .setScale(16, 5).setAlpha(0.04).setTint(0xFF6622)
        .setBlendMode('ADD').setDepth(-8);

      // Wide ambient warm wash across the clearing
      this.add.image(wW / 2, wH / 2, 'light-blob')
        .setScale(14, 8).setAlpha(0.06).setTint(0xFF9933)
        .setBlendMode('ADD').setDepth(-10);

      // Focal destination glow — centred on final letter (col 10.2, row 4.5)
      const finalPos = this.grid(9.8, 4.5);
      this._destGlow = this.add.image(finalPos.x, finalPos.y, 'light-blob')
        .setScale(5.5, 3.5).setAlpha(0.20).setTint(0xFFCC44)
        .setBlendMode('ADD').setDepth(-9);
      this.tweens.add({
        targets:  this._destGlow,
        alpha:    { from: 0.20, to: 0.08 },
        scale:    { from: 5.5,  to: 6.8  },
        duration: 3200,
        yoyo:     true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — arc composition: dark framing trees → writing desk → letter trail
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    this._lettersFound = 0;
    this._totalLetters = 5;
    this._letterGlows  = [];
    this._letterSprites = [];

    // ── Letter counter — delegated to UIScene (immune to main camera zoom)
    this.time.delayedCall(0, () => {
      const d = { label: 'letters', total: this._totalLetters };
      this.game.events.emit('collect-counter-init', d);
      this.scene.get('UI')?._onCollectCounterInit?.(d);
    });

    // ── DARK SILHOUETTE TREES — frame the dawn clearing ──────────
    // Three depth planes (back→front):
    //   far-bg  rows 2.4–2.6  tiny/faint, extend depth into crimson haze
    //   arch    rows 3.0–3.2  gateway pines behind the letter arc
    //   entry   rows 4.0–4.1  ground-anchored sentinels, left/right edges
    // Staggering across 1.7 rows (2.4→4.1) vs the old 0.8-row band (3.0–3.8)
    // breaks linear alignment and adds a readable 2.5D treeline.

    // Far-background layer — barely visible, absorbed by crimson sky haze
    const tBgL = this.placeAt(0.6, 2.4, 'k-tree-simple-dark', { scale: 0.38, ySort: false });
    if (tBgL) tBgL.setTint(0x080204).setAlpha(0.50).setDepth(-17);
    const tBgR = this.placeAt(11.2, 2.6, 'k-tree-thin-dark',  { scale: 0.36, ySort: false });
    if (tBgR) tBgR.setTint(0x080204).setAlpha(0.45).setDepth(-17);

    // Mid-ground arch pines — frame the letter arc from behind
    const tC1 = this.placeAt(5.2, 3.2, 'k-tree-pine-d',       { scale: 0.80, ySort: false });
    if (tC1) tC1.setTint(0x0A0108).setDepth(-13);
    const tC2 = this.placeAt(8.0, 3.0, 'k-tree-pine-c',       { scale: 0.74, ySort: false });
    if (tC2) tC2.setTint(0x080106).setDepth(-13);

    // Mid-ground secondary pair — flanking the arch
    const tL2 = this.placeAt(2.0, 3.5, 'k-tree-tall-dark',    { scale: 0.66, ySort: false });
    if (tL2) tL2.setTint(0x0C0206).setDepth(-11);

    // Entry sentinels — moved to rows 4.0–4.1 so bases sit on the ground
    // plane; creates a clear separation from the arch pines at row 3.0–3.5.
    const tL1 = this.placeAt(0.7, 4.1, 'k-tree-oak-dark',     { scale: 0.80, ySort: false });
    if (tL1) tL1.setTint(0x100408).setDepth(-12);
    const tR1 = this.placeAt(11.0, 4.0, 'k-tree-simple-dark', { scale: 0.70, ySort: false });
    if (tR1) tR1.setTint(0x0C0206).setDepth(-11);

    // ── FOREGROUND FRAMING TREE — left edge silhouette above player depth ──
    const fgPine = this.placeAt(-0.2, 2.0, 'k-tree-tall-dark', { scale: 1.1, ySort: false });
    if (fgPine) fgPine.setTint(0x050102).setDepth(this.layers.depth('foreground', 50));

    // ── WRITING DESK — Prawal's morning ritual ──────────────────
    // Story: "Every morning before the day began, Prawal wrote."
    // Side-view flat assets — no iso. Desk + chair at rows 4.3/4.8.
    // ── BACK TREELINE — deep crimson-dawn layer ──────────────────
    // Row 2.4–2.8: additional depth plane between far-bg (2.4–2.6) and
    // arch pines (3.0–3.2). Using *-dark variants only — foliage-tree3/1
    // are green-based assets that resist tinting and read bright olive
    // against the crimson sky, breaking the palette entirely.
    const fgL = this.placeAt(3.4, 2.6, 'k-tree-default-dark', { scale: 0.62, ySort: false });
    if (fgL) fgL.setTint(0x180608).setAlpha(0.70).setDepth(-16);
    const fgR = this.placeAt(7.2, 2.4, 'k-tree-simple-dark',  { scale: 0.58, ySort: false });
    if (fgR) fgR.setTint(0x120408).setAlpha(0.65).setDepth(-16);

    // ── HANGING MOSS — draped from the canopy ──────────────────
    // Placed high at row 0.8–1.0 with setOrigin(0.5, 0) so they hang down.
    // Dark crimson tint matches the pre-dawn forest mood.
    const hmL = this.placeAt(1.2, 0.8, 'k-hanging-moss', { scale: 0.60, ySort: false });
    if (hmL) hmL.setOrigin(0.5, 0).setTint(0x2A1008).setAlpha(0.72).setDepth(-8);
    const hmR = this.placeAt(9.4, 1.0, 'k-hanging-moss', { scale: 0.54, ySort: false });
    if (hmR) hmR.setOrigin(0.5, 0).setTint(0x1E0C06).setAlpha(0.64).setDepth(-8);

    const desk = this.placeAt(0.9, 4.3, 'k-desk', {
      scale:  0.58,
      shadow: { width: 24, height: 5, offsetY: 6, alpha: 0.14 },
    });
    if (desk) desk.setTint(0xCC8844);
    const chair = this.placeAt(1.8, 4.9, 'k-chair-desk', {
      scale:  0.50,
      shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (chair) chair.setTint(0xAA7733);

    // Warm lamp pool beside desk — pre-dawn writing light
    if (this.textures.exists('light-blob')) {
      const dp = this.grid(0.9, 4.3);
      this._deskLight = this.add.image(dp.x + 16, dp.y + 20, 'light-blob')
        .setScale(2.4, 1.2).setAlpha(0.22).setTint(0xFFAA33)
        .setBlendMode('ADD').setDepth(-5);
      this.tweens.add({
        targets: this._deskLight, alpha: { from: 0.22, to: 0.08 },
        duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── DAWN BUSHES — warm tinted ground cover ───────────────────
    const bL = this.placeAt(3.0, 4.5, 'k-bush-small', { scale: 0.50 });
    if (bL) bL.setTint(0x3A1810);
    const bR = this.placeAt(9.6, 4.4, 'k-bush', { scale: 0.48 });
    if (bR) bR.setTint(0x3A1810);

    // ── FLOWERS — breadcrumbs between each letter ────────────────
    // Positioned between letters, rows matching depth of adjacent letters.
    const FLOWERS = [
      { c: 2.0, r: 4.4,  key: 'k-flower-yellow' },   // lead-in before L1
      { c: 4.2, r: 4.0,  key: 'k-flower-purple' },   // L1 → L2
      { c: 6.2, r: 4.3,  key: 'k-flower-red'   },   // L2 → L3: lowered to floor plane (was 3.85)
      { c: 7.9, r: 4.10, key: 'k-flower-yellow'},   // L3 → L4
      { c: 9.2, r: 4.5,  key: 'k-flower-purple' },   // L4 → L5 (floor level)
    ];
    for (const f of FLOWERS) {
      this.placeAt(f.c, f.r, f.key, { scale: 0.60 });
    }

    // ── GROUND DETAIL — rows 4.6–5.8: fill the walkable corridor ──────
    // The area from row 4.8 to 6.0 was empty. Rocks, stumps, and grass
    // scatter across this band at varied X/Y to avoid linear alignment.
    const g1 = this.placeAt(2.4, 4.8, 'k-grass-leafs', { scale: 0.40 });
    if (g1) g1.setTint(0x2A0C08);
    const rock = this.placeAt(1.2, 4.6, 'k-rock-small-a', { scale: 0.46 });
    if (rock) rock.setTint(0x3A1410);

    // Mid-lower scatter — rows 5.1–5.6, thinned to 3 props so the
    // clearing breathes between the flower trail and the occlusion band.
    const gStump = this.placeAt(7.6, 5.2, 'k-stump', { scale: 0.38 });
    if (gStump) gStump.setTint(0x381410);
    const gBushM = this.placeAt(10.2, 5.5, 'k-bush-small', { scale: 0.46 });
    if (gBushM) gBushM.setTint(0x3A1810);
    const gRockR = this.placeAt(11.4, 5.1, 'k-rock-small-a', { scale: 0.40 });
    if (gRockR) gRockR.setTint(0x2E1008);

    // ── MID-FOREGROUND OCCLUSION — Y-sorted, rows 6.2–6.8 ─────────────
    // Player (row 5.0, y≈352) depth ≈ 352. These props at rows 6.2–6.8
    // (y≈430–474) always render over the player in the walking corridor,
    // creating parallax depth. If the player walks down to row 6+, depths
    // converge and the player naturally steps in front.
    // Tint palette: dark crimson-maroon matches the pre-dawn dusk.
    const occBushL = this.placeAt(1.0, 6.8, 'k-bush-large', {
      scale: 0.72,
      shadow: { width: 20, height: 5, offsetY: 5, alpha: 0.08 },
    });
    if (occBushL) occBushL.setTint(0x301210);
    const occRockC = this.placeAt(5.2, 6.3, 'k-rock-large-a', { scale: 0.48 });
    if (occRockC) occRockC.setTint(0x280C0C);
    const occBushRC = this.placeAt(8.0, 6.6, 'k-bush-small', { scale: 0.54 });
    if (occBushRC) occBushRC.setTint(0x301210);
    const occBushR = this.placeAt(11.6, 6.4, 'k-bush-large', {
      scale: 0.66,
      shadow: { width: 18, height: 4, offsetY: 5, alpha: 0.07 },
    });
    if (occBushR) occBushR.setTint(0x301210);

    // ── PLAYER-PATH OCCLUSION — Y-sorted, rows 5.5–6.0 ───────────
    // Player starts at row 5.0 (y ≈ 352, depth 352).
    // Props at rows 5.5–6.0 (y ≈ 384–416) sort above the player in the
    // gameplay layer while they walk the main corridor, creating a genuine
    // 2.5D sense of "objects between camera and character".
    // When the player moves below these props, depths equalize and the
    // player naturally steps in front — no manual depth overrides needed.

    // Left-center — large rock clusters where the corridor begins to widen
    const pathRockL = this.placeAt(2.8, 5.8, 'k-rock-large-b', { scale: 0.50 });
    if (pathRockL) pathRockL.setTint(0x2E1008);

    // Center — bush that sits across the mid-path, gives player a reason
    // to curve around it (visual obstacle without physics blocking)
    const pathBushM = this.placeAt(6.4, 5.5, 'k-bush', {
      scale:  0.58,
      shadow: { width: 18, height: 4, offsetY: 5, alpha: 0.07 },
    });
    if (pathBushM) pathBushM.setTint(0x301210);

    // Right-center — small rock, offset from center bush to break symmetry
    const pathRockR = this.placeAt(9.8, 5.9, 'k-rock-small-b', { scale: 0.48 });
    if (pathRockR) pathRockR.setTint(0x2E1008);

    // Left-edge partial trunk — the left sentinel tree (row 4.1) continues
    // down into viewer-space. A scaled-down instance at row 5.7 creates
    // the illusion that the upper trunk extends towards the camera.
    // Y-sorted so it reads correctly when the player walks past.
    const pathTrunkL = this.placeAt(0.5, 5.7, 'k-tree-oak-dark', {
      scale:   0.34,
      originY: 0.95,
    });
    if (pathTrunkL) pathTrunkL.setTint(0x100408).setAlpha(0.72);

    // ── BOTTOM-EDGE FRAMERS — fixed depth 601 ─────────────────────
    // Permanently in front of the player (depth 601 > any Y-sort value
    // in an 8-row world, max y ≈ 512). Origin (0.5, 0.85–0.90) crops
    // the sprite base into the viewport edge so only the crown silhouette
    // is visible — gives the impression of foliage spilling into frame.
    // Row positions differ intentionally (7.6 vs 7.3 vs 7.8) to avoid
    // a horizontal band of matching identical silhouettes.
    const fwL = this.grid(0.8, 7.6);
    const fwR = this.grid(11.2, 7.3);
    const fwC = this.grid(5.8, 7.8);
    this.add.image(fwL.x, fwL.y, 'foliage-bush4')
      .setOrigin(0.5, 0.88).setScale(0.86).setTint(0x1A0808).setAlpha(0.88).setDepth(601);
    this.add.image(fwR.x, fwR.y, 'foliage-bush4')
      .setOrigin(0.5, 0.88).setScale(0.80).setTint(0x1A0808).setAlpha(0.88).setDepth(601).setFlipX(true);
    this.add.image(fwC.x, fwC.y, 'foliage-bush1')
      .setOrigin(0.5, 0.90).setScale(0.54).setTint(0x200A0A).setAlpha(0.78).setDepth(601);

    // ── 5 LETTERS — 2.5D depth arc across the clearing ────────────
    //
    //  Depth arc (back→front = smaller→larger, higher→lower row):
    //
    //         L2(r3.9)  L3(r3.8)
    //      L1(r4.2)           L4(r4.3)
    //  [P]                            L5(r4.7) ◀── FINAL
    //
    //  Back letters (L2, L3) at rows 3.8–3.9 = near the treeline,
    //  visually distant and small. Front letters (L1, L5) at rows
    //  4.2–4.7 = on the floor plane, large and close.
    //  Scale varies with depth: 0.48 (back) → 0.72 (front).

    const LETTERS = [
      { c:  3.0, r: 4.2, s: 0.60, dialogue: 'letter_morning_1', label: 'A First Thought'    },
      { c:  5.2, r: 3.9, s: 0.50, dialogue: 'letter_morning_2', label: 'A Saturday Morning' },
      { c:  7.2, r: 3.8, s: 0.48, dialogue: 'letter_morning_3', label: 'Fading Hope'         },
      { c:  8.6, r: 4.3, s: 0.58, dialogue: 'letter_morning_4', label: 'Day 200'             },
      { c:  9.8, r: 4.7, s: 0.72, dialogue: 'letter_morning_5', label: 'The Last Letter'     },
    ];

    for (let i = 0; i < LETTERS.length; i++) {
      const L      = LETTERS[i];
      const pos    = this.grid(L.c, L.r);
      const isLast = i === LETTERS.length - 1;

      const glowScale = isLast ? 3.8 : 2.2;
      const glowAlpha = isLast ? 0.34 : 0.16;
      const glowTint  = isLast ? 0xFFDD55 : 0xFFAA33;

      const glow = this.textures.exists('light-blob')
        ? this.add.image(pos.x, pos.y + 10, 'light-blob')
            .setScale(glowScale)
            .setAlpha(i === 0 ? glowAlpha : 0.06)
            .setTint(glowTint)
            .setBlendMode('ADD')
            .setDepth(-3)
        : null;

      if (glow && i === 0) {
        this.tweens.add({
          targets:  glow,
          scale:    { from: glowScale,        to: glowScale * 1.30 },
          alpha:    { from: glowAlpha,        to: glowAlpha * 0.40 },
          duration: 1800 + i * 200,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
      if (glow) this._letterGlows.push(glow);

      // Register interactable using obj-letter sprite (side-view envelope)
      const letterSprite = this.placeInteractable(L.c, L.r, 'obj-letter', {
        id:            `letter_${i + 1}`,
        label:         L.label,
        triggerRadius: 70,
        glowRadius:    155,
        enabled:       i === 0,
        skipUnlockSFX: true,
        onTrigger:     () => this._onLetterFound(i, L.dialogue),
      }, { scale: L.s });

      // Gentle floating bob — letters drift in the still dawn air
      if (letterSprite) {
        this._letterSprites.push(letterSprite);
        this.tweens.add({
          targets:  letterSprite,
          y:        { from: pos.y - 4, to: pos.y + 4 },
          duration: 2200 + i * 180,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
    }

    // ── Golden dawn light pool under final letter ─────────────────
    if (this.textures.exists('light-blob')) {
      const lastPos = this.grid(9.8, 4.5);
      this._finalPool = this.add.image(lastPos.x, lastPos.y + 22, 'light-blob')
        .setScale(3.0, 1.4).setAlpha(0.26).setTint(0xFFCC44)
        .setBlendMode('ADD').setDepth(-4);
      this.tweens.add({
        targets: this._finalPool,
        alpha: { from: 0.26, to: 0.10 }, scale: { from: 3.0, to: 3.6 },
        duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS — player at left-center, facing the arc
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    const start = this.grid(1.5, 5.0);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male-smart', displayW: 40, displayH: 62 },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.28, dynamic: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FX — candle halo + golden dawn motes + intro narration
  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    const W = this.worldW;
    const H = this.worldH;

    // Warm golden halo above the final letter position
    if (this.textures.exists('light-blob')) {
      const candlePos = this.grid(9.8, 4.5);
      this._candleHalo = this.add.image(candlePos.x, candlePos.y - 20, 'light-blob')
        .setScale(1.2)
        .setAlpha(0.45)
        .setTint(0xFFCC66)
        .setBlendMode('ADD')
        .setDepth(14);
      this.tweens.add({
        targets:  this._candleHalo,
        alpha:    { from: 0.45, to: 0.22 },
        scale:    { from: 1.20, to: 1.55 },
        duration: 1400,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    }

    // Warm golden dawn motes drifting upward — pre-dawn spore atmosphere
    if (this.textures.exists('particle-glow')) {
      this.add.particles(W / 2, H * 0.65, 'particle-glow', {
        x:         { min: -W * 0.45, max: W * 0.45 },
        speedY:    { min: -12, max: -4 },
        speedX:    { min: -4,  max: 4  },
        scale:     { start: 0.09, end: 0 },
        alpha:     { start: 0.20, end: 0 },
        tint:      [0xFFD080, 0xFFBB66, 0xFF9940],
        lifespan:  { min: 4000, max: 7000 },
        frequency: 300,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 50));
    }

    // Intro narration
    this.time.delayedCall(2000, () => {
      if (!this.sys?.isActive()) return;
      const lines = storyData.dialogues?.letters_intro;
      if (lines) this.dialogue?.start(lines);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════

  _onLetterFound(index, dialogueKey) {
    // Escalating per-letter audio: pen-scratch for letters 1–4 (the act of writing
    // resonates in each found letter), revelation stinger only on the final letter
    // ("The Last Letter") — preserves the stinger's emotional weight.
    const isLastLetter = index === this._totalLetters - 1;
    if (isLastLetter) {
      this.time.delayedCall(280, () => {
        if (this.sys?.isActive()) audioManager.playStinger('revelation');
      });
    } else {
      audioManager._playTextureEvent?.('pen-scratch');
    }
    this._lettersFound++;

    // Update UIScene counter (zoom-safe HUD)
    this.game.events.emit('collect-counter-update', { found: this._lettersFound, total: this._totalLetters });
    this.scene.get('UI')?._onCollectCounterUpdate?.({ found: this._lettersFound });

    // Flare then fade collected letter glow
    const glow = this._letterGlows[index];
    if (glow) {
      this.tweens.killTweensOf(glow);
      this.tweens.add({
        targets:  glow,
        alpha:    0.55,
        scale:    glow.scale * 1.5,
        duration: 280,
        yoyo:     true,
        ease:     'Quad.easeOut',
        onComplete: () => {
          this.tweens.add({ targets: glow, alpha: 0, duration: 700 });
        },
      });
    }

    // Enable next letter's proximity + reveal its scene glow
    const nextIdx = index + 1;
    if (nextIdx < this._totalLetters) {
      this.proximity.setEnabled(`letter_${nextIdx + 1}`, true);
      const nextGlow = this._letterGlows[nextIdx];
      if (nextGlow) {
        const isLast = nextIdx === this._totalLetters - 1;
        const gs = isLast ? 3.5 : 2.0;
        const ga = isLast ? 0.32 : 0.15;
        this.tweens.add({
          targets: nextGlow, alpha: ga, duration: 800, ease: 'Quad.easeOut',
          onComplete: () => {
            if (!this.sys?.isActive()) return;
            this.tweens.add({
              targets: nextGlow,
              scale: { from: gs, to: gs * 1.30 },
              alpha: { from: ga, to: ga * 0.40 },
              duration: 1800 + nextIdx * 200,
              yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
          },
        });
      }
    }

    this.cam.zoomPulse(1.42, 700);

    const lines = storyData.dialogues?.[dialogueKey];
    if (lines) {
      this.dialogue?.start(lines, () => {
        if (this._lettersFound >= this._totalLetters) {
          this._chapterComplete();
        }
      });
    } else if (this._lettersFound >= this._totalLetters) {
      this._chapterComplete();
    }
  }

  _chapterComplete() {
    this._guardTransition(() => {
      goToChapter(this, 9);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND DECOR — warm crimson-dawn pool, suppresses default cool tones
  // ═══════════════════════════════════════════════════════════════════

  buildGroundDecor() {
    // Override the default pool which includes foliage-flower-blue,
    // foliage-bush2/3 and other cool-toned assets that clash with the
    // pre-dawn crimson palette. Warm-only pool + low density keeps the
    // clearing serene rather than busy.
    this._spawnGroundDecor({
      pool: [
        'k-grass', 'k-grass',
        'k-grass-leafs',
        'k-flower-yellow', 'k-flower-red', 'k-flower-purple',
        'k-rock-small-a',
      ],
      density:  0.14,
      rowRange: [4.5, 6.0],
    });
  }

  onUpdate(_time, _delta) {
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);
  }

  onShutdown() {
    this.tweens.killTweensOf(this._destGlow);
    this.tweens.killTweensOf(this._deskLight);
    this.tweens.killTweensOf(this._finalPool);
    this.tweens.killTweensOf(this._candleHalo);
    this._letterSprites?.forEach(s => this.tweens.killTweensOf(s));
    this._letterGlows?.forEach(g => this.tweens.killTweensOf(g));
    this.game.events.emit('collect-counter-hide');
    this.scene.get('UI')?._onCollectCounterHide?.();
    audioManager.fadeOutAll(600);
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
