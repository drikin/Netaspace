# Chrome拡張機能 リリースチェックリスト v2.1.1

## プレリリース確認事項

### ✅ 必須ファイル確認
- [x] manifest.json（適切なバージョン番号）
- [x] popup.html（UIレイアウト）
- [x] popup.js（機能実装）
- [x] content.js（ページ情報取得）
- [x] icons/icon16.png
- [x] icons/icon48.png
- [x] icons/icon128.png

### ✅ 機能テスト
- [x] ページ情報の自動取得
- [x] タイトル・URL・説明文の表示
- [x] 投稿者名の保存・復元
- [x] サーバーURL設定の保存
- [x] 投稿処理の正常動作
- [x] エラーハンドリング
- [x] 成功メッセージ表示

### ✅ 自動更新システム
- [x] update_url設定
- [x] XMLエンドポイント動作確認
- [x] バージョン管理システム
- [x] ダウンロードエンドポイント

### ✅ セキュリティ確認
- [x] 最小限の権限設定
- [x] HTTPS通信
- [x] 入力値検証
- [x] XSS対策

## リリース手順

### 1. バージョン確認
```bash
# 現在のバージョン確認
curl http://localhost:5000/api/extension/version
```

### 2. パッケージ生成
```bash
# 最新パッケージのダウンロード
curl http://localhost:5000/api/extension/download -o backspace-fm-extension-v2.1.1.zip
```

### 3. パッケージ検証
- ZIPファイル内容の確認
- manifest.jsonのバージョン確認
- 必要ファイルの存在確認

### 4. テスト環境での動作確認
- 手動インストール
- 基本機能のテスト
- エラーケースのテスト

### 5. 本番環境設定確認
- サーバーURL: https://netaspace.replit.app
- 自動更新URL: https://netaspace.replit.app/api/extension/updates.xml

## 配布方法

### Chrome Web Store（推奨）
1. Developer Dashboardでアカウント登録
2. 拡張機能情報の入力
3. ZIPファイルのアップロード
4. 審査提出

### 直接配布
1. ZIPファイルをWebサイトに配置
2. インストール手順の提供
3. ユーザーサポート体制の準備

## ポストリリース

### 監視項目
- 自動更新の配信状況
- エラーレポート
- ユーザーフィードバック
- サーバーの負荷状況

### サポート対応
- インストール方法の案内
- 設定に関する質問対応
- 不具合報告の受付

## 次回リリースに向けて
- ユーザーフィードバックの収集
- 機能改善の検討
- セキュリティ更新の確認