module.exports = {
  apps: [
    {
      name: 'craz-web-meta',
      script: 'src/index.ts',
      interpreter: 'bun',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        REDIS_HOST: '104.168.83.218',
        REDIS_PORT: '16379',
        SECRET_TOKEN: 'your-secret-token'
      },
      env_production: {
        REDIS_HOST: 'localhost',
        REDIS_PORT: '16379',
        REDIS_PASSWORD: 'qyy@2025..',
        SECRET_TOKEN: 'your-secret-token',
        PORT: '80'
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
}; 