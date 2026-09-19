import { loadJSON, saveJSON } from './storage.js';

export const ICONS = ['🧭','🗺️','💎','🔑','🏆','🎁','🕵️','🔦','🪙','⭐','🌟','🎯','🐾','🦕','🏴‍☠️','🚀','🐉','🦉','🌋','🍀'];
export const HINT_EMOJIS = ['🧭','🗺️','💎','🔑','🏆','🎁','🔦','🪙','⭐','🎯','🐾','🚀','🌋','🍀','🔥','💧'];

export const STORE_KEY = 'advcards_store_v1';

export function uid() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// idx 0 はスタート直後のヒント（カード枚数なし）。idx>=1 は「そのヒントを出すために集めるカード枚数」を持つ
export function newHint(idx) {
  const h = { emoji: HINT_EMOJIS[idx % HINT_EMOJIS.length], text: '' };
  if (idx >= 1) h.cardCount = 1;
  return h;
}

export function makeHints(n) {
  const hints = [];
  for (let i = 0; i <= n; i++) hints.push(newHint(i));
  return hints;
}

function sampleDinoPreset() {
  const items = [
    ['🥚', 'たまごを だいじに あたためよう！ りょうてで たまごの かたちを つくって 10びょう じっとしてね'],
    ['🦴', 'きょうりゅうに なりきろう！ 「がおー！」と おおきな こえで ほえよう'],
    ['🌋', 'かざんが ふんか！ その ばで ジャンプ 5かい！'],
    ['💧', 'みずを ごくごく のんで ひとやすみ しよう'],
    ['🪨', 'おおきな いわを もちあげる ポーズを しよう。「うーん！」'],
    ['🏆', 'やったー！ きょうりゅうミッション だいせいこう！ おめでとう！'],
  ];
  const hints = items.map(([emoji, text], i) => {
    const h = { emoji, text };
    if (i >= 1) h.cardCount = 1;
    return h;
  });
  return {
    id: 'sample-dino',
    name: 'きょうりゅうミッション（サンプル）',
    icon: '🦕',
    stageCount: hints.length - 1,
    hints,
  };
}

// 旧形式（プリセット全体の groupSize）を、ヒントごとの cardCount に変換する。インポート時にも使う。
export function normalizePreset(p) {
  const g = Math.max(1, Math.min(5, parseInt(p.groupSize, 10) || 1));
  p.hints.forEach((h, i) => {
    if (i === 0) {
      delete h.cardCount;
    } else if (!(parseInt(h.cardCount, 10) >= 1)) {
      h.cardCount = g;
    }
  });
  p.stageCount = p.hints.length - 1;
  delete p.groupSize;
  delete p.mode; // 以前あった「あそびかた」の設定は廃止(ミッションに一本化)
  return p;
}

export function loadStore() {
  let s = loadJSON(STORE_KEY);
  if (!s || !s.presets || !Object.keys(s.presets).length) {
    const sample = sampleDinoPreset();
    s = { activeId: sample.id, presets: {} };
    s.presets[sample.id] = sample;
    saveJSON(STORE_KEY, s);
  }
  Object.values(s.presets).forEach((p) => p.hints && normalizePreset(p));
  if (!s.activeId || !s.presets[s.activeId]) {
    s.activeId = Object.keys(s.presets)[0];
  }
  return s;
}

export function saveStore(store) {
  saveJSON(STORE_KEY, store);
}
