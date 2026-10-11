import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Typecheck and test the working tree on the VPS without touching the live release.
const target = 'ubuntu@56.125.248.192';
const identity = process.env.FIRSTBELL_SSH_IDENTITY ?? 'C:/bnbstocks/firstbell.pem';
const ssh = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'IdentitiesOnly=yes', '-i', identity];
const source = execFileSync('git', ['-c', 'safe.directory=C:/bnbstocks', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' });
const files = source.split('\0').filter((file) => file && (
  /^(app|lib|public|tests|fixtures\/api)\//.test(file) ||
  /^(package(-lock)?\.json|tsconfig\.json|global\.d\.ts|instrumentation\.ts|next-env\.d\.ts|next\.config\.(js|mjs|ts))$/.test(file)
));
if (files.some((file) => /(^|\/)\.env|\.pem$|(^|\/)\.git\//.test(file))) throw new Error('Unsafe check file');
const temporary = mkdtempSync(join(tmpdir(), 'keepflow-check-'));
const list = join(temporary, 'files.txt');
const archive = join(temporary, 'source.tar.gz');
writeFileSync(list, files.join('\n') + '\n');
execFileSync('tar', ['-czf', archive, '-T', list], { stdio: 'inherit' });
const dir = '/home/ubuntu/firstbell/check';
const focus = process.argv.find((arg) => /^tests\/[a-z0-9-]+\.test\.(ts|mjs)$/.test(arg));
execFileSync('ssh', [...ssh, target, `rm -rf ${dir} && mkdir -p ${dir}`], { stdio: 'inherit' });
execFileSync('scp', [...ssh, archive, `${target}:${dir}/source.tar.gz`], { stdio: 'inherit' });
const script = `set -eu
export PATH=/home/ubuntu/.local/node-v24.21.0/bin:$PATH
cd ${dir} && tar -xzf source.tar.gz && rm source.tar.gz
${process.env.KEEPFLOW_CHECK_FRESH_DEPS==='1'?'npm ci --no-fund --no-audit >/dev/null':'ln -s /home/ubuntu/firstbell/current/node_modules node_modules'}
npm run typecheck
${focus?`node --test ${focus} 2>&1 | tail -60 || true`:"npm test 2>&1 | grep -E '^(ℹ (tests|pass|fail)|✖)' || true"}
`;
execFileSync('ssh', [...ssh, target, 'bash -s'], { input: script, stdio: ['pipe', 'inherit', 'inherit'], timeout: 900_000 });
