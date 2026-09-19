import { describe, it, expect } from 'vitest';
import { words, modeOf } from './words.js';
import { pickExample, MISSION_EXAMPLES } from './missions.js';

describe('words', () => {
  it('mode 未指定は たからさがし', () => {
    expect(modeOf({})).toBe('search');
    expect(modeOf({ mode: 'mission' })).toBe('mission');
    expect(words({}).hint).toBe('ヒント');
    expect(words({ mode: 'mission' }).hint).toBe('ミッション');
  });
  it('ミッションでは「ゲット」表現', () => {
    expect(words({ mode: 'mission' }).found(3, 2)).toContain('ゲット');
    expect(words({}).found(3, 2)).toContain('みつけた');
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
