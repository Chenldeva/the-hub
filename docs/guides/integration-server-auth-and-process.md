# Marketplace 授权模型 & 工程确认清单（补充说明）

> 本文是对 Integration Server 规格的 **授权与对接模型补充**，用于：
> - 帮助工程人员（Cursor / Agent）理解：**哪些平台需要对方授权，哪些可以自行授权**
> - 明确在进入实现前，**必须确认并冻结的工程性细节**
> - 指导 Cursor 采用你规划的工作方式（Ask → Plan → Agent）

---

## 1. 核心结论（一句话版）

**是否需要对方管理员授权，取决于：你是不是该 marketplace 的 Seller of Record。**

- ✅ 如果你是卖家主体（Seller）：通常你自己 admin 授权即可  
- ❌ 如果你不是卖家（供货商 / 被代销 / drop-ship）：**必须对方管理员授权**

---

## 2. 各平台授权模式说明（工程视角）

### 2.1 Rithum（由对方 marketplace 使用）
- **结论：必须对方管理员授权**
- 原因：
  - Rithum tenant 属于 marketplace / 渠道方
  - 订单、tracking、库存都在对方账号下
- 常见授权方式：
  - API access（API key / OAuth）
  - SFTP 账号（用户名 + 密钥）
  - Technical user / integration user

⚠️ 你无法用“自己的 admin 账号”直接连 Rithum

---

### 2.2 Amazon / eBay

#### 情况 A：你是 Seller of Record（你自己的卖家账号）
- **结论：你自己 admin 授权即可**
- Amazon：
  - SP-API
  - Seller Central 授权 App（OAuth）
- eBay：
  - OAuth 授权

不需要第三方管理员介入

#### 情况 B：你不是 Seller（供货 / 代销）
- **结论：必须对方卖家授权**
- 原因：
  - 订单、库存、tracking 影响卖家账号健康
  - 平台不允许绕过卖家授权

---

### 2.3 Mirakl（Marketplace 平台）
- **结论：几乎 100% 需要 marketplace 管理员**
- Mirakl 特点：
  - Marketplace Owner 控制 API
  - Seller 通常只有“自己订单”的视图权限
- 授权方式：
  - API Key
  - OAuth（视平台配置）

⚠️ 你不能自行创建全局访问权限

---

## 3. 对 Integration Server 架构的关键影响（必须落实）

### 3.1 多租户授权模型（必须）
Integration Server **不能假设只有一套凭证**：

- 每个 marketplace / 渠道 / 卖家：
  - 一套独立凭证
- 凭证必须支持：
  - 单独启用 / 停用
  - 轮换（key rotation）
  - 过期与失效处理

### 3.2 不可硬编码凭证
- 所有 token / key：
  - 存在 server 端（env / secret manager / DB）
  - **绝不进入前端**
- 每次调用通过 `credential_id` 查找对应凭证

---

## 4. 授权信息最小清单（你可直接发给对方管理员）

当你需要对外索取授权时，**最少需要这些信息**：

1) 授权方式：
   - API（OAuth / API Key）
   - 或 SFTP
2) 可访问范围：
   - 订单读取（含 open orders）
   - 发货回传（tracking / carrier / ship date）
   - 库存更新
3) 环境：
   - Production / Sandbox
4) 技术信息：
   - API base URL / SFTP host
   - 认证方式
   - 限流规则（rate limit）
5) 回调（如适用）：
   - Webhook URL
   - 签名方式 / Secret

---

## 5. 给 Cursor 的明确工作方式指令（请直接给它）

### 5.1 开发前（Ask 阶段）必须确认并冻结的问题
Cursor **在进入 plan / coding 前，必须逐项确认**：

#### 对每一个 marketplace：
1) **Seller of Record 是谁？**
2) 授权是否需要第三方管理员？
3) 授权方式：
   - API / OAuth / SFTP？
4) 凭证粒度：
   - 每 marketplace 一套？
   - 还是每 seller 一套？
5) 可用接口：
   - 新订单获取
   - Open orders 查询（用于对账）
   - Tracking 回传
   - 库存更新
6) 是否支持 webhook？payload 能否定位订单？

#### 对 ShipStation：
- 是否按 marketplace 分 Store？
- webhook payload 中用于定位订单的字段是什么？
- 是否存在延迟或最终一致性问题？

#### 对 Zoho Inventory：
- 哪个字段作为“可售基数”（available / on_hand / committed）？
- webhook 能否提供 SKU + 新库存？
- SKU 是否需要映射表？

⚠️ **以上问题未冻结，禁止进入 agent coding**

---

### 5.2 Plan 阶段强制结构
Cursor 在 plan 阶段必须拆成：

- M1：单一 marketplace 订单闭环
- M2：库存闭环（含 200% 超卖）
- M3：多 marketplace + 对账 + 告警

每个里程碑必须定义：
- 输入
- 输出
- 验收条件

---

### 5.3 Agent 阶段强制要求
- 每个外部系统：
  - 先做 **连接器 health check**
  - 确认认证、拉数、限流
- 不允许：
  - 写死 token
  - 假设单一 marketplace
- 所有外部调用：
  - 必须可重试
  - 必须记录失败原因

---

## 6. 给你的最终确认（工作方式是否合理）

你的工作方式：

> **规格文档 → Ask 问清工程性问题 → Plan → Agent 执行**

**这是非常成熟、偏企业级的流程，完全合理，而且适合这种跨系统集成项目。**

唯一建议的增强点是：
- 在 Ask 阶段产出一份 **“冻结的授权与接口清单”**
- 作为 Cursor 后续所有实现的 **唯一事实来源（source of truth）**

---

### 结束说明
本文件可直接作为 `docs/guides/integration-server-auth-and-process.md` 使用，与主规格文档配套。  
如果你愿意，下一步我可以帮你把“对外授权邮件模板 / 表单模板”也一起整理好，直接给 marketplace 管理员用。
