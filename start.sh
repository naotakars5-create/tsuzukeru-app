#!/usr/bin/env bash
# 継続アプリを Codespace で起動するスクリプト。
# 使い方: ターミナルで  bash start.sh  と入力して Enter。
#
# 初回だけ Expo にログインします。同じアカウントを Expo Go にも入れておくと、
# 2回目以降は QR を読まずに Expo Go の一覧からタップするだけで開けます。

set -e

echo "▶ Node.js 20 を準備します..."
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install 20 >/dev/null
  nvm use 20 >/dev/null
fi
echo "  使用中の Node: $(node -v)"

# 依存の確認。通常は数秒。壊れていたら自動でクリーン再インストール。
echo "▶ 必要なものを確認します..."
if [ ! -d node_modules/expo ] || ! npm install --no-audit --no-fund; then
  echo "  → 入れ直しています（数分かかります）..."
  rm -rf node_modules package-lock.json
  npm install --no-audit --no-fund
fi

# Expo ログイン（初回のみ）。ログイン済みならトンネルURLが固定され、
# Expo Go 側で同じアカウントにしておくと一覧からタップで開ける。
if ! npx expo whoami >/dev/null 2>&1; then
  echo ""
  echo "▶ Expo にログインします（初回だけ）。"
  echo "  expo.dev で作ったユーザー名（またはメール）とパスワードを入力してください。"
  npx expo login || true
fi
WHO="$(npx expo whoami 2>/dev/null || true)"
if [ -n "$WHO" ]; then
  echo "  Expoアカウント: $WHO ✅（一覧からタップで開けます）"
else
  echo "  Expoアカウント: 未ログイン（匿名。毎回QRの読み取りが必要です）"
fi

echo ""
echo "▶ 開発サーバーを起動します。"
echo "  ・初回だけ QR を Expo Go で読み取ってください"
echo "  ・ログイン済みなら、2回目以降は Expo Go を開くと一覧に出るのでタップするだけ"
echo "  （終了したいときは Ctrl + C）"
echo ""
npx expo start --tunnel
