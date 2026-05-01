FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---------- 运行阶段 ----------
FROM node:18-alpine

# 安全：非 root 用户
RUN addgroup -S blog && adduser -S blog -G blog

WORKDIR /app

# 从构建阶段复制依赖
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# 数据目录
RUN mkdir -p /app/data && chown blog:blog /app/data

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/articles?limit=1 || exit 1

USER blog

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/blog.db

CMD ["node", "server.js"]
