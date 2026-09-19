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
    expect(applyScan(p, pr, 1).event).toBe('ignored'); // スタート前
    applyScan(p, pr, 0);
    expect(applyScan(p, pr, 3).event).toBe('ignored'); // 次ステージのカード
    expect(applyScan(p, pr, 99).event).toBe('ignored');
    expect(applyScan(p, pr, 0).event).toBe('ignored'); // スタート再読み取り
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
