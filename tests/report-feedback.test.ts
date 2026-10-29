import {test} from 'node:test';
import assert from 'node:assert/strict';
import {estimatedReportProgress} from '../shared/report-progress';

test('time estimates rise monotonically but never claim server completion',()=>{
 let previous=0;
 for(const seconds of [-1,0,1,15,30,60,90,300,3600]){
  const percent=estimatedReportProgress(seconds);
  assert.ok(percent>=previous&&percent<=95);
  previous=percent;
 }
 assert.equal(estimatedReportProgress(0),0);
 assert.equal(estimatedReportProgress(3600),95);
});
