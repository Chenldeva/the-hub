# Server 入口说明

## 唯一入口
- 运行入口：`src/index.ts`
- 构建后入口：`dist/index.js`
- 进程管理：`ecosystem.config.js`（PM2）

## 运行方式
开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm run build
pm2 start ecosystem.config.js
```

## 健康检查
- `GET /health`
- `GET /metrics`
- `GET /metrics/json`
