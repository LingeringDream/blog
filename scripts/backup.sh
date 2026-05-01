#!/bin/bash
# 博客数据库备份脚本
# 用法：./backup.sh [备份目录]
#
# 建议配合 crontab 使用：
#   0 3 * * * /path/to/backup.sh /path/to/backups >> /var/log/blog-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="blog-app"
DB_PATH="/app/data/blog.db"
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] 开始备份..."

# 从容器中复制数据库文件
docker cp "${CONTAINER_NAME}:${DB_PATH}" "${BACKUP_DIR}/blog_${TIMESTAMP}.db"

# 压缩
gzip "${BACKUP_DIR}/blog_${TIMESTAMP}.db"

echo "[$(date)] 备份完成: ${BACKUP_DIR}/blog_${TIMESTAMP}.db.gz"

# 清理旧备份
find "$BACKUP_DIR" -name "blog_*.db.gz" -mtime +"$KEEP_DAYS" -delete
CLEANED=$(find "$BACKUP_DIR" -name "blog_*.db.gz" -mtime +"$KEEP_DAYS" | wc -l)
if [ "$CLEANED" -gt 0 ]; then
  echo "[$(date)] 已清理 ${CLEANED} 个超过 ${KEEP_DAYS} 天的旧备份"
fi

echo "[$(date)] 当前备份数量: $(find "$BACKUP_DIR" -name 'blog_*.db.gz' | wc -l)"
