# 部署指南

## 使用 PM2 部署

### 1. 安装 PM2

```bash
npm install -g pm2
```

### 2. 配置环境变量

编辑 `ecosystem.config.js` 文件，更新以下环境变量：

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3000,
  REDIS_HOST: 'your-redis-host',
  REDIS_PORT: 'your-redis-port',
  SECRET_TOKEN: 'your-secret-token'
}
```

### 3. 启动应用

```bash
# 方法1: 使用启动脚本
./start.sh

# 方法2: 使用 npm 脚本
npm run start:pm2

# 方法3: 直接使用 PM2
pm2 start ecosystem.config.js --env production
```

### 4. 设置开机自启

```bash
# 保存当前 PM2 配置
pm2 save

# 生成开机自启脚本
pm2 startup

# 按照提示执行生成的命令
```

### 5. 常用命令

```bash
# 查看应用状态
npm run status:pm2
# 或
pm2 status

# 查看日志
npm run logs:pm2
# 或
pm2 logs craz-web-meta

# 重启应用
npm run restart:pm2
# 或
pm2 restart craz-web-meta

# 停止应用
npm run stop:pm2
# 或
pm2 stop craz-web-meta

# 删除应用
pm2 delete craz-web-meta
```

### 6. 监控

```bash
# 查看实时监控
pm2 monit

# 查看详细信息
pm2 show craz-web-meta
```

## 使用 Docker 部署（可选）

### 1. 创建 Dockerfile

```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
```

### 2. 构建和运行

```bash
# 构建镜像
docker build -t craz-web-meta .

# 运行容器
docker run -d \
  --name craz-web-meta \
  -p 3000:3000 \
  -e REDIS_HOST=your-redis-host \
  -e REDIS_PORT=your-redis-port \
  -e SECRET_TOKEN=your-secret-token \
  craz-web-meta
```

## 使用 systemd 部署（Linux）

### 1. 创建服务文件

创建 `/etc/systemd/system/craz-web-meta.service`：

```ini
[Unit]
Description=Craz Web Meta API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/craz-web-meta
ExecStart=/usr/local/bin/bun run src/index.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=REDIS_HOST=your-redis-host
Environment=REDIS_PORT=your-redis-port
Environment=SECRET_TOKEN=your-secret-token

[Install]
WantedBy=multi-user.target
```

### 2. 启用服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启用服务
sudo systemctl enable craz-web-meta

# 启动服务
sudo systemctl start craz-web-meta

# 查看状态
sudo systemctl status craz-web-meta
```

## 日志管理

### PM2 日志

日志文件位置：

- 标准输出：`./logs/out.log`
- 错误日志：`./logs/error.log`
- 合并日志：`./logs/combined.log`

### 日志轮转

```bash
# 安装 PM2 日志轮转模块
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## 性能优化

### 1. 集群模式

修改 `ecosystem.config.js`：

```javascript
{
  instances: 'max', // 使用所有 CPU 核心
  exec_mode: 'cluster'
}
```

### 2. 内存限制

```javascript
{
  max_memory_restart: '1G' // 内存超过 1GB 时重启
}
```

### 3. 监控告警

```bash
# 安装 PM2 监控
pm2 install pm2-server-monit
```

## 故障排除

### 1. 应用无法启动

```bash
# 查看详细错误
pm2 logs craz-web-meta --err

# 检查端口占用
lsof -i :3000

# 检查 Redis 连接
redis-cli -h your-redis-host -p your-redis-port ping
```

### 2. 性能问题

```bash
# 查看资源使用情况
pm2 monit

# 查看进程信息
pm2 show craz-web-meta
```

### 3. 日志问题

```bash
# 清空日志
pm2 flush

# 查看实时日志
pm2 logs craz-web-meta --lines 100
```
