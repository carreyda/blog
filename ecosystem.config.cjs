module.exports = {
  apps: [{
    name: 'personal-blog',
    cwd: __dirname,
    script: '.output/server/index.mjs',
    node_args: '--env-file=.env',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '127.0.0.1',
    },
    max_memory_restart: '512M',
    time: true,
  }],
}
