import { rangeOfStage, stageOfCard, cardsInStage } from './stages.js';

export function newProgress() {
  return { currentStage: 0, found: [] };
}

// currentStage に合わせて found（このステージ内で見つけた枚数の記録）を整える。
// 1枚ステージ・スタート待ちは空配列。「全部見つけ済み」のまま残った不整合な保存データは未見つけに戻す（進行不能の自己修復）。
export function normalizeProgress(p, progress) {
  const g = progress.currentStage === 0 ? 1 : cardsInStage(p, progress.currentStage);
  if (g <= 1) {
    progress.found = [];
  } else if (
    !Array.isArray(progress.found) ||
    progress.found.length !== g ||
    progress.found.every(Boolean)
  ) {
    progress.found = Array.from({ length: g }, () => false);
  }
  return progress;
}

// カードn（0=スタート）を読み取った結果を progress に反映して、何が起きたかを返す。
// event: 'ignored'(reason: notStarted|alreadyStarted|outOfRange|wrongStage) | 'start' | 'dup' | 'found' | 'clear' | 'goal'
export function applyScan(p, progress, n) {
  if (n === 0) {
    if (progress.currentStage !== 0) return { event: 'ignored', reason: 'alreadyStarted' };
    progress.currentStage = 1;
    progress.found = [];
    normalizeProgress(p, progress);
    return { event: 'start', revealIdx: 0 };
  }

  const stage = stageOfCard(p, n);
  if (progress.currentStage === 0) return { event: 'ignored', reason: 'notStarted' };
  if (stage < 1 || !p.hints[stage]) return { event: 'ignored', reason: 'outOfRange' };
  if (stage !== progress.currentStage) return { event: 'ignored', reason: 'wrongStage' };

  normalizeProgress(p, progress);
  const g = cardsInStage(p, stage);
  const pos = n - rangeOfStage(p, stage).from;
  if (progress.found[pos]) return { event: 'dup', stage };

  progress.found[pos] = true;
  const remaining = g <= 1 ? 0 : progress.found.filter((v) => !v).length;
  if (remaining > 0) return { event: 'found', stage, remaining };

  // ステージ完了: 次のステージ用に found を必ず作り直す（前ステージの「全部見つけ済み」を持ち越さない）
  progress.currentStage = stage + 1;
  progress.found = [];
  normalizeProgress(p, progress);
  return { event: stage === p.hints.length - 1 ? 'goal' : 'clear', stage, revealIdx: stage, multi: g > 1 };
}
