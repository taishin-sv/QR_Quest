import { loadJSON, saveJSON } from './storage.js';

// 効果音はWeb Audioで合成する（音声ファイル不要・オフラインでも鳴る）
const KEY = 'advcards_sfx_v1';
let ctx = null;

export const sfxEnabled = () => (loadJSON(KEY) || { enabled: true }).enabled !== false;
export function setSfxEnabled(enabled) {
  saveJSON(KEY, { enabled });
}

// iOS/Safari などは、ユーザー操作の中で一度AudioContextを起こしておく必要がある
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {}
}

// notes: [周波数Hz, 開始秒, 長さ秒]
function tones(notes, { type = 'triangle', gain = 0.22 } = {}) {
  if (!sfxEnabled()) return;
  unlockAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.02;
  notes.forEach(([freq, start, dur]) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = t0 + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  });
}

function vibrate(pattern) {
  try {
    if (sfxEnabled() && navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {}
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, E6 = 1318.5, G6 = 1568;

export const sfx = {
  // カードを1枚みつけた（まだ全部そろっていない）: ピロリン
  found() {
    tones([[E6, 0, 0.14], [A5 * 2, 0.11, 0.22]], { type: 'sine' });
    vibrate(40);
  },
  // スタートカード: ぽーん、と明るく
  start() {
    tones([[G5, 0, 0.14], [C6, 0.12, 0.14], [E6, 0.24, 0.35]]);
    vibrate([40, 40, 40]);
  },
  // ヒントが出る（ステージクリア）: ドミソド↑
  clear() {
    tones([[C5, 0, 0.14], [E5, 0.11, 0.14], [G5, 0.22, 0.14], [C6, 0.33, 0.4]]);
    vibrate([50, 40, 50]);
  },
  // ゴール: ファンファーレ
  goal() {
    tones([[C5, 0, 0.13], [C5, 0.14, 0.13], [C5, 0.28, 0.13], [E5, 0.42, 0.3], [G5, 0.72, 0.16], [E5, 0.9, 0.12], [G5, 1.02, 0.12], [C6, 1.16, 0.7], [E6, 1.16, 0.7], [G6, 1.16, 0.7]], { gain: 0.14 });
    vibrate([80, 50, 80, 50, 200]);
  },
  // もう見つけたカード: ぽん（やさしく）
  dup() {
    tones([[392, 0, 0.18]], { type: 'sine', gain: 0.15 });
  },
};
