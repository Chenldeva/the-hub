# 部署状态记录

> 本文档记录当前部署的实时状态，便于后续继续部署任务

## 当前状态

**部署阶段**：代码上传准备阶段  
**最后更新**：2026-01-24

## 已完成的任务

### ✅ 1. 数据库创建
- **数据库名称**：`central-db`
- **版本**：PostgreSQL 18
- **连接信息**：
  ```
  Host: central-db-do-user-31680664-0.d.db.ondigitalocean.com
  Port: 25060
  Database: defaultdb
  User: doadmin
  Password: AVNS__omlnJXyfrxllO9oZ1z
  SSL Mode: require
  ```
- **Trusted Sources**：已添加 Droplet IP `143.198.110.147`
- **网络**：Public Network

### ✅ 2. Droplet 创建
- **主机名**：`the-hub`
- **IP 地址**：`143.198.110.147`
- **镜像**：Ubuntu 22.04 LTS
- **计划**：Basic (1 GB RAM / 1 vCPU)
- **区域**：与数据库相同

### ✅ 3. 服务器环境配置
- Node.js 20.x ✅
- PM2 ✅
- PostgreSQL 客户端 ✅
- Git ✅
- Nginx：已跳过（稍后需要时再安装）
- 防火墙规则：已添加（22, 80, 443 端口）
- 应用目录：`/var/www/the-hub` ✅

## 下一步操作

### 📋 立即需要执行的任务

#### 1. 上传代码到服务器

**在本地机器执行**（Windows PowerShell 或 Git Bash）：

```bash
# 方法 1：使用 rsync（推荐）
cd C:\Users\leda\Desktop\the-hub
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' . root@143.198.110.147:/var/www/the-hub

# 方法 2：使用 SCP（如果 rsync 不可用）
cd C:\Users\leda\Desktop\the-hub
scp -r . root@143.198.110.147:/var/www/the-hub
```

**验证上传**（在服务器上执行）：
```bash
ssh root@143.198.110.147
cd /var/www/the-hub
ls -la
# 应该看到 package.json, src/, deploy/ 等文件
```

#### 2. 配置环境变量

**在服务器上执行**：
```bash
cd /var/www/the-hub
cp deploy/env.production.template .env
nano .env
```

**需要填写的环境变量**：
```bash
# 数据库配置（使用已记录的连接信息）
DB_HOST=central-db-do-user-31680664-0.d.db.ondigitalocean.com
DB_PORT=25060
DB_NAME=defaultdb
DB_USER=doadmin
DB_PASSWORD=AVNS__omlnJXyfrxllO9oZ1z

# 服务配置
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
WEBHOOK_BASE_URL=https://143.198.110.147/webhooks
# 或使用域名（如果有）：WEBHOOK_BASE_URL=https://your-domain.com/webhooks

# ShipStation（需要填写实际值）
SHIPSTATION_API_KEY=your_shipstation_api_key
SHIPSTATION_API_SECRET=your_shipstation_api_secret
SHIPSTATION_WEBHOOK_SECRET=your_shipstation_webhook_secret

# Amazon SP-API（需要填写实际值）
AMAZON_SP_API_CLIENT_ID=your_amazon_client_id
AMAZON_SP_API_CLIENT_SECRET=your_amazon_client_secret
AMAZON_SP_API_REFRESH_TOKEN=your_amazon_refresh_token
AMAZON_SP_API_MARKETPLACE_ID=ATVPDKIKX0DER

# Zoho Inventory（需要填写实际值）
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REFRESH_TOKEN=your_zoho_refresh_token
ZOHO_WEBHOOK_SECRET=your_zoho_webhook_secret
```

**保护 .env 文件**：
```bash
chmod 600 .env
```

**验证环境变量**（可选）：
```bash
bash deploy/verify-env.sh
```

#### 3. 安装依赖并构建

**在服务器上执行**：
```bash
cd /var/www/the-hub
npm install --production=false
npm run build
```

#### 4. 运行数据库迁移和种子

**在服务器上执行**：
```bash
cd /var/www/the-hub
npm run migrate
npm run seed
```

#### 5. 启动服务

**在服务器上执行**：
```bash
cd /var/www/the-hub
mkdir -p logs
pm2 start ecosystem.config.js
pm2 status
pm2 logs the-hub
pm2 save
pm2 startup
# 按照输出的命令执行以设置开机自启
```

#### 6. 验证部署

**在服务器上执行**：
```bash
# 使用验证脚本
bash deploy/verify-deployment.sh

# 或手动测试
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

## 后续任务（可选）

- 配置 Nginx 反向代理
- 配置 SSL 证书（需要域名）
- 配置 ShipStation Webhook

## 快速参考

### 服务器连接
```bash
ssh root@143.198.110.147
```

### 应用目录
```bash
cd /var/www/the-hub
```

### 查看服务状态
```bash
pm2 status
pm2 logs the-hub
```

### 重启服务
```bash
pm2 restart the-hub
```

## 重要提醒

1. **数据库密码**：`AVNS__omlnJXyfrxllO9oZ1z`（已记录，配置 .env 时使用）
2. **Droplet IP**：`143.198.110.147`
3. **应用目录**：`/var/www/the-hub`
4. **环境变量**：所有 API keys 和 secrets 需要从实际服务获取并填写

## 故障排查

如果遇到问题，参考：
- `deploy/digitalocean-deployment.md` - 完整部署指南
- `deploy/README.md` - 快速部署指南
- `progress.md` - 任务进度记录
