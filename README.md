# 継続（つづける） — 習慣継続アプリ MVP

「続かない人を、続く人に変える」習慣継続アプリの試作（MVP）です。
サボると痛み（課金＝モック）、続けると報酬（積立の返還・ランク上昇）という
**非対称設計**で、意志ではなく仕組みで継続を実現します。

- 技術: **Expo (React Native) + TypeScript**
- 画面遷移: 下部タブバー方式
- データ保存: **端末内のみ（AsyncStorage）** — サーバー・DBなし
- 決済・課金: **すべてモック（ダミー）** — 実際の決済はしません

---

## 📱 スマホで動作確認する手順（初心者向け）

プログラミングやローカル環境に詳しくなくても確認できるよう、順番に書いています。

### STEP 1. スマホに「Expo Go」を入れる
1. iPhone は **App Store**、Android は **Google Play** を開く
2. 「**Expo Go**」を検索してインストール
3. アプリを開き、無料アカウントを作成（メールアドレスでOK）

### STEP 2. Expo（EAS）アカウントを用意する
1. ブラウザで **https://expo.dev** を開く
2. 「Sign Up」で無料アカウント作成（STEP1と同じアカウントでOK）

### STEP 3. コードをクラウドで動かして QRコードを出す（おすすめ = GitHub Codespaces）
PCに何もインストールせず、ブラウザだけで開発サーバーを動かせます。

1. GitHub でこのリポジトリ `tsuzukeru-app` を開く
2. 緑の **「Code」** ボタン → **「Codespaces」** タブ → **「Create codespace」**
3. ブラウザ上にエディタ（VS Code）が開いたら、下の「ターミナル」に次を入力:
   ```bash
   npm install
   npx expo start --tunnel
   ```
4. しばらくすると **QRコード** が表示されます
5. スマホの **Expo Go** アプリを開き、QRコードを読み取る
   - iPhone: カメラアプリでQRを読む → Expo Goが開く
   - Android: Expo Go内の「Scan QR code」で読む
6. アプリが起動します 🎉（`--tunnel` なのでスマホとPCが別ネットワークでも動きます）

> 補足: 自分のPCに Node.js を入れられる場合は、リポジトリをダウンロードして
> 同じコマンド（`npm install` → `npx expo start`）でもOKです。

### STEP 4.（任意）本物のアプリファイルを作る = EAS Build
ストア公開前の本番ビルドを試したいときに使います。Codespaces のターミナルで:
```bash
npm install -g eas-cli
eas login            # expo.dev のアカウントでログイン
eas build:configure  # 初回のみ
eas build --platform android --profile preview
```
ビルドはExpoのクラウドで実行され、完了するとダウンロードリンク（APK）が発行されます。
スマホでそのリンクを開けばインストールできます。

---

## 🗂 フォルダ構成

```
tsuzukeru-app/
├── app/                     # 画面（Expo Router = ファイルが画面になる）
│   ├── _layout.tsx          # 全体レイアウト＋状態の供給
│   ├── (tabs)/              # 下部タブ
│   │   ├── _layout.tsx      # タブ定義（ホーム/週次/ランク/設定）
│   │   ├── index.tsx        # ① ホーム
│   │   ├── weekly.tsx       # ④ 週次チェックポイント
│   │   ├── rank.tsx         # ⑤ ランク / ポイント
│   │   └── settings.tsx     # ⑥ 設定
│   ├── goal-setup.tsx       # ② 目標設定
│   └── today.tsx            # ③ 今日の達成（タイマー）
│
├── src/
│   ├── types/               # 型定義
│   ├── storage/             # AsyncStorage 読み書き（保存層を分離）
│   ├── context/             # AppContext（アプリ全体の状態）
│   ├── logic/               # 達成判定・週集計・ランク・課金モック
│   ├── components/          # 再利用UI（ボタン・進捗バー・グリッド等）
│   └── theme/               # 色・余白・フォント
│
├── assets/                  # アイコン・スプラッシュ（プレースホルダー）
├── app.json                 # Expo設定
├── eas.json                 # EASビルド設定
└── package.json
```

**将来の拡張への配慮**: 課金・保存・ランク計算を `src/logic` と `src/storage` に
分離してあるので、後から「サーバー保存」や「仲間/チーム機能」を足すときも、
画面を壊さずに差し替え・追加ができます（設定画面に将来機能の入口を用意済み）。

---

## 🎮 機能（MVP）

| 機能 | 内容 |
|---|---|
| 目標設定 | 目標名・頻度（毎日/特定曜日）・4週間・積立額（数値のみ） |
| 達成判定 | レベル1「ボタン+タイマー方式」。期限内に「達成」ボタンで記録、押さなければ自動で未達 |
| 週次チェックポイント | 4週に分割し、週ごとに達成/未達を集計 |
| 積立・課金（モック） | 未達があると「課金が発生しました（ダミー）」と表示のみ |
| ランク/ポイント | 達成でポイント加算 → 称号が上がる（🌱→🔥→💪→👑）。換金なし |
| ホーム | 今日やること・連続達成日数・今週の進捗・現在ランク・積み上がりの可視化 |

### スコープ外（今回は作らない）
- 仲間/チーム機能（将来追加前提で構造だけ用意）
- 実際の決済処理、ユーザー認証、サーバー、データベース

---

## 🛠 開発メモ（Node.jsがある人向け）

```bash
npm install          # 依存インストール
npx expo start       # 開発サーバー起動（同一Wi-Fi）
npx expo start --tunnel   # 別ネットワークでもOK
npm run typecheck    # 型チェック
```

動作確認用のポイント調整は `src/logic/rank.ts`、
課金ルールは `src/logic/billing.ts` にまとまっています。
