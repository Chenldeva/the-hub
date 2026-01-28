#!/bin/bash

# The Hub - 更新 Nginx 配置以支持 HTTPS
# 
# 使用方法：
# 1. 在服务器上，执行：bash deploy/update-nginx-ssl.sh
# 
# 此脚本会：
# - 备份当前配置
# - 更新 the-hub 配置以支持 HTTPS
# - 测试并重启 Nginx

set -e

echo "=========================================="
echo "The Hub - 更新 Nginx HTTPS 配置"
echo "=========================================="
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

NGINX_CONFIG="/etc/nginx/sites-available/the-hub"
DOMAIN="hub.hauteedition.com"

# 检查配置文件是否存在
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ 配置文件不存在：${NGINX_CONFIG}${NC}"
    exit 1
fi

# 1. 备份当前配置
echo -e "${BLUE}[1/4] 备份当前配置...${NC}"
cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✅ 配置已备份${NC}"
echo ""

# 2. 创建新的 HTTPS 配置
echo -e "${BLUE}[2/4] 创建新的 HTTPS 配置...${NC}"
cat > "$NGINX_CONFIG" <<EOF
# The Hub - Nginx 反向代理配置（HTTPS）
# 自动更新于 $(date)

# HTTP 服务器 - 重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} 143.198.110.147;

    # 重定向所有 HTTP 请求到 HTTPS
    return 301 https://${DOMAIN}\$request_uri;
}

# HTTPS 服务器
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    # SSL 证书配置（Certbot 已生成）
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 日志配置
    access_log /var/log/nginx/the-hub-access.log;
    error_log /var/log/nginx/the-hub-error.log;

    # 客户端最大请求体大小（用于 webhook）
    client_max_body_size 10M;

    # 反向代理到 Node.js 应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket 支持（如果需要）
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # 标准代理头
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Webhook 需要原始请求体用于签名验证
        proxy_set_header Content-Length \$content_length;
        proxy_set_header Content-Type \$content_type;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查端点（不记录访问日志）
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # 监控指标端点（不记录访问日志）
    location /health/metrics {
        proxy_pass http://localhost:3000/health/metrics;
        access_log off;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # JSON 格式监控指标
    location /health/metrics/json {
        proxy_pass http://localhost:3000/health/metrics/json;
        access_log off;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Webhook 端点（需要原始请求体）
    location /webhooks/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # 保持原始请求体用于签名验证
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Content-Length \$content_length;
        proxy_set_header Content-Type \$content_type;
        
        # 不缓冲请求体
        proxy_request_buffering off;
        
        # 超时设置（webhook 可能需要更长时间）
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
EOF

echo -e "${GREEN}✅ 新配置已创建${NC}"
echo ""

# 3. 测试 Nginx 配置
echo -e "${BLUE}[3/4] 测试 Nginx 配置...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Nginx 配置测试通过${NC}"
else
    echo -e "${RED}❌ Nginx 配置测试失败${NC}"
    echo "正在恢复备份..."
    cp "${NGINX_CONFIG}.backup."* "$NGINX_CONFIG" 2>/dev/null || true
    exit 1
fi
echo ""

# 4. 重启 Nginx
echo -e "${BLUE}[4/4] 重启 Nginx...${NC}"
systemctl restart nginx
echo -e "${GREEN}✅ Nginx 已重启${NC}"
echo ""

# 完成
echo -e "${GREEN}=========================================="
echo "Nginx HTTPS 配置更新完成！"
echo "==========================================${NC}"
echo ""
echo "配置信息："
echo "- 域名：${DOMAIN}"
echo "- HTTP 端口：80（自动重定向到 HTTPS）"
echo "- HTTPS 端口：443"
echo "- SSL 证书：/etc/letsencrypt/live/${DOMAIN}/"
echo ""
echo "测试命令："
echo "1. 测试 HTTPS 健康检查：curl https://${DOMAIN}/health"
echo "2. 测试 HTTPS webhook：curl https://${DOMAIN}/webhooks/shipstation"
echo "3. 测试 HTTP 重定向：curl -I http://${DOMAIN}/health"
echo ""
