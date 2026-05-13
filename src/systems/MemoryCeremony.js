/**
 * MemoryCeremony — premium memory collection ritual.
 *
 * When a memory is triggered, this system takes over the screen for
 * a brief 3–4 second ceremony:
 *   1. World dims (dark overlay fades in)
 *   2. Golden ring expands from the origin point
 *   3. Particle burst erupts
 *   4. Quote text appears letter-by-letter in centered serif
 *   5. Everything dissolves with a warm flash
 *
 * Usage:
 *   MemoryCeremony.play(scene, {
 *     x: 300, y: 200,
 *     label: 'A Letter from Mom',
 *     onComplete: () => { ... },
 *   });
 */

export class MemoryCeremony {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} opts
   * @param {number} opts.x — world X of the triggered object
   * @param {number} opts.y — world Y of the triggered object
   * @param {string} [opts.label='Memory Collected'] — display text
   * @param {Function} [opts.onComplete] — called when ceremony ends
   * @param {number} [opts.color=0xFFD080] — ring/particle tint
   */
  static play(scene, opts = {}) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const cx = w / 2;
    const cy = h / 2;
    const label = opts.label ?? 'Memory Collected';
    const color = opts.color ?? 0xFFD080;
    const depth = 8500;

    // ── 1. Dim overlay ──────────────────────────────────────────
    const overlay = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    overlay.fillStyle(0x020008, 0.75);
    overlay.fillRect(0, 0, w, h);
    overlay.setAlpha(0);

    scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 400,
      ease: 'Sine.easeOut',
    });

    // ── 2. Expanding golden ring ─────────────────────────────────
    const ring = scene.add.graphics().setScrollFactor(0).setDepth(depth + 1);
    const ringProgress = { radius: 0, alpha: 1.0 };

    scene.tweens.add({
      targets: ringProgress,
      radius: Math.max(w, h) * 0.35,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      delay: 200,
      onUpdate: () => {
        ring.clear();
        ring.lineStyle(2.5, color, ringProgress.alpha * 0.7);
        ring.strokeCircle(cx, cy, ringProgress.radius);
        // Inner thinner ring
        ring.lineStyle(1, 0xFFFFFF, ringProgress.alpha * 0.3);
        ring.strokeCircle(cx, cy, ringProgress.radius * 0.85);
      },
    });

    // ── 3. Particle burst ────────────────────────────────────────
    const particleKey = scene.textures.exists('particle-glow') ? 'particle-glow' : null;
    let emitter = null;
    if (particleKey) {
      emitter = scene.add.particles(cx, cy, particleKey, {
        speed: { min: 30, max: 120 },
        scale: { start: 0.25, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: [color, 0xFFFFFF, 0xFFEECC],
        lifespan: 1200,
        quantity: 16,
        emitting: false,
        blendMode: 'ADD',
      }).setScrollFactor(0).setDepth(depth + 2);

      scene.time.delayedCall(250, () => emitter.explode(16));
    }

    // ── 4. Centered label — letter-by-letter ─────────────────────
    const icon = '✦';
    const fullText = `${icon}  ${label}  ${icon}`;

    const txt = scene.add.text(cx, cy - 10, '', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '18px',
      color: '#FFF8E8',
      resolution: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#FFD080', blur: 20, fill: true },
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(depth + 3).setAlpha(0).setScrollFactor(0);

    // Typewriter reveal
    let charIdx = 0;
    scene.time.delayedCall(500, () => {
      txt.setAlpha(1);
      const timer = scene.time.addEvent({
        delay: 45,
        repeat: fullText.length - 1,
        callback: () => {
          charIdx++;
          txt.setText(fullText.substring(0, charIdx));
        },
      });
    });

    // Subtitle line
    const sub = scene.add.text(cx, cy + 18, 'memory collected', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '10px',
      color: '#C8A880',
      letterSpacing: 6,
      resolution: 2,
    }).setOrigin(0.5).setDepth(depth + 3).setAlpha(0).setScrollFactor(0);

    scene.tweens.add({
      targets: sub,
      alpha: 0.7,
      y: cy + 15,
      duration: 500,
      ease: 'Sine.easeOut',
      delay: 900,
    });

    // ── 5. Warm flash + dissolve ─────────────────────────────────
    const flash = scene.add.graphics().setScrollFactor(0).setDepth(depth + 4);
    flash.fillStyle(0xFFEECC, 0.25);
    flash.fillRect(0, 0, w, h);
    flash.setAlpha(0);

    scene.time.delayedCall(1600, () => {
      // Quick warm flash
      scene.tweens.add({
        targets: flash,
        alpha: 1,
        duration: 150,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
    });

    // Fade out everything
    const allElements = [overlay, ring, txt, sub, flash];
    scene.time.delayedCall(2200, () => {
      scene.tweens.add({
        targets: allElements,
        alpha: 0,
        duration: 600,
        ease: 'Sine.easeIn',
        onComplete: () => {
          allElements.forEach(el => el.destroy());
          if (emitter) emitter.destroy();
          if (opts.onComplete) opts.onComplete();
        },
      });
    });
  }
}
