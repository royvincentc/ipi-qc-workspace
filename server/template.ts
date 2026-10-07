import {Fault} from './domain.js';
import {reportTestLabel,resultDisplayValue,resultKey,type Draft,type Template} from '../shared/model.js';

export interface ResultBinding {index:number;test:string;location?:string;stage?:string;replicate?:string}

export function validatePreparedReplacement(originalTokens:string[], replacementTokens:string[]){
 const rowToken=(token:string)=>token==='tests'||token.startsWith('rows.')||token.startsWith('result.');
 const original=originalTokens.filter(rowToken),replacement=replacementTokens.filter(rowToken);
 const missing=original.filter(token=>!replacement.includes(token));
 const added=replacement.filter(token=>!original.includes(token));
 if(missing.length||added.length)throw new Fault(400,`The edited copy must keep the prepared result-table placeholders. ${missing.length?'Missing: '+missing.map(t=>'{{'+t+'}}').join(', ')+'. ':''}${added.length?'Unexpected: '+added.map(t=>'{{'+t+'}}').join(', ')+'.':''} Restore these placeholders or prepare this layout again.`);
}

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
 const grouped=Boolean(t.manifest.rowGrouping||t.manifest.blocks);
 const bindingKey=(x:ResultBinding|Draft['specification']['tests'][number])=>[x.test,x.location||'',x.stage||'',x.replicate||''].join('|');
 const ordered=bindings.length?bindings.map(b=>{
  const criterion=d.specification.tests.find(x=>bindingKey(x)===bindingKey(b));
  if(!criterion)throw new Fault(422,`Template row ${b.index+1} has no matching applicable test: ${resultKey(b)}`);
  return criterion;
 }):d.specification.tests;
 if(bindings.length&&ordered.length!==d.specification.tests.length)throw new Fault(422,'Template does not represent every applicable test instance');
 if(bindings.length&&new Set(ordered.map(resultKey)).size!==d.specification.tests.length)throw new Fault(422,'Template result rows do not match applicable tests');
 const rows=ordered.map((test,i)=>{
  const r=d.results.find(x=>resultKey(x)===resultKey(test));
  const label=({'SPC':'Standard Plate Count (SPC)','MY':'Molds and Yeast'}[test.test]||reportTestLabel(test.test,test.label));
  const location=[test.location||'',test.replicate?`Replicate ${test.replicate}`:''].filter(Boolean).join(' · ');
  if(grouped&&!location.trim())throw new Fault(422,`${label}: approved sampling-plan location is missing`);
  const value=r?.state==='not_tested'?`Not tested${r.reason.trim()?`: ${r.reason.trim()}`:''}`:r?.state==='entered'&&(r.value.trim()||r.qualifier==='Nmt')?resultDisplayValue(test,r):'';
  return {index:i,block:test.block||'tests',channel:test.channel,phase:test.stage||'',groupKey:[test.block||'tests',test.test,test.stage||'',test.criterion,test.unit,test.revision,test.date].join('|'),test:grouped?[label,t.family==='environmental-warehouse-phase-air-7c'?'':test.stage].filter(Boolean).join('\n'):[label,location,test.stage].filter(Boolean).join(' · '),location,criterion:test.criterion,value,remarks:r?.remarks||''};
 });
 return t.family==='environmental-warehouse-phase-air-7c'?warehouseRows(rows):rows;
}

/** Pair channels only for display; saved results remain independent instances. */
export function warehouseRows(rows:{index:number;block:string;channel?:string;phase:string;groupKey:string;test:string;location:string;criterion:string;value:string;remarks:string}[]){
 const groups=new Map<string,typeof rows>();
 for(const row of rows){
  if(!['active-air','passive-air'].includes(row.channel||''))throw new Fault(422,'Warehouse rows require an active-air or passive-air channel.');
  const key=JSON.stringify([row.block,row.test,row.phase,row.location]);
  groups.set(key,[...(groups.get(key)||[]),row]);
 }
 return [...groups.values()].map(pair=>{
  const active=pair.filter(r=>r.channel==='active-air'),passive=pair.filter(r=>r.channel==='passive-air');
  if(active.length!==1||passive.length!==1)throw new Fault(422,'Each warehouse test/location/phase needs exactly one result for each air channel.');
  const a=active[0],p=passive[0];
  const criterion=a.criterion===p.criterion?a.criterion:`Active: ${a.criterion}\nPassive: ${p.criterion}`;
  return {...a,groupKey:JSON.stringify([a.test,criterion,a.groupKey,p.groupKey]),criterion,activeValue:a.value,passiveValue:p.value,
   remarks:[a.remarks?`Active: ${a.remarks}`:'',p.remarks?`Passive: ${p.remarks}`:''].filter(Boolean).join('\n')};
 });
}
