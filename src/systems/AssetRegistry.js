/**
 * AssetRegistry — single source of truth for all Kenney 2D assets.
 *
 * Classifies assets into:
 *   TILESETS   — large grid PNGs for Phaser tilemap layers (load.image)
 *   CHARACTERS — static single-frame character preview PNGs (load.image)
 *   PROPS      — individual static sprites: furniture + nature (load.image)
 *   PHOTOS     — optional story photos (load.image, non-fatal on failure)
 *
 * NOT INCLUDED (not usable in Phaser 2D):
 *   kenney/characters/Models/  — FBX / GLB / OBJ 3D formats only
 *   kenney/city/Models/        — 3D formats only
 *   kenney/food/Models/        — 3D formats only
 *   kenney/building/Models/    — 3D formats only
 *   kenney/tiles/city/Tiles/   — 1036 individual PNGs; use packed atlas instead
 *
 * Usage:
 *   import { loadKenneyAssets, AssetRegistry } from '../systems/AssetRegistry.js';
 *   // In PreloadScene.preload():
 *   loadKenneyAssets(this);
 */

// ─── Base paths ──────────────────────────────────────────────────────────────

const BASE_TILES        = 'assets/kenney/tiles';
const BASE_FURNITURE    = 'assets/kenney/furniture/Side';
const BASE_FURNITURE_ISO= 'assets/kenney/furniture/Isometric';
const BASE_NATURE       = 'assets/kenney/nature/Side';

// New packs (downloaded 2026)
const BASE_BG_FULL      = 'assets/kenney/backgrounds/Backgrounds';
const BASE_BG_ELEMENTS  = 'assets/kenney/backgrounds/Backgrounds/Elements';
const BASE_BG_DEFAULT   = 'assets/kenney/backgrounds/PNG/Default';
const BASE_EMOTES       = 'assets/kenney/emotes/PNG/Vector/Style 1';
const BASE_ISO_LIB      = 'assets/kenney/iso-library/Isometric';
const BASE_ISO_BLDG     = 'assets/kenney/iso-buildings/PNG';
const BASE_ISO_LAND     = 'assets/kenney/iso-landscape/PNG';
const BASE_ISO_CITY     = 'assets/kenney/iso-city/PNG';
const BASE_BG_REMASTER  = 'assets/kenney/background-elements-remastered/PNG/Default';
const BASE_BG_FLAT      = 'assets/kenney/background-elements/PNG/Flat';
const BASE_BG_ELEM_PNG  = 'assets/kenney/background-elements/PNG';
const BASE_FOLIAGE      = 'assets/kenney/foliage/PNG/Default size';
const BASE_PARTICLES    = 'assets/kenney/particles/PNG (Transparent)';
const BASE_PLAT_BLDG    = 'assets/kenney/platformer-buildings/Tiles';

// ─── Registry ────────────────────────────────────────────────────────────────

export const AssetRegistry = {

  // ── TILESETS ──────────────────────────────────────────────────────────────
  // All three are used with Phaser's tilemap system (map.addTilesetImage).
  // Loaded via load.image — addTilesetImage accepts plain image keys and
  // calculates tile frames from tileW/tileH/margin/spacing itself.
  //
  // Grid layout (all 16×16 tiles, 1px spacing between tiles):
  //   roguelike: 57 cols × 31 rows = 1767 tiles  (margin 0, spacing 1)
  //   indoors  : 27 cols × 18 rows = 486 tiles    (margin 0, spacing 1)
  //   city     : packed atlas, ~37 cols × 28 rows  (margin 0, spacing 1)

  tilesets: {
    /** Kenney Roguelike tileset — outdoor/dungeon ground + walls */
    'roguelike-tiles': {
      path:    `${BASE_TILES}/roguelike/Spritesheet/roguelikeSheet_transparent.png`,
      type:    'tileset',
      tileW:   16,
      tileH:   16,
      margin:  0,
      spacing: 1,
      cols:    57,
      rows:    31,
      /** Internal tileset name passed to map.addTilesetImage */
      tsName:  'roguelikeTiles',
    },
    /** Kenney Roguelike Indoors tileset — interior floors + walls */
    'tm-indoors': {
      path:    `${BASE_TILES}/indoors/Tilesheets/roguelikeIndoor_transparent.png`,
      type:    'tileset',
      tileW:   16,
      tileH:   16,
      margin:  0,
      spacing: 1,
      cols:    27,
      rows:    18,
      tsName:  'indoorsTiles',
    },
    /** Kenney City tileset — city streets + buildings */
    'tm-city': {
      path:    `${BASE_TILES}/city/Tilemap/tilemap.png`,
      type:    'tileset',
      tileW:   16,
      tileH:   16,
      margin:  0,
      spacing: 1,
      cols:    37,
      rows:    28,
      tsName:  'cityTiles',
    },
  },

  // ── CHARACTERS ────────────────────────────────────────────────────────────
  // Generated procedurally in BootScene via canvas drawing (_npcSprites).
  // char-male and char-female are created there — no file paths needed here.
  // Modular character body-part sprites registered below under modularChars.
  characters: {},

  // ── MODULAR CHARACTERS — body part spritesheets (layer compositing) ──────
  // Sheet + XML atlas for face, hair, shirts, pants, shoes.
  // Load via scene.load.multiatlas or scene.load.atlas with the XML.
  modularChars: {},  // reserved for future compositor support

  // ── PROPS — Nature (kenney/nature/Side) ───────────────────────────────────

  nature: {
    // Trees — green
    'k-tree-oak':          `${BASE_NATURE}/tree_oak.png`,
    'k-tree-default':      `${BASE_NATURE}/tree_default.png`,
    'k-tree-fat':          `${BASE_NATURE}/tree_fat.png`,
    'k-tree-detailed':     `${BASE_NATURE}/tree_detailed.png`,
    'k-tree-tall':         `${BASE_NATURE}/tree_tall.png`,
    'k-tree-small':        `${BASE_NATURE}/tree_small.png`,
    'k-tree-simple':       `${BASE_NATURE}/tree_simple.png`,
    'k-tree-pine-a':       `${BASE_NATURE}/tree_pineRoundA.png`,
    'k-tree-pine-b':       `${BASE_NATURE}/tree_pineRoundB.png`,
    'k-tree-pine-c':       `${BASE_NATURE}/tree_pineRoundC.png`,
    'k-tree-pine-d':       `${BASE_NATURE}/tree_pineRoundD.png`,
    // Trees — dark/silhouette for mood scenes
    'k-tree-oak-dark':     `${BASE_NATURE}/tree_oak_dark.png`,
    'k-tree-default-dark': `${BASE_NATURE}/tree_default_dark.png`,
    'k-tree-thin-dark':    `${BASE_NATURE}/tree_thin_dark.png`,
    'k-tree-tall-dark':    `${BASE_NATURE}/tree_tall_dark.png`,
    'k-tree-simple-dark':  `${BASE_NATURE}/tree_simple_dark.png`,
    // Bushes / plants
    'k-bush':              `${BASE_NATURE}/plant_bushDetailed.png`,
    'k-bush-small':        `${BASE_NATURE}/plant_bushSmall.png`,
    'k-bush-large':        `${BASE_NATURE}/plant_bushLarge.png`,
    'k-plant-flat-short':  `${BASE_NATURE}/plant_flatShort.png`,
    'k-plant-flat-tall':   `${BASE_NATURE}/plant_flatTall.png`,
    // Flowers
    'k-flower-red':        `${BASE_NATURE}/flower_redA.png`,
    'k-flower-red-b':      `${BASE_NATURE}/flower_redB.png`,
    'k-flower-purple':     `${BASE_NATURE}/flower_purpleA.png`,
    'k-flower-purple-b':   `${BASE_NATURE}/flower_purpleB.png`,
    'k-flower-yellow':     `${BASE_NATURE}/flower_yellowA.png`,
    'k-flower-yellow-b':   `${BASE_NATURE}/flower_yellowB.png`,
    // Grass
    'k-grass':             `${BASE_NATURE}/grass.png`,
    'k-grass-large':       `${BASE_NATURE}/grass_large.png`,
    'k-grass-leafs':       `${BASE_NATURE}/grass_leafs.png`,
    // Rocks / stones
    'k-rock-small-a':      `${BASE_NATURE}/rock_smallA.png`,
    'k-rock-small-b':      `${BASE_NATURE}/rock_smallB.png`,
    'k-rock-large-a':      `${BASE_NATURE}/rock_largeA.png`,
    'k-rock-large-b':      `${BASE_NATURE}/rock_largeB.png`,
    'k-rock-tall-a':       `${BASE_NATURE}/rock_tallA.png`,
    'k-rock-tall-b':       `${BASE_NATURE}/rock_tallB.png`,
    // Misc nature
    'k-mushroom-tan':      `${BASE_NATURE}/mushroom_tan.png`,
    'k-mushroom-red':      `${BASE_NATURE}/mushroom_red.png`,
    'k-stump':             `${BASE_NATURE}/stump_round.png`,
    'k-log':               `${BASE_NATURE}/log.png`,
    // Campfire
    'k-campfire-logs':     `${BASE_NATURE}/campfire_logs.png`,
    'k-campfire-stones':   `${BASE_NATURE}/campfire_stones.png`,
    // Path tiles
    'k-path-stone':        `${BASE_NATURE}/path_stone.png`,
    'k-path-stone-circle': `${BASE_NATURE}/path_stoneCircle.png`,
    // Atmospheric
    'k-hanging-moss':      `${BASE_NATURE}/hanging_moss.png`,
    // Fences + architectural
    'k-fence-simple':      `${BASE_NATURE}/fence_simple.png`,
    'k-fence-gate':        `${BASE_NATURE}/fence_gate.png`,
    'k-statue-column':     `${BASE_NATURE}/statue_column.png`,
  },

  // ── PROPS — Furniture (kenney/furniture/Side) ─────────────────────────────

  furniture: {
    // Floor modules
    'k-floor':           `${BASE_FURNITURE}/floorFull.png`,
    'k-floor-corner':    `${BASE_FURNITURE}/floorCorner.png`,
    'k-floor-half':      `${BASE_FURNITURE}/floorHalf.png`,
    // Walls
    'k-wall':            `${BASE_FURNITURE}/wall.png`,
    'k-wall-corner':     `${BASE_FURNITURE}/wallCorner.png`,
    'k-wall-window':     `${BASE_FURNITURE}/wallWindow.png`,
    'k-wall-door':       `${BASE_FURNITURE}/wallDoorway.png`,
    // Seating
    'k-bench':           `${BASE_FURNITURE}/bench.png`,
    'k-bench-soft':      `${BASE_FURNITURE}/benchCushion.png`,
    'k-chair':           `${BASE_FURNITURE}/chair.png`,
    'k-chair-desk':      `${BASE_FURNITURE}/chairDesk.png`,
    'k-sofa':            `${BASE_FURNITURE}/loungeSofa.png`,
    'k-sofa-long':       `${BASE_FURNITURE}/loungeSofaLong.png`,
    'k-sofa-design':     `${BASE_FURNITURE}/loungeDesignSofa.png`,
    'k-lounge-chair':    `${BASE_FURNITURE}/loungeChair.png`,
    'k-lounge-relax':    `${BASE_FURNITURE}/loungeChairRelax.png`,
    // Tables
    'k-table':           `${BASE_FURNITURE}/table.png`,
    'k-table-coffee':    `${BASE_FURNITURE}/tableCoffee.png`,
    'k-table-round':     `${BASE_FURNITURE}/tableRound.png`,
    // Office / desk
    'k-desk':            `${BASE_FURNITURE}/desk.png`,
    'k-computer':        `${BASE_FURNITURE}/computerScreen.png`,
    'k-laptop':          `${BASE_FURNITURE}/laptop.png`,
    'k-keyboard':        `${BASE_FURNITURE}/computerKeyboard.png`,
    // Storage
    'k-bookcase':        `${BASE_FURNITURE}/bookcaseOpen.png`,
    'k-bookcase-closed': `${BASE_FURNITURE}/bookcaseClosed.png`,
    'k-bookcase-wide':   `${BASE_FURNITURE}/bookcaseClosedWide.png`,
    // Lighting
    'k-lamp-floor':      `${BASE_FURNITURE}/lampRoundFloor.png`,
    'k-lamp-table':      `${BASE_FURNITURE}/lampRoundTable.png`,
    // Plants / decor
    'k-plant-pot':       `${BASE_FURNITURE}/pottedPlant.png`,
    'k-plant-small-1':   `${BASE_FURNITURE}/plantSmall1.png`,
    'k-plant-small-2':   `${BASE_FURNITURE}/plantSmall2.png`,
    // Rugs — Side view (correct perspective for 2D side-scroll)
    'k-rug-rect':        `${BASE_FURNITURE}/rugRectangle.png`,
    'k-rug-round':       `${BASE_FURNITURE}/rugRound.png`,
    // Home electronics + accessories
    'k-television':      `${BASE_FURNITURE}/televisionModern.png`,
    'k-coat-rack':       `${BASE_FURNITURE}/coatRack.png`,
    'k-side-table':      `${BASE_FURNITURE}/sideTable.png`,
    'k-trashcan':        `${BASE_FURNITURE}/trashcan.png`,
  },

  // ── PROPS — Isometric Furniture (kenney/furniture/Isometric, SW view) ───────
  // SW orientation gives the canonical "camera looks from above-right" angle
  // that blends naturally with a top-down perspective game.
  // Add only the pieces we need for chapter scenes; extend as required.

  isoFurniture: {
    'iso-desk':           `${BASE_FURNITURE_ISO}/desk_SW.png`,
    'iso-desk-corner':    `${BASE_FURNITURE_ISO}/deskCorner_SW.png`,
    'iso-laptop':         `${BASE_FURNITURE_ISO}/laptop_SW.png`,
    'iso-computer':       `${BASE_FURNITURE_ISO}/computerScreen_SW.png`,
    'iso-keyboard':       `${BASE_FURNITURE_ISO}/computerKeyboard_SW.png`,
    'iso-chair-desk':     `${BASE_FURNITURE_ISO}/chairDesk_SW.png`,
    'iso-chair':          `${BASE_FURNITURE_ISO}/chair_SW.png`,
    'iso-chair-rounded':  `${BASE_FURNITURE_ISO}/chairRounded_SW.png`,
    'iso-sofa':           `${BASE_FURNITURE_ISO}/loungeSofa_SW.png`,
    'iso-sofa-long':      `${BASE_FURNITURE_ISO}/loungeSofaLong_SW.png`,
    'iso-bookcase':       `${BASE_FURNITURE_ISO}/bookcaseOpen_SW.png`,
    'iso-bookcase-closed':`${BASE_FURNITURE_ISO}/bookcaseClosed_SW.png`,
    'iso-bookcase-low':   `${BASE_FURNITURE_ISO}/bookcaseOpenLow_SW.png`,
    'iso-lamp-floor':     `${BASE_FURNITURE_ISO}/lampRoundFloor_SW.png`,
    'iso-lamp-table':     `${BASE_FURNITURE_ISO}/lampRoundTable_SW.png`,
    'iso-table':          `${BASE_FURNITURE_ISO}/table_SW.png`,
    'iso-table-coffee':   `${BASE_FURNITURE_ISO}/tableCoffee_SW.png`,
    'iso-table-round':    `${BASE_FURNITURE_ISO}/tableRound_SW.png`,
    'iso-bed-double':     `${BASE_FURNITURE_ISO}/bedDouble_SW.png`,
    'iso-bed-single':     `${BASE_FURNITURE_ISO}/bedSingle_SW.png`,
    'iso-rug-rect':       `${BASE_FURNITURE_ISO}/rugRectangle_SW.png`,
    'iso-rug-round':      `${BASE_FURNITURE_ISO}/rugRound_SW.png`,
    'iso-plant-pot':      `${BASE_FURNITURE_ISO}/pottedPlant_SW.png`,
    'iso-plant-small-1':  `${BASE_FURNITURE_ISO}/plantSmall1_SW.png`,
    'iso-plant-small-3':  `${BASE_FURNITURE_ISO}/plantSmall3_SW.png`,
    'iso-tv-modern':      `${BASE_FURNITURE_ISO}/televisionModern_SW.png`,
    'iso-wall':           `${BASE_FURNITURE_ISO}/wall_SW.png`,
    'iso-wall-window':    `${BASE_FURNITURE_ISO}/wallWindow_SW.png`,
    'iso-wall-door':      `${BASE_FURNITURE_ISO}/wallDoorway_SW.png`,
    'iso-floor':          `${BASE_FURNITURE_ISO}/floorFull_SW.png`,
    'iso-radio':          `${BASE_FURNITURE_ISO}/radio_SW.png`,
    'iso-speaker':        `${BASE_FURNITURE_ISO}/speaker_SW.png`,
    'iso-bench-cushion':  `${BASE_FURNITURE_ISO}/benchCushion_SW.png`,
  },

  // ── BACKGROUNDS — full-scene atmospheric backdrops ────────────────────────
  // backgroundColor* = 1024×1024 side-view sky+ground+tree scenes.
  // Used at depth -200 with low scrollFactor for parallax depth.

  backgrounds: {
    'bg-scene-forest':   `${BASE_BG_FULL}/backgroundColorForest.png`,
    'bg-scene-grass':    `${BASE_BG_FULL}/backgroundColorGrass.png`,
    'bg-scene-fall':     `${BASE_BG_FULL}/backgroundColorFall.png`,
    'bg-scene-desert':   `${BASE_BG_FULL}/backgroundColorDesert.png`,
    'bg-scene-empty':    `${BASE_BG_FULL}/backgroundEmpty.png`,
    // Parallax element layers
    'bg-el-cloud1':      `${BASE_BG_ELEMENTS}/cloudLayer1.png`,
    'bg-el-cloud2':      `${BASE_BG_ELEMENTS}/cloudLayer2.png`,
    'bg-el-ground1':     `${BASE_BG_ELEMENTS}/groundLayer1.png`,
    'bg-el-ground2':     `${BASE_BG_ELEMENTS}/groundLayer2.png`,
    'bg-el-hills':       `${BASE_BG_ELEMENTS}/hills.png`,
    'bg-el-hills-large': `${BASE_BG_ELEMENTS}/hillsLarge.png`,
    'bg-el-mountains':   `${BASE_BG_ELEMENTS}/mountains.png`,
    // Foreground element sprites
    'bg-tree':           `${BASE_BG_DEFAULT}/tree.png`,
    'bg-tree-pine':      `${BASE_BG_DEFAULT}/treePine.png`,
    'bg-tree-orange':    `${BASE_BG_DEFAULT}/treeOrange.png`,
    'bg-bush1':          `${BASE_BG_DEFAULT}/bush1.png`,
    'bg-bush2':          `${BASE_BG_DEFAULT}/bush2.png`,
    'bg-cloud1':         `${BASE_BG_DEFAULT}/cloud1.png`,
    'bg-cloud2':         `${BASE_BG_DEFAULT}/cloud2.png`,
    'bg-moon':           `${BASE_BG_DEFAULT}/moonFull.png`,
    'bg-house1':         `${BASE_BG_DEFAULT}/house1.png`,
    'bg-house2':         `${BASE_BG_DEFAULT}/house2.png`,

    // ── Remastered background elements — higher-res trees, clouds, buildings
    'bgr-cloud1':        `${BASE_BG_REMASTER}/cloud1.png`,
    'bgr-cloud2':        `${BASE_BG_REMASTER}/cloud2.png`,
    'bgr-cloud3':        `${BASE_BG_REMASTER}/cloud3.png`,
    'bgr-cloud4':        `${BASE_BG_REMASTER}/cloud4.png`,
    'bgr-cloud5':        `${BASE_BG_REMASTER}/cloud5.png`,
    'bgr-tree':          `${BASE_BG_REMASTER}/tree.png`,
    'bgr-tree-long':     `${BASE_BG_REMASTER}/treeLong.png`,
    'bgr-tree-pine':     `${BASE_BG_REMASTER}/treePine.png`,
    'bgr-tree-orange':   `${BASE_BG_REMASTER}/treeOrange.png`,
    'bgr-tree-long-orange': `${BASE_BG_REMASTER}/treeLongOrange.png`,
    'bgr-tree-dead':     `${BASE_BG_REMASTER}/treeDead.png`,
    'bgr-tree-sm-1':     `${BASE_BG_REMASTER}/treeSmall_green1.png`,
    'bgr-tree-sm-2':     `${BASE_BG_REMASTER}/treeSmall_green2.png`,
    'bgr-tree-sm-3':     `${BASE_BG_REMASTER}/treeSmall_green3.png`,
    'bgr-tree-sm-o1':    `${BASE_BG_REMASTER}/treeSmall_orange1.png`,
    'bgr-tree-sm-o2':    `${BASE_BG_REMASTER}/treeSmall_orange2.png`,
    'bgr-bush1':         `${BASE_BG_REMASTER}/bush1.png`,
    'bgr-bush2':         `${BASE_BG_REMASTER}/bush2.png`,
    'bgr-bush3':         `${BASE_BG_REMASTER}/bush3.png`,
    'bgr-bush-o1':       `${BASE_BG_REMASTER}/bushOrange1.png`,
    'bgr-bush-o2':       `${BASE_BG_REMASTER}/bushOrange2.png`,
    'bgr-house1':        `${BASE_BG_REMASTER}/house1.png`,
    'bgr-house2':        `${BASE_BG_REMASTER}/house2.png`,
    'bgr-house-sm1':     `${BASE_BG_REMASTER}/houseSmall1.png`,
    'bgr-house-sm2':     `${BASE_BG_REMASTER}/houseSmall2.png`,
    'bgr-sun':           `${BASE_BG_REMASTER}/sun.png`,
    'bgr-moon':          `${BASE_BG_REMASTER}/moon.png`,

    // ── Flat silhouette strips — additional mountain/hill shapes
    'bg-flat-mountain1':   `${BASE_BG_FLAT}/mountain1.png`,
    'bg-flat-mountain2':   `${BASE_BG_FLAT}/mountain2.png`,
    'bg-flat-mountain3':   `${BASE_BG_FLAT}/mountain3.png`,
    'bg-flat-hills1':      `${BASE_BG_FLAT}/hills1.png`,
    'bg-flat-hills2':      `${BASE_BG_FLAT}/hills2.png`,
    'bg-flat-clouds1':     `${BASE_BG_FLAT}/clouds1.png`,
    'bg-flat-clouds2':     `${BASE_BG_FLAT}/clouds2.png`,
    'bg-flat-sky':         `${BASE_BG_FLAT}/sky.png`,

    // ── Foliage pack — trees ( mid/foreground parallax )
    'foliage-tree1':        `${BASE_FOLIAGE}/foliagePack_011.png`,  // wide rounded deciduous
    'foliage-tree2':        `${BASE_FOLIAGE}/foliagePack_009.png`,  // tall leafy deciduous
    'foliage-tree3':        `${BASE_FOLIAGE}/foliagePack_010.png`,  // rounded deciduous
    'foliage-tree4':        `${BASE_FOLIAGE}/foliagePack_030.png`,  // layered christmas pine
    'foliage-tree5':        `${BASE_FOLIAGE}/foliagePack_005.png`,  // tiered pine (dark)
    'foliage-tree6':        `${BASE_FOLIAGE}/foliagePack_006.png`,  // bright layered pine
    'foliage-tree7':        `${BASE_FOLIAGE}/foliagePack_007.png`,  // tall narrow deciduous
    'foliage-tree8':        `${BASE_FOLIAGE}/foliagePack_008.png`,  // ovoid deciduous
    'foliage-tree9':        `${BASE_FOLIAGE}/foliagePack_012.png`,  // narrow cypress
    'foliage-tree-aut1':    `${BASE_FOLIAGE}/foliagePack_048.png`,  // autumn canopy blob
    'foliage-tree-aut2':    `${BASE_FOLIAGE}/foliagePack_049.png`,  // autumn cypress

    // ── Foliage pack — ground-level bushes / hedges
    'foliage-bush1':        `${BASE_FOLIAGE}/foliagePack_050.png`,  // round cloud bush
    'foliage-bush2':        `${BASE_FOLIAGE}/foliagePack_051.png`,  // flat wide hedge (small)
    'foliage-bush3':        `${BASE_FOLIAGE}/foliagePack_052.png`,  // flat wide hedge (med)
    'foliage-bush4':        `${BASE_FOLIAGE}/foliagePack_053.png`,  // flat wide hedge (large)

    // ── Foliage pack — flowers (ground scatter)
    'foliage-flower-red':   `${BASE_FOLIAGE}/foliagePack_001.png`,  // red flower on stem
    'foliage-flower-blue':  `${BASE_FOLIAGE}/foliagePack_002.png`,  // blue flower on stem
    'foliage-flower-tulip': `${BASE_FOLIAGE}/foliagePack_004.png`,  // purple tulip

    // ── Foliage pack — rocks (accent props)
    'foliage-rock1':        `${BASE_FOLIAGE}/foliagePack_058.png`,  // grey rock / boulder
    'foliage-rock2':        `${BASE_FOLIAGE}/foliagePack_061.png`,  // grey rock (flat)

    // ── Detailed tree sprites (background-elements PNG root)
    'bge-tree01':        `${BASE_BG_ELEM_PNG}/tree01.png`,
    'bge-tree02':        `${BASE_BG_ELEM_PNG}/tree02.png`,
    'bge-tree03':        `${BASE_BG_ELEM_PNG}/tree03.png`,
    'bge-tree06':        `${BASE_BG_ELEM_PNG}/tree06.png`,
    'bge-tree09':        `${BASE_BG_ELEM_PNG}/tree09.png`,
    'bge-tree14':        `${BASE_BG_ELEM_PNG}/tree14.png`,
    'bge-tree18':        `${BASE_BG_ELEM_PNG}/tree18.png`,
    'bge-tree22':        `${BASE_BG_ELEM_PNG}/tree22.png`,
    'bge-tree26':        `${BASE_BG_ELEM_PNG}/tree26.png`,

    // ── Kenney Particles — soft glows for ambient VFX
    'particle-circle':   `${BASE_PARTICLES}/circle_05.png`,
    'particle-star-k':   `${BASE_PARTICLES}/star_04.png`,
    'particle-smoke':    `${BASE_PARTICLES}/smoke_04.png`,
    'particle-spark':    `${BASE_PARTICLES}/spark_05.png`,
    'particle-flare':    `${BASE_PARTICLES}/flare_01.png`,
    'particle-magic':    `${BASE_PARTICLES}/magic_04.png`,
    'particle-light':    `${BASE_PARTICLES}/light_01.png`,
    'particle-twirl':    `${BASE_PARTICLES}/twirl_02.png`,
  },

  // ── EMOTES — vector speech-bubble icons (Style 1, clean vector) ──────────
  // All keys prefixed 'emote-'. Placed above characters as floating icons.

  emotes: {
    'emote-heart':        `${BASE_EMOTES}/emote_heart.png`,
    'emote-hearts':       `${BASE_EMOTES}/emote_hearts.png`,
    'emote-heartBroken':  `${BASE_EMOTES}/emote_heartBroken.png`,
    'emote-exclamation':  `${BASE_EMOTES}/emote_exclamation.png`,
    'emote-question':     `${BASE_EMOTES}/emote_question.png`,
    'emote-dots1':        `${BASE_EMOTES}/emote_dots1.png`,
    'emote-dots2':        `${BASE_EMOTES}/emote_dots2.png`,
    'emote-dots3':        `${BASE_EMOTES}/emote_dots3.png`,
    'emote-music':        `${BASE_EMOTES}/emote_music.png`,
    'emote-star':         `${BASE_EMOTES}/emote_star.png`,
    'emote-stars':        `${BASE_EMOTES}/emote_stars.png`,
    'emote-faceHappy':    `${BASE_EMOTES}/emote_faceHappy.png`,
    'emote-idea':         `${BASE_EMOTES}/emote_idea.png`,
    'emote-sleeps':       `${BASE_EMOTES}/emote_sleeps.png`,
  },

  // ── ISO LIBRARY — named isometric miniature library props (_S = South) ───
  // Named assets — direct drop-in companions to existing isoFurniture props.

  isoLibrary: {
    'lib-bookcase':          `${BASE_ISO_LIB}/bookcaseBooks_S.png`,
    'lib-bookcase-ladder':   `${BASE_ISO_LIB}/bookcaseBooksLadder_S.png`,
    'lib-bookcase-glass':    `${BASE_ISO_LIB}/bookcaseGlass_S.png`,
    'lib-bookcase-half':     `${BASE_ISO_LIB}/bookcaseHalfBooks_S.png`,
    'lib-bookcase-wide':     `${BASE_ISO_LIB}/bookcaseWideBooks_S.png`,
    'lib-bookcase-wide-lad': `${BASE_ISO_LIB}/bookcaseWideBooksLadder_S.png`,
    'lib-bookcase-empty':    `${BASE_ISO_LIB}/bookcaseEmpty_S.png`,
    'lib-bookstand':         `${BASE_ISO_LIB}/bookStand_S.png`,
    'lib-bookstand-empty':   `${BASE_ISO_LIB}/bookStandEmpty_S.png`,
    'lib-display-case':      `${BASE_ISO_LIB}/displayCase_S.png`,
    'lib-display-books':     `${BASE_ISO_LIB}/displayCaseBooks_S.png`,
    'lib-candle':            `${BASE_ISO_LIB}/candleStand_S.png`,
    'lib-candle-double':     `${BASE_ISO_LIB}/candleStandDouble_S.png`,
    'lib-carpet':            `${BASE_ISO_LIB}/floorCarpet_S.png`,
    'lib-carpet-small':      `${BASE_ISO_LIB}/floorCarpetSmall_S.png`,
    'lib-chair':             `${BASE_ISO_LIB}/libraryChair_S.png`,
    'lib-table':             `${BASE_ISO_LIB}/longTable_S.png`,
    'lib-table-large':       `${BASE_ISO_LIB}/longTableLarge_S.png`,
    'lib-table-chairs':      `${BASE_ISO_LIB}/longTableDecoratedChairs_S.png`,
    'lib-wall-books':        `${BASE_ISO_LIB}/wallBooks_S.png`,
    'lib-wall-door':         `${BASE_ISO_LIB}/wallDoorway_S.png`,
  },

  // ── ISO BUILDINGS — complete isometric storefront/building tiles ──────────
  // Individual PNG files — placed as standalone architecture props.
  // 000-020: storefronts (walls + roofs combined). 021+: roof-only sections.

  isoBuildings: {
    'bldg-shop-red':     `${BASE_ISO_BLDG}/buildingTiles_000.png`,
    'bldg-shop-blue':    `${BASE_ISO_BLDG}/buildingTiles_001.png`,
    'bldg-shop-beige':   `${BASE_ISO_BLDG}/buildingTiles_002.png`,
    'bldg-shop-cream':   `${BASE_ISO_BLDG}/buildingTiles_003.png`,
    'bldg-shop-green':   `${BASE_ISO_BLDG}/buildingTiles_006.png`,
    'bldg-awning-red':   `${BASE_ISO_BLDG}/buildingTiles_009.png`,
    'bldg-awning-blue':  `${BASE_ISO_BLDG}/buildingTiles_010.png`,
    'bldg-house-a':      `${BASE_ISO_BLDG}/buildingTiles_048.png`,
    'bldg-house-b':      `${BASE_ISO_BLDG}/buildingTiles_049.png`,
    'bldg-house-c':      `${BASE_ISO_BLDG}/buildingTiles_050.png`,
    'bldg-office-a':     `${BASE_ISO_BLDG}/buildingTiles_060.png`,
    'bldg-office-b':     `${BASE_ISO_BLDG}/buildingTiles_061.png`,
    'bldg-office-c':     `${BASE_ISO_BLDG}/buildingTiles_072.png`,
  },

  // ── ISO LANDSCAPE — isometric terrain/ground tiles ───────────────────────
  // Grass, path, water tiles for outdoor traversable ground.

  isoLandscape: {
    'land-grass':       `${BASE_ISO_LAND}/landscapeTiles_003.png`,
    'land-grass-edge':  `${BASE_ISO_LAND}/landscapeTiles_000.png`,
    'land-path-a':      `${BASE_ISO_LAND}/landscapeTiles_008.png`,
    'land-path-b':      `${BASE_ISO_LAND}/landscapeTiles_009.png`,
    'land-water':       `${BASE_ISO_LAND}/landscapeTiles_006.png`,
    'land-hill':        `${BASE_ISO_LAND}/landscapeTiles_012.png`,
    'land-sand':        `${BASE_ISO_LAND}/landscapeTiles_030.png`,
  },

  // ── ISO CITY — isometric city street tiles + detail props ────────────────

  isoCity: {
    'city-road-a':      `${BASE_ISO_CITY}/cityTiles_000.png`,
    'city-road-b':      `${BASE_ISO_CITY}/cityTiles_001.png`,
    'city-road-c':      `${BASE_ISO_CITY}/cityTiles_002.png`,
    'city-road-cross':  `${BASE_ISO_CITY}/cityTiles_010.png`,
    'city-path-a':      `${BASE_ISO_CITY}/cityTiles_020.png`,
    'city-path-b':      `${BASE_ISO_CITY}/cityTiles_021.png`,
    'city-detail-lamp': 'assets/kenney/iso-city/Details/cityDetails_001.png',
    'city-detail-bench':'assets/kenney/iso-city/Details/cityDetails_002.png',
    'city-detail-tree': 'assets/kenney/iso-city/Details/cityDetails_005.png',
    'city-detail-sign': 'assets/kenney/iso-city/Details/cityDetails_008.png',
  },

  // ── STORY PHOTOS ─────────────────────────────────────────────────────────
  // Optional — game works without them (procedural fallback)

  photos: {
    'photo-wedding':    'photos/wedding.jpg',
    'photo-outing':     'photos/outing.jpg',
    'photo-present':    'photos/present.jpg',
    'photo-engagement': 'photos/engagement.jpg',
  },
};

// ─── Loader ──────────────────────────────────────────────────────────────────

/**
 * Load all Kenney 2D assets into a Phaser scene.
 *
 * Call this from PreloadScene.preload():
 *   loadKenneyAssets(this);
 *
 * Asset type → Phaser loader mapping:
 *   tilesets   → load.image   (used by map.addTilesetImage with explicit dims)
 *   characters → load.image   (static NPC sprites)
 *   props      → load.image   (static furniture/nature sprites)
 *   photos     → load.image   (non-fatal: loaderror is caught upstream)
 *
 * @param {Phaser.Scene} scene
 */
export function loadKenneyAssets(scene) {
  // Tilesets — load as plain images (addTilesetImage uses raw source, not frames)
  for (const [key, cfg] of Object.entries(AssetRegistry.tilesets)) {
    scene.load.image(key, cfg.path);
  }

  // Props — nature
  for (const [key, path] of Object.entries(AssetRegistry.nature)) {
    scene.load.image(key, path);
  }

  // Props — furniture (side view)
  for (const [key, path] of Object.entries(AssetRegistry.furniture)) {
    scene.load.image(key, path);
  }

  // Props — furniture (isometric SW view)
  for (const [key, path] of Object.entries(AssetRegistry.isoFurniture)) {
    scene.load.image(key, path);
  }

  // Backgrounds — full-scene atmospheric panoramas
  for (const [key, path] of Object.entries(AssetRegistry.backgrounds)) {
    scene.load.image(key, path);
  }

  // Emotes — floating icon sprites
  for (const [key, path] of Object.entries(AssetRegistry.emotes)) {
    scene.load.image(key, path);
  }

  // ISO Library — named isometric library props
  for (const [key, path] of Object.entries(AssetRegistry.isoLibrary)) {
    scene.load.image(key, path);
  }

  // ISO Buildings — complete building tile sprites
  for (const [key, path] of Object.entries(AssetRegistry.isoBuildings)) {
    scene.load.image(key, path);
  }

  // ISO Landscape — terrain tile sprites
  for (const [key, path] of Object.entries(AssetRegistry.isoLandscape)) {
    scene.load.image(key, path);
  }

  // ISO City — city tile + detail sprites
  for (const [key, path] of Object.entries(AssetRegistry.isoCity)) {
    scene.load.image(key, path);
  }

  // Photos — non-fatal (game has procedural fallbacks)
  for (const [key, path] of Object.entries(AssetRegistry.photos)) {
    scene.load.image(key, path);
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Print a structured asset audit summary to the console.
 * Call from PreloadScene.create() after loading completes.
 *
 * Checks that every registered asset key is actually present in Phaser's
 * texture cache, and reports any that failed to load.
 *
 * @param {Phaser.Scene} scene
 */
export function validateAssets(scene) {
  const results = {
    tilesets:   { ok: [], missing: [] },
    characters: { ok: [], missing: [] },
    nature:     { ok: [], missing: [] },
    furniture:  { ok: [], missing: [] },
    photos:     { ok: [], missing: [] },
  };

  const check = (category, map) => {
    for (const key of Object.keys(map)) {
      if (scene.textures.exists(key)) {
        results[category].ok.push(key);
      } else {
        results[category].missing.push(key);
      }
    }
  };

  check('tilesets',   AssetRegistry.tilesets);
  check('characters', AssetRegistry.characters);
  check('nature',     AssetRegistry.nature);
  check('furniture',  AssetRegistry.furniture);
  check('photos',     AssetRegistry.photos);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.groupCollapsed(
    '%c[AssetRegistry] Validation Report',
    'color:#E86090;font-weight:bold;font-size:13px'
  );

  for (const [cat, { ok, missing }] of Object.entries(results)) {
    const total  = ok.length + missing.length;
    const status = missing.length === 0 ? '✅' : '⚠️';
    console.log(
      `%c${status} ${cat.padEnd(12)} %c${ok.length}/${total} loaded`,
      'font-weight:bold',
      missing.length > 0 ? 'color:#FF8888' : 'color:#88FF99'
    );
    if (missing.length > 0) {
      console.warn(`   Missing keys (${cat}):`, missing);
    }
  }

  const totalOk      = Object.values(results).reduce((s, r) => s + r.ok.length, 0);
  const totalMissing = Object.values(results).reduce((s, r) => s + r.missing.length, 0);
  const totalAll     = totalOk + totalMissing;

  console.log(
    `%c── Total: ${totalOk}/${totalAll} assets loaded (${totalMissing} failed)`,
    totalMissing > 0
      ? 'color:#FF8888;font-weight:bold'
      : 'color:#88FF99;font-weight:bold'
  );

  // Tileset grid info
  console.groupCollapsed('%cTileset details', 'color:#AAAAFF');
  for (const [key, cfg] of Object.entries(AssetRegistry.tilesets)) {
    const tilesTotal = cfg.cols * cfg.rows;
    console.log(
      `  ${key}: ${cfg.cols}×${cfg.rows} = ${tilesTotal} tiles`,
      `(${cfg.tileW}×${cfg.tileH}px, spacing=${cfg.spacing})`
    );
  }
  console.groupEnd();

  console.groupEnd();

  return { results, totalOk, totalMissing };
}
