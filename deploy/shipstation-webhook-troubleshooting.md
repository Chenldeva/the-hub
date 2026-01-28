# ShipStation Webhook 配置问题排查

## 问题描述

在 ShipStation 后台配置 webhook URL 后，点击 Save 按钮，webhook 没有出现。

## 可能原因

### 1. ShipStation 要求 HTTPS（最可能）

**现象**：
- Zoho 的 webhook URL（HTTPS）可以成功创建
- 我们的 HTTP URL 无法创建

**原因**：
- ShipStation 可能要求 webhook URL 必须是 HTTPS（安全连接）
- 这是很多 webhook 服务的安全要求

**解决方案**：
- 配置 SSL 证书，使用 HTTPS URL
- 或使用 ngrok 等工具临时提供 HTTPS 隧道（仅用于测试）

### 2. ShipStation 在保存时验证端点

**现象**：
- ShipStation 在保存 webhook 时会发送测试请求验证端点
- 如果端点无法访问或返回错误，webhook 不会保存

**解决方案**：
- 已添加 GET 端点用于验证：`GET /webhooks/shipstation`
- 确保端点可以从公网访问

### 3. 端点无法从公网访问

**检查方法**：
```bash
# 在服务器上测试端点
curl http://localhost/webhooks/shipstation

# 从外部测试（使用另一个服务器或在线工具）
curl http://143.198.110.147/webhooks/shipstation
```

## 解决方案

### 方案 1：配置 SSL 证书（推荐）

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 在服务器上执行
apt install -y certbot python3-certbot-nginx

# 如果有域名，配置 SSL
certbot --nginx -d your-domain.com

# 如果没有域名，可以使用 IP 地址（但 Let's Encrypt 不支持 IP）
# 需要使用其他方法，如自签名证书（不推荐）或使用域名
```

配置完成后，使用 HTTPS URL：
```
https://your-domain.com/webhooks/shipstation
```

### 方案 2：使用 ngrok 临时 HTTPS 隧道（仅用于测试）

如果暂时没有域名，可以使用 ngrok 提供 HTTPS 隧道：

```bash
# 在服务器上安装 ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/

# 启动 ngrok 隧道
ngrok http 80

# 会显示一个 HTTPS URL，例如：
# https://abc123.ngrok.io -> http://localhost:80
```

然后在 ShipStation 中使用 ngrok 提供的 HTTPS URL：
```
https://abc123.ngrok.io/webhooks/shipstation
```

**注意**：ngrok 免费版 URL 会变化，不适合生产环境。

### 方案 3：检查端点可访问性

在配置 webhook 之前，先测试端点是否可以从公网访问：

```bash
# 在服务器上测试
curl http://localhost/webhooks/shipstation

# 应该返回：
# {"status":"ok","message":"ShipStation webhook endpoint is ready","endpoint":"/webhooks/shipstation"}
```

如果无法从外部访问，检查：
- 防火墙是否允许 80 端口
- Nginx 是否正常运行
- 服务器是否可以从公网访问

## 快速测试步骤

### 1. 测试端点是否可访问

```bash
# 在服务器上执行
curl http://localhost/webhooks/shipstation
```

应该返回：
```json
{
  "status": "ok",
  "message": "ShipStation webhook endpoint is ready",
  "endpoint": "/webhooks/shipstation"
}
```

### 2. 从外部测试（使用浏览器或在线工具）

访问：
```
http://143.198.110.147/webhooks/shipstation
```

应该看到相同的 JSON 响应。

### 3. 测试 POST 请求

```bash
curl -X POST http://143.198.110.147/webhooks/shipstation \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

应该返回：
```json
{"received": true}
```

## 推荐方案

**生产环境**：
1. 获取域名（可以使用免费域名服务，如 Freenom）
2. 配置 DNS 指向服务器 IP
3. 使用 Let's Encrypt 配置 SSL 证书
4. 使用 HTTPS URL 配置 webhook

**临时测试**：
1. 使用 ngrok 提供 HTTPS 隧道
2. 使用 ngrok 提供的 HTTPS URL 配置 webhook
3. 测试完成后，配置正式的 SSL 证书

## 下一步

1. 先测试端点是否可以从公网访问
2. 如果无法访问，检查防火墙和 Nginx 配置
3. 如果可访问但 ShipStation 仍无法保存，配置 SSL 证书使用 HTTPS
4. 配置完成后，重新尝试在 ShipStation 中保存 webhook
