import { describe, it, expect } from 'vitest';
import { scoreVoice, prepareText } from './speech.js';

const v = (name, localService = true) => ({ name, localService });

describe('speech', () => {
  it('高品質そうな音声ほど高得点', () => {
    expect(scoreVoice(v('Microsoft Nanami Online (Natural) - Japanese (Japan)', false))).toBeGreaterThan(scoreVoice(v('Kyoko')));
    expect(scoreVoice(v('Kyoko (Enhanced)'))).toBeGreaterThan(scoreVoice(v('Kyoko')));
    expect(scoreVoice(v('Kyoko'))).toBeGreaterThan(scoreVoice(v('Kyoko Compact')));
  });
  it('空白を読点にする', () => {
    expect(prepareText('たまごの あるところを　さがしてね')).toBe('たまごの、あるところを、さがしてね');
  });
});
