import { loadKenneyAssets, validateAssets, AssetRegistry } from '../systems/AssetRegistry.js';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const { width, height } = this.scale;

    // Loading UI
    this.cameras.main.setBackgroundColor('#0a0008');

    const loadingText = this.add.text(width / 2, height / 2 - 30, 'Preparing your story…', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#c8a0b0',
      resolution: 2,
    }).setOrigin(0.5);

    const barBg   = this.add.graphics();
    const barFill = this.add.graphics();
    // Mutable center — updated by the resize handler so the progress
    // callback always draws at the current canvas center, not the initial one.
    let cx = width / 2;
    let cy = height / 2;
    let loadProgress = 0;

    const redrawBars = () => {
      barBg.clear();
      barBg.fillStyle(0x2a1020, 1);
      barBg.fillRoundedRect(cx - 120, cy + 10, 240, 6, 3);
      barFill.clear();
      if (loadProgress > 0) {
        barFill.fillStyle(0xE86090, 1);
        barFill.fillRoundedRect(cx - 120, cy + 10, 240 * loadProgress, 6, 3);
      }
    };
    redrawBars();

    // On mobile, rotating during the loading screen resizes the canvas.
    // Reposition text and bars immediately so they stay centred.
    this.scale.on('resize', (gs) => {
      cx = gs.width  / 2;
      cy = gs.height / 2;
      loadingText.setPosition(cx, cy - 30);
      redrawBars();
    }, this);

    this.load.on('progress', (value) => {
      loadProgress = value;
      barFill.clear();
      barFill.fillStyle(0xE86090, 1);
      barFill.fillRoundedRect(cx - 120, cy + 10, 240 * value, 6, 3);
    });

    // Non-fatal load errors — game falls back to procedural art
    this.load.on('loaderror', (file) => {
      console.warn('[Preload] Failed to load:', file.key, '→', file.src);
    });

    // Load all Kenney assets from the centralized registry.
    // See src/systems/AssetRegistry.js for the full classification.
    loadKenneyAssets(this);
  }

  create() {
    // ── Texture filtering ─────────────────────────────────────────────────────
    // Kenney props/characters: LINEAR for smooth sub-pixel scaling
    this.textures.each(tex => {
      if (tex.key && (
        tex.key.startsWith('k-') ||
        tex.key.startsWith('char-') ||
        tex.key.startsWith('emote-') ||
        tex.key.startsWith('lib-') ||
        tex.key.startsWith('bg-scene-') ||
        tex.key.startsWith('bg-el-') ||
        tex.key.startsWith('bgr-') ||
        tex.key.startsWith('bg-flat-') ||
        tex.key.startsWith('bge-') ||
        tex.key.startsWith('particle-') ||
        tex.key.startsWith('foliage-') ||
        tex.key.startsWith('bldg-') ||
        tex.key.startsWith('land-') ||
        tex.key.startsWith('city-')
      )) {
        tex.setFilter(1); // Phaser.Textures.FilterMode.LINEAR
      }
    });

    // All three tilesets: NEAREST for crisp pixel-art rendering
    for (const key of Object.keys(AssetRegistry.tilesets)) {
      const tex = this.textures.get(key);
      if (tex) tex.setFilter(0); // Phaser.Textures.FilterMode.NEAREST
    }

    // ── Asset validation report ───────────────────────────────────────────────
    validateAssets(this);

    // ── Launch UIScene early — must be active before any chapter fires dialogue.
    //    UIScene elements start at alpha 0, so it's invisible until triggered.
    this.scene.launch('UI');

    // ── Transition to menu ────────────────────────────────────────────────────
    this.time.delayedCall(300, () => {
      this.cameras.main.fadeOut(400, 10, 0, 8);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MainMenu');
      });
    });
  }
}
