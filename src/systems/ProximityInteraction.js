import Phaser from 'phaser';
import { audioManager } from '../utils/helpers.js';

/**
 * ProximityInteraction — walk → reach → trigger interaction system.
 *
 * Purely proximity-driven: no button UI. When the player enters an
 * object's trigger radius the callback fires automatically (once).
 *
 * Features:
 *   • Progressive glow — intensity ramps as player approaches
 *   • Floating label fades in on approach
 *   • Auto-trigger with particle burst + camera bump on reach
 *   • Cooldown per object — won't re-fire until reset
 *
 * Usage:
 *   const proximity = new ProximityInteraction(scene);
 *   proximity.register({
 *     id: 'bench',
 *     gameObject: benchSprite,
 *     label: 'Our bench',
 *     triggerRadius: 65,
 *     glowRadius: 140,
 *     onTrigger: (obj) => { ... },
 *   });
 *   // in update():
 *   proximity.update(player.x, player.y, time);
 */
export class ProximityInteraction {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [opts]
   * @param {number} [opts.defaultTriggerRadius=65]
   * @param {number} [opts.defaultGlowRadius=140]
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this._items = [];
    this._labels = new Map();
    this._glows  = new Map();

    this._defaultTrigger = opts.defaultTriggerRadius ?? 65;
    this._defaultGlow    = opts.defaultGlowRadius ?? 140;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  REGISTER
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Register an interactable object.
   * @param {object} cfg
   * @param {string}        cfg.id
   * @param {Phaser.GameObjects.Sprite|Image} cfg.gameObject
   * @param {string}        [cfg.label]          — text shown on approach
   * @param {number}        [cfg.triggerRadius]   — auto-trigger distance
   * @param {number}        [cfg.glowRadius]      — glow-start distance
   * @param {Function}      [cfg.onTrigger]       — called once on reach
   * @param {boolean}       [cfg.repeatable=false] — allow re-triggering
   */
  register(cfg) {
    const item = {
      id:            cfg.id,
      gameObject:    cfg.gameObject,
      label:         cfg.label ?? '',
      triggerRadius: cfg.triggerRadius ?? this._defaultTrigger,
      glowRadius:    cfg.glowRadius   ?? this._defaultGlow,
      onTrigger:     cfg.onTrigger     ?? null,
      repeatable:    cfg.repeatable    ?? false,
      enabled:       cfg.enabled       ?? true,
      // When true, suppresses the generic playMemoryUnlock() SFX so scenes can
      // play their own scene-specific stinger without two arpeggios clashing.
      skipUnlockSFX: cfg.skipUnlockSFX ?? false,
      triggered:     false,
      _insideGlow:   false,
    };

    this._items.push(item);
    this._createLabel(item);
    this._createGlow(item);
  }

  /**
   * Enable or disable an interactable at runtime.
   * Disabled items won't glow, show labels, play audio, or trigger.
   * @param {string} id
   * @param {boolean} enabled
   */
  setEnabled(id, enabled) {
    const item = this._items.find(i => i.id === id);
    if (item) item.enabled = enabled;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  VISUALS
  // ═══════════════════════════════════════════════════════════════════

  _createLabel(item) {
    const go = item.gameObject;
    const label = this.scene.add.text(go.x, go.y - 40, item.label, {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(this.scene.layers?.depth('fx', 22) ?? 822); // fx layer — above all world/character content

    this._labels.set(item.id, label);
  }

  _createGlow(item) {
    const go = item.gameObject;
    if (!this.scene.textures.exists('particle-glow')) return;

    const glow = this.scene.add.image(go.x, go.y + 5, 'particle-glow')
      .setScale(2).setAlpha(0).setDepth(this.scene.layers?.depth('gameplay', 1) ?? 1).setTint(0xFFB7C5)
      .setBlendMode(Phaser.BlendModes.ADD);
    // Initial depth is a throwaway; _updateGlow syncs it every frame.

    this._glows.set(item.id, glow);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE — call every frame
  // ═══════════════════════════════════════════════════════════════════

  /**
   * @param {number} px — player X
   * @param {number} py — player Y
   * @param {number} time — scene time (ms)
   */
  update(px, py, time) {
    for (const item of this._items) {
      // Disabled items — fade out visuals and skip all logic
      if (!item.enabled) {
        this._fadeOut(item, time);
        continue;
      }

      const go   = item.gameObject;
      const dist = Phaser.Math.Distance.Between(px, py, go.x, go.y);

      // ── progressive glow ──
      this._updateGlow(item, dist, time);

      // ── label fade ──
      this._updateLabel(item, dist, time);

      // ── proximity audio — spatial hum that intensifies on approach ──
      if (!item.triggered || item.repeatable) {
        if (dist < item.glowRadius) {
          const intensity = 1 - (dist - item.triggerRadius) / (item.glowRadius - item.triggerRadius);
          const pan = go.x !== px ? Math.max(-1, Math.min(1, (go.x - px) / item.glowRadius)) : 0;
          audioManager.updateProximity(item.id, Math.max(0, Math.min(1, intensity)), pan);

          // Zone-enter SFX — fire once when player first enters glow radius
          if (!item._insideGlow) {
            item._insideGlow = true;
            audioManager.playZoneEnter();
          }
        } else {
          audioManager.updateProximity(item.id, 0, 0);
          item._insideGlow = false;
        }
      }

      // ── trigger ──
      if (!item.triggered && dist < item.triggerRadius) {
        this._trigger(item);
      }
    }
  }

  /** Smoothly fade out glow + label for disabled items. */
  _fadeOut(item) {
    const glow = this._glows.get(item.id);
    if (glow) glow.alpha += (0 - glow.alpha) * 0.08;
    const label = this._labels.get(item.id);
    if (label) label.alpha += (0 - label.alpha) * 0.08;
    audioManager.updateProximity(item.id, 0, 0);
    item._insideGlow = false;
  }

  _updateGlow(item, dist, time) {
    const glow = this._glows.get(item.id);
    if (!glow) return;

    const go = item.gameObject;
    glow.setPosition(go.x, go.y + 5);
    // Sync depth every frame — go.depth changes each frame when Y-sorted.
    glow.setDepth(go.depth - 1);

    if (item.triggered && !item.repeatable) {
      // Completed — gentle residual glow
      glow.alpha += (0.06 - glow.alpha) * 0.05;
      glow.setScale(1.8 + Math.sin(time * 0.002) * 0.1);
      return;
    }

    if (dist < item.glowRadius) {
      // Intensity ramps as player gets closer: 0 at glowRadius → 0.35 at triggerRadius
      const t = 1 - (dist - item.triggerRadius) / (item.glowRadius - item.triggerRadius);
      const target = Phaser.Math.Clamp(t, 0, 1) * 0.35;
      glow.alpha += (target - glow.alpha) * 0.08;
      glow.setScale(2 + Math.sin(time * 0.004) * 0.25 + t * 0.6);
    } else {
      glow.alpha += (0 - glow.alpha) * 0.06;
    }
  }

  _updateLabel(item, dist, time) {
    const label = this._labels.get(item.id);
    if (!label) return;

    const go = item.gameObject;
    label.setPosition(go.x, go.y - 40 + Math.sin(time * 0.003) * 2);

    if (item.triggered && !item.repeatable) {
      label.alpha += (0 - label.alpha) * 0.08;
      return;
    }

    const targetAlpha = dist < item.glowRadius ? Phaser.Math.Clamp(1 - dist / item.glowRadius, 0, 0.9) : 0;
    label.alpha += (targetAlpha - label.alpha) * 0.1;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TRIGGER
  // ═══════════════════════════════════════════════════════════════════

  _trigger(item) {
    item.triggered = true;
    console.log(`[ProximityInteraction] Triggered interaction: "${item.id}" (label: "${item.label}")`);

    // Audio: memory unlock sound + stop proximity hum
    // skipUnlockSFX: scene has its own stinger — suppress the generic one
    if (!item.skipUnlockSFX) audioManager.playMemoryUnlock();
    audioManager.updateProximity(item.id, 0, 0);

    // Particle burst
    this._burstParticles(item.gameObject.x, item.gameObject.y);

    // Camera micro-bump toward object
    const cam = this.scene.cameras.main;
    const cx  = cam.scrollX + cam.width / 2;
    const cy  = cam.scrollY + cam.height / 2;
    const dx  = (item.gameObject.x - cx) * 0.06;
    const dy  = (item.gameObject.y - cy) * 0.06;
    cam.pan(cx + dx, cy + dy, 350, 'Sine.easeOut', true);

    // Soft screen flash
    cam.flash(180, 255, 240, 255, true);

    // Glow burst on trigger
    const glow = this._glows.get(item.id);
    if (glow) {
      this.scene.tweens.add({
        targets: glow,
        alpha: 0.5,
        scaleX: 3.5,
        scaleY: 3.5,
        duration: 300,
        ease: 'Quad.easeOut',
        yoyo: true,
      });
    }

    // Callback
    if (item.onTrigger) {
      item.onTrigger({
        id: item.id,
        label: item.label,
        gameObject: item.gameObject,
      });
    }

    // Allow re-trigger after cooldown for repeatable items
    if (item.repeatable) {
      this.scene.time.delayedCall(1500, () => { item.triggered = false; });
    }
  }

  _burstParticles(x, y) {
    // Heart particles
    if (this.scene.textures.exists('particle-heart')) {
      const hearts = this.scene.add.particles(x, y, 'particle-heart', {
        speed: { min: 25, max: 70 },
        angle: { min: 220, max: 320 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 750,
        quantity: 5,
        gravityY: -18,
        blendMode: 'ADD',
      });
      hearts.setDepth(this.scene.layers?.depth('fx', 150) ?? 950);
      this.scene.time.delayedCall(200, () => hearts.stop());
      this.scene.time.delayedCall(1000, () => hearts.destroy());
    }

    // Glow puff
    if (this.scene.textures.exists('particle-glow')) {
      const puff = this.scene.add.particles(x, y, 'particle-glow', {
        speed: { min: 8, max: 35 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.45, end: 0 },
        lifespan: 450,
        quantity: 4,
        blendMode: 'ADD',
      });
      puff.setDepth(this.scene.layers?.depth('fx', 150) ?? 950);
      this.scene.time.delayedCall(120, () => puff.stop());
      puff.once('complete', () => puff.destroy());
      this.scene.time.delayedCall(700, () => puff.destroy());
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PUBLIC HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /** Mark a specific object as triggered (externally). */
  markTriggered(id) {
    const item = this._items.find(i => i.id === id);
    if (item) item.triggered = true;
  }

  /** Reset a specific object so it can trigger again. */
  reset(id) {
    const item = this._items.find(i => i.id === id);
    if (item) item.triggered = false;
  }

  /** Check if all registered (non-repeatable) items have been triggered. */
  allTriggered() {
    return this._items.filter(i => !i.repeatable).every(i => i.triggered);
  }

  /** Number of items triggered so far. */
  triggeredCount() {
    return this._items.filter(i => i.triggered).length;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════════════

  destroy() {
    // Clean up proximity audio sources
    for (const item of this._items) {
      audioManager.updateProximity(item.id, 0, 0);
    }
    this._labels.forEach(l => l.destroy());
    this._glows.forEach(g => g.destroy());
    this._labels.clear();
    this._glows.clear();
    this._items = [];
  }
}
