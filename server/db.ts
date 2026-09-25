import 'dotenv/config';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { readFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
export interface DB {query<T=Record<string,any>>(sql:string,args?:any[]):Promise<{rows:T[]}>}
export const demo=process.env.DEMO_MODE==='true';
if(demo&&process.env.NODE_ENV==='production')throw new Error('Demo mode is prohibited in production');
if(demo&&(process.env.GOOGLE_APPLICATION_CREDENTIALS||process.env.GOOGLE_CLIENT_SECRET))throw new Error('Do not combine demo mode with Google credentials');
await mkdir('.data',{recursive:true});
const embedded=demo?new PGlite(path.resolve(process.env.DEMO_DB_PATH||'.data/demo-db')):null;
import dns from 'node:dns';
const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

let pool: pg.Pool | null = null;
if (!demo) {
  let dbConfig: any = { ssl: isLocal ? false : { rejectUnauthorized: false } };
  
  if (!isLocal && process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      dbConfig = {
        user: url.username,
        password: url.password,
        host: url.hostname,
        port: parseInt(url.port || '5432', 10),
        database: url.pathname.slice(1),
        ssl: { rejectUnauthorized: false, servername: url.hostname }
      };
      
      const { address } = await dns.promises.lookup(url.hostname, { family: 4 });
      dbConfig.host = address;
    } catch (e) {
      console.warn('Failed to resolve IPv4 for DB host', e);
      dbConfig.connectionString = process.env.DATABASE_URL; // fallback
    }
  } else if (process.env.DATABASE_URL) {
    dbConfig.connectionString = process.env.DATABASE_URL;
  }

  pool = new pg.Pool({
    ...dbConfig,
    keepAlive: true,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 10000,
    max: 15
  });
  pool.on('error', err => console.error('Unexpected error on idle client', err));
}
export const db:DB=embedded?{query:async(sql,args)=>embedded.query(sql,args)}:pool!;
let demoLock=Promise.resolve();
export async function locked<T>(key:string,fn:(tx:DB)=>Promise<T>):Promise<T>{
 if(embedded){const before=demoLock;let release!:()=>void;demoLock=new Promise(r=>release=r);await before;try{return await fn(db);}finally{release();}}
 const client=await pool!.connect();try{await client.query('SELECT pg_advisory_lock(hashtext($1))',[key]);return await fn(client);}finally{await client.query('SELECT pg_advisory_unlock(hashtext($1))',[key]);client.release();}
}
export async function migrate(){const sql=await readFile(new URL('./schema.sql',import.meta.url),'utf8');if(embedded)await embedded.exec(sql);else await pool!.query(sql);}
export async function setting<T>(key:string,fallback:T):Promise<T>{return (await db.query('SELECT value FROM settings WHERE key=$1',[key])).rows[0]?.value??fallback;}
export async function setSetting(key:string,value:unknown){await db.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2',[key,JSON.stringify(value)]);}
export async function audit(actor:string,action:string,entity:string,details:unknown={}){await db.query('INSERT INTO audit(id,actor,action,entity,details) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor,action,entity,JSON.stringify(details)]);}
export async function close(){await embedded?.close();await pool?.end();}
