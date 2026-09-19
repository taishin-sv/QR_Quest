import { describe, it, expect } from 'vitest';
import { normalizePreset, makeHints } from './presets.js';

describe('normalizePreset', () => {
  it('旧形式の groupSize を各ヒントの cardCount に展開する', () => {
    const p = normalizePreset({ stageCount: 2, groupSize: 3, hints: [{ text: 'a' }, { text: 'b' }, { text: 'c' }] });
    expect(p.hints.map((h) => h.cardCount)).toEqual([undefined, 3, 3]);
    expect('groupSize' in p).toBe(false);
  });
  it('既存の cardCount は保持し、groupSize なしなら1枚', () => {
    const p = normalizePreset({ hints: [{}, { cardCount: 4 }, {}] });
    expect(p.hints.map((h) => h.cardCount)).toEqual([undefined, 4, 1]);
    expect(p.stageCount).toBe(2);
  });
  it('makeHints はスタート以外に cardCount=1', () => {
    expect(makeHints(2).map((h) => h.cardCount)).toEqual([undefined, 1, 1]);
  });
});
