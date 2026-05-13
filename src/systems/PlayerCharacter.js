import Phaser from 'phaser';
import { Character } from './Character.js';

/**
 * PlayerCharacter — player-controlled character with keyboard + click movement.
 *
 * Extends Character with:
 *  • Arcade physics body for responsive WASD / arrow movement
 *  • Click-to-move via smooth tween (inherited moveTo)
 *  • Glow aura (additive bloom around the player)
 *  • Velocity-based walk/idle toggling
 *  • Direction tracking (last direction for facing)
 */
export class PlayerCharacter extends Character {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} [config] - passed to Character + player-specific keys
   * @param {string} [config.texture='char-male'] - character texture key
   * @param {number} [config.speed=120] - keyboard movement speed (px/s)
   * @param {number} [config.bodyW=14] - physics body width
   * @param {number} [config.bodyH=10] - physics body height
   * @param {number} [config.bodyOffX=7] - body offset X from top-left
   * @param {number} [config.bodyOffY=16] - body offset Y from top-left
   * @param {number} [config.glowAlpha=0.18] - player glow aura alpha
   */
  constructor(scene, x, y, config = {}) {
    const texture = config.texture || 'char-male';

    super(scene, x, y, texture, {
      displayW:   config.displayW   ?? 40,
      displayH:   config.displayH   ?? 62,
      shadowW:    config.shadowW    ?? 24,
      shadowH:    config.shadowH    ?? 8,
      lightScale: config.lightScale ?? 1.6,
      lightAlpha: config.lightAlpha ?? 0.12,
      lightTint:  config.lightTint  ?? 0xFFBB99,
      moveSpeed:  config.moveSpeed  ?? 120,
      ...config,
    });

    this._speed    = config.speed    ?? 120;
    this._bodyW    = config.bodyW    ?? 14;
    this._bodyH    = config.bodyH    ?? 10;
    this._bodyOffX = config.bodyOffX ?? 7;
    this._bodyOffY = config.bodyOffY ?? 17;  // recalibrated for displayH=62 so physics body stays at same world height

    // ── Physics body ───────────────────────────────────────────────
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setSize(this._bodyW, this._bodyH)
      .setOffset(this._bodyOffX, this._bodyOffY)
      .setCollideWorldBounds(true);

    // ── Glow aura (warm bloom around player) ───────────────────────
    this.glow = scene.add.image(x, y + 5, 'player-glow')
      .setScale(1.2).setAlpha(config.glowAlpha ?? 0.18).setBlendMode('ADD');
    if (scene.depthMgr) scene.depthMgr.addYSort(this.glow);

    // ── State ──────────────────────────────────────────────────────
    this._dir = 'down';
    this._keyMoving = false;
    // Interpolated velocity (inertia/easing)
    this._curVx = 0;
    this._curVy = 0;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  KEYBOARD MOVEMENT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Process keyboard input. Call from scene update().
   * @param {object} cursors - Phaser cursor keys
   * @param {object} wasd    - WASD key map { W, A, S, D }
   * @param {number} [delta=16.67] - frame delta for frame-rate-independent lerp
   * @returns {{ vx: number, vy: number, moving: boolean }}
   */
  handleInput(cursors, wasd, delta = 16.67) {
    const speed = this._speed;

    // ── Desired (target) velocity from keys ───────────────────────
    let tx = 0, ty = 0;
    if (cursors.left.isDown  || wasd.A.isDown) tx = -speed;
    if (cursors.right.isDown || wasd.D.isDown) tx =  speed;
    if (cursors.up.isDown    || wasd.W.isDown) ty = -speed;
    if (cursors.down.isDown  || wasd.S.isDown) ty =  speed;

    // Normalise diagonal target
    if (tx !== 0 && ty !== 0) { tx *= 0.707; ty *= 0.707; }

    // ── Inertia: lerp actual velocity toward target ─────────────
    // Accelerate quickly (responsive), decelerate slower (inertia feel).
    // Frame-rate-independent: alpha = 1 - (1-rate)^(dt/16.67)
    const pressing = tx !== 0 || ty !== 0;
    const rate  = pressing ? 0.28 : 0.18;
    const alpha = 1 - Math.pow(1 - rate, delta / 16.67);
    this._curVx += (tx - this._curVx) * alpha;
    this._curVy += (ty - this._curVy) * alpha;
    // Snap to zero when negligible to prevent micro-drift
    if (Math.abs(this._curVx) < 1.5) this._curVx = 0;
    if (Math.abs(this._curVy) < 1.5) this._curVy = 0;

    this.sprite.body.setVelocity(this._curVx, this._curVy);

    const moving = Math.abs(this._curVx) > 5 || Math.abs(this._curVy) > 5;

    // Cancel click-to-move the moment a key is pressed
    if (pressing && this._moveTween) this.stopMovement();

    // Direction + flip track the *target* for instant visual feedback
    if (Math.abs(tx) > Math.abs(ty)) {
      if (tx !== 0) this._dir = tx > 0 ? 'right' : 'left';
    } else if (ty !== 0) {
      this._dir = ty > 0 ? 'down' : 'up';
    }
    if (tx < 0) this.sprite.setFlipX(true);
    else if (tx > 0) this.sprite.setFlipX(false);

    // Toggle walk/idle animation
    this._keyMoving = moving;
    this._setWalking(moving);

    return { vx: this._curVx, vy: this._curVy, moving };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CLICK-TO-MOVE (inherits moveTo from Character)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Tween-based click-to-move. Stops physics velocity while tweening.
   * @param {number} tx
   * @param {number} ty
   * @param {Function} [onComplete]
   */
  moveToPoint(tx, ty, onComplete) {
    this.sprite.body.setVelocity(0, 0);
    this.moveTo(tx, ty, onComplete);
  }

  /** @override — also kill physics velocity. */
  stopMovement() {
    super.stopMovement();
    if (this.sprite?.body) this.sprite.body.setVelocity(0, 0);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════════════

  /** @override */
  update(time, delta) {
    if (!this.active) return;

    // If physics is driving movement, sync position from sprite body
    if (this._keyMoving) {
      this._syncAttachments();
    }

    super.update(time, delta);

    // Glow follows
    this.glow.setPosition(this.sprite.x, this.sprite.y + 5);
  }

  /** @override */
  _syncAttachments() {
    super._syncAttachments();
    if (this.glow) {
      this.glow.setPosition(this.sprite.x, this.sprite.y + 5);
    }
  }

  /** The player's current facing direction. */
  get direction() { return this._dir; }

  // ═══════════════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════════════

  /** @override */
  destroy() {
    if (this.scene.depthMgr && this.glow) {
      this.scene.depthMgr.removeYSort(this.glow);
    }
    if (this.glow) this.glow.destroy();
    super.destroy();
  }
}
