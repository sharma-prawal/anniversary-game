import storyData from '../data/story.json';
import { audioManager, getSafeAreaBottom, getSafeAreaTop } from '../utils/helpers.js';
import { Letterbox } from '../systems/Letterbox.js';
import { MemoryCeremony } from '../systems/MemoryCeremony.js';
import { dialogueBoxConfig, chapterIntroFontConfig } from '../systems/MobileAdaptationManager.js';

export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    console.log('[UIScene] create() — running');
    const { width, height } = this.scale;

    // Pin this scene's camera — never scroll, always cover full canvas
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setSize(width, height);

    // Dialogue box elements
    this._createDialogueBox(width, height);
    // Cinematic letterbox bars
    this._letterbox = new Letterbox(this, { barHeight: 34, depth: 840 });
    // Chapter intro overlay
    this._setupChapterIntro(width, height);
    // Memory notification
    this._setupMemoryNotification(width, height);
    // Chapter progress pill
    this._setupProgress(width, height);
    // Controls hint (WASD/E) shown early in world chapters
    this._setupControlsHint(width, height);
    // World scene explore hint
    this._setupExploreHint(width, height);
    // Finale
    this._setupFinale(width, height);
    // Collect counter (letters / gifts) — shown in Ch9, Ch11, Ch12
    this._setupCollectCounter(width, height);
    // Chat header (Aashna bar) — shown in Ch3
    this._setupChatHeader(width, height);

    console.log('[UIScene] create() — all UI built, registering events');
    // Dialogue events reach UIScene via DialogueSystem._ui() direct call — no bus needed.
    // Non-dialogue events still come via game.events from ChapterScene._uiEmit / SceneManager.
    this.game.events.on('chapter-intro', this._onChapterIntro, this);
    this.game.events.on('memory-collected', this._onMemoryCollected, this);
    this.game.events.on('memory-notification', this._onMemoryNotification, this);
    this.game.events.on('show-finale', this._onShowFinale, this);
    this.game.events.on('show-explore-hint', this._onShowExploreHint, this);
    this.game.events.on('chapter-progress', this._onChapterProgress, this);
    this.game.events.on('show-controls-hint', this._onShowControlsHint, this);
    this.game.events.on('collect-counter-init',   this._onCollectCounterInit,   this);
    this.game.events.on('collect-counter-update', this._onCollectCounterUpdate, this);
    this.game.events.on('collect-counter-hide',   this._onCollectCounterHide,   this);
    this.game.events.on('chat-header-show',        this._onChatHeaderShow,        this);
    this.game.events.on('chat-header-hide',        this._onChatHeaderHide,        this);

    this.events.on('shutdown', () => {
      this.scale.off('resize', this._onResize, this);
      this.game.events.off('chapter-intro', this._onChapterIntro, this);
      this.game.events.off('memory-collected', this._onMemoryCollected, this);
      this.game.events.off('memory-notification', this._onMemoryNotification, this);
      this.game.events.off('show-finale', this._onShowFinale, this);
      this.game.events.off('show-explore-hint', this._onShowExploreHint, this);
      this.game.events.off('chapter-progress', this._onChapterProgress, this);
      this.game.events.off('show-controls-hint', this._onShowControlsHint, this);
      this.game.events.off('collect-counter-init',   this._onCollectCounterInit,   this);
      this.game.events.off('collect-counter-update', this._onCollectCounterUpdate, this);
      this.game.events.off('collect-counter-hide',   this._onCollectCounterHide,   this);
      this.game.events.off('chat-header-show',        this._onChatHeaderShow,        this);
      this.game.events.off('chat-header-hide',        this._onChatHeaderHide,        this);
    });

    // Rebuild UI elements when the screen resizes (orientation change on iPad / phone)
    this._onResize = (gameSize) => {
      const { width, height } = gameSize;
      // Guard: cameras.main can be null during scene transitions triggered by
      // OrientationManager's scale.refresh() hitting a partially-shutdown scene.
      if (!this.cameras?.main) return;
      this.cameras.main.setSize(width, height);

      // Save dialogue state BEFORE zeroing alphas — so the text values are
      // still readable and the continue indicator alpha is still meaningful.
      const wasVisible    = this._dlgVisible;
      const savedSpeaker  = wasVisible ? (this.dlgSpeaker?.text ?? '') : '';
      const savedText     = wasVisible ? (this.dlgText?.text    ?? '') : '';
      // Continue indicator alpha is >0 when the "▼ SPACE / TAP" prompt is bouncing
      const savedContinue = wasVisible && (this.dlgContinue?.alpha ?? 0) > 0.1;

      // Hide any visible dialogue box smoothly — will reshow below if active
      if (this._dlgVisible) {
        this._dlgVisible = false;
        this._dlgElements?.forEach(el => el.setAlpha(0));
        this._letterbox?.hide(200);
      }

      // Recreate all dialogue elements at new dimensions
      this._dlgElements?.forEach(el => el.destroy());
      this._dlgElements = null;
      this._createDialogueBox(width, height);

      // ── Restore dialogue if it was active mid-rotation ──────────────
      // Without this, a 360° rotation hides the box permanently because
      // DialogueSystem is still mid-stream but never re-emits dialogue-start.
      if (wasVisible && (savedSpeaker || savedText)) {
        this._onDialogueStart();
        this._onDialogueLine({ speaker: savedSpeaker, text: savedText });
        if (savedContinue) this._onDialogueContinue(true);
      }

      // Reposition controls hint + continue indicator
      if (this.dlgContinue) {
        const safeB = getSafeAreaBottom();
        this.dlgContinue.setPosition(width - 60, height - 26 - safeB);
      }

      // Reposition collect counter
      if (this._counterText) {
        const safeT = getSafeAreaTop();
        this._counterText.setPosition(width / 2, safeT + 22);
        this._drawCounterPill();
      }

      // Reposition / rebuild chat header at new screen dimensions
      if (this._chatHeaderGfx) this._rebuildChatHeader(width, height);

      // Redraw letterbox bars at new screen dimensions so they cover the
      // full width after orientation change (bars were drawn once at old width)
      this._letterbox?.resize();
    };
    this.scale.on('resize', this._onResize, this);
  }

  /* ── Dialogue Box ─────────────────────────────── */
  _createDialogueBox(w, h) {
    // Adaptive layout: box height + font sizes scale on small landscape phones.
    // Returns original desktop values (boxH=130, 13/14/9 px fonts) on all other screens.
    const dlgCfg = dialogueBoxConfig(w, h);
    const boxH = dlgCfg.boxH;
    const boxW = w - (dlgCfg.marginX * 2);
    // Account for iPhone home-indicator / Android gesture bar so the box is
    // never partially hidden behind the OS navigation zone.
    const safeB = getSafeAreaBottom();
    const boxX = dlgCfg.marginX, boxY = h - boxH - dlgCfg.marginBot - safeB;

    // Semi-transparent background
    this.dlgBg = this.add.graphics().setDepth(850).setAlpha(0).setScrollFactor(0);
    this._drawDialogueBox(this.dlgBg, boxX, boxY, boxW, boxH);

    // Speaker accent bar (colored left stripe, redrawn per speaker)
    this._dlgAccent = this.add.graphics().setDepth(852).setAlpha(0).setScrollFactor(0);

    // Speaker name
    this.dlgSpeaker = this.add.text(52, boxY + 8, '', {
      fontFamily: 'Georgia, serif',
      fontSize: dlgCfg.speakerFontSize,
      color: '#FFB8C8',
      fontStyle: 'bold',
      resolution: 2,
      stroke: '#000000',
      strokeThickness: 2
    }).setDepth(853).setAlpha(0).setScrollFactor(0);

    // Dialogue text
    this.dlgText = this.add.text(46, boxY + 28, '', {
      fontFamily: 'Georgia, serif',
      fontSize: dlgCfg.textFontSize,
      color: '#FFFFFF',
      wordWrap: { width: boxW - 52 },
      lineSpacing: dlgCfg.lineSpacing,
      resolution: 2,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
    }).setDepth(853).setAlpha(0).setScrollFactor(0);

    // Continue indicator — styled pill, positioned above safe area
    this.dlgContinue = this.add.text(w - 60, h - 26 - safeB, '▼  SPACE / TAP', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: dlgCfg.continueFontSize,
      color: '#FFB8C8',
      padding: { x: 7, y: 3 },
      backgroundColor: 'rgba(160,60,90,0.28)',
      resolution: 2
    }).setOrigin(0.5).setDepth(853).setAlpha(0).setScrollFactor(0);

    this._dlgElements = [this.dlgBg, this._dlgAccent, this.dlgSpeaker, this.dlgText, this.dlgContinue];
    // Store ORIGINAL Y positions — never accumulate offsets
    this._dlgOrigY = this._dlgElements.map(el => el.y);
    this._dlgVisible = false;
    // Cache layout constants for accent bar redraws
    this._dlgBoxX = boxX; this._dlgBoxY = boxY; this._dlgBoxH = boxH;
  }

  _drawDialogueBox(g, x, y, w, h) {
    g.clear();
    // Glassmorphism — layered semi-transparent fills for depth
    // Base: deep frosted-glass dark
    g.fillStyle(0x050008, 0.90);
    g.fillRoundedRect(x, y, w, h, 12);
    // Glass layer 1: subtle purple-tinted glass body
    g.fillStyle(0x1A0028, 0.32);
    g.fillRoundedRect(x + 1, y + 1, w - 2, h - 2, 11);
    // Glass layer 2: bright inner highlight strip at top (simulates light refraction)
    g.fillStyle(0xFFFFFF, 0.07);
    g.fillRoundedRect(x + 1, y + 1, w - 2, 26, { tl: 11, tr: 11, bl: 0, br: 0 });
    // Glass layer 3: subtle bottom edge reflection
    g.fillStyle(0xFF99CC, 0.04);
    g.fillRoundedRect(x + 1, y + h - 22, w - 2, 20, { tl: 0, tr: 0, bl: 11, br: 11 });
    // Outer soft glow border (bloom effect)
    g.lineStyle(2.5, 0xC86090, 0.18);
    g.strokeRoundedRect(x - 1, y - 1, w + 2, h + 2, 13);
    // Main border
    g.lineStyle(1.5, 0xE888B8, 0.55);
    g.strokeRoundedRect(x, y, w, h, 12);
    // Inner highlight hairline
    g.lineStyle(1, 0xFFD8F0, 0.18);
    g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 11);
  }

  _drawAccentBar(speakerName) {
    this._dlgAccent.clear();
    const color = speakerName === 'Prawal' ? 0x90C8FF
      : speakerName === 'Aashna' ? 0xFF9EBC
      : 0xC0C0C0;
    this._dlgAccent.fillStyle(color, 0.90);
    this._dlgAccent.fillRoundedRect(
      this._dlgBoxX, this._dlgBoxY,
      4, this._dlgBoxH,
      { tl: 12, tr: 0, bl: 12, br: 0 }
    );
    // Glow halo
    this._dlgAccent.fillStyle(color, 0.15);
    this._dlgAccent.fillRoundedRect(
      this._dlgBoxX, this._dlgBoxY,
      14, this._dlgBoxH,
      { tl: 12, tr: 0, bl: 12, br: 0 }
    );
  }

  _onDialogueStart() {
    console.log('[UIScene] _onDialogueStart — _dlgVisible:', this._dlgVisible);
    if (!this._dlgElements) {
      // UIScene.create() not yet complete — reinit dialogue box on the fly
      this._createDialogueBox(this.scale.width, this.scale.height);
      if (!this._dlgElements) return;
    }
    if (this._dlgVisible) return;
    this._dlgVisible = true;

    // Cinematic letterbox
    this._letterbox?.show(500);

    // Kill any in-flight hide tweens so Y doesn't drift
    this.tweens.killTweensOf(this._dlgElements);

    // Reset to absolute start position (NEVER use += here)
    this._dlgElements.forEach((el, i) => {
      el.setAlpha(0);
      el.y = this._dlgOrigY[i] + 30;
      // Scale-in pop for text elements (bg Graphics don't support meaningful scale origin)
      if (i >= 2) el.setScale(0.93);
    });

    // Tween each element to its exact original Y + scale 1.0
    this._dlgElements.forEach((el, i) => {
      const tw = {
        targets: el,
        alpha: 1,
        y: this._dlgOrigY[i],
        duration: 400,
        ease: 'Back.easeOut'
      };
      if (i >= 2) { tw.scaleX = 1; tw.scaleY = 1; }
      this.tweens.add(tw);
    });
  }

  _onDialogueLine(data) {
    if (!this.dlgSpeaker || !this.dlgText) {
      console.warn('[UIScene] _onDialogueLine: dialogue elements missing — reinitialising');
      this._createDialogueBox(this.scale.width, this.scale.height);
      if (!this.dlgSpeaker) return;
      // Reinit: also animate the box in since _onDialogueStart was a no-op
      if (!this._dlgVisible) {
        this._dlgVisible = true;
        this._dlgElements.forEach((el, i) => {
          el.setAlpha(0);
          el.y = this._dlgOrigY[i] + 30;
          this.tweens.add({ targets: el, alpha: 1, y: this._dlgOrigY[i], duration: 400, ease: 'Back.easeOut' });
        });
      }
    }
    if (data.speaker) {
      this.dlgSpeaker.setText(data.speaker);
      this.dlgSpeaker.setColor(
        data.speaker === 'Prawal' ? '#90C8FF'
        : data.speaker === 'Aashna' ? '#FFB8C8'
        : '#C8C8C8'
      );
      this._drawAccentBar(data.speaker);
    } else {
      this.dlgSpeaker.setText('');
      this._dlgAccent.clear();
    }
    this.dlgText.setText(data.text);
  }

  _onDialogueEnd() {
    if (!this._dlgElements) return;
    this._dlgVisible = false;

    // Retract letterbox
    this._letterbox?.hide(400);

    this.tweens.killTweensOf(this._dlgElements);
    // Slide down to exact absolute position, never accumulate
    this._dlgElements.forEach((el, i) => {
      this.tweens.add({
        targets: el,
        alpha: 0,
        y: this._dlgOrigY[i] + 20,
        duration: 300,
        ease: 'Sine.easeIn'
      });
    });
  }

  _onDialogueContinue(show) {
    if (!this.dlgContinue) return;
    this.tweens.killTweensOf(this.dlgContinue);
    if (show) {
      // Reset to original Y before starting bounce (prevents drift)
      const origY = this._dlgOrigY[this._dlgElements.indexOf(this.dlgContinue)];
      this.dlgContinue.y = origY;
      this.dlgContinue.setAlpha(0.85);
      this.tweens.add({
        targets: this.dlgContinue,
        y: origY + 4,
        alpha: 0.4,
        duration: 550,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.dlgContinue.setAlpha(0);
    }
  }

  /* ── Chapter Intro ────────────────────────────── */
  _setupChapterIntro(w, h) {
    const cx = w / 2, cy = h / 2;
    // Adaptive font sizes — title caps at 26 px on small landscape phones to
    // prevent clipping. Desktop remains at original Georgia 42 px.
    const fontCfg = chapterIntroFontConfig(w, h);

    // Full black cinematic overlay
    this.chIntroOverlay = this.add.graphics().setDepth(700).setAlpha(0).setScrollFactor(0);
    this.chIntroOverlay.fillStyle(0x000000, 1.0);
    this.chIntroOverlay.fillRect(0, 0, w, h);

    // Ornamental horizontal rule — above title
    this.chLineTop = this.add.graphics().setDepth(702).setAlpha(0).setScrollFactor(0);

    // Chapter number pill — e.g. "CHAPTER 1"
    this.chNumber = this.add.text(cx, cy - 52, '', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize:   fontCfg.number,
      color:      '#BB7090',
      letterSpacing: 8,
      resolution: 2,
    }).setOrigin(0.5).setDepth(702).setAlpha(0).setScrollFactor(0);

    // Large chapter title
    this.chTitle = this.add.text(cx, cy - 8, '', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize:   fontCfg.title,
      color:      '#FFF0F4',
      resolution: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#FF5580', blur: 32, fill: true },
    }).setOrigin(0.5).setDepth(702).setAlpha(0).setScrollFactor(0);

    // Subtitle — italic, rose
    this.chSubtitle = this.add.text(cx, cy + 42, '', {
      fontFamily: 'Georgia, serif',
      fontSize:   fontCfg.subtitle,
      color:      '#E8A0B8',
      fontStyle:  'italic',
      letterSpacing: 3,
      resolution: 2,
    }).setOrigin(0.5).setDepth(702).setAlpha(0).setScrollFactor(0);

    // Ornamental horizontal rule — below subtitle
    this.chLineBot = this.add.graphics().setDepth(702).setAlpha(0).setScrollFactor(0);

    // Year / context tag  — e.g. description from story.json
    this.chDesc = this.add.text(cx, cy + 72, '', {
      fontFamily: 'Georgia, serif',
      fontSize:   fontCfg.desc,
      color:      '#886070',
      letterSpacing: 2,
      resolution: 2,
    }).setOrigin(0.5).setDepth(702).setAlpha(0).setScrollFactor(0);
  }

  _onChapterIntro(data) {
    console.log('[UIScene] _onChapterIntro fired:', data?.title, data?.subtitle);
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Letterbox for chapter title card
    this._letterbox?.show(600);

    // Build chapter number label ("CHAPTER 1" from "Chapter 1")
    const numLabel = (data.title || '').toUpperCase();
    this.chNumber.setText(numLabel);
    this.chTitle.setText(data.subtitle || '');
    this.chSubtitle.setText('');
    this.chDesc.setText(data.description || '');

    // Draw ornamental lines
    this._drawIntroRule(this.chLineTop, cx, cy - 28, 120);
    this._drawIntroRule(this.chLineBot, cx, cy + 62, 80);

    // Animate in — layered stagger
    this.tweens.add({ targets: this.chIntroOverlay, alpha: 1,    duration: 700,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: this.chNumber,       alpha: 0.80, duration: 600,  ease: 'Sine.easeOut', delay: 400  });
    this.tweens.add({ targets: this.chLineTop,      alpha: 1,    duration: 500,  ease: 'Sine.easeOut', delay: 620  });
    this.tweens.add({
      targets: this.chTitle, alpha: 1, y: this.chTitle.y - 6,
      duration: 900, ease: 'Sine.easeOut', delay: 700,
    });
    this.tweens.add({ targets: this.chLineBot,      alpha: 1,    duration: 500,  ease: 'Sine.easeOut', delay: 1000 });
    this.tweens.add({ targets: this.chDesc,         alpha: 0.70, duration: 600,  ease: 'Sine.easeOut', delay: 1100 });

    // Fade out after 3.2 s display time
    const els = [this.chIntroOverlay, this.chNumber, this.chTitle, this.chSubtitle, this.chLineTop, this.chLineBot, this.chDesc];
    this.time.delayedCall(3200, () => {
      this.tweens.add({
        targets: els, alpha: 0,
        duration: 900, ease: 'Sine.easeIn',
        onComplete: () => {
          this.chTitle.y += 6; // reset float offset
          // Retract letterbox after chapter intro
          this._letterbox?.hide(500);
        },
      });
    });
  }

  /** Draws a ◇──────◇ ornamental divider */
  _drawIntroRule(g, cx, y, halfLen) {
    g.clear();
    g.lineStyle(1, 0xBB7090, 0.55);
    g.lineBetween(cx - halfLen, y, cx - 10, y);
    g.lineBetween(cx + 10,   y, cx + halfLen, y);
    g.fillStyle(0xCC8098, 0.85);
    // left diamond
    g.fillTriangle(cx - 10, y, cx - 5, y - 4, cx - 5, y + 4);
    // right diamond
    g.fillTriangle(cx + 10, y, cx + 5, y - 4, cx + 5, y + 4);
    // center bead
    g.fillStyle(0xFF99BB, 0.95);
    g.fillCircle(cx, y, 3);
  }

  /* ── Controls Hint HUD ────────────────────────── */
  _setupControlsHint(w, h) {
    const cx = w / 2;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window);
    const hintLabel = isMobile ? 'Drag left side to move    Tap ♥ to interact' : '[WASD] Move    [E / SPACE] Interact';
    // Position below chapter intro text — 18% from top in landscape, 22% in portrait
    const hintY = h * (h > w ? 0.22 : 0.12);
    const pillW = isMobile ? 320 : 280;

    this._ctrlHintBg = this.add.graphics().setDepth(500).setAlpha(0);
    this._ctrlHintBg.fillStyle(0x000000, 0.55);
    this._ctrlHintBg.fillRoundedRect(cx - pillW / 2, hintY - 16, pillW, 32, 10);
    this._ctrlHintBg.lineStyle(1, 0xFFFFFF, 0.10);
    this._ctrlHintBg.strokeRoundedRect(cx - pillW / 2, hintY - 16, pillW, 32, 10);

    this._ctrlHintText = this.add.text(cx, hintY, hintLabel, {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: isMobile ? '11px' : '10px',
      color: '#DDDDDD',
      resolution: 2
    }).setOrigin(0.5).setDepth(501).setAlpha(0);
  }

  _onShowControlsHint() {
    if (this._ctrlHintShown) return;
    this._ctrlHintShown = true;
    const targets = [this._ctrlHintBg, this._ctrlHintText];
    this.tweens.add({ targets, alpha: 1, duration: 500, ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(3500, () => {
          this.tweens.add({ targets, alpha: 0, duration: 700, ease: 'Sine.easeIn' });
        });
      }
    });
  }

  /* ── Chapter Progress Pill ───────────────────── */
  _setupProgress(w, h) {
    this._progressBg = this.add.graphics().setDepth(600).setAlpha(0);
    this._progressText = this.add.text(w - 20, 18, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#C8A0B0',
      resolution: 2
    }).setOrigin(1, 0.5).setDepth(601).setAlpha(0);
  }

  _onChapterProgress(data) {
    // data: { current, total }
    const label = `${data.current} / ${data.total}`;
    this._progressText.setText(label);
    const tw = this._progressText.width + 20;
    const tx = this.scale.width - 14;
    this._progressBg.clear();
    this._progressBg.fillStyle(0x0A0010, 0.65);
    this._progressBg.fillRoundedRect(tx - tw, 8, tw, 20, 10);
    this._progressBg.lineStyle(1, 0xC8A0B0, 0.25);
    this._progressBg.strokeRoundedRect(tx - tw, 8, tw, 20, 10);
    this._progressText.x = tx - 8;

    this.tweens.killTweensOf([this._progressBg, this._progressText]);
    this.tweens.add({ targets: [this._progressBg, this._progressText], alpha: 1, duration: 600, ease: 'Sine.easeOut' });
  }

  /* ── Explore Hint (world chapters) ───────────── */
  _setupExploreHint(w, h) {
    const safeB = getSafeAreaBottom();
    const hintY  = h - 18 - safeB;
    const pillY  = hintY - 14;
    this._hintBg = this.add.graphics().setDepth(600).setAlpha(0);
    this._hintText = this.add.text(w / 2, hintY, '← Explore →', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#E8D0A0',
      resolution: 2
    }).setOrigin(0.5, 1).setDepth(601).setAlpha(0);

    // Draw pill background once
    const tw = 120;
    this._hintBg.fillStyle(0x0A0010, 0.55);
    this._hintBg.fillRoundedRect(w / 2 - tw / 2, pillY, tw, 20, 10);
  }

  _onShowExploreHint() {
    this.tweens.killTweensOf([this._hintBg, this._hintText]);
    this.tweens.add({ targets: [this._hintBg, this._hintText], alpha: 1, duration: 800, ease: 'Sine.easeOut' });
    this.time.delayedCall(4000, () => {
      this.tweens.add({ targets: [this._hintBg, this._hintText], alpha: 0, duration: 1000, ease: 'Sine.easeIn' });
    });
  }

  /* ── Memory Notification ──────────────────────── */
  _setupMemoryNotification(w, h) {
    this.memNotifBg = this.add.graphics().setDepth(650).setAlpha(0);
    this.memNotifText = this.add.text(w / 2, 60, '', {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#FFD8E0',
      resolution: 2, shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 4, fill: true }
    }).setOrigin(0.5).setDepth(651).setAlpha(0);

    this.memNotifIcon = this.add.text(w / 2 - 100, 58, '❤', {
      fontFamily: 'serif', fontSize: '16px', color: '#FF6090', resolution: 2
    }).setOrigin(0.5).setDepth(651).setAlpha(0);
  }

  _onMemoryNotification(memory) {
    // Premium memory collection ceremony
    MemoryCeremony.play(this, {
      x: this.scale.width / 2,
      y: this.scale.height / 2,
      label: memory.name || 'Memory',
    });
  }

  /* ── Collect Counter (Ch9 letters / Ch11 gifts / Ch12 letters) ── */
  _setupCollectCounter(w, h) {
    const safeT = getSafeAreaTop();
    // Pill background drawn per-update via _drawCounterPill
    this._counterBg = this.add.graphics().setDepth(550).setAlpha(0);
    // Text — world-space coords here ARE screen coords; UIScene camera has zoom=1
    this._counterText = this.add.text(w / 2, safeT + 22, '', {
      fontFamily:      'Georgia, "Times New Roman", serif',
      fontSize:        '12px',
      color:           '#FFD080',
      stroke:          '#000000',
      strokeThickness: 3,
      resolution:      2,
    }).setOrigin(0.5, 0.5).setDepth(551).setAlpha(0);
    this._counterTypeLabel = '';
    this._counterTotal     = 0;
  }

  _drawCounterPill() {
    if (!this._counterBg || !this._counterText) return;
    const x  = this._counterText.x;
    const y  = this._counterText.y;
    const tw = (this._counterText.width || 80) + 24;
    const th = 26;
    this._counterBg.clear();
    this._counterBg.fillStyle(0x000000, 0.60);
    this._counterBg.fillRoundedRect(x - tw / 2, y - th / 2, tw, th, 10);
    this._counterBg.lineStyle(1, 0xFFC060, 0.35);
    this._counterBg.strokeRoundedRect(x - tw / 2, y - th / 2, tw, th, 10);
  }

  _onCollectCounterInit({ label, total }) {
    if (!this._counterText) return;
    this._counterTypeLabel = label;
    this._counterTotal     = total;
    this._counterText.setText(`0 / ${total} ${label}`);
    // Ensure the Graphics container is anchored at origin — a prior Y-tween could have
    // drifted it, causing the drawn pill rect to appear offset from the text.
    this._counterBg.setPosition(0, 0);
    this._drawCounterPill();
    // Reset to hidden — will fade in when first item is collected
    this.tweens.killTweensOf([this._counterBg, this._counterText]);
    this._counterBg.setAlpha(0);
    this._counterText.setAlpha(0);
  }

  _onCollectCounterUpdate({ found }) {
    if (!this._counterText) return;
    this._counterText.setText(`${found} / ${this._counterTotal} ${this._counterTypeLabel}`);
    this._drawCounterPill();
    if (found === 1) {
      // Fade-in only — no Y-position animation.
      // Tweening _counterBg.y breaks its rendering: Graphics objects are drawn in
      // LOCAL coordinate space, so shifting the container's y would offset the pill
      // rect away from the text without redrawing it, causing the "out of container"
      // visual glitch.
      this.tweens.add({
        targets:  [this._counterBg, this._counterText],
        alpha:    0.90,
        duration: 550,
        ease:     'Sine.easeOut',
      });
    }
  }

  _onCollectCounterHide() {
    if (!this._counterBg) return;
    // Instant hide — no fade tween. The hide fires during chapter shutdown, which
    // happens while the transition overlay already covers the screen. A 400ms fade
    // tween would still be playing when the NEXT chapter's transition-in reveals the
    // scene, making the counter briefly visible in the wrong chapter.
    this.tweens.killTweensOf([this._counterBg, this._counterText]);
    this._counterBg.setAlpha(0);
    if (this._counterText) this._counterText.setAlpha(0);
  }

  /* ── Chat Header ("Aashna" bar) — Ch3 ──────────── */
  _setupChatHeader(w, h) {
    const safeT = getSafeAreaTop();
    this._chatHY = safeT + 6;
    const hH = 20;
    const hW = 140;

    // Graphics bar — drawn at screen coords (UIScene zoom=1 = direct pixels)
    this._chatHeaderGfx = this.add.graphics().setDepth(550).setAlpha(0);
    this._drawChatHeaderBar(w, this._chatHY, hW, hH);

    // "Aashna" name text
    const hX = w / 2 - hW / 2;
    this._chatHeaderName = this.add.text(hX + 32, this._chatHY + hH / 2, 'Aashna', {
      fontFamily: 'Georgia, serif', fontSize: '9px', color: '#DDEEFF', resolution: 2,
    }).setOrigin(0, 0.5).setDepth(551).setAlpha(0);

    // Typing indicator dots
    this._chatHeaderDots = this.add.text(hX + 80, this._chatHY + hH / 2, '…', {
      fontFamily: 'Georgia, serif', fontSize: '9px', color: '#6688AA', resolution: 2,
    }).setOrigin(0, 0.5).setDepth(551).setAlpha(0);

    this._chatHeaderElements = [this._chatHeaderGfx, this._chatHeaderName, this._chatHeaderDots];
    this._chatHeaderVisible  = false;
  }

  _drawChatHeaderBar(w, hY, hW, hH) {
    if (!this._chatHeaderGfx) return;
    const hX = w / 2 - hW / 2;
    this._chatHeaderGfx.clear();
    // Solid dark-navy panel
    this._chatHeaderGfx.fillStyle(0x08101E, 0.92);
    this._chatHeaderGfx.fillRoundedRect(hX, hY, hW, hH, 5);
    // Bright blue border — matches chat bubble aesthetic
    this._chatHeaderGfx.lineStyle(1.2, 0x3A7AA8, 0.80);
    this._chatHeaderGfx.strokeRoundedRect(hX, hY, hW, hH, 5);
    // Inner top-gloss sheen
    this._chatHeaderGfx.fillStyle(0x88BBDD, 0.08);
    this._chatHeaderGfx.fillRoundedRect(hX + 2, hY + 1, hW - 4, 7, { tl: 4, tr: 4, bl: 0, br: 0 });
    // Status dot — warm amber
    this._chatHeaderGfx.fillStyle(0xFFAA44, 1);
    this._chatHeaderGfx.fillCircle(hX + 20, hY + hH / 2, 2.5);
  }

  _rebuildChatHeader(w, h) {
    const safeT = getSafeAreaTop();
    this._chatHY = safeT + 6;
    const hH = 20;
    const hW = 140;
    const hX = w / 2 - hW / 2;

    this._drawChatHeaderBar(w, this._chatHY, hW, hH);

    // Reposition text elements
    if (this._chatHeaderName) {
      this._chatHeaderName.setPosition(hX + 32, this._chatHY + hH / 2);
    }
    if (this._chatHeaderDots) {
      this._chatHeaderDots.setPosition(hX + 80, this._chatHY + hH / 2);
    }
  }

  _onChatHeaderShow() {
    if (this._chatHeaderVisible) return;
    this._chatHeaderVisible = true;

    this.tweens.killTweensOf(this._chatHeaderElements);
    // Reset to hidden state
    this._chatHeaderElements.forEach(el => el.setAlpha(0));

    // Fade in after 1.5 s — mirrors the original Ch3 behaviour
    this.time.delayedCall(1500, () => {
      if (!this.sys?.isActive() || !this._chatHeaderVisible) return;
      this.tweens.add({
        targets:  this._chatHeaderElements,
        alpha:    1,
        duration: 800,
        ease:     'Sine.easeOut',
      });
      // Quiet keyboard-tick confirms "chat app is alive"
      this.time.delayedCall(820, () => {
        audioManager._playTextureEvent?.('keyboard-tick');
      });
      // Blink typing dots perpetually
      this.tweens.add({
        targets:  this._chatHeaderDots,
        alpha:    { from: 0.7, to: 0.15 },
        duration: 700,
        yoyo:     true,
        repeat:   -1,
        ease:     'Linear',
      });
    });
  }

  _onChatHeaderHide() {
    this._chatHeaderVisible = false;
    // Instant hide — same reasoning as _onCollectCounterHide: the hide fires during
    // chapter shutdown while the transition overlay covers the screen. A 350ms fade
    // tween would bleed into the next chapter's transition-in reveal.
    this.tweens.killTweensOf(this._chatHeaderElements);
    this._chatHeaderElements?.forEach(el => el.setAlpha(0));
  }

  /* ── Memory counter (top-right) ───────────────── */
  _onMemoryCollected(memory) {
    // Could add persistent counter — keeping it minimal for now
  }

  /* ── Finale ───────────────────────────────────── */
  _setupFinale(w, h) {
    this._finaleContainer = this.add.container(0, 0).setDepth(800).setAlpha(0);
  }

  _onShowFinale(data) {
    audioManager.playTransitionSwell();
    const w = this.scale.width, h = this.scale.height;
    const cx = w / 2, cy = h / 2;

    // Dim overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x0a0008, 0.92);
    overlay.fillRect(0, 0, w, h);
    this._finaleContainer.add(overlay);

    // Particles
    const emitter = this.add.particles(cx, cy, 'particle-heart', {
      x: { min: -w / 2, max: w / 2 },
      y: { min: -h / 2, max: h / 2 },
      speed: { min: 5, max: 20 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 4000,
      frequency: 400,
      quantity: 1,
      blendMode: 'ADD'
    });
    emitter.setDepth(801);

    // Title
    const title = this.add.text(cx, cy - 100, '❤  Prawal & Aashna  ❤', {
      fontFamily: 'Georgia, serif', fontSize: '26px', color: '#FFFFFF',
      resolution: 2, shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 8, fill: true }
    }).setOrigin(0.5).setAlpha(0);
    this._finaleContainer.add(title);

    const subtitle = this.add.text(cx, cy - 68, '4 Years of Love', {
      fontFamily: 'Georgia, serif', fontSize: '14px', color: '#FFB8C8',
      fontStyle: 'italic', resolution: 2
    }).setOrigin(0.5).setAlpha(0);
    this._finaleContainer.add(subtitle);
    this.tweens.add({ targets: subtitle, alpha: 0.9, duration: 600, delay: 500, ease: 'Sine.easeOut' });

    // Memories list
    let mY = cy - 38;
    if (data.memories && data.memories.length > 0) {
      data.memories.forEach((mem, i) => {
        const mt = this.add.text(cx, mY + i * 22, `✦ ${mem.name}`, {
          fontFamily: 'Georgia, serif', fontSize: '12px', color: '#E8B0C0',
          resolution: 2
        }).setOrigin(0.5).setAlpha(0);
        this._finaleContainer.add(mt);

        this.tweens.add({
          targets: mt, alpha: 0.85, duration: 500,
          delay: 1200 + i * 300, ease: 'Sine.easeOut'
        });
      });
    }

    // Final message
    const msgY = mY + (data.memories ? data.memories.length * 22 : 0) + 20;
    const msg = this.add.text(cx, msgY, data.message, {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#FFFFFF',
      fontStyle: 'italic', resolution: 2,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 4, fill: true }
    }).setOrigin(0.5).setAlpha(0);
    this._finaleContainer.add(msg);

    // Button
    const btnY = msgY + 45;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xA83060, 0.8);
    btnBg.fillRoundedRect(cx - 90, btnY - 16, 180, 32, 16);
    btnBg.lineStyle(1, 0xFFB0C8, 0.4);
    btnBg.strokeRoundedRect(cx - 90, btnY - 16, 180, 32, 16);
    btnBg.setAlpha(0);
    this._finaleContainer.add(btnBg);

    const btnText = this.add.text(cx, btnY, data.button, {
      fontFamily: 'Georgia, serif', fontSize: '14px', color: '#FFFFFF', resolution: 2
    }).setOrigin(0.5).setAlpha(0);
    this._finaleContainer.add(btnText);

    const btnHit = this.add.rectangle(cx, btnY, 180, 32, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(802);

    btnHit.on('pointerdown', () => {
      audioManager.playClick();
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1100, () => {
        emitter.destroy();
        this._finaleContainer.removeAll(true);
        this._finaleContainer.setAlpha(0);
        ['Game', 'Cinematic', 'UIChapter'].forEach(k => this.scene.stop(k));
        this.scene.stop('UI');
        this.scene.start('MainMenu');
      });
    });

    // Animate in
    this._finaleContainer.setAlpha(1);
    const animDelay = 800 + (data.memories ? data.memories.length * 300 : 0);
    this.tweens.add({ targets: title, alpha: 1, duration: 800, delay: 400, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: msg, alpha: 1, duration: 600, delay: animDelay + 400, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: [btnBg, btnText], alpha: 1, duration: 600, delay: animDelay + 800, ease: 'Sine.easeOut' });
  }
}
