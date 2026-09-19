import { describe, it, expect } from 'vitest';
import { encodeCard, parseCard } from './qr.js';

describe('QR encoding', () => {
  it('新形式をエンコード/デコードできる', () => {
    expect(encodeCard(0)).toBe('ADVCARD:0');
    expect(parseCard('ADVCARD:12')).toBe(12);
  });
  it('印刷済みの旧形式(DINOQUEST:)も読める', () => {
    expect(parseCard('DINOQUEST:0')).toBe(0);
    expect(parseCard('DINOQUEST:7')).toBe(7);
  });
  it('無関係・不正な文字列は null', () => {
    expect(parseCard('https://example.com')).toBeNull();
    expect(parseCard('ADVCARD:')).toBeNull();
    expect(parseCard('ADVCARD:abc')).toBeNull();
    expect(parseCard('ADVCARD:1x')).toBeNull();
    expect(parseCard(null)).toBeNull();
  });
});
