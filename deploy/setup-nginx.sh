#!/bin/bash

# The Hub - Nginx 反向代理配置脚本
# 
# 使用方法：
# 1. 在服务器上，进入项目目录：cd /var/www/the-hub
# 2. 执行：bash deploy/setup-nginx.sh
# 
# 此脚本会：
# - 检查并安装 Nginx
# - 创建 Nginx 配置文件
# - 启用配置
# - 测试并重启 Nginx
# - 配置防火墙

set -e

echo "=========================================="
echo "The Hub - Nginx 反向代理配置"
echo "=========================================="
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 检查并安装 Nginx
echo -e "${BLUE}[1/6] 检查 Nginx 安装...${NC}"
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ Nginx 已安装${NC}"
    nginx -v
else
    echo "正在安装 Nginx..."
    apt update
    apt install -y nginx
    echo -e "${GREEN}✅ Nginx 安装完成${NC}"
fi
echo ""

# 2. 获取服务器 IP 或域名
echo -e "${BLUE}[2/6] 配置服务器名称...${NC}"
read -p "请输入域名（如果有，直接回车使用 IP 地址）：" DOMAIN
if [ -z "$DOMAIN" ]; then
    SERVER_NAME=$(hostname -I | awk '{print $1}')
    echo -e "${YELLOW}使用 IP 地址：${SERVER_NAME}${NC}"
else
    SERVER_NAME="$DOMAIN"
    echo -e "${GREEN}使用域名：${SERVER_NAME}${NC}"
fi
echo ""

# 3. 创建 Nginx 配置文件
echo -e "${BLUE}[3/6] 创建 Nginx 配置文件...${NC}"
NGINX_CONFIG="/etc/nginx/sites-available/the-hub"

# 检查配置文件是否已存在
if [ -f "$NGINX_CONFIG" ]; then
    echo -e "${YELLOW}配置文件已存在，是否覆盖？(y/n)${NC}"
    read -p "" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}跳过配置文件创建${NC}"
    else
        rm -f "$NGINX_CONFIG"
    fi
fi

# 创建配置文件
cat > "$NGINX_CONFIG" <<EOF
# The Hub - Nginx 反向代理配置
# 自动生成于 $(date)

server {
    listen 80;
    server_name ${SERVER_NAME};

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

echo -e "${GREEN}✅ Nginx 配置文件已创建：${NGINX_CONFIG}${NC}"
echo ""

# 4. 启用配置
echo -e "${BLUE}[4/6] 启用 Nginx 配置...${NC}"
NGINX_ENABLED="/etc/nginx/sites-enabled/the-hub"
if [ -L "$NGINX_ENABLED" ]; then
    echo -e "${YELLOW}配置已启用，跳过${NC}"
else
    ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"
    echo -e "${GREEN}✅ 配置已启用${NC}"
fi
echo ""

# 5. 测试并重启 Nginx
echo -e "${BLUE}[5/6] 测试 Nginx 配置...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Nginx 配置测试通过${NC}"
    echo "正在重启 Nginx..."
    systemctl restart nginx
    systemctl enable nginx
    echo -e "${GREEN}✅ Nginx 已重启并设置开机自启${NC}"
else
    echo -e "${RED}❌ Nginx 配置测试失败${NC}"
    echo "请检查配置文件：$NGINX_CONFIG"
    exit 1
fi
echo ""

# 6. 配置防火墙
echo -e "${BLUE}[6/6] 配置防火墙...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo -e "${GREEN}✅ 防火墙规则已添加${NC}"
    if ! ufw status | grep -q "Status: active"; then
        echo -e "${YELLOW}⚠️  防火墙未启用，是否启用？(y/n)${NC}"
        read -p "" -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ufw --force enable
            echo -e "${GREEN}✅ 防火墙已启用${NC}"
        fi
    else
        echo -e "${GREEN}✅ 防火墙已启用${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  UFW 未安装，跳过防火墙配置${NC}"
fi
echo ""

# 完成
echo -e "${GREEN}=========================================="
echo "Nginx 配置完成！"
echo "==========================================${NC}"
echo ""
echo "配置信息："
echo "- 服务器名称：${SERVER_NAME}"
echo "- HTTP 端口：80"
echo "- 配置文件：${NGINX_CONFIG}"
echo ""
echo "下一步操作："
echo "1. 测试访问：curl http://${SERVER_NAME}/health"
echo "2. 查看 Nginx 日志：tail -f /var/log/nginx/the-hub-access.log"
echo "3. 查看 Nginx 错误日志：tail -f /var/log/nginx/the-hub-error.log"
echo ""
echo -e "${BLUE}提示：${NC}"
echo "- 如果使用域名，请确保 DNS 已正确配置"
echo "- 如果需要 SSL，可以运行：certbot --nginx -d ${SERVER_NAME}"
echo ""
