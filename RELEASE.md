# リリース手順チェックリスト

App Store（iOS）へのリリースまでに必要な作業をまとめたものです。
コード側で済んでいるものと、あなたが手を動かす必要があるものを分けています。

---

## ✅ コード側で完了しているもの

- ソーシャル機能の実データ化（モックのライバル・メンバー・投稿はすべて削除）
- 匿名スタート（起動時にログイン画面を出さない。ガイドライン5.1.1(i)対応）
- カード登録の直前にIDを紐付ける導線（メール / Appleでサインイン）
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

### 2. Supabase の認証設定

Authentication → Sign In / Providers で：

- **匿名サインインを許可** → **オン**（これが無いと全員ローカル専用モードになる）
- **メール確認** → テスト中はオフが楽。**本番前にオンへ戻すこと**
  （オフのままだと他人のメールアドレスで登録できてしまう）

### 3. Supabase に新しいスキーマとFunctionを反映

**Edge Function は GitHub Actions が自動でデプロイします。** そのために、
GitHub の Settings → Secrets and variables → Actions に以下を登録してください。

- `SUPABASE_ACCESS_TOKEN` … https://supabase.com/dashboard/account/tokens で発行
- `SUPABASE_PROJECT_ID` … `psrhlrphivkopltedtps`

登録すると、`supabase/functions/**` を変更するたびに自動でデプロイされます。
JWT検証の要否は `supabase/config.toml` に書いてあるので、関数ごとの指定は不要です。

**スキーマ（マイグレーション）だけは手動**です。

```
npx supabase db push
```

`0003_social.sql` で user_stats / communities などのテーブルが作られ、
`0004_judge_weeks_cron.sql` で週次判定の自動実行（pg_cron）が登録されます。

`0004` が `permission denied` などで失敗する場合は、Supabaseダッシュボードの
Database → Extensions で `pg_cron` と `pg_net` を有効にしてから、もう一度
`npx supabase db push` を実行してください。

登録されたか確認するには、SQL Editor で:

```sql
select jobname, schedule, active from cron.job;
```

あわせて、Edge Function 用のシークレットに戻り先URLを登録してください
（Web版のカード登録で使います）。

```
npx supabase secrets set APP_WEB_URL=https://tsuzukeru-app.expo.app
```

### 4. Stripe を本番モードに切り替え

Stripeの本人確認・銀行口座登録が完了してから：

```
npx supabase secrets set STRIPE_SECRET_KEY=<sk_live_...>
npx supabase secrets set STRIPE_WEBHOOK_SECRET=<本番モードのwhsec_...>
```

`.env` の `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` も `pk_live_...` に変更。
Webhookエンドポイントは本番モード側でも登録し直す必要があります。

### 5. 本番ビルド用の環境変数をEASに登録

`.env` はGit管理外でEASに届かないため、別途登録が必要です。

```
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..." --environment production
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "sb_publishable_..." --environment production
npx eas-cli env:create --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value "pk_live_..." --environment production
```

### 6. 実機で一通り動作確認

- アカウント作成 → 目標設定 → カード登録（テストカード `4242 4242 4242 4242`）
- Supabase の Table Editor で `goals` / `weeks` / `stripe_customers` / `user_stats` にデータが入るか
- `weeks` の `end_date` を過去日に書き換えて judge-weeks を手動実行し、
  課金フローが動くか（テストモードで）。CLI に `functions invoke` は無いので HTTP で直接叩く:

  ```
  curl -i -X POST https://psrhlrphivkopltedtps.supabase.co/functions/v1/judge-weeks
  ```

  `verify_jwt = false`（`supabase/config.toml`）なので認証ヘッダは不要。
  `{"processed":1,"results":{"<week id>":"missed-charge-succeeded"}}` のような
  JSON が返れば成功。

### 7. 本番ビルドと提出

GitHub の Actions タブ →「iOS ビルド（App Store へ提出）」→ Run workflow
で実行できます（手元にCLI不要）。

事前に expo.dev 上で以下を済ませておくこと:
- Credentials に App Store Connect の API キー（.p8）を登録
- Environment Variables の production に `EXPO_PUBLIC_*` を登録

手元から実行する場合:
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
| iPad対応 | なし（`supportsTablet: false`。iPad用のレイアウトとスクショが未整備のため） |

### App Privacy（データ収集の申告）

- メールアドレス → アカウント作成に使用、ユーザーに紐づく
- 購入履歴 → サービス提供に使用、ユーザーに紐づく
- ユーザーコンテンツ（掲示板の投稿）→ アプリの機能、ユーザーに紐づく
- 使用状況データ（学習記録）→ アプリの機能、ユーザーに紐づく

---

## 審査で聞かれそうなこと（想定問答）

**Q. なぜ App内課金（IAP）を使わないのか**

App Review に添える説明（英訳して Review Notes に記載する）:

> 本アプリの料金は、デジタルコンテンツや機能の解放に対する対価ではありません。
> 利用者が自ら設定した学習目標を達成できなかった場合にのみ発生する、
> 後払いのサービス利用料です。
>
> ・アプリのすべての機能は無料で利用できます
> ・支払いの有無によって、使える機能は一切変わりません
> ・支払いによって取得されるデジタルコンテンツはありません
>
> またIAPは購入のたびに本人の承認操作を必要とするため、
> 「未達を検知して自動的に請求する」という本アプリの仕組みは実装できません。
>
> ガイドライン3.1.1が対象とする「アプリ内で利用するコンテンツ・機能の購入」には
> 該当しないと考えています。

**リジェクトされた場合の段階的な代替案**

1. 上記の説明でリジェクト理由に反論する（まずここ）
2. iOSアプリからカード登録UIを外し、登録状態の表示のみにする
   （Web版で登録してもらう。ただし3.1.1は誘導リンクも禁じているため、
   アプリ内からWeb版へ導けない点に注意）
3. iOS版を課金機能なしで出す（勉強記録＋コミュニティのみ。課金はWeb版だけ）

---

## 残っている技術的な宿題

- 課金失敗（カード期限切れ等）をアプリ内で通知し、再登録を促すUI
- Appleでサインインの実機確認（Apple Developer と Supabase の
  Apple プロバイダ設定が必要。匿名からの引き継ぎ挙動も要確認）
- Googleでサインイン（Google Cloud Console でのOAuthクライアント作成が必要）
