/**
 * ShadowRenderer — adds soft elliptical shadows under any game object.
 *
 * Features:
 *   - Configurable size, offset, opacity per object
 *   - Dynamic mode: shadow stretches when the object moves
 *   - Static mode: shadow stays fixed (furniture, trees, etc.)
 *   - Batch create/destroy for scene lifecycle
 *
 * Usage:
 *   const shadows = new ShadowRenderer(scene);
 *   const h = shadows.add(benchSprite, { width: 40, height: 8 });
 *   // in update():
 *   shadows.update();          // dynamic shadows only
 *   // cleanup:
 *   shadows.remove(h);         // or shadows.destroy() for all
 */

export class ShadowRenderer {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [opts]
   * @param {number} [opts.lightAngle] — fixed light-source direction in radians (H3).
   *   When set, dynamic shadows always fall in this world-space direction regardless of
   *   character movement. Omit (default) for movement-trail mode (shadow lags behind).
   *   Example: Math.PI * 0.75 produces SW shadows for a NE light source.
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    /** @type {ShadowHandle[]} */
    this._shadows = [];
    // H3: precompute light-direction vector once; null = movement-trail mode
    const la = opts.lightAngle ?? null;
    this._lightDX = la !== null ? Math.cos(la) : null;
    this._lightDY = la !== null ? Math.sin(la) : null;
  }

  /**
   * Add a shadow under a game object.
   * @param {Phaser.GameObjects.Components.Transform} target — any object with x/y
   * @param {object} [opts]
   * @param {number} [opts.width=28]       — ellipse base width
   * @param {number} [opts.height=8]       — ellipse base height
   * @param {number} [opts.alpha=0.22]     — base opacity
   * @param {number} [opts.offsetY=12]     — Y offset below target origin
   * @param {number} [opts.offsetX=0]      — X offset from target origin (L2)
   * @param {number} [opts.depthOffset=-1] — depth relative to target; clamped to <= -1 (L3)
   * @param {boolean}[opts.dynamic=false]  — stretch/shrink when target moves
   * @returns {ShadowHandle}
   */
  add(target, opts = {}) {
    const w     = opts.width       ?? 28;
    const h     = opts.height      ?? 8;
    const alpha = opts.alpha       ?? 0.16;  // reduced default; inner layer hits this value
    const offY  = opts.offsetY     ?? 12;
    const offX  = opts.offsetX     ?? 0;     // L2: horizontal shadow nudge
    // L3: clamp to negative — prevents shadow accidentally rendering above the target
    const depOff = Math.min(opts.depthOffset ?? -1, -1);
    const dyn   = opts.dynamic     ?? false;

    const tx = target.x;
    const ty = target.y;
    const targetDepth = target.depth ?? 0;

    // Three-layer soft shadow — creates a natural penumbra / feathered falloff
    // Outer halo:  2x size, 28% alpha  — wide, very faint
    // Mid layer:   1.4x size, 55% alpha — blends with outer
    // Core shadow: 0.7x size, 100% alpha — crisp dark centre
    const outer = this.scene.add.ellipse(
      tx + offX, ty + offY, w * 2.0, h * 1.8, 0x000000, alpha * 0.28
    ).setDepth(targetDepth + depOff - 2);

    const mid = this.scene.add.ellipse(
      tx + offX, ty + offY, w * 1.4, h * 1.3, 0x000000, alpha * 0.55
    ).setDepth(targetDepth + depOff - 1);

    const core = this.scene.add.ellipse(
      tx + offX, ty + offY, w * 0.7, h * 0.7, 0x000000, alpha
    ).setDepth(targetDepth + depOff);

    const handle = {
      target,
      ellipses: [outer, mid, core],
      // L1: removed dead `handle.ellipse` getter (Character.shadow no longer exists)
      baseW: w,
      baseH: h,
      baseAlpha: alpha,
      offsetY: offY,
      offsetX: offX,        // L2
      depthOffset: depOff,
      dynamic: dyn,
      _prevX: tx,
      _prevY: ty,
      _alphaFactor: 1.0,    // C3/M5: per-handle lerped alpha multiplier
      active: true,
      _prevDepth: targetDepth,
    };

    this._shadows.push(handle);
    return handle;
  }

  /**
   * Remove a single shadow.
   * @param {ShadowHandle} handle
   * @param {boolean} [fade=false]
   */
  remove(handle, fade = false) {
    if (!handle?.active) return;
    handle.active = false;
    if (fade) {
      this.scene.tweens.add({
        targets: handle.ellipses, alpha: 0, duration: 300,
        onComplete: () => handle.ellipses.forEach(e => e.destroy()),
      });
    } else {
      handle.ellipses.forEach(e => e.destroy());
    }
    const idx = this._shadows.indexOf(handle);
    if (idx !== -1) this._shadows.splice(idx, 1);
  }

  /**
   * Call every frame. Updates dynamic shadows' position and stretch.
   */
  update() {
    // H2: snapshot to prevent iterator invalidation — remove() splices _shadows mid-loop
    const active = this._shadows.slice();
    for (const s of active) {
      if (!s.active) continue;
      // C1: auto-remove stale targets — a destroyed Phaser GO has active=false.
      // Without this, ghost ellipses freeze at last position and are re-processed
      // every frame for the remainder of the scene's lifetime.
      if (!s.target?.active) { this.remove(s); continue; }

      const tx = s.target.x;
      const ty = s.target.y;
      const tDepth = s.target.depth ?? 0;

      const [outer, mid, core] = s.ellipses;

      // H1: sync depth independently from position skip.
      // Y-sorted targets have depth rewritten every frame by depthMgr.update(), so
      // bundling depth into the position-skip condition defeated the static
      // optimization entirely — all prop shadows were always re-processed.
      if (tDepth !== s._prevDepth) {
        outer.setDepth(tDepth + s.depthOffset - 2);
        mid.setDepth(tDepth + s.depthOffset - 1);
        core.setDepth(tDepth + s.depthOffset);
        s._prevDepth = tDepth;
      }

      // H1: position skip — valid only for non-dynamic props that have not moved
      if (!s.dynamic && tx === s._prevX && ty === s._prevY) continue;

      // Capture before overwriting — needed for stretch delta
      const prevX = s._prevX;
      const prevY = s._prevY;

      // Sync all layers to target position + lateral offset (L2)
      outer.x = tx + s.offsetX;  outer.y = ty + s.offsetY;
      mid.x   = tx + s.offsetX;  mid.y   = ty + s.offsetY;
      core.x  = tx + s.offsetX;  core.y  = ty + s.offsetY;

      s._prevX = tx;
      s._prevY = ty;

      if (s.dynamic) {
        const dx = tx - prevX;
        const dy = ty - prevY;
        const speed = Math.sqrt(dx * dx + dy * dy);
        // C2: was speed*0.3 — at 60fps/120px/s, dx~2px -> stretch=0.6 (sub-pixel, invisible).
        // At 3.0x the multiplier, typical walking produces stretch~6px — perceptible.
        const stretch = Math.min(speed * 3.0, 10);

        // M2: precompute lerped geometry into locals before assigning
        const cW = core.width   + (s.baseW * 0.7 + stretch * 0.7  - core.width)   * 0.15;
        const cH = core.height  + (s.baseH * 0.7 - stretch * 0.2  - core.height)  * 0.15;
        const mW = mid.width    + (s.baseW * 1.4 + stretch          - mid.width)   * 0.12;
        const mH = mid.height   + (s.baseH * 1.3 - stretch * 0.25  - mid.height)  * 0.12;
        const oW = outer.width  + (s.baseW * 2.0 + stretch * 1.2   - outer.width)  * 0.09;
        const oH = outer.height + (s.baseH * 1.8 - stretch * 0.3   - outer.height) * 0.09;
        core.width  = cW;  core.height  = cH;
        mid.width   = mW;  mid.height   = mH;
        outer.width = oW;  outer.height = oH;

        // C3/M1: lerped alpha factor — replaces the hard binary (0.72/1.0) toggle that
        // flickered on alternate frames when speed oscillated near the 0.5 threshold.
        const targetFactor = speed > 0.5 ? 0.72 : 1.0;
        s._alphaFactor += (targetFactor - s._alphaFactor) * 0.12;
        core.setAlpha(s.baseAlpha * s._alphaFactor);
        mid.setAlpha(s.baseAlpha * 0.55 * s._alphaFactor);
        outer.setAlpha(s.baseAlpha * 0.28 * s._alphaFactor);

        // H3: shadow offset proportional to stretch magnitude
        const offsetMag = stretch * 0.25;
        if (this._lightDX !== null) {
          // Fixed world-space light direction — shadow always falls away from the light
          // regardless of movement direction; correct for scenes with directional lighting.
          core.x  += this._lightDX * offsetMag;
          core.y  += this._lightDY * offsetMag;
          mid.x   += this._lightDX * offsetMag * 0.65;
          mid.y   += this._lightDY * offsetMag * 0.65;
          outer.x += this._lightDX * offsetMag * 0.40;
          outer.y += this._lightDY * offsetMag * 0.40;
        } else {
          // Movement-trail: shadow lags behind on both axes (Y foreshortened for top-down)
          const dxN = speed > 0 ? dx / speed : 0;
          const dyN = speed > 0 ? dy / speed : 0;
          core.x  -= dxN * offsetMag;
          core.y  -= dyN * offsetMag * 0.5;
          mid.x   -= dxN * offsetMag * 0.65;
          mid.y   -= dyN * offsetMag * 0.33;
          outer.x -= dxN * offsetMag * 0.40;
          outer.y -= dyN * offsetMag * 0.20;
        }
      }
    }
  }

  /** Destroy all shadows managed by this renderer. */
  destroy() {
    for (const s of this._shadows) {
      s.active = false;  // mark before destroy so stale remove() calls are no-ops
      s.ellipses.forEach(e => { if (e?.scene) e.destroy(); });
    }
    this._shadows.length = 0;
  }
}
