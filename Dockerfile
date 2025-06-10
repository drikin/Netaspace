# 桜環境用 Dockerfile
FROM node:20-alpine

# 作業ディレクトリの設定
WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm ci --only=production

# アプリケーションコードをコピー
COPY . .

# TypeScriptのビルド
RUN npm run build

# ポート設定
EXPOSE 5000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/version || exit 1

# アプリケーション起動
CMD ["npm", "start"]