import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter10Scene — "Little Storms"
 *
 * Stormy night clearing. Walking left-to-right IS the emotional arc:
 * oppressive cold storm (left) → bench meeting point (centre) → warm
 * reunion where Aashna stands waiting (right).
 *
 * Spatial logic (12 cols × 8 rows, cell 64px = 768 × 512):
 *
 *   LEFT ZONE  (cols 0–4)  — ice-blue darkness, storm debris, cold lamp
 *   CENTRE     (cols 5–7)  — bench anchor, three-layer warm glow
 *   RIGHT ZONE (cols 8–11) — warm amber, blooming ground, Aashna
 *
 *   7 dark silhouette trees at rows 3.0–3.6 (horizon band, NOT sky zone).
 *   Storm debris (rocks/stump/log) rows 4.2–5.2 = visible ground plane.
 *   Floor lamps at row 4.0 — correct depth, not floating.
 *   Bench at (6.0, 4.5) — three-layer amber glow pulse.
 *   Aashna wanders (8.0, 4.5) radius 14 — already in the warm light.
 *
 *   Camera: player col 1.5, bench col 6.0.
 *   At zoom 1.72 (viewport 558px) bench + Aashna read on frame 1.
 */
export class Chapter10Scene extends ChapterScene {
  constructor() {
    super('Chapter10', {
      cols:       12,
      rows:       8,
      mood:       'rain',
      zoom:       1.72,
      targetZoom: 1.80,
      followLerp: 0.055,
      drift:      false,
      fadeInMs:   2000,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — stormy night clearing
  //
  //  OpenEnvironment handles the full layer stack:
  //    sky gradient (near-black → cold steel-blue → dim amber sliver)
  //    heavy storm clouds (dark, dense, two layers)
  //    mountains → midHills → hills → near-black treeline
  //    horizon warmth (barely visible — storm suppresses it)
  //    ground strip, fg silhouette trees
  //    vignette (LEFT heavier than RIGHT — storm closes in from left)
  //    cold-blue color grade, heavy film grain
  //
  //  Scene adds: cold ambient wash (left), three-layer bench glow (centre).
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // ── OPEN environment — stormy overcast night clearing ─────────
    this.env = EnvironmentManager.apply(this, 'OPEN', {
      sky: {
        topColor: 0x060C1A,   // near-black cold night crown
        midColor: 0x14213A,   // cold steel-blue — the storm is everywhere
        botColor: 0x221810,   // very dim amber warmth barely at horizon
        bgColor:  0x060C1A,
      },
      // Sun disc: right side, very low (warmth lives at the horizon right)
      // Low alpha — storm clouds filter almost everything
      sun: {
        enabled: true,
        x: 0.74, y: 0.76,
        scaleX: 5.0, scaleY: 2.0,
        tint: 0xFF8822, alpha: 0.09,
      },
      // Horizon: muted amber sliver — warmth promised but barely breaking through
      horizon: {
        color:     0xCC6622,
        peakAlpha: 0.07,
        topStart:  0.48, topH: 0.05,
        botStart:  0.53, botH: 0.05,
      },
      // Heavy storm clouds — darker and more opaque than default
      cloudsA: { tint: 0x1A2C44, alpha: 0.55, y: 0.00, h: 0.38 },
      cloudsB: { tint: 0x122036, alpha: 0.48, y: 0.06, h: 0.42 },
      // Cold silhouette parallax layers
      // y overrides push hills DOWN so characters don't float above the mound.
      // Each layer pushed ~0.10 lower than defaults; h increased to fill screen bottom.
      mountains: { tint: 0x101C32, alpha: 0.60, y: 0.28, h: 0.54 },
      midHills:  { tint: 0x0C1628, alpha: 0.76, y: 0.38, h: 0.58 },
      hills:     { tint: 0x08101E, alpha: 0.88, y: 0.50, h: 0.52 },
      treeline:  { tint: 0x04080E, alpha: 0.96, y: 0.58, h: 0.46 },
      ground:    { topColor: 0x080E18, botColor: 0x020408, startFrac: 0.72, vigAlpha: 0.55 },
      fgTrees:   { tint: 0x040608, alpha: 0.95 },
      // LEFT vignette much heavier — storm closes in, traps the player
      vignette: {
        size:   105,
        color:  0x04080F,
        alphaL: 0.82,   // heavy left — storm darkness presses in
        alphaR: 0.38,   // lighter right — warmth breathes
        alphaT: 0.55,
        alphaB: 0.45,
      },
      colorGrade: { color: 0x2244AA, alpha: 0.048, blend: 'OVERLAY' }, // cold blue chill
      filmGrain:  { alpha: 0.052 },  // heavier grain = texture of the storm
      // fgGround tints match cold storm palette — default warm-brown would clash
      fgGround: {
        layer1: { tint: 0x050A12 },   // cold deep-navy near-black
        layer2: { tint: 0x020408 },   // near-black
      },
    });

    // ── Parallax depth layers — cold storm depth bands ────────────
    const wW = this.worldW;
    const wH = this.worldH;
    if (this.textures.exists('bg-el-mountains')) {
      this.add.image(wW * 0.50, wH * 0.34, 'bg-el-mountains')
        .setScrollFactor(0.03).setScale(4.5, 1.6)
        .setAlpha(0.25).setTint(0x0A1020).setDepth(-178);
    }
    if (this.textures.exists('bg-el-hills-large')) {
      this.add.image(wW * 0.28, wH * 0.48, 'bg-el-hills-large')
        .setScrollFactor(0.07).setScale(3.8, 1.1)
        .setAlpha(0.32).setTint(0x060E18).setDepth(-160);
      this.add.image(wW * 0.74, wH * 0.46, 'bg-el-hills-large')
        .setScrollFactor(0.07).setScale(3.4, 1.0)
        .setAlpha(0.28).setTint(0x080C14).setDepth(-159);
    }

    if (this.textures.exists('light-blob')) {
      const W  = this.worldW;
      const cy = this.worldH / 2;

      // ── COLD AMBIENT — heavy blue wash smothering the left half ──
      this._coldWash = this.add.image(W * 0.22, cy, 'light-blob')
        .setScale(9, 6).setAlpha(0.10).setTint(0x1A3488)
        .setBlendMode('ADD').setDepth(-10);
      this.tweens.add({
        targets:  this._coldWash,
        alpha:    { from: 0.10, to: 0.04 },
        duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // ── WARM RIGHT WASH — warmth breathes from the right half ────
      this.add.image(W * 0.82, cy * 1.1, 'light-blob')
        .setScale(12, 6).setAlpha(0.05).setTint(0xFF9922)
        .setBlendMode('ADD').setDepth(-6);

      // ── THREE-LAYER BENCH GLOW — the warm way back ────────────
      const bp = this.grid(6.0, 4.5);

      // Outer haze — the warm zone announces itself far in advance
      this._glowOuter = this.add.image(bp.x, bp.y + 10, 'light-blob')
        .setScale(7.0).setAlpha(0.07).setTint(0xFFBB44)
        .setBlendMode('ADD').setDepth(-9);
      this.tweens.add({
        targets:  this._glowOuter,
        alpha:    { from: 0.07, to: 0.02 },
        scale:    { from: 7.0,  to: 8.8 },
        duration: 3800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Mid ring — visible warmth radiating from the bench
      const glowMid = this.add.image(bp.x, bp.y + 10, 'light-blob')
        .setScale(3.2).setAlpha(0.22).setTint(0xFFCC66)
        .setBlendMode('ADD').setDepth(-8);
      this.tweens.add({
        targets:  glowMid,
        alpha:    { from: 0.22, to: 0.08 },
        scale:    { from: 3.2,  to: 3.9 },
        duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this._benchGlow = glowMid;

      // Inner core — tight amber heart of the scene
      this._glowInner = this.add.image(bp.x, bp.y + 4, 'light-blob')
        .setScale(1.4).setAlpha(0.35).setTint(0xFFEECC)
        .setBlendMode('ADD').setDepth(-7);
      this.tweens.add({
        targets:  this._glowInner,
        alpha:    { from: 0.35, to: 0.14 },
        scale:    { from: 1.4,  to: 1.8 },
        duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — seven trees + storm debris + lamps + warm bloom
  //
  //  All tree bases at rows 3.0–3.6 (horizon silhouette band, visible).
  //  All ground props at rows 4.2–5.2 (visible ground plane).
  //  Col 0–4 = cold/stormy   |   col 5–7 = bench centre   |   col 8–11 = warm
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    // ── DARK SILHOUETTE TREES — cold→warm gradient across 3 depth planes
    // Three planes (back→front):
    //   far-bg   rows 2.3–2.5  tiny faint silhouettes, storm haze absorption
    //   arch     rows 3.2–3.5  main treeline band behind the scene action
    //   sentinel rows 3.8–4.1  ground-anchored edge trees, visible bases
    // Previously all 7 trees were in a 0.6-row band (3.0–3.6).
    // Extended to a 1.8-row span (2.3→4.1) breaks linear alignment.
    // ySort: false so they lock to their depth value.

    // Far-background layer — nearly invisible, absorbed by storm darkness
    const tBgL = this.placeAt(0.4, 2.3, 'k-tree-simple-dark', { scale: 0.34, ySort: false });
    if (tBgL) tBgL.setTint(0x020406).setAlpha(0.45).setDepth(-17);
    const tBgR = this.placeAt(10.8, 2.5, 'k-tree-thin-dark',  { scale: 0.32, ySort: false });
    if (tBgR) tBgR.setTint(0x020406).setAlpha(0.40).setDepth(-17);

    // LEFT cluster (cold, oppressive) — thick and close together
    // tL1 moved to row 4.1 (was 3.1) — base sits on the ground plane,
    // creates a floor-anchored sentinel clearly distinct from the arch band.
    const tL1 = this.placeAt(0.5, 4.1, 'k-tree-tall-dark',    { scale: 0.90, ySort: false });
    if (tL1) tL1.setTint(0x030608).setDepth(-14);

    const tL2 = this.placeAt(1.8, 3.5, 'k-tree-oak-dark',     { scale: 0.68, ySort: false });
    if (tL2) tL2.setTint(0x060B14).setDepth(-12);

    const tL3 = this.placeAt(3.4, 3.3, 'k-tree-simple-dark',  { scale: 0.56, ySort: false });
    if (tL3) tL3.setTint(0x080F1C).setDepth(-11);

    // CENTRE arch — staggered rows (3.2 vs 3.4) instead of matched 3.6/3.6
    // asymmetry makes the opening more natural, less stage-set.
    const tC1 = this.placeAt(4.6, 3.4, 'k-tree-thin-dark',    { scale: 0.50, ySort: false });
    if (tC1) tC1.setTint(0x0A1218).setDepth(-10);

    const tC2 = this.placeAt(7.4, 3.2, 'k-tree-thin-dark',    { scale: 0.54, ySort: false });
    if (tC2) tC2.setTint(0x0A1010).setDepth(-10);

    // RIGHT cluster (warmer — still dark, faint amber undertone)
    const tR1 = this.placeAt(9.2, 3.3, 'k-tree-default-dark', { scale: 0.72, ySort: false });
    if (tR1) tR1.setTint(0x0C0C08).setDepth(-12);

    // tR2 moved to row 3.8 (was 3.0) — right-edge ground sentinel mirrors tL1.
    const tR2 = this.placeAt(11.0, 3.8, 'k-tree-tall-dark',   { scale: 0.86, ySort: false });
    if (tR2) tR2.setTint(0x080806).setDepth(-14);

    // ── FOREGROUND FRAMING TREE — left edge dark silhouette, depth occlusion ──
    const fgPine = this.placeAt(-0.3, 1.8, 'k-tree-tall-dark', { scale: 1.0, ySort: false });
    if (fgPine) fgPine.setTint(0x020305).setDepth(this.layers.depth('foreground', 50));

    // ── STORM DEBRIS — rocky rubble litters the cold path ─────────
    // Physical expression of conflict: the storm's wake.
    // Clustered LEFT of bench, absent RIGHT — visual asymmetry = the story.
    const deb1 = this.placeAt(2.4, 4.4, 'k-rock-large-a', { scale: 0.36, shadow: { width: 20, height: 4, offsetY: 4, alpha: 0.25 } });
    if (deb1) deb1.setTint(0x3A4E6A);

    const deb2 = this.placeAt(3.6, 4.8, 'k-rock-small-b', { scale: 0.44, shadow: { width: 14, height: 3, offsetY: 3, alpha: 0.22 } });
    if (deb2) deb2.setTint(0x3C506A).setAlpha(0.84);

    const deb3 = this.placeAt(4.4, 4.5, 'k-rock-small-a', { scale: 0.38, shadow: { width: 12, height: 3, offsetY: 3, alpha: 0.20 } });
    if (deb3) deb3.setTint(0x445670).setAlpha(0.80);

    // Dead stump — once alive, broken by the storm
    const stump = this.placeAt(2.8, 4.6, 'k-stump', { scale: 0.50, shadow: { width: 16, height: 3, offsetY: 4, alpha: 0.22 } });
    if (stump) stump.setTint(0x3C5062);

    // Fallen log across the lower path — friction, the feeling of obstacles
    const log = this.placeAt(3.8, 5.1, 'k-log', { scale: 0.46, shadow: { width: 18, height: 3, offsetY: 3, alpha: 0.20 } });
    if (log) log.setTint(0x445060).setAlpha(0.74);

    // ── COLD FLOOR LAMP — marks the storm zone entrance ──────────
    // Moved to row 4.3 (was 4.0) to break the linear alignment with the
    // warm lamp, and to sit visually on the ground plane near the debris.
    const coldLamp = this.placeAt(1.0, 4.3, 'k-lamp-floor', {
      scale: 0.62,
      shadow: { width: 12, height: 3, offsetY: 5, alpha: 0.08 },
    });
    if (coldLamp) coldLamp.setTint(0x4466AA);
    if (this.textures.exists('light-blob')) {
      const clp   = this.grid(1.0, 4.3);
      this._coldLampPool = this.add.image(clp.x, clp.y + 28, 'light-blob')
        .setScale(2.0, 1.0).setAlpha(0.10).setTint(0x2244AA)
        .setBlendMode('ADD').setDepth(this.layers.depth('gameplay', 1));
      this.tweens.add({
        targets:  this._coldLampPool,
        alpha:    { from: 0.10, to: 0.03 },
        scale:    { from: 2.0,  to: 2.5 },
        duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── WARM FLOOR LAMP — Aashna's zone, signals the way back ─────
    // Amber pool — this is what the player is walking toward
    this.placeAt(10.0, 4.0, 'k-lamp-floor', {
      scale: 0.62,
      shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.12 },
    });
    if (this.textures.exists('light-blob')) {
      const wlp   = this.grid(10.0, 4.0);
      this._warmLampPool = this.add.image(wlp.x, wlp.y + 28, 'light-blob')
        .setScale(2.4, 1.2).setAlpha(0.18).setTint(0xFFAA44)
        .setBlendMode('ADD').setDepth(this.layers.depth('gameplay', 1));
      this.tweens.add({
        targets:  this._warmLampPool,
        alpha:    { from: 0.18, to: 0.06 },
        scale:    { from: 2.4,  to: 3.0 },
        duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── WARM SIDE BLOOM — life returns where the storm can't reach ─
    // Flowers/grass must be tinted to survive the cold-blue color grade.
    // Warm side: muted ember-red / dull gold / dark amber-green.
    const flR = this.placeAt(7.8, 4.8, 'k-flower-red',   { scale: 0.48 });
    if (flR) flR.setTint(0xBB3318);  // ember-red — warm but storm-dimmed
    const flY = this.placeAt(8.4, 4.6, 'k-flower-yellow', { scale: 0.44 });
    if (flY) flY.setTint(0xAA7722);  // muted gold — candlelight undertone
    const gr1 = this.placeAt(7.4, 5.1, 'k-grass',         { scale: 0.42 });
    if (gr1) gr1.setTint(0x1C2A14);  // very dark forest green
    const gr2 = this.placeAt(9.6, 5.0, 'k-grass-leafs',   { scale: 0.40 });
    if (gr2) gr2.setTint(0x192210);  // deep olive shadow
    const bsR = this.placeAt(8.8, 5.2, 'k-bush-small',    { scale: 0.52 });
    if (bsR) bsR.setTint(0x1C2816).setAlpha(0.75);

    // ── PLAYER-PATH OCCLUSION — Y-sorted, rows 5.0–5.5 ──────────────
    // Player walks at row 4.5 (y ≈ 320, depth 320). Props at rows 5.0–5.5
    // (y ≈ 352–384, depth 352–384) sit just above the player's depth value —
    // they render over the player while it walks the main corridor.
    // When the player steps below these props the depths equalise and the
    // player naturally steps in front, with no manual depth overrides needed.
    //
    // COLD ZONE: ice-blue rock cluster echoing the storm debris above.
    // WARM ZONE: dark amber-tinted bush creeping onto the path from the right.

    // Cold side — two rocks staggered so they read as a continuous rubble line
    const pathRockColdA = this.placeAt(1.8, 5.2, 'k-rock-small-b', { scale: 0.52 });
    if (pathRockColdA) pathRockColdA.setTint(0x2A3C54);

    const pathRockColdB = this.placeAt(4.0, 5.0, 'k-rock-large-a', { scale: 0.42 });
    if (pathRockColdB) pathRockColdB.setTint(0x243448);

    // Left-edge partial trunk — tL1 at row 4.1 extends toward the viewer.
    // A smaller instance lower down sells the illusion that the trunk base
    // continues past the camera plane. Y-sorted, so depth is automatic.
    const pathTrunkL = this.placeAt(0.4, 5.4, 'k-tree-tall-dark', {
      scale:   0.38,
      originY: 0.95,
    });
    if (pathTrunkL) pathTrunkL.setTint(0x030608).setAlpha(0.70);

    // Warm side — bush creeping from the right edge into the corridor
    const pathBushWarm = this.placeAt(10.8, 5.3, 'k-bush', {
      scale:  0.56,
      shadow: { width: 16, height: 4, offsetY: 4, alpha: 0.06 },
    });
    if (pathBushWarm) pathBushWarm.setTint(0x1A2010);

    // Right-edge partial trunk — mirrors the left sentinel extension
    const pathTrunkR = this.placeAt(11.2, 5.1, 'k-tree-tall-dark', {
      scale:   0.36,
      originY: 0.95,
    });
    if (pathTrunkR) pathTrunkR.setTint(0x080806).setAlpha(0.65);

    // ── MID-FOREGROUND OCCLUSION — Y-sorted, rows 5.5–6.5 ─────────────
    // Player at row 4.5 (y≈320, depth 320). These Y-sorted props at rows
    // 5.5–6.5 (y≈384–448) always draw over the player, creating genuine
    // 2.5D parallax. Storm side palette: cold blue-grey. Warm side: dark amber.
    // --- COLD ZONE (left, cols 0–4) ---
    const occRockL = this.placeAt(1.6, 5.6, 'k-rock-large-b', { scale: 0.48 });
    if (occRockL) occRockL.setTint(0x243040);
    const occStump = this.placeAt(3.2, 6.1, 'k-stump', { scale: 0.44 });
    if (occStump) occStump.setTint(0x2A3848);
    const occBushL = this.placeAt(0.4, 6.5, 'k-bush-large', {
      scale: 0.68,
      shadow: { width: 18, height: 4, offsetY: 4, alpha: 0.06 },
    });
    if (occBushL) occBushL.setTint(0x1C2836);
    // --- WARM ZONE (right, cols 8–11) ---
    const occBushR = this.placeAt(11.4, 5.8, 'k-bush-large', {
      scale: 0.72,
      shadow: { width: 20, height: 4, offsetY: 5, alpha: 0.07 },
    });
    if (occBushR) occBushR.setTint(0x1A2010);
    const occRockR = this.placeAt(9.4, 6.3, 'k-rock-small-a', { scale: 0.46 });
    if (occRockR) occRockR.setTint(0x1E2412);

    // ── BOTTOM-EDGE FRAMERS — fixed depth 601 ─────────────────────────
    // Hard-crop into the viewport bottom edge (origin 0.5, 0.88).
    // Cold palette left, slightly warmer right, rows vary to avoid a band.
    const fwL = this.grid(0.8, 7.5);
    const fwR = this.grid(11.2, 7.2);
    this.add.image(fwL.x, fwL.y, 'foliage-bush4')
      .setOrigin(0.5, 0.88).setScale(0.86).setTint(0x0A1020).setAlpha(0.85).setDepth(601);
    this.add.image(fwR.x, fwR.y, 'foliage-bush4')
      .setOrigin(0.5, 0.88).setScale(0.80).setTint(0x141208).setAlpha(0.85).setDepth(601).setFlipX(true);

    // ── BENCH — the reconciliation point ──────────────────────────
    const bench = this.placeInteractable(6.0, 4.5, 'k-bench', {
      id:            'come_back',
      label:         'Come Back',
      triggerRadius: 62,
      glowRadius:    148,
      skipUnlockSFX: true,
      onTrigger:     () => this._onBenchReached(),
    }, {
      scale:  0.56,
      envFX:  false,
      shadow: { width: 24, height: 5, offsetY: 6, alpha: 0.20 },
    });
    if (bench) bench.setTint(0x5A4828);

    // ── EMOTES — broken heart in the cold zone ────────────────────
    // Heart emote revealed in _onBenchReached() — showing it upfront collapses the arc.
    const sp = this.grid(2.0, 3.6);
    this._brokenHeartEmote = this._addEmote(sp.x, sp.y, 'emote-heartBroken', { scale: 0.27, depth: 30, delay: 0 });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND DECOR — storm palette override, suppresses warm/cool defaults
  // ═══════════════════════════════════════════════════════════════════

  buildGroundDecor() {
    // Default pool includes foliage-flower-blue, foliage-bush2/3 and warm
    // greens — all clash with the cold steel-blue storm palette.
    // Left zone: near-black cold rocks + sparse dead grass only.
    // Right zone: faint warm grass + ember flowers.
    this._spawnGroundDecor({
      pool: [
        'k-grass', 'k-grass',
        'k-rock-small-a', 'k-rock-small-b',
        'k-flower-red',
      ],
      density:  0.12,
      rowRange: [4.5, 5.8],
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    // Player deep in the cold left zone — isolated in the storm
    const start = this.grid(1.5, 4.5);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male-smart' },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.28, dynamic: true,
    });

    // Aashna — already in the warm light, wander radius 14
    const aPos = this.grid(8.0, 4.5);
    this._aashna = this.charSystem.createFemale(aPos.x, aPos.y, { texture: 'char-female-navy' });
    this.shadows.add(this._aashna.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.25, dynamic: true,
    });
    this._aashna.wander(aPos.x, aPos.y, 14);
  }

  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    // Rain — viewport-fixed (scrollFactor 0), diagonal cold streaks
    if (this.textures.exists('particle-glow')) {
      const isMobile = this.scale.width < 960;
      // Main rain layer — fast, dense
      this.add.particles(this.scale.width / 2, -20, 'particle-glow', {
        x:         { min: -this.scale.width / 2, max: this.scale.width / 2 },
        speedY:    { min: 140, max: 220 },
        speedX:    { min: 12, max: 35 },
        scaleX:    0.03,
        scaleY:    { start: 0.28, end: 0.10 },
        alpha:     { start: 0.18, end: 0.03 },
        tint:      [0x99AACC, 0x8899BB, 0x7788AA],
        lifespan:  { min: 700, max: 1400 },
        frequency: isMobile ? 50 : 22,
        quantity:  isMobile ? 1 : 3,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 60)).setScrollFactor(0);

      // Background rain layer — slower, dimmer for parallax illusion
      this.add.particles(this.scale.width / 2, -20, 'particle-glow', {
        x:         { min: -this.scale.width / 2, max: this.scale.width / 2 },
        speedY:    { min: 80, max: 130 },
        speedX:    { min: 6, max: 22 },
        scaleX:    0.02,
        scaleY:    { start: 0.18, end: 0.06 },
        alpha:     { start: 0.09, end: 0.01 },
        tint:      [0x7788AA, 0x6677AA],
        lifespan:  { min: 1000, max: 1800 },
        frequency: isMobile ? 100 : 45,
        quantity:  isMobile ? 1 : 2,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 55)).setScrollFactor(0);
    }

    // Intro narration — matches ch10_intro in story.json
    this.time.delayedCall(2200, () => {
      if (!this.sys?.isActive()) return;
      const lines = storyData.dialogues?.ch10_intro;
      if (lines) this.dialogue?.start(lines);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION — bench reached, the storm breaks
  // ═══════════════════════════════════════════════════════════════════

  _onBenchReached() {
    // Single rain-drop fires as the storm catches its breath at the moment of arrival
    audioManager._playTextureEvent?.('rain-drop');
    this.cam.zoomPulse(1.55, 1000);

    // Fade the broken-heart emote — the storm has passed
    if (this._brokenHeartEmote) {
      this.tweens.killTweensOf(this._brokenHeartEmote);
      this.tweens.add({ targets: this._brokenHeartEmote, alpha: 0, duration: 800 });
    }
    // Reveal the heart emote — earned by reaching this point
    const bp2 = this.grid(6.0, 3.6);
    this._addEmote(bp2.x, bp2.y, 'emote-heart', { scale: 0.28, depth: 30, delay: 0 });

    // Flash the mid glow then settle back
    if (this._benchGlow) {
      this.tweens.killTweensOf(this._benchGlow);
      this.tweens.add({
        targets:  this._benchGlow,
        alpha:    0.55,
        scale:    5.0,
        duration: 500,
        yoyo:     true,
        ease:     'Quad.easeOut',
        onComplete: () => {
          if (!this.sys?.isActive()) return;
          this.tweens.add({
            targets:  this._benchGlow,
            alpha:    { from: 0.22, to: 0.08 },
            scale:    { from: 3.2,  to: 3.9 },
            duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        },
      });
    }

    const lines = storyData.dialogues?.ch9_fight;
    if (lines) {
      this.dialogue?.start(lines, () => this._chapterComplete());
    }
  }

  _chapterComplete() {
    // Delay stinger 280ms — storm-breaks emotional payoff must land clean
    this.time.delayedCall(280, () => {
      if (this.sys?.isActive()) audioManager.playStinger('tenderness');
    });
    this._guardTransition(() => {
      goToChapter(this, 10);
    });
  }

  onUpdate(_time, _delta) {
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);
  }

  onShutdown() {
    this.tweens.killTweensOf(this._coldWash);
    this.tweens.killTweensOf(this._glowOuter);
    this.tweens.killTweensOf(this._glowInner);
    this.tweens.killTweensOf(this._benchGlow);
    this.tweens.killTweensOf(this._coldLampPool);
    this.tweens.killTweensOf(this._warmLampPool);
    audioManager.fadeOutAll(600);
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
