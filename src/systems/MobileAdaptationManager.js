/**
 * MobileAdaptationManager — centralised polish layer for small landscape screens.
 *
 * DETECTION
 * ─────────
 * isSmallLandscape() returns true when:
 *   • orientation is landscape (width > height), AND
 *   • the short side (height in landscape) is ≤ SMALL_SIDE_THRESHOLD CSS px
 *
 * Threshold of 430 CSS px covers every phone model up to iPhone 14 Pro Max in
 * landscape mode, while excluding:
 *   • iPad mini landscape (short side 768)
 *   • iPad Pro / desktop / laptop (short side 720–800+)
 *
 * All exported functions are pure / side-effect-free. Non-small-landscape callers
 * always receive unmodified values (multiplier 1, original sizes) — desktop
 * behaviour is never altered.
 *
 * USAGE
 * ─────
 * import { isSmallLandscape, dialogueBoxConfig, ... } from './MobileAdaptationManager.js';
 *
 * Integrations:
 *   • UIScene._createDialogueBox()   — dialogueBoxConfig() drives box height + fonts
 *   • UIScene._setupChapterIntro()   — chapterIntroFontConfig() drives title size
 *   • BaseEnvironment._buildVignette() — vignetteAlphaMul() reduces edge darkness
 *   • ColorGrading.apply/transition()  — colorGradingMul() prevents over-darkening
 *   • ChapterScene._calcZoom()         — cameraZoomBoost() adds gentle mobile zoom
 */

/** Short-side CSS px limit for "small phone in landscape". */
const SMALL_SIDE_THRESHOLD = 430;

// ── Detection ─────────────────────────────────────────────────────────────────

/**
 * Returns true when the current screen is a small phone in landscape orientation.
 * Evaluated at call time — always reflects the current rotation state.
 *
 * Uses logical CSS pixels (as reported by window.innerWidth/Height), NOT device
 * pixels, so high-DPI screens (DPR 3×) do NOT spuriously trigger this flag.
 *
 * @returns {boolean}
 */
export function isSmallLandscape() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return w > h && h <= SMALL_SIDE_THRESHOLD;
}

// ── Scale helpers ─────────────────────────────────────────────────────────────

/**
 * Proportional UI scale factor derived from the screen's short side.
 * Returns 1.0 on desktop / tablet (no scaling).
 * Returns ≈0.87 on a 375 px-high phone (iPhone SE / Pro mini etc.).
 *
 * Floor of 0.70 prevents text from ever becoming unreadably tiny even on
 * unusually low-resolution devices.
 *
 * @returns {number}  0.70–1.0
 */
export function uiScaleFactor() {
  if (!isSmallLandscape()) return 1.0;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  return Math.max(0.70, shortSide / SMALL_SIDE_THRESHOLD);
}

// ── Dialogue box ──────────────────────────────────────────────────────────────

/**
 * Compute adaptive dialogue box layout + font sizes for the current screen.
 *
 * Desktop / tablet: original values (130 px box, 13/14/9 px fonts) unchanged.
 * Small landscape: box height capped at 27% of screen height, fonts scaled by
 * uiScaleFactor(). All px values are Math.round()'d to avoid sub-pixel blur.
 *
 * @param {number} screenW — canvas logical width  (this.scale.width)
 * @param {number} screenH — canvas logical height (this.scale.height)
 * @returns {{
 *   boxH: number,
 *   marginX: number,
 *   marginBot: number,
 *   speakerFontSize: string,
 *   textFontSize: string,
 *   continueFontSize: string,
 *   lineSpacing: number,
 * }}
 */
export function dialogueBoxConfig(screenW, screenH) {
  if (!isSmallLandscape()) {
    return {
      boxH:             130,
      marginX:          20,
      marginBot:        15,
      speakerFontSize:  '13px',
      textFontSize:     '14px',
      continueFontSize: '9px',
      lineSpacing:      5,
    };
  }

  const sf  = uiScaleFactor();
  // Cap box at 27% of screen height — keeps ~73% visible for the game world.
  const boxH = Math.round(Math.min(108, screenH * 0.27));

  return {
    boxH,
    marginX:          16,
    marginBot:        10,
    // Integer px to prevent sub-pixel text blur
    speakerFontSize:  `${Math.round(13 * sf)}px`,
    textFontSize:     `${Math.round(14 * sf)}px`,
    continueFontSize: `${Math.round(9  * sf)}px`,
    lineSpacing:      Math.max(2, Math.round(4 * sf)),
  };
}

// ── Chapter intro card ────────────────────────────────────────────────────────

/**
 * Font sizes for the full-screen chapter intro title card.
 *
 * Desktop: Georgia 42 px title (cinematic large format).
 * Small landscape: title capped at 26 px so it never clips on a 375 px screen.
 *
 * @param {number} screenW
 * @param {number} screenH
 * @returns {{ number: string, title: string, subtitle: string, desc: string }}
 */
export function chapterIntroFontConfig(screenW, screenH) {
  if (!isSmallLandscape()) {
    return { number: '11px', title: '42px', subtitle: '16px', desc: '11px' };
  }
  const sf = uiScaleFactor();
  return {
    number:   `${Math.round(9  * sf)}px`,
    title:    `${Math.round(Math.min(26, 42 * sf))}px`,  // cap: never > 26 on mobile
    subtitle: `${Math.round(13 * sf)}px`,
    desc:     `${Math.round(9  * sf)}px`,
  };
}

// ── Vignette ──────────────────────────────────────────────────────────────────

/**
 * Alpha multiplier for all four vignette edge bands.
 *
 * Desktop / tablet: 1.0 — no change.
 * Small landscape:  0.50 — keeps scene edges visible on a small phone screen.
 *   iPhone OLED screens have native contrast ∼1,000,000:1 so the vignette
 *   reads much harsher than on a desktop LCD; pulling alpha to 0.50 matches
 *   the perceived darkness without losing the cinematic framing.
 *   The SIZE cap (13% of shorter dimension) already limits physical width;
 *   this multiplier handles darkness independently.
 *
 * @returns {number}
 */
export function vignetteAlphaMul() {
  return isSmallLandscape() ? 0.50 : 1.0;
}

// ── Color grading ─────────────────────────────────────────────────────────────

/**
 * Alpha multipliers for ColorGrading contrast + tint overlays.
 *
 * Desktop / tablet: { contrast: 1.0, tint: 1.0 } — original profile unchanged.
 * Small landscape:  contrast × 0.45, tint × 0.75
 *   — iPhone OLED panels have dramatically higher native contrast than desktop
 *   LCDs, so the same contrast overlay appears far darker on-device.
 *   0.45 prevents night-scene chapters ("fights_and_fix" etc.) from being
 *   unreadably dark while preserving the emotional colour palette.
 *
 * @returns {{ contrast: number, tint: number }}
 */
export function colorGradingMul() {
  if (!isSmallLandscape()) return { contrast: 1.0, tint: 1.0 };
  return { contrast: 0.45, tint: 0.75 };
}

// ── Film grain ───────────────────────────────────────────────────────────────────────────────

/**
 * Alpha multiplier for the film grain overlay.
 *
 * Desktop / tablet: 1.0 — full grain for cinematic texture.
 * Small landscape:  0.45 — grain at full strength is perceptible as blurry
 *   "fuzz" on text and sharp sprite edges on small OLED screens. Halving it
 *   preserves the cinematic feel while keeping text and textures crisp.
 *
 * @returns {number}
 */
export function filmGrainAlphaMul() {
  return isSmallLandscape() ? 0.45 : 1.0;
}

// ── Camera zoom ───────────────────────────────────────────────────────────────

/**
 * Extra camera zoom multiplier applied on top of the existing aspect-ratio zoom.
 *
 * Desktop / tablet: 1.0 — no change.
 * Small landscape:  1.10 — adds a gentle 10% zoom-in so the player and scene
 *   props fill more of the tiny screen, making the game feel cinematic rather
 *   than distant. The boost does not affect world physics bounds; the camera's
 *   setBounds() constraint already clamps scroll to valid world-space limits.
 *
 * @returns {number}
 */
export function cameraZoomBoost() {
  return isSmallLandscape() ? 1.10 : 1.0;
}
