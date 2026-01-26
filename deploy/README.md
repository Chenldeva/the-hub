# 部署文档

本目录包含 The Hub 集成服务器的部署相关文件和脚本。

## 文件说明

- **digitalocean-deployment.md** - 完整的 DigitalOcean 部署指南
- **env.production.template** - 生产环境变量配置模板
- **setup-server.sh** - 服务器初始化脚本（自动安装 Node.js、PM2、Nginx 等）
- **nginx.conf.example** - Nginx 反向代理配置示例
- **pre-deployment-checklist.md** - 部署前检查清单
- **verify-env.sh** - 环境变量验证脚本
- **verify-deployment.sh** - 部署验证脚本
- **quick-deploy.sh** - 快速部署脚本（安装依赖、构建、迁移、启动）

## 快速开始

### 1. 准备服务器

在 DigitalOcean Droplet 上运行初始化脚本：

```bash
# 上传 setup-server.sh 到服务器
scp deploy/setup-server.sh root@your_droplet_ip:/root/

# 连接到服务器
ssh root@your_droplet_ip

# 运行初始化脚本
chmod +x setup-server.sh
./setup-server.sh
```

### 2. 上传代码

```bash
# 方法 1：使用 Git（推荐）
cd /var/www/the-hub
git clone your_repository_url .

# 方法 2：使用 rsync
rsync -avz --exclude 'node_modules' --exclude '.git' . root@your_droplet_ip:/var/www/the-hub
```

### 3. 配置环境变量

```bash
cd /var/www/the-hub
cp deploy/env.production.template .env
nano .env  # 填写所有必需的环境变量
chmod 600 .env

# 验证环境变量（可选但推荐）
bash deploy/verify-env.sh
```

### 4. 安装依赖并构建

**方法 1：使用快速部署脚本（推荐）**

```bash
cd /var/www/the-hub
bash deploy/quick-deploy.sh
```

**方法 2：手动执行**

```bash
cd /var/www/the-hub
npm install
npm run build

# 运行数据库迁移和种子
npm run migrate
npm run seed

# 创建日志目录
mkdir -p logs

# 使用 PM2 启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. 配置 Nginx（可选但推荐）

```bash
# 复制 Nginx 配置
cp deploy/nginx.conf.example /etc/nginx/sites-available/the-hub

# 编辑配置（修改 server_name）
nano /etc/nginx/sites-available/the-hub

# 启用配置
ln -s /etc/nginx/sites-available/the-hub /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 8. 配置 SSL（可选但推荐）

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## 验证部署

### 使用验证脚本（推荐）

```bash
cd /var/www/the-hub
bash deploy/verify-deployment.sh
```

### 手动验证

```bash
# 检查服务状态
pm2 status
pm2 logs the-hub --lines 50

# 测试端点
curl http://localhost:3000/health
curl http://your-domain.com/health
curl http://your-domain.com/metrics
curl http://your-domain.com/metrics/json
```

## 维护

### 更新代码

```bash
cd /var/www/the-hub
git pull
npm install
npm run build
npm run migrate  # 如果有新的迁移
pm2 restart the-hub
```

### 查看日志

```bash
# PM2 日志
pm2 logs the-hub

# Nginx 日志
tail -f /var/log/nginx/the-hub-access.log
tail -f /var/log/nginx/the-hub-error.log
```

## 详细文档

请参考 [digitalocean-deployment.md](./digitalocean-deployment.md) 获取完整的部署指南，包括：

- 创建 Managed PostgreSQL 数据库
- 创建和配置 Droplet
- 详细的服务器配置步骤
- 故障排查指南
- 安全建议
- 备份策略

## 注意事项

1. **环境变量安全**：确保 `.env` 文件权限设置为 600，不要提交到 Git
2. **数据库连接**：确保 Managed PostgreSQL 的 Trusted Sources 包含 Droplet IP
3. **Webhook URL**：确保 `WEBHOOK_BASE_URL` 是公网可访问的完整 URL
4. **防火墙**：确保防火墙允许必要的端口（22, 80, 443）
5. **SSL 证书**：生产环境强烈建议使用 SSL/TLS 加密
