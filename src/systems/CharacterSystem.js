import { PlayerCharacter } from './PlayerCharacter.js';
import { FemaleCharacter } from './FemaleCharacter.js';

/**
 * CharacterSystem — factory for creating game characters.
 *
 * Uses Kenney Mini Characters (3D) preview PNGs with tween-based animation.
 * Creates PlayerCharacter (physics + input) and FemaleCharacter (NPC) instances.
 *
 * Legacy buildPlayer() is preserved for backward compatibility with GameScene.
 */
export class CharacterSystem {
  constructor(scene) {
    this.scene = scene;
    this._characters = [];
  }

  /**
   * Create a player character (Kenney Mini Characters).
   * @param {object} ch - chapter data (needs playerStart)
   * @param {object} [config] - passed to PlayerCharacter
   * @returns {PlayerCharacter}
   */
  createPlayer(ch, config = {}) {
    const ps = ch.playerStart || { x: 150, y: 420 };
    const pc = new PlayerCharacter(this.scene, ps.x, ps.y, config);
    this._characters.push(pc);
    return pc;
  }

  /**
   * Create a female NPC companion (Kenney Mini Characters).
   * @param {number} x
   * @param {number} y
   * @param {object} [config] - passed to FemaleCharacter
   * @returns {FemaleCharacter}
   */
  createFemale(x, y, config = {}) {
    const fc = new FemaleCharacter(this.scene, x, y, config);
    this._characters.push(fc);
    return fc;
  }

  /**
   * Update all managed characters. Call from scene update().
   * @param {number} time
   * @param {number} delta
   */
  update(time, delta) {
    for (const char of this._characters) {
      char.update(time, delta);
    }
  }

  /**
   * Pause all NPC wander/follow AI (e.g. while dialogue is active).
   * Player is excluded — the scene handles player input gating separately.
   */
  stopNPCs() {
    for (const char of this._characters) {
      if (char.stopFollow !== undefined) {
        // FemaleCharacter: pause wander timer and stop current movement tween
        char._npcPausedMode = char._mode;
        char._mode = 'idle';
        char._stopWander?.();
        char.stopMovement();
        char._setWalking?.(false);
      }
    }
  }

  /**
   * Resume NPC wander/follow AI after dialogue ends.
   * Restores the mode that was active before stopNPCs() was called.
   */
  resumeNPCs() {
    for (const char of this._characters) {
      if (char._npcPausedMode !== undefined) {
        const mode = char._npcPausedMode;
        delete char._npcPausedMode;
        if (mode === 'wander') {
          char.wander(char._homeX, char._homeY);
        } else if (mode === 'follow' && char._followTarget) {
          char.follow(char._followTarget);
        }
        // 'idle' — nothing to restore
      }
    }
  }

  /**
   * Remove a single character from management without destroying it.
   * Use when a chapter destroys a character mid-scene to prevent stale refs.
   * @param {Character} char
   */
  remove(char) {
    const idx = this._characters.indexOf(char);
    if (idx !== -1) this._characters.splice(idx, 1);
  }

  /** Destroy all managed characters. */
  destroy() {
    for (const char of this._characters) {
      char.destroy();
    }
    this._characters.length = 0;
  }
}
