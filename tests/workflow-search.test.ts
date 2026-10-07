import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import type {Express} from 'express';
import {registerSearch} from '../server/search.js';
import {close} from '../server/db.js';

test('workflow searches show newest received samples before recently imported January records and paginate every match',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(`CREATE TABLE samples(id text PRIMARY KEY,data jsonb,updated_at timestamptz);
    CREATE TABLE worksheet_notes(sample_id text,note text,updated_at timestamptz);
    CREATE TABLE drafts(id text PRIMARY KEY,data jsonb);`);
  const fixtures=Array.from({length:60},(_,i)=>({id:`january-${i}`,ml:`ML-ST-26-${String(i).padStart(4,'0')}`,received:'01/30/2026 @ 01:47 pm'}));
  fixtures.push({id:'october-morning',ml:'ML-ST-26-1001',received:'2026-10-07 09:00'},
    {id:'october-afternoon',ml:'ML-ST-26-1002',received:'10/07/2026 @ 01:47 pm'});
  for(const item of fixtures)await pg.query('INSERT INTO samples VALUES($1,$2,$3)',[item.id,JSON.stringify({...item,name:'De-identified search fixture',category:'ST'}),item.id.startsWith('january')?'2026-10-07T12:00:00Z':'2026-09-01T12:00:00Z']);
  const handlers=new Map<string,any>();
  registerSearch({get:(path:string,handler:any)=>handlers.set(path,handler)} as unknown as Express,{query:async(sql,args)=>pg.query(sql,args)});
  const search=async(query:Record<string,string>)=>{let body:any;await handlers.get('/api/search')({query},{json:(value:any)=>{body=value;}});return body;};
  const first=await search({workflow:'true',q:'ML-ST-26-',limit:'50'});
  assert.equal(first.total,62);
  assert.equal(first.items.length,50);
  assert.deepEqual(first.items.slice(0,2).map((item:any)=>item.id),['october-afternoon','october-morning']);
  const second=await search({workflow:'true',sort:'latest',direction:'desc',q:'ML-ST-26-',limit:'50',page:'2'});
  assert.equal(second.items.length,12);
  assert.equal(new Set([...first.items,...second.items].map(item=>item.id)).size,62);
  const exact=await search({workflow:'true',q:'ML-ST-26-1002',limit:'50'});
  assert.equal(exact.total,1);
  assert.equal(exact.items[0].id,'october-afternoon');
 }finally{await pg.close();await close();}
});
