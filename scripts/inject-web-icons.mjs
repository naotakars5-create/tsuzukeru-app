/**
 * Web版の index.html に「ホーム画面アイコン」の設定を差し込む。
 *
 * Expo の Web 書き出しは favicon（タブ用）しか入れてくれないため、
 * このままだと iPhone/iPad で「ホーム画面に追加」したときに
 * ロゴではなくページのスクショがアイコンになってしまう。
 * apple-touch-icon と manifest を後から注入して、ちゃんとロゴが出るようにする。
 *
 * 使い方: npx expo export --platform web のあとに
 *   node scripts/inject-web-icons.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const indexPath = resolve('dist/index.html');

if (!existsSync(indexPath)) {
  console.error('dist/index.html がありません。先に `npx expo export --platform web` を実行してください。');
  process.exit(1);
}

let html = readFileSync(indexPath, 'utf8');

// 二重注入を防ぐ
if (html.includes('apple-touch-icon')) {
  console.log('すでに注入済みです。スキップします。');
  process.exit(0);
}

const tags = `
    <!-- ホーム画面アイコン（iOS/iPad） -->
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="覚悟の勉強" />
    <!-- PWA（Android/Chrome） -->
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#0A0D12" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
`;

// </head> の直前に差し込む
html = html.replace('</head>', `${tags}  </head>`);

// 起動時の白いちらつきを防ぐ
html = html.replace(
  'html,\n      body {\n        height: 100%;\n      }',
  'html,\n      body {\n        height: 100%;\n        background-color: #0A0D12;\n      }'
);

// 言語を日本語に
html = html.replace('<html lang="en">', '<html lang="ja">');

writeFileSync(indexPath, html);
console.log('index.html にホーム画面アイコンの設定を注入しました。');
