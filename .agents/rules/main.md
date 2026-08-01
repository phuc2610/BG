---
trigger: always_on
glob:
description:
---

# NP Computer Project

## Thông tin VPS
- Project này có một VPS tên **shopvps-bcdbd6cf**
- IP: `163.227.231.43`, Port SSH: `22`, User: `root`
- OS: Ubuntu 22.04.1 LTS
- CPU: 1 Core | RAM: 1GB | Swap: 2GB | Disk: 16GB (7.2GB free)
- Timezone: Asia/Ho_Chi_Minh (+07)
- Lệnh SSH kết nối: `ssh -i .ssh/vps1_key -p 22 root@163.227.231.43`

## SSH Key
- Private key: `.ssh/vps1_key` (trong workspace)
- Public key: `.ssh/vps1_key.pub`
- Khi kết nối SSH, luôn dùng key thay vì password: `ssh -i .ssh/vps1_key -p 22 root@163.227.231.43`

## Nơi lấy thông tin truy cập VPS
- Toàn bộ credentials lưu trong file **`.env`** tại root workspace.
- Khi cần kết nối SSH hoặc thao tác với VPS, đọc file `.env` để lấy credentials.

## Phần mềm đã cài đặt

### Web Server
- **Nginx**: 1.18.0 (Ubuntu) - Active (running)
- **Certbot**: 1.21.0 (Let's Encrypt SSL, tự động gia hạn qua certbot timer)

### Ngôn ngữ lập trình & Process Manager
- **Node.js**: v22.23.2 (npm 10.9.8) — cài từ NodeSource LTS
- **PM2**: 7.0.3 (Production Process Manager)
- **Python**: 3.10.12 (có pip, python3-venv, python3-dev)
- **PHP**: 8.1.2 (php-fpm + php-cli)

### Cơ sở dữ liệu
- **MongoDB**: 7.0.39 Server - Active (running) & Enabled (`mongodb://127.0.0.1:27017/np_computer`)
- **SQLite3**: 3.37.2 (CLI + tích hợp sẵn trong Python & PHP)

## Danh sách websites/projects đang hoạt động

### 1. ngocphieupc.shop
- **Loại**: `node-app` + `node-static` (Single Page Application + Express Backend API)
- **URL**: `https://ngocphieupc.shop`
- **Local path**: Workspace root (`client/` & `server/`)
- **Remote path**: `/var/www/ngocphieupc.shop/`
- **SSL**: ✅ Let's Encrypt SSL Active
  - Certificate: `/etc/letsencrypt/live/ngocphieupc.shop/fullchain.pem`
  - Key: `/etc/letsencrypt/live/ngocphieupc.shop/privkey.pem`
- **Nginx config**: `/etc/nginx/sites-available/ngocphieupc.shop`
- **Backend API Port**: 5000 (`http://127.0.0.1:5000/api`)
- **PM2 Process Name**: `np-computer-api`
- **Logs**:
  - Access log: `/var/log/nginx/ngocphieupc.shop.access.log`
  - Error log: `/var/log/nginx/ngocphieupc.shop.error.log`
  - PM2 logs: `pm2 logs np-computer-api`

## Quy tắc Auto-Deploy
- Mọi chỉnh sửa code ở `client/` hoặc `server/` khi hoàn tất build sẽ được tự động đồng bộ lên VPS `/var/www/ngocphieupc.shop/` và restart PM2 process `np-computer-api`.
