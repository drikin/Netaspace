# DNS設定ガイド - neta.backspace.fm

## 1. DNSレコードの設定

### 必要なレコード

**Aレコード**:
```
neta.backspace.fm    IN  A  [サーバーのIPアドレス]
```

**CNAMEレコード（オプション - wwwサブドメイン）**:
```
www.neta.backspace.fm  IN  CNAME  neta.backspace.fm
```

### 一般的なDNSプロバイダーでの設定例

#### Cloudflare
1. Cloudflareダッシュボードにログイン
2. `backspace.fm` ドメインを選択
3. DNS > Records セクションで：
   - Type: `A`
   - Name: `neta`
   - Content: `[サーバーIPアドレス]`
   - Proxy status: オレンジクラウド（Proxied）推奨
   - TTL: Auto

#### AWS Route 53
1. Route 53コンソールでHosted Zone `backspace.fm` を選択
2. Create Record：
   - Record name: `neta`
   - Record type: `A`
   - Value: `[サーバーIPアドレス]`
   - TTL: 300

#### Google Cloud DNS
1. Cloud DNSでゾーン `backspace.fm` を選択
2. レコードセットを追加：
   - DNS名: `neta.backspace.fm`
   - リソースレコードのタイプ: `A`
   - IPv4アドレス: `[サーバーIPアドレス]`

## 2. サーバーでのNginx設定

DNS設定後、サーバーでNginxを設定：

```bash
# SSL証明書付きでセットアップ
sudo ./scripts/nginx-setup.sh neta.backspace.fm admin@backspace.fm
```

## 3. SSL証明書の設定

Let's Encryptで自動SSL証明書を取得：

```bash
# 手動でSSL設定（nginx-setup.shに含まれています）
sudo certbot --nginx -d neta.backspace.fm --email admin@backspace.fm --agree-tos --non-interactive
```

## 4. 設定確認

### DNS伝播確認
```bash
# DNSが正しく設定されているか確認
dig neta.backspace.fm
nslookup neta.backspace.fm

# 複数の場所からのDNS確認（オンラインツール）
# https://www.whatsmydns.net/#A/neta.backspace.fm
```

### サービス確認
```bash
# Nginx状態確認
./scripts/nginx-status.sh

# HTTPSアクセステスト
curl -I https://neta.backspace.fm/api/version
```

## 5. トラブルシューティング

### DNS伝播が遅い場合
- 通常24-48時間で完全に伝播
- TTL値を短く設定（300秒など）すると早くなる

### SSL証明書取得エラー
```bash
# DNS確認
dig neta.backspace.fm

# ポート80が開いているか確認
sudo ufw status
sudo netstat -tlnp | grep :80

# 手動でcertbot実行
sudo certbot --nginx -d neta.backspace.fm --dry-run
```

### アクセスできない場合
```bash
# ファイアウォール確認
sudo ufw status

# Nginx設定テスト
sudo nginx -t

# アプリケーション動作確認
docker-compose ps
curl http://localhost:5000/api/version
```

## 6. 完成後の確認項目

✅ DNS設定完了: `dig neta.backspace.fm` で正しいIPアドレスが返される  
✅ HTTP接続: `http://neta.backspace.fm` でアクセス可能  
✅ HTTPS接続: `https://neta.backspace.fm` でアクセス可能  
✅ SSL証明書: ブラウザで「安全」表示  
✅ アプリ動作: 管理画面やAPI機能が正常動作  

## 7. 定期メンテナンス

### SSL証明書の自動更新確認
```bash
# 自動更新のテスト
sudo certbot renew --dry-run

# Cron設定確認
sudo crontab -l | grep certbot
```

### ログ監視
```bash
# アクセスログ
sudo tail -f /var/log/nginx/access.log

# エラーログ
sudo tail -f /var/log/nginx/error.log

# アプリケーションログ
docker-compose logs -f
```