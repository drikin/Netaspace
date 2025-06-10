# Replit Deployment Data Persistence Guide

## 概要
このガイドでは、Replit Deploy時のデータ消失を防ぐための永続化システムについて説明します。

## 永続化の仕組み

### 1. 自動バックアップシステム
- **初期化時**: データベース起動時に自動バックアップ作成
- **定期実行**: 4時間ごとに自動バックアップ
- **保存場所**: `/tmp/persistent/backups/`
- **保持数**: 最新10件を保持、古いものは自動削除

### 2. 多段階データベースパス
データベースは以下の優先順で検索・使用されます：

1. **永続化データベース**: `/tmp/persistent/production.sqlite`
2. **バックアップからリストア**: 最新バックアップから自動復元
3. **既存データベースの移行**: `./database/dev.sqlite` → 永続化パス
4. **新規作成**: 永続化パスに新しいデータベース作成

### 3. デプロイ時保護機能
- **Pre-Deploy**: `node scripts/deploy-with-backup.js pre-deploy`
- **Post-Deploy**: `node scripts/deploy-with-backup.js post-deploy`
- **手動リストア**: `node scripts/deploy-with-backup.js restore`

## 使用方法

### デプロイ前の確認
```bash
# 現在のデータ状態確認
node scripts/debug-production.js

# 手動バックアップ作成
node scripts/deploy-with-backup.js pre-deploy
```

### デプロイ後の確認
```bash
# データ整合性確認
node scripts/deploy-with-backup.js post-deploy

# 必要に応じてリストア
node scripts/deploy-with-backup.js restore
```

### 管理者機能
管理画面から以下の操作が可能：
- 手動バックアップ作成
- バックアップ一覧表示
- データリストア実行
- データベース状態確認

## トラブルシューティング

### データが消失した場合
1. 管理画面でバックアップ状況確認
2. 最新バックアップからリストア実行
3. データ整合性を確認

### バックアップが見つからない場合
1. 複数のバックアップ場所を確認：
   - `/tmp/persistent/backups/`
   - `/home/runner/workspace/data/backups/`
   - `./data/backups/`

### 緊急時の手動復旧
```bash
# 手動でバックアップからリストア
cp /tmp/persistent/backups/latest-backup.sqlite /tmp/persistent/production.sqlite

# サーバー再起動
npm run dev
```

## 技術詳細

### ファイル構造
```
/tmp/persistent/
├── production.sqlite          # メインデータベース
└── backups/
    ├── latest-backup.json     # 最新バックアップ情報
    ├── auto-backup-*.sqlite   # 自動バックアップファイル
    └── pre-deploy-*.sqlite    # デプロイ前バックアップ
```

### 環境変数
- `PERSISTENT_DB_PATH`: 永続化データベースパス
- `BACKUP_DIR`: バックアップディレクトリ
- `REPLIT_DEPLOYMENT`: Replit本番環境識別子

## 注意事項
- バックアップは最低限10件保持されます
- 4時間ごとの自動バックアップにより最新データが保護されます
- デプロイ時は必ず事前・事後チェックを実行してください