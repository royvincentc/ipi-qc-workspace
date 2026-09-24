import {spawn} from 'node:child_process';
const child=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','dev'],{env:{...process.env,DEMO_MODE:'true'},stdio:'inherit',shell:process.platform==='win32'});
child.on('exit',code=>process.exit(code??1));
