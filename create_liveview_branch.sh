#!/bin/bash

# YouTubeライブ配信表示・非表示機能をliveviewブランチにプッシュするスクリプト

echo "Removing git lock files..."
rm -f .git/index.lock .git/config.lock .git/HEAD.lock 2>/dev/null || true

echo "Checking git status..."
git status

echo "Creating liveview branch..."
git checkout -b liveview

echo "Adding modified files..."
git add client/src/pages/home.tsx
git add client/src/components/youtube-live-embed.tsx  
git add replit.md

echo "Committing changes..."
git commit -m "feat: YouTubeライブ配信の表示・非表示機能を実装

- ライブ配信セクションにトグル機能を追加
- 非表示ボタンをヘッダーに配置
- 表示ボタンをタブナビゲーション右側に配置
- localStorage使用で状態永続化
- ページ再読み込み時も状態維持

Changes include:
- client/src/pages/home.tsx: isLiveVisible state with localStorage persistence
- client/src/components/youtube-live-embed.tsx: hide button in header
- replit.md: updated changelog"

echo "Pushing to GitHub..."
git push -u origin liveview

echo "Done! liveview branch created and pushed to GitHub."