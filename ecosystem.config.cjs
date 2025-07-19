module.exports = {
  apps: [{
    name: 'neta-app',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    
    // Performance optimizations
    instance_var: 'INSTANCE_ID',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Node.js optimizations
    node_args: '--max-old-space-size=1024 --optimize-for-size',
    
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://postgres:netapass123@localhost:5432/neta_local',
      SESSION_SECRET: 'neta-backspace-fm-super-secret-session-key-2025',
      DOMAIN: 'neta.backspace.fm',
      PROTOCOL: 'https',
      HOST: '0.0.0.0',
      SERVER_IP: '153.127.201.139',
      TRUSTED_PROXIES: '127.0.0.1,153.127.201.139',
      LOG_LEVEL: 'info',
      RATE_LIMIT_WINDOW_MS: 60000,
      RATE_LIMIT_MAX_REQUESTS: 200,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'default_admin_pass',
      
      // Node.js performance settings
      NODE_OPTIONS: '--max-http-header-size=16384',
      UV_THREADPOOL_SIZE: '16' // Increase thread pool for better I/O
    }
  }]
}