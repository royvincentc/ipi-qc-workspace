import test from 'node:test';
import assert from 'node:assert/strict';
import {reportArchiveSegments} from '../shared/report-archive.js';
const report={analystEmail:'analyst@example.test',analystName:'Fixture Analyst',category:'ST',createdAt:'2026-09-30T17:30:00Z'};
test('report archive uses analyst/year/sample type/month with laboratory timezone',()=>{
 const mapped={SFG:'SFG',FG:'FG',ST:'STAB',MIS:'MISC',EM:'ENVI',RM:'RM',WS:'WATER'};
 for(const [category,folder]of Object.entries(mapped))assert.deepEqual(reportArchiveSegments({...report,category},'Asia/Manila'),['Fixture Analyst (analyst@example.test)','2026',folder,'10']);
 assert.deepEqual(reportArchiveSegments(report,'UTC'),['Fixture Analyst (analyst@example.test)','2026','STAB','09']);
});
test('archive routing blocks unresolved categories and invalid dates',()=>{
 assert.throws(()=>reportArchiveSegments({...report,category:''},'Asia/Manila'),/sample type/);
 assert.throws(()=>reportArchiveSegments({...report,createdAt:'invalid'},'Asia/Manila'),/creation date/);
 assert.equal(reportArchiveSegments({...report,analystName:'A/B: C'},'Asia/Manila')[0],'A-B- C (analyst@example.test)');
});
