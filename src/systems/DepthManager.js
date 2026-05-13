/**
 * DepthManager — parallax scrolling + Y-based depth sorting.
 *
 * - Registers parallax layers with scroll factors
 * - Manages foreground transparent overlapping elements
 * - Provides Y-sort helper for gameplay-layer sprites
 */

export class DepthManager {
  constructor(scene, layers) {
    this.scene = scene;
    this.layers = layers;
    this._ySortItems = [];
    // Cache the gameplay layer base so update() avoids a map lookup per frame.
    this._gameplayBase = layers.depth('gameplay');
  }

  /**
   * Register a sprite for Y-based depth sorting.
   * @param {Phaser.GameObjects.GameObject} gameObject
   * @param {object} [opts]
   * @param {boolean} [opts.static=false] — if true, depth is set once and skipped in per-frame updates
   */
  addYSort(gameObject, opts = {}) {
    if (opts.static) {
      gameObject.setDepth(this.layers.depth('gameplay') + gameObject.y);
      return gameObject;
    }
    // Guard: reject duplicate registrations. A second addYSort on the same object
    // would leave a ghost entry that survives the first removeYSort call.
    if (this._ySortItems.indexOf(gameObject) !== -1) return gameObject;
    this._ySortItems.push(gameObject);
    return gameObject;
  }

  /**
   * Remove a sprite from Y-sort list.
   * @returns {boolean} true if found and removed, false if the object was not registered.
   */
  removeYSort(gameObject) {
    const idx = this._ySortItems.indexOf(gameObject);
    if (idx !== -1) { this._ySortItems.splice(idx, 1); return true; }
    return false;
  }

  /** Call every frame in update(): re-sort gameplay items by Y position */
  update() {
    if (!this.scene) return;  // guard against calls after destroy()
    const base = this._gameplayBase;
    for (let i = 0; i < this._ySortItems.length; i++) {
      const go = this._ySortItems[i];
      if (go.active) {
        // Skip the write when depth is already correct — avoids marking the
        // display list dirty (and triggering a re-sort) on stationary objects.
        const nd = base + go.y;
        if (go.depth !== nd) go.setDepth(nd);
      } else if (!go.scene) {
        // Object has been destroyed (Phaser sets .scene to null on destroy).
        // Prune it now so it doesn't accumulate as a ghost entry.
        this._ySortItems.splice(i, 1);
        i--;
      }
    }
  }

  destroy() {
    this._ySortItems.length = 0;
    this.scene = null;
    this.layers = null;
    this._gameplayBase = 0;
  }
}
