import type {Express} from 'express';
import {db,setting} from './db.js';
import {getConfiguration} from './configuration.js';
import {reportIssues} from '../shared/model.js';
const receivedDay="CASE WHEN data->>'received' ~ '^\\d{4}-\\d{2}-\\d{2}' THEN substring(data->>'received',1,10) WHEN data->>'received' ~ '^\\d{2}/\\d{2}/\\d{4}' THEN substring(data->>'received',7,4)||'-'||substring(data->>'received',1,2)||'-'||substring(data->>'received',4,2) ELSE NULL END";
export function registerSearch(app:Express){
 app.get('/api/library-items',async(req,res)=>{
  const q=String(req.query.q||'').trim().slice(0,200),kind=String(req.query.kind||'');const page=Math.max(1,Math.min(100000,Math.floor(Number(req.query.page))||1)),limit=25;
  const args:any[]=[];const where:string[]=[];const param=(v:any)=>{args.push(v);return '$'+args.length;};
  if(q)where.push(`concat_ws(' ',data->>'name',data->>'ml',data->>'kind') ILIKE ${param('%'+q.replace(/[\\%_]/g,'\\$&')+'%')}`);
  if(kind)where.push(`data->>'kind'=${param(kind)}`);
  const filter=where.length?'WHERE '+where.join(' AND '):'';
  const total=Number((await db.query(`SELECT count(*) FROM files ${filter}`,args)).rows[0].count);
  const order=req.query.sort==='recent'?'created_at DESC':"regexp_replace(coalesce(data->>'ml',data->>'name'),'[0-9]+.*$',''), substring(coalesce(data->>'ml',data->>'name') from '[0-9]+')::numeric, substring(data->>'ml' from '[0-9]+$')::numeric, data->>'name'";
  const rows=(await db.query(`SELECT data FROM files ${filter} ORDER BY ${order},id LIMIT ${param(limit)} OFFSET ${param((page-1)*limit)}`,args)).rows;
  res.json({items:rows.map(({data:{path,pdf,...f}})=>({...f,hasPreview:!!pdf})),total,page,limit});
 });
 app.get('/api/search',async(req,res)=>{
  const query=String(req.query.q||'').trim().slice(0,200);const category=String(req.query.category||'');const status=String(req.query.status||'');const from=String(req.query.from||''),to=String(req.query.to||'');
  const limit=Math.max(1,Math.min(50,Math.floor(Number(req.query.limit))||25)),page=Math.max(1,Math.min(100000,Math.floor(Number(req.query.page))||1));
  const args:any[]=[];const where:string[]=[];const param=(v:any)=>{args.push(v);return '$'+args.length;};
  if(query){const p=param('%'+query.replace(/[\\%_]/g,'\\$&')+'%');where.push(`concat_ws(' ',data->>'ml',data->>'name',data->>'batch',data->>'received',data->>'status',data->>'category',data->>'categoryLabel') ILIKE ${p}`);}
  if(category)where.push(`data->>'category'=${param(category)}`);if(status)where.push(`data->>'status'=${param(status)}`);
  if(from)where.push(`${receivedDay}>=${param(from)}`);if(to)where.push(`${receivedDay}<=${param(to)}`);
  const filter=where.length?'WHERE '+where.join(' AND '):'';
  const count=Number((await db.query(`SELECT count(*) FROM samples ${filter}`,args)).rows[0].count);
  const sorts:Record<string,string>={recent:'updated_at DESC',name:"data->>'name' ASC",received:receivedDay+" DESC NULLS LAST",ml:"data->>'category', (regexp_match(data->>'ml','([0-9]{2,4})[-/][0-9]+$'))[1]::integer ASC NULLS LAST, substring(data->>'ml' from '[0-9]+$')::numeric ASC NULLS LAST"};const order=sorts[String(req.query.sort)]||sorts.recent;
  const rows=(await db.query(`SELECT data,(SELECT count(*) FROM samples b WHERE b.data->>'ml'=samples.data->>'ml') AS duplicates FROM samples ${filter} ORDER BY ${order},id LIMIT ${param(limit)} OFFSET ${param((page-1)*limit)}`,args)).rows;
  const statuses=(await db.query("SELECT DISTINCT data->>'status' AS status FROM samples WHERE data->>'status'<>'' ORDER BY status")).rows.map(r=>r.status);
  res.json({items:rows.map(r=>({...r.data,duplicate:Number(r.duplicates)>1})),total:count,page,limit,statuses});
 });
 app.get('/api/work',async(_req,res)=>{
  const config=await getConfiguration();const templates=(await db.query('SELECT data FROM templates')).rows.map(r=>r.data);const generated=(await db.query("SELECT data->>'draftId' AS draft, data->>'resultRevision' AS revision FROM files WHERE data->>'kind'='report'")).rows;const drafts=(await db.query("SELECT data FROM drafts ORDER BY data->>'updatedAt' DESC LIMIT 100")).rows.map(r=>{const d=r.data,t=d.templateSnapshot||templates.find(t=>t.id===d.templateId);const referenceIssue=!t?.verified||t.revision!==d.templateRevision;const required=d.templateSnapshot?0:(t?.manifest.requiredFields||[]).filter((k:string)=>!d.fields[k]?.trim()).length;return {id:d.id,sample:{name:d.sample.name,ml:d.sample.ml},revision:d.revision,updatedAt:d.updatedAt,generated:generated.some(f=>f.draft===d.id&&Number(f.revision)===d.revision),referenceIssue,missing:reportIssues(d).length+required+(referenceIssue?1:0)};});
  const recent=(await db.query('SELECT data FROM samples ORDER BY updated_at DESC LIMIT 6')).rows.map(r=>r.data);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:config.value.general.timezone}).format(new Date());
  const loggedToday=Number((await db.query(`SELECT count(*) FROM samples WHERE ${receivedDay}=$1`,[today])).rows[0].count);
  const reports=Number((await db.query("SELECT count(*) FROM files WHERE data->>'kind'='report'")).rows[0].count);
  res.json({recent,drafts,loggedToday,reports,sync:await setting('sync',{lastSuccess:null,error:null}),activity:(await db.query("SELECT action,created_at FROM audit ORDER BY created_at DESC LIMIT 5")).rows});
 });
}
