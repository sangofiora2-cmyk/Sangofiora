const { spawn } = require('child_process');

console.log('Starting Git Push operation...');
const child = spawn('git', ['push', '--progress', '-u', 'origin', 'main'], {
  cwd: process.cwd(),
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }
});

child.stdout.on('data', (data) => console.log(`[STDOUT]: ${data}`));
child.stderr.on('data', (data) => console.log(`[STDERR]: ${data}`));

child.on('close', (code) => {
  console.log(`Git push process exited with code ${code}`);
});
