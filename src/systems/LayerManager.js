/**
 * LayerManager — manages 5 render layers for cinematic 2.5D depth.
 *
 * Layers (back → front):
 *   background  -200 … -100   sky, distant scenery, parallax bg
 *   midground   -99  … -1     ground, decorations, trees
 *   gameplay     0   … 599    player, objects, Y-sorted characters (max y≈576 in 9-row worlds)
 *   foreground  600  … 799    scene-space overlays above player: emotes, chat bubbles, proximity labels
 *   fx          800  … 999    vignette, grain, lighting, screen-space FX
 *
 * Usage:
 *   const layers = new LayerManager(scene);
 *   layers.depth('gameplay');          // → 0    (base)
 *   layers.depth('foreground', 10);    // → 610
 */

export class LayerManager {
  constructor(scene) {
    this.scene = scene;

    this.ranges = {
      background: { base: -200, max: -100 },
      midground:  { base: -99,  max: -1   },
      // gameplay max is 599, one below foreground (600), so Y-sorted objects whose
      // world-y reaches ~576 (9-row world height) still have headroom.
      // NOTE: DepthManager.addYSort() intentionally bypasses depth() clamping and
      // writes (base + y) directly — continuous values are required for correct
      // Y-sort ordering and must NOT be clamped to max.
      gameplay:   { base: 0,    max: 599  },
      foreground: { base: 600,  max: 799  },
      fx:         { base: 800,  max: 999  },
    };
  }

  /** Return a depth value for a given layer + optional offset within that layer */
  depth(layer, offset = 0) {
    const r = this.ranges[layer];
    if (!r) return offset;
    const raw = r.base + offset;
    // Dev-only warning — catches accidental overflows early without affecting prod.
    if (import.meta.env.DEV && raw > r.max) {
      console.warn(`[LayerManager] depth('${layer}', ${offset}) overflows by ${raw - r.max} (max ${r.max}). Value clamped.`);
    }
    return Math.min(raw, r.max);
  }

  /** Place a game object into the correct layer */
  place(gameObject, layer, offset = 0) {
    gameObject.setDepth(this.depth(layer, offset));
    return gameObject;
  }

  /** Symmetric teardown — no allocations to free but allows symmetric ?. destroy() calls. */
  destroy() {}
}
