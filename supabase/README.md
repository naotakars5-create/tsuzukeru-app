# Stripe課金サーバー（Supabase）セットアップ手順

案C（開始時は課金しない・達成週は¥0・未達週だけ後から自動課金）を実現するための
バックエンド一式です。`migrations/` がDBスキーマ、`functions/` が5つのEdge Function。

## 全体の流れ

1. ログイン（メール＋パスワード、Supabase Auth）
2. 目標を作る: `create-goal` が目標と週ごとの判定データ（`weeks`）をサーバーに作る
3. カード登録: `create-setup-checkout` が Stripe Checkout（setupモード）のURLを発行 → **Web版**でカードを保存（¥0）
   - iOSアプリ内に決済導線を置くことは App Store 審査ガイドライン 3.1.1 で認められていないため、
     カード登録はWeb版だけに置いている。ネイティブ版は登録状態の表示のみ。
4. 毎日の記録: 勉強時間を `daily_logs` にも同期
5. 毎週月曜: `judge-weeks` が先週分を判定し、未達週だけ自動課金
6. `stripe-webhook` が Stripe からの結果（成功/失敗）を正として DB に反映
7. 退会: `delete-account` が Stripe顧客と認証ユーザーを削除（各テーブルは cascade で連鎖削除）

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

### 3. Web版のURLを設定
Checkout から戻る先を組み立てるために必要（クライアントから受け取ったURLは使わない）。
```
npx supabase secrets set APP_WEB_URL=https://<Web版のURL>
```

### 4. Edge Functions をデプロイ
```
npx supabase functions deploy
```
JWT検証の要否は `config.toml` の `[functions.*]` に書いてあるため、`--no-verify-jwt` は不要
（`judge-weeks` は定期実行、`stripe-webhook` はStripeから直接呼ばれるため無効化している）。

CLIを使わず、GitHub Actions からデプロイすることもできる。
`.github/workflows/deploy-supabase.yml` が `supabase/functions/**` の変更で自動実行されるので、
GitHub の Secrets に `SUPABASE_ACCESS_TOKEN` と `SUPABASE_PROJECT_ID` を登録しておくだけでよい。

スキーマを更新した場合（`0002_weeks_daily_target.sql` を追加済み）は、先に反映してください：
```
npx supabase db push
```

### 5. Stripe Webhook を設定
1. Stripeダッシュボード > 開発者 > Webhook > エンドポイントを追加
2. URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
3. 購読するイベント: `setup_intent.succeeded`, `payment_intent.succeeded`, `payment_intent.payment_failed`
4. 発行された `署名シークレット`(whsec_...) を設定
   ```
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
   ```

### 6. 毎週の自動判定をスケジュール実行
Supabase ダッシュボード > Edge Functions > `judge-weeks` > Cron のトリガーを追加。
例: 毎週月曜 00:10（JST）に実行する場合、UTC で `10 15 * * 0`（日曜15:10 UTC）。

## テストの仕方
1. `.env` にテストモードの鍵（`pk_test_...`）を設定してアプリを起動
2. Web版を開き、Stripeのテストカード `4242 4242 4242 4242`（任意の有効期限・CVC）でカード登録
3. `weeks` テーブルの `end_date` を過去日に手動で書き換えてから `judge-weeks` を手動実行すると、
   課金フローを即座に確認できます
   ```
   npx supabase functions invoke judge-weeks
   ```

## 実装済み
- ログイン/新規登録画面（`src/components/AuthScreen.tsx`、メール確認が必要な場合は案内表示）
- 未ログイン時はアプリ全体をログイン画面に差し替え（`app/_layout.tsx`）
- カード登録画面（`app/card-setup.tsx`、設定タブから遷移。登録できるのはWeb版のみ、ネイティブ版は表示専用）
- アカウント削除（設定タブ →「アカウントを削除」。審査ガイドライン 5.1.1(v) で必須）
- プライバシーポリシー（`app/privacy.tsx`。App Store用にログインなしでも開ける）
- 目標を作る/次シーズンを始めるたびに `create-goal` を呼び、`goals`/`weeks` をサーバーに同期
- 毎日の勉強時間を `daily_logs` に同期（`addStudyMinutes` のたびに）

## 未実装・既知の制約（次のフェーズ）
- 課金失敗（カード期限切れ等）をアプリ内で通知し、再登録を促すUI
- この機能を追加する前から使っていたローカルデータ（目標・記録）は、
  次に目標を作成/次シーズンを始めるまでサーバーに同期されません
- `judge-weeks` は「その週の期間内で目標時間に届いた日数」で判定するため、
  曜日指定の目標で予定日以外に勉強した日もカウントされます（＝課金には有利な方向のみ）
