import { describe, it, expect } from 'vitest';
import { moveHint, insertHintAfter, deleteHint } from './hints.js';

const make = () => ({
  stageCount: 3,
  hints: [
    { emoji: 'a', text: 'A' },
    { emoji: 'b', text: 'B', cardCount: 3 },
    { emoji: 'c', text: 'C', cardCount: 2 },
    { emoji: 'g', text: 'GOAL', cardCount: 1 },
  ],
});
const texts = (p) => p.hints.map((h) => h.text);

describe('moveHint', () => {
  it('文章と絵文字だけ入れ替わり、枚数は位置についたまま', () => {
    const p = make();
    expect(moveHint(p, 1, 1)).toBe(true);
    expect(texts(p)).toEqual(['A', 'C', 'B', 'GOAL']);
    expect(p.hints.map((h) => h.cardCount)).toEqual([undefined, 3, 2, 1]);
    expect(p.hints[1].emoji).toBe('c');
  });
  it('スタート行も入れ替えられる', () => {
    const p = make();
    expect(moveHint(p, 1, -1)).toBe(true);
    expect(texts(p)).toEqual(['B', 'A', 'C', 'GOAL']);
    expect(p.hints[0].cardCount).toBeUndefined();
  });
  it('端・ゴールは動かせない', () => {
    const p = make();
    expect(moveHint(p, 0, -1)).toBe(false);
    expect(moveHint(p, 2, 1)).toBe(false); // ゴールとは入れ替えない
    expect(moveHint(p, 3, -1)).toBe(false);
    expect(texts(p)).toEqual(['A', 'B', 'C', 'GOAL']);
  });
});

describe('insertHintAfter', () => {
  it('指定行の次に空の行を足し、stageCountを更新する', () => {
    const p = make();
    expect(insertHintAfter(p, 1)).toBe(2);
    expect(p.stageCount).toBe(4);
    expect(texts(p)).toEqual(['A', 'B', '', 'C', 'GOAL']);
    expect(p.hints[2].cardCount).toBe(3); // 上の行と同じ枚数
  });
  it('スタート行の次に足すときは次の行の枚数を引き継ぐ', () => {
    const p = make();
    insertHintAfter(p, 0);
    expect(p.hints[1].cardCount).toBe(3);
  });
  it('ゴールの後ろには足せない・15個が上限', () => {
    const p = make();
    expect(insertHintAfter(p, 3)).toBe(-1);
    const big = { stageCount: 15, hints: Array.from({ length: 16 }, (_, i) => ({ emoji: 'x', text: String(i), cardCount: 1 })) };
    expect(insertHintAfter(big, 2)).toBe(-1);
  });
});

describe('deleteHint', () => {
  it('行を消してstageCountを更新する', () => {
    const p = make();
    expect(deleteHint(p, 1)).toBe(true);
    expect(texts(p)).toEqual(['A', 'C', 'GOAL']);
    expect(p.stageCount).toBe(2);
  });
  it('先頭を消すと次の行がスタートになり枚数は持たない', () => {
    const p = make();
    deleteHint(p, 0);
    expect(texts(p)).toEqual(['B', 'C', 'GOAL']);
    expect(p.hints[0].cardCount).toBeUndefined();
  });
  it('ゴールと、最後の1つのミッションは消せない', () => {
    const p = make();
    expect(deleteHint(p, 3)).toBe(false);
    const one = { stageCount: 1, hints: [{ text: 'A' }, { text: 'G', cardCount: 1 }] };
    expect(deleteHint(one, 0)).toBe(false);
  });
});
