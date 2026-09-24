// カード番号 ⇔ ステージの対応。カードは連番のまま、グルーピングだけソフトウェア側で行う。
// ステージ s (1..stageCount) を進めるのに集めるカード枚数は hints[s].cardCount（未指定なら1枚）。
export const MAX_CARDS_PER_HINT = 5;

export function cardsInStage(p, stage) {
  const h = p.hints && p.hints[stage];
  const n = h && parseInt(h.cardCount, 10);
  return n >= 1 ? Math.min(n, MAX_CARDS_PER_HINT) : 1;
}

export function totalCards(p) {
  let sum = 0;
  for (let s = 1; s <= p.stageCount; s++) sum += cardsInStage(p, s);
  return sum;
}

export function rangeOfStage(p, stage) {
  let from = 1;
  for (let s = 1; s < stage; s++) from += cardsInStage(p, s);
  return { from, to: from + cardsInStage(p, stage) - 1 };
}

// 該当ステージが無ければ 0
export function stageOfCard(p, cardNumber) {
  if (!(cardNumber >= 1)) return 0;
  let upTo = 0;
  for (let s = 1; s <= p.stageCount; s++) {
    upTo += cardsInStage(p, s);
    if (cardNumber <= upTo) return s;
  }
  return 0;
}

// ---------- せんたくミッション（5枚のうち条件に合う枚数だけを選ぶ） ----------
// hints[stage].choice があれば、そのステージは「選ぶ」ミッション。
// choice は cardsInStage(p, stage) と同じ長さの配列で、各要素が { emoji, label, correct } を持つ
// （position は 0 始まり。絶対カード番号は rangeOfStage(p, stage).from + position）。
// correct でない位置（おとり）をスキャンしても、正解として数えない（何度でも選び直せる）。

export function choiceOfStage(p, stage) {
  const h = p.hints && p.hints[stage];
  const c = h && h.choice;
  return Array.isArray(c) && c.length === cardsInStage(p, stage) ? c : null;
}

export function isChoiceStage(p, stage) {
  return !!choiceOfStage(p, stage);
}

// カード番号(そのステージ内の絶対番号)が、正解として数えるものかどうか。
// せんたくミッションでなければ、範囲内のカードはすべて正解（従来どおり）。
export function isCorrectCard(p, stage, cardNumber) {
  const choice = choiceOfStage(p, stage);
  if (!choice) return true;
  const pos = cardNumber - rangeOfStage(p, stage).from;
  return !!(choice[pos] && choice[pos].correct);
}

// そのステージを終えるのに必要な「正解」の枚数（せんたくミッションでなければ全枚数）
export function requiredCountInStage(p, stage) {
  const choice = choiceOfStage(p, stage);
  return choice ? choice.filter((c) => c.correct).length : cardsInStage(p, stage);
}
