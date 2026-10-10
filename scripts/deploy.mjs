import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Source-only deployment: no local environment, private keys, Git metadata, or node_modules.
const target = 'ubuntu@56.125.248.192';
const identity = process.env.FIRSTBELL_SSH_IDENTITY ?? 'C:/bnbstocks/firstbell.pem';
const ssh = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'IdentitiesOnly=yes', '-i', identity];
const source = execFileSync('git', ['-c', 'safe.directory=C:/bnbstocks', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' });
const files = source.split('\0').filter((file) => file && (
  /^(app|lib|public|tests|fixtures\/api)\//.test(file) ||
  /^tools\/agents\/package(-lock)?\.json$/.test(file) ||
  /^(package(-lock)?\.json|tsconfig\.json|global\.d\.ts|next-env\.d\.ts|next\.config\.(js|mjs|ts))$/.test(file)
));
if (!files.includes('package-lock.json')) throw new Error('Deployment requires the lockfile');
if (files.some((file) => /(^|\/)\.env|\.pem$|(^|\/)\.git\/|(^|\/)\.\.(\/|$)/.test(file))) throw new Error('Unsafe deployment file');
const temporary = mkdtempSync(join(tmpdir(), 'firstbell-deploy-'));
const list = join(temporary, 'files.txt');
const archive = join(temporary, 'source.tar.gz');
writeFileSync(list, files.join('\n') + '\n');
execFileSync('tar', ['-czf', archive, '-T', list], { stdio: 'inherit' });
const digest = createHash('sha256').update(readFileSync(archive)).digest('hex');
const release = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const root = '/home/ubuntu/firstbell';
const live = process.env.KEEPFLOW_MAINNET_LIVE === 'true';
const liveCap = process.env.LIVE_MAX_TRADE_USD ?? '5';
const publicUrl = process.env.KEEPFLOW_PUBLIC_URL ?? 'https://keepflow.site';
if (!/^\d+(\.\d{1,6})?$/.test(liveCap) || Number(liveCap) <= 0 || Number(liveCap) > 25) throw new Error('LIVE_MAX_TRADE_USD must be between 0 and 25.');
if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/.test(publicUrl)) throw new Error('KEEPFLOW_PUBLIC_URL must be an https origin.');
execFileSync('ssh', [...ssh, target, `mkdir -p ${root}/releases ${root}/shared`], { stdio: 'inherit' });
execFileSync('scp', [...ssh, archive, `${target}:${root}/releases/${release}.tar.gz`], { stdio: 'inherit' });

const script = `set -eu
export PATH=/home/ubuntu/.local/node-v24.21.0/bin:$PATH
runtime=/home/ubuntu/.local/node-v24.21.0
if [ ! -x "$runtime/bin/node" ]; then
  mkdir -p "$runtime"
  curl -fsSL --max-time 120 https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz -o /home/ubuntu/.local/node-v24.21.0.tar.xz
  printf '%s\\n' 'fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6  /home/ubuntu/.local/node-v24.21.0.tar.xz' | sha256sum -c -
  tar -xJf /home/ubuntu/.local/node-v24.21.0.tar.xz -C "$runtime" --strip-components=1
fi
node --version
printf '%s\\n' '${digest}  ${root}/releases/${release}.tar.gz' | sha256sum -c -
mkdir -p ${root}/releases/${release}
tar -xzf ${root}/releases/${release}.tar.gz -C ${root}/releases/${release}
cd ${root}/releases/${release}
npm ci --no-fund
npm --prefix tools/agents ci --ignore-scripts --no-fund
npm test
npm run typecheck
npm run build
sudo apt-get update -qq
sudo env DEBIAN_FRONTEND=noninteractive apt-get -o DPkg::Lock::Timeout=120 install -y -qq nginx
if [ -e ${root}/current ] && [ ! -L ${root}/current ]; then
  printf '%s\\n' 'Refusing to replace a real current directory'; exit 1
fi
ln -sfn ${root}/releases/${release} ${root}/current
sudo tee /etc/systemd/system/firstbell.service >/dev/null <<'UNIT'
[Unit]
Description=KeepFlow web application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/firstbell/current
Environment=NODE_ENV=production
Environment=EXECUTION_MODE=${live?'MAINNET':'DRY_RUN'}
Environment=MAINNET_WRITE_ENABLED=${live}
Environment=FIRSTBELL_APPROVAL_ENABLED=${live}
Environment=LIVE_MAX_TRADE_USD=${liveCap}
Environment=FIRSTBELL_PUBLIC_URL=${publicUrl}
Environment=PAPER_DATABASE_PATH=/home/ubuntu/firstbell/shared/paper.sqlite
Environment=PAPER_SCHEDULER_KEY_PATH=/home/ubuntu/firstbell/shared/paper-scheduler.key
Environment=PATH=/home/ubuntu/.local/node-v24.21.0/bin:/usr/local/bin:/usr/bin:/bin
EnvironmentFile=-/home/ubuntu/firstbell/shared/app.env
ExecStart=/home/ubuntu/.local/node-v24.21.0/bin/node /home/ubuntu/firstbell/current/node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
UNIT
if ! sudo test -f /etc/letsencrypt/live/firstbell-ip/fullchain.pem; then
sudo tee /etc/nginx/sites-available/firstbell >/dev/null <<'NGINX'
server {
  listen 80;
  server_name 56.125.248.192 keepflow.site www.keepflow.site;
  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options DENY always;
  location / {
    proxy_pass http://127.0.0.1:3100;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
NGINX
fi
sudo ln -sfn /etc/nginx/sites-available/firstbell /etc/nginx/sites-enabled/firstbell
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now firstbell
sudo systemctl restart firstbell
sudo systemctl enable --now nginx
sudo systemctl reload nginx
# Preserve the existing paper scheduler and its key without changing enablement.
for attempt in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:3100/api/health; then
    printf '\\nDEPLOYMENT_READY ${release}\\n'; exit 0
  fi
  sleep 1
done
sudo journalctl -u firstbell -n 20 --no-pager
exit 1
`;
execFileSync('ssh', [...ssh, target, 'bash -s'], { input: script, stdio: ['pipe', 'inherit', 'inherit'], timeout: 900_000 });
console.log(JSON.stringify({ release, sourceFiles: files.length, url: 'https://56.125.248.192:80/', apiCredentialsTransferred: false }));
