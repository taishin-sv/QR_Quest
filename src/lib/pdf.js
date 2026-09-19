import { encodeCard, qrDataURL } from './qr.js';

// はがきサイズ(100x148mm)のラミネートポーチに収まる寸法。シール部の余裕として各辺2〜4mm小さくしてある。
// CSS(.pdf-card)の寸法と一致させること。
export const CARD_MM = { w: 94, h: 140 };

export function pdfCardHostEl() {
  return document.getElementById('pdfCardHost');
}

export async function buildCardEl(number, isStart) {
  const el = document.createElement('div');
  el.className = 'pdf-card' + (isStart ? ' start' : '');

  const band = document.createElement('div');
  band.className = 'band';
  const bandSpan = document.createElement('span');
  bandSpan.textContent = isStart ? 'ぼうけん すたーと' : 'ぼうけんカード';
  band.appendChild(bandSpan);
  el.appendChild(band);

  const badge = document.createElement('div');
  badge.className = 'badge';
  if (isStart) {
    badge.textContent = '🚩';
    badge.style.fontSize = '13mm';
  } else {
    const s = String(number);
    badge.textContent = s;
    badge.style.fontSize = s.length >= 3 ? '9mm' : s.length === 2 ? '12mm' : '15mm';
  }
  el.appendChild(badge);

  const qrwrap = document.createElement('div');
  qrwrap.className = 'qrwrap';
  const img = document.createElement('img');
  img.src = await qrDataURL(encodeCard(isStart ? 0 : number), 300);
  qrwrap.appendChild(img);
  el.appendChild(qrwrap);

  const cap = document.createElement('div');
  cap.className = 'cap';
  cap.textContent = isStart ? 'これでぼうけん かいし！' : 'カメラで よみこんでね！';
  el.appendChild(cap);

  const trail = document.createElement('div');
  trail.className = 'trail';
  trail.textContent = '👣 👣 👣';
  el.appendChild(trail);

  return el;
}

// 切り抜き用のトンボ（各カード四隅の外側に短い線）
function drawCropMarks(doc, x, y, w, h) {
  const off = 1, len = 2;
  [[x, -1], [x + w, 1]].forEach(([cx, sx]) => {
    [[y, -1], [y + h, 1]].forEach(([cy, sy]) => {
      doc.line(cx + sx * off, cy, cx + sx * (off + len), cy);
      doc.line(cx, cy + sy * off, cx, cy + sy * (off + len));
    });
  });
}

// n枚(+スタート1枚)のカードをA4 2列×2行(1ページ4枚)でPDF化してダウンロードする。
// onProgress(done, total) が各カード完了ごとに呼ばれる。
export async function exportPdf(n, onProgress) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  await document.fonts.ready;

  const items = [{ num: 0, start: true }];
  for (let i = 1; i <= n; i++) items.push({ num: i, start: false });
  const total = items.length;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, pageH = 297;
  const cols = 2, rows = 2, gapX = 8, gapY = 6;
  const cardW = CARD_MM.w, cardH = CARD_MM.h;
  const marginX = (pageW - cols * cardW - (cols - 1) * gapX) / 2;
  const marginY = (pageH - rows * cardH - (rows - 1) * gapY) / 2;
  const perPage = cols * rows;
  doc.setDrawColor(110);
  doc.setLineWidth(0.15);
  const host = pdfCardHostEl();

  try {
    for (let i = 0; i < total; i++) {
      const el = await buildCardEl(items[i].num, items[i].start);
      host.innerHTML = '';
      host.appendChild(el);
      let canvasEl;
      try {
        canvasEl = await html2canvas(el, { scale: 3, backgroundColor: null });
      } catch (err) {
        const e = new Error('card render failed');
        e.cardIndex = i;
        throw e;
      }
      const posInPage = i % perPage;
      if (i > 0 && posInPage === 0) doc.addPage();
      const col = posInPage % cols, row = Math.floor(posInPage / cols);
      const x = marginX + col * (cardW + gapX);
      const y = marginY + row * (cardH + gapY);
      doc.addImage(canvasEl.toDataURL('image/png'), 'PNG', x, y, cardW, cardH, undefined, 'FAST');
      drawCropMarks(doc, x, y, cardW, cardH);
      onProgress(i + 1, total);
      await new Promise((r) => setTimeout(r, 10));
    }
    doc.save('bouken-cards.pdf');
  } finally {
    host.innerHTML = '';
  }
}
