# 部署前检查清单

在执行部署前，请确认以下所有项已完成。

## 前置要求

- [ ] **DigitalOcean 账号**
  - 账号已创建并可登录
  - 有足够的余额或已配置付款方式

- [ ] **域名或 IP 地址**
  - 已准备好域名（如果使用域名）
  - 或准备使用 Droplet IP 地址

- [ ] **API 凭证准备**
  - [ ] ShipStation API Key
  - [ ] ShipStation API Secret
  - [ ] ShipStation Webhook Secret
  - [ ] Amazon SP-API Client ID
  - [ ] Amazon SP-API Client Secret
  - [ ] Amazon SP-API Refresh Token
  - [ ] Amazon SP-API Marketplace ID
  - [ ] Zoho Inventory Client ID
  - [ ] Zoho Inventory Client Secret
  - [ ] Zoho Inventory Refresh Token
  - [ ] Zoho Inventory Webhook Secret（如果需要）

- [ ] **SSH 访问**
  - 已配置 SSH key 或知道 Droplet root 密码
  - 可以访问本地终端/命令行

## 部署准备

- [ ] **代码准备**
  - 代码已提交到 Git 仓库（如果使用 Git 部署）
  - 或代码在本地机器上准备就绪

- [ ] **文档阅读**
  - 已阅读 [deploy/digitalocean-deployment.md](digitalocean-deployment.md)
  - 已阅读 [deploy/README.md](README.md)
  - 已理解部署流程

## 检查清单使用说明

1. 在执行部署前，逐项检查并勾选已完成的项目
2. 确保所有必需项都已勾选
3. 对于可选项，根据实际需求决定是否完成
4. 保存此清单，在部署过程中参考

## 部署后验证

部署完成后，请验证：

- [ ] 数据库连接正常
- [ ] 服务通过 PM2 运行
- [ ] 健康检查端点返回 `healthy`
- [ ] 监控指标端点可访问
- [ ] Webhook 端点可访问
- [ ] Nginx 反向代理配置（如果使用）
- [ ] SSL 证书配置（如果使用）
- [ ] ShipStation Webhook 已配置
- [ ] PM2 开机自启已配置
