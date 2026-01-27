#!/bin/bash

# The Hub - 环境变量验证脚本
# 
# 使用方法：
# 1. 在服务器上，进入项目目录
# 2. 执行：bash deploy/verify-env.sh
# 
# 此脚本会检查 .env 文件中的必需环境变量是否已配置

set -e

echo "=========================================="
echo "The Hub - 环境变量验证"
echo "=========================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
    echo -e "${RED}错误：.env 文件不存在${NC}"
    echo "请先创建 .env 文件：cp deploy/env.production.template .env"
    exit 1
fi

# 加载 .env 文件
set -a
source .env
set +a

# 必需的环境变量列表
REQUIRED_VARS=(
    "DB_HOST"
    "DB_PORT"
    "DB_NAME"
    "DB_USER"
    "DB_PASSWORD"
    "NODE_ENV"
    "LOG_LEVEL"
    "PORT"
    "WEBHOOK_BASE_URL"
    "SHIPSTATION_API_KEY"
    "SHIPSTATION_API_SECRET"
)

# 可选的环境变量列表
OPTIONAL_VARS=(
    "DATABASE_URL"
    "SHIPSTATION_WEBHOOK_SECRET"
    "AMAZON_SP_API_CLIENT_ID"
    "AMAZON_SP_API_CLIENT_SECRET"
    "AMAZON_SP_API_REFRESH_TOKEN"
    "AMAZON_SP_API_MARKETPLACE_ID"
    "ZOHO_CLIENT_ID"
    "ZOHO_CLIENT_SECRET"
    "ZOHO_REFRESH_TOKEN"
    "ZOHO_WEBHOOK_SECRET"
    "EBAY_APP_ID"
    "EBAY_CERT_ID"
    "EBAY_DEV_ID"
    "EBAY_REFRESH_TOKEN"
    "ALERT_EMAIL_TO"
    "ALERT_SMS_TO"
)

# 检查必需变量
echo ""
echo "检查必需环境变量..."
echo ""

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}✗ ${var} 未设置${NC}"
        MISSING_VARS+=("$var")
    else
        # 隐藏敏感信息
        if [[ "$var" == *"PASSWORD"* ]] || [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"KEY"* ]] || [[ "$var" == *"TOKEN"* ]]; then
            echo -e "${GREEN}✓ ${var} 已设置${NC} (值已隐藏)"
        else
            echo -e "${GREEN}✓ ${var} 已设置${NC} = ${!var}"
        fi
    fi
done

# 检查可选变量
echo ""
echo "检查可选环境变量..."
echo ""

for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${YELLOW}○ ${var} 未设置（可选）${NC}"
    else
        if [[ "$var" == *"PASSWORD"* ]] || [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"KEY"* ]] || [[ "$var" == *"TOKEN"* ]]; then
            echo -e "${GREEN}✓ ${var} 已设置${NC} (值已隐藏)"
        else
            echo -e "${GREEN}✓ ${var} 已设置${NC} = ${!var}"
        fi
    fi
done

# 验证 WEBHOOK_BASE_URL 格式
echo ""
echo "验证 WEBHOOK_BASE_URL 格式..."
if [ -n "$WEBHOOK_BASE_URL" ]; then
    if [[ "$WEBHOOK_BASE_URL" =~ ^https?:// ]]; then
        echo -e "${GREEN}✓ WEBHOOK_BASE_URL 格式正确${NC}"
    else
        echo -e "${RED}✗ WEBHOOK_BASE_URL 格式错误，应以 http:// 或 https:// 开头${NC}"
        MISSING_VARS+=("WEBHOOK_BASE_URL_FORMAT")
    fi
fi

# 验证数据库连接信息
echo ""
echo "验证数据库连接信息..."
if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ] && [ -n "$DB_NAME" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
    echo -e "${GREEN}✓ 数据库连接信息完整${NC}"
    echo "  主机: $DB_HOST"
    echo "  端口: $DB_PORT"
    echo "  数据库: $DB_NAME"
    echo "  用户: $DB_USER"
else
    echo -e "${YELLOW}○ 数据库连接信息不完整，或使用 DATABASE_URL${NC}"
fi

# 总结
echo ""
echo "=========================================="
if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ 所有必需环境变量已配置${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ 发现 ${#MISSING_VARS[@]} 个缺失的必需环境变量${NC}"
    echo ""
    echo "缺失的变量："
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "请编辑 .env 文件并填写所有必需的环境变量"
    exit 1
fi
