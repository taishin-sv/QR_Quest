import { getAudioContext } from './sfx.js';

// 組み込み・基本ミッションは、あらかじめ作った音声ファイル(public/voice/)で読み上げる。
// 文章が manifest にあればその音声を、なければ端末の読み上げ(speech.js)を使う。
// 音声は scripts/make-voice.mjs で VOICEVOX から作る。
let manifest = { files: {} };
let loading = null;
let current = null;
const buffers = new Map();

export function loadManifest() {
  if (!loading) {
    loading = fetch('voice/manifest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (m && m.files) manifest = m;
        return manifest;
      })
      .catch(() => manifest);
  }
  return loading;
}

export const recordedCredit = () => manifest.credit || '';
// 文章に対応する音声ファイル名(なければ '')。manifest の読み込みが済んでいないときは ''
export const recordedFile = (text) => manifest.files[String(text || '').trim()] || '';

export function stopRecorded() {
  if (current) {
    try {
      current.stop();
    } catch (e) {}
    current = null;
  }
}

async function getBuffer(file, ctx) {
  if (buffers.has(file)) return buffers.get(file);
  const res = await fetch('voice/' + file);
  const data = await res.arrayBuffer();
  const buf = await new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)); // iOS(Safari)はPromise版が不安定なため コールバック版を使う
  buffers.set(file, buf);
  return buf;
}

// 音声を再生する。再生できたら true
export async function playRecorded(file) {
  try {
    const ctx = getAudioContext();
    if (!ctx || !file) return false;
    stopRecorded();
    const buf = await getBuffer(file, ctx);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => {
      if (current === src) current = null;
    };
    current = src;
    src.start();
    return true;
  } catch (e) {
    return false;
  }
}
