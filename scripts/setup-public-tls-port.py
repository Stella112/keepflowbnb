from pathlib import Path
import subprocess
main=Path('/etc/nginx/nginx.conf')
site=Path('/etc/nginx/sites-available/firstbell')
stream=Path('/etc/nginx/firstbell-stream.conf')
saved={p:(p.read_bytes() if p.exists() else None) for p in (main,site,stream)}
default=Path('/etc/nginx/sites-enabled/default')
default_target=str(default.readlink()) if default.is_symlink() else None
if default.exists() and default_target!='/etc/nginx/sites-available/default':
 raise RuntimeError('Unexpected default virtual host; refusing to disable it')
if not Path('/etc/letsencrypt/live/firstbell-ip/fullchain.pem').is_file():
 raise RuntimeError('Existing KeepFlow certificate required')
if not Path('/usr/lib/nginx/modules/ngx_stream_module.so').is_file():
 raise RuntimeError('Nginx stream module unavailable')
try:
 if default_target:default.unlink()
 text=main.read_text()
 include='include /etc/nginx/firstbell-stream.conf;'
 if include not in text:main.write_text(text+'\n'+include+'\n')
 stream.write_text('''stream {
 map $ssl_preread_protocol $firstbell_destination {
  "" 127.0.0.1:8080;
  default 127.0.0.1:443;
 }
 server {
  listen 80;
  ssl_preread on;
  preread_timeout 10s;
  proxy_connect_timeout 5s;
  proxy_timeout 180s;
  proxy_pass $firstbell_destination;
 }
}
''')
 site.write_text('''# KeepFlow public TLS multiplexed on existing port 80.
server {
 listen 127.0.0.1:8080;
 server_name 56.125.248.192;
 location /.well-known/acme-challenge/ { root /var/www/firstbell-acme; }
 location / { return 308 https://56.125.248.192:80$request_uri; }
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
  proxy_set_header Host $http_host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto https;
 }
}
''')
 subprocess.run(['nginx','-t'],check=True)
 subprocess.run(['systemctl','restart','nginx'],check=True)
 print('PUBLIC_TLS_PORT_CONFIGURED:80; certificate and financial flags unchanged')
except Exception:
 if default_target and not default.exists():default.symlink_to(default_target)
 for p,value in saved.items():
  if value is None:p.unlink(missing_ok=True)
  else:p.write_bytes(value)
 subprocess.run(['nginx','-t'],check=False)
 subprocess.run(['systemctl','restart','nginx'],check=False)
 raise

