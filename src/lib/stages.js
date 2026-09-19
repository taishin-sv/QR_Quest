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
