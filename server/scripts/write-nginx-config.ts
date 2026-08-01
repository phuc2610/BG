import { Client } from 'ssh2';

const conn = new Client();

const nginxConfig = `server {
    listen 80;
    listen [::]:80;
    server_name ngocphieupc.shop www.ngocphieupc.shop;

    root /var/www/ngocphieupc.shop/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /uploads/ {
        alias /var/www/ngocphieupc.shop/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    access_log /var/log/nginx/ngocphieupc.shop.access.log;
    error_log /var/log/nginx/ngocphieupc.shop.error.log;
}
`;

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const stream = sftp.createWriteStream('/etc/nginx/sites-available/ngocphieupc.shop');
    stream.on('close', () => {
      console.log('Nginx config written successfully via SFTP!');
      conn.end();
      process.exit(0);
    });
    stream.write(nginxConfig);
    stream.end();
  });
}).connect({
  host: '163.227.231.43',
  port: 22,
  username: 'root',
  password: 'Phuc2610@',
});
