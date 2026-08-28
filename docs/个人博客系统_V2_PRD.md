# 个人博客系统 PRD

> Version: V2.1（上线基线版）
> Date: 2026-08-29
> Status: V1 已上线，持续迭代
> Production: https://carreyda.com

---

## 目录

- Part A　项目概述与目标
- Part B　技术方案总览
- Part C　内容管理策略
- Part D　博客前台（产品 / UX）
- Part E　管理后台（产品 / UX）
- Part F　SEO / 数据库 / API
- Part G　安全与部署
- Part H　代码目录结构
- Part I　非功能需求
- Part J　范围边界（V1 不做的事）
- Part K　优先级、路线图与验收标准
- Part L　后续规划
- Part M　当前实现状态与已知差异

---

# Part A　项目概述与目标

## A.1 项目定位

个人博客系统，生产域名为 **carreyda.com**，面向个人长期使用，定位为：

**个人主页 + 技术博客 + 内容管理后台 + 数据统计系统**

主要用途：展示个人信息 / 技术栈 / 个人项目，发布技术文章，沉淀学习记录，管理博客内容，查看访问数据，建立个人技术品牌。

系统由两部分组成：

- **博客前台**：面向访客
- **管理后台**：仅站点管理员本人使用

## A.2 项目目标

| # | 目标 |
|---|---|
| 1 | 博客前台保持简洁、克制的开发者个人主页风格 |
| 2 | 支持 Markdown 技术文章 |
| 3 | 支持通过后台直接发布文章 |
| 4 | 不依赖手动创建 Markdown 文件 |
| 5 | 不需要提交文章到 GitHub 后才能发布 |
| 6 | 支持 Markdown 内容复制粘贴 |
| 7 | 支持所见即所得、即时渲染和 Markdown 编辑 |
| 8 | 支持创建文章后直接发布，无需草稿流程（自用场景，跳过草稿状态） |
| 9 | 支持个人项目管理 |
| 10 | 支持访问数据统计 |
| 11 | 支持 GitHub Push 后代码自动部署到腾讯云服务器 |

---

# Part B　技术方案总览

## B.1 核心技术栈

| 类型 | 技术 |
|---|---|
| Web Framework | Nuxt 4 |
| Language | TypeScript |
| Frontend | Vue 3 |
| UI Component Library（后台） | Nuxt UI |
| Server API | Nuxt Nitro |
| Database | PostgreSQL |
| ORM | Prisma |
| Markdown Editor | Vditor |
| Markdown Storage | PostgreSQL TEXT |
| Markdown Render（前台） | markdown-it |
| Code Highlight | Shiki |
| Deployment | Tencent Cloud CVM |
| Web Server | Nginx |
| Node Process | PM2 |
| CI/CD | GitHub Actions |
| HTTPS | 腾讯云 TrustAsia DV TLS 证书（Nginx 手工部署） |

## B.2 系统架构

```text
                         GitHub
                            │
                       Push Main
                            │
                            ▼
                    GitHub Actions
                            │
                            ▼
                     腾讯云服务器
                            │
                ┌───────────┴───────────┐
                │                       │
              Nginx                PostgreSQL
                │
                ▼
             Nuxt 4
                │
       ┌────────┴────────┐
       │                 │
    博客前台           管理后台
       │                 │
       └────────┬────────┘
                │
             Nitro API
                │
                ▼
           PostgreSQL
```

---

# Part C　内容管理策略

## C.1 存储原则

文章正文采用 **Markdown First**，最终统一保存为 Markdown 原文，存储在数据库字段 `contentMarkdown`（类型 `TEXT`）。**不**保存为 `.md` 文件，**不**将文章正文保存在 GitHub。

## C.2 内容与代码职责划分

| 归属 | 内容 |
|---|---|
| GitHub | 程序代码、配置文件、数据库 Schema、部署脚本、前端资源 |
| PostgreSQL | 文章、标签、项目、站点配置、访问统计、用户数据 |

对应两条独立流水线：

```text
代码更新：本地开发 → Git Push → GitHub → GitHub Actions → 自动部署
文章发布：进入后台 → 新建文章 → 编辑 Markdown → 发布 → 保存 PostgreSQL → 前台立即生效
```

文章发布**不**触发 GitHub CI/CD。

## C.3 图片管理方案

V1 不开发媒体库，不提供图片上传 / 存储 / 管理 / 腾讯云 COS 管理。用户使用已有图床，文章内容以标准 Markdown 图片语法引用：

```markdown
![图片描述](https://example.com/image.png)
```

**图片插入交互**：点击「插入图片」→ 弹窗输入图片地址 + 图片描述 → 生成对应 Markdown 语法。

**文章封面**：同样使用 URL 字段 `coverImageUrl`（例：`https://xxx.com/cover/nuxt.webp`）。

## C.4 Markdown 编辑器

后台采用 **Vditor**，支持三种编辑模式：

| 模式 | 说明 |
|---|---|
| 即时渲染（IR） | 默认模式，体验类似 Typora |
| 所见即所得（WYSIWYG） | 适合不希望直接操作 Markdown 的场景 |
| 分屏编辑 | 左侧编辑 Markdown，右侧实时预览 |

**复制粘贴**：系统不提供 `.md` 文件上传，用户已有 Markdown 内容时通过「复制 → 新建文章 → Ctrl+V → 继续编辑」完成导入，需尽可能保留标题、列表、引用、链接、图片、表格、代码块等基础语法。

## C.5 Markdown 能力范围

**V1 至少支持**：标题、段落、粗体、斜体、删除线、有序/无序/任务列表、引用、链接、图片、表格、行内代码、代码块、分割线、GFM、标题 Anchor、TOC、代码高亮、代码复制。

**渲染方案**：前台使用 **markdown-it** 将 `contentMarkdown` 渲染为 HTML，主流轻量、插件生态成熟。标题 Anchor 与 TOC 依赖插件（如 `markdown-it-anchor` + `markdown-it-toc-done-right`）；代码块渲染交给 Shiki 高亮，通过 markdown-it 的 `highlight` 选项接入。

**可扩展能力（非 V1 强制）**：Mermaid、Math/LaTeX、Callout、Footnote、自定义 Container、视频嵌入。

---

# Part D　博客前台（产品 / UX）

## D.1 页面结构

| 路径 | 页面 |
|---|---|
| `/` | 首页 |
| `/blog` | 文章列表 |
| `/blog/[id]` | 文章详情（以文章 id 作为路径标识，不使用 slug） |
| `/tags/[slug]` | 标签文章 |
| `/projects` | 项目 |
| `/about` | 关于我 |
| `/404` | 404 页面 |

## D.2 首页

**定位**：同时承担「个人主页 + 博客入口」，视觉风格：极简、大量留白、开发者风格、内容优先、轻量、克制。

**页面结构**（自上而下）：Header → Intro → Latest Writing → Projects → Tech Stack → Find Me On → Get In Touch → Footer

### D.2.1 Header

- 导航：首页 / 文章 / 项目 / 关于
- 当前主题跟随操作系统深浅色偏好
- 后续可增加：手动主题切换

### D.2.2 Intro

展示头像、姓名、一句话介绍、简介、联系按钮、当前状态。示例：

```text
你好，我是 XXX。
一名前端 / 全栈开发者，关注 Web 开发、AI 与产品构建。

联系我　　● 当前可交流 / 合作
```

### D.2.3 Latest Writing

首页展示最近 3～5 篇文章，每篇展示标题、摘要、发布时间、阅读时长、标签，底部提供「查看全部文章 →」入口。

### D.2.4 Projects（首页精选）

每个项目展示：项目名称、简介、状态、技术栈、项目地址、GitHub 地址。

项目仅作为外链卡片，不提供站内项目详情页。点击卡片时优先在新标签页打开 `websiteUrl`；未配置 `websiteUrl` 时打开 `githubUrl`。GitHub 地址同时可作为卡片上的独立按钮。外部链接需添加 `rel="noopener noreferrer"`。

支持状态：`Active` / `Archived` / `Sold` / `Building`（展示文案支持中文）。

### D.2.5 Tech Stack

采用 Badge 形式展示（如 Vue / Nuxt / TypeScript / Node.js / PostgreSQL / Docker / Git），**不使用**百分比技能进度条。

### D.2.6 Find Me On（社交信息）

展示 GitHub / X (Twitter) / LinkedIn / 小红书 / 掘金 / 知乎 / 其它个人平台，由后台配置。

### D.2.7 Get In Touch（联系方式）

支持 Email / GitHub / 个人社交链接，不需要开发站内私信系统。

## D.3 文章列表

路径 `/blog`，展示标题、摘要、日期、阅读时长、标签，支持分页。

**搜索**（已实现）：范围为文章标题 / 摘要 / 标签；后续可扩展正文全文搜索。

## D.4 文章详情

路径 `/blog/[id]`，以文章自增 `id` 作为路径标识（不单独维护 slug 字段，省去 slug 生成与唯一性校验）。当前页面包含：标题、摘要、发布时间、阅读时长、标签、封面、正文和 TOC。

**上一篇 / 下一篇与相关文章（P1，待实现）**：相关文章与当前文章存在共同标签且非本文自身，按共同标签数量降序、发布时间降序排序，展示前 3～5 篇，不做语义相关性算法。

**阅读进度（P1，待实现）**：顶部显示细线阅读进度条，颜色 `#4493f8`。

**代码块**：支持 Shiki 高亮、语言名称显示、Copy 按钮、横向滚动。

## D.5 标签页

路径 `/tags/[slug]`，显示对应标签下的文章，如「# Nuxt · 12 篇文章」。

## D.6 项目页

路径 `/projects`，以外链卡片形式展示全部个人项目，字段：项目名称、项目简介、技术栈、项目状态、网站地址、GitHub 地址、排序、创建时间。V1 不提供项目详情页，不设置项目 Slug 和详细描述。

## D.7 关于页

路径 `/about`，正文以 Markdown 格式配置和存储，包含：个人介绍、技术经历、技术方向、兴趣、当前关注方向；社交链接读取网站设置中的结构化配置。

## D.8 深色模式与 Design Token

当前支持跟随操作系统的 `System` 深浅色模式，主题主色为 `#4493f8`。手动选择 `Light` / `Dark` / `System` 并持久化用户偏好列为 P1。

基础主题变量（具体 Token 后续在 UI Design 阶段进一步细化）：

```css
:root {
  --color-primary: #4493f8;

  --color-text: #171717;
  --color-text-secondary: #737373;
  --color-text-muted: #a3a3a3;

  --color-background: #ffffff;
  --color-background-secondary: #f7f7f7;

  --color-border: #e5e5e5;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-pill: 9999px;
}
```

---

# Part E　管理后台（产品 / UX）

后台入口 `/admin`，仅管理员本人使用。管理后台页面统一使用 **Nuxt UI** 组件库开发（表单、表格、弹窗、通知等交互组件均基于 Nuxt UI，不单独造轮子），博客前台不受此约束，可保持独立的极简视觉风格。

## E.1 后台导航

| 一级 | 二级 |
|---|---|
| 仪表盘 | — |
| 内容管理 | 文章管理 / 标签管理 |
| 项目管理 | 项目列表 |
| 数据分析 | 访问统计 |
| 系统 | 网站设置 |

明确**不**包含：媒体库。

## E.2 登录与鉴权

路径 `/admin/login`。V1 仅支持**单管理员**，不开发注册 / 多用户 / OAuth / RBAC / 作者系统。

- 登录字段：用户名、密码
- 登录状态：Session + HttpOnly Cookie（避免将重要认证 Token 保存在 LocalStorage）

## E.3 Dashboard

路径 `/admin`。

**数据卡片**：文章总数、已发布文章、全站总访问量

**浏览量 Top 5**：文章标题、浏览量（按 `Post.viewCount` 排序取前 5，无需单独的趋势图表）

**最近文章**（最近编辑）：标题、状态、更新时间

## E.4 文章管理

路径 `/admin/posts`

**列表字段**：标题、标签、状态、浏览量、发布时间、更新时间、操作

**搜索**：支持文章标题搜索　|　**筛选**：状态、标签

**操作**：新建、编辑、下线（归档）、删除。删除采用物理删除，删除前必须二次确认；删除后数据不可恢复。

### E.4.1 新建文章

路径 `/admin/posts/new`，页面包含：标题、摘要、Markdown 正文、标签、封面 URL、SEO 设置、保存（保存即发布，无草稿状态）。

### E.4.2 编辑文章

路径 `/admin/posts/[id]`，核心布局：

```text
┌────────────────────────────────────┐
│ 标题                               │
├────────────────────────────────────┤
│ 编辑器模式                         │
│ 即时渲染 | 所见即所得 | 分屏       │
├────────────────────────────────────┤
│ Vditor                             │
├────────────────────────────────────┤
│                    保存并立即生效    │
└────────────────────────────────────┘
```

已发布文章可直接进入编辑、修改后保存即时生效，不存在"编辑已发布文章需要先转草稿"这类中间状态。

### E.4.3 保存与发布

系统不提供自动保存和草稿状态。新建文章只有在用户主动点击「保存并发布」后才写入数据库并在前台公开；编辑已发布文章时，用户主动保存后修改立即生效。保存失败时保留当前页面内容并显示错误提示，避免误以为保存成功。

快捷键 `Ctrl+S` / `Cmd+S` 与页面保存按钮行为一致：新建文章时保存并发布，编辑文章时保存并立即更新线上内容。

### E.4.4 文章状态

| 状态值 | 中文 |
|---|---|
| PUBLISHED | 已发布 |
| ARCHIVED | 已归档（下线，不在前台展示，但保留数据） |

`publishedAt` 在文章首次保存并发布时写入。后续编辑、归档以及归档后重新发布均保留首次发布时间，只更新 `updatedAt`。

## E.5 标签管理

路径 `/admin/tags`，支持：创建 / 修改 / 删除。字段：name, slug。

## E.6 项目管理

路径 `/admin/projects`，支持：创建项目、编辑项目、删除项目、修改状态、排序。项目仅用于前台外链卡片，不包含 Slug、详细描述或站内详情页配置。

## E.7 数据分析

V1 只做最基础的浏览量统计，不做访问趋势图、不做用户画像、不做地域/设备分析：

- **全站总访问量**：前台任意页面（首页 / 文章 / 标签 / 项目 / 关于）被访问时，全局计数器 `+1`
- **单篇文章浏览量**：文章详情页访问时，对应 `Post.viewCount + 1`
- **浏览量 Top 5**：按 `Post.viewCount` 排序取前 5

两个计数器都采用简单计数，不做去重（不区分独立访客 / 重复访问），接受刷新、机器人访问导致的重复计数，也不记录访问日志明细，避免引入 `visitorId` 生成方式、日志表规模控制等额外复杂度——统计目的是"大致看看"，不是精确分析。

## E.8 网站设置

路径 `/admin/settings`

| 分类 | 配置项 |
|---|---|
| 基础信息 | 网站名称、网站描述、头像 URL、Logo URL、个人名称、个人简介、当前状态、Email |
| 首页内容 | 技术栈（可排序）、首页精选项目数量 |
| 关于页 | Markdown 正文 |
| 社交链接 | GitHub、Twitter/X、LinkedIn、掘金、知乎、小红书、自定义链接 |
| SEO | 默认 SEO Title、默认 SEO Description、默认 OG Image |

---

# Part F　SEO / 数据库 / API

## F.1 SEO

博客需支持基础 SEO：Title、Description、Canonical、Open Graph、Twitter Card、Sitemap、Robots。

- **文章 SEO**：可独立设置 `seoTitle` / `seoDescription`；为空时分别回退为文章 `Title` / `Summary`
- **Sitemap**：`/sitemap.xml`，包含首页、Blog、Articles、Projects、About、Tags

## F.2 数据库设计

V1 核心数据表：`User`、`Session`、`Post`、`Tag`、`PostTag`、`Project`、`SiteSetting`、`SiteStats`

### F.2.1 枚举

```text
UserRole      = ADMIN
PostStatus    = PUBLISHED | ARCHIVED
ProjectStatus = ACTIVE | ARCHIVED | SOLD | BUILDING
```

### F.2.2 字段与约束

下表作为 Prisma Schema 的实现依据。除纯关联表 `PostTag` 外，业务表均包含 `createdAt` 与 `updatedAt`；时间统一以 UTC 写入数据库，在界面层按站点时区展示。

| 表 | 字段规格 | 约束与默认值 |
|---|---|---|
| **User** | `id Int`、`username VarChar(50)`、`passwordHash Text`、`role UserRole`、时间字段 | `id` 自增主键；`username` 唯一；`role = ADMIN`；V1 仅保留一个管理员账号 |
| **Session** | `id String`、`userId Int`、`csrfTokenHash String`、`expiresAt DateTime`、`createdAt DateTime`、`lastSeenAt DateTime` | `id` 为高熵随机值的哈希结果并作为主键；关联用户删除时级联删除；Session 原值只存于 Cookie，不写入数据库 |
| **Post** | `id Int`、`title VarChar(200)`、`summary VarChar(500)`、`contentMarkdown Text`、`coverImageUrl VarChar(2048)?`、`status PostStatus`、`seoTitle VarChar(200)?`、`seoDescription VarChar(500)?`、`publishedAt DateTime`、`viewCount Int`、时间字段 | `id` 自增主键；`status = PUBLISHED`；`viewCount = 0`；不设 slug；删除采用物理删除 |
| **Tag** | `id Int`、`name VarChar(50)`、`slug VarChar(60)`、时间字段 | `id` 自增主键；`name` 与 `slug` 分别唯一；slug 只允许小写字母、数字和连字符 |
| **PostTag** | `postId Int`、`tagId Int` | `(postId, tagId)` 联合主键；任一关联实体删除时级联删除关联记录 |
| **Project** | `id Int`、`name VarChar(100)`、`summary VarChar(500)`、`status ProjectStatus`、`websiteUrl VarChar(2048)?`、`githubUrl VarChar(2048)?`、`techStack String[]`、`sort Int`、时间字段 | `id` 自增主键；`status = ACTIVE`；`techStack = []`；`sort = 0`；`websiteUrl` 与 `githubUrl` 至少填写一个 |
| **SiteSetting** | `id Int`、`value Json`、时间字段 | 单行表，固定 `id = 1`；更新时整体校验 JSON Schema；不得存储密码、密钥等敏感信息 |
| **SiteStats** | `id Int`、`totalViews Int`、时间字段 | 单行表，固定 `id = 1`；`totalViews = 0`；使用数据库原子自增 |

索引要求：`Session(userId)`、`Session(expiresAt)`、`Post(status, publishedAt)`、`Post(updatedAt)`、`Post(viewCount)`、`Project(status, sort)`、`PostTag(tagId, postId)`。文章与标签列表默认只读取 `PUBLISHED` 文章；文章排序为 `publishedAt DESC, id DESC`，项目排序为 `sort ASC, id DESC`。

### F.2.3 删除与时间规则

- 删除文章执行物理删除，并级联删除对应 `PostTag`；删除前由后台二次确认。
- 删除标签执行物理删除，并级联删除对应 `PostTag`，不会删除文章。
- 删除项目执行物理删除。
- `publishedAt` 在文章首次保存并发布时写入；普通编辑、归档、重新发布均不改变它。
- 所有计数更新必须使用数据库原子自增，避免并发请求互相覆盖。

### F.2.4 SiteSetting JSON Schema

`SiteSetting.value` 使用固定结构；未填写的可选 URL 使用 `null`，列表使用空数组，不增加任意顶级字段。

```ts
interface SiteSettingValue {
  basic: {
    siteName: string
    siteDescription: string
    avatarUrl: string | null
    logoUrl: string | null
    personName: string
    bio: string
    currentStatus: string | null
    email: string | null
  }
  home: {
    techStack: Array<{ name: string; sort: number }>
    featuredProjectCount: number // 默认 3，范围 1～6
  }
  about: {
    contentMarkdown: string
  }
  socialLinks: Array<{
    type: 'github' | 'twitter' | 'linkedin' | 'juejin' | 'zhihu' | 'xiaohongshu' | 'custom'
    label: string
    url: string
    sort: number
  }>
  seo: {
    defaultTitle: string
    defaultDescription: string
    defaultOgImageUrl: string | null
  }
}
```

公开接口可返回以上全部字段，因为该结构只保存公开站点内容；后台保存时仍须按字段白名单和长度限制校验。

## F.3 API 设计

API 统一前缀 `/api`。后台管理接口前缀 `/api/admin`，需登录鉴权；前台公开接口无前缀区分、无需鉴权，仅返回 `status = PUBLISHED` 的数据。

### F.3.0 通用契约

- 请求与响应均使用 JSON，时间字段使用 ISO 8601 UTC 字符串。
- 单项成功响应：`{ "data": T }`。
- 列表成功响应：`{ "data": T[], "meta": { "page": 1, "pageSize": 10, "total": 0, "totalPages": 0 } }`。
- 错误响应：`{ "error": { "code": "VALIDATION_ERROR", "message": "可读错误信息", "fields": {} } }`；`fields` 仅在字段校验失败时返回。
- 分页参数：`page` 默认 `1`；`pageSize` 默认 `10`、最大 `50`；非正整数返回 `400`。
- 常用状态码：成功读取 `200`、创建 `201`、无响应体删除 `204`、参数错误 `400`、未登录 `401`、无权限 `403`、资源不存在 `404`、唯一约束冲突 `409`、限流 `429`、服务端错误 `500`。
- 所有输入在服务端校验并去除未知字段；ID 必须为正整数；URL 仅允许 `http:` 或 `https:`。

### F.3.1 前台公开接口（无鉴权）

供博客前台读取数据使用，对应 Part D 的各个前台页面。

| 模块 | 接口 | 说明 |
|---|---|---|
| Posts | `GET /api/posts` | 文章列表，支持 `?tag=` 按标签 slug 筛选、`?q=` 搜索标题/摘要/标签、`?page=` 与 `?pageSize=` 分页 |
| | `GET /api/posts/:id` | 文章详情；只返回已发布且存在的文章，读取操作本身不修改计数 |
| | `GET /api/posts/:id/related` | P1 规划：相关文章（同标签，见 Part D.4 排序规则），当前尚未实现 |
| Tags | `GET /api/tags` | 标签列表（含每个标签下的文章数） |
| | `GET /api/tags/:slug` | 指定标签下的文章列表 |
| Projects | `GET /api/projects` | 项目列表 |
| Settings | `GET /api/settings` | 站点公开设置（基础信息、社交链接、默认 SEO），对应 Part E.8，仅返回前台需要展示的字段，不含敏感配置 |
| Views | `POST /api/views` | 页面成功呈现后调用；请求体 `{ postId?: number }`，每次将 `SiteStats.totalViews + 1`，传入有效已发布文章时同时将对应 `Post.viewCount + 1`；不去重 |
| SEO | `GET /sitemap.xml` | 对应 Part F.1 |
| | `GET /robots.txt` | 对应 Part F.1 |

### F.3.2 后台管理接口（需鉴权）

| 模块 | 接口 |
|---|---|
| Auth | `POST /api/auth/login`　`POST /api/auth/logout`　`GET /api/auth/session` |
| Posts | `GET/POST /api/admin/posts`　`GET/PUT/DELETE /api/admin/posts/:id`（文章的所有状态变更，包括归档下线，统一走 `PUT`；`DELETE` 执行物理删除） |
| 标签 | `GET/POST /api/admin/tags`　`PUT/DELETE /api/admin/tags/:id` |
| Projects | `GET/POST /api/admin/projects`　`PUT/DELETE /api/admin/projects/:id` |
| Settings | `GET/PUT /api/admin/settings`（读取或整体更新 `SiteSetting.value`） |
| Analytics | `GET /api/admin/analytics/overview`（全站总访问量 + Top 5 文章，一个接口即可） |
| Health Check | `GET /api/health`（无鉴权，返回 200 即代表服务存活，供部署脚本探测使用） |

### F.3.3 写接口 DTO 与行为

#### 文章

`POST /api/admin/posts` 请求体：

```ts
interface CreatePostInput {
  title: string
  summary: string
  contentMarkdown: string
  coverImageUrl: string | null
  tagIds: number[]
  seoTitle: string | null
  seoDescription: string | null
}
```

创建成功即为 `PUBLISHED`，服务端写入 `publishedAt`，不存在草稿记录。`PUT /api/admin/posts/:id` 使用相同内容字段，并额外接收 `status: 'PUBLISHED' | 'ARCHIVED'`；采用完整更新语义，保存内容和标签关联放在同一数据库事务中。标题、摘要和正文去除首尾空白后不得为空，`tagIds` 去重且必须全部存在。

#### 标签

`POST /api/admin/tags` 与 `PUT /api/admin/tags/:id` 请求体：

```ts
interface SaveTagInput {
  name: string
  slug: string
}
```

`name` 与 `slug` 去除首尾空白；slug 转为小写后校验格式。名称或 slug 冲突返回 `409`。删除标签只删除标签及文章标签关联，不删除文章。

#### 项目

`POST /api/admin/projects` 与 `PUT /api/admin/projects/:id` 请求体：

```ts
interface SaveProjectInput {
  name: string
  summary: string
  status: 'ACTIVE' | 'ARCHIVED' | 'SOLD' | 'BUILDING'
  websiteUrl: string | null
  githubUrl: string | null
  techStack: string[]
  sort: number
}
```

`name`、`summary` 去除首尾空白后不得为空；技术栈去空、去重并保留输入顺序；两个地址至少填写一个。前台返回全部状态的项目，由状态决定展示徽标，不把 `ARCHIVED` 项目视为隐藏。

#### 网站设置

`PUT /api/admin/settings` 请求体为完整的 `SiteSettingValue`。服务端整体校验后通过固定 `id = 1` 执行 upsert；缺少必填分组或字段时返回 `400`，不得进行局部合并。

#### 访问计数

`POST /api/views` 请求体允许为空对象或 `{ "postId": 正整数 }`，成功返回 `204`。若提供的文章不存在或未发布，返回 `404` 且两个计数器均不增加；有效请求通过数据库事务原子更新全站和文章计数。调用失败不阻断页面主体展示。

---

# Part G　安全与部署

## G.1 安全要求

### G.1.1 密码与登录

- 密码使用 Argon2id 哈希，采用库的当前安全默认参数；数据库禁止保存明文密码。
- 登录失败统一返回“用户名或密码错误”，不得暴露用户名是否存在。
- 同一 IP 或同一用户名在 15 分钟内最多允许 10 次失败；超限返回 `429`。成功登录后清除对应失败记录。
- 登录限流 V1 可存于进程内存，服务重启后清空可以接受；日志不得记录密码。
- 管理员初始密码通过一次性初始化命令交互输入或安全环境变量创建，不得硬编码在 Seed、源码或 GitHub Actions 日志中。

### G.1.2 Session 与 Cookie

- Session 持久化到 PostgreSQL `Session` 表，有效期 7 天；过期记录可在登录、鉴权或定期维护时清理。
- 登录成功后必须创建新的高熵随机 Session ID，数据库只保存其 SHA-256 哈希，防止数据库泄漏后直接复用 Session。
- Cookie 名称为 `blog_session`，设置 `HttpOnly=true`、`SameSite=Lax`、`Path=/`；生产环境设置 `Secure=true`，本地 HTTP 开发环境可关闭 `Secure`。
- Cookie 的 `Max-Age` 与服务端 Session 到期时间保持一致。注销时删除数据库 Session，并清除 Cookie；修改管理员密码后使该用户的全部旧 Session 失效。
- 不在 LocalStorage、SessionStorage 或可被前端 JavaScript 读取的 Cookie 中保存 Session ID。

### G.1.3 页面与 API 鉴权

- `/admin/login` 允许匿名访问；其他 `/admin/**` 页面必须登录，匿名访问时跳转到登录页。
- 已登录管理员访问 `/admin/login` 时跳转到 `/admin`。
- 所有 `/api/admin/**` 必须在服务端验证 Session 与管理员身份，不能只依赖客户端路由守卫或隐藏按钮。
- 未登录或 Session 失效返回 `401`；已登录但权限不足返回 `403`。V1 仅有 `ADMIN`，不实现 RBAC。

### G.1.4 CSRF

- 所有使用 Cookie 鉴权的 `POST`、`PUT`、`PATCH`、`DELETE` 后台请求必须同时校验 `Origin` 和 CSRF Token。
- 登录成功时为 Session 生成独立 CSRF Token；数据库保存其哈希，前端通过受保护的 Session 接口取得原值，并在写请求的 `X-CSRF-Token` 请求头中提交。
- Token 缺失、不匹配或 `Origin` 不属于 `NUXT_PUBLIC_SITE_URL` 时返回 `403`。
- `GET`、`HEAD` 接口不得修改业务数据。无需管理员身份的 `POST /api/views` 不要求 CSRF Token。

### G.1.5 输入验证与错误处理

- 所有 API 使用共享的 Zod Schema 在服务端验证类型、长度、必填项、枚举、数组、ID 和 URL；前端验证只用于改善体验。
- 去除请求中的未知字段；ID 必须为正整数；普通外链只允许 `http:` 或 `https:`，Email 单独按邮箱格式校验。
- 生产环境错误响应不得包含堆栈、SQL、数据库连接信息、服务器文件路径或内部实现细节。
- 日志不得记录密码、Cookie、Session ID、CSRF Token、`DATABASE_URL` 或 `SESSION_SECRET`。

### G.1.6 Markdown 与 XSS

- V1 禁止 Markdown 原始 HTML，不支持 `script`、`iframe`、`style`、事件属性或任意嵌入代码。
- Markdown 链接允许 `http:`、`https:`、`mailto:`；图片只允许 `http:`、`https:`；禁止 `javascript:`、`data:`、`vbscript:` 等危险协议。
- markdown-it 禁用 HTML 选项；渲染后的 HTML 再经过服务端白名单清洗后才允许输出。
- 前台正文与后台预览使用同一套 Markdown 配置和清洗规则；不得直接把未经清洗的字符串传入 `v-html`。
- 外部链接添加 `rel="noopener noreferrer"`；在新标签页打开时必须同时设置该属性。

### G.1.7 安全响应头与传输

- 生产环境强制 HTTPS，HTTP 与 `www` 均 301 重定向到规范地址 `https://carreyda.com`。HSTS 待完成证书续期自动化并稳定运行后启用。
- 配置 Content Security Policy，至少限制 `default-src 'self'`、禁止对象嵌入、禁止被其他站点 iframe；按实际字体、图片和样式来源添加最小白名单。
- 设置 `X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy` 和 `frame-ancestors 'none'`。
- PostgreSQL 与 Nuxt 3000 端口不暴露公网；Nginx 正确覆盖可信代理头，不信任客户端直接传入的伪造转发头。

### G.1.8 安全验收标准

- 匿名用户无法读取或修改后台数据；篡改、过期或注销后的 Session 均无效。
- 缺失或伪造 CSRF Token、来源不合法的后台写请求返回 `403`。
- 连续错误登录达到阈值后返回 `429`，且错误信息不泄露账号是否存在。
- Markdown 中的原始 HTML、脚本和危险 URL 无法执行；前台与预览结果一致。
- 非法 ID、枚举、URL、超长字段及未知字段被服务端拒绝。
- 生产 Cookie 包含 `HttpOnly`、`Secure`、`SameSite=Lax`，敏感信息不会出现在响应或日志中。

## G.2 部署架构

生产服务器：Tencent Cloud CVM，Ubuntu Server 24.04 LTS。服务器运行 Nginx 1.24、Node.js 22、PM2、PostgreSQL 16、Nuxt 和 Git。

**PM2 运行模式**：V1 使用 **Fork 单实例**（非 Cluster 多进程）。个人博客流量不大，单实例足够。Session 持久化到 PostgreSQL，因此部署、PM2 重启或服务器重启不会导致管理员被强制退出；V1 不引入 Redis。

网络路径：

```text
Internet → Nginx :443 → Nuxt :3000
```

Nuxt 3000 端口不暴露公网。

## G.3 HTTPS

生产环境使用腾讯云签发的 TrustAsia DV TLS 证书，证书同时覆盖 `carreyda.com` 与 `www.carreyda.com`，安装在 Nginx。HTTP 和 `www` 统一 301 跳转到 `https://carreyda.com`。

腾讯云控制台的自动续费不等同于 CVM 上证书文件自动替换。当前证书到期时间为 **2026-10-03**；续签后必须重新下载、核对并替换 Nginx 中的证书与私钥，再执行配置检查和 reload。后续可改为 Certbot 自动续签，或完善腾讯云证书自动部署。

## G.4 GitHub CI/CD

代码推送 `git push origin main` 触发 GitHub Actions，Pipeline：

```text
Checkout → 配置 SSH → rsync 上传源代码 → Install Dependencies
→ Prisma Migrate Deploy → Build → PM2 Start/Reload → Health Check
```

**GitHub Secrets**（敏感信息不写入代码仓库）：`SERVER_HOST`、`SERVER_USER`、`SERVER_SSH_KEY`、`SERVER_KNOWN_HOSTS`

**环境变量**（`.env` 禁止上传）：

```env
DATABASE_URL=
SESSION_SECRET=
NUXT_PUBLIC_SITE_URL=
```

## G.5 部署安全

服务器建议：SSH Key 登录、禁止 Root 远程登录、关闭密码 SSH、UFW 防火墙。公网仅开放端口：`22`、`80`、`443`。

---

# Part H　代码目录结构

```text
blog/
│
├── app/
│   ├── assets/
│   ├── components/
│   │   ├── blog/
│   │   └── admin/
│   │
│   ├── composables/
│   │
│   ├── layouts/
│   │   ├── default.vue
│   │   └── admin.vue
│   │
│   ├── middleware/
│   │
│   └── pages/
│       ├── index.vue
│       │
│       ├── blog/
│       │   ├── index.vue
│       │   └── [id].vue
│       │
│       ├── tags/
│       ├── projects/
│       ├── about.vue
│       │
│       └── admin/
│           ├── login.vue
│           ├── index.vue
│           │
│           ├── posts/
│           ├── tags/
│           ├── projects/
│           ├── analytics/
│           └── settings/
│
├── server/
│   ├── api/
│   ├── middleware/
│   ├── services/
│   └── utils/
│
├── prisma/
│   └── schema.prisma
│
├── public/
│
├── nuxt.config.ts
├── package.json
└── .env
```

---

# Part I　非功能需求

| 类别 | 要求 |
|---|---|
| 性能 | 首页首屏快速加载、文章页面快速加载、避免不必要客户端 JS；合理利用 SSR / Server Rendering / Lazy Load / Cache（具体方案在开发阶段确定） |
| 响应式 | 至少支持 Desktop / Tablet / Mobile |
| 浏览器 | 主要支持 Chrome / Edge / Safari / Firefox 现代版本 |

---

# Part J　范围边界

## J.1 V1 明确不开发

媒体库、图片上传、完整 CMS 用户系统、用户注册、多作者、RBAC、会员系统、站内私信、点赞、收藏、复杂评论系统、复杂运营系统、邮件营销、原生 App、`.md` 文件上传。

## J.2 评论功能

V1 暂不作为核心需求。后续如需要，推荐考虑 **Giscus + GitHub Discussions**，避免自行开发评论用户系统。

## J.3 V1 核心开发闭环

项目第一阶段必须优先跑通以下链路，跑通即代表博客核心系统成立：

```text
管理员登录 → 创建文章 → Markdown 编辑 → 手动保存并发布
　→ PostgreSQL → 博客文章列表出现 → 进入文章详情 → 正确渲染 Markdown
```

---

# Part K　优先级、路线图与验收标准

> 原文档中「开发优先级（P0/P1/P2）」「开发阶段（Phase 1-8）」「V1 验收标准」三部分内容重叠但相互独立列出，容易在排期时对不上号。以下按 Phase 顺序合并为一张表，同时标注优先级与对应验收标准。

| Phase | 交付内容 | 优先级 | 当前状态 | 对应验收标准 |
|---|---|---|---|---|
| **Phase 1**　基础架构 | Nuxt 4 / TypeScript / PostgreSQL / Prisma 初始化、项目目录、Environment、基础 UI | P0 | ✅ 已完成 | 生产构建通过，数据库迁移可部署 |
| **Phase 2**　认证 | 后台登录、Session、路由保护、API 权限 | P0 | ✅ 已完成 | 可正常登录；未登录用户无法访问后台 |
| **Phase 3**　文章核心 | 文章 CRUD、Vditor、Markdown Storage、手动保存并发布 | P0 | ✅ 已完成 | 可新建、编辑、归档、重新发布和物理删除；无草稿和自动保存 |
| **Phase 4**　博客前台 | 公开 API、首页、Blog 列表、文章详情、Tags、Projects、About | P0 | ✅ 已完成 | Markdown 安全渲染、代码高亮、TOC、图片 URL、分页和移动端布局正常 |
| **Phase 5**　后台管理 | Dashboard、标签管理、项目管理、网站设置 | P0 + P1 | ✅ 已完成 | 可管理文章、标签、项目和站点设置；Dashboard 可读取核心数据 |
| **Phase 6**　统计 | `Post.viewCount`、`SiteStats.totalViews`、Dashboard 总访问量与 Top 5 | P1 | ✅ 已完成 | 原子自增生效，可查看全站总访问量与热门文章 |
| **Phase 7**　SEO | Meta / Open Graph、Sitemap、Robots | P0 + P1 | 🟡 基础完成 | 页面 Meta、文章独立 SEO、sitemap.xml、robots.txt 已完成；Canonical/Twitter Card 仍需专项验收与补齐 |
| **Phase 8**　部署 | Tencent Cloud、Nginx、HTTPS、PM2、GitHub Actions、Health Check | P0 | ✅ 已完成 | `https://carreyda.com` 正常；Push main 自动部署；数据库和公网健康检查通过 |

**跨阶段 P1 增强项**：文章搜索和系统深浅色适配已完成；手动主题切换、上一篇 / 下一篇、相关文章、阅读进度待实现。

**P2 未来扩展**（不纳入 V1 路线图，仅作为后续参考）：Category 分类体系、定时发布、文章版本历史、Mermaid、LaTeX、评论、AI 写作辅助、全文搜索、带趋势图的高级统计、复杂缓存、Webhook、API Token

---

# Part L　后续规划

V1 完成后可以逐步增加：Category 分类体系、定时发布、文章版本历史、AI 内容摘要、AI 标题优化、AI SEO Description、AI 标签推荐、全文搜索、文章评论、阅读历史、文章推荐算法、Mermaid、LaTeX、带趋势图的高级统计、博客数据年度报告。

---

# Part M　当前实现状态与已知差异

## M.1 生产状态（截至 2026-08-29）

| 项目 | 当前状态 |
|---|---|
| 正式地址 | `https://carreyda.com` |
| 规范域名 | `carreyda.com`；HTTP 与 `www` 自动 301 跳转 |
| 云服务器 | Tencent Cloud CVM / Ubuntu Server 24.04 LTS |
| 数据库 | 服务器本地 PostgreSQL 16，应用使用独立低权限角色与 `blog_prod` 数据库 |
| 应用进程 | PM2 Fork 单实例，由 `pm2-ubuntu` systemd 服务开机恢复 |
| Web 入口 | Nginx 反向代理至 `127.0.0.1:3000` |
| HTTPS | 腾讯云 TrustAsia DV TLS 证书，覆盖根域名与 `www` |
| 自动部署 | Push `main` 触发 GitHub Actions；上传、迁移、构建、重载和健康检查自动完成 |
| 健康检查 | `/api/health` 返回应用状态与数据库连接状态 |
| 部署文档 | 根目录 `DEPLOYMENT.md` |

## M.2 已确认且不得回退的产品决策

1. 不提供自动保存。
2. 不提供草稿状态；新建保存即发布。
3. 文章、标签和项目删除采用物理删除，不设计恢复站。
4. 文章正文以 Markdown 原文存入 PostgreSQL，不生成 `.md` 内容文件。
5. 项目只有外链卡片，不提供站内项目详情、Slug 或详细描述。
6. 图片使用外部 URL；V1 不做媒体库和对象存储上传。
7. 浏览量采用简单计数，接受刷新、机器人和重复访问，不做访客去重。
8. 主题主色保持 `#4493f8`。
9. 不使用需要联网获取的第三方字体，优先使用系统字体栈。

## M.3 已实现但与原始设想有所调整

- 深浅色当前通过 `prefers-color-scheme` 自动跟随系统，并非完整的三态手动切换器。
- 文章详情已实现服务端 Markdown 渲染、白名单清洗、Shiki 高亮、代码复制和 TOC；上一篇、下一篇、相关文章、阅读进度尚未实现。
- 生产 HTTPS 使用腾讯云证书，而不是最初设想的 Let's Encrypt。
- GitHub Actions 在服务器端完成依赖安装和构建，不上传本地 `.output`、`.env` 或 `node_modules`。
- 项目生产域名已经确定为 `carreyda.com`，不再属于待定项。

## M.4 下一迭代建议顺序

| 顺序 | 工作项 | 原因 |
|---|---|---|
| 1 | 证书续期部署自动化与到期监控 | 当前证书 2026-10-03 到期，属于上线可靠性事项 |
| 2 | Canonical、Twitter Card 与结构化数据专项检查 | 完成 SEO 闭环并避免重复域名收录 |
| 3 | 数据库定时备份、异地保存与恢复演练 | 文章仅存于 PostgreSQL，备份属于核心数据安全能力 |
| 4 | 上一篇 / 下一篇、相关文章 | 提升文章间导航和内容发现能力 |
| 5 | 阅读进度与三态主题切换 | 改善长文阅读体验和个性化体验 |
| 6 | 自动化测试与部署后冒烟测试扩充 | 降低后续持续迭代的回归风险 |

---

## 当前最终方案

```text
Nuxt 4 + TypeScript + Vue 3 + Nuxt Nitro + Nuxt UI + PostgreSQL + Prisma
+ Vditor + Markdown + markdown-it + Shiki
+ Nginx + PM2 + GitHub Actions + Tencent Cloud CVM + 腾讯云 TLS 证书
```

内容管理原则：**代码归 GitHub，内容归 PostgreSQL，文章以 Markdown 为标准格式。**

> 项目定位：一个拥有极简开发者个人主页、Markdown 技术博客、个人 CMS 管理后台以及数据统计能力的全栈个人博客系统。
