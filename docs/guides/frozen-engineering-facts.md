# Integration Server 工程事实冻结清单

> **状态**：已冻结（除标注为"待确认"的项外）  
> **冻结日期**：2026-01-24  
> **版本**：v1.1  
> **说明**：本文档作为后续开发的唯一事实来源（Source of Truth）。如需变更，必须更新本文档。

---

## 一、Marketplace 工程事实

### 1.1 Rithum

| 项 | 状态 | 结论 |
|---|---|---|
| Seller of Record | ✅ 已冻结 | 我们自己（我们是 Seller） |
| 授权方式 | ✅ 已冻结 | API Key 或 OAuth 2.0（优先 API Key，若支持 OAuth 则用 OAuth） |
| Sandbox 支持 | ✅ 已冻结 | 是（有测试环境） |
| 凭证粒度 | ✅ 已冻结 | 每个 Rithum tenant 一套凭证 |
| 订单获取 | ✅ 已冻结 | API pull |
| Tracking 回传 | ✅ 已冻结 | API |
| 库存更新 | ✅ 已冻结 | API |
| Open orders 接口 | ⚠️ 待确认 | 需要与 Rithum 技术支持确认 |
| Webhook 支持 | ⚠️ 待确认 | 需要与 Rithum 技术支持确认 |

### 1.2 Amazon

| 项 | 状态 | 结论 |
|---|---|---|
| Seller of Record | ✅ 已冻结 | 我们是 Seller of Record（自己账号） |
| 授权方式 | ✅ 已冻结 | SP-API + OAuth 2.0 |
| Sandbox 支持 | ✅ 已冻结 | 是（使用 SP-API sandbox 进行开发测试） |
| 凭证粒度 | ✅ 已冻结 | 每个 Amazon seller account 一套凭证 |
| 订单获取 | ✅ 已冻结 | SP-API Orders API |
| Open orders 接口 | ✅ 已冻结 | 是（SP-API 支持） |
| Tracking 回传 | ✅ 已冻结 | SP-API Fulfillment API |
| 库存更新 | ✅ 已冻结 | SP-API Catalog Items API（自配送） |
| Webhook 支持 | ⚠️ 待确认 | 需要与 Amazon 技术支持确认 SP-API Notifications |

### 1.3 eBay

| 项 | 状态 | 结论 |
|---|---|---|
| Seller of Record | ✅ 已冻结 | 我们是 Seller of Record（自己账号） |
| 授权方式 | ✅ 已冻结 | OAuth 2.0 |
| Sandbox 支持 | ✅ 已冻结 | 是（使用 eBay Sandbox 进行开发测试） |
| 凭证粒度 | ✅ 已冻结 | 每个 eBay seller account 一套凭证 |
| 订单获取 | ✅ 已冻结 | eBay Trading API |
| Open orders 接口 | ✅ 已冻结 | 是（Trading API 支持） |
| Tracking 回传 | ✅ 已冻结 | eBay Trading API CompleteSale |
| 库存更新 | ✅ 已冻结 | eBay Inventory API |
| Webhook 支持 | ⚠️ 待确认 | 需要与 eBay 技术支持确认 Notifications |

### 1.4 Mirakl

| 项 | 状态 | 结论 |
|---|---|---|
| Seller of Record | ✅ 已冻结 | 我们是 Seller |
| 授权方式 | ✅ 已冻结 | API Key |
| 凭证粒度 | ✅ 已冻结 | 每个 Mirakl marketplace 一套凭证（多 marketplace 场景） |
| 订单获取 | ✅ 已冻结 | Mirakl Operator API |
| Open orders 接口 | ✅ 已冻结 | 是（API 支持） |
| Tracking 回传 | ✅ 已冻结 | Mirakl Operator API |
| 库存更新 | ✅ 已冻结 | Mirakl Operator API |
| Sandbox 支持 | ⚠️ 待确认 | 需要与 Mirakl 技术支持确认 |
| Webhook 支持 | ⚠️ 待确认 | 需要与 Mirakl 技术支持确认 |

---

## 二、ShipStation 工程事实

| 项 | 状态 | 结论 |
|---|---|---|
| Store 路由 | ✅ 已冻结 | 是（不同 marketplace → 不同 Store） |
| 认证方式 | ✅ 已冻结 | API Key + API Secret（已持有） |
| Webhook 状态 | ✅ 已冻结 | 否（需要配置） |
| Payload 定位键 | ✅ 已冻结 | `orderNumber`（创建订单时 orderNumber = external_order_id） |
| Custom fields 支持 | ✅ 已冻结 | 是（允许写入 `customField1` = `external_order_id`） |
| 延迟处理 | ✅ 已冻结 | 是（存在延迟，需要兜底轮询） |

---

## 三、Zoho Inventory 工程事实

| 项 | 状态 | 结论 |
|---|---|---|
| 可售基数字段 | ✅ 已冻结 | `available`（Zoho Inventory 标准字段） |
| Webhook 状态 | ✅ 已冻结 | 否（需要配置） |
| Webhook payload | ✅ 已冻结 | 是（payload 包含库存值） |
| SKU 映射表 | ✅ 已冻结 | 不需要（Marketplace SKU 与 Zoho item SKU 一致） |
| 全量同步接口 | ✅ 已冻结 | 是（Zoho Inventory API 支持分页获取所有 SKU） |
| API 限制 | ⚠️ 待确认 | 需要与 Zoho 技术支持确认 rate limit 和批量更新限制 |

---

## 四、库存规则（已冻结）

| 项 | 状态 | 结论 |
|---|---|---|
| 比例粒度 | ✅ 已冻结 | MVP：全 marketplace 级（所有 SKU 同一比例）<br>后续：支持按 SKU 覆盖（按需调节） |
| Safety stock | ✅ 已冻结 | 是（启用，默认值 = 1） |
| 超卖上限 | ✅ 已冻结 | 是（启用）<br>- `max_oversell_pct = 150%`<br>- `max_oversell_abs` = 不需要（只按百分比限制） |
| 小库存规则 | ✅ 已冻结 | 是（启用）<br>- `min_publish_qty = 0`（不限制） |
| 小库存主渠道规则 | ✅ 已冻结 | 否（MVP 阶段不需要） |
| Rounding 规则 | ✅ 已冻结 | `floor`（向下取整）<br>计算公式：`publish_qty = floor(alloc_base * ratio)` |

### 影子库存与再平衡（已冻结）

- **影子库存扣减触发**：以 marketplace 订单为触发（拉单或 webhook），立即扣减本地影子库存。
- **超卖保护**：影子库存为 0 时，下发 0 或最小库存，并**通知用户**。
- **再平衡触发**：低阈值触发 + 定时兜底（阈值与周期已冻结）。
- **再平衡策略**：按当前影子库存重新执行比例分配。
- **有效期**：影子库存有效期到下一次 Zoho 同步为止。
- **边界原则**：Zoho 仍为库存真相源（SoT），影子库存不回写 Zoho。
- **低阈值触发值**：`low_stock_threshold = 1`
- **定时兜底周期**：`rebalance_interval = 240 分钟`

**库存计算公式**：
```
alloc_base = max(0, available - safety_stock)  // safety_stock 默认 = 1
publish_qty[m] = floor(alloc_base * ratio[m])
// 受限于 max_oversell_pct = 150%
```

---

## 五、可靠性与告警（已冻结）

| 项 | 状态 | 结论 |
|---|---|---|
| 重试策略 | ✅ 已冻结 | 订单创建：3 次<br>tracking 回传：5 次<br>库存更新：3 次<br>间隔方式：指数退避（初始 30 秒，最大 5 分钟，退避系数 2） |
| 告警渠道 | ✅ 已冻结 | Email + SMS（混合） |
| 告警阈值 | ✅ 已冻结 | 漏单：warning > 10 单或 > 3%，critical > 50 单或 > 10%<br>订单创建失败：warning > 10 次/小时，critical > 50 次/小时<br>tracking 回传失败：warning > 20 次/小时，critical > 100 次/小时 |
| 无订单告警 | ✅ 已冻结 | 否（不需要，避免误报） |

---

## 六、技术栈（已冻结）

| 项 | 状态 | 结论 |
|---|---|---|
| 数据库 | ✅ 已冻结 | PostgreSQL |
| 部署环境 | ✅ 已冻结 | DigitalOcean + 常驻 Node 进程 + PM2 |
| 日志格式 | ✅ 已冻结 | 结构化 JSON |
| 监控 | ✅ 已冻结 | DigitalOcean Monitoring |
| 数据保留 | ✅ 已冻结 | raw payload 保留 90 天，敏感字段加密存储（AES-256） |

---

## 待确认项清单

### 需要外部确认（优先级：高）

1. **Rithum**：
   - [ ] 是否有 open orders 查询接口？
   - [ ] 是否支持 webhook（订单事件）？

2. **Amazon**：
   - [ ] SP-API Notifications（webhook）是否已启用？如何配置？

3. **eBay**：
   - [ ] eBay Notifications（webhook）是否已启用？如何配置？

4. **Mirakl**：
   - [ ] 是否支持 sandbox？
   - [ ] 是否支持 webhook（订单事件）？

5. **Zoho Inventory**：
   - [ ] API rate limit 和批量更新限制？
6. **影子库存再平衡**：
   - [x] 低阈值触发的具体阈值（low_stock_threshold = 1）
   - [x] 定时兜底的周期（rebalance_interval = 240 分钟）

---

## 变更记录

| 日期 | 版本 | 变更内容 | 变更人 |
|---|---|---|---|
| 2024-12-XX | v1.0 | 初始冻结 | - |
| 2026-01-24 | v1.1 | 增加 ShipStation 认证方式与影子库存再平衡规则 | - |
| 2026-01-24 | v1.2 | 冻结影子库存阈值与再平衡周期 | - |

---

**重要提示**：
- 本文档是后续开发的唯一事实来源（Source of Truth）
- 所有变更必须更新本文档并记录变更历史
- 待确认项完成后，需更新本文档并标记为"已冻结"
