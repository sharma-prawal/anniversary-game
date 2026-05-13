/**
 * ColorGrading — per-chapter full-screen color adjustment overlay.
 *
 * Applies a screen-space color filter via a semi-transparent Phaser
 * Graphics rectangle with blend mode. Each chapter gets a unique
 * color grade that sets the emotional tone:
 *   • Hue tint (warm, cool, sepia, etc.)
 *   • Saturation emphasis (vibrant or muted)
 *   • Contrast edge (vignette intensity)
 *
 * All overlays are scrollFactor 0 and sit at fx-layer depth.
 *
 * Usage:
 *   const grade = new ColorGrading(scene);
 *   grade.apply('digital_beginning'); // cold blue nighttime
 *   // later:
 *   grade.transition('engagement_wedding', 1200); // warm crossfade
 *   // cleanup:
 *   grade.destroy();
 */

import { colorGradingMul } from './MobileAdaptationManager.js';

export class ColorGrading {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [opts]
   * @param {number} [opts.depth=995] — render depth (high, within fx layer)
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    const depth = opts.depth ?? 995;

    // Main color tint overlay
    this._tint = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this._tint.setAlpha(0);

    // Secondary overlay for contrast/mood (multiply-style darkening)
    this._contrast = scene.add.graphics().setScrollFactor(0).setDepth(depth - 1);
    this._contrast.setAlpha(0);

    this._w = w;
    this._h = h;
    this._currentProfile = null;
  }

  // ── Chapter color profiles ────────────────────────────────────

  static PROFILES = {
    digital_beginning: {
      tint: 0x1020AA, tintAlpha: 0.06, tintBlend: 'ADD',
      contrast: 0x000818, contrastAlpha: 0.12,
      desc: 'Cold blue nighttime — screen glow loneliness',
    },
    friend_request: {
      tint: 0x2040CC, tintAlpha: 0.05, tintBlend: 'ADD',
      contrast: 0x000410, contrastAlpha: 0.08,
      desc: 'Warmer blue — hopeful digital moment',
    },
    chat_and_pause: {
      tint: 0x404060, tintAlpha: 0.07, tintBlend: 'ADD',
      contrast: 0x0A0818, contrastAlpha: 0.14,
      desc: 'Desaturated twilight — fading conversations',
    },
    first_meeting: {
      tint: 0xFFDDCC, tintAlpha: 0.04, tintBlend: 'ADD',
      contrast: 0x080400, contrastAlpha: 0.06,
      desc: 'Golden warm — daylight, first real sight',
    },
    growing_connection: {
      tint: 0xFFCCAA, tintAlpha: 0.04, tintBlend: 'ADD',
      contrast: 0x060300, contrastAlpha: 0.05,
      desc: 'Soft amber — comfort and familiarity',
    },
    first_gift: {
      tint: 0xFFBB88, tintAlpha: 0.05, tintBlend: 'ADD',
      contrast: 0x080400, contrastAlpha: 0.05,
      desc: 'Warm sunset — generosity and joy',
    },
    pizza_day: {
      tint: 0xFFCC66, tintAlpha: 0.04, tintBlend: 'ADD',
      contrast: 0x060200, contrastAlpha: 0.04,
      desc: 'Golden evening — casual warmth',
    },
    relationship_growth: {
      tint: 0xFFAACC, tintAlpha: 0.04, tintBlend: 'ADD',
      contrast: 0x080208, contrastAlpha: 0.06,
      desc: 'Rose pink — budding romance',
    },
    the_letters: {
      tint: 0xDDCC88, tintAlpha: 0.06, tintBlend: 'ADD',
      contrast: 0x0A0804, contrastAlpha: 0.10,
      desc: 'Sepia warmth — paper, ink, memory',
    },
    fights_and_fix: {
      tint: 0x404860, tintAlpha: 0.08, tintBlend: 'ADD',
      contrast: 0x080810, contrastAlpha: 0.16,
      desc: 'Storm grey-blue — tension and rain',
    },
    little_surprises: {
      tint: 0xFFDD88, tintAlpha: 0.04, tintBlend: 'ADD',
      contrast: 0x060400, contrastAlpha: 0.05,
      desc: 'Warm honey — delight and care',
    },
    family_meet: {
      tint: 0xFFCCBB, tintAlpha: 0.04, tintBlend: 'ADD',
      contrast: 0x080404, contrastAlpha: 0.06,
      desc: 'Soft peach — warmth of home',
    },
    paths_merge: {
      tint: 0xBBAAFF, tintAlpha: 0.05, tintBlend: 'ADD',
      contrast: 0x040408, contrastAlpha: 0.08,
      desc: 'Ethereal lavender — destiny',
    },
    engagement_wedding: {
      tint: 0xFFDD99, tintAlpha: 0.06, tintBlend: 'ADD',
      contrast: 0x080600, contrastAlpha: 0.04,
      desc: 'Golden bloom — ceremony light',
    },
    present_day: {
      tint: 0xFFBBDD, tintAlpha: 0.04, tintBlend: 'ADD',
      contrast: 0x060206, contrastAlpha: 0.05,
      desc: 'Soft pink glow — love present',
    },
  };

  /**
   * Apply a color grade immediately (no transition).
   * @param {string} chapterId
   */
  apply(chapterId) {
    const profile = ColorGrading.PROFILES[chapterId];
    if (!profile) return;
    this._currentProfile = profile;
    this._drawTint(profile);
    this._drawContrast(profile);
    // On small landscape phones, reduce overlay darkness to prevent
    // scenes looking black-on-black. Desktop returns mul={1,1} (no change).
    const mul = colorGradingMul();
    this._tint.setAlpha(profile.tintAlpha * mul.tint);
    this._contrast.setAlpha(profile.contrastAlpha * mul.contrast);
  }

  /**
   * Crossfade to a new color grade.
   * @param {string} chapterId
   * @param {number} [durationMs=800]
   */
  transition(chapterId, durationMs = 800) {
    const profile = ColorGrading.PROFILES[chapterId];
    if (!profile) return;

    // Fade out current
    this.scene.tweens.add({
      targets: [this._tint, this._contrast],
      alpha: 0,
      duration: durationMs * 0.4,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this._currentProfile = profile;
        this._drawTint(profile);
        this._drawContrast(profile);
        // Apply mobile reduction at the moment of fade-in so a mid-session
        // rotation (landscape → portrait → landscape) uses the correct value.
        const mul = colorGradingMul();
        // Fade in new
        this.scene.tweens.add({
          targets: this._tint,
          alpha: profile.tintAlpha * mul.tint,
          duration: durationMs * 0.6,
          ease: 'Sine.easeOut',
        });
        this.scene.tweens.add({
          targets: this._contrast,
          alpha: profile.contrastAlpha * mul.contrast,
          duration: durationMs * 0.6,
          ease: 'Sine.easeOut',
        });
      },
    });
  }

  _drawTint(profile) {
    this._tint.clear();
    this._tint.fillStyle(profile.tint, 1.0);
    this._tint.fillRect(0, 0, this._w, this._h);
    // Set blend mode
    const mode = profile.tintBlend === 'MULTIPLY' ? 'MULTIPLY' : 'ADD';
    this._tint.setBlendMode(mode);
  }

  _drawContrast(profile) {
    this._contrast.clear();
    // Flat mood-tint darkening layer. The per-scene vignette is handled by EnvironmentManager presets.
    this._contrast.fillStyle(profile.contrast, 1.0);
    this._contrast.fillRect(0, 0, this._w, this._h);
  }

  destroy() {
    this._tint?.destroy();
    this._contrast?.destroy();
  }
}
