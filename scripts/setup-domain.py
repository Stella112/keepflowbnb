#!/usr/bin/env python3
# Run on the VPS: sudo python3 setup-domain.py
# Issues a Let's Encrypt certificate for keepflow.site and serves it on 443, keeping the IP address working.
from pathlib import Path
import re, socket, subprocess, sys

DOMAIN, WWW, SERVER_IP = 'keepflow.site', 'www.keepflow.site', '56.125.248.192'
CERTBOT = '/opt/firstbell-certbot/bin/certbot'
WEBROOT = '/var/www/firstbell-acme'
site = Path('/etc/nginx/sites-available/firstbell')
env = Path('/home/ubuntu/firstbell/shared/app.env')

for name in (DOMAIN, WWW):
    try:
        found = socket.gethostbyname(name)
    except OSError:
        sys.exit(f'{name} does not resolve yet. Wait for Namecheap DNS to propagate and retry.')
    if found != SERVER_IP:
        sys.exit(f'{name} resolves to {found}, not {SERVER_IP}. Wait for Namecheap DNS to propagate and retry.')
if not Path(CERTBOT).is_file() or not Path('/etc/letsencrypt/live/firstbell-ip/fullchain.pem').is_file():
    sys.exit('Expected existing certbot install and IP certificate were not found; nothing changed.')

subprocess.run([CERTBOT, 'certonly', '--webroot', '--webroot-path', WEBROOT, '--cert-name', 'keepflow',
                '-d', DOMAIN, '-d', WWW, '--non-interactive', '--agree-tos', '--register-unsafely-without-email',
                '--deploy-hook', 'systemctl reload nginx'], check=True)

saved_site, saved_env = site.read_bytes(), env.read_bytes()
proxy = '''  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options DENY always;
  add_header Strict-Transport-Security "max-age=31536000" always;
  location / {
   proxy_pass http://127.0.0.1:3100;
   proxy_http_version 1.1;
   proxy_set_header Host $http_host;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto https;
  }'''
try:
    site.write_text(f'''# KeepFlow: plain HTTP (via port-80 multiplexer) redirects to the domain.
server {{
 listen 127.0.0.1:8080;
 server_name _;
 location /.well-known/acme-challenge/ {{ root {WEBROOT}; }}
 location / {{ return 308 https://{DOMAIN}$request_uri; }}
}}
server {{
 listen 443 ssl;
 server_name {WWW};
 ssl_certificate /etc/letsencrypt/live/keepflow/fullchain.pem;
 ssl_certificate_key /etc/letsencrypt/live/keepflow/privkey.pem;
 ssl_protocols TLSv1.2 TLSv1.3;
 return 308 https://{DOMAIN}$request_uri;
}}
server {{
 listen 443 ssl;
 server_name {DOMAIN};
 ssl_certificate /etc/letsencrypt/live/keepflow/fullchain.pem;
 ssl_certificate_key /etc/letsencrypt/live/keepflow/privkey.pem;
 ssl_protocols TLSv1.2 TLSv1.3;
{proxy}
}}
server {{
 listen 443 ssl default_server;
 server_name {SERVER_IP};
 ssl_certificate /etc/letsencrypt/live/firstbell-ip/fullchain.pem;
 ssl_certificate_key /etc/letsencrypt/live/firstbell-ip/privkey.pem;
 ssl_protocols TLSv1.2 TLSv1.3;
{proxy}
}}
''')
    text = env.read_text()
    line = f'FIRSTBELL_PUBLIC_URL=https://{DOMAIN}'
    text = re.sub(r'^FIRSTBELL_PUBLIC_URL=.*$', line, text, flags=re.M) if re.search(r'^FIRSTBELL_PUBLIC_URL=', text, re.M) else text.rstrip('\n') + '\n' + line + '\n'
    env.write_text(text)
    subprocess.run(['nginx', '-t'], check=True)
    subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    subprocess.run(['systemctl', 'restart', 'firstbell'], check=True)
    print(f'DOMAIN_CONFIGURED: https://{DOMAIN} (open TCP 443 in the Lightsail firewall if it is not reachable)')
except Exception:
    site.write_bytes(saved_site)
    env.write_bytes(saved_env)
    subprocess.run(['nginx', '-t'], check=False)
    subprocess.run(['systemctl', 'reload', 'nginx'], check=False)
    subprocess.run(['systemctl', 'restart', 'firstbell'], check=False)
    raise
