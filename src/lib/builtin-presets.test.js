import { describe, it, expect } from 'vitest';
import { builtinPresets, CATEGORY_ORDER } from './builtin-presets.js';
import { applyBuiltins } from './presets.js';

describe('builtinPresets', () => {
  const list = builtinPresets();
  it('IDが重複せず、カテゴリーが定義済み', () => {
    expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
    list.forEach((p) => expect(CATEGORY_ORDER).toContain(p.category));
  });
  it('構造が正しい(ゴール込みの長さ・枚数・空の文章なし)', () => {
    list.forEach((p) => {
      expect(p.hints.length).toBe(p.stageCount + 1);
      expect(p.stageCount).toBeLessThanOrEqual(15);
      expect(p.hints[0].cardCount).toBeUndefined();
      p.hints.forEach((h, i) => {
        expect(h.text.trim().length).toBeGreaterThan(0);
        if (i >= 1) expect(h.cardCount).toBeGreaterThanOrEqual(1);
      });
    });
  });
  it('「せいかつ」に朝と夜のルーティンがある', () => {
    const names = list.filter((p) => p.category === 'せいかつ').map((p) => p.name);
    expect(names).toEqual(['モーニングルーティン', 'ナイトルーティン']);
  });
});

describe('applyBuiltins', () => {
  it('新規: 全て追加され seeded に記録される', () => {
    const s = { activeId: '', presets: {} };
    expect(applyBuiltins(s)).toBe(true);
    expect(Object.keys(s.presets)).toEqual(['sample-dino', 'builtin-morning', 'builtin-night']);
    expect(s.seeded).toEqual(['sample-dino', 'builtin-morning', 'builtin-night']);
    expect(applyBuiltins(s)).toBe(false); // 2回目は変化なし
  });
  it('ユーザーが削除したものは復活しない', () => {
    const s = { activeId: '', presets: {} };
    applyBuiltins(s);
    delete s.presets['builtin-night'];
    applyBuiltins(s);
    expect(s.presets['builtin-night']).toBeUndefined();
  });
  it('手を入れていない旧サンプルは新しい内容に置き換える', () => {
    const s = {
      activeId: 'sample-dino',
      presets: { 'sample-dino': { id: 'sample-dino', name: '旧', stageCount: 1, hints: [{ text: 'たまごの あるところを さがしてね' }, { text: 'x', cardCount: 1 }] } },
    };
    applyBuiltins(s);
    expect(s.presets['sample-dino'].name).toBe('きょうりゅうミッション');
    expect(s.presets['sample-dino'].category).toBe('あそび');
  });
  it('編集済みの sample-dino は内容を保ち、categoryだけ付ける', () => {
    const s = {
      activeId: 'sample-dino',
      presets: { 'sample-dino': { id: 'sample-dino', name: '編集済み', stageCount: 1, hints: [{ text: '自分の文' }, { text: 'x', cardCount: 1 }] } },
    };
    applyBuiltins(s);
    expect(s.presets['sample-dino'].name).toBe('編集済み');
    expect(s.presets['sample-dino'].category).toBe('あそび');
  });
  it('ユーザー自作のプリセットには手を出さない', () => {
    const own = { id: 'p1', name: '自作', stageCount: 1, hints: [{ text: 'a' }, { text: 'b', cardCount: 1 }] };
    const s = { activeId: 'p1', presets: { p1: own } };
    applyBuiltins(s);
    expect(s.presets.p1).toBe(own);
    expect(own.category).toBeUndefined();
  });
});
