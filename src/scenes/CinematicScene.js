import Phaser from 'phaser';
import storyData from '../data/story.json';
import { audioManager } from '../utils/helpers.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { LayerManager } from '../systems/LayerManager.js';
import { CameraController } from '../systems/CameraController.js';
import { goToChapter } from '../systems/SceneManager.js';

/**
 * CinematicScene — auto-play visual-novel-style chapters.
 * Shows a procedural background, plays dialogue automatically (click/key to advance),
 * then fades to next chapter.
 */
export class CinematicScene extends Phaser.Scene {
  constructor() { super('Cinematic'); }

  init(data) {
    this.chapterIndex = data.chapter || 0;
    this.chapter = storyData.chapters[this.chapterIndex];
  }

  create() {
    const ch = this.chapter;
    const w = this.scale.width, h = this.scale.height;

    // ── 2.5D Systems ────────────────────────────────────────────────
    this.layers = new LayerManager(this);
    this.cinematicCam = new CameraController(this, {
      drift:      true,
      driftAmpX:  2,    // subtle drift — cinematic, not gameplay
      driftAmpY:  1.5,
      fadeInMs:   0,    // CinematicScene manages its own fade via dialogues
    });

    // Background
    const bgKey = ch.background;
    if (bgKey && this.textures.exists(bgKey)) {
      this.add.image(w / 2, h / 2, bgKey).setDisplaySize(w, h)
        .setDepth(this.layers.depth('background'));
    } else {
      const bg = this.add.graphics().setDepth(this.layers.depth('background'));
      bg.fillGradientStyle(0x0a0020, 0x0a0020, 0x180830, 0x180830, 1);
      bg.fillRect(0, 0, w, h);
    }

    // Cinematic overlays (vignette + grain + warm tint)
    this.add.image(w / 2, h / 2, 'vignette')
      .setDepth(this.layers.depth('fx', 100)).setAlpha(0.6);
    this.add.image(w / 2, h / 2, 'warm-overlay').setScrollFactor(0)
      .setDepth(this.layers.depth('fx', 101)).setAlpha(0.3);
    this._grain = this.add.tileSprite(w / 2, h / 2, w, h, 'film-grain')
      .setAlpha(0.22).setBlendMode('ADD').setDepth(this.layers.depth('fx', 102));

    // Real photo polaroid — fades in after chapter title if photo uploaded to public/photos/
    if (ch.photo && this.textures.exists(ch.photo)) {
      const pw = Math.round(w * 0.24), ph = Math.round(h * 0.24);
      const px = Math.round(w * 0.72), py = Math.round(h * 0.44);
      const frame = this.add.graphics()
        .setDepth(this.layers.depth('fx', 115)).setAlpha(0);
      frame.fillStyle(0xFFF8F0, 0.92);
      frame.fillRect(px - pw / 2 - 7, py - ph / 2 - 7, pw + 14, ph + 28);
      frame.lineStyle(1, 0xDDC8B8, 0.5);
      frame.strokeRect(px - pw / 2 - 7, py - ph / 2 - 7, pw + 14, ph + 28);
      const photo = this.add.image(px, py - 4, ch.photo)
        .setDisplaySize(pw, ph).setDepth(this.layers.depth('fx', 116)).setAlpha(0);
      this.time.delayedCall(1400, () => {
        this.tweens.add({ targets: frame, alpha: 1, y: frame.y - 5, duration: 800, ease: 'Back.easeOut' });
        this.tweens.add({ targets: photo, alpha: 1, y: photo.y - 5, duration: 800, ease: 'Back.easeOut', delay: 60 });
      });
    } else if (ch.photo) {
      console.warn('[Photo] Texture not found in cache:', ch.photo, '— check PreloadScene loaded correctly');
    }

    // Ambient floating petals
    this._ambientEmitter = this.add.particles(w / 2, 0, 'particle-petal', {
      x: { min: -w / 2, max: w / 2 },
      y: { min: 0, max: h },
      speedY: { min: 14, max: 38 },
      speedX: { min: -18, max: 6 },
      scale: { start: 0.5, end: 0.1 },
      alpha: { start: 0.45, end: 0 },
      rotate: { min: 0, max: 360 },
      lifespan: 8000,
      frequency: 220,
      quantity: 1,
      blendMode: 'ADD'
    }).setDepth(this.layers.depth('gameplay', 50));

    // Dialogue system
    this.dialogue = new DialogueSystem(this);

    // Audio
    audioManager.init();
    audioManager.resume();
    audioManager.startAmbient('warm');

    // Launch shared UI overlay (handles dialogue box + chapter intro)
    this.scene.launch('UI');

    // Chapter intro card
    this.time.delayedCall(400, () => {
      this.game.events.emit('chapter-intro', {
        title: ch.title,
        subtitle: ch.subtitle,
        description: ch.description || ''
      });
      this.game.events.emit('chapter-progress', {
        current: this.chapterIndex + 1,
        total: storyData.chapters.length
      });
    });

    // Auto-start dialogue after intro title fades (~1.6s)
    this.time.delayedCall(1600, () => {
      const lines = storyData.dialogues[ch.autoDialogue];
      if (lines) {
        this.dialogue.start(lines, () => this._advance());
      } else {
        this.time.delayedCall(800, () => this._advance());
      }
    });

    // Inputs to advance dialogue (click or keyboard)
    this.input.on('pointerdown', () => {
      if (this.dialogue.active) this.dialogue.advance();
    });
    this.input.keyboard.on('keydown', (e) => {
      if (['Space', 'Enter', 'KeyE'].includes(e.code)) {
        if (this.dialogue.active) this.dialogue.advance();
      }
    });
  }

  update(time) {
    if (this._grain) {
      this._grain.tilePositionX = Math.random() * 256;
      this._grain.tilePositionY = Math.random() * 256;
    }
    // Subtle camera drift for cinematic feel
    if (this.cinematicCam) this.cinematicCam.update(time);
  }

  _advance() {
    audioManager.playTransitionWhoosh();
    audioManager.fadeOutAll(1200);
    const ch = this.chapter;
    const nextIndex = this.chapterIndex + 1;

    // Save progress
    if (nextIndex < storyData.chapters.length) {
      localStorage.setItem('prawal-aashna-chapter', String(nextIndex));
    }

    // Vary fade color: wedding/present/happy chapters → warm white fade
    const isWarm = ch.background === 'wedding' || ch.ambient === 'petals';
    const fr = isWarm ? 255 : 0;
    const fg = isWarm ? 240 : 0;
    const fb = isWarm ? 230 : 0;
    this.cinematicCam.fadeOut(1400, fr, fg, fb);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('UI');
      goToChapter(this, nextIndex);
    });
  }

  shutdown() {
    if (this.dialogue) this.dialogue.destroy();
    this.cinematicCam?.destroy();
    this.layers?.destroy();
  }
}

// Re-export from canonical location for backward compatibility
export { goToChapter } from '../systems/SceneManager.js';
