/**
 * SceneLighting — unified lighting controller for Phaser Light2D + soft overlays.
 *
 * One-stop module that:
 *   1. Enables Phaser WebGL Light2D with mood-based ambient color
 *   2. Adds a point light that follows the player
 *   3. Provides interactable glow helpers (addGlow, removeGlow)
 *   4. Additive soft light-blob for non-Light2D fallback
 *   5. Screen-space mood tint & depth-of-field vignette
 *
 * Usage:
 *   const lighting = new SceneLighting(scene, { mood: 'warm' });
 *   lighting.create();
 *   lighting.followTarget(player);          // attach follow-light
 *   lighting.addGlow(benchSprite, 0xFFB7C5); // interactable pulse
 *   // in update():
 *   lighting.update(time);
 *   // cleanup:
 *   lighting.destroy();
 */

export class SceneLighting {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [opts]
   * @param {string} [opts.mood='default'] — 'warm'|'rain'|'dawn'|'office'|'romantic'|'default'
   * @param {number} [opts.lightRadius=400]   — follow-light reach in px
   * @param {number} [opts.lightIntensity=1.5]
   * @param {number} [opts.blobScale=3.5]     — additive light-blob scale
   * @param {number} [opts.blobAlpha=0.28]
   * @param {number} [opts.ambientGlowScale=6]
   * @param {boolean}[opts.dofEdges=true]     — render edge-darkening vignette
   * @param {boolean}[opts.sceneTint=true]    — render screen-space color overlay
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this._mood = opts.mood ?? 'default';

    this._lightRadius    = opts.lightRadius    ?? 400;
    this._lightIntensity = opts.lightIntensity ?? 1.1;  // softer key light
    this._blobScale      = opts.blobScale      ?? 2.8;  // tighter player halo
    this._blobAlpha      = opts.blobAlpha      ?? 0.20; // subtler ambient
    this._ambGlowScale   = opts.ambientGlowScale ?? 7;  // wider, softer diffusion
    this._dofEnabled     = opts.dofEdges   !== false;
    this._tintEnabled    = opts.sceneTint  !== false;

    // Runtime references
    this._light2D         = null;
    this._light2DEnabled  = false;
    this._playerBlob      = null;
    this._ambientGlow     = null;
    this._sceneTintGfx    = null;
    this._dofGfx          = null;
    this._target          = null;
    this._glows           = [];   // { sprite, blob, tween }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MOOD PALETTES
  // ═══════════════════════════════════════════════════════════════════

  static PALETTES = {
    warm:     { ambient: 0xAA8A70, light: 0xFFBB66, tint: 0xFFAA44, tintAlpha: 0.04 },
    rain:     { ambient: 0x4A5A6A, light: 0x5577AA, tint: 0x0A1828, tintAlpha: 0.12 },
    dawn:     { ambient: 0x3A4462, light: 0xFF9940, tint: 0xFF6622, tintAlpha: 0.05 },
    office:   { ambient: 0x9A9EB4, light: 0xCCDDFF, tint: 0xAABBDD, tintAlpha: 0.03 },
    romantic: { ambient: 0x9A6070, light: 0xFFAACC, tint: 0xFF88AA, tintAlpha: 0.04 },
    default:  { ambient: 0x888888, light: 0xFFDDCC, tint: null,     tintAlpha: 0    },
  };

  /**
   * Depth slots within the fx layer.
   * Computed from scene.layers (LayerManager) when available; otherwise falls
   * back to the absolute literals so SceneLighting works in scenes that have
   * no LayerManager (e.g. UIScene). Offsets: +4/+5/+8/+10 within fx (base 800).
   */
  static DEPTHS = {
    ambientGlow: 804,
    playerBlob:  805,
    dofVignette: 808,
    sceneTint:   810,
  };

  /** Return depth slots resolved against this scene's LayerManager if present. */
  _depths() {
    const L = this.scene.layers;
    if (!L) return SceneLighting.DEPTHS;
    return {
      ambientGlow: L.depth('fx',  4),
      playerBlob:  L.depth('fx',  5),
      dofVignette: L.depth('fx',  8),
      sceneTint:   L.depth('fx', 10),
    };
  }

  _palette() { return SceneLighting.PALETTES[this._mood] ?? SceneLighting.PALETTES.default; }

  // ═══════════════════════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Initialise all lighting layers. Call once in scene create(), BEFORE
   * placing sprites that need Light2D (so they can opt in via `applyPipeline`).
   */
  create() {
    const pal = this._palette();
    const depths = this._depths();  // resolved against scene.layers if present
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    // ── 1. Phaser WebGL Light2D ────────────────────────────────────
    try {
      if (this.scene.lights) {
        this.scene.lights.enable().setAmbientColor(pal.ambient);
        this._light2D = this.scene.lights.addLight(0, 0, this._lightRadius, pal.light, this._lightIntensity);
        this._light2DEnabled = true;
      }
    } catch (_) { /* non-WebGL — silent fallback */ }

    // ── 2. Additive player light-blob (always rendered) ────────────
    this._playerBlob = this.scene.add.image(0, 0, 'light-blob')
      .setScale(this._blobScale)
      .setAlpha(this._blobAlpha)
      .setBlendMode('ADD')
      .setScrollFactor(1)
      .setDepth(depths.playerBlob)
      .setTint(pal.light);

    // ── 3. Secondary wider ambient glow ────────────────────────────
    this._ambientGlow = this.scene.add.image(0, 0, 'light-blob')
      .setScale(this._ambGlowScale)
      .setAlpha(0.06)
      .setBlendMode('ADD')
      .setScrollFactor(1)
      .setDepth(depths.ambientGlow)
      .setTint(pal.light);

    // ── 4. Screen-space mood tint ──────────────────────────────────
    if (this._tintEnabled && pal.tint !== null) {
      this._sceneTintGfx = this.scene.add.graphics()
        .setScrollFactor(0).setDepth(depths.sceneTint);
      this._sceneTintGfx.fillStyle(pal.tint, pal.tintAlpha);
      this._sceneTintGfx.fillRect(0, 0, w, h);
    }

    // ── 5. Depth-of-field edge darkening ───────────────────────────
    if (this._dofEnabled) {
      this._dofGfx = this.scene.add.graphics()
        .setScrollFactor(0).setDepth(depths.dofVignette);
      // Reduce intensity on mobile — small screens don't need heavy vignette
      const _mob = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const baseAlpha = _mob ? 0.006 : 0.013;
      const edgeAlpha = _mob ? 0.005 : 0.011;
      const topPasses = _mob ? 8 : 14;
      const sidePasses = _mob ? 5 : 8;
      // Top edge
      for (let i = 0; i < topPasses; i++) {
        this._dofGfx.fillStyle(0x000000, baseAlpha * (1 - i / topPasses));
        this._dofGfx.fillRect(0, i * 8, w, 8);
      }
      // Bottom edge
      for (let i = 0; i < topPasses; i++) {
        this._dofGfx.fillStyle(0x000000, baseAlpha * (i / topPasses));
        this._dofGfx.fillRect(0, h - topPasses * 8 + i * 8, w, 8);
      }
      // Side edges
      for (let i = 0; i < sidePasses; i++) {
        const a = edgeAlpha * (1 - i / sidePasses);
        this._dofGfx.fillStyle(0x000000, a);
        this._dofGfx.fillRect(i * 10, 0, 10, h);
        this._dofGfx.fillRect(w - (i + 1) * 10, 0, 10, h);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CONFIGURE — post-construction tuning (safe public API)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Tune lighting parameters after create() has run.
   * All opts are optional — only the keys provided are applied.
   * Replaces the pattern of directly mutating _light2D/_playerBlob/_ambientGlow,
   * which was broken because update() overwrites those values each frame using
   * the stale base fields (_blobScale etc.) rather than the mutated object state.
   *
   * @param {object} opts
   * @param {number} [opts.ambientColor]   — WebGL ambient hex (e.g. 0x0E0A1A)
   * @param {number} [opts.lightRadius]    — WebGL point-light radius in px
   * @param {number} [opts.lightIntensity] — WebGL point-light intensity
   * @param {number} [opts.blobScale]      — additive player blob base scale
   * @param {number} [opts.blobAlpha]      — additive player blob base alpha
   * @param {number} [opts.blobTint]       — additive player blob tint hex
   * @param {number} [opts.ambGlowScale]   — ambient glow base scale
   * @param {number} [opts.ambGlowAlpha]   — ambient glow base alpha
   * @param {number} [opts.ambGlowTint]    — ambient glow tint hex
   */
  configure(opts = {}) {
    if (opts.ambientColor    !== undefined) this.scene.lights?.setAmbientColor(opts.ambientColor);
    if (opts.lightRadius     !== undefined) this._lightRadius     = opts.lightRadius;
    if (opts.lightIntensity  !== undefined) this._lightIntensity  = opts.lightIntensity;
    if (opts.blobScale       !== undefined) this._blobScale       = opts.blobScale;
    if (opts.blobAlpha       !== undefined) this._blobAlpha       = opts.blobAlpha;
    if (opts.blobTint        !== undefined) this._playerBlob?.setTint(opts.blobTint);
    if (opts.ambGlowScale    !== undefined) this._ambGlowScale    = opts.ambGlowScale;
    if (opts.ambGlowAlpha    !== undefined) this._ambientGlow?.setAlpha(opts.ambGlowAlpha);
    if (opts.ambGlowTint     !== undefined) this._ambientGlow?.setTint(opts.ambGlowTint);
    // Apply initial WebGL light state immediately so first-frame values are correct
    if (this._light2D) {
      if (opts.lightRadius    !== undefined) this._light2D.setRadius(opts.lightRadius);
      if (opts.lightIntensity !== undefined) this._light2D.setIntensity(opts.lightIntensity);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FOLLOW TARGET
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Attach the follow-light to a game object (player sprite).
   * @param {{ x: number, y: number }} target — anything with x/y
   */
  followTarget(target) {
    this._target = target;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERACTABLE GLOW
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Add a pulsating glow blob under/around a game object.
   * @param {Phaser.GameObjects.Image|Phaser.GameObjects.Sprite} sprite
   * @param {number} [tint=0xFFB7C5]
   * @param {object} [opts]
   * @param {number} [opts.scale=1.5]
   * @param {number} [opts.alpha=0.18]
   * @param {number} [opts.pulseSpeed=0.004] — radians / ms
   * @param {number} [opts.pulseAmount=0.25] — fraction of base scale
   * @returns {object} handle — pass to removeGlow() when done
   */
  addGlow(sprite, tint = 0xFFB7C5, opts = {}) {
    const scale  = opts.scale       ?? 1.5;
    const alpha  = opts.alpha       ?? 0.18;
    const pSpeed = opts.pulseSpeed  ?? 0.004;
    const pAmt   = opts.pulseAmount ?? 0.25;

    const blob = this.scene.add.image(sprite.x, sprite.y + 10, 'light-blob')
      .setScale(scale).setAlpha(alpha).setDepth(sprite.depth - 1)
      .setTint(tint).setBlendMode('ADD');

    // Opt into Light2D pipeline if available
    this.applyPipeline(sprite);

    const handle = { sprite, blob, scale, alpha, pSpeed, pAmt, active: true };
    this._glows.push(handle);
    return handle;
  }

  /**
   * Remove a previously-added glow.
   * @param {object} handle — returned by addGlow
   * @param {boolean} [fade=true] — fade out vs instant remove
   */
  removeGlow(handle, fade = true) {
    if (!handle || !handle.active) return;
    handle.active = false;
    if (fade) {
      this.scene.tweens.add({
        targets: handle.blob, alpha: 0, duration: 400,
        onComplete: () => handle.blob.destroy(),
      });
    } else {
      handle.blob.destroy();
    }
    const idx = this._glows.indexOf(handle);
    if (idx !== -1) this._glows.splice(idx, 1);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LIGHT2D PIPELINE HELPER
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Opt a sprite into the Light2D pipeline so it reacts to point lights.
   * Safe fallback when WebGL or Light2D is unavailable.
   * @param {Phaser.GameObjects.Image|Phaser.GameObjects.Sprite} sprite
   */
  applyPipeline(sprite) {
    if (!this._light2DEnabled || !sprite?.setPipeline) return;
    try { sprite.setPipeline('Light2D'); } catch (_) { /* no-op */ }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE (call every frame)
  // ═══════════════════════════════════════════════════════════════════

  /** @param {number} time — scene time in ms */
  update(time) {
    const t = this._target;
    if (!t) return;

    const px = t.x;
    const py = t.y;

    // WebGL point light tracks target
    if (this._light2D) {
      this._light2D.x = px;
      this._light2D.y = py;
      const pulse = 1 + Math.sin(time * 0.0015) * 0.05; // slower, subtler radius breath
      this._light2D.setRadius(this._lightRadius * pulse);
      this._light2D.setIntensity(this._lightIntensity + Math.sin(time * 0.002) * 0.08);
    }

    // Additive blob follows
    if (this._playerBlob) {
      this._playerBlob.x = px;
      this._playerBlob.y = py + 4;
      const p = 1 + Math.sin(time * 0.0015) * 0.06; // gentle breathing scale
      this._playerBlob.setScale(this._blobScale * p);
      this._playerBlob.setAlpha(this._blobAlpha + Math.sin(time * 0.002) * 0.03);
    }

    // Ambient glow lags gently behind
    if (this._ambientGlow) {
      this._ambientGlow.x += (px - this._ambientGlow.x) * 0.025; // slower lag for softer feel
      this._ambientGlow.y += (py - this._ambientGlow.y) * 0.025;
      const ap = 1 + Math.sin(time * 0.0008) * 0.04; // barely perceptible swell
      this._ambientGlow.setScale(this._ambGlowScale * ap);
    }

    // Interactable glow pulses — sync position and depth each frame.
    // Depth must follow the sprite because Y-sorted sprites have their depth
    // rewritten every frame by depthMgr.update(); a one-time set at addGlow()
    // creation would drift above or below the sprite as it moves vertically.
    for (const g of this._glows) {
      if (!g.active) continue;
      g.blob.x = g.sprite.x;
      g.blob.y = g.sprite.y + 10;
      g.blob.setDepth(g.sprite.depth - 1);
      const gp = 1 + Math.sin(time * g.pSpeed) * g.pAmt;
      g.blob.setScale(g.scale * gp);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════════════

  destroy() {
    // Remove the WebGL point light from the LightsPlugin BEFORE losing the ref.
    // Without this, every resize call (destroy + new SceneLighting) leaks a ghost
    // light; three orientation changes → 3× stacked light intensity.
    if (this._light2D) {
      try { this.scene.lights?.removeLight(this._light2D); } catch (_) {}
      this._light2D = null;
    }
    if (this._playerBlob)   this._playerBlob.destroy();
    if (this._ambientGlow)  this._ambientGlow.destroy();
    if (this._sceneTintGfx) this._sceneTintGfx.destroy();
    if (this._dofGfx)       this._dofGfx.destroy();
    for (const g of this._glows) { if (g.blob?.scene) g.blob.destroy(); }
    this._glows.length = 0;
    this._target = null;
  }
}
