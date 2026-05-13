import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter5Scene — "The Girl in the Hoodie"
 *
 * A golden afternoon garden. Aashna stands between two framing pines at
 * the far side of a warm clearing — visible from the very first frame.
 * The player's entire journey is one magical walk toward her.
 *
 * Spatial logic (12 cols × 8 rows, cell 64px = 768 × 512):
 *
 *   At zoom 1.72 the viewport shows ~558px of the 768px world width.
 *   Camera is clamped left at 0. Player at col 1.5 (x=128) — camera
 *   shows x=0–558. Aashna at col 7.5 (x=512) lands at exactly 512px,
 *   placing her at the edge of vision from the first step: she is the
 *   destination the player sees and walks toward.
 *
 *   Visual hierarchy:
 *     PRIMARY    — Aashna + rose glow (furthest, largest glow)
 *     SECONDARY  — gateway pines framing her (col 6.2 & col 8.8, row 2.4)
 *     TERTIARY   — bench (midway pause), flower breadcrumbs (path guides)
 *     BACKGROUND — large canopy trees at corners, one bush at her feet
 */
export class Chapter4Scene extends ChapterScene {
  constructor() {
    super('Chapter4', {
      cols:       12,
      rows:       8,
      mood:       'warm',
      zoom:       1.60,
      targetZoom: 1.70,
      followLerp: 0.055,
      drift:      true,
      fadeInMs:   1600,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND — delegates to EnvironmentManager (OPEN preset)
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // All sky, parallax, ground, vignette, grain, and color grade
    // are now handled by the reusable OpenEnvironment preset.
    //
    // PALETTE — Alto's Adventure principle: every layer is a muted harmonic
    // of one hue family. Warm amber dominates; each layer de-saturates as
    // it recedes, creating natural atmospheric depth without a colour shift.
    // Portrait mobile: the two viewport-locked foreground silhouette trees are
    // built at scale 4.2 (correct for 16:9 widescreen). On a portrait phone
    // (~390px wide) that makes each tree ~600px wide — they collapse the entire
    // scene to a narrow keyhole. Reduce scale on portrait only.
    const _isPortrait = this.scale.height > this.scale.width;
    this.env = EnvironmentManager.apply(this, 'OPEN', {
      sky: {
        topColor: 0x0C1A28,   // morning steel-blue zenith — dawn not yet broken
        midColor: 0x6A3020,   // muted terracotta mid-sky — warmth rising
        botColor: 0xF5C870,   // golden horizon — Aashna is the warmth ahead
        bgColor:  0x0C1A28,
      },
      // Mountains: muted warm terracotta dust — clearly different from hills
      mountains: { tint: 0xA06840, alpha: 0.40 },
      // MidHills: deeper sage — clear step darker than mountains
      midHills:  { tint: 0x627548, alpha: 0.55 },
      // Hills: medium olive-green — the main landscape colour
      hills:     { tint: 0x5A7A3A, alpha: 0.68 },
      // Treeline: very dark warm near-black — strong silhouette against sky
      treeline:  { tint: 0x1E1A0A, alpha: 0.88 },
      // Ground strip: thin, very dark — only exists to graduate to black
      ground:    { topColor: 0x3A2810, botColor: 0x080402, vigAlpha: 0.60 },
      // Horizon: fully disabled — gradient bands create visible seam lines
      horizon:   { peakAlpha: 0 },
      // Flat terrain — curve is visual parallax only
      curveAmp1: 0,
      curveAmp2: 0,
      // Portrait: scale 2.0 on a bgr-tree-long texture (~512px tall) = 1024px —
      // almost exactly fills a portrait screen height. Anchor is at vH+24 (bottom)
      // so the tree extends the full visible height as a solid dark pillar.
      // Set alpha 0 to hide entirely; hills + vignette already frame the edges.
      ...(_isPortrait ? { fgTrees: { scale: 2.0, alpha: 0 } } : {}),
    });

    // DESTINATION GLOW — scene-specific, placed on terrain curve
    if (this.textures.exists('light-blob')) {
      const aGround = this.env.placeOnGround(this.grid(7.5, 0).x, 6);
      const destGlow = this.add.image(aGround.x, aGround.y, 'light-blob')
        .setScale(5.0, 3.5)
        .setAlpha(0.18)
        .setTint(0xFFBB60)
        .setBlendMode('ADD')
        .setDepth(-9);
      this.tweens.add({
        targets:  destGlow,
        alpha:    { from: 0.18, to: 0.08 },
        scaleX:   { from: 5.0,  to: 6.0  },
        scaleY:   { from: 3.5,  to: 4.2  },
        duration: 2400,
        yoyo:     true,
        repeat:   -1,
        ease: 'Sine.easeInOut',
      });
    }

    // ── FAR BACKGROUND — office building silhouettes ──────────────────────
    // Placed behind the mountain layer (depth -207) as flat, nearly-invisible
    // shapes. Tells the viewer "this is an office campus" without loudly
    // announcing it. Alto's Adventure approach: context through silhouette.
    // scrollFactor(0) = viewport-locked, like the sky. Tinted to match the
    // warm amber palette so it doesn't fight with the sky gradient.
    //
    // Portrait: buildings are anchored at vH*0.24–0.32.  On a tall phone
    // (vH ≈ 844) those y values land ~200–270px from the screen top, placing
    // the full building body in the upper portion of the viewport.  They appear
    // as large salmon/pink block shapes, completely breaking the outdoor mood.
    // Skip them on portrait — the parallax hill layers already give sufficient
    // atmospheric depth in the sky band.
    if (!_isPortrait) {
      const vW = this.scale.width;
      const vH = this.scale.height;
      const bldgTint = 0xA86840;  // warm amber-brown silhouette

      // Main building block: right side, partially behind treeline
      if (this.textures.exists('bgr-house1')) {
        this.add.image(vW * 0.68, vH * 0.28, 'bgr-house1')
          .setScale(1.10).setOrigin(0.5, 1.0)
          .setTint(bldgTint).setAlpha(0.22)
          .setScrollFactor(0.04).setDepth(-207);
      }
      // Secondary building: left-center, slightly smaller
      if (this.textures.exists('bgr-house2')) {
        this.add.image(vW * 0.32, vH * 0.32, 'bgr-house2')
          .setScale(0.85).setOrigin(0.5, 1.0)
          .setTint(bldgTint).setAlpha(0.17)
          .setScrollFactor(0.04).setDepth(-207);
      }
      // Small distant building: far right, barely visible
      if (this.textures.exists('bgr-house-sm1')) {
        this.add.image(vW * 0.88, vH * 0.24, 'bgr-house-sm1')
          .setScale(0.65).setOrigin(0.5, 1.0)
          .setTint(bldgTint).setAlpha(0.13)
          .setScrollFactor(0.04).setDepth(-207);
      }
    }

    // Near-ground foreground strip removed — the foreground occlusion elements
    // in buildProps() (bushes, rocks, tree bases at depth 602) provide better
    // near-depth layering without the harsh artificial terrain sweep.

    // ── GROUND VARIATION — warm outdoor earth texture ─────────────────────────
    // Visual theme: morning sun on dry, warm earth — pale amber dust, dry grass
    // patches, golden light pooling in hollows. Palette driven by the scene's sky:
    // botColor 0xF5C870 (horizon gold) ↔ ground 0x3A2810 (dark warm earth).
    //
    // Depth stack (above ground strip -190, below props -99):
    //   -80: soil/pebble noise    -75: dry earth grooves
    //   -20: warm sun-patch pools (ADD)
    //
    // groundY = worldH * 0.5625 = 288 (flat terrain, curveAmp=0).
    // All layers use world coordinates and scroll with the camera naturally.

    const wW = this.worldW;
    const wH = this.worldH;
    const gY  = Math.round(wH * 0.5625);   // terrain baseline — same formula as env.groundY
    const gTop = gY - 12;                   // just above terrain surface edge
    const gBot = wH * 0.88;                 // bottom of visible ground band

    // ── 2. Soil / pebble noise — deterministic scatter, dry earth grit ────────
    // Prime-stepped modulo — no Math.random(), fully repeatable.
    // Colours lean warm-brown / pale dust to stay within the amber palette.
    const noiseGfx = this.add.graphics().setDepth(-80);
    for (let i = 0; i < 90; i++) {
      const nx = ((i * 127 + 43) % (wW - 20)) + 10;
      const ny = gY + 4 + ((i * 83 + 17) % (gBot - gY - 4));
      const nr = 0.35 + (i % 3) * 0.28;
      noiseGfx.fillStyle(0x4A2E10, 0.015 + (i % 5) * 0.008);  // darker, lower alpha — no orange lumps
      noiseGfx.fillCircle(nx, ny, nr);
    }
    // Pale dust highlights — sun-bleached pebbles catching the morning light
    for (let i = 0; i < 14; i++) {
      const nx = ((i * 167 + 79) % (wW - 40)) + 20;
      const ny = gY + 6 + ((i * 59) % (gBot * 0.22));
      noiseGfx.fillStyle(0xB89050, 0.07);  // reduced — just a hint
      noiseGfx.fillCircle(nx, ny, 0.9);
    }

    // ── 3. Dry earth grooves — short L-bends suggesting cracked, dry soil ─────
    // Low-contrast warm-brown lines; the L-shape reads like a crack fork without
    // looking like technical circuit traces. Echo the ground topColor (0x3A2810).
    const grooveGfx = this.add.graphics().setDepth(-75);
    [
      { x1: 0.05, y1: gY+12, x2: 0.10, y2: gY+14, vx: 0.10, vy: gY+20 },
      { x1: 0.18, y1: gY+22, x2: 0.24, y2: gY+20, vx: 0.24, vy: gY+28 },
      { x1: 0.38, y1: gY+10, x2: 0.44, y2: gY+12, vx: 0.44, vy: gY+18 },
      { x1: 0.54, y1: gY+26, x2: 0.61, y2: gY+24, vx: 0.61, vy: gY+32 },
      { x1: 0.70, y1: gY+14, x2: 0.76, y2: gY+16, vx: 0.76, vy: gY+22 },
      { x1: 0.86, y1: gY+20, x2: 0.92, y2: gY+18, vx: 0.92, vy: gY+26 },
    ].forEach(t => {
      grooveGfx.lineStyle(0.5, 0x5A3818, 0.08);
      grooveGfx.lineBetween(wW * t.x1, t.y1, wW * t.x2, t.y2);
      grooveGfx.lineBetween(wW * t.x2, t.y2, wW * t.vx, t.vy);
      // fork junction dot
      grooveGfx.fillStyle(0x704A20, 0.10);
      grooveGfx.fillCircle(wW * t.x2, t.y2, 1.0);
    });

    // ── 4. Warm sun-patch pools — morning light falling unevenly on the earth ──
    // ADD-blend pools mimic direct morning sun hitting ground at low angle,
    // creating bright patches between tree/bush shadows. Each pool has a
    // slightly different warm-golden or amber tint. Depth -20 places them
    // above all ground layers but below props, so they don't bleed into
    // characters — the effect reads as ground illumination, not a glow halo.
    [
      { xf: 0.10, yf: 0.580, sx: 2.0, sy: 0.28, al: 0.12, tint: 0xFFAA30 },
      { xf: 0.26, yf: 0.574, sx: 1.4, sy: 0.18, al: 0.09, tint: 0xFFBB40 },
      { xf: 0.45, yf: 0.582, sx: 1.8, sy: 0.22, al: 0.11, tint: 0xFF9828 },
      { xf: 0.63, yf: 0.576, sx: 1.2, sy: 0.16, al: 0.08, tint: 0xFFAA38 },
      { xf: 0.78, yf: 0.579, sx: 1.6, sy: 0.20, al: 0.10, tint: 0xFFB840 },
      { xf: 0.93, yf: 0.572, sx: 1.1, sy: 0.14, al: 0.07, tint: 0xFF9820 },
    ].forEach(p => {
      this.add.image(wW * p.xf, wH * p.yf, 'light-blob')
        .setScale(p.sx, p.sy).setAlpha(p.al).setTint(p.tint)
        .setBlendMode('ADD').setDepth(-20);
    });
  }

  buildProps() {
    // ═══════════════════════════════════════════════════════════════
    //  CHAPTER 4 PROPS — "The Girl in the Hoodie"
    //
    //  THREE ALTO'S ADVENTURE PRINCIPLES APPLIED:
    //
    //  1. VERTICAL RHYTHM — nothing sits on the same baseline.
    //     Props are placed at different Y offsets (groundY ± n px) so
    //     the silhouette line reads as undulating, not a ruler.
    //     Formula: negative offsetY = raised above ground = "on a crest"
    //              positive offsetY = buried slightly = "in a hollow"
    //
    //  2. DEPTH SCALE — farther objects are smaller, closer objects larger.
    //     Even on a flat plane, scale difference creates perceived distance.
    //     Gateway trees are deliberately oversized — they frame Aashna.
    //
    //  3. PALETTE HARMONY — every sprite is tinted to absorb the scene's
    //     amber light. No saturated green trees. No pure white flowers.
    //     Tints shift warmer as you approach Aashna — her zone is golden.
    //
    //  ZONE MAP (12 col world):
    //   0─2   Sparse/ordinary  |  2─5  Transition  |  5─7  Magic begins
    //   7─9   Aashna's space   |  9─12 The beyond
    // ═══════════════════════════════════════════════════════════════

    // ── Colour palette — scene-wide tint values ───────────────────
    const TINT = {
      treeLeft:    0xB8A060,
      treeMid:     0xC09840,
      treeGateway: 0xD4A030,
      treeRight:   0xC8A848,
      grass:       0xB8A858,
      bush:        0xA89840,
      rock:        0x906850,
    };

    // ── VISUAL TERRAIN ARC ────────────────────────────────────────
    // Ground physics is flat (curveAmp=0 so player moves normally).
    // Props follow a DESIGNED terrain arc — the visual narrative of the scene.
    // This is the Alto's Adventure technique: the terrain silhouette is NOT
    // gameplay collision — it is pure visual storytelling.
    //
    // Arc shape (world x → screen Y offset added to groundY=288):
    //
    //   0─────────────────────────────────────────────────────→ x
    //   VALLEY      RISE     CREST-L   VALLEY    CREST-R  CREST-FAR
    //   +14──+10───-8──-30───-52───────+18──────-48──────-45
    //
    //   Player ──── bench ── pine ── LEFT GATE ── AASHNA ── RIGHT GATE ── beyond
    //
    // Negative offset = higher screen position (on a hilltop)
    // Positive offset = lower screen position (in a valley)
    //
    // Total swing: -52 → +18 = 70 world px = ~115 screen px at zoom 1.65.
    // That's the difference between a tree crown towering above and a flower
    // nestled in a hollow. Visible, intentional, narrative.

    const prop = (col, tex, sc, offsetY = 0, tint = null, shadow = null) => {
      const wx = this.grid(col, 0).x;
      const p  = this.env.placeOnGround(wx, offsetY);
      if (!this.textures.exists(tex)) return null;
      const img = this.add.image(p.x, p.y, tex)
        .setScale(sc).setOrigin(0.5, 1.0);
      if (tint !== null) img.setTint(tint);
      this.layers.place(img, 'midground');
      // Trees carry strong green channels — skip Light2D pipeline so tints render cleanly
      const isTree = tex.startsWith('k-tree') || tex.startsWith('foliage-tree');
      if (!isTree) this.lighting.applyPipeline(img);
      if (shadow) this.shadows.add(img, shadow);
      return img;
    };

    // ── ZONE 1: The valley floor — ordinary world ──────────────
    // Everything sits LOW (+10 to +14). Flat, unremarkable.
    // This makes the first hill feel like a genuine rise.
    prop(0.5,  'k-grass',        0.40, +14, TINT.grass);  // start of valley floor
    prop(1.2,  'k-rock-small-a', 0.50,  +6, TINT.rock);   // slightly raised — not quite flat
    prop(1.8,  'k-grass-large',  0.38, +20, TINT.grass);  // deepest hollow in Z1
    prop(2.5,  'k-grass-leafs',  0.34,  +4, TINT.grass);  // small rise — undulates

    // ── ZONE 2: The rise — bench on the slope, pine on the hill ─
    // Bench at -8: slightly elevated, dignified. Not in the muddy valley.
    // Pine at -30: clearly standing on the hill — first sign of the crest ahead.
    prop(3.4,  'k-bench-soft',   0.38,  -8,  0xC09050,
      { width: 32, height: 7, offsetY: 4, alpha: 0.20 });
    prop(4.5,  'k-tree-pine-a',  0.74, -30,  TINT.treeMid,
      { width: 18, height: 5, offsetY: 10, alpha: 0.14 });
    // Rock in the dip between the hill and the crest — confirms the terrain
    prop(5.0,  'k-rock-small-b', 0.44, +14, TINT.rock);
    // ── STEPPING STONES — path from the valley toward the gateway ──
    // Two stone circles in the valley floor suggest a well-worn path.
    // Slightly warm tint — this road has been walked with purpose.
    prop(2.2,  'k-path-stone-circle', 0.38, +16, 0xB09050);
    prop(4.2,  'k-path-stone-circle', 0.32, +12, 0xB89050);
    // ── ZONE 3: Climbing to the left crest ──────────────────────
    // Flowers appear on the hillside slope, getting higher each step.
    prop(5.3,  'k-flower-yellow', 0.50, -18, 0xFFD870);  // early slope — first colour hint
    prop(5.75, 'k-grass-leafs',   0.40,  +6, TINT.grass); // dip before the crest — makes gate more dramatic
    prop(6.3,  'k-flower-red',    0.52, -42, 0xFF9060);   // high approach to the gate

    // ── LEFT GATEWAY OAK — col 6.0, at the crest ────────────────
    // offsetY -52: the highest point in the scene's left half.
    // At zoom 1.65, this tree's base is 85 screen pixels above the valley floor.
    // Its canopy is a further 100+ screen pixels above that — a real statement.
    prop(6.0, 'k-tree-oak', 1.00, -52, TINT.treeGateway,
      { width: 28, height: 8, offsetY: 14, alpha: 0.22 });

    // ── ZONE 4: Descending into Aashna's valley ──────────────────
    // After the crest, the ground drops. The fall makes Aashna feel
    // protected — enclosed by the rising trees on both sides of her.
    prop(7.0, 'k-bush-small',    0.50,  +8,  TINT.bush);
    prop(7.8, 'k-flower-purple', 0.52, +14,  0xD090C0);  // deep hollow at Aashna's feet
    // ── Mid-zone fill — valley bowl between the two gateway trees ──────────────
    prop(8.2, 'k-rock-small-a',  0.42, +18, TINT.rock);    // lowest visible point — emphasises both crests
    prop(8.6, 'k-grass',         0.36, +10, TINT.grass);   // ground cover rising toward the right gate

    // ── RIGHT GATEWAY OAK — col 9.0, mirroring the left ─────────
    // Slightly larger (1.08) and slightly less raised (-48) than left gate
    // — deliberate asymmetry, scene feels alive not mirrored.
    prop(9.0, 'k-tree-oak', 1.08, -48, TINT.treeGateway,
      { width: 30, height: 8, offsetY: 14, alpha: 0.22 });
    prop(9.3, 'k-flower-yellow', 0.42, +12, 0xFFB840);   // valley floor after the gate — contrasts with -48 tree
    prop(9.6, 'k-bush',          0.54, +18, TINT.bush,   // deep in the hollow
      { width: 22, height: 5, offsetY: 4, alpha: 0.12 });

    // ── ZONE 5: The far crest — the beyond ───────────────────────
    // Largest tree, highest raise. Final arc of the composition.
    // The canopy sits even higher than the gateway trees in screen Y terms,
    // which gives the scene a sense of expanding into a larger world.
    prop(10.6, 'k-tree-fat', 1.14, -45, TINT.treeRight,
      { width: 34, height: 8, offsetY: 18, alpha: 0.16 });
    prop(11.3, 'k-grass', 0.38, +12, TINT.grass);    // valley after the last crest

    // ── Aashna's glow ──────────────────────────────────────────
    // Rose-warm light pool under where she will stand.
    if (this.textures.exists('light-blob')) {
      const glowPos = this.env.placeOnGround(this.grid(7.5, 0).x, 5);
      this._aashnaGlow = this.add.image(glowPos.x, glowPos.y, 'light-blob')
        .setScale(2.6, 1.6)
        .setAlpha(0.13)
        .setTint(0xFFB0C0)
        .setBlendMode('ADD')
        .setDepth(-3);
      this.tweens.add({
        targets:  this._aashnaGlow,
        scaleX:   { from: 2.6, to: 3.2 },
        scaleY:   { from: 1.6, to: 2.0 },
        alpha:    { from: 0.13, to: 0.05 },
        duration: 2200,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    }

    // ── FOREGROUND OCCLUSION — warm garden edge elements ─────────────────────
    // Depth: foreground layer (602) — above gameplay ceiling (599), so player
    // genuinely passes BEHIND these elements creating true parallax layering.
    // This is the correct depth for an OPEN scene: the player walks on terrain
    // (Y-sort depth ~315-320), so foreground at 602 always sits in front.
    //
    // Portrait mobile: at zoom ~1.70 on a tall phone, the camera viewport
    // (y ≈ 55–343) fully exposes the fgPlant zone (extraDrop +34 to +52 → y
    // 322–340).  These appear as dark floating bush/rock/pyramid shapes against
    // the warm sky. Skip them on portrait — the vignette already frames the edges.
    if (this.scale.height > this.scale.width) return;

    const fgDepth = this.layers.depth('foreground', 2);  // 602

    // Helper — places a foliage/rock asset at absolute world Y (below terrain).
    // groundRef = env.placeOnGround result for the column; extraDrop pushes
    // it further below ground so only the crown/top is visible.
    const fgPlant = (col, key, sc, extraDrop, tint, originY = 1.0) => {
      if (!this.textures.exists(key)) return;
      const wx  = this.grid(col, 0).x;
      const pos = this.env.placeOnGround(wx, extraDrop);
      this.add.image(pos.x, pos.y, key)
        .setScale(sc).setOrigin(0.5, originY)
        .setTint(tint).setAlpha(0.82)
        .setDepth(fgDepth + (col > 6 ? 1 : 0));  // right-side one pixel closer
    };

    // Left edge — thick bush just inside the world boundary, partially cropped
    fgPlant( 0.4, 'k-bush',         0.68, +38, 0x8A6830);
    // Low rock cluster on the valley floor, col 1.8 — pairs with the grass at +20
    fgPlant( 1.8, 'k-rock-small-a', 0.58, +44, 0x705228);
    // Wide-canopy tree base left of center — trunk peeks above path
    fgPlant( 3.6, 'foliage-tree5',  0.26, +52, 0x6A5820, 0.88);
    // Small bush just left of the bench zone — framing the transition
    fgPlant( 4.8, 'k-bush-small',   0.55, +34, 0x907030);
    // Rock at the base of the left gateway oak — grounds the gateway visually
    fgPlant( 6.2, 'k-rock-small-b', 0.52, +40, 0x806030);
    // Bush in Aashna's hollow — slightly different tint (cooler, more violet)
    fgPlant( 7.6, 'k-bush-small',   0.60, +36, 0xA07848);
    // Wide-canopy tree right of Aashna — mirrors the left tree
    fgPlant( 9.8, 'foliage-tree2',  0.24, +50, 0x7A6128, 0.88);
    // Right edge rock — anchors far right like the left bush anchors far left
    fgPlant(11.2, 'k-rock-small-a', 0.52, +42, 0x6A4E24);

    // ── EMOTE — happy face above Aashna, the girl in the hoodie ──
    // emote-faceHappy telegraphs that this is a moment of joy, not danger.
    // Delayed 600 ms so it pops in after the scene has settled.
    const facePos = this.grid(7.5, 2.8);
    this._addEmote(facePos.x, facePos.y, 'emote-faceHappy', { scale: 0.26, depth: 30, delay: 600 });
  }


  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS — player left, Aashna framed by gateway pines
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    // Player starts on the terrain curve at column 1.5
    const startX = this.grid(1.5, 0).x;
    const startY = this.env.placeOnGround(startX, 0).y;
    this._player = this.charSystem.createPlayer(
      { playerStart: { x: startX, y: startY } },
      { texture: 'char-male-casual', displayW: 40, displayH: 62 },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.36, dynamic: true,
    });

    // Aashna — placed on terrain curve at column 7.5
    const aashnaX = this.grid(7.5, 0).x;
    const aashnaY = this.env.placeOnGround(aashnaX, 0).y;
    this._aashna = this.charSystem.createFemale(aashnaX, aashnaY);
    this.shadows.add(this._aashna.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.25, dynamic: true,
    });
    this.proximity.register({
      gameObject:    this._aashna.sprite,
      id:            'aashna_meet',
      label:         'Someone Special',
      triggerRadius: 60,
      glowRadius:    150,
      onTrigger:     () => this._onMeetAashna(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FX — warm petals drifting down + intro dialogue
  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    // Slow cinematic drift — makes parallax depth visible during idle.
    // baseOffsetY < 0 → camera centers slightly above the player,
    // pushing the character into the lower third for sky-dominant composition.
    // Portrait phones need a larger fraction (0.18 vs 0.13) so the sky fills
    // the upper half and the ground/player/Aashna zone fills the lower half.
    const vH = this.scale.height;
    const _isPortrait = vH > this.scale.width;
    this.cam.configure({
      driftAmpX:   30,
      driftAmpY:   10,
      driftSpeedX: 0.0004,
      driftSpeedY: 0.0005,
      baseOffsetY: -Math.round(vH / this.cam.zoom * (_isPortrait ? 0.18 : 0.13)),
    });

    const W = this.worldW;

    // Warm petals drifting downward — golden afternoon feel
    if (this.textures.exists('particle-heart')) {
      this.add.particles(W / 2, -20, 'particle-heart', {
        x:         { min: -W / 2, max: W / 2 },
        speedY:    { min: 12, max: 28 },
        speedX:    { min: -8, max: 8  },
        rotate:    { min: 0, max: 360 },
        scale:     { start: 0.10, end: 0.04 },
        alpha:     { start: 0.28, end: 0 },
        tint:      [0xFFB7C5, 0xFFDDCC, 0xFFAA88],
        lifespan:  { min: 5000, max: 8000 },
        frequency: 420,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('midground', 90));
    }

    // Intro narration
    this.time.delayedCall(2000, () => {
      if (!this.sys?.isActive()) return;  // H2: scene may be destroyed before 2s fires
      const lines = storyData.dialogues?.ch5_intro;
      if (lines) this.dialogue?.start(lines);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION — meeting Aashna
  // ═══════════════════════════════════════════════════════════════════

  _onMeetAashna() {
    // Intimate zoom-in on the meeting moment
    this.cam.zoomPulse(1.55, 1200);

    // Bloom her glow on meeting
    if (this._aashnaGlow) {
      this.tweens.killTweensOf(this._aashnaGlow);
      this.tweens.add({
        targets:  this._aashnaGlow,
        alpha:    0.28,
        scale:    5.0,
        duration: 500,
        yoyo:     true,
        ease:     'Quad.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets:  this._aashnaGlow,
            scale:    { from: 3.2, to: 3.9 },
            alpha:    { from: 0.26, to: 0.11 },
            duration: 2000,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut',
          });
        },
      });
    }

    // 300ms delay: zoomPulse camera jolt + glow flash take ~200ms to feel settled.
    // The reunion sus4→major resolve (1.5s) then plays clean against the held glow
    // before dialogue renders — the music arrives as a reward, not as noise.
    this.time.delayedCall(300, () => {  // H3: guard — scene may be destroyed before 300ms fires
      if (this.sys?.isActive()) audioManager.playStinger('reunion');
    });
    const lines = storyData.dialogues?.ch5_meet;
    if (lines) {
      this.dialogue.start(lines, () => this._chapterComplete());
    } else {
      this._chapterComplete();
    }
  }

  _chapterComplete() {
    this._guardTransition(() => {
      goToChapter(this, 4);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PER-FRAME — drive tilePositionX for each parallax strip
  // ═══════════════════════════════════════════════════════════════════

  onUpdate(time, delta) {
    // Drive parallax scrolling only — characters move freely via physics.
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);  // M1: pass sprite for env sun/spotlight tracking
  }

  onShutdown() {
    audioManager.fadeOutAll(600);  // prevent hard cut when transitioning to Ch5
    // H1: kill _aashnaGlow repeat:-1 tween (including post-trigger nested tween)
    if (this._aashnaGlow) {
      this.tweens.killTweensOf(this._aashnaGlow);
      this._aashnaGlow = null;
    }
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
