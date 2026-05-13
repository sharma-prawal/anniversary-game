import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { CinematicScene } from './scenes/CinematicScene.js';
import { UIChapterScene } from './scenes/UIChapterScene.js';
import { UIScene } from './scenes/UIScene.js';
import { Chapter1Scene } from './scenes/Chapter1Scene.js';
import { Chapter2Scene } from './scenes/Chapter2Scene.js';
import { Chapter3Scene } from './scenes/Chapter3Scene.js';
import { Chapter4Scene } from './scenes/Chapter4Scene.js';
import { Chapter5Scene } from './scenes/Chapter5Scene.js';
import { Chapter6Scene } from './scenes/Chapter6Scene.js';
import { Chapter7Scene } from './scenes/Chapter7Scene.js';
import { Chapter8Scene } from './scenes/Chapter8Scene.js';
import { Chapter9Scene } from './scenes/Chapter9Scene.js';
import { Chapter10Scene } from './scenes/Chapter10Scene.js';
import { Chapter11Scene } from './scenes/Chapter11Scene.js';
import { Chapter12Scene } from './scenes/Chapter12Scene.js';
import { Chapter13Scene } from './scenes/Chapter13Scene.js';
import { Chapter14Scene } from './scenes/Chapter14Scene.js';
import { Chapter15Scene } from './scenes/Chapter15Scene.js';
import { OrientationManager } from './systems/OrientationManager.js';

// Detect mobile to skip expensive MSAA
const _mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// On iOS Safari, window.innerHeight can be captured before the URL bar has
// settled, giving a height that's ~60px too small. Reading it as late as
// possible (after any deferred paint) gives the correct value. Phaser's
// RESIZE mode will handle any further changes via the scale manager.
const _W = window.innerWidth;
const _H = window.innerHeight;

const config = {
  type: Phaser.WEBGL,          // Force WebGL for Light2D, batching, and pipeline support
  width:  _W,
  height: _H,
  parent: 'game-container',
  backgroundColor: '#060510',
  pixelArt: false,
  antialias: true,
  antialiasGL: !_mobile,       // MSAA is expensive on mobile GPUs — skip it
  roundPixels: false,          // Smooth bilinear is correct for Kenney’s non-pixel-art sprites
  // 'default' instead of 'high-performance': the high-performance hint forces
  // Chrome to use the discrete GPU, which gets restarted when DevTools opens
  // (DevTools compositor runs on the integrated GPU). That GPU process restart
  // causes a WebGL context loss and a permanent black canvas. 'default' lets
  // Chrome choose, avoiding the context loss on DevTools open without any
  // measurable visual quality difference on this art style.
  powerPreference: 'default',

  scale: {
    // RESIZE: canvas always matches exact window dimensions.
    // Combined with explicit width/height = innerWidth/Height this guarantees
    // the GL framebuffer maps 1:1 to device CSS pixels — no CSS scaling blur.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, PreloadScene, MainMenuScene, Chapter1Scene, Chapter2Scene, Chapter3Scene, Chapter4Scene, Chapter5Scene, Chapter6Scene, Chapter7Scene, Chapter8Scene, Chapter9Scene, Chapter10Scene, Chapter11Scene, Chapter12Scene, Chapter13Scene, Chapter14Scene, Chapter15Scene, CinematicScene, UIChapterScene, UIScene]
};

const game = new Phaser.Game(config);

// Orientation guard — must be init'd after Phaser.Game so the SceneManager
// exists. Only activates on touch devices (phones/tablets); desktop is a no-op
// because window.innerWidth > window.innerHeight is always true there.
OrientationManager.init(game);
