/**
 * TransitionFX — premium chapter transition effects.
 *
 * Provides several transition styles that can be mixed per chapter:
 *   • irisWipe     — circular reveal/close (Monument Valley style)
 *   • radialReveal — clock-hand sweep reveal
 *   • pageTurn     — diagonal wipe with soft edge
 *   • horizontalSlide — left/right curtain wipe
 *   • diamondWipe  — expanding diamond shape
 *
 * Each transition writes to a full-screen Graphics object and
 * animates via a 0→1 progress tween.
 *
 * Usage:
 *   TransitionFX.play(scene, 'irisOut', 800, () => { ... });
 */

const SQRT2 = Math.SQRT2;

export class TransitionFX {

  /**
   * Play a transition effect.
   * @param {Phaser.Scene} scene
   * @param {string} type — 'irisOut'|'irisIn'|'radialOut'|'radialIn'|'pageTurnOut'|'pageTurnIn'|'slideLeft'|'slideRight'|'diamondOut'|'diamondIn'
   * @param {number} [durationMs=900]
   * @param {Function} [onComplete]
   * @param {object} [opts] — { color, ease, depth }
   */
  static play(scene, type, durationMs = 900, onComplete, opts = {}) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const color = opts.color ?? 0x020008;
    const depth = opts.depth ?? 9999;
    const ease = opts.ease ?? 'Cubic.easeInOut';

    const gfx = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    const progress = { t: 0 };

    // Determine if this is an "out" (scene disappears) or "in" (scene appears)
    // slideLeft (covers left→right, t 0→1) is out; slideRight (reveals right→left, t 1→0) is in.
    const isOut = type.endsWith('Out') || type.endsWith('Left');

    // For "in" transitions, start fully covered
    if (!isOut) progress.t = 1;

    const drawFn = TransitionFX._getDrawFn(type, w, h, color);
    // Draw the first frame immediately — prevents a 1-frame transparent flash before the tween fires.
    drawFn(gfx, progress.t);

    scene.tweens.add({
      targets: progress,
      t: isOut ? 1 : 0,
      duration: durationMs,
      ease,
      onUpdate: () => {
        gfx.clear();
        drawFn(gfx, progress.t);
      },
      onComplete: () => {
        if (!isOut) gfx.destroy();
        if (onComplete) onComplete();
      },
    });

    return gfx;
  }

  /**
   * Quick exit transition — covers screen, calls midpoint callback, then reveals.
   * @param {Phaser.Scene} scene
   * @param {string} outType — e.g. 'irisOut'
   * @param {string} inType  — e.g. 'irisIn'
   * @param {number} outMs
   * @param {number} inMs
   * @param {Function} onMidpoint — called when screen is fully covered
   */
  static playOutIn(scene, outType, inType, outMs, inMs, onMidpoint) {
    TransitionFX.play(scene, outType, outMs, () => {
      if (onMidpoint) onMidpoint();
      // After midpoint, the new scene handles its own "in" transition
    });
  }

  // ── Per-chapter transition mapping ──────────────────────────────

  static CHAPTER_TRANSITIONS = {
    digital_beginning:   { out: 'irisOut',    in: 'irisIn',    outMs: 800,  inMs: 900  },
    friend_request:      { out: 'diamondOut',  in: 'diamondIn',  outMs: 750,  inMs: 850  },
    chat_and_pause:      { out: 'pageTurnOut', in: 'pageTurnIn', outMs: 900,  inMs: 1000 },
    first_meeting:       { out: 'irisOut',    in: 'radialIn',  outMs: 800,  inMs: 1000 },
    growing_connection:  { out: 'slideLeft',  in: 'slideRight', outMs: 700,  inMs: 800  },
    first_gift:          { out: 'diamondOut',  in: 'diamondIn',  outMs: 800,  inMs: 900  },
    pizza_day:           { out: 'slideLeft',  in: 'slideRight', outMs: 700,  inMs: 800  },
    relationship_growth: { out: 'pageTurnOut', in: 'pageTurnIn', outMs: 900,  inMs: 1000 },
    the_letters:         { out: 'irisOut',    in: 'irisIn',    outMs: 1000, inMs: 1100 },
    fights_and_fix:      { out: 'radialOut',  in: 'radialIn',  outMs: 800,  inMs: 900  },
    little_surprises:    { out: 'diamondOut',  in: 'diamondIn',  outMs: 750,  inMs: 850  },
    family_meet:         { out: 'pageTurnOut', in: 'pageTurnIn', outMs: 900,  inMs: 1000 },
    paths_merge:         { out: 'irisOut',    in: 'irisIn',    outMs: 900,  inMs: 1000 },
    engagement_wedding:  { out: 'radialOut',  in: 'radialIn',  outMs: 1100, inMs: 1200 },
    present_day:         { out: 'irisOut',    in: 'irisIn',    outMs: 1200, inMs: 1400 },
  };

  /** Get the transition config for a chapter id. */
  static forChapter(chapterId) {
    return TransitionFX.CHAPTER_TRANSITIONS[chapterId] ?? { out: 'irisOut', in: 'irisIn', outMs: 800, inMs: 900 };
  }

  // ── Draw functions ──────────────────────────────────────────────

  static _getDrawFn(type, w, h, color) {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy) + 20;
    const base = type.replace(/Out$|In$/, '').replace(/Left$|Right$/, '');

    switch (base) {
      case 'iris':
        return (gfx, t) => {
          // t=0: nothing visible, t=1: fully covered
          const radius = maxR * (1 - t);
          if (radius > 0.5) {
            // Donut mask: fill screen except the open circle (assumed gfx is pre-cleared by caller).
            TransitionFX._drawIrisMask(gfx, cx, cy, radius, w, h, color);
          } else {
            // Fully covered — cheap rectangle instead of 64 triangle calls.
            gfx.fillStyle(color, 1);
            gfx.fillRect(0, 0, w, h);
          }
        };

      case 'radial':
        return (gfx, t) => {
          // Clock-hand sweep
          if (t <= 0.001) return;
          gfx.fillStyle(color, 1);
          if (t >= 0.999) { gfx.fillRect(0, 0, w, h); return; }
          const angle = t * Math.PI * 2;
          const pts = [{ x: cx, y: cy }];
          // Start from top (12 o'clock)
          pts.push({ x: cx, y: -10 });
          const steps = Math.ceil(t * 32);
          for (let i = 1; i <= steps; i++) {
            const a = -Math.PI / 2 + (i / steps) * angle;
            pts.push({ x: cx + Math.cos(a) * maxR, y: cy + Math.sin(a) * maxR });
          }
          gfx.beginPath();
          gfx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
          gfx.closePath();
          gfx.fillPath();
        };

      case 'pageTurn':
        return (gfx, t) => {
          // Diagonal wipe from top-left to bottom-right
          if (t <= 0.001) return;
          if (t >= 0.999) { gfx.fillStyle(color, 1); gfx.fillRect(0, 0, w, h); return; }
          const diag = (w + h) * SQRT2;
          const edge = t * diag;
          // Fully covered once the wipe front passes the farthest screen corner (w+h).
          // All geometry beyond this point is identical to a solid fill — skip the path work.
          if (edge >= w + h) { gfx.fillStyle(color, 1); gfx.fillRect(0, 0, w, h); return; }
          const softWidth = 30;
          // Main cover: everything above/left of the diagonal edge
          gfx.fillStyle(color, 1);
          gfx.beginPath();
          gfx.moveTo(-10, -10);
          gfx.lineTo(edge, -10);
          gfx.lineTo(-10, edge);
          gfx.closePath();
          gfx.fillPath();
          // Soft feathered edge
          for (let i = 1; i <= 6; i++) {
            const a = (1 - i / 7) * 0.35;
            const off = i * (softWidth / 6);
            gfx.fillStyle(color, a);
            gfx.beginPath();
            gfx.moveTo(edge + off, -10);
            gfx.lineTo(edge, -10);
            gfx.lineTo(-10, edge);
            gfx.lineTo(-10, edge + off);
            gfx.closePath();
            gfx.fillPath();
          }
        };

      case 'slide':
        return (gfx, t) => {
          if (t <= 0.001) return;
          gfx.fillStyle(color, 1);
          const isLeft = type.includes('Left');
          if (isLeft) {
            gfx.fillRect(0, 0, w * t, h);
            // Soft edge
            for (let i = 1; i <= 5; i++) {
              gfx.fillStyle(color, (1 - i / 6) * 0.4);
              gfx.fillRect(w * t + (i - 1) * 6, 0, 6, h);
            }
          } else {
            gfx.fillRect(w * (1 - t), 0, w * t, h);
            for (let i = 1; i <= 5; i++) {
              gfx.fillStyle(color, (1 - i / 6) * 0.4);
              gfx.fillRect(w * (1 - t) - i * 6, 0, 6, h);
            }
          }
        };

      case 'diamond':
        return (gfx, t) => {
          if (t <= 0.001) return;
          if (t >= 0.999) { gfx.fillStyle(color, 1); gfx.fillRect(0, 0, w, h); return; }
          // Expanding diamond cutout: fill screen minus the open diamond window.
          const dw = maxR * (1 - t);
          if (dw > 1) {
            TransitionFX._drawDiamondMask(gfx, cx, cy, dw, w, h, color);
          } else {
            // Diamond closed — cheap solid cover.
            gfx.fillStyle(color, 1);
            gfx.fillRect(0, 0, w, h);
          }
        };

      default:
        return (gfx, t) => {
          gfx.fillStyle(color, t);
          gfx.fillRect(0, 0, w, h);
        };
    }
  }

  /** Draw iris (circle cutout) mask — 4 rects + 4 corner triangles around circle */
  static _drawIrisMask(gfx, cx, cy, r, w, h, color) {
    // Approximate circle mask using many-segment polygon fill around the hole.
    // Fill the entire screen except a circle of radius `r` centered at (cx, cy).
    const segments = 64;
    const outerPts = [
      { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h },
    ];

    gfx.fillStyle(color, 1);

    // Draw as individual triangles from outer edges to circle boundary
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      const ix1 = cx + Math.cos(a1) * r;
      const iy1 = cy + Math.sin(a1) * r;
      const ix2 = cx + Math.cos(a2) * r;
      const iy2 = cy + Math.sin(a2) * r;

      // Extend to screen edge
      const ox1 = cx + Math.cos(a1) * (w + h);
      const oy1 = cy + Math.sin(a1) * (w + h);
      const ox2 = cx + Math.cos(a2) * (w + h);
      const oy2 = cy + Math.sin(a2) * (w + h);

      gfx.beginPath();
      gfx.moveTo(ix1, iy1);
      gfx.lineTo(ox1, oy1);
      gfx.lineTo(ox2, oy2);
      gfx.lineTo(ix2, iy2);
      gfx.closePath();
      gfx.fillPath();
    }
  }

  /** Draw diamond cutout mask — fill screen except a diamond of half-diag `d`.
   * Uses 8 triangles: 4 axial (N/E/S/W strips) + 4 corner wedges.
   * Each axial triangle spans from a screen edge to the midpoint of one diamond face.
   * Each corner wedge fills the gap between two adjacent axial triangles.
   */
  static _drawDiamondMask(gfx, cx, cy, d, w, h, color) {
    gfx.fillStyle(color, 1);
    // Diamond vertices: T=top, R=right, B=bottom, L=left
    const T = { x: cx,     y: cy - d };
    const R = { x: cx + d, y: cy };
    const B = { x: cx,     y: cy + d };
    const L = { x: cx - d, y: cy };

    // 4 axial strips (screen corner to midpoint of opposite-facing diamond edge)
    gfx.fillTriangle(0, 0, w, 0,   T.x, T.y);  // North strip
    gfx.fillTriangle(w, 0, w, h,   R.x, R.y);  // East strip
    gfx.fillTriangle(w, h, 0, h,   B.x, B.y);  // South strip
    gfx.fillTriangle(0, h, 0, 0,   L.x, L.y);  // West strip

    // 4 corner wedges — seal each gap between adjacent axial strips
    gfx.fillTriangle(w, 0, R.x, R.y, T.x, T.y);  // NE corner
    gfx.fillTriangle(w, h, B.x, B.y, R.x, R.y);  // SE corner
    gfx.fillTriangle(0, h, L.x, L.y, B.x, B.y);  // SW corner
    gfx.fillTriangle(0, 0, T.x, T.y, L.x, L.y);  // NW corner
  }
}
