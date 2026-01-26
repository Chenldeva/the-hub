#!/bin/bash

# The Hub - DigitalOcean 服务器初始化脚本
# 
# 使用方法：
# 1. 上传此脚本到服务器
# 2. 赋予执行权限：chmod +x setup-server.sh
# 3. 执行：./setup-server.sh
#
# 注意：此脚本假设以 root 用户运行

set -e  # 遇到错误立即退出

echo "=========================================="
echo "The Hub - 服务器初始化脚本"
echo "=========================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}错误：请以 root 用户运行此脚本${NC}"
    exit 1
fi

# 1. 更新系统
echo -e "${GREEN}[1/8] 更新系统包...${NC}"
apt update && apt upgrade -y

# 2. 安装 Node.js 20.x
echo -e "${GREEN}[2/8] 安装 Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo -e "${YELLOW}Node.js 已安装，跳过...${NC}"
fi

# 验证 Node.js 版本
NODE_VERSION=$(node --version)
echo -e "${GREEN}Node.js 版本: ${NODE_VERSION}${NC}"

# 3. 安装 PM2
echo -e "${GREEN}[3/8] 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo -e "${YELLOW}PM2 已安装，跳过...${NC}"
fi

# 4. 安装 PostgreSQL 客户端（可选）
echo -e "${GREEN}[4/8] 安装 PostgreSQL 客户端...${NC}"
apt install -y postgresql-client

# 5. 安装 Git（如果未安装）
echo -e "${GREEN}[5/8] 安装 Git...${NC}"
if ! command -v git &> /dev/null; then
    apt install -y git
else
    echo -e "${YELLOW}Git 已安装，跳过...${NC}"
fi

# 6. 安装 Nginx（可选）
read -p "是否安装 Nginx 作为反向代理？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}[6/8] 安装 Nginx...${NC}"
    if ! command -v nginx &> /dev/null; then
        apt install -y nginx
        systemctl enable nginx
    else
        echo -e "${YELLOW}Nginx 已安装，跳过...${NC}"
    fi
else
    echo -e "${YELLOW}跳过 Nginx 安装${NC}"
fi

# 7. 配置防火墙
echo -e "${GREEN}[7/8] 配置防火墙...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo -e "${YELLOW}防火墙规则已添加。请手动执行 'ufw enable' 启用防火墙${NC}"
else
    echo -e "${YELLOW}UFW 未安装，跳过防火墙配置${NC}"
fi

# 8. 创建应用目录
echo -e "${GREEN}[8/8] 创建应用目录...${NC}"
APP_DIR="/var/www/the-hub"
mkdir -p "$APP_DIR"
echo -e "${GREEN}应用目录: ${APP_DIR}${NC}"

# 完成
echo ""
echo -e "${GREEN}=========================================="
echo "服务器初始化完成！"
echo "==========================================${NC}"
echo ""
echo "下一步："
echo "1. 将代码上传到 ${APP_DIR}"
echo "2. 在 ${APP_DIR} 目录下创建 .env 文件并配置环境变量"
echo "3. 运行: cd ${APP_DIR} && npm install && npm run build"
echo "4. 运行数据库迁移: npm run migrate"
echo "5. 运行数据库种子: npm run seed"
echo "6. 使用 PM2 启动服务: pm2 start ecosystem.config.js"
echo "7. 保存 PM2 配置: pm2 save"
echo "8. 设置开机自启: pm2 startup"
echo ""
