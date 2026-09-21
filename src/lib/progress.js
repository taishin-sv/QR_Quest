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
// event: 'ignored'(reason: notStarted|finished|outOfRange|wrongStage) | 'start' | 'dup' | 'found' | 'clear' | 'goal'
// スタートカードは、いつ読み込んでも(始める前・途中・ゴール後・壊れた状態)最初からやり直しになる。進行不能になったときの強制リセットを兼ねる。
export function applyScan(p, progress, n, now = Date.now()) {
  // 壊れた保存データ(数値でない・負数)は、最初の状態に戻す
  if (!Number.isInteger(progress.currentStage) || progress.currentStage < 0) {
    progress.currentStage = 0;
    progress.found = [];
  }
  const finished = progress.currentStage > p.stageCount;
  if (n === 0) {
    const restarted = progress.currentStage !== 0; // 始める前以外で読み込んだ = やり直し
    progress.currentStage = 1;
    progress.found = [];
    progress.updatedAt = now;
    normalizeProgress(p, progress);
    return { event: 'start', revealIdx: 0, restarted };
  }

  const stage = stageOfCard(p, n);
  if (progress.currentStage === 0) return { event: 'ignored', reason: 'notStarted' };
  if (finished) return { event: 'ignored', reason: 'finished' };
  if (stage < 1 || !p.hints[stage]) return { event: 'ignored', reason: 'outOfRange' };
  if (stage !== progress.currentStage) return { event: 'ignored', reason: 'wrongStage' };

  normalizeProgress(p, progress);
  const g = cardsInStage(p, stage);
  const pos = n - rangeOfStage(p, stage).from;
  if (progress.found[pos]) return { event: 'dup', stage };

  progress.found[pos] = true;
  progress.updatedAt = now;
  const remaining = g <= 1 ? 0 : progress.found.filter((v) => !v).length;
  if (remaining > 0) return { event: 'found', stage, remaining };

  // ステージ完了: 次のステージ用に found を必ず作り直す（前ステージの「全部見つけ済み」を持ち越さない）
  progress.currentStage = stage + 1;
  progress.found = [];
  progress.updatedAt = now;
  normalizeProgress(p, progress);
  return { event: stage === p.hints.length - 1 ? 'goal' : 'clear', stage, revealIdx: stage, multi: g > 1 };
}
