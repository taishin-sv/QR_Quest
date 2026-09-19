// 親が編集画面でワンタップ挿入できる、ミッションの例（ひらがな中心・5歳児向け）
export const MISSION_EXAMPLES = [
  { emoji: '🦘', text: 'その ばで ジャンプ 10かい！' },
  { emoji: '🤪', text: 'おもしろい かおを して、パパか ママを わらわせよう' },
  { emoji: '🦆', text: 'アヒルの あるきかたで へやを ひとまわり！' },
  { emoji: '🎵', text: 'すきな うたを ひとつ うたおう' },
  { emoji: '🧸', text: 'おもちゃを 3つ かたづけよう' },
  { emoji: '🫧', text: 'てを あらって きれいに しよう' },
  { emoji: '🐘', text: 'ぞうさんの ものまねを しよう' },
  { emoji: '🧦', text: 'くつしたを ひとりで はこう' },
  { emoji: '🍽️', text: 'おてつだい：おさらを テーブルに はこぼう' },
  { emoji: '🦁', text: 'ライオンの ポーズで 「がおー！」と ほえよう' },
  { emoji: '🧘', text: 'かたあしで 5びょう たってみよう' },
  { emoji: '🚀', text: 'ロケットみたいに 5、4、3、2、1、ゼロ！ と とびだそう' },
  { emoji: '🧹', text: 'おへやの ゴミを 3つ ひろおう' },
  { emoji: '🪥', text: 'はを ピカピカに みがこう' },
  { emoji: '🐸', text: 'カエルみたいに 5かい ジャンプ！' },
  { emoji: '🤗', text: 'ママか パパを ぎゅーっと ハグしよう' },
  { emoji: '🎨', text: 'あかい ものを 3つ みつけて もってこよう' },
  { emoji: '🐢', text: 'カメみたいに ゆっくり あるいて いこう' },
  { emoji: '💃', text: 'すきな ダンスを 10びょう おどろう' },
  { emoji: '👏', text: 'てを 10かい たたこう。ぱちぱち！' },
  { emoji: '🧩', text: 'つみきを 5こ つみあげよう' },
  { emoji: '🐶', text: 'いぬの なきごえで 「わんわん！」と 3かい ほえよう' },
  { emoji: '😴', text: 'ゆかで ごろごろ 3かいてん しよう' },
  { emoji: '🤸', text: 'でんぐりがえりに ちょうせん！' },
  { emoji: '💛', text: 'おうちの ひとに 「ありがとう」を つたえよう' },
];

// まだ使っていない例を1つ選ぶ（全部使っていたらランダム）
export function pickExample(usedTexts = [], rand = Math.random) {
  const unused = MISSION_EXAMPLES.filter((e) => !usedTexts.includes(e.text));
  const pool = unused.length ? unused : MISSION_EXAMPLES;
  return pool[Math.floor(rand() * pool.length)];
}
