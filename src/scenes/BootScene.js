import { roundRect } from '../utils/helpers.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // ── Modular character parts (Kenney Modular Characters pack) ──────────────
    // Loaded here so they are available during create() for canvas compositing.
    const MC  = 'assets/kenney/modular-characters/PNG';
    const SK  = `${MC}/Skin/Tint 3`;         // warm medium skin tone
    const HR  = `${MC}/Hair`;
    const FC  = `${MC}/Face/Completes`;
    const SH  = `${MC}/Shirts`;
    const PT  = `${MC}/Pants/Navy`;
    const SO  = `${MC}/Shoes/Black`;

    this.load.image('mc-head',       `${SK}/tint3_head.png`);
    this.load.image('mc-neck',       `${SK}/tint3_neck.png`);
    this.load.image('mc-hand',       `${SK}/tint3_hand.png`);
    this.load.image('mc-hair-male',  `${HR}/Brown 2/brown2Man5.png`);
    this.load.image('mc-hair-female',`${HR}/Brown 1/brown1Woman3.png`);
    this.load.image('mc-face',       `${FC}/face2.png`);
    this.load.image('mc-shirt-blue', `${SH}/Blue/blueShirt1.png`);
    this.load.image('mc-arm-blue',   `${SH}/Blue/blueArm_long.png`);
    this.load.image('mc-shirt-red',  `${SH}/Red/redShirt1.png`);
    this.load.image('mc-arm-red',    `${SH}/Red/redArm_long.png`);
    this.load.image('mc-shirt-green',`${SH}/Green/greenShirt1.png`);
    this.load.image('mc-arm-green',  `${SH}/Green/greenArm_long.png`);
    this.load.image('mc-pants-waist',`${PT}/pantsNavy1.png`);
    this.load.image('mc-pants-leg',  `${PT}/pantsNavy_long.png`);
    this.load.image('mc-shoe',       `${SO}/blackShoe1.png`);
    // ── Extra outfit colours for per-chapter visual variety ──────────────────
    this.load.image('mc-shirt-white',     `${SH}/White/whiteShirt1.png`);
    this.load.image('mc-arm-white',       `${SH}/White/armWhite_short.png`);
    this.load.image('mc-shirt-yellow',    `${SH}/Yellow/shirtYellow1.png`);
    this.load.image('mc-arm-yellow',      `${SH}/Yellow/armYellow_short.png`);
    this.load.image('mc-shirt-navy',      `${SH}/Navy/navyShirt1.png`);
    this.load.image('mc-arm-navy',        `${SH}/Navy/navyArm_short.png`);
    this.load.image('mc-pants-tan-waist', `${MC}/Pants/Tan/pantsTan1.png`);
    this.load.image('mc-pants-tan-leg',   `${MC}/Pants/Tan/pantsTan_long.png`);
    this.load.image('mc-shoe-brown',      `${MC}/Shoes/Brown 1/brownShoe1.png`);
  }

  create() {
    this.generateAll();
    this.scene.start('Preload');
  }

  generateAll() {
    this._playerSprites();
    this._npcSprites();
    this._objectSprites();
    this._newObjectSprites();
    this._decorationSprites();
    this._particles();
    this._uiElements();
    this._overlays();
    this._backgroundTextures();
  }

  tex(key, w, h, cb, hiDpi = false) {
    // bg-* and player animation frames are drawn at 2× so Phaser's setDisplaySize
    // downsamples them — text, gradients and fine detail stay crisp on HiDPI displays.
    // hiDpi=true can be passed for any sprite that should also get 2× pixel density.
    const scale = (key.startsWith('bg-') || key.startsWith('player-f') || hiDpi) ? 2 : 1;
    const c = this.textures.createCanvas(key, w * scale, h * scale);
    const ctx = c.context;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (scale > 1) ctx.scale(scale, scale);
    cb(ctx, w, h);
    c.refresh();
    // Store logical (1×) dimensions so callers can use setDisplaySize correctly
    c.logicalW = w;
    c.logicalH = h;
  }

  /* ── Player ────────────────────────────────────── */
  _playerSprites() {
    // One texture per animation frame — most reliable approach
    const dirs = ['down', 'left', 'right', 'up'];
    const fw = 32, fh = 48;

    dirs.forEach((dir, row) => {
      for (let f = 0; f < 4; f++) {
        const bob = (f === 1 || f === 3) ? -1 : 0;
        this.tex(`player-f${row * 4 + f}`, fw, fh, (ctx) => {
          this._drawPerson(ctx, 0, 0, fw, fh, bob, dir);
        });
      }
    });

    // Glow texture for player aura — wide peach-pink-lavender bloom
    this.tex('player-glow', 96, 96, (ctx) => {
      const g = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
      g.addColorStop(0.00, 'rgba(255,232,215,0.60)');  // warm white-peach center
      g.addColorStop(0.18, 'rgba(255,210,225,0.38)');  // rose-pink inner
      g.addColorStop(0.40, 'rgba(240,185,230,0.18)');  // lavender-pink mid
      g.addColorStop(0.65, 'rgba(210,160,225,0.07)');  // faint lavender edge
      g.addColorStop(1.00, 'rgba(180,130,215,0)');     // transparent
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 96, 96);
    });
  }

  _drawPerson(ctx, ox, oy, fw, fh, bob, dir) {
    const cx = ox + fw / 2, cy = oy + fh;

    // Ground shadow — soft ellipse under feet
    ctx.fillStyle = 'rgba(30,10,50,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Legs — clean flat navy ─────────────────────────────────────
    const legOff = (dir === 'left') ? -1 : (dir === 'right') ? 1 : 0;
    ctx.fillStyle = '#2A4072';
    ctx.fillRect(cx - 5 + legOff, cy - 11, 4, 10);
    ctx.fillRect(cx + 1 + legOff, cy - 11, 4, 10);
    // Leg seam (subtle depth)
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(cx - 5 + legOff, cy - 4, 4, 1);
    ctx.fillRect(cx + 1 + legOff, cy - 4, 4, 1);

    // ── Shoes — burnt orange (Kenney-bright) ───────────────────────
    roundRect(ctx, cx - 7 + legOff, cy - 2, 6, 3, 1);
    ctx.fillStyle = '#E8581C'; ctx.fill();
    roundRect(ctx, cx + 1 + legOff, cy - 2, 6, 3, 1);
    ctx.fillStyle = '#E8581C'; ctx.fill();

    // ── Body — vibrant rose/coral (no heavy gradient, Kenney-flat) ─
    // Base fill
    ctx.fillStyle = '#D94065';
    roundRect(ctx, cx - 7, cy - 30 + bob, 14, 19, 3);
    ctx.fill();
    // Left-edge lit highlight
    ctx.fillStyle = 'rgba(255,140,165,0.28)';
    roundRect(ctx, cx - 7, cy - 30 + bob, 4, 19, [3, 0, 0, 3]);
    ctx.fill();
    // Right-edge shadow strip
    ctx.fillStyle = 'rgba(80,0,20,0.18)';
    ctx.fillRect(cx + 4, cy - 30 + bob, 3, 19);
    // Belt seam at waist
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(cx - 7, cy - 12 + bob, 14, 2);
    // Collar highlight
    ctx.fillStyle = 'rgba(255,200,210,0.25)';
    ctx.fillRect(cx - 2.5, cy - 30 + bob, 5, 3.5);

    // ── Head — warm peach, slightly bigger Kenney-proportion ──────
    // Face base
    ctx.fillStyle = '#FBBA88';
    ctx.beginPath();
    ctx.arc(cx, cy - 38 + bob, 8.5, 0, Math.PI * 2);
    ctx.fill();
    // Lit rim (top-left bounce)
    ctx.fillStyle = 'rgba(255,240,220,0.22)';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 41 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
    // Right-side cheek shadow
    ctx.fillStyle = 'rgba(180,80,30,0.10)';
    ctx.beginPath();
    ctx.arc(cx + 4, cy - 37 + bob, 7, 0, Math.PI * 2);
    ctx.fill();

    // ── Hair — deep warm brown ─────────────────────────────────────
    ctx.fillStyle = '#1C0E04';
    if (dir === 'up') {
      ctx.beginPath();
      ctx.arc(cx, cy - 44.5 + bob, 8.5, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 8.5, cy - 45.5 + bob, 17, 5.5);
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy - 43.5 + bob, 8.5, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 8.5, cy - 44.5 + bob, 17, 5.5);
      // Temples
      ctx.fillRect(cx - 9, cy - 40 + bob, 2.5, 4);
      ctx.fillRect(cx + 6.5, cy - 40 + bob, 2.5, 4);
    }

    // ── Eyes (facing camera) ──────────────────────────────────────
    if (dir !== 'up') {
      const eOff = dir === 'left' ? -2 : dir === 'right' ? 2 : 0;
      // Eye white
      ctx.fillStyle = '#FBEADE';
      ctx.beginPath(); ctx.arc(cx - 2.8 + eOff, cy - 38.5 + bob, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 2.8 + eOff, cy - 38.5 + bob, 2.2, 0, Math.PI * 2); ctx.fill();
      // Iris / pupil — dark
      ctx.fillStyle = '#1A0A00';
      ctx.beginPath(); ctx.arc(cx - 2.5 + eOff, cy - 38.5 + bob, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3.0 + eOff, cy - 38.5 + bob, 1.4, 0, Math.PI * 2); ctx.fill();
      // Catch-light — bright dot for life
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.arc(cx - 2.0 + eOff, cy - 39.0 + bob, 0.65, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3.5 + eOff, cy - 39.0 + bob, 0.65, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ── NPCs — modular character compositing ──────────── */

  /**
   * Composite a character sprite from Kenney modular-character PNG parts.
   * Canvas: 120×180 logical px. At scale ~0.20 from original part sizes.
   * Drawing order (back → front):
   *   female: hair_bg → shoes → pants_legs → pants_waist → shirt → arms → hands
   *           → neck → head → face
   *   male:   shoes → pants_legs → pants_waist → shirt → arms → hands
   *           → neck → head → face → hair_cap
   */
  _npcSprites() {
    const W = 120, H = 180;
    // ── Prawal (male player) — outfit evolves across chapters ────────────────
    this.tex('char-male',        W, H, (ctx) => this._compositeNPC(ctx, true));
    this.tex('char-male-casual', W, H, (ctx) => this._compositeNPC(ctx, true,  { shirt: 'yellow', pants: 'tan' }));
    this.tex('char-male-smart',  W, H, (ctx) => this._compositeNPC(ctx, true,  { shirt: 'navy',   shoe: 'brown' }));
    this.tex('char-male-formal', W, H, (ctx) => this._compositeNPC(ctx, true,  { shirt: 'white',  shoe: 'brown' }));
    // ── Aashna (female NPC) — outfit evolves across chapters ─────────────────
    this.tex('char-female',        W, H, (ctx) => this._compositeNPC(ctx, false));
    this.tex('char-female-green',  W, H, (ctx) => this._compositeNPC(ctx, false, { shirt: 'green' }));
    this.tex('char-female-yellow', W, H, (ctx) => this._compositeNPC(ctx, false, { shirt: 'yellow', pants: 'tan' }));
    this.tex('char-female-navy',   W, H, (ctx) => this._compositeNPC(ctx, false, { shirt: 'navy',   shoe: 'brown' }));
    this.tex('char-female-formal', W, H, (ctx) => this._compositeNPC(ctx, false, { shirt: 'white',  shoe: 'brown' }));
  }

  _compositeNPC(ctx, isMale, opts = {}) {
    // ── Helper — draw a part scaled from its natural size ──────────
    const draw = (key, dx, dy, dw, dh) => {
      const img = this.textures.get(key)?.getSourceImage();
      if (!img) return;
      ctx.drawImage(img, 0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height, dx, dy, dw, dh);
    };

    // ── Helper — draw a part MIRRORED horizontally about a pivot x ─
    const drawMirror = (key, pivotX, dy, dw, dh) => {
      const img = this.textures.get(key)?.getSourceImage();
      if (!img) return;
      ctx.save();
      ctx.translate(pivotX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height, 0, dy, dw, dh);
      ctx.restore();
    };

    // cx = 60 (canvas center)
    // All values below are pixel coordinates on the 120×180 canvas.

    const o          = (typeof opts === 'string') ? { shirt: opts } : opts;
    const shirt      = o.shirt ?? (isMale ? 'blue' : 'red');
    const pantsStyle = o.pants ?? 'navy';
    const shoeStyle  = o.shoe  ?? 'black';
    const shirtKey      = `mc-shirt-${shirt}`;
    const armKey        = `mc-arm-${shirt}`;
    const pantsWaistKey = pantsStyle === 'tan' ? 'mc-pants-tan-waist' : 'mc-pants-waist';
    const pantsLegKey   = pantsStyle === 'tan' ? 'mc-pants-tan-leg'   : 'mc-pants-leg';
    const shoeKey       = shoeStyle  === 'brown' ? 'mc-shoe-brown' : 'mc-shoe';

    // ── 1. Female long hair — behind head, drawn FIRST ─────────────
    // All y-coords shifted +34px so shoe-soles land at 85% canvas height
    // (= sprite origin), eliminating the floating-in-air appearance.
    if (!isMale) draw('mc-hair-female', 44, 36, 32, 57);

    // ── 2. Ground shadow — just below shoe soles ────────────────────
    ctx.fillStyle = 'rgba(20,5,40,0.22)';
    ctx.beginPath(); ctx.ellipse(60, 158, 22, 5, 0, 0, Math.PI * 2); ctx.fill();

    // ── 3. Shoes ────────────────────────────────────────────────────
    // Symmetric around canvas center x=60.
    // Left shoe (mirrored): right edge at x=63 → spans x=44–63, center=53.5
    // Right shoe (normal):  left edge at x=57 → spans x=57–76, center=66.5
    drawMirror(shoeKey, 63, 145, 19, 8);  // left shoe → points left
    draw(shoeKey,       57, 145, 19,  8); // right shoe → points right

    // ── 4. Pants legs (two draws, right leg mirrored) ───────────────
    // 26px wide, 10px centre overlap — natural front-facing trouser stance.
    // Left: x=39–65, Right: x=55–81, overlap x=55–65 = crotch seam.
    draw(pantsLegKey,       39, 114, 26, 33); // left leg
    drawMirror(pantsLegKey, 81, 114, 26, 33); // right leg

    // ── 5. Pants waistband — centred at x=60, matches leg span ─────
    draw(pantsWaistKey, 43, 109, 34, 9);

    // ── 6. Shirt body ───────────────────────────────────────────────
    draw(shirtKey, 45, 78, 31, 35);

    // ── 7. Arms — rotated ~28° downward for a natural resting pose ──
    // Previously drawn purely horizontal producing a T-pose / zombie look.
    // Pivoting each arm ~28° (0.49 rad) from horizontal at the shoulder
    // attachment point so they hang naturally at the character's sides.
    //
    // Right shoulder pivot: (76, 84) — right edge of shirt, mid-torso height.
    // Left shoulder pivot:  (44, 84) — left edge of shirt.
    //   Clockwise rotation in the mirrored coordinate system of the left arm
    //   produces a down-left direction in canvas space (the correct result).
    const _armImg = this.textures.get(armKey)?.getSourceImage();
    if (_armImg) {
      const _aw = _armImg.naturalWidth  || _armImg.width;
      const _ah = _armImg.naturalHeight || _armImg.height;
      // Right arm
      ctx.save();
      ctx.translate(76, 84);
      ctx.rotate(0.49);                                       // 28° clockwise
      ctx.drawImage(_armImg, 0, 0, _aw, _ah, -4, -3, 34, 28);
      ctx.restore();
      // Left arm — pivot in mirrored space; same rotation angle, same downward result
      ctx.save();
      ctx.translate(44, 84);
      ctx.scale(-1, 1);
      ctx.rotate(0.49);
      ctx.drawImage(_armImg, 0, 0, _aw, _ah, -4, -3, 34, 28);
      ctx.restore();
    }

    // ── 8. Hands — follow the rotated arm wrist positions ───────────
    // At 28° tilt the wrist shifts ~20px horizontally and ~26px vertically
    // from each shoulder pivot.
    // Right: pivot(76,84) + (20, 26) → wrist ≈ (96,110) → hand at (90, 106)
    // Left:  pivot(44,84) − (20,−26) → wrist ≈ (24,110) → hand at (12, 106)
    draw('mc-hand', 12, 106, 12, 14); // left wrist
    draw('mc-hand', 90, 106, 12, 14); // right wrist

    // ── 9. Neck ─────────────────────────────────────────────────────
    draw('mc-neck', 51, 72, 19, 7);

    // ── 10. Head ────────────────────────────────────────────────────
    draw('mc-head', 43, 42, 35, 34);

    // ── 11. Face ────────────────────────────────────────────────────
    draw('mc-face', 50, 50, 20, 20);

    // ── 12. Male hair cap — drawn OVER head ────────────────────────
    if (isMale) draw('mc-hair-male', 43, 38, 34, 26);
  }

  /* ── Objects ───────────────────────────────────── */
  _objectSprites() {
    this._bench(); this._tree(); this._letter(); this._coffee();
    this._bookshelf(); this._jukebox(); this._window();
    this._flowers(); this._telescope(); this._candle();
    this._ring(); this._album();
  }

  _bench() {
    this.tex('obj-bench', 64, 40, (ctx) => {
      // Shadow
      ctx.fillStyle = 'rgba(30,15,50,0.20)';
      ctx.beginPath(); ctx.ellipse(32, 37, 28, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      // Seat planks — warm oak with left-lit gradient
      const plankG = ctx.createLinearGradient(8, 16, 56, 30);
      plankG.addColorStop(0, '#D8A870');   // bright warm oak (lit)
      plankG.addColorStop(0.4, '#C09050'); // mid honey
      plankG.addColorStop(1, '#906830');   // deep shadow
      ctx.fillStyle = plankG;
      ctx.fillRect(8, 17, 48, 5);
      ctx.fillRect(8, 24, 48, 5);
      // Plank edge shadow
      ctx.fillStyle = 'rgba(60,30,10,0.20)';
      ctx.fillRect(8, 22, 48, 2);
      ctx.fillRect(8, 29, 48, 2);
      // Legs — darker warm brown
      const legG = ctx.createLinearGradient(12, 12, 15, 36);
      legG.addColorStop(0, '#805030'); legG.addColorStop(1, '#4A2A12');
      ctx.fillStyle = legG;
      ctx.fillRect(12, 12, 3, 22); ctx.fillRect(49, 12, 3, 22);
      // Back rail
      const railG = ctx.createLinearGradient(10, 10, 54, 13);
      railG.addColorStop(0, '#B88050'); railG.addColorStop(1, '#8A5A30');
      ctx.fillStyle = railG;
      ctx.fillRect(10, 10, 44, 4);
      // Seat highlight (top edge lit)
      ctx.fillStyle = 'rgba(255,230,195,0.22)';
      ctx.fillRect(9, 17, 47, 2);
    });
  }

  _tree() {
    // Monument Valley–style lollipop tree: single perfect circle canopy
    this.tex('obj-tree', 96, 128, (ctx) => {
      const cx = 48, base = 126;

      // Ground shadow
      const sg = ctx.createRadialGradient(cx, base, 2, cx, base, 28);
      sg.addColorStop(0, 'rgba(30,15,50,0.40)');
      sg.addColorStop(1, 'rgba(30,15,50,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.ellipse(cx, base, 28, 7, 0, 0, Math.PI * 2); ctx.fill();

      // Trunk — elegant tapered column, left-lit warm brown
      const tg = ctx.createLinearGradient(cx - 5, 78, cx + 7, 126);
      tg.addColorStop(0, '#B08A60');   // warm tan (lit left side)
      tg.addColorStop(0.4, '#8A6840'); // mid warm brown
      tg.addColorStop(1,   '#4A3018'); // deep shadow at base
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(cx - 5, 80); ctx.lineTo(cx - 6, 126);
      ctx.lineTo(cx + 6, 126); ctx.lineTo(cx + 5, 80);
      ctx.closePath(); ctx.fill();
      // Trunk left-face highlight
      ctx.fillStyle = 'rgba(200,160,110,0.28)';
      ctx.fillRect(cx - 4, 83, 3, 40);

      // ── Canopy: single geometric circle ──────────────────
      const r = 42, canopyY = 52;

      // Drop shadow (offset down-right for depth)
      ctx.fillStyle = 'rgba(15,35,20,0.22)';
      ctx.beginPath(); ctx.arc(cx + 5, canopyY + 6, r + 1, 0, Math.PI * 2); ctx.fill();

      // Main canopy: rich teal-jade radial (lit from top-left)
      const cg = ctx.createRadialGradient(cx - 16, canopyY - 18, 3, cx, canopyY, r);
      cg.addColorStop(0.00, '#8CD0AC');  // bright mint-teal (lit top-left)
      cg.addColorStop(0.22, '#52B085');  // medium teal
      cg.addColorStop(0.50, '#2A8858');  // deep jade
      cg.addColorStop(0.75, '#186840');  // forest green darkness
      cg.addColorStop(1.00, '#0C4828');  // deep shadow bottom-right
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx, canopyY, r, 0, Math.PI * 2); ctx.fill();

      // Warm peach-coral cinematic light (top-left bounce from warm sky)
      const warmLight = ctx.createRadialGradient(cx - 20, canopyY - 20, 0, cx - 14, canopyY - 12, 30);
      warmLight.addColorStop(0.0, 'rgba(255,210,165,0.26)');
      warmLight.addColorStop(0.5, 'rgba(255,185,140,0.12)');
      warmLight.addColorStop(1.0, 'rgba(255,160,120,0)');
      ctx.fillStyle = warmLight;
      ctx.beginPath(); ctx.arc(cx, canopyY, r, 0, Math.PI * 2); ctx.fill();

      // Crisp specular highlight (Monument Valley polish — top-left bright spot)
      const spec = ctx.createRadialGradient(cx - 16, canopyY - 19, 0, cx - 12, canopyY - 14, 17);
      spec.addColorStop(0.0, 'rgba(255,255,245,0.38)');
      spec.addColorStop(0.5, 'rgba(255,248,235,0.14)');
      spec.addColorStop(1.0, 'rgba(255,240,220,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, canopyY, r, 0, Math.PI * 2); ctx.fill();
    });
  }

  _letter() {
    // Premium ivory envelope with deep rose wax seal
    this.tex('obj-letter', 32, 28, (ctx) => {
      // Shadow
      ctx.fillStyle = 'rgba(30,10,50,0.18)';
      ctx.beginPath(); ctx.ellipse(16, 26, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
      // Envelope body — warm ivory
      const g = ctx.createLinearGradient(4, 4, 28, 24);
      g.addColorStop(0, '#FFF8EE');  // warm white-ivory
      g.addColorStop(0.5, '#F5EDDA');
      g.addColorStop(1, '#EAD9C0');  // warm parchment shadow
      ctx.fillStyle = g;
      roundRect(ctx, 4, 6, 24, 18, 2); ctx.fill();
      // Envelope flap (V-fold at top)
      ctx.fillStyle = 'rgba(215,195,165,0.7)';
      ctx.beginPath();
      ctx.moveTo(4, 6); ctx.lineTo(28, 6); ctx.lineTo(16, 15); ctx.closePath(); ctx.fill();
      // Fold crease lines
      ctx.strokeStyle = 'rgba(200,175,140,0.5)'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(16, 15); ctx.lineTo(28, 6); ctx.stroke();
      // Wax seal — deep rose with emboss
      ctx.fillStyle = '#A01E38';
      ctx.beginPath(); ctx.arc(22, 19, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#CC2848';
      ctx.beginPath(); ctx.arc(21.5, 18.5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,200,0.3)';
      ctx.beginPath(); ctx.arc(21, 18, 1.5, 0, Math.PI * 2); ctx.fill();
    });
  }

  _coffee() {
    this.tex('obj-coffee', 48, 40, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(24, 37, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Table top
      const tg = ctx.createLinearGradient(0, 18, 0, 26);
      tg.addColorStop(0, '#C8A882'); tg.addColorStop(1, '#A08060');
      ctx.fillStyle = tg;
      roundRect(ctx, 2, 18, 44, 8, 3); ctx.fill();
      ctx.fillStyle = '#7A6040'; ctx.fillRect(10, 26, 4, 12); ctx.fillRect(34, 26, 4, 12);
      // Cup
      const cg = ctx.createLinearGradient(16, 8, 16, 18);
      cg.addColorStop(0, '#FFFFFF'); cg.addColorStop(1, '#E8E0D8');
      ctx.fillStyle = cg;
      roundRect(ctx, 14, 8, 12, 11, 2); ctx.fill();
      // Coffee
      ctx.fillStyle = '#6B3A1F';
      ctx.fillRect(16, 10, 8, 6);
      // Steam
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(18, 8); ctx.quadraticCurveTo(16, 3, 18, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(22, 7); ctx.quadraticCurveTo(24, 2, 22, -1); ctx.stroke();
      // Heart on cup
      ctx.fillStyle = '#E86080';
      ctx.beginPath(); ctx.arc(19, 13, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(21.5, 13, 1.5, 0, Math.PI * 2); ctx.fill();
    });
  }

  _bookshelf() {
    this.tex('obj-bookshelf', 56, 64, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(28, 61, 26, 4, 0, 0, Math.PI * 2); ctx.fill();
      const wg = ctx.createLinearGradient(4, 0, 52, 0);
      wg.addColorStop(0, '#7A5C3A'); wg.addColorStop(1, '#6B4E30');
      ctx.fillStyle = wg;
      ctx.fillRect(4, 2, 48, 60); // Back
      ctx.fillStyle = '#8B6B4A';
      [2, 20, 38, 56].forEach(y => ctx.fillRect(4, y, 48, 3));
      ctx.fillStyle = '#5C3E25'; ctx.fillRect(4, 2, 3, 60); ctx.fillRect(49, 2, 3, 60);
      // Books
      const books = [
        { x: 9, y: 5, w: 5, h: 14, c: '#E06088' },
        { x: 15, y: 7, w: 4, h: 12, c: '#6090D0' },
        { x: 20, y: 4, w: 5, h: 15, c: '#50B060' },
        { x: 26, y: 6, w: 4, h: 13, c: '#D0A040' },
        { x: 31, y: 5, w: 6, h: 14, c: '#9060B0' },
        { x: 38, y: 7, w: 4, h: 12, c: '#E08050' },
        { x: 43, y: 4, w: 5, h: 15, c: '#60C0C0' },
        { x: 10, y: 23, w: 5, h: 14, c: '#C05070' },
        { x: 16, y: 25, w: 6, h: 12, c: '#5080C0' },
        { x: 23, y: 23, w: 4, h: 14, c: '#80C060' },
        { x: 28, y: 24, w: 5, h: 13, c: '#D0D060' },
        { x: 35, y: 23, w: 5, h: 14, c: '#A07040' },
        { x: 41, y: 25, w: 4, h: 12, c: '#7070C0' },
        { x: 9, y: 41, w: 6, h: 14, c: '#D07080' },
        { x: 16, y: 43, w: 5, h: 12, c: '#70A0E0' },
        { x: 22, y: 41, w: 4, h: 14, c: '#60D080' },
        { x: 28, y: 42, w: 6, h: 13, c: '#E0C050' },
        { x: 35, y: 41, w: 4, h: 14, c: '#B060A0' },
        { x: 40, y: 43, w: 5, h: 12, c: '#60B0B0' },
      ];
      books.forEach(b => {
        ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(b.x, b.y, b.w, 2);
      });
    });
  }

  _jukebox() {
    this.tex('obj-jukebox', 44, 56, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(22, 53, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
      const bg = ctx.createLinearGradient(6, 4, 38, 52);
      bg.addColorStop(0, '#C8A070'); bg.addColorStop(1, '#8B6540');
      ctx.fillStyle = bg;
      roundRect(ctx, 6, 4, 32, 48, 5); ctx.fill();
      // Top
      const tg = ctx.createRadialGradient(22, 14, 2, 22, 14, 12);
      tg.addColorStop(0, '#FFE080'); tg.addColorStop(1, '#E0A030');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.arc(22, 14, 12, Math.PI, 0); ctx.fill();
      // Screen
      ctx.fillStyle = '#2A4060'; roundRect(ctx, 10, 18, 24, 14, 3); ctx.fill();
      ctx.fillStyle = '#40608A'; ctx.fillRect(12, 20, 20, 2); ctx.fillRect(12, 24, 16, 2); ctx.fillRect(12, 28, 18, 2);
      // Buttons
      ['#E06060', '#60C060', '#6080D0'].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(14 + i * 8, 38, 3, 0, Math.PI * 2); ctx.fill();
      });
      // Music notes
      ctx.fillStyle = 'rgba(255,220,100,0.7)';
      ctx.font = '10px serif'; ctx.fillText('♪', 34, 10); ctx.fillText('♫', 4, 14);
    });
  }

  _window() {
    this.tex('obj-window', 48, 56, (ctx) => {
      // Frame
      const fg = ctx.createLinearGradient(4, 4, 44, 52);
      fg.addColorStop(0, '#A0856A'); fg.addColorStop(1, '#7A6550');
      ctx.fillStyle = fg;
      roundRect(ctx, 4, 4, 40, 48, 3); ctx.fill();
      // Glass
      const gg = ctx.createLinearGradient(8, 8, 40, 48);
      gg.addColorStop(0, '#8AACCF'); gg.addColorStop(0.5, '#6B90B5'); gg.addColorStop(1, '#4A6A8A');
      ctx.fillStyle = gg;
      ctx.fillRect(8, 8, 15, 20); ctx.fillRect(25, 8, 15, 20);
      ctx.fillRect(8, 30, 15, 18); ctx.fillRect(25, 30, 15, 18);
      // Rain drops
      ctx.fillStyle = 'rgba(200,220,240,0.5)';
      [[12, 12], [18, 20], [30, 14], [35, 25], [14, 35], [28, 40], [36, 38]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.ellipse(x, y, 1, 3, 0, 0, Math.PI * 2); ctx.fill();
      });
      // Frame cross
      ctx.fillStyle = '#7A6550';
      ctx.fillRect(22, 8, 3, 40); ctx.fillRect(8, 27, 32, 3);
      // Sill
      ctx.fillStyle = '#8B7055';
      roundRect(ctx, 2, 50, 44, 4, 2); ctx.fill();
    });
  }

  _flowers() {
    this.tex('obj-flowers', 40, 44, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(20, 41, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
      // Vase
      const vg = ctx.createLinearGradient(12, 20, 28, 42);
      vg.addColorStop(0, '#8890A8'); vg.addColorStop(1, '#606880');
      ctx.fillStyle = vg;
      ctx.beginPath(); ctx.moveTo(14, 22); ctx.lineTo(12, 40); ctx.lineTo(28, 40);
      ctx.lineTo(26, 22); ctx.closePath(); ctx.fill();
      // Stems
      ctx.strokeStyle = '#5A8040'; ctx.lineWidth = 1.5;
      [[20, 22, 15, 4], [20, 22, 25, 6], [20, 22, 20, 2]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, y1 - 5, x2, y2); ctx.stroke();
      });
      // Petals (slightly wilted colors)
      [[15, 5, '#C88090'], [25, 7, '#B08088'], [20, 3, '#D09098']].forEach(([x, y, c]) => {
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 / 5) * i + (x * 0.3);
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 3, 2, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#E0C060';
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      });
    });
  }

  _telescope() {
    this.tex('obj-telescope', 48, 60, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(24, 57, 16, 3, 0, 0, Math.PI * 2); ctx.fill();
      // Tripod
      ctx.strokeStyle = '#707070'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(24, 35); ctx.lineTo(10, 56); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(24, 35); ctx.lineTo(38, 56); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(24, 35); ctx.lineTo(24, 56); ctx.stroke();
      // Tube
      const tg = ctx.createLinearGradient(10, 10, 38, 35);
      tg.addColorStop(0, '#A0A8B8'); tg.addColorStop(1, '#686E7A');
      ctx.fillStyle = tg;
      ctx.save(); ctx.translate(24, 35); ctx.rotate(-0.5);
      roundRect(ctx, -4, -30, 8, 30, 2); ctx.fill();
      // Lens
      ctx.fillStyle = '#8AB8E0';
      ctx.beginPath(); ctx.ellipse(0, -30, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.ellipse(-1, -31, 2, 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Star sparkle
      ctx.fillStyle = '#FFE87C';
      ctx.font = '10px serif'; ctx.fillText('✦', 36, 10);
    });
  }

  _candle() {
    this.tex('obj-candle', 48, 48, (ctx) => {
      // Drop shadow
      ctx.fillStyle = 'rgba(30,10,50,0.18)';
      ctx.beginPath(); ctx.ellipse(24, 45, 18, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      // Warm ambient glow behind flames — romantic orange-gold halo
      const wg = ctx.createRadialGradient(24, 22, 1, 24, 26, 26);
      wg.addColorStop(0.0, 'rgba(255,215,100,0.28)');
      wg.addColorStop(0.4, 'rgba(255,175,60,0.14)');
      wg.addColorStop(1.0, 'rgba(255,140,20,0)');
      ctx.fillStyle = wg; ctx.fillRect(0, 0, 48, 48);
      // Three candles of different heights
      [12, 24, 36].forEach((x, i) => {
        const h = 18 + i * 4;
        // Candle body
        const cg = ctx.createLinearGradient(x - 4, 44 - h, x + 4, 44);
        cg.addColorStop(0, '#FFFAEE');  // bright lit top
        cg.addColorStop(0.3, '#F5EDCD');
        cg.addColorStop(1, '#D8C99A');  // warm shadow base
        ctx.fillStyle = cg;
        roundRect(ctx, x - 4, 44 - h, 8, h, 2); ctx.fill();
        // Side shadow on candle body
        ctx.fillStyle = 'rgba(100,60,0,0.12)';
        ctx.fillRect(x + 1, 44 - h + 2, 3, h - 4);
        // Wick
        ctx.strokeStyle = '#3A2808'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, 44 - h); ctx.lineTo(x - 0.5, 44 - h - 3); ctx.stroke();
        // Flame — teardrop shape
        const fy = 44 - h - 7;
        const flame = ctx.createRadialGradient(x, fy, 0, x, fy + 3, 7);
        flame.addColorStop(0.0, 'rgba(255,255,255,1)');
        flame.addColorStop(0.15, 'rgba(255,250,180,0.95)');
        flame.addColorStop(0.4, 'rgba(255,200,50,0.75)');
        flame.addColorStop(0.7, 'rgba(255,130,20,0.45)');
        flame.addColorStop(1.0, 'rgba(255,80,0,0)');
        ctx.fillStyle = flame;
        ctx.beginPath(); ctx.ellipse(x, fy, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
      });
    });
  }

  _ring() {
    this.tex('obj-ring', 32, 32, (ctx) => {
      // Soft glow
      const glow = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
      glow.addColorStop(0, 'rgba(255,230,140,0.3)'); glow.addColorStop(1, 'rgba(255,230,140,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 32, 32);
      // Box
      const bg = ctx.createLinearGradient(6, 10, 26, 28);
      bg.addColorStop(0, '#4A2060'); bg.addColorStop(1, '#2A1040');
      ctx.fillStyle = bg;
      roundRect(ctx, 6, 12, 20, 16, 3); ctx.fill();
      // Lid
      ctx.fillStyle = '#5A2878';
      roundRect(ctx, 5, 10, 22, 6, 2); ctx.fill();
      // Cushion
      ctx.fillStyle = '#F0E8F5';
      ctx.beginPath(); ctx.ellipse(16, 22, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      // Ring
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(16, 20, 5, 4, 0, 0, Math.PI * 2); ctx.stroke();
      // Diamond
      ctx.fillStyle = '#B0E8FF';
      ctx.beginPath(); ctx.moveTo(16, 14); ctx.lineTo(19, 17); ctx.lineTo(16, 18);
      ctx.lineTo(13, 17); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.moveTo(16, 14); ctx.lineTo(17, 16); ctx.lineTo(16, 17); ctx.lineTo(14, 16); ctx.closePath(); ctx.fill();
    });
  }

  _album() {
    this.tex('obj-album', 44, 40, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(22, 37, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Back cover
      ctx.fillStyle = '#8A4060';
      roundRect(ctx, 6, 6, 32, 30, 3); ctx.fill();
      // Pages
      ctx.fillStyle = '#FFF8F0'; ctx.fillRect(8, 8, 28, 26);
      // Front cover
      const cg = ctx.createLinearGradient(4, 4, 36, 34);
      cg.addColorStop(0, '#C06080'); cg.addColorStop(1, '#9A4060');
      ctx.fillStyle = cg;
      roundRect(ctx, 4, 4, 32, 30, 3); ctx.fill();
      // Heart on cover
      ctx.fillStyle = '#FFD0D8';
      ctx.font = '14px serif'; ctx.fillText('❤', 13, 24);
      // Spine
      ctx.fillStyle = '#7A3050'; ctx.fillRect(4, 4, 3, 30);
      // Photo corners
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px sans-serif'; ctx.fillText('📷', 26, 14);
    });
  }

  /* ── Decorations ───────────────────────────────── */
  _decorationSprites() {
    // ── Bush — Monument Valley jade-teal, left-lit ──
    this.tex('deco-bush', 36, 24, (ctx) => {
      const centers = [
        { x: 10, r: 11, c1: '#5BA880', c2: '#2E7A55' },  // left sphere
        { x: 20, r: 9,  c1: '#4C9E72', c2: '#256845' },  // centre
        { x: 28, r: 8,  c1: '#438E65', c2: '#1E5A38' },  // right (darker)
      ];
      // Drop shadow first
      ctx.fillStyle = 'rgba(20,40,20,0.20)';
      ctx.beginPath(); ctx.ellipse(18, 22, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

      centers.forEach(({ x, r, c1, c2 }) => {
        const g = ctx.createRadialGradient(x - r * 0.3, 12 - r * 0.3, 1, x, 12, r);
        g.addColorStop(0, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, 14, r, 0, Math.PI * 2); ctx.fill();
      });
      // Top-left specular
      ctx.fillStyle = 'rgba(200,240,210,0.18)';
      ctx.beginPath(); ctx.arc(8, 8, 5, 0, Math.PI * 2); ctx.fill();
    });

    // ── Flower — coral petals, golden center, clean ──
    this.tex('deco-flower', 16, 16, (ctx) => {
      // Stem
      ctx.strokeStyle = '#4A9058'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(8, 15); ctx.stroke();
      // 5 petals: coral-pink with warm center
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const px = 8 + Math.cos(a) * 3.5, py = 7 + Math.sin(a) * 3.5;
        const pg = ctx.createRadialGradient(px, py, 0, px, py, 3);
        pg.addColorStop(0, 'rgba(255,175,160,1)');  // warm coral
        pg.addColorStop(1, 'rgba(240,120,140,0.6)');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.ellipse(px, py, 3, 2, a, 0, Math.PI * 2); ctx.fill();
      }
      // Golden center
      const cg = ctx.createRadialGradient(8, 7, 0, 8, 7, 3);
      cg.addColorStop(0, '#FFE860'); cg.addColorStop(0.6, '#F0C030'); cg.addColorStop(1, '#D8A010');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(8, 7, 2.5, 0, Math.PI * 2); ctx.fill();
    });

    // ── Stone — warm grey with subtle shading ──
    this.tex('deco-stone', 14, 10, (ctx) => {
      const g = ctx.createLinearGradient(1, 1, 12, 8);
      g.addColorStop(0, '#B5B0A8');  // lit top-left
      g.addColorStop(0.5, '#908A82');
      g.addColorStop(1, '#686460');  // shadow bottom-right
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(7, 6, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,245,235,0.18)';
      ctx.beginPath(); ctx.ellipse(5, 4, 3, 1.8, -0.3, 0, Math.PI * 2); ctx.fill();
    });

    // ── Mushroom — warm red cap, cream stem ──
    this.tex('deco-mushroom', 12, 14, (ctx) => {
      // Stem
      const sg = ctx.createLinearGradient(4, 7, 8, 13);
      sg.addColorStop(0, '#E8D8B8'); sg.addColorStop(1, '#C8B898');
      ctx.fillStyle = sg;
      ctx.fillRect(4.5, 7, 3, 6);
      // Cap
      const mg = ctx.createRadialGradient(4, 5, 1, 6, 5, 6.5);
      mg.addColorStop(0, '#F07080');  // warm coral-red lit
      mg.addColorStop(0.6, '#D85060');
      mg.addColorStop(1, '#B03848');  // deep shadow
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.ellipse(6, 5, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      // Spots
      ctx.fillStyle = 'rgba(255,255,255,0.60)';
      ctx.beginPath(); ctx.arc(4, 4, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(7.5, 3.5, 0.9, 0, Math.PI * 2); ctx.fill();
    });

    // ── Tall grass — sage-green organic blades ──
    this.tex('deco-tallgrass', 20, 22, (ctx) => {
      const blades = [
        { x: -4, color: 'rgba(88,145,72,0.75)', curve: 0.28 },
        { x:  0, color: 'rgba(100,160,80,0.85)', curve: -0.10 },
        { x:  4, color: 'rgba(80,138,65,0.70)', curve: -0.32 },
        { x: -2, color: 'rgba(105,155,85,0.65)', curve: 0.18 },
        { x:  3, color: 'rgba(78,130,60,0.60)', curve: -0.24 },
      ];
      blades.forEach(({ x, color, curve }) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(10 + x, 21);
        ctx.quadraticCurveTo(10 + x + curve * 14, 11, 10 + x + curve * 7, 2);
        ctx.stroke();
      });
    });
  }

  /* ── Particles ─────────────────────────────────── */
  _particles() {
    // ── Petal — lush coral-pink ellipse with sheen highlight ──
    this.tex('particle-petal', 20, 20, (ctx) => {
      const g = ctx.createRadialGradient(9, 7, 0, 10, 10, 10);
      g.addColorStop(0.00, 'rgba(255,210,218,1.0)');  // pale center
      g.addColorStop(0.35, 'rgba(248,145,170,0.85)'); // coral-pink mid
      g.addColorStop(0.70, 'rgba(230,100,140,0.45)'); // deep rose
      g.addColorStop(1.00, 'rgba(210,70,115,0)');     // transparent edge
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(10, 10, 10, 6, Math.PI / 5, 0, Math.PI * 2);
      ctx.fill();
      // Sheen highlight
      ctx.fillStyle = 'rgba(255,245,248,0.45)';
      ctx.beginPath();
      ctx.ellipse(8, 7, 4, 2.5, Math.PI / 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Sparkle — 4-point cross star with warm glow ──
    this.tex('particle-sparkle', 16, 16, (ctx) => {
      const cx = 8, cy = 8;
      // Soft outer glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
      g.addColorStop(0.0, 'rgba(255,250,210,1)');
      g.addColorStop(0.3, 'rgba(255,230,160,0.55)');
      g.addColorStop(1.0, 'rgba(255,190,80,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16);
      // 4-point star cross
      ctx.fillStyle = 'rgba(255,255,240,0.92)';
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx + 1.8, cy - 1.8);
      ctx.lineTo(16, cy); ctx.lineTo(cx + 1.8, cy + 1.8);
      ctx.lineTo(cx, 16); ctx.lineTo(cx - 1.8, cy + 1.8);
      ctx.lineTo(0, cy); ctx.lineTo(cx - 1.8, cy - 1.8);
      ctx.closePath(); ctx.fill();
    });

    // ── Rain — clean blue-silver translucent streak ──
    this.tex('particle-rain', 3, 18, (ctx) => {
      const g = ctx.createLinearGradient(1.5, 0, 1.5, 18);
      g.addColorStop(0.0, 'rgba(185,215,245,0)');
      g.addColorStop(0.2, 'rgba(200,225,252,0.70)');
      g.addColorStop(0.6, 'rgba(180,210,240,0.55)');
      g.addColorStop(1.0, 'rgba(160,195,230,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 3, 18);
    });

    // ── Firefly — warm amber glow with bright hot center ──
    this.tex('particle-firefly', 16, 16, (ctx) => {
      const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      g.addColorStop(0.00, 'rgba(255,252,200,1)');   // white-gold hot center
      g.addColorStop(0.18, 'rgba(255,238,130,0.92)');
      g.addColorStop(0.45, 'rgba(255,200,55,0.55)'); // amber mid
      g.addColorStop(0.75, 'rgba(245,145,20,0.18)'); // orange edge
      g.addColorStop(1.00, 'rgba(220,100,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16);
      // White hot micro-dot center
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(8, 8, 1.8, 0, Math.PI * 2); ctx.fill();
    });

    // ── Heart — crisp romantic heart with pink ambient glow ──
    this.tex('particle-heart', 16, 16, (ctx) => {
      const cx = 8, cy = 9;
      // Ambient glow ring
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
      g.addColorStop(0.0, 'rgba(255,140,170,0.35)');
      g.addColorStop(1.0, 'rgba(255,90,130,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16);
      // Heart body
      ctx.fillStyle = '#FF5C8A';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 4.5);
      ctx.bezierCurveTo(cx - 7.5, cy + 0.5, cx - 7.5, cy - 5, cx, cy - 2);
      ctx.bezierCurveTo(cx + 7.5, cy - 5, cx + 7.5, cy + 0.5, cx, cy + 4.5);
      ctx.fill();
      // Specular highlight
      ctx.fillStyle = 'rgba(255,210,220,0.65)';
      ctx.beginPath();
      ctx.ellipse(cx - 2.5, cy - 1, 2, 1.4, -0.4, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Glow — peach-pink-white soft radial glow ──
    this.tex('particle-glow', 20, 20, (ctx) => {
      const g = ctx.createRadialGradient(10, 10, 0, 10, 10, 10);
      g.addColorStop(0.00, 'rgba(255,255,255,0.98)');   // bright white center
      g.addColorStop(0.20, 'rgba(255,225,215,0.75)');   // warm peach
      g.addColorStop(0.50, 'rgba(255,180,210,0.35)');   // pink-rose mid
      g.addColorStop(0.80, 'rgba(220,140,200,0.10)');   // faint lavender edge
      g.addColorStop(1.00, 'rgba(190,110,190,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 20, 20);
    });
  }

  /* ── UI ────────────────────────────────────────── */
  _uiElements() {
    // Memory icons
    ['#FF6B8A', '#FFD700', '#64C8FF', '#FF8C42', '#C878FF'].forEach((c, i) => {
      const keys = ['memory-heart', 'memory-star', 'memory-tear', 'memory-music', 'memory-ring'];
      this.tex(keys[i], 24, 24, (ctx) => {
        const g = ctx.createRadialGradient(12, 12, 2, 12, 12, 12);
        g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 24, 24);
        ctx.fillStyle = c; ctx.font = '14px serif';
        const icons = ['❤', '⭐', '💧', '♪', '💍'];
        ctx.fillText(icons[i], 5, 18);
      });
    });

    // Interaction indicator (floating diamond)
    this.tex('interact-icon', 20, 20, (ctx) => {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(10, 2); ctx.lineTo(18, 10); ctx.lineTo(10, 18); ctx.lineTo(2, 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,230,0.5)';
      ctx.beginPath();
      ctx.moveTo(10, 2); ctx.lineTo(14, 10); ctx.lineTo(10, 18); ctx.lineTo(6, 10);
      ctx.closePath(); ctx.fill();
    });
  }

  /* ── Overlays ──────────────────────────────────────── */
  _overlays() {
    // ── Vignette — deep purple-tinted cinematic oval ──
    this.tex('vignette', 960, 540, (ctx) => {
      // Oval radial: transparency at center, deep purple-black at edges
      const g = ctx.createRadialGradient(480, 270, 80, 480, 270, 570);
      g.addColorStop(0.00, 'rgba(0,0,0,0)');
      g.addColorStop(0.50, 'rgba(5,0,15,0)');
      g.addColorStop(0.68, 'rgba(10,4,25,0.18)');
      g.addColorStop(0.80, 'rgba(18,6,35,0.48)');
      g.addColorStop(0.90, 'rgba(25,8,45,0.68)');
      g.addColorStop(1.00, 'rgba(30,8,50,0.88)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 960, 540);
    });

    // ── Film grain — fine noise for organic texture ──
    this.tex('film-grain', 256, 256, (ctx) => {
      const id = ctx.createImageData(256, 256);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = Math.random() * 255;
        id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v;
        id.data[i + 3] = 14;
      }
      ctx.putImageData(id, 0, 0);
    });

    // ── Warm overlay — cinematic romantic color grade ──
    // Peach-gold top-left → lavender bottom-right with central bloom
    this.tex('warm-overlay', 960, 540, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 960, 540);
      g.addColorStop(0.00, 'rgba(255,185,130,0.14)');  // warm peach (morning sun top-left)
      g.addColorStop(0.30, 'rgba(255,155,175,0.09)');  // soft coral transition
      g.addColorStop(0.55, 'rgba(205,160,235,0.08)');  // lavender
      g.addColorStop(0.80, 'rgba(155,120,220,0.09)');  // deeper lavender
      g.addColorStop(1.00, 'rgba(100,80,185,0.12)');   // deep violet corner
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 960, 540);
      // Central warm bloom (romantic focal light)
      const bloom = ctx.createRadialGradient(380, 200, 0, 380, 200, 500);
      bloom.addColorStop(0.0, 'rgba(255,215,180,0.07)');
      bloom.addColorStop(0.5, 'rgba(255,190,200,0.04)');
      bloom.addColorStop(1.0, 'rgba(200,160,255,0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, 960, 540);
    });

    // ── Light blob — premium radial point light ──
    // Hot white-gold center, wide peach → lavender romantic falloff
    this.tex('light-blob', 256, 256, (ctx) => {
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0.00, 'rgba(255,252,235,1.0)');   // hot white-gold center
      g.addColorStop(0.06, 'rgba(255,235,195,0.95)');  // warm gold inner ring
      g.addColorStop(0.15, 'rgba(255,210,165,0.78)');  // peach mid
      g.addColorStop(0.28, 'rgba(255,185,155,0.52)');  // coral transition
      g.addColorStop(0.45, 'rgba(245,160,190,0.28)');  // rose-pink
      g.addColorStop(0.62, 'rgba(215,145,220,0.13)');  // lavender transition
      g.addColorStop(0.80, 'rgba(180,120,210,0.05)');  // faint deep lavender
      g.addColorStop(1.00, 'rgba(140,90,190,0)');      // transparent edge
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    });
  }

  /* ── New Object Sprites ────────────────────────── */
  _newObjectSprites() {
    // Female character (her) — dusty rose-mauve hoodie, Monument Valley style
    this.tex('character-her', 40, 64, (ctx) => {
      const cx = 20, cy = 64;
      // Ground shadow
      ctx.fillStyle = 'rgba(30,10,50,0.22)';
      ctx.beginPath(); ctx.ellipse(cx, cy - 2, 12, 3.5, 0, 0, Math.PI * 2); ctx.fill();

      // Hoodie body — deep dusty rose, left-lit
      const dg = ctx.createLinearGradient(cx - 10, cy - 33, cx + 10, cy - 4);
      dg.addColorStop(0, '#AA4565');   // lit warm rose
      dg.addColorStop(0.4, '#8A3050'); // mid rose-mauve
      dg.addColorStop(1, '#6A1E3A');   // deep shadow
      ctx.fillStyle = dg;
      roundRect(ctx, cx - 10, cy - 32, 20, 28, 4); ctx.fill();
      // Hood strip
      ctx.fillStyle = '#5C1A30';
      roundRect(ctx, cx - 8, cy - 32, 16, 6, 3); ctx.fill();
      // Kangaroo pocket
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      roundRect(ctx, cx - 6, cy - 14, 12, 8, 3); ctx.fill();

      // Sleeves
      ctx.fillStyle = '#8A3050';
      ctx.fillRect(cx - 13, cy - 28, 3, 12);
      ctx.fillRect(cx + 10, cy - 28, 3, 12);

      // Head — warm soft skin
      const hg = ctx.createRadialGradient(cx - 2, cy - 41, 0, cx, cy - 40, 8.5);
      hg.addColorStop(0, '#FFE0C5');
      hg.addColorStop(0.65, '#F0C8A0');
      hg.addColorStop(1, '#D8A880');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(cx, cy - 40, 8, 0, Math.PI * 2); ctx.fill();

      // Hair — deep mahogany with sheen
      ctx.fillStyle = '#241008';
      ctx.beginPath(); ctx.arc(cx, cy - 43, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy - 40);
      ctx.quadraticCurveTo(cx - 13, cy - 22, cx - 11, cy - 10);
      ctx.lineTo(cx - 7, cy - 10);
      ctx.quadraticCurveTo(cx - 9, cy - 22, cx - 5, cy - 38);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 9, cy - 40);
      ctx.quadraticCurveTo(cx + 13, cy - 22, cx + 11, cy - 10);
      ctx.lineTo(cx + 7, cy - 10);
      ctx.quadraticCurveTo(cx + 9, cy - 22, cx + 5, cy - 38);
      ctx.closePath(); ctx.fill();
      // Hair sheen
      ctx.fillStyle = 'rgba(80,40,10,0.25)';
      ctx.beginPath(); ctx.arc(cx - 3, cy - 46, 4, 0, Math.PI * 2); ctx.fill();

      // Eyes
      ctx.fillStyle = '#3A2015';
      ctx.beginPath(); ctx.arc(cx - 3, cy - 41, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3, cy - 41, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(cx - 2.5, cy - 41.5, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3.5, cy - 41.5, 0.5, 0, Math.PI * 2); ctx.fill();
      // Subtle blush
      ctx.fillStyle = 'rgba(255,150,155,0.22)';
      ctx.beginPath(); ctx.ellipse(cx - 5.5, cy - 38.5, 2.5, 1.8, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 5.5, cy - 38.5, 2.5, 1.8, 0.2, 0, Math.PI * 2); ctx.fill();
      // Gentle smile
      ctx.strokeStyle = 'rgba(160,70,80,0.55)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.arc(cx, cy - 37.5, 2.5, 0.3, Math.PI - 0.3); ctx.stroke();

      // Jeans
      ctx.fillStyle = '#2A3E6A';
      ctx.fillRect(cx - 6, cy - 4, 4, 4);
      ctx.fillRect(cx + 2, cy - 4, 4, 4);
    }, true);

    // Task / help object (clipboard)
    this.tex('obj-task', 40, 48, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(20, 45, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Board
      const bg = ctx.createLinearGradient(4, 4, 36, 44);
      bg.addColorStop(0, '#F5EFE0'); bg.addColorStop(1, '#E0D4C0');
      ctx.fillStyle = bg;
      roundRect(ctx, 4, 6, 32, 38, 3); ctx.fill();
      ctx.fillStyle = '#C8B898';
      ctx.strokeStyle = '#B0A080'; ctx.lineWidth = 1;
      ctx.strokeRect(4.5, 6.5, 31, 37);
      // Clip at top
      ctx.fillStyle = '#888'; roundRect(ctx, 14, 3, 12, 8, 2); ctx.fill();
      ctx.fillStyle = '#AAA'; ctx.fillRect(16, 4, 8, 3);
      // Check lines
      const lines = [[9, 20], [9, 28], [9, 36]];
      lines.forEach(([x, y]) => {
        ctx.strokeStyle = '#80BB60'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x + 3, y + 2); ctx.lineTo(x + 7, y - 3); ctx.stroke();
        ctx.strokeStyle = '#C0B090'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + 22, y); ctx.stroke();
      });
    }, true);

    // Gift box
    this.tex('obj-gift', 44, 52, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(22, 49, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Box body
      const bg = ctx.createLinearGradient(4, 20, 40, 48);
      bg.addColorStop(0, '#E060A0'); bg.addColorStop(1, '#B03878');
      ctx.fillStyle = bg;
      roundRect(ctx, 4, 20, 36, 28, 3); ctx.fill();
      // Lid
      const lg = ctx.createLinearGradient(2, 14, 42, 22);
      lg.addColorStop(0, '#F070B0'); lg.addColorStop(1, '#C04880');
      ctx.fillStyle = lg;
      roundRect(ctx, 2, 14, 40, 10, 3); ctx.fill();
      // Ribbon vertical
      ctx.fillStyle = '#FFE080';
      ctx.fillRect(19, 14, 6, 34);
      // Ribbon horizontal
      ctx.fillRect(2, 17, 40, 6);
      // Bow
      ctx.fillStyle = '#FFD060';
      ctx.beginPath(); ctx.ellipse(15, 14, 9, 5, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(29, 14, 9, 5, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFE880';
      ctx.beginPath(); ctx.arc(22, 14, 4, 0, Math.PI * 2); ctx.fill();
      // Shine on box
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath(); ctx.ellipse(14, 26, 8, 4, -0.3, 0, Math.PI * 2); ctx.fill();
    }, true);

    // Cracked path / broken patch
    this.tex('obj-crack', 80, 40, (ctx) => {
      // Base stone/path
      const bg = ctx.createLinearGradient(0, 0, 80, 40);
      bg.addColorStop(0, '#7A7A72'); bg.addColorStop(1, '#5A5A55');
      ctx.fillStyle = bg;
      roundRect(ctx, 2, 6, 76, 30, 4); ctx.fill();
      // Stone texture patches
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(4, 8, 30, 12); ctx.fillRect(38, 16, 28, 12);
      // Main crack (zigzag)
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(25, 6);
      ctx.lineTo(33, 14); ctx.lineTo(28, 22); ctx.lineTo(38, 30); ctx.lineTo(48, 22);
      ctx.lineTo(55, 30); ctx.lineTo(60, 36);
      ctx.stroke();
      // Crack fill (dark void)
      ctx.strokeStyle = '#0A0A0A'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(25, 6);
      ctx.lineTo(33, 14); ctx.lineTo(28, 22); ctx.lineTo(38, 30); ctx.lineTo(48, 22);
      ctx.lineTo(55, 30); ctx.lineTo(60, 36);
      ctx.stroke();
      // Secondary cracks
      ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(33, 14); ctx.lineTo(40, 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(38, 30); ctx.lineTo(30, 36); ctx.stroke();
      // Edge vignette
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, 80, 6); ctx.fillRect(0, 34, 80, 6);
    }, true);

    // ── New gift & letter sprites ──────────────────────────────

    // Morning letter / envelope
    this.tex('obj-morning-letter', 40, 32, (ctx) => {
      // Warm glow
      const glow = ctx.createRadialGradient(20, 16, 2, 20, 16, 20);
      glow.addColorStop(0, 'rgba(255,220,100,0.35)'); glow.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 40, 32);
      // Envelope body
      const eg = ctx.createLinearGradient(4, 6, 36, 28);
      eg.addColorStop(0, '#FFFBF0'); eg.addColorStop(1, '#F0E8D0');
      ctx.fillStyle = eg; roundRect(ctx, 4, 8, 32, 20, 3); ctx.fill();
      ctx.strokeStyle = '#CCBA90'; ctx.lineWidth = 0.8; roundRect(ctx, 4, 8, 32, 20, 3); ctx.stroke();
      // Envelope flap (open)
      ctx.fillStyle = '#F5EDD8';
      ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(20, 17); ctx.lineTo(36, 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#CCBA90'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(20, 17); ctx.lineTo(36, 8); ctx.stroke();
      // Wax seal (heart shape)
      ctx.fillStyle = '#CC2244';
      ctx.beginPath(); ctx.arc(20, 21, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF4466';
      ctx.beginPath(); ctx.moveTo(20, 24.5);
      ctx.bezierCurveTo(16, 21, 16, 17.5, 20, 19);
      ctx.bezierCurveTo(24, 17.5, 24, 21, 20, 24.5);
      ctx.fill();
      // Paper lines peeking out
      ctx.strokeStyle = '#D0C8A8'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(30, 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, 12.5); ctx.lineTo(26, 12.5); ctx.stroke();
    }, true);

    // Delivery person (obj-delivery-guy)
    this.tex('obj-delivery-guy', 36, 60, (ctx) => {
      const cx = 18, cy = 60;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(cx, cy - 3, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Uniform body (delivery red)
      const ug = ctx.createLinearGradient(cx - 8, cy - 28, cx + 8, cy - 6);
      ug.addColorStop(0, '#D03020'); ug.addColorStop(1, '#A02010');
      ctx.fillStyle = ug; roundRect(ctx, cx - 7, cy - 28, 14, 22, 3); ctx.fill();
      // Delivery bag on back / side
      ctx.fillStyle = '#2A2A2A';
      roundRect(ctx, cx + 6, cy - 30, 12, 18, 3); ctx.fill();
      ctx.fillStyle = '#FF4020';
      roundRect(ctx, cx + 7, cy - 28, 10, 3, 2); ctx.fill();
      // Head
      const hg = ctx.createRadialGradient(cx, cy - 35, 1, cx, cy - 35, 7);
      hg.addColorStop(0, '#FFD8A8'); hg.addColorStop(1, '#E8B888');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy - 35, 7, 0, Math.PI * 2); ctx.fill();
      // Helmet
      ctx.fillStyle = '#1A1A1A';
      ctx.beginPath(); ctx.arc(cx, cy - 38, 7.5, Math.PI, 0); ctx.fill();
      ctx.fillRect(cx - 8, cy - 38, 16, 4);
      // Visor
      ctx.fillStyle = 'rgba(100,160,220,0.5)';
      roundRect(ctx, cx - 6, cy - 37, 12, 4, 1); ctx.fill();
      // Eyes
      ctx.fillStyle = '#2A1808';
      ctx.beginPath(); ctx.arc(cx - 2.5, cy - 35, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 2.5, cy - 35, 1.1, 0, Math.PI * 2); ctx.fill();
      // Apology speech bubble
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, cx - 18, cy - 55, 22, 12, 4); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(cx - 8, cy - 43); ctx.lineTo(cx - 5, cy - 43); ctx.lineTo(cx - 8, cy - 40); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#DDD'; ctx.lineWidth = 0.5; roundRect(ctx, cx - 18, cy - 55, 22, 12, 4); ctx.stroke();
      ctx.fillStyle = '#C03020'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Sorry!', cx - 7, cy - 46); ctx.textAlign = 'left';
      // Legs
      ctx.fillStyle = '#1A2030';
      ctx.fillRect(cx - 5, cy - 8, 4, 8); ctx.fillRect(cx + 1, cy - 8, 4, 8);
      // Shoes
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(cx - 6, cy - 1, 5, 3); ctx.fillRect(cx + 1, cy - 1, 5, 3);
    }, true);

    // Love story book (obj-lovebook)
    this.tex('obj-lovebook', 44, 56, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(22, 53, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Book body
      const bg = ctx.createLinearGradient(4, 4, 40, 52);
      bg.addColorStop(0, '#7A1A30'); bg.addColorStop(1, '#5A0E20');
      ctx.fillStyle = bg; roundRect(ctx, 4, 4, 36, 48, 4); ctx.fill();
      // Spine (left edge)
      ctx.fillStyle = '#4A0A18'; ctx.fillRect(4, 4, 4, 48);
      // Gold ribbon bookmark
      ctx.fillStyle = '#E8C040'; ctx.fillRect(24, 0, 4, 20);
      ctx.beginPath(); ctx.moveTo(24, 20); ctx.lineTo(26, 23); ctx.lineTo(28, 20); ctx.fill();
      // Cover photo frame
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(ctx, 10, 10, 22, 18, 2); ctx.fill();
      ctx.strokeStyle = '#E8C880'; ctx.lineWidth = 0.8; roundRect(ctx, 10, 10, 22, 18, 2); ctx.stroke();
      // Silhouette photo (two people leaning)
      ctx.fillStyle = 'rgba(255,200,180,0.5)';
      ctx.beginPath(); ctx.arc(15, 20, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(27, 20, 4, 0, Math.PI * 2); ctx.fill();
      // Title text
      ctx.fillStyle = '#F0D880'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Our Story', 22, 37);
      ctx.fillStyle = '#CC9040'; ctx.font = '5px sans-serif';
      ctx.fillText('A Love Quest', 22, 45); ctx.textAlign = 'left';
      // Pages edge
      ctx.fillStyle = '#FFF8F0'; ctx.fillRect(38, 6, 2, 44);
      ctx.fillStyle = '#F0E8D8'; ctx.fillRect(40, 8, 1, 42);
    }, true);

    // Printed photos collage (obj-printedphotos)
    this.tex('obj-printedphotos', 56, 48, (ctx) => {
      // Three overlapping photo frames
      const frames = [
        { x: 2,  y: 8,  w: 28, h: 22, rot: -0.12, color: '#F8F4EC' },
        { x: 14, y: 4,  w: 26, h: 20, rot:  0.06, color: '#FFFEF8' },
        { x: 24, y: 10, w: 28, h: 22, rot:  0.15, color: '#F4F0E8' }
      ];
      frames.forEach((fr, i) => {
        ctx.save();
        ctx.translate(fr.x + fr.w / 2, fr.y + fr.h / 2); ctx.rotate(fr.rot);
        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        roundRect(ctx, -fr.w / 2 + 2, -fr.h / 2 + 2, fr.w, fr.h, 1); ctx.fill();
        // Frame
        ctx.fillStyle = fr.color;
        roundRect(ctx, -fr.w / 2, -fr.h / 2, fr.w, fr.h, 1); ctx.fill();
        // Photo area (coloured placeholder)
        const pc = ['#C8D8E8','#E8CCC0','#C8E0C8'][i];
        ctx.fillStyle = pc;
        ctx.fillRect(-fr.w / 2 + 3, -fr.h / 2 + 3, fr.w - 6, fr.h - 10);
        // Simple couple silhouettes
        ctx.fillStyle = 'rgba(80,60,40,0.35)';
        ctx.beginPath(); ctx.arc(-4, -fr.h / 2 + 10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4,  -fr.h / 2 + 10, 4, 0, Math.PI * 2); ctx.fill();
        // Caption line
        ctx.fillStyle = '#999'; ctx.fillRect(-fr.w / 2 + 3, fr.h / 2 - 8, fr.w - 6, 1.5);
        ctx.restore();
      });
      // Heart sticker over top
      ctx.fillStyle = '#E84060'; ctx.font = '10px serif'; ctx.textAlign = 'center';
      ctx.fillText('❤', 28, 48); ctx.textAlign = 'left';
    }, true);

    // Custom photo mug (obj-customcup)
    this.tex('obj-customcup', 44, 48, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(20, 45, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Mug body
      const mg = ctx.createLinearGradient(4, 6, 36, 44);
      mg.addColorStop(0, '#FFFFFF'); mg.addColorStop(1, '#E8E0D8');
      ctx.fillStyle = mg; roundRect(ctx, 4, 8, 30, 34, 4); ctx.fill();
      ctx.strokeStyle = '#D0C8BC'; ctx.lineWidth = 0.8; roundRect(ctx, 4, 8, 30, 34, 4); ctx.stroke();
      // Handle
      ctx.strokeStyle = '#D0C8BC'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(38, 25, 7, -Math.PI * 0.7, Math.PI * 0.7); ctx.stroke();
      // Photo panel on mug (warm coloured)
      const pp = ctx.createLinearGradient(7, 14, 31, 36);
      pp.addColorStop(0, '#FFE8C8'); pp.addColorStop(1, '#F0D0A0');
      ctx.fillStyle = pp; roundRect(ctx, 7, 14, 24, 22, 2); ctx.fill();
      // Silhouette of two people
      ctx.fillStyle = 'rgba(120,60,40,0.4)';
      ctx.beginPath(); ctx.arc(14, 25, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(24, 25, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(80,30,20,0.3)';
      ctx.beginPath(); ctx.arc(14, 32, 7, 0.05, Math.PI - 0.05); ctx.fill();
      ctx.beginPath(); ctx.arc(24, 32, 7, 0.05, Math.PI - 0.05); ctx.fill();
      // Heart on photo
      ctx.fillStyle = '#E84060'; ctx.font = '7px serif'; ctx.textAlign = 'center';
      ctx.fillText('♥', 19, 20); ctx.textAlign = 'left';
      // Rim
      ctx.fillStyle = '#E0D8D0'; roundRect(ctx, 4, 8, 30, 5, 3); ctx.fill();
      // Steam
      ctx.strokeStyle = 'rgba(200,200,200,0.4)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(12, 8); ctx.quadraticCurveTo(10, 3, 12, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(19, 7); ctx.quadraticCurveTo(21, 2, 19, -1); ctx.stroke();
    }, true);

    // Food (bento / meal)
    this.tex('obj-food', 48, 40, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(24, 37, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Box bottom
      const bg = ctx.createLinearGradient(4, 18, 44, 36);
      bg.addColorStop(0, '#E8D4A8'); bg.addColorStop(1, '#D0B888');
      ctx.fillStyle = bg;
      roundRect(ctx, 4, 16, 40, 20, 4); ctx.fill();
      // Box lid (open)
      const lg = ctx.createLinearGradient(2, 6, 42, 16);
      lg.addColorStop(0, '#F0E0B8'); lg.addColorStop(1, '#D4C498');
      ctx.fillStyle = lg;
      roundRect(ctx, 2, 4, 40, 12, 4); ctx.fill();
      ctx.strokeStyle = '#C0A878'; ctx.lineWidth = 0.8; ctx.strokeRect(2.5, 4.5, 39, 11);
      // Divider in box
      ctx.fillStyle = '#C0A878'; ctx.fillRect(24, 17, 1.5, 19);
      // Rice (left side)
      ctx.fillStyle = '#F5F0E0';
      roundRect(ctx, 6, 18, 17, 16, 2); ctx.fill();
      ctx.fillStyle = 'rgba(200,190,170,0.4)';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(7 + (i % 4) * 3.5, 19 + Math.floor(i / 4) * 4, 2.5, 2.5);
      }
      // Side dish (right side - orange)
      ctx.fillStyle = '#E8904A';
      roundRect(ctx, 27, 18, 15, 8, 2); ctx.fill();
      // Greens
      ctx.fillStyle = '#70A840';
      roundRect(ctx, 27, 27, 15, 7, 2); ctx.fill();
      // Chopsticks
      ctx.strokeStyle = '#C09060'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(38, 2); ctx.lineTo(44, 38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(42, 2); ctx.lineTo(48, 38); ctx.stroke();
      // Heart decoration on lid
      ctx.fillStyle = '#E06080';
      ctx.font = '8px serif'; ctx.fillText('♥', 16, 13);
    }, true);
  }

  /* ── Background Textures ───────────────────────── */
  _backgroundTextures() {
    const W = 960, H = 540;

    // bg-linkedin: LinkedIn feed during Covid lockdown – company event post
    this.tex('bg-linkedin', W, H, (ctx) => {
      // Page background
      ctx.fillStyle = '#F3F2EE'; ctx.fillRect(0, 0, W, H);
      // Top nav bar
      const nav = ctx.createLinearGradient(0, 0, 0, 52);
      nav.addColorStop(0, '#FFFFFF'); nav.addColorStop(1, '#F8F8F8');
      ctx.fillStyle = nav; ctx.fillRect(0, 0, W, 52);
      ctx.strokeStyle = '#D8D8D8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 52); ctx.lineTo(W, 52); ctx.stroke();
      // LinkedIn logo (blue "in" box)
      ctx.fillStyle = '#0A66C2'; roundRect(ctx, 18, 10, 34, 32, 5); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 22px serif'; ctx.textAlign = 'left';
      ctx.fillText('in', 24, 34);
      // Search bar
      ctx.fillStyle = '#EEF3F8'; roundRect(ctx, 64, 12, 220, 30, 4); ctx.fill();
      ctx.strokeStyle = '#C0CCD8'; ctx.lineWidth = 1; roundRect(ctx, 64, 12, 220, 30, 4); ctx.stroke();
      ctx.fillStyle = '#888'; ctx.font = '13px sans-serif'; ctx.fillText('Search', 78, 31);
      // Nav icons row
      const navItems = [350, 420, 490, 560, 630, 700];
      navItems.forEach((x, i) => {
        ctx.fillStyle = i === 0 ? '#0A66C2' : '#888';
        ctx.fillRect(x - 14, 8, 28, 4);
        ctx.fillStyle = '#444'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(['Home','My Net','Jobs','Msg','Notif','Me'][i], x, 46);
      });
      // Profile avatar (top-right)
      ctx.fillStyle = '#B0B0B0'; ctx.beginPath(); ctx.arc(W - 40, 26, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(W - 40, 20, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W - 40, 38, 12, 0.1, Math.PI - 0.1); ctx.fill();

      // Left sidebar
      ctx.fillStyle = '#FFFFFF'; roundRect(ctx, 20, 70, 200, 200, 8); ctx.fill();
      ctx.strokeStyle = '#D8D8D8'; roundRect(ctx, 20, 70, 200, 200, 8); ctx.stroke();
      // Cover strip
      ctx.fillStyle = '#A0B8D0'; ctx.fillRect(20, 70, 200, 55);
      // Sidebar avatar (clipped so body never overflows circle)
      ctx.save();
      ctx.beginPath(); ctx.arc(120, 130, 28, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.clip();
      ctx.fillStyle = '#B0C0D0';
      ctx.beginPath(); ctx.arc(120, 120, 13, 0, Math.PI * 2); ctx.fill();  // head
      ctx.beginPath(); ctx.arc(120, 150, 22, 0, Math.PI * 2); ctx.fill();  // body (clipped)
      ctx.restore();
      ctx.fillStyle = '#1A1A1A'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Prawal Sh...', 120, 168);
      ctx.fillStyle = '#888'; ctx.font = '10px sans-serif'; ctx.fillText('Software Engineer', 120, 182);
      // Connections label
      ctx.fillStyle = '#E8F0F8'; ctx.fillRect(30, 198, 180, 1);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#888'; ctx.font = '10px sans-serif'; ctx.fillText('Connections', 35, 218);
      ctx.fillStyle = '#0A66C2'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('84', 35, 232);

      // Main feed area – company event post card (highlighted / glowing)
      const cx = 240, cy = 72, cw = 480, ch = 390;
      ctx.fillStyle = '#FFFFFF'; roundRect(ctx, cx, cy, cw, ch, 8); ctx.fill();
      ctx.strokeStyle = '#C0CCD8'; ctx.lineWidth = 1; roundRect(ctx, cx, cy, cw, ch, 8); ctx.stroke();
      // Poster header
      ctx.fillStyle = '#B0C8E0'; ctx.beginPath(); ctx.arc(cx + 28, cy + 28, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(cx + 28, cy + 22, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 28, cy + 36, 12, 0.1, Math.PI - 0.1); ctx.fill();
      ctx.fillStyle = '#1A1A1A'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('Acme Corp.', cx + 54, cy + 22);
      ctx.fillStyle = '#888'; ctx.font = '11px sans-serif';
      ctx.fillText('Company Page  •  2,847 followers', cx + 54, cy + 38);
      ctx.fillStyle = '#555'; ctx.font = '12px sans-serif';
      ctx.fillText('We had a wonderful virtual team event last week! 🎉', cx + 12, cy + 66);
      ctx.fillText('Here are some highlights from our online gathering.', cx + 12, cy + 84);
      // Event photo grid (2x2 mosaic)
      const photos = [
        { x: cx + 12, y: cy + 100, w: 224, h: 140, c: '#C8D8E8' },
        { x: cx + 244, y: cy + 100, w: 224, h: 140, c: '#D8E8C8' },
        { x: cx + 12, y: cy + 248, w: 224, h: 100, c: '#E8D8C8' },
        { x: cx + 244, y: cy + 248, w: 224, h: 100, c: '#D8C8E8' }
      ];
      photos.forEach((p, i) => {
        const pg = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
        pg.addColorStop(0, p.c); pg.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = pg; roundRect(ctx, p.x, p.y, p.w, p.h, 4); ctx.fill();
        // Draw people silhouettes in each photo
        const midX = p.x + p.w / 2, midY = p.y + p.h / 2;
        ctx.fillStyle = 'rgba(80,100,120,0.3)';
        ctx.beginPath(); ctx.arc(midX, midY - 12, 14, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(midX, midY + 12, 18, 0.1, Math.PI - 0.1); ctx.fill();
        // In the second photo (top-right), draw a glowing highlight — "her" photo
        if (i === 1) {
          const glow = ctx.createRadialGradient(midX, midY - 10, 5, midX, midY - 10, 50);
          glow.addColorStop(0, 'rgba(255,210,120,0.55)'); glow.addColorStop(1, 'rgba(255,180,60,0)');
          ctx.fillStyle = glow; ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.strokeStyle = 'rgba(255,180,60,0.7)'; ctx.lineWidth = 2;
          roundRect(ctx, p.x + 1, p.y + 1, p.w - 2, p.h - 2, 4); ctx.stroke();
        }
      });
      // Like / Comment bar
      ctx.fillStyle = '#F0F0F0'; ctx.fillRect(cx + 1, cy + ch - 44, cw - 2, 1);
      ['👍 Like', '💬 Comment', '↗ Share'].forEach((lbl, i) => {
        ctx.fillStyle = '#555'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(lbl, cx + 80 + i * 160, cy + ch - 18);
      });
      ctx.textAlign = 'left';
      // Soft golden glow overlay on the whole card (spotlight on moment)
      const glowAll = ctx.createRadialGradient(cx + cw * 0.7, cy + 170, 10, cx + cw * 0.7, cy + 170, 200);
      glowAll.addColorStop(0, 'rgba(255,220,100,0.10)'); glowAll.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowAll; roundRect(ctx, cx, cy, cw, ch, 8); ctx.fill();

      // Right sidebar – "People you may know"
      ctx.fillStyle = '#FFFFFF'; roundRect(ctx, 740, 70, 200, 200, 8); ctx.fill();
      ctx.strokeStyle = '#D8D8D8'; roundRect(ctx, 740, 70, 200, 200, 8); ctx.stroke();
      ctx.fillStyle = '#1A1A1A'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText('People you may know', 752, 90);
      [120, 170, 220].forEach((y, i) => {
        // Clipped avatar (head + body stay inside circle)
        ctx.save();
        ctx.beginPath(); ctx.arc(768, y, 14, 0, Math.PI * 2); ctx.fillStyle = '#C0C8D4'; ctx.fill();
        ctx.clip();
        ctx.fillStyle = '#9AA8B4';
        ctx.beginPath(); ctx.arc(768, y - 4, 6, 0, Math.PI * 2); ctx.fill();  // head
        ctx.beginPath(); ctx.arc(768, y + 12, 10, 0, Math.PI * 2); ctx.fill(); // body
        ctx.restore();
        ctx.fillStyle = '#1A1A1A'; ctx.font = '11px sans-serif'; ctx.fillText('Colleague ' + (i + 1), 792, y - 4);
        ctx.fillStyle = '#888'; ctx.font = '10px sans-serif'; ctx.fillText('2 mutual connections', 792, y + 10);
        ctx.fillStyle = '#0A66C2'; roundRect(ctx, 792, y + 18, 70, 18, 9); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('+ Connect', 827, y + 31); ctx.textAlign = 'left';
      });

      // Subtle full-page vignette
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H);
      vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    });

    // bg-facebook: social network UI
    this.tex('bg-facebook', W, H, (ctx) => {
      // Background
      ctx.fillStyle = '#E8EAF0'; ctx.fillRect(0, 0, W, H);
      // Header
      const hg = ctx.createLinearGradient(0, 0, 0, 56);
      hg.addColorStop(0, '#1877F2'); hg.addColorStop(1, '#1565D0');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 56);
      // FB logo placeholder
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 28px serif'; ctx.fillText('f', 24, 40);
      // Search bar (width 155 keeps clear of the home nav icon at x=240)
      ctx.fillStyle = '#E4E6EB'; roundRect(ctx, 70, 14, 155, 28, 14); ctx.fill();
      // Search icon (magnifying glass)
      ctx.strokeStyle = '#606060'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(84, 26, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(89, 31); ctx.lineTo(94, 36); ctx.stroke();
      ctx.fillStyle = '#606060'; ctx.font = '13px sans-serif'; ctx.fillText('Search', 100, 32);
      // Nav icons — clean geometric shapes (home, people, play, cart)
      const navDraw = (x, active) => {
        const c = active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)';
        ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 1.5;
        return c;
      };
      // Home icon
      navDraw(250, false);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.moveTo(250,20); ctx.lineTo(240,30); ctx.lineTo(244,30); ctx.lineTo(244,38); ctx.lineTo(256,38); ctx.lineTo(256,30); ctx.lineTo(260,30); ctx.closePath(); ctx.fill();
      // People icon
      navDraw(310, true);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.arc(307,25,5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(307,38,8,0.1,Math.PI-0.1); ctx.fill();
      ctx.beginPath(); ctx.arc(316,26,4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(316,37,7,0.1,Math.PI-0.1); ctx.fill();
      // Play icon
      navDraw(370, false);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.moveTo(362,20); ctx.lineTo(362,38); ctx.lineTo(378,29); ctx.closePath(); ctx.fill();
      // Cart icon
      navDraw(430, false);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(422,20); ctx.lineTo(424,27); ctx.lineTo(436,27); ctx.lineTo(434,35); ctx.lineTo(426,35); ctx.stroke();
      ctx.beginPath(); ctx.arc(427,38,2.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(434,38,2.5,0,Math.PI*2); ctx.fill();
      // Profile section on right
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(W - 50, 28, 18, 0, Math.PI * 2); ctx.fill();
      // Main content area
      ctx.fillStyle = '#F0F2F5'; ctx.fillRect(0, 56, W, H - 56);
      // Friend suggestion card
      ctx.fillStyle = '#FFFFFF'; roundRect(ctx, W / 2 - 160, 90, 320, 280, 10); ctx.fill();
      ctx.fillStyle = '#1877F2'; roundRect(ctx, W / 2 - 160, 90, 320, 100, 10); ctx.fill();
      ctx.fillStyle = '#1565D0'; ctx.fillRect(W / 2 - 160, 140, 320, 50);
      // Avatar (clipped so body never overflows circle)
      ctx.save();
      ctx.beginPath(); ctx.arc(W / 2, 200, 42, 0, Math.PI * 2); ctx.fillStyle = '#E4E6EB'; ctx.fill();
      ctx.clip();
      ctx.fillStyle = '#B0B8C4';
      ctx.beginPath(); ctx.arc(W / 2, 186, 20, 0, Math.PI * 2); ctx.fill();  // head
      ctx.beginPath(); ctx.arc(W / 2, 230, 34, 0, Math.PI * 2); ctx.fill();  // body (clipped)
      ctx.restore();
      // Name
      ctx.fillStyle = '#1A1A1A'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Someone special…', W / 2, 258);
      ctx.fillStyle = '#888'; ctx.font = '12px sans-serif';
      ctx.fillText('3 mutual friends', W / 2, 276); ctx.textAlign = 'left';
      // Add Friend button highlight area
      ctx.fillStyle = '#1877F2'; roundRect(ctx, W / 2 - 90, 288, 180, 36, 8); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Add Friend', W / 2, 312); ctx.textAlign = 'left';
      // Sidebar
      ctx.fillStyle = '#FFFFFF'; roundRect(ctx, 20, 90, 200, 300, 8); ctx.fill();
      [110, 150, 190, 230, 270].forEach((y, i) => {
        ctx.fillStyle = '#C0C8D4'; ctx.beginPath(); ctx.arc(44, y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#D8DEE8'; roundRect(ctx, 68, y - 7, 120, 9, 4); ctx.fill();
        ctx.fillStyle = '#E0E6F0'; roundRect(ctx, 68, y + 6, 80, 7, 3); ctx.fill();
      });
    });

    // bg-chat: messaging interface
    this.tex('bg-chat', W, H, (ctx) => {
      // Dark background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0D0B18'); bg.addColorStop(1, '#0A0814');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // Header bar
      ctx.fillStyle = '#151220'; ctx.fillRect(0, 0, W, 54);
      // Avatar circle in header
      ctx.fillStyle = '#2A3A5C';
      ctx.beginPath(); ctx.arc(40, 27, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7AAACF';
      ctx.beginPath(); ctx.arc(40, 22, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3A5A8A';
      ctx.beginPath(); ctx.arc(40, 36, 12, 0, Math.PI, true); ctx.fill();
      // Green online dot
      ctx.fillStyle = '#44DD88';
      ctx.beginPath(); ctx.arc(53, 36, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#001108';
      ctx.beginPath(); ctx.arc(53, 36, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#44DD88';
      ctx.beginPath(); ctx.arc(53, 36, 1.5, 0, Math.PI * 2); ctx.fill();
      // Contact name
      ctx.fillStyle = '#D0E8FF'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText('Aashna', 68, 24);
      ctx.fillStyle = '#6080A0'; ctx.font = '10px sans-serif';
      ctx.fillText('Online', 68, 39);
      // Header separator
      ctx.fillStyle = '#252235'; ctx.fillRect(0, 54, W, 1);

      // Helper: draw bubble tail
      const drawTail = (bx, by, bw, bh, sent) => {
        ctx.fillStyle = sent ? '#3D2060' : '#1E3A5A';
        if (sent) {
          // Tail at bottom-right
          ctx.beginPath();
          ctx.moveTo(bx + bw - 18, by + bh - 1);
          ctx.lineTo(bx + bw + 8, by + bh + 8);
          ctx.lineTo(bx + bw - 6, by + bh - 1);
          ctx.closePath(); ctx.fill();
        } else {
          // Tail at bottom-left
          ctx.beginPath();
          ctx.moveTo(bx + 18, by + bh - 1);
          ctx.lineTo(bx - 8, by + bh + 8);
          ctx.lineTo(bx + 6, by + bh - 1);
          ctx.closePath(); ctx.fill();
        }
      };

      // Helper: small sender avatar circle
      const drawAvatar = (x, y, sent) => {
        ctx.fillStyle = sent ? '#4A2080' : '#1E4A70';
        ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
        if (sent) {
          ctx.fillStyle = '#C090E0';
          ctx.beginPath(); ctx.arc(x, y - 4, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#4A2080';
          ctx.beginPath(); ctx.arc(x, y + 6, 8, 0, Math.PI, true); ctx.fill();
        } else {
          ctx.fillStyle = '#7AAACF';
          ctx.beginPath(); ctx.arc(x, y - 4, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#1E4A70';
          ctx.beginPath(); ctx.arc(x, y + 6, 8, 0, Math.PI, true); ctx.fill();
        }
      };

      // Message bubbles with tails and avatars
      const bubbles = [
        { x: W/2-210, y: 78, w: 220, h: 38, c: '#1E3A5A', sent: false, ts: '10:24 AM' },
        { x: W/2-30,  y: 136, w: 185, h: 38, c: '#3D2060', sent: true, ts: '10:25 AM' },
        { x: W/2-195, y: 196, w: 265, h: 52, c: '#1A3655', sent: false, ts: '10:26 AM' },
        { x: W/2-30,  y: 268, w: 200, h: 38, c: '#362055', sent: true, ts: '10:27 AM' },
        { x: W/2-230, y: 326, w: 305, h: 52, c: '#152840', sent: false, ts: '10:29 AM' },
        { x: W/2-30,  y: 396, w: 165, h: 38, c: '#2A1848', sent: true, ts: '10:30 AM' },
        { x: W/2-170, y: 452, w: 250, h: 38, c: '#101828', sent: false, ts: '10:31 AM' },
      ];

      bubbles.forEach(b => {
        // Avatar
        if (!b.sent) { drawAvatar(b.x - 20, b.y + b.h / 2, false); }
        else { drawAvatar(b.x + b.w + 20, b.y + b.h / 2, true); }
        // Bubble background
        ctx.fillStyle = b.c; roundRect(ctx, b.x, b.y, b.w, b.h, 14); ctx.fill();
        // Inner gloss
        const gc = b.sent ? 'rgba(180,140,255,0.10)' : 'rgba(90,170,255,0.07)';
        ctx.fillStyle = gc;
        roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, 12, 7); ctx.fill();
        // Tail
        drawTail(b.x, b.y, b.w, b.h, b.sent);
        // Timestamp
        ctx.fillStyle = 'rgba(150,170,200,0.45)'; ctx.font = '8px sans-serif';
        if (b.sent) ctx.fillText(b.ts, b.x + b.w - 44, b.y + b.h + 14);
        else ctx.fillText(b.ts, b.x + 4, b.y + b.h + 14);
        // Read tick for sent
        if (b.sent) {
          ctx.fillStyle = 'rgba(100,200,255,0.55)'; ctx.font = '9px sans-serif';
          ctx.fillText('✓✓', b.x + b.w + 6, b.y + b.h - 4);
        }
      });

      // Typing indicator
      ctx.fillStyle = '#1E3A5A'; roundRect(ctx, W/2-210, H - 72, 70, 28, 14); ctx.fill();
      drawTail(W/2-210, H-72, 70, 28, false);
      [0,1,2].forEach(i => {
        const pulse = 0.35 + i * 0.18;
        ctx.fillStyle = `rgba(100,180,255,${pulse})`;
        ctx.beginPath(); ctx.arc(W/2 - 200 + i * 16, H - 58, 4.5, 0, Math.PI * 2); ctx.fill();
      });
      // Input bar
      ctx.fillStyle = '#151220'; ctx.fillRect(0, H - 50, W, 50);
      ctx.fillStyle = '#1E1A2E'; roundRect(ctx, 50, H - 40, W - 110, 28, 14); ctx.fill();
      ctx.fillStyle = '#404058'; ctx.font = '10px sans-serif';
      ctx.fillText('Type a message...', 65, H - 22);
      // Send button
      ctx.fillStyle = '#5040A8'; roundRect(ctx, W - 50, H - 40, 34, 28, 10); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('▶', W - 39, H - 22);
      // Ambient star particles
      for (let i = 0; i < 20; i++) {
        const px = Math.random() * W, py = 55 + Math.random() * (H - 120);
        ctx.fillStyle = `rgba(${80+Math.random()*80},${120+Math.random()*80},${200+Math.random()*55},${0.03 + Math.random()*0.04})`;
        ctx.beginPath(); ctx.arc(px, py, 1 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
      }
    });

    // bg-cafe: warm café interior
    this.tex('bg-cafe', W, H, (ctx) => {
      // Rich warm interior gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1E1006'); bg.addColorStop(0.5, '#2E1A0C'); bg.addColorStop(1, '#100804');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Ceiling with wooden beams
      ctx.fillStyle = '#150A02'; ctx.fillRect(0, 0, W, 40);
      [120, 320, 520, 720, 860].forEach(bx => {
        ctx.fillStyle = '#1A0D04'; ctx.fillRect(bx, 0, 22, H * 0.75);
        ctx.fillStyle = '#120902'; ctx.fillRect(bx + 2, 0, 4, H * 0.75);
      });

      // Hanging pendant lamps
      [W*0.22, W*0.5, W*0.78].forEach(lx => {
        // Cord
        ctx.strokeStyle = '#2A1A08'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 55); ctx.stroke();
        // Shade
        ctx.fillStyle = '#4A2808';
        ctx.beginPath(); ctx.moveTo(lx - 18, 55); ctx.lineTo(lx + 18, 55);
        ctx.lineTo(lx + 12, 80); ctx.lineTo(lx - 12, 80); ctx.closePath(); ctx.fill();
        // Inner glow
        const lg = ctx.createRadialGradient(lx, 82, 0, lx, 100, 90);
        lg.addColorStop(0, 'rgba(255,200,80,0.30)'); lg.addColorStop(0.4, 'rgba(255,180,60,0.12)'); lg.addColorStop(1, 'rgba(255,160,40,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
        // Bulb glow dot
        ctx.fillStyle = 'rgba(255,220,120,0.7)';
        ctx.beginPath(); ctx.arc(lx, 73, 4, 0, Math.PI * 2); ctx.fill();
      });

      // Window with golden-hour outside
      const wg = ctx.createLinearGradient(W/2-100, 40, W/2-100, 220);
      wg.addColorStop(0, '#B8D8F8'); wg.addColorStop(0.5, '#FFB870'); wg.addColorStop(1, '#FF6820');
      ctx.fillStyle = '#3A2010'; roundRect(ctx, W/2-116, 28, 232, 196, 6); ctx.fill();
      ctx.fillStyle = wg; roundRect(ctx, W/2-108, 36, 216, 180, 4); ctx.fill();
      // Window pane dividers
      ctx.fillStyle = '#3A2010'; ctx.fillRect(W/2, 36, 4, 180); ctx.fillRect(W/2-108, 126, 216, 4);
      // Soft backlit glow through window
      const wSpill = ctx.createRadialGradient(W/2, H*0.45, 0, W/2, H*0.45, 260);
      wSpill.addColorStop(0, 'rgba(255,180,80,0.14)'); wSpill.addColorStop(1, 'rgba(255,160,40,0)');
      ctx.fillStyle = wSpill; ctx.fillRect(0, 0, W, H);
      // Window sill plant
      ctx.fillStyle = '#2C1204'; roundRect(ctx, W/2+50, 208, 28, 18, 3); ctx.fill();
      ctx.fillStyle = '#386018';
      ctx.beginPath(); ctx.arc(W/2+64, 200, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4A7820';
      ctx.beginPath(); ctx.arc(W/2+58, 205, 10, 0, Math.PI * 2); ctx.fill();

      // Menu chalkboard on left wall
      ctx.fillStyle = '#1A0E06'; roundRect(ctx, 28, 75, 190, 160, 5); ctx.fill();
      ctx.fillStyle = '#152415'; roundRect(ctx, 34, 81, 178, 148, 4); ctx.fill();
      ctx.strokeStyle = '#2A3E20'; ctx.lineWidth = 2;
      ctx.strokeRect(37, 84, 172, 142);
      // Menu text glow
      ctx.fillStyle = 'rgba(200,240,180,0.20)'; ctx.font = 'bold 11px sans-serif';
      ctx.fillText('MENU', 105, 102);
      ctx.fillStyle = 'rgba(200,230,170,0.14)'; ctx.font = '9px sans-serif';
      ['Espresso ....... 2', 'Latte .......... 3', 'Cappuccino ..... 3', '─────────────', 'Croissant ...... 2', 'Cake ........... 4'].forEach((line, i) => {
        ctx.fillText(line, 44, 118 + i * 16);
      });
      // Chalk dust smear
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(34, 82, 178, 6);

      // Tables and chairs
      [W*0.18, W*0.68].forEach((tx, ti) => {
        // Table top
        const tblG = ctx.createLinearGradient(tx-70, H-185, tx+70, H-178);
        tblG.addColorStop(0, '#3A1E08'); tblG.addColorStop(1, '#2A1406');
        ctx.fillStyle = tblG; roundRect(ctx, tx-70, H-185, 140, 12, 6); ctx.fill();
        ctx.fillStyle = 'rgba(255,200,100,0.05)'; roundRect(ctx, tx-70, H-185, 140, 4, 6); ctx.fill();
        // Legs
        ctx.fillStyle = '#1E0E04';
        ctx.fillRect(tx-55, H-173, 6, 170); ctx.fillRect(tx+49, H-173, 6, 170);
        // Table items
        // Candle
        ctx.fillStyle = '#E8E0D0'; ctx.fillRect(tx-4, H-202, 8, 18);
        ctx.fillStyle = 'rgba(255,200,100,0.7)'; ctx.beginPath(); ctx.arc(tx, H-204, 4, 0, Math.PI*2); ctx.fill();
        const candleG = ctx.createRadialGradient(tx, H-210, 0, tx, H-210, 30);
        candleG.addColorStop(0, 'rgba(255,210,80,0.22)'); candleG.addColorStop(1, 'rgba(255,180,40,0)');
        ctx.fillStyle = candleG; ctx.fillRect(0,0,W,H);
        // Cups
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; roundRect(ctx, tx-35, H-198, 12, 14, 2); ctx.fill();
        ctx.fillStyle = '#5A2808'; ctx.fillRect(tx-33, H-196, 8, 8);
        if (ti === 1) { roundRect(ctx, tx+22, H-198, 12, 14, 2); ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fill(); ctx.fillStyle='#5A2808'; ctx.fillRect(tx+24,H-196,8,8); }
      });

      // Chair backs in foreground
      [-280, -130, 60, 200].forEach(ox => {
        ctx.fillStyle = '#200C04'; roundRect(ctx, W/2+ox-20, H-280, 36, 96, 5); ctx.fill();
        ctx.fillStyle = '#180902'; ctx.fillRect(W/2+ox-2, H-280, 8, 2);
      });

      // Ambient bokeh balls (out-of-focus warm lights)
      [[W*0.1,H*0.25,50],[W*0.87,H*0.18,40],[W*0.52,H*0.07,35],[W*0.28,H*0.65,25],[W*0.74,H*0.55,30],[W*0.05,H*0.7,22]].forEach(([bx,by,br]) => {
        const rg = ctx.createRadialGradient(bx,by,0,bx,by,br);
        rg.addColorStop(0,'rgba(255,200,80,0.14)'); rg.addColorStop(1,'rgba(255,180,60,0)');
        ctx.fillStyle = rg; ctx.fillRect(0,0,W,H);
      });

      // Floor with wood grain
      const flr = ctx.createLinearGradient(0, H-55, 0, H);
      flr.addColorStop(0, 'rgba(50,25,8,0.6)'); flr.addColorStop(1, 'rgba(30,15,4,0.9)');
      ctx.fillStyle = flr; ctx.fillRect(0, H-55, W, 55);
      // Floor shine strip
      ctx.fillStyle = 'rgba(255,200,80,0.04)'; ctx.fillRect(0, H-55, W, 8);
    });

    // bg-montage: warm abstract memory collage
    this.tex('bg-montage', W, H, (ctx) => {
      // Base gradient
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#1A0820'); bg.addColorStop(0.4, '#300A10'); bg.addColorStop(1, '#160818');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // Glowing memory orbs
      const orbs = [
        { x: W * 0.2, y: H * 0.3, r: 120, c1: 'rgba(255,120,160,0.18)', c2: 'rgba(255,80,120,0)' },
        { x: W * 0.7, y: H * 0.6, r: 160, c1: 'rgba(255,180,80,0.14)', c2: 'rgba(255,150,60,0)' },
        { x: W * 0.5, y: H * 0.15, r: 100, c1: 'rgba(180,120,255,0.16)', c2: 'rgba(140,80,255,0)' },
        { x: W * 0.15, y: H * 0.75, r: 90,  c1: 'rgba(255,200,200,0.1)', c2: 'rgba(255,180,180,0)' },
        { x: W * 0.85, y: H * 0.25, r: 80,  c1: 'rgba(255,140,180,0.12)', c2: 'rgba(255,100,160,0)' },
      ];
      orbs.forEach(o => {
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0, o.c1); g.addColorStop(1, o.c2);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      // Translucent circles (memory echoes)
      [[W*0.25, H*0.4, 60], [W*0.6, H*0.3, 45], [W*0.75, H*0.7, 55], [W*0.4, H*0.65, 35]].forEach(([x,y,r]) => {
        ctx.strokeStyle = 'rgba(255,180,200,0.08)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,200,220,0.04)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r + 15, 0, Math.PI * 2); ctx.stroke();
      });
      // Floating heart silhouettes
      ctx.fillStyle = 'rgba(255,100,140,0.07)';
      ctx.font = '80px serif'; ctx.fillText('♥', W * 0.1, H * 0.55);
      ctx.font = '50px serif'; ctx.fillText('♥', W * 0.75, H * 0.4);
      ctx.font = '40px serif'; ctx.fillText('♥', W * 0.55, H * 0.8);
      // Star dust
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(255,${180 + Math.random() * 75},${200 + Math.random() * 55},${0.05 + Math.random() * 0.1})`;
        ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 2, 0, Math.PI * 2); ctx.fill();
      }
    });

    // bg-home: cozy home interior
    this.tex('bg-home', W, H, (ctx) => {
      // Dark warm room base
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0E0804'); bg.addColorStop(1, '#060402');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Ceiling trim
      ctx.fillStyle = '#1A0E06'; ctx.fillRect(0, 0, W, 20);
      ctx.fillStyle = '#221208'; ctx.fillRect(0, 18, W, 4);

      // Warm window light (main light source) — larger glow
      const wg = ctx.createRadialGradient(W*0.62, H*0.28, 0, W*0.62, H*0.28, 280);
      wg.addColorStop(0, 'rgba(255,215,110,0.32)'); wg.addColorStop(0.4, 'rgba(255,185,65,0.10)'); wg.addColorStop(1, 'rgba(255,150,30,0)');
      ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H);

      // Window on right — golden hour outside
      ctx.fillStyle = '#2A1808'; roundRect(ctx, W*0.55, 35, 210, 270, 8); ctx.fill();
      const winG = ctx.createLinearGradient(W*0.56, 35, W*0.56, 305);
      winG.addColorStop(0, '#A0C8F0'); winG.addColorStop(0.35, '#E8A040'); winG.addColorStop(0.7, '#FF7820'); winG.addColorStop(1, '#FF4010');
      ctx.fillStyle = winG; roundRect(ctx, W*0.565, 42, 194, 256, 5); ctx.fill();
      // Window pane cross
      ctx.fillStyle = '#2A1808';
      ctx.fillRect(W*0.565, 42, 4, 256); ctx.fillRect(W*0.752, 42, 4, 256);
      ctx.fillRect(W*0.565, 168, 194, 4);
      // Curtains
      ctx.fillStyle = 'rgba(100,50,20,0.40)';
      ctx.beginPath(); ctx.moveTo(W*0.545, 35); ctx.lineTo(W*0.565, 35);
      ctx.lineTo(W*0.565, H*0.8); ctx.lineTo(W*0.545, H*0.8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W*0.775, 35); ctx.lineTo(W*0.795, 35);
      ctx.lineTo(W*0.795, H*0.8); ctx.lineTo(W*0.775, H*0.8); ctx.fill();

      // Wall shelf with items (right of window)
      ctx.fillStyle = '#2A1608'; roundRect(ctx, W*0.82, 120, 120, 10, 3); ctx.fill();
      // Small plant on shelf
      ctx.fillStyle = '#1A0C04'; roundRect(ctx, W*0.84, 102, 16, 20, 3); ctx.fill();
      ctx.fillStyle = '#2E5010'; ctx.beginPath(); ctx.arc(W*0.848, 94, 12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#406018'; ctx.beginPath(); ctx.arc(W*0.842, 99, 8, 0, Math.PI*2); ctx.fill();
      // Photo frame on shelf
      ctx.fillStyle = '#3A2010'; roundRect(ctx, W*0.87, 100, 28, 22, 2); ctx.fill();
      ctx.fillStyle = '#C8A060'; roundRect(ctx, W*0.873, 103, 22, 16, 1); ctx.fill();
      ctx.fillStyle = 'rgba(100,60,30,0.3)'; const heartX = W*0.884, heartY = 109;
      ctx.font = '10px serif'; ctx.fillStyle = 'rgba(200,80,100,0.6)'; ctx.fillText('♥', heartX, heartY+3);
      // Small clock
      ctx.fillStyle = '#302010'; roundRect(ctx, W*0.91, 103, 18, 18, 9); ctx.fill();
      ctx.strokeStyle = '#A08050'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(W*0.919, 112, 7, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = '#D0B070'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W*0.919,112); ctx.lineTo(W*0.919,106); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W*0.919,112); ctx.lineTo(W*0.924,115); ctx.stroke();

      // Picture frames on left wall
      const frames = [[70,55,70,56],[160,45,56,60],[80,135,60,50],[155,130,68,52],[235,60,50,56]];
      frames.forEach(([fx, fy, fw, fh]) => {
        ctx.fillStyle = '#2E1A08'; roundRect(ctx, fx-2, fy-2, fw+4, fh+4, 3); ctx.fill();
        ctx.fillStyle = '#1A0E06'; roundRect(ctx, fx, fy, fw, fh, 2); ctx.fill();
        // Abstract photo content
        const pc = `rgba(${140+Math.round(fx*0.3)},${80+Math.round(fy*0.4)},${60+Math.round((fx+fy)*0.1)},0.25)`;
        ctx.fillStyle = pc; roundRect(ctx, fx+4, fy+4, fw-8, fh-8, 2); ctx.fill();
        // Main frame warm glow near window
        ctx.fillStyle = 'rgba(255,195,80,0.05)'; roundRect(ctx, fx, fy, fw, fh, 2); ctx.fill();
      });

      // TV / monitor on entertainment unit
      ctx.fillStyle = '#180E04'; roundRect(ctx, 300, H-200, 200, 120, 6); ctx.fill(); // unit
      ctx.fillStyle = '#0C0808'; roundRect(ctx, 310, H-260, 180, 110, 4); ctx.fill(); // TV body
      const tvG = ctx.createLinearGradient(312, H-258, 312, H-152);
      tvG.addColorStop(0, '#0A1828'); tvG.addColorStop(0.3, '#1A3050'); tvG.addColorStop(1, '#0A0C10');
      ctx.fillStyle = tvG; roundRect(ctx, 314, H-256, 176, 106, 3); ctx.fill();
      // TV screen glow
      const tvGlow = ctx.createRadialGradient(400, H-200, 10, 400, H-200, 120);
      tvGlow.addColorStop(0, 'rgba(60,120,200,0.12)'); tvGlow.addColorStop(1, 'rgba(40,80,160,0)');
      ctx.fillStyle = tvGlow; ctx.fillRect(0, 0, W, H);
      // Small items on unit
      ctx.fillStyle = '#3A2010'; roundRect(ctx, 322, H-208, 24, 10, 2); ctx.fill();
      ctx.fillStyle = '#4A3020'; roundRect(ctx, 352, H-212, 14, 14, 1); ctx.fill();

      // Sofa
      const sofaG = ctx.createLinearGradient(40, H-230, 40, H-130);
      sofaG.addColorStop(0, '#1E1008'); sofaG.addColorStop(1, '#120C04');
      ctx.fillStyle = sofaG; roundRect(ctx, 38, H-228, 340, 96, 12); ctx.fill();
      ctx.fillStyle = '#180E04'; ctx.fillRect(38, H-228, 340, 36); // seat cushion top
      // Sofa cushions
      [65, 155, 245, 330].forEach(ax => {
        ctx.fillStyle = '#0E0804'; roundRect(ctx, ax, H-146, 32, 26, 6); ctx.fill();
        ctx.fillStyle = 'rgba(255,180,80,0.04)'; roundRect(ctx, ax, H-146, 32, 10, 6); ctx.fill();
      });
      // Sofa throw pillow
      ctx.fillStyle = '#4A1830'; roundRect(ctx, 90, H-215, 44, 36, 8); ctx.fill();
      ctx.fillStyle = 'rgba(220,80,120,0.15)'; roundRect(ctx, 92, H-213, 40, 32, 7); ctx.fill();

      // Warm floor rug hint
      const rugG = ctx.createRadialGradient(380, H-80, 20, 380, H-80, 200);
      rugG.addColorStop(0, 'rgba(100,50,20,0.18)'); rugG.addColorStop(1, 'rgba(80,40,15,0)');
      ctx.fillStyle = rugG; ctx.fillRect(0, H-150, W, 150);
      // Floor warmth
      const fg = ctx.createLinearGradient(0, H-45, 0, H);
      fg.addColorStop(0, 'rgba(55,28,8,0.55)'); fg.addColorStop(1, 'rgba(35,18,4,0.85)');
      ctx.fillStyle = fg; ctx.fillRect(0, H-45, W, 45);
    });

    // bg-wedding: ceremony venue white/gold
    this.tex('bg-wedding', W, H, (ctx) => {
      // Ivory base with soft depth gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#FAF6EC'); bg.addColorStop(0.45, '#F0E2C8'); bg.addColorStop(1, '#D8C8A0');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Subtle fabric/panel texture on walls
      for (let wx2 = 0; wx2 < W; wx2 += 55) {
        ctx.fillStyle = 'rgba(200,180,120,0.04)'; ctx.fillRect(wx2, 0, 2, H * 0.8);
      }

      // Dramatic light rays from arch center
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      [[-60,-30],[-30,-10],[0,0],[30,-10],[60,-30]].forEach(([ox,oy]) => {
        const ray = ctx.createLinearGradient(W/2+ox, oy, W/2+ox*4, H);
        ray.addColorStop(0, 'rgba(255,240,180,0.20)'); ray.addColorStop(1, 'rgba(255,230,150,0)');
        ctx.fillStyle = ray;
        ctx.beginPath(); ctx.moveTo(W/2+ox-15, oy); ctx.lineTo(W/2+ox+15, oy);
        ctx.lineTo(W/2+ox*4+80, H); ctx.lineTo(W/2+ox*4-80, H); ctx.fill();
      });
      ctx.restore();

      // Main wedding arch — ornate
      const ax = W/2, ay = 50;
      // Outer arch glow
      const archGlow = ctx.createRadialGradient(ax, ay+200, 60, ax, ay+200, 260);
      archGlow.addColorStop(0, 'rgba(255,230,120,0.20)'); archGlow.addColorStop(1, 'rgba(255,220,100,0)');
      ctx.fillStyle = archGlow; ctx.fillRect(0, 0, W, H);
      // Arch columns
      ctx.fillStyle = '#D0B870';
      ctx.fillRect(ax-208, ay+200, 16, H*0.85-ay-200); ctx.fillRect(ax+192, ay+200, 16, H*0.85-ay-200);
      // Column details
      [ax-208, ax+192].forEach(cx2 => {
        for (let cy2 = ay+210; cy2 < H*0.85-20; cy2 += 28) {
          ctx.fillStyle = 'rgba(255,240,150,0.25)'; ctx.fillRect(cx2+2, cy2, 12, 2);
        }
        // Capital
        ctx.fillStyle = '#E8CC80'; roundRect(ctx, cx2-4, ay+196, 24, 12, 3); ctx.fill();
        ctx.fillRect(cx2-2, ay+200, 20, 4);
      });
      // Arch curve
      ctx.strokeStyle = '#C8A848'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(ax, ay+200, 204, Math.PI, 0); ctx.stroke();
      // Inner detail arch
      ctx.strokeStyle = 'rgba(255,230,120,0.50)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ax, ay+200, 192, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(212,175,72,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(ax, ay+200, 218, Math.PI, 0); ctx.stroke();

      // Keystone diamond at arch top
      ctx.fillStyle = '#E8CC80';
      ctx.save(); ctx.translate(ax, ay-4); ctx.rotate(Math.PI/4);
      ctx.fillRect(-8, -8, 16, 16); ctx.restore();

      // Floral garlands hanging from arch
      const garlandPoints = [];
      for (let i = 0; i <= 20; i++) {
        const a = Math.PI + (i/20)*Math.PI;
        garlandPoints.push({ x: ax + Math.cos(a)*202, y: ay+200 + Math.sin(a)*202 });
      }
      // Garland rope
      ctx.strokeStyle = '#8A6030'; ctx.lineWidth = 2;
      ctx.beginPath();
      garlandPoints.forEach((p, i) => {
        const sway = Math.sin(i * 0.6) * 5;
        if (i === 0) ctx.moveTo(p.x, p.y + sway); else ctx.lineTo(p.x, p.y + sway);
      });
      ctx.stroke();
      // Flowers on garland
      const flowerColors = ['#FF9EAA','#FFB8C4','#FFD4DC','#FFC0CB','#FFAA88','#FFD080'];
      garlandPoints.filter((_,i) => i % 2 === 0).forEach(p => {
        const c = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        for (let pi = 0; pi < 5; pi++) {
          const pa = (Math.PI*2/5)*pi;
          ctx.fillStyle = c;
          ctx.beginPath(); ctx.arc(p.x + Math.cos(pa)*5, p.y + Math.sin(pa)*5, 4, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = '#FFEE60'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
      });

      // Fabric drapes behind arch columns
      [[ax-208, ax-290],[ax+208, ax+290]].forEach(([cx2, ex]) => {
        const drapeG = ctx.createLinearGradient(cx2, 0, ex, 0);
        drapeG.addColorStop(0, 'rgba(240,225,180,0.30)'); drapeG.addColorStop(1, 'rgba(240,225,180,0)');
        ctx.fillStyle = drapeG;
        ctx.beginPath(); ctx.moveTo(cx2, 0); ctx.lineTo(ex, 0); ctx.lineTo(ex, H*0.8); ctx.lineTo(cx2-8, H*0.8);
        // Gentle drape wave
        for (let dy = H*0.8; dy > 0; dy -= 30) {
          ctx.lineTo(cx2 + Math.sin(dy*0.15)*6, dy);
        }
        ctx.fill();
      });

      // Rows of guest chairs (perspective shortening toward center)
      [[W*0.24, 1.0],[W*0.18, 0.88],[W*0.13, 0.75]].forEach(([startX, scale]) => {
        const mirrorX = W - startX;
        [startX, mirrorX].forEach(rx => {
          const dir = rx < W/2 ? 1 : -1;
          for (let ci = 0; ci < 4; ci++) {
            const cx3 = rx + dir * ci * 44 * scale;
            const cy3 = H*0.68 + (1-scale)*H*0.1;
            ctx.fillStyle = `rgba(180,140,80,${0.15 + (1-scale)*0.15})`;
            roundRect(ctx, cx3 - 12*scale, cy3 - 28*scale, 24*scale, 32*scale, 3); ctx.fill();
            ctx.fillStyle = `rgba(140,110,60,${0.1+(1-scale)*0.1})`;
            ctx.fillRect(cx3 - 10*scale, cy3 - 28*scale, 20*scale, 8*scale);
          }
        });
      });

      // Aisle runner (red carpet feel)
      const aisleG = ctx.createLinearGradient(ax, ay+260, ax, H);
      aisleG.addColorStop(0, 'rgba(160,30,40,0.22)'); aisleG.addColorStop(1, 'rgba(120,20,30,0.30)');
      ctx.fillStyle = aisleG; roundRect(ctx, ax-44, ay+262, 88, H-ay-262, 0); ctx.fill();
      // Aisle edge trim
      ctx.strokeStyle = 'rgba(220,180,80,0.30)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ax-44, ay+262); ctx.lineTo(ax-44, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax+44, ay+262); ctx.lineTo(ax+44, H); ctx.stroke();

      // Flower petal scatter (foreground depth)
      for (let i = 0; i < 35; i++) {
        const px = Math.random()*W, py = H*0.4 + Math.random()*H*0.6;
        ctx.fillStyle = `rgba(255,${150+Math.random()*80},${155+Math.random()*80},${0.18+Math.random()*0.22})`;
        ctx.beginPath(); ctx.ellipse(px, py, 4+Math.random()*5, 2+Math.random()*3, Math.random()*Math.PI*2, 0, Math.PI*2); ctx.fill();
      }

      // Gold shimmer veil over whole scene
      const gg = ctx.createRadialGradient(ax, H*0.30, 30, ax, H*0.30, 320);
      gg.addColorStop(0, 'rgba(255,225,110,0.10)'); gg.addColorStop(1, 'rgba(255,210,90,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);

      // Floor / foreground depth
      const flr = ctx.createLinearGradient(0, H-50, 0, H);
      flr.addColorStop(0, 'rgba(180,155,105,0.25)'); flr.addColorStop(1, 'rgba(155,130,85,0.50)');
      ctx.fillStyle = flr; ctx.fillRect(0, H-50, W, 50);
    });

    // bg-present: modern apartment, present day
    this.tex('bg-present', W, H, (ctx) => {
      // Warm modern interior
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1A1208'); bg.addColorStop(1, '#0E0A04');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // Large window (golden hour)
      const ww = 380, wh = 310, wx = W / 2 - ww / 2, wy = 30;
      ctx.fillStyle = '#2C1C08'; roundRect(ctx, wx - 12, wy - 12, ww + 24, wh + 24, 6); ctx.fill();
      // Outside sky gradient (sunset)
      const sky = ctx.createLinearGradient(wx, wy, wx, wy + wh);
      sky.addColorStop(0, '#1A2A5A'); sky.addColorStop(0.4, '#E85A20');
      sky.addColorStop(0.6, '#FF9040'); sky.addColorStop(1, '#FFD080');
      ctx.fillStyle = sky; roundRect(ctx, wx, wy, ww, wh, 4); ctx.fill();
      // City silhouette
      ctx.fillStyle = '#0A0E18';
      const buildings = [[wx, wy + 160, 60, 150], [wx + 55, wy + 180, 50, 130], [wx + 100, wy + 130, 70, 180],
                         [wx + 168, wy + 150, 55, 160], [wx + 222, wy + 120, 80, 190],
                         [wx + 300, wy + 170, 50, 140], [wx + 348, wy + 145, 45, 165]];
      buildings.forEach(([bx, by, bw, bh]) => { ctx.fillRect(bx, by, bw, bh); });
      // Building windows
      ctx.fillStyle = 'rgba(255,220,120,0.35)';
      buildings.forEach(([bx, by, bw]) => {
        for (let wy2 = by + 10; wy2 < wy + wh - 10; wy2 += 16) {
          for (let wx2 = bx + 6; wx2 < bx + bw - 6; wx2 += 12) {
            if (Math.random() > 0.35) { ctx.fillRect(wx2, wy2, 6, 8); }
          }
        }
      });
      // Window light spill into room
      const spill = ctx.createRadialGradient(W / 2, wy + wh, 20, W / 2, wy + wh, 320);
      spill.addColorStop(0, 'rgba(255,180,80,0.2)'); spill.addColorStop(1, 'rgba(255,150,40,0)');
      ctx.fillStyle = spill; ctx.fillRect(0, 0, W, H);
      // Modern furniture
      ctx.fillStyle = '#1A1008'; roundRect(ctx, 40, H - 150, 280, 60, 8); ctx.fill();  // sofa
      ctx.fillStyle = '#140C04'; ctx.fillRect(40, H - 150, 280, 20);
      ctx.fillStyle = '#200E04'; roundRect(ctx, W - 220, H - 80, 160, 10, 5); ctx.fill(); // coffee table
      ctx.fillStyle = '#180C04'; ctx.fillRect(W - 200, H - 70, 6, 70); ctx.fillRect(W - 80, H - 70, 6, 70);
      // Plant
      ctx.fillStyle = '#1A0E04'; roundRect(ctx, W - 80, H - 140, 28, 40, 4); ctx.fill();
      ctx.fillStyle = '#2A4010'; ctx.beginPath(); ctx.arc(W - 66, H - 150, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3A5818'; ctx.beginPath(); ctx.arc(W - 72, H - 158, 16, 0, Math.PI * 2); ctx.fill();
      // Floor warmth
      const floor = ctx.createLinearGradient(0, H - 40, 0, H);
      floor.addColorStop(0, 'rgba(60,35,10,0.4)'); floor.addColorStop(1, 'rgba(40,25,8,0.7)');
      ctx.fillStyle = floor; ctx.fillRect(0, H - 40, W, 40);
    });
  }
}

