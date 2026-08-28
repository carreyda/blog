# 个人博客完整部署指南

本文档记录本项目从一台全新的腾讯云 Ubuntu 服务器，到可通过公网访问并由 GitHub Actions 自动发布的完整过程。文中同时说明每一步的目的、执行位置、预期结果和注意事项。

> 技术栈：Nuxt 4、Node.js 22、pnpm、Prisma、PostgreSQL、PM2、Nginx、GitHub Actions。
>
> 示例使用 `<SERVER_IP>`、`<GITHUB_USER>` 等占位符；执行时应替换为真实值，密码、私钥和 `.env` 不得写入仓库。

## 1. 部署架构与完整流程

```mermaid
flowchart LR
    Visitor[浏览器访问者] -->|HTTP 80 / HTTPS 443| Nginx[Nginx 反向代理]
    Nginx -->|127.0.0.1:3000| Nuxt[Nuxt / Nitro 应用]
    Nuxt -->|127.0.0.1:5432| PG[(PostgreSQL)]
    PM2[PM2 + systemd] -->|守护及重启| Nuxt
    Developer[开发者] -->|git push main| GitHub[GitHub 仓库]
    GitHub -->|Actions + SSH| Server[腾讯云服务器]
    Server --> Nginx
    Server --> PM2
    Server --> PG
```

- **Nginx**：对公网开放 80/443，把请求转发给本机 Nuxt。
- **Nuxt/Nitro**：运行博客前台、管理后台和 API。
- **PostgreSQL**：保存业务数据，只监听服务器本机。
- **PM2**：保持 Node.js 进程运行，异常退出后自动重启。
- **systemd**：让 PM2 随服务器开机启动。
- **GitHub Actions**：推送 `main` 后自动上传、迁移、构建、重载和检查。

## 2. 安全边界与端口

腾讯云安全组只需要开放：

| 端口 | 用途 | 是否公网开放 |
| --- | --- | --- |
| TCP 22 | SSH 管理及自动部署 | 是，推荐限制来源 |
| TCP 80 | HTTP | 是 |
| TCP 443 | HTTPS | 是 |
| TCP 3000 | Nuxt 内部端口 | 否 |
| TCP 5432 | PostgreSQL | 否 |

应用和数据库分别监听 `127.0.0.1:3000`、`127.0.0.1:5432`，不应直接暴露到公网。

## 3. 首次连接服务器

本地 PowerShell：

```powershell
ssh ubuntu@<SERVER_IP>
```

该命令以 Ubuntu 默认用户连接服务器。首次连接应先在腾讯云控制台核对主机指纹，再输入 `yes`。

服务器重装后可能出现 `REMOTE HOST IDENTIFICATION HAS CHANGED`。确认服务器确实由自己重装后执行：

```powershell
ssh-keygen -R <SERVER_IP>
ssh ubuntu@<SERVER_IP>
```

- `ssh-keygen -R` 只删除该 IP 的旧主机公钥记录。
- 再次连接会保存新公钥。
- 未核实服务器身份时不要忽略此警告，它也可能意味着中间人攻击。

## 4. 更新系统并安装基础软件

以下命令在腾讯云服务器执行：

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx postgresql postgresql-contrib git curl rsync ca-certificates
```

| 命令/软件 | 作用 |
| --- | --- |
| `apt update` | 更新 Ubuntu 软件包索引，不安装软件 |
| `apt upgrade -y` | 安装已有软件的安全更新，自动确认 |
| `nginx` | 反向代理和公网入口 |
| `postgresql` | 数据库服务；Ubuntu 24.04 通常提供 PostgreSQL 16 |
| `postgresql-contrib` | 常用 PostgreSQL 扩展 |
| `git` | 首次取得代码和人工排障 |
| `curl` | 下载和健康检查 |
| `rsync` | Actions 增量同步代码 |
| `ca-certificates` | HTTPS 证书信任链 |

启用并立即启动服务：

```bash
sudo systemctl enable --now nginx postgresql
```

- `enable` 设置开机启动。
- `--now` 同时立即启动。

验证：

```bash
nginx -v
psql --version
git --version
sudo systemctl is-active nginx.service
sudo systemctl is-active postgresql.service
```

最后两条应输出 `active`。

## 5. 配置交换空间（小内存服务器）

2 GB 内存可能不足以完成 Nuxt 构建。先检查：

```bash
free -h
sudo swapon --show
```

如果已有 `/swap.img` 或其他交换空间，不要重复创建。完全没有时才执行：

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

- `fallocate` 创建 2 GB 文件。
- `chmod 600` 防止其他用户读取换出到磁盘的内存。
- `mkswap` 初始化交换空间。
- `swapon` 立即启用。
- 写入 `/etc/fstab` 使其重启后自动启用；`grep` 防止重复追加。

再次运行 `sudo swapon --show` 验证。

## 6. 安装 Node.js、pnpm 和 PM2

服务器执行：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt install -y nodejs
rm nodesource_setup.sh
```

- 下载并运行 NodeSource 的 Node.js 22 仓库配置脚本。
- 安装 Node.js 后删除一次性脚本。

安装项目使用的 pnpm 和进程管理器：

```bash
sudo npm install -g pnpm@11.19.0 pm2
node --version
npm --version
pnpm --version
pm2 --version
```

固定 pnpm 版本有助于让本地、服务器和 CI 使用一致的依赖解析结果。

## 7. 创建生产数据库和应用用户

网站不应使用 `postgres` 超级用户。进入数据库控制台：

```bash
sudo -u postgres psql
```

在 `psql` 中执行：

```sql
CREATE ROLE blog_app WITH LOGIN PASSWORD '<STRONG_DB_PASSWORD>';
ALTER ROLE blog_app CREATEDB;
CREATE DATABASE blog_prod OWNER blog_app ENCODING 'UTF8';
\q
```

- 创建应用专用登录角色及生产数据库。
- `CREATEDB` 仅在脚本确实需要时保留；否则部署完成后可撤销。
- `\q` 用于退出 `psql`。

若角色已存在，重设密码：

```sql
ALTER ROLE blog_app WITH LOGIN PASSWORD '<STRONG_DB_PASSWORD>';
```

验证连接：

```bash
psql -h 127.0.0.1 -U blog_app -d blog_prod -c "SELECT current_database(), current_user;"
```

结果应为 `blog_prod` 和 `blog_app`。出现 `password authentication failed` 表示输入的密码与角色密码不一致，应重新设置角色密码，而不是关闭认证。

## 8. 准备项目目录并取得代码

```bash
sudo mkdir -p /var/www/personal-blog
sudo chown ubuntu:ubuntu /var/www/personal-blog
git clone https://github.com/<GITHUB_USER>/<REPOSITORY>.git /var/www/personal-blog
cd /var/www/personal-blog
git branch --show-current
git log -1 --oneline
```

- 创建网站目录并交给 `ubuntu` 用户管理，避免用 root 运行 Node.js。
- 克隆代码后核对分支和最新提交。
- 后续 Actions 使用 `rsync`，不依赖服务器中的 Git 登录凭据。

## 9. 创建生产环境变量

| 变量 | 作用 |
| --- | --- |
| `DATABASE_URL` | Prisma 连接 PostgreSQL 的地址 |
| `SESSION_SECRET` | 管理员会话签名密钥，至少 32 个随机字节 |
| `NUXT_PUBLIC_SITE_URL` | 网站公网根地址，用于 SEO 和站点地图 |

在服务器项目目录执行：

```bash
cd /var/www/personal-blog
read -rsp "Database password: " DB_PASSWORD
echo
SESSION_SECRET="$(openssl rand -base64 48)"
cat > .env <<EOF
DATABASE_URL="postgresql://blog_app:${DB_PASSWORD}@127.0.0.1:5432/blog_prod?schema=public"
SESSION_SECRET="${SESSION_SECRET}"
NUXT_PUBLIC_SITE_URL="http://<SERVER_IP>"
EOF
unset DB_PASSWORD SESSION_SECRET
chmod 600 .env
```

- `read -rsp` 静默读取密码，不在终端回显。
- `openssl rand` 生成随机会话密钥。
- `unset` 清除 shell 中的临时敏感变量。
- `chmod 600` 仅允许文件所有者读写。

数据库密码若包含 `@`、`:`、`/`、`#` 等 URI 特殊字符，必须 URL 编码。只检查变量名和权限，不显示值：

```bash
grep -E '^[A-Z_]+=' .env | cut -d= -f1
stat -c '%a %n' .env
```

预期看到三个变量名和 `600 .env`。不要 `cat .env`，不要截图或提交它。

## 10. 首次安装、迁移和构建

```bash
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm build
```

- `--frozen-lockfile` 严格使用 `pnpm-lock.yaml`，防止线上依赖漂移。
- `migrate deploy` 只应用仓库中尚未执行的生产迁移。
- `pnpm build` 生成 Prisma Client，并构建 `.output/server/index.mjs`。

Prisma 的新主版本提示不是错误。大版本升级应在开发环境测试后提交，不能在生产机临时升级。

## 11. 创建生产管理员

```bash
pnpm admin:init
```

按提示输入管理员用户名和至少 12 位密码。密码不会回显；重复执行会更新同名管理员，并使旧 Session 失效。

## 12. 使用 PM2 启动应用

项目的 `ecosystem.config.cjs` 已配置入口、`.env`、`127.0.0.1:3000`、单实例和 512 MB 内存重启限制。

```bash
pm2 start ecosystem.config.cjs
pm2 status
pm2 save
```

- 启动后 `personal-blog` 应为 `online`。
- `pm2 save` 把进程清单保存到 `~/.pm2/dump.pm2`，供开机恢复。

检查应用及数据库：

```bash
curl -i --max-time 10 http://127.0.0.1:3000/api/health
pm2 logs personal-blog --lines 50 --nostream
```

健康接口应返回 HTTP 200 和：

```json
{"status":"ok","database":"connected","timestamp":"..."}
```

## 13. 配置 PM2 开机启动

```bash
pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

PM2 会输出一条以 `sudo env ... pm2 startup ...` 开头的命令。执行它后运行：

```bash
pm2 save
sudo systemctl enable --now pm2-ubuntu
systemctl status pm2-ubuntu --no-pager
```

- `pm2 startup` 根据当前用户和 PM2 安装路径生成 systemd 单元。
- `enable --now` 设置开机启动并立即运行。
- 状态应为 `active (running)`。

如旧服务因 PID 文件路径错误反复失败，重新生成，而不是手工猜测 PID 路径：

```bash
sudo systemctl disable --now pm2-ubuntu
sudo rm -f /etc/systemd/system/pm2-ubuntu.service
sudo systemctl daemon-reload
pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

执行新输出的 `sudo ...` 命令，再运行 `pm2 save` 和 `sudo systemctl enable --now pm2-ubuntu`。

## 14. 配置 Nginx 反向代理

先备份：

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
```

编辑 `/etc/nginx/sites-available/default`：

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

验证并平滑加载：

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I http://127.0.0.1
curl http://127.0.0.1/api/health
```

- `nginx -t` 仅检查配置，成功后才能 reload。
- `reload` 平滑加载配置，不粗暴中断已有连接。
- 两个 `curl` 分别验证首页代理和数据库健康接口。

最后从本地访问 `http://<SERVER_IP>`，不要开放 3000 绕过 Nginx。

## 15. 创建 GitHub Actions 专用 SSH 密钥

本地 PowerShell：

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\blog_deploy" -C "github-actions-blog-deploy"
```

会创建私钥 `blog_deploy` 和公钥 `blog_deploy.pub`。私钥只进入 GitHub Secret，公钥安装到服务器：

```powershell
Get-Content "$env:USERPROFILE\.ssh\blog_deploy.pub" | ssh ubuntu@<SERVER_IP> "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
```

- `umask 077` 保证新目录和文件只有当前用户可访问。
- `cat >>` 追加公钥，不覆盖已有密钥。

测试：

```powershell
ssh -i "$env:USERPROFILE\.ssh\blog_deploy" ubuntu@<SERVER_IP> "echo deploy-key-ok"
```

应输出 `deploy-key-ok`，且不再询问服务器密码。

## 16. 固定服务器主机公钥

GitHub Actions 也必须验证服务器身份。采集并核对指纹：

```powershell
ssh-keyscan -t ed25519,rsa,ecdsa <SERVER_IP> 2>$null | Set-Content -Encoding ascii "$env:TEMP\blog_known_hosts"
ssh-keygen -lf "$env:TEMP\blog_known_hosts"
```

- `ssh-keyscan` 读取公开主机公钥，不含私钥。
- `ssh-keygen -lf` 显示指纹，必须与服务器或云控制台信息核对。

## 17. 配置 GitHub Actions Secrets

进入仓库 `Settings` → `Secrets and variables` → `Actions` → `New repository secret`，创建：

| 名称 | 内容 |
| --- | --- |
| `SERVER_HOST` | 服务器公网 IP |
| `SERVER_USER` | `ubuntu` |
| `SERVER_SSH_KEY` | `blog_deploy` 私钥完整内容 |
| `SERVER_KNOWN_HOSTS` | 已核对的 `blog_known_hosts` 完整内容 |

安全复制：

```powershell
Get-Content -Raw "$env:USERPROFILE\.ssh\blog_deploy" | Set-Clipboard
Get-Content -Raw "$env:TEMP\blog_known_hosts" | Set-Clipboard
Set-Clipboard -Value ''
```

前两条应分别在创建对应 Secret 时执行；最后一条在全部粘贴完成后清空剪贴板。不要把私钥、密码或 `.env` 放进仓库、截图、Issue 或日志。

## 18. 自动部署工作流

工作流位于 `.github/workflows/deploy.yml`，推送 `main` 自动触发，也可从 Actions 页面手动运行。

```mermaid
sequenceDiagram
    actor Dev as 开发者
    participant GH as GitHub Actions
    participant VM as 腾讯云服务器
    participant DB as PostgreSQL
    participant App as PM2 / Nuxt
    Dev->>GH: git push origin main
    GH->>GH: checkout 当前提交并配置 SSH
    GH->>VM: rsync 增量同步源代码
    Note over GH,VM: 保留服务器 .env，不上传依赖和构建产物
    GH->>VM: pnpm install --frozen-lockfile
    GH->>VM: prisma migrate deploy
    VM->>DB: 应用未执行迁移
    GH->>VM: pnpm build
    GH->>VM: pm2 startOrReload
    VM->>App: 启动或重载新版本
    GH->>VM: curl /api/health
    VM-->>GH: HTTP 200 + database connected
    GH-->>Dev: Actions success
```

工作流步骤解释：

1. `actions/checkout`：检出触发本次运行的提交。
2. 从 Secrets 写入一次性 Runner 的 SSH 私钥和 `known_hosts`，权限设为 `600`。
3. `rsync -az --delete`：压缩、增量同步，并删除仓库中已不存在的代码文件。
4. 排除 `.env`、`.git`、`.github`、`.claude`、`node_modules`、`.nuxt`、`.output`；尤其保证服务器 `.env` 不被覆盖。
5. SSH 远程执行部署脚本。

远程脚本首先使用：

```bash
set -euo pipefail
```

任何命令失败、使用未定义变量或管道中的命令失败，部署都会立即终止。之后依次：

1. `test -f .env`：确认生产环境变量存在。
2. `pnpm install --frozen-lockfile`：安装锁定依赖。
3. `pnpm exec prisma migrate deploy`：更新数据库结构。
4. `pnpm build`：创建生产构建。
5. `pm2 startOrReload ecosystem.config.cjs --update-env`：首次启动或平滑重载，并刷新环境。
6. `pm2 save`：保存最新进程清单。
7. `curl /api/health`：应用和数据库均正常才判定成功。

`concurrency` 保证同一时间只有一个生产部署，新提交不会中途取消正在执行数据库迁移的部署。

## 19. 日常发布

本地验证完成后：

```powershell
git status
git add <需要提交的文件>
git commit -m "描述本次修改"
git push origin main
```

之后无需手工登录服务器。到 GitHub `Actions` 页面检查 `Deploy to Tencent Cloud`：

- `success`：迁移、构建、PM2 重载和健康检查均通过。
- `failure`：展开失败步骤查看根因，不要在未定位问题时反复重跑。

公网检查：

```powershell
Invoke-RestMethod http://<SERVER_IP>/api/health
```

## 20. 常用运维与故障排查

服务器执行：

```bash
# 应用
pm2 status
pm2 logs personal-blog --lines 100 --nostream
curl -i http://127.0.0.1:3000/api/health
curl -i http://127.0.0.1/api/health

# PM2 开机服务
systemctl status pm2-ubuntu --no-pager
journalctl -u pm2-ubuntu -n 100 --no-pager

# Nginx
sudo nginx -t
systemctl status nginx --no-pager
sudo journalctl -u nginx -n 100 --no-pager

# PostgreSQL
systemctl status postgresql --no-pager
sudo -u postgres psql -d blog_prod -c "SELECT now();"

# 主机资源
free -h
df -h
sudo swapon --show
```

```mermaid
flowchart TD
    A[公网无法访问] --> B{Nginx 是否 active}
    B -- 否 --> B1[检查 nginx -t 和 journalctl]
    B -- 是 --> C{本机 3000 健康检查成功吗}
    C -- 否 --> D{PM2 是否 online}
    D -- 否 --> D1[查看 PM2 日志及 .env 权限]
    D -- 是 --> E{database 是否 connected}
    E -- 否 --> E1[检查 PostgreSQL、DATABASE_URL 和迁移]
    E -- 是 --> E2[检查应用 API 日志]
    C -- 是 --> F[检查 Nginx 配置和腾讯云安全组]
```

## 21. 数据库备份与恢复演练

服务器备份：

```bash
sudo install -d -m 700 -o ubuntu -g ubuntu /var/backups/personal-blog
pg_dump -h 127.0.0.1 -U blog_app -d blog_prod -Fc -f /var/backups/personal-blog/blog_prod_$(date +%F_%H%M%S).dump
```

- `pg_dump` 生成一致性逻辑备份。
- `-Fc` 使用 PostgreSQL 自定义压缩格式。
- 备份不能只保留在同一服务器，应定期加密复制到其他存储。

先在空数据库演练恢复：

```bash
sudo -u postgres createdb --owner=blog_app blog_restore_test
pg_restore -h 127.0.0.1 -U blog_app -d blog_restore_test --clean --if-exists <BACKUP_FILE>
```

恢复是有风险的写操作。确认备份可用并备份当前数据后，才能制定正式恢复到 `blog_prod` 的维护窗口。

## 22. 配置域名和 HTTPS

1. 添加域名 `A` 记录指向服务器公网 IP。
2. 中国大陆服务器按要求完成 ICP 备案。
3. 将 Nginx 的 `server_name _;` 改为真实域名。
4. 把 `.env` 的 `NUXT_PUBLIC_SITE_URL` 改为 `https://你的域名`。
5. 安装腾讯云已签发的 Nginx 证书，或使用 Certbot 签发证书。

### 22.1 安装腾讯云已有证书

先在腾讯云 SSL 证书控制台确认状态为“已签发”、有效期正常，并且证书同时覆盖根域名和 `www` 域名。下载时选择 **Nginx** 格式，压缩包中需要使用：

- `example.com_bundle.crt`：站点证书和中间证书链。
- `example.com.key`：与证书配对的私钥。

上传前应使用 OpenSSL 检查证书有效期、SAN 域名，并验证证书公钥与私钥相匹配。将文件安装到服务器的受限目录：

```bash
sudo install -d -m 700 /etc/nginx/ssl/example.com
sudo install -m 644 example.com_bundle.crt /etc/nginx/ssl/example.com/example.com_bundle.crt
sudo install -m 600 example.com.key /etc/nginx/ssl/example.com/example.com.key
```

在 Nginx 的 HTTPS `server` 中配置：

```nginx
listen 443 ssl;
listen [::]:443 ssl;
server_name example.com;
ssl_certificate /etc/nginx/ssl/example.com/example.com_bundle.crt;
ssl_certificate_key /etc/nginx/ssl/example.com/example.com.key;
ssl_protocols TLSv1.2 TLSv1.3;
```

HTTP 和 `www` 可以使用 `return 301 https://example.com$request_uri;` 统一跳转到规范域名。修改后必须执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

腾讯云控制台的“自动续费”不一定会自动替换 CVM 上手工安装的文件。新证书签发后，需要重新下载、核对、替换 `.crt` 和 `.key`，再执行 `nginx -t` 与 `reload`。严禁将 `.key` 提交到 Git。

### 22.2 使用 Certbot（替代方案）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
sudo certbot renew --dry-run
```

- `certbot --nginx` 申请证书并配置 Nginx HTTPS。
- `renew --dry-run` 模拟自动续期。

环境变量改变后重新构建：

```bash
cd /var/www/personal-blog
pnpm build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

## 23. 上线后的安全加固

- 尽可能将 SSH 22 端口限制为可信来源；GitHub 托管 Runner IP 会变化，需兼顾自动部署网络方案。
- 确认个人密钥和 Actions 密钥都能登录后，再考虑禁用 SSH 密码登录。
- 定期安装 Ubuntu 安全更新。
- 定期备份 PostgreSQL，并实际演练恢复。
- Actions 使用专用部署密钥，不复用个人日常密钥。
- 定期轮换数据库密码、`SESSION_SECRET` 和部署密钥；更换 Session 密钥会使现有管理员会话失效。
- 永不向公网开放 3000 和 5432。
- 永不提交 `.env`、数据库 dump、私钥或含敏感信息的日志。

## 24. 部署完成标准

- `systemctl is-active nginx postgresql pm2-ubuntu` 均为 `active`。
- `pm2 status` 中 `personal-blog` 为 `online`。
- 两级健康检查均为 HTTP 200 且 `database: connected`。
- 公网首页返回 HTTP 200。
- 推送 `main` 后 GitHub Actions 自动部署并显示 `success`。
- 服务器重启后 Nginx、PostgreSQL 和博客应用能够自动恢复。

最终发布链路是：**本地开发与验证 → 推送 GitHub → Actions 安全部署 → 数据库迁移 → 生产构建 → PM2 重载 → 健康检查 → Nginx 对外服务**。
