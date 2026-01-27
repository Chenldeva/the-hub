# Integration Server 规格说明（自然语言版 / 可交给 Cursor 实现）

> 目标：把 marketplace ↔ ShipStation ↔ Zoho Inventory 的订单与库存同步流程自动化，并可扩展到多个 marketplace。
> 
> 约束：所有 marketplace 都 **只** 通过“中间层 Integration Server”传递订单与库存；ShipStation 仅作为发货/打单引擎；Zoho Inventory 为库存真相源。
> 
> 技术前提：团队已有 Node.js server；计划新增一个 **独立的 Node.js Integration Server** 来做同步与编排。

---

## 1. 总体架构（Hub-and-Spoke）

**唯一对外中枢：Integration Server（中间层）**
- 作为所有 marketplace 的统一入口/出口：
  - 接收订单（pull 或 push）
  - 创建 ShipStation 订单
  - 接收 ShipStation tracking 回传（webhook 或轮询）
  - 回传 tracking 给各 marketplace
  - 从 Zoho 拉取库存与增量变动
  - 按规则分配库存并更新各 marketplace
- 负责可靠性：幂等、重试、审计日志、告警、对账

**系统关系（高层）**
- Marketplaces ⇄ Integration Server ⇄ ShipStation
- Integration Server ⇄ Zoho Inventory
- 可选：Integration Server 提供 API 给内部 UI（目前 UI 与中间层不连接，未来可加）

---

## 2. 关键术语/缩写（简短定义）
- **Integration Server / Middleware**：长期运行的后端服务，做同步、编排、重试、告警。
- **Webhook**：外部系统主动向你提供的 URL 推送事件（如“已发货”）。
- **Polling（轮询）**：中间层定时查询外部系统是否有新数据（如每 5 分钟拉订单）。
- **Idempotency（幂等）**：重复执行同一操作不会产生重复结果（防止重复建单/重复回传 tracking）。
- **Reconciliation（对账）**：定时比对“平台 open orders”和“中间层/ShipStation 已接收订单”，发现遗漏并补救/告警。
- **SoT（Source of Truth）**：真相源；库存以 Zoho Inventory 为准。
- **SFTP**：安全文件传输（可用于下载订单文件、上传 tracking/库存文件）。
- **OMS**：订单管理系统。此处可理解为你们内部处理订单的系统/流程；ShipStation 负责发货执行。

---

## 3. 功能范围（MVP → 增强）

### 3.1 MVP 必备能力（建议先实现）
**订单闭环**
1) 拉取或接收 marketplace 新订单（多渠道）
2) 标准化订单数据
3) 创建到 ShipStation（按 marketplace 路由到不同 Store 或打 tag）
4) 接收 ShipStation tracking（优先 webhook）
5) 回传 tracking 给对应 marketplace
6) 失败重试 + 告警
7) 对账任务：定时检查 open orders vs 已入 ShipStation 的订单，发现漏单

**库存闭环**
1) 从 Zoho Inventory 拉取可售库存（全量）
2) Zoho webhook（或定时）触发增量更新
3) 规则引擎：按 marketplace 比例分配库存（允许 200% 超卖）
4) 更新各 marketplace 库存（增量为主，必要时全量）
5) 失败重试 + 告警 + 发布记录审计

### 3.2 增强能力（后续）
- 管理后台（只读仪表盘 + 配置比例 + 手动重试）
- 更精细的库存分配（按 SKU/品类/品牌不同规则）
- 多仓、多币种、多税制字段完善
- 回传更多事件（取消、退款、地址变更、部分发货）
- 更强的对账（金额、数量、运费、税费差异）

---

## 4. 模块化设计（建议的服务内部结构）

### 4.1 Connectors（连接器层）
每个外部系统一组连接器，负责 API/SFTP 调用与认证：
- `connectors/shipstation`
- `connectors/zohoInventory`
- `connectors/marketplaces/<mp_name_or_code>`（多个）

连接器原则：
- 只做“外部调用 + 数据原样收发 + 低层错误封装”
- 不做业务规则（业务规则放在 service layer）

### 4.2 Normalization（标准化层）
把各 marketplace 的订单结构转换为内部统一结构：
- 内部 `NormalizedOrder` 模型（建议字段）
  - `source_marketplace`（枚举）
  - `external_order_id`
  - `order_created_at`
  - `buyer_name/phone/email`
  - `ship_to`（address1/2, city, state, postal, country）
  - `line_items[]`（sku, qty, price, name）
  - `shipping_method_requested`（如有）
  - `notes` / `gift` / `special_instructions`
  - `raw_payload`（可选：原始订单 JSON，便于审计）

库存标准化：
- 内部 `InventorySnapshot` / `InventoryDelta`
  - `sku`
  - `on_hand`
  - `available`（或可售基数）
  - `reserved/committed`（如果 Zoho 提供且需要）
  - `updated_at`

### 4.3 Orchestrators（编排层 / 业务层）
- `orderOrchestrator`
  - 拉单 → 标准化 → 幂等检查 → 创建 ShipStation → 记录映射
- `trackingOrchestrator`
  - 接 ShipStation tracking → 幂等检查 → 回传 marketplace → 记录回传
- `inventoryOrchestrator`
  - 拉 Zoho → 计算分配 → 更新 marketplace → 记录发布
- `reconciliationOrchestrator`
  - 定时拉 open orders → 对比差集 → 自动补救/告警

### 4.4 Storage（数据库层）
数据库用于“可恢复、可审计、可重试”：
- 订单映射（external_order_id ↔ shipstation_order_id）
- 状态机（订单同步状态、tracking 回传状态）
- 任务执行记录（什么时候拉单、处理了多少、失败原因）
- 库存发布记录（每个平台每个 SKU 发布的数量）
- 配置（比例、超卖策略、同步开关、阈值）
- 幂等键（防重复）

### 4.5 Scheduler（定时任务）
典型频率（可配置）：
- 拉订单：每 5–15 分钟
- tracking 兜底轮询（当 webhook 异常时）：每 5 分钟
- 库存增量：Zoho webhook 实时 + 每 30–60 分钟全量对账一次
- 对账 open orders：每 30–60 分钟（或更短），并且只对比“创建时间 > X 分钟前”的订单减少误报
- 每日汇总：每天一次产出成功/失败统计（可选）

### 4.6 Alerts（告警）
触发条件（建议先做这些）：
- 连接器调用失败且重试超过阈值
- 对账发现漏单超过阈值（如 >20 单或占比 >5%）
- 某 marketplace 连续 N 分钟无订单（可选，避免误报）
- tracking 回传失败超过阈值
- 库存发布失败超过阈值
通知渠道：email / Slack / SMS（可配置）

---

## 5. 订单流程细节（你们确认的主流程）

### 5.1 Marketplace → Integration Server（接收订单）
来源可能是：
- API pull（你定时拉）
- SFTP 文件（你定时下载）
- Marketplace push（少见但可能，有 webhook）

**幂等策略**
- 以 `(source_marketplace, external_order_id)` 作为天然幂等键
- 如果订单再次出现：
  - 若已创建 ShipStation 订单：跳过
  - 若上次失败：进入重试流程（但不重复创建）

### 5.2 Integration Server → ShipStation（创建订单）
目标：把订单创建到 ShipStation，支持按 marketplace 路由：
- 方案 A：不同 marketplace → ShipStation 不同 Store
- 方案 B：同一 Store，但设置 tag / custom fields（便于规则区分）
建议：若你们已在 ShipStation 中按渠道配置规则，用 Store 路由更直观。

记录映射：
- `shipstation_order_id`
- `shipstation_store_id`（若使用）
- `create_result`（成功/失败 + 错误原因）

### 5.3 ShipStation → Integration Server（tracking 回传）
优先使用 webhook：
- webhook payload 内必须能定位回原 marketplace 订单
- 若 webhook 只给 shipstation order id，则中间层用映射表找到 external_order_id

兜底轮询：
- 定时查询“最近 X 分钟已发货但未回传”的订单，补齐 tracking

### 5.4 Integration Server → Marketplace（回传 tracking）
每个 marketplace 的回传方式可能不同：
- API update fulfillment
- SFTP 上传 tracking 文件
中间层应统一出一个“回传接口”，适配每个 marketplace 的格式要求。

幂等策略：
- `(source_marketplace, external_order_id, tracking_number)` 唯一
- 同一 tracking 重复回传应返回“已处理”而非报错

---

## 6. 库存流程细节（Zoho → 中间层 → marketplace）

### 6.1 Zoho Inventory 为库存真相源（SoT）
中间层只从 Zoho 取数，不以 marketplace 回写反推库存。

两种同步触发：
- **Webhook（增量）**：Zoho 库存变化触发中间层更新变动 SKU
- **定时全量（对账）**：每隔一段时间全量同步，修复漏 webhook/漏更新

### 6.2 分配与超卖（你们明确：200% 表示允许超卖）
库存计算核心：对每个 SKU 在 Zoho 的基础可售 `alloc_base` 之上做渠道发布量。

**可售基数 alloc_base（示例）**
- `alloc_base = max(0, available - safety_stock)`
  - `available` 如何取：以 Zoho 可用量为准（具体字段由工程确认）
  - `safety_stock`：可配置（全局/按 SKU/按品类）

**比例分配（允许总和 >100%）**
- 每个 marketplace m 设定 `ratio[m]`（可为 0.98、1.0、2.0 等）
- 发布库存：
  - `publish_qty[m] = floor(alloc_base * ratio[m])`
- 因允许超卖：总发布量可能大于真实库存，这是业务允许的行为。

**建议补充的“护栏”（避免失控）**
- `max_oversell_abs`：每个 SKU 最大允许超卖数量（如 20 件）
- `max_oversell_pct`：每个 SKU 最大允许超卖比例（如 200% 上限）
- 当 alloc_base 很低时，避免发布跳动：
  - `min_publish_qty`（可选）
  - “小库存时强制只给主渠道”规则（可选）

### 6.3 发布策略（增量优先）
- 若 Zoho webhook 提示某些 SKU 变动 → 只更新这些 SKU
- 若发现发布失败/遗漏 → 触发全量对账补救
- 记录“上次发布值”，避免重复发布同值浪费调用并减少限流风险。

---

## 7. 对账与防漏（你提出的需求：异常就通知 + 自动补救）

### 7.1 Open Orders 对账任务（定时）
目标：确保不会因技术原因造成大批量漏单。

步骤：
1) 拉取 marketplace 的 open orders（或近 N 天订单）
2) 查询中间层映射表中已成功创建到 ShipStation 的订单
3) 做差集：`missing = open_orders - mapped_orders`
4) 若 missing 超过阈值：
   - 自动补拉/补创建（可配置开关）
   - 立即告警（包含缺失订单列表/数量/渠道）

建议减少误报：
- 只对比创建时间早于“当前时间 - 15 分钟”的 open orders（给平台同步延迟缓冲）

### 7.2 ShipStation 对账（可选）
- 对比 ShipStation 最近订单 vs 中间层映射表，发现中间层漏记录或被手动创建的订单（按需要决定是否纳入管理）

---

## 8. 数据查看方式（当前 UI 不连接中间层的情况下）

### 8.1 必备：日志 + 告警
- 正常运行依赖“每日/每小时监控状态”
- 出问题靠告警第一时间发现

### 8.2 可选：独立的轻量 Dashboard（不与现有 UI 合并）
- 列表：今日订单、失败任务、对账缺失清单
- 按钮：重试某任务、暂停某渠道同步、调整比例

### 8.3 查数据库（运维/审计）
- 订单映射表、回传记录表、库存发布表、失败记录表

---

## 9. 部署建议（DigitalOcean）

你们现有 UI 在 DigitalOcean：
- Integration Server 也可以部署在 DigitalOcean 同一区域
- 数据库可用 DigitalOcean Managed DB（推荐）或自建 DB

运行形态：
- Docker 容器（推荐，部署一致）
- 或常驻 Node 进程 + 进程管理（PM2/systemd）

安全建议：
- webhook endpoint 加签名校验（ShipStation/Zoho/各平台）
- 所有外部 token 存在 server 端环境变量/secret manager，不进入前端
- 数据库只在私网可访问（VPC），避免公网暴露

---

## 10. 需要工程确认的问题清单（先给 Ask 用）
为了让 Cursor 进入 plan/agent 前把工程参数定死，建议 Ask 先问清这些：

### 10.1 Marketplace 接入方式
- 每个 marketplace：订单与库存是 API 还是 SFTP 文件？（或混合）
- open orders 对账接口/文件是否可用？字段有哪些？
- tracking 回传方式：API 还是文件？需要哪些字段（tracking/carrier/service/date）？

### 10.2 ShipStation 侧
- 是否按 marketplace 分 Store？每个 storeId 是什么？
- webhook 是否已开启？回传 payload 能否包含可定位订单的键（orderNumber/customField）？
- 订单创建需要哪些字段才能触发你们现有自动化规则（承运商/服务选择等）？

### 10.3 Zoho Inventory 侧
- 作为可售基数使用 Zoho 哪个字段？（on_hand / available / committed）
- Zoho webhook 能否提供 SKU 与库存变化？若不能，是否需要变动时再 query Zoho 获取最新库存？
- SKU 对齐：marketplace SKU 与 Zoho item SKU 是否一致？是否存在映射表？

### 10.4 规则与策略
- 比例（ratio）按 marketplace 全局设置，还是允许按 SKU/类目覆盖？
- 安全库存是否需要？默认多少？
- 允许超卖上限：是否要 cap（绝对数/百分比）？
- rounding 规则：floor/round/ceil？小数怎么处理？

### 10.5 可靠性与告警
- 重试策略：重试次数与间隔（指数退避？）
- 告警渠道：email / Slack / SMS
- 阈值：对账缺失多少算“异常”，是否需要分等级（warning/critical）

### 10.6 数据与合规
- 需要保留 raw payload 吗？保留多久？
- 是否需要加密存储敏感字段（电话/地址）？

---

## 11. 你提出的执行流程（Ask → Plan → Agent）评估与优化建议

你现在的安排：
1) 先把本文发给 Ask，让他问工程性问题
2) 所有问题确定后，让 Cursor 做 plan
3) Cursor 的 agent 开始执行任务

**这个安排是合理的**，而且比“直接让 agent 开干”成功率高很多。

### 可提升的工作方式（建议）
- **在 Ask 阶段输出一份“冻结的接口契约（contracts）”**：
  - 每个 marketplace：输入订单格式、输出 tracking/库存格式
  - 中间层内部标准模型字段
  - ShipStation webhook payload 中关键字段
  这能极大减少后续返工。

- **在 Plan 阶段强制拆成 3 个里程碑（Milestones）**
  1) M1：订单闭环跑通（单一 marketplace）
  2) M2：库存闭环跑通（单一 marketplace + 超卖比例）
  3) M3：多 marketplace 扩展 + 对账 + 告警完善
  每个里程碑都有“可验收输出”，避免一次做太大。

- **在 Agent 阶段要求：每个外部系统先做“连接器测试脚本/health check”**
  - 能连通、能认证、能拉到数据再进入业务逻辑
  - 这样能把“权限/网络/字段差异”尽早暴露

---

## 12. 验收标准（建议你对 Cursor 提出）
最小验收（订单 + 库存 + 对账 + 告警）：
- 订单：
  - marketplace 新订单在 5–15 分钟内进入 ShipStation
  - ShipStation 发货后 tracking 在 5 分钟内回传 marketplace
  - 重复拉单不会重复创建
- 库存：
  - Zoho 库存变动后，目标 marketplace 库存在设定延迟内更新
  - 比例设置生效，支持 200%（允许超卖）
- 对账：
  - 定时对账能识别缺失订单并告警/可选补救
- 告警：
  - 任一关键步骤连续失败会通知到指定渠道
- 可观测性：
  - 至少有结构化日志（含 order_id / marketplace / step / error）

---

### 结束语
这份说明是“实现导向”的自然语言规格，Cursor 可以据此拆任务与落地实现。后续如果你把 Ask 问出的工程参数补齐（尤其是每个 marketplace 的接口/文件格式、ShipStation webhook 字段、Zoho 可售字段），我可以再把本文升级为更“可直接编码”的版本（包括更具体的字段表与状态机）。
