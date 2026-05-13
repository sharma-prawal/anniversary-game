import { audioManager } from '../utils/helpers.js';

export class DialogueSystem {
  constructor(scene) {
    this.scene = scene;
    this.lines = [];
    this.index = 0;
    this.active = false;
    this.typing = false;
    this.onComplete = null;
    this._charTimer = null;
    this._uiWaitHandle = null;
    this._displayedText = '';
    this._fullText = '';
    this._charIndex = 0;
    this._baseDelay = 28;
    this._continueIndicator = null;
  }

  /** Get UIScene directly — reliable alternative to game.events bus. */
  _ui() {
    const ui = this.scene.scene.get('UI');
    // Only return if UIScene has been fully created (dlg elements exist)
    return (ui && ui._dlgElements) ? ui : null;
  }

  /** Emit directly to UIScene — single path, no bus double-fire. */
  _emit(event, data) {
    const ui = this._ui();
    if (!ui) {
      console.warn('[DialogueSystem] _emit — UIScene not ready, dropping', event);
      return;
    }
    switch (event) {
      case 'dialogue-start':    ui._onDialogueStart?.();         break;
      case 'dialogue-line':     ui._onDialogueLine?.(data);      break;
      case 'dialogue-end':      ui._onDialogueEnd?.();           break;
      case 'dialogue-continue': ui._onDialogueContinue?.(data);  break;
    }
  }

  start(dialogueLines, onComplete) {
    if (!dialogueLines || dialogueLines.length === 0) return;
    // Normalize: lines can be plain strings OR {speaker, text} objects
    this.lines = dialogueLines.map(l => typeof l === 'string' ? { speaker: '', text: l } : l);
    this.index = 0;
    this.active = true;
    this.onComplete = onComplete || null;

    // Wait until UIScene is fully created before starting visual dialogue.
    // _ui() returns null until UIScene.create() has set up _dlgElements.
    this._waitForUI(() => {
      this._emit('dialogue-start');
      this._showLine();
    });
  }

  /** Poll until UIScene is ready, then invoke callback. Max 3s wait. */
  _waitForUI(cb, attempt = 0) {
    if (this._ui()) { cb(); return; }
    if (attempt >= 30) {
      console.error('[DialogueSystem] UIScene never became ready after 3s — starting dialogue anyway');
      cb();
      return;
    }
    if (attempt === 0) {
      console.warn('[DialogueSystem] Waiting for UIScene to be ready…');
    }
    this._uiWaitHandle = setTimeout(() => this._waitForUI(cb, attempt + 1), 100);
  }

  _showLine() {
    const line = this.lines[this.index];
    if (!line) { this.end(); return; }
    this.typing = true;
    this._fullText = line.text;
    this._displayedText = '';
    this._charIndex = 0;
    this._emit('dialogue-continue', false);

    this._emit('dialogue-line', {
      speaker: line.speaker || '',
      text: '',
      isTyping: true
    });

    this._typeNext();
  }

  _typeNext() {
    if (this._charTimer) { clearTimeout(this._charTimer); this._charTimer = null; }
    if (!this.active) return;

    if (this._charIndex >= this._fullText.length) {
      this.typing = false;
      this._emit('dialogue-line', {
        speaker: this.lines[this.index].speaker || '',
        text: this._fullText,
        isTyping: false
      });
      this._emit('dialogue-continue', true);
      return;
    }

    const ch = this._fullText[this._charIndex];
    this._displayedText += ch;
    this._charIndex++;

    this._emit('dialogue-line', {
      speaker: this.lines[this.index].speaker || '',
      text: this._displayedText,
      isTyping: true
    });

    // Subtle tick for non-space characters — speaker-aware tone
    if (ch !== ' ' && this._charIndex % 2 === 0) {
      audioManager.playTypewriterTick(this.lines[this.index].speaker);
    }

    // Calculate delay - emotional pauses for punctuation and ellipsis
    let delay = this._baseDelay;
    if (ch === '…' || (ch === '.' && this._fullText[this._charIndex] === '.')) {
      delay = 260;
    } else if (ch === '.') {
      delay = 180;
    } else if (ch === ',') {
      delay = 100;
    } else if (ch === '!' || ch === '?') {
      delay = 140;
    } else if (ch === '—' || ch === '–') {
      delay = 160;
    }

    this._charTimer = setTimeout(() => this._typeNext(), delay);
  }

  advance() {
    if (!this.active) return;
    // Speaker-aware advance sound
    const speaker = this.lines[this.index]?.speaker || '';
    audioManager.playDialogueAdvance(speaker);

    if (this.typing) {
      // Skip to end of current line
      if (this._charTimer) { clearTimeout(this._charTimer); this._charTimer = null; }
      this.typing = false;
      this._displayedText = this._fullText;
      this._emit('dialogue-line', {
        speaker: this.lines[this.index].speaker || '',
        text: this._fullText,
        isTyping: false
      });
      this._emit('dialogue-continue', true);
      return;
    }

    this.index++;
    if (this.index >= this.lines.length) {
      this.end();
    } else {
      this._showLine();
    }
  }

  end() {
    if (this._charTimer) { clearTimeout(this._charTimer); this._charTimer = null; }
    this.active = false;
    this.typing = false;
    this._emit('dialogue-continue', false);
    this._emit('dialogue-end');
    if (this.onComplete) this.onComplete();
  }

  destroy() {
    if (this._uiWaitHandle) { clearTimeout(this._uiWaitHandle); this._uiWaitHandle = null; }
    if (this._charTimer) { clearTimeout(this._charTimer); this._charTimer = null; }
    this.active = false;
  }
}
