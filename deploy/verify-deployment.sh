#!/bin/bash

# The Hub - 部署验证脚本
# 
# 使用方法：
# 1. 在服务器上，进入项目目录
# 2. 执行：bash deploy/verify-deployment.sh
# 
# 此脚本会验证部署是否成功

set -e

echo "=========================================="
echo "The Hub - 部署验证"
echo "=========================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. 检查 PM2 服务状态
echo ""
echo "1. 检查 PM2 服务状态..."
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 list | grep "the-hub" | awk '{print $10}' || echo "")
    if [ "$PM2_STATUS" == "online" ]; then
        echo -e "${GREEN}✓ PM2 服务运行正常${NC}"
    else
        echo -e "${RED}✗ PM2 服务未运行或状态异常${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗ PM2 未安装${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 2. 检查健康检查端点
echo ""
echo "2. 检查健康检查端点..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
if [ "$HEALTH_RESPONSE" == "200" ]; then
    HEALTH_BODY=$(curl -s http://localhost:3000/health)
    if echo "$HEALTH_BODY" | grep -q '"status":"healthy"'; then
        echo -e "${GREEN}✓ 健康检查端点正常${NC}"
        echo "  响应: $HEALTH_BODY"
    else
        echo -e "${YELLOW}○ 健康检查端点可访问，但状态不是 healthy${NC}"
        echo "  响应: $HEALTH_BODY"
    fi
else
    echo -e "${RED}✗ 健康检查端点无法访问 (HTTP $HEALTH_RESPONSE)${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 3. 检查监控指标端点
echo ""
echo "3. 检查监控指标端点..."
METRICS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/metrics || echo "000")
if [ "$METRICS_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓ 监控指标端点正常${NC}"
else
    echo -e "${RED}✗ 监控指标端点无法访问 (HTTP $METRICS_RESPONSE)${NC}"
    ERRORS=$((ERRORS + 1))
fi

METRICS_JSON_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/metrics/json || echo "000")
if [ "$METRICS_JSON_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓ JSON 格式监控指标端点正常${NC}"
else
    echo -e "${YELLOW}○ JSON 格式监控指标端点无法访问 (HTTP $METRICS_JSON_RESPONSE)${NC}"
fi

# 4. 检查数据库连接
echo ""
echo "4. 检查数据库连接..."
if [ -f .env ]; then
    source .env
    if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
        # 尝试连接数据库
        if command -v psql &> /dev/null; then
            if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "${DB_NAME:-postgres}" -c "SELECT 1;" &> /dev/null; then
                echo -e "${GREEN}✓ 数据库连接正常${NC}"
            else
                echo -e "${RED}✗ 数据库连接失败${NC}"
                ERRORS=$((ERRORS + 1))
            fi
        else
            echo -e "${YELLOW}○ PostgreSQL 客户端未安装，跳过数据库连接测试${NC}"
        fi
    else
        echo -e "${YELLOW}○ 数据库连接信息未配置，跳过数据库连接测试${NC}"
    fi
else
    echo -e "${YELLOW}○ .env 文件不存在，跳过数据库连接测试${NC}"
fi

# 5. 检查日志目录
echo ""
echo "5. 检查日志目录..."
if [ -d "logs" ]; then
    echo -e "${GREEN}✓ 日志目录存在${NC}"
    if [ -f "logs/pm2-out.log" ] || [ -f "logs/pm2-error.log" ]; then
        echo -e "${GREEN}✓ PM2 日志文件存在${NC}"
    else
        echo -e "${YELLOW}○ PM2 日志文件不存在（可能服务刚启动）${NC}"
    fi
else
    echo -e "${YELLOW}○ 日志目录不存在${NC}"
fi

# 6. 检查构建文件
echo ""
echo "6. 检查构建文件..."
if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✓ 构建文件存在${NC}"
else
    echo -e "${RED}✗ 构建文件不存在，请运行 npm run build${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 7. 检查 Nginx 配置（如果使用）
echo ""
echo "7. 检查 Nginx 配置..."
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓ Nginx 服务运行正常${NC}"
        if [ -f "/etc/nginx/sites-enabled/the-hub" ]; then
            echo -e "${GREEN}✓ Nginx 配置文件存在${NC}"
        else
            echo -e "${YELLOW}○ Nginx 配置文件不存在（如果未使用 Nginx，可忽略）${NC}"
        fi
    else
        echo -e "${YELLOW}○ Nginx 服务未运行（如果未使用 Nginx，可忽略）${NC}"
    fi
else
    echo -e "${YELLOW}○ Nginx 未安装（如果未使用 Nginx，可忽略）${NC}"
fi

# 总结
echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ 部署验证通过！${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ 发现 $ERRORS 个问题${NC}"
    echo ""
    echo "请检查上述错误并修复后重新验证"
    exit 1
fi
