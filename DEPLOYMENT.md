# 腾讯云部署准备

推荐 Ubuntu + Nginx + Node.js 22 + PM2 + PostgreSQL 17，Nuxt 和 PostgreSQL 仅监听本机地址。

1. 创建独立数据库用户和生产数据库，不使用 `postgres` 超级用户运行应用。
2. 在服务器项目目录创建 `.env`，配置 `DATABASE_URL`、至少 32 字节随机 `SESSION_SECRET` 和真实的 `NUXT_PUBLIC_SITE_URL=https://你的域名`。
3. 执行 `pnpm install --frozen-lockfile`、`pnpm prisma migrate deploy`、`pnpm build`。
4. 执行 `pm2 start ecosystem.config.cjs` 与 `pm2 save`。
5. 参考 `deploy/nginx-blog.conf.example` 配置域名，再通过 Certbot 配置 HTTPS。
6. 只在安全组开放 22、80、443；不要开放 3000 和 5432。
7. 使用 `https://你的域名/api/health` 验证应用和数据库。

部署前应备份 PostgreSQL；更新流程为拉取代码、安装依赖、执行 `prisma migrate deploy`、构建并 `pm2 reload personal-blog`。
