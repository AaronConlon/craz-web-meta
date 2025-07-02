#!/bin/bash

# 启动 PM2 进程
echo "Starting craz-web-meta with PM2..."
pm2 start ecosystem.config.js --env production

# 保存 PM2 配置
pm2 save

# 设置 PM2 开机自启
pm2 startup

echo "Application started successfully!"
echo "Use 'pm2 status' to check status"
echo "Use 'pm2 logs craz-web-meta' to view logs"
echo "Use 'pm2 stop craz-web-meta' to stop"
echo "Use 'pm2 restart craz-web-meta' to restart"
