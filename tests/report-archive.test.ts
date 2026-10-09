import test from 'node:test';
import assert from 'node:assert/strict';
import {reportArchiveAnalyst,reportArchiveSegments} from '../shared/report-archive.js';
const report={reportAnalyst:'Roy',category:'ST',createdAt:'2026-09-30T17:30:00Z'};
test('report archive uses analyst/year/sample type/month with laboratory timezone',()=>{
 const mapped={SFG:'SFG',FG:'FG',ST:'STAB',MIS:'MISC',EM:'ENVI',RM:'RM',WS:'WATER'};
 for(const [category,folder]of Object.entries(mapped))assert.deepEqual(reportArchiveSegments({...report,category},'Asia/Manila'),['Roy','2026',folder,'10']);
 assert.deepEqual(reportArchiveSegments(report,'UTC'),['Roy','2026','STAB','09']);
});
test('archive routing blocks unresolved categories and invalid dates',()=>{
 assert.throws(()=>reportArchiveSegments({...report,category:''},'Asia/Manila'),/sample type/);
 assert.throws(()=>reportArchiveSegments({...report,createdAt:'invalid'},'Asia/Manila'),/creation date/);
 assert.equal(reportArchiveSegments({...report,reportAnalyst:'A/B: C'},'Asia/Manila')[0],'A-B- C');
});
test('archive uses the generated Analyzed by value rather than the uploader account',()=>{
 for(const reportAnalyst of ['Jas','Roy','James']){
  const file={reportAnalyst,analystName:'Account Owner',analystEmail:'owner@example.test'};
  assert.equal(reportArchiveAnalyst(file,{fields:{analyst:'Later draft analyst'}}),reportAnalyst);
 }
 assert.equal(reportArchiveAnalyst({},{fields:{analyst:'James'}}),'James');
 assert.equal(reportArchiveAnalyst({},{fields:{micAnalyst:'Jas'}}),'Jas');
 assert.throws(()=>reportArchiveAnalyst({}),/Analyzed by name is missing/);
 assert.throws(()=>reportArchiveSegments({...report,reportAnalyst:' '},'UTC'),/Analyzed by/);
});
