export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export function lerpColor(hex1, hex2, t) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return (r << 16) | (g << 8) | b;
}

export function hexToNumber(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Y-based depth sort: sets each item's depth to baseDepth + item.y.
 * @param {Phaser.GameObjects.GameObject[]} items - sprites to sort
 * @param {number} baseDepth - base depth value (e.g. gameplay layer base)
 */
export function depthSort(items, baseDepth = 0) {
  for (const item of items) {
    if (item.active) item.setDepth(baseDepth + item.y);
  }
}

/**
 * Draw a grid overlay on a Graphics object.
 * @param {Phaser.GameObjects.Graphics} graphics
 */
export function gridHelper(graphics, x, y, w, h, cellW, cellH, color = 0xAAAAAA, alpha = 0.2) {
  graphics.lineStyle(1, color, alpha);
  for (let gx = x; gx <= x + w; gx += cellW) graphics.lineBetween(gx, y, gx, y + h);
  for (let gy = y; gy <= y + h; gy += cellH) graphics.lineBetween(x, gy, x + w, gy);
}

// ── Audio ────────────────────────────────────────────────────────
// Re-export from the centralized AudioManager system.
// All audio logic lives in src/systems/AudioManager.js.
export { AudioManager, audioManager } from '../systems/AudioManager.js';

// ── Safe-area inset helpers ──────────────────────────────────────
// Returns the bottom safe-area inset in px (home indicator height on iPhone,
// gesture bar on Android).  Returns 0 on desktop/non-notch devices.
export function getSafeAreaBottom() {
  try {
    const style = getComputedStyle(document.documentElement);
    const raw = style.getPropertyValue('--safe-bottom').trim();
    return raw ? (parseFloat(raw) || 0) : 0;
  } catch { return 0; }
}
export function getSafeAreaTop() {
  try {
    const style = getComputedStyle(document.documentElement);
    const raw = style.getPropertyValue('--safe-top').trim();
    return raw ? (parseFloat(raw) || 0) : 0;
  } catch { return 0; }
}
