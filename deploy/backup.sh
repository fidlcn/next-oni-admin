#!/bin/bash
# 数据库 + 托管页定时备份脚本
# 用法：添加到 crontab，每天凌晨 3 点执行
#   crontab -e
#   0 3 * * * /srv/next-oni-admin/deploy/backup.sh
#
# 备份保留最近 7 天，自动清理旧文件

set -euo pipefail

# ===== 配置区（按实际修改） =====
DB_USER="YOUR_DB_USER"
DB_PASS="YOUR_DB_PASSWORD"
DB_NAME="YOUR_DB_NAME"
BACKUP_DIR="/var/backups/mysql"
RETAIN_DAYS=7
# 托管页目录（AI 生成的 HTML 页面）
PAGES_DIR="/srv/next-oni-admin/apps/server/pages"
# ==============================

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# 导出并压缩数据库
mysqldump -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "[$(date)] DB backup created: $BACKUP_FILE"

# 托管页目录打包（生成页无库外副本，丢失不可再生，必须备份）
if [ -d "$PAGES_DIR" ]; then
  PAGES_FILE="$BACKUP_DIR/pages_${DATE}.tar.gz"
  tar -czf "$PAGES_FILE" -C "$(dirname "$PAGES_DIR")" "$(basename "$PAGES_DIR")"
  echo "[$(date)] Pages backup created: $PAGES_FILE"
fi

# 清理超过保留天数的备份
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETAIN_DAYS -delete
find "$BACKUP_DIR" -name "pages_*.tar.gz" -mtime +$RETAIN_DAYS -delete

echo "[$(date)] Old backups cleaned (retain ${RETAIN_DAYS} days)"
