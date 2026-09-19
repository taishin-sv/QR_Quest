import { describe, it, expect } from 'vitest';
import { cardsInStage, totalCards, rangeOfStage, stageOfCard } from './stages.js';

// hints[0]=スタート, hints[1..4]=各ステージ（cardCount = そのステージで集める枚数）
const mixed = {
  stageCount: 4,
  hints: [{}, { cardCount: 1 }, { cardCount: 3 }, { cardCount: 2 }, { cardCount: 1 }],
};
const solo = { stageCount: 3, hints: [{}, {}, {}, {}] };

describe('stages (ヒントごとの枚数)', () => {
  it('未指定は1枚', () => {
    expect(cardsInStage(solo, 2)).toBe(1);
    expect(totalCards(solo)).toBe(3);
  });
  it('総カード枚数', () => {
    expect(totalCards(mixed)).toBe(7);
  });
  it('ステージのカード範囲', () => {
    expect(rangeOfStage(mixed, 1)).toEqual({ from: 1, to: 1 });
    expect(rangeOfStage(mixed, 2)).toEqual({ from: 2, to: 4 });
    expect(rangeOfStage(mixed, 3)).toEqual({ from: 5, to: 6 });
    expect(rangeOfStage(mixed, 4)).toEqual({ from: 7, to: 7 });
  });
  it('カード→ステージ', () => {
    expect([1, 2, 4, 5, 6, 7].map((n) => stageOfCard(mixed, n))).toEqual([1, 2, 2, 3, 3, 4]);
  });
  it('範囲外・0以下は 0', () => {
    expect(stageOfCard(mixed, 0)).toBe(0);
    expect(stageOfCard(mixed, 8)).toBe(0);
  });
  it('上限5枚・不正値は補正', () => {
    expect(cardsInStage({ hints: [{}, { cardCount: 99 }] }, 1)).toBe(5);
    expect(cardsInStage({ hints: [{}, { cardCount: 'x' }] }, 1)).toBe(1);
  });
});
