import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();
const pubKeyPath = path.join(__dirname, '../../.ssh/vps1_key.pub');
const pubKey = fs.readFileSync(pubKeyPath, 'utf8').trim();

console.log('Connecting to VPS 163.227.231.43 via SSH2 password auth...');

conn.on('ready', () => {
  console.log('SSH Connection Established!');
  const cmd = `mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo "${pubKey}" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && sort -u ~/.ssh/authorized_keys -o ~/.ssh/authorized_keys`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code: number, signal: any) => {
      console.log(`Key deployed successfully with exit code: ${code}`);
      conn.end();
      process.exit(0);
    }).on('data', (data: any) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data: any) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '163.227.231.43',
  port: 22,
  username: 'root',
  password: 'Phuc2610@',
});
