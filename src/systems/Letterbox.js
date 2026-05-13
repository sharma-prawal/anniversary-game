/**
 * Letterbox — cinematic black bars that slide in/out.
 *
 * Creates top & bottom bars at extreme high depth, animated with
 * smooth ease-in/out. Used during dialogue, story beats, and transitions
 * to signal "cutscene mode" vs. free exploration.
 *
 * Usage:
 *   const lb = new Letterbox(scene);
 *   lb.show(600);   // slide bars in over 600ms
 *   lb.hide(400);   // slide bars out over 400ms
 */
export class Letterbox {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [opts]
   * @param {number} [opts.barHeight=36]  — height of each bar in px
   * @param {number} [opts.color=0x000000]
   * @param {number} [opts.alpha=0.92]
   * @param {number} [opts.depth=9000]
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    this._barH = opts.barHeight ?? 36;
    this._visible = false;

    const color = opts.color ?? 0x000000;
    const alpha = opts.alpha ?? 0.92;
    const depth = opts.depth ?? 9000;

    // Top bar — starts above screen
    this.topBar = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.topBar.fillStyle(color, alpha);
    this.topBar.fillRect(0, 0, w, this._barH);
    this.topBar.y = -this._barH;

    // Bottom bar — starts below screen
    this.botBar = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.botBar.fillStyle(color, alpha);
    this.botBar.fillRect(0, 0, w, this._barH);
    this.botBar.y = h;

    // Subtle gold accent lines on the inner edges
    const accent = scene.add.graphics().setScrollFactor(0).setDepth(depth + 1);
    accent.lineStyle(0.5, 0xC89070, 0.25);
    accent.lineBetween(0, this._barH - 0.5, w, this._barH - 0.5);
    this._topAccent = accent;
    this._topAccent.y = -this._barH;

    const accentB = scene.add.graphics().setScrollFactor(0).setDepth(depth + 1);
    accentB.lineStyle(0.5, 0xC89070, 0.25);
    accentB.lineBetween(0, 0.5, w, 0.5);
    this._botAccent = accentB;
    this._botAccent.y = h;
  }

  /** Slide bars into view. */
  show(durationMs = 500) {
    if (this._visible) return;
    this._visible = true;
    const h = this.scene.scale.height;

    this.scene.tweens.add({
      targets: [this.topBar, this._topAccent],
      y: 0,
      duration: durationMs,
      ease: 'Cubic.easeOut',
    });
    this.scene.tweens.add({
      targets: [this.botBar, this._botAccent],
      y: h - this._barH,
      duration: durationMs,
      ease: 'Cubic.easeOut',
    });
  }

  /** Slide bars out of view. */
  hide(durationMs = 400) {
    if (!this._visible) return;
    this._visible = false;
    const h = this.scene.scale.height;

    this.scene.tweens.add({
      targets: [this.topBar, this._topAccent],
      y: -this._barH,
      duration: durationMs,
      ease: 'Cubic.easeIn',
    });
    this.scene.tweens.add({
      targets: [this.botBar, this._botAccent],
      y: h,
      duration: durationMs,
      ease: 'Cubic.easeIn',
    });
  }

  get isVisible() { return this._visible; }

  /** Redraw bars at new screen dimensions after a resize / orientation change. */
  resize() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    // Redraw top bar + accent at new width
    this.topBar.clear();
    this.topBar.fillStyle(0x000000, 0.92);
    this.topBar.fillRect(0, 0, w, this._barH);

    this._topAccent.clear();
    this._topAccent.lineStyle(0.5, 0xC89070, 0.25);
    this._topAccent.lineBetween(0, this._barH - 0.5, w, this._barH - 0.5);

    // Redraw bottom bar + accent at new width
    this.botBar.clear();
    this.botBar.fillStyle(0x000000, 0.92);
    this.botBar.fillRect(0, 0, w, this._barH);

    this._botAccent.clear();
    this._botAccent.lineStyle(0.5, 0xC89070, 0.25);
    this._botAccent.lineBetween(0, 0.5, w, 0.5);

    // Reposition to correct Y: hidden bars sit off-screen, visible bars snap to edges
    if (this._visible) {
      this.topBar.y        = 0;
      this._topAccent.y   = 0;
      this.botBar.y        = h - this._barH;
      this._botAccent.y   = h - this._barH;
    } else {
      this.topBar.y        = -this._barH;
      this._topAccent.y   = -this._barH;
      this.botBar.y        = h;
      this._botAccent.y   = h;
    }
  }

  destroy() {
    this.topBar?.destroy();
    this.botBar?.destroy();
    this._topAccent?.destroy();
    this._botAccent?.destroy();
  }
}
