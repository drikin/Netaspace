# Changes for liveview Branch

## Summary
YouTubeライブ配信の表示・非表示機能を実装しました。状態はlocalStorageに保存され、ページ再読み込み時も維持されます。

## Modified Files

### 1. client/src/pages/home.tsx
- isLiveVisible stateをlocalStorageから初期化
- handleLiveVisibilityChange関数で状態変更とlocalStorage保存
- 非表示時に「ライブ配信を表示」ボタンを右揃えで表示

### 2. client/src/components/youtube-live-embed.tsx  
- onHideプロパティを追加
- ヘッダーに非表示ボタン（EyeOffアイコン）を配置

### 3. replit.md
- 変更履歴にYouTube表示・非表示機能の実装を追加

## Git Commands to Execute

```bash
# Remove lock file
rm -f .git/index.lock

# Create and switch to liveview branch
git checkout -b liveview

# Add modified files
git add client/src/pages/home.tsx client/src/components/youtube-live-embed.tsx replit.md

# Commit changes
git commit -m "feat: YouTubeライブ配信の表示・非表示機能を実装

- ライブ配信セクションにトグル機能を追加
- 非表示ボタンをヘッダーに配置
- 表示ボタンをタブナビゲーション右側に配置
- localStorage使用で状態永続化
- ページ再読み込み時も状態維持"

# Push to GitHub
git push -u origin liveview
```

## Technical Details

### State Management
- 初期状態: localStorage.getItem('liveVisible') || true
- 状態変更時: localStorage.setItem('liveVisible', JSON.stringify(visible))

### UI Components
- 非表示ボタン: ヘッダー右側にEyeOffアイコン
- 表示ボタン: タブナビゲーション右側にEyeアイコン + テキスト

### Functionality
- ワンクリックで表示・非表示切り替え
- ページリロード時の状態復元
- 直感的なユーザーインターフェース