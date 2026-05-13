import Phaser from 'phaser';

/**
 * Character — reusable base class for all game characters.
 *
 * Provides:
 *  • Sprite from a Kenney Mini Character (3D) preview PNG
 *  • Soft elliptical shadow underneath
 *  • Additive light blob that follows the character
 *  • Automatic Y-based depth sorting
 *  • Smooth tween-based moveTo()
 *  • Walk animation (bob + lean + squash/stretch)
 *  • Idle animation (breathing + subtle sway)
 *
 * Subclasses: PlayerCharacter (physics + input), FemaleCharacter (NPC tweens).
 */
export class Character {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} textureKey - key of loaded Kenney preview PNG
   * @param {object} [config]
   * @param {number} [config.displayW=28]  - rendered width
   * @param {number} [config.displayH=28]  - rendered height
   * @param {number} [config.shadowW=24]   - shadow ellipse width
   * @param {number} [config.shadowH=7]    - shadow ellipse height
   * @param {number} [config.shadowAlpha=0.22]
   * @param {number} [config.shadowOffY=12] - shadow Y offset below sprite origin
   * @param {number} [config.lightScale=1.8] - light-blob scale
   * @param {number} [config.lightAlpha=0.18]
   * @param {number} [config.lightTint=0xFFCCAA]
   * @param {number} [config.moveSpeed=110] - pixels per second (for moveTo duration calc)
   */
  constructor(scene, x, y, textureKey, config = {}) {
    this.scene = scene;

    const c = this._cfg = {
      displayW:    config.displayW    ?? 28,
      displayH:    config.displayH    ?? 28,
      shadowW:     config.shadowW     ?? 24,
      shadowH:     config.shadowH     ?? 7,
      shadowAlpha: config.shadowAlpha ?? 0.22,
      shadowOffY:  config.shadowOffY  ?? 12,
      lightScale:  config.lightScale  ?? 1.8,
      lightAlpha:  config.lightAlpha  ?? 0.18,
      lightTint:   config.lightTint   ?? 0xFFCCAA,
      moveSpeed:   config.moveSpeed   ?? 110,
    };

    // ── Sprite ─────────────────────────────────────────────────────
    this.sprite = scene.add.image(x, y, textureKey)
      .setDisplaySize(c.displayW, c.displayH)
      .setOrigin(0.5, 0.85);

    // ── Additive light blob ────────────────────────────────────────
    this.light = scene.add.image(x, y + 4, 'light-blob')
      .setScale(c.lightScale)
      .setAlpha(c.lightAlpha)
      .setBlendMode('ADD')
      .setTint(c.lightTint);

    // ── Light2D point light (WebGL) ────────────────────────────────
    this._pointLight = null;
    // Delegate to the system's public API rather than reading private _light2DEnabled.
    scene.lighting?.applyPipeline(this.sprite);

    // ── State ──────────────────────────────────────────────────────
    this._walking = false;
    this._idleTime = 0;
    this._moveTween = null;
    this._walkTween = null;
    this._idleTween = null;
    this._facing = 1; // 1 = right, -1 = left
    this.active = true;

    // Cache base scale from texture dimensions once — avoids reading mid-tween sprite.scaleX as baseline.
    this._baseScaleX = c.displayW / this.sprite.texture.source[0].width;
    this._baseScaleY = c.displayH / this.sprite.texture.source[0].height;
    // Per-instance random phase so multiple characters' light blobs pulse independently.
    this._lightPhase = Math.random() * Math.PI * 2;

    // Register for Y-sort if DepthManager is available
    if (scene.depthMgr) {
      scene.depthMgr.addYSort(this.sprite);
      scene.depthMgr.addYSort(this.light);
    }

    // Start idle
    this._startIdleAnim();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  POSITION HELPERS
  // ═══════════════════════════════════════════════════════════════════

  get x()  { return this.sprite.x; }
  set x(v) { this.sprite.x = v; }

  get y()  { return this.sprite.y; }
  set y(v) { this.sprite.y = v; }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
    this._syncAttachments();
    return this;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MOVEMENT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Smoothly tween to a target position.
   * @param {number} tx - target X
   * @param {number} ty - target Y
   * @param {Function} [onComplete] - called when arrival finishes
   * @returns {Phaser.Tweens.Tween}
   */
  moveTo(tx, ty, onComplete) {
    this.stopMovement();

    const dist = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
    if (dist < 2) { if (onComplete) onComplete(); return null; }

    const duration = (dist / this._cfg.moveSpeed) * 1000;

    // Face direction
    const dx = tx - this.x;
    if (Math.abs(dx) > 2) {
      this._facing = dx > 0 ? 1 : -1;
      this.sprite.setFlipX(this._facing === -1);
    }

    this._setWalking(true);

    this._moveTween = this.scene.tweens.add({
      targets: this.sprite,
      x: tx,
      y: ty,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => this._syncAttachments(),
      onComplete: () => {
        this._setWalking(false);
        if (onComplete) onComplete();
      }
    });

    return this._moveTween;
  }

  /** Stop any in-progress movement tween. */
  stopMovement() {
    if (this._moveTween) {
      this._moveTween.stop();
      this._moveTween = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  WALK / IDLE ANIMATION
  // ═══════════════════════════════════════════════════════════════════

  _setWalking(walking) {
    if (this._walking === walking) return;
    this._walking = walking;
    if (walking) {
      this._stopIdleAnim();
      this._startWalkAnim();
    } else {
      this._stopWalkAnim();
      this._startIdleAnim();
    }
  }

  /** Walking: rhythmic bob + lean + squash/stretch cycle. */
  _startWalkAnim() {
    if (this._walkTween) return;

    // Bob up and down
    this._walkTween = this.scene.tweens.add({
      targets: this.sprite,
      scaleX: { from: this._baseScaleX, to: this._baseScaleX * 1.04 },
      scaleY: { from: this._baseScaleY, to: this._baseScaleY * 0.96 },
      rotation: { from: 0, to: 0.04 * this._facing },
      duration: 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _stopWalkAnim() {
    if (this._walkTween) {
      this._walkTween.stop();
      this._walkTween = null;
    }
    // Reset sprite transform
    this.sprite.setScale(Math.abs(this._baseScaleX), this._baseScaleY);
    this.sprite.setRotation(0);
  }

  /** Idle: gentle breathing + subtle lateral sway. */
  _startIdleAnim() {
    if (this._idleTween) return;

    this._idleTween = this.scene.tweens.add({
      targets: this.sprite,
      scaleY: { from: this._baseScaleY, to: this._baseScaleY * 1.02 },
      scaleX: { from: Math.abs(this._baseScaleX), to: Math.abs(this._baseScaleX) * 0.99 },
      rotation: { from: -0.005, to: 0.005 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _stopIdleAnim() {
    if (this._idleTween) {
      this._idleTween.stop();
      this._idleTween = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE (call every frame)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Frame update — syncs shadow, light, and depth.
   * @param {number} time  - scene time
   * @param {number} delta - frame delta ms
   */
  update(time, delta) {
    if (!this.active) return;
    this._syncAttachments();
    this._updateLight(time);
  }

  /** Keep light in sync with sprite position. */
  _syncAttachments() {
    const sx = this.sprite.x;
    const sy = this.sprite.y;
    this.light.setPosition(sx, sy + 4);
  }

  /** Pulsate light subtly over time. */
  _updateLight(time) {
    const pulse = 1 + Math.sin(time * 0.002 + this._lightPhase) * 0.08;
    this.light.setScale(this._cfg.lightScale * pulse);
    this.light.setAlpha(this._cfg.lightAlpha + Math.sin(time * 0.003 + this._lightPhase) * 0.04);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DEPTH
  // ═══════════════════════════════════════════════════════════════════

  /** @internal Manually set depth from Y for scenes without DepthManager.
   *  Normally characters are registered via depthMgr.addYSort() and this is unused. */
  _sortDepth(baseDepth = 0) {
    this.sprite.setDepth(baseDepth + this.sprite.y);
    this.light.setDepth(baseDepth + this.sprite.y - 2);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════════════

  destroy() {
    this.active = false;
    this.stopMovement();
    this._stopWalkAnim();
    this._stopIdleAnim();

    if (this.scene.depthMgr) {
      this.scene.depthMgr.removeYSort(this.sprite);
      this.scene.depthMgr.removeYSort(this.light);
    }

    this.light.destroy();
    this.sprite.destroy();
  }
}
