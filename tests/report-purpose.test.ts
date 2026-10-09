import test from 'node:test';
import assert from 'node:assert/strict';
import {reportPurpose} from '../shared/report-purpose.js';
test('Purpose reads Type while explicit edits and clears take precedence',()=>{
 for(const category of ['SFG','FG','ST','MIS']){
  const sample={category,fields:{type:'7th Withdrawal',context:'route'}};
  assert.equal(reportPurpose(sample),'7th Withdrawal');
  assert.equal(reportPurpose(sample,{purpose:'Retest'}),'Retest');
  assert.equal(reportPurpose(sample,{purpose:''}),'');
 }
 assert.equal(reportPurpose({category:'ST',fields:{context:'5th Withdrawal'}}),'5th Withdrawal');
 assert.equal(reportPurpose({category:'FG',fields:{context:'Regular'}}),'');
});
