import { loadJSON, saveJSON } from './storage.js';

export const ICONS = ['🧭','🗺️','💎','🔑','🏆','🎁','🕵️','🔦','🪙','⭐','🌟','🎯','🐾','🦕','🏴‍☠️','🚀','🐉','🦉','🌋','🍀'];
export const HINT_EMOJIS = ['🧭','🗺️','💎','🔑','🏆','🎁','🔦','🪙','⭐','🎯','🐾','🚀','🌋','🍀','🔥','💧'];

export const STORE_KEY = 'advcards_store_v1';

export function uid() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function makeHints(n) {
  const hints = [];
  for (let i = 0; i <= n; i++) hints.push({ emoji: HINT_EMOJIS[i % HINT_EMOJIS.length], text: '' });
  return hints;
}

function sampleDinoPreset() {
  const texts = [
    'たまごの あるところを さがしてね',
    'つめたいところに かくれているよ',
    'たかいところを みてみよう',
    'みずの ちかくを さがしてみて',
    'まるい ものの なかを のぞいてみて',
    'やったー！さいごまで たどりついたね！たからものは ひみつきちの中だよ！',
  ];
  const emojis = ['🥚', '🦴', '🌋', '💧', '🪨', '🏆'];
  const hints = texts.map((text, i) => ({ emoji: emojis[i], text }));
  return {
    id: 'sample-dino',
    name: 'きょうりゅうたんけん（サンプル）',
    icon: '🦕',
    stageCount: hints.length - 1,
    groupSize: 1,
    hints,
  };
}

export function loadStore() {
  let s = loadJSON(STORE_KEY);
  if (!s || !s.presets || !Object.keys(s.presets).length) {
    const sample = sampleDinoPreset();
    s = { activeId: sample.id, presets: {} };
    s.presets[sample.id] = sample;
    saveJSON(STORE_KEY, s);
  }
  if (!s.activeId || !s.presets[s.activeId]) {
    s.activeId = Object.keys(s.presets)[0];
  }
  return s;
}

export function saveStore(store) {
  saveJSON(STORE_KEY, store);
}
