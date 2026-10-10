import { execFileSync } from 'node:child_process';
const script=`set -eu
sudo apt-get -o DPkg::Lock::Timeout=120 install -y -qq python3-venv
if [ ! -x /opt/firstbell-certbot/bin/certbot ]; then
 sudo python3 -m venv /opt/firstbell-certbot
 sudo /opt/firstbell-certbot/bin/pip install 'certbot>=5.4,<6'
fi
sudo mkdir -p /var/www/firstbell-acme
sudo tee /etc/nginx/sites-available/firstbell >/dev/null <<'CONF'
server {
 listen 80;
 server_name 56.125.248.192;
 location /.well-known/acme-challenge/ { root /var/www/firstbell-acme; }
 location / {
  proxy_pass http://127.0.0.1:3100;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
 }
}
CONF
sudo nginx -t
sudo systemctl reload nginx
sudo /opt/firstbell-certbot/bin/certbot certonly --non-interactive --agree-tos --register-unsafely-without-email --required-profile shortlived --webroot --webroot-path /var/www/firstbell-acme --ip-address 56.125.248.192 --cert-name firstbell-ip --deploy-hook 'systemctl reload nginx'
sudo tee /etc/nginx/sites-available/firstbell >/dev/null <<'CONF'
server {
 listen 80;
 server_name 56.125.248.192;
 location /.well-known/acme-challenge/ { root /var/www/firstbell-acme; }
 location / {
  proxy_pass http://127.0.0.1:3100;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
 }
}
server {
 listen 443 ssl;
 server_name 56.125.248.192;
 ssl_certificate /etc/letsencrypt/live/firstbell-ip/fullchain.pem;
 ssl_certificate_key /etc/letsencrypt/live/firstbell-ip/privkey.pem;
 ssl_protocols TLSv1.2 TLSv1.3;
 add_header X-Content-Type-Options nosniff always;
 add_header X-Frame-Options DENY always;
 location / {
  proxy_pass http://127.0.0.1:3100;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
 }
}
CONF
sudo nginx -t
sudo systemctl reload nginx
sudo tee /etc/systemd/system/firstbell-cert-renew.service >/dev/null <<'UNIT'
[Unit]
Description=Renew KeepFlow IP certificate
[Service]
Type=oneshot
ExecStart=/opt/firstbell-certbot/bin/certbot renew --quiet
UNIT
sudo tee /etc/systemd/system/firstbell-cert-renew.timer >/dev/null <<'UNIT'
[Unit]
Description=Check KeepFlow IP certificate twice daily
[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=3600
Persistent=true
[Install]
WantedBy=timers.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now firstbell-cert-renew.timer
sudo /opt/firstbell-certbot/bin/certbot certificates
`;
execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','bash -s'],{input:script,stdio:['pipe','inherit','inherit'],timeout:300000});
