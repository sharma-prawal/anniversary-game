import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter2Scene — "One Click. One Leap."
 *
 * Floating social-media panels drift in a dark blue void with slight
 * parallax. The player walks between scattered panels on a narrow
 * walkway. Only one panel glows — the "Add Friend" button.
 * Walking to it triggers the story.
 *
 * Uses Kenney UI + environment assets only.
 * Start: scene.scene.start('Chapter2');
 */
export class Chapter2Scene extends ChapterScene {
  constructor() {
    super('Chapter2', {
      cols: 12,
      rows: 8,
      mood: 'romantic',
      zoom: 1.72,
      targetZoom: 1.80,
      followLerp: 0.055,
      drift: false,
      fadeInMs: 1600,
    });
  }

  // Tile indices — roguelike spritesheet (57 cols, 1px spacing)
  static TILES = { STONE: 119, DIRT: 518 };

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — narrow floating walkway + dark void
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // ── Environment preset — indigo-purple digital cyberspace ────────
    this.env = EnvironmentManager.apply(this, 'DARK', {
      void:           { color: 0x030614 },
      bgGlow:         { tint: 0x0E0830, alpha: 0.10, scaleX: 14, scaleY: 6 },
      bgSilhouettes:  { enabled: false },
      floor:          { enabled: true, topColor: 0x0A0820, botColor: 0x030614, startFrac: 0.60 },
      spotlightOuter: { tint: 0x996633, alpha: 0.08, pulseDur: 3400 },
      spotlightMid:   { tint: 0xBB8844, alpha: 0.16, pulseDur: 2200 },
      spotlightCore:  { tint: 0xFFEEDD, alpha: 0.30, pulseDur: 1400 },
      groundPool:     { tint: 0xAA8833, alpha: 0.12 },
      vignette:       { size: 160, color: 0x000000, alphaL: 0.95, alphaR: 0.50, alphaT: 0.95, alphaB: 0.95 },
      colorGrade:     { color: 0x1A2055, alpha: 0.045, blend: 'OVERLAY' },
    });

    // Cold blue-violet player halo — digital void identity, not Ch1's warm amber
    this._lightingConfigure = {
      ambientColor:   0x080620,
      lightIntensity: 0.45,
      lightRadius:    160,
      blobAlpha:      0.22,
      blobTint:       0x8899CC,
      ambGlowAlpha:   0.08,
      ambGlowTint:    0x4455AA,
    };
    this.lighting.configure(this._lightingConfigure);

    this._buildEmoteOverlays();

    // Invisible walkable floor — physics collision only, no visual
    const { groundLayer } = this._makeTilemap('roguelike-tiles', 'roguelikeTiles');
    if (groundLayer) {
      groundLayer.fill(Chapter2Scene.TILES.STONE, 0, 14, Math.round(this.worldW / 16), 6);
      groundLayer.setAlpha(0);
    }

    const cx = this.worldW / 2;
    const wW = this.worldW;
    const wH = this.worldH;

    // ── FAR ATMOSPHERIC SILHOUETTES — the infinite digital world ─────────
    if (this.textures.exists('bg-flat-mountain1')) {
      this.add.image(cx * 0.9, wH * 0.58, 'bg-flat-mountain1')
        .setScrollFactor(0.05).setScale(3.5, 1.2)
        .setAlpha(0.55).setTint(0x1E1850).setDepth(-180);
    }
    if (this.textures.exists('bg-flat-mountain2')) {
      this.add.image(cx * 1.2, wH * 0.62, 'bg-flat-mountain2')
        .setScrollFactor(0.07).setScale(2.8, 0.9)
        .setAlpha(0.40).setTint(0x160E3E).setDepth(-182);
    }

    // ── CITY SILHOUETTE — the digital city Prawal searches through ────────
    [
      { xf: 0.05, yf: 0.54, key: 'bgr-house1',    sx: 0.80, sy: 1.10 },
      { xf: 0.15, yf: 0.56, key: 'bgr-house-sm1', sx: 0.65, sy: 0.90 },
      { xf: 0.24, yf: 0.53, key: 'bgr-house2',    sx: 0.90, sy: 1.20 },
      { xf: 0.34, yf: 0.55, key: 'bgr-house-sm2', sx: 0.60, sy: 0.85 },
      { xf: 0.44, yf: 0.52, key: 'bgr-house1',    sx: 1.00, sy: 1.30 },
      { xf: 0.55, yf: 0.55, key: 'bgr-house-sm1', sx: 0.70, sy: 0.95 },
      { xf: 0.65, yf: 0.53, key: 'bgr-house2',    sx: 0.85, sy: 1.15 },
      { xf: 0.75, yf: 0.56, key: 'bgr-house-sm2', sx: 0.68, sy: 0.88 },
      { xf: 0.84, yf: 0.54, key: 'bgr-house1',    sx: 0.78, sy: 1.05 },
      { xf: 0.94, yf: 0.55, key: 'bgr-house-sm1', sx: 0.62, sy: 0.92 },
    ].forEach(d => {
      if (!this.textures.exists(d.key)) return;
      this.add.image(wW * d.xf, wH * d.yf, d.key)
        .setScrollFactor(0.12).setScale(d.sx, d.sy).setOrigin(0.5, 1.0)
        .setAlpha(0.32).setTint(0x070516).setDepth(-120);
    });

    // ── SCENE-SPECIFIC — destination backlight + directional beam ──────────
    // Destination backlight — pulls eye toward Add Friend
    const _afBgPos = this.grid(7.2, 4);
    this.add.image(_afBgPos.x, _afBgPos.y, 'light-blob')
      .setScale(8, 5).setAlpha(0.14).setTint(0x2266CC)
      .setBlendMode('ADD').setDepth(-7);

    // ── LUMINOUS WALKWAY — concentric ellipses that read as a floor plane
    this.add.image(cx, wH * 0.635, 'light-blob')
      .setScale(5.5, 0.38).setAlpha(0.06).setTint(0x3355BB)
      .setBlendMode('ADD').setDepth(-15);
    this.add.image(cx, wH * 0.630, 'light-blob')
      .setScale(3.5, 0.20).setAlpha(0.08).setTint(0x4466CC)
      .setBlendMode('ADD').setDepth(-14);
    this.add.image(cx, wH * 0.625, 'light-blob')
      .setScale(1.8, 0.10).setAlpha(0.10).setTint(0x5577DD)
      .setBlendMode('ADD').setDepth(-13);

    // Horizon depth band — gives the void a sense of infinite space
    this.add.image(cx, wH * 0.50, 'light-blob')
      .setScale(18, 1.2).setAlpha(0.05).setTint(0x3355AA)
      .setBlendMode('ADD').setDepth(-9);

    // ── GROUND VARIATION — layers, noise, decals ──────────────────────────────
    // Cold blue-violet palette throughout to match scene lighting.
    // Depth stack (back → front):
    //   -20: digital grid   -19: noise scatter   -17: gradient bands
    //   -16: circuit traces  -11: cold light pools (ADD above walkway glows)

    const floorTop = wH * 0.58;
    const floorBot = wH * 0.92;

    // ── 1. Digital grid — faint scan lines over the floor plane ──────────────
    // Horizontal spacing 16px, vertical spacing 48px to imply perspective foreshortening.
    const gridGfx = this.add.graphics().setDepth(-20);
    gridGfx.lineStyle(0.5, 0x1A156A, 0.16);
    for (let y = floorTop; y < floorBot; y += 16) {
      gridGfx.lineBetween(0, y, wW, y);
    }
    gridGfx.lineStyle(0.5, 0x12105A, 0.09);
    for (let x = 0; x < wW; x += 48) {
      gridGfx.lineBetween(x, floorTop, x, floorBot);
    }

    // ── 2. Noise scatter — deterministic data-artifact dots ───────────────────
    // Prime-stepped modulo gives repeatable non-random scatter without Math.random().
    const noiseGfx = this.add.graphics().setDepth(-19);
    for (let i = 0; i < 65; i++) {
      const nx = ((i * 131 + 47) % (wW - 20)) + 10;
      const ny = floorTop + ((i * 97 + 23) % (floorBot - floorTop));
      const nr = 0.4 + (i % 3) * 0.35;
      noiseGfx.fillStyle(0x2A28AA, 0.03 + (i % 5) * 0.018);
      noiseGfx.fillCircle(nx, ny, nr);
    }
    // Brighter accent — a handful that catch the eye on second look
    for (let i = 0; i < 9; i++) {
      const nx = ((i * 173 + 89) % (wW - 40)) + 20;
      const ny = wH * 0.64 + ((i * 67) % (wH * 0.18));
      noiseGfx.fillStyle(0x3830D0, 0.12);
      noiseGfx.fillCircle(nx, ny, 1.1);
    }

    // ── 3. Gradient banding — break the uniform floor colour ─────────────────
    // Four shallow horizontal fills at staggered fractional Y, alternating
    // cold-blue / indigo / deep-violet to interrupt the single-tone gradient.
    const bandGfx = this.add.graphics().setDepth(-17);
    [
      { yf: 0.615, h: 5,  col: 0x0C0A38, a: 0.20 },
      { yf: 0.655, h: 4,  col: 0x100E48, a: 0.15 },
      { yf: 0.700, h: 7,  col: 0x08052E, a: 0.22 },
      { yf: 0.748, h: 4,  col: 0x04021C, a: 0.18 },
    ].forEach(b => {
      bandGfx.fillStyle(b.col, b.a);
      bandGfx.fillRect(0, wH * b.yf, wW, b.h);
    });

    // ── 4. Circuit traces — PCB-style L-bends scattered on the floor ─────────
    // Short horizontal run → corner dot → short vertical drop.
    // Evokes the digital cyberspace without being literal UI.
    const traceGfx = this.add.graphics().setDepth(-16);
    [
      { x1: 0.08, y1: 0.65, x2: 0.14, y2: 0.65, vx: 0.14, vy: 0.68 },
      { x1: 0.30, y1: 0.70, x2: 0.38, y2: 0.70, vx: 0.38, vy: 0.67 },
      { x1: 0.56, y1: 0.63, x2: 0.62, y2: 0.63, vx: 0.62, vy: 0.67 },
      { x1: 0.74, y1: 0.69, x2: 0.82, y2: 0.69, vx: 0.82, vy: 0.66 },
    ].forEach(t => {
      traceGfx.lineStyle(0.7, 0x2822AA, 0.20);
      traceGfx.lineBetween(wW * t.x1, wH * t.y1, wW * t.x2, wH * t.y2);
      traceGfx.lineBetween(wW * t.x2, wH * t.y2, wW * t.vx, wH * t.vy);
      // node dot at elbow
      traceGfx.fillStyle(0x3A30CC, 0.28);
      traceGfx.fillCircle(wW * t.x2, wH * t.y2, 1.5);
      // terminal dot
      traceGfx.fillStyle(0x3A30CC, 0.20);
      traceGfx.fillCircle(wW * t.vx, wH * t.vy, 1.0);
    });

    // ── 5. Cold light variance pools — multi-source floor lighting ────────────
    // Extra ADD-blended blobs at floor level break the single warm-amber
    // spotlight into a complex read and echo the cold scene lighting tint.
    // Depth -11 places them in front of the walkway ellipses (-13/-14/-15),
    // letting the pools blend on top of the existing warm glow.
    [
      { xf: 0.12, yf: 0.665, sx: 2.0, sy: 0.24, al: 0.07, tint: 0x1A2888 },
      { xf: 0.38, yf: 0.645, sx: 1.4, sy: 0.16, al: 0.06, tint: 0x22188A },
      { xf: 0.60, yf: 0.660, sx: 1.6, sy: 0.20, al: 0.07, tint: 0x2A1A9A },
      { xf: 0.85, yf: 0.650, sx: 1.2, sy: 0.14, al: 0.05, tint: 0x161066 },
    ].forEach(p => {
      this.add.image(wW * p.xf, wH * p.yf, 'light-blob')
        .setScale(p.sx, p.sy).setAlpha(p.al).setTint(p.tint)
        .setBlendMode('ADD').setDepth(-11);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — floating panels with parallax + the glowing target
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    this._nodes = [];

    // ── PROFILE CARDS — the wrong faces scrolled past ─────────────────────────
    // Each card = a dark floating social profile Prawal came across while searching.
    // Arranged as a scattered arc from far-left → center, growing slightly brighter
    // as the search narrows. Cold indigo fading in from the left; the right stays open.
    // These are all the wrong people. The only computer is the one that matters.

    const CW = 56;   // card local width
    const CH = 78;   // card local height
    const DRIFT_DUR = 5600;

    // { c, r, name, sc=scale, al=alpha, rot=rotation radians }
    const profileDefs = [
      // Far-left scatter — visible rows 2-3, cold and faint
      { c: 0.9,  r: 2.8,  name: 'Anjali S.',  sc: 0.78, al: 0.55, rot: -0.10 }, // was r1.6 (off-screen) → brought into view
      { c: 2.0,  r: 2.5,  name: 'Divya K.',   sc: 0.82, al: 0.60, rot:  0.05 }, // was r2.2 slight reposition + col adj
      { c: 4.8,  r: 3.5,  name: 'Priya M.',   sc: 0.74, al: 0.48, rot:  0.09 }, // was c1.0 r3.2 → moved right + lower
      { c: 5.2,  r: 3.8,  name: 'Pooja T.',   sc: 0.80, al: 0.58, rot: -0.06 }, // was c4.0 r1.4 (off-screen) → right-side upper
      // Lower half — cards below the walkway plane
      { c: 0.6,  r: 5.5,  name: 'Sneha V.',   sc: 0.70, al: 0.40, rot:  0.12 }, // unchanged
      { c: 2.4,  r: 5.4,  name: 'Neha R.',    sc: 0.76, al: 0.45, rot: -0.07 }, // was r5.2 slight col adj
      { c: 3.4,  r: 4.6,  name: 'Simran A.',  sc: 0.86, al: 0.68, rot: -0.03 }, // was c3.8 r4.8 slight adj
      { c: 5.6,  r: 5.0,  name: 'Mehak S.',   sc: 0.76, al: 0.52, rot:  0.04 }, // was c4.2 r2.4 → moved to right-side lower
    ];

    profileDefs.forEach((p, i) => {
      const pos = this.grid(p.c, p.r);

      // ── Draw the card (Phaser.Graphics, drawn around local origin 0,0) ──────
      const g = this.add.graphics();

      // Drop shadow
      g.fillStyle(0x000000, 0.42);
      g.fillRoundedRect(-CW / 2 + 2, -CH / 2 + 3, CW, CH, 6);

      // Card body — far cards (i<3) colder/darker: search narrowing from left → right
      g.fillStyle(i < 3 ? 0x0E0C33 : 0x19174A, 1);
      g.fillRoundedRect(-CW / 2, -CH / 2, CW, CH, 6);

      // Cover photo strip at top (like a Facebook profile cover)
      g.fillStyle(0x25226A, 1);
      g.fillRoundedRect(-CW / 2, -CH / 2, CW, 18, 6);
      g.fillRect(-CW / 2, -CH / 2 + 12, CW, 6);

      // Card border
      g.lineStyle(1.2, 0x5550A8, 0.80);
      g.strokeRoundedRect(-CW / 2, -CH / 2, CW, CH, 6);

      // Avatar ring backing (punches through cover strip boundary)
      g.fillStyle(0x19174A, 1);
      g.fillCircle(0, -CH / 2 + 24, 15);
      // Avatar fill — dark silhouette background
      g.fillStyle(0x2E2B70, 1);
      g.fillCircle(0, -CH / 2 + 24, 13);
      // Avatar border ring
      g.lineStyle(1.8, 0x6660C0, 0.75);
      g.strokeCircle(0, -CH / 2 + 24, 15);
      // Person silhouette — head
      g.fillStyle(0x201E5A, 1);
      g.fillCircle(0, -CH / 2 + 21, 5);
      // Person silhouette — shoulders/body
      g.fillEllipse(0, -CH / 2 + 30, 14, 8);

      // Name bar — wide and clearly readable
      g.fillStyle(0x363380, 1);
      g.fillRoundedRect(-20, -CH / 2 + 44, 40, 6, 2);

      // Sub-line (mutual friends / city)
      g.fillStyle(0x282660, 1);
      g.fillRoundedRect(-14, -CH / 2 + 54, 28, 3, 1);

      // Mutual friend dots — three small circles
      g.fillStyle(0x201E55, 1);
      [-8, -2, 4].forEach(dx => g.fillCircle(dx, -CH / 2 + 62, 2.2));
      g.fillRoundedRect(8, -CH / 2 + 60, 10, 4, 1);

      // Add Friend button — filled box (wrong button, never pressed)
      g.fillStyle(0x2C2A80, 0.70);
      g.fillRoundedRect(-20, CH / 2 - 21, 40, 13, 4);
      g.lineStyle(0.9, 0x5550AA, 0.58);
      g.strokeRoundedRect(-20, CH / 2 - 21, 40, 13, 4);

      // Name label — overlays the name bar; warm-ish, clearly readable
      const lblAlpha = Math.min(p.al * 1.5, 0.90);
      const nameText = this.add.text(0, -CH / 2 + 44, p.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '6px',
        color: '#7A78C0',
        resolution: 2,
      }).setOrigin(0.5, 0).setAlpha(lblAlpha);

      // "Add Friend" text inside the wrong card's button
      const btnText = this.add.text(0, CH / 2 - 14, '+ Add Friend', {
        fontFamily: 'Georgia, serif',
        fontSize: '4px',
        color: '#4A48A0',
        resolution: 2,
      }).setOrigin(0.5, 0.5).setAlpha(lblAlpha * 0.7);

      // Container holds card + labels; positioned at world coords
      const container = this.add.container(pos.x, pos.y, [g, nameText, btnText]);
      container.setScale(p.sc).setAlpha(p.al).setRotation(p.rot).setDepth(2);

      // Per-card glow — cold, very faint
      const glow = this.add.image(pos.x, pos.y + 4, 'light-blob')
        .setScale(1.0).setAlpha(0.06).setTint(0x1E1C50)
        .setBlendMode('ADD').setDepth(1);

      // Floating drift — each card has a slightly different period for organic feel
      const phase = i * (DRIFT_DUR / profileDefs.length);
      this.tweens.add({
        targets: [container, glow],
        y: `+=3`,
        duration: DRIFT_DUR + i * 200, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: phase,
      });
      this.tweens.add({
        targets: container,
        scale: { from: p.sc, to: p.sc * 1.03 },
        duration: 3200 + i * 130, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: phase,
      });

      this._nodes.push({
        img: container, lbl: nameText, glow,
        tier: i < 3 ? 3 : (i < 6 ? 2 : 1),
        baseAlpha: p.al,    baseScale: p.sc,
        baseLblAlpha: lblAlpha, baseGlowAlpha: 0.03,
        wx: pos.x, wy: pos.y,
      });
    });

    // ── PRIMARY: ADD FRIEND — the one Facebook profile that changed everything ─
    const afc = 7.2;
    const afr = 4;
    const afp = this.grid(afc, afr);

    // Three-layer glow
    const g1 = this.add.image(afp.x, afp.y + 8, 'light-blob')
      .setScale(4.5).setAlpha(0.12).setTint(0x4488FF).setBlendMode('ADD').setDepth(-4);
    const g2 = this.add.image(afp.x, afp.y + 8, 'light-blob')
      .setScale(2.5).setAlpha(0.24).setTint(0x77AAFF).setBlendMode('ADD').setDepth(-3);
    const g3 = this.add.image(afp.x, afp.y + 8, 'light-blob')
      .setScale(1.1).setAlpha(0.38).setTint(0xEECCFF).setBlendMode('ADD').setDepth(-2);

    this._targetGlow = g2;

    // Aashna's face warmth — barely-there warmth behind the screen, depth -1
    // so it stays behind the k-computer sprite and doesn't appear as a blob
    this.add.image(afp.x, afp.y - 8, 'light-blob')
      .setScale(1.2, 0.8).setAlpha(0.08).setTint(0xFFDDFF)
      .setBlendMode('ADD').setDepth(-1);

    // Subliminal heart — Prawal's feeling, barely visible until close
    if (this.textures.exists('emote-heart')) {
      const hp = this.grid(8.6, 3.1);
      const heartImg = this.add.image(hp.x, hp.y, 'emote-heart')
        .setScale(0.18).setAlpha(0.08).setTint(0x8855AA).setDepth(1);
      this.tweens.add({
        targets: heartImg, y: `-=4`,
        duration: 4200, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: 800,
      });
    }

    [{ t: g1, sLo: 4.2, sHi: 5.0, aLo: 0.10, aHi: 0.15 },
     { t: g2, sLo: 2.3, sHi: 2.9, aLo: 0.20, aHi: 0.30 },
     { t: g3, sLo: 1.0, sHi: 1.3, aLo: 0.34, aHi: 0.46 },
    ].forEach(({ t, sLo, sHi, aLo, aHi }) => {
      this.tweens.add({
        targets: t, scale: { from: sLo, to: sHi }, alpha: { from: aLo, to: aHi },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });

    // Directional beam: player → Add Friend
    const pCenter = this.grid(2.5, 4);
    const afLen = Math.hypot(afp.x - pCenter.x, afp.y - pCenter.y);
    const afAng = Math.atan2(afp.y - pCenter.y, afp.x - pCenter.x);
    this.add.image((pCenter.x + afp.x) / 2, (pCenter.y + afp.y) / 2, 'light-blob')
      .setScale(afLen / 64, 0.18).setAlpha(0.18).setTint(0x5588DD)
      .setBlendMode('ADD').setDepth(-6).setRotation(afAng);

    // ── AASHNA NAME ON SCREEN — warm floating label above the Add Friend monitor ─
    // The only card with a real warm-tinted name. The contrast makes it unmissable.
    // depth foreground+20 (620) — above Y-sorted player (~256) so it never gets occluded
    const aashnaName = this.add.text(afp.x, afp.y - 52, 'Aashna', {
      fontFamily: 'Georgia, serif',
      fontSize: '9px',
      color: '#F5D4A0',
      stroke: '#1A0A00',
      strokeThickness: 3,
      resolution: 2,
    }).setOrigin(0.5).setAlpha(0.88).setDepth(this.layers.depth('foreground', 20));
    this.tweens.add({
      targets: aashnaName,
      alpha: { from: 0.88, to: 0.55 },
      duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── ADD FRIEND BUTTON — styled like an actual Facebook button ───────────────
    const btnW = 72; const btnH = 16;
    const btnX = afp.x; const btnY = afp.y + 44;
    const btnG = this.add.graphics().setDepth(this.layers.depth('foreground', 20));
    // Button shadow
    btnG.fillStyle(0x000000, 0.35);
    btnG.fillRoundedRect(btnX - btnW / 2 + 1, btnY - btnH / 2 + 2, btnW, btnH, 5);
    // Button body — warm blue-violet
    btnG.fillStyle(0x3355BB, 0.82);
    btnG.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 5);
    // Button border — glowing edge
    btnG.lineStyle(0.8, 0x88AAFF, 0.55);
    btnG.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 5);

    const af = this.add.text(btnX, btnY, '+ Add Friend', {
      fontFamily: 'Georgia, serif',
      fontSize: '8px',
      color: '#DDEEFF',
      resolution: 2,
    }).setOrigin(0.5).setDepth(this.layers.depth('foreground', 21));
    this.tweens.add({
      targets: [btnG, af],
      alpha: { from: 1.0, to: 0.65 },
      duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Desk surface — grounds the focal prop on the void floor
    // ySort: false + manual depth keeps it behind the computer
    const tableRow = afr + 0.55;
    const tableSprite = this.placeAt(afc, tableRow, 'k-side-table', {
      scale: 0.78, shadow: { width: 28, height: 7, offsetY: 7, alpha: 0.30 },
      ySort: false,
    });
    const cs = this._cfg.cellSize;
    if (tableSprite) { tableSprite.setDepth(230).setTint(0x7788CC); }  // behind computer

    // Direct light on the focal props — placed in front (depth 201) so it
    // actually brightens the table+computer rather than sitting behind them
    this.add.image(afp.x, afp.y + 20, 'light-blob')
      .setScale(2.2, 1.0).setAlpha(0.30).setTint(0x6699FF)
      .setBlendMode('ADD').setDepth(201);

    // Computer at afr (row 4, y=288) — visually above the table surface (row 4.55, y=323).
    // depth 270 > table depth 230: renders in front of table legs/frame.
    const afImg = this.placeInteractable(afc, afr, 'k-computer', {
      id: 'add_friend',
      triggerRadius: 50, glowRadius: 130,
      enabled: false,  // Activated only after player reads the intro dialogue
      skipUnlockSFX: true,  // connection stinger replaces the generic memory-unlock arpeggio
      onTrigger: () => this._onAddFriendReached(),
    }, { scale: 0.82, tint: 0x99AADE, ySort: false });
    if (afImg) {
      afImg.setDepth(270);  // above table (230), below player spawn depth (288) — computer sits on table surface
      this.tweens.add({
        targets: afImg, scale: { from: 0.82, to: 0.86 },
        duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── FOREGROUND OCCLUSION — void masses at scene bottom ──────────────────
    // Depth: low gameplay range so the player (Y-sorted, depth ≈ 288+ at row 4)
    // always renders IN FRONT of these elements.  They frame the bottom edge of
    // the scene without ever hiding the character.
    // Portrait mobile: Ch2's 8-row world (512px) almost entirely fills a 490px
    // portrait viewport at zoom 1.72, so rows 6-7 are always visible and these
    // dark masses look like floating blobs at the screen bottom. Skip them on
    // portrait — the scene is already edge-cropped by the device bezel.
    const _isPortrait = this.scale.height > this.scale.width;
    if (_isPortrait) return;  // nothing below is needed on portrait

    const occDepth = this.layers.depth('gameplay', 5);   // 5 — below any Y-sort value

    // Helper — draws a wide, flat ground-hugging void-mass (ellipse-based).
    // w:h ratio kept ≥ 2.5:1 so shapes read as ground ledges, not boulders.
    // The secondary cap shifts slightly up to suggest an uneven top edge without
    // looking like a stacked pair of UI rectangles.
    const drawMass = (wx, wy, w, h) => {
      const gm = this.add.graphics().setDepth(occDepth);
      const r  = h * 0.52;  // corner radius scales with height, not width
      // soft drop shadow — wide ellipse beneath
      gm.fillStyle(0x000000, 0.30);
      gm.fillEllipse(wx, wy + h * 0.38, w * 1.10, h * 0.22);
      // primary body — wide, low-profile
      gm.fillStyle(0x040110, 1);
      gm.fillRoundedRect(wx - w / 2, wy - h / 2, w, h, r);
      // subtle top-cap shift — makes the top edge look uneven, not flat
      gm.fillStyle(0x060216, 1);
      gm.fillRoundedRect(wx - w * 0.30, wy - h * 0.72, w * 0.55, h * 0.48, r * 0.85);
      // indigo rim — thin, low contrast so it doesn't look like a UI card
      gm.lineStyle(0.8, 0x18104A, 0.50);
      gm.strokeRoundedRect(wx - w / 2, wy - h / 2, w, h, r);
      return gm;
    };

    // ── Left edge — single wide mass, partially cropped by world left ─────────
    // Reduced from two overlapping blobs to one flatter shape; left half crops
    // off-screen naturally so it doesn't dominate the player start area.
    drawMass(this.grid(-0.1, 6.4).x, this.grid(-0.1, 6.4).y, 110, 36);

    // ── Center-left pebble — moved to col 3.8 (off the direct player path) ───
    // Scaled down from 66×48 to 52×24 so it frames the path without blocking it.
    drawMass(this.grid(3.8,  6.5).x, this.grid(3.8,  6.5).y,  52, 24);

    // ── Right-center ledge — wider and shallower than before ──────────────────
    drawMass(this.grid(6.6,  6.6).x, this.grid(6.6,  6.6).y,  72, 26);

    // ── Right cluster — two masses at staggered rows for depth ────────────────
    drawMass(this.grid(9.8,  6.3).x, this.grid(9.8,  6.3).y,  90, 38);
    drawMass(this.grid(11.0, 6.8).x, this.grid(11.0, 6.8).y,  56, 22);

    // ── Foliage silhouettes — wide-canopy trees only, no conifers ─────────────
    // foliage-tree2 and foliage-tree5 have broad rounded crowns that suit the
    // digital void. The mid-screen conifer (foliage-tree4) is removed — its
    // narrow spike clashed with the aesthetic.
    // Origin 0.5/0.88 crops trunk base, showing crown + upper trunk only.
    [
      { key: 'foliage-tree2', c: 1.6,  r: 6.9, sc: 0.22 },
      { key: 'foliage-tree5', c: 9.0,  r: 6.9, sc: 0.20 },
    ].forEach(({ key, c, r, sc }) => {
      if (!this.textures.exists(key)) return;
      this.add.image(this.grid(c, r).x, this.grid(c, r).y, key)
        .setScale(sc).setAlpha(0.62).setTint(0x04011A)
        .setDepth(occDepth + 1).setOrigin(0.5, 0.88);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS
  // ═══════════════════════════════════════════════════════════════════

  _buildEmoteOverlays() {
    // grid(6.7, 3.2) = left side of Aashna label above Add Friend monitor
    const pos = this.grid(6.7, 3.2);
    this._addEmote(pos.x, pos.y, 'emote-exclamation', { scale: 0.22, delay: 1800 });
  }

  buildCharacters() {
    // Player starts left among the wrong cards — must walk right to reach Add Friend
    const start = this.grid(2.5, 4);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male', displayW: 40, displayH: 62 },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.28, dynamic: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FX — ambient particles + intro dialogue
  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    // Portrait: the digital void world (8 rows, 512px) is almost fully visible
    // at zoom 1.72 on a tall phone. Pull the camera up slightly so the action
    // zone (rows 2–5, profile cards + player) fills the centre of the screen.
    // Desktop / iPad / landscape: no offset (leave at default 0).
    const _vH = this.scale.height;
    const _isPortrait = _vH > this.scale.width;
    if (_isPortrait) {
      this.cam.configure({
        baseOffsetY: -Math.round(_vH / (this._cfg.targetZoom ?? this._cfg.zoom) * 0.14),
      });
    }

    const W = this.worldW;
    const H = this.worldH;

    if (this.textures.exists('particle-glow')) {
      // Ambient motes — sparse floating dust; sparser = more premium
      this.add.particles(W / 2, H, 'particle-glow', {
        x: { min: -W / 2, max: W / 2 },
        speedY: { min: -6, max: -2 },
        speedX: { min: -3, max: 3 },
        scale: { start: 0.07, end: 0 },
        alpha: { start: 0.12, end: 0 },
        tint: [0x2244AA, 0x3355BB, 0x224488],
        lifespan: { min: 5000, max: 10000 },
        frequency: 600,
        quantity: 1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 48));
    }

    // Aura emitter at Add Friend — a breathing invisible presence around the target
    const afp = this.grid(8.0, 4);
    const flareKey = this.textures.exists('particle-flare') ? 'particle-flare'
      : this.textures.exists('particle-spark') ? 'particle-spark' : null;
    if (flareKey) {
      this.add.particles(afp.x, afp.y, flareKey, {
        x: { min: -18, max: 18 },
        y: { min: -18, max: 18 },
        speedX: { min: -12, max: 12 },
        speedY: { min: -14, max: -5 },
        scale: { start: 0.045, end: 0 },
        alpha: { start: 0.14, end: 0 },
        tint: [0xBBAAFF, 0xEECCFF, 0x8899DD],
        lifespan: { min: 3000, max: 6000 },
        frequency: 1200,
        quantity: 1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 49));
    }

    // ── SEARCH CURSOR — Prawal typing into the void, still searching ──────────
    // Moved to row 2.0 — visible when camera follows player at row 4 (zoom 1.80
    // → visible band ≈ row 1.9–6.3). At row 0.85 it was fully off-screen.
    const cursorPos = this.grid(2.0, 2.0);
    this.add.text(cursorPos.x, cursorPos.y, 'Aashna', {
      fontFamily: 'Courier New, monospace',
      fontSize: '7px',
      color: '#2A2858',
      resolution: 2,
    }).setOrigin(0, 0.5).setAlpha(0.38).setDepth(15);
    const cursorPipe = this.add.text(cursorPos.x + 36, cursorPos.y, '|', {
      fontFamily: 'Courier New, monospace',
      fontSize: '7px',
      color: '#3C3878',
      resolution: 2,
    }).setOrigin(0, 0.5).setAlpha(0.38).setDepth(15);
    this.tweens.add({
      targets: cursorPipe,
      alpha: { from: 0.38, to: 0.02 },
      duration: 520, yoyo: true, repeat: -1, ease: 'Linear',
    });

    // Intro dialogue — Add Friend becomes interactive only after reading
    this.time.delayedCall(2000, () => {
      const lines = storyData.dialogues?.ch2_intro;
      const unlock = () => this.proximity.setEnabled('add_friend', true);
      if (lines) this.dialogue.start(lines, unlock);
      else unlock();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION CALLBACK
  // ═══════════════════════════════════════════════════════════════════

  _onAddFriendReached() {
    this._triggerDone = true;  // H1: gate onUpdate loop
    this.cam.zoomPulse(1.55, 900);

    // Core glow flares
    if (this._targetGlow) {
      this.tweens.killTweensOf(this._targetGlow);  // H3: stop repeat:-1 pulse before one-shot burst
      this.tweens.add({
        targets: this._targetGlow,
        alpha: 0.60, scale: 4.2,
        duration: 350, yoyo: true, ease: 'Quad.easeOut',
      });
    }

    // Decorative panels + labels + glows fade out
    this._nodes.forEach((n, i) => {
      if (!n?.img) return;
      this.time.delayedCall(i * 60, () => {
        this.tweens.add({ targets: n.img,  alpha: 0.04, duration: 800, ease: 'Sine.easeIn' });
        this.tweens.add({ targets: n.lbl,  alpha: 0.0,  duration: 600, ease: 'Sine.easeIn' });
        this.tweens.add({ targets: n.glow, alpha: 0.0,  duration: 600, ease: 'Sine.easeIn' });
      });
    });

    // 280ms delay: zoom-pulse lands first (camera jolt + glow flash take ~200ms to
    // feel settled), THEN the stinger hits clean on its own — the sonic reward for
    // finding her.  Haptic fires synchronously for immediate tactile feedback.
    audioManager.playHaptic?.(40);
    this.time.delayedCall(280, () => audioManager.playStinger('connection'));
    const lines = storyData.dialogues?.ch2_request;
    if (lines) {
      this.dialogue.start(lines, () => this._chapterComplete());
    } else {
      this._chapterComplete();
    }
  }

  _chapterComplete() {
    this._guardTransition(() => {
      goToChapter(this, 2);
    });
  }

  // ═══════════════════════════════════════════════════════════════════

  onShutdown() {
    audioManager.fadeOutAll(500);  // prevent hard cut when transitioning to Ch3
    // H2: kill per-card drift/scale tweens before scene tears down
    this._nodes?.forEach(n => {
      this.tweens.killTweensOf(n.img);
      this.tweens.killTweensOf(n.glow);
    });
    this._nodes = null;
    this.env?.destroy();
    this.dialogue?.destroy();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROXIMITY EMPHASIS — nodes brighten/scale when player approaches
  // ═══════════════════════════════════════════════════════════════════

  onUpdate(_time, _delta) {
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);

    if (this._triggerDone || !this._player || !this._nodes) return;  // H1: stop after trigger
    const px = this._player.sprite.x;
    const py = this._player.sprite.y;
    const NEAR = 100;  // px — proximity radius
    const FAR  = 180;

    for (const n of this._nodes) {
      const d = Math.hypot(px - n.wx, py - n.wy);
      // t = 1 when at node, 0 when FAR+ away
      const t = Phaser.Math.Clamp(1 - (d - NEAR) / (FAR - NEAR), 0, 1);

      // Brighten image alpha: base → base + 0.35 at closest
      const tgtAlpha = n.baseAlpha + t * 0.35;
      n.img.alpha += (tgtAlpha - n.img.alpha) * 0.08;

      // Scale boost: base → base + 8%
      const tgtScale = n.baseScale * (1 + t * 0.08);
      n.img.scale += (tgtScale - n.img.scale) * 0.06;

      // Label alpha boost
      const tgtLbl = n.baseLblAlpha + t * 0.45;
      n.lbl.alpha += (tgtLbl - n.lbl.alpha) * 0.08;

      // Glow alpha boost
      const tgtGlow = n.baseGlowAlpha + t * 0.18;
      n.glow.alpha += (tgtGlow - n.glow.alpha) * 0.06;

      // Card-approach SFX: a faint, slightly "off" soft-click when the player
      // enters the NEAR radius of a wrong card.  Stored as _prevT to fire only
      // once per approach (leading edge only), not every frame.
      const wasNear = n._prevT > 0.05;
      const isNear  = t > 0.05;
      if (isNear && !wasNear) {
        // Very quiet soft-click: _playTextureEvent routes through textureBus
        // and uses textureBus.gain (0.30) × master (0.35) = -17 dBFS equivalent.
        // This is the right level for a subliminal "wrong choice" whisper.
        audioManager._playTextureEvent?.('soft-click');
      }
      n._prevT = t;
    }
  }
}
