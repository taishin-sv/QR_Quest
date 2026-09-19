import '@fontsource/zen-maru-gothic/500.css';
import '@fontsource/zen-maru-gothic/700.css';
import '@fontsource/zen-maru-gothic/900.css';
import './style.css';

import jsQR from 'jsqr';
import { loadJSON, saveJSON } from './lib/storage.js';
import { ICONS, HINT_EMOJIS, uid, makeHints, newHint, normalizePreset, loadStore, saveStore as persistStore } from './lib/presets.js';
import { rangeOfStage, cardsInStage, totalCards, MAX_CARDS_PER_HINT } from './lib/stages.js';
import { encodeCard, parseCard, qrDataURL } from './lib/qr.js';
import { newProgress, normalizeProgress, applyScan } from './lib/progress.js';
import { exportPdf } from './lib/pdf.js';
import { sfx, sfxEnabled, setSfxEnabled, unlockAudio } from './lib/sfx.js';
import { speak, speechSupported, whenVoicesReady, loadVoiceSettings, saveVoiceSettings } from './lib/speech.js';

const $ = (id) => document.getElementById(id);

let store = loadStore();
const saveStore = () => persistStore(store);
const activePreset = () => store.presets[store.activeId];

// 効果音・読み上げは最初のタップで有効化（iOS等の自動再生制限のため）
document.addEventListener('pointerdown', unlockAudio, { once: true });

// ---------- NAV ----------
const navButtons = document.querySelectorAll('.nav button');
const views = document.querySelectorAll('.view');
function switchView(name) {
  const navHighlight = name === 'edit' ? 'presets' : name;
  navButtons.forEach((b) => b.classList.toggle('active', b.dataset.view === navHighlight));
  views.forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
  if (name === 'presets') renderPresets();
  if (name === 'edit') renderEdit();
  if (name === 'print') renderPreview();
  if (name === 'play') enterPlay();
  if (name !== 'play') stopCamera();
}
navButtons.forEach((btn) => btn.addEventListener('click', () => switchView(btn.dataset.view)));
$('backToPresetsBtn').addEventListener('click', () => switchView('presets'));

function refreshHeader() {
  const p = activePreset();
  $('headerIcon').textContent = p.icon || '🧭';
  $('appTitle').textContent = p.name || 'ぼうけんカード';
}

// ---------- PRESETS TAB ----------
const presetList = $('presetList');
function renderPresets() {
  presetList.innerHTML = '';
  Object.keys(store.presets).forEach((id) => {
    const p = store.presets[id];
    const isActive = id === store.activeId;
    const item = document.createElement('div');
    item.className = 'preset-item' + (isActive ? ' active' : '');

    const icon = document.createElement('div');
    icon.className = 'p-icon';
    icon.textContent = p.icon || '🧭';
    item.appendChild(icon);

    const body = document.createElement('div');
    body.className = 'p-body';
    const name = document.createElement('div');
    name.className = 'p-name';
    name.textContent = p.name || '(無題)';
    const meta = document.createElement('div');
    meta.className = 'p-meta';
    meta.textContent = 'ヒント' + p.stageCount + '個・' + 'カード' + totalCards(p) + 'まい' + (isActive ? '・つかってる' : '');
    body.appendChild(name);
    body.appendChild(meta);
    item.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'p-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'small';
    editBtn.textContent = '✏️ 編集';
    editBtn.addEventListener('click', () => {
      store.activeId = id;
      saveStore();
      refreshHeader();
      renderEdit();
      switchView('edit');
    });
    actions.appendChild(editBtn);
    if (!isActive) {
      const useBtn = document.createElement('button');
      useBtn.className = 'small';
      useBtn.textContent = '切替のみ';
      useBtn.addEventListener('click', () => {
        store.activeId = id;
        saveStore();
        refreshHeader();
        renderPresets();
      });
      actions.appendChild(useBtn);
    }
    const dupBtn = document.createElement('button');
    dupBtn.className = 'small';
    dupBtn.textContent = '複製';
    dupBtn.addEventListener('click', () => {
      const copy = JSON.parse(JSON.stringify(p));
      copy.id = uid();
      copy.name = p.name + '（コピー）';
      store.presets[copy.id] = copy;
      store.activeId = copy.id;
      saveStore();
      refreshHeader();
      renderPresets();
    });
    actions.appendChild(dupBtn);
    if (Object.keys(store.presets).length > 1) {
      const delBtn = document.createElement('button');
      delBtn.className = 'small';
      delBtn.textContent = '削除';
      delBtn.addEventListener('click', () => {
        if (!confirm('「' + p.name + '」を削除しますか？')) return;
        delete store.presets[id];
        if (store.activeId === id) store.activeId = Object.keys(store.presets)[0];
        saveStore();
        refreshHeader();
        renderPresets();
      });
      actions.appendChild(delBtn);
    }
    item.appendChild(actions);
    presetList.appendChild(item);
  });
}

$('newPresetBtn').addEventListener('click', () => {
  const np = { id: uid(), name: '新しいぼうけん', icon: '🧭', stageCount: 5, hints: makeHints(5) };
  store.presets[np.id] = np;
  store.activeId = np.id;
  saveStore();
  refreshHeader();
  renderPresets();
  switchView('edit');
});

$('exportBtn').addEventListener('click', () => {
  const payload = { advcardsPreset: 1, data: activePreset() };
  const area = $('exportArea');
  area.value = JSON.stringify(payload);
  area.style.display = 'block';
  $('copyExportBtn').style.display = 'block';
});
$('copyExportBtn').addEventListener('click', () => {
  const area = $('exportArea');
  area.select();
  try {
    navigator.clipboard.writeText(area.value).then(() => showToast('📋 コピーしました'));
  } catch (e) {
    try {
      document.execCommand('copy');
      showToast('📋 コピーしました');
    } catch (e2) {}
  }
});
$('importBtn').addEventListener('click', () => {
  const msg = $('importMsg');
  const raw = $('importArea').value.trim();
  if (!raw) {
    msg.textContent = '⚠️ テキストを貼り付けてください';
    return;
  }
  try {
    const obj = JSON.parse(raw);
    const data = obj && obj.data ? obj.data : obj;
    if (!data || !data.hints) throw new Error('bad shape');
    const np = JSON.parse(JSON.stringify(data));
    np.id = uid();
    if (!np.name) np.name = 'インポートしたプリセット';
    if (!np.icon) np.icon = '🧭';
    normalizePreset(np);
    store.presets[np.id] = np;
    store.activeId = np.id;
    saveStore();
    refreshHeader();
    msg.textContent = '✅ 「' + np.name + '」を取り込みました';
    $('importArea').value = '';
    renderPresets();
  } catch (e) {
    msg.textContent = '⚠️ 読み取れませんでした。テキストを確認してください';
  }
});

// ---------- EDIT TAB ----------
const presetNameEl = $('presetName');
const iconPicker = $('iconPicker');
const stageCountEl = $('stageCount');
const stageCountValEl = $('stageCountVal');
const stageListEl = $('stageList');
const saveBtn = $('saveBtn');
const saveMsg = $('saveMsg');

function renderEdit() {
  const p = activePreset();
  presetNameEl.value = p.name || '';
  stageCountEl.value = p.stageCount;
  stageCountValEl.textContent = p.stageCount;

  iconPicker.innerHTML = '';
  ICONS.forEach((em) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emoji-btn' + (p.icon === em ? ' sel' : '');
    b.textContent = em;
    b.addEventListener('click', () => {
      p.icon = em;
      refreshHeader();
      renderEdit();
    });
    iconPicker.appendChild(b);
  });

  const cardsPhrase = (s) => {
    const r = rangeOfStage(p, s);
    const n = r.to - r.from + 1;
    return n <= 1 ? 'カード#' + r.from : 'カード#' + r.from + '〜#' + r.to + '（' + n + 'まい全部）';
  };

  stageListEl.innerHTML = '';
  p.hints.forEach((h, idx) => {
    const isGoal = idx === p.hints.length - 1;
    const row = document.createElement('div');
    row.className = 'stage-row' + (isGoal ? ' goal' : '');

    const numBadge = document.createElement('div');
    numBadge.className = 'stage-num';
    if (isGoal) {
      numBadge.textContent = '🏆';
    } else if (idx === 0) {
      numBadge.textContent = 'START';
    } else {
      const r = rangeOfStage(p, idx);
      numBadge.textContent = r.from === r.to ? '#' + r.from : '#' + r.from + '〜' + r.to;
    }
    row.appendChild(numBadge);

    const body = document.createElement('div');
    body.className = 'stage-body';
    const labelEl = document.createElement('div');
    labelEl.className = 'stage-label';
    labelEl.textContent = isGoal
      ? 'ゴールメッセージ（' + cardsPhrase(p.hints.length - 1) + ' を見つけたとき）'
      : idx === 0
        ? 'スタート直後のヒント（つぎ：' + cardsPhrase(1) + ' をさがす）'
        : cardsPhrase(idx) + ' を見つけたときのヒント（つぎ：' + cardsPhrase(idx + 1) + ' をさがす）';
    body.appendChild(labelEl);

    if (idx >= 1) {
      const countWrap = document.createElement('div');
      countWrap.className = 'count-row';
      const countLabel = document.createElement('span');
      countLabel.textContent = 'このヒントを もらうのに あつめるカード：';
      countWrap.appendChild(countLabel);
      const sel = document.createElement('select');
      for (let n = 1; n <= MAX_CARDS_PER_HINT; n++) {
        const o = document.createElement('option');
        o.value = String(n);
        o.textContent = n + 'まい';
        sel.appendChild(o);
      }
      sel.value = String(cardsInStage(p, idx));
      sel.addEventListener('change', () => {
        h.cardCount = parseInt(sel.value, 10);
        renderEdit();
      });
      countWrap.appendChild(sel);
      body.appendChild(countWrap);
    }

    const picker = document.createElement('div');
    picker.className = 'emoji-picker';
    HINT_EMOJIS.concat(isGoal ? ['🏆', '🎉'] : []).forEach((em) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emoji-btn' + (h.emoji === em ? ' sel' : '');
      b.textContent = em;
      b.addEventListener('click', () => {
        h.emoji = em;
        renderEdit();
      });
      picker.appendChild(b);
    });
    body.appendChild(picker);

    const ta = document.createElement('textarea');
    ta.rows = 2;
    ta.placeholder = isGoal ? 'れい：やったー！さいごまで たどりついたね！' : 'れい：つめたいところをさがしてね';
    ta.value = h.text || '';
    ta.addEventListener('input', () => {
      h.text = ta.value;
    });
    body.appendChild(ta);

    row.appendChild(body);
    stageListEl.appendChild(row);
  });
}

stageCountEl.addEventListener('input', () => {
  const p = activePreset();
  const n = Math.max(1, Math.min(15, parseInt(stageCountEl.value || '1', 10)));
  stageCountValEl.textContent = n;
  const newHints = [];
  for (let i = 0; i <= n; i++) newHints.push(p.hints[i] || newHint(i));
  p.stageCount = n;
  p.hints = newHints;
  renderEdit();
});
saveBtn.addEventListener('click', () => {
  const p = activePreset();
  p.name = presetNameEl.value.trim() || p.name;
  saveStore();
  resetHunt();
  refreshHeader();
  renderPresets();
  saveMsg.textContent = '✅ ほぞんしました！';
  setTimeout(() => {
    saveMsg.textContent = '';
  }, 3000);
});

// ---------- PRINT / PDF EXPORT ----------
const previewGrid = $('previewGrid');
const printCountEl = $('printCount');

function printCount() {
  return Math.max(1, Math.min(100, parseInt(printCountEl.value || '10', 10)));
}

// 入力が連続しても最後の描画だけを反映する
let previewToken = 0;
async function renderPreview() {
  const token = ++previewToken;
  const p = activePreset();
  $('printNeed').textContent = 'いまのプリセットで つかうカード：#1〜#' + totalCards(p) + '（' + totalCards(p) + 'まい）';
  const n = printCount();
  const showN = Math.min(n, 5);
  const items = [{ label: '🚩 スタート', num: 0 }];
  for (let i = 1; i <= showN; i++) items.push({ label: '#' + i, num: i });
  const urls = await Promise.all(items.map((it) => qrDataURL(encodeCard(it.num), 180)));
  if (token !== previewToken) return;

  previewGrid.innerHTML = '';
  items.forEach((it, i) => {
    const item = document.createElement('div');
    item.className = 'print-item';
    const qrBox = document.createElement('div');
    qrBox.className = 'qrbox';
    const img = document.createElement('img');
    img.src = urls[i];
    img.width = 90;
    img.height = 90;
    img.alt = 'QR ' + it.label;
    qrBox.appendChild(img);
    item.appendChild(qrBox);
    const lbl = document.createElement('div');
    lbl.textContent = it.label;
    item.appendChild(lbl);
    previewGrid.appendChild(item);
  });
  if (n > showN) {
    const more = document.createElement('div');
    more.className = 'print-item';
    more.style.display = 'flex';
    more.style.alignItems = 'center';
    more.style.justifyContent = 'center';
    more.textContent = '…ほか' + (n - showN) + 'まい';
    previewGrid.appendChild(more);
  }
}
printCountEl.addEventListener('input', renderPreview);

$('exportPdfBtn').addEventListener('click', async () => {
  const btn = $('exportPdfBtn');
  const fill = $('pdfFill');
  const status = $('pdfStatus');
  $('pdfProgress').style.display = 'block';
  fill.style.width = '0%';
  status.textContent = '準備中...';
  btn.disabled = true;
  let lastDone = 0;
  try {
    await exportPdf(printCount(), (done, total) => {
      lastDone = done;
      fill.style.width = Math.round((done / total) * 100) + '%';
      status.textContent = done + ' / ' + total + ' まい 作成中...';
    });
    fill.style.width = '100%';
    status.textContent = '✅ 完成！ダウンロードされたPDFをコンビニ印刷などに出してください。';
  } catch (err) {
    status.textContent = err && err.cardIndex !== undefined
      ? '⚠️ 途中でエラーが発生しました（' + (err.cardIndex + 1) + 'まい目）'
      : '⚠️ PDF機能を読み込めませんでした。通信環境を確認してください。';
    console.error(err, 'lastDone=' + lastDone);
  } finally {
    btn.disabled = false;
  }
});

// ---------- PLAY ----------
const playEmpty = $('playEmpty');
const playScan = $('playScan');
const playReveal = $('playReveal');
const video = $('video');
const canvas = $('hiddenCanvas');
const camMsg = $('camMsg');
const revealEmoji = $('revealEmoji');
const revealText = $('revealText');
const revealCard = $('revealCard');
const progressPanel = $('progressPanel');
const toastEl = $('toast');

let stream = null;
let scanning = false;
let lastSpokenText = '';

const progressKey = () => 'advcards_progress_' + store.activeId;
let progress = loadJSON(progressKey()) || { currentStage: 0, found: [] };

function ensureFoundArray() {
  normalizeProgress(activePreset(), progress);
}
function resetHunt() {
  progress = newProgress();
  saveJSON(progressKey(), progress);
}

let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

// カード番号のチップ。found(i) が true のものは「みつけた」表示
function cardChips(from, to, found) {
  const wrap = document.createElement('div');
  wrap.className = 'chips';
  for (let n = from; n <= to; n++) {
    const done = !!(found && found(n - from));
    const chip = document.createElement('div');
    chip.className = 'card-chip' + (done ? ' done' : '');
    chip.textContent = (done ? '✅ ' : '') + '#' + n;
    wrap.appendChild(chip);
  }
  return wrap;
}

function renderProgressPanel() {
  progressPanel.innerHTML = '';
  const p = activePreset();
  const stage = progress.currentStage;
  if (stage > p.stageCount) {
    progressPanel.style.display = 'none';
    return;
  }
  progressPanel.style.display = 'flex';

  const title = document.createElement('div');
  title.className = 'progress-title';
  if (stage === 0) {
    title.textContent = '🚩 まずは スタートカードを よみとってね';
    progressPanel.appendChild(title);
    return;
  }

  const r = rangeOfStage(p, stage);
  const g = r.to - r.from + 1;
  title.textContent = g > 1 ? 'いま さがす カード（ぜんぶで ' + g + 'まい）' : 'いま さがす カード';
  progressPanel.appendChild(title);
  progressPanel.appendChild(cardChips(r.from, r.to, (i) => progress.found[i]));
  if (g > 1) {
    const doneCount = progress.found.filter(Boolean).length;
    const txt = document.createElement('div');
    txt.className = 'progress-text';
    txt.textContent = doneCount + ' / ' + g + ' まい みつかった';
    progressPanel.appendChild(txt);
  }
}

function enterPlay() {
  progress = loadJSON(progressKey()) || { currentStage: 0, found: [] };
  const p = activePreset();
  if (!p || !p.hints || !p.hints.length) {
    playEmpty.style.display = 'block';
    playScan.style.display = 'none';
    playReveal.style.display = 'none';
    return;
  }
  ensureFoundArray();
  playEmpty.style.display = 'none';
  playScan.style.display = 'block';
  playReveal.style.display = 'none';
  renderProgressPanel();
  startCamera();
}

function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    camMsg.textContent = '⚠️ このブラウザではカメラが使えません';
    return;
  }
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: 'environment' } })
    .then((s) => {
      stream = s;
      video.srcObject = s;
      video.setAttribute('playsinline', true);
      video.play();
      scanning = true;
      camMsg.textContent = '';
      requestAnimationFrame(scanLoop);
    })
    .catch(() => {
      camMsg.textContent = '⚠️ カメラを使うには許可が必要です';
    });
}
function stopCamera() {
  scanning = false;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

function scanLoop() {
  if (!scanning) return;
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let code = null;
    try {
      code = jsQR(imgData.data, imgData.width, imgData.height);
    } catch (e) {}
    if (code && code.data) {
      const n = parseCard(code.data);
      if (n !== null && !isRepeat(n)) handleScan(n);
    }
  }
  requestAnimationFrame(scanLoop);
}

// 同じカードをかざし続けても、通知・効果音が連発しないようにする
let lastScan = { n: null, t: 0 };
function isRepeat(n) {
  const now = Date.now();
  if (n === lastScan.n && now - lastScan.t < 2500) return true;
  lastScan = { n, t: now };
  return false;
}

function handleScan(n) {
  const p = activePreset();
  const res = applyScan(p, progress, n);
  if (res.event === 'ignored') return;
  saveJSON(progressKey(), progress);
  renderProgressPanel();

  if (res.event === 'dup') {
    sfx.dup();
    showToast('#' + n + ' は もうみつけてるよ');
    return;
  }
  if (res.event === 'found') {
    sfx.found();
    showToast('✅ #' + n + ' みつけた！ のこり' + res.remaining + 'まい');
    return;
  }
  stopCamera();
  if (res.event === 'start') {
    sfx.start();
  } else {
    showToast(res.multi ? '🎉 ぜんぶ そろった！' : '✅ みつけた！');
    if (res.event === 'goal') sfx.goal();
    else sfx.clear();
  }
  showReveal(res.revealIdx);
}

let speakTimer;
function showReveal(idx) {
  const p = activePreset();
  const h = p.hints[idx];
  const isGoal = idx === p.hints.length - 1;
  playScan.style.display = 'none';
  playReveal.style.display = 'block';
  $('backToScanBtn').style.display = 'block';
  $('restartBtn').style.display = 'none';
  revealCard.className = 'card reveal' + (isGoal ? ' goal' : '');
  revealEmoji.textContent = h.emoji || (isGoal ? '🏆' : '🧭');
  revealText.textContent = h.text && h.text.trim() ? h.text : isGoal ? 'やったー！ゴールだよ！' : 'つぎのばしょを さがしてみよう！';
  lastSpokenText = revealText.textContent;
  const nextEl = $('revealNext');
  nextEl.innerHTML = '';
  if (!isGoal) {
    const nr = rangeOfStage(p, idx + 1);
    const label = document.createElement('div');
    label.className = 'progress-title';
    label.textContent = nr.to > nr.from ? 'つぎは この カードを ぜんぶ さがそう' : 'つぎは この カードを さがそう';
    nextEl.appendChild(label);
    nextEl.appendChild(cardChips(nr.from, nr.to, null));
  }
  // 効果音が終わってから読み上げる
  clearTimeout(speakTimer);
  speakTimer = setTimeout(() => speakText(lastSpokenText), isGoal ? 1900 : idx === 0 ? 800 : 900);
  if (isGoal) {
    $('backToScanBtn').style.display = 'none';
    $('restartBtn').style.display = 'block';
  }
}

const speakText = speak;

$('speakBtn').addEventListener('click', () => {
  clearTimeout(speakTimer);
  speakText(lastSpokenText);
});
$('backToScanBtn').addEventListener('click', () => {
  playReveal.style.display = 'none';
  playScan.style.display = 'block';
  renderProgressPanel();
  startCamera();
});
$('restartBtn').addEventListener('click', () => {
  resetHunt();
  playReveal.style.display = 'none';
  playScan.style.display = 'block';
  renderProgressPanel();
  startCamera();
});

// ---------- VOICE SETTINGS ----------
const voiceSelect = $('voiceSelect');
const voiceRate = $('voiceRate');
const rateLabel = (r) => (r <= 0.75 ? 'とてもゆっくり' : r <= 0.9 ? 'ゆっくり' : r <= 1.0 ? 'ふつう' : 'はやい');

async function initVoiceSettings() {
  const settings = loadVoiceSettings();
  voiceRate.value = settings.rate;
  $('voiceRateVal').textContent = rateLabel(settings.rate);
  if (!speechSupported()) {
    $('voiceHint').textContent = '⚠️ この端末では よみあげが つかえません';
    return;
  }
  const voices = await whenVoicesReady();
  voiceSelect.innerHTML = '';
  if (!voices.length) {
    $('voiceHint').textContent = '⚠️ 日本語の声が みつかりません（端末の設定で 日本語の音声を追加できます）';
    return;
  }
  voices.forEach((v, i) => {
    const o = document.createElement('option');
    o.value = v.voiceURI;
    o.textContent = (i === 0 ? '★ ' : '') + v.name;
    voiceSelect.appendChild(o);
  });
  voiceSelect.value = voices.some((v) => v.voiceURI === settings.voiceURI) ? settings.voiceURI : voices[0].voiceURI;
  $('voiceHint').textContent = '★ は おすすめ（自動で えらばれます）';
}
voiceSelect.addEventListener('change', () => {
  saveVoiceSettings({ ...loadVoiceSettings(), voiceURI: voiceSelect.value });
  speak('こんにちは。つぎの ばしょを さがしてね');
});
voiceRate.addEventListener('input', () => {
  const rate = parseFloat(voiceRate.value);
  $('voiceRateVal').textContent = rateLabel(rate);
  saveVoiceSettings({ ...loadVoiceSettings(), rate });
});
$('voiceTestBtn').addEventListener('click', () => speak('こんにちは。たまごの、あるところを さがしてね'));

const sfxToggle = $('sfxToggle');
sfxToggle.checked = sfxEnabled();
sfxToggle.addEventListener('change', () => {
  setSfxEnabled(sfxToggle.checked);
  if (sfxToggle.checked) sfx.clear();
});

// ---------- INIT ----------
initVoiceSettings();
refreshHeader();
renderPresets();
renderEdit();
renderPreview();
