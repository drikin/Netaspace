# 本番環境デプロイメントガイド

## 簡単デプロイ（推奨）

### ワンコマンドデプロイ
```bash
node scripts/deploy.js
```

このコマンドで以下が自動実行されます：
- 開発データベースから本番データベースへのコピー
- データ整合性の検証
- デプロイ準備の完了確認

### Replit Deployでの実行

1. 上記コマンドを実行後、Replitの「Deploy」ボタンをクリック
2. 本番環境では自動的に `./data/production.sqlite` が使用されます
3. 開発環境のすべてのデータが本番環境で利用可能になります

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