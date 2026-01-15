module.exports = {
  apps: [
    {
      name: "cc-sdk-api",
      script: "./server/index.ts",
      interpreter: "npx",
      interpreter_args: "tsx",

      // Environment
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Process management
      instances: 1,
      exec_mode: "fork",

      // Restart behavior
      watch: false,
      max_restarts: 10,
      restart_delay: 1000,

      // Logging - use pm2 default log location to avoid permission issues
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      combine_logs: true,

      // Health monitoring
      max_memory_restart: "500M",

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
