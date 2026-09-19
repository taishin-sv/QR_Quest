// 3枚重ねると絵が浮かび上がるマイラ(透明フィルム)用の印刷データを作る。
//   node scripts/make-overlay.mjs
// 1枚だけだと絵の断片(市松状のかけら)にしか見えず、3枚を四隅の十字と枠に合わせて重ねると完成する。
// 出力: docs/overlay/layer-1..3.png / .pdf (A4, 600dpi, 黒1色), preview.png
import sharp from 'sharp';
import { jsPDF } from 'jspdf';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/overlay');
const DPI = 600;
const PAGE = { w: 210, h: 297 }; // mm (A4縦)
const PX = { w: Math.round((PAGE.w / 25.4) * DPI), h: Math.round((PAGE.h / 25.4) * DPI) }; // 出力ピクセル数
const ART = { w: 170, h: 220 }; // 絵の領域(mm)
const ART_X = (PAGE.w - ART.w) / 2;
const ART_Y = (PAGE.h - ART.h) / 2;
const COLS = 8, ROWS = 11; // かけらの分割数
const LAYERS = 3;
const SEED = 20260919;

// --- 乱数(再現できるように固定シード) ---
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- 絵: ポップコーン（黒の太い線とベタ。マイラ印刷向けに1色） ---
const SW = 2.4; // 線の太さ(mm)
function puff(cx, cy, r) {
  const cs = [
    [cx - r * 0.7, cy + r * 0.2, r * 0.75],
    [cx + r * 0.7, cy + r * 0.2, r * 0.75],
    [cx, cy - r * 0.35, r * 0.95],
    [cx, cy + r * 0.45, r * 0.7],
  ];
  const stroke = cs.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="none" stroke="#000" stroke-width="${SW}"/>`).join('');
  const fill = cs.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr - SW / 2 + 0.05}" fill="#fff"/>`).join('');
  // ふくらみの内側の線(バターのつや)
  const shine = `<path d="M ${cx - r * 0.3} ${cy - r * 0.55} q ${r * 0.25} ${-r * 0.2} ${r * 0.5} 0" fill="none" stroke="#000" stroke-width="${SW * 0.7}" stroke-linecap="round"/>`;
  return stroke + fill + shine;
}
function artSvg() {
  const puffs = [
    [45, 62, 16], [85, 48, 19], [125, 62, 16],
    [28, 92, 13], [62, 80, 17], [108, 80, 17], [142, 92, 13],
    [48, 106, 14], [85, 100, 16], [122, 106, 14],
  ];
  const kernels = [[16, 46], [152, 36], [158, 70], [10, 76], [90, 14], [60, 24], [118, 22]]
    .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4.2" ry="3.4" fill="none" stroke="#000" stroke-width="${SW * 0.8}"/>`)
    .join('');
  // 箱（台形）と縦じま
  const top = { l: 31, r: 139, y: 120 }, bot = { l: 45, r: 125, y: 212 };
  const N = 6;
  let stripes = '';
  for (let k = 0; k < N; k += 2) {
    const x0t = top.l + ((top.r - top.l) * k) / N, x1t = top.l + ((top.r - top.l) * (k + 1)) / N;
    const x0b = bot.l + ((bot.r - bot.l) * k) / N, x1b = bot.l + ((bot.r - bot.l) * (k + 1)) / N;
    stripes += `<polygon points="${x0t},${top.y} ${x1t},${top.y} ${x1b},${bot.y} ${x0b},${bot.y}" fill="#000"/>`;
  }
  const box = `<polygon points="${top.l},${top.y} ${top.r},${top.y} ${bot.r},${bot.y} ${bot.l},${bot.y}" fill="#fff" stroke="#000" stroke-width="${SW}" stroke-linejoin="round"/>${stripes}` +
    `<polygon points="${top.l},${top.y} ${top.r},${top.y} ${bot.r},${bot.y} ${bot.l},${bot.y}" fill="none" stroke="#000" stroke-width="${SW}" stroke-linejoin="round"/>` +
    `<rect x="${top.l - 5}" y="${top.y - 11}" width="${top.r - top.l + 10}" height="12" rx="3" fill="#fff" stroke="#000" stroke-width="${SW}"/>`;
  return kernels + puffs.map((p) => puff(...p)).join('') + box;
}

// --- 各レイヤーのSVG ---
function layerSvg(layerIdx, cellOwner) {
  const cw = ART.w / COLS, ch = ART.h / ROWS;
  const rects = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (cellOwner[r * COLS + c] === layerIdx) rects.push(`<rect x="${c * cw}" y="${r * ch}" width="${cw + 0.02}" height="${ch + 0.02}"/>`);
  // 位置合わせ: 絵の枠(太線)＋四隅の十字＋ドット数でレイヤー番号
  const fx = ART_X, fy = ART_Y;
  const cross = (x, y) =>
    `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#000" stroke-width="0.5"/><path d="M ${x - 7} ${y} H ${x + 7} M ${x} ${y - 7} V ${y + 7}" stroke="#000" stroke-width="0.5"/>`;
  const off = 9;
  const marks = cross(fx - off, fy - off) + cross(fx + ART.w + off, fy - off) + cross(fx - off, fy + ART.h + off) + cross(fx + ART.w + off, fy + ART.h + off);
  const dots = Array.from({ length: layerIdx + 1 }, (_, i) => `<circle cx="${PAGE.w / 2 - 8 + i * 8}" cy="${fy - 14}" r="2.2" fill="#000"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PX.w}" height="${PX.h}" viewBox="0 0 ${PAGE.w} ${PAGE.h}">
  <rect width="${PAGE.w}" height="${PAGE.h}" fill="#fff"/>
  <defs><clipPath id="cells">${rects.join('')}</clipPath></defs>
  <g transform="translate(${fx} ${fy})"><g clip-path="url(#cells)">${artSvg()}</g>
    <rect x="0" y="0" width="${ART.w}" height="${ART.h}" fill="none" stroke="#000" stroke-width="1.6"/></g>
  ${marks}${dots}
</svg>`;
}

// --- 実行 ---
await mkdir(OUT, { recursive: true });
const rand = mulberry32(SEED);
const order = Array.from({ length: COLS * ROWS }, (_, i) => i);
for (let i = order.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [order[i], order[j]] = [order[j], order[i]];
}
const cellOwner = new Array(COLS * ROWS);
order.forEach((cell, i) => (cellOwner[cell] = i % LAYERS));

const pngs = [];
for (let l = 0; l < LAYERS; l++) {
  const svg = layerSvg(l, cellOwner);
  await writeFile(path.join(OUT, `layer-${l + 1}.svg`), svg);
  const png = await sharp(Buffer.from(svg), { density: 72 }).flatten({ background: '#fff' }).greyscale().threshold(140).png({ palette: true, colors: 2, compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(OUT, `layer-${l + 1}.png`), png);
  pngs.push(png);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  pdf.addImage(png.toString('base64'), 'PNG', 0, 0, PAGE.w, PAGE.h, undefined, 'FAST');
  await writeFile(path.join(OUT, `layer-${l + 1}.pdf`), Buffer.from(pdf.output('arraybuffer')));
  console.log('layer', l + 1, 'cells', cellOwner.filter((o) => o === l).length);
}

// プレビュー: 各レイヤー単体 と 3枚重ね(乗算)
const W = 420;
const thumb = (b) => sharp(b).resize({ width: W }).png().toBuffer();
const stackedFull = await sharp(pngs[0]).composite([{ input: pngs[1], blend: 'multiply' }, { input: pngs[2], blend: 'multiply' }]).png().toBuffer();
const thumbs = await Promise.all([...pngs, stackedFull].map(thumb));
const H = (await sharp(thumbs[0]).metadata()).height;
await sharp({ create: { width: W * 4 + 50, height: H + 20, channels: 3, background: '#ddd' } })
  .composite(thumbs.map((input, i) => ({ input, left: 10 + i * (W + 10), top: 10 })))
  .png()
  .toFile(path.join(OUT, 'preview.png'));
console.log('done ->', OUT);
