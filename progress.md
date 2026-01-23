# 任务进度记录

> 本文档用于记录所有任务的执行进度，确保任务更新的连续性。

---

## 更新日志

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
