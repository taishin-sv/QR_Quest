import { describe, it, expect } from 'vitest';
import { builtinPresets, CATEGORY_ORDER } from './builtin-presets.js';
import { applyBuiltins } from './presets.js';

const byId = (id) => builtinPresets().find((p) => p.id === id);

describe('builtinPresets', () => {
  const list = builtinPresets();
  it('IDが重複せず、カテゴリーが定義済み', () => {
    expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
    list.forEach((p) => expect(CATEGORY_ORDER).toContain(p.category));
  });
  it('構造が正しい(ゴール込みの長さ・枚数・空の文章なし)', () => {
    list.forEach((p) => {
      expect(p.hints.length).toBe(p.stageCount + 1);
      expect(p.stageCount).toBeLessThanOrEqual(15);
      expect(p.hints[0].cardCount).toBeUndefined();
      p.hints.forEach((h, i) => {
        expect(h.text.trim().length).toBeGreaterThan(0);
        if (i >= 1) expect(h.cardCount).toBeGreaterThanOrEqual(1);
      });
    });
  });
  it('せいかつ → あそび の順に並ぶ', () => {
    const cats = list.map((p) => p.category);
    expect(cats.indexOf('あそび')).toBeGreaterThan(cats.lastIndexOf('せいかつ'));
    expect(CATEGORY_ORDER).toEqual(['せいかつ', 'あそび']);
  });
  it('「せいかつ」に朝と夜のルーティンがある', () => {
    const names = list.filter((p) => p.category === 'せいかつ').map((p) => p.name);
    expect(names).toEqual(['モーニングルーティン', 'ナイトルーティン']);
  });
  it('モーニングは「といれ」から始まり、洗顔・カーテンを含まない', () => {
    const texts = byId('builtin-morning').hints.map((h) => h.text);
    expect(texts[0]).toBe('といれに いこう');
    expect(texts[1]).toBe('おきがえを しよう');
    expect(texts.join('')).not.toContain('あらおう');
    expect(texts.join('')).not.toContain('カーテン');
  });
});

describe('あそび: すきなものを しらべるミッション(8テーマ)', () => {
  const themes = builtinPresets().filter((p) => p.category === 'あそび');
  it('きょうりゅう / こんちゅう / どうぶつ / おさかな / おはな / おひめさま / おかし / おしごと の8つ', () => {
    expect(themes.map((p) => p.name)).toEqual([
      'きょうりゅうミッション',
      'こんちゅうミッション',
      'どうぶつミッション',
      'おさかなミッション',
      'おはなミッション',
      'おひめさまミッション',
      'おかしミッション',
      'おしごとミッション',
    ]);
  });
  it('4テーマとも同じ構成: 3つ(3枚) → 1つ(1枚) → 3つ(3枚) → まね(1枚) → ゴール', () => {
    themes.forEach((p) => {
      expect(p.stageCount).toBe(5 - 1); // ミッション4 + ゴール
      // 各行の cardCount = そのミッションの前に読み込む枚数（=前のミッションのクリアで渡す枚数）
      expect(p.hints.map((h) => h.cardCount)).toEqual([undefined, 3, 1, 3, 1]);
    });
  });
  it('文章は共通で、テーマの言葉だけが違う', () => {
    const dino = themes[0].hints.map((h) => h.text);
    expect(dino[0]).toBe('きょうりゅうの なまえを 3つ いおう');
    expect(dino[1]).toBe('いちばん すきな きょうりゅうの なまえを いおう');
    expect(dino[2]).toBe('その いちばん すきな きょうりゅうの すきな ところや すごい ところを 3つ いおう');
    expect(dino[3]).toBe('その いちばん すきな きょうりゅうの まねを しよう');
    expect(themes[1].hints[0].text).toBe('こんちゅうの なまえを 3つ いおう');
    expect(themes[3].hints[3].text).toBe('その いちばん すきな おさかなの まねを しよう');
    // おかしだけは「たべる まね」
    expect(themes[6].hints[3].text).toBe('その いちばん すきな おかしを おいしそうに たべる まねを しよう');
  });
  it('前の版のきょうりゅうミッション(rev1)は、未編集なら新しい内容に置き換わる', () => {
    const v1 = [
      ['🥚', 'たまごを だいじに あたためよう！ りょうてで たまごの かたちを つくって 10びょう じっとしてね'],
      ['🦴', 'きょうりゅうに なりきろう！ 「がおー！」と おおきな こえで ほえよう'],
      ['🌋', 'かざんが ふんか！ その ばで ジャンプ 5かい！'],
      ['💧', 'みずを ごくごく のんで ひとやすみ しよう'],
      ['🪨', 'おおきな いわを もちあげる ポーズを しよう。「うーん！」'],
      ['🏆', 'やったー！ きょうりゅうミッション だいせいこう！ おめでとう！'],
    ].map(([emoji, text], i) => (i === 0 ? { emoji, text } : { emoji, text, cardCount: 1 }));
    const s = {
      activeId: 'sample-dino',
      presets: { 'sample-dino': { id: 'sample-dino', name: 'きょうりゅうミッション', icon: '🦕', category: 'あそび', stageCount: 5, hints: v1 } },
      seeded: ['sample-dino'],
    };
    expect(applyBuiltins(s).replaced).toContain('sample-dino');
    expect(s.presets['sample-dino'].hints[0].text).toBe('きょうりゅうの なまえを 3つ いおう');
  });
});

describe('ナイトルーティン(端末はリビングに置いたまま)', () => {
  it('寝室に端末を持ち込ませるミッションを含まない', () => {
    const texts = byId('builtin-night').hints.map((h) => h.text).join('|');
    expect(texts).not.toContain('おふとん');
    expect(texts).not.toContain('でんきを けして');
  });
  it('最後のメッセージは「おやすみなさい」', () => {
    const hints = byId('builtin-night').hints;
    expect(hints[hints.length - 1].text).toContain('おやすみなさい');
  });
});

describe('applyBuiltins', () => {
  it('新規: 全て追加され seeded に記録される', () => {
    const s = { activeId: '', presets: {} };
    expect(applyBuiltins(s).changed).toBe(true);
    expect(Object.keys(s.presets)).toEqual(['builtin-morning', 'builtin-night', 'sample-dino', 'builtin-insect', 'builtin-animal', 'builtin-fish', 'builtin-flower', 'builtin-princess', 'builtin-sweets', 'builtin-job']);
    expect(s.seeded).toEqual(['builtin-morning', 'builtin-night', 'sample-dino', 'builtin-insect', 'builtin-animal', 'builtin-fish', 'builtin-flower', 'builtin-princess', 'builtin-sweets', 'builtin-job']);
    expect(applyBuiltins(s).changed).toBe(false); // 2回目は変化なし
  });
  it('ユーザーが削除したものは復活しない', () => {
    const s = { activeId: '', presets: {} };
    applyBuiltins(s);
    delete s.presets['builtin-night'];
    applyBuiltins(s);
    expect(s.presets['builtin-night']).toBeUndefined();
  });
  it('手を入れていない旧サンプル(恐竜)は新しい内容に置き換える', () => {
    const s = {
      activeId: 'sample-dino',
      presets: {
        'sample-dino': {
          id: 'sample-dino',
          name: 'きょうりゅうたんけん（サンプル）',
          icon: '🦕',
          stageCount: 5,
          groupSize: 1,
          hints: [
            ['🥚', 'たまごの あるところを さがしてね'],
            ['🦴', 'つめたいところに かくれているよ'],
            ['🌋', 'たかいところを みてみよう'],
            ['💧', 'みずの ちかくを さがしてみて'],
            ['🪨', 'まるい ものの なかを のぞいてみて'],
            ['🏆', 'やったー！さいごまで たどりついたね！たからものは ひみつきちの中だよ！'],
          ].map(([emoji, text]) => ({ emoji, text })),
        },
      },
    };
    const r = applyBuiltins(s);
    expect(r.replaced).toEqual(['sample-dino']);
    expect(s.presets['sample-dino'].name).toBe('きょうりゅうミッション');
    expect(s.presets['sample-dino'].category).toBe('あそび');
  });
  it('編集済みの sample-dino は内容を保ち、categoryだけ付ける', () => {
    const s = {
      activeId: 'sample-dino',
      presets: { 'sample-dino': { id: 'sample-dino', name: '編集済み', stageCount: 1, hints: [{ text: '自分の文' }, { text: 'x', cardCount: 1 }] } },
    };
    const r = applyBuiltins(s);
    expect(r.replaced).toEqual([]);
    expect(s.presets['sample-dino'].name).toBe('編集済み');
    expect(s.presets['sample-dino'].category).toBe('あそび');
  });
  it('ユーザー自作のプリセットには手を出さない', () => {
    const own = { id: 'p1', name: '自作', stageCount: 1, hints: [{ text: 'a' }, { text: 'b', cardCount: 1 }] };
    const s = { activeId: 'p1', presets: { p1: own } };
    applyBuiltins(s);
    expect(s.presets.p1).toBe(own);
    expect(own.category).toBeUndefined();
  });
});

describe('applyBuiltins: 内容の改訂(rev)の反映', () => {
  // 旧版のモーニング(署名なしで配られていたもの)
  const morningV1 = () => ({
    id: 'builtin-morning',
    name: 'モーニングルーティン',
    icon: '🌅',
    category: 'せいかつ',
    stageCount: 7,
    hints: [
      ['🌅', 'おはよう！ カーテンを あけて、おひさまに 「おはよう」を しよう'],
      ['🚽', 'といれに いこう'],
      ['👕', 'きがえを しよう。じぶんで ふくを えらんでね'],
      ['🧼', 'かおを あらおう。つめたい みずで しゃきっと！'],
      ['🍚', 'あさごはんを たべよう。ぜんぶ たべられるかな？'],
      ['🪥', 'はみがきを しよう。ピカピカに なるまで！'],
      ['🎒', 'おでかけの じゅんびを しよう。かばんを もってね'],
      ['🏆', 'ぜんぶ できたね！ すてきな あさだったよ。いってらっしゃい！'],
    ].map(([emoji, text], i) => (i === 0 ? { emoji, text } : { emoji, text, cardCount: 1 })),
  });

  it('手を入れていない旧版は新しい内容になり、進行状況の破棄対象に入る', () => {
    const s = { activeId: 'builtin-morning', presets: { 'builtin-morning': morningV1() }, seeded: ['builtin-morning'] };
    const r = applyBuiltins(s);
    expect(r.replaced).toContain('builtin-morning');
    expect(s.presets['builtin-morning'].hints[0].text).toBe('といれに いこう');
    expect(s.presets['builtin-morning'].stageCount).toBe(5);
    expect(s.presets['builtin-morning'].rev).toBe(byId('builtin-morning').rev);
  });
  it('手を入れていない旧ナイトルーティン(署名なし)も新しい内容になる', () => {
    const v1 = [
      ['🧸', 'おもちゃを もとの ばしょに かたづけよう'],
      ['🛁', 'おふろに はいろう。あたまも あらってね'],
      ['🧴', 'からだを ふいて、パジャマに きがえよう'],
      ['🪥', 'はみがきを しよう。おくばも ピカピカに！'],
      ['🚽', 'ねるまえに といれに いこう'],
      ['📖', 'おふとんで えほんを 1さつ よもう'],
      ['🌙', 'でんきを けして、おふとんに はいろう'],
      ['😴', 'ぜんぶ できたね！ おつかれさま。いい ゆめを みてね。おやすみなさい！'],
    ].map(([emoji, text], i) => (i === 0 ? { emoji, text } : { emoji, text, cardCount: 1 }));
    const s = {
      activeId: 'builtin-night',
      presets: { 'builtin-night': { id: 'builtin-night', name: 'ナイトルーティン', icon: '🌙', category: 'せいかつ', stageCount: 7, hints: v1 } },
      seeded: ['builtin-night'],
    };
    expect(applyBuiltins(s).replaced).toContain('builtin-night');
    expect(s.presets['builtin-night'].stageCount).toBe(6);
  });
  it('編集済みの旧版はそのまま残す', () => {
    const old = morningV1();
    old.hints[1].text = '自分で直した文章';
    const s = { activeId: 'builtin-morning', presets: { 'builtin-morning': old }, seeded: ['builtin-morning'] };
    const r = applyBuiltins(s);
    expect(r.replaced).toEqual([]);
    expect(s.presets['builtin-morning'].hints[1].text).toBe('自分で直した文章');
  });
  it('署名つきで未編集なら rev が上がったときに置き換わり、編集済みなら残る', () => {
    const s = { activeId: '', presets: {} };
    applyBuiltins(s); // 追加(署名つき)
    // 過去の rev 1 の内容だったことにする
    const cur = s.presets['builtin-night'];
    cur.rev = 0;
    expect(applyBuiltins(s).replaced).toEqual(['builtin-night']);
    // 編集してから rev が上がっても置き換えない
    const cur2 = s.presets['builtin-night'];
    cur2.hints[0].text = '直した';
    cur2.rev = 0;
    expect(applyBuiltins(s).replaced).toEqual([]);
    expect(s.presets['builtin-night'].hints[0].text).toBe('直した');
  });
  it('現行と同じ内容で署名がないものは、置き換えず署名だけ付ける', () => {
    const s = { activeId: '', presets: { 'builtin-night': { ...byId('builtin-night'), rev: undefined } }, seeded: ['builtin-night'] };
    const r = applyBuiltins(s);
    expect(r.replaced).toEqual([]);
    expect(s.presets['builtin-night'].baseSig).toBeTruthy();
    expect(s.presets['builtin-night'].rev).toBe(byId('builtin-night').rev);
  });
});
