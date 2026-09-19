import { newHint } from './presets.js';

// エディタでの並べ替え・挿入・削除。hints[0]=スタート直後 / hints[1..]=各ステージ / 最後=ゴール。
// ゴール(最後の行)は動かさず、削除もしない。カードの枚数(cardCount)は「行の位置」についたままにして、
// 並べ替えでは文章と絵文字だけを入れ替える。

export const MAX_STAGES = 15;

const lastMission = (p) => p.hints.length - 2; // ゴールの1つ前

function syncStageCount(p) {
  p.stageCount = p.hints.length - 1;
  p.hints.forEach((h, i) => {
    if (i === 0) delete h.cardCount;
    else if (!(h.cardCount >= 1)) h.cardCount = 1;
  });
}

// idx の行を dir(-1:上 / +1:下) に動かす。動かせたら true
export function moveHint(p, idx, dir) {
  const to = idx + dir;
  if (idx < 0 || idx > lastMission(p) || to < 0 || to > lastMission(p)) return false;
  const a = p.hints[idx];
  const b = p.hints[to];
  [a.emoji, b.emoji] = [b.emoji, a.emoji];
  [a.text, b.text] = [b.text, a.text];
  return true;
}

// idx の次に空の行を1つ足す(ゴールの後ろには足せない)。足せたら新しい行の位置を返す
export function insertHintAfter(p, idx) {
  if (idx < 0 || idx > lastMission(p) || p.stageCount >= MAX_STAGES) return -1;
  const src = p.hints[idx];
  const h = newHint(idx + 1);
  h.cardCount = src.cardCount >= 1 ? src.cardCount : (p.hints[idx + 1] && p.hints[idx + 1].cardCount) || 1;
  p.hints.splice(idx + 1, 0, h);
  syncStageCount(p);
  return idx + 1;
}

// idx の行を消す。最後のミッションは消せない・ゴールは消せない
export function deleteHint(p, idx) {
  if (idx < 0 || idx > lastMission(p) || p.stageCount <= 1) return false;
  p.hints.splice(idx, 1);
  syncStageCount(p);
  return true;
}
