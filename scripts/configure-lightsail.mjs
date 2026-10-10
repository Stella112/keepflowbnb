import { execFileSync } from 'node:child_process';
const fields = ['BINANCE_WEB3_API_KEY', 'BINANCE_WEB3_API_SECRET', 'BINANCE_WEB3_BASE_URL', 'BSC_RPC_URL'];
const values = Object.fromEntries(fields.map((field) => [field, process.env[field]]));
if (!values.BINANCE_WEB3_API_KEY || !values.BINANCE_WEB3_API_SECRET || values.BINANCE_WEB3_BASE_URL !== 'https://web3.binance.com/build') throw new Error('Invalid configuration');
for (const value of Object.values(values)) if (value && /[\r\n\0]/.test(value)) throw new Error('Invalid environment value');
const source = `import sys,json,os,pathlib
values=json.load(sys.stdin)
directory=pathlib.Path('/home/ubuntu/firstbell/shared')
directory.mkdir(parents=True,exist_ok=True)
os.chmod(directory,0o700)
target=directory/'app.env'
content=''.join(key+'='+json.dumps(value)+'\\n' for key,value in values.items() if value is not None)
content+='EXECUTION_MODE=DRY_RUN\\nMAINNET_WRITE_ENABLED=false\\nLIVE_MAX_TRADE_USD=5\\n'
temporary=directory/'app.env.new'
descriptor=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
with os.fdopen(descriptor,'w') as output: output.write(content)
os.chmod(temporary,0o600)
os.replace(temporary,target)
print('Server configuration saved with mode 0600; execution disabled.')
`;
const command = `python3 -c "import base64;exec(base64.b64decode('${Buffer.from(source).toString('base64')}'))"`;
execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','IdentitiesOnly=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192',command],{input:JSON.stringify(values),stdio:['pipe','inherit','inherit'],timeout:30000});
