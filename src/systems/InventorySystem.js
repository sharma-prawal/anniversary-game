const STORAGE_KEY = 'prawal-aashna-inventory';

export class InventorySystem {
  constructor(scene) {
    this.scene = scene;
    this.memories = this._load();
  }

  collect(memory) {
    if (!memory || this.has(memory.id)) return false;
    this.memories.push({ ...memory, collectedAt: Date.now() });
    this._save();
    this.scene.game.events.emit('memory-collected', memory);
    return true;
  }

  has(id) {
    return this.memories.some(m => m.id === id);
  }

  getAll() {
    return [...this.memories];
  }

  get count() {
    return this.memories.length;
  }

  clear() {
    this.memories = [];
    this._save();
  }

  _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memories)); }
    catch { /* storage full or unavailable — ignore */ }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
}
