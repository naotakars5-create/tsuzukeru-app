#!/usr/bin/env bash
# 継続アプリを Codespace で起動して QRコードを出すためのスクリプト。
# 使い方: ターミナルで  bash start.sh  と入力して Enter。

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

echo "▶ 古い node_modules を掃除して入れ直します（数分かかります）..."
rm -rf node_modules package-lock.json
npm install

echo ""
echo "▶ QRコードを表示します。スマホの Expo Go アプリで読み取ってください。"
echo "  （終了したいときは Ctrl + C）"
echo ""
npx expo start --tunnel
