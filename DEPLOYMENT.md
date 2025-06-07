# 本番環境デプロイメントガイド

## データベース移行手順

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

このスクリプトは以下を実行します：
- `./database/dev.sqlite` から `./data/production.sqlite` へのコピー
- 既存の本番データベースがある場合、自動的にバックアップを作成
- データ整合性の確認

### 3. Replit Deployでの設定

Replit Deployを実行する前に、以下の環境変数が自動設定されます：

```bash
REPLIT_DEPLOYMENT=true
REPLIT_DB_URL=./data/production.sqlite
```

### 4. デプロイメント実行

1. Replitの「Deploy」ボタンをクリック
2. 本番環境では自動的に `./data/production.sqlite` が使用されます
3. アプリケーションが起動し、開発環境のデータが本番環境で利用可能になります

## ファイル構造

```
├── database/
│   └── dev.sqlite              # 開発環境DB
├── data/
│   ├── production.sqlite       # 本番環境DB
│   └── backups/               # 自動バックアップ
└── scripts/
    ├── deploy-production.js    # 本番DB準備スクリプト
    └── deploy-database.js      # デプロイ前実行スクリプト
```

## 注意事項

- 本番環境では既存のデータが保護されます（バックアップ作成）
- 開発環境のデータベースが存在しない場合、デプロイは失敗します
- データベースのサイズと整合性が自動確認されます

## トラブルシューティング

### データベースが見つからない場合
```bash
# 開発環境でアプリケーションを起動してデータベースを作成
npm run dev
```

### 本番データベースの手動確認
```bash
# データベースファイルの存在確認
ls -la data/production.sqlite

# バックアップの確認
ls -la data/backups/
```