# Backspace.fm Chrome拡張機能 リリースパッケージ v2.1.1

## リリース概要
- **バージョン**: 2.1.1
- **リリース日**: 2025年6月6日
- **新機能**: 感謝メッセージの改善、自動更新システム完全実装

## 主な機能
- ワンクリックでWebページをbackspace.fmのネタとして投稿
- ページタイトルとURLの自動取得
- サーバー設定の保存機能
- 投稿者名の記憶機能
- 自動更新システム

## インストール方法

### 1. Chrome Web Store（推奨）
※Chrome Web Storeでの公開準備中

### 2. 手動インストール（開発者向け）
1. `backspace-fm-extension-release-v2.1.1.zip` をダウンロード
2. ZIPファイルを解凍
3. Chromeで `chrome://extensions/` を開く
4. 「デベロッパーモード」をオンにする
5. 「パッケージ化されていない拡張機能を読み込む」をクリック
6. 解凍したフォルダを選択

## 使用方法
1. 投稿したいWebページを開く
2. ブラウザツールバーの拡張機能アイコンをクリック
3. 必要に応じてタイトルや説明を編集
4. 投稿者名を入力（初回のみ）
5. 「投稿する」ボタンをクリック

## 自動更新機能
- Chrome拡張機能は自動的に新しいバージョンを確認
- 更新が見つかると自動的にダウンロード・インストール
- ユーザーの操作は不要

## 技術仕様
- **Manifest Version**: 3
- **対応ブラウザ**: Chrome 88+
- **必要な権限**: 
  - activeTab（現在のタブの情報取得）
  - storage（設定の保存）
- **ファイル構成**:
  - manifest.json（拡張機能の設定）
  - popup.html/popup.js（ポップアップUI）
  - content.js（ページ情報取得）
  - icons/（拡張機能アイコン）

## セキュリティ
- HTTPS接続による安全な通信
- 最小限の権限要求
- ローカルストレージによる設定保存

## サポート
- 問題報告: GitHub Issues
- 機能要望: GitHub Discussions
- メール: [サポートアドレス]

## 更新履歴

### v2.1.1 (2025-06-06)
- 投稿成功時のメッセージを改善
- ユーザーへの感謝と継続利用の促進メッセージ追加
- 自動更新システムの安定性向上

### v2.1.0 (2025-06-06)
- 自動更新機能の実装
- サーバーURL設定の改善
- アイコンファイルの最適化

## ライセンス
MIT License

## 開発者向け情報

### ビルド方法
```bash
# サーバー起動
npm run dev

# 拡張機能パッケージ生成
curl http://localhost:5000/api/extension/download -o extension.zip
```

### 開発環境
- Node.js 18+
- Express.js
- Chrome Extensions Manifest V3

### API エンドポイント
- 更新チェック: `/api/extension/updates.xml`
- ダウンロード: `/api/extension/download`
- バージョン情報: `/api/extension/version`