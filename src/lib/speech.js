import { loadJSON, saveJSON } from './storage.js';

const KEY = 'advcards_voice_v1';
// separate: ことばの区切り(空白)を読点にして区切って読むか。声によってはオフのほうが自然なイントネーションになる
const DEFAULTS = { voiceURI: '', rate: 0.85, separate: true };

export const speechSupported = () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

export function loadVoiceSettings() {
  return { ...DEFAULTS, ...(loadJSON(KEY) || {}) };
}
export function saveVoiceSettings(s) {
  saveJSON(KEY, s);
}

// 端末のOSが持つ日本語音声のうち、聞き取りやすそうなものほど高得点にする
export function scoreVoice(v) {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/natural|neural|online/.test(n)) s += 6; // Edge/Windows の高品質音声
  if (/premium|enhanced|siri|拡張|プレミアム/.test(n)) s += 5; // iOS/macOS のダウンロード音声
  if (/google/.test(n)) s += 3; // Android/Chrome
  if (/kyoko|otoya|nanami|keita|haruka|ayumi|sayaka|ichiro/.test(n)) s += 2;
  if (/compact/.test(n)) s -= 3;
  if (!v.localService) s += 1;
  return s;
}

export function getJaVoices() {
  return window.speechSynthesis
    .getVoices()
    .filter((v) => /^ja/i.test(v.lang))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

// 音声一覧は非同期に揃うことがあるので、出揃うまで(最大2秒)待つ
export function whenVoicesReady() {
  return new Promise((resolve) => {
    if (!speechSupported()) return resolve([]);
    const done = () => resolve(getJaVoices());
    if (window.speechSynthesis.getVoices().length) return done();
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 2000);
  });
}

// ひらがなの分かち書き（空白）を読点にして、区切りをはっきり読ませる
export function prepareText(text) {
  return text.replace(/[ 　]+/g, '、');
}

export function speak(text) {
  try {
    if (!speechSupported()) return;
    const settings = loadVoiceSettings();
    const voices = getJaVoices();
    const voice = voices.find((v) => v.voiceURI === settings.voiceURI) || voices[0];
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(settings.separate === false ? text : prepareText(text));
    u.lang = 'ja-JP';
    if (voice) u.voice = voice;
    u.rate = settings.rate;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}
