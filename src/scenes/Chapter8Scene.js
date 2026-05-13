import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter9Scene — "Something Real"
 *
 * Dusk clearing. A shared bench glows softly at the centre of the
 * frame. Aashna is already there. The player walks toward her.
 * One interaction. No distractions.
 *
 * Spatial logic (12 cols × 8 rows, cell 64px = 768 × 512):
 *
 *   Trees form a gateway arch behind the bench:
 *     oak(5.0, 2.2) — fat(8.0, 2.2)   (layer: midground)
 *   Background framing trees far left / far right (layer: midground).
 *   Floor lamp at (6.5, 3.2) behind bench — warm axis light.
 *   Single flower at (4.0, 4.8) — breadcrumb guide for player.
 *   Bench focal point at (6.5, 4.5) — three-layer rose-amber glow.
 *   Aashna wanders (7.8, 4.5) radius 14 — already at the bench.
 *
 *   Camera viewport at zoom 1.72 = 558px.
 *   Player at col 1.5 (x=128). Bench at col 6.5 (x=448). Aashna at
 *   col 7.8 (x=531). All three land within the opening 558px — the
 *   scene reads completely on the first frame.
 */
export class Chapter8Scene extends ChapterScene {
  constructor() {
    super('Chapter8', {
      cols:       12,
      rows:       8,
      mood:       'warm',
      zoom:       1.72,
      targetZoom: 1.80,
      followLerp: 0.055,
      drift:      false,
      fadeInMs:   1800,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — twilight clearing, indigo-purple sky, amber horizon
  //
  //  OpenEnvironment handles the full layer stack (bottom→top):
  //    sky gradient (3-stop indigo→violet→amber)
  //    sun haze blob, cloud parallax A/B
  //    mountains → midHills → hills → near-black treeline
  //    horizon atmospheric glow, ground strip, fg silhouette trees
  //    vignette, film grain, color grade
  //
  //  We add only the scene-specific glow for the bench focal point.
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // ── OPEN environment — deep twilight, forest clearing ─────────
    this.env = EnvironmentManager.apply(this, 'OPEN', {
      sky: {
        topColor: 0x14082A,   // deep indigo crown
        midColor: 0x3A1A5C,   // rich violet mid
        botColor: 0xCC6622,   // warm amber horizon spill
        bgColor:  0x14082A,
      },
      sun: {
        enabled: true,
        x: 0.68, y: 0.24,
        scaleX: 4.2, scaleY: 2.4,
        tint:  0xFF9944, alpha: 0.22,
      },
      horizon: {
        color:     0xFF8844,
        peakAlpha: 0.03,
        topStart:  0.34, topH: 0.09,
        botStart:  0.43, botH: 0.09,
      },
      cloudsA: { tint: 0x8866AA, alpha: 0.15 },
      cloudsB: { tint: 0x664488, alpha: 0.08 },
      mountains: { tint: 0x3A1A44, alpha: 0.55 },
      midHills:  { tint: 0x2A1038, alpha: 0.68 },
      hills:     { texture: 'bg-el-hills', tint: 0x1A0A2A, alpha: 0.80 },
      treeline:  { y: 0.36, h: 0.64, tint: 0x0A0514, alpha: 0.94 },
      ground: {
        topColor:  0x1A0A28,
        botColor:  0x040100,
        startFrac: 0.82,
      },
      vignette: {
        size:   100,
        color:  0x0E0618,
        alphaL: 0.68, alphaR: 0.68,
        alphaT: 0.75, alphaB: 0.62,
      },
      colorGrade: { color: 0xBB88FF, alpha: 0.015, blend: 'OVERLAY' },
    });

    const cx = this.worldW / 2;
    const cy = this.worldH / 2;

    if (this.textures.exists('light-blob')) {
      // Faint ambient violet-amber wash — lifts the floor from pure black
      // scrollFactor(0) keeps it camera-pinned so it doesn't drift as camera pans.
      this.add.image(cx, cy + 40, 'light-blob')
        .setScale(16, 8).setAlpha(0.05).setTint(0x996688)
        .setBlendMode('ADD').setDepth(-10).setScrollFactor(0);

      // ── Three-layer bench glow — warm island of light ───────────
      const bp = this.grid(6.5, 5.4);

      this._glowOuter = this.add.image(bp.x, bp.y + 10, 'light-blob')
        .setScale(7.0).setAlpha(0.09).setTint(0xFFBB66)
        .setBlendMode('ADD').setDepth(-9);
      this.tweens.add({
        targets:  this._glowOuter,
        alpha:    { from: 0.09, to: 0.03 },
        scale:    { from: 7.0,  to: 8.5 },
        duration: 3800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      const glowMid = this.add.image(bp.x, bp.y + 10, 'light-blob')
        .setScale(3.4).setAlpha(0.22).setTint(0xFFCC88)
        .setBlendMode('ADD').setDepth(-8);
      this.tweens.add({
        targets:  glowMid,
        alpha:    { from: 0.22, to: 0.08 },
        scale:    { from: 3.4,  to: 4.0 },
        duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this._benchGlow = glowMid;

      this._glowInner = this.add.image(bp.x, bp.y + 4, 'light-blob')
        .setScale(1.5).setAlpha(0.35).setTint(0xFFEECC)
        .setBlendMode('ADD').setDepth(-7);
      this.tweens.add({
        targets:  this._glowInner,
        alpha:    { from: 0.35, to: 0.14 },
        scale:    { from: 1.5,  to: 1.9 },
        duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — twilight forest clearing
  //
  //  NARRATIVE COMPOSITION:
  //    "Something changed. It wasn't sudden. It was slow, and warm, and real."
  //    This is the chapter where they fell in love quietly. The scene must
  //    feel intimate and slightly magical — not a public park, but a private
  //    clearing where two people ended up together without planning it.
  //
  //    FRAME:   6 dark tree silhouettes create a forest enclosure.
  //             Left/right pairs frame the edges. Pine gateway pines
  //             form a natural arch behind the bench.
  //    FLOOR:   Flower trail (yellow→purple→red) breadcrumbs the player
  //             toward the warm amber glow of the bench.
  //    ANCHOR:  Single bench. All other elements point toward it.
  //    DEPTH:   Trees rows 3.0–3.8 / bench row 4.2 / bushes 4.3–4.5 /
  //             grass row 4.8 — clear 2.5D layering.
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    // ── DARK SILHOUETTE TREES — forest alcove framing ────────────
    // Bases at rows 3.0–3.8 = sit on/above the horizon.
    // Crowns extend into sky = proper Alto's Adventure silhouette trees.
    // Depth < -10 = behind all floor props.

    // Far background trees — tiny silhouettes at rows 2.5–2.7 give the
    // treeline a third depth plane behind the gateway and entry trees.
    // Depth -16 + low alpha = barely perceived, reads as distant forest haze.
    const tBgL = this.placeAt(1.4, 2.5, 'k-tree-simple-dark', { scale: 0.42, ySort: false });
    if (tBgL) tBgL.setTint(0x08030F).setAlpha(0.55).setDepth(-16);
    const tBgR = this.placeAt(10.6, 2.7, 'k-tree-thin-dark', { scale: 0.40, ySort: false });
    if (tBgR) tBgR.setTint(0x08030F).setAlpha(0.50).setDepth(-16);

    // Left entry pair — sentinel trees at the scene entrance
    // tL1 moved to row 4.1 (was 3.8) — base touches the ground, creates a
    // floor-anchored sentinel feel distinct from the floating midground trees.
    const tL1 = this.placeAt(0.6, 4.1, 'k-tree-oak-dark', { scale: 0.84, ySort: false });
    if (tL1) tL1.setTint(0x180A28).setDepth(-12);
    const tL2 = this.placeAt(2.0, 3.5, 'k-tree-tall-dark', { scale: 0.72, ySort: false });
    if (tL2) tL2.setTint(0x140620).setDepth(-11);

    // Gateway arch pines — frame the bench focal point
    const tC1 = this.placeAt(4.8, 3.2, 'k-tree-pine-d', { scale: 0.86, ySort: false });
    if (tC1) tC1.setTint(0x0E0418).setDepth(-13);
    const tC2 = this.placeAt(8.2, 3.0, 'k-tree-pine-c', { scale: 0.78, ySort: false });
    if (tC2) tC2.setTint(0x0A0314).setDepth(-13);

    // Right entry pair (mirror of left)
    // tR2 moved to row 4.0 (was 3.8) — mirrors tL1's ground-anchored position.
    const tR1 = this.placeAt(10.0, 3.5, 'k-tree-tall-dark', { scale: 0.72, ySort: false });
    if (tR1) tR1.setTint(0x140620).setDepth(-11);
    const tR2 = this.placeAt(11.4, 4.0, 'k-tree-oak-dark', { scale: 0.84, ySort: false });
    if (tR2) tR2.setTint(0x180A28).setDepth(-12);

    // ── MID-GROUND PROPS — rows 4.2–4.5: bridge treeline to floor ────────
    // Without these, there is a visible empty band between the lowest tree
    // bases (row 4.0) and the walkable flower trail (row 4.8). Rocks and a
    // stump at varied Y positions close that gap and break linear alignment.
    // Tint 0x281038 = dark purple-maroon — matches dusk silhouette palette.
    const rockL = this.placeAt(3.0, 4.4, 'k-rock-small-a', { scale: 0.52 });
    if (rockL) rockL.setTint(0x281038);
    const stumpC = this.placeAt(5.8, 4.3, 'k-stump', { scale: 0.44 });
    if (stumpC) stumpC.setTint(0x381848);
    const rockR = this.placeAt(9.2, 4.5, 'k-rock-small-b', { scale: 0.48 });
    if (rockR) rockR.setTint(0x281038);

    // ── BENCH — the warm intimate focal point ────────────────────
    // Row 5.4 = flat-floor zone for this env config (ground startFrac 0.82
    // places visible surface at row ~5.5; row 5.4 grounds the bench correctly).
    this.placeInteractable(6.5, 5.4, 'k-bench-soft', {
      id:            'bench_together',
      label:         'Sit Together',
      triggerRadius: 62,
      glowRadius:    148,
      skipUnlockSFX: true,
      onTrigger:     () => this._onBenchReached(),
    }, {
      scale:  0.68,
      shadow: { width: 28, height: 6, offsetY: 6, alpha: 0.20 },
    });

    // ── TWILIGHT BUSHES — dark dusk silhouette ground cover ───────
    // Tint 0x3A1838 = dark purple-maroon — correct dusk silhouette value,
    // not the neon 0x6A3060 which pops loudly on the near-black ground.
    const bL = this.placeAt(3.4, 5.0, 'k-bush', {
      scale:  0.56,
      shadow: { width: 16, height: 4, offsetY: 4, alpha: 0.10 },
    });
    if (bL) bL.setTint(0x3A1838);

    const bR = this.placeAt(9.6, 5.8, 'k-bush-large', {
      scale:  0.62,
      shadow: { width: 20, height: 5, offsetY: 5, alpha: 0.10 },
    });
    if (bR) bR.setTint(0x3A1838);

    // ── FLOWER TRAIL — warm breadcrumbs toward the bench ─────────
    // Row variation 4.8–6.0 gives a natural scatter; trail terminates
    // just before Aashna (col 7.8) so the destination feels reached.
    this.placeAt(2.6, 5.8, 'k-flower-yellow',  { scale: 0.62 });
    this.placeAt(4.4, 4.8, 'k-flower-purple',  { scale: 0.58 });
    this.placeAt(5.4, 5.6, 'k-flower-red',     { scale: 0.56 });
    this.placeAt(7.0, 5.0, 'k-flower-yellow',  { scale: 0.58 });
    this.placeAt(7.4, 6.0, 'k-flower-purple',  { scale: 0.52 });

    // ── GROUND DETAIL — visible dusk-purple grass tufts ──────────
    // Tint raised to 0x5A2A6A so they read against the dark floor.
    const gL = this.placeAt(1.4, 6.2, 'k-grass-leafs', { scale: 0.44 });
    if (gL) gL.setTint(0x5A2A6A);
    const gR = this.placeAt(10.8, 5.4, 'k-grass-leafs', { scale: 0.44 });
    if (gR) gR.setTint(0x5A2A6A);

    // ── EMOTE — heart floats above the bench, draws eye ──────────
    const ep = this.grid(6.5, 4.6);
    this._addEmote(ep.x, ep.y, 'emote-heart', { scale: 0.28, depth: 30, delay: 0 });

    // ── MID-FOREGROUND OCCLUSION — Y-sorted, player can go behind ─
    // Placed at rows 6.3–6.9 so their Y > player Y (~5.5 = 384px).
    // Y-sort depth = gameplay base (0) + sprite.y → automatic front/back
    // ordering relative to the player without any manual depth writes.
    //
    // These partially overlap the lower portion of the walkable corridor,
    // adding a sense of depth not achievable with fixed-depth overlays.
    // All use the same dark dusk silhouette palette as the twilight bushes.
    //
    // Left edge — large bush, half-cropped by viewport bottom
    const occBushL = this.placeAt(0.5, 6.9, 'k-bush-large', {
      scale: 0.78,
      shadow: { width: 22, height: 5, offsetY: 5, alpha: 0.08 },
    });
    if (occBushL) occBushL.setTint(0x2E1430);

    // Left-center — rock cluster, mid-depth position
    const occRockL = this.placeAt(2.4, 6.4, 'k-rock-large-a', { scale: 0.50 });
    if (occRockL) occRockL.setTint(0x241030);

    // Left-center secondary — small bush behind the rock
    const occBushLC = this.placeAt(3.2, 6.7, 'k-bush-small', { scale: 0.52 });
    if (occBushLC) occBushLC.setTint(0x2E1430);

    // Right-center — rock pair, offset from bench so it reads clean
    const occRockR = this.placeAt(8.4, 6.5, 'k-rock-small-a', { scale: 0.54 });
    if (occRockR) occRockR.setTint(0x241030);

    // Right edge — large bush mirroring left, at a slightly different row
    const occBushR = this.placeAt(11.5, 6.7, 'k-bush-large', {
      scale: 0.72,
      shadow: { width: 20, height: 5, offsetY: 5, alpha: 0.08 },
    });
    if (occBushR) occBushR.setTint(0x2E1430);

    // Partial tree base — left sentinel (0.6, 4.1) trunk continues to floor
    // A second small-scale dark oak placed lower gives the impression the
    // upper tree's trunk extends down into the viewer's space.
    const occTrunkL = this.placeAt(0.6, 6.3, 'k-tree-oak-dark', {
      scale:   0.40,
      ySort:   true,
      originY: 0.95,
    });
    if (occTrunkL) occTrunkL.setTint(0x120820).setAlpha(0.80);

    // ── FOREGROUND OCCLUSION — dark bush silhouettes at depth 601 ─
    // Bottom-edge framing prevents the empty floor band reading as void.
    // Origin (0.5, 0.85) crops the base into the viewport edge naturally.
    // fg bush rows intentionally differ (7.6 vs 7.3) to break mirror symmetry.
    const fwL = this.grid(0.6, 7.6);
    const fwR = this.grid(11.4, 7.3);
    this.add.image(fwL.x, fwL.y, 'foliage-bush1')
      .setOrigin(0.5, 0.85).setScale(0.88).setTint(0x1A0828).setAlpha(0.90).setDepth(601);
    this.add.image(fwR.x, fwR.y, 'foliage-bush1')
      .setOrigin(0.5, 0.85).setScale(0.92).setTint(0x1A0828).setAlpha(0.90).setDepth(601).setFlipX(true);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND DECOR — warm-only pool (overrides noisy default)
  // ═══════════════════════════════════════════════════════════════════

  buildGroundDecor() {
    // Warm twilight pool only — no cold greens or foliage-flower-blue.
    // rowRange [4.5, 6.5] focuses scatter in the walkable floor zone.
    // Density 0.20 = visible coverage without drowning the authored flower trail.
    this._spawnGroundDecor({
      pool: [
        'k-grass', 'k-grass',
        'k-grass-leafs',
        'k-flower-yellow', 'k-flower-red', 'k-flower-purple',
        'foliage-flower-red',
      ],
      density:  0.20,
      rowRange: [4.5, 6.5],
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    // Player at the left edge of the clearing — just entered
    const start = this.grid(1.5, 5.5);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male-smart', displayW: 40, displayH: 62 },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.28, dynamic: true,
    });

    // Aashna — already at the bench, tight wander radius (she's waiting)
    const aPos = this.grid(7.8, 5.5);
    this._aashna = this.charSystem.createFemale(aPos.x, aPos.y, { texture: 'char-female-yellow' });
    this.shadows.add(this._aashna.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.25, dynamic: true,
    });
    this._aashna.wander(aPos.x, aPos.y, 14);
  }

  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    const W = this.worldW;
    const H = this.worldH;

    // Sparse warm embers drifting upward — atmosphere without noise
    if (this.textures.exists('particle-glow')) {
      this.add.particles(W / 2, H * 0.60, 'particle-glow', {
        x:         { min: -W * 0.35, max: W * 0.35 },
        speedY:    { min: -8,  max: -2  },
        speedX:    { min: -3,  max: 3   },
        scale:     { start: 0.08, end: 0 },
        alpha:     { start: 0.20, end: 0 },
        tint:      [0xFFCC66, 0xFFAA44, 0xFFDD88],
        lifespan:  { min: 4500, max: 8000 },
        frequency: 500,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 50));

      // Firefly-like amber orbs — very sparse, slow drift, unique to this scene
      this.add.particles(W / 2, H * 0.45, 'particle-glow', {
        x:         { min: -W * 0.40, max: W * 0.40 },
        y:         { min: -H * 0.30, max: H * 0.20 },
        speed:     { min: 1,  max: 5  },
        scale:     { start: 0.14, end: 0.02 },
        alpha:     { start: 0.35, end: 0 },
        tint:      [0xFFDD66, 0xFFBB44, 0xEECC55],
        lifespan:  { min: 6000, max: 9000 },
        frequency: 1200,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 51));
    }

    // Intro narration — matches ch9_intro in story.json
    this.time.delayedCall(2000, () => {
      if (!this.sys?.isActive()) return;
      const lines = storyData.dialogues?.ch9_intro;
      if (lines) this.dialogue?.start(lines);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION — bench reached
  // ═══════════════════════════════════════════════════════════════════

  _onBenchReached() {
    audioManager._playTextureEvent?.('soft-click');
    this.cam.zoomPulse(1.55, 1000);

    // Flash the mid glow then return to idle pulse
    if (this._benchGlow) {
      this.tweens.killTweensOf(this._benchGlow);
      this.tweens.add({
        targets:  this._benchGlow,
        alpha:    0.58,
        scale:    5.0,
        duration: 500,
        yoyo:     true,
        ease:     'Quad.easeOut',
        onComplete: () => {
          if (!this.sys?.isActive()) return;
          this.tweens.add({
            targets:  this._benchGlow,
            alpha:    { from: 0.22, to: 0.08 },
            scale:    { from: 3.4,  to: 4.0 },
            duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        },
      });
    }

    const lines = storyData.dialogues?.ch8_growth;
    if (lines) {
      this.dialogue?.start(lines, () => this._chapterComplete());
    }
  }

  _chapterComplete() {
    // Delay stinger 280ms — the love-realization beat must land clean, not under the wipe
    this.time.delayedCall(280, () => {
      if (this.sys?.isActive()) audioManager.playStinger('revelation');
    });
    this._guardTransition(() => {
      goToChapter(this, 8);
    });
  }

  onUpdate(_time, _delta) {
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);
  }

  onShutdown() {
    this.tweens.killTweensOf(this._glowOuter);
    this.tweens.killTweensOf(this._glowInner);
    this.tweens.killTweensOf(this._benchGlow);
    audioManager.fadeOutAll(600);
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
