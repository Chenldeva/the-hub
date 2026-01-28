# SSL 证书配置指南（GoDaddy 域名 + Let's Encrypt）

## 概述

本指南将帮助你为 GoDaddy 域名配置免费的 Let's Encrypt SSL 证书，使 webhook 可以使用 HTTPS。

## 前置要求

- ✅ 有 GoDaddy 域名
- ✅ 服务器 IP：`143.198.110.147`
- ✅ Nginx 已安装并运行
- ✅ 防火墙允许 80 和 443 端口

## 配置步骤

### 1. 配置 DNS 记录（在 GoDaddy）

#### 1.1 登录 GoDaddy

1. 访问 [GoDaddy 网站](https://www.godaddy.com/)
2. 登录你的账号

#### 1.2 进入域名管理

1. 点击 **My Products**（我的产品）
2. 找到你的域名，点击 **DNS** 或 **Manage DNS**

#### 1.3 添加 A 记录

1. 在 DNS 记录列表中找到 **A** 记录部分
2. 点击 **Add**（添加）或 **+** 按钮
3. 填写以下信息：
   - **Name（名称）**：
     - 如果使用根域名：`@` 或留空
     - 如果使用子域名：`api`、`hub`、`webhook` 等（例如：`api.yourdomain.com`）
   - **Value（值）**：`143.198.110.147`
   - **TTL**：`600`（10 分钟）或默认值
4. 点击 **Save**（保存）

**示例**：
- 根域名：`yourdomain.com` → `143.198.110.147`
- 子域名：`api.yourdomain.com` → `143.198.110.147`

#### 1.4 等待 DNS 传播

DNS 更改通常需要几分钟到几小时才能生效。可以使用以下命令检查：

```bash
# 检查 DNS 是否生效（在服务器上或本地执行）
nslookup yourdomain.com
# 或
dig yourdomain.com

# 应该返回 143.198.110.147
```

### 2. 安装 Certbot（在服务器上）

```bash
# 更新系统包
apt update

# 安装 Certbot 和 Nginx 插件
apt install -y certbot python3-certbot-nginx
```

### 3. 配置 SSL 证书

#### 3.1 使用 Certbot 自动配置

```bash
# 替换 yourdomain.com 为你的实际域名
certbot --nginx -d yourdomain.com

# 如果使用子域名
certbot --nginx -d api.yourdomain.com
```

**交互式配置**：
1. **Email 地址**：输入你的邮箱（用于证书到期提醒）
2. **同意服务条款**：输入 `Y` 或 `A`
3. **分享邮箱**：输入 `Y` 或 `N`（可选）
4. Certbot 会自动：
   - 验证域名所有权
   - 获取 SSL 证书
   - 配置 Nginx 支持 HTTPS
   - 设置自动续期

#### 3.2 验证配置

Certbot 会自动修改 Nginx 配置，添加 HTTPS 支持。验证配置：

```bash
# 测试 Nginx 配置
nginx -t

# 如果测试通过，重启 Nginx
systemctl restart nginx

# 检查 Certbot 服务状态（自动续期）
systemctl status certbot.timer
```

### 4. 验证 SSL 证书

#### 4.1 测试 HTTPS 访问

在浏览器中访问：
```
https://yourdomain.com/health
https://yourdomain.com/webhooks/shipstation
```

应该看到：
- 浏览器显示安全锁图标
- 地址栏显示 `https://`
- 端点正常响应

#### 4.2 使用命令行测试

```bash
# 测试 HTTPS 端点
curl https://yourdomain.com/health
curl https://yourdomain.com/webhooks/shipstation
```

### 5. 更新 Nginx 配置（如果需要）

Certbot 通常会自动配置，但如果需要手动调整，配置文件位置：

```bash
# Nginx 配置文件
/etc/nginx/sites-available/the-hub

# 查看 Certbot 修改后的配置
cat /etc/nginx/sites-available/the-hub
```

**典型的 HTTPS 配置**：
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # 重定向 HTTP 到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL 证书（Certbot 自动添加）
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL 配置（Certbot 自动添加）
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # 其他配置（与 HTTP 相同）
    # ...
}
```

### 6. 配置自动续期

Let's Encrypt 证书有效期 90 天，Certbot 会自动续期。验证自动续期：

```bash
# 检查 Certbot 定时任务
systemctl status certbot.timer

# 手动测试续期（不会真正续期，只是测试）
certbot renew --dry-run
```

### 7. 更新 ShipStation Webhook URL

SSL 配置完成后，在 ShipStation 后台使用 HTTPS URL：

```
https://yourdomain.com/webhooks/shipstation
```

## 常见问题排查

### 问题 1：DNS 未生效

**检查方法**：
```bash
# 检查 DNS 解析
nslookup yourdomain.com
dig yourdomain.com

# 应该返回 143.198.110.147
```

**解决方法**：
- 等待 DNS 传播（通常 5-30 分钟）
- 检查 GoDaddy DNS 配置是否正确
- 清除本地 DNS 缓存

### 问题 2：Certbot 验证失败

**错误信息**：
```
Failed to verify domain ownership
```

**可能原因**：
- DNS 未生效
- 防火墙阻止 80 端口
- 域名无法访问服务器

**解决方法**：
```bash
# 确保防火墙允许 80 和 443 端口
ufw allow 80/tcp
ufw allow 443/tcp

# 确保 Nginx 正在运行
systemctl status nginx

# 测试域名是否可访问
curl http://yourdomain.com/health
```

### 问题 3：证书续期失败

**解决方法**：
```bash
# 手动续期
certbot renew

# 检查续期日志
journalctl -u certbot.timer
```

### 问题 4：HTTPS 访问返回错误

**检查 Nginx 配置**：
```bash
# 测试配置
nginx -t

# 查看错误日志
tail -f /var/log/nginx/the-hub-error.log
```

## 安全建议

1. **强制 HTTPS**：
   - Certbot 通常会自动配置 HTTP 到 HTTPS 的重定向
   - 确保所有 HTTP 请求都重定向到 HTTPS

2. **更新防火墙规则**：
   ```bash
   ufw allow 80/tcp   # HTTP（用于 Let's Encrypt 验证）
   ufw allow 443/tcp  # HTTPS
   ```

3. **定期检查证书状态**：
   ```bash
   certbot certificates
   ```

## 验证清单

配置完成后，确认以下项：

- [ ] DNS 记录已配置并生效
- [ ] SSL 证书已成功获取
- [ ] HTTPS 端点可以正常访问
- [ ] HTTP 自动重定向到 HTTPS
- [ ] Certbot 自动续期已配置
- [ ] ShipStation webhook URL 已更新为 HTTPS

## 下一步

1. 在 ShipStation 后台配置 webhook，使用 HTTPS URL
2. 测试 webhook 是否正常接收
3. 监控日志确保一切正常

## 相关文档

- [Let's Encrypt 文档](https://letsencrypt.org/docs/)
- [Certbot 文档](https://certbot.eff.org/)
- [Nginx SSL 配置](https://nginx.org/en/docs/http/configuring_https_servers.html)
