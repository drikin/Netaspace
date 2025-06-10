#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

fix_missing_data() {
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'DATA_FIX_EOF'
        cd /home/ubuntu/backspace-fm-app
        
        echo "=== データベース内容確認 ==="
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U backspace_user -d backspace_fm << 'CHECK_DATA'
-- 全テーブルの内容確認
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'weeks', COUNT(*) FROM weeks
UNION ALL
SELECT 'topics', COUNT(*) FROM topics
UNION ALL
SELECT 'stars', COUNT(*) FROM stars;

-- 週データの詳細確認
SELECT id, title, start_date, end_date, is_active FROM weeks;

-- ユーザーデータ確認
SELECT id, username, is_admin FROM users;
CHECK_DATA
        
        echo ""
        echo "=== 必要なデータ作成 ==="
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U backspace_user -d backspace_fm << 'CREATE_DATA'
-- 管理者ユーザー確認・作成
INSERT INTO users (username, password, is_admin, email, created_at) 
VALUES ('admin', 'fmbackspace55', true, 'admin@backspace.fm', NOW())
ON CONFLICT (username) DO UPDATE SET 
  password = EXCLUDED.password,
  is_admin = EXCLUDED.is_admin,
  email = EXCLUDED.email;

-- アクティブな週を作成
INSERT INTO weeks (title, start_date, end_date, is_active)
VALUES ('2025年第2週', '2025-01-06', '2025-01-12', true)
ON CONFLICT DO NOTHING;

-- 追加の週データ作成
INSERT INTO weeks (title, start_date, end_date, is_active)
VALUES 
  ('2025年第3週', '2025-01-13', '2025-01-19', false),
  ('2025年第4週', '2025-01-20', '2025-01-26', false)
ON CONFLICT DO NOTHING;

-- サンプルトピック作成
INSERT INTO topics (week_id, title, url, description, submitter, fingerprint, created_at, status, stars)
VALUES 
  (1, 'サンプルトピック1', 'https://example.com/topic1', 'これは管理画面テスト用のサンプルトピックです。', 'admin', 'sample-fingerprint-1', NOW(), 'approved', 0),
  (1, 'サンプルトピック2', 'https://example.com/topic2', '管理機能の動作確認用のトピックです。', 'user1', 'sample-fingerprint-2', NOW(), 'pending', 2)
ON CONFLICT DO NOTHING;

-- データ確認
SELECT 'Final Data Check:' as status;
SELECT 'Users:' as table_name, COUNT(*) as count FROM users WHERE is_admin = true
UNION ALL
SELECT 'Active Weeks:', COUNT(*) FROM weeks WHERE is_active = true
UNION ALL
SELECT 'Topics:', COUNT(*) FROM topics
UNION ALL
SELECT 'Stars:', COUNT(*) FROM stars;

-- アクティブ週の詳細
SELECT id, title, start_date, end_date, is_active FROM weeks WHERE is_active = true;
CREATE_DATA
        
        echo ""
        echo "=== アプリケーション再起動 ==="
        docker-compose -f docker-compose.prod.yml restart backspace-fm
        
        echo "アプリケーション再起動待機中..."
        for i in {1..20}; do
            if curl -s http://127.0.0.1:5000/api/version > /dev/null; then
                echo "✅ アプリケーション再起動完了"
                break
            fi
            echo "待機中... ($i/20)"
            sleep 3
        done
        
        echo ""
        echo "=== API動作確認 ==="
        
        # バージョン確認
        echo "バージョン:"
        curl -s http://127.0.0.1:5000/api/version
        echo ""
        
        # 週データ確認
        echo "週データ:"
        curl -s http://127.0.0.1:5000/api/weeks
        echo ""
        
        # アクティブ週確認
        echo "アクティブ週:"
        curl -s http://127.0.0.1:5000/api/weeks/active
        echo ""
        
        echo ""
        echo "=== 完全ログインテスト ==="
        
        # ログイン
        echo "ログイン実行:"
        LOGIN_RESULT=$(curl -s -X POST \
             -H "Content-Type: application/json" \
             -d '{"username":"admin","password":"fmbackspace55"}' \
             -c /tmp/admin_session.txt \
             http://127.0.0.1:5000/api/auth/login)
        echo $LOGIN_RESULT
        echo ""
        
        # 認証状態確認
        echo "認証状態:"
        AUTH_RESULT=$(curl -s -b /tmp/admin_session.txt http://127.0.0.1:5000/api/auth/me)
        echo $AUTH_RESULT
        echo ""
        
        # 管理画面データアクセス
        echo "管理画面用データ:"
        ADMIN_DATA=$(curl -s -b /tmp/admin_session.txt http://127.0.0.1:5000/api/weeks/active)
        echo $ADMIN_DATA
        echo ""
        
        # 管理画面アクセス
        echo "管理画面アクセス:"
        ADMIN_PAGE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/admin_session.txt http://127.0.0.1:5000/admin)
        echo "Status: $ADMIN_PAGE"
        
        # クリーンアップ
        rm -f /tmp/admin_session.txt
        
        echo ""
        echo "=== 修正完了 ==="
        echo "管理者ログイン情報:"
        echo "  URL: http://neta.backspace.fm/admin"
        echo "  ユーザー名: admin"
        echo "  パスワード: fmbackspace55"
        echo ""
        echo "データベース内容:"
        echo "  - 管理者ユーザー: 作成済み"
        echo "  - アクティブ週: 作成済み"
        echo "  - サンプルトピック: 作成済み"
        
DATA_FIX_EOF
}

fix_missing_data