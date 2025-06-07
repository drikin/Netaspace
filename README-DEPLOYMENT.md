# Replit Deploy自動化システム

SQLiteデータベースでの自動デプロイメント、バックアップ、マイグレーション管理システム

## 主要機能

### 1. 自動バックアップ
- デプロイ前に本番データベースを自動バックアップ
- 最新5個のバックアップを保持、古いものは自動削除
- 失敗時の自動復元機能

### 2. 環境別データベース管理
- 開発環境: `./database/dev.sqlite`
- 本番環境: `/var/data/production.sqlite`
- 環境変数による自動切り替え

### 3. マイグレーション自動実行
- スキーマ変更を安全に本番環境に適用
- 失敗時の自動ロールバック
- 段階的バックアップ戦略

## 使用方法

### 初回プロダクションデプロイ（データ移行付き）
```bash
# 開発データを本番環境にコピーしてデプロイ
node scripts/deploy-with-data.mjs
```

### 通常のデプロイ
```bash
node scripts/database-manager.js deploy
```

### 個別操作
```bash
# バックアップのみ
node scripts/database-manager.js backup

# マイグレーションのみ  
node scripts/database-manager.js migrate

# 接続テスト
node scripts/database-manager.js test

# SQLiteスキーマ更新
npx drizzle-kit push --config=drizzle.sqlite.config.ts
```

### 開発環境セットアップ
```bash
# 開発用データベース初期化
node scripts/db-init.js

# 開発環境でのマイグレーション
npm run db:push
```

## ファイル構成

```
scripts/
├── database-manager.js     # メイン管理システム
├── deploy-with-migration.js # デプロイ時自動実行
├── db-init.js             # 初期化スクリプト
├── sqlite-migration.js    # SQLite移行支援
└── auto-deploy.sh         # シェルスクリプト版

drizzle.sqlite.config.ts   # SQLite用Drizzle設定
```

## 環境変数

- `REPLIT_DEPLOYMENT`: 本番環境判定（Replitが自動設定）
- `NODE_ENV`: 環境モード（development/production）

## バックアップ管理

### 保存場所
- 本番: `/var/data/backups/`
- 開発: 不要（テストデータのため）

### 命名規則
```
backup-2025-06-06T21-02-05-123Z.sqlite
```

### 保持ポリシー
- 最新5個を保持
- 古いバックアップは自動削除
- デプロイ失敗時の自動復元

## パフォーマンス向上

### 期待される改善
- レスポンス時間: 1000-1700ms → 50-200ms
- 改善率: 80-90%の短縮
- ネットワーク遅延: ゼロ化

### 具体的な効果
- 週間トピック取得: 1100ms → 100-150ms
- スター操作: 1600-1700ms → 50-100ms
- 管理操作: 大幅高速化

## デプロイ手順

### プロダクション初回セットアップ

1. **Replit Deployでのデプロイ**
   - プロジェクトをReplit Deployに配置
   - 環境変数`REPLIT_DEPLOYMENT=true`が自動設定される

2. **初回データ移行**
   ```bash
   node scripts/deploy-with-data.mjs
   ```
   このスクリプトが自動実行:
   - 開発環境のSQLiteデータを`/var/data/production.sqlite`にコピー
   - データ整合性を確認
   - 87トピック、44スター、全ユーザーデータを移行

3. **アプリケーション起動確認**
   - SQLiteデータベースが正常に動作
   - パフォーマンス向上（50-200ms応答時間）を確認

### 継続的デプロイメント

通常のコード更新時:
```bash
node scripts/database-manager.js deploy
```

スキーマ変更時:
```bash
npx drizzle-kit push --config=drizzle.sqlite.config.ts
```

## 安全性

- 自動バックアップによるデータ保護
- 失敗時の自動復元機能
- 段階的移行でリスク最小化
- 既存Supabaseをフォールバックとして維持可能

## トラブルシューティング

### マイグレーション失敗時
```bash
# 最新バックアップから復元
ls -la /var/data/backups/
# 手動復元が必要な場合
cp /var/data/backups/backup-XXXXXXX.sqlite /var/data/production.sqlite
```

### 開発環境リセット
```bash
rm -rf ./database/
node scripts/db-init.js
npm run db:push
```

このシステムにより、Replit Deployでの安全で高速なデータベース運用が実現できます。