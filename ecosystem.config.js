export default {
  apps: [{
    name: 'neta-app',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require',
      SESSION_SECRET: 'neta-backspace-fm-super-secret-session-key-2025',
      DOMAIN: 'neta.backspace.fm',
      PROTOCOL: 'https',
      HOST: '0.0.0.0',
      SERVER_IP: '153.125.147.133',
      TRUSTED_PROXIES: '127.0.0.1,153.125.147.133',
      LOG_LEVEL: 'info',
      RATE_LIMIT_WINDOW_MS: 900000,
      RATE_LIMIT_MAX_REQUESTS: 100
    }
  }]
}