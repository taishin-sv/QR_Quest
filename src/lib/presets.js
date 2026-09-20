import { loadJSON, saveJSON } from './storage.js';
import { builtinPresets, contentSig, LEGACY_SIGS } from './builtin-presets.js';

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
//  - 持っているもの: 手を入れていなければ、新しい rev の内容に置き換える（編集済みは触らない）
//  - category が無い組み込みプリセット: category を付ける
// 戻り値: { changed, replaced: 内容を置き換えたプリセットのID一覧 }
export function applyBuiltins(s) {
  let changed = false;
  const replaced = [];
  if (!Array.isArray(s.seeded)) {
    s.seeded = [];
    changed = true;
  }
  const withBase = (b) => ({ ...b, baseSig: contentSig(b) });
  builtinPresets().forEach((b) => {
    const cur = s.presets[b.id];
    if (!cur) {
      if (!s.seeded.includes(b.id)) {
        s.presets[b.id] = withBase(b);
        changed = true;
      }
    } else {
      const sigCur = contentSig(cur);
      let untouched = false;
      if (cur.baseSig) {
        untouched = sigCur === cur.baseSig;
      } else if (sigCur === contentSig(b)) {
        // 現行と同じ内容 → 署名を記録するだけ（置き換えない）
        cur.baseSig = sigCur;
        cur.rev = b.rev;
        changed = true;
      } else {
        untouched = (LEGACY_SIGS[b.id] || []).includes(sigCur);
      }
      if (untouched && (cur.rev || 0) < b.rev) {
        s.presets[b.id] = withBase(b);
        replaced.push(b.id);
        changed = true;
      }
      if (!s.presets[b.id].category) {
        s.presets[b.id].category = b.category;
        changed = true;
      }
    }
    if (!s.seeded.includes(b.id) && s.presets[b.id]) {
      s.seeded.push(b.id);
      changed = true;
    }
  });
  return { changed, replaced };
}

export function loadStore() {
  let s = loadJSON(STORE_KEY);
  let changed = false;
  if (!s || !s.presets) {
    s = { activeId: '', presets: {}, seeded: [] };
    changed = true;
  }
  const res = applyBuiltins(s);
  if (res.changed) changed = true;
  // 内容が置き換わったプリセットは、古い内容の進行状況を破棄する
  res.replaced.forEach((id) => {
    try {
      localStorage.removeItem('advcards_progress_' + id);
    } catch (e) {}
  });
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
