import Phaser from 'phaser';
import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter1Scene — "A Face in the Feed"
 *
 * 2020. Lockdown. The world is on screens.
 * A compact, atmospheric night scene — player walks toward a glowing desk,
 * the first sight of her face in a photo on screen.
 *
 * Design goals:
 *  - Tight, close camera (zoom 1.72→2.0) so assets fill the screen
 *  - Dark midnight atmosphere — tiles are textural backdrop, not the focus
 *  - Rich atmospheric glow pools painted over the world
 *  - Cinematic intro dialogue before gameplay begins
 */
export class Chapter1Scene extends ChapterScene {
  constructor() {
    super('Chapter1', {
      cols:        12,   // compact world — 768px wide
      rows:        9,    // compact world — 576px tall
      mood:        'office',
      zoom:        1.72, // close-up from the start
      targetZoom:  2.00, // zooms in gently during intro walk
      followLerp:  0.055,
      drift:       true,
      fadeInMs:    1400,
    });
  }

  // Tile indices from Kenney roguelike spritesheet (57 cols × 31 rows, 0-based)
  static TILES = {
    STONE: 119,  // row 2 col 5 — warm stone floor
    DIRT:  518,  // row 9 col 5 — earthy border strip
  };

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — cinematic dark backdrop + tilemap as subtle texture
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    const T = Chapter1Scene.TILES;

    // ── Environment preset — midnight indoor office ─────────────────
    // Ceiling: near-void black — upper half of screen.
    // Wall: 50% of screen height — equal weight with the floor.
    // Floor: lower 50% — all gameplay props sit cleanly here.
    // Color grade: cool blue-violet resonates with the screen glow focal point.
    // Vignette: tight sides — enclosed lockdown apartment feeling.
    this.env = EnvironmentManager.apply(this, 'INDOOR', {
      ceiling: {
        topColor: 0x01000A,
        midColor: 0x05020F,
        botColor: 0x0A0618,
        h:        0.44,    // gradient covers almost the full wall band
      },
      wall: {
        color: 0x0A0618,
        h:     0.52,       // wall to midpoint — equal visual weight with the floor
      },
      // Windows centred in the wall band.
      windows: {
        style:     'home',
        positions: [0.26, 0.74],
        w:         96,
        h:         74,
        yFrac:     0.24,   // comfortable centre of the 50% wall band
      },
      trim: {
        color: 0x1A1028,
        alpha: 0.10,
        yFrac: 0.50,       // sits right at the wall/floor join
      },
      wainscoting: {
        color: 0x0A0C18,
        alpha: 0.55,
      },
      chairRail: {
        enabled: false,
      },
      floor: {
        topColor:    0x1A0E24,
        botColor:    0x020108,
        startFrac:   0.50,         // floor is exactly the lower half
        featherH:    0.030,
        featherAlpha: 0.30,
      },
      colorGrade: {
        color: 0x2211AA,
        alpha: 0.015,
        blend: 'OVERLAY',
      },
      vignette: {
        size:   100,
        color:  0x01000A,
        alphaL: 0.55,
        alphaR: 0.55,
        alphaT: 0.32,
        alphaB: 0.40,
      },
      // Physics barrier: rows 0-1 are wall/ceiling — player stays below.
      wallBoundRows: 2,
    });

    // Apply the wallBoundRows constraint as an actual physics world bound.
    // IndoorEnvironment receives wallBoundRows in cfg but does not enforce it;
    // enforcing it here prevents the player walking into the ceiling band.
    const wallRowPx = 2 * this._cfg.cellSize;
    this.physics.world.setBounds(0, wallRowPx, this.worldW, this.worldH - wallRowPx);

    // ── Tilemap — 16px roguelike tiles as subtle stone texture ──────
    // worldW = 12×64 = 768 → 48 tiles; worldH = 9×64 = 576 → 36 tiles
    const MAP_W = Math.round(this.worldW / 16);  // 48
    const MAP_H = Math.round(this.worldH / 16);  // 36

    this.map = this.make.tilemap({ tileWidth: 16, tileHeight: 16, width: MAP_W, height: MAP_H });
    const tileset = this.map.addTilesetImage('roguelikeTiles', 'roguelike-tiles', 16, 16, 0, 1);

    if (tileset) {
      // Ground layer — near-invisible midnight tone; acts as floor texture
      this.groundLayer = this.map.createBlankLayer('ground', tileset);
      this.groundLayer.setDepth(-300).fill(T.STONE);
      this.groundLayer.setTint(0x050215);  // near-black indigo

      // Path layer — whisper of cobblestone along row 4 center
      this.pathLayer = this.map.createBlankLayer('path', tileset);
      this.pathLayer.setDepth(-290);
      const pathTop = 15, pathBot = 20;
      const pxStart = 3, pxWidth = MAP_W - 6;
      this.pathLayer.fill(T.DIRT,  pxStart, pathTop, pxWidth, 1);
      this.pathLayer.fill(T.DIRT,  pxStart, pathBot, pxWidth, 1);
      this.pathLayer.fill(T.STONE, pxStart, pathTop + 1, pxWidth, pathBot - pathTop - 1);
      this.pathLayer.setTint(0x1A0905);  // warm very-dark amber — visible only in light

      // Light2D pipeline so point lights cast visible warmth on the tiles
      this.groundLayer.setPipeline('Light2D');
      this.pathLayer.setPipeline('Light2D');
    } else {
      console.warn('[Chapter1] roguelike-tiles not found — tilemap skipped.');
    }

    // ── Atmospheric blobs — scene identity painted above the env ───
    // These sit above the IndoorEnvironment layers (depth 8–11) but well
    // below gameplay objects (depth 0+).
    const WW = this.worldW, WH = this.worldH;

    // ── GROUND VARIATION — world-space layers above the env floor (-60) ─────
    // All placed between depth -58 and -2 so they sit above the env floor
    // gradient/plank texture but below every gameplay prop.
    // These use only additive blends + transparency — no MULTIPLY needed,
    // making them fully compatible with the Light2D pipeline.

    // 1. Floorboard seam lines — horizontal Graphics stripes across the full
    //    world width.  Very dark so they're only visible in well-lit areas,
    //    which means the lamp and screen glows will 'reveal' them naturally.
    const seamG = this.add.graphics().setDepth(-58);
    seamG.lineStyle(1, 0x000000, 0.28);
    const floorStartY = WH * 0.50;  // matches floor.startFrac 0.50
    const seamSpacing = 18;          // pixels between planks
    for (let y = floorStartY; y < WH; y += seamSpacing) {
      seamG.beginPath();
      seamG.moveTo(0, y);
      seamG.lineTo(WW, y);
      seamG.strokePath();
    }
    // Subtle vertical grain lines every 96px — suggest wide planks
    seamG.lineStyle(1, 0x000000, 0.10);
    for (let x = 48; x < WW; x += 96) {
      seamG.beginPath();
      seamG.moveTo(x, floorStartY);
      seamG.lineTo(x + 4, WH);  // slight diagonal = natural wood grain lean
      seamG.strokePath();
    }

    // 2. Screen-glow floor reflections — the two light sources (lamp left,
    //    her screen right) cast elongated elliptical reflections on the floor.
    //    ADD blend: they will only brighten when the floor gets lit.

    // Lamp warm reflection pool — amber, short ellipse close to the lamp
    this.add.image(WW * 0.13, WH * 0.76, 'light-blob')
      .setScale(1.8, 0.28).setAlpha(0.10).setTint(0xFF9933)
      .setBlendMode('ADD').setDepth(-56);

    // Screen blue reflection — elongated, traces the path toward the player
    this.add.image(WW * 0.78, WH * 0.80, 'light-blob')
      .setScale(3.0, 0.35).setAlpha(0.12).setTint(0x4488CC)
      .setBlendMode('ADD').setDepth(-56);

    // Wide mid-floor cool tint — moonlight through the windows
    this.add.image(WW * 0.50, WH * 0.72, 'light-blob')
      .setScale(5.5, 0.50).setAlpha(0.06).setTint(0x8899CC)
      .setBlendMode('ADD').setDepth(-57);

    // 3. Scuff / wear decals — dark semi-transparent ellipses that suggest
    //    foot-traffic wear on the floor. Near-black fill, very low alpha so
    //    they only read as subtle texture variation, not dark blobs.
    const wearG = this.add.graphics().setDepth(-55);
    const wearSpots = [
      // [cx, cy, rx, ry, rotation, alpha]
      [WW * 0.28, WH * 0.82, 22, 6,  0.10, 0.16],  // his desk approach path
      [WW * 0.42, WH * 0.78, 18, 5, -0.12, 0.12],
      [WW * 0.55, WH * 0.85, 26, 7,  0.08, 0.14],  // centre crossing
      [WW * 0.70, WH * 0.80, 20, 6,  0.14, 0.18],  // her desk approach
      [WW * 0.85, WH * 0.76, 16, 5, -0.06, 0.13],
      [WW * 0.10, WH * 0.88, 14, 4,  0.0,  0.10],  // left corner
      [WW * 0.93, WH * 0.87, 14, 4,  0.0,  0.12],  // right corner
    ];
    wearSpots.forEach(([cx, cy, rx, ry, rot, al]) => {
      wearG.save();
      const cos = Math.cos(rot), sin = Math.sin(rot);
      // Phaser Graphics doesn't support transform matrix directly — approximate
      // by drawing a slightly skewed ellipse using fillEllipse with scaleX/Y.
      wearG.fillStyle(0x000000, al);
      wearG.fillEllipse(cx + Math.cos(rot) * 2, cy + Math.sin(rot) * 2, rx * 2, ry * 2);
      wearG.restore();
    });

    // 4. Colour temperature break — two narrow horizontal bands of slightly
    //    different warmth to shatter the uniform gradient.  Very low alpha.
    //    Warm strip near the wall join (lamp-side), cool strip toward camera.
    const bandG = this.add.graphics().setDepth(-53);
    // Warm amber band — just below the wall/floor join (floor top ~50%)
    bandG.fillStyle(0xFFBB55, 0.035);
    bandG.fillRect(0, WH * 0.52, WW, WH * 0.06);
    // Cool violet mid-floor band — suggests ambient city-light coolness
    bandG.fillStyle(0x3322AA, 0.028);
    bandG.fillRect(0, WH * 0.68, WW, WH * 0.08);
    // Darkest near-camera strip — depth cue, floor falls off to black
    bandG.fillStyle(0x000000, 0.18);
    bandG.fillRect(0, WH * 0.88, WW, WH * 0.12);

    // Subtle indigo ceiling bleed — just enough to colour the air, not flood the room
    this.add.image(WW * 0.5, WH * 0.12, 'light-blob')
      .setScale(6.0).setAlpha(0.14).setTint(0x1800AA)
      .setBlendMode('ADD').setDepth(8);

    // Muted violet atmosphere — barely a suggestion of loneliness, not a flood
    this.add.image(WW * 0.4, WH * 0.38, 'light-blob')
      .setScale(6.0).setAlpha(0.07).setTint(0x880055)
      .setBlendMode('ADD').setDepth(9);

    // Narrow amber path streak — a whisper of presence, not a billboard
    const pathGlow = this.add.image(WW * 0.50, WH * 0.52, 'light-blob')
      .setScale(4.5, 1.8).setAlpha(0.12).setTint(0xBB4400)
      .setBlendMode('ADD').setDepth(10);
    this.tweens.add({
      targets: pathGlow, alpha: { from: 0.12, to: 0.05 },
      duration: 4800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    // Note: no footer shadow — it was MULTIPLY blend and darkened the window glows.

    // ── Lighting — moody ambient + warm player halo ─────────────────
    // configure() writes to the base fields that SceneLighting.update() reads,
    // so the overrides persist across every frame (unlike direct object mutation).
    // Saved to _lightingConfigure so ChapterScene's resize handler can re-apply
    // them after a rebuild (orientation change on mobile).
    this._lightingConfigure = {
      ambientColor:   0x0E0A1A,  // deep purple-black ambient
      lightIntensity: 0.28,      // was 0.55 — WebGL + blob + ambGlow all stack; avoid blown-out searchlight
      lightRadius:    110,       // was 190 — tighter falloff keeps light close to player
      blobScale:      1.5,       // was 3.2 — ADD blend on near-black floor is very sensitive to scale
      blobAlpha:      0.05,      // was 0.14 — breathing adds +0.03, so peak is 0.08 — subtle halo
      blobTint:       0xFFCC88,
      ambGlowAlpha:   0.02,      // was 0.05 — barely perceptible warmth
      ambGlowScale:   4.0,       // was 6.5
      ambGlowTint:    0xFFAA66,
    };
    this.lighting.configure(this._lightingConfigure);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — cinematic scale, meaningful placement
  //  World: 12 cols × 9 rows. Path center: grid row 4 (y≈288).
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    const shadowP = { width: 32, height:  8, offsetY:  8, alpha: 0.28 };
    const shadowS = { width: 22, height:  6, offsetY:  6, alpha: 0.22 };

    // Windows are built by IndoorEnvironment._buildWindows() via EnvironmentManager.apply()
    // in buildGround(). Do NOT recreate them here — they are screen-space env layers.

    // ── LEFT ZONE: his solitary apartment corner ───────────────────
    //    Mood: dim warm amber, lonely but cozy

    // Floor lamp — mid floor, staggered forward of the desk
    this.placeAt(1.6, 5.6, 'k-lamp-floor', {
      scale: 0.74, shadow: { width: 18, height: 6, offsetY: 8, alpha: 0.24 },
    });
    const lampPos = this.grid(1.6, 5.6);
    const lampHalo = this.add.image(lampPos.x + 8, lampPos.y - 75, 'light-blob')
      .setScale(1.8).setAlpha(0.14).setTint(0xFFDD88)
      .setBlendMode('ADD').setDepth(17);
    this.tweens.add({
      targets: lampHalo, alpha: { from: 0.14, to: 0.07 }, scale: { from: 1.8, to: 2.1 },
      duration: 2100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    if (this.lighting._light2DEnabled)
      this._lampLight = this.lights.addLight(lampPos.x + 8, lampPos.y - 32, 100, 0xFFDD88, 0.85);

    // His desk — row 5.6 puts the body below the wall/floor join, firmly on the floor
    const hisDeskRow = 5.6;
    const hisDesk = this.placeAt(2.8, hisDeskRow, 'k-desk', { scale: 0.76, shadow: shadowP, ySort: false });
    const cs = this._cfg.cellSize;
    if (hisDesk) hisDesk.setDepth(330);  // 330 < player spawn depth 352 — always behind
    const hisDeskDepth = 332;            // laptop sits just above desk, still behind player
    const hisLaptop = this.placeAt(2.8, 5.15, 'k-laptop', {
      scale: 0.60, shadow: shadowS, ySort: false,
    });
    if (hisLaptop) hisLaptop.setDepth(hisDeskDepth);
    // Desk chair — pulled close to the desk
    this.placeAt(2.8, 5.9, 'k-chair', { scale: 0.68, shadow: shadowS });

    // Bookcase pinned against the back wall — wall band depth, not Y-sorted
    const hisBC = this.placeAt(1.2, 3.5, 'k-bookcase', { scale: 0.44, ySort: false });
    if (hisBC) hisBC.setDepth(-80).setAlpha(0.70);
    // Floor plant — low on screen, close to camera
    this.placeAt(1.0, 7.0, 'k-plant-pot', { scale: 0.52, shadow: shadowS });

    // WFH TV — TV stand surface first, then the screen on top
    this.placeAt(4.0, 6.1, 'k-side-table', { scale: 0.58, shadow: shadowS });
    const tvStandDepth = 6.1 * cs + cs / 2 + 2;  // pin TV above stand surface
    const tv = this.placeAt(4.0, 6.0, 'k-television', { scale: 0.62, shadow: shadowS, ySort: false });
    if (tv) tv.setDepth(tvStandDepth);
    const tvPos = this.grid(4.0, 6.0);
    this.add.image(tvPos.x + 8, tvPos.y - 12, 'light-blob')
      .setScale(1.8, 0.9).setAlpha(0.07).setTint(0x3366AA)
      .setBlendMode('ADD').setDepth(12);

    // ── DIVIDER ZONE: subtle coffee table — breaks the empty centre floor ──
    // Scale 0.50, low alpha — present enough to fill the gap, not dominant.
    const dividerTable = this.placeAt(5.6, 6.2, 'k-side-table', { scale: 0.50, shadow: shadowS });
    if (dividerTable) dividerTable.setAlpha(0.72);
    // No rug — the dark floor between the desks should breathe.

    // ── RIGHT ZONE: her glowing desk — the FOCAL POINT ─────────────
    //    Mood: cool blue-white, electric, social-media-lit
    const target = this.grid(9.5, 5.5);

    // Her desk — row 5.5 brings it onto the floor band; depth-pinned so player stays in front
    const herDeskRow = 5.5;
    const herDeskObj = this.placeAt(9.5, herDeskRow, 'k-desk', { scale: 0.84, shadow: shadowP, ySort: false });
    if (herDeskObj) herDeskObj.setDepth(340);  // 340 < player spawn depth 352

    const herDeskDepth = 342;  // laptop/photos pin just above desk, still behind player
    const screen = this.placeAt(9.5, 5.05, 'k-laptop', {
      scale: 0.82, shadow: shadowS, lit: false, ySort: false,
    });
    if (screen) screen.setDepth(herDeskDepth);

    // Printed photos on her desk — the face in the feed
    const photos = this.placeAt(9.9, 5.05, 'obj-printedphotos', {
      scale: 0.38, shadow: shadowS, ySort: false,
    });
    if (photos) photos.setDepth(herDeskDepth + 2);

    // Screen glow — the FOCAL POINT of the entire scene.
    // Depth above laptop (herDeskDepth+1) so the glow emanates from the screen surface,
    // not buried behind the desk. ADD blend — lights up the desk and laptop around it.
    this._screenGlow = this.add.image(target.x - 20, target.y - 50, 'light-blob')
      .setScale(2.2).setAlpha(0.35).setTint(0xAADDFF)
      .setBlendMode('ADD').setDepth(herDeskDepth + 1);
    this.tweens.add({
      targets: this._screenGlow,
      scale: { from: 2.2, to: 2.8 }, alpha: { from: 0.35, to: 0.15 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    if (this.lighting._light2DEnabled)
      this._screenLight = this.lights.addLight(target.x - 20, target.y - 52, 110, 0xBBDDFF, 0.80);

    // Wide cool floor pool — blue light from her screen spills onto the floor,
    // painting the path ahead in icy digital light.
    if (this.textures.exists('light-blob')) {
      this.add.image(target.x - 10, target.y + 15, 'light-blob')
        .setScale(4.2, 1.6).setAlpha(0.10).setTint(0x5588CC)
        .setBlendMode('ADD').setDepth(13);
    }

    // Chair pulled close to the desk
    this.placeAt(9.6, 5.7, 'k-chair', { scale: 0.72, shadow: shadowS });

    // Bookcase pinned against the back wall — wall band depth, not Y-sorted
    const herBC = this.placeAt(11.4, 3.5, 'k-bookcase', { scale: 0.44, ySort: false });
    if (herBC) herBC.setDepth(-80).setAlpha(0.70);
    // Floor plant — lower floor zone, near-camera
    this.placeAt(11.0, 6.8, 'k-plant-pot', {
      scale: 0.58, shadow: shadowS,
    });

    // ── LARGE DESK GLOW — concentric warm + rose halo ──────────────
    // Warm ambient halo — supports the screen glow but never competes with it
    // Depths 18/19/20: stacked above windows (16), ordered to avoid Z-fighting
    this._mainGlow = this.add.image(target.x - 10, target.y - 30, 'light-blob')
      .setScale(2.0).setAlpha(0.11).setTint(0xFFCC66)
      .setBlendMode('ADD').setDepth(18);
    this.tweens.add({
      targets: this._mainGlow,
      scale:  { from: 2.0, to: 2.7  },
      alpha:  { from: 0.11, to: 0.04 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Rose accent — a whisper of her warmth, barely perceptible
    this._pinkGlow = this.add.image(target.x - 6, target.y - 32, 'light-blob')
      .setScale(1.4).setAlpha(0.16).setTint(0xFF88CC)
      .setBlendMode('ADD').setDepth(19);
    this.tweens.add({
      targets: this._pinkGlow,
      scale:  { from: 1.4, to: 1.9  },
      alpha:  { from: 0.16, to: 0.04 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    if (this.lighting._light2DEnabled)
      this._targetLight = this.lights.addLight(target.x - 10, target.y - 30, 200, 0xFFCC99, 1.4);

    if (this.textures.exists('particle-glow')) {
      this.add.particles(target.x - 14, target.y - 32, 'particle-glow', {
        x: { min: -24, max: 24 }, y: 0,
        speedY: { min: -20, max: -7 }, speedX: { min: -5, max: 5 },
        scale:  { start: 0.12, end: 0 },
        alpha:  { start: 0.40, end: 0 },
        tint:   [0xCCEEFF, 0xAABBFF, 0xFFEEFF],  // digital blue — pixels from her feed
        lifespan: { min: 2000, max: 3800 },
        frequency: 320, quantity: 1, blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 2));
    }

    // Proximity zone — NOT registered yet; registration deferred to buildFX.
    // static: true — zone is invisible (no rendering), depth only needs to be
    // set once; keeps it out of the per-frame _ySortItems update list.
    this._hitZone = this.add.zone(target.x, target.y, 130, 90);
    this.depthMgr.addYSort(this._hitZone, { static: true });

    // ── FOREGROUND OCCLUSION ───────────────────────────────────────
    // Partial props cropped at the lower screen edge — only their tops are
    // visible, naturally framing the scene without blocking gameplay.
    //
    // Sizing guide: world rows = 9 (576px), camera zoom ≈ 1.72×
    //   → each world-px appears as 1.72px on screen.
    //   foliage-tree3 original ≈ 120px tall; scale 0.72 → 86px world → ~148px screen.
    //   Placed at row 8.8 (y ≈ 563 in world), anchor at bottom (origin 0.8):
    //   sprite top ≈ 563 − 86 = 477 world → comfortably peeks ~100px above floor.
    //
    // Fixed depth 601 — sits above the player's Y-sort ceiling (~576).
    const fgEl = (col, row, key, sc, tint, al, slot = 1) => {
      const p = this.grid(col, row);
      return this.add.image(p.x, p.y, key)
        .setOrigin(0.5, 0.85)   // 0.85 not 1.0 — lets base bleed slightly below frame
        .setScale(sc)
        .setTint(tint)
        .setAlpha(al)
        .setDepth(this.layers.depth('foreground', slot));
    };

    // Left corner plant — tall indoor floor plant, leans into the lamp zone
    fgEl(0.5,  8.8, 'foliage-tree9', 0.72, 0x0A1510, 0.72);

    // Left path accent — low rock, peeks just above floor line
    fgEl(3.6,  8.6, 'foliage-rock1', 0.80, 0x100C18, 0.55, 2);

    // Centre divider — round bush crop, visually separates the two desk zones
    fgEl(6.0,  8.8, 'foliage-bush1', 0.90, 0x0A100A, 0.60);

    // Right path accent — mirroring left rock
    fgEl(8.6,  8.6, 'foliage-rock2', 0.75, 0x120C18, 0.52, 2);

    // Right corner plant — flipped for symmetry with coloured tint variation
    fgEl(11.5, 8.8, 'foliage-tree9', 0.68, 0x0A1510, 0.68).setFlipX(true);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    const cs = this._cfg.cellSize;
    // Start at col 3.5 row 5.8 — clearly on the floor in front of his desk (col 2.8, row 5.6)
    this._player = this.charSystem.createPlayer(
      { playerStart: this.grid(3.5, 5.8) },
      { texture: 'char-male', displayW: 40, displayH: 62 },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.50, dynamic: true,
    });

    // Apply camera offset here so it takes effect on the first frame,
    // before buildFX() fires (avoids a one-frame camera jump on load).
    const vH = this.scale.height;
    // Portrait phones expose ~7–8 world rows at once (world is only 9 rows tall).
    // A larger fraction pulls the camera higher so the action zone (rows 3–7)
    // fills the centre of the screen rather than empty dark floor filling the
    // bottom 35 % of the viewport. Desktop / iPad / landscape stays at 0.10.
    const isPortrait = vH > this.scale.width;
    const offsetFrac = isPortrait ? 0.18 : 0.10;
    this.cam.configure({
      baseOffsetY: -Math.round(vH / (this._cfg.targetZoom ?? this._cfg.zoom ?? 2.0) * offsetFrac),
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FX — ambient particles + intro dialogue
  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    // Dreamy upward motes — memory surfacing from the floor
    if (this.textures.exists('particle-glow')) {
      this.add.particles(this.worldW / 2, this.worldH + 10, 'particle-glow', {
        x:       { min: -this.worldW / 2, max: this.worldW / 2 },
        y:       0,
        speedY:  { min: -22, max: -6 },
        speedX:  { min: -5, max: 5 },
        scale:   { start: 0.08, end: 0 },
        alpha:   { start: 0.18, end: 0 },
        tint:    [0xFFEEDD, 0xFFCCEE, 0xCCDDFF],
        lifespan:{ min: 4000, max: 6500 },
        frequency: 380, quantity: 1, blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 20));
    }

    // Intro dialogue fires after chapter-intro overlay fades (~4600ms).
    // 3000ms: dialogue appears while overlay is fading out — feels seamless.
    // Fallback at +12000ms: desk unlocks regardless, in case player skipped or
    // dialogue system had any issue showing lines.
    this.time.delayedCall(3000, () => {
      const lines = storyData.dialogues?.ch1_intro;
      if (lines) {
        this.dialogue.start(lines, () => this._registerProfileTrigger());
      } else {
        this._registerProfileTrigger();
      }
    });
    // Safety fallback — register trigger even if intro dialogue was never advanced
    this.time.delayedCall(12000, () => this._registerProfileTrigger());
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION — reaching the glowing desk
  // ═══════════════════════════════════════════════════════════════════

  /** Called after ch1_intro completes (or after fallback timer) — desk becomes interactive. */
  _registerProfileTrigger() {
    if (this._triggerRegistered) return;
    this._triggerRegistered = true;
    if (!this._hitZone) return;
    this.proximity.register({
      gameObject:    this._hitZone,
      id:            'her_profile',
      label:         'A Face in the Feed',
      triggerRadius: 72,
      glowRadius:    160,
      skipUnlockSFX: true,  // discovery stinger replaces the generic memory-unlock arpeggio
      onTrigger:     () => this._onProfileReached(),
    });
  }

  _onProfileReached() {
    // 320ms delay — lets the flash + camera-bump land first, then the stinger
    // hits clean on its own: the sonic equivalent of a held breath before wonder.
    this.time.delayedCall(320, () => audioManager.playStinger('discovery'));
    this.cam.zoomPulse(1.5, 1200);

    if (this._mainGlow) {
      this.tweens.killTweensOf(this._mainGlow);
      this.tweens.add({
        targets: this._mainGlow,
        alpha: 0.5, scale: 6,
        duration: 700, yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
    if (this._pinkGlow) {
      this.tweens.killTweensOf(this._pinkGlow);
      this.tweens.add({
        targets: this._pinkGlow,
        alpha: 0.35, scale: 3.5,
        duration: 700, yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
    if (this._screenGlow) {
      this.tweens.killTweensOf(this._screenGlow);
      this.tweens.add({
        targets: this._screenGlow,
        alpha: 0.75, scale: 4.0,
        duration: 500, yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
    if (this._targetLight) {
      this._targetLight.setIntensity(2.0);
      this._targetLight.setRadius(300);
    }

    const lines = storyData.dialogues?.ch1_found;
    if (lines) {
      this.dialogue.start(lines, () => this._chapterComplete());
    } else {
      this._chapterComplete();
    }

    // Safety-net fallback — fires only when dialogue has already ended
    // (user stopped mid-scene). ch1_found has 6 lines that typically take
    // 20-30 s to click through, so the timer must never race with active
    // dialogue. 45 s is a true stuck-detection threshold, not a speed limit.
    this.time.delayedCall(45000, () => {
      if (this.sys?.isActive() && !this.dialogue?.active) this._chapterComplete();
    });
  }

  _chapterComplete() {
    this._guardTransition(() => {
      goToChapter(this, 1);
    });
  }

  onUpdate(time, delta) {
    this.env?.update(this.cameras.main.scrollX);
  }

  onShutdown() {
    // Remove the three static prop lights registered directly with Phaser's LightsPlugin.
    // Without this, they accumulate across scene restarts (each restart adds 3 more).
    [this._lampLight, this._screenLight, this._targetLight].forEach(l => {
      if (l) try { this.lights.removeLight(l); } catch (_) {}
    });
    this.dialogue?.destroy();
    this.env?.destroy();
  }
}
