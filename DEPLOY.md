# 博客系统 Docker 部署指南

## 目录

- [环境要求](#环境要求)
- [快速开始（开发/测试）](#快速开始开发测试)
- [生产部署](#生产部署)
  - [第一步：准备服务器](#第一步准备服务器)
  - [第二步：配置环境变量](#第二步配置环境变量)
  - [第三步：启动服务（HTTP）](#第三步启动服务http)
  - [第四步：申请 SSL 证书](#第四步申请-ssl-证书)
  - [第五步：启用 HTTPS](#第五步启用-https)
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

## 快速开始（开发/测试）

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

## 生产部署

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

# 阿里云/腾讯云：在安全组中放行 80 和 443 端口
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
# 用 SSL 配置替换 HTTP 配置
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
├── docker-compose.yml          # 快速启动（开发/测试）
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
                    ┌─────────────────────────────────┐
                    │           Docker Host            │
                    │                                  │
  用户 ──HTTPS──▶  │  ┌─────────┐    ┌─────────────┐ │
                    │  │  Nginx  │───▶│  Blog App   │ │
                    │  │ :80/443 │    │   :3000     │ │
                    │  └─────────┘    └──────┬──────┘ │
                    │                        │        │
                    │                  ┌─────▼─────┐  │
                    │                  │  SQLite DB │  │
                    │                  │  (Volume)  │  │
                    │                  └───────────┘  │
                    └─────────────────────────────────┘
```

- **Nginx**：处理 SSL 终止、静态资源缓存、反向代理
- **Blog App**：Express 应用，处理业务逻辑
- **SQLite DB**：持久化存储在 Docker Volume 中
