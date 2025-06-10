#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

final_verification() {
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'VERIFY_EOF'
        cd /home/ubuntu/backspace-fm-app
        
        echo "=== 強制アプリケーション起動 ==="
        docker-compose -f docker-compose.prod.yml up -d --force-recreate
        
        echo "=== 起動待機 ==="
        for i in {1..60}; do
            if curl -s http://127.0.0.1:5000/api/version > /dev/null 2>&1; then
                echo "アプリケーション起動完了"
                break
            fi
            echo "待機中... ($i/60)"
            sleep 3
        done
        
        echo "=== スキーマとデータ初期化 ==="
        docker-compose -f docker-compose.prod.yml exec backspace-fm npm run db:push
        
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm << 'FINAL_DATA'
INSERT INTO users (username, password, is_admin, email, created_at) 
VALUES ('admin', 'fmbackspace55', true, 'admin@backspace.fm', NOW())
ON CONFLICT (username) DO NOTHING;

INSERT INTO weeks (title, start_date, end_date, is_active)
VALUES ('2025年第2週', '2025-01-06', '2025-01-12', true)
ON CONFLICT DO NOTHING;

SELECT username, is_admin FROM users WHERE username = 'admin';
FINAL_DATA
        
        echo "=== 最終動作確認 ==="
        echo "バージョン確認:"
        curl -s http://127.0.0.1:5000/api/version
        echo ""
        
        echo "ログインテスト:"
        curl -s -X POST -H "Content-Type: application/json" \
             -d '{"username":"admin","password":"fmbackspace55"}' \
             -c /tmp/final_session.txt \
             http://127.0.0.1:5000/api/auth/login
        echo ""
        
        echo "認証確認:"
        curl -s -b /tmp/final_session.txt http://127.0.0.1:5000/api/auth/me
        echo ""
        
        echo "管理画面アクセス:"
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/final_session.txt http://127.0.0.1:5000/admin)
        echo "HTTP Status: $STATUS"
        
        rm -f /tmp/final_session.txt
        
        echo ""
        echo "=== システム最終状態 ==="
        docker-compose -f docker-compose.prod.yml ps
        
VERIFY_EOF
}

final_verification