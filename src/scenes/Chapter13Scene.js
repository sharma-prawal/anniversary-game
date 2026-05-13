import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter13Scene — "Paths That Merge"
 *
 * A dawn clearing. Two lives told through one path. The left half of
 * the scene is Prawal's journey — cool, solitary, sparse. The right
 * half glows warmer as the player walks toward Aashna. A gateway arch
 * of two trees marks the visual convergence. The bench at its centre
 * is the single moment where both paths become one.
 *
 * Spatial logic (12 cols × 8 rows, cell 64px = 768 × 512):
 *
 *   LEFT   (cols 0–4): cool-tinted trees, player alone in the morning
 *   CENTRE (cols 4–8): flower breadcrumbs, gateway arch, bench + Aashna
 *   RIGHT  (cols 8–11): warm-tinted foliage, beyond the meeting
 *
 *   BREADCRUMBS: red (2.8) → purple (4.8) → yellow (6.8)
 *   ARCH:  pine-a (4.6, 2.0) × oak (8.2, 2.0) overhead framing bench
 *   BENCH: (6.5, 4.5) — single interactable, fires ch13_reunion
 *   Aashna: (7.8, 4.5) wander 14 — already in the warm light
 *
 *   CINEMATIC: slowPan to Aashna's side then back to player — "she is
 *   already waiting" established before control is released.
 *
 *   Standard physics (64, 64, W-128, H-128) — no back-wall objects.
 *   Zoom 1.72→1.80: viewport = 558px. Player at col 1.5 (x=96)
 *   sees the first flower and left trees on frame 1.
 *   Bench at col 6.5 (x=416) is inside the first viewport.
 */
export class Chapter13Scene extends ChapterScene {
  constructor() {
    super('Chapter13', {
      cols:       12,
      rows:       8,
      mood:       'dawn',
      zoom:       1.72,
      targetZoom: 1.80,
      followLerp: 0.055,
      drift:      false,
      fadeInMs:   2200,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — peach-dawn clearing
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // ── OPEN — peach-amber dawn clearing, two paths merging ───────
    this.env = EnvironmentManager.apply(this, 'OPEN', {
      sky:        { topColor: 0x1A0820, midColor: 0x7A2E0E, botColor: 0x6C3010, bgColor: 0x1A0820 },
      sun:        { enabled: true, x: 0.68, y: 0.22, scaleX: 4.2, scaleY: 2.4, tint: 0xFF9944, alpha: 0.24 },
      horizon:    { color: 0xFF8833, peakAlpha: 0, topStart: 0.34, topH: 0.09, botStart: 0.43, botH: 0.09 },
      cloudsA:    { tint: 0xAA6633, alpha: 0.22 },
      cloudsB:    { tint: 0x884422, alpha: 0.14 },
      mountains:  { tint: 0x7A4828, alpha: 0.72 },
      midHills:   { tint: 0x4A2810, alpha: 0.82 },
      hills:      { tint: 0x2A1408, alpha: 0.92 },
      treeline:   { tint: 0x100804, alpha: 1.00 },
      ground:     { topColor: 0x200C04, botColor: 0x060200 },
      vignette:   { size: 110, color: 0x0E0806, alphaL: 0.80, alphaR: 0.52, alphaT: 0.80, alphaB: 0.80 },
      colorGrade: { color: 0xFFAA44, alpha: 0.024, blend: 'OVERLAY' },
    });

    const W  = this.worldW;
    const cy = this.worldH / 2;

    // ── AMBIENT DAWN WASH — warm gradient from right ──────────────
    if (this.textures.exists('light-blob')) {
      // Warm peach sunrise glow from the right (reunion side)
      this._sunRise = this.add.image(W * 0.75, cy, 'light-blob')
        .setScale(10, 7).setAlpha(0.07).setTint(0xFF9944)
        .setBlendMode('ADD').setDepth(-11);
      this.tweens.add({
        targets:  this._sunRise,
        alpha:    { from: 0.07, to: 0.02 },
        scale:    { from: 10,   to: 12   },
        duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Cool ambient blob on Prawal's side — counterpart to the warm sunrise blob.
      // Creates the visible left-cool / right-warm temperature split that makes
      // the "two paths" narrative legible at a glance.
      this._coolWash = this.add.image(W * 0.22, cy, 'light-blob')
        .setScale(8, 5).setAlpha(0.05).setTint(0x4466AA)
        .setBlendMode('ADD').setDepth(-11);
      this.tweens.add({
        targets:  this._coolWash,
        alpha:    { from: 0.05, to: 0.01 },
        scale:    { from: 8,    to: 10   },
        duration: 4800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // THREE-LAYER BENCH GLOW — the warm heart of the scene
      const bp = this.grid(6.2, 4.85);

      this._glowOuter = this.add.image(bp.x, bp.y + 10, 'light-blob')
        .setScale(7.0).setAlpha(0.07).setTint(0xFFCC66)
        .setBlendMode('ADD').setDepth(-9);
      this.tweens.add({
        targets:  this._glowOuter,
        alpha:    { from: 0.07, to: 0.02 },
        scale:    { from: 7.0,  to: 9.0 },
        duration: 3600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      const mid = this.add.image(bp.x, bp.y + 10, 'light-blob')
        .setScale(3.4).setAlpha(0.20).setTint(0xFFBB55)
        .setBlendMode('ADD').setDepth(-8);
      this.tweens.add({
        targets:  mid,
        alpha:    { from: 0.20, to: 0.06 },
        scale:    { from: 3.4,  to: 4.2 },
        duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this._mergeGlow = mid;

      this._glowInner = this.add.image(bp.x, bp.y + 4, 'light-blob')
        .setScale(1.5).setAlpha(0.30).setTint(0xFFEECC)
        .setBlendMode('ADD').setDepth(-7);
      this.tweens.add({
        targets:  this._glowInner,
        alpha:    { from: 0.30, to: 0.12 },
        scale:    { from: 1.5,  to: 2.0 },
        duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // ── ATMOSPHERIC DAWN MIST — screen-space horizon dissolve ─────────
      // Must be scrollFactor(0) + screen-space coords so it sits on the
      // treeline/ground seam rather than drifting with world-space camera.
      const vW = this.scale.width;
      const vH = this.scale.height;
      this._mist = this.add.image(vW * 0.5, vH * 0.56, 'light-blob')
        .setScrollFactor(0)
        .setScale(vW / 32, 1.8).setAlpha(0.038).setTint(0xFF9944)
        .setBlendMode('ADD').setDepth(-13);
      this.tweens.add({
        targets:  this._mist,
        alpha:    { from: 0.038, to: 0.012 },
        duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — two paths converging through a stone ridge
  //
  //  NARRATIVE COMPOSITION:
  //    The chapter title is "Paths That Merge." The composition
  //    PHYSICALLY expresses this: a stone ridge runs through the
  //    middle-left of the scene (row ~3.0, cols 1.5→5.2), separating
  //    an UPPER world (warm, Aashna's) and a LOWER world (cool,
  //    Prawal's). As the player walks right, the stones thin out
  //    and disappear — the paths merge. The bench sits right where
  //    the ridge ends. Two flowers on EACH side of the ridge show
  //    parallel journeys. This is Monument Valley-grade spatial
  //    metaphor: geometry IS narrative.
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    // ──────────────────────────────────────────────────────────────────
    //  COMPOSITION  (12 cols × 8 rows, 64 px cell, zoom ~1.75)
    //
    //  LEFT ZONE  (cols 0–4.5):  Prawal's world — cool, sparse, solitary
    //  GATE ZONE  (cols 4.5–8):  arch + bench — where paths converge
    //  RIGHT ZONE (cols 8–11):   Aashna's world — warm, lush, inviting
    //
    //  EYE TRAVEL ORDER (L → R):
    //    tree-fat → stump + log → stone ridge → flower trail → pine arch
    //    → convergence bouquet → bench → oak arch → warm bush → tall plant
    //
    //  Alto's Adventure rule: every prop earns its frame. No overlap,
    //  no clutter. Silhouettes must read clearly against the hill layers.
    // ──────────────────────────────────────────────────────────────────

    // ── BACKGROUND TREELINE — cool left / warm right ─────────────
    // k-tree-* assets are proper side-scroll silhouettes.
    // Small scale (0.22–0.28) at row 1.4–1.6 + depth -18 = distant forest plane.
    const bgfL = this.placeAt(1.5, 1.5, 'k-tree-fat', { scale: 0.22, ySort: false });
    if (bgfL) bgfL.setTint(0x404870).setDepth(-18);
    const bgfR = this.placeAt(9.5, 1.4, 'k-tree-detailed', { scale: 0.28, ySort: false });
    if (bgfR) bgfR.setTint(0xB87840).setDepth(-18);
    const bgfFar = this.placeAt(11.4, 1.5, 'k-tree-oak', { scale: 0.24, ySort: false });
    if (bgfFar) bgfFar.setTint(0xC08040).setDepth(-18);

    // ── HANGING MOSS — atmosphere over the gateway arch ────────
    // Cool on his side, peach-warm above the bench convergence point.
    // setOrigin(0.5, 0) anchors sprite top-centre so it hangs downward.
    const hmCool = this.placeAt(0.8, 0.6, 'k-hanging-moss', { scale: 0.58, ySort: false });
    if (hmCool) hmCool.setOrigin(0.5, 0).setTint(0x3844AA).setAlpha(0.58).setDepth(-8);
    const hmWarm = this.placeAt(7.2, 0.8, 'k-hanging-moss', { scale: 0.64, ySort: false });
    if (hmWarm) hmWarm.setOrigin(0.5, 0).setTint(0xC07830).setAlpha(0.52).setDepth(-8);

    // ── STONE PILLARS — two ground-anchored boundary stones ──────
    // Tall paired rocks at ground level (row ~4.2) mark the boundary
    // between Prawal's side and the gateway. They sit ON the earth,
    // blue-cool tinted — remnants of a wall that is dissolving.
    const pillarL = this.placeAt(3.8, 4.2, 'k-rock-tall-a', {
      scale:  0.72,
      shadow: { width: 16, height: 4, offsetY: 5, alpha: 0.14 },
    });
    if (pillarL) pillarL.setTint(0x7788AA);  // cool slate — his world

    const pillarR = this.placeAt(5.0, 4.3, 'k-rock-tall-b', {
      scale:  0.58,
      shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (pillarR) pillarR.setTint(0x886655);  // warming — the shift begins

    // ── PRAWAL'S SIDE — the solitary journey ─────────────────────
    // A weathered tree: towering but alone, deep cool blue.
    const lowerCool = this.placeAt(0.6, 4.6, 'k-tree-fat', {
      scale:  0.78,
      layer:  'midground',
      shadow: { width: 28, height: 6, offsetY: 8, alpha: 0.10 },
    });
    if (lowerCool) lowerCool.setTint(0x5566AA);

    // A weathered stump: the life before he found her.
    // Low, rooted, past-tense — but present, planted.
    const stump = this.placeAt(0.9, 4.7, 'k-stump', {
      scale:  0.52,
      layer:  'midground',
      shadow: { width: 14, height: 3, offsetY: 4, alpha: 0.12 },
    });
    if (stump) stump.setTint(0x4455AA);

    // A fallen log: a rest stop on a long road walked alone.
    const log = this.placeAt(1.7, 5.2, 'k-log', {
      scale:  0.54,
      layer:  'midground',
      shadow: { width: 20, height: 4, offsetY: 4, alpha: 0.10 },
    });
    if (log) log.setTint(0x4466AA);

    // ── CAMPFIRE — beside the stump, warmth on a cold journey ────
    // campfire_logs rests between the stump and log, suggesting Prawal
    // has been waiting here long enough to light a fire before she arrives.
    const cfLogs = this.placeAt(2.4, 4.95, 'k-campfire-logs', { scale: 0.54 });
    // No tint — the native warm brown-orange of the Kenney asset is correct for a fire.
    if (this.textures.exists('light-blob')) {
      const cfPos  = this.grid(2.4, 4.95);
      this._cfGlow = this.add.image(cfPos.x, cfPos.y + 8, 'light-blob')
        .setScale(1.8, 0.9).setAlpha(0.24).setTint(0xFF7722)
        .setBlendMode('ADD').setDepth(-3);
      this.tweens.add({
        targets:  this._cfGlow,
        alpha:    { from: 0.24, to: 0.10 },
        scaleX:   { from: 1.8,  to: 2.2 },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── GATEWAY ARCH — the most Alto's Adventure element ─────────
    // Two trees frame the reunion like a natural archway. The player
    // literally walks between them to reach the bench.
    //   Left pillar:  cool angular pine — his world arriving
    //   Right pillar: warm rounded oak  — her world waiting
    // Arch tightened: cols 5.2 + 7.2 (was 4.6 + 8.2) — gap reduced from 230px
    // to ~102px so both trees frame the bench simultaneously in most camera frames.
    const archL = this.placeAt(5.2, 1.8, 'k-tree-pine-a', {
      scale:  0.88,
      layer:  'midground',
      shadow: { width: 24, height: 5, offsetY: 8, alpha: 0.14 },
    });
    if (archL) archL.setTint(0x5566AA);   // cool — his pillar

    const archR = this.placeAt(7.2, 1.7, 'k-tree-oak', {
      scale:  0.92,
      layer:  'midground',
      shadow: { width: 30, height: 6, offsetY: 9, alpha: 0.14 },
    });
    if (archR) archR.setTint(0xDDBB88);   // warm amber — her pillar

    // ── SECONDARY BACKDROP TREES ─────────────────────────────────
    // Far right: full warm tree deepens Aashna's side of the world.
    const upperFar = this.placeAt(10.5, 1.8, 'k-tree-detailed', {
      scale:  0.72,
      layer:  'midground',
      shadow: { width: 22, height: 5, offsetY: 7, alpha: 0.10 },
    });
    if (upperFar) upperFar.setTint(0xCC9966);

    // ── STEPPING STONES — visible path toward the bench ──────────
    // Two stones along the ground plane. Rows now staggered (was 4.85/4.90
    // — almost identical Y). s1 deeper (closer to camera), s2 shallower.
    const s1 = this.placeAt(3.4, 5.1, 'k-rock-small-a', { scale: 0.34 });
    if (s1) s1.setTint(0x6677AA);           // cool start
    const s2 = this.placeAt(4.7, 4.6, 'k-rock-small-b', { scale: 0.30 });
    if (s2) s2.setTint(0x997744);           // warming toward center

    // ── FLOWER TRAIL — breadcrumbs warming left → right ─────────
    // Color temperature rises: purple (his solitude) → gold (reunion).
    // Rows intentionally staggered — was 4.55–4.72 (near-horizontal line).
    // Now: 4.3 / 5.0 / 4.55 / 4.9 / 4.5 — each flower on a distinct row.
    this.placeAt(2.4, 4.3,  'k-flower-purple', { scale: 0.58, layer: 'midground' });
    this.placeAt(4.8, 5.0,  'k-flower-red',    { scale: 0.62, layer: 'midground' });

    // Convergence bouquet — blooms at bench feet, tightly grouped.
    // Three flowers, staggered in depth — reads as a full bouquet.
    this.placeAt(5.8, 4.55, 'k-flower-yellow',  { scale: 0.70, layer: 'midground' });
    this.placeAt(6.3, 4.9,  'k-flower-red-b',   { scale: 0.62, layer: 'midground' });
    this.placeAt(6.8, 4.5,  'k-flower-purple',  { scale: 0.58, layer: 'midground' });

    // ── AASHNA'S SIDE — warm, lush, welcoming ────────────────────
    // A full leafy bush grounds the right edge.
    // A tall plant behind it adds a second depth plane.
    // Nothing sparse or lonely over here — this side is alive.
    const warmBush = this.placeAt(9.6, 4.8, 'k-bush-large', {
      scale:  0.60,
      layer:  'midground',
      shadow: { width: 24, height: 5, offsetY: 5, alpha: 0.10 },
    });
    if (warmBush) warmBush.setTint(0xCC9944);

    // Moved from row 3.4 (upper half) to 4.5 — still reads as backdrop
    // depth plane behind the warm bush but now sits in the lower half.
    const tallPlant = this.placeAt(10.4, 4.5, 'k-plant-flat-tall', {
      scale:  0.46,
      layer:  'midground',
    });
    if (tallPlant) tallPlant.setTint(0xBB9966);

    // ── BENCH — the single moment where two paths become one ──────
    // col 6.2 centres the bench between the tightened arch trees (5.2 + 7.2).
    // Row 4.85: sits visibly ON the earth band rather than floating above the hill slope.
    this.placeInteractable(6.2, 4.85, 'k-bench', {
      id:            'path_merge',
      label:         'Together',
      triggerRadius: 64,
      glowRadius:    150,
      skipUnlockSFX: true,
      onTrigger:     () => this._onMerge(),
    }, {
      scale:  0.70,
      shadow: { width: 32, height: 7, offsetY: 7, alpha: 0.18 },
    });

    // ── EMOTE — one floating heart above the bench only ──────────
    // No floating emote on the left (dialogue handles the solitude beat).
    // Only love at the destination.
    const heartPos = this.grid(6.2, 3.85);
    this._addEmote(heartPos.x, heartPos.y, 'emote-hearts', { scale: 0.28, depth: 30, delay: 400 });

    // ── PLAYER-PATH OCCLUSION — Y-sorted, rows 5.3–5.6 ─────────────
    // Player walks rows 4.0–5.2 (depth ≈288–365). Props at rows 5.3–5.6
    // (depth ≈371–390) always render in front — outdoor 2.5D occlusion.
    // Cool-tinted rocks/stumps left; warm-tinted bushes/plants right.
    // 7 props across full width so player passes through at least one.
    const ppRkL = this.placeAt(0.8, 5.4, 'k-rock-tall-a', {
      scale: 0.54, shadow: { width: 14, height: 3, offsetY: 4, alpha: 0.12 },
    });
    if (ppRkL) ppRkL.setTint(0x4466BB);

    const ppStA = this.placeAt(2.6, 5.5, 'k-stump', {
      scale: 0.50, shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppStA) ppStA.setTint(0x4466AA);

    const ppRkM = this.placeAt(4.4, 5.3, 'k-rock-small-b', {
      scale: 0.44, shadow: { width: 10, height: 3, offsetY: 3, alpha: 0.10 },
    });
    if (ppRkM) ppRkM.setTint(0x7788AA);

    const ppBshM = this.placeAt(6.6, 5.5, 'k-plant-flat-tall', {
      scale: 0.52, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppBshM) ppBshM.setTint(0xAA8844);

    const ppBshR = this.placeAt(8.4, 5.4, 'k-bush-large', {
      scale: 0.44, shadow: { width: 18, height: 4, offsetY: 4, alpha: 0.10 },
    });
    if (ppBshR) ppBshR.setTint(0xBB9933);

    const ppRkR = this.placeAt(10.2, 5.3, 'k-rock-tall-b', {
      scale: 0.48, shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppRkR) ppRkR.setTint(0xCC9944);

    const ppTpR = this.placeAt(11.6, 5.5, 'k-plant-flat-tall', {
      scale: 0.56, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppTpR) ppTpR.setTint(0xBB9944);

    // ── LOWER SCATTER — rows 5.8–6.5 ────────────────────────────────
    // Ground-level detail filling the previously empty lower half.
    // Tints shift cool (left) → warm (right) echoing the dawn narrative.
    const lsRkA = this.placeAt(1.4, 5.9, 'k-rock-small-a', { scale: 0.38 });
    if (lsRkA) lsRkA.setTint(0x4466BB);
    const lsFpA = this.placeAt(3.0, 6.3, 'k-flower-purple', { scale: 0.36 });
    if (lsFpA) lsFpA.setTint(0x8899CC);
    const lsRkB = this.placeAt(5.0, 6.0, 'k-rock-small-b', { scale: 0.32 });
    if (lsRkB) lsRkB.setTint(0x887766);
    const lsFlY = this.placeAt(7.0, 6.4, 'k-flower-yellow', { scale: 0.38 });
    if (lsFlY) lsFlY.setTint(0xDDAA44);
    const lsBshA = this.placeAt(8.8, 5.9, 'k-plant-small-1', { scale: 0.44 });
    if (lsBshA) lsBshA.setTint(0xBB9933);
    const lsFlR = this.placeAt(10.6, 6.2, 'k-flower-red', { scale: 0.40 });
    if (lsFlR) lsFlR.setTint(0xCC7744);

    // ── MID-FOREGROUND OCCLUSION — Y-sorted, rows 6.7–7.1 ──────────
    // Five props forming the near-camera "forest floor" line.
    // Cool rocks on left; warm bushes on right.
    const mfRkL = this.placeAt(1.0, 7.0, 'k-rock-tall-a', {
      scale: 0.56, shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (mfRkL) mfRkL.setTint(0x3355AA);
    const mfLogA = this.placeAt(3.4, 6.8, 'k-log', {
      scale: 0.50, shadow: { width: 18, height: 4, offsetY: 4, alpha: 0.10 },
    });
    if (mfLogA) mfLogA.setTint(0x4466AA);
    const mfBsh = this.placeAt(6.2, 7.0, 'k-bush-large', {
      scale: 0.46, shadow: { width: 20, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (mfBsh) mfBsh.setTint(0xAA8833);
    const mfPlant = this.placeAt(8.8, 6.9, 'k-plant-flat-tall', {
      scale: 0.54, shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (mfPlant) mfPlant.setTint(0xBB9933);
    const mfBshR = this.placeAt(11.2, 7.1, 'k-bush-large', {
      scale: 0.52, shadow: { width: 22, height: 5, offsetY: 5, alpha: 0.10 },
    });
    if (mfBshR) mfBshR.setTint(0xCC9944);

    // ── BOTTOM-EDGE FRAMERS — depth 601, partially off-screen ───────
    // Rock + bush + stump bases at rows 7.2–7.8 — cool left, warm right.
    const bfL  = this.grid(0.4,  7.6);
    const bfML = this.grid(3.0,  7.2);
    const bfC  = this.grid(5.8,  7.8);
    const bfMR = this.grid(8.4,  7.4);
    const bfR  = this.grid(11.6, 7.3);
    this.add.image(bfL.x,  bfL.y,  'k-rock-tall-a')
      .setOrigin(0.5, 0.90).setScale(0.80).setTint(0x2A3A66).setAlpha(0.85).setDepth(601);
    this.add.image(bfML.x, bfML.y, 'k-stump')
      .setOrigin(0.5, 0.94).setScale(0.72).setTint(0x344488).setAlpha(0.80).setDepth(601);
    this.add.image(bfC.x,  bfC.y,  'k-bush-large')
      .setOrigin(0.5, 0.92).setScale(0.60).setTint(0x7A6022).setAlpha(0.75).setDepth(601);
    this.add.image(bfMR.x, bfMR.y, 'k-rock-tall-b')
      .setOrigin(0.5, 0.90).setScale(0.68).setTint(0xAA8833).setAlpha(0.78).setDepth(601);
    this.add.image(bfR.x,  bfR.y,  'k-plant-flat-tall')
      .setOrigin(0.5, 0.90).setScale(0.74).setTint(0xBB9933).setAlpha(0.85).setDepth(601);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND DECOR — dawn clearing outdoor scatter
  // ═══════════════════════════════════════════════════════════════════

  buildGroundDecor() {
    // Outdoor dawn clearing: small rocks and flowers only — no indoor plants.
    this._spawnGroundDecor({
      pool:     ['k-rock-small-a', 'k-rock-small-b', 'k-flower-purple', 'k-flower-yellow'],
      density:  0.03,
      rowRange: [5.4, 6.2],
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    // Player at far left — the start of the journey
    const start = this.grid(1.5, 4.5);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male-formal' },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.30, dynamic: true,
    });

    // Aashna waiting in the warm half — col 7.0 sits inside the bench glow radius
    // so she reads as lit rather than caught in the right vignette shadow.
    // Row 4.0 keeps her above the player-path occlusion band (5.3–5.6).
    const aPos = this.grid(7.0, 4.0);
    this._aashna = this.charSystem.createFemale(aPos.x, aPos.y, { texture: 'char-female-formal' });
    this.shadows.add(this._aashna.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.25, dynamic: true,
    });
    this._aashna.wander(aPos.x, aPos.y, 12);
  }

  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    const W = this.worldW;

    // Dawn motes — warm peach, drifting gently upward
    if (this.textures.exists('particle-glow')) {
      this.add.particles(W / 2, 0, 'particle-glow', {
        x:         { min: -W / 2, max: W / 2 },
        speedY:    { min: 5, max: 14 },
        speedX:    { min: -3, max:  3 },
        scale:     { start: 0.14, end: 0 },
        alpha:     { start: 0.24, end: 0 },
        tint:      [0xFF9940, 0xFFBB66, 0xFFD080],
        lifespan:  { min: 3000, max: 6000 },
        frequency: 220,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 50));
    }

    // ── CONVERGENCE SPARKS — magical rising motes at the bench ────
    // Faint golden particles drift upward from the reunion point,
    // marking it as a destination worth walking toward.
    const bp2 = this.grid(6.2, 4.85);
    // particle-flare renders as a soft radial glow — genuine magical mote.
    // particle-light is the circular fallback. Both are ADD-blended orbs.
    const flareKey = this.textures.exists('particle-flare') ? 'particle-flare'
                   : this.textures.exists('particle-light') ? 'particle-light'
                   : this.textures.exists('particle-circle') ? 'particle-circle' : null;
    if (flareKey) {
      this.add.particles(bp2.x, bp2.y - 20, flareKey, {
        x:         { min: -55, max: 55 },
        y:         { min: -8,  max: 8 },
        speedY:    { min: -22, max: -7 },
        speedX:    { min: -6,  max:  6 },
        scale:     { start: 0.18, end: 0 },
        alpha:     { start: 0.45, end: 0 },
        tint:      [0xFFDD88, 0xFFBB44, 0xFFEECC, 0xFFCC66],
        lifespan:  { min: 2200, max: 4000 },
        frequency: 350,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(20);
    }

    // ── CINEMATIC INTRO — reveal "she is waiting" before control ──
    // Pan from player-start to Aashna's side (bench), hold, pan back.
    this._cinematic = true;
    if (this._player) this._player.sprite.setAlpha(0);

    const bars      = this.cam.letterbox(40, 1000);
    const startPos  = this.grid(1.5, 4.5);
    const mergePos  = this.grid(7.0, 4.0);

    // Snap to player start first (avoids floating camera on load)
    this.cam.slowPan(startPos.x, startPos.y, 80, 'Linear', () => {
      // Sweep right to reveal bench + Aashna
      this.cam.slowPan(mergePos.x, mergePos.y, 2400, 'Sine.easeInOut', () => {
        // Hold 700ms so player can see Aashna clearly
        this.time.delayedCall(700, () => {
          if (!this.sys?.isActive()) return;
          // Pan back to player start and release control
          this.cam.slowPan(startPos.x, startPos.y, 2000, 'Sine.easeInOut', () => {
            bars.remove(500);
            if (this._player) this._player.sprite.setAlpha(1);
            this._cinematic = false;
            if (this._player) {
              this.cam.follow(this._player.sprite);
              this.lighting.followTarget(this._player.sprite);
            }

            this.time.delayedCall(400, () => {
              if (!this.sys?.isActive()) return;
              const lines = storyData.dialogues?.ch13_intro;
              if (lines) this.dialogue?.start(lines);
            });
          });
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION — paths merge
  // ═══════════════════════════════════════════════════════════════════

  _onMerge() {
    this.proximity.setEnabled('path_merge', false);
    // sparkle-chime echoes the convergence sparks at the exact moment of arrival
    audioManager._playTextureEvent?.('sparkle-chime');
    // Delay stinger 380ms — lets zoom pulse peak before the emotional sting lands
    this.time.delayedCall(380, () => { if (!this.sys?.isActive()) return; audioManager.playStinger('reunion'); });
    this.cam.zoomPulse(1.55, 1000);

    // Burst the merge glow
    if (this._mergeGlow) {
      this.tweens.killTweensOf(this._mergeGlow);
      this.tweens.add({
        targets:  this._mergeGlow,
        alpha:    0.60,
        scale:    6.0,
        duration: 500,
        yoyo:     true,
        ease:     'Quad.easeOut',
        onComplete: () => {
          if (!this.sys?.isActive()) return;
          this.tweens.add({
            targets:  this._mergeGlow,
            alpha:    { from: 0.20, to: 0.06 },
            scale:    { from: 3.4,  to: 4.2 },
            duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        },
      });
    }

    const lines = storyData.dialogues?.ch13_reunion;
    if (lines) {
      this.dialogue?.start(lines, () => {
        if (!this.sys?.isActive()) return;
        this._chapterComplete();
      });
    }
  }

  _chapterComplete() {
    this._guardTransition(() => {
      goToChapter(this, 13);
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
    this.tweens.killTweensOf(this._sunRise);
    this.tweens.killTweensOf(this._coolWash);
    this.tweens.killTweensOf(this._glowOuter);
    this.tweens.killTweensOf(this._mergeGlow);
    this.tweens.killTweensOf(this._glowInner);
    this.tweens.killTweensOf(this._mist);
    this.tweens.killTweensOf(this._cfGlow);
    audioManager.fadeOutAll(600);
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
