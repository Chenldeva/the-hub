#!/bin/bash

# The Hub - 重新部署脚本（自动化）
# 
# 使用方法：
# 1. 在服务器上，进入项目目录：cd /var/www/the-hub
# 2. 执行：bash deploy/redeploy.sh
# 
# 此脚本会执行：
# - 拉取最新代码
# - 运行数据库迁移
# - 运行数据库种子
# - 启动/重启 PM2 服务
# - 保存 PM2 配置
# - 设置开机自启

set -e  # 遇到错误立即退出

echo "=========================================="
echo "The Hub - 重新部署脚本（自动化）"
echo "=========================================="
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误：请在项目根目录执行此脚本${NC}"
    echo "当前目录：$(pwd)"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${RED}❌ 错误：.env 文件不存在${NC}"
    echo "请先创建 .env 文件并配置环境变量"
    exit 1
fi

# 1. 拉取最新代码
echo -e "${BLUE}[1/6] 拉取最新代码...${NC}"
if [ -d .git ]; then
    echo "正在从 Git 拉取最新代码..."
    git pull || {
        echo -e "${YELLOW}⚠️  Git pull 失败，继续执行（可能没有远程仓库或网络问题）${NC}"
    }
    echo -e "${GREEN}✅ 代码更新完成${NC}"
else
    echo -e "${YELLOW}⚠️  当前目录不是 Git 仓库，跳过代码拉取${NC}"
fi
echo ""

# 2. 检查并安装依赖（如果需要）
echo -e "${BLUE}[2/6] 检查依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo "node_modules 不存在，正在安装依赖..."
    npm install --production=false
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
else
    echo -e "${GREEN}✅ 依赖已存在，跳过安装${NC}"
fi
echo ""

# 3. 构建项目
echo -e "${BLUE}[3/6] 构建项目...${NC}"
npm run build
echo -e "${GREEN}✅ 项目构建完成${NC}"
echo ""

# 4. 创建日志目录
echo -e "${BLUE}[4/6] 创建日志目录...${NC}"
mkdir -p logs
echo -e "${GREEN}✅ 日志目录已创建${NC}"
echo ""

# 5. 运行数据库迁移
echo -e "${BLUE}[5/6] 运行数据库迁移...${NC}"
if npm run migrate; then
    echo -e "${GREEN}✅ 数据库迁移成功${NC}"
else
    echo -e "${RED}❌ 数据库迁移失败${NC}"
    echo "请检查："
    echo "1. 数据库连接配置是否正确（.env 文件）"
    echo "2. 数据库是否可访问"
    echo "3. SSL 配置是否正确"
    exit 1
fi
echo ""

# 6. 运行数据库种子
echo -e "${BLUE}[6/6] 运行数据库种子...${NC}"
if npm run seed; then
    echo -e "${GREEN}✅ 数据库种子执行成功${NC}"
else
    echo -e "${YELLOW}⚠️  数据库种子执行失败或已存在数据（可能可以继续）${NC}"
    # 种子失败不一定致命，继续执行
fi
echo ""

# 7. 启动/重启 PM2 服务
echo -e "${BLUE}[7/7] 启动 PM2 服务...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 未安装，无法启动服务${NC}"
    echo "请先安装 PM2：npm install -g pm2"
    exit 1
fi

# 检查服务是否已运行
if pm2 list | grep -q "the-hub"; then
    echo "服务已存在，正在重启..."
    pm2 restart the-hub
    echo -e "${GREEN}✅ 服务已重启${NC}"
else
    echo "启动新服务..."
    pm2 start ecosystem.config.js
    echo -e "${GREEN}✅ 服务已启动${NC}"
fi

# 等待服务启动
sleep 2

# 显示服务状态
echo ""
echo -e "${GREEN}服务状态：${NC}"
pm2 status

# 保存 PM2 配置
echo ""
echo "保存 PM2 配置..."
pm2 save
echo -e "${GREEN}✅ PM2 配置已保存${NC}"

# 设置开机自启
echo ""
echo "检查开机自启配置..."
if pm2 startup | grep -q "sudo"; then
    echo -e "${YELLOW}⚠️  需要执行以下命令以设置开机自启：${NC}"
    pm2 startup
    echo ""
    echo -e "${YELLOW}请复制上面的命令并执行${NC}"
else
    echo -e "${GREEN}✅ 开机自启已配置${NC}"
fi

# 显示日志
echo ""
echo -e "${GREEN}=========================================="
echo "部署完成！"
echo "==========================================${NC}"
echo ""
echo "下一步操作："
echo "1. 查看服务日志：${GREEN}pm2 logs the-hub${NC}"
echo "2. 查看服务状态：${GREEN}pm2 status${NC}"
echo "3. 测试健康检查：${GREEN}curl http://localhost:3000/health${NC}"
echo "4. 验证部署：${GREEN}bash deploy/verify-deployment.sh${NC}"
echo ""
echo -e "${BLUE}提示：${NC}"
echo "- 如果服务未正常运行，请检查日志：pm2 logs the-hub"
echo "- 如果数据库连接失败，请检查 .env 文件中的数据库配置"
echo "- 如果迁移失败，请检查数据库连接和 SSL 配置"
echo ""
