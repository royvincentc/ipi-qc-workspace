import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,unlink,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
process.env.DEMO_MODE='true';process.env.DEMO_DB_PATH=await mkdtemp(path.resolve('.data/artifact-test-'));
const {db,migrate,close}=await import('../server/db.js');
const {retainReportArtifact,reportArtifact}=await import('../server/report-artifacts.js');
await migrate();after(close);
const folder=await mkdtemp(path.resolve('tmp/artifact-test-'));
test('DOCX and PDF survive loss of local files with original bytes and checksum',async()=>{
 const file={id:'retained',sha256:createHash('sha256').update('original docx').digest('hex')};
 await db.query('INSERT INTO files(id,data) VALUES($1,$2)',[file.id,JSON.stringify(file)]);
 for(const format of ['docx','pdf'] as const){
  const content=Buffer.from(format==='docx'?'original docx':'original pdf'),local=path.join(folder,'report.'+format);
  await writeFile(local,content);await reportArtifact(file,format,local);await unlink(local);
  const copies=await Promise.all([reportArtifact(file,format,local),reportArtifact(file,format,local)]);
  copies.forEach(copy=>assert.deepEqual(copy,content));assert.deepEqual(await readFile(local),content);
 }
});
test('missing legacy reports give actionable guidance and retain their metadata',async()=>{
 await db.query('INSERT INTO files(id,data) VALUES($1,$2)',['legacy','{}']);
 await assert.rejects(reportArtifact({id:'legacy'},'docx',path.join(folder,'missing.docx')),/saved draft.*generate a new report/);
 assert.equal((await db.query('SELECT id FROM files WHERE id=$1',['legacy'])).rows.length,1);
});
test('corrupt archived bytes and mismatched legacy files cannot be uploaded',async()=>{
 await db.query('INSERT INTO files(id,data) VALUES($1,$2)',['corrupt','{}']);
 await retainReportArtifact('corrupt','docx',Buffer.from('original'));
 await db.query('UPDATE report_artifacts SET content=$1 WHERE file_id=$2',[Buffer.from('changed').toString('base64'),'corrupt']);
 await assert.rejects(reportArtifact({id:'corrupt'},'docx',path.join(folder,'corrupt.docx')),/integrity check/);
 const local=path.join(folder,'mismatch.docx');await writeFile(local,'changed');
 await assert.rejects(reportArtifact({id:'legacy',sha256:'different'},'docx',local),/checksum/);
});
