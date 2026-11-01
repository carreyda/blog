# 腾讯云 COS 图片上传接入指南（分步对照）

> 版本：v2（2026-11-01）
> 适用仓库：`D:\Github\blog`（Nuxt 4 + Nitro + Prisma + PostgreSQL）
> 当前进度：**代码接入与本地联调已完成**——真实 COS 上传 / 历史列表 / 裁剪 / 删除全部验证通过，`pnpm typecheck`、`pnpm build` 均通过。剩余：服务器 `.env` 配置与上线（Step 9），以及你按 Step 8 清单在生产环境做一次人工验证。
>
> **协作方式**：你在腾讯云控制台按步骤操作并截图 → 我逐张核对、勾选 → 进入下一步；我同时在代码侧完成接入。每一步都写明「你要做什么」「请截什么图」「我核对什么」，按顺序来即可。

---

## 0. 总览

### 0.1 接入后的目标

1. 管理后台「图片上传」页上传真实图片，存进腾讯云 COS 存储桶。
2. 图片列表来自数据库（持久化），刷新、换设备都能看到历史图片。
3. 裁剪结果直接上传 COS，生成公网可访问 URL。
4. 复制链接后可直接用在文章、封面、站外（图片库不局限于博客）。
5. 后续可无缝复用给编辑器插图、文章封面上传。

### 0.2 架构

```
浏览器（/admin/media）
   │  1) 选图 / 裁剪（前端生成 PNG）
   ▼
Nuxt Nitro  POST /api/admin/uploads        （管理员会话 + CSRF 校验）
   │  2) 校验魔数（PNG/JPEG/WebP/GIF/AVIF）+ 大小限制
   │  3) cos-nodejs-sdk-v5 PutObject
   ▼
腾讯云 COS 桶：carreyda-1301428252 / images/YYYY/MM/<uuid>.<ext>
   │
   ├── 4) 写入 Prisma`MediaAsset` 元数据（尺寸、大小、URL……）
   └── 5) 返回 https://<bucket>.cos.<region>.myqcloud.com/images/...

后台列表 GET /api/admin/media ← 读 MediaAsset（分页 / 搜索 / 筛选）
后台删除 DELETE /api/admin/media/:id → 删 COS 对象 + 删数据库记录
```

### 0.3 分工一览

| 角色 | 负责内容 |
| --- | --- |
| **你（腾讯云控制台）** | 开通 COS、建桶、配权限、建子账号与密钥、记录域名、配置服务器 `.env`、按清单截图验证 |
| **我（代码仓库）** | 接入 SDK、上传/列表/删除接口、数据库表与迁移、前端换真实接口、nginx 配置、部署文档更新、本地联调 |
| **共同** | 端到端验证（你截后台页面截图，我查接口/对象/数据库） |

### 0.4 截图规范（重要）

- 每张截图只截**浏览器内容区**，保留地址栏/页面标题有助于我判断走到哪一步。
- **必须打码**：`SecretId`、`SecretKey`、API 密钥二维码、服务器密码。打码后保留**末 4 位**便于后面对照即可。
- 不要在任何截图/聊天中发送完整 `SecretKey`；文档和代码里也不要出现。
- 建议按附录 B 的文件名命名后直接贴到对话里。

### 0.5 总进度

- [x] Step 1 开通 COS 与实名认证（2026-11-01 已核对：COS 概览页正常，用量 0 B，服务已开通）
- [x] Step 2 创建存储桶（2026-11-01 已核对：`carreyda-1301428252` / 上海 ap-shanghai / 单 AZ / 公有读私有写）
- [x] Step 3 配置桶权限（2026-11-01 已核对：公有读私有写；防盗链 Step 9 再定）
- [x] Step 4 创建 CAM 子账号、最小权限策略、API 密钥（2026-11-01 已完成：`blog-cos-uploader` + `blog-cos-image-upload`，编程访问密钥已生成）
- [x] Step 5 记录访问域名与参数回填（默认域名已确认，见下表）
- [x] Step 6 配置本地 / 服务器环境变量（本地 `.env` 已完成；服务器待 Step 9）
- [x] Step 7 代码接入（我负责，已完成，见 §7）
- [x] Step 8 端到端联调验证（本地自动化已通过，见 §8.4；生产人工验证待上线后）
- [x] 文章编辑器 / 封面上传接入（2026-11-01 完成，复用 `/api/admin/uploads`，见 §7.7）
- [ ] Step 9 上线、安全加固与成本告警

---

## 1. 接入前后对比

| 能力 | 当前（静态页面） | 接入 COS 后 | 涉及位置 |
| --- | --- | --- | --- |
| 上传 | 浏览器本地 `objectURL`，刷新即失 | 上传到 COS，持久化 | `AdminImageUploader.client.vue` + `POST /api/admin/uploads` |
| 历史列表 | 18 条示例数据（内联 SVG） | 数据库 + COS 真实图片 | `useAdminMedia.ts` + `GET /api/admin/media` |
| 裁剪 | 结果只在内存 | 裁剪后直接上传，生成新图 | `AdminImageCropper.client.vue` + 上传接口 |
| 图片链接 | 示例 URL | 真实 COS 公网 URL，可复制 | 预览弹窗「复制链接」 |
| 删除 | 仅本地移除 | 删 COS 对象 + 删记录 | `DELETE /api/admin/media/:id` |
| 重命名 | 无 | 只改显示名称，COS 地址不变 | `PATCH /api/admin/media/:id` |
| 跨设备/刷新 | 不支持 | 支持 | 数据库（Neon 无关，已用 PostgreSQL） |
| 编辑器/封面 | 无（手填 URL / 弹窗输入） | 已接入：编辑器工具栏上传、粘贴/拖拽、封面上传，复用本模块接口 | `AdminPostForm.vue`、`MarkdownEditor.client.vue` |

---

## 2. 双视角步骤总表

| 步骤 | 你在腾讯云后台做什么 | 我在这边做什么 | 阶段产物 / 截图 |
| --- | --- | --- | --- |
| 1 | 开通 COS（实名认证） | 检查依赖与代码准备 | COS 控制台概览截图 |
| 2 | 创建存储桶（公有读私有写） | 写存储工具与上传接口骨架 | 建桶成功页 + 桶列表截图 |
| 3 | 确认桶权限；防盗链暂缓 | 上传接口错误码与权限对应 | 权限管理页截图 |
| 4 | CAM 子账号 + 自定义策略 + API 密钥 | 服务端读取 `NUXT_COS_*` | 子账号、策略、密钥（打码）截图 |
| 5 | 记录默认访问域名 | 拼 URL 逻辑、`COS_PUBLIC_BASE_URL` 设计 | 桶概览「访问域名」截图 + 参数回填表 |
| 6 | 本地与服务器 `.env` 增加变量 | runtimeConfig + 部署文档更新 | `.env` 变量名截图（值打码） |
| 7 | （等待） | 全部代码 + 数据库迁移 + nginx | 我给出文件清单与自测结果 |
| 8 | 后台页面操作并截图；COS 对象列表截图 | 本地跑无头浏览器验证接口 | 上传/预览/打开 URL/删除截图 |
| 9 | 上线后复查 + 费用告警 | 部署与安全清单 | 告警配置截图 |

---

## 3. 分步操作

### Step 1 开通 COS 与实名认证

**控制台**：<https://console.cloud.tencent.com/cos>

1. 登录腾讯云账号（建议用你部署博客的同一账号）。
2. 完成实名认证：账号信息 → 实名认证（个人/企业）。**未实名无法创建存储桶。**
3. 打开 COS 控制台，进入「存储桶列表」页；首次开通会提示开通服务，点「开通」。
4. 开通后页面可看到存储桶列表（现在为空即可）。

**请截图**

- 图 1：COS 控制台「存储桶列表」页面（含左侧菜单「存储桶列表」、顶部账号信息）。

**我核对什么**

- 页面是 COS 产品页、能进入存储桶列表、非「未开通」状态。

**常见问题**

- 提示未实名：先去账号中心完成实名。
- 阅读《服务协议》后需要点开通，不是自动开通。

**验证记录**

- ✅ 2026-11-01：截图显示 COS「概览」页可正常进入，「开始使用 COS」与创建存储桶入口可见；用量概览 0 B、本月总流量 0 B、总请求 0 次、计费详情暂无数据。说明服务已开通、尚未产生用量与费用。
- 未购买资源包，默认按量后付费即可，本阶段无需购买。

---

### Step 2 创建存储桶

**控制台**：存储桶列表 → 创建存储桶（<https://console.cloud.tencent.com/cos/bucket?action=create>）

按下表填参数：

| 参数 | 建议值（本次实际） | 说明 |
| --- | --- | --- |
| 存储桶名称（前缀） | `carreyda` | 控制台自动拼接 APPID，最终为 `carreyda-1301428252`；全局唯一，若提示占用换前缀 |
| 所属地域 | 中国-上海（`ap-shanghai`） | 建桶后不可改；与生产服务器同地域可降低服务端上传延迟，未来还能走内网 |
| 数据冗余策略 | **单 AZ 存储**（务必确认） | 多 AZ 存储容量费用更高，且**创建后无法关闭**；个人博客图片可随时重传，单 AZ 足够 |
| 访问权限 | **公有读私有写** | 图片需被匿名访客加载；写入仅服务端密钥；不要选「公有读写」 |
| 版本控制 | 关闭 | 博客图片不需要历史版本 |
| 日志管理 | 关闭（上线稳定后再开） | 先保持简单 |
| 服务端加密 | 不加密 | SSE-COS 暂不需要 |
| 极智压缩（数据万象） | 暂不开启 | 需要开通数据万象，后续可选 |
| 内容安全（数据万象） | 暂不开启 | 个人图片库暂不需要 |
| 默认告警 | 保持开启 | 外网下行流量超过 5000MB/分钟时告警，免费 |
| 存储桶标签 | 可选 `project=blog` | 便于费用归属 |

**请截图**

- 图 2a：创建完成后的「创建成功」页（能看到桶名、地域）。
- 图 2b：存储桶列表页（能看到桶名、地域、访问权限列）。

**我核对什么**

- 桶名为 `carreyda-1301428252`，地域为上海（ap-shanghai），访问权限「公有读私有写」，冗余策略为单 AZ。

**常见问题**

- 桶名后缀不是自己填的：COS 桶名规则是「名称-APPID」，填前缀即可。
- 地域选错只能删桶重建（桶内没数据时影响小，但域名会变，建议一次选对）。
- **数据冗余策略容易被忽略**：控制台可能默认「多 AZ」，创建后无法改成单 AZ，费用更高；建桶前确认选中「单 AZ 存储」。

**验证记录**

- ✅ 2026-11-01 21:02 创建成功：桶 `carreyda-1301428252`，地域上海（`ap-shanghai`），访问权限「公有读私有写」，创建时间 2026-11-01 21:02:27，初始用量 0。
- 默认访问域名：`https://carreyda-1301428252.cos.ap-shanghai.myqcloud.com`（支持 HTTPS）。数据冗余按单 AZ 创建。

---

### Step 3 确认桶权限（防盗链 Step 9 再开）

**控制台**：存储桶 → 权限管理 → 存储桶访问权限

1. 确认访问权限为 **公有读私有写**。
2. **防盗链本次先不开启**。原因：本地 `/admin/media` 页面来自 `http://localhost:3000`，开启防盗链后需同时放行空 Referer 与 localhost，否则后台缩略图会 403；防盗链属于上线后的加固项，Step 9 再统一配置。

**请截图**

- 图 3：桶「权限管理」页面（显示访问权限：公有读私有写）。

**我核对什么**

- 权限不是「私有读写」（否则图片 URL 打不开），也不是「公有读写」。

**说明（无需操作）**

- 因为上传走**服务端代理**（浏览器 → Nitro → COS），**不需要配置 COS 跨域 CORS**。只有以后改成「浏览器直传（STS 临时密钥）」时才需要 CORS。
- 站点 Markdown 渲染会给图片加 `referrerpolicy="no-referrer"`，所以若以后开启防盗链，务必勾选「允许空 Referer」，否则文章图片会 403。

**验证记录**

- ✅ 2026-11-01：权限管理 → 存储桶访问权限 =「公有读私有写」；用户权限仅主账号（100013202046）完全控制；桶 Policy 为空、关联 CAM 策略为空——均正常，子账号权限将在 Step 4 通过 CAM 策略授予。

---

### Step 4 创建 CAM 子账号、最小权限策略与 API 密钥

**目的**：服务端只拿到「只能往指定目录上传文件」的密钥；即使泄露，影响面也最小。

**控制台**：访问管理 CAM <https://console.cloud.tencent.com/cam>

#### 4.1 先建自定义策略（最小权限）

路径：CAM → 策略 → 新建自定义策略 → **按策略语法创建**

在「选择策略模板」步骤选择 **空白模板** → 下一步 → 填写策略名称 `blog-cos-image-upload`，粘贴下面的 JSON → 完成。

把下面 JSON 里的 `<APPID>` 替换成你的 APPID（10 位数字，本次是 `1301428252`；下面已按实际桶填好，可直接复制）：

```json
{
  "version": "2.0",
  "statement": [
    {
      "effect": "allow",
      "action": [
        "name/cos:PutObject",
        "name/cos:DeleteObject",
        "name/cos:HeadObject"
      ],
      "resource": [
        "qcs::cos:ap-shanghai:uid/1301428252:carreyda-1301428252/images/*"
      ]
    }
  ]
}
```

说明：

- `PutObject`：上传图片（必需）。
- `DeleteObject`：后台删除图片时需要（图片库已有删除功能）。
- `HeadObject`：上传后校验对象是否存在（可选但建议保留）。
- `images/*`：只允许操作桶里的 `images/` 前缀，其他目录一概无权。
- 不需要 `GetBucket`（列表数据来自数据库，不扫桶）；如果以后要直接“从 COS 列对象”，再补 `name/cos:GetBucket`。

#### 4.2 新建子用户

路径：CAM → 用户 → 用户列表 → 新建用户

| 项 | 值 |
| --- | --- |
| 用户类型 | 自定义创建 |
| 访问方式 | **仅编程访问**（不要勾选控制台登录） |
| 用户名 | `blog-cos-uploader` |
| 权限 | 关联上面创建的 `blog-cos-image-upload` 自定义策略 |

#### 4.3 创建 API 密钥

路径：CAM → 用户 → `blog-cos-uploader` → API 密钥 → 新建密钥

- 生成 `SecretId` 与 `SecretKey`。
- **SecretKey 只在创建时完整显示一次**，立刻存进密码管理器；后面我会用「环境变量」方式使用，不需要你发给我。
- 记录 `SecretId` 和 `SecretKey` 的最后 4 位，供后面打码截图对照。

**请截图**

- 图 4a：CAM 用户列表（可见 `blog-cos-uploader`，可打码账号 ID）。
- 图 4b：`blog-cos-uploader` 详情页 → 权限 → 显示已关联 `blog-cos-image-upload` 策略。
- 图 4c：自定义策略详情页（能看到上面的 JSON，resource 中桶名 `carreyda-1301428252`、地域 `ap-shanghai` 与实际一致）。
- 图 4d：API 密钥列表（**SecretId / SecretKey 必须打码**，只留末 4 位）。

**我核对什么**

- 用户为编程访问；策略 resource 的地域与桶名和 Step 2 一致；密钥归属该子用户而不是主账号。

**常见问题**

- 403 AccessDenied：策略 resource 前缀和实际桶名不一致，或没关联到用户。
- 不要把主账号密钥用在生产。

---

### Step 5 记录访问域名（并回填参数）

**控制台**：存储桶 → 概览（或「域名管理」）

1. 找到 **默认访问域名**，本次为：

   ```text
   https://carreyda-1301428252.cos.ap-shanghai.myqcloud.com
   ```

2. 本次先**不使用 CDN 自定义域名**。后续可选方案：绑定 `img.carreyda.com` + 开启 CDN，届时只需把 `NUXT_COS_PUBLIC_BASE_URL` 换成该域名，代码无需改。

**请截图**

- 图 5：桶概览页的「访问域名」区域（含地域信息）。

**参数回填表**（填好发我，便于我按实际值写默认配置；密钥不要贴）

| 参数 | 示例 | 你的值 |
| --- | --- | --- |
| APPID | `1250000000` | `1301428252` |
| 存储桶名 | `blog-media-1250000000` | `carreyda-1301428252` |
| 地域 | `ap-guangzhou` | `ap-shanghai`（上海） |
| 默认访问域名 | `https://blog-media-1250000000.cos.ap-guangzhou.myqcloud.com` | `https://carreyda-1301428252.cos.ap-shanghai.myqcloud.com` |
| SecretId 末 4 位 | — | `kmfO` |
| 策略名 | `blog-cos-image-upload` | `blog-cos-image-upload` |
| 子账号名 | `blog-cos-uploader` | `blog-cos-uploader` |

---

### Step 6 配置环境变量（本地 + 服务器）

上传接口采用 **运行时读取环境变量** 的方式（不把密钥打进前端/构建产物），变量统一为下面 5 个：

| 变量 | 值 | 说明 |
| --- | --- | --- |
| `NUXT_COS_SECRET_ID` | 子账号 SecretId | 仅服务端可用 |
| `NUXT_COS_SECRET_KEY` | 子账号 SecretKey | 仅服务端可用 |
| `NUXT_COS_BUCKET` | `carreyda-1301428252` | 桶名 |
| `NUXT_COS_REGION` | `ap-shanghai` | 桶地域 |
| `NUXT_COS_PUBLIC_BASE_URL` | `https://carreyda-1301428252.cos.ap-shanghai.myqcloud.com` | 可选；留空时代码自动用默认域名拼 |

#### 6.1 本地开发环境

项目根目录 `.env`（已被 gitignore，**不要提交**）追加：

```dotenv
NUXT_COS_SECRET_ID="AKIDxxxxxxxxxxxxxxxx"
NUXT_COS_SECRET_KEY="xxxxxxxxxxxxxxxxxxxxxxxx"
NUXT_COS_BUCKET="carreyda-1301428252"
NUXT_COS_REGION="ap-shanghai"
NUXT_COS_PUBLIC_BASE_URL="https://carreyda-1301428252.cos.ap-shanghai.myqcloud.com"
```

> ✅ 2026-11-01 已完成：本地 `.env` 已追加上面 5 个变量（原有 3 个变量保持不变），并用临时脚本实测 `PutObject` / `HeadObject` / `DeleteObject` 均成功。密钥未写入文档，也未提交到 Git。

保存后重启 `pnpm dev`（环境变量在启动时读取）。

#### 6.2 生产服务器

```bash
cd /var/www/personal-blog   # 以实际部署目录为准
# 用编辑器把上面 5 行加到 .env 末尾，保持 chmod 600
chmod 600 .env
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 logs personal-blog --lines 30 --nostream
```

说明：

- 部署 workflow 用 rsync 同步代码，但**不会覆盖服务器 `.env`**，所以变量需要手动维护。
- 代码设计为「构建期不需要密钥」，因此 GitHub Actions 的 Secrets 里不需要放 COS 密钥。
- 上线顺序：先配好服务器 `.env`，再合并代码触发部署，最后 `pm2 startOrReload ... --update-env` 让新变量生效。

**请截图**

- 图 6：本地 `.env` 增加后的**变量名**（值全部打码），或服务器 `grep -E '^NUXT_COS_[A-Z_]+=' .env | cut -d= -f1` 的输出。

**我核对什么**

- 5 个变量名齐全、拼写一致（`NUXT_COS_` 前缀）、`.env` 权限 600。

---

### Step 7 代码接入（我负责，可不等待）

> ✅ 2026-11-01 **已完成**。本节保留最初的执行清单，并在 §7.2–§7.5 补充了实际实现与草稿的差异。

#### 7.1 已完成的静态基础

- 后台入口：`/admin/media`，侧栏「站点 → 图片上传」。
- 交互：搜索/筛选/排序/分页/多选删除/拖拽上传/上传弹窗/裁剪弹窗/预览/复制链接/下载。
- 当前数据为种子 mock，上传与裁剪结果仅存在浏览器内存。
- ✅ 本阶段已切换为真实接口：种子 mock 已移除，列表来自 `MediaAsset` 表，上传/裁剪/删除均落库并同步 COS。

#### 7.2 本次要实现的代码清单

| 文件 | 作用 | 状态 |
| --- | --- | --- |
| `package.json` | 新增 `cos-nodejs-sdk-v5`、`image-size` 依赖（锁文件一并提交） | ✅ 已完成 |
| `nuxt.config.ts` | `runtimeConfig.cos` 空默认值，运行时由 `NUXT_COS_*` 覆盖 | ✅ 已完成 |
| `server/utils/cos-storage.ts` | COS 单例、图片魔数校验、`putObject`、key 规则、URL 拼接、删除、读取 | ✅ 已完成 |
| `server/utils/media.ts` | `MediaAsset` 序列化（select + `serializeMediaAsset`）；`sanitizeMediaName` 名称清洗 | ✅ 已完成 |
| `server/api/admin/uploads/index.post.ts` | 多文件上传接口（503 未配置 / 魔数校验 / 失败回滚） | ✅ 已完成 |
| `prisma/schema.prisma` | 新增 `MediaFormat` 枚举 + `MediaAsset` 模型 + 迁移 | ✅ 已完成 |
| `server/api/admin/media/index.get.ts` | 历史列表（分页 / 搜索 / 格式筛选 / 排序 / `totalBytes`） | ✅ 已完成 |
| `server/api/admin/media/[id].delete.ts` | 删除记录 + 删除 COS 对象（COS 失败返回 502） | ✅ 已完成 |
| `server/api/admin/media/[id].patch.ts` | 重命名图片（只改显示名称，COS 对象与 URL 不变） | ✅ 已完成 |
| `server/api/admin/media/[id]/file.get.ts` | 同源代理原图（裁剪画布用，避免跨域污染 canvas） | ✅ 已完成 |
| `app/composables/useAdminMedia.ts` | 从 mock 切换为真实接口，保留类型与工具函数 | ✅ 已完成 |
| `app/components/AdminImageUploader.client.vue` | 真实提交（上传弹窗内可逐文件修改显示名称） | ✅ 已完成 |
| `app/components/AdminMediaLibrary.vue` | 加载/失败/空状态、真实分页与删除、上传前改名 + 上传后重命名 | ✅ 已完成 |
| `app/components/MarkdownEditor.client.vue` | Vditor `upload` 适配（工具栏上传、粘贴/拖拽、CSRF、错误提示） | ✅ 已完成 |
| `app/components/AdminPostForm.vue` | 「上传图片」按钮 + 封面上传，插入 Markdown / 回填封面 URL | ✅ 已完成 |
| `deploy/nginx-blog.conf.example` | `client_max_body_size 30m;`、`proxy_read_timeout 120s;` | ✅ 已完成 |
| `docs/DEPLOYMENT.md` | 环境变量表与 COS 排障小节 | ✅ 已完成 |

#### 7.3 接口契约（实际实现）

```text
POST /api/admin/uploads
  Content-Type: multipart/form-data
  field: file（可重复）
  限制：单文件 ≤ 10MB，单次 ≤ 10 个，总 ≤ 25MB；仅 PNG/JPEG/WebP/GIF/AVIF（魔数校验）
  成功 201：
  {
    "data": {
      "files": [
        {
          "id": 12,
          "name": "cover.png",
          "url": "https://carreyda-1301428252.cos.ap-shanghai.myqcloud.com/images/2026/11/<uuid>.png",
          "width": 1920,
          "height": 1080,
          "bytes": 204800,
          "format": "PNG",
          "createdAt": "2026-11-01T13:33:00.000Z"
        }
      ]
    }
  }
  错误：{ error: { code, message } }
    INVALID_FORM(400) / NO_FILE(400) / TOO_MANY_FILES(400) /
    FILE_TOO_LARGE(413) / REQUEST_TOO_LARGE(413) / UNSUPPORTED_TYPE(415) /
    STORAGE_NOT_CONFIGURED(503) / IMAGE_UPLOAD_FAILED(502) / MEDIA_SAVE_FAILED(500)
  说明：响应不回传 COS key（仅服务端保存到 MediaAsset.cosKey，用于删除）。
  展示名称：前端可在提交前把 File 改名为用户填写的名称，服务端用 sanitizeMediaName 清洗后入库。

GET /api/admin/media?page=1&pageSize=12&q=&format=&sort=newest
  sort: newest | oldest | name | size
  → { data: { items: MediaAsset[], total, page, pageSize, totalBytes } }
  说明：管理页一次性拉取 pageSize=500（上限 500）后在前端分页，与静态阶段交互一致。

GET /api/admin/media/:id/file
  → 200 图片二进制（同源代理 COS 原图）
  说明：裁剪器读取它而不是 COS 公网 URL，避免跨域图片污染 canvas；缓存 private, max-age=300。

DELETE /api/admin/media/:id → 204（先删 COS 对象，再删记录；COS 删除失败返回 502）

PATCH /api/admin/media/:id
  { "name": "新名称.png" }
  → 200 { data: MediaAsset }
  说明：只更新 MediaAsset.name（影响图片库展示与下载文件名）；COS 对象 key/url 不变。
  错误：INVALID_ID(400) / INVALID_NAME(400，空名称或 >255 字符) / MEDIA_NOT_FOUND(404)
```

#### 7.4 数据库模型（实际实现）

```prisma
enum MediaFormat {
  PNG
  JPG
  WEBP
  GIF
  AVIF
}

model MediaAsset {
  id        Int         @id @default(autoincrement())
  name      String      @db.VarChar(255)
  cosKey    String      @unique @db.VarChar(512)
  url       String      @db.VarChar(2048)
  width     Int
  height    Int
  bytes     Int
  format    MediaFormat
  createdAt DateTime    @default(now())

  @@index([createdAt])
  @@index([format, createdAt])
}
```

- 迁移目录：`prisma/migrations/20261101132549_add_media_assets/`（本地 `pnpm db:migrate` 生成并已应用）。
- 生产由 CI 的 `prisma migrate deploy` 自动应用；不要跳过。
- 与草稿差异：`format` 由字符串改为 Prisma 枚举 `MediaFormat`；增加 `cosKey` 唯一键（删除 COS 对象用）；`@@index([format, createdAt])` 覆盖筛选+排序组合。

#### 7.5 完成标准（已全部满足）

- ✅ `pnpm typecheck` 通过（首次出现 `GetObjectResult.ContentType` 类型错误，已改为读 `result.headers['content-type']`）。
- ✅ `pnpm build` 通过（2026-11-01，`.output` 正常生成）。
- ✅ 未配置 `NUXT_COS_*` 时上传接口返回 503 `STORAGE_NOT_CONFIGURED`，其他页面不受影响（代码静态守卫，未实际拆除变量测试）。
- ✅ 本地真实 COS 上传 1 张图，返回 URL 可直接访问，`HeadObject` 200。
- ✅ 真实接口冒烟测试 19/19 通过（上传/列表/代理读取/删除/鉴权/类型校验）。
- ✅ 重命名功能通过无头浏览器验证 12/12：上传前改名（含中文名）、上传后改名、刷新持久化、改名前后 URL 完全一致。
- ✅ 编辑器/封面上传通过无头浏览器验证：Vditor 工具栏上传 201，Markdown 自动插入 COS 链接；`AdminPostForm` 上传按钮与封面上传均 201 且回填正确，无控制台错误。

#### 7.6 其它实现说明

- **CSP**：`server/middleware/security-headers.ts` 的 `img-src` 已允许 `https:`（COS 图片）及 `data: blob:`（上传前预览、裁剪画布）。这是一处安全策略的显式放宽，仅限图片加载，未放宽脚本。
- **裁剪链路**：裁剪器通过 `/api/admin/media/:id/file` 同源代理读取原图，否则跨域 COS 图片会污染 canvas、`toBlob` 失败。
- **兼容**：`image-size@2.0.4` 支持 APNG/AVIF/WebP/GIF/HEIF 等，尺寸解析失败时回退为 `0×0`，不阻塞上传。
- **重命名**：上传弹窗内可逐文件修改名称（上传前改名）；上传后可在卡片 hover、列表行、预览弹窗中重命名。两者都只改数据库 `MediaAsset.name` 与下载文件名，**不会移动或重命名 COS 对象**，已插入文章/站外的链接保持不变。服务端会清洗路径分隔符与非法字符，最长 255 字符。
- **上传进度**：当前为「提交 → toast」，暂无字节级进度条；大文件排队上传属后续可选增强。

#### 7.7 文章编辑器与封面上传（2026-11-01 追加）

复用 `POST /api/admin/uploads`，未新增后端接口：

- **编辑器工具栏**：`MarkdownEditor.client.vue` 的 Vditor `upload` 配置指向 `/api/admin/uploads`，`fieldName: 'file'`、`multiple`、`max: 10MB`、`accept` 同图库白名单、`setHeaders` 注入 `X-CSRF-Token`；Vditor 自带的上传按钮、粘贴图片、拖拽图片都会走同一适配器。
- **响应适配**：Vditor 要求 `{ code, msg, data: { errFiles, succMap } }`，用 `format(files, responseText)` 把本接口的 `{ data: { files: [...] } }` 转成 `succMap`，Vditor 会自动在光标处插入 `![名称](COS_URL)`；失败时 `error(responseText)` 解析 `{ error: { message } }` 并用 `tip` 提示。
- **编辑器卡片按钮**：`AdminPostForm.vue` 顶部「上传图片」按钮选择文件 → `useAdminMedia().addFiles()` 上传 → 逐张插入 `![名称](URL)`；不再使用 `window.prompt` 填 URL。
- **封面上传**：封面 URL 输入框旁新增「上传」按钮，选择图片后上传并回填 `form.coverImageUrl`；也可继续手动粘贴任意 http(s) URL。
- **命名**：Vditor 插入的图片说明使用完整文件名（含扩展名），「上传图片」按钮插入的说明去掉扩展名；两者都只影响 Markdown 说明文字。
- **限制**：与图库共用 10MB/张、PNG/JPEG/WebP/GIF/AVIF 校验；超过限制时前端 toast / Vditor tip 提示。

---

### Step 8 端到端联调验证（需要你配合截图）

#### 8.1 前置条件

你完成 Step 6，并且**本地 `.env` 已填入 COS 变量**（不需要把密钥发到对话里）。我重启 `pnpm dev` 后，即可用无头浏览器走完整上传流程验证；你也可以自己在浏览器里操作。

> ✅ 2026-11-01 本地已由我完成自动化验证（真实 COS、真实数据库、无头 Edge 浏览器），结果见 §8.4。下面的清单保留给你在生产环境（或本地复验）逐项对照。

#### 8.2 验证清单

| # | 操作 | 期望结果 | 需要截图 |
| --- | --- | --- | --- |
| 1 | 后台「图片上传」→ 上传一张 JPG/PNG | 卡片出现在列表顶部，带真实 COS 域名 | 后台列表页 |
| 2 | 点卡片预览 | 大图正常显示；URL 以 `https://carreyda-1301428252.cos.ap-shanghai.myqcloud.com` 开头 | 预览弹窗（含 URL 输入框） |
| 3 | 复制链接，新标签页打开 | 图片正常显示，地址栏为 COS 域名 | 浏览器新标签页（含地址栏） |
| 4 | 对图片执行裁剪（1:1）→ 应用 | 生成新卡片，尺寸为裁剪后尺寸 | 裁剪弹窗 + 裁剪后列表 |
| 5 | 刷新页面 | 列表仍然存在（数据库持久化成功） | 刷新后列表页 |
| 6 | 删除一张图片 | 列表消失；COS 控制台对应 `images/...` 对象消失 | 后台删除后列表 + COS 对象列表 |
| 7 | 上传 >10MB 图片 | 前端提示超出大小限制，不发请求 | 上传弹窗提示 |
| 8 | 把 .txt 改名 .png 上传 | 接口拒绝（魔数不对，415） | 上传弹窗错误提示 |
| 9 | 未登录直接 `POST /api/admin/uploads` | 返回 401（会话校验） | 接口响应（可用浏览器 DevTools/curl） |
| 10 | 文章/站外场景 | 把 COS 图片 URL 填到文章 Markdown 中，前台正常显示 | 文章页截图 |
| 11 | 上传弹窗内把文件名改为中文/其他名称 | 加入图片库后卡片显示新名称 | 上传弹窗（已改名）+ 列表 |
| 12 | 卡片 hover → 重命名 → 保存 | 卡片与预览标题更新；复制的链接不变 | 重命名弹窗 + 前后链接对比 |
| 13 | 文章编辑器工具栏上传（或 Vditor 自带上传按钮） | 返回 201，光标处自动插入 `![](COS_URL)`，右侧预览出现图片 | 编辑器 + 右侧预览 |
| 14 | 在编辑器内粘贴或拖拽图片 | 同上（走同一 Vditor upload 适配） | 编辑器插入结果 |
| 15 | 新建/编辑文章页封面「上传」 | 上传成功，封面 URL 自动回填 COS 地址 | 封面区域截图 |

#### 8.3 上线后的生产验证

- 在 `https://carreyda.com/admin/media` 重复第 1、3、5 条。
- 在 COS 控制台「文件列表」确认对象前缀为 `images/YYYY/MM/`，存储类型为标准存储。
- 截图：后台生产页面 + COS 对象列表。

#### 8.4 本地自动化验证结果（2026-11-01）

**接口冒烟测试（19/19 通过，真实 COS）**

| # | 用例 | 结果 |
| --- | --- | --- |
| 1 | 上传真实 PNG（496 KB） | 201，返回 COS URL，宽高/字节/格式正确 |
| 2 | COS `HeadObject` 校验对象 | 200，`Content-Type: image/png` |
| 3 | 同源代理读取原图 `/api/admin/media/:id/file` | 200，字节与源图一致 |
| 4 | 列表接口 | `total/items/totalBytes` 正确 |
| 5 | 伪造 PNG（纯文本改名） | 415 `UNSUPPORTED_TYPE` |
| 6 | 未登录上传 | 401 |
| 7 | 删除 | 204，COS 对象消失、列表清空 |

**浏览器端到端（无头 Edge + Playwright，真实 COS）**

| # | 操作 | 结果 |
| --- | --- | --- |
| 1 | 打开 `/admin/media`（真实会话） | 空状态正确，页面标题/侧栏入口正常 |
| 2 | 上传图片 → 加入图片库 | 201；卡片出现且缩略图从 COS 正常加载 |
| 3 | 刷新页面 | 图片仍在（数据库持久化） |
| 4 | 预览弹窗 | 大图正常，URL 为 `https://carreyda-1301428252.cos.ap-shanghai.myqcloud.com/images/2026/11/...` |
| 5 | 裁剪 → 应用裁剪 | 生成新图 `xxx-cropped.png`（1152×920，605 KB），列表计数 +1 |
| 6 | 删除 | 确认弹窗正常；删除后列表消失、COS 对象同步清理 |
| 7 | 控制台错误 | 无；清理后图库为空 |
| 8 | 上传前改名：`图片1.png` → 弹窗内改为 `图片2.png` | 201；卡片名称为 `图片2.png`（中文名正常） |
| 9 | 上传后改名：卡片 hover → 重命名 → `图片3.png` | PATCH 200；卡片与预览标题同步更新 |
| 10 | 对比改名前后 COS URL | 完全一致（COS 对象未移动） |
| 11 | 刷新页面 | 仍显示 `图片3.png`（数据库持久化） |

**编辑器 / 封面上传（2026-11-01 追加）**

| # | 操作 | 结果 |
| --- | --- | --- |
| 1 | Vditor 工具栏上传 PNG | 201；编辑器插入 `![编辑器测试图.png](https://carreyda-.../images/2026/11/<uuid>.png)`；右侧预览图渲染 |
| 2 | 编辑器卡片「上传图片」按钮 | 201；插入 `![表单上传图](...)` |
| 3 | 封面上传 | 201；封面 URL 回填 COS 地址 |
| 4 | 清理 | API 删除 3 条记录均 204，图库归零；无控制台错误 |

> 注：验证产生的图片、COS 对象和临时登录会话均已清理，本地数据库 `MediaAsset` 为空，桶内 `images/` 无残留测试对象。重命名专项 E2E 12/12 通过，无浏览器控制台错误。

---

### Step 9 上线、安全加固与成本

#### 9.1 上线顺序

1. 服务器 `.env` 加好 `NUXT_COS_*`（Step 6）。
2. 合并代码触发 GitHub Actions 部署（构建不依赖 COS 密钥）。
3. 服务器 nginx 增加 `client_max_body_size 30m;`（否则上传 >1MB 直接被 413 拦截），`sudo nginx -t && sudo systemctl reload nginx`。
4. `pm2 startOrReload ecosystem.config.cjs --update-env`，`curl -fsS https://carreyda.com/api/health`。
5. 按 Step 8.3 验证。

#### 9.2 安全加固清单

- 密钥只存在服务器 `.env`（600 权限），不进 git、不进前端 bundle、不发聊天。
- CAM 子账号最小权限：只允许 `images/*` 的 Put/Delete/Head。
- 防盗链（可选，稳定后再开）：白名单 `carreyda.com`、`*.carreyda.com`，**必须勾选「允许空 Referer」**（Markdown 图片 `referrerpolicy="no-referrer"`）；开启后本地 `localhost` 后台缩略图可能 403，届时把 `localhost` 加入白名单或本地联调时先临时关闭。
- 建议开启 COS 桶「日志管理」（访问日志存到另一个桶），便于排查盗链/异常流量。
- 站点 CSP 已在静态阶段放宽 `img-src` 允许 `data: blob:`（本地预览/裁剪所需），与 COS 域名不冲突。

#### 9.3 成本与告警

- 小体量博客图库正常在**每月几元**以内（存储 + 外网下行流量 + 请求数，按量后付费）。
- 建议在「费用中心 → 费用预警」设置月度预算提醒；在「云监控」为 COS 建请求数/流量告警策略，避免被盗链刷量。
- 可选优化（不阻塞上线）：CDN 自定义域名、列表使用 COS 图片处理参数生成小缩略图、上传前前端压缩。

#### 9.4 回滚

- 删除服务器 `.env` 中 5 个 `NUXT_COS_*` 变量并 `pm2 startOrReload ecosystem.config.cjs --update-env` → 上传接口返回 503「图片存储未配置」，页面其余功能正常（代码按此设计）。
- 数据库 `MediaAsset` 为新增表，不影响旧数据；如需彻底回退可回滚代码版本。

---

## 4. 报错对照表

| 现象 | 常见原因 | 处理 |
| --- | --- | --- |
| 上传返回 403 AccessDenied | 子账号策略 resource 不匹配 / 未关联策略 | 核对策略 JSON 的地域、APPID、桶名、`images/*`；确认策略已附加到用户 |
| `InvalidAccessKeyId` / `SignatureDoesNotMatch` | SecretId/Key 错误、含空格、密钥被禁用 | 重新复制 `.env`，确认没有引号/空格问题，重启进程 |
| 上传返回 404 NoSuchBucket | 桶名或地域写错 | 对照 Step 5 回填表检查 `NUXT_COS_BUCKET`、`NUXT_COS_REGION` |
| 上传返回 413 | nginx `client_max_body_size` 太小 | 按 Step 9.1 改为 30m 并 reload |
| 上传成功但图片 URL 403 | 桶不是「公有读私有写」，或防盗链拦截 | Step 3 权限确认；防盗链允许空 Referer |
| 图片 URL 打不开但控制台能看 | 复制成了控制台链接而非对象 URL；或桶私有 | 用返回的 `https://<桶域名>/images/...` |
| 后台缩略图裂图 | 防盗链拦截 `localhost` Referer / 域名错误 | 临时关闭防盗链或加入白名单；核对 `NUXT_COS_PUBLIC_BASE_URL` |
| 上传接口 503 `STORAGE_NOT_CONFIGURED` | 服务器缺 `NUXT_COS_*` 或没 reload | 补变量后 `pm2 startOrReload ... --update-env` |
| 构建成功但页面无图 | 前端仍指向旧 mock / 缓存 | 硬刷新；确认部署的是最新构建 |
| 跨域（CORS）报错 | 只会在浏览器直传（STS）时出现 | 本方案走服务端代理，不需要 CORS；不要改架构 |

---

## 附录 A：控制台直达链接

| 功能 | 链接 |
| --- | --- |
| COS 控制台 | <https://console.cloud.tencent.com/cos> |
| 存储桶列表 | <https://console.cloud.tencent.com/cos/bucket> |
| 创建存储桶 | <https://console.cloud.tencent.com/cos/bucket?action=create> |
| CAM 用户 | <https://console.cloud.tencent.com/cam/user> |
| CAM 策略 | <https://console.cloud.tencent.com/cam/policy> |
| API 密钥管理 | <https://console.cloud.tencent.com/cam/capi> |
| 费用预警 | <https://console.cloud.tencent.com/expense/overview> |
| 云监控 | <https://console.cloud.tencent.com/monitor> |

---

## 附录 B：截图命名建议

| 文件名 | 对应步骤 |
| --- | --- |
| `step1-cos-console.png` | Step 1 COS 控制台 |
| `step2-bucket-created.png` | Step 2 建桶成功 |
| `step2-bucket-list.png` | Step 2 桶列表 |
| `step3-bucket-acl.png` | Step 3 权限管理 |
| `step4-cam-user.png` | Step 4 子用户 |
| `step4-policy.png` | Step 4 自定义策略 |
| `step4-api-key.png` | Step 4 API 密钥（打码） |
| `step5-bucket-domain.png` | Step 5 访问域名 |
| `step6-env-vars.png` | Step 6 环境变量名（值打码） |
| `step8-upload-list.png` / `step8-preview-url.png` / `step8-crop.png` / `step8-objects.png` | Step 8 联调 |

---

## 附录 C：本次接入的参数约定

| 约定 | 值 |
| --- | --- |
| 对象 key 规则 | `images/YYYY/MM/<uuid>.<ext>` |
| 允许格式 | PNG / JPEG / WebP / GIF / AVIF（按文件魔数判断，不信任扩展名） |
| 单文件上限 | 10 MB |
| 单次文件数 | 10 |
| 单次总大小 | 25 MB |
| 缓存头 | `Cache-Control: public, max-age=31536000, immutable` |
| 图片 URL | `NUXT_COS_PUBLIC_BASE_URL` 或默认桶域名 + `/` + key |
| 删除策略 | 先删 COS 对象，再删数据库记录；删除失败的记录不删（避免出现坏链） |

---

## 协作节奏

1. **你现在**：从 Step 1 开始操作，按「请截图」逐张发我；如果控制台界面和文档有出入，以你的截图为准，我会更新本文档。
2. **我这边**：并行开始 Step 7 的代码接入（不依赖你的截图），完成后在本文档勾选并在对话里汇报。
3. 你完成 Step 4 后先把「参数回填表」发我（密钥不要发），我就能把默认配置和文档补全；Step 6 完成后我们进入 Step 8 联调。

> 文档维护：每完成一步，我会把 0.5 总进度和对应 Step 的状态更新为已完成。若控制台改版，以你截图中的实际页面为准调整步骤。
