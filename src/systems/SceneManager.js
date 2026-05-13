import storyData from '../data/story.json';

/**
 * SceneManager — chapter routing and scene transitions.
 *
 * Centralises the goToChapter() logic so every scene type
 * (Game, Cinematic, UIChapter) can route to the next chapter
 * without circular imports.
 */

/** Return the Phaser scene key for a given chapter's sceneType. */
export function getSceneKey(chapter) {
  if (chapter.sceneKey) return chapter.sceneKey;
  if (chapter.sceneType === 'cinematic') return 'Cinematic';
  if (chapter.sceneType === 'ui') return 'UIChapter';
  return 'Game';
}

/**
 * Route to the correct scene based on chapter index.
 * Emits 'show-finale' when all chapters are exhausted.
 */
export function goToChapter(scene, index) {
  const chapters = storyData.chapters;
  if (index >= chapters.length) {
    scene.game.events.emit('show-finale', {
      memories: [],
      message: storyData.finalMessage || 'Four years… and forever to go.',
      button: storyData.finalButton || 'Play Again'
    });
    return;
  }
  // Persist progress so "Continue" on the main menu resumes here
  try { localStorage.setItem('prawal-aashna-chapter', String(index)); } catch (_) {}
  const ch = chapters[index];
  scene.scene.start(getSceneKey(ch), { chapter: index });
}
