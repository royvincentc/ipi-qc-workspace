import {Fault} from './domain.js';
import {resultKey,type Draft,type Template} from '../shared/model.js';

export interface ResultBinding {index:number;test:string;location?:string;stage?:string;replicate?:string}

export function validateBindings(tokens:string[], bindings:ResultBinding[]) {
 const indices=[...new Set(tokens.map(t=>/^result\.(\d+)\.(?:criterion|value|remarks|test)$/.exec(t)?.[1]).filter((x):x is string=>x!==undefined).map(Number))].sort((a,b)=>a-b);
 if(!indices.length) {
  if(bindings.length)throw new Fault(400,'This repeating-row template does not use fixed result bindings');
  return;
 }
 if(indices.length!==bindings.length||indices.some((n,i)=>n!==i||bindings[i]?.index!==n))throw new Fault(400,'Map every numbered result row exactly once, in document order');
 if(bindings.some(b=>!b.test.trim()))throw new Fault(400,'Each result row needs a confirmed test');
 const keys=bindings.map(resultKey);
 if(new Set(keys).size!==keys.length)throw new Fault(400,'Two document rows cannot use the same test instance');
 for(const i of indices)for(const field of ['criterion','value','remarks'])if(!tokens.includes(`result.${i}.${field}`))throw new Fault(400,`Result row ${i+1} is missing its ${field} placeholder`);
}

export function reportRows(d:Draft,t:Template){
 const bindings=(t.manifest.resultBindings||[]) as ResultBinding[];
 const ordered=bindings.length?bindings.map(b=>{
  const criterion=d.specification.tests.find(x=>resultKey(x)===resultKey(b));
  if(!criterion)throw new Fault(422,`Template row ${b.index+1} has no matching applicable test: ${resultKey(b)}`);
  return criterion;
 }):d.specification.tests;
 if(bindings.length&&ordered.length!==d.specification.tests.length)throw new Fault(422,'Template does not represent every applicable test instance');
 if(bindings.length&&new Set(ordered.map(resultKey)).size!==d.specification.tests.length)throw new Fault(422,'Template result rows do not match applicable tests');
 return ordered.map((test,i)=>{const r=d.results.find(x=>resultKey(x)===resultKey(test));if(!r)throw new Fault(422,`${test.label}: actual result is missing`);return {index:i,test:[test.label,test.location,test.stage,test.replicate].filter(Boolean).join(' · '),criterion:test.criterion,value:[r.qualifier,r.value,r.unit].filter(Boolean).join(' '),remarks:r.remarks};});
}
