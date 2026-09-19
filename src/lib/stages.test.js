import { describe, it, expect } from 'vitest';
import { totalCards, rangeOfStage, stageOfCard } from './stages.js';

describe('stages', () => {
  const solo = { stageCount: 5, groupSize: 1 };
  const coop = { stageCount: 4, groupSize: 3 };
  it('総カード枚数', () => {
    expect(totalCards(solo)).toBe(5);
    expect(totalCards(coop)).toBe(12);
  });
  it('ステージのカード範囲', () => {
    expect(rangeOfStage(solo, 2)).toEqual({ from: 2, to: 2 });
    expect(rangeOfStage(coop, 1)).toEqual({ from: 1, to: 3 });
    expect(rangeOfStage(coop, 2)).toEqual({ from: 4, to: 6 });
  });
  it('カード→ステージ', () => {
    expect(stageOfCard(coop, 3)).toBe(1);
    expect(stageOfCard(coop, 4)).toBe(2);
    expect(stageOfCard(solo, 5)).toBe(5);
  });
});
