/**
 * FootstepSystem — adaptive, surface-aware movement audio.
 *
 * Design philosophy:
 *   Footsteps should be *felt*, not heard. They are a subliminal texture
 *   layer that grounds the player in the world. At no point should they
 *   compete with music, dialogue, or the emotional tone of any scene.
 *
 * Architecture:
 *   FootstepSystem sits between ChapterScene.update() and AudioManager.
 *   It reads the player's real-time velocity, derives whether the player
 *   is moving and at what speed, then requests the AudioManager to
 *   synthesise a footstep sound at the correct interval.
 *
 *   Nothing in this system plays audio directly or bypasses AudioManager.
 *   footstep synthesis is own by AudioManager._synthFootstep() so the
 *   entire audio graph stays in the one shared AudioContext.
 *
 * Surface types (mapped from chapter mood / environment type):
 *   'outdoor'   → soft grass / compressed earth
 *   'indoor'    → warm hardwood / soft carpet
 *   'stone'     → slight resonance, muffled stone
 *   'silent'    → no footsteps (emotional / void scenes)
 *
 * Integration:
 *   1. Instantiate once in ChapterScene.create():
 *        this.footsteps = new FootstepSystem(this, audioManager);
 *   2. Call update() each frame from ChapterScene.update():
 *        this.footsteps.update(time, delta, this._player, dialogueActive);
 *   3. Destroy in ChapterScene.shutdown():
 *        this.footsteps?.destroy();
 *
 * Surface override (in chapter buildGround()):
 *   this.footsteps?.setSurface('stone');
 *
 * Silence override (emotional scenes):
 *   this.footsteps?.setSurface('silent');
 */

import { audioManager } from '../utils/helpers.js';

// ── Surface → interval limits (ms between steps at full speed) ─────────────
// STEP_INTERVAL_BASE: interval when player moves at full 120 px/s speed.
// STEP_INTERVAL_SLOW: interval when player is barely moving (< 30% speed).
// Interval is linearly interpolated between these based on current speed ratio.
const SURFACES = {
  outdoor: { base: 420, slow: 680, vol: 0.028 },
  indoor:  { base: 460, slow: 740, vol: 0.022 },
  stone:   { base: 400, slow: 640, vol: 0.020 },
  silent:  null,  // no sound
};

// ── Mood → default surface ──────────────────────────────────────────────────
// Chapters that don't call setSurface() get the surface below.
// 'dark' and 'romantic' map to 'silent' — emotional void scenes feel wrong
// with footstep percussion intruding on the atmosphere.
const MOOD_SURFACE = {
  warm:     'outdoor',
  rain:     'outdoor',
  dawn:     'outdoor',
  office:   'indoor',
  romantic: 'silent',
  dark:     'silent',
  default:  'outdoor',
};

// Speed threshold (px/s) below which we consider the player stationary.
const MOVE_THRESHOLD = 12;

// Maximum walking speed (px/s) — used to normalise step interval.
const MAX_SPEED = 120;

// When dialogue is active, fade steps to this fraction of normal volume.
// They remain ultra-quiet rather than cutting completely — a bare foot
// shifting weight during a conversation is natural.
const DIALOGUE_VOL_MUL = 0.30;

// When music is active we pull footsteps back slightly — the music bus
// is already doing heavy emotional lifting; steps should stay subliminal.
const MUSIC_VOL_MUL = 0.75;

export class FootstepSystem {
  /**
   * @param {Phaser.Scene} scene        — the active ChapterScene
   * @param {AudioManager} audioManager — singleton AudioManager instance
   */
  constructor(scene, audioMgr) {
    this._scene    = scene;
    this._audio    = audioMgr;

    // Resolve surface from scene mood
    const mood    = scene._cfg?.mood ?? 'default';
    this._surface = MOOD_SURFACE[mood] ?? MOOD_SURFACE.default;

    // Step timer — ms since the last footstep was triggered.
    // Initialised to the full base interval so the very first step fires
    // only after the player has been moving for a full interval (not instantly).
    this._elapsed = 0;

    // Track last known position for distance-based triggering sanity check.
    this._lastX = 0;
    this._lastY = 0;

    // Alternating foot — left/right pan offset for mild stereo variation.
    this._foot = 0;

    // Whether we are currently active (set false on destroy)
    this._active = true;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Override the surface type for this scene.
   * Call from buildGround() after the environment is constructed.
   * @param {'outdoor'|'indoor'|'stone'|'silent'} type
   */
  setSurface(type) {
    this._surface = type in SURFACES ? type : 'outdoor';
  }

  /**
   * Per-frame update. Call from ChapterScene.update().
   *
   * @param {number}          time           — Phaser scene time (ms)
   * @param {number}          delta          — frame delta (ms)
   * @param {PlayerCharacter} player         — the player instance
   * @param {boolean}         dialogueActive — true when a dialogue line is visible
   */
  update(time, delta, player, dialogueActive) {
    if (!this._active) return;
    if (!player?.sprite?.active) return;

    // Silent surface: unconditionally skip
    const surfaceCfg = this._surface ? SURFACES[this._surface] : null;
    if (!surfaceCfg) return;

    // Compute current speed from physics body when available,
    // otherwise fall back to distance-per-frame (for tween-based move).
    let speed = 0;
    const body = player.sprite.body;
    if (body) {
      // Physics-driven movement (keyboard): use body velocity magnitude
      speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
    } else {
      // Tween-driven movement (click-to-move): estimate from position delta
      const dx = player.sprite.x - this._lastX;
      const dy = player.sprite.y - this._lastY;
      speed = (Math.sqrt(dx * dx + dy * dy) / delta) * 1000;
    }
    this._lastX = player.sprite.x;
    this._lastY = player.sprite.y;

    // Below threshold → player is idle, reset timer so first step on
    // next movement fires after a full interval (no immediate step on resume)
    if (speed < MOVE_THRESHOLD) {
      this._elapsed = 0;
      return;
    }

    // Accumulate time since last step
    this._elapsed += delta;

    // Compute adaptive interval: faster movement → shorter interval
    // speedRatio: 0 = stopped, 1 = full speed
    const speedRatio  = Math.min(speed / MAX_SPEED, 1.0);
    // Lerp between slow interval (low speed) and base interval (full speed)
    const interval    = surfaceCfg.slow + (surfaceCfg.base - surfaceCfg.slow) * speedRatio;

    if (this._elapsed < interval) return;

    // ── Time to take a step ────────────────────────────────────────
    this._elapsed = 0;

    // Compute per-step volume modifiers
    let vol = surfaceCfg.vol;
    if (dialogueActive) vol *= DIALOGUE_VOL_MUL;
    if (this._audio._currentProfile) vol *= MUSIC_VOL_MUL;

    // Stereo pan: mild left/right alternation per foot
    // pan range: −0.18 to +0.18 — enough for spatial interest, inaudible as gimmick
    this._foot = 1 - this._foot;
    const pan = this._foot === 0 ? -0.14 : 0.14;

    // Pitch variation: ±4% per step — avoids robotic repetition
    const pitchMul = 0.96 + Math.random() * 0.08;

    // Delegate synthesis to AudioManager — stays in the shared AudioContext
    this._audio.playFootstepSurface(this._surface, vol, pan, pitchMul);
  }

  /** Release all resources. Call from ChapterScene.shutdown(). */
  destroy() {
    this._active  = false;
    this._scene   = null;
    this._audio   = null;
  }
}
