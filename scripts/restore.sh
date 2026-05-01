#!/bin/bash
# 博客数据库恢复脚本
# 用法：./restore.sh <备份文件>
#
# 注意：恢复前会自动停止应用，恢复后自动启动

set -euo pipefail

BACKUP_FILE="${1:-}"
CONTAINER_NAME="blog-app"
DB_PATH="/app/data/blog.db"

if [ -z "$BACKUP_FILE" ]; then
  echo "用法: $0 <备份文件.db.gz>"
  echo ""
  echo "可用备份："
  ls -lh ./backups/blog_*.db.gz 2>/dev/null || echo "  (无备份文件)"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "错误: 文件不存在 - $BACKUP_FILE"
  exit 1
fi

echo "========================================="
echo "  博客数据库恢复"
echo "========================================="
echo "备份文件: $BACKUP_FILE"
echo "目标容器: $CONTAINER_NAME"
echo ""

read -p "⚠️  恢复将覆盖当前数据库，是否继续？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "已取消"
  exit 0
fi

echo "[$(date)] 停止应用..."
docker stop "$CONTAINER_NAME"

echo "[$(date)] 解压备份文件..."
TEMP_FILE=$(mktemp /tmp/blog_restore_XXXXXX.db)
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
else
  cp "$BACKUP_FILE" "$TEMP_FILE"
fi

echo "[$(date)] 恢复数据库..."
docker cp "$TEMP_FILE" "${CONTAINER_NAME}:${DB_PATH}"
rm -f "$TEMP_FILE"

echo "[$(date)] 启动应用..."
docker start "$CONTAINER_NAME"

echo ""
echo "✅ 恢复完成！"
echo "[$(date)] 应用已启动"
