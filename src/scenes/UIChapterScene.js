import Phaser from 'phaser';
import storyData from '../data/story.json';
import { audioManager } from '../utils/helpers.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { goToChapter } from '../systems/SceneManager.js';

/**
 * UIChapterScene — UI-type chapters with a static background and clickable hotspots.
 * No player movement. Clicking hotspots triggers dialogue; completing all advances chapter.
 */
export class UIChapterScene extends Phaser.Scene {
  constructor() { super('UIChapter'); }

  init(data) {
    this.chapterIndex = data.chapter || 0;
    this.chapter = storyData.chapters[this.chapterIndex];
    this._completedIds = new Set();
    this._allDone = false;
  }

  create() {
    const ch = this.chapter;
    const w = this.scale.width, h = this.scale.height;

    // Background
    const bgKey = ch.background;
    if (bgKey && this.textures.exists(bgKey)) {
      this.add.image(w / 2, h / 2, bgKey).setDisplaySize(w, h).setDepth(-1);
    } else {
      const fallback = this.add.graphics().setDepth(-1);
      fallback.fillGradientStyle(0x0a0020, 0x0a0020, 0x180830, 0x180830, 1);
      fallback.fillRect(0, 0, w, h);
    }

    // Cinematic overlays
    this.add.image(w / 2, h / 2, 'vignette').setDepth(50).setAlpha(0.45);
    this.add.image(w / 2, h / 2, 'warm-overlay').setDepth(51).setAlpha(0.28);
    this._grain = this.add.tileSprite(w / 2, h / 2, w, h, 'film-grain')
      .setAlpha(0.2).setBlendMode('ADD').setDepth(52);

    // Subtle sparkle ambience — particle-star-k is the Kenney star_04.png,
    // a crisp 4-point star with sparkle rays. Higher quality than canvas draw.
    this.add.particles(w / 2, h / 2, 'particle-star-k', {
      x: { min: -w / 2, max: w / 2 },
      y: { min: -h / 2, max: h / 2 },
      speedY: { min: -6, max: 6 },
      speedX: { min: -6, max: 6 },
      scale: { start: 0.20, end: 0 },
      alpha: { start: 0.30, end: 0 },
      lifespan: 5000,
      frequency: 300,
      quantity: 1,
      blendMode: 'ADD'
    }).setDepth(4);

    // Dialogue system
    this.dialogue = new DialogueSystem(this);

    // Audio
    audioManager.init();
    audioManager.resume();
    audioManager.startAmbient('warm');

    // Launch shared UI overlay
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

    // Optional intro dialogue
    if (ch.introDialogue) {
      this.time.delayedCall(1600, () => {
        const lines = storyData.dialogues[ch.introDialogue];
        if (lines) this.dialogue.start(lines);
      });
    }

    // Build interactive hotspots
    this._buildUIElements(ch);

    // Click/key to advance active dialogue
    this.input.on('pointerdown', () => {
      if (this.dialogue.active) this.dialogue.advance();
    });
    this.input.keyboard.on('keydown', (e) => {
      if (['Space', 'Enter', 'KeyE'].includes(e.code)) {
        if (this.dialogue.active) this.dialogue.advance();
      }
    });
  }

  _buildUIElements(ch) {
    if (!ch.uiElements) return;

    ch.uiElements.forEach(el => {
      // Ambient highlight glow — drawn once, alpha-tweened (0 per-frame clears vs 2 clear+draws at 60fps)
      if (el.highlight) {
        const glow1 = this.add.graphics().setDepth(19);
        glow1.fillStyle(0xFFD4A0, 0.09);
        glow1.fillCircle(el.x, el.y, 68);
        const glow2 = this.add.graphics().setDepth(19);
        glow2.fillStyle(0xFFFFFF, 0.04);
        glow2.fillCircle(el.x, el.y, 44);
        this.tweens.add({
          targets: [glow1, glow2], alpha: { from: 0.4, to: 1.0 },
          duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
      }

      // Floating diamond interaction indicator
      const icon = this.add.image(el.x, el.y - 50, 'interact-icon')
        .setDepth(35).setAlpha(0.85).setScale(1.1);
      this.tweens.add({
        targets: icon,
        y: icon.y - 8,
        duration: 900,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });

      // Tap label
      const label = this.add.text(el.x, el.y - 76, el.label || '✦ Tap', {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        color: '#FFD8E0',
        stroke: '#000000',
        strokeThickness: 3,
        resolution: 2
      }).setOrigin(0.5).setDepth(36).setAlpha(0.8);

      // Invisible interaction zone
      const zone = this.add.zone(el.x, el.y, 110, 90)
        .setInteractive({ useHandCursor: true })
        .setDepth(40);

      zone.on('pointerover', () => {
        this.tweens.add({ targets: [icon, label], scaleX: 1.2, scaleY: 1.2, duration: 150 });
      });
      zone.on('pointerout', () => {
        this.tweens.add({ targets: [icon, label], scaleX: 1, scaleY: 1, duration: 150 });
      });

      zone.on('pointerdown', () => {
        if (this.dialogue.active) return;
        if (this._completedIds.has(el.id)) return;
        this._completedIds.add(el.id);

        icon.destroy();
        label.destroy();
        audioManager.playInteract();

        // Camera flash + heart burst
        this.cameras.main.flash(180, 255, 240, 255, true);
        const burst = this.add.particles(el.x, el.y, 'particle-heart', {
          speed: { min: 40, max: 90 },
          scale: { start: 0.5, end: 0 },
          alpha: { start: 0.8, end: 0 },
          lifespan: 900,
          quantity: 6,
          blendMode: 'ADD'
        }).setDepth(60);
        this.time.delayedCall(900, () => burst.destroy());

        const lines = storyData.dialogues[el.dialogue];
        if (lines) {
          this.dialogue.start(lines, () => this._checkComplete(ch));
        } else {
          this._checkComplete(ch);
        }
      });
    });
  }

  _checkComplete(ch) {
    if (this._allDone) return;
    const needed = ch.uiElements ? ch.uiElements.length : 0;
    if (this._completedIds.size >= needed) {
      this._allDone = true;
      this.time.delayedCall(800, () => this._advance());
    }
  }

  _advance() {
    audioManager.playTransitionWhoosh();
    audioManager.fadeOutAll(1200);
    const nextIndex = this.chapterIndex + 1;
    if (nextIndex < storyData.chapters.length) {
      localStorage.setItem('prawal-aashna-chapter', String(nextIndex));
    }
    this.cameras.main.fadeOut(1400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('UI');
      goToChapter(this, nextIndex);
    });
  }

  update() {
    if (this._grain) {
      this._grain.tilePositionX = Math.random() * 256;
      this._grain.tilePositionY = Math.random() * 256;
    }
  }

  shutdown() {
    if (this.dialogue) this.dialogue.destroy();
  }
}
