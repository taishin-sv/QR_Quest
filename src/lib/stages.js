// カード番号 ⇔ ステージの対応。カードは連番のまま、グルーピングだけソフトウェア側で行う。
export function totalCards(p) {
  return (p.stageCount || 1) * (p.groupSize || 1);
}

export function rangeOfStage(p, stage) {
  const g = p.groupSize || 1;
  return { from: (stage - 1) * g + 1, to: stage * g };
}

export function stageOfCard(p, cardNumber) {
  return Math.ceil(cardNumber / (p.groupSize || 1));
}
