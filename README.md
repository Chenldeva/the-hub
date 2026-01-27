# The Hub - Integration Server

多 marketplace 订单和库存管理集成服务器。

## 项目概述

The Hub 是一个集成服务器，用于管理多个 marketplace（Amazon、eBay、Rithum、Mirakl）的订单和库存同步，与 ShipStation 和 Zoho Inventory 集成。

## 技术栈

- **Node.js**: 20.x LTS
- **TypeScript**: 5.3.3
- **Express**: 4.18.2
- **Knex.js**: 3.0.0（数据库查询构建器 + 迁移）
- **PostgreSQL**: 数据库
- **Winston**: 3.11.0（结构化日志）
- **node-cron**: 3.0.3（任务调度）

## 项目结构

```
/src
  /config          # 数据库配置
  /middleware      # 中间件（raw body 等）
  /migrations      # 数据库迁移（Knex migrations）
  /routes          # Express 路由（webhooks, health, metrics）
  /scripts         # 测试与脚本
  /seeds           # 初始化数据（Knex seeds）
  /services        # 服务层（配置、调度、清理）
  /utils           # 工具函数（日志、重试、签名）
  index.ts         # 应用入口
  knexfile.ts      # Knex 配置（TS）
```

## 文档索引

- 文档总览：`docs/index/INDEX.md`
- 规格与流程：`docs/guides/integration-server-spec.md`
- 授权模型：`docs/guides/integration-server-auth-and-process.md`
- 接口契约：`docs/guides/api-contracts.md`
- 工程冻结清单：`docs/guides/frozen-engineering-facts.md`
- 测试报告：`docs/reports/test-server.md`

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件并填写必要的配置。参考以下环境变量列表：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=the_hub
DB_USER=postgres
DB_PASSWORD=your_password

# 或者使用 DATABASE_URL（如果使用连接字符串）
# DATABASE_URL=postgresql://user:password@localhost:5432/the_hub

# 服务配置
NODE_ENV=development
LOG_LEVEL=info
PORT=3000
WEBHOOK_BASE_URL=http://localhost:3000/webhooks

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

# eBay (M3)
EBAY_APP_ID=
EBAY_CERT_ID=
EBAY_DEV_ID=
EBAY_REFRESH_TOKEN=

# 告警渠道 (M0.2)
ALERT_EMAIL_TO=
ALERT_SMS_TO=
ALERT_EMAIL_SMTP_HOST=
ALERT_EMAIL_SMTP_PORT=
ALERT_EMAIL_SMTP_USER=
ALERT_EMAIL_SMTP_PASSWORD=
ALERT_SMS_PROVIDER_API_KEY=
```

### 3. 运行数据库迁移

```bash
npm run migrate
```

### 4. 运行数据库种子（初始化配置数据）

```bash
npm run seed
```

### 5. 启动开发服务器

```bash
npm run dev
```

### 6. 构建生产版本

```bash
npm run build
npm start
```

## 数据库迁移

### 创建新迁移

```bash
npm run migrate:make migration_name
```

### 运行迁移

```bash
npm run migrate
```

### 回滚迁移

```bash
npm run migrate:rollback
```

## 数据库种子

### 创建新种子

```bash
npm run seed:make seed_name
```

### 运行种子

```bash
npm run seed
```

## API 端点

### 健康检查

- `GET /health` - 健康检查端点

### 监控指标

- `GET /metrics` - Prometheus 格式的监控指标
- `GET /metrics/json` - JSON 格式的监控指标

### Webhooks

- `POST /webhooks/shipstation` - ShipStation webhook 端点
- `POST /webhooks/zoho` - Zoho Inventory webhook 端点
- `POST /webhooks/:source` - 通用 webhook 端点

## 核心功能

### 配置管理

配置存储在 `configs` 表中，支持以下配置类型：

- `marketplace_ratio` - Marketplace 分配比例
- `store_mapping` - Store 映射（marketplace → ShipStation store_id）
- `oversell_policy` - 超卖策略
- `safety_stock` - 安全库存
- `shadow_inventory` - 影子库存配置

### 任务调度

使用 node-cron 实现定时任务调度，支持 cron 表达式。

当前已配置的任务：
- 数据清理任务：每天凌晨 2 点执行（保留 90 天数据）

### 日志系统

使用 Winston 实现结构化 JSON 日志，自动脱敏敏感信息。

### 重试机制

实现指数退避重试机制，支持可配置的重试次数和延迟。

## 开发

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则（如配置）
- 使用结构化日志记录

### 测试

（待实现）

## 部署

### DigitalOcean 部署

详细的部署指南请参考 [deploy/digitalocean-deployment.md](./deploy/digitalocean-deployment.md)

#### 快速部署步骤

1. **准备服务器**：运行 `deploy/setup-server.sh` 初始化服务器
2. **上传代码**：将代码上传到 `/var/www/the-hub`
3. **配置环境变量**：复制 `deploy/env.production.template` 为 `.env` 并填写配置
4. **安装依赖并构建**：`npm install && npm run build`
5. **运行数据库迁移和种子**：`npm run migrate && npm run seed`
6. **启动服务**：使用 PM2 启动服务

```bash
# 使用 ecosystem.config.js 启动（推荐）
pm2 start ecosystem.config.js

# 或直接启动
pm2 start dist/index.js --name the-hub

# 保存配置并设置开机自启
pm2 save
pm2 startup
```

#### 验证部署

```bash
# 检查服务状态
pm2 status
pm2 logs the-hub

# 测试健康检查端点
curl http://localhost:3000/health

# 测试监控指标端点
curl http://localhost:3000/metrics
curl http://localhost:3000/metrics/json
```

#### 配置 Nginx 反向代理（推荐）

参考 `deploy/nginx.conf.example` 配置 Nginx 反向代理。

#### 环境变量配置

生产环境变量配置模板：`deploy/env.production.template`

**重要环境变量**：
- `DATABASE_URL` 或 `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` - 数据库连接
- `WEBHOOK_BASE_URL` - Webhook 基础 URL（必须是公网可访问的完整 URL）
- `SHIPSTATION_API_KEY` / `SHIPSTATION_API_SECRET` / `SHIPSTATION_WEBHOOK_SECRET` - ShipStation 配置
- `AMAZON_SP_API_*` - Amazon SP-API 配置
- `ZOHO_*` - Zoho Inventory 配置

完整的环境变量列表请参考 `deploy/env.production.template`。

## 许可证

ISC
