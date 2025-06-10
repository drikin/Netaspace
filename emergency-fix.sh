#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

emergency_fix() {
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'EMERGENCY_EOF'
        cd /home/ubuntu/backspace-fm-app
        
        echo "=== 緊急診断: ファイル構造確認 ==="
        ls -la
        
        echo ""
        echo "=== Docker状態確認 ==="
        docker-compose -f docker-compose.prod.yml ps
        
        echo ""
        echo "=== Dockerfileの存在確認 ==="
        if [ -f "Dockerfile" ]; then
            echo "✅ Dockerfile存在"
            head -10 Dockerfile
        else
            echo "❌ Dockerfileが見つかりません - 作成します"
            cat > Dockerfile << 'DOCKERFILE_EOF'
FROM node:20-alpine

# Install required system dependencies
RUN apk add --no-cache postgresql-client curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/version || exit 1

# Start the application
CMD ["npm", "start"]
DOCKERFILE_EOF
        fi
        
        echo ""
        echo "=== package.jsonの確認 ==="
        if [ -f "package.json" ]; then
            echo "✅ package.json存在"
            grep -A 3 -B 3 '"scripts"' package.json
        else
            echo "❌ package.jsonが見つかりません"
        fi
        
        echo ""
        echo "=== 必須ディレクトリ作成 ==="
        mkdir -p server client shared
        
        echo ""
        echo "=== コンテナログ確認 ==="
        docker-compose -f docker-compose.prod.yml logs backspace-fm | tail -20
        
        echo ""
        echo "=== アプリケーション強制起動 ==="
        docker-compose -f docker-compose.prod.yml up -d backspace-fm --force-recreate
        
        echo ""
        echo "=== 起動待機とテスト ==="
        for i in {1..30}; do
            if curl -s -f http://127.0.0.1:5000/api/version; then
                echo "✅ アプリケーション起動成功"
                
                # データベース初期化
                docker-compose -f docker-compose.prod.yml exec backspace-fm npm run db:push
                
                # 管理者ユーザー作成
                docker-compose -f docker-compose.prod.yml exec -T postgres psql -U backspace_user -d backspace_fm << 'ADMIN_EOF'
INSERT INTO users (username, password, is_admin, email, created_at) 
VALUES ('admin', 'fmbackspace55', true, 'admin@backspace.fm', NOW())
ON CONFLICT (username) DO NOTHING;

SELECT username, is_admin FROM users WHERE username='admin';
ADMIN_EOF
                
                # ログインテスト
                echo "管理者ログインテスト:"
                curl -X POST \
                     -H "Content-Type: application/json" \
                     -d '{"username":"admin","password":"fmbackspace55"}' \
                     -c /tmp/final_test.txt \
                     http://127.0.0.1:5000/api/auth/login
                
                echo ""
                echo "認証確認:"
                curl -b /tmp/final_test.txt http://127.0.0.1:5000/api/auth/me
                
                rm -f /tmp/final_test.txt
                break
            fi
            echo "起動待機中... ($i/30)"
            sleep 5
        done
        
        echo ""
        echo "=== 最終状態 ==="
        docker-compose -f docker-compose.prod.yml ps
        
EMERGENCY_EOF
}

emergency_fix