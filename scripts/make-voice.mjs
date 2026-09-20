// 組み込み・基本ミッションの読み上げ音声を VOICEVOX で作り、public/voice/ に保存する。
//
// 事前準備: VOICEVOX を起動しておく（エンジンが http://127.0.0.1:50021 で待ち受ける）。ffmpeg も必要。
//
//   node scripts/make-voice.mjs --list                       声(話者)の一覧
//   node scripts/make-voice.mjs --samples 2,3,8              話者ごとの試聴用サンプルを docs/voice-samples/ に作る
//   node scripts/make-voice.mjs --speaker 8 [--speed 0.95]   全ミッションの音声を作る(public/voice/)
//   オプション: --force(作り済みも作り直す) --pause comma(空白を読点にして区切る。既定は none) --host <URL>
//
// 音声の文章の読みを直したいときは scripts/voice-overrides.json に { "画面の文章": "読ませる文章" } を書く。
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, access, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinPresets } from '../src/lib/builtin-presets.js';
import { BASIC_MISSIONS } from '../src/lib/basic-missions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'voice');
const SAMPLES = path.join(ROOT, 'docs', 'voice-samples');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : def;
};
const HOST = opt('host', 'http://127.0.0.1:50021');
const SPEED = parseFloat(opt('speed', '0.95'));
const PAUSE = opt('pause', 'none');
const FORCE = !!opt('force', false);

async function api(method, url, body) {
  const res = await fetch(HOST + url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${await res.text()}`);
  return res;
}

async function checkEngine() {
  try {
    const v = await (await api('GET', '/version')).json();
    console.log('VOICEVOX engine', v);
  } catch (e) {
    console.error('VOICEVOX に接続できません。VOICEVOX を起動してから、もう一度実行してください。\n(' + e.message + ')');
    process.exit(1);
  }
}

// 画面の文章 → 読ませる文章
const KANJI_NUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function toSpoken(text, overrides) {
  if (overrides[text]) return overrides[text];
  let t = text.replace(/\d+/g, (d) => (Number(d) <= 10 ? KANJI_NUM[Number(d)] : d)); // 「10びょう」→「十びょう」
  t = t.replace(/[ 　]+/g, PAUSE === 'comma' ? '、' : '');
  return t;
}

async function synth(text, speaker) {
  const q = await (await api('POST', `/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`)).json();
  q.speedScale = SPEED;
  q.prePhonemeLength = 0.2;
  q.postPhonemeLength = 0.3;
  const wav = Buffer.from(await (await api('POST', `/synthesis?speaker=${speaker}`, JSON.stringify(q))).arrayBuffer());
  return wav;
}

function toMp3(wav, outFile) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '64k', outFile], { input: wav });
  if (r.status !== 0) throw new Error('ffmpeg に失敗: ' + (r.stderr && r.stderr.toString()));
}

async function speakerInfo(id) {
  const list = await (await api('GET', '/speakers')).json();
  for (const s of list) for (const st of s.styles) if (st.id === id) return { id, name: s.name, style: st.name };
  throw new Error('話者ID ' + id + ' が見つかりません(--list で確認)');
}

async function exists(f) {
  try {
    await access(f);
    return true;
  } catch (e) {
    return false;
  }
}

// --- 実行 ---
await checkEngine();

if (opt('list', false)) {
  const list = await (await api('GET', '/speakers')).json();
  for (const s of list) console.log(s.name + ': ' + s.styles.map((st) => `${st.name}=${st.id}`).join(', '));
  process.exit(0);
}

let overrides = {};
try {
  overrides = JSON.parse(await readFile(path.join(ROOT, 'scripts', 'voice-overrides.json'), 'utf8'));
} catch (e) {}

if (opt('samples', false)) {
  await mkdir(SAMPLES, { recursive: true });
  const ids = String(opt('samples')).split(',').map(Number);
  const texts = [
    'たまごを だいじに あたためよう！ りょうてで たまごの かたちを つくって 10びょう じっとしてね',
    'はみがきを しよう。ピカピカに なるまで！',
  ];
  for (const id of ids) {
    const info = await speakerInfo(id);
    for (let i = 0; i < texts.length; i++) {
      const file = path.join(SAMPLES, `${info.name}-${info.style}-${i + 1}.mp3`);
      toMp3(await synth(toSpoken(texts[i], overrides), id), file);
      console.log('sample', path.relative(ROOT, file));
    }
  }
  process.exit(0);
}

const speakerArg = opt('speaker', null);
if (speakerArg === null || speakerArg === true || Number.isNaN(Number(speakerArg))) {
  console.error('--speaker <ID> を指定してください(--list で一覧、--samples で試聴)');
  process.exit(1);
}
const info = await speakerInfo(Number(speakerArg));

const texts = new Set();
builtinPresets().forEach((p) => p.hints.forEach((h) => texts.add(h.text.trim())));
BASIC_MISSIONS.forEach((m) => texts.add(m.text.trim()));

await mkdir(OUT, { recursive: true });
const files = {};
for (const text of texts) {
  const spoken = toSpoken(text, overrides);
  const name = createHash('sha1').update(`${info.id}|${SPEED}|${PAUSE}|${spoken}`).digest('hex').slice(0, 10) + '.mp3';
  const file = path.join(OUT, name);
  if (FORCE || !(await exists(file))) {
    toMp3(await synth(spoken, info.id), file);
    console.log('made', name, '←', text);
  } else {
    console.log('keep', name, '←', text);
  }
  files[text] = name;
}

const manifest = {
  speaker: info,
  speed: SPEED,
  pause: PAUSE,
  credit: `VOICEVOX:${info.name}`,
  files,
};
await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

// manifest に載っていない古い音声ファイルを片付ける
const used = new Set(Object.values(files));
for (const f of await readdir(OUT)) {
  if (f.endsWith('.mp3') && !used.has(f)) {
    await unlink(path.join(OUT, f));
    console.log('removed', f);
  }
}
console.log(`done: ${Object.keys(files).length} 件 -> public/voice/ (${manifest.credit})`);
