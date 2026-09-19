# ぼうけんカード メーカー

QRコードを使った、親子・友達同士で遊ぶ宝探し（脱出ゲーム風）アプリ。
設計意図・経緯は [`docs/SPEC.md`](./docs/SPEC.md)（旧・単一HTML時代の引き継ぎ書）を参照。

## 開発

```bash
npm install
npm run dev       # 開発サーバー (http://localhost:5173)
npm test          # ユニットテスト (vitest)
npm run build     # dist/ に本番ビルド（Service Worker含む）
npm run preview   # ビルド結果を確認 (http://localhost:4173)
npm run icons     # public/icon.svg から PWA アイコンPNGを再生成
```

カメラ(QRスキャン)は `https://` または `localhost` でのみ動作します。

## 構成

- `src/main.js` — UI（プリセット/編集/いんさつ/たんけん）
- `src/lib/qr.js` — QRの中身（`ADVCARD:<番号>`）のエンコード/パース。旧 `DINOQUEST:` も読み取り可
- `src/lib/stages.js` — カード番号⇔ステージの計算
- `src/lib/presets.js` / `storage.js` — プリセットのlocalStorage永続化
- `src/lib/pdf.js` — html2canvas + jsPDF による PDF書き出し。カードは縦長94×140mm（はがきサイズのラミネートに収まる）、A4に4枚/ページ＋トンボ。初回利用時に遅延ロード

## オフライン / PWA

依存ライブラリ・フォント(Zen Maru Gothic)はすべてnpmでバンドル済み。`vite-plugin-pwa` が
全アセットをプリキャッシュ（約7MB）するので、**初回に一度開けば以降は完全オフラインで動作**し、
ホーム画面に追加できます。更新は次回オンライン時に自動反映されます。

## デプロイ

### GitHub Pages（自動）

`main` にプッシュすると GitHub Actions（`.github/workflows/deploy.yml`）がテスト→ビルド→公開まで行います。
初回のみ、リポジトリの **Settings → Pages → Source を「GitHub Actions」** に設定してください。
公開URL: https://taishin-sv.github.io/QR_Quest/

### 自社サーバーなど

`dist/` を静的ホスティング（GitHub Pages / Netlify / Cloudflare Pages 等）に置くだけ。
`base: './'` の相対パスなのでサブパス配下でも動きます。HTTPS必須（カメラ・Service Worker）。

## 元の引き継ぎ資料

`files/` は Claude.ai で作成した単一HTML版（`index.html`）と引き継ぎ書の原本。参照用に残してあります。
