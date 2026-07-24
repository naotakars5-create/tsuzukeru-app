/**
 * やる気を出させる格言（目標設定画面などに表示）。
 * 「継続」をテーマに、背中を押す言葉を用意する。
 */

export const QUOTES: { text: string; sub?: string }[] = [
  { text: '継続できる人間は、上位1%。', sub: '始めた時点で、あなたはもう動き出している。' },
  { text: '成功するために必要なのは、才能じゃない。継続だ。', sub: '' },
  { text: '小さな一歩を、毎日。それが最強の武器になる。', sub: '' },
  { text: 'やる気は待つな。動けば、後からついてくる。', sub: '' },
  { text: '昨日の自分を、今日1ミリ超えろ。', sub: '' },
  { text: '3日坊主でもいい。3日ごとに始め直せば、それは継続だ。', sub: '' },
  { text: '心を燃やせ。', sub: '続けた分だけ、火は大きくなる。' },
  { text: '結果は、続けた者だけに訪れる。', sub: '' },
];

/** 日付ベースで安定して1つ選ぶ（同じ日は同じ格言） */
export function quoteOfToday(dateStr: string): { text: string; sub?: string } {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  return QUOTES[h % QUOTES.length];
}
