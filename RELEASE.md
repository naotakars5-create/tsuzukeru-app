# リリース手順チェックリスト

App Store（iOS）へのリリースまでに必要な作業をまとめたものです。
コード側で済んでいるものと、あなたが手を動かす必要があるものを分けています。

---

## ✅ コード側で完了しているもの

- ソーシャル機能の実データ化（モックのライバル・メンバー・投稿はすべて削除）
- ログイン（メール＋パスワード）とアカウント必須化
- カード登録（Stripe PaymentSheet・登録時は0円）
- 週次の自動判定と、未達週のみの自動課金（Supabase Edge Function）
- 法務ページ3種（利用規約・プライバシーポリシー・特定商取引法に基づく表記）
- アカウント削除機能（App Store ガイドライン5.1.1(v) の必須要件）
- プレミアム会員（モックのトグル）の廃止

---

## ⚠️ リリース前に必ずやること

### 1. 事業者情報の記入（法令上の必須事項）

`src/logic/legal.ts` の `OPERATOR` を実際の値に差し替えてください。
**未記入のままリリースすると特定商取引法違反になります。**

```ts
export const OPERATOR = {
  name: '（氏名または会社名）',
  manager: '（運営責任者名）',
  address: '（住所）',
  phone: '（電話番号）',
  email: '（メールアドレス）',
};
```

住所の公開に抵抗がある場合、バーチャルオフィスの利用や
「請求があれば遅滞なく開示します」という記載での運用が一般的ですが、
最終的にはご自身で判断してください。

### 2. Supabase に新しいスキーマとFunctionを反映

```
npx supabase db push
npx supabase functions deploy create-goal
npx supabase functions deploy delete-account
npx supabase functions deploy create-setup-session
```

`0003_social.sql` で user_stats / communities などのテーブルが作られます。

### 3. Stripe を本番モードに切り替え

Stripeの本人確認・銀行口座登録が完了してから：

```
npx supabase secrets set STRIPE_SECRET_KEY=<sk_live_...>
npx supabase secrets set STRIPE_WEBHOOK_SECRET=<本番モードのwhsec_...>
```

`.env` の `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` も `pk_live_...` に変更。
Webhookエンドポイントは本番モード側でも登録し直す必要があります。

### 4. 本番ビルド用の環境変数をEASに登録

`.env` はGit管理外でEASに届かないため、別途登録が必要です。

```
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..." --environment production
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "sb_publishable_..." --environment production
npx eas-cli env:create --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value "pk_live_..." --environment production
```

### 5. 実機で一通り動作確認

- アカウント作成 → 目標設定 → カード登録（テストカード `4242 4242 4242 4242`）
- Supabase の Table Editor で `goals` / `weeks` / `stripe_customers` / `user_stats` にデータが入るか
- `weeks` の `end_date` を過去日に書き換えて `npx supabase functions invoke judge-weeks` を実行し、
  課金フローが動くか（テストモードで）

### 6. 本番ビルドと提出

```
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios
```

---

## App Store Connect に登録するもの

| 項目 | 内容 |
|---|---|
| アプリ名 | 覚悟の勉強 |
| サブタイトル | 継続・習慣化する資格勉強タイマー |
| プライバシーポリシーURL | `https://tsuzukeru-app.expo.app/legal/privacy` |
| サポートURL | 用意が必要（GitHub Pages や Notion でも可） |
| カテゴリ | 教育 |
| 年齢制限 | 17+ を推奨（課金を伴うため） |
| スクリーンショット | 6.7インチ必須。実機のスクショを使用 |

### App Privacy（データ収集の申告）

- メールアドレス → アカウント作成に使用、ユーザーに紐づく
- 購入履歴 → サービス提供に使用、ユーザーに紐づく
- ユーザーコンテンツ（掲示板の投稿）→ アプリの機能、ユーザーに紐づく
- 使用状況データ（学習記録）→ アプリの機能、ユーザーに紐づく

---

## 審査で聞かれそうなこと（想定問答）

**Q. なぜ App内課金（IAP）を使わないのか**

本アプリの料金は、デジタルコンテンツや機能の解放に対する対価ではなく、
利用者が自ら設定した学習目標を達成できなかった場合にのみ発生する
サービス利用料です。アプリの機能はすべて無料で利用でき、
支払いの有無によって使える機能は変わりません。
（ガイドライン3.1.1が対象とする「アプリ内で利用するコンテンツ・機能の購入」には該当しない、という整理）

**リジェクトされた場合の代替案**
- Web版（`tsuzukeru-app.expo.app`）で決済を完結させ、iOSアプリからは
  課金機能を外す（Web版へ誘導するリンクも置けないため、完全に切り離す必要あり）

---

## 残っている技術的な宿題

- 課金失敗（カード期限切れ等）をアプリ内で通知し、再登録を促すUI
- `judge-weeks` の週次cron設定（Supabaseダッシュボードで設定。UTCで `10 15 * * 0`）
