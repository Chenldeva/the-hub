# DigitalOcean 部署指南

本文档详细说明如何将 The Hub 集成服务器部署到 DigitalOcean。

## 前置要求

- DigitalOcean 账号
- 域名或 IP 地址（用于 webhook URL）
- 所有 API 凭证（ShipStation、Amazon SP-API、Zoho 等）
- SSH 访问权限

## 部署步骤

### 1. 创建 DigitalOcean Managed PostgreSQL 数据库

1. 登录 DigitalOcean 控制台
2. 进入 **Databases** → **Create Database**
3. 选择配置：
   - **Database Engine**: PostgreSQL
   - **Version**: 14 或更高版本
   - **Datacenter Region**: 选择与 Droplet 相同的区域（推荐）
   - **Database Plan**: 根据需求选择（开发环境可选择 Basic 计划）
4. 创建数据库后：
   - 记录 **Host**、**Port**、**Database**、**User**、**Password**
   - 配置 **Trusted Sources**：添加 Droplet 的 IP 地址
   - 如果需要从本地连接，添加你的 IP 地址

### 2. 创建 DigitalOcean Droplet

1. 进入 **Droplets** → **Create Droplet**
2. 选择配置：
   - **Image**: Ubuntu 22.04 LTS（推荐）
   - **Plan**: 根据需求选择（建议至少 1GB RAM）
   - **Datacenter Region**: 选择与数据库相同的区域
   - **Authentication**: SSH keys 或 Password
3. 创建后记录 **IP 地址**

### 3. 配置 Droplet 服务器

#### 3.1 连接到服务器

```bash
ssh root@your_droplet_ip
```

#### 3.2 更新系统

```bash
apt update && apt upgrade -y
```

#### 3.3 安装 Node.js 20.x

```bash
# 使用 NodeSource 仓库安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 验证安装
node --version  # 应该显示 v20.x.x
npm --version
```

#### 3.4 安装 PM2

```bash
npm install -g pm2
```

#### 3.5 安装 PostgreSQL 客户端（可选，用于调试）

```bash
apt install -y postgresql-client
```

#### 3.6 创建应用目录

```bash
mkdir -p /var/www/the-hub
cd /var/www/the-hub
```

### 4. 上传代码到服务器

#### 方法 1：使用 Git（推荐）

```bash
# 在服务器上安装 Git
apt install -y git

# 克隆仓库（如果使用私有仓库，需要配置 SSH keys）
git clone your_repository_url /var/www/the-hub
cd /var/www/the-hub
```

#### 方法 2：使用 SCP

```bash
# 在本地机器上执行
scp -r . root@your_droplet_ip:/var/www/the-hub
```

#### 方法 3：使用 rsync

```bash
# 在本地机器上执行
rsync -avz --exclude 'node_modules' --exclude '.git' . root@your_droplet_ip:/var/www/the-hub
```

### 5. 配置环境变量

#### 5.1 创建 .env 文件

```bash
cd /var/www/the-hub
nano .env
```

#### 5.2 填写环境变量

参考 `deploy/.env.production.example` 文件，填写所有必需的环境变量：

```bash
# 数据库配置（使用 Managed PostgreSQL 连接信息）
DB_HOST=your_managed_db_host
DB_PORT=25060
DB_NAME=defaultdb
DB_USER=doadmin
DB_PASSWORD=your_db_password

# 或者使用 DATABASE_URL
# DATABASE_URL=postgresql://doadmin:password@host:25060/defaultdb?sslmode=require

# 服务配置
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
WEBHOOK_BASE_URL=https://your-domain.com/webhooks

# ShipStation
SHIPSTATION_API_KEY=your_api_key
SHIPSTATION_API_SECRET=your_api_secret
SHIPSTATION_WEBHOOK_SECRET=your_webhook_secret

# Amazon SP-API
AMAZON_SP_API_CLIENT_ID=your_client_id
AMAZON_SP_API_CLIENT_SECRET=your_client_secret
AMAZON_SP_API_REFRESH_TOKEN=your_refresh_token
AMAZON_SP_API_MARKETPLACE_ID=ATVPDKIKX0DER

# Zoho Inventory
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_WEBHOOK_SECRET=your_webhook_secret

# 其他配置...
```

#### 5.3 保护 .env 文件

```bash
chmod 600 .env
```

### 6. 安装依赖并构建

```bash
cd /var/www/the-hub
npm install --production=false  # 需要 devDependencies 用于构建
npm run build
npm prune --production  # 删除 devDependencies（可选）
```

### 7. 运行数据库迁移和种子

```bash
cd /var/www/the-hub
npm run migrate
npm run seed
```

### 8. 创建日志目录

```bash
mkdir -p /var/www/the-hub/logs
```

### 9. 配置 PM2

#### 9.1 使用 ecosystem.config.js 启动

```bash
cd /var/www/the-hub
pm2 start ecosystem.config.js
```

#### 9.2 查看状态

```bash
pm2 status
pm2 logs the-hub
```

#### 9.3 保存 PM2 配置

```bash
pm2 save
```

#### 9.4 设置开机自启

```bash
pm2 startup
# 按照输出的命令执行（通常是 sudo env PATH=... pm2 startup systemd -u username --hp /home/username）
```

### 10. 配置 Nginx 反向代理（推荐）

#### 10.1 安装 Nginx

```bash
apt install -y nginx
```

#### 10.2 创建 Nginx 配置

```bash
nano /etc/nginx/sites-available/the-hub
```

配置内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 或使用 IP 地址

    # 日志
    access_log /var/log/nginx/the-hub-access.log;
    error_log /var/log/nginx/the-hub-error.log;

    # 反向代理到 Node.js 应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Webhook 需要原始请求体用于签名验证
        proxy_set_header Content-Length $content_length;
        proxy_set_header Content-Type $content_type;
    }

    # 健康检查和监控指标端点
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    location /metrics {
        proxy_pass http://localhost:3000/metrics;
        access_log off;
    }
}
```

#### 10.3 启用配置

```bash
ln -s /etc/nginx/sites-available/the-hub /etc/nginx/sites-enabled/
nginx -t  # 测试配置
systemctl restart nginx
```

#### 10.4 配置防火墙

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 11. 配置 SSL 证书（可选但推荐）

使用 Let's Encrypt 免费 SSL 证书：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

### 12. 验证部署

#### 12.1 检查服务状态

```bash
pm2 status
pm2 logs the-hub --lines 50
```

#### 12.2 测试健康检查端点

```bash
# 本地测试
curl http://localhost:3000/health

# 或通过域名/IP
curl http://your-domain.com/health
```

#### 12.3 测试监控指标端点

```bash
curl http://your-domain.com/metrics
curl http://your-domain.com/metrics/json
```

#### 12.4 测试 Webhook 端点

```bash
# 测试 ShipStation webhook（需要正确的签名）
curl -X POST http://your-domain.com/webhooks/shipstation \
  -H "Content-Type: application/json" \
  -H "X-ShipStation-Signature: your_signature" \
  -d '{"test": "data"}'
```

### 13. 配置 ShipStation Webhook

1. 登录 ShipStation 后台
2. 进入 **Settings** → **Webhooks**
3. 添加新的 Webhook：
   - **Event**: 选择需要的事件（如 Order Shipped）
   - **URL**: `https://your-domain.com/webhooks/shipstation`
   - **Secret**: 使用与 `SHIPSTATION_WEBHOOK_SECRET` 相同的值

## 维护操作

### 查看日志

```bash
# PM2 日志
pm2 logs the-hub

# 应用日志（如果配置了文件日志）
tail -f /var/www/the-hub/logs/app.log

# Nginx 日志
tail -f /var/log/nginx/the-hub-access.log
tail -f /var/log/nginx/the-hub-error.log
```

### 重启服务

```bash
pm2 restart the-hub
```

### 更新代码

```bash
cd /var/www/the-hub
git pull  # 或使用其他方式更新代码
npm install
npm run build
npm run migrate  # 如果有新的迁移
pm2 restart the-hub
```

### 查看监控指标

访问 `http://your-domain.com/metrics` 或 `http://your-domain.com/metrics/json`

## 故障排查

### 服务无法启动

1. 检查 PM2 日志：`pm2 logs the-hub`
2. 检查环境变量是否正确：`pm2 env the-hub`
3. 检查数据库连接：`npm run test:db`
4. 检查端口是否被占用：`netstat -tulpn | grep 3000`

### 数据库连接失败

1. 检查 Managed PostgreSQL 的 **Trusted Sources** 是否包含 Droplet IP
2. 检查环境变量中的数据库连接信息
3. 测试连接：`psql -h host -U user -d database`

### Webhook 无法访问

1. 检查防火墙规则
2. 检查 Nginx 配置
3. 检查域名 DNS 解析
4. 检查 SSL 证书是否有效

## 安全建议

1. **使用非 root 用户运行应用**（推荐）
2. **定期更新系统和依赖**
3. **使用防火墙限制访问**
4. **启用 SSL/TLS 加密**
5. **定期备份数据库**
6. **监控日志和指标**
7. **使用强密码和 API 密钥**

## 备份策略

### 数据库备份

DigitalOcean Managed PostgreSQL 提供自动备份，也可以手动备份：

```bash
# 导出数据库
pg_dump -h host -U user -d database > backup.sql

# 恢复数据库
psql -h host -U user -d database < backup.sql
```

### 应用代码备份

使用 Git 版本控制，定期推送到远程仓库。

## 监控和告警

1. 配置 DigitalOcean 监控告警
2. 使用 PM2 监控：`pm2 monit`
3. 定期检查 `/metrics` 端点
4. 设置日志监控（如使用 Logtail 或其他服务）
