import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,unlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const folder=await mkdtemp(path.join(tmpdir(),'ipi-preview-test-'));
process.env.DOTENV_CONFIG_PATH=path.join(folder,'no-secrets.env');
process.env.DEMO_MODE='true';
process.env.DEMO_DB_PATH=path.join(folder,'db');
process.env.PRIVATE_STORAGE=path.join(folder,'private');
process.env.GOOGLE_APPLICATION_CREDENTIALS='';
process.env.GOOGLE_CLIENT_SECRET='';
const {db,migrate,close}=await import('../server/db.js');
const {privatePath}=await import('../server/reports.js');
const {ensureReportPdf,renderPdf}=await import('../server/report-preview.js');
const {retainReportArtifact,reportArtifact}=await import('../server/report-artifacts.js');
await migrate();
after(async()=>{await close();await rm(folder,{recursive:true,force:true});});

const original=Buffer.from('invented original DOCX bytes');
const pdf=Buffer.from('%PDF-1.4\ninvented preview bytes\n%%EOF');
async function fixture(id:string,extra:Record<string,unknown>={}){
 const file={id,kind:'report',name:id+'.docx',path:`generated/${id}.docx`,sha256:createHash('sha256').update(original).digest('hex'),...extra};
 await mkdir(path.dirname(privatePath(file.path)),{recursive:true});
 await writeFile(privatePath(file.path),original);
 await db.query('INSERT INTO files(id,data) VALUES($1,$2)',[id,JSON.stringify(file)]);
 return file;
}

test('concurrent PDF previews render once, preserve DOCX and retain concurrent Drive metadata',async()=>{
 const file=await fixture('concurrent');
 let renders=0;
 const render=async(input:string,output:string)=>{
  renders++;
  assert.deepEqual(await readFile(input),original);
  await db.query("UPDATE files SET data=data||jsonb_build_object('driveId','saved-during-render') WHERE id=$1",[file.id]);
  await writeFile(output,pdf);
 };
 const previews=await Promise.all([ensureReportPdf(file.id,render),ensureReportPdf(file.id,render)]);
 assert.deepEqual(previews,['generated/concurrent.pdf','generated/concurrent.pdf']);
 assert.equal(renders,1);
 assert.deepEqual(await readFile(privatePath(file.path)),original);
 assert.deepEqual(await readFile(privatePath(previews[0])),pdf);
 const saved=(await db.query('SELECT data FROM files WHERE id=$1',[file.id])).rows[0].data;
 assert.equal(saved.driveId,'saved-during-render');
 assert.equal(saved.pdf,previews[0]);
 assert.equal((await db.query('SELECT format FROM report_artifacts WHERE file_id=$1 ORDER BY format',[file.id])).rows.length,2);
});

test('archived PDF is restored without a renderer or a surviving DOCX',async()=>{
 const file=await fixture('archived');
 await retainReportArtifact(file.id,'pdf',pdf);
 await unlink(privatePath(file.path));
 const relative=await ensureReportPdf(file.id,async()=>{assert.fail('Cached preview must not render again');});
 assert.deepEqual(await readFile(privatePath(relative)),pdf);
 await unlink(privatePath(relative));
 await ensureReportPdf(file.id,async()=>{assert.fail('Archived preview must recover after local file loss');});
 assert.deepEqual(await readFile(privatePath(relative)),pdf);
});

test('corrupt archives are rejected instead of silently regenerating an unverified preview',async()=>{
 const file=await fixture('corrupt');
 await retainReportArtifact(file.id,'pdf',pdf);
 await db.query("UPDATE report_artifacts SET content=$1 WHERE file_id=$2 AND format='pdf'",[Buffer.from('changed').toString('base64'),file.id]);
 await assert.rejects(ensureReportPdf(file.id,async()=>{assert.fail('Do not replace a corrupt archive');}),/integrity check/);
 assert.deepEqual(await readFile(privatePath(file.path)),original);
});

test('failed conversion leaves the original DOCX downloadable and a subsequent preview can retry',async()=>{
 const file=await fixture('failed');
 await assert.rejects(ensureReportPdf(file.id,async()=>{throw new Error('renderer unavailable');}),/renderer unavailable/);
 assert.deepEqual(await reportArtifact(file,'docx',privatePath(file.path)),original);
 assert.equal((await db.query('SELECT data FROM files WHERE id=$1',[file.id])).rows[0].data.pdf,undefined);
 const relative=await ensureReportPdf(file.id,async(_input,output)=>{await writeFile(output,pdf);});
 assert.deepEqual(await readFile(privatePath(relative)),pdf);
});

test('preview rejects unknown files, non-report files and paths outside private storage',async()=>{
 await assert.rejects(ensureReportPdf('unknown'),/not found/);
 await fixture('reference',{kind:'reference'});
 await assert.rejects(ensureReportPdf('reference'),/not found/);
 await fixture('outside',{pdf:'../outside.pdf'});
 await assert.rejects(ensureReportPdf('outside'),/Invalid private file path/);
 const previous=process.env.PDF_RENDERER;
 process.env.PDF_RENDERER='unavailable-renderer';
 try{await assert.rejects(renderPdf(privatePath('generated/failed.docx'),privatePath('generated/failed.pdf')),/Configure Word or LibreOffice/);}
 finally{if(previous===undefined)delete process.env.PDF_RENDERER;else process.env.PDF_RENDERER=previous;}
});
