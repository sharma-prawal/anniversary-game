import Phaser from 'phaser';
import { Character } from './Character.js';

/**
 * FemaleCharacter — NPC companion with tween-based follow & wander behaviour.
 *
 * Extends Character with:
 *  • Follow mode: walks toward a target keeping a set distance
 *  • Wander mode: drifts randomly within a radius of a home point
 *  • Configurable idle pause between movements
 */
export class FemaleCharacter extends Character {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} [config]
   * @param {string}  [config.texture='char-female']
   * @param {number}  [config.followDist=50]   - min distance before following
   * @param {number}  [config.followSpeed=90]  - movement speed when following
   * @param {number}  [config.wanderRadius=60] - wander radius around home point
   * @param {number}  [config.wanderPause=2500] - ms pause between wanders
   */
  constructor(scene, x, y, config = {}) {
    const texture = config.texture || 'char-female';

    super(scene, x, y, texture, {
      displayW:   config.displayW   ?? 40,
      displayH:   config.displayH   ?? 62,
      shadowW:    config.shadowW    ?? 22,
      shadowH:    config.shadowH    ?? 6,
      lightScale: config.lightScale ?? 1.4,
      lightAlpha: config.lightAlpha ?? 0.14,
      lightTint:  config.lightTint  ?? 0xFFAACC,
      moveSpeed:  config.followSpeed ?? 90,
      ...config,
    });

    this._followDist   = config.followDist   ?? 50;
    this._followSpeed  = config.followSpeed  ?? 90;
    this._wanderRadius = config.wanderRadius ?? 60;
    this._wanderPause  = config.wanderPause  ?? 2500;

    // ── Mode state ─────────────────────────────────────────────────
    this._mode = 'idle';        // 'idle' | 'follow' | 'wander'
    this._followTarget = null;  // { x, y } or game object with x/y
    this._homeX = x;
    this._homeY = y;
    this._wanderTimer = null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FOLLOW MODE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Start following a target game object (e.g. the player sprite).
   * @param {Phaser.GameObjects.Components.Transform} target
   * @param {number} [distance] - override follow distance
   */
  follow(target, distance) {
    this._mode = 'follow';
    this._followTarget = target;
    if (distance !== undefined) this._followDist = distance;
    this._stopWander();
  }

  /** Stop following and go idle. */
  stopFollow() {
    this._mode = 'idle';
    this._followTarget = null;
    this.stopMovement();
    this._setWalking(false);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  WANDER MODE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Start wandering randomly around a home point.
   * @param {number} [cx] - home X (defaults to current position)
   * @param {number} [cy] - home Y (defaults to current position)
   * @param {number} [radius] - override wander radius
   */
  wander(cx, cy, radius) {
    this._mode = 'wander';
    this._homeX = cx ?? this.x;
    this._homeY = cy ?? this.y;
    if (radius !== undefined) this._wanderRadius = radius;
    this._followTarget = null;
    this._scheduleWander();
  }

  _stopWander() {
    if (this._wanderTimer) {
      this._wanderTimer.remove(false);
      this._wanderTimer = null;
    }
  }

  _scheduleWander() {
    this._stopWander();
    const delay = this._wanderPause * (0.6 + Math.random() * 0.8);
    this._wanderTimer = this.scene.time.delayedCall(delay, () => {
      if (this._mode !== 'wander' || !this.active) return;
      this._doWanderStep();
    });
  }

  _doWanderStep() {
    const angle  = Math.random() * Math.PI * 2;
    const dist   = Math.random() * this._wanderRadius;
    const tx = this._homeX + Math.cos(angle) * dist;
    const ty = this._homeY + Math.sin(angle) * dist;

    this.moveTo(tx, ty, () => {
      if (this._mode === 'wander') this._scheduleWander();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════════════

  /** @override */
  update(time, delta) {
    if (!this.active) return;
    super.update(time, delta);

    if (this._mode === 'follow' && this._followTarget) {
      this._tickFollow();
    }
  }

  /** Evaluate whether we need to move closer to the follow target. */
  _tickFollow() {
    const t = this._followTarget;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);

    if (dist > this._followDist && !this._moveTween) {
      // Move to a point near the target (not exactly on top)
      const angle = Phaser.Math.Angle.Between(this.x, this.y, t.x, t.y);
      const stopDist = this._followDist * 0.6;
      const tx = t.x - Math.cos(angle) * stopDist;
      const ty = t.y - Math.sin(angle) * stopDist;
      this.moveTo(tx, ty);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════════════

  /** @override */
  destroy() {
    this._stopWander();
    super.destroy();
  }
}
