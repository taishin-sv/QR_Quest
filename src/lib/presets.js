import { loadJSON, saveJSON } from './storage.js';
import { builtinPresets, OLD_SAMPLE_FIRST_TEXTS } from './builtin-presets.js';

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

// 組み込みプリセットを反映する。
//  - まだ持っていないもの: 追加する（一度追加したものは seeded に記録し、ユーザーが削除しても復活させない）
//  - 以前のサンプル(恐竜)で手を入れていないもの: 新しい内容に置き換える
//  - category が無い組み込みプリセット: category を付ける
// 変更があれば true
export function applyBuiltins(s) {
  let changed = false;
  if (!Array.isArray(s.seeded)) {
    s.seeded = [];
    changed = true;
  }
  builtinPresets().forEach((b) => {
    const cur = s.presets[b.id];
    if (cur) {
      if (b.id === 'sample-dino' && cur.hints && cur.hints[0] && OLD_SAMPLE_FIRST_TEXTS.includes(cur.hints[0].text)) {
        s.presets[b.id] = b;
        changed = true;
      } else if (!cur.category) {
        cur.category = b.category;
        changed = true;
      }
    } else if (!s.seeded.includes(b.id)) {
      s.presets[b.id] = b;
      changed = true;
    }
    if (!s.seeded.includes(b.id) && s.presets[b.id]) {
      s.seeded.push(b.id);
      changed = true;
    }
  });
  return changed;
}

export function loadStore() {
  let s = loadJSON(STORE_KEY);
  let changed = false;
  if (!s || !s.presets) {
    s = { activeId: '', presets: {}, seeded: [] };
    changed = true;
  }
  if (applyBuiltins(s)) changed = true;
  Object.values(s.presets).forEach((p) => p.hints && normalizePreset(p));
  if (!s.activeId || !s.presets[s.activeId]) {
    s.activeId = Object.keys(s.presets)[0];
    changed = true;
  }
  if (changed) saveJSON(STORE_KEY, s);
  return s;
}

export function saveStore(store) {
  saveJSON(STORE_KEY, store);
}
