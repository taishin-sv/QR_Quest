import { describe, it, expect } from 'vitest';
import { choiceOfStage, isChoiceStage, isCorrectCard, requiredCountInStage, cardsInStage, rangeOfStage } from './stages.js';
import { newProgress, applyScan } from './progress.js';

// あめの ひに いる ものを 5つの中から 3つ えらぶ、せんたくミッション
const OPTIONS = [
  { emoji: '☂️', label: 'かさ', correct: true },
  { emoji: '👢', label: 'ながぐつ', correct: true },
  { emoji: '🧢', label: 'ぼうし', correct: true },
  { emoji: '🕶️', label: 'サングラス', correct: false },
  { emoji: '🍉', label: 'すいか', correct: false },
];

const choicePreset = () => ({
  stageCount: 2,
  hints: [
    {}, // start
    { text: 'あめの ひに いる ものを 5つの中から 3つ えらぼう', cardCount: 5, choice: OPTIONS },
    { text: 'ごーる', cardCount: 1 },
  ],
});

describe('stages.js: せんたくミッションのヘルパー', () => {
  it('choiceOfStage / isChoiceStage', () => {
    const p = choicePreset();
    expect(isChoiceStage(p, 1)).toBe(true);
    expect(choiceOfStage(p, 1)).toEqual(OPTIONS);
    expect(isChoiceStage(p, 2)).toBe(false); // choiceフィールドが無い普通のステージ
  });
  it('choiceの長さがcardCountと合わなければ無効(普通のステージ扱い)', () => {
    const p = { stageCount: 1, hints: [{}, { cardCount: 5, choice: OPTIONS.slice(0, 2) }] };
    expect(isChoiceStage(p, 1)).toBe(false);
  });
  it('isCorrectCard: せんたくミッションでは正解の位置だけtrue', () => {
    const p = choicePreset();
    const r = rangeOfStage(p, 1); // #1-5
    expect(isCorrectCard(p, 1, r.from + 0)).toBe(true); // かさ
    expect(isCorrectCard(p, 1, r.from + 3)).toBe(false); // サングラス
  });
  it('isCorrectCard: 普通のステージ(choice無し)は範囲内すべてtrue', () => {
    const p = choicePreset();
    expect(isCorrectCard(p, 2, rangeOfStage(p, 2).from)).toBe(true);
  });
  it('requiredCountInStage: せんたくミッションは正解の数、普通は全枚数', () => {
    const p = choicePreset();
    expect(requiredCountInStage(p, 1)).toBe(3);
    expect(cardsInStage(p, 1)).toBe(5);
    expect(requiredCountInStage(p, 2)).toBe(1);
  });
});

describe('progress.js: せんたくミッションのスキャン', () => {
  it('おとりを読んでも進行は変わらず、何度でも選び直せる', () => {
    const p = choicePreset();
    const pr = newProgress();
    applyScan(p, pr, 0); // start
    const r = rangeOfStage(p, 1);
    const sunglasses = r.from + 3;
    expect(applyScan(p, pr, sunglasses)).toEqual({ event: 'wrongChoice', stage: 1, pos: 3 });
    expect(pr.found).toEqual([false, false, false, false, false]);
    // 何度読んでも同じ(記録が残らない)
    expect(applyScan(p, pr, sunglasses).event).toBe('wrongChoice');
    expect(applyScan(p, pr, r.from + 4).event).toBe('wrongChoice'); // すいか
  });
  it('正解を3つ選ぶと、おとりを挟んでもクリアできる', () => {
    const p = choicePreset();
    const pr = newProgress();
    applyScan(p, pr, 0);
    const r = rangeOfStage(p, 1);
    expect(applyScan(p, pr, r.from + 0)).toMatchObject({ event: 'found', remaining: 2 }); // かさ
    expect(applyScan(p, pr, r.from + 3).event).toBe('wrongChoice'); // サングラス(おとり)
    expect(applyScan(p, pr, r.from + 1)).toMatchObject({ event: 'found', remaining: 1 }); // ながぐつ
    expect(applyScan(p, pr, r.from + 2)).toMatchObject({ event: 'clear', stage: 1, multi: true }); // ぼうし
    expect(pr.currentStage).toBe(2);
  });
  it('正解カードを2回読むとdup', () => {
    const p = choicePreset();
    const pr = newProgress();
    applyScan(p, pr, 0);
    const r = rangeOfStage(p, 1);
    applyScan(p, pr, r.from);
    expect(applyScan(p, pr, r.from)).toEqual({ event: 'dup', stage: 1 });
  });
});
