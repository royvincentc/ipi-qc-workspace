import {readFile} from 'node:fs/promises';
import path from 'node:path';
if(process.env.DEMO_MODE!=='true'||path.resolve(process.env.DEMO_DB_PATH||'')!==path.resolve('.data/environmental-local-setup'))throw new Error('Use the environmental local demo database explicitly.');
const {close}=await import('../server/db.js');
const {importLocalEnvironmentalContext}=await import('../server/local-environmental-context.js');
try{const file=process.argv[2];if(!file)throw new Error('Supply the authenticated environmental context snapshot path.');console.log(JSON.stringify(await importLocalEnvironmentalContext(JSON.parse(await readFile(file,'utf8')),'owner-authorized-local-import')));}finally{await close();}
