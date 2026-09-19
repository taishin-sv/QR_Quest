import { describe, it, expect } from 'vitest';
import { WORDS } from './words.js';
import { pickExample, MISSION_EXAMPLES } from './missions.js';

describe('WORDS', () => {
  it('ミッション向けの文言', () => {
    expect(WORDS.hint).toBe('ミッション');
    expect(WORDS.found(3, 2)).toContain('ゲット');
    expect(WORDS.wrongStage(5, '#2')).toContain('よみこんでね');
  });
});

describe('pickExample', () => {
  it('使用済みを避ける', () => {
    const used = MISSION_EXAMPLES.slice(1).map((e) => e.text);
    expect(pickExample(used)).toEqual(MISSION_EXAMPLES[0]);
  });
  it('全部使用済みでも返す', () => {
    expect(pickExample(MISSION_EXAMPLES.map((e) => e.text))).toBeTruthy();
  });
});
