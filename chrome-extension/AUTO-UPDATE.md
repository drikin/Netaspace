# Chrome拡張機能 自動更新システム

## 概要
Backspace.fm Chrome拡張機能には自動更新機能が実装されており、新しいバージョンがリリースされるとユーザーのブラウザに自動的に配信されます。

## 自動更新の仕組み

### 1. 更新チェック
- Chrome拡張機能は定期的にサーバーに更新をチェックします
- 更新チェックURL: `https://netaspace.replit.app/api/extension/updates.xml`
- Chromeが自動的に新しいバージョンを検出します

### 2. 更新配信
- 新しいバージョンが見つかると、自動的にダウンロードされます
- ダウンロードURL: `https://netaspace.replit.app/api/extension/download`
- ユーザーの操作なしで更新が完了します

### 3. バージョン管理
- 現在のバージョン: `2.1.0`
- manifest.jsonに`update_url`が設定されています
- サーバー側でバージョン情報を一元管理

## 開発者向け情報

### 新しいバージョンをリリースする手順

1. **バージョン番号の更新**
   ```javascript
   // server/routes.ts の EXTENSION_VERSION を更新
   const EXTENSION_VERSION = '2.2.0';
   ```

2. **manifest.jsonの更新**
   ```json
   {
     "version": "2.2.0",
     "update_url": "https://netaspace.replit.app/api/extension/updates.xml"
   }
   ```

3. **拡張機能ファイルの修正**
   - popup.js, content.js などの機能追加・修正
   - 必要に応じてアイコンやHTMLファイルの更新

4. **サーバーの再起動**
   - 新しいバージョン情報が反映されます
   - 既存ユーザーに自動的に配信開始

### API エンドポイント

#### 更新チェック (XML)
```
GET /api/extension/updates.xml
Content-Type: application/xml

<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='backspace-fm-extension'>
    <updatecheck codebase='https://netaspace.replit.app/api/extension/download' version='2.1.0' />
  </app>
</gupdate>
```

#### バージョン情報 (JSON)
```
GET /api/extension/version
Content-Type: application/json

{
  "version": "2.1.0",
  "updateUrl": "https://netaspace.replit.app/api/extension/updates.xml",
  "downloadUrl": "https://netaspace.replit.app/api/extension/download"
}
```

#### 拡張機能ダウンロード
```
GET /api/extension/download
Content-Type: application/zip
Content-Disposition: attachment; filename="backspace-fm-extension.zip"
```

## ユーザー向け情報

### 自動更新の確認方法

1. **Chrome拡張機能ページを開く**
   - `chrome://extensions/` にアクセス
   - 「デベロッパーモード」をオンにする

2. **拡張機能の詳細を確認**
   - Backspace.fm ネタ投稿拡張機能を探す
   - バージョン番号を確認

3. **手動で更新チェック**
   - 「今すぐ更新」ボタンをクリック
   - または Chrome を再起動

### 更新の通知
- Chrome拡張機能が更新されると、ブラウザの拡張機能アイコンに通知が表示される場合があります
- 通常は自動的にバックグラウンドで更新されます

## トラブルシューティング

### 更新が適用されない場合

1. **Chromeの再起動**
   - ブラウザを完全に閉じて再起動

2. **拡張機能の再読み込み**
   - `chrome://extensions/` で「再読み込み」をクリック

3. **手動インストール**
   - 最新版を https://netaspace.replit.app/extension からダウンロード
   - 古いバージョンを削除してから新しいバージョンをインストール

### 開発環境での確認

サーバーが起動している状態で以下のURLにアクセスして動作確認：

- 更新チェック: http://localhost:5000/api/extension/updates.xml
- バージョン情報: http://localhost:5000/api/extension/version
- ダウンロード: http://localhost:5000/api/extension/download

## セキュリティ

- HTTPS接続によるセキュアな配信
- 署名された拡張機能パッケージ
- 公式ドメインからの配信のみ許可

## 今後の改善予定

- [ ] 自動更新の通知機能強化
- [ ] バージョン履歴の表示
- [ ] ロールバック機能
- [ ] A/Bテスト対応