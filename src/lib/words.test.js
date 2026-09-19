import { describe, it, expect } from 'vitest';
import { WORDS } from './words.js';

describe('WORDS', () => {
  it('ミッション向けの文言', () => {
    expect(WORDS.hint).toBe('ミッション');
    expect(WORDS.found(3, 2)).toContain('ゲット');
    expect(WORDS.wrongStage(5, '#2')).toContain('よみこんでね');
  });
});

