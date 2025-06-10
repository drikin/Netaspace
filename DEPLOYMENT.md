# 本番環境デプロイメントガイド

## 永続化デプロイ（推奨）

### Redeploy対応の永続化デプロイ
```bash
node scripts/persistent-storage.js
```

このコマンドで以下が自動実行されます：
- 永続化ディレクトリの設定と確認
- 開発データベースから永続化ストレージへのコピー
- 自動バックアップの作成
- Redeploy後もデータが保持される設定

### Replit Deployでの実行

1. 上記コマンドを実行後、Replitの「Deploy」ボタンをクリック
2. 本番環境では永続化ディレクトリのデータベースが使用されます
3. **Redeploy時もデータが失われません**
4. 自動バックアップシステムによりデータ保護されます

## 手動デプロイ手順

### 1. 開発環境での準備
```bash
# アプリケーションを開発モードで起動してデータベースを作成
npm run dev
```

### 2. 本番データベースの準備
```bash
# 開発データベースを本番環境にコピー
node scripts/deploy-production.js
```

### 3. デプロイメント検証
```bash
# データベース移行の検証
node scripts/verify-deployment.js
```

## Redeploy時のデータ保持問題について

### 問題
通常のReplitデプロイメントでは、アプリケーションを再デプロイ（Redeploy）すると、プロジェクトディレクトリ内のファイルがリセットされ、データベースファイルが失われます。

### 解決策：永続化ストレージ
本システムでは以下の永続化戦略を実装：

1. **永続化ディレクトリの使用**
   - `/tmp/persistent/` (最優先)
   - `/home/runner/.local/share/app-data/` (代替)
   - `./data/` (フォールバック)

2. **自動バックアップシステム**
   - 日次自動バックアップ
   - デプロイ前の安全バックアップ
   - 管理画面からのバックアップダウンロード

3. **データ整合性保証**
   - ファイルサイズ検証
   - データベース構造確認
   - 自動復元機能

## ファイル構造

```
├── database/
│   └── dev.sqlite                    # 開発環境DB
├── /tmp/persistent/                  # 永続化ストレージ
│   ├── production.sqlite            # 本番環境DB（永続化）
│   └── backups/                     # 自動バックアップ（永続化）
├── data/                            # フォールバック
│   ├── production.sqlite            # 本番環境DB（非永続化）
│   └── backups/                     # バックアップ（非永続化）
└── scripts/
    ├── persistent-storage.js        # 永続化設定スクリプト
    ├── deploy-production.js         # 本番DB準備スクリプト
    └── deploy-database.js           # デプロイ前実行スクリプト
```

## 永続化の確認方法

### データベース永続化状況の確認
```bash
# 永続化ストレージの確認
node scripts/persistent-storage.js

# 現在のデータベースパスを確認
sqlite3 /tmp/persistent/production.sqlite ".tables"
```

### バックアップの確認
```bash
# 永続化バックアップの確認
ls -la /tmp/persistent/backups/

# 通常バックアップの確認
ls -la data/backups/
```

## トラブルシューティング

### Redeploy後にデータが失われた場合
1. 管理画面の「バックアップ管理」からバックアップをダウンロード
2. 永続化ストレージ設定を再実行: `node scripts/persistent-storage.js`
3. バックアップから手動復元を実行

### 永続化ディレクトリにアクセスできない場合
システムが自動的にフォールバックディレクトリを使用します。この場合、Redeploy時にデータが失われる可能性があるため、定期的なバックアップダウンロードを推奨します。