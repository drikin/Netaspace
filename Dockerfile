# さくらのクラウド用 Dockerfile
FROM node:20-alpine

# 作業ディレクトリを設定
WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションファイルをコピー
COPY . .

# 本番用ビルド
RUN npm run build

# データディレクトリを作成
RUN mkdir -p /app/data/persistent /app/data/backups

# ポート設定
EXPOSE 5000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/version || exit 1

# 本番環境用の設定
ENV NODE_ENV=production
ENV PERSISTENT_DB_PATH=/app/data/persistent/production.sqlite
ENV BACKUP_DIR=/app/data/backups

# アプリケーション開始
CMD ["npm", "start"]