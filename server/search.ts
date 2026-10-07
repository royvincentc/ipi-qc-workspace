import type {Express} from 'express';
import {db,setting} from './db.js';
import {getConfiguration} from './configuration.js';
import {reportIssues} from '../shared/model.js';
const receivedDay="CASE WHEN data->>'received' ~ '^\\d{4}-\\d{2}-\\d{2}' THEN substring(data->>'received',1,10) WHEN data->>'received' ~ '^\\d{2}/\\d{2}/\\d{4}' THEN substring(data->>'received',7,4)||'-'||substring(data->>'received',1,2)||'-'||substring(data->>'received',4,2) ELSE NULL END";
const receivedTimestamp=`CASE WHEN data->>'received' ~ '^\\d{4}-\\d{2}-\\d{2}[ T]\\d{2}:\\d{2}' THEN (data->>'received')::timestamptz WHEN data->>'received' ~ '^\\d{1,2}/\\d{1,2}/\\d{4}\\s*@\\s*\\d{1,2}:\\d{2}\\s*[APap][Mm]$' THEN to_timestamp(data->>'received','MM/DD/YYYY @ HH12:MI AM') ELSE ${receivedDay}::timestamp END`;
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
  if(query){const p=param('%'+query.replace(/[\\%_]/g,'\\$&')+'%');where.push(`concat_ws(' ',data->>'ml',data->>'name',data->>'batch',data->>'received',data->>'status',data->>'category',data->>'categoryLabel',data->'source'->>'sheet',data->'source'->>'section',worksheet_notes.note) ILIKE ${p}`);}
  if(category)where.push(`data->>'category'=${param(category)}`);if(status)where.push(`data->>'status'=${param(status)}`);
  if(from)where.push(`${receivedDay}>=${param(from)}`);if(to)where.push(`${receivedDay}<=${param(to)}`);
  const filter=where.length?'WHERE '+where.join(' AND '):'';
  const count=Number((await db.query(`SELECT count(*) FROM samples LEFT JOIN worksheet_notes ON worksheet_notes.sample_id=samples.id ${filter}`,args)).rows[0].count);
  const sort=String(req.query.sort||'recent');
  const direction=String(req.query.direction||(['latest','recent','received'].includes(sort)?'desc':'asc'))==='desc'?'DESC':'ASC';
  const sorts:Record<string,string>={
   latest:`${receivedTimestamp} ${direction} NULLS LAST,samples.updated_at DESC,samples.id DESC`,
   recent:`samples.updated_at ${direction}`,
   name:`data->>'name' ${direction} NULLS LAST`,
   category:`data->>'category' ${direction} NULLS LAST`,
   received:`${receivedTimestamp} ${direction} NULLS LAST,samples.updated_at DESC,samples.id DESC`,
   source:`data->'source'->>'sheet' ${direction} NULLS LAST,data->'source'->>'section' ${direction} NULLS LAST`,
   status:`data->>'status' ${direction} NULLS LAST`,
   note:`worksheet_notes.note ${direction} NULLS LAST`,
   ml:`data->>'category' ASC NULLS LAST, (regexp_match(data->>'ml','([0-9]{2,4})[-/][0-9]+$'))[1]::integer ${direction} NULLS LAST, substring(data->>'ml' from '[0-9]+$')::numeric ${direction} NULLS LAST`,
  };
  const order=sorts[sort]||sorts.recent;
  // Search results only need list fields. Sample snapshots also contain the
  // original source row and field map, which can be much larger and belong in
  // the single-record endpoint rather than every keystroke/search page.
  const rows=(await db.query(`SELECT jsonb_build_object(
    'id',COALESCE(data->'id',to_jsonb(samples.id)),'name',data->'name','ml',data->'ml','category',data->'category',
    'categoryLabel',data->'categoryLabel','batch',data->'batch','received',data->'received',
    'status',data->'status','remarks',data->'remarks','context',data->'context',
    'sourceSheet',data->'source'->>'sheet','sourceSection',data->'source'->>'section','sourceRow',data->'source'->>'row',
    'recordUpdatedAt',samples.updated_at,'workspaceNote',worksheet_notes.note,'workspaceNoteUpdatedAt',worksheet_notes.updated_at
  ) AS data,(SELECT count(*) FROM samples b WHERE b.data->>'ml'=samples.data->>'ml') AS duplicates FROM samples LEFT JOIN worksheet_notes ON worksheet_notes.sample_id=samples.id ${filter} ORDER BY ${order},id LIMIT ${param(limit)} OFFSET ${param((page-1)*limit)}`,args)).rows;
  const statuses=(await db.query("SELECT DISTINCT data->>'status' AS status FROM samples WHERE data->>'status'<>'' ORDER BY status")).rows.map(r=>r.status);
  const items=rows.map(r=>({...r.data,duplicate:Number(r.duplicates)>1}));
  if(req.query.workflow==='true'&&items.length){
    const ids=items.map(item=>String(item.id));
    const metadata=(await db.query(`SELECT samples.id,
      coalesce(nullif(draft.data->'fields'->>'analysisDate',''),nullif(samples.data->'fields'->>'analysisDate',''),nullif(samples.data->'fields'->>'dateAnalyze',''),samples.data->'fields'->>'dateAnalyzed') AS "analysisDate",
      coalesce(nullif(draft.data->>'analyst',''),nullif(samples.data->'fields'->>'analyzedBy',''),samples.data->'fields'->>'analyst') AS "analyzedBy",
      draft.data->>'id' AS "draftId",draft.data->'revision' AS "draftRevision"
      FROM samples LEFT JOIN LATERAL (SELECT data FROM drafts WHERE data->>'sampleId'=samples.id ORDER BY data->>'updatedAt' DESC,id DESC LIMIT 1) draft ON true
      WHERE samples.id=ANY($1::text[])`,[ids])).rows;
    for(const item of items)Object.assign(item,metadata.find(row=>String(row.id)===String(item.id))||{});
  }
  res.json({items,total:count,page,limit,statuses});
 });
 app.get('/api/work',async(_req,res)=>{
  const config=await getConfiguration();
  // The dashboard only needs report-readiness fields. Keep large snapshots,
  // criteria provenance, template manifests, and historical metadata in Neon.
  const templates=(await db.query("SELECT jsonb_build_object('id',data->'id','revision',data->'revision','verified',data->'verified','manifest',jsonb_build_object('requiredFields',data->'manifest'->'requiredFields')) AS data FROM templates")).rows.map(r=>r.data);
  const generated=(await db.query("SELECT data->>'draftId' AS draft, data->>'resultRevision' AS revision FROM files WHERE data->>'kind'='report'")).rows;
  const generatedRevisions=new Set(generated.map(f=>`${f.draft}:${f.revision}`));
  const draftRows=(await db.query(`SELECT jsonb_build_object(
    'id',data->'id','sampleId',data->'sampleId','sample',jsonb_build_object('name',data->'sample'->'name','ml',data->'sample'->'ml'),
    'revision',data->'revision','updatedAt',data->'updatedAt','templateId',data->'templateId','templateRevision',data->'templateRevision',
    'fields',data->'fields',
    'templateSnapshot',CASE WHEN data->'templateSnapshot' IS NULL THEN NULL ELSE jsonb_build_object('manifest',jsonb_build_object('requiredFields',data->'templateSnapshot'->'manifest'->'requiredFields')) END,
    'specification',data->'specification',
    'results',data->'results'
  ) AS data FROM drafts ORDER BY data->>'updatedAt' DESC LIMIT 100`)).rows.map(r=>r.data);
  const sourceIds=[...new Set(draftRows.map((draft:any)=>draft.sampleId).filter(Boolean))];
  const sourceRows=sourceIds.length?(await db.query('SELECT id,data FROM samples WHERE id=ANY($1)',[sourceIds])).rows:[];
  const sourceById=new Map(sourceRows.map((row:any)=>[row.id,row.data]));
  const drafts=draftRows.map((d:any)=>{
    const t=d.templateSnapshot||templates.find(t=>t.id===d.templateId);
    const referenceIssue=!t||t.revision!==d.templateRevision;
    const required=d.templateSnapshot?0:(t?.manifest.requiredFields||[]).filter((k:string)=>!d.fields[k]?.trim()).length;
    const source=sourceById.get(d.sampleId);
    return {id:d.id,sample:{...d.sample,...(source?{id:d.sampleId,category:source.category,batch:source.batch,status:source.status}: {})},revision:d.revision,updatedAt:d.updatedAt,generated:generatedRevisions.has(`${d.id}:${d.revision}`),referenceIssue,missing:reportIssues(d).length+required+(referenceIssue?1:0)};
  });
  const recent=(await db.query('SELECT id,data FROM samples ORDER BY updated_at DESC LIMIT 6')).rows.map(r=>({...r.data,id:r.id}));
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:config.value.general.timezone}).format(new Date());
  const loggedToday=Number((await db.query(`SELECT count(*) FROM samples WHERE ${receivedDay}=$1`,[today])).rows[0].count);
  const reports=Number((await db.query("SELECT count(*) FROM files WHERE data->>'kind'='report'")).rows[0].count);
  res.json({recent,drafts,loggedToday,reports,sync:await setting('sync',{lastSuccess:null,error:null}),activity:(await db.query("SELECT action,created_at FROM audit ORDER BY created_at DESC LIMIT 5")).rows});
 });
}
