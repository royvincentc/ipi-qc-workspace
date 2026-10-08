import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {seedEnvironmentalFormats} from '../server/environmental-template-seed.js';
import {ENVIRONMENTAL_FORMATS} from '../server/environmental-formats.b64.js';

test('deployment installs and approves all four EM layouts once, then restores a missing bundled file',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ipi-em-seed-'));
 const templates:any[]=[];const events:string[]=[];
 const db={query:async<T=Record<string,any>>(sql:string,args:any[]=[])=>{
  if(sql.startsWith('SELECT'))return {rows:templates.map(data=>({data})) as T[]};
  if(sql.startsWith('INSERT'))templates.push(JSON.parse(args[1]));
  else if(sql.startsWith('UPDATE'))templates[templates.findIndex(t=>t.id===args[1])]=JSON.parse(args[0]);
  return {rows:[] as T[]};
 }};
 const validate=async()=>({tokens:['tests','test','location','criterion','remarks','value','activeValue','passiveValue','phase']});
 const audit=async(_actor:string,event:string)=>{events.push(event);};
 try{
  await seedEnvironmentalFormats(db,pathName=>path.join(folder,pathName),validate,audit);
  assert.equal(templates.length,4);
  assert.deepEqual(templates.map(t=>t.family),ENVIRONMENTAL_FORMATS.map(t=>t.family));
  assert.ok(templates.every(t=>t.verified&&t.manifest.administratorApproval&&t.manifest.defaultForCategory===false));
  assert.deepEqual(templates.map(t=>t.manifest.rowGrouping.mergeColumns),[[0,2],[1],[1],[0,3]]);
  await seedEnvironmentalFormats(db,pathName=>path.join(folder,pathName),validate,audit);
  assert.equal(templates.length,4);assert.equal(events.length,4);
  await unlink(path.join(folder,templates[0].path));
  await seedEnvironmentalFormats(db,pathName=>path.join(folder,pathName),validate,audit);
  assert.ok((await readFile(path.join(folder,templates[0].path))).length>0);
  assert.equal(events.at(-1),'template_file_restored');
  templates[0].active=false;
  await seedEnvironmentalFormats(db,pathName=>path.join(folder,pathName),validate,audit);
  assert.equal(templates.length,4);assert.equal(templates[0].active,false);
 }finally{await rm(folder,{recursive:true,force:true});}
});
