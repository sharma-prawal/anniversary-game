import { OpenEnvironment }   from './OpenEnvironment.js';
import { IndoorEnvironment } from './IndoorEnvironment.js';
import { DarkEnvironment }   from './DarkEnvironment.js';

/**
 * EnvironmentManager — single entry point for applying environment presets.
 *
 * Usage in any ChapterScene subclass:
 *
 *   import { EnvironmentManager } from '../systems/environment/EnvironmentManager.js';
 *
 *   buildGround() {
 *     this.env = EnvironmentManager.apply(this, 'OPEN', {
 *       sky:    { topColor: 0xA63A2A, midColor: 0xE07A3F, botColor: 0xFFF1C1 },
 *       ground: { topColor: 0x6B4A32, botColor: 0x120A05 },
 *       ...overrides
 *     });
 *   }
 *
 * Returns the environment instance so the scene can read groundY or call
 * env.update(scrollX) each frame for parallax driving.
 *
 * Three preset types:
 *   OPEN   — outdoor scenes (sky, mountains, hills, treeline, ground, vignette)
 *   INDOOR — interior rooms (flat ceiling/floor, walls, warm lighting)
 *   DARK   — spotlight / emotional scenes (deep darkness, single player light)
 */

const PRESETS = {
  OPEN:   OpenEnvironment,
  INDOOR: IndoorEnvironment,
  DARK:   DarkEnvironment,
};

export class EnvironmentManager {
  /**
   * Apply an environment preset to a ChapterScene.
   *
   * @param {Phaser.Scene} scene    — the active ChapterScene instance
   * @param {'OPEN'|'INDOOR'|'DARK'} type — preset type
   * @param {object} [overrides={}] — per-scene customisation merged over defaults
   * @returns {OpenEnvironment|IndoorEnvironment|DarkEnvironment}
   */
  static apply(scene, type, overrides = {}) {
    const Cls = PRESETS[type];
    if (!Cls) throw new Error(`[EnvironmentManager] Unknown type "${type}"`);

    const env = new Cls(scene, overrides);
    env.build();

    // Stash on the scene so onUpdate / shutdown can reach it.
    scene._env = env;

    return env;
  }
}
