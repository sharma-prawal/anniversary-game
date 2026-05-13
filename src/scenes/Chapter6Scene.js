import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter7Scene — "Wireless & Heartstrings"
 *
 * Golden-hour park. The player walks RIGHT through a composed scene
 * toward a girl framed by two gateway pines.
 *
 * Spatial logic (12 cols × 8 rows, cell 64px = 768 × 512):
 *
 *   At zoom 1.72 the viewport shows ~558px of the 768px world.
 *   Player starts at col 1.5 → camera shows x 0–558.
 *   Gift 1 at col 4.5 (x=320) — immediately visible in the opening frame.
 *   Aashna at col 9.0 (x=608) — visible at the edge of the first step.
 *   Gift 2 at col 7.0 (x=480) — appears halfway between Gift 1 and Aashna
 *     after the first gift is "stolen", extending the journey naturally.
 *
 *   Emotional arc:
 *     [P] → flowers → [Gift 1] → pause → gift stolen →
 *     [Gift 2 appears] → continue right → [Aashna]
 *
 *   Objects along the path:
 *     Row 3.0 — bench (park cue, left side)
 *     Row 2.5 — gateway pines framing Aashna
 *     Row 4.5 — walk / interaction line (player, gifts, Aashna)
 *     Alt rows — flower breadcrumbs at 3.4 / 4.8 / 3.6 guide the eye
 */
export class Chapter6Scene extends ChapterScene {
  constructor() {
    super('Chapter6', {
      cols:       12,
      rows:       8,
      mood:       'warm',
      zoom:       1.72,
      targetZoom: 1.80,
      followLerp: 0.055,
      drift:      false,
      fadeInMs:   1600,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — warm golden-hour clearing + destination glow + vignette
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    this.env = EnvironmentManager.apply(this, 'OPEN', {
      sky:        { topColor: 0xAA4818, midColor: 0xDD8840, botColor: 0xFFCC88, bgColor: 0xAA4818 },
      sun:        { tint: 0xFFCC66, alpha: 0.36, x: 0.68, y: 0.14 },
      mountains:  { tint: 0x7A3010, alpha: 0.44 },
      midHills:   { tint: 0xAA6033, alpha: 0.46 },
      hills:      { tint: 0x6A3818, alpha: 0.36 },
      treeline:   { tint: 0x180C02, alpha: 0.92 },
      ground:     { topColor: 0x3A2008, botColor: 0x060200, vigAlpha: 0.68 },
      curveAmp1:  0, curveAmp2: 0,
      vignette:   { size: 90, color: 0x2A0808, alphaL: 0.68, alphaR: 0.68, alphaT: 0.48, alphaB: 0.72 },
      colorGrade: { color: 0xFFAA44, alpha: 0.028, blend: 'OVERLAY' },
    });

    const wW = this.worldW;
    const wH = this.worldH;

    // ── LAYER 1: far horizon mountains (slowest — deepest parallax) ──
    if (this.textures.exists('bg-el-mountains')) {
      this.add.image(wW * 0.50, wH * 0.38, 'bg-el-mountains')
        .setScrollFactor(0.03).setScale(4.2, 1.6)
        .setAlpha(0.38).setTint(0x7A3010).setDepth(-178);
    }
    if (this.textures.exists('bg-flat-mountain1')) {
      this.add.image(wW * 0.28, wH * 0.42, 'bg-flat-mountain1')
        .setScrollFactor(0.05).setScale(3.0, 1.0)
        .setAlpha(0.28).setTint(0x8C3C14).setDepth(-175);
    }
    if (this.textures.exists('bg-flat-mountain2')) {
      this.add.image(wW * 0.76, wH * 0.40, 'bg-flat-mountain2')
        .setScrollFactor(0.05).setScale(2.8, 0.90)
        .setAlpha(0.24).setTint(0x9A4418).setDepth(-174);
    }

    // ── LAYER 2: mid rolling hills ────────────────────────────────
    if (this.textures.exists('bg-el-hills-large')) {
      this.add.image(wW * 0.30, wH * 0.52, 'bg-el-hills-large')
        .setScrollFactor(0.07).setScale(3.5, 1.1)
        .setAlpha(0.44).setTint(0x5C2A0A).setDepth(-160);
      this.add.image(wW * 0.78, wH * 0.50, 'bg-el-hills-large')
        .setScrollFactor(0.07).setScale(3.2, 1.0)
        .setAlpha(0.38).setTint(0x6A3010).setDepth(-159);
    }

    // ── LAYER 3: sunset clouds in the upper sky ───────────────────
    if (this.textures.exists('bg-cloud1')) {
      this.add.image(wW * 0.22, wH * 0.18, 'bg-cloud1')
        .setScrollFactor(0.04).setScale(1.4, 0.7)
        .setAlpha(0.10).setTint(0xFFCC88).setDepth(-165);
      this.add.image(wW * 0.70, wH * 0.14, 'bg-cloud1')
        .setScrollFactor(0.04).setScale(1.8, 0.8)
        .setAlpha(0.09).setTint(0xFFBB77).setDepth(-165);
    }
    if (this.textures.exists('bg-cloud2')) {
      this.add.image(wW * 0.48, wH * 0.22, 'bg-cloud2')
        .setScrollFactor(0.035).setScale(1.2, 0.6)
        .setAlpha(0.08).setTint(0xFFCC99).setDepth(-164);
    }

    if (this.textures.exists('light-blob')) {
      // Warm ambient wash — golden hour fills the whole clearing
      this.add.image(wW / 2, wH / 2, 'light-blob')
        .setScale(14, 8).setAlpha(0.08).setTint(0xFFAA44)
        .setBlendMode('ADD').setDepth(-10);

      // Destination glow — rose-gold, Aashna's grove is visibly warmer
      const aPos = this.grid(9.0, 4.5);
      this._destGlow = this.add.image(aPos.x, aPos.y + 6, 'light-blob')
        .setScale(5.5, 3.5).setAlpha(0.20).setTint(0xFFBB88)
        .setBlendMode('ADD').setDepth(-9);
      this.tweens.add({
        targets:  this._destGlow,
        alpha:    { from: 0.20, to: 0.08 },
        scale:    { from: 5.5,  to: 6.8  },
        duration: 2400,
        yoyo:     true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Path light — a golden ribbon of warmth along the walk route
      this.add.image(wW * 0.52, wH * 0.62, 'light-blob')
        .setScale(10, 0.5).setAlpha(0.06).setTint(0xFFCC66)
        .setBlendMode('ADD').setDepth(-8);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — everything guides LEFT → RIGHT toward Aashna
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    this._phase = 1;

    // ── PARK BOUNDARY FENCES — mark the park edge left & right ────
    // Depth 5 (just above gameplay 0) ensures fences occlude the player
    // when he's behind them — correct for a park boundary prop sitting
    // on the hillside surface. ySort: false — fixed decorative element.
    const fL = this.placeAt(0.2, 4.5, 'k-fence-simple', { scale: 0.52, ySort: false });
    if (fL) fL.setTint(0xBB8844).setAlpha(0.60).setDepth(5);
    const fR = this.placeAt(11.8, 4.5, 'k-fence-simple', { scale: 0.52, ySort: false });
    if (fR) fR.setTint(0xBB8844).setAlpha(0.60).setDepth(5);

    // ── LEFT ENTRY — two dark silhouette trees framing the opening ──
    // oak-dark at row 4.3: floor-level, grounding the entry. tree-tall at
    // row 3.4: mid-hillside — two clearly different depths, no alignment.
    this.placeAt(0.4, 4.3, 'k-tree-oak-dark', {
      scale:  0.92,
      shadow: { width: 36, height: 8, offsetY: 10, alpha: 0.18 },
    });
    this.placeAt(1.8, 3.4, 'k-tree-tall', {
      scale:  0.74,
      shadow: { width: 22, height: 6, offsetY: 8, alpha: 0.14 },
    });

    // ── GATEWAY PINES — cathedral framing for Aashna's grove ────────
    // ySort: false so they never sort with the player — depth is fixed at
    // -12 (behind midground props but above the deep bg treeline at -18).
    const pinL = this.placeAt(7.8, 3.5, 'k-tree-pine-d', {
      scale:  0.92, ySort: false,
      shadow: { width: 28, height: 7, offsetY: 9, alpha: 0.16 },
    });
    if (pinL) pinL.setDepth(-12);
    const pinR = this.placeAt(10.6, 3.0, 'k-tree-pine-c', {
      scale:  0.84, ySort: false,
      shadow: { width: 24, height: 6, offsetY: 8, alpha: 0.14 },
    });
    if (pinR) pinR.setDepth(-12);

    // ── BACKGROUND TREELINE — 3rd depth plane (bge-tree* = env-system art direction) ──
    // bge-tree pack matches the half-silhouette style used by OpenEnvironment.
    // Placed at row 2.0–2.4 so they sit BEHIND the row-3 ground trees.
    // Tinted into the golden-hour palette with a warm amber cast.
    const fgL = this.placeAt(3.0, 2.5, 'bge-tree22', { scale: 0.64, ySort: false });
    if (fgL) fgL.setTint(0xC08040).setAlpha(0.86).setDepth(-18);
    const fgM = this.placeAt(5.8, 2.0, 'bge-tree01', { scale: 0.70, ySort: false });
    if (fgM) fgM.setTint(0xC88840).setAlpha(0.88).setDepth(-18);
    const fgR = this.placeAt(9.2, 2.8, 'bge-tree26', { scale: 0.60, ySort: false });
    if (fgR) fgR.setTint(0xBE7C38).setAlpha(0.84).setDepth(-18);

    // ── PARK BENCH — row 4.4: clearly floor-level, not floating mid-hill ─
    const bench = this.placeAt(3.2, 4.4, 'k-bench-soft', {
      scale:  0.46,
      shadow: { width: 20, height: 4, offsetY: 5, alpha: 0.12 },
    });
    if (bench) bench.setTint(0xCC8844);  // warm amber tint blends into hillside

    // ── GROUND COVER — warm-tinted bushes, sunset palette ──────────
    const b1 = this.placeAt(4.2, 4.6, 'k-bush', {
      scale:  0.52,
      shadow: { width: 16, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (b1) b1.setTint(0xAA6622);  // amber-brown, not vivid green
    const b2 = this.placeAt(7.0, 4.5, 'k-bush-large', {
      scale:  0.50,
      shadow: { width: 18, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (b2) b2.setTint(0x996622);
    this.placeAt(1.0, 4.4, 'k-rock-small-a', {
      scale:  0.38,
      shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.08 },
    });

    // ── FLOWER BREADCRUMB TRAIL — staggered Y gives undulating hillside feel ─
    this.placeAt(2.8, 4.2, 'k-flower-yellow',  { scale: 0.46 });
    this.placeAt(5.6, 4.7, 'k-flower-red',     { scale: 0.46 });
    this.placeAt(7.4, 4.5, 'k-flower-purple',  { scale: 0.46 });
    // Bloom cluster around Aashna — the trail's destination payoff
    this.placeAt(9.4, 4.3, 'k-flower-red',      { scale: 0.42 });
    // B-variant flowers add subtle shape variety in Aashna's clearing
    const fpb = this.placeAt(8.8, 4.5, 'k-flower-purple-b', { scale: 0.44 });
    if (fpb) fpb.setTint(0xDDAA88);
    const fyb = this.placeAt(10.4, 4.3, 'k-flower-yellow-b', { scale: 0.40 });
    if (fyb) fyb.setTint(0xFFCC88);

    // ── LOWER CORRIDOR FILL — rows 5.0–5.4, previously empty ─────────────
    // Grasses and rocks along the near-camera corridor break the uniform
    // floor and give the space a sense of ground cover below the walk path.
    const lf1 = this.placeAt(2.4, 5.1, 'k-grass-large', { scale: 0.44 });
    if (lf1) lf1.setTint(0x8A4C18).setAlpha(0.80);
    const lf2 = this.placeAt(5.2, 5.3, 'k-rock-small-b', {
      scale:  0.38,
      shadow: { width: 10, height: 3, offsetY: 3, alpha: 0.08 },
    });
    if (lf2) lf2.setTint(0x9A6030);
    const lf3 = this.placeAt(8.6, 5.0, 'k-grass', { scale: 0.40 });
    if (lf3) lf3.setTint(0x7A4010).setAlpha(0.75);

    // ── STONE PATH — stepping stones with varied Y rhythm ──────────────
    for (const [c, r] of [[1.8, 5.0], [3.0, 4.8], [4.6, 5.2], [6.4, 4.7], [8.2, 5.0], [10.0, 4.6]]) {
      const ps = this.placeAt(c, r, 'k-path-stone', { scale: 0.36 });
      if (ps) ps.setTint(0xBB8844).setAlpha(0.70);
    }
    this.placeAt(11.0, 4.9, 'k-flower-yellow', { scale: 0.40 });

    // ── FOREGROUND OCCLUSION — warm near-camera park edge elements ────────
    // Depth: foreground(2) = 602 — player Y-sorts to depth ≈ 320 (row 4.5 × 64px),
    // so 602 > 320: player renders BEHIND these elements for true parallax depth.
    // This is the correct depth for an OPEN scene (same logic as Ch4).
    //
    // env.placeOnGround(wx, extraDrop): positive extraDrop buries the base below
    // terrain so only the crown/top overlaps the walking corridor visually.
    // Tints stay within the warm sunset palette — amber, ochre, dark brown.

    const fgDepth = this.layers.depth('foreground', 2);  // 602

    const fgPlant = (col, key, sc, extraDrop, tint, originY = 1.0) => {
      if (!this.textures.exists(key)) return;
      const wx  = this.grid(col, 0).x;
      const pos = this.env.placeOnGround(wx, extraDrop);
      this.add.image(pos.x, pos.y, key)
        .setScale(sc).setOrigin(0.5, originY)
        .setTint(tint).setAlpha(0.84)
        .setDepth(fgDepth + (col > 6 ? 1 : 0));
    };

    // Left edge — large bush, partially cropped, anchors near-camera left boundary
    fgPlant( 0.4, 'k-bush-large',    0.72, +40, 0x7A3C10);
    // Zone 1 — small rock cluster, low in the hollow
    fgPlant( 1.8, 'k-rock-small-a',  0.62, +46, 0x6A3A18);
    // Pre-bench zone — wide-canopy tree base frames the bench from below
    fgPlant( 3.2, 'foliage-tree5',   0.26, +54, 0x5E3010, 0.88);
    // Zone mid-left — bush below the first flower trail area
    fgPlant( 4.8, 'k-bush',          0.60, +38, 0x8A4A18);
    // Zone center — rock beside the gift zone, grounds the gift effect
    fgPlant( 6.4, 'k-rock-small-b',  0.56, +42, 0x7A4820);
    // Pre-gateway — bush below the left gateway pine base
    fgPlant( 7.8, 'k-bush-small',    0.64, +36, 0xA05C28);
    // Aashna's zone — wide-canopy tree base, mirrors col 3.2 for composition
    fgPlant( 9.6, 'foliage-tree2',   0.24, +52, 0x6A3C14, 0.88);
    // Right edge — bush mirrors left boundary, closes the park frame
    fgPlant(11.2, 'k-bush-large',    0.68, +40, 0x7A3C10);

    // ── GIFT 1 — warm golden glow orb, col 4.5 (phase 1) ────────────
    // Represented by a glowing light-blob + emote, not a lamp.
    // The gift IS the warmth — a romantic gesture, not a prop.
    const g1Pos = this.grid(4.5, 4.4);
    this._gift1Glow = this.add.image(g1Pos.x, g1Pos.y, 'light-blob')
      .setScale(2.8, 1.5).setAlpha(0.30).setTint(0xFFCC55)
      .setBlendMode('ADD').setDepth(-3);
    this.tweens.add({
      targets:  this._gift1Glow,
      scale:    { from: 2.8, to: 3.6 },
      alpha:    { from: 0.30, to: 0.10 },
      duration: 1600,
      yoyo:     true, repeat: -1, ease: 'Sine.easeInOut',
    });
    // Invisible interactable trigger on the ground at gift pos
    this._gift1 = this.placeInteractable(4.5, 4.4, 'light-blob', {
      id:            'gift_first',
      label:         'A Gift',
      triggerRadius: 55,
      glowRadius:    130,
      skipUnlockSFX: true,
      onTrigger:     () => this._onFirstGift(),
    }, { scale: 0.01, alpha: 0 });
    const g1Emote = this.grid(4.5, 3.5);
    this._addEmote(g1Emote.x, g1Emote.y, 'emote-heart', { scale: 0.28, delay: 0 });

    // ── FOREGROUND FRAMING — warm amber bushes bottom-edge occlusion ──
    // Two foliage-bush1 silhouettes at depth 601 (foreground zone) frame
    // the bottom corners, grounding the scene and preventing the viewport
    // from feeling like a floating box. Origin (0.5, 0.85) crops naturally.
    const fwL = this.add.image(0,  0, 'foliage-bush1').setOrigin(0.5, 0.85).setDepth(601);
    const fwR = this.add.image(0,  0, 'foliage-bush1').setOrigin(0.5, 0.85).setDepth(601).setFlipX(true);
    const fwLPos = this.grid(0.8, 7.8);
    const fwRPos = this.grid(11.2, 7.8);
    fwL.setPosition(fwLPos.x, fwLPos.y).setScale(0.82).setTint(0x8A4A18).setAlpha(0.88);
    fwR.setPosition(fwRPos.x, fwRPos.y).setScale(0.82).setTint(0x8A4A18).setAlpha(0.88);

    // ── GIFT 2 — rose-gold glow, col 7.2 — hidden until phase 2 ─────
    // Interactable is NOT registered here — it is created inside _onFirstGift
    // once phase 1 dialogue completes, so it is physically impossible to
    // trigger it early. Only the glow sprite is prepared now (alpha:0).
    const g2Pos = this.grid(7.2, 4.4);
    this._gift2Glow = this.add.image(g2Pos.x, g2Pos.y, 'light-blob')
      .setScale(2.8, 1.5).setAlpha(0).setTint(0xFFAACC)
      .setBlendMode('ADD').setDepth(-3);
    this._gift2 = null;  // created lazily in _onFirstGift
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND DECOR — warm-only pool (override base class default)
  // ═══════════════════════════════════════════════════════════════════

  buildGroundDecor() {
    // Override the default pool (which contains cold blue/green assets)
    // with warm sunset-palette flowers and grasses only.
    this._spawnGroundDecor({
      pool: [
        'k-grass', 'k-grass', 'k-grass-large',
        'k-rock-small-a',
        'k-flower-yellow', 'k-flower-red',
        'foliage-flower-red',
      ],
      density: 0.16,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS — player left, Aashna framed by gateway pines
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    const start = this.grid(1.5, 4.5);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male-casual', displayW: 40, displayH: 62 },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.28, dynamic: true,
    });

    // Aashna — standing between the gateway pines, clearly visible from the left
    const aPos = this.grid(9.0, 4.5);
    this._aashna = this.charSystem.createFemale(aPos.x, aPos.y, { texture: 'char-female-yellow' });
    this.shadows.add(this._aashna.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.25, dynamic: true,
    });
    // Very tight wander — she is a destination, not a moving target
    this._aashna.wander(aPos.x, aPos.y, 18);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FX — sunset sparkles + intro dialogue
  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    const W = this.worldW;

    // Warm golden motes drifting downward — sunset atmosphere
    if (this.textures.exists('particle-glow')) {
      this.add.particles(W / 2, -20, 'particle-glow', {
        x:         { min: -W / 2, max: W / 2 },
        speedY:    { min: 10, max: 22 },
        speedX:    { min: -6, max: 6  },
        scale:     { start: 0.12, end: 0 },
        alpha:     { start: 0.26, end: 0 },
        tint:      [0xFFDD88, 0xFFBB66, 0xFFAA44],
        lifespan:  { min: 3000, max: 6000 },
        frequency: 280,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 50));
    }

    // Intro narration
    this.time.delayedCall(2000, () => {
      if (!this.sys?.isActive()) return;
      const lines = storyData.dialogues?.ch7_intro;
      if (lines) this.dialogue?.start(lines);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION — two-phase gift
  // ═══════════════════════════════════════════════════════════════════

  _onFirstGift() {
    if (this._phase !== 1) return;
    this._phase = 2;

    audioManager._playTextureEvent?.('soft-click');
    this.cam.zoomPulse(1.45, 800);

    const allLines = storyData.dialogues?.ch6_gift ?? [];
    const firstLines = allLines.slice(0, 5);

    this.dialogue.start(firstLines, () => {
      // Gift 1 vanishes — "stolen"
      if (this._gift1) {
        this.tweens.add({ targets: this._gift1, alpha: 0, duration: 600, ease: 'Quad.easeIn' });
      }
      if (this._gift1Glow) {
        this.tweens.killTweensOf(this._gift1Glow);
        this.tweens.add({ targets: this._gift1Glow, alpha: 0, duration: 600 });
      }

      // Reveal Gift 2 after a beat — register interactable NOW so it
      // cannot be triggered before phase 1 dialogue fully completes.
      this.time.delayedCall(1000, () => {
        if (!this.sys?.isActive()) return;
        this._gift2 = this.placeInteractable(7.2, 4.4, 'light-blob', {
          id:            'gift_second',
          label:         'Give Again',
          triggerRadius: 55,
          glowRadius:    130,
          skipUnlockSFX: true,
          onTrigger:     () => this._onSecondGift(),
        }, { scale: 0.01, alpha: 0 });
        audioManager._playTextureEvent?.('sparkle-chime');
        this.tweens.add({
          targets:  this._gift2Glow,
          alpha:    { from: 0, to: 0.26 },
          scale:    { from: 2.8, to: 3.5 },
          duration: 1200,
          yoyo:     true, repeat: -1,
          ease:     'Sine.easeInOut',
        });
        // Heart emote above gift 2 — draws the player's eye to the new spot
        const g2Emote = this.grid(7.2, 3.5);
        this._addEmote(g2Emote.x, g2Emote.y, 'emote-heart', { scale: 0.28, delay: 400 });
      });
    });
  }

  _onSecondGift() {
    if (this._phase !== 2) return;
    this._phase = 3;

    audioManager._playTextureEvent?.('soft-click');
    this.cam.zoomPulse(1.50, 1000);

    if (this._gift2Glow) {
      this.tweens.killTweensOf(this._gift2Glow);
      this.tweens.add({
        targets:    this._gift2Glow,
        alpha:      0.55,
        scale:      4.5,
        duration:   400,
        yoyo:       true,
        ease:       'Quad.easeOut',
      });
    }

    const allLines = storyData.dialogues?.ch6_gift ?? [];
    const secondLines = allLines.slice(5);

    this.dialogue.start(secondLines, () => this._chapterComplete());
  }

  _chapterComplete() {
    // Delay stinger 280ms — separates emotional payoff from transition whoosh
    this.time.delayedCall(280, () => {
      if (this.sys?.isActive()) audioManager.playStinger('tenderness');
    });
    this._guardTransition(() => {
      goToChapter(this, 6);
    });
  }

  onUpdate(_time, _delta) {
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);
  }

  onShutdown() {
    this.tweens.killTweensOf(this._destGlow);
    this.tweens.killTweensOf(this._gift1Glow);
    this.tweens.killTweensOf(this._gift2Glow);
    audioManager.fadeOutAll(600);
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
