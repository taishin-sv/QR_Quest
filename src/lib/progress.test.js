import { describe, it, expect } from 'vitest';
import { newProgress, normalizeProgress, applyScan } from './progress.js';

const preset = (counts) => ({
  stageCount: counts.length,
  hints: [{}, ...counts.map((c) => ({ cardCount: c }))],
});

describe('applyScan', () => {
  it('同じ複数枚数のステージが連続しても、次のステージに進める（進行不能バグ）', () => {
    const p = preset([3, 3, 1]); // #1-3, #4-6, #7
    const pr = newProgress();
    expect(applyScan(p, pr, 0).event).toBe('start');
    expect(applyScan(p, pr, 1).event).toBe('found');
    expect(applyScan(p, pr, 3).event).toBe('found');
    expect(applyScan(p, pr, 2)).toMatchObject({ event: 'clear', stage: 1 });
    expect(pr.currentStage).toBe(2);
    expect(pr.found).toEqual([false, false, false]);
    expect(applyScan(p, pr, 4)).toMatchObject({ event: 'found', remaining: 2 });
    expect(applyScan(p, pr, 4).event).toBe('dup');
    applyScan(p, pr, 5);
    expect(applyScan(p, pr, 6)).toMatchObject({ event: 'clear', stage: 2 });
    expect(applyScan(p, pr, 7).event).toBe('goal');
  });

  it('枚数が違うステージ・1枚ステージの混在', () => {
    const p = preset([1, 2, 1]);
    const pr = newProgress();
    applyScan(p, pr, 0);
    expect(applyScan(p, pr, 1).event).toBe('clear');
    expect(applyScan(p, pr, 2).event).toBe('found');
    expect(applyScan(p, pr, 3).event).toBe('clear');
    expect(applyScan(p, pr, 4).event).toBe('goal');
  });

  it('今のステージ以外・範囲外のカードは無視', () => {
    const p = preset([2, 2]);
    const pr = newProgress();
    expect(applyScan(p, pr, 1)).toEqual({ event: 'ignored', reason: 'notStarted' }); // スタート前
    applyScan(p, pr, 0);
    expect(applyScan(p, pr, 3)).toEqual({ event: 'ignored', reason: 'wrongStage' }); // 次ステージのカード
    expect(applyScan(p, pr, 99)).toEqual({ event: 'ignored', reason: 'outOfRange' });
  });
});

describe('ゴール済みの状態(進行不能の再発防止)', () => {
  it('ゴール済みでスタートカードを読むと、最初からやり直せる', () => {
    const p = preset([1, 1]);
    const pr = { currentStage: 3, found: [] }; // stageCount=2 なので、3 はゴール済み
    expect(applyScan(p, pr, 0)).toMatchObject({ event: 'start', restarted: true });
    expect(pr.currentStage).toBe(1);
    expect(applyScan(p, pr, 1).event).toBe('clear');
  });
  it('ゴール済みで他のカードを読むと「おわったよ」', () => {
    const p = preset([1, 1]);
    const pr = { currentStage: 3, found: [] };
    expect(applyScan(p, pr, 1)).toEqual({ event: 'ignored', reason: 'finished' });
  });
  it('プリセットを直してミッション数が減り、保存済みの進行が範囲外になっても、スタートカードでやり直せる', () => {
    const p = preset([1, 1]);
    const pr = { currentStage: 8, found: [] };
    expect(applyScan(p, pr, 0).event).toBe('start');
  });
});

describe('スタートカードは、いつ読み込んでも最初からやり直し', () => {
  it('進行中(カードを何枚か読んだ途中)でも、最初に戻る', () => {
    const p = preset([3, 1]);
    const pr = newProgress();
    applyScan(p, pr, 0);
    applyScan(p, pr, 1);
    applyScan(p, pr, 2); // 1ステージ目の途中(3枚中2枚)
    expect(applyScan(p, pr, 0)).toMatchObject({ event: 'start', restarted: true });
    expect(pr.currentStage).toBe(1);
    expect(pr.found).toEqual([false, false, false]);
  });
  it('最初の読み込みは「やり直し」ではない', () => {
    expect(applyScan(preset([1]), newProgress(), 0)).toMatchObject({ event: 'start', restarted: false });
  });
  it('どの時刻・状態でも同じ(古い進行でも新しい進行でも)', () => {
    const p = preset([1, 1, 1]);
    const HOUR = 60 * 60 * 1000;
    [1000 + HOUR, 1000 + 30 * HOUR].forEach((now) => {
      const pr = { currentStage: 2, found: [], updatedAt: 1000 };
      expect(applyScan(p, pr, 0, now).event).toBe('start');
      expect(pr.currentStage).toBe(1);
    });
  });
});

describe('進行不能からの復帰', () => {
  it('スキャンするたびに更新時刻が進む', () => {
    const p = preset([2, 1]);
    const pr = newProgress();
    applyScan(p, pr, 0, 5000);
    expect(pr.updatedAt).toBe(5000);
    applyScan(p, pr, 1, 9000);
    expect(pr.updatedAt).toBe(9000);
  });
  it('壊れた進行状況(数値でない・負数)は最初に戻る', () => {
    const p = preset([1, 1]);
    const bad = { currentStage: 'x', found: 'y' };
    expect(applyScan(p, bad, 0).event).toBe('start');
    const neg = { currentStage: -3, found: [] };
    expect(applyScan(p, neg, 0).event).toBe('start');
  });
});

describe('normalizeProgress (自己修復)', () => {
  it('全部見つけ済みで止まった保存データを未見つけに戻す', () => {
    const p = preset([3, 3]);
    const stuck = { currentStage: 2, found: [true, true, true] };
    normalizeProgress(p, stuck);
    expect(stuck.found).toEqual([false, false, false]);
  });
  it('途中経過は保持する', () => {
    const p = preset([3]);
    const pr = { currentStage: 1, found: [true, false, false] };
    normalizeProgress(p, pr);
    expect(pr.found).toEqual([true, false, false]);
  });
});
