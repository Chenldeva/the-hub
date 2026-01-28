#!/bin/bash

# The Hub - 修复 Nginx SSL 配置冲突
# 
# 问题：default 配置可能与 the-hub 配置冲突
# 解决方法：禁用 default 配置或确保 the-hub 配置优先级更高

set -e

echo "=========================================="
echo "The Hub - 修复 Nginx SSL 配置冲突"
echo "=========================================="
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

NGINX_DEFAULT="/etc/nginx/sites-enabled/default"
NGINX_THE_HUB="/etc/nginx/sites-enabled/the-hub"
DOMAIN="hub.hauteedition.com"

# 1. 检查配置
echo -e "${BLUE}[1/4] 检查当前配置...${NC}"

if [ -L "$NGINX_DEFAULT" ]; then
    echo -e "${YELLOW}⚠️  default 配置已启用${NC}"
    echo "检查 default 配置中的 server_name..."
    
    # 检查 default 配置是否包含我们的域名
    if grep -q "server_name.*${DOMAIN}" /etc/nginx/sites-available/default 2>/dev/null; then
        echo -e "${YELLOW}⚠️  default 配置包含 ${DOMAIN}，可能导致冲突${NC}"
        echo ""
        echo "选项："
        echo "1. 禁用 default 配置（推荐）"
        echo "2. 修改 default 配置移除 ${DOMAIN}"
        echo ""
        read -p "选择操作 (1/2): " choice
        
        if [ "$choice" = "1" ]; then
            echo "正在禁用 default 配置..."
            rm -f "$NGINX_DEFAULT"
            echo -e "${GREEN}✅ default 配置已禁用${NC}"
        elif [ "$choice" = "2" ]; then
            echo "正在修改 default 配置..."
            # 移除包含域名的 server 块（需要手动编辑）
            echo -e "${YELLOW}请手动编辑 /etc/nginx/sites-available/default 移除包含 ${DOMAIN} 的 server 块${NC}"
        fi
    else
        echo -e "${GREEN}✅ default 配置不包含 ${DOMAIN}${NC}"
    fi
else
    echo -e "${GREEN}✅ default 配置未启用${NC}"
fi
echo ""

# 2. 检查 the-hub 配置
echo -e "${BLUE}[2/4] 检查 the-hub 配置...${NC}"
if [ -L "$NGINX_THE_HUB" ]; then
    echo -e "${GREEN}✅ the-hub 配置已启用${NC}"
    
    # 检查配置中的 server_name
    if grep -q "server_name.*${DOMAIN}" /etc/nginx/sites-available/the-hub; then
        echo -e "${GREEN}✅ the-hub 配置包含 ${DOMAIN}${NC}"
    else
        echo -e "${RED}❌ the-hub 配置不包含 ${DOMAIN}${NC}"
    fi
else
    echo -e "${RED}❌ the-hub 配置未启用${NC}"
    echo "正在启用..."
    ln -s /etc/nginx/sites-available/the-hub "$NGINX_THE_HUB"
    echo -e "${GREEN}✅ the-hub 配置已启用${NC}"
fi
echo ""

# 3. 测试 Nginx 配置
echo -e "${BLUE}[3/4] 测试 Nginx 配置...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Nginx 配置测试通过${NC}"
else
    echo -e "${RED}❌ Nginx 配置测试失败${NC}"
    echo "请检查错误信息并修复"
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
echo "配置冲突修复完成！"
echo "==========================================${NC}"
echo ""
echo "测试命令："
echo "1. curl https://${DOMAIN}/health"
echo "2. curl https://${DOMAIN}/webhooks/shipstation"
echo ""
