#!/bin/bash

# The Hub - 快速部署脚本
# 
# 使用方法：
# 1. 在服务器上，确保代码已上传到 /var/www/the-hub
# 2. 确保 .env 文件已配置
# 3. 执行：bash deploy/quick-deploy.sh
# 
# 此脚本会执行：安装依赖、构建、迁移、种子、启动服务

set -e

echo "=========================================="
echo "The Hub - 快速部署脚本"
echo "=========================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误：请在项目根目录执行此脚本${NC}"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${RED}错误：.env 文件不存在${NC}"
    echo "请先创建 .env 文件：cp deploy/env.production.template .env"
    exit 1
fi

# 1. 验证环境变量
echo ""
echo -e "${GREEN}[1/6] 验证环境变量...${NC}"
if [ -f "deploy/verify-env.sh" ]; then
    bash deploy/verify-env.sh || {
        echo -e "${RED}环境变量验证失败，请检查 .env 文件${NC}"
        exit 1
    }
else
    echo -e "${YELLOW}环境变量验证脚本不存在，跳过...${NC}"
fi

# 2. 安装依赖
echo ""
echo -e "${GREEN}[2/6] 安装依赖...${NC}"
npm install --production=false

# 3. 构建项目
echo ""
echo -e "${GREEN}[3/6] 构建项目...${NC}"
npm run build

# 4. 创建日志目录
echo ""
echo -e "${GREEN}[4/6] 创建日志目录...${NC}"
mkdir -p logs

# 5. 运行数据库迁移和种子
echo ""
echo -e "${GREEN}[5/6] 运行数据库迁移和种子...${NC}"
read -p "是否运行数据库迁移？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run migrate
else
    echo -e "${YELLOW}跳过数据库迁移${NC}"
fi

read -p "是否运行数据库种子？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run seed
else
    echo -e "${YELLOW}跳过数据库种子${NC}"
fi

# 6. 启动服务
echo ""
echo -e "${GREEN}[6/6] 启动服务...${NC}"
if command -v pm2 &> /dev/null; then
    # 检查服务是否已运行
    if pm2 list | grep -q "the-hub"; then
        echo -e "${YELLOW}服务已存在，重启服务...${NC}"
        pm2 restart the-hub
    else
        echo -e "${GREEN}启动新服务...${NC}"
        pm2 start ecosystem.config.js
    fi
    
    echo ""
    echo -e "${GREEN}服务状态：${NC}"
    pm2 status
    
    echo ""
    read -p "是否保存 PM2 配置？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 save
        echo -e "${GREEN}PM2 配置已保存${NC}"
    fi
    
    echo ""
    read -p "是否设置开机自启？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 startup
        echo -e "${GREEN}请按照上面的命令执行以设置开机自启${NC}"
    fi
else
    echo -e "${RED}PM2 未安装，无法启动服务${NC}"
    echo "请先安装 PM2：npm install -g pm2"
    exit 1
fi

# 完成
echo ""
echo -e "${GREEN}=========================================="
echo "部署完成！"
echo "==========================================${NC}"
echo ""
echo "下一步："
echo "1. 验证部署：bash deploy/verify-deployment.sh"
echo "2. 查看日志：pm2 logs the-hub"
echo "3. 测试健康检查：curl http://localhost:3000/health"
echo ""
