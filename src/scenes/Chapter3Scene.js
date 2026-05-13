import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter3Scene — "Hello… and Goodbye"
 *
 * The player WALKS left→right through a memory hallway.
 * Eight message bubbles are placed horizontally across a wide world (cols 22).
 * Each bubble is revealed by proximity as the player approaches — like walking
 * through the memory of a conversation that almost was.
 *
 * Visual language:
 *   • Deep night-blue void — late 2020 lockdown atmosphere
 *   • Warm amber spotlight on the player — laptop screen glow
 *   • Prawal messages: right side of path, dark teal bubbles
 *   • Aashna messages: left side of path, dark violet bubbles
 *   • "Silence." narrator: center, no bubble, large muted text
 *   • City silhouette far background — lockdown apartment lights
 */
export class Chapter3Scene extends ChapterScene {
  constructor() {
    super('Chapter3', {
      cols:       22,
      rows:       8,
      mood:       'rain',
      zoom:       1.72,
      targetZoom: 1.80,
      followLerp: 0.055,
      drift:      false,
      fadeInMs:   1600,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — late-night lockdown void
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    this.env = EnvironmentManager.apply(this, 'DARK', {
      void:           { color: 0x03060E },
      bgGlow:         { tint: 0x08102A, alpha: 0.08, scaleX: 16, scaleY: 6 },
      bgSilhouettes:  { enabled: false },
      floor:          { enabled: true, topColor: 0x080E1C, botColor: 0x03060E, startFrac: 0.62 },
      spotlightOuter: { tint: 0x1A2040, alpha: 0.08, pulseDur: 3600 },
      spotlightMid:   { tint: 0xCC7733, alpha: 0.12, pulseDur: 2400 },
      spotlightCore:  { tint: 0xFFAA55, alpha: 0.26, pulseDur: 1600 },
      groundPool:     { tint: 0xAA6622, alpha: 0.08 },
      vignette:       { size: 120, color: 0x000000, alphaL: 0.75, alphaR: 0.75, alphaT: 0.55, alphaB: 0.88 },
      colorGrade:     { color: 0x0A1830, alpha: 0.040, blend: 'OVERLAY' },
    });

    // Override lighting to cold midnight — kills inherited 'rain' blue and pins to almost-black
    // H1: store so _onResize can re-apply after SceneLighting is rebuilt on orientation change
    this._lightingConfigure = { ambientColor: 0x04080F, blobTint: 0x445588 };
    this.lighting.configure(this._lightingConfigure);

    const cx = this.worldW / 2;
    const wW = this.worldW;
    const wH = this.worldH;

    // ── FAR BACKGROUND — night city silhouette (lockdown, everyone home) ──
    if (this.textures.exists('bg-flat-mountain1')) {
      this.add.image(wW * 0.15, wH * 0.62, 'bg-flat-mountain1')
        .setOrigin(0.5, 1.0).setScrollFactor(0.04).setScale(5, 1.1)
        .setAlpha(0.45).setTint(0x0C0A22).setDepth(-180);
      this.add.image(wW * 0.62, wH * 0.62, 'bg-flat-mountain1')
        .setOrigin(0.5, 1.0).setScrollFactor(0.04).setScale(5, 1.1)
        .setAlpha(0.40).setTint(0x0A0820).setDepth(-180);
    }
    if (this.textures.exists('bg-flat-mountain2')) {
      this.add.image(wW * 0.38, wH * 0.62, 'bg-flat-mountain2')
        .setOrigin(0.5, 1.0).setScrollFactor(0.06).setScale(4, 0.85)
        .setAlpha(0.32).setTint(0x08061A).setDepth(-182);
      this.add.image(wW * 0.86, wH * 0.62, 'bg-flat-mountain2')
        .setOrigin(0.5, 1.0).setScrollFactor(0.06).setScale(4, 0.85)
        .setAlpha(0.28).setTint(0x080618).setDepth(-182);
    }

    // Apartment block silhouettes — lockdown, windows still lit across the city
    [
      { xf: 0.04, key: 'bgr-house1',    sx: 0.70, sy: 1.20 },
      { xf: 0.12, key: 'bgr-house2',    sx: 0.85, sy: 1.40 },
      { xf: 0.20, key: 'bgr-house-sm1', sx: 0.60, sy: 1.00 },
      { xf: 0.28, key: 'bgr-house1',    sx: 0.90, sy: 1.30 },
      { xf: 0.37, key: 'bgr-house-sm2', sx: 0.65, sy: 1.10 },
      { xf: 0.46, key: 'bgr-house2',    sx: 0.80, sy: 1.50 },
      { xf: 0.55, key: 'bgr-house-sm1', sx: 0.70, sy: 1.05 },
      { xf: 0.63, key: 'bgr-house1',    sx: 0.88, sy: 1.25 },
      { xf: 0.72, key: 'bgr-house-sm2', sx: 0.62, sy: 1.15 },
      { xf: 0.80, key: 'bgr-house2',    sx: 0.82, sy: 1.35 },
      { xf: 0.88, key: 'bgr-house1',    sx: 0.72, sy: 1.20 },
      { xf: 0.96, key: 'bgr-house-sm1', sx: 0.68, sy: 1.00 },
    ].forEach(d => {
      if (!this.textures.exists(d.key)) return;
      // Larger buildings scroll slower (imply greater distance)
      const sf = d.sy > 1.2 ? 0.07 : (d.sy < 1.0 ? 0.13 : 0.10);
      this.add.image(wW * d.xf, wH * 0.62, d.key)
        .setScrollFactor(sf).setScale(d.sx, d.sy).setOrigin(0.5, 1.0)
        .setAlpha(0.70).setTint(0x14113A).setDepth(-120);
    });

    // Apartment window glow dots — individual lights scattered across silhouettes
    // These represent all the people at home during lockdown
    const rng = (min, max) => min + Math.random() * (max - min);
    for (let wi = 0; wi < 28; wi++) {
      this.add.image(rng(16, wW - 16), rng(wH * 0.30, wH * 0.52), 'light-blob')
        .setScrollFactor(0.10).setScale(rng(0.06, 0.14), rng(0.04, 0.08))
        .setAlpha(rng(0.06, 0.14)).setTint(0xFFDD88)
        .setBlendMode('ADD').setDepth(-115);
    }

    // Horizon glow — depth = midnight blue haze at the base of the skyline
    this.add.image(cx, wH * 0.55, 'light-blob')
      .setScrollFactor(0.08).setScale(20, 0.8).setAlpha(0.06).setTint(0x1A1040)
      .setBlendMode('ADD').setDepth(-110);

    // Path glow — warm luminescent corridor under the walkway
    this.add.image(cx, wH * 0.638, 'light-blob')
      .setScale(16, 0.30).setAlpha(0.18).setTint(0xAA6622)
      .setBlendMode('ADD').setDepth(-14);
    this.add.image(cx, wH * 0.632, 'light-blob')
      .setScale(10, 0.15).setAlpha(0.22).setTint(0xCC8833)
      .setBlendMode('ADD').setDepth(-13);

    // Cold night sky twinkles — pinpoint stars above city silhouettes
    if (this.textures.exists('particle-star-k')) {
      [
        { xf: 0.08, yf: 0.22 }, { xf: 0.18, yf: 0.28 }, { xf: 0.30, yf: 0.20 },
        { xf: 0.44, yf: 0.25 }, { xf: 0.56, yf: 0.18 }, { xf: 0.68, yf: 0.26 },
        { xf: 0.80, yf: 0.22 }, { xf: 0.92, yf: 0.24 },
      ].forEach(sp => {
        this.add.image(wW * sp.xf, wH * sp.yf, 'particle-star-k')
          .setScrollFactor(0.04).setScale(0.04).setAlpha(0.08)
          .setTint(0xAABBDD).setBlendMode('ADD').setDepth(-130);
      });
    }

    // Emotional anchor — broken heart ghost near the "Silence." beat (col 14)
    if (this.textures.exists('emote-heartBroken')) {
      const silencePos = this.grid(14.2, 3.4);  // sits above narrator (4.2), below prawal (2.6)
      const heartImg = this.add.image(silencePos.x, silencePos.y, 'emote-heartBroken')
        .setScale(0.55).setAlpha(0.48).setTint(0x8899CC)
        .setDepth(19);
      // Slow breathe — draws the eye without distracting from the chat bubbles
      this.tweens.add({
        targets:  heartImg,
        alpha:    { from: 0.48, to: 0.20 },
        scale:    { from: 0.55, to: 0.50 },
        duration: 2800,
        yoyo:     true, repeat: -1,
        ease:     'Sine.easeInOut',
      });
    }

    // ── GROUND VARIATION — lockdown night pavement ────────────────────────────
    // Visual theme: damp concrete at 3 AM — cold slate, standing water reflections,
    // subtle cracked-pavement decals. All stays in cold midnight palette so it
    // adapts naturally to the scene's ambientColor (0x04080F) and blobTint (0x445588).
    //
    // Depth stack (back → front):
    //   -20: pavement bands  -19: damp noise  -17: gradient breaks
    //   -16: crack traces    -11: puddle reflections (ADD, floor-level)

    const floorTop = wH * 0.60;
    const floorBot = wH * 0.92;

    // ── 1. Pavement bands — horizontal slabs break the single-tone gradient ────
    // Alternating cold-slate and deep-indigo fills, subtly lighter/darker than
    // the base gradient, like concrete blocks under moonlight.
    const bandGfx = this.add.graphics().setDepth(-20);
    [
      { yf: 0.615, h: 6,  col: 0x0A0E1A, a: 0.22 },
      { yf: 0.652, h: 5,  col: 0x060A14, a: 0.18 },
      { yf: 0.692, h: 7,  col: 0x0C1020, a: 0.20 },
      { yf: 0.738, h: 4,  col: 0x04060E, a: 0.24 },
      { yf: 0.778, h: 5,  col: 0x080C18, a: 0.16 },
    ].forEach(b => {
      bandGfx.fillStyle(b.col, b.a);
      bandGfx.fillRect(0, wH * b.yf, wW, b.h);
    });

    // ── 2. Damp noise — deterministic scatter suggesting wet grit/pebbles ──────
    // Prime-stepped modulo — same technique as Ch2, no Math.random() on ground layer.
    const noiseGfx = this.add.graphics().setDepth(-19);
    for (let i = 0; i < 80; i++) {
      const nx = ((i * 137 + 53) % (wW - 20)) + 10;
      const ny = floorTop + ((i * 89 + 19) % (floorBot - floorTop));
      const nr = 0.35 + (i % 3) * 0.30;
      noiseGfx.fillStyle(0x1A2840, 0.025 + (i % 6) * 0.015);
      noiseGfx.fillCircle(nx, ny, nr);
    }
    // Brighter moisture specks — catches the ambient light slightly
    for (let i = 0; i < 12; i++) {
      const nx = ((i * 179 + 71) % (wW - 40)) + 20;
      const ny = wH * 0.65 + ((i * 61) % (wH * 0.20));
      noiseGfx.fillStyle(0x2A3A55, 0.10);
      noiseGfx.fillCircle(nx, ny, 0.9);
    }

    // ── 3. Pavement crack traces — L-shaped fault lines in the concrete ────────
    // Subtle, low-alpha — just enough to suggest texture without dominating.
    // Cold slate-blue line color echoes the ambient blobTint (0x445588).
    const crackGfx = this.add.graphics().setDepth(-16);
    [
      { x1: 0.06, y1: 0.66, x2: 0.10, y2: 0.67, vx: 0.10, vy: 0.70 },
      { x1: 0.22, y1: 0.71, x2: 0.28, y2: 0.70, vx: 0.28, vy: 0.74 },
      { x1: 0.44, y1: 0.64, x2: 0.50, y2: 0.65, vx: 0.50, vy: 0.68 },
      { x1: 0.62, y1: 0.72, x2: 0.69, y2: 0.71, vx: 0.69, vy: 0.75 },
      { x1: 0.80, y1: 0.66, x2: 0.86, y2: 0.67, vx: 0.86, vy: 0.70 },
      { x1: 0.94, y1: 0.69, x2: 0.98, y2: 0.68, vx: 0.98, vy: 0.72 },
    ].forEach(t => {
      crackGfx.lineStyle(0.6, 0x1E2A3A, 0.18);
      crackGfx.lineBetween(wW * t.x1, wH * t.y1, wW * t.x2, wH * t.y2);
      crackGfx.lineBetween(wW * t.x2, wH * t.y2, wW * t.vx, wH * t.vy);
      // knot dot at the crack joint
      crackGfx.fillStyle(0x2A3848, 0.22);
      crackGfx.fillCircle(wW * t.x2, wH * t.y2, 1.2);
    });

    // ── 4. Puddle reflections — ADD-blend floor pools, cold moonlight on water ──
    // Depth -11 places them above the path-glow ellipses (-14/-13), so they
    // sit on top of the warm amber corridor and shift its read toward cold/silvery.
    // xf positions are spread across the wide 22-col world (wW = 1408px).
    [
      { xf: 0.08, yf: 0.660, sx: 1.8, sy: 0.20, al: 0.07, tint: 0x223344 },
      { xf: 0.22, yf: 0.648, sx: 1.2, sy: 0.14, al: 0.05, tint: 0x1C2A3A },
      { xf: 0.40, yf: 0.655, sx: 1.6, sy: 0.18, al: 0.08, tint: 0x1A2840 },
      { xf: 0.58, yf: 0.645, sx: 1.0, sy: 0.12, al: 0.06, tint: 0x243344 },
      { xf: 0.74, yf: 0.658, sx: 1.4, sy: 0.16, al: 0.07, tint: 0x1E2E44 },
      { xf: 0.90, yf: 0.650, sx: 1.1, sy: 0.13, al: 0.05, tint: 0x1A2638 },
    ].forEach(p => {
      this.add.image(wW * p.xf, wH * p.yf, 'light-blob')
        .setScale(p.sx, p.sy).setAlpha(p.al).setTint(p.tint)
        .setBlendMode('ADD').setDepth(-11);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — chat bubbles spaced horizontally; each proximity-triggered
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    this._msgs = [];   // { bubble, label, triggerGO, revealed }

    // ── Chat app header — fixed to camera, appears after scene settles ─
    this._buildChatHeader();

    // ── Message definitions — spread across the 22-col world ──────────
    // col determines horizontal position along the walk.
    // row: prawal messages float above path (rows 2.6–3.5, varied to avoid linearity),
    //       aashna messages float below path (rows 5.0–5.3),
    //       narrator drifts just below center (row 4.2) for gravity.
    // Lower-half count: msgs 1, 3, 5, 7 = 4/8 = 50%.
    const MSG_DEFS = [
      { text: 'We started talking.\nSmall things at first.',         speaker: 'prawal',   col:  2.5, row: 2.8 },
      { text: "How's work?\nHow's the lockdown treating you?",       speaker: 'aashna',   col:  4.8, row: 5.0 },
      { text: 'Slowly… we found a rhythm.',                          speaker: 'prawal',   col:  7.2, row: 3.5 },
      { text: 'And then life happened.\nThe conversations faded.',   speaker: 'aashna',   col:  9.6, row: 5.3 },
      { text: 'Weeks went by. Then months.',                         speaker: 'prawal',   col: 12.0, row: 2.6 },
      { text: 'Silence.',                                            speaker: 'narrator', col: 14.2, row: 4.2 },
      { text: 'But I thought about Aashna\nmore than I should have.',speaker: 'prawal',   col: 16.6, row: 3.3 },
      { text: "Some stories aren't done yet.\nThey just… pause.",   speaker: 'aashna',   col: 19.2, row: 5.1 },
    ];

    // Per-speaker visual config
    const STYLE = {
      prawal: {
        textColor:  '#C4F0E4',
        bubbleFill: 0x0D3828,
        bubbleBord: 0x20AA77,
        glowTint:   0x1A6B50,
        tailDir:    'right',   // tail extends from right side of bubble
        tailPos:    'bottom',  // bubble is above path — tail at bottom
        align:      'right',
      },
      aashna: {
        textColor:  '#EED8F8',
        bubbleFill: 0x1E0D35,
        bubbleBord: 0x8855CC,
        glowTint:   0x5A2A88,
        tailDir:    'left',
        tailPos:    'top',     // bubble is below path — tail at top
        align:      'left',
      },
      narrator: {
        textColor:  '#8899AA',
        bubbleFill: null,      // no bubble — raw text
        bubbleBord: null,
        glowTint:   0x1A2A3A,
        tailDir:    null,
        align:      'center',
      },
    };

    for (let i = 0; i < MSG_DEFS.length; i++) {
      const def = MSG_DEFS[i];
      const pos = this.grid(def.col, def.row);
      const sty = STYLE[def.speaker];
      const isNarrator = def.speaker === 'narrator';

      // ── Text label ──────────────────────────────────────────────
      const fontSize  = isNarrator ? '11px' : '8px';
      const wrapWidth = isNarrator ? 160    : 120;
      const label = this.add.text(pos.x, pos.y, def.text, {
        fontFamily:  'Georgia, "Times New Roman", serif',
        fontSize,
        color:       sty.textColor,
        wordWrap:    { width: wrapWidth },
        lineSpacing: isNarrator ? 5 : 3,
        resolution:  2,
        align:       sty.align,
      }).setOrigin(0.5, 0.5).setAlpha(0).setDepth(22);

      // ── Chat bubble (drawn behind text) ─────────────────────────
      let bubble = null;
      if (!isNarrator) {
        const pad   = 10;
        const bW    = wrapWidth + pad * 2;
        const bH    = label.height + pad * 2 + 6;  // extra for tail
        const tailW = 6;
        const tailH = 8;
        bubble = this.add.graphics().setDepth(20);

        const drawBubble = () => {
          const lh = label.displayHeight || 24;
          const bHd = lh + pad * 2 + 6;
          bubble.clear();
          // Drop shadow
          bubble.fillStyle(0x000000, 0.32);
          bubble.fillRoundedRect(pos.x - bW / 2 + 2, pos.y - bHd / 2 + 3, bW, bHd, 7);
          // Body fill
          bubble.fillStyle(sty.bubbleFill, 0.88);
          bubble.fillRoundedRect(pos.x - bW / 2, pos.y - bHd / 2, bW, bHd, 7);
          // Border
          bubble.lineStyle(1.0, sty.bubbleBord, 0.60);
          bubble.strokeRoundedRect(pos.x - bW / 2, pos.y - bHd / 2, bW, bHd, 7);
          // Tail — points toward the conversation path (row 4)
          bubble.fillStyle(sty.bubbleFill, 0.88);
          if (sty.tailDir === 'right') {
            // Prawal: right-side bottom tail (bubble sits above path)
            const ty = pos.y + bHd / 2 - 2;
            bubble.fillTriangle(
              pos.x + bW / 2 - 2, ty - tailW,
              pos.x + bW / 2 - 2, ty,
              pos.x + bW / 2 + tailH, ty - tailW / 2,
            );
          } else if (sty.tailPos === 'top') {
            // Aashna: left-side TOP tail (bubble sits below path — tail points up)
            const ty = pos.y - bHd / 2 + 2;
            bubble.fillTriangle(
              pos.x - bW / 2 + 2, ty + tailW,
              pos.x - bW / 2 + 2, ty,
              pos.x - bW / 2 - tailH, ty + tailW / 2,
            );
          } else {
            const ty = pos.y + bHd / 2 - 2;
            bubble.fillTriangle(
              pos.x - bW / 2 + 2, ty - tailW,
              pos.x - bW / 2 + 2, ty,
              pos.x - bW / 2 - tailH, ty - tailW / 2,
            );
          }
          bubble.setAlpha(0);
        };
        // Defer one frame so Phaser has measured text dimensions before drawing
        this.time.delayedCall(0, drawBubble);
      }

      // ── Glow behind bubble ───────────────────────────────────────
      const gScaleX = isNarrator ? 4.2 : 2.2;
      const gScaleY = isNarrator ? 1.6 : 0.9;
      const glow = this.textures.exists('light-blob')
        ? this.add.image(pos.x, pos.y, 'light-blob')
            .setScale(gScaleX, gScaleY).setAlpha(0)
            .setTint(sty.glowTint).setBlendMode('ADD').setDepth(18)
        : null;

      // ── Invisible trigger hit-zone ───────────────────────────────
      const triggerGO = this.add.image(pos.x, this.grid(def.col, 4).y, 'light-blob')
        .setScale(0.01).setAlpha(0).setDepth(0);

      // ── Float tween (starts paused) ─────────────────────────────
      const floatTargets = [label, ...(bubble ? [bubble] : []), ...(glow ? [glow] : [])];
      const floatTween = this.tweens.add({
        targets:  floatTargets,
        y:        `+=-4`,
        duration: 3600 + i * 180,
        yoyo:     true, repeat: -1,
        ease:     'Sine.easeInOut',
        paused:   true,
      });

      this._msgs.push({
        bubble, label, glow, triggerGO, floatTween,
        baseX: pos.x, baseY: pos.y,
        isNarrator, revealed: false,
        glowTargetAlpha: isNarrator ? 0.28 : 0.16,
        glowScaleX: gScaleX, glowScaleY: gScaleY,
      });

      // ── Register proximity trigger ───────────────────────────────
      const msgIndex = i;
      this.proximity.register({
        id:            `ch3_msg_${i}`,
        gameObject:    triggerGO,
        triggerRadius: 85,
        glowRadius:    150,
        repeatable:    false,
        onTrigger:     () => this._revealMessage(msgIndex),
      });
    }

    // Mark the final trigger so we can detect walk-completion
    this._lastMsgIndex = MSG_DEFS.length - 1;

    // ── FOREGROUND OCCLUSION — night ground masses + tree silhouettes ──────────
    // Depth 'foreground' (602+) sits above the Y-sorted player (gameplay max 599),
    // so the character naturally passes BEHIND these elements as they approach the
    // bottom of the scene — creating dimensional layering in an otherwise flat void.
    // Palette matches the lockdown night: near-black with cold indigo tint.    //
    // Portrait mobile: Ch3's 8-row world (512px) is almost entirely visible at
    // zoom 1.72 on a tall phone. Rows 6–7 (the occlusion zone) are fully on-screen
    // and appear as dark floating blobs / trees against the atmosphere. Skip them
    // on portrait — the narrow viewport already has enough framing from vignette.
    const _isGfxPortrait = this.scale.height > this.scale.width;
    if (_isGfxPortrait) return;
    const occDepth = this.layers.depth('gameplay', 5);   // 5 — below any Y-sort value

    // Helper — wide flat ground-hugging mass. w:h ≥ 2.5:1 so shapes read as
    // ledges/rocks, not upright boulders or UI cards.
    const drawMass = (wx, wy, w, h) => {
      const gm = this.add.graphics().setDepth(occDepth);
      const r  = h * 0.52;
      // soft drop shadow — wide ellipse beneath
      gm.fillStyle(0x000000, 0.28);
      gm.fillEllipse(wx, wy + h * 0.38, w * 1.10, h * 0.22);
      // primary body — near-black with cold blue undertone
      gm.fillStyle(0x050310, 1);
      gm.fillRoundedRect(wx - w / 2, wy - h / 2, w, h, r);
      // subtle top-cap shift — uneven top edge, avoids flat UI-card look
      gm.fillStyle(0x07041A, 1);
      gm.fillRoundedRect(wx - w * 0.30, wy - h * 0.72, w * 0.55, h * 0.48, r * 0.85);
      // dark-indigo rim — low contrast so it doesn't read as a border
      gm.lineStyle(0.8, 0x100828, 0.50);
      gm.strokeRoundedRect(wx - w / 2, wy - h / 2, w, h, r);
      return gm;
    };

    // Six masses distributed across the 22-col width.
    // Staggered Y (rows 6.3–6.8) so no two consecutive elements share the same row.
    drawMass(this.grid( 0.5, 6.4).x, this.grid( 0.5, 6.4).y, 100, 34);  // left edge, partial crop
    drawMass(this.grid( 3.8, 6.6).x, this.grid( 3.8, 6.6).y,  58, 22);  // small pebble, col 4
    drawMass(this.grid( 8.2, 6.5).x, this.grid( 8.2, 6.5).y,  80, 28);  // mid-left ledge
    drawMass(this.grid(13.0, 6.8).x, this.grid(13.0, 6.8).y,  64, 24);  // near narrator beat
    drawMass(this.grid(17.5, 6.3).x, this.grid(17.5, 6.3).y,  90, 32);  // right-side wide ledge
    drawMass(this.grid(21.4, 6.7).x, this.grid(21.4, 6.7).y,  52, 20);  // far-right edge

    // Three wide-canopy tree silhouettes — foliage-tree2/tree5 suit the lockdown
    // aesthetic; their broad crowns frame the top of the occlusion band without
    // adding conifer spikes that would clash with the chat-hall atmosphere.
    // Origin 0.5/0.88 shows crown + upper trunk only, cropping the root base.
    [
      { key: 'foliage-tree2', c:  2.0, r: 6.8, sc: 0.22 },
      { key: 'foliage-tree5', c: 10.8, r: 6.9, sc: 0.20 },
      { key: 'foliage-tree2', c: 19.8, r: 6.8, sc: 0.21 },
    ].forEach(({ key, c, r, sc }) => {
      if (!this.textures.exists(key)) return;
      this.add.image(this.grid(c, r).x, this.grid(c, r).y, key)
        .setScale(sc).setAlpha(0.60).setTint(0x02030A)
        .setDepth(occDepth + 1).setOrigin(0.5, 0.88);
    });
  }

  // ── Chat header bar — delegated to UIScene (Aashna name, zoom-safe) ───
  _buildChatHeader() {
    this.game.events.emit('chat-header-show');
    this.scene.get('UI')?._onChatHeaderShow?.();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS — player starts at left, walks right through memory
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    const start = this.grid(0.8, 4.45);  // row 4.45 = floor startFrac 0.62 × worldH 512 = 317px
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male', displayW: 40, displayH: 62 },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.50, dynamic: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FX
  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    // Portrait: Ch3's 22-col world is wide enough that the camera scrolls
    // horizontally, but the 8-row height (512px) fits almost entirely in a
    // 490px portrait viewport. Pull the camera up slightly so chat bubbles
    // (rows 2.6–5.3) fill the centre of the screen, keeping the dark void
    // floor from dominating the lower half.
    // Desktop / iPad / landscape: no offset.
    const _vH3 = this.scale.height;
    if (_vH3 > this.scale.width) {
      this.cam.configure({
        baseOffsetY: -Math.round(_vH3 / (this._cfg.targetZoom ?? this._cfg.zoom) * 0.14),
      });
    }

    const W = this.worldW;
    const H = this.worldH;

    // Sparse warm motes — like dust in late-night lamplight
    if (this.textures.exists('particle-glow')) {
      this.add.particles(W / 2, H / 2, 'particle-glow', {
        x:         { min: -W / 2, max: W / 2 },
        y:         { min: -H / 2, max: H / 2 },
        speedX:    { min: -2, max: 2 },
        speedY:    { min: -5, max: -1 },
        scale:     { start: 0.05, end: 0 },
        alpha:     { start: 0.10, end: 0 },
        tint:      [0xAA7722, 0x886611, 0x334466],
        lifespan:  { min: 5000, max: 10000 },
        frequency: 700,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('midground', 95));
    }

    // Intro narration then hint to walk
    this.time.delayedCall(2000, () => {
      const lines = storyData.dialogues?.ch3_intro;
      if (lines && this.dialogue) {
        this.dialogue.start(lines, () => this._showWalkHint());
      } else {
        this._showWalkHint();
      }
    });
  }

  _showWalkHint() {
    // Faint "→" nudge under the player — fades after 3s
    const ps   = this.grid(0.8, 4.45);
    const hint = this.add.text(ps.x + 20, ps.y + 22, '→', {
      fontFamily: 'Georgia, serif',
      fontSize:   '10px',
      color:      '#335577',
      resolution: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(30);
    this.tweens.add({ targets: hint, alpha: 0.55, duration: 600 });
    this.tweens.add({ targets: hint, x: `+=6`, duration: 900, yoyo: true, repeat: 3, ease: 'Sine.easeInOut',
      onComplete: () => this.tweens.add({ targets: hint, alpha: 0, duration: 400, onComplete: () => hint.destroy() }),
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MESSAGE REVEAL — called by proximity trigger
  // ═══════════════════════════════════════════════════════════════════

  _revealMessage(index) {
    const msg = this._msgs[index];
    if (!msg || msg.revealed) return;
    msg.revealed = true;

    const { bubble, label, glow, baseY, floatTween } = msg;
    const enterY = baseY + 14;

    // Per-speaker reveal SFX — gives each message a distinct acoustic fingerprint:
    // Prawal (keyboard-tick): the sound of HIM composing and sending.
    // Aashna (soft-click): softer, different register = a different device across the city.
    // Narrator "Silence." (silence-breath): a quiet exhale — the pause itself becomes sound.
    // All route through textureBus so they're naturally quiet vs. the music bus.
    if (!msg.isNarrator) {
      // Determine speaker from the reveal order: odd indices are aashna, even are prawal
      const isAashna = (index % 2 === 1);
      audioManager._playTextureEvent?.(isAashna ? 'soft-click' : 'keyboard-tick');
    } else {
      // "Silence." — intentional breath sound: the pause made audible
      audioManager._playTextureEvent?.('silence-breath');
    }

    // Rise-in entrance
    if (bubble) {
      bubble.y = enterY - baseY;
      this.tweens.add({ targets: bubble, y: 0, alpha: 1, duration: 600, ease: 'Quad.easeOut' });
    }
    if (glow) {
      glow.setY(enterY);
      this.tweens.add({ targets: glow, y: baseY, alpha: msg.glowTargetAlpha, duration: 600, ease: 'Quad.easeOut' });
    }
    label.setY(enterY);
    this.tweens.add({
      targets: label, y: baseY, alpha: msg.isNarrator ? 0.85 : 1.0,
      duration: 600, ease: 'Quad.easeOut',
      onComplete: () => floatTween.resume(),
    });

    // Dim the previous message to "read" state
    if (index > 0) {
      const prev = this._msgs[index - 1];
      if (prev.bubble) this.tweens.add({ targets: prev.bubble, alpha: 0.25, duration: 900 });
      if (prev.glow)   this.tweens.add({ targets: prev.glow,   alpha: 0.04, duration: 900 });
      this.tweens.add({ targets: prev.label, alpha: 0.22, duration: 900 });
    }

    // Last message reached — schedule chapter end after a long linger
    if (index === this._lastMsgIndex) {
      this.time.delayedCall(9000, () => {
        if (!this.sys?.isActive()) return;
        this._onConversationEnd();
      });
    }
  }

  _onConversationEnd() {
    // Heartbreak stinger fires HERE — at the moment the conversation memory begins
    // fading, not during the transition whoosh.  This is the emotional endpoint.
    // The stinger (1.25s) completes cleanly before the 2000ms delayedCall fires
    // _chapterComplete and _guardTransition runs.
    audioManager.playStinger('heartbreak');

    for (const msg of this._msgs) {
      if (msg.bubble) this.tweens.add({ targets: msg.bubble, alpha: 0,    duration: 1800 });
      if (msg.glow)   this.tweens.add({ targets: msg.glow,   alpha: 0,    duration: 1800 });
      this.tweens.add({ targets: msg.label, alpha: 0.05, duration: 1800 });
    }
    this.time.delayedCall(2000, () => {
      if (this.sys?.isActive() && !this.dialogue?.active) this._chapterComplete();
    });
  }

  _chapterComplete() {
    // Stinger already played in _onConversationEnd — do not re-fire here.
    // 400ms buffer: lets the tail of the heartbreak stinger (silence after notes decay)
    // breathe before _guardTransition fires playTransitionWhoosh().
    this.time.delayedCall(400, () => {
      this._guardTransition(() => {
        goToChapter(this, 3);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════

  onUpdate(_time, _delta) {
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);
  }

  onShutdown() {
    this.game.events.emit('chat-header-hide');
    this.scene.get('UI')?._onChatHeaderHide?.();
    audioManager.fadeOutAll(600);  // prevent hard cut when transitioning to Ch4
    // H2: kill all per-message float tweens (repeat:-1) before scene tears down
    this._msgs?.forEach(m => {
      m.floatTween?.stop();
      this.tweens.killTweensOf(m.label);
      if (m.bubble) this.tweens.killTweensOf(m.bubble);
      if (m.glow)   this.tweens.killTweensOf(m.glow);
    });
    this._msgs = null;
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
