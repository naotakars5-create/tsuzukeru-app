# Stripe課金サーバー（Supabase）セットアップ手順

案C（開始時は課金しない・達成週は¥0・未達週だけ後から自動課金）を実現するための
バックエンド一式です。`migrations/` がDBスキーマ、`functions/` がEdge Function。

Edge Function の役割:
| 名前 | 役割 |
|---|---|
| `create-goal` | 目標と、週ごとの判定データ（weeks）を作る |
| `create-setup-intent` | アプリ版のカード登録（PaymentSheet用） |
| `create-setup-session` | Web版のカード登録（Stripeのホスト型Checkout） |
| `judge-weeks` | 週次の達成判定と、未達週の自動課金 |
| `stripe-webhook` | Stripeからの結果をDBに反映 |
| `delete-account` | アカウントの完全削除 |

## 全体の流れ

1. ログイン（メール＋パスワード、Supabase Auth）
2. 目標を作る: `create-goal` が目標と週ごとの判定データ（`weeks`）をサーバーに作る
3. カード登録: `create-setup-intent` が Stripe の SetupIntent を発行 → アプリの PaymentSheet でカードを保存（¥0）
4. 毎日の記録: 勉強時間を `daily_logs` にも同期
5. 毎週月曜: `judge-weeks` が先週分を判定し、未達週だけ自動課金
6. `stripe-webhook` が Stripe からの結果（成功/失敗）を正として DB に反映

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
npx supabase functions deploy create-goal
npx supabase functions deploy create-setup-intent
npx supabase functions deploy create-setup-session
npx supabase functions deploy delete-account
npx supabase functions deploy judge-weeks --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
```
（`judge-weeks` は定期実行、`stripe-webhook` はStripeから直接呼ばれるため JWT検証を無効化）

スキーマを更新した場合（`0002_weeks_daily_target.sql` を追加済み）は、先に反映してください：
```
npx supabase db push
```

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

### 6. Web版（GitHub Actions の自動デプロイ）にも鍵を渡す
`.env` はコミットされないため、GitHub の自動デプロイには別途 Secrets の登録が必要です。
リポジトリの Settings > Secrets and variables > Actions で次の3つを追加してください。

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

未登録でもデプロイは成功し、Web版は下記の「ローカル専用モード」で起動します。

## 鍵が未設定のとき（ローカル専用モード）
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` が無いビルドでは、
アプリはログイン不要の**ローカル専用モード**で起動します。

- 勉強の記録・ランク・コミュニティは、これまで通り端末内だけで動く
- ログイン画面は出ない。設定タブの「アカウント」欄も出ない
- カード登録・課金は無効（設定タブにその旨を表示）

鍵を設定すると、自動的にログイン必須モードに切り替わります。

## テストの仕方
1. `.env` にテストモードの鍵（`pk_test_...`）を設定してアプリを起動
2. Stripeのテストカード `4242 4242 4242 4242`（任意の有効期限・CVC）でカード登録
3. `weeks` テーブルの `end_date` を過去日に手動で書き換えてから `judge-weeks` を手動実行すると、
   課金フローを即座に確認できます
   ```
   npx supabase functions invoke judge-weeks
   ```

## 実装済み
- ログイン/新規登録画面（`src/components/AuthScreen.tsx`、メール確認が必要な場合は案内表示）
- 未ログイン時はアプリ全体をログイン画面に差し替え（`app/_layout.tsx`）
- カード登録画面（`app/card-setup.tsx`、設定タブから遷移。Web版は非対応の案内のみ）
- 目標を作る/次シーズンを始めるたびに `create-goal` を呼び、`goals`/`weeks` をサーバーに同期
- 毎日の勉強時間を `daily_logs` に同期（`addStudyMinutes` のたびに）

## 未実装・既知の制約（次のフェーズ）
- 課金失敗（カード期限切れ等）をアプリ内で通知し、再登録を促すUI
- この機能を追加する前から使っていたローカルデータ（目標・記録）は、
  次に目標を作成/次シーズンを始めるまでサーバーに同期されません
- `judge-weeks` は「その週の期間内で目標時間に届いた日数」で判定するため、
  曜日指定の目標で予定日以外に勉強した日もカウントされます（＝課金には有利な方向のみ）
