# 任务进度记录

> 本文档用于记录所有任务的执行进度，确保任务更新的连续性。

---

## 📍 当前状态（2026-01-24）

### 🎯 当前任务：M0.1 DigitalOcean 部署 - 数据库迁移和种子执行

**当前阶段**：已完成代码修复，等待在服务器上重新部署

**已完成**：
- ✅ 创建 DigitalOcean Managed PostgreSQL 数据库
- ✅ 创建 DigitalOcean Droplet
- ✅ 配置服务器环境（Node.js, PM2, Git 等）
- ✅ 上传代码到服务器（Git 克隆）
- ✅ 配置环境变量（`.env` 文件）
- ✅ 修改代码（SHIPSTATION_WEBHOOK_SECRET 改为可选）
- ✅ 修复数据库 SSL 配置问题
- ✅ 修复迁移和种子文件执行问题（TypeScript 支持）

**当前问题**：
- ❌ 数据库迁移失败（已修复 SSL 配置，待重新执行）
- ❌ 种子文件执行失败（已修复 TypeScript 支持，待重新执行）

**下一步操作**（在服务器上执行）：

**方法 1：使用自动化脚本（推荐）**

```bash
# 1. 进入项目目录
cd /var/www/the-hub

# 2. 执行自动化重新部署脚本
bash deploy/redeploy.sh
```

这个脚本会自动执行：
- 拉取最新代码
- 检查并安装依赖（如果需要）
- 构建项目
- 创建日志目录
- 运行数据库迁移
- 运行数据库种子
- 启动/重启 PM2 服务
- 保存 PM2 配置
- 设置开机自启

**方法 2：手动执行**

```bash
# 1. 进入项目目录
cd /var/www/the-hub

# 2. 拉取最新代码（包含修复）
git pull

# 3. 重新运行数据库迁移
npm run migrate

# 4. 运行数据库种子
npm run seed

# 5. 如果迁移和种子都成功，启动服务
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 6. 检查服务状态
pm2 status
pm2 logs the-hub
```

**关键信息**：
- **服务器 IP**: `143.198.110.147`
- **服务器目录**: `/var/www/the-hub`
- **数据库 Host**: `central-db-do-user-31680664-0.d.db.ondigitalocean.com`
- **数据库 Port**: `25060`
- **数据库名称**: `defaultdb`
- **数据库用户**: `doadmin`
- **数据库密码**: `AVNS__omlnJXyfrxllO9oZ1z`
- **Git 仓库**: `https://github.com/Chenldeva/the-hub.git`

**已修复的代码变更**：
1. `knexfile.js` 和 `src/knexfile.ts`：添加了 SSL 配置支持 DigitalOcean Managed PostgreSQL
2. `package.json`：修改 `migrate` 和 `seed` 脚本，使用 `NODE_OPTIONS='-r ts-node/register'` 支持 TypeScript
3. `src/seeds/001_initial_configs.js`：创建了 JavaScript 版本的种子文件（备用）
4. `deploy/redeploy.sh`：创建了自动化重新部署脚本，一键执行所有部署步骤

**待完成任务**：
- ⏳ 在服务器上拉取最新代码并重新运行迁移和种子
- ⏳ 使用 PM2 启动服务
- ⏳ 配置 Nginx 反向代理（可选）
- ⏳ 配置 SSL 证书（可选）
- ⏳ 验证部署（健康检查、监控指标、webhook 端点）
- ⏳ 配置 ShipStation Webhook

---

## 更新日志

### 2026-01-27 - 补齐文档结构与目录归档

**任务**：补齐 startup 结构要求并整理文档目录

**完成内容**：
1. ✅ 创建 `docs/index/INDEX.md` 与 `docs/index/INDEX.json` 作为文档索引
2. ✅ 将根目录文档归档到 `docs/guides/` 与 `docs/reports/`
3. ✅ 创建 `docs/progress/README.md` 补齐结构并说明进度规则
4. ✅ 创建 `ops/servers/README.md` 明确唯一 server 入口
5. ✅ 更新 `README.md` 的项目结构与文档路径

**说明**：
- 进度记录仍集中在根目录 `progress.md`，遵循项目规则

### 2026-01-27 - 读取启动指令并整理任务文件夹结构

**任务**：读取 `STARTUP_CHECKLIST.md` 并整理当前任务文件夹结构

**完成内容**：
1. ✅ 已读取 `STARTUP_CHECKLIST.md` 的启动自查指令
2. ✅ 已整理当前仓库顶层与核心目录结构（输出于本次任务回复）

**备注**：
- 当前仓库未发现 `docs/` 目录（包含 `docs/index/INDEX.md` 与 `INDEX.json`），后续若需执行启动指令第 1 条可按规则补充

### 2026-01-24 - 修复数据库迁移和种子执行问题

**任务**：修复生产环境数据库迁移和种子文件执行错误

**问题**：
1. ❌ 数据库迁移失败：`no pg_hba.conf entry for host "143.198.110.147", user "doadmin", database "defaultdb", no encryption`
   - 原因：DigitalOcean Managed PostgreSQL 要求 SSL 连接，但 Knex 配置中缺少 SSL 设置
2. ❌ 种子文件执行失败：`Unexpected token ':' SyntaxError`
   - 原因：Knex 在生产环境尝试直接执行 TypeScript 文件，但 Node.js 无法直接执行 TypeScript

**修复内容**：
1. ✅ **修复数据库 SSL 配置**
   - 修改 `knexfile.js`：添加 SSL 配置，当连接到 DigitalOcean Managed PostgreSQL（host 包含 `ondigitalocean.com`）时自动启用 SSL
   - 修改 `src/knexfile.ts`：同步添加 SSL 配置
   - 使用 `ssl: { rejectUnauthorized: false }` 以兼容 Managed PostgreSQL 的 SSL 证书

2. ✅ **修复迁移和种子文件执行**
   - 修改 `package.json` 中的 `migrate` 和 `seed` 脚本
   - 使用 `NODE_OPTIONS='-r ts-node/register'` 来注册 TypeScript 支持
   - 这样 Knex 在执行迁移和种子文件时能够正确处理 TypeScript 文件

3. ✅ **创建 JavaScript 版本的种子文件（备用）**
   - 创建 `src/seeds/001_initial_configs.js` 作为备用方案
   - 如果 TypeScript 版本仍有问题，可以使用 JavaScript 版本

**技术细节**：
- SSL 配置：`ssl: process.env.DB_HOST && process.env.DB_HOST.includes('ondigitalocean.com') ? { rejectUnauthorized: false } : false`
- 迁移脚本：`NODE_OPTIONS='-r ts-node/register' knex migrate:latest`
- 种子脚本：`NODE_OPTIONS='-r ts-node/register' knex seed:run`

**下一步**：
1. 在服务器上拉取最新代码：`cd /var/www/the-hub && git pull`
2. 重新运行迁移：`npm run migrate`（现在应该可以成功）
3. 运行种子：`npm run seed`（现在应该可以成功）
4. 启动服务：`pm2 start ecosystem.config.js`

---

### 2026-01-24 - M0.1 DigitalOcean 部署进行中

**任务**：执行 DigitalOcean 部署流程

**已完成步骤**：

1. ✅ **创建 Managed PostgreSQL 数据库**
   - 数据库名称：`central-db`
   - 版本：PostgreSQL 18
   - 区域：与 Droplet 相同区域
   - 计划：Basic（1 vCPU）
   - 连接信息已记录：
     - Host: `central-db-do-user-31680664-0.d.db.ondigitalocean.com`
     - Port: `25060`
     - Database: `defaultdb`
     - User: `doadmin`
     - Password: `AVNS__omlnJXyfrxllO9oZ1z`
     - SSL Mode: `require`
   - Trusted Sources 已配置：已添加 Droplet IP `143.198.110.147`
   - 网络配置：Public Network（已确认，适合当前阶段）

2. ✅ **创建 DigitalOcean Droplet**
   - 主机名：`the-hub`
   - IP 地址：`143.198.110.147`
   - 镜像：Ubuntu 22.04 LTS
   - 计划：Basic（1 GB RAM / 1 vCPU）
   - 区域：与数据库相同区域
   - 认证方式：已配置

3. ✅ **配置服务器环境**
   - 运行服务器初始化脚本 `setup-server.sh`
   - 系统更新完成
   - Node.js 20.x 已安装
   - PM2 已安装
   - PostgreSQL 客户端已安装
   - Git 已安装
   - Nginx：已跳过（稍后需要时再安装）
   - 防火墙规则已添加（22, 80, 443 端口）
   - 应用目录已创建：`/var/www/the-hub`

**当前进度**：
- 阶段：代码已上传，环境变量已配置，准备构建和部署
- 下一步：安装依赖、构建项目、运行迁移、启动服务

**待完成步骤**：
1. ✅ 上传代码到服务器（使用 Git 克隆）
2. ✅ 配置环境变量（创建 `.env` 文件，填写数据库连接、ShipStation API keys）
3. ✅ 修改代码（让 SHIPSTATION_WEBHOOK_SECRET 变为可选）
4. ⏳ 在服务器上拉取最新代码
5. ⏳ 安装依赖并构建项目（`npm install`, `npm run build`）
6. ⏳ 运行数据库迁移和种子（`npm run migrate`, `npm run seed`）
7. ⏳ 使用 PM2 启动服务
8. ⏳ 配置 Nginx 反向代理（可选）
9. ⏳ 配置 SSL 证书（可选）
10. ⏳ 验证部署（健康检查、监控指标、webhook 端点）
11. ⏳ 配置 ShipStation Webhook

**关键信息记录**：
- Droplet IP: `143.198.110.147`
- 数据库 Host: `central-db-do-user-31680664-0.d.db.ondigitalocean.com`
- 数据库 Port: `25060`
- 数据库名称: `defaultdb`
- 数据库用户: `doadmin`
- 应用目录: `/var/www/the-hub`

**注意事项**：
- 数据库密码已记录，后续配置 `.env` 文件时需要使用
- Trusted Sources 已配置，Droplet 可以连接数据库
- 服务器环境已准备就绪，等待代码上传

---

### 2026-01-24 - M0.1 部署辅助工具完成

**任务**：创建部署辅助工具和验证脚本

**完成内容**：
1. ✅ **部署前检查清单**
   - 创建 `deploy/pre-deployment-checklist.md`：部署前检查清单
   - 包含前置要求、API 凭证准备、部署准备等检查项
   - 提供部署后验证清单

2. ✅ **环境变量验证脚本**
   - 创建 `deploy/verify-env.sh`：自动验证环境变量配置
   - 检查所有必需环境变量是否已设置
   - 验证敏感信息格式（隐藏显示）
   - 验证 WEBHOOK_BASE_URL 格式

3. ✅ **部署验证脚本**
   - 创建 `deploy/verify-deployment.sh`：自动验证部署状态
   - 检查 PM2 服务状态
   - 检查健康检查端点
   - 检查监控指标端点
   - 检查数据库连接
   - 检查日志目录和构建文件
   - 检查 Nginx 配置（如果使用）

4. ✅ **快速部署脚本**
   - 创建 `deploy/quick-deploy.sh`：一键部署脚本
   - 自动执行：环境变量验证、安装依赖、构建、迁移、种子、启动服务
   - 交互式确认关键步骤
   - 自动配置 PM2 保存和开机自启

5. ✅ **更新部署文档**
   - 更新 `deploy/README.md`：添加新脚本的使用说明
   - 提供快速部署和验证的简化流程

**辅助工具功能**：
- 部署前检查：确保所有前置条件已满足
- 环境变量验证：自动检查必需配置是否完整
- 部署验证：一键验证部署是否成功
- 快速部署：简化部署流程，减少手动操作

**下一步**：
- 用户按照计划执行实际部署步骤
- 使用辅助工具验证部署状态

---

### 2026-01-24 - M0.1 部署文档和配置完成

**任务**：M0.1 部署到 DigitalOcean - 创建部署文档、配置文件和脚本

**完成内容**：
1. ✅ **PM2 配置文件**
   - 创建 `ecosystem.config.js`：配置进程管理、日志、自动重启、优雅关闭等
   - 支持单实例运行、日志文件管理、内存限制重启

2. ✅ **部署文档**
   - 创建 `deploy/digitalocean-deployment.md`：完整的 DigitalOcean 部署指南
   - 包含 Managed PostgreSQL 创建、Droplet 配置、代码上传、环境变量配置等详细步骤
   - 包含 Nginx 反向代理配置、SSL 证书配置、故障排查指南

3. ✅ **服务器初始化脚本**
   - 创建 `deploy/setup-server.sh`：自动化服务器初始化
   - 自动安装 Node.js 20.x、PM2、PostgreSQL 客户端、Git、Nginx（可选）
   - 配置防火墙规则、创建应用目录

4. ✅ **环境变量模板**
   - 创建 `deploy/env.production.template`：完整的生产环境变量配置模板
   - 包含所有必需的环境变量：数据库、ShipStation、Amazon SP-API、Zoho、eBay、告警渠道等
   - 提供详细的注释说明

5. ✅ **Nginx 配置示例**
   - 创建 `deploy/nginx.conf.example`：Nginx 反向代理配置示例
   - 配置健康检查、监控指标、webhook 端点
   - 支持原始请求体传递（用于 webhook 签名验证）
   - 包含 SSL 配置说明

6. ✅ **部署快速指南**
   - 创建 `deploy/README.md`：部署快速开始指南
   - 提供快速部署步骤和常用维护命令

7. ✅ **更新主 README**
   - 更新 `README.md` 中的部署部分
   - 添加快速部署步骤、验证方法、环境变量说明

**部署文档结构**：
```
deploy/
├── digitalocean-deployment.md  # 完整部署指南
├── env.production.template     # 环境变量模板
├── setup-server.sh             # 服务器初始化脚本
├── nginx.conf.example          # Nginx 配置示例
└── README.md                   # 部署快速指南
```

**关键配置**：
- PM2 配置：单实例、自动重启、日志管理、优雅关闭
- 环境变量：完整的生产环境变量清单（数据库、API keys、webhook secrets）
- Nginx 配置：反向代理、SSL 支持、webhook 原始请求体传递
- 部署脚本：自动化服务器初始化流程

**下一步**：
- 实际部署到 DigitalOcean（需要用户执行）：
  1. 创建 Managed PostgreSQL 数据库
  2. 创建 Droplet 并运行初始化脚本
  3. 上传代码并配置环境变量
  4. 运行数据库迁移和种子
  5. 使用 PM2 启动服务
  6. 配置 Nginx 反向代理（可选）
  7. 验证健康检查和监控指标端点可访问
  8. 配置 ShipStation webhook URL

**验收标准**：
- ✅ PM2 配置文件已创建
- ✅ 完整的部署文档已创建
- ✅ 环境变量模板已创建
- ✅ 服务器初始化脚本已创建
- ✅ Nginx 配置示例已创建
- ✅ 部署前检查清单已创建
- ✅ 环境变量验证脚本已创建
- ✅ 部署验证脚本已创建
- ✅ 快速部署脚本已创建
- ⏳ 实际部署到 DigitalOcean（待用户执行）
- ⏳ 健康检查端点可访问（待验证）
- ⏳ 监控指标端点可访问（待验证）
- ⏳ Webhook 端点可访问（待验证）

**部署工具清单**：
```
deploy/
├── digitalocean-deployment.md  # 完整部署指南
├── env.production.template     # 环境变量模板
├── setup-server.sh             # 服务器初始化脚本
├── nginx.conf.example          # Nginx 配置示例
├── pre-deployment-checklist.md # 部署前检查清单
├── verify-env.sh               # 环境变量验证脚本
├── verify-deployment.sh        # 部署验证脚本
├── quick-deploy.sh             # 快速部署脚本
└── README.md                   # 部署快速指南
```

---

### 2026-01-24 - M0.1 测试评估与部署准备

**任务**：评估测试结果，准备部署到 DigitalOcean

**测试结果评估**：
1. ✅ **代码编译**：100% 通过
   - TypeScript 编译无错误
   - 所有类型检查通过
   - `dist/` 目录生成完整

2. ✅ **功能模块测试**：100% 通过
   - 日志系统：结构化 JSON 日志正常
   - Webhook 签名验证：HMAC-SHA256 验证正常
   - 重试机制：指数退避机制正常
   - 任务调度器：任务注册和禁用正常
   - 清理服务：保留天数设置正常
   - 配置服务：代码结构正确（需要数据库连接，预期行为）

3. ✅ **代码质量**：无错误
   - 所有迁移文件语法正确
   - 所有导入/导出正确
   - 中间件配置正确

**待测试项（需要在服务器上完成）**：
- 数据库连接测试（需要 Managed PostgreSQL）
- 数据库迁移执行（`npm run migrate`）
- 数据库种子执行（`npm run seed`）
- 服务器启动测试（`npm run dev`）
- API 端点测试（/health, /metrics, /webhooks/*）

**部署决策**：
- ✅ 选择 **DigitalOcean Managed PostgreSQL**（推荐方案）
- ✅ 数据库配置：一个 Managed PostgreSQL 实例可以运行多个数据库（database）
- ✅ 部署策略：迁移和种子脚本随代码一起部署，在服务器上执行

**部署准备清单**：
1. ✅ M0.1 核心基础设施代码完成
2. ✅ 代码编译通过
3. ✅ 功能模块测试通过
4. ⏳ 创建 DigitalOcean Managed PostgreSQL 数据库（待完成）
5. ⏳ 创建/配置 DigitalOcean Droplet（待完成）
6. ⏳ 配置环境变量（待完成）
7. ⏳ 上传代码到服务器（待完成）
8. ⏳ 运行数据库迁移和种子（待完成）
9. ⏳ 配置 PM2 启动服务（待完成）

**下一步任务**：
- **M0.1 部署**：将服务部署到 DigitalOcean
  - 创建 Managed PostgreSQL 数据库
  - 创建/配置 Droplet
  - 上传代码并配置环境变量
  - 运行迁移和种子
  - 使用 PM2 启动服务
  - 验证公网访问和 webhook 端点

**关键信息**：
- Managed PostgreSQL 配置：需要创建数据库 `the_hub` 和用户，配置 VPC 网络
- 环境变量：需要配置数据库连接、API keys、webhook secrets 等
- Webhook URL：部署后需要公网可访问的 URL 用于 ShipStation webhook 配置

---

### 2026-01-24 - M0.1 本地测试完成

**任务**：进行本地测试验证

**测试结果**：
1. ✅ 代码编译成功
   - TypeScript 编译通过，无错误
   - 所有类型检查通过
   - 生成的文件位于 `dist/` 目录

2. ✅ 功能模块测试
   - 日志系统：结构化 JSON 日志输出正常
   - Webhook 签名验证：HMAC-SHA256 验证正常工作
   - 重试机制：指数退避重试机制正常工作
   - 任务调度器：任务注册和禁用功能正常
   - 清理服务：保留天数设置功能正常
   - 配置服务：需要数据库连接（预期行为）

3. ✅ 修复的问题
   - 修复了 logger.ts 中的类型错误（简化了日志脱敏实现）
   - 改进了 webhook 签名验证的错误处理

**待测试项（需要数据库）**：
- 数据库连接和迁移
- 服务器启动
- API 端点测试（/health, /metrics, /webhooks/*）

**测试脚本**：
- 创建了 `src/scripts/test-local.ts` 用于本地功能测试
- 创建了 `test-server.md` 记录测试结果

---

### 2026-01-24 - M0.1 核心基础设施最终修复

**任务**：修复 M0.1 实现中的关键问题

**修复内容**：
1. ✅ 删除未定义的中间件引用
   - 删除 `src/index.ts` 第 23 行的 `app.use(rawBodyMiddleware);`（`rawBodyMiddleware` 未定义）
   - 该中间件已被 `webhookBodyParser()` 替代

2. ✅ 优化中间件顺序
   - 将 webhook 路由放在全局 `express.json()` 之前
   - Webhook 路由使用 `webhookBodyParser()`（内部使用 `express.raw()`）
   - 非 webhook 路由使用标准的 `express.json()` 和 `express.urlencoded()`
   - 确保 webhook 路由可以获取原始请求体用于签名验证

3. ✅ 更新环境变量配置文档
   - 更新 `README.md` 中的环境变量配置说明
   - 提供完整的环境变量列表（包含所有必需变量）
   - 注意：`.env.example` 文件被系统阻止创建，已在 README 中提供完整配置示例

**技术改进**：
- 中间件顺序优化：webhook 路由优先处理，确保可以获取原始请求体
- 代码清理：删除未使用的代码引用
- 文档完善：提供完整的环境变量配置指南

---

### 2026-01-24 - M0.1 核心基础设施修复

**任务**：修复 M0.1 实现中的问题

**修复内容**：
1. ✅ 修复迁移文件语法错误
   - 修复 `002_create_tracking_returns.ts` 第 21 行多余闭合括号
   - 修复 `003_create_inventory_publications.ts` 第 17 行多余闭合括号
   - 修复 `004_create_shadow_inventory.ts` 第 15 行多余闭合括号
   - 修复 `005_create_configs.ts` 第 17 行多余闭合括号
   - 修复 `006_create_task_executions.ts` 第 24 行多余闭合括号

2. ✅ 优化 webhook 签名验证
   - 创建 `webhookBodyParser()` 中间件，使用 `express.raw()` 保存原始请求体
   - 在 webhook 路由中使用原始请求体进行 HMAC-SHA256 签名验证
   - 手动解析 JSON，确保同时有 `rawBody` 和解析后的 `body`
   - 更新 webhook 路由以使用原始请求体进行签名验证

3. ✅ 验证并修复 knexfile.ts 配置
   - 确认 `src/knexfile.ts` 中的迁移和种子目录路径正确（`./src/migrations`, `./src/seeds`）
   - 确认根目录 `knexfile.js` 配置正确（用于 Knex CLI）

**技术改进**：
- Webhook 签名验证现在使用原始请求体，符合 HMAC-SHA256 签名验证的最佳实践
- 迁移文件语法错误已全部修复，可以正常运行数据库迁移

---

### 2026-01-24 - M0.1 核心基础设施完成

**任务**：M0.1 核心基础设施实现

**完成内容**：
1. ✅ 项目结构搭建
   - 创建模块化分层目录结构（connectors, orchestrators, services, models, config, utils, migrations, seeds）
   - 配置 TypeScript、Knex.js、Express 等核心依赖
   - 创建基础配置文件（package.json, tsconfig.json, knexfile.js, .gitignore）

2. ✅ 数据库连接与表结构
   - 实现数据库连接模块（Knex.js + PostgreSQL）
   - 创建 6 张核心表的迁移文件：
     - `order_mappings`（订单映射表）
     - `tracking_returns`（tracking 回传记录表）
     - `inventory_publications`（库存发布记录表）
     - `shadow_inventory`（影子库存表）
     - `configs`（配置表）
     - `task_executions`（任务执行记录表）
   - 创建 seed 脚本初始化配置数据（marketplace 比例、Store 映射、超卖策略、安全库存、影子库存配置）

3. ✅ 配置管理模块
   - 实现 `ConfigService` 类，支持配置的读取和更新
   - 支持 marketplace 分配比例、Store 映射、超卖策略、安全库存、影子库存配置的管理
   - 配置存储在 `configs` 表中，支持类型化配置值

4. ✅ 日志系统
   - 使用 Winston 实现结构化 JSON 日志
   - 实现敏感信息自动脱敏功能
   - 支持日志级别配置（通过环境变量 `LOG_LEVEL`）

5. ✅ 错误处理与重试机制
   - 实现指数退避重试工具函数（`retryWithBackoff`）
   - 支持可配置的重试次数、初始延迟、最大延迟、退避系数
   - 集成日志记录，记录重试过程

6. ✅ 任务调度器
   - 实现基于 node-cron 的任务调度器（`TaskScheduler` 类）
   - 支持 cron 表达式配置
   - 支持任务的启动、停止、注册和取消
   - 集成日志记录，记录任务执行情况

7. ✅ Webhook 接收端点
   - 实现 ShipStation webhook 端点（`/webhooks/shipstation`）
   - 实现 Zoho Inventory webhook 端点（`/webhooks/zoho`）
   - 实现通用 webhook 端点（`/webhooks/:source`）
   - 实现 HMAC-SHA256 签名验证框架（`verifyShipStationWebhook`, `verifyWebhookSignature`）
   - 使用 timing-safe comparison 防止时序攻击

8. ✅ 健康检查与监控指标
   - 实现健康检查端点（`/health`），检查数据库连接和调度器状态
   - 实现监控指标端点（`/metrics` 和 `/metrics/json`）
   - 支持 Prometheus 格式和 JSON 格式的指标输出
   - 暴露关键指标：`hub_health_status`, `db_connection_status`, `task_scheduler_status`, `api_call_total`

9. ✅ 数据清理任务框架
   - 实现 `CleanupService` 类，支持数据清理功能
   - 默认保留策略：90 天
   - 支持清理任务执行记录等历史数据
   - 已集成到任务调度器（每天凌晨 2 点执行）

10. ✅ 主服务入口
    - 创建 Express 应用主入口文件（`src/index.ts`）
    - 实现优雅关闭机制（SIGTERM, SIGINT）
    - 实现未捕获异常处理
    - 集成所有模块：数据库、调度器、路由等

**技术栈确认**：
- Node.js 20.x LTS
- Express 4.18.2
- Knex.js 3.0.0（查询构建器 + 迁移）
- PostgreSQL（通过 pg 8.11.3）
- Winston 3.11.0（结构化日志）
- node-cron 3.0.3（任务调度）
- TypeScript 5.3.3

**环境变量配置**：
- 已创建 `.env.example` 模板（包含所有必需的环境变量）
- 支持数据库、ShipStation、Amazon SP-API、Zoho、eBay、告警渠道等配置

**下一步**：
- M0.1 部署：将服务部署到 DigitalOcean，配置 PM2，验证公网访问
- M1：实现 Amazon 订单闭环（订单拉取 → ShipStation → tracking 回传）

---

### 2026-01-24 - 冻结影子库存阈值与再平衡周期

**任务**：冻结影子库存配置

**完成内容**：
1. ✅ 更新 `frozen-engineering-facts.md`
   - 固化 `low_stock_threshold = 1`
   - 固化 `rebalance_interval = 240 分钟`
   - 更新变更记录版本至 v1.2

2. ✅ 更新 `api-contracts.md`
   - 补充影子库存关键配置
   - 更新变更记录版本至 v1.2

### 2026-01-24 - 增加影子库存与 ShipStation 认证信息

**任务**：更新冻结清单与接口契约

**完成内容**：
1. ✅ 更新 `frozen-engineering-facts.md`
   - 添加 ShipStation 认证方式（API Key + Secret）
   - 增加影子库存与再平衡规则（订单触发扣减、低库存保护通知、阈值+定时兜底）
   - 新增影子库存再平衡阈值与周期为待确认项
   - 更新版本与变更记录

2. ✅ 更新 `api-contracts.md`
   - 增加 ShipStation 认证说明
   - 在库存分配流程中加入影子库存覆盖逻辑
   - 增加影子库存与再平衡流程契约
   - 更新版本与变更记录

**待确认项新增**：
- 影子库存低阈值触发值（low_stock_threshold）
- 再平衡定时周期（rebalance_interval）

### 2024-12-XX - Integration Server 工程事实冻结与接口契约文档创建

**任务**：创建冻结文件和 contract 文档

**完成内容**：
1. ✅ 创建 `frozen-engineering-facts.md` - 工程事实冻结清单
   - 包含所有 marketplace（Rithum / Amazon / eBay / Mirakl）的工程事实
   - 包含 ShipStation 和 Zoho Inventory 的工程事实
   - 包含库存规则、可靠性告警、技术栈等已冻结项
   - 标注了待确认项清单

2. ✅ 创建 `api-contracts.md` - API 接口契约文档
   - 定义了内部数据模型（NormalizedOrder / InventorySnapshot / InventoryAllocation）
   - 定义了各 marketplace 的接口契约（订单获取、tracking 回传、库存更新）
   - 定义了 ShipStation 和 Zoho Inventory 的接口契约
   - 定义了内部处理流程、错误处理、数据模型映射表

**关键冻结事实**：
- Rithum：API pull，凭证粒度 = 每个 tenant 一套
- Amazon：SP-API + OAuth 2.0，自配送（Catalog Items API）
- eBay：OAuth 2.0，Trading API
- Mirakl：API Key，每个 marketplace 一套凭证
- ShipStation：按 marketplace 分 Store，webhook 需要配置
- Zoho Inventory：使用 `available` 字段，webhook payload 包含库存值，SKU 一致无需映射
- 库存规则：safety_stock = 1，max_oversell_pct = 150%，min_publish_qty = 0
- 重试策略：订单创建 3 次，tracking 5 次，库存 3 次，指数退避
- 告警渠道：Email + SMS
- 部署：DigitalOcean + 常驻 Node 进程 + PM2

**待确认项**：
- Rithum：open orders 接口、webhook 支持
- Amazon：SP-API Notifications 配置
- eBay：Notifications 配置
- Mirakl：sandbox 支持、webhook 支持
- Zoho Inventory：API rate limit 和批量更新限制

**下一步**：
- 完成待确认项的外部确认
- 进入 Plan 阶段，基于冻结清单制定开发计划
