/**
 * EnvironmentFX — micro-animations that make the world breathe.
 *
 * Attach behaviors to existing game objects:
 *   • sway(obj)     — gentle rotation oscillation (trees, plants, flowers)
 *   • bob(obj)      — vertical hover bounce (interactables, emotes)
 *   • flicker(obj)  — randomized alpha pulsing (lamps, candles)
 *   • ripple(obj)   — scale oscillation (water, reflections)
 *   • drift(obj)    — slow xy wander (clouds, dust, particles)
 *
 * All animations are time-based sine waves with randomized phase offsets
 * so objects feel organic, not synchronized.
 *
 * Usage:
 *   const envfx = new EnvironmentFX(scene);
 *   envfx.sway(treeSprite, { amplitude: 2, speed: 0.8 });
 *   envfx.flicker(lampSprite);
 *   // in update():
 *   envfx.update(time);
 *   // cleanup:
 *   envfx.destroy();
 */

export class EnvironmentFX {
  constructor(scene) {
    this.scene = scene;
    /** @type {Array<{ obj, type, cfg, phase }>} */
    this._anims = [];
  }

  /**
   * Gentle rotation sway — for trees, plants, flowers, curtains.
   * @param {Phaser.GameObjects.Image|Sprite} obj
   * @param {object} [cfg]
   * @param {number} [cfg.amplitude=1.5] — max rotation in degrees
   * @param {number} [cfg.speed=0.8]     — oscillation speed multiplier
   */
  sway(obj, cfg = {}) {
    if (!obj || !obj.active) return;
    this._anims.push({
      obj,
      type: 'sway',
      cfg: {
        amplitude: (cfg.amplitude ?? 1.5) * (Math.PI / 180),
        speed: cfg.speed ?? 0.8,
      },
      phase: Math.random() * Math.PI * 2,
      baseRotation: obj.rotation || 0,
    });
  }

  /**
   * Vertical bob — for interactable objects, floating items.
   * @param {Phaser.GameObjects.Image|Sprite} obj
   * @param {object} [cfg]
   * @param {number} [cfg.amplitude=2]  — max Y displacement in px
   * @param {number} [cfg.speed=1.0]
   */
  bob(obj, cfg = {}) {
    if (!obj || !obj.active) return;
    this._anims.push({
      obj,
      type: 'bob',
      cfg: {
        amplitude: cfg.amplitude ?? 2,
        speed: cfg.speed ?? 1.0,
      },
      phase: Math.random() * Math.PI * 2,
      baseY: obj.y,
    });
  }

  /**
   * Alpha flicker — for lamps, candles, fire, glowing objects.
   * @param {Phaser.GameObjects.Image|Sprite} obj
   * @param {object} [cfg]
   * @param {number} [cfg.min=0.65]   — minimum alpha
   * @param {number} [cfg.max=1.0]    — maximum alpha
   * @param {number} [cfg.speed=2.0]  — flicker speed
   * @param {boolean}[cfg.noise=true] — add random noise to flicker
   */
  flicker(obj, cfg = {}) {
    if (!obj || !obj.active) return;
    this._anims.push({
      obj,
      type: 'flicker',
      cfg: {
        min: cfg.min ?? 0.65,
        max: cfg.max ?? 1.0,
        speed: cfg.speed ?? 2.0,
        noise: cfg.noise !== false,
      },
      phase: Math.random() * Math.PI * 2,
    });
  }

  /**
   * Scale ripple — for water, reflections, glowing auras.
   * @param {Phaser.GameObjects.Image|Sprite} obj
   * @param {object} [cfg]
   * @param {number} [cfg.amplitude=0.04] — scale variation
   * @param {number} [cfg.speed=0.6]
   */
  ripple(obj, cfg = {}) {
    if (!obj || !obj.active) return;
    this._anims.push({
      obj,
      type: 'ripple',
      cfg: {
        amplitude: cfg.amplitude ?? 0.04,
        speed: cfg.speed ?? 0.6,
      },
      phase: Math.random() * Math.PI * 2,
      baseScaleX: obj.scaleX,
      baseScaleY: obj.scaleY,
    });
  }

  /**
   * Combined alpha + scale pulse — for glows, auras, interactable halos.
   * Replaces the common inline tweens.add({ alpha, scale, yoyo, repeat:-1 }) pattern.
   * @param {Phaser.GameObjects.Image|Sprite} obj
   * @param {object} [cfg]
   * @param {number} [cfg.alphaMin=0.08]   — minimum alpha
   * @param {number} [cfg.alphaMax=0.18]   — maximum alpha
   * @param {number} [cfg.scaleMin=1.0]    — minimum scale multiplier
   * @param {number} [cfg.scaleMax=1.2]    — maximum scale multiplier
   * @param {number} [cfg.speed=0.5]       — oscillation speed
   */
  pulse(obj, cfg = {}) {
    if (!obj || !obj.active) return;
    this._anims.push({
      obj,
      type: 'pulse',
      cfg: {
        alphaMin: cfg.alphaMin ?? 0.08,
        alphaMax: cfg.alphaMax ?? 0.18,
        scaleMin: cfg.scaleMin ?? 1.0,
        scaleMax: cfg.scaleMax ?? 1.2,
        speed:    cfg.speed    ?? 0.5,
      },
      phase:      Math.random() * Math.PI * 2,
      baseScaleX: obj.scaleX,
      baseScaleY: obj.scaleY,
    });
  }

  /**
   * Slow XY drift — for clouds, atmospheric elements.
   * @param {Phaser.GameObjects.Image|Sprite} obj
   * @param {object} [cfg]
   * @param {number} [cfg.rangeX=6]
   * @param {number} [cfg.rangeY=3]
   * @param {number} [cfg.speed=0.3]
   */
  drift(obj, cfg = {}) {
    if (!obj || !obj.active) return;
    this._anims.push({
      obj,
      type: 'drift',
      cfg: {
        rangeX: cfg.rangeX ?? 6,
        rangeY: cfg.rangeY ?? 3,
        speed: cfg.speed ?? 0.3,
      },
      phase: Math.random() * Math.PI * 2,
      baseX: obj.x,
      baseY: obj.y,
    });
  }

  /**
   * Remove all animations registered for a specific object.
   * Call when an object is destroyed or removed mid-scene.
   * @param {Phaser.GameObjects.Image|Sprite} obj
   */
  remove(obj) {
    for (let i = this._anims.length - 1; i >= 0; i--) {
      if (this._anims[i].obj === obj) this._anims.splice(i, 1);
    }
  }

  /**
   * Update all animations. Call from scene update().
   * @param {number} time — scene time in ms
   */
  update(time) {
    const t = time * 0.001; // seconds
    for (let i = this._anims.length - 1; i >= 0; i--) {
      const a = this._anims[i];
      if (!a.obj || !a.obj.active) {
        this._anims.splice(i, 1);
        continue;
      }
      switch (a.type) {
        case 'sway': {
          const angle = Math.sin(t * a.cfg.speed + a.phase) * a.cfg.amplitude;
          a.obj.rotation = a.baseRotation + angle;
          break;
        }
        case 'bob': {
          const dy = Math.sin(t * a.cfg.speed * 1.5 + a.phase) * a.cfg.amplitude;
          a.obj.y = a.baseY + dy;
          break;
        }
        case 'flicker': {
          let v = Math.sin(t * a.cfg.speed * 3 + a.phase) * 0.5 + 0.5;
          if (a.cfg.noise) v += (Math.random() - 0.5) * 0.15;
          const alpha = a.cfg.min + (a.cfg.max - a.cfg.min) * Math.max(0, Math.min(1, v));
          a.obj.setAlpha(alpha);
          break;
        }
        case 'ripple': {
          const s = Math.sin(t * a.cfg.speed * 2 + a.phase) * a.cfg.amplitude;
          a.obj.setScale(a.baseScaleX + s, a.baseScaleY + s * 0.7);
          break;
        }
        case 'drift': {
          const dx = Math.sin(t * a.cfg.speed + a.phase) * a.cfg.rangeX;
          const dy = Math.cos(t * a.cfg.speed * 0.7 + a.phase) * a.cfg.rangeY;
          a.obj.x = a.baseX + dx;
          a.obj.y = a.baseY + dy;
          break;
        }
        case 'pulse': {
          const v = Math.sin(t * a.cfg.speed * 2 + a.phase) * 0.5 + 0.5;
          a.obj.setAlpha(a.cfg.alphaMin + (a.cfg.alphaMax - a.cfg.alphaMin) * v);
          const s = a.cfg.scaleMin + (a.cfg.scaleMax - a.cfg.scaleMin) * v;
          a.obj.setScale(a.baseScaleX * s, a.baseScaleY * s);
          break;
        }
      }
    }
  }

  destroy() {
    this._anims.length = 0;
  }
}
