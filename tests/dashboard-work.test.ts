import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import type {Express} from 'express';
import {reportIssues,type Draft,type Sample,type Template} from '../shared/model.js';

process.env.DOTENV_CONFIG_PATH=path.resolve('tmp/no-test-secrets.env');
process.env.DEMO_MODE='true';
process.env.DEMO_DB_PATH=await mkdtemp(path.resolve('.data/dashboard-work-test-'));
process.env.GOOGLE_APPLICATION_CREDENTIALS='';
process.env.GOOGLE_CLIENT_SECRET='';
const {db,migrate,close}=await import('../server/db.js');
const {registerSearch}=await import('../server/search.js');
const {getConfiguration}=await import('../server/configuration.js');
await migrate();
after(close);
const configuration=(await getConfiguration()).value;
const handlers=new Map<string,any>();
registerSearch({get:(route:string,handler:any)=>handlers.set(route,handler)} as unknown as Express,db);
async function request(route:string,query:Record<string,string>={}){
 let body:any;
 await handlers.get(route)({query},{json:(value:any)=>{body=value;}});
 return body;
}
const sample:Sample={id:'sample',category:'ST',name:'Invented sample',ml:'ML-TEST',batch:'TEST',received:'2026-10-07',status:'ON-GOING',remarks:'',context:'Routine',fields:{mic:'MIC-TEST',pageNumber:'3'},source:{spreadsheetId:'demo',sheetId:0,sheet:'Invented',section:'ST',row:1,range:'',fingerprint:'fixture',observedAt:'2026-10-07',url:'',mappingRevision:'fixture',raw:[]}};
const template:Template={id:'template',name:'Fixture template',category:'ST',family:'routine',revision:'pinned',path:'templates/fixture.docx',verified:true,manifest:{requiredFields:['analysisDate','requestedBy'],tokens:['mic','page']}};
const draft:Draft={id:'draft',sampleId:sample.id,sample,revision:1,updatedAt:'2026-10-07',analyst:'Fixture Analyst',templateId:template.id,templateRevision:template.revision,templateSnapshot:template,configurationSnapshot:{...configuration,general:{...configuration.general,dateFormat:'en-GB'}},fields:{analysisDate:'16/10/2026',requestedBy:'Fixture owner'},specification:{id:'spec',product:sample.name,category:'ST',context:'Routine',revision:'1',source:'fixture',issues:[],tests:[]},results:[]};
async function save(value:Draft){await db.query('INSERT INTO drafts(id,revision,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET data=$3',[value.id,value.revision,JSON.stringify(value)]);}
await db.query('INSERT INTO samples(id,data) VALUES($1,$2)',[sample.id,JSON.stringify({...sample,fields:{}})]);
await db.query('INSERT INTO templates(id,data) VALUES($1,$2)',[template.id,JSON.stringify({...template,revision:'newer-current',manifest:{requiredFields:['unrelatedNewField']}})]);

test('dashboard readiness uses pinned sample fields, template revision/tokens and analysis-date format',async()=>{
 await save(draft);
 const work=await request('/api/work');
 assert.deepEqual(reportIssues(draft),[]);
 assert.equal(work.drafts[0].missing,0);
 assert.equal(work.drafts[0].referenceIssue,false);
 assert.equal(work.drafts[0].sample.fields,undefined);
 assert.equal(work.drafts[0].templateSnapshot,undefined);
});

test('dashboard counts genuine missing fields and template tokens exactly once',async()=>{
 const missing={...draft,sample:{...sample,fields:{}},fields:{analysisDate:'16/10/2026',requestedBy:''}};
 await save(missing);
 const work=await request('/api/work');
 assert.equal(reportIssues(missing).length,3);
 assert.equal(work.drafts[0].missing,reportIssues(missing).length);
 assert.equal(work.drafts[0].referenceIssue,false);
});

test('legacy templates use saved revision checks and shared readiness without double counting',async()=>{
 await db.query('UPDATE templates SET data=$1 WHERE id=$2',[JSON.stringify(template),template.id]);
 const legacy={...draft,templateSnapshot:undefined,configurationSnapshot:undefined,fields:{analysisDate:'10/16/2026',requestedBy:''}};
 await save(legacy);
 let work=await request('/api/work');
 assert.equal(work.drafts[0].missing,reportIssues({...legacy,templateSnapshot:template}).length);
 assert.equal(work.drafts[0].missing,1);
 assert.equal(work.drafts[0].referenceIssue,false);
 await save({...legacy,templateRevision:'unavailable'});
 work=await request('/api/work');
 assert.equal(work.drafts[0].referenceIssue,true);
 assert.equal(work.drafts[0].missing,2);
});

test('generated DOCX-only reports offer lazy previews without exposing private paths',async()=>{
 await db.query('INSERT INTO files(id,data) VALUES($1,$2)',['file',JSON.stringify({id:'file',kind:'report',name:'Fixture.docx',path:'generated/fixture.docx'})]);
 const library=await request('/api/library-items');
 assert.equal(library.items[0].hasPreview,true);
 assert.equal(library.items[0].path,undefined);
 assert.equal(library.items[0].pdf,undefined);
});
