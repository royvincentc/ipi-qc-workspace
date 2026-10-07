import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePreparedReplacement} from '../server/template.js';

test('edited prepared copies preserve named environmental blocks while allowing header edits',()=>{
 const original=['sample.name','analysisDate','rows.spc','rows.my','test','criterion'];
 assert.doesNotThrow(()=>validatePreparedReplacement(original,['sample.name','rows.spc','rows.my','test','criterion','temperature']));
 assert.throws(()=>validatePreparedReplacement(original,['tests','test','criterion']),/Missing:.*rows.spc.*rows.my.*Unexpected:.*tests/);
 assert.throws(()=>validatePreparedReplacement(original,[...original,'rows.extra']),/Unexpected:.*rows.extra/);
});

test('edited fixed-row copies cannot lose their bound result cells',()=>{
 const original=['result.0.criterion','result.0.value','result.0.remarks'];
 assert.throws(()=>validatePreparedReplacement(original,['result.0.criterion','result.0.value']),/Missing:.*result.0.remarks/);
 assert.doesNotThrow(()=>validatePreparedReplacement(original,[...original,'sample.name']));
});
