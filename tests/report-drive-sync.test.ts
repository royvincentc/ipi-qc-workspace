import test from 'node:test';
import assert from 'node:assert/strict';
import {syncPendingReports} from '../server/report-drive-sync.js';

test('bulk Drive sync skips uploaded reports and continues after individual failures',async()=>{
 const calls:string[]=[];
 const result=await syncPendingReports([
  {id:'saved',name:'Saved report',driveId:'drive-1'},
  {id:'failed',name:'Failed report'},
  {id:'pending',name:'Pending report'},
 ],async id=>{calls.push(id);if(id==='failed')throw new Error('Upload unavailable');});
 assert.deepEqual(calls,['failed','pending']);
 assert.deepEqual(result,{synced:1,skipped:1,failed:[{id:'failed',name:'Failed report',error:'Upload unavailable'}]});
});

test('bulk Drive sync handles an empty library',async()=>{
 assert.deepEqual(await syncPendingReports([],async()=>assert.fail('No upload expected')),{synced:0,skipped:0,failed:[]});
});
