import { loadJSON, saveJSON } from './storage.js';

// 効果音はWeb Audioで合成する（音声ファイル不要・オフラインでも鳴る）
const KEY = 'advcards_sfx_v1';
let ctx = null;

export const sfxEnabled = () => (loadJSON(KEY) || { enabled: true }).enabled !== false;
export function setSfxEnabled(enabled) {
  saveJSON(KEY, { enabled });
}

// iOSは、Web Audio(効果音)が「消音(サイレント)モード」や、カメラ・読み上げによる音声セッションの切り替えで無音になる一方、
// 読み上げは鳴る、ということが起きる。次の2つで「再生用」の音声セッションに固定する。
//  1) Audio Session API(iOS 16.4+): navigator.audioSession.type = 'playback'
//  2) 無音のaudio要素をループ再生しておく（古いiOS向けの定番の回避策。ユーザー操作の中で開始する）
let keepAlive = null;
function silentWavUrl() {
  const n = 800; // 8kHz × 0.1秒
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  w(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, i % 2 ? 1 : -1, true); // ほぼ無音(±1)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
function keepAudioSession() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch (e) {}
  try {
    if (!keepAlive) {
      keepAlive = new Audio(silentWavUrl());
      keepAlive.loop = true;
      keepAlive.setAttribute('playsinline', '');
    }
    if (keepAlive.paused) keepAlive.play().catch(() => {});
  } catch (e) {}
}

// iOS/Safari などは、ユーザー操作の中で一度AudioContextを起こしておく必要がある
export function unlockAudio() {
  try {
    keepAudioSession();
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state !== 'running') ctx.resume();
  } catch (e) {}
}

// notes: [周波数Hz, 開始秒, 長さ秒]
function tones(notes, { type = 'triangle', gain = 0.22 } = {}) {
  if (!sfxEnabled()) return;
  unlockAudio();
  if (!ctx) return;
  // 動いていない(suspended/interrupted)ときは、再開できてから鳴らす（間に合わなければ諦める）
  if (ctx.state !== 'running') {
    const c = ctx;
    const started = Date.now();
    Promise.resolve(c.resume())
      .then(() => {
        if (c.state === 'running' && Date.now() - started < 1500) play(notes, type, gain);
      })
      .catch(() => {});
    return;
  }
  play(notes, type, gain);
}

function play(notes, type, gain) {
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

// 読み取れた瞬間の「ピッ」。どのカードでも最初に鳴らして、結果の音の前に「読み取れた」ことをはっきり伝える
const ACK = [1568, 0, 0.09];
const ACK_GAP = 0.22; // ピッのあと、結果の音を始めるまでの間
const shift = (notes, sec) => notes.map(([f, t, d]) => [f, t + sec, d]);
const withAck = (notes) => [ACK, ...shift(notes, ACK_GAP)];

export const sfx = {
  // カードを1枚みつけた（まだ全部そろっていない）: ピッ、ピロリン を2回くりかえす（気づきやすいように）
  found() {
    const once = [[E6, 0, 0.14], [A5 * 2, 0.11, 0.22]];
    tones([ACK, ...shift(once, ACK_GAP), ...shift(once, ACK_GAP + 0.55)], { type: 'sine', gain: 0.32 });
    vibrate([40, 120, 40]);
  },
  // スタートカード: ピッ、ぽーん と明るく
  start() {
    tones(withAck([[G5, 0, 0.14], [C6, 0.12, 0.14], [E6, 0.24, 0.35]]), { gain: 0.3 });
    vibrate([40, 40, 40]);
  },
  // ヒントが出る（ステージクリア）: ピッ、ドミソド↑
  clear() {
    tones(withAck([[C5, 0, 0.14], [E5, 0.11, 0.14], [G5, 0.22, 0.14], [C6, 0.33, 0.4]]), { gain: 0.32 });
    vibrate([50, 40, 50]);
  },
  // ゴール: ピッ、ファンファーレ
  goal() {
    tones(
      withAck([[C5, 0, 0.13], [C5, 0.14, 0.13], [C5, 0.28, 0.13], [E5, 0.42, 0.3], [G5, 0.72, 0.16], [E5, 0.9, 0.12], [G5, 1.02, 0.12], [C6, 1.16, 0.7], [E6, 1.16, 0.7], [G6, 1.16, 0.7]]),
      { gain: 0.2 },
    );
    vibrate([80, 50, 80, 50, 200]);
  },
  // もう見つけたカード: ぽん（やさしく）
  dup() {
    tones([[392, 0, 0.18]], { type: 'sine', gain: 0.18 });
  },
};
