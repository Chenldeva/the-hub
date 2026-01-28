# ShipStation Webhook 配置指南

## 概述

本指南将帮助你配置 ShipStation webhook，使 ShipStation 能够在订单发货时自动通知 Integration Server。

## 前置要求

- ✅ Integration Server 已部署并运行
- ✅ Nginx 反向代理已配置（可选但推荐）
- ✅ 服务器 IP 或域名可公网访问

## 配置步骤

### 1. 确认 Webhook URL

根据你的部署情况，webhook URL 为：

**如果使用 Nginx（推荐）**：
```
http://143.198.110.147/webhooks/shipstation
```

**如果直接访问 Node.js 应用**：
```
http://143.198.110.147:3000/webhooks/shipstation
```

**如果有域名并配置了 SSL**：
```
https://your-domain.com/webhooks/shipstation
```

### 2. 确认 Webhook Secret（可选）

如果你在 `.env` 文件中配置了 `SHIPSTATION_WEBHOOK_SECRET`，需要在 ShipStation 后台使用相同的值。

**检查当前配置**：
```bash
# 在服务器上执行
cd /var/www/the-hub
grep SHIPSTATION_WEBHOOK_SECRET .env
```

**如果没有配置**：
- 可以留空（webhook 仍然可以工作，但没有签名验证）
- 或者生成一个随机字符串作为 secret

### 3. 在 ShipStation 后台配置 Webhook

#### 3.1 登录 ShipStation

1. 访问 [ShipStation 登录页面](https://www.shipstation.com/)
2. 使用你的账号登录

#### 3.2 进入 Webhook 设置

1. 点击右上角的 **Settings**（设置）
2. 在左侧菜单中找到 **Webhooks**（Webhook）
3. 点击 **Add Webhook**（添加 Webhook）

#### 3.3 配置 Webhook

填写以下信息：

**Event（事件）**：
- 选择 **Order Shipped**（订单已发货）
- 这是最常用的事件，用于接收发货通知

**URL（URL）**：
- 输入你的 webhook URL：
  ```
  http://143.198.110.147/webhooks/shipstation
  ```
- 或使用域名（如果有）：
  ```
  https://your-domain.com/webhooks/shipstation
  ```

**Secret（密钥）**（可选）：
- 如果配置了 `SHIPSTATION_WEBHOOK_SECRET`，输入相同的值
- 如果未配置，可以留空

**其他选项**：
- **Store**：可以选择特定 Store，或选择 "All Stores"（所有 Store）
- **Active**：确保勾选，启用 webhook

#### 3.4 保存配置

点击 **Save**（保存）按钮保存配置。

### 4. 测试 Webhook

#### 4.1 在服务器上监控日志

```bash
# 查看 PM2 日志（实时）
pm2 logs the-hub

# 或查看 Nginx 访问日志
tail -f /var/log/nginx/the-hub-access.log
```

#### 4.2 触发测试事件

在 ShipStation 中：
1. 找一个测试订单
2. 标记为已发货
3. 观察服务器日志，应该能看到 webhook 请求

#### 4.3 验证响应

如果配置正确，你应该看到：
- 日志中显示 "ShipStation webhook received"
- HTTP 200 响应
- 返回 `{"received": true}`

### 5. 常见问题排查

#### 问题 1：Webhook 未收到请求

**检查项**：
- ✅ 确认 webhook URL 是否正确
- ✅ 确认服务器可以公网访问
- ✅ 确认防火墙允许 80/443 端口
- ✅ 检查 ShipStation 后台的 webhook 状态是否为 "Active"

**测试方法**：
```bash
# 在服务器上测试端点是否可访问
curl -X POST http://localhost/webhooks/shipstation \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

#### 问题 2：签名验证失败

**原因**：
- `SHIPSTATION_WEBHOOK_SECRET` 配置不正确
- ShipStation 后台的 Secret 与服务器配置不一致

**解决方法**：
1. 检查 `.env` 文件中的 `SHIPSTATION_WEBHOOK_SECRET`
2. 确保 ShipStation 后台的 Secret 与 `.env` 中的值完全一致
3. 如果不需要签名验证，可以清空两边的 Secret

#### 问题 3：Nginx 代理问题

**检查 Nginx 配置**：
```bash
# 检查 Nginx 配置
cat /etc/nginx/sites-available/the-hub | grep webhooks

# 测试 Nginx 配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

**确保 Nginx 配置包含**：
```nginx
location /webhooks/ {
    proxy_pass http://localhost:3000;
    proxy_request_buffering off;  # 重要：不缓冲请求体
    ...
}
```

## Webhook 事件类型

ShipStation 支持多种 webhook 事件，根据你的需求选择：

- **Order Shipped**（订单已发货）- 最常用，用于接收 tracking 信息
- **Order Created**（订单已创建）
- **Order Updated**（订单已更新）
- **Order Voided**（订单已取消）

**推荐配置**：
- 至少配置 **Order Shipped** 事件
- 如果需要实时同步订单状态，可以添加其他事件

## 安全建议

1. **使用 HTTPS**（如果有域名）：
   - 配置 SSL 证书
   - 使用 `https://` URL

2. **启用签名验证**：
   - 配置 `SHIPSTATION_WEBHOOK_SECRET`
   - 在 ShipStation 后台使用相同的 Secret

3. **限制访问**：
   - 使用防火墙限制访问
   - 考虑使用 IP 白名单（如果 ShipStation 提供固定 IP）

## 验证清单

配置完成后，确认以下项：

- [ ] ShipStation 后台 webhook 已创建并激活
- [ ] Webhook URL 正确（可通过浏览器访问）
- [ ] 服务器日志可以正常接收 webhook 请求
- [ ] 签名验证正常工作（如果配置了 Secret）
- [ ] 测试订单发货后能收到 webhook 通知

## 下一步

配置完成后，你可以：
1. 监控 webhook 日志，确保正常工作
2. 在 M1 阶段实现具体的 webhook 处理逻辑（tracking 回传等）
3. 配置其他 marketplace 的 webhook（如需要）

## 相关文档

- [ShipStation Webhook 文档](https://www.shipstation.com/docs/webhooks/)
- [部署文档](./digitalocean-deployment.md)
- [API 契约文档](../docs/guides/api-contracts.md)
