# Integration Server API 接口契约

> **状态**：已冻结（基于工程事实清单）  
> **冻结日期**：2024-12-XX  
> **版本**：v1.0  
> **说明**：本文档定义 Integration Server 与外部系统的接口契约，包括数据格式、字段映射、调用方式等。

---

## 一、内部数据模型

### 1.1 NormalizedOrder（标准化订单）

```typescript
interface NormalizedOrder {
  // 标识
  source_marketplace: 'rithum' | 'amazon' | 'ebay' | 'mirakl';
  external_order_id: string;  // 平台订单ID（幂等键的一部分）
  order_created_at: string;   // ISO 8601 格式
  
  // 买家信息
  buyer_name: string;
  buyer_phone?: string;
  buyer_email?: string;
  
  // 收货地址
  ship_to: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postal: string;
    country: string;
  };
  
  // 订单项
  line_items: Array<{
    sku: string;
    quantity: number;
    price: number;
    name?: string;
  }>;
  
  // 其他
  shipping_method_requested?: string;
  notes?: string;
  gift?: boolean;
  special_instructions?: string;
  
  // 审计
  raw_payload?: object;  // 原始订单 JSON（用于审计）
}
```

**幂等键**：`(source_marketplace, external_order_id)`

---

### 1.2 InventorySnapshot（库存快照）

```typescript
interface InventorySnapshot {
  sku: string;
  on_hand: number;        // 在手库存
  available: number;      // 可售库存（Zoho 字段，作为可售基数）
  reserved?: number;      // 预留库存（如果 Zoho 提供）
  committed?: number;     // 已承诺库存（如果 Zoho 提供）
  updated_at: string;     // ISO 8601 格式
}
```

**可售基数计算公式**：
```
alloc_base = max(0, available - safety_stock)  // safety_stock 默认 = 1
```

---

### 1.3 InventoryAllocation（库存分配）

```typescript
interface InventoryAllocation {
  sku: string;
  marketplace: 'rithum' | 'amazon' | 'ebay' | 'mirakl';
  alloc_base: number;           // 可售基数
  ratio: number;                // 分配比例（如 1.0, 0.98, 1.5）
  publish_qty: number;          // 发布数量
  max_oversell_pct: number;     // 最大超卖比例（150%）
  safety_stock: number;          // 安全库存（默认 1）
  min_publish_qty: number;       // 最小发布数量（0 = 不限制）
}
```

**发布数量计算公式**：
```
publish_qty[m] = floor(alloc_base * ratio[m])
// 受限于 max_oversell_pct = 150%
```

---

## 二、Marketplace 接口契约

### 2.1 Rithum

#### 2.1.1 订单获取

**方式**：API pull  
**频率**：每 5-15 分钟  
**凭证**：每个 Rithum tenant 一套凭证

**接口**（待确认具体端点）：
```
GET /api/orders?marketplace={marketplace_id}&since={timestamp}
```

**响应格式**（示例）：
```json
{
  "orders": [
    {
      "order_id": "RITHUM-12345",
      "created_at": "2024-12-01T10:00:00Z",
      "buyer": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "shipping_address": {
        "address1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postal": "10001",
        "country": "US"
      },
      "items": [
        {
          "sku": "SKU-001",
          "quantity": 2,
          "price": 29.99,
          "name": "Product Name"
        }
      ]
    }
  ]
}
```

**映射规则**：
- `order_id` → `external_order_id`
- `created_at` → `order_created_at`
- `buyer.name` → `buyer_name`
- `shipping_address` → `ship_to`
- `items` → `line_items`

#### 2.1.2 Open Orders 查询（用于对账）

**状态**：⚠️ 待确认  
**接口**（待确认）：
```
GET /api/orders?status=open&marketplace={marketplace_id}
```

#### 2.1.3 Tracking 回传

**方式**：API  
**接口**（待确认具体端点）：
```
POST /api/orders/{order_id}/fulfillment
```

**请求格式**：
```json
{
  "tracking_number": "1Z999AA10123456784",
  "carrier": "UPS",
  "service": "Ground",
  "ship_date": "2024-12-01"
}
```

#### 2.1.4 库存更新

**方式**：API  
**接口**（待确认具体端点）：
```
PUT /api/inventory
```

**请求格式**：
```json
{
  "updates": [
    {
      "sku": "SKU-001",
      "quantity": 100
    }
  ]
}
```

---

### 2.2 Amazon (SP-API)

#### 2.2.1 订单获取

**方式**：SP-API Orders API  
**频率**：每 5-15 分钟  
**凭证**：每个 Amazon seller account 一套凭证（OAuth 2.0）

**接口**：
```
GET /orders/v0/orders?CreatedAfter={timestamp}&MarketplaceIds={marketplace_id}
```

**响应格式**：SP-API 标准格式  
**映射规则**：按 SP-API 文档映射到 `NormalizedOrder`

#### 2.2.2 Open Orders 查询

**接口**：
```
GET /orders/v0/orders?OrderStatuses=Unshipped&MarketplaceIds={marketplace_id}
```

#### 2.2.3 Tracking 回传

**接口**：SP-API Fulfillment API  
**方式**：
```
POST /fba/outbound/2020-07-01/fulfillmentOrders/{fulfillmentOrderId}/shipment
```

**请求格式**：SP-API 标准格式

#### 2.2.4 库存更新

**接口**：SP-API Catalog Items API（自配送）  
**方式**：
```
PUT /catalog/v0/items/{asin}/inventory
```

**请求格式**：SP-API 标准格式

#### 2.2.5 Webhook（SP-API Notifications）

**状态**：⚠️ 待确认  
**事件**：`OrderStatusChanged`  
**Payload**：SP-API 标准格式

---

### 2.3 eBay

#### 2.3.1 订单获取

**方式**：eBay Trading API  
**频率**：每 5-15 分钟  
**凭证**：每个 eBay seller account 一套凭证（OAuth 2.0）

**接口**：
```
POST /ws/api.dll
```

**请求**：eBay Trading API `GetOrders` call  
**响应格式**：eBay XML 格式  
**映射规则**：按 eBay API 文档映射到 `NormalizedOrder`

#### 2.3.2 Open Orders 查询

**接口**：eBay Trading API `GetOrders` with `OrderStatus = Active`

#### 2.3.3 Tracking 回传

**接口**：eBay Trading API `CompleteSale`  
**请求格式**：eBay XML 格式

#### 2.3.4 库存更新

**接口**：eBay Inventory API `bulkUpdatePriceQuantity`

#### 2.3.5 Webhook（eBay Notifications）

**状态**：⚠️ 待确认  
**事件**：订单创建/变更事件  
**Payload**：eBay 标准格式

---

### 2.4 Mirakl

#### 2.4.1 订单获取

**方式**：Mirakl Operator API  
**频率**：每 5-15 分钟  
**凭证**：每个 Mirakl marketplace 一套凭证（API Key）

**接口**：
```
GET /api/orders?marketplace_id={marketplace_id}&date_created_from={timestamp}
```

**响应格式**：Mirakl 标准格式  
**映射规则**：按 Mirakl API 文档映射到 `NormalizedOrder`

#### 2.4.2 Open Orders 查询

**接口**：
```
GET /api/orders?order_state=SHIPPING&marketplace_id={marketplace_id}
```

#### 2.4.3 Tracking 回传

**接口**：
```
POST /api/orders/{order_id}/trackings
```

**请求格式**：
```json
{
  "carrier_code": "UPS",
  "carrier_name": "United Parcel Service",
  "tracking_number": "1Z999AA10123456784",
  "carrier_url": "https://www.ups.com/track"
}
```

#### 2.4.4 库存更新

**接口**：
```
PUT /api/products/{product_id}/offers
```

**请求格式**：
```json
{
  "offer_id": "OFFER-001",
  "quantity": 100
}
```

---

## 三、ShipStation 接口契约

### 3.1 订单创建

**接口**：
```
POST /orders/createorder
```

**请求格式**：
```json
{
  "orderNumber": "{external_order_id}",
  "orderDate": "{order_created_at}",
  "orderStatus": "awaiting_shipment",
  "customerUsername": "{buyer_name}",
  "customerEmail": "{buyer_email}",
  "shipTo": {
    "name": "{buyer_name}",
    "street1": "{ship_to.address1}",
    "street2": "{ship_to.address2}",
    "city": "{ship_to.city}",
    "state": "{ship_to.state}",
    "postalCode": "{ship_to.postal}",
    "country": "{ship_to.country}"
  },
  "items": [
    {
      "sku": "{sku}",
      "name": "{name}",
      "quantity": "{quantity}",
      "unitPrice": "{price}"
    }
  ],
  "customField1": "{external_order_id}",
  "customField2": "{source_marketplace}",
  "storeId": "{store_id}"  // 按 marketplace 路由到不同 Store
}
```

**响应格式**：
```json
{
  "orderId": 12345,
  "orderNumber": "{external_order_id}",
  "orderStatus": "awaiting_shipment"
}
```

**映射记录**：
- `orderId` → `shipstation_order_id`（存储到映射表）
- `external_order_id` ↔ `shipstation_order_id`（用于 webhook 定位）

---

### 3.2 Webhook（发货通知）

**状态**：需要配置  
**URL**：`https://your-integration-server.com/webhooks/shipstation`  
**事件**：`shipment.notify`  
**签名校验**：HMAC-SHA256（推荐启用）

**Payload 格式**：
```json
{
  "resource_url": "https://ssapi.shipstation.com/orders/12345",
  "resource_type": "ORDER",
  "order_id": 12345,
  "order_number": "{external_order_id}",  // 创建时 orderNumber = external_order_id
  "custom_field_1": "{external_order_id}",  // 备选定位键
  "shipments": [
    {
      "shipmentId": 67890,
      "trackingNumber": "1Z999AA10123456784",
      "carrierCode": "ups",
      "serviceCode": "ups_ground",
      "shipDate": "2024-12-01T10:00:00Z"
    }
  ]
}
```

**定位逻辑**：
1. 优先使用 `order_number`（创建时 `orderNumber` = `external_order_id`）
2. 备选：使用 `custom_field_1`
3. 最后：使用 `order_id` 查询映射表

---

### 3.3 兜底轮询（当 webhook 异常时）

**接口**：
```
GET /orders?orderStatus=shipped&shipDateStart={timestamp}
```

**频率**：每 5 分钟  
**条件**：查询"最近 10 分钟已发货但未回传"的订单

---

## 四、Zoho Inventory 接口契约

### 4.1 库存获取（全量）

**接口**：
```
GET /inventory/items?page={page}&per_page=100
```

**认证**：OAuth 2.0  
**响应格式**：
```json
{
  "items": [
    {
      "item_id": "123456789",
      "sku": "SKU-001",
      "name": "Product Name",
      "on_hand": 100,
      "available": 95,  // 可售库存（作为可售基数）
      "committed": 5,
      "reserved": 0
    }
  ],
  "page_context": {
    "page": 1,
    "per_page": 100,
    "has_more_page": true
  }
}
```

**映射规则**：
- `available` → `InventorySnapshot.available`（可售基数）
- `on_hand` → `InventorySnapshot.on_hand`
- `committed` → `InventorySnapshot.committed`（如果提供）

---

### 4.2 Webhook（库存变动通知）

**状态**：需要配置  
**URL**：`https://your-integration-server.com/webhooks/zoho`  
**事件**：`inventory.adjusted` / `item.updated`  
**签名校验**：待确认

**Payload 格式**（已确认包含库存值）：
```json
{
  "event": "inventory.adjusted",
  "item_id": "123456789",
  "sku": "SKU-001",
  "available": 95,  // payload 包含库存值
  "on_hand": 100,
  "committed": 5,
  "timestamp": "2024-12-01T10:00:00Z"
}
```

**处理流程**：
1. 接收 webhook
2. 解析 payload 获取 `sku` 和 `available`（直接使用，无需二次 API 调用）
3. 更新库存分配并发布到各 marketplace

---

### 4.3 SKU 映射

**状态**：✅ 已确认（Marketplace SKU 与 Zoho item SKU 一致）

**结论**：不需要 SKU 映射表，可以直接使用相同的 SKU 进行库存同步。

---

## 五、内部接口契约（Integration Server）

### 5.1 订单处理流程

**输入**：`NormalizedOrder`  
**输出**：`shipstation_order_id`（存储到映射表）

**流程**：
1. 幂等检查：`(source_marketplace, external_order_id)`
2. 如果已存在：跳过
3. 如果不存在：创建 ShipStation 订单
4. 记录映射：`external_order_id` ↔ `shipstation_order_id`

---

### 5.2 Tracking 回传流程

**输入**：ShipStation webhook payload  
**输出**：回传到对应 marketplace

**流程**：
1. 从 webhook payload 定位 `external_order_id`
2. 幂等检查：`(source_marketplace, external_order_id, tracking_number)`
3. 如果已回传：跳过
4. 如果未回传：调用对应 marketplace API 回传 tracking
5. 记录回传状态

---

### 5.3 库存分配流程

**输入**：`InventorySnapshot`（来自 Zoho）  
**输出**：各 marketplace 库存更新

**计算公式**：
```
alloc_base = max(0, available - safety_stock)  // safety_stock 默认 = 1
publish_qty[m] = floor(alloc_base * ratio[m])
// 受限于 max_oversell_pct = 150%
```

**流程**：
1. 从 Zoho 获取库存快照（webhook 或全量同步）
2. 计算 `alloc_base`
3. 对每个 marketplace 计算 `publish_qty`
4. 调用对应 marketplace API 更新库存
5. 记录发布值（避免重复发布同值）

---

### 5.4 对账流程

**输入**：marketplace open orders  
**输出**：缺失订单列表 + 告警

**流程**：
1. 拉取 marketplace open orders（创建时间 > 15 分钟前）
2. 查询映射表中已成功创建到 ShipStation 的订单
3. 计算差集：`missing = open_orders - mapped_orders`
4. 如果 `missing.length > 阈值`：
   - 自动补拉/补创建（可配置开关）
   - 立即告警（Email + SMS）

---

## 六、错误处理与重试

### 6.1 重试策略

**订单创建失败**：
- 最大重试：3 次
- 间隔：指数退避（初始 30 秒，最大 5 分钟，退避系数 2）

**tracking 回传失败**：
- 最大重试：5 次
- 间隔：指数退避（初始 30 秒，最大 5 分钟，退避系数 2）

**库存更新失败**：
- 最大重试：3 次
- 间隔：指数退避（初始 30 秒，最大 5 分钟，退避系数 2）

---

### 6.2 告警阈值

**漏单告警**：
- warning：> 10 单 或 > 3%
- critical：> 50 单 或 > 10%

**失败告警**（1 小时内）：
- 订单创建失败：warning > 10 次，critical > 50 次
- tracking 回传失败：warning > 20 次，critical > 100 次

**告警渠道**：Email + SMS

---

## 七、数据模型映射表

### 7.1 订单映射表

```sql
CREATE TABLE order_mappings (
  id SERIAL PRIMARY KEY,
  source_marketplace VARCHAR(50) NOT NULL,
  external_order_id VARCHAR(255) NOT NULL,
  shipstation_order_id INTEGER NOT NULL,
  shipstation_store_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_marketplace, external_order_id)
);
```

---

### 7.2 Tracking 回传记录表

```sql
CREATE TABLE tracking_returns (
  id SERIAL PRIMARY KEY,
  source_marketplace VARCHAR(50) NOT NULL,
  external_order_id VARCHAR(255) NOT NULL,
  tracking_number VARCHAR(255) NOT NULL,
  carrier VARCHAR(100),
  service VARCHAR(100),
  ship_date TIMESTAMP,
  returned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_marketplace, external_order_id, tracking_number)
);
```

---

### 7.3 库存发布记录表

```sql
CREATE TABLE inventory_publications (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) NOT NULL,
  marketplace VARCHAR(50) NOT NULL,
  published_qty INTEGER NOT NULL,
  published_at TIMESTAMP DEFAULT NOW(),
  INDEX(sku, marketplace, published_at)
);
```

---

## 变更记录

| 日期 | 版本 | 变更内容 | 变更人 |
|---|---|---|---|
| 2024-12-XX | v1.0 | 初始冻结 | - |

---

**重要提示**：
- 本文档是接口实现的唯一参考标准
- 所有接口实现必须符合本文档定义的契约
- 待确认项完成后，需更新本文档
