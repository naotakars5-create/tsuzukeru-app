# Stripe課金サーバー（Supabase）セットアップ手順

案C（開始時は課金しない・達成週は¥0・未達週だけ後から自動課金）を実現するための
バックエンド一式です。`migrations/` がDBスキーマ、`functions/` が3つのEdge Function。

## 全体の流れ

1. カード登録: `create-setup-intent` が Stripe の SetupIntent を発行 → アプリの PaymentSheet でカードを保存（¥0）
2. 毎週月曜: `judge-weeks` が先週分を判定し、未達週だけ自動課金
3. `stripe-webhook` が Stripe からの結果（成功/失敗）を正として DB に反映

## あなたがやること（アカウント作成・鍵の設定）

### 1. Supabase プロジェクトを作る
1. https://supabase.com でプロジェクト作成（無料枠でOK）
2. Settings > API から `Project URL` と `anon public key` をコピー → `.env` に貼る（`.env.example` を参照）
3. CLIでログイン・紐付け
   ```
   npx supabase login
   npx supabase link --project-ref <あなたのproject-ref>
   ```
4. スキーマを反映
   ```
   npx supabase db push
   ```

### 2. Stripe アカウントを作る
1. https://stripe.com で個人事業主として登録（本人確認・振込先口座の登録で数日かかる場合あり）
2. 登録中でも「テストモード」の API キーはすぐ使えるので、まずテストモードで開発を進められます
3. 開発者 > APIキー から
   - `公開可能キー`(pk_test_...) → `.env` の `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `シークレットキー`(sk_test_...) → 下のコマンドで Supabase に設定（`.env`には書かない）
   ```
   npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
   ```

### 3. Edge Functions をデプロイ
```
npx supabase functions deploy create-setup-intent
npx supabase functions deploy judge-weeks --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
```
（`judge-weeks` は定期実行、`stripe-webhook` はStripeから直接呼ばれるため JWT検証を無効化）

### 4. Stripe Webhook を設定
1. Stripeダッシュボード > 開発者 > Webhook > エンドポイントを追加
2. URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
3. 購読するイベント: `setup_intent.succeeded`, `payment_intent.succeeded`, `payment_intent.payment_failed`
4. 発行された `署名シークレット`(whsec_...) を設定
   ```
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
   ```

### 5. 毎週の自動判定をスケジュール実行
Supabase ダッシュボード > Edge Functions > `judge-weeks` > Cron のトリガーを追加。
例: 毎週月曜 00:10（JST）に実行する場合、UTC で `10 15 * * 0`（日曜15:10 UTC）。

## テストの仕方
1. `.env` にテストモードの鍵（`pk_test_...`）を設定してアプリを起動
2. Stripeのテストカード `4242 4242 4242 4242`（任意の有効期限・CVC）でカード登録
3. `weeks` テーブルの `end_date` を過去日に手動で書き換えてから `judge-weeks` を手動実行すると、
   課金フローを即座に確認できます
   ```
   npx supabase functions invoke judge-weeks
   ```

## 未実装（次のフェーズ）
- ログイン画面（メール＋パスワード、Supabase Auth）
- カード登録画面（PaymentSheetを開くUI）
- `AppContext` のローカルデータ（目標・毎日の分数）を `goals` / `daily_logs` に同期する処理
- 課金失敗（カード期限切れ等）をアプリ内で通知し、再登録を促すUI
