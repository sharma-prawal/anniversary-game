/**
 * OrientationManager
 *
 * Production-quality orientation guard for a Phaser 3 mobile game.
 *
 * Strategy:
 *   • Single persistent DOM overlay — created once, shown/hidden via CSS class.
 *   • Orientation measured from BOTH window dimensions AND screen.orientation
 *     API so it works across iOS Safari, Chrome, Firefox, and PWA.
 *   • Debounced handler absorbs browser-UI resize flicker (address-bar hide/show)
 *     and rapid orientation flips without thrashing the Phaser scene.
 *   • Phaser scenes are paused/resumed through the SceneManager so physics,
 *     tweens, and input all stop — not just rendering.
 *   • Works across ALL scenes; no per-scene integration needed.
 *
 * Usage (call once after Phaser.Game is created):
 *
 *   import { OrientationManager } from './systems/OrientationManager.js';
 *   const game = new Phaser.Game(config);
 *   OrientationManager.init(game);
 */
export class OrientationManager {
  static _game       = null;
  static _overlay    = null;
  static _debounceId = null;
  static _refreshId  = null;   // separate timer for scale.refresh() — never shared with _debounceId
  static _paused     = false;

  /**
   * Initialise the manager. Call exactly once after `new Phaser.Game(config)`.
   * @param {Phaser.Game} game
   */
  static init(game) {
    this._game = game;
    this._overlay = document.getElementById('orientation-overlay');

    if (!this._overlay) {
      // Fallback: create overlay programmatically if index.html doesn't have it
      this._overlay = this._createOverlay();
      document.body.appendChild(this._overlay);
    }

    // Bind handlers
    // 250ms debounce: iOS Safari fires orientationchange before the new
    // viewport dimensions are stable — 120ms was too short and caused
    // _check() to read portrait dims on what was already a landscape screen.
    this._onResize = this._debounce(this._check.bind(this), 250);

    window.addEventListener('resize',            this._onResize, { passive: true });
    window.addEventListener('orientationchange', this._onResize, { passive: true });

    // Initial check — run after a short delay so the viewport has settled
    setTimeout(() => this._check(), 80);
  }

  /** Tear down listeners (call on game destroy if needed). */
  static destroy() {
    window.removeEventListener('resize',            this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    clearTimeout(this._debounceId);
    clearTimeout(this._refreshId);
  }

  // ── Core check ────────────────────────────────────────────────────────────

  static _check() {
    const portrait = this._isPortrait();

    if (portrait && !this._paused) {
      this._enterPortrait();
    } else if (!portrait && this._paused) {
      this._exitPortrait();
    }
  }

  /**
   * Portrait detection — cross-browser.
   * Prefers window dimensions (most reliable on iOS Safari with URL bar) and
   * falls back to screen.orientation for edge cases where innerW === innerH.
   */
  static _isPortrait() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (w !== h) return h > w;

    // Perfectly square — fall back to screen.orientation API
    if (window.screen?.orientation) {
      const t = window.screen.orientation.type;
      return t === 'portrait-primary' || t === 'portrait-secondary';
    }

    // Last resort: window.orientation (deprecated but still supported on iOS)
    if (typeof window.orientation === 'number') {
      return window.orientation === 0 || window.orientation === 180;
    }

    return false;
  }

  // ── Portrait enter / exit ─────────────────────────────────────────────────

  static _enterPortrait() {
    this._paused = true;
    this._showOverlay();
    // Disable Phaser input so pointer events don't reach interactive objects.
    // We do NOT pause scenes — pausing causes Phaser to fire resize, which
    // triggers _buildUI() with skipIntro=true (UI objects stay at alpha:0),
    // breaking the game after resume. The CSS overlay (pointer-events:all)
    // already blocks all user interaction; input.enabled is a belt-and-suspenders
    // guard for Phaser's own touch/pointer pipeline.
    if (this._game?.input) {
      this._game.input.enabled = false;
    }
  }

  static _exitPortrait() {
    this._paused = false;
    this._hideOverlay();
    // Re-enable immediately — no delay needed since we never paused scenes.
    if (this._game?.input) {
      this._game.input.enabled = true;
    }
    // iOS Safari updates innerWidth/innerHeight ~300ms after orientationchange.
    // Use a dedicated _refreshId (never shared with _debounceId) so rapid
    // portrait→landscape→portrait→landscape flips cancel the previous refresh
    // rather than stacking multiple scale.refresh() calls that each trigger a
    // new Phaser resize event → new debounce → new resize → infinite loop.
    clearTimeout(this._refreshId);
    this._refreshId = setTimeout(() => {
      // Only refresh if we're still in landscape when the timer fires.
      // A fast 360° rotation can leave _paused=true by the time this fires.
      if (!this._paused && this._game?.scale) {
        this._game.scale.refresh();
      }
    }, 380);
  }

  // ── Overlay visibility ────────────────────────────────────────────────────

  static _showOverlay() {
    if (!this._overlay) return;
    this._overlay.classList.add('visible');
  }

  static _hideOverlay() {
    if (!this._overlay) return;
    this._overlay.classList.remove('visible');
  }

  // ── Programmatic overlay fallback ─────────────────────────────────────────
  // Only used if index.html doesn't contain #orientation-overlay.

  static _createOverlay() {
    const el = document.createElement('div');
    el.id = 'orientation-overlay';
    el.innerHTML = `
      <div class="orient-inner">
        <div class="orient-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="12" y="4" width="24" height="40" rx="4" stroke="currentColor" stroke-width="2.5" fill="none"/>
            <circle cx="24" cy="38" r="2" fill="currentColor" opacity="0.6"/>
            <path d="M30 18 L38 10 M38 10 L38 18 M38 10 L30 10"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="orient-arrow"/>
          </svg>
        </div>
        <p class="orient-text">Rotate your device</p>
        <p class="orient-sub">This game is designed for landscape</p>
      </div>
    `;
    return el;
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  static _debounce(fn, ms) {
    // Each call to _debounce() returns a closure with its OWN timer id.
    // Previously all debounced functions shared _debounceId, so the
    // orientation-check debounce and any future debounced calls would
    // silently cancel each other.
    let timerId = null;
    return (...args) => {
      clearTimeout(timerId);
      timerId = setTimeout(() => fn(...args), ms);
    };
  }
}
