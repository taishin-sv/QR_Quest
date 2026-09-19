import QRCode from 'qrcode';

// QRの中身は「<PREFIX><番号>」のみ。0 = スタートカード、1以降 = 連番カード。
export const QR_PREFIX = 'ADVCARD:';
// 試作で印刷済みのカード（恐竜限定だった頃）も読めるよう、旧形式も受け付ける
const LEGACY_PREFIXES = ['DINOQUEST:'];

export function encodeCard(number) {
  return QR_PREFIX + number;
}

// 読み取った文字列からカード番号を返す。対象外・不正な文字列は null
export function parseCard(text) {
  if (typeof text !== 'string') return null;
  const prefix = [QR_PREFIX, ...LEGACY_PREFIXES].find((p) => text.startsWith(p));
  if (!prefix) return null;
  const rest = text.slice(prefix.length);
  if (!/^\d+$/.test(rest)) return null;
  return parseInt(rest, 10);
}

const QR_OPTIONS = { margin: 1, color: { dark: '#111111', light: '#ffffff' } };

export function qrDataURL(text, size) {
  return QRCode.toDataURL(text, { ...QR_OPTIONS, width: size });
}
