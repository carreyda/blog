# Personal Developer Blog

一个面向个人长期使用的全栈博客系统，集个人主页、技术文章、项目展示、内容管理和访问统计于一体。项目基于 Nuxt 4 构建，文章以 Markdown 原文存储在 PostgreSQL 中，可在管理后台直接编辑和发布。

线上地址：[carreyda.com](https://carreyda.com)

## 功能特性

### 博客前台

- 首页、文章列表、文章详情、标签、项目、收藏和关于页面
- 文章页采用「灰底画布 + 居中白卡」版式：左侧圆形工具条（返回列表 / 全屏阅读）、右侧目录卡与相关推荐卡，正文不再重复展示封面
- 收藏页支持多级分类（可折叠）/ 关键词搜索、分类分组展示与图标加载失败降级
- Markdown 渲染、Shiki 代码高亮、目录导航、代码复制与图片点击预览
- 文章标题、摘要和标签搜索
- 响应式布局以及跟随系统 / 亮色 / 暗黑的三态主题切换
- 长页面右下角回到顶部按钮、站内统一的 2px 细滚动条
- 动态 Sitemap、Robots 和基础 SEO 配置
- 文章及全站访问量统计

### 管理后台

- 单管理员账号和基于 HttpOnly Cookie 的 Session 鉴权
- 自绘后台外壳：可折叠侧栏、顶栏面包屑 / 全屏 / 通知 / 主题色切换 / 账号菜单，移动端抽屉导航
- 6 套主题色（浅蓝、靛蓝、紫罗兰、苔绿、琥珀、玫瑰），选择存在 Cookie 里，刷新不闪
- 文章创建、编辑、归档、删除、筛选和搜索；列表支持序号 / ID 列、按标题 / 浏览量 / 更新时间 / 创建时间排序、表头与筛选栏吸顶
- 文章编辑器：顶部吸顶操作栏 + 右侧发布面板（标签、封面、摘要、SEO），保存后回到列表；Vditor 桌面分屏、窄屏即时渲染（IR），支持全屏编辑
- 标签、项目（可拖拽排序）和网站资料管理
- 收藏分类（任意层级、可拖拽）与收藏条目管理，支持按分类分组、列表 / 卡片两种视图、拖拽排序
- 图片媒体库：上传到腾讯云 COS、裁剪、搜索、格式筛选、列表 / 网格视图、批量删除
- 工作台：四张指标卡、近 7 天访问趋势、热门文章、最近编辑、内容构成、时间进度与节日倒计时

### 工程与部署

- Zod 请求参数校验和统一 API 错误处理
- Argon2id 密码哈希、登录限流、CSRF 防护和安全响应头
- Prisma 数据库迁移和健康检查接口
- PM2 进程管理、Nginx 反向代理
- GitHub Actions 推送 `main` 后自动部署

## 技术栈

| 分类 | 技术 |
| --- | --- |
| Web 框架 | Nuxt 4、Vue 3、TypeScript |
| UI | Nuxt UI、原生 CSS |
| 服务端 | Nitro Server API |
| 数据库 | PostgreSQL、Prisma |
| Markdown | Vditor、markdown-it、Shiki |
| 数据校验 | Zod |
| 身份认证 | Session、HttpOnly Cookie、Argon2id |
| 部署 | GitHub Actions、PM2、Nginx |

## 项目结构

```text
.
├─ app/                    # 页面、布局、组件、插件和前端样式
│  ├─ pages/              # 博客前台与管理后台路由
│  ├─ components/         # Markdown 编辑器、媒体库、图片预览等组件
│  ├─ assets/css/         # main.css（全站 + 细滚动条）与 admin-theme.css（后台令牌）
│  └─ assets/icons/       # 后台图标 SVG，由 nuxt-svgo 自动注册为 <SvgoXxx />
├─ server/
│  ├─ api/                # Nitro API 路由
│  ├─ middleware/         # 鉴权和安全中间件
│  └─ utils/              # Prisma、认证、Markdown、COS 存储等服务端工具
├─ shared/schemas/        # 前后端共享的 Zod Schema
├─ prisma/                # 数据模型和迁移记录
├─ scripts/               # 管理员初始化与资源准备脚本
├─ public/                # 静态资源
├─ deploy/                # Nginx 配置示例
├─ docs/                  # 产品与部署文档
└─ .github/workflows/     # 自动部署工作流
```

## 本地开发

### 环境要求

- Node.js 22 或更高版本
- pnpm 11.19.0
- PostgreSQL 16（其他受 Prisma 支持的 PostgreSQL 版本通常也可使用）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 准备 PostgreSQL

创建一个本地数据库和非超级用户。以下示例与仓库中的 PowerShell 配置脚本保持一致：

```sql
CREATE ROLE blog_app WITH LOGIN PASSWORD '替换为本地密码';
CREATE DATABASE blog_dev OWNER blog_app ENCODING 'UTF8';
```

### 3. 配置环境变量

复制示例文件：

```bash
cp .env.example .env
```

Windows PowerShell 也可以运行交互式脚本，它会安全读取数据库密码并生成随机 Session 密钥：

```powershell
.\scripts\configure-local-env.ps1
```

环境变量说明：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | PostgreSQL 连接地址 |
| `SESSION_SECRET` | 是 | Session 密钥，至少使用 32 个随机字节 |
| `NUXT_PUBLIC_SITE_URL` | 是 | 网站根地址，本地默认 `http://localhost:3000` |
| `NUXT_COS_SECRET_ID` | 否 | 腾讯云 CAM SecretId，媒体库上传用 |
| `NUXT_COS_SECRET_KEY` | 否 | 腾讯云 CAM SecretKey |
| `NUXT_COS_BUCKET` | 否 | COS 存储桶名称，形如 `blog-1300000000` |
| `NUXT_COS_REGION` | 否 | COS 存储桶地域，形如 `ap-shanghai` |
| `NUXT_COS_PUBLIC_BASE_URL` | 否 | 图片公开访问的 CDN / 根地址，用于拼接 `MediaAsset.url` |

`NUXT_COS_*` 全部可选：不配置时后台其它功能照常可用，只有「图片上传」会返回 503 `STORAGE_NOT_CONFIGURED`。接入步骤见 [腾讯云 COS 图片上传接入指南](docs/腾讯云COS图片上传接入指南.md)。

不要提交 `.env`。数据库密码包含 `@`、`:`、`/` 或 `#` 等字符时，需要先进行 URL 编码。

### 4. 初始化数据库

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. 创建管理员

```bash
pnpm admin:init
```

根据提示输入管理员用户名和至少 12 位的密码。重复执行会更新同名管理员并使其旧 Session 失效。

### 6. 启动开发服务器

```bash
pnpm dev
```

- 前台：<http://localhost:3000>
- 管理后台：<http://localhost:3000/admin>
- 健康检查：<http://localhost:3000/api/health>

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生成 Prisma Client 并构建生产版本 |
| `pnpm preview` | 本地预览生产构建 |
| `pnpm typecheck` | 执行 Nuxt TypeScript 类型检查 |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:migrate` | 创建或应用开发环境迁移 |
| `pnpm db:studio` | 打开 Prisma Studio |
| `pnpm admin:init` | 创建或更新管理员账号 |

## 生产部署

项目默认采用 Ubuntu、PostgreSQL、PM2 和 Nginx 部署。生产环境建议执行：

```bash
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm build
pm2 startOrReload ecosystem.config.cjs --update-env
```

推送到 `main` 分支后，GitHub Actions 会自动同步代码、安装依赖、执行数据库迁移、构建应用、重载 PM2，并通过 `/api/health` 验证应用和数据库状态。

完整的服务器初始化、HTTPS、GitHub Secrets、备份恢复和故障排查说明见 [部署文档](docs/DEPLOYMENT.md)。产品目标与实现范围见 [产品需求文档](docs/个人博客系统_V2_PRD.md)。

## 安全提示

- 不要提交 `.env`、数据库备份、SSH 私钥或生产日志。
- 生产环境不要直接向公网开放 Nuxt 的 `3000` 端口和 PostgreSQL 的 `5432` 端口。
- 为 `SESSION_SECRET` 使用足够长的随机值，并定期轮换数据库和部署凭据。
- 上线前应配置 HTTPS，并定期备份 PostgreSQL、验证备份可恢复性。

## 文档

- [产品需求文档](docs/个人博客系统_V2_PRD.md)
- [优化待办清单](docs/优化待办清单.md)
- [生产部署指南](docs/DEPLOYMENT.md)
- [收藏模块后端开发指导](docs/收藏模块后端开发指导.md)
- [腾讯云 COS 图片上传接入指南](docs/腾讯云COS图片上传接入指南.md)
- [开发约定](CLAUDE.md)
- [Nginx 配置示例](deploy/nginx-blog.conf.example)
