// public/icon.svg から PWA 用 PNG を生成する: npm run icons
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url));
const targets = [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['apple-touch-icon.png', 180],
];
for (const [name, size] of targets) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(new URL('../public/' + name, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  console.log('wrote', name);
}
