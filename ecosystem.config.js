/**
 * PM2 进程管理配置文件
 * 
 * 使用方法：
 * - 启动：pm2 start ecosystem.config.js
 * - 停止：pm2 stop the-hub
 * - 重启：pm2 restart the-hub
 * - 查看日志：pm2 logs the-hub
 * - 查看状态：pm2 status
 * - 保存配置：pm2 save
 * - 设置开机自启：pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'the-hub',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 自动重启配置
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      
      // 优雅关闭
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // 监控
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      
      // 环境变量从 .env 文件加载（通过 dotenv）
      // 注意：PM2 不会自动加载 .env 文件，需要在启动脚本中处理
    },
  ],
};
