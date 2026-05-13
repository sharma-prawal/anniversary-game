import Phaser from 'phaser';

/**
 * CameraController — smooth follow, mood zoom, subtle idle drift.
 *
 * Wraps the Phaser main camera with:
 *   - Smooth lerp follow on a target (configurable stiffness)
 *   - Initial zoom tween on scene entry
 *   - Mood-based zoom presets
 *   - Gentle sinusoidal drift when idle (organic camera feel)
 *   - Utility helpers: zoomPulse, shake, slowPan
 *
 * Usage:
 *   const cam = new CameraController(scene);
 *   cam.configure({ zoom: 1.4, followLerp: 0.07 });
 *   cam.follow(playerSprite);
 *   // in update():
 *   cam.update(time);
 *   // cinematic beat:
 *   cam.zoomPulse(1.3, 600);
 */

export class CameraController {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [opts]
   * @param {number} [opts.zoom=1.0]        — initial zoom
   * @param {number} [opts.targetZoom]       — tween to this zoom over introMs
   * @param {number} [opts.introMs=2000]     — zoom intro duration
   * @param {number} [opts.followLerp=0.06]  — follow smoothness (0–1)
   * @param {boolean}[opts.drift=false]      — enable idle camera drift
   * @param {number} [opts.driftAmpX=10]
   * @param {number} [opts.driftAmpY=6]
   * @param {number} [opts.driftSpeedX=0.0003]
   * @param {number} [opts.driftSpeedY=0.0005]
   * @param {number} [opts.fadeInMs=1200]    — fade-in on create (0 to skip)
   * @param {number[]} [opts.bounds]         — [x, y, w, h] camera bounds
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.cam = scene.cameras.main;

    this._followLerp = opts.followLerp ?? 0.06;
    this._driftEnabled = opts.drift === true;
    this._driftAmp     = { x: opts.driftAmpX ?? 10, y: opts.driftAmpY ?? 6 };
    this._driftSpeed   = { x: opts.driftSpeedX ?? 0.0003, y: opts.driftSpeedY ?? 0.0005 };
    this._driftOffset  = { x: 0, y: 0 };
    this._baseOffset   = { x: opts.baseOffsetX ?? 0, y: opts.baseOffsetY ?? 0 };

    // Apply bounds
    if (opts.bounds) {
      this.cam.setBounds(opts.bounds[0], opts.bounds[1], opts.bounds[2], opts.bounds[3]);
    }

    // Initial zoom
    const startZoom = opts.zoom ?? 1.0;
    this.cam.setZoom(startZoom);
    // Track target zoom so zoomPulse always restores to the settled value,
    // not a transient in-flight value from a concurrent zoomTo tween.
    this._targetZoom = opts.targetZoom ?? startZoom;

    // Zoom intro tween
    if (opts.targetZoom && opts.targetZoom !== startZoom) {
      const introMs = opts.introMs ?? 2000;
      scene.time.delayedCall(400, () => {
        this.cam.zoomTo(opts.targetZoom, introMs, 'Sine.easeInOut');
      });
    }

    // Fade-in
    const fadeMs = opts.fadeInMs ?? 1200;
    if (fadeMs > 0) {
      this.cam.fadeIn(fadeMs, 0, 0, 0);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Re-configure camera options at runtime.
   * @param {object} opts — same keys as constructor
   */
  configure(opts = {}) {
    if (opts.followLerp !== undefined) this._followLerp = opts.followLerp;
    if (opts.drift !== undefined) this._driftEnabled = opts.drift;
    if (opts.driftAmpX !== undefined) this._driftAmp.x = opts.driftAmpX;
    if (opts.driftAmpY !== undefined) this._driftAmp.y = opts.driftAmpY;
    if (opts.driftSpeedX !== undefined) this._driftSpeed.x = opts.driftSpeedX;
    if (opts.driftSpeedY !== undefined) this._driftSpeed.y = opts.driftSpeedY;
    if (opts.baseOffsetX !== undefined) this._baseOffset.x = opts.baseOffsetX;
    if (opts.baseOffsetY !== undefined) this._baseOffset.y = opts.baseOffsetY;

    if (opts.bounds) {
      this.cam.setBounds(opts.bounds[0], opts.bounds[1], opts.bounds[2], opts.bounds[3]);
    }
    if (opts.zoom !== undefined) this.cam.setZoom(opts.zoom);
    if (opts.targetZoom !== undefined) this._targetZoom = opts.targetZoom;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ZOOM ACCESSORS
  // ═══════════════════════════════════════════════════════════════════

  /** Current live zoom (delegates to Phaser camera). */
  get zoom() { return this.cam.zoom; }

  // ═══════════════════════════════════════════════════════════════════
  //  FOLLOW
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Start following a target with smooth lerp.
   * @param {{ x: number, y: number }} target
   * @param {number} [lerpX] — override horizontal lerp
   * @param {number} [lerpY] — override vertical lerp
   */
  follow(target, lerpX, lerpY) {
    const lx = lerpX ?? this._followLerp;
    const ly = lerpY ?? this._followLerp;
    this.cam.startFollow(target, true, lx, ly);
  }

  /** Stop following. */
  stopFollow() {
    this.cam.stopFollow();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ZOOM HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Quick zoom-in pulse for impact moments.
   * @param {number} [targetZoom=1.25]
   * @param {number} [holdMs=600]
   */
  zoomPulse(targetZoom = 1.25, holdMs = 600) {
    // Restore to _targetZoom (the settled base), not this.cam.zoom which may be
    // mid-tween if slowZoom or an intro zoomTo is still running.
    const restore = this._targetZoom;
    this.cam.zoomTo(targetZoom, 400, 'Sine.easeOut');
    this.scene.time.delayedCall(400 + holdMs, () => {
      this.cam.zoomTo(restore, 600, 'Sine.easeInOut');
    });
  }

  /**
   * Slow cinematic zoom.
   * @param {number} targetZoom
   * @param {number} duration
   * @param {Function} [onComplete]
   */
  slowZoom(targetZoom, duration, onComplete) {
    this.cam.zoomTo(targetZoom, duration, 'Sine.easeInOut');
    if (onComplete) this.scene.time.delayedCall(duration, onComplete);
  }

  /**
   * Fade the camera out, pausing drift first.
   * @param {number} duration
   * @param {number} [r=0]
   * @param {number} [g=0]
   * @param {number} [b=0]
   */
  fadeOut(duration, r = 0, g = 0, b = 0) {
    this.pauseDrift();
    this.cam.fadeOut(duration, r, g, b);
  }

  /** Small screen shake. */
  shake(duration = 110, intensity = 0.003) {
    this.cam.shake(duration, intensity);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CINEMATIC — pan, path, & letterbox
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Smooth pan to a world position (stops follow first).
   * @param {number} x — world X
   * @param {number} y — world Y
   * @param {number} duration — ms
   * @param {string} [ease='Sine.easeInOut']
   * @param {Function} [onComplete]
   */
  slowPan(x, y, duration, ease, onComplete) {
    this.cam.stopFollow();
    this.pauseDrift();  // prevent sinusoidal drift from fighting the pan tween
    this.scene.tweens.add({
      targets: this.cam,
      scrollX: x - this.cam.width * 0.5 / this.cam.zoom,
      scrollY: y - this.cam.height * 0.5 / this.cam.zoom,
      duration,
      ease: ease ?? 'Sine.easeInOut',
      onComplete: () => {
        this.resumeDrift();
        onComplete?.();
      },
    });
  }

  /**
   * Run a cinematic camera path: sequence of waypoints.
   * Each waypoint: { x, y, zoom?, duration, hold?, ease? }
   * After all waypoints the onComplete callback fires.
   */
  cinematicPath(waypoints, onComplete) {
    let idx = 0;
    const next = () => {
      if (idx >= waypoints.length) { onComplete?.(); return; }
      const wp = waypoints[idx++];
      const dur = wp.duration ?? 2000;
      const hold = wp.hold ?? 400;
      const ease = wp.ease ?? 'Sine.easeInOut';

      this.slowPan(wp.x, wp.y, dur, ease, () => {
        if (wp.zoom) this.cam.zoomTo(wp.zoom, dur * 0.5, ease);
        this.scene.time.delayedCall(hold, next);
      });
      if (wp.zoom) this.cam.zoomTo(wp.zoom, dur, ease);
    };
    this.cam.stopFollow();
    next();
  }

  /**
   * Add cinematic letterbox bars (top + bottom).
   * @param {number} [barHeight=40] — px per bar
   * @param {number} [fadeMs=800]
   * @returns {{ top: Phaser.GameObjects.Rectangle, bot: Phaser.GameObjects.Rectangle, remove: Function }}
   */
  letterbox(barHeight = 40, fadeMs = 800) {
    const s = this.scene;
    const w = s.scale.width;
    const h = s.scale.height;
    // On small landscape phones (h < 430 CSS px) the fixed barHeight reads
    // as a hairline because the screen is only ~390px tall. Scale bars to at
    // least 14% of screen height so the widescreen crop feels substantial.
    // Desktop / tablet: w > h is also true but h >= 430, so this never fires.
    const isMobLandscape = w > h && h < 430;
    const effectiveBarH  = isMobLandscape
      ? Math.max(barHeight, Math.round(h * 0.14))
      : barHeight;
    // depth 9999 — intentionally above all game content including finale overlays (max ~9520)
    const top = s.add.rectangle(w / 2, -effectiveBarH / 2, w, effectiveBarH, 0x000000)
      .setScrollFactor(0).setDepth(9999).setAlpha(0);
    const bot = s.add.rectangle(w / 2, h + effectiveBarH / 2, w, effectiveBarH, 0x000000)
      .setScrollFactor(0).setDepth(9999).setAlpha(0);
    s.tweens.add({ targets: top, y: effectiveBarH / 2, alpha: 1, duration: fadeMs, ease: 'Quad.easeOut' });
    s.tweens.add({ targets: bot, y: h - effectiveBarH / 2, alpha: 1, duration: fadeMs, ease: 'Quad.easeOut' });
    const remove = (ms) => {
      const d = ms ?? fadeMs;
      s.tweens.add({ targets: top, y: -effectiveBarH / 2, alpha: 0, duration: d, ease: 'Quad.easeIn' });
      s.tweens.add({ targets: bot, y: h + effectiveBarH / 2, alpha: 0, duration: d, ease: 'Quad.easeIn',
        onComplete: () => { top.destroy(); bot.destroy(); }
      });
    };
    return { top, bot, remove };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DRIFT
  // ═══════════════════════════════════════════════════════════════════

  pauseDrift()  { this._driftEnabled = false; }
  resumeDrift() { this._driftEnabled = true;  }

  /** Symmetric teardown — nulls refs so garbage-collected promptly after scene stop. */
  destroy() {
    this.scene = null;
    this.cam   = null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE (call every frame)
  // ═══════════════════════════════════════════════════════════════════

  /** @param {number} time — scene time ms */
  update(time) {
    let ox = this._baseOffset.x;
    let oy = this._baseOffset.y;
    if (this._driftEnabled) {
      this._driftOffset.x = Math.sin(time * this._driftSpeed.x) * this._driftAmp.x
                          + Math.sin(time * this._driftSpeed.x * 1.7) * this._driftAmp.x * 0.4;
      this._driftOffset.y = Math.cos(time * this._driftSpeed.y) * this._driftAmp.y
                          + Math.cos(time * this._driftSpeed.y * 1.3) * this._driftAmp.y * 0.3;
      ox -= this._driftOffset.x;
      oy -= this._driftOffset.y;
    }
    this.cam.setFollowOffset(ox, oy);
  }
}
