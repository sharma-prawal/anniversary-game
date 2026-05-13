import { ChapterScene } from './ChapterScene.js';
import storyData from '../data/story.json';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';
import { audioManager } from '../utils/helpers.js';
import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';

/**
 * Chapter11Scene — "Love in a Box"
 *
 * Warm golden apartment interior. Prawal has filled the room with
 * 5 thoughtful gifts — each one a quiet expression of love.
 * Player walks left-to-right discovering each glowing gift object.
 *
 * Spatial logic (12 cols × 8 rows, cell 64px = 768 × 512):
 *
 *   BACK WALL (row 2.0): lib bookcases across full width
 *   READING NOOK  (cols 1–3): sofa + entry floor lamp — first warmth
 *   COFFEE TABLE  (cols 3–5): low table + 2 chairs
 *   CENTRE ANCHOR (cols 5–7): round table + surface lamp
 *   FAR CORNER    (cols 8–11): long sofa + right floor lamp
 *
 *   5 gifts evenly spaced at cols 2.5 / 4.5 / 6.5 / 8.5 / 10.5:
 *     2.5 → gift_food         (near player, visible immediately)
 *     4.5 → gift_lovebook     (coffee table zone)
 *     6.5 → gift_delivery_sorry (centre round table)
 *     8.5 → gift_photos       (edge of first viewport)
 *    10.5 → gift_cup          (far corner, ~1 screen walk)
 *
 *   Physics top y=192 (row 3) — back wall at row 2 is safely beyond.
 *   Zoom 1.72→1.80: viewport = 558px. Player at col 1.5 (x=96)
 *   sees gifts 1–4 on first frame. Gift 5 reveals after 2 cols walk.
 */
export class Chapter11Scene extends ChapterScene {
  constructor() {
    super('Chapter11', {
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
  //  GROUND — warm amber apartment interior
  // ═══════════════════════════════════════════════════════════════════

  buildGround() {
    // ── INDOOR — warm golden afternoon apartment ──────────────────
    this.env = EnvironmentManager.apply(this, 'INDOOR', {
      ceiling:    { topColor: 0x1C0E04, midColor: 0x2E1A0A, botColor: 0x44280C },
      wall:       { color: 0x3A2210, tint: 0xCCAA66, alpha: 0.90 },
      // 'cafe' style: warm dark brown glass + amber candlelight blob.
      // 'home' style has a cold blue 0x3377AA blob inside the glass —
      // visually jarring against this warm amber room.
      windows:    { style: 'cafe', positions: [0.22, 0.75] },
      // texture:null keeps IndoorEnvironment from drawing its k-floor tileSprite
      // at hardcoded alpha 0.82 — that alpha was what caused the banding.
      // We re-add it ourselves below at 0.38 in world-space.
      floor:      { topColor: 0x3E2810, botColor: 0x0E0604, texture: null },
      vignette:   { size: 110, color: 0x2A1800, alphaL: 0.68, alphaR: 0.68, alphaT: 0.55, alphaB: 0.72 },
      colorGrade: { color: 0xFFBB66, alpha: 0.044, blend: 'OVERLAY' },
    });

    const W  = this.worldW;  // 768 (12 × 64)
    const H  = this.worldH;  // 512 (8 × 64)
    const cs = this.cellSize ?? 64;

    // ── FLOOR TEXTURE — world-space tileSprite, depth -59 ──────────
    // IndoorEnvironment's k-floor is rendered at hardcoded alpha 0.82 in
    // screen-space. At zoom 1.72 the 8px planks magnify to ~14px — very
    // visible banding. We override with our own world-space tileSprite at
    // alpha 0.38 so planks read as texture (not stripes) and scroll
    // coherently with all prop shadows. Depth -59 sits above the gradient
    // base (-60) and below the variation bands (-58).
    if (this.textures.exists('k-floor')) {
      this.add.tileSprite(0, 3.0 * cs, W, H - 3.0 * cs, 'k-floor')
        .setOrigin(0, 0).setTint(0x3E2810).setAlpha(0.38).setDepth(-59);
    }

    // ── FLOOR VARIATION LAYER — world-space, depth -58 ─────────────
    // IndoorEnvironment renders k-floor as a screen-space tileSprite
    // tinted to a single flat colour (0x3E2810). These world-space bands
    // sit two depth ticks above it (-58 vs -60) and break that uniformity:
    //   • Near-wall band (rows 3.0–3.8): shadow from ceiling/back-wall overhead
    //   • Mid-room band (rows 4.5–5.5): centre-of-room receives most lamplight
    //   • Near-camera band (rows 6.5+): floor reads darker away from the lamps
    // Normal blend + tiny alpha = zero neon. Scrolls with world.
    const gfxPlanks = this.add.graphics().setDepth(-58);
    gfxPlanks.fillStyle(0x0A0502, 0.25);  // near-wall darkness — stronger shadow from ceiling
    gfxPlanks.fillRect(0, 3.0 * cs, W, cs * 0.8);
    gfxPlanks.fillStyle(0xC87838, 0.10);  // mid-room warmth band — lamp zone
    gfxPlanks.fillRect(0, 4.5 * cs, W, cs * 1.0);
    gfxPlanks.fillStyle(0x050200, 0.18);  // far-from-lamp darkening
    gfxPlanks.fillRect(0, 6.5 * cs, W, cs * 1.5);

    // ── LATERAL EDGE SHADOWS — world-space, depth -56 ──────────────
    // No lamplight reaches the extreme left/right world edges — those
    // floor strips should read deeper than the centre. Two dark fills.
    const gfxEdge = this.add.graphics().setDepth(-56);
    gfxEdge.fillStyle(0x050200, 0.25);
    gfxEdge.fillRect(0, 3.0 * cs, cs * 1.2, H - 3.0 * cs);         // left
    gfxEdge.fillStyle(0x050200, 0.25);
    gfxEdge.fillRect(W - cs * 1.2, 3.0 * cs, cs * 1.2, H - 3.0 * cs); // right

    // ── FLOOR DECALS — world-space, depth -58 ──────────────────────
    // k-floor-corner / k-floor-half are small 1-tile floor variants from
    // Kenney's furniture pack. Scattered at low alpha they read as worn
    // patches and subtle plank-tone variation — visual noise that is never
    // obviously tile-repetitive, adapts to the OVERLAY color grade at 998.
    const _decals = [
      { tx: 'k-floor-corner', c:  1.5, r: 4.0, sc: 0.62, tint: 0x5C3818, alpha: 0.18 },
      { tx: 'k-floor-half',   c:  4.8, r: 3.8, sc: 0.72, tint: 0x3A2210, alpha: 0.15 },
      { tx: 'k-floor-corner', c:  7.6, r: 4.2, sc: 0.56, tint: 0x5C3818, alpha: 0.14 },
      { tx: 'k-floor-half',   c: 10.4, r: 3.9, sc: 0.68, tint: 0x3A2210, alpha: 0.16 },
      { tx: 'k-floor-corner', c:  3.2, r: 5.8, sc: 0.50, tint: 0x4A2C10, alpha: 0.12 },
    ];
    for (const d of _decals) {
      if (!this.textures.exists(d.tx)) continue;
      const dp = this.grid(d.c, d.r);
      this.add.image(dp.x, dp.y, d.tx)
        .setOrigin(0.5, 0.9).setScale(d.sc)
        .setTint(d.tint).setAlpha(d.alpha).setDepth(-58);
    }

    // ── WINDOW FLOOR PATCHES — world-space, depth -54, ADD ─────────
    // The IndoorEnvironment draws angled light shafts in screen space from
    // windows at fractions 0.22 and 0.75. These corresponding world-space
    // patches show where those shafts land on the floor — a flat ellipse
    // with very small scaleY reads as a bright rectangle lying on the plane.
    // ADD blend: patch colour = underlying floor colour + tint. The warm
    // OVERLAY colour grade (depth 998) pushes them gold automatically.
    if (this.textures.exists('light-blob')) {
      this.add.image(W * 0.22, 4.6 * cs, 'light-blob')
        .setScale(3.0, 0.42).setAlpha(0.12).setTint(0xFFEEAA)
        .setBlendMode('ADD').setDepth(-54);
      this.add.image(W * 0.75, 4.6 * cs, 'light-blob')
        .setScale(3.0, 0.42).setAlpha(0.10).setTint(0xFFEEAA)
        .setBlendMode('ADD').setDepth(-54);
    }

    // ── LAMP FLOOR PUDDLES — world-space, depth -53, ADD ───────────
    // Each of the 3 lamps already has a mid-air halo (_addLampPool at
    // depth ≈1). These complementary floor-level puddles are flat (low
    // scaleY) and sit at row 5.0 — the floor directly beneath each lamp.
    // Tints match each lamp's dedicated halo colour, so they read as the
    // same light source pooling at the floorplane.
    if (this.textures.exists('light-blob')) {
      const _puddles = [
        { c: 0.8, r: 5.0, tint: 0xFFBB66, sx: 3.8, sy: 0.52 },  // left floor lamp
        { c: 9.8, r: 5.0, tint: 0xFFAA44, sx: 4.0, sy: 0.55 },  // right floor lamp
        { c: 6.2, r: 4.9, tint: 0xFFCC66, sx: 2.8, sy: 0.38 },  // centre table lamp
      ];
      for (const lp of _puddles) {
        const lpos = this.grid(lp.c, lp.r);
        this.add.image(lpos.x, lpos.y, 'light-blob')
          .setScale(lp.sx, lp.sy).setAlpha(0.24).setTint(lp.tint)
          .setBlendMode('ADD').setDepth(-53);
      }
    }

    // ── WINDOW LIGHT SHAFT — soft warm beam from upper-left window ──
    if (this.textures.exists('light-blob')) {
      this.add.image(W * 0.18, H * 0.28, 'light-blob')
        .setScale(8, 12).setAlpha(0.06).setTint(0xFFEE88)
        .setBlendMode('ADD').setDepth(this.layers.depth('midground', 88));
    }

    // ── ROOM-WIDE AMBIENT GLOW — warm golden afternoon ────────────
    if (this.textures.exists('light-blob')) {
      this._wash = this.add.image(W * 0.5, H * 0.6, 'light-blob')
        .setScale(14, 8).setAlpha(0.07).setTint(0xFFCC55)
        .setBlendMode('ADD').setDepth(-12);
      this.tweens.add({
        targets:  this._wash,
        alpha:    { from: 0.07, to: 0.03 },
        duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Warm window highlight — upper-left corner glow
      this.add.image(W * 0.15, H * 0.18, 'light-blob')
        .setScale(5, 4).setAlpha(0.10).setTint(0xFFEE88)
        .setBlendMode('ADD').setDepth(-11);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROPS — furniture + 5 gift interactables
  // ═══════════════════════════════════════════════════════════════════

  buildProps() {
    this._giftsFound = 0;
    this._totalGifts = 5;

    // ── Gift counter — delegated to UIScene (immune to main camera zoom)
    this.time.delayedCall(0, () => {
      const d = { label: 'gifts', total: this._totalGifts };
      this.game.events.emit('collect-counter-init', d);
      this.scene.get('UI')?._onCollectCounterInit?.(d);
    });

    const shadowS = { width: 14, height: 4, offsetY: 5, alpha: 0.14 };
    const shadowM = { width: 28, height: 6, offsetY: 7, alpha: 0.16 };

    // ── BACK WALL — bookcases at rows 2.0–2.5 ─────────────────────
    // The scene header documents bookcases "across the full width" but
    // none were placed. Added now. Fixed depth -10 keeps them behind all
    // floor furniture. Row variation (2.0–2.5) avoids a perfectly flat shelf.
    // Tints lightened: 0x7A5030→0xB87848, 0x6A4424→0xA06030.
    // The ceiling gradient ends around row 2.4; bookcases sit right in
    // that shadow band — they were rendering near-black. Warmer/lighter
    // tints let them read as actual furniture, not dark silhouettes.
    const bc1 = this.placeAt(0.8, 2.2, 'k-bookcase-wide',   { scale: 0.60, ySort: false });
    if (bc1) bc1.setTint(0xB87848).setDepth(-10);
    const bc2 = this.placeAt(3.0, 2.0, 'k-bookcase',        { scale: 0.56, ySort: false });
    if (bc2) bc2.setTint(0xA06030).setDepth(-10);
    const bc3 = this.placeAt(5.6, 2.3, 'k-bookcase-closed', { scale: 0.58, ySort: false });
    if (bc3) bc3.setTint(0xB87848).setDepth(-10);
    const bc4 = this.placeAt(8.2, 2.1, 'k-bookcase-wide',   { scale: 0.60, ySort: false });
    if (bc4) bc4.setTint(0xA06030).setDepth(-10);
    const bc5 = this.placeAt(10.8, 2.4, 'k-bookcase',       { scale: 0.54, ySort: false });
    if (bc5) bc5.setTint(0xB87848).setDepth(-10);

    // ── ZONE 1 — READING NOOK (cols 1–3): food surprise context ───
    // Entry floor lamp — first thing player sees, immediately warm
    this._lampPools = [];
    this.placeAt(0.8, 4.4, 'k-lamp-floor', { scale: 0.62, shadow: shadowS });
    this._addLampPool(0.8, 4.4, 2.8, 1.5, 0xFFBB66, 0.18, 2400);

    // Coat rack just inside the doorway — lived-in apartment detail
    const cr = this.placeAt(0.2, 4.8, 'k-coat-rack', { scale: 0.54, shadow: shadowS });
    if (cr) cr.setTint(0x9A7050);

    this.placeAt(1.8, 5.0, 'k-sofa',     { scale: 0.70, shadow: shadowM });
    const p1 = this.placeAt(1.0, 5.8, 'k-plant-pot', { scale: 0.52, shadow: shadowS });
    if (p1) p1.setTint(0x4A3810);
    // Side table for food delivery context — pushed to row 5.4 (was 5.2,
    // matched the zone-2 table; now distinct).
    this.placeAt(2.8, 5.4, 'k-table-coffee', { scale: 0.54, shadow: shadowS });

    // ── ZONE 2 — BOOK CORNER (cols 3–5): lovebook context ─────────
    // Television on back wall above the coffee table — makes it feel
    // like a real apartment, not just a stage. Depth-set to back wall.
    // Was row 3.4 — visually floating in mid-air between the bookcases
    // and the floor furniture. Moved to row 2.8 so it sits flush on/above
    // the back wall where wall-mounted TVs belong. Scale slightly up so
    // it reads at this distance. Tint lightened to 0x6A5038 (was 0x4A3828)
    // so it contrasts against the dark ceiling rather than merging into it.
    const tv = this.placeAt(5.6, 2.8, 'k-television', { scale: 0.60, ySort: false });
    if (tv) tv.setTint(0x6A5038).setDepth(-8);
    const tc2 = this.placeAt(3.8, 5.2, 'k-table-coffee', { scale: 0.62, shadow: shadowM });
    if (tc2) tc2.setTint(0x886633);
    // Chairs: row 5.7 (in front of coffee table at 5.2) so they are visible and
    // not occluded. Row difference 0.5 gives a natural seated-around-table gap.
    this.placeAt(3.4, 5.7, 'k-chair', { scale: 0.64, shadow: shadowS });
    // Was k-chair-desk (office rolling chair) — wrong for a home reading nook.
    this.placeAt(4.2, 5.5, 'k-chair', { scale: 0.54, shadow: shadowS });

    // ── ZONE 3 — ROUND TABLE (cols 5–7) — geometric heart ────────
    this.placeAt(6.2, 4.8, 'k-table-round', { scale: 0.66, shadow: shadowM });

    // Surface lamp depth-pinned on top of the round table.
    // Row 4.9 (just in front of table row 4.8) gives static Y-sort depth ≈346 vs
    // table's dynamic depth ≈339 — lamp renders on the table surface correctly.
    const tLamp = this.placeAt(6.2, 4.9, 'k-lamp-table', { scale: 0.52, shadow: shadowS });
    // Use static Y-sort so depth is derived from LayerManager, not a hardcoded formula
    if (tLamp) this.depthMgr.addYSort(tLamp, { static: true });
    this._addLampPool(6.2, 4.9, 2.2, 1.2, 0xFFCC66, 0.16, 3000);

    // ── ZONE 4 — FAR WARM CORNER (cols 8–11): photos + cup context
    this.placeAt(8.8, 5.0, 'k-sofa-long',  { scale: 0.72, shadow: { width: 46, height: 7, offsetY: 9, alpha: 0.18 } });
    // Area rug under the long sofa — warm honey-amber, grounding the seating nook
    const rug11 = this.placeAt(9.2, 5.2, 'k-rug-rect', { scale: 0.64 });
    if (rug11) rug11.setTint(0xB87040).setAlpha(0.72).setDepth(-6);
    this.placeAt(9.8, 4.4, 'k-lamp-floor', { scale: 0.62, shadow: shadowS });
    this._addLampPool(9.8, 4.4, 3.0, 1.6, 0xFFAA44, 0.20, 2800);
    const p2 = this.placeAt(11.0, 5.4, 'k-plant-pot', { scale: 0.52, shadow: shadowS });
    if (p2) p2.setTint(0x4A3810);
    // Side table for the morning coffee cup — col 10.5 aligns with cup gift at (10.5, 5.3)
    // so the cup appears to rest on the table surface at zoom 1.72.
    this.placeAt(10.5, 5.6, 'k-table-round', { scale: 0.50, shadow: shadowS });

    // ── 5 GIFT INTERACTABLES — left-to-right discovery flow ──────
    // Texure: k-lamp-table (warm, glowing, clearly interactive)
    // Glow rings pulse in staggered bursts — each gift has its own rhythm
    this._giftGlows = [];

    this._giftDefs = [
      { c: 3.0,  r: 4.9, id: 'food_delivery',  label: 'Food Surprise',       dialogue: 'gift_food',           tint: 0xFFD080 },
      { c: 4.0,  r: 4.9, id: 'love_book',       label: 'Our Story, Printed',  dialogue: 'gift_lovebook',       tint: 0xFFBB66 },
      { c: 6.5,  r: 4.9, id: 'delivery_sorry',  label: 'Apology Delivery',    dialogue: 'gift_delivery_sorry', tint: 0xFFAA44 },
      { c: 8.5,  r: 5.2, id: 'printed_photos',  label: 'A Thousand Memories', dialogue: 'gift_photos',         tint: 0xFF9966 },
      { c: 10.5, r: 5.3, id: 'custom_cup',       label: 'Our Morning Coffee',  dialogue: 'gift_cup',            tint: 0xFFCC88 },
    ];

    const giftTextures = ['obj-food', 'obj-lovebook', 'obj-delivery-guy', 'obj-printedphotos', 'obj-customcup'];
    for (let i = 0; i < this._giftDefs.length; i++) {
      const gd  = this._giftDefs[i];
      const pos = this.grid(gd.c, gd.r);

      if (this.textures.exists('light-blob')) {
        const glow = this.add.image(pos.x, pos.y + 5, 'light-blob')
          .setScale(2.4).setAlpha(i === 0 ? 0.22 : 0).setTint(gd.tint)
          .setBlendMode('ADD').setDepth(this.layers.depth('gameplay', 5));
        if (i === 0) {
          this.tweens.add({
            targets:  glow,
            scale:    { from: 2.4, to: 3.0 },
            alpha:    { from: 0.22, to: 0.08 },
            duration: 1600 + i * 180,
            yoyo:     true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }
        this._giftGlows.push(glow);
      } else {
        this._giftGlows.push(null);
      }

      // Gift props: story-specific obj-* sprites — immediately read as narrative objects.
      this.placeInteractable(gd.c, gd.r, giftTextures[i], {
        id:            gd.id,
        label:         gd.label,
        triggerRadius: 70,
        glowRadius:    155,
        enabled:       i === 0,  // Only first gift active; rest unlock sequentially
        skipUnlockSFX: true,
        onTrigger:     () => { this.proximity.setEnabled(gd.id, false); this._onGiftFound(i, gd.dialogue); },
      }, { scale: 0.52 });
    }

    // Emote labels — first gift's emote shown immediately; rest revealed on each gift collect.
    this._giftEmoteKeys = ['emote-exclaim', 'emote-star', 'emote-heart', 'emote-exclaim', 'emote-exclaim'];
    const firstGd   = this._giftDefs[0];
    const firstEPos = this.grid(firstGd.c, firstGd.r - 1.0);
    this._addEmote(firstEPos.x, firstEPos.y, this._giftEmoteKeys[0], { scale: 0.26, delay: 300 });

    // ── PLAYER-PATH OCCLUSION — Y-sorted, rows 5.3–5.6 ──────────────
    // Indoor equivalents of outdoor bush / rock / tree-base occlusion.
    // Player walks rows 5.0–5.2 (depth ≈352–365). These Y-sorted props
    // sit at rows 5.3–5.6 (depth ≈378–390) so they always render IN FRONT
    // of the player when they are at or above their row — the player
    // physically walks BEHIND them, creating 2.5D depth.
    // Sway FX is applied automatically by placeAt() for plant textures.
    //
    //  (1.4, 5.5)  k-plant-flat-tall → tree-base analog, left entrance
    //  (4.0, 5.4)  k-plant-pot       → bush analog, gift-1/2 crossover
    //  (7.0, 5.6)  k-lounge-chair    → rock-mass analog, scene centre
    //  (9.4, 5.3)  k-plant-flat-tall → tree-base analog, far-zone shoulder
    //  (11.6, 5.5) k-plant-pot       → bush analog, right-edge framer

    const ppTallL = this.placeAt(1.4, 5.5, 'k-plant-flat-tall', {
      scale: 0.62,
      shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppTallL) ppTallL.setTint(0x4A3810);

    const ppBushM1 = this.placeAt(4.0, 5.4, 'k-plant-pot', {
      scale: 0.58,
      shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppBushM1) ppBushM1.setTint(0x4A3810);

    // Was k-lounge-chair ("rock analog") — isolated armchair with no table/lamp
    // reads as furniture dumped mid-room. Plant pot matches all other occlusion props.
    const ppRock = this.placeAt(7.0, 5.6, 'k-plant-pot', {
      scale: 0.58,
      shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppRock) ppRock.setTint(0x4A3810);

    const ppTallR = this.placeAt(9.4, 5.3, 'k-plant-flat-tall', {
      scale: 0.60,
      shadow: { width: 10, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppTallR) ppTallR.setTint(0x4A3810);

    const ppBushR = this.placeAt(11.6, 5.5, 'k-plant-pot', {
      scale: 0.64,
      shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.10 },
    });
    if (ppBushR) ppBushR.setTint(0x4A3810);

    // ── LOWER-HALF DETAIL — rows 6.0–6.6: fills the empty floor band ─
    // Rows 6.0–8.0 were completely empty. Warm apartment props scattered
    // at varied Y positions — no two share the same row.
    const lhPlant1 = this.placeAt(2.0, 6.2, 'k-plant-small-1', { scale: 0.46 });
    if (lhPlant1) lhPlant1.setTint(0x4A3810);
    const lhRug = this.placeAt(4.2, 6.5, 'k-rug-round', { scale: 0.54 });
    if (lhRug) lhRug.setTint(0xC07040).setAlpha(0.58).setDepth(-4);
    const lhPlant2 = this.placeAt(6.8, 6.1, 'k-plant-small-2', { scale: 0.42 });
    if (lhPlant2) lhPlant2.setTint(0x4A3810);
    const lhSideTable = this.placeAt(8.0, 6.4, 'k-side-table', {
      scale: 0.46,
      shadow: { width: 12, height: 3, offsetY: 4, alpha: 0.12 },
    });
    if (lhSideTable) lhSideTable.setTint(0x8A6040);
    const lhPlant3 = this.placeAt(10.4, 6.0, 'k-plant-pot', {
      scale: 0.50,
      shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.12 },
    });
    if (lhPlant3) lhPlant3.setTint(0x4A3810);

    // ── MID-FOREGROUND OCCLUSION — Y-sorted, rows 6.6–7.2 ──────────
    // Player at rows 5.0–5.2 (y≈352–364, depth 352+). These Y-sorted
    // props at rows 6.6–7.2 (y≈454–493) always render over the player,
    // creating 2.5D depth. Warm apartment palette: amber-brown tints.
    const occChairL = this.placeAt(0.8, 7.0, 'k-lounge-chair', {
      scale: 0.54,
      shadow: { width: 18, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (occChairL) occChairL.setTint(0x805030);
    const occTableM = this.placeAt(5.2, 6.7, 'k-table-coffee', { scale: 0.44, shadow: { width: 20, height: 5, offsetY: 5, alpha: 0.10 } });
    if (occTableM) occTableM.setTint(0x7A5020);
    const occPlantR = this.placeAt(11.2, 6.8, 'k-plant-pot', {
      scale: 0.60,
      shadow: { width: 14, height: 4, offsetY: 5, alpha: 0.10 },
    });
    if (occPlantR) occPlantR.setTint(0x4A3810);

    // ── BOTTOM-EDGE FRAMERS — fixed depth 601 ──────────────────────
    // Warm-tinted potted plants at different row heights crop into the
    // viewport bottom edge (origin 0.5, 0.90) — apartment window-sill feel.
    // Rows 7.6 vs 7.3 vs 7.8 intentionally differ to avoid a flat band.
    const fwL = this.grid(0.4, 7.6);
    const fwR = this.grid(11.6, 7.3);
    const fwC = this.grid(6.2, 7.8);
    this.add.image(fwL.x, fwL.y, 'k-plant-pot')
      .setOrigin(0.5, 0.90).setScale(0.82).setTint(0x3C2808).setAlpha(0.85).setDepth(601);
    this.add.image(fwR.x, fwR.y, 'k-plant-pot')
      .setOrigin(0.5, 0.90).setScale(0.76).setTint(0x3C2808).setAlpha(0.85).setDepth(601);
    this.add.image(fwC.x, fwC.y, 'k-plant-small-1')
      .setOrigin(0.5, 0.92).setScale(0.60).setTint(0x3A2606).setAlpha(0.75).setDepth(601);
  }

  /** Pulsing warm light pool beneath a lamp (light-blob). */
  _addLampPool(c, r, scaleX, scaleY, tint, alpha, duration) {
    if (!this.textures.exists('light-blob')) return;
    const pos  = this.grid(c, r);
    const pool = this.add.image(pos.x, pos.y - 40, 'light-blob')
      .setScale(scaleX, scaleY).setAlpha(alpha).setTint(tint)
      .setBlendMode('ADD').setDepth(this.layers.depth('gameplay', 1));
    this._lampPools.push(pool);
    this.tweens.add({
      targets:  pool,
      alpha:    { from: alpha, to: alpha * 0.28 },
      scaleX:   { from: scaleX, to: scaleX * 1.28 },
      scaleY:   { from: scaleY, to: scaleY * 1.10 },
      duration, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND DECOR — sparse warm indoor pool, suppresses outdoor defaults
  // ═══════════════════════════════════════════════════════════════════

  buildGroundDecor() {
    // Default pool contains outdoor grass, flowers, rocks — all wrong for
    // an apartment interior. Very sparse warm plant scatter only.
    this._spawnGroundDecor({
      pool:     [ 'k-plant-small-1', 'k-plant-small-2' ],
      density:  0.06,
      rowRange: [5.7, 6.3],
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHARACTERS
  // ═══════════════════════════════════════════════════════════════════

  buildCharacters() {
    const start = this.grid(1.5, 5.2);
    this._player = this.charSystem.createPlayer(
      { playerStart: start },
      { texture: 'char-male-smart' },
    );
    this.shadows.add(this._player.sprite, {
      width: 22, height: 6, offsetY: 10, alpha: 0.30, dynamic: true,
    });

    // Aashna — seated far side of the long sofa, idle/wander
    const aPos = this.grid(9.6, 5.0);
    this._aashna = this.charSystem.createFemale(aPos.x, aPos.y, { texture: 'char-female-navy' });
    this._aashna.wander(aPos.x, aPos.y, 24);
    this.shadows.add(this._aashna.sprite, {
      width: 20, height: 5, offsetY: 10, alpha: 0.25, dynamic: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FX — golden sparkles + intro
  // ═══════════════════════════════════════════════════════════════════

  buildFX() {
    this.dialogue = new DialogueSystem(this);

    const W = this.worldW;

    // Golden motes drifting upward — celebratory warmth
    if (this.textures.exists('particle-glow')) {
      this.add.particles(W / 2, 0, 'particle-glow', {
        x:         { min: -W / 2, max: W / 2 },
        speedY:    { min: 6,  max: 18 },
        speedX:    { min: -4, max:  4 },
        scale:     { start: 0.12, end: 0 },
        alpha:     { start: 0.28, end: 0 },
        tint:      [0xFFD080, 0xFFBB66, 0xFFAA44],
        lifespan:  { min: 3000, max: 6000 },
        frequency: 200,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 50));
    }

    // Soft heart particles — quiet love layer
    if (this.textures.exists('particle-heart')) {
      this.add.particles(W / 2, 0, 'particle-heart', {
        x:         { min: -W / 2, max: W / 2 },
        speedY:    { min: 4, max: 10 },
        speedX:    { min: -2, max:  2 },
        scale:     { start: 0.10, end: 0 },
        alpha:     { start: 0.20, end: 0 },
        tint:      [0xFFAACC, 0xFF88AA],
        lifespan:  { min: 4000, max: 8000 },
        frequency: 700,
        quantity:  1,
        blendMode: 'ADD',
      }).setDepth(this.layers.depth('fx', 52));
    }

    // ── CINEMATIC INTRO — Aashna is already home; reveal her, then pan to player ──
    // Hides player, snaps camera to the sofa side where Aashna waits,
    // holds 1.1s so the warm room reads, then smoothly pans left to
    // Prawal entering from the left. Control is given after the pan.
    this._cinematic = true;
    if (this._player) this._player.sprite.setAlpha(0);

    const playerPos = this.grid(1.5, 5.2);
    const aashnaPos = this.grid(9.6, 5.0);
    const bars = this.cam.letterbox(28, 900);

    this.cam.slowPan(aashnaPos.x, aashnaPos.y, 60, 'Linear', () => {
      // Hold on Aashna — let the room "breathe" before Prawal enters
      this.time.delayedCall(1100, () => {
        if (!this.sys?.isActive()) return;
        this.cam.slowPan(playerPos.x, playerPos.y, 2200, 'Sine.easeInOut', () => {
          bars.remove(500);
          if (this._player) {
            this.tweens.add({ targets: this._player.sprite, alpha: 1, duration: 400 });
            this.cam.follow(this._player.sprite);
            this.lighting.followTarget(this._player.sprite);
          }
          this._cinematic = false;

          // Intro narration fires after control is given
          this.time.delayedCall(500, () => {
            if (!this.sys?.isActive()) return;
            const lines = storyData.dialogues?.gifts_intro;
            if (lines) this.dialogue?.start(lines);
          });
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTION — gift collected
  // ═══════════════════════════════════════════════════════════════════

  _onGiftFound(index, dialogueKey) {
    // Escalating per-gift audio: sparkle-chime for gifts 1–4 (quiet discoveries),
    // tenderness stinger ONLY on the final gift — the cumulative "all of this was for you" payoff.
    const isLastGift = index === this._totalGifts - 1;
    if (isLastGift) {
      this.time.delayedCall(280, () => { if (!this.sys?.isActive()) return; audioManager.playStinger('tenderness'); });
    } else {
      audioManager._playTextureEvent?.('sparkle-chime');
    }
    this._giftsFound++;

    // Update UIScene counter (zoom-safe HUD)
    this.game.events.emit('collect-counter-update', { found: this._giftsFound, total: this._totalGifts });
    this.scene.get('UI')?._onCollectCounterUpdate?.({ found: this._giftsFound });

    // Burst the glow then fade it out — gift "consumed"
    const glow = this._giftGlows[index];
    if (glow) {
      this.tweens.killTweensOf(glow);
      this.tweens.add({
        targets:  glow,
        alpha:    0.60,
        scale:    3.8,
        duration: 350,
        yoyo:     true,
        ease:     'Quad.easeOut',
        onComplete: () => { if (this.sys?.isActive()) glow.setAlpha(0); },
      });
    }

    this.cam.zoomPulse(1.38, 600);

    // Unlock next gift only AFTER current dialogue ends — prevents
    // the player collecting gift N+1 while still reading gift N's lines.
    const nextIdx = index + 1;
    const onComplete = () => {
      if (!this.sys?.isActive()) return;
      if (nextIdx < this._totalGifts) {
        this.proximity.setEnabled(this._giftDefs[nextIdx].id, true);
        // Reveal next gift's emote — earned, not front-loaded
        const nextGd   = this._giftDefs[nextIdx];
        const nextEPos = this.grid(nextGd.c, nextGd.r - 1.0);
        this._addEmote(nextEPos.x, nextEPos.y, this._giftEmoteKeys[nextIdx], { scale: 0.26, delay: 0 });
        const nextGlow = this._giftGlows[nextIdx];
        if (nextGlow) {
          this.tweens.add({
            targets: nextGlow, alpha: 0.22, duration: 800, ease: 'Quad.easeOut',
            onComplete: () => {
              if (!this.sys?.isActive()) return;
              this.tweens.add({
                targets: nextGlow,
                scale: { from: 2.4, to: 3.0 },
                alpha:  { from: 0.22, to: 0.08 },
                duration: 1600 + nextIdx * 180,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
              });
            },
          });
        }
      }
      if (this._giftsFound >= this._totalGifts) this._chapterComplete();
    };

    const lines = storyData.dialogues?.[dialogueKey];
    if (lines) this.dialogue?.start(lines, onComplete);
    else this.time.delayedCall(400, () => { if (!this.sys?.isActive()) return; onComplete(); });
  }

  _chapterComplete() {
    this._guardTransition(() => {
      goToChapter(this, 11);
    });
  }

  onUpdate(_time, _delta) {
    this.env?.update(this.cameras.main.scrollX, this._player?.sprite);
  }

  onShutdown() {
    this.tweens.killTweensOf(this._wash);
    for (const p of this._lampPools ?? []) this.tweens.killTweensOf(p);
    for (const g of this._giftGlows ?? []) this.tweens.killTweensOf(g);
    this.game.events.emit('collect-counter-hide');
    this.scene.get('UI')?._onCollectCounterHide?.();
    audioManager.fadeOutAll(600);
    this.env?.destroy();
    this.dialogue?.destroy();
  }
}
