/**
 * AudioManager — Premium procedural audio engine for narrative RPG.
 *
 * Architecture:
 *   AudioContext → masterGain
 *     ├── ambientBus  → [continuous ambient noise/drone]
 *     ├── musicBus    → [emotional chord layers]
 *     ├── textureBus  → [environmental micro-events]
 *     ├── sfxBus      → [one-shot SFX: click, collect, interact]
 *     └── dialogueBus → [typewriter ticks, speaker-specific sounds]
 *
 * Features:
 *   • Per-chapter audio profiles with unique soundscapes
 *   • Smooth crossfading between chapters (1000–1500ms)
 *   • Speaker-aware dialogue sounds (Prawal / Aashna / Narrator)
 *   • Proximity-based spatial audio (volume + stereo pan)
 *   • Environmental texture events (birds, rain, clock, etc.)
 *   • Transition effects (whoosh, swell)
 *   • Mobile-friendly (suspend/resume lifecycle, low node count)
 *
 * All audio is procedurally synthesized via Web Audio API.
 */

// ─── Note frequencies (Hz) ─────────────────────────────────────────
const N = {
  C3:130.81, Db3:138.59, D3:146.83, Eb3:155.56, E3:164.81, F3:174.61,
  Gb3:185.00, G3:196.00, Ab3:207.65, A3:220.00, Bb3:233.08, B3:246.94,
  C4:261.63, Db4:277.18, D4:293.66, Eb4:311.13, E4:329.63, F4:349.23,
  Gb4:369.99, G4:392.00, Ab4:415.30, A4:440.00, Bb4:466.16, B4:493.88,
  C5:523.25, D5:587.33, Eb5:622.25, E5:659.26, F5:698.46, G5:783.99,
};

// ─── Chord progressions ────────────────────────────────────────────
const PROG = {
  nostalgic:   [[N.C4,N.E4,N.G4,N.B4],[N.A3,N.C4,N.E4,N.G4],[N.F3,N.A3,N.C4,N.E4],[N.G3,N.B3,N.D4,N.F4]],
  hopeful:     [[N.D4,N.F4,N.A4,N.C5],[N.F4,N.A4,N.C5,N.E5],[N.C4,N.E4,N.G4,N.B4],[N.G3,N.B3,N.D4]],
  melancholy:  [[N.A3,N.C4,N.E4],[N.D3,N.F3,N.A3],[N.E3,N.G3,N.B3],[N.F3,N.A3,N.C4]],
  tender:      [[N.Eb4,N.G4,N.Bb4,N.D5],[N.C4,N.Eb4,N.G4,N.Bb4],[N.Ab3,N.C4,N.Eb4,N.G4],[N.Bb3,N.D4,N.F4,N.Ab4]],
  romantic:    [[N.F3,N.A3,N.C4,N.E4],[N.D3,N.F3,N.A3,N.C4],[N.Bb3,N.D4,N.F4,N.A4],[N.C4,N.E4,N.G4,N.Bb4]],
  playful:     [[N.G3,N.B3,N.D4],[N.D4,N.Gb4,N.A4],[N.E3,N.G3,N.B3],[N.C4,N.E4,N.G4]],
  triumphant:  [[N.C4,N.E4,N.G4],[N.G3,N.B3,N.D4],[N.A3,N.C4,N.E4],[N.F3,N.A3,N.C4],[N.G3,N.B3,N.D4,N.F4],[N.C4,N.E4,N.G4,N.B4]],
  ethereal:    [[N.Db4,N.F4,N.Ab4,N.C5],[N.Ab3,N.C4,N.Eb4,N.G4],[N.Eb3,N.Gb3,N.Bb3],[N.Bb3,N.D4,N.F4]],
  intimate:    [[N.F3,N.A3,N.C4],[N.A3,N.C4,N.E4],[N.D3,N.F3,N.A3],[N.Bb3,N.D4,N.F4]],
};

// ─── Per-chapter audio profiles ────────────────────────────────────
const CHAPTER_PROFILES = {
  digital_beginning: {
    music:   { progression: 'nostalgic', tempo: 6000, volume: 0.055, filterFreq: 450 },
    // shimmerFreq dropped from 2400 (outdoor-airy) → 680 (enclosed computer-fan whine)
    // noiseFreq raised from 180 (inaudible sub-bass) → 320 (apartment room tone)
    ambient: { noiseFreq: 320, noiseVol: 0.018, shimmerFreq: 680, shimmerVol: 0.005 },
    // keyboard-tick + silence-breath added: digital texture is constant but interrupted
    // interval tightened: lockdown isolation means screens are ON — never truly silent
    texture: { events: ['keyboard-tick', 'soft-click', 'digital-hum', 'silence-breath'], interval: [2000, 5000] },
  },
  friend_request: {
    music:   { progression: 'hopeful', tempo: 4200, volume: 0.052, filterFreq: 420 },
    // shimmerFreq: 2200 was an outdoor-sky frequency — wrong for a sealed digital void.
    // 480 Hz sits in the system-fan / data-hum register — it reads as "machine space".
    // noiseVol raised slightly: the void should have a faint electronic floor.
    ambient: { noiseFreq: 480, noiseVol: 0.020, shimmerFreq: 480, shimmerVol: 0.004 },
    // 'notification' removed — success-bell pings while walking past WRONG profiles
    // is emotionally backwards. 'keyboard-tick' + 'soft-click' = nervous searching.
    // 'silence-breath' adds irregular dead-air pauses = lonely, tentative.
    // Interval tightened: missed connections queue faster than they resolve.
    texture: { events: ['keyboard-tick', 'soft-click', 'keyboard-tick', 'silence-breath'], interval: [2500, 6000] },
  },
  chat_and_pause: {
    // tempo: 7000 was inaudibly slow — player traverses 3+ bubbles without a chord change.
    // 5500 is still plodding/melancholy but chord changes are perceptible during the walk.
    music:   { progression: 'melancholy', tempo: 5500, volume: 0.048, filterFreq: 380 },
    // noiseFreq: 100 Hz was outdoor sub-bass rumble — wrong for enclosed domestic space.
    // 240 Hz sits in late-night apartment room-tone territory (fridge hum, distant traffic).
    // shimmerFreq lowered to 1400: more muffled/enclosed than the 1800 open-air read.
    ambient: { noiseFreq: 240, noiseVol: 0.018, shimmerFreq: 1400, shimmerVol: 0.005 },
    // rain-drop added: mood:'rain', lockdown night, rain audible through apartment window.
    // keyboard-tick weighted 2× vs aashna-ping: Prawal is doing most of the typing.
    // interval tightened: two people actively texting → texture fills in more reliably.
    texture: { events: ['keyboard-tick', 'rain-drop', 'keyboard-tick', 'silence-breath'], interval: [2200, 5500] },
  },
  first_meeting: {
    // filterFreq: 520 muffled the hopeful progression in a bright open exterior.
    // 590 lets the upper harmonics breathe — sounds like sunlit open air.
    // tempo lowered to 4600: walk toward destination needs forward harmonic momentum.
    music:   { progression: 'hopeful', tempo: 4600, volume: 0.058, filterFreq: 590 },
    // shimmerVol raised: golden afternoon needs a perceptible warmth in the high register.
    ambient: { noiseFreq: 250, noiseVol: 0.018, shimmerFreq: 3200, shimmerVol: 0.009 },
    // sparkle-chime added: rose petals drifting, glowing gateway, magical destination =
    // this profile needs the sparkle accent. birdsong weighted 2× for outdoor feel.
    // interval tightened: the field is visually alive, the audio must match.
    texture: { events: ['birdsong', 'wind-gentle', 'birdsong', 'sparkle-chime'], interval: [2000, 5000] },
  },
  growing_connection: {
    // filterFreq: 450 muffled the romantic progression in a well-lit windowed office.
    // 520 lets upper harmonics breathe — warm daylight floods the scene.
    // tempo lowered: purposeful three-zone walk needs a lighter forward pulse.
    music:   { progression: 'romantic', tempo: 4800, volume: 0.052, filterFreq: 520 },
    // noiseFreq: 200 was mid-bass domestic hum — wrong for fluorescent office.
    // 380 Hz sits in the fluorescent-ballast / HVAC register.
    // shimmerVol raised above noise floor.
    ambient: { noiseFreq: 380, noiseVol: 0.015, shimmerFreq: 2800, shimmerVol: 0.009 },
    // paper-rustle removed (no paper — computers everywhere in scene).
    // keyboard-tick dominant: both NPCs sit at computers, the soundscape is digital.
    // soft-click secondary: mouse clicks between typing.
    // sparkle-chime: Aashna's glowing workstation pulse deserves a rare chime accent.
    // interval tightened: active open-plan office, never truly silent.
    texture: { events: ['keyboard-tick', 'soft-click', 'keyboard-tick', 'sparkle-chime'], interval: [2500, 6000] },
  },
  first_gift: {
    // progression: 'playful' was wrong — vulnerable gift-giving is romantic, not cartoon.
    // filterFreq raised to 580: golden-hour sky, upper harmonics must breathe.
    // tempo 4600: forward walk pacing matches first_meeting outdoor baseline.
    music:   { progression: 'romantic', tempo: 4600, volume: 0.055, filterFreq: 580 },
    // noiseFreq 300→260: outdoor park air, not basement murk (aligns with first_meeting).
    // noiseVol raised to 0.018: outdoor scenes need perceptible environmental floor.
    // shimmerFreq 3500→3200: same golden light as first_meeting — normalize outdoor palette.
    // shimmerVol 0.005→0.009: was below noise floor; golden sky shimmer must be audible.
    ambient: { noiseFreq: 260, noiseVol: 0.018, shimmerFreq: 3200, shimmerVol: 0.009 },
    // sparkle-chime added: glowing gift orbs pulse visually — audio must match.
    // birdsong weighted 2×: golden-hour park, evening birds prominent.
    // interval tightened: scene is visually alive with particles + glows, audio must fill.
    texture: { events: ['birdsong', 'wind-gentle', 'birdsong', 'sparkle-chime'], interval: [2000, 5000] },
  },
  pizza_day: {
    // progression: 'playful' was wrong — candlelit first date needs 'romantic' (F major 7th warmth).
    // Scene constructor declares mood:'romantic'; audio profile must match.
    // tempo raised to 5000: intimate dinner breathes slower than outdoor scenes.
    // filterFreq 600→460: enclosed dark cafe absorbs highs; 600 is engagement_wedding brightness.
    music:   { progression: 'romantic', tempo: 5000, volume: 0.060, filterFreq: 460 },
    // shimmerFreq 2600 was open-air frequency — wrong for sealed candlelit interior.
    // 1800 Hz matches chat_and_pause enclosed interior — muffled, close, warm.
    // shimmerVol 0.005 was below noise floor; 0.009 restores the warm ceiling shimmer.
    ambient: { noiseFreq: 280, noiseVol: 0.018, shimmerFreq: 1800, shimmerVol: 0.009 },
    // cafe-clink weighted 2×: cutlery + glasses settling is the dominant texture.
    // soft-click: waitstaff micro-actions, chair adjustments — fills dead-air gaps.
    // interval tightened: active restaurant interior, never 7s of silence.
    texture: { events: ['cafe-clink', 'crowd-murmur', 'cafe-clink', 'soft-click'], interval: [2000, 5000] },
  },
  relationship_growth: {
    // progression: 'romantic' + tempo 6000 are correct — slow, intimate, dusk clearing.
    // filterFreq 420: dark enclosure of tree-ringed clearing; defensible, leave unchanged.
    music:   { progression: 'romantic', tempo: 6000, volume: 0.050, filterFreq: 420 },
    // noiseFreq: 120 was sub-bass mechanical rumble — wrong for an outdoor forest clearing.
    // 220 Hz is correct for soft evening open-air texture (insect hum, distant breeze).
    // noiseVol: 0.022 was louder than the active office scene (growing_connection: 0.015).
    // 0.015 lets the romantic progression breathe in the most minimal scene in the game.
    // shimmerFreq 2000→1800: tree-enclosed clearing absorbs highs; matches enclosed register.
    // shimmerVol 0.007 was below noise floor; 0.009 restores the twilight aerial shimmer.
    ambient: { noiseFreq: 220, noiseVol: 0.015, shimmerFreq: 1800, shimmerVol: 0.009 },
    // silence-breath added: organic dead-air pauses match two people sitting in quiet wonder.
    // cricket-chirp weighted 2×: dusk clearing is dominated by evening insects.
    // interval already correct — keep.
    texture: { events: ['cricket-chirp', 'wind-gentle', 'cricket-chirp', 'silence-breath'], interval: [2000, 5000] },
  },
  the_letters: {
    // progression: 'tender' + tempo 6500 + filterFreq 400 are all correct — leave unchanged.
    music:   { progression: 'tender', tempo: 6500, volume: 0.050, filterFreq: 400 },
    // noiseFreq: 160 was sub-bass mechanical rumble — wrong for open-air pre-dawn garden.
    // 220 Hz = early morning air texture (distant wind, birdsong register).
    // shimmerFreq 2600 was bright open-sky; 1800 matches tree-enclosed dawn canopy.
    // shimmerVol 0.006 was below noise floor; 0.009 restores the warm dawn shimmer.
    ambient: { noiseFreq: 220, noiseVol: 0.014, shimmerFreq: 1800, shimmerVol: 0.009 },
    // pen-scratch weighted 2×: the dominant act of writing resonates in each letter found.
    // silence-breath added: held-breath pause of reading old unsent letters.
    // interval tightened: 8s dead-air gap in a slow contemplative scene is too long.
    texture: { events: ['pen-scratch', 'page-turn', 'pen-scratch', 'silence-breath'], interval: [2500, 5500] },
  },
  fights_and_fix: {
    // progression:'melancholy' is correct — cold, heavy, conflicted.
    // tempo 6000→5200: storm scene is dynamic, not static; forward harmonic motion needed.
    // filterFreq 350→380: slight lift lets minor chord harmonics breathe under storm ceiling.
    music:   { progression: 'melancholy', tempo: 5200, volume: 0.050, filterFreq: 380 },
    // noiseFreq: 80 was inaudible sub-bass (below perceptible register).
    // 260 Hz = windswept outdoor rain — the acoustic fingerprint of storm on open ground.
    // noiseVol: 0.030 was the game's loudest ambient budgeted at an inaudible frequency.
    // 0.028 correctly channels the energy into the audible storm register.
    // shimmerVol: 0.004 was half the noise floor minimum; rain has rich high-freq spray.
    // 0.010 (above outdoor default) — storms are louder; shimmerFreq 1500 already correct.
    ambient: { noiseFreq: 260, noiseVol: 0.028, shimmerFreq: 1500, shimmerVol: 0.010 },
    // rain-drop weighted 3×: constant, relentless. thunder-distant: rare, not equal.
    // interval tightened dramatically: visual has non-stop rain particles — audio must match.
    // 6-second gap during on-screen rain is the worst audio-visual mismatch in the game.
    texture: { events: ['rain-drop', 'rain-drop', 'rain-drop', 'thunder-distant'], interval: [1500, 3500] },
  },
  little_surprises: {
    // progression: 'playful' was wrong — a man quietly filling an apartment with
    // handmade gifts is 'tender' (Eb major 7th warmth), not a cartoon minigame.
    // filterFreq 500→480: slightly enclosed warm apartment, not bright exterior.
    // tempo 5000 is correct — gentle discovery walk pace, leave unchanged.
    music:   { progression: 'tender', tempo: 5000, volume: 0.055, filterFreq: 480 },
    // noiseFreq: 200 was outdoor-field frequency — wrong for a sealed apartment.
    // 340 Hz = HVAC/fridge hum register of an enclosed warm domestic interior.
    // shimmerFreq 3000 was outdoor-bright; 2000 matches warm enclosed apartment air.
    // shimmerVol 0.006 was below noise floor; 0.009 restores the warm indoor shimmer.
    ambient: { noiseFreq: 340, noiseVol: 0.012, shimmerFreq: 2000, shimmerVol: 0.009 },
    // unwrap-rustle leads: the physical act of gift discovery is the dominant texture.
    // soft-click weighted 2×: quiet apartment life (drawer, lamp, kettle).
    // clock-tick: domestic interior anchor — the space has rhythm.
    // interval tightened: active exploration scene with 5 discoveries, never 6s of silence.
    texture: { events: ['unwrap-rustle', 'soft-click', 'clock-tick', 'soft-click'], interval: [2000, 5000] },
  },
  family_meet: {
    // progression:'tender' + tempo 5500 + filterFreq 460 are all correct — leave unchanged.
    music:   { progression: 'tender', tempo: 5500, volume: 0.055, filterFreq: 460 },
    // noiseFreq: 220 was below the warm indoor room-tone register.
    // 300 Hz = warm family home social room-tone (lighter than sealed apartment 340).
    // shimmerFreq 2400→2200: sealed evening interior, warmer/closer than bright outdoor.
    // shimmerVol 0.006 was below noise floor; 0.009 restores the warm indoor air shimmer.
    ambient: { noiseFreq: 300, noiseVol: 0.015, shimmerFreq: 2200, shimmerVol: 0.009 },
    // crowd-murmur weighted 2×: dominant texture for a room with 3 wandering NPCs.
    // soft-click: cups set down, books placed, small domestic sounds between conversation.
    // door-soft: someone moving between rooms — grounds the lived-in space.
    // interval tightened: 9s dead-air in an active social gathering is inexcusable.
    texture: { events: ['crowd-murmur', 'soft-click', 'crowd-murmur', 'door-soft'], interval: [2500, 5500] },
  },
  paths_merge: {
    // progression:'ethereal' + tempo 6000 are correct — floating, cinematic, transcendent.
    // filterFreq 480→520: wide-open dawn clearing, no ceiling; let upper partials breathe.
    music:   { progression: 'ethereal', tempo: 6000, volume: 0.050, filterFreq: 520 },
    // noiseFreq: 140 was sub-bass diesel drone — wrong for an open-sky dawn clearing.
    // 230 Hz = open morning air texture; lets the ethereal progression float above it.
    // noiseVol raised to 0.016: quieter than other outdoor scenes (0.018); slightly lifted.
    // shimmerFreq 3800 is correct bright-sky outdoor dawn. Leave unchanged.
    // shimmerVol 0.007 was below noise floor; 0.010 matches the scene's cinematic ambition.
    ambient: { noiseFreq: 230, noiseVol: 0.016, shimmerFreq: 3800, shimmerVol: 0.010 },
    // birdsong added: it's dawn, open clearing, first light — this is exactly when birds sing.
    // wind-gentle weighted 2×: dominant outdoor texture across the full clearing.
    // sparkle-chime: convergence sparks are visual; audio must echo them in the texture pool.
    // interval tightened: 7s dead-air in the game's most visually atmospheric scene is wrong.
    texture: { events: ['wind-gentle', 'birdsong', 'sparkle-chime', 'wind-gentle'], interval: [2000, 4500] },
  },
  engagement_wedding: {
    music:   { progression: 'triumphant', tempo: 5200, volume: 0.065, filterFreq: 520 },
    // tempo 4500→5200: stately processional pace, not anxious.
    // filterFreq 600→520: enclosed ceremonial hall absorbs highs; 600 is too bright/open.
    ambient: { noiseFreq: 320, noiseVol: 0.016, shimmerFreq: 2200, shimmerVol: 0.012 },
    // noiseFreq 250→320: indoor room tone, not airy outdoor.
    // shimmerFreq 4000→2200: warm ceremonial shimmer, not thin/wiry.
    // shimmerVol 0.006→0.012: CRITICAL — most important scene; highest shimmer vol in game.
    texture: { events: ['bells-soft', 'sparkle-chime', 'bells-soft'], interval: [3500, 7500] },
    // crowd-murmur REMOVED — this is a 2-person altar moment, world should hold its breath.
    // bells-soft weighted ×2 dominates; sparkle-chime adds ceremony magic.
    // interval 2500,6000→3500,7500: ceremony breathes, bells don't chatter.
  },
  present_day: {
    music:   { progression: 'intimate', tempo: 7000, volume: 0.050, filterFreq: 440 },
    // filterFreq 380→440: dreamlike open void, not muffled interior.
    ambient: { noiseFreq: 200, noiseVol: 0.014, shimmerFreq: 2000, shimmerVol: 0.013 },
    // noiseFreq 100→200: CRITICAL — sub-bass was inaudible. Ethereal void presence.
    // shimmerVol 0.005→0.013: CRITICAL — final chapter had the lowest shimmer in the game. Now the highest.
    // shimmerFreq 2200→2000: warmer, golden-dream shimmer.
    texture: { events: ['heartbeat', 'sparkle-chime', 'heartbeat', 'breath-soft'], interval: [2000, 5000] },
    // sparkle-chime ADDED — void is filled with golden sparkle visually; now matched acoustically.
    // heartbeat weighted ×2 — you feel your own heartbeat as you walk to her.
    // interval 3000,8000→2000,5000: heartbeat at 8s intervals is erratic; 5s max is consistent.
  },
  // ── Main menu: outdoor dusk/night, two people waiting, anticipation ──
  main_menu: {
    music:   { progression: 'romantic', tempo: 6500, volume: 0.050, filterFreq: 440 },
    ambient: { noiseFreq: 220, noiseVol: 0.016, shimmerFreq: 3200, shimmerVol: 0.006 },
    texture: { events: ['cricket-chirp', 'wind-gentle', 'birdsong', 'sparkle-chime'], interval: [4000, 10000] },
  },
};

// Mood → progression fallback mapping (for backward compat with startAmbient(mood))
const MOOD_MAP = {
  warm:       'nostalgic',
  romantic:   'romantic',
  melancholy: 'melancholy',
  magical:    'ethereal',
  triumphant: 'triumphant',
  dawn:       'hopeful',
  office:     'nostalgic',
  rain:       'melancholy',
  default:    'nostalgic',
};

// ════════════════════════════════════════════════════════════════════
//  AudioManager
// ════════════════════════════════════════════════════════════════════

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;

    // Bus nodes
    this.masterGain  = null;
    this.ambientBus  = null;
    this.musicBus    = null;
    this.textureBus  = null;
    this.sfxBus      = null;
    this.dialogueBus = null;

    // Active layer state
    this._ambientNodes  = null;   // { sources[], gains[] }
    this._musicNodes    = null;   // { oscs[], gains[], interval, sub }
    this._textureTimer  = null;
    this._textureEvents = null;
    this._textureInterval = null;

    // Current chapter
    this._currentProfile = null;
    this._currentChapterId = null;

    // Proximity sources: Map<id, { osc, gain, panner }>
    this._proximitySources = new Map();

    // Footstep cooldown — shared across the legacy playFootstep() and the
    // new surface-aware playFootstepSurface() to prevent double-triggering.
    this._footstepCd = 0;

    // Noise buffer (shared, created once)
    this._noiseBuffer = null;
  }

  // ══════════════════════════════════════════════════════════════════
  //  INIT / LIFECYCLE
  // ══════════════════════════════════════════════════════════════════

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Master bus chain
      this.masterGain = this._gain(0.35);
      this.masterGain.connect(this.ctx.destination);

      this.ambientBus  = this._gain(0.45);  // was 0.15 — too quiet to perceive
      this.musicBus    = this._gain(0.55);  // was 0.08 — effective music was <-56dBFS
      this.textureBus  = this._gain(0.30);  // was 0.10 — texture events inaudible
      this.sfxBus      = this._gain(0.35);
      this.dialogueBus = this._gain(0.35);  // raised so ticks remain perceptible vs louder music bus

      this.ambientBus.connect(this.masterGain);
      this.musicBus.connect(this.masterGain);
      this.textureBus.connect(this.masterGain);
      this.sfxBus.connect(this.masterGain);
      this.dialogueBus.connect(this.masterGain);

      // Pre-generate shared noise buffer — 6s eliminates the perceptible 2s loop cycle
      this._noiseBuffer = this._createNoiseBuffer(6);

      // Auto-resume when the tab comes back into focus
      this._visibilityHandler = () => { if (!document.hidden) this.resume(); };
      document.addEventListener('visibilitychange', this._visibilityHandler);

      this.initialized = true;
    } catch { /* Web Audio not available */ }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** Set volume for a specific bus: 'master', 'ambient', 'music', 'texture', 'sfx', 'dialogue' */
  setVolume(bus, value) {
    if (!this.initialized) return;
    const node = {
      master: this.masterGain, ambient: this.ambientBus, music: this.musicBus,
      texture: this.textureBus, sfx: this.sfxBus, dialogue: this.dialogueBus,
    }[bus];
    if (node) {
      node.gain.cancelScheduledValues(this.ctx.currentTime);
      node.gain.setValueAtTime(value, this.ctx.currentTime);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  CHAPTER TRANSITIONS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Transition all audio layers to a new chapter's profile.
   * Crossfades from current → new over specified duration.
   * @param {string} chapterId — matches story.json chapter.id
   * @param {number} [fadeMs=1200] — crossfade duration
   */
  transitionToChapter(chapterId, fadeMs = 1200) {
    if (!this.initialized) return;
    this.resume();

    const profile = CHAPTER_PROFILES[chapterId];
    if (!profile) {
      // Fallback to mood-based if no profile found
      this.startAmbient('warm');
      return;
    }

    // If same chapter, skip transition
    if (this._currentChapterId === chapterId) return;

    const fadeSec = fadeMs / 1000;

    // Fade out current layers
    this._fadeOutAmbient(fadeSec);
    this._fadeOutMusic(fadeSec);
    this._stopTextureEvents();

    // After brief overlap, start new layers
    const startDelay = fadeSec * 0.3;
    setTimeout(() => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      this._startAmbientLayer(profile.ambient, fadeSec);
      this._startMusicLayer(profile.music, fadeSec);
      this._startTextureEvents(profile.texture);
      this._currentProfile = profile;
      this._currentChapterId = chapterId;
    }, startDelay * 1000);
  }

  /**
   * Fade out all active audio layers (for chapter exit).
   * @param {number} [fadeMs=800]
   */
  fadeOutAll(fadeMs = 800) {
    if (!this.initialized) return;
    const sec = fadeMs / 1000;
    this._fadeOutAmbient(sec);
    this._fadeOutMusic(sec);
    this._stopTextureEvents();
    this._stopAllProximity();
    this._currentChapterId = null;
    this._currentProfile = null;
  }

  // ── Backward-compatible API ──────────────────────────────────────

  startAmbient(mood) {
    if (!this.initialized) return;
    this.stopAmbient();
    this.resume();

    const progKey = MOOD_MAP[mood] || MOOD_MAP.default;
    const profile = {
      music:   { progression: progKey, tempo: 5500, volume: 0.055, filterFreq: 450 },
      ambient: { noiseFreq: 200, noiseVol: 0.018, shimmerFreq: 2400, shimmerVol: 0.006 },
      texture: { events: ['soft-click'], interval: [6000, 12000] },
    };
    this._startAmbientLayer(profile.ambient, 3);
    this._startMusicLayer(profile.music, 3);
    this._startTextureEvents(profile.texture);
    this._currentProfile = profile;
  }

  stopAmbient() {
    this._fadeOutAmbient(1.5);
    this._fadeOutMusic(1.5);
    this._stopTextureEvents();
    this._currentProfile = null;
    this._currentChapterId = null;
  }

  startMusic(mood) {
    const progKey = MOOD_MAP[mood] || MOOD_MAP.default;
    this._fadeOutMusic(1);
    setTimeout(() => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      this._startMusicLayer({ progression: progKey, tempo: 5500, volume: 0.055, filterFreq: 450 }, 2);
    }, 500);
  }

  stopMusic() { this._fadeOutMusic(2); }

  // ══════════════════════════════════════════════════════════════════
  //  AMBIENT LAYER — filtered noise + shimmer drone
  // ══════════════════════════════════════════════════════════════════

  _startAmbientLayer(cfg, fadeSec) {
    if (!this.initialized || !cfg) return;
    const t = this.ctx.currentTime;
    const sources = [];

    // Low-frequency filtered noise (room tone / nature base)
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this._noiseBuffer;
    noiseSrc.loop = true;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = cfg.noiseFreq;
    noiseFilter.Q.value = 0.7;
    const noiseGain = this._gain(0);
    noiseGain.gain.linearRampToValueAtTime(cfg.noiseVol, t + fadeSec);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ambientBus);
    noiseSrc.start();
    sources.push({ src: noiseSrc, gain: noiseGain, extras: [noiseFilter] });

    // Shimmer oscillator with LFO modulation
    const shimOsc = this.ctx.createOscillator();
    shimOsc.type = 'sine';
    shimOsc.frequency.value = cfg.shimmerFreq;
    const shimGain = this._gain(0);
    shimGain.gain.linearRampToValueAtTime(cfg.shimmerVol, t + fadeSec);
    const lfo = this.ctx.createOscillator();
    const lfoGain = this._gain(cfg.shimmerVol * 0.5);
    lfo.frequency.value = 0.15 + Math.random() * 0.25;
    lfo.connect(lfoGain);
    lfoGain.connect(shimGain.gain);
    shimOsc.connect(shimGain);
    shimGain.connect(this.ambientBus);
    shimOsc.start();
    lfo.start();
    sources.push({ src: shimOsc, gain: shimGain, extras: [lfo, lfoGain] });

    // Secondary shimmer — slightly detuned for width
    const shim2 = this.ctx.createOscillator();
    shim2.type = 'sine';
    shim2.frequency.value = cfg.shimmerFreq * 1.003; // subtle beating
    const shim2Gain = this._gain(0);
    shim2Gain.gain.linearRampToValueAtTime(cfg.shimmerVol * 0.6, t + fadeSec);
    shim2.connect(shim2Gain);
    shim2Gain.connect(this.ambientBus);
    shim2.start();
    sources.push({ src: shim2, gain: shim2Gain, extras: [] });

    this._ambientNodes = sources;
  }

  _fadeOutAmbient(fadeSec) {
    if (!this._ambientNodes) return;
    const t = this.ctx.currentTime;
    const nodes = this._ambientNodes;
    this._ambientNodes = null;

    for (const n of nodes) {
      n.gain.gain.cancelScheduledValues(t);
      n.gain.gain.setValueAtTime(n.gain.gain.value, t);
      n.gain.gain.linearRampToValueAtTime(0, t + fadeSec);
      n.src.stop(t + fadeSec + 0.1);
      for (const e of n.extras) {
        if (e.stop) e.stop(t + fadeSec + 0.1);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  MUSIC LAYER — chord-based harmonic progression
  // ══════════════════════════════════════════════════════════════════

  _startMusicLayer(cfg, fadeSec) {
    if (!this.initialized || !cfg) return;
    const prog = PROG[cfg.progression] || PROG.nostalgic;
    const t = this.ctx.currentTime;
    const nodes = [];

    // Create oscillators for first chord
    const chord = prog[0];
    for (const freq of chord) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cfg.filterFreq;
      filter.Q.value = 0.5;
      const g = this._gain(0);
      g.gain.linearRampToValueAtTime(cfg.volume, t + fadeSec);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.musicBus);
      osc.start();
      nodes.push({ osc, gain: g, filter });
    }

    // Sub-bass (octave below root)
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = chord[0] / 2;
    const subFilter = this.ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.value = 200;
    const subGain = this._gain(0);
    subGain.gain.linearRampToValueAtTime(cfg.volume * 0.6, t + fadeSec);
    sub.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.musicBus);
    sub.start();

    // Chord cycling interval
    let ci = 0;
    const iv = setInterval(() => {
      if (!this.ctx || this.ctx.state === 'closed') { clearInterval(iv); return; }
      ci = (ci + 1) % prog.length;
      const nextChord = prog[ci];
      const ct = this.ctx.currentTime;
      const rampSec = (cfg.tempo / 1000) * 0.08; // tight glide — avoids audible pitch-bend slide between chords
      nodes.forEach((n, i) => {
        if (i < nextChord.length) {
          n.osc.frequency.linearRampToValueAtTime(nextChord[i], ct + rampSec);
        }
      });
      sub.frequency.linearRampToValueAtTime(nextChord[0] / 2, ct + rampSec);
    }, cfg.tempo);

    this._musicNodes = { nodes, sub, subGain, interval: iv };
  }

  _fadeOutMusic(fadeSec) {
    if (!this._musicNodes) return;
    const t = this.ctx.currentTime;
    const m = this._musicNodes;
    this._musicNodes = null;

    clearInterval(m.interval);
    for (const n of m.nodes) {
      n.gain.gain.cancelScheduledValues(t);
      n.gain.gain.setValueAtTime(n.gain.gain.value, t);
      n.gain.gain.linearRampToValueAtTime(0, t + fadeSec);
      n.osc.stop(t + fadeSec + 0.1);
    }
    m.subGain.gain.cancelScheduledValues(t);
    m.subGain.gain.setValueAtTime(m.subGain.gain.value, t);
    m.subGain.gain.linearRampToValueAtTime(0, t + fadeSec);
    m.sub.stop(t + fadeSec + 0.1);
  }

  // ══════════════════════════════════════════════════════════════════
  //  TEXTURE LAYER — periodic environmental micro-events
  // ══════════════════════════════════════════════════════════════════

  _startTextureEvents(cfg) {
    if (!this.initialized || !cfg || !cfg.events?.length) return;
    this._textureEvents = cfg.events;
    this._textureInterval = cfg.interval;
    this._scheduleNextTexture();
  }

  _scheduleNextTexture() {
    if (!this._textureEvents) return;
    const [min, max] = this._textureInterval;
    const delay = min + Math.random() * (max - min);
    this._textureTimer = setTimeout(() => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      const evt = this._textureEvents[Math.floor(Math.random() * this._textureEvents.length)];
      this._playTextureEvent(evt);
      this._scheduleNextTexture();
    }, delay);
  }

  _stopTextureEvents() {
    if (this._textureTimer) { clearTimeout(this._textureTimer); this._textureTimer = null; }
    this._textureEvents = null;
    this._textureInterval = null;
  }

  _playTextureEvent(type) {
    if (!this.initialized) return;
    this.resume();
    switch (type) {
      case 'soft-click':      this._synthTick(800, 0.015, 0.02); break;
      case 'digital-hum':     this._synthTone(200, 0.008, 0.3); break;
      case 'notification':    this._synthBell(1200, 0.020, 0.15); break;
      case 'keyboard-tick':   this._synthTick(600, 0.020, 0.015); break;
      case 'silence-breath':  this._synthBreath(0.008, 0.5); break;
      case 'birdsong':        this._synthBird(); break;
      case 'wind-gentle':     this._synthBreath(0.012, 0.8); break;
      case 'paper-rustle':    this._synthNoiseBurst(2000, 0.012, 0.08); break;
      case 'cafe-clink':      this._synthBell(3000, 0.015, 0.08); break;
      case 'crowd-murmur':    this._synthNoiseBurst(600, 0.008, 0.25); break;
      case 'cricket-chirp':   this._synthCricket(); break;
      case 'pen-scratch':     this._synthNoiseBurst(3000, 0.015, 0.03); break;
      case 'page-turn':       this._synthNoiseBurst(1500, 0.010, 0.10); break;
      case 'rain-drop':       this._synthDrop(); break;
      case 'thunder-distant': this._synthThunder(); break;
      case 'clock-tick':      this._synthTick(1000, 0.018, 0.01); break;
      case 'unwrap-rustle':   this._synthNoiseBurst(2500, 0.012, 0.06); break;
      case 'door-soft':       this._synthNoiseBurst(800, 0.010, 0.12); break;  // mid-noise burst = soft wood-click, not 200Hz kick
      case 'sparkle-chime':   this._synthChime(); break;
      case 'bells-soft':      this._synthBell(2000, 0.020, 0.20); break;
      case 'heartbeat':       this._synthHeartbeat(); break;
      case 'breath-soft':     this._synthBreath(0.006, 0.6); break;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  SFX — one-shot sound effects
  // ══════════════════════════════════════════════════════════════════

  playClick() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this._gain(0.1 - i * 0.03);
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06 + i * 0.025);
      osc.connect(g);
      g.connect(this.sfxBus);
      osc.start(t + i * 0.025);
      osc.stop(t + 0.09);
    });
  }

  /** Soft bell hover for menu buttons — lighter than playZoneEnter */
  playMenuHover() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1400;
    const g = this._gain(0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playCollect() {
    if (!this.initialized) return;
    this.resume();
    this.playHaptic(40);
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this._gain(0);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const s = t + i * 0.085;
      g.gain.linearRampToValueAtTime(0.1, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.45);
      osc.connect(g);
      g.connect(this.sfxBus);
      osc.start(s);
      osc.stop(s + 0.45);
    });
  }

  playInteract() {
    if (!this.initialized) return;
    this.resume();
    this.playHaptic(20);
    const t = this.ctx.currentTime;
    [440, 554, 659].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this._gain(0);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const s = t + i * 0.06;
      g.gain.linearRampToValueAtTime(0.09, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.5);
      osc.connect(g);
      g.connect(this.sfxBus);
      osc.start(s);
      osc.stop(s + 0.5);
    });
  }

  playFootstep() {
    if (!this.initialized) return;
    const now = performance.now();
    if (now - this._footstepCd < 260) return;
    this._footstepCd = now;
    this.resume();
    const osc = this.ctx.createOscillator();
    const g = this._gain(0.05);
    osc.type = 'sine';
    osc.frequency.value = 75 + Math.random() * 35;
    const t = this.ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start();
    osc.stop(t + 0.08);
  }

  /**
   * Surface-aware footstep synthesis. Called by FootstepSystem.
   * Timing and repetition-prevention are managed by FootstepSystem;
   * this method only synthesises a single step at the given parameters.
   *
   * @param {'outdoor'|'indoor'|'stone'} surface — surface type
   * @param {number} vol      — step volume (already attenuated by FootstepSystem)
   * @param {number} pan      — stereo position -1..1
   * @param {number} pitchMul — pitch multiplier, 0.96–1.04
   */
  playFootstepSurface(surface, vol, pan, pitchMul) {
    if (!this.initialized) return;
    this.resume();
    this._synthFootstep(surface, vol, pan, pitchMul);
  }

  /**
   * Synthesise a single footstep for the given surface type.
   * All surface variants route through sfxBus and share a StereoPanner
   * for the mild left/right alternation coming from FootstepSystem.
   *
   * Synthesis design:
   *   outdoor — two layers: a short low-frequency thump (compressed earth /
   *             grass contact) + a high-frequency noise burst (leaf/grass
   *             rustle). Together they read as "footstep on soft ground"
   *             rather than a bare sine blip.
   *
   *   indoor  — a single mid-frequency noise burst filtered to 800 Hz
   *             (hardwood / soft carpet). No low thump — indoor floors have
   *             less bass coupling to the listener. Shorter decay.
   *
   *   stone   — low thump (resonant floor) + a sharper mid-noise transient
   *             (hard surface impact). Slightly longer ring than outdoor.
   *
   * Total node count per step: 4–6 nodes, all self-terminating.
   * No nodes accumulate — each step is fully garbage-collectible after ~200 ms.
   *
   * @private
   */
  _synthFootstep(surface, vol, pan, pitchMul) {
    const t = this.ctx.currentTime;

    // Shared StereoPanner for this step
    const panner = this.ctx.createStereoPanner
      ? this.ctx.createStereoPanner()
      : null;
    const connectOut = (node) => {
      if (panner) {
        node.connect(panner);
        panner.connect(this.sfxBus);
      } else {
        node.connect(this.sfxBus);
      }
    };
    if (panner) panner.pan.setValueAtTime(pan, t);

    switch (surface) {

      case 'outdoor': {
        // ── Layer 1: low thump — earth contact ───────────────────
        // Sine starting at baseFreq, decaying quickly to simulate brief
        // floor resonance. pitchMul shifts the fundamental slightly between
        // steps so it never sounds like the same sample repeated.
        const baseFreq = (70 + Math.random() * 20) * pitchMul;
        const thump = this.ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(baseFreq, t);
        thump.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, t + 0.06);
        const thumpGain = this._gain(vol * 0.70);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        thump.connect(thumpGain);
        connectOut(thumpGain);
        thump.start(t);
        thump.stop(t + 0.09);

        // ── Layer 2: high-freq noise — grass/leaf rustle ─────────
        // Short noise burst filtered to 3–4 kHz range — the "swish"
        // of foot brushing through light foliage/grass.
        const rustleFreq = 3200 + Math.random() * 800;
        const src = this.ctx.createBufferSource();
        src.buffer = this._noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = rustleFreq;
        filter.Q.value = 1.8;
        const rustleGain = this._gain(vol * 0.45);
        rustleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
        src.connect(filter);
        filter.connect(rustleGain);
        connectOut(rustleGain);
        src.start(t);
        src.stop(t + 0.06);
        break;
      }

      case 'indoor': {
        // ── Single filtered noise burst: soft floor contact ──────
        // 700–900 Hz bandpass reads as a muffled hardwood or carpet step.
        // No sub-bass thump: indoor surfaces dampen low-end coupling.
        const floorFreq = (720 + Math.random() * 160) * pitchMul;
        const src = this.ctx.createBufferSource();
        src.buffer = this._noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = floorFreq;
        filter.Q.value = 2.2;
        const stepGain = this._gain(vol * 0.80);
        stepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        src.connect(filter);
        filter.connect(stepGain);
        connectOut(stepGain);
        src.start(t);
        src.stop(t + 0.08);
        break;
      }

      case 'stone': {
        // ── Layer 1: resonant low thump ───────────────────────────
        // Stone floors have more low-end ring than earth. Longer decay.
        const baseFreq = (85 + Math.random() * 25) * pitchMul;
        const thump = this.ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(baseFreq, t);
        thump.frequency.exponentialRampToValueAtTime(baseFreq * 0.60, t + 0.09);
        const thumpGain = this._gain(vol * 0.65);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        thump.connect(thumpGain);
        connectOut(thumpGain);
        thump.start(t);
        thump.stop(t + 0.12);

        // ── Layer 2: mid transient — hard surface click ───────────
        // 1.5–2 kHz burst: the sharp impact of sole on stone.
        const clickFreq = 1600 + Math.random() * 400;
        const src = this.ctx.createBufferSource();
        src.buffer = this._noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = clickFreq;
        filter.Q.value = 2.5;
        const clickGain = this._gain(vol * 0.40);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        src.connect(filter);
        filter.connect(clickGain);
        connectOut(clickGain);
        src.start(t);
        src.stop(t + 0.045);
        break;
      }

      default:
        break;
    }
  }

  /** Entering a proximity / interaction zone */
  playZoneEnter() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Warm ascending tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    const g = this._gain(0);
    g.gain.linearRampToValueAtTime(0.06, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  /** Unlocking a memory / picking up an object */
  playMemoryUnlock() {
    if (!this.initialized) return;
    this.resume();
    this.playHaptic(50);
    const t = this.ctx.currentTime;
    // Magical ascending arpeggio
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this._gain(0);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const s = t + i * 0.07;
      g.gain.linearRampToValueAtTime(0.08 - i * 0.008, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.6);
      osc.connect(g);
      g.connect(this.sfxBus);
      osc.start(s);
      osc.stop(s + 0.62);
    });
  }

  playHaptic(duration = 30) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  DIALOGUE SOUNDS — speaker-aware
  // ══════════════════════════════════════════════════════════════════

  /**
   * Typewriter tick sound, with tonal variation per speaker.
   * @param {string} [speaker=''] — 'Prawal', 'Aashna', or '' (narrator)
   */
  playTypewriterTick(speaker = '') {
    if (!this.initialized) return;
    this.resume();

    // Speaker-specific tonal profiles
    let baseFreq, filterFreq, vol;
    const s = (speaker || '').toLowerCase();
    if (s === 'prawal') {
      baseFreq = 340 + Math.random() * 80;   // warmer, lower
      filterFreq = 600;
      vol = 0.032;
    } else if (s === 'aashna') {
      baseFreq = 460 + Math.random() * 100;  // brighter, higher
      filterFreq = 900;
      vol = 0.030;
    } else {
      baseFreq = 280 + Math.random() * 60;   // narrator: soft, muted
      filterFreq = 500;
      vol = 0.022;
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this._gain(vol);
    const f = this.ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = baseFreq;
    f.type = 'bandpass';
    f.frequency.value = filterFreq;
    f.Q.value = 2;
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    osc.connect(f);
    f.connect(g);
    g.connect(this.dialogueBus);
    osc.start();
    osc.stop(t + 0.028);
  }

  /**
   * Dialogue advance sound (replacing generic click), speaker-aware.
   * @param {string} [speaker='']
   */
  playDialogueAdvance(speaker = '') {
    if (!this.initialized) return;
    this.resume();

    const s = (speaker || '').toLowerCase();
    const t = this.ctx.currentTime;
    // Use frequencies ABOVE the music filter band (office: 590 Hz, others 400-600 Hz).
    // Previous notes [330, 440] were inside the music chord spectrum and got masked.
    // These frequencies match playClick() territory (~880-1320 Hz) which is proven audible.
    let notes;
    if (s === 'prawal') {
      notes = [880, 1108];   // warm octave + minor 3rd — Prawal's warmer register
    } else if (s === 'aashna') {
      notes = [1047, 1319];  // C6 + E6 — brighter, Aashna's higher register
    } else {
      notes = [660, 880];    // narrator: gentle E5 + A5
    }

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      // Route through sfxBus (same as playClick) — guaranteed audible.
      // dialogueBus at 0.35 gain was masking the sound alongside ambient.
      const g = this._gain(0.10 - i * 0.03);
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.10 + i * 0.04);
      osc.connect(g);
      g.connect(this.sfxBus);
      osc.start(t + i * 0.03);
      osc.stop(t + 0.16);
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  TRANSITION EFFECTS
  // ══════════════════════════════════════════════════════════════════

  /** Soft whoosh for chapter transitions */
  playTransitionWhoosh() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Filtered noise sweep upward
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.5;
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(3000, t + 0.6);
    filter.frequency.exponentialRampToValueAtTime(200, t + 1.2);
    const g = this._gain(0);
    g.gain.linearRampToValueAtTime(0.06, t + 0.3);
    g.gain.linearRampToValueAtTime(0, t + 1.2);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start(t);
    src.stop(t + 1.3);
  }

  /** Emotional swell for climactic moments */
  playTransitionSwell() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Rising chord (C → E → G → C5)
    const notes = [N.C4, N.E4, N.G4, N.C5];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = this._gain(0);
      const s = t + i * 0.15;
      g.gain.linearRampToValueAtTime(0.04, s + 0.3);
      g.gain.linearRampToValueAtTime(0, s + 1.5);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sfxBus);
      osc.start(s);
      osc.stop(s + 1.6);
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  PROXIMITY AUDIO — spatial sound near objects
  // ══════════════════════════════════════════════════════════════════

  /**
   * Update proximity audio for an object.
   * Creates the source on first call; updates volume/pan thereafter.
   * @param {string} id       — unique object identifier
   * @param {number} intensity — 0 (far) to 1 (closest), controls volume
   * @param {number} pan       — -1 (left) to 1 (right), stereo position
   */
  updateProximity(id, intensity, pan) {
    if (!this.initialized || !this.ctx) return;
    if (intensity <= 0) {
      this._stopProximitySource(id);
      return;
    }
    let src = this._proximitySources.get(id);
    if (!src) {
      src = this._createProximitySource(id);
      if (!src) return;
    }
    // Smooth volume/pan ramp
    const t = this.ctx.currentTime;
    const targetVol = intensity * 0.04; // very subtle — max 0.04 at closest
    src.gain.gain.cancelScheduledValues(t);
    src.gain.gain.setValueAtTime(src.gain.gain.value, t);
    src.gain.gain.linearRampToValueAtTime(targetVol, t + 0.1);
    if (src.panner) {
      src.panner.pan.cancelScheduledValues(t);
      src.panner.pan.setValueAtTime(src.panner.pan.value, t);
      src.panner.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, pan)), t + 0.1);
    }
  }

  _createProximitySource(id) {
    if (!this.initialized) return null;
    this.resume();

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 220 + Math.random() * 60; // subtle warm hum
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const gain = this._gain(0);
    const panner = this.ctx.createStereoPanner
      ? this.ctx.createStereoPanner() : null;

    osc.connect(filter);
    if (panner) {
      filter.connect(panner);
      panner.connect(gain);
    } else {
      filter.connect(gain);
    }
    gain.connect(this.sfxBus);
    osc.start();

    const src = { osc, filter, gain, panner };
    this._proximitySources.set(id, src);
    return src;
  }

  _stopProximitySource(id) {
    const src = this._proximitySources.get(id);
    if (!src) return;
    const t = this.ctx.currentTime;
    src.gain.gain.cancelScheduledValues(t);
    src.gain.gain.setValueAtTime(src.gain.gain.value, t);
    src.gain.gain.linearRampToValueAtTime(0, t + 0.15);
    src.osc.stop(t + 0.2);
    this._proximitySources.delete(id);
  }

  _stopAllProximity() {
    for (const id of this._proximitySources.keys()) {
      this._stopProximitySource(id);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  TEXTURE SOUND SYNTHESIS PRIMITIVES
  // ══════════════════════════════════════════════════════════════════

  /** Sharp tick/click */
  _synthTick(freq, vol, duration) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = this._gain(vol);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(this.textureBus);
    osc.start();
    osc.stop(t + duration + 0.01);
  }

  /** Sustained gentle tone */
  _synthTone(freq, vol, duration) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = this._gain(0);
    g.gain.linearRampToValueAtTime(vol, t + duration * 0.2);
    g.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(g);
    g.connect(this.textureBus);
    osc.start();
    osc.stop(t + duration + 0.05);
  }

  /** Filtered noise burst (rustle, murmur) */
  _synthNoiseBurst(filterFreq, vol, duration) {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filterFreq;
    f.Q.value = 1.0;
    const g = this._gain(0);
    g.gain.linearRampToValueAtTime(vol, t + duration * 0.15);
    g.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(f);
    f.connect(g);
    g.connect(this.textureBus);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  /** Bell-like tone with harmonics */
  _synthBell(freq, vol, duration) {
    const t = this.ctx.currentTime;
    [1, 2.0, 3.0, 4.2].forEach((harmonic, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * harmonic;
      const hVol = vol / (i + 1); // harmonics decrease
      const g = this._gain(hVol);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration / (i + 1));
      osc.connect(g);
      g.connect(this.textureBus);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    });
  }

  /** Birdsong — short frequency-sweep chirps */
  _synthBird() {
    const t = this.ctx.currentTime;
    const chirps = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < chirps; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const startF = 2000 + Math.random() * 1500;
      const endF = startF + 500 + Math.random() * 800;
      const s = t + i * (0.08 + Math.random() * 0.06);
      osc.frequency.setValueAtTime(startF, s);
      osc.frequency.linearRampToValueAtTime(endF, s + 0.05);
      osc.frequency.linearRampToValueAtTime(startF + 200, s + 0.08);
      const g = this._gain(0);
      // was 0.012 — textureBus(0.30)×master(0.35) made it effectively inaudible.
      // 0.022 gives outdoor birds the spaciousness to register as present, not hinted.
      g.gain.linearRampToValueAtTime(0.022, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.1);
      osc.connect(g);
      g.connect(this.textureBus);
      osc.start(s);
      osc.stop(s + 0.12);
    }
  }

  /** Cricket chirp — rapid oscillating pulses */
  _synthCricket() {
    const t = this.ctx.currentTime;
    const pulses = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < pulses; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 4000 + Math.random() * 1000;
      const s = t + i * 0.04;
      const g = this._gain(0);
      g.gain.linearRampToValueAtTime(0.010, s + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.025);
      osc.connect(g);
      g.connect(this.textureBus);
      osc.start(s);
      osc.stop(s + 0.03);
    }
  }

  /** Water drop — descending pitch with resonance */
  _synthDrop() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const startF = 1500 + Math.random() * 1000;
    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.15);
    const g = this._gain(0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g);
    g.connect(this.textureBus);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Distant thunder — low filtered noise rumble */
  _synthThunder() {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 100;
    f.Q.value = 0.5;
    const g = this._gain(0);
    g.gain.linearRampToValueAtTime(0.025, t + 0.3);
    g.gain.linearRampToValueAtTime(0.015, t + 0.8);
    g.gain.linearRampToValueAtTime(0, t + 2.0);
    src.connect(f);
    f.connect(g);
    g.connect(this.textureBus);
    src.start(t);
    src.stop(t + 2.1);
  }

  /** Sparkle chime — high bell with shimmer */
  _synthChime() {
    const t = this.ctx.currentTime;
    const baseFreq = 1800 + Math.random() * 600;
    [1, 1.5, 2.0].forEach((h, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * h;
      const g = this._gain(0);
      const s = t + i * 0.04;
      g.gain.linearRampToValueAtTime(0.015 / (i + 1), s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.5);
      osc.connect(g);
      g.connect(this.textureBus);
      osc.start(s);
      osc.stop(s + 0.52);
    });
  }

  /** Heartbeat — double low thump */
  _synthHeartbeat() {
    const t = this.ctx.currentTime;
    [0, 0.18].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 50 + Math.random() * 10;
      const s = t + offset;
      const g = this._gain(0);
      g.gain.linearRampToValueAtTime(0.025, s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.2);
      osc.connect(g);
      g.connect(this.textureBus);
      osc.start(s);
      osc.stop(s + 0.22);
    });
  }

  /** Breath — slow filtered noise swell */
  _synthBreath(vol, duration) {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400;
    const g = this._gain(0);
    g.gain.linearRampToValueAtTime(vol, t + duration * 0.4);
    g.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(f);
    f.connect(g);
    g.connect(this.textureBus);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  // ══════════════════════════════════════════════════════════════════
  //  EMOTIONAL STINGERS — short musical phrases for key story moments
  // ══════════════════════════════════════════════════════════════════

  /**
   * Play an emotional stinger by name.
   * @param {string} name — 'discovery'|'connection'|'heartbreak'|'reunion'|'revelation'|'tenderness'|'triumph'|'farewell'
   */
  playStinger(name) {
    if (!this.initialized) return;
    this.resume();
    const fn = this._stingers[name];
    if (fn) fn.call(this);
  }

  get _stingers() {
    return {
      /** First sight — wonder + curiosity (ascending major 7th arpeggio) */
      discovery: () => {
        const t = this.ctx.currentTime;
        const notes = [N.C4, N.E4, N.G4, N.B4, N.C5];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const g = this._gain(0);
          const s = t + i * 0.12;
          g.gain.linearRampToValueAtTime(0.065 - i * 0.008, s + 0.04);
          g.gain.linearRampToValueAtTime(0, s + 0.8);
          const f = this.ctx.createBiquadFilter();
          f.type = 'lowpass'; f.frequency.value = 1200;
          osc.connect(f); f.connect(g); g.connect(this.sfxBus);
          osc.start(s); osc.stop(s + 0.85);
        });
      },

      /** Friend request accepted — hopeful rising 5th + resolve */
      connection: () => {
        const t = this.ctx.currentTime;
        const notes = [N.F3, N.A3, N.C4, N.F4, N.A4];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const g = this._gain(0);
          const s = t + i * 0.10;
          g.gain.linearRampToValueAtTime(0.055, s + 0.03);
          g.gain.linearRampToValueAtTime(0, s + 0.7);
          osc.connect(g); g.connect(this.sfxBus);
          osc.start(s); osc.stop(s + 0.75);
        });
      },

      /** Silence / separation — descending minor with fade */
      heartbreak: () => {
        const t = this.ctx.currentTime;
        const notes = [N.Eb4, N.C4, N.Ab3, N.Eb3];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const g = this._gain(0);
          const s = t + i * 0.18;
          g.gain.linearRampToValueAtTime(0.05 - i * 0.008, s + 0.05);
          g.gain.linearRampToValueAtTime(0, s + 1.2);
          const f = this.ctx.createBiquadFilter();
          f.type = 'lowpass'; f.frequency.value = 600 - i * 80;
          osc.connect(f); f.connect(g); g.connect(this.sfxBus);
          osc.start(s); osc.stop(s + 1.25);
        });
      },

      /** First meeting / paths merge — warm suspended chord resolving */
      reunion: () => {
        const t = this.ctx.currentTime;
        // Suspended 4th → major resolve
        const chord1 = [N.C4, N.F4, N.G4];
        const chord2 = [N.C4, N.E4, N.G4, N.C5];
        chord1.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine'; osc.frequency.value = freq;
          const g = this._gain(0);
          g.gain.linearRampToValueAtTime(0.05, t + 0.05);
          g.gain.linearRampToValueAtTime(0.03, t + 0.6);
          g.gain.linearRampToValueAtTime(0, t + 1.5);
          osc.connect(g); g.connect(this.sfxBus);
          osc.start(t); osc.stop(t + 1.55);
          // Glide to resolution
          const target = chord2[i] || freq;
          osc.frequency.linearRampToValueAtTime(target, t + 0.5);
        });
        // Add the high C5
        const osc = this.ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = N.C5;
        const g = this._gain(0);
        g.gain.linearRampToValueAtTime(0.04, t + 0.55);
        g.gain.linearRampToValueAtTime(0, t + 1.5);
        osc.connect(g); g.connect(this.sfxBus);
        osc.start(t + 0.45); osc.stop(t + 1.55);
      },

      /** Reading a letter / uncovering truth — gentle 2-note query + answer */
      revelation: () => {
        const t = this.ctx.currentTime;
        const pairs = [[N.D4, N.A4], [N.F4, N.C5]];
        pairs.forEach(([q, a], i) => {
          const s = t + i * 0.4;
          // Question note
          const oq = this.ctx.createOscillator();
          oq.type = 'sine'; oq.frequency.value = q;
          const gq = this._gain(0);
          gq.gain.linearRampToValueAtTime(0.05, s + 0.03);
          gq.gain.linearRampToValueAtTime(0, s + 0.35);
          oq.connect(gq); gq.connect(this.sfxBus);
          oq.start(s); oq.stop(s + 0.38);
          // Answer note
          const oa = this.ctx.createOscillator();
          oa.type = 'sine'; oa.frequency.value = a;
          const ga = this._gain(0);
          ga.gain.linearRampToValueAtTime(0.045, s + 0.18);
          ga.gain.linearRampToValueAtTime(0, s + 0.6);
          oa.connect(ga); ga.connect(this.sfxBus);
          oa.start(s + 0.15); oa.stop(s + 0.65);
        });
      },

      /** Gift / tender moment — soft lullaby-like phrase */
      tenderness: () => {
        const t = this.ctx.currentTime;
        const notes = [N.F4, N.A4, N.C5, N.A4, N.F4];
        const durations = [0.3, 0.25, 0.4, 0.25, 0.5];
        let offset = 0;
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine'; osc.frequency.value = freq;
          const g = this._gain(0);
          const s = t + offset;
          g.gain.linearRampToValueAtTime(0.045, s + 0.03);
          g.gain.linearRampToValueAtTime(0, s + durations[i]);
          const f = this.ctx.createBiquadFilter();
          f.type = 'lowpass'; f.frequency.value = 900;
          osc.connect(f); f.connect(g); g.connect(this.sfxBus);
          osc.start(s); osc.stop(s + durations[i] + 0.05);
          offset += durations[i] * 0.7;
        });
      },

      /** Wedding / engagement — triumphant fanfare */
      triumph: () => {
        const t = this.ctx.currentTime;
        const notes = [N.C4, N.E4, N.G4, N.C5, N.E5, N.G5];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine'; osc.frequency.value = freq;
          const g = this._gain(0);
          const s = t + i * 0.09;
          g.gain.linearRampToValueAtTime(0.06 - i * 0.005, s + 0.04);
          g.gain.linearRampToValueAtTime(0, s + 1.2);
          osc.connect(g); g.connect(this.sfxBus);
          osc.start(s); osc.stop(s + 1.25);
        });
        // Sustain pad underneath
        const pad = this.ctx.createOscillator();
        pad.type = 'sine'; pad.frequency.value = N.C3;
        const pg = this._gain(0);
        pg.gain.linearRampToValueAtTime(0.03, t + 0.3);
        pg.gain.linearRampToValueAtTime(0, t + 2.0);
        pad.connect(pg); pg.connect(this.sfxBus);
        pad.start(t); pad.stop(t + 2.1);
      },

      /** Chapter end / farewell — gentle descending resolution */
      farewell: () => {
        const t = this.ctx.currentTime;
        const notes = [N.G4, N.E4, N.C4, N.G3];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine'; osc.frequency.value = freq;
          const g = this._gain(0);
          const s = t + i * 0.22;
          g.gain.linearRampToValueAtTime(0.04, s + 0.05);
          g.gain.linearRampToValueAtTime(0, s + 1.0);
          const f = this.ctx.createBiquadFilter();
          f.type = 'lowpass'; f.frequency.value = 700 - i * 100;
          osc.connect(f); f.connect(g); g.connect(this.sfxBus);
          osc.start(s); osc.stop(s + 1.05);
        });
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════
  //  UTILITIES
  // ══════════════════════════════════════════════════════════════════

  /** Create a GainNode with initial value */
  _gain(value) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(value, this.ctx.currentTime);
    return g;
  }

  /** Create a shared 2-second noise buffer */
  _createNoiseBuffer(seconds) {
    const sz = this.ctx.sampleRate * seconds;
    const buf = this.ctx.createBuffer(1, sz, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
}

export const audioManager = new AudioManager();
