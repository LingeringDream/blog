# 博客系统 Docker 部署指南

## 目录

- [环境要求](#环境要求)
- [快速开始（开发测试）](#快速开始开发测试)
- [方案一：自建服务器部署](#方案一自建服务器部署)
  - [第一步：准备服务器](#第一步准备服务器)
  - [第二步：配置环境变量](#第二步配置环境变量)
  - [第三步：启动服务（HTTP）](#第三步启动服务http)
  - [第四步：申请 SSL 证书](#第四步申请-ssl-证书)
  - [第五步：启用 HTTPS](#第五步启用-https)
- [方案二：ClawCloud Run 云平台部署](#方案二clawcloud-run-云平台部署)
  - [前期准备：推送镜像到 Docker Hub](#前期准备推送镜像到-docker-hub)
  - [第一步：创建应用](#第一步创建应用)
  - [第二步：配置容器与网络](#第二步配置容器与网络)
  - [第三步：配置环境变量与持久化存储](#第三步配置环境变量与持久化存储)
  - [第四步：部署并验证](#第四步部署并验证)
  - [第五步：绑定自定义域名（可选）](#第五步绑定自定义域名可选)
  - [更新与运维](#更新与运维)
- [域名与 DNS 配置](#域名与-dns-配置)
- [数据备份与恢复](#数据备份与恢复)
- [日常运维](#日常运维)
- [常见问题](#常见问题)

---

## 环境要求

| 软件 | 最低版本 | 说明 |
|------|---------|------|
| Docker | 20.10+ | 容器运行时 |
| Docker Compose | 2.0+ | 编排工具（Docker Desktop 自带） |
| 域名 | - | 生产部署需要，开发可省略 |

检查版本：

```bash
docker --version
docker compose version
```

---

## 快速开始（开发测试）

适合本地试用或局域网内部访问，不需要域名和 SSL。

```bash
# 1. 克隆项目
git clone <your-repo-url> blog
cd blog

# 2. 创建环境变量
cp .env.example .env
# 编辑 .env，设置 BLOG_API_KEY（随便填一个密码）

# 3. 启动
docker compose up -d

# 4. 访问
# 浏览器打开 http://localhost:3000
# 管理后台 http://localhost:3000/admin
```

常用命令：

```bash
docker compose up -d          # 启动（后台运行）
docker compose down            # 停止
docker compose logs -f blog    # 查看日志
docker compose restart blog    # 重启
docker compose up -d --build   # 重新构建并启动（代码更新后）
```

---

## 方案一：自建服务器部署

适合公网部署，包含 Nginx 反向代理 + Let's Encrypt 免费 SSL 证书。

### 第一步：准备服务器

1. **购买云服务器**（推荐 1 核 1G 即可，如阿里云 ECS、腾讯云 CVM、AWS Lightsail）

2. **安装 Docker**

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录终端

# CentOS / RHEL
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
```

3. **开放防火墙端口**

```bash
# 如果使用 ufw
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 如果使用 iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 阿里云 / 腾讯云：在安全组中放行 80 和 443 端口
```

4. **上传项目文件**

```bash
# 方式一：git clone
git clone <your-repo-url> ~/blog
cd ~/blog

# 方式二：scp 上传
scp -r ./blog user@server-ip:~/blog
```

### 第二步：配置环境变量

```bash
cd ~/blog

# 生成强随机密钥
BLOG_API_KEY=$(openssl rand -base64 32)
echo "你的 API Key: $BLOG_API_KEY"

# 创建 .env 文件
cat > .env << EOF
BLOG_API_KEY=${BLOG_API_KEY}
DOMAIN=blog.example.com
CERT_EMAIL=your-email@example.com
EOF

# 编辑确认
nano .env
```

> **重要**：`BLOG_API_KEY` 是管理后台的登录密钥，请妥善保管。建议使用 32 位以上随机字符串。

### 第三步：启动服务（HTTP）

```bash
# 创建 nginx 所需目录
mkdir -p nginx/conf.d nginx/certbot/conf nginx/certbot/www

# 复制 nginx 配置（HTTP 版本，用于证书申请）
cp nginx/conf.d/blog.conf nginx/conf.d/blog.conf

# 启动
docker compose -f docker-compose.prod.yml up -d

# 检查状态
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

此时可以通过 `http://你的域名` 访问。

> **提示**：如果还没有配置域名解析，可以先用 `http://服务器IP` 访问（nginx 配置中 `server_name _` 匹配任意域名）。

### 第四步：申请 SSL 证书

确认域名已解析到服务器 IP 后执行：

```bash
# 申请证书
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d blog.example.com \
  --email your-email@example.com \
  --agree-tos \
  -n

# 检查证书
ls nginx/certbot/conf/live/blog.example.com/
```

如果看到 `fullchain.pem` 和 `privkey.pem`，说明申请成功。

### 第五步：启用 HTTPS

```bash
# 将 SSL 配置替换 HTTP 配置
# 先修改域名
sed 's/YOUR_DOMAIN/blog.example.com/g' \
  nginx/conf.d/blog-ssl.conf.example > nginx/conf.d/blog.conf

# 重载 nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# 验证
curl -I https://blog.example.com
```

访问 `https://你的域名` 确认证书生效。

证书会自动续期（certbot 容器每 12 小时检查一次）。

---

## 方案二：ClawCloud Run 云平台部署

[ClawCloud Run](https://run.claw.cloud/) 是一个容器云平台，无需自建服务器，通过网页界面即可部署 Docker 应用。自带 HTTPS、公网域名、持久化存储，适合不想折腾服务器的用户。

> 💰 新用户通常有免费额度，详见 [run.claw.cloud](https://run.claw.cloud/) 官网定价。

### 前期准备：推送镜像到 Docker Hub

ClawCloud Run 支持从公有/私有镜像仓库拉取镜像部署。你需要先把博客镜像推送到 Docker Hub（或其他镜像仓库）。

```bash
# 1. 注册 Docker Hub 账号：https://hub.docker.com
# 2. 登录
docker login

# 3. 构建镜像（在项目目录下）
docker build -t mengqianzai/blog:latest .

# 4. 推送到 Docker Hub
docker push mengqianzai/blog:latest
```

> 如果你使用 GitHub，也可以配置 GitHub Actions 自动构建推送。在项目根目录创建 `.github/workflows/docker.yml` 即可（见本节末尾）。

### 第一步：创建应用

1. 访问 [run.claw.cloud](https://run.claw.cloud/)，注册并登录
2. 在控制台点击 **「App Launchpad」**
3. 点击 **「Create App」** 进入应用配置页面
4. 填写 **应用名称**，例如 `my-blog`

### 第二步：配置容器与网络

| 配置项 | 填写内容 | 说明 |
|--------|---------|------|
| Image Type | Public | 如果镜像是公开的选 Public；私有选 Private 并填写仓库凭据 |
| Image Name | `mengqianzai/blog:latest` | 你在 Docker Hub 上的镜像名 |
| Usage Type | Fixed | 固定实例模式（博客流量不大，不需要弹性伸缩） |
| Replicas | 1 | 单实例即可 |
| CPU | 0.5 Core | 够用了 |
| Memory | 512 MB | 够用了 |
| Container Port | `3000` | 必须是 3000，这是 Express 监听的端口 |
| Public Access | 开启 | 开启后平台自动分配公网域名和 HTTPS |

### 第三步：配置环境变量与持久化存储

在 **「Advanced Configuration」**（高级配置）中：

**环境变量**（一行一个，格式 `KEY=VALUE`）：

```
NODE_ENV=production
BLOG_API_KEY=your-strong-random-secret-here
DB_PATH=/app/data/blog.db
```

> ⚠️ `BLOG_API_KEY` 请使用强随机字符串（如 `openssl rand -base64 32` 生成），这是管理后台的登录密钥。

**持久化存储**（Local Storage）：

| 配置项 | 填写内容 |
|--------|---------|
| Container Path | `/app/data` |
| Storage Size | 1 GB（或根据需要调整） |

> 💡 持久化存储确保 SQLite 数据库在容器重启/重建后不丢失。如果不挂载，重新部署后所有文章数据会丢失。

### 第四步：部署并验证

1. 确认所有配置无误，点击 **「Deploy Application」**
2. 等待部署完成（通常 1-3 分钟）
3. 部署成功后，在应用详情页可以看到自动生成的公网地址，格式类似：
   ```
   https://my-blog-xxxxx.run.claw.cloud
   ```
4. 访问该地址，确认博客首页正常显示
5. 访问 `https://my-blog-xxxxx.run.claw.cloud/admin`，用你设置的 `BLOG_API_KEY` 登录管理后台

### 第五步：绑定自定义域名（可选）

如果你想用自己的域名（如 `blog.example.com`）：

1. 在 ClawCloud Run 应用详情页，点击右侧 **「Custom Domain」**
2. 输入你的域名，平台会显示一个 CNAME 目标地址
3. 去你的 DNS 管理后台（如 Cloudflare、阿里云万网），添加 CNAME 记录：

| 类型 | 主机记录 | 记录值 |
|------|---------|--------|
| CNAME | blog | `my-blog-xxxxx.run.claw.cloud` |

4. 等待 DNS 生效（通常 5 分钟 ~ 2 小时）
5. 回到 ClawCloud Run，点击 **「Deploy」** 确认绑定
6. 平台自动为你的域名配置 HTTPS 证书

> 💡 如果使用 Cloudflare，建议先关闭橙色云朵（DNS Only 模式），等绑定成功后再开启代理。

### 更新与运维

#### 更新博客代码

```bash
# 1. 本地重新构建并推送镜像
docker build -t mengqianzai/blog:latest .
docker push mengqianzai/blog:latest

# 2. 在 ClawCloud Run 控制台：
#    进入应用详情 → 点击「Update」→ 不改配置直接点「Deploy」
#    平台会拉取最新镜像并重新部署
```

#### 查看日志

在 ClawCloud Run 应用详情页，点击 **「Logs」** 标签查看实时日志。

#### 监控

应用详情页提供 CPU、内存、网络等实时监控图表。

#### 调整资源

点击 **「Update」** 可以随时调整 CPU / 内存 / 副本数，无需重新构建镜像。

### GitHub Actions 自动构建推送（可选）

在项目根目录创建 `.github/workflows/docker.yml`，每次 push 代码自动构建推送镜像：

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/blog:latest
```

> 需要在 GitHub 仓库的 Settings → Secrets 中配置 `DOCKERHUB_USERNAME` 和 `DOCKERHUB_TOKEN`。

---

## 域名与 DNS 配置

### 域名解析

在你的域名注册商（如阿里云万网、Cloudflare、Namecheap）添加 DNS 记录：

| 类型 | 主机记录 | 记录值 | TTL |
|------|---------|--------|-----|
| A | @ | 你的服务器 IP | 600 |
| A | www | 你的服务器 IP | 600 |

> 如果使用 Cloudflare，建议先关闭橙色云朵（代理），等配置完成后再开启。

### 生效时间

- 一般 5 分钟 ~ 2 小时生效
- 可通过 `ping blog.example.com` 验证是否已解析到服务器 IP

---

## 数据备份与恢复

### 自动备份

```bash
# 赋予执行权限
chmod +x scripts/backup.sh

# 手动备份
./scripts/backup.sh ./backups

# 设置定时备份（每天凌晨 3 点）
crontab -e
# 添加以下行：
0 3 * * * /root/blog/scripts/backup.sh /root/blog/backups >> /var/log/blog-backup.log 2>&1
```

备份文件保存在 `backups/` 目录，格式为 `blog_YYYYMMDD_HHMMSS.db.gz`，自动保留最近 30 天。

### 恢复数据

```bash
chmod +x scripts/restore.sh

# 查看可用备份
./scripts/restore.sh

# 恢复指定备份
./scripts/restore.sh ./backups/blog_20260501_030000.db.gz
```

### 手动导出

```bash
# 直接从容器复制数据库
docker cp blog-app:/app/data/blog.db ./blog_backup.db
```

---

## 日常运维

### 更新博客代码

```bash
cd ~/blog

# 拉取最新代码
git pull

# 重新构建并启动
docker compose -f docker-compose.prod.yml up -d --build

# 查看日志确认无报错
docker compose -f docker-compose.prod.yml logs -f blog
```

### 查看日志

```bash
# 实时日志
docker compose -f docker-compose.prod.yml logs -f

# 最近 100 行
docker compose -f docker-compose.prod.yml logs --tail 100 blog

# nginx 访问日志
docker compose -f docker-compose.prod.yml logs nginx
```

### 重启服务

```bash
# 重启所有服务
docker compose -f docker-compose.prod.yml restart

# 仅重启博客应用
docker compose -f docker-compose.prod.yml restart blog

# 仅重启 nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### 监控容器状态

```bash
# 查看运行状态
docker compose -f docker-compose.prod.yml ps

# 查看资源占用
docker stats blog-app blog-nginx

# 检查健康状态
docker inspect --format='{{.State.Health.Status}}' blog-app
```

### 清理 Docker 资源

```bash
# 清理停止的容器和未使用的镜像
docker system prune -f

# 清理构建缓存
docker builder prune -f
```

---

## 常见问题

### Q: 端口被占用怎么办？

修改 `docker-compose.yml` 或 `docker-compose.prod.yml` 中的端口映射：

```yaml
ports:
  - "8080:3000"   # 改为 8080 端口
```

### Q: 数据库文件在哪里？

- 容器内路径：`/app/data/blog.db`
- Docker 卷名：`blog-data`
- 查看卷位置：`docker volume inspect blog-data`

### Q: 忘记管理后台密码怎么办？

修改 `.env` 中的 `BLOG_API_KEY`，然后重启：

```bash
# 编辑 .env 修改 BLOG_API_KEY
nano .env

# 重启
docker compose -f docker-compose.prod.yml restart blog
```

### Q: 如何迁移到新服务器？

1. 在旧服务器执行备份：`./scripts/backup.sh`
2. 将备份文件和项目文件复制到新服务器
3. 在新服务器启动容器
4. 恢复数据：`./scripts/restore.sh ./backups/xxx.db.gz`

### Q: 证书过期了怎么办？

```bash
# 手动续期
docker compose -f docker-compose.prod.yml run --rm certbot renew

# 重载 nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Q: 如何查看数据库内容？

```bash
# 进入容器
docker exec -it blog-app sh

# 使用 sqlite3
sqlite3 /app/data/blog.db

# 常用 SQL
.tables                          -- 查看所有表
SELECT * FROM articles;          -- 查看文章
SELECT * FROM settings;          -- 查看设置
.quit                            -- 退出
```

### Q: Nginx 报 502 Bad Gateway？

通常是博客应用未启动或启动失败：

```bash
# 检查应用状态
docker compose -f docker-compose.prod.yml ps

# 查看应用日志
docker compose -f docker-compose.prod.yml logs blog

# 常见原因：BLOG_API_KEY 未设置、端口冲突、数据库损坏
```

### Q: 如何只用 HTTP 不用 HTTPS？

直接使用 `docker-compose.prod.yml`，不执行证书申请步骤即可。nginx 默认配置就是 HTTP。

---

## 文件结构

```
blog/
├── Dockerfile                  # 应用镜像构建
├── docker-compose.yml          # 快速启动（开发测试）
├── docker-compose.prod.yml     # 生产部署（含 nginx + SSL）
├── .env                        # 环境变量（需创建）
├── .env.example                # 环境变量示例
├── .env.production             # 生产环境变量示例
├── nginx/
│   └── conf.d/
│       ├── blog.conf           # nginx 配置（当前生效）
│       └── blog-ssl.conf.example  # SSL 配置模板
├── scripts/
│   ├── backup.sh               # 备份脚本
│   └── restore.sh              # 恢复脚本
└── data/                       # SQLite 数据库（自动生成）
```

---

## 架构图

```
                    ┌───────────────────────────────────┐
                    │          Docker Host              │
                    │                                   │
  用户 ──HTTPS──▶   │   ┌───────────┐   ┌──────────────┐│
                    │   │  Nginx    │───│  Blog App    ││
                    │   │  :80/443  │   │  :3000       ││
                    │   └───────────┘   └──────┬───────┘│
                    │                          │        │
                    │                    ┌─────▼─────┐  │
                    │                    │ SQLite DB  │  │
                    │                    │ (Volume)   │  │
                    │                    └───────────┘  │
                    └───────────────────────────────────┘
```

- **Nginx**：处理 SSL 终止、静态资源缓存、反向代理
- **Blog App**：Express 应用，处理业务逻辑
- **SQLite DB**：持久化存储（Docker Volume）
