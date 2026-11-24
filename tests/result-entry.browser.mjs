import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

const main=await readFile(new URL('../src/main.tsx',import.meta.url),'utf8');
const styles=await Promise.all([...main.matchAll(/import '\.\/(.*?\.css)'/g)].map(match=>readFile(new URL('../src/'+match[1],import.meta.url),'utf8')));
const config={revision:1,changedBy:'fixture',value:{general:{theme:'light',density:'comfortable',appName:'Result entry fixture',dateFormat:'en-US'},sampleTypes:[{id:'EM',name:'Environmental Monitoring'}],tests:[]}};
const sample={id:'sample-fixture',category:'EM',ml:'EM-FIXTURE',name:'Fixture swabbing session',batch:'FIXTURE',context:'Surface',fields:{},source:{fingerprint:'fixture'},received:'2026-11-20',status:'Testing',remarks:''};
const criterion=(test,location='Fixture tank')=>({test,label:test,type:'numeric',unit:test==='ACCUPOINT'?'RLU':'cfu/swab',criterion:'Nmt 100 '+(test==='ACCUPOINT'?'RLU':'cfu/swab'),source:'approved-fixture',sourceLocation:'Fixture row',date:'2026-01-01',dateBasis:'owner-confirmed',revision:'1',location});
const members=[{draftId:'acc-fixture',outputId:'acc',name:'ACCUPOINT',method:'accupoint'},{draftId:'spc-fixture',outputId:'spc',name:'SPCMY',method:'spc-my'}];
const drafts=members.map((member,index)=>{const tests=(index?['MY','SPC']:['ACCUPOINT']).map(test=>criterion(test));return {id:member.draftId,sampleId:sample.id,sample,specification:{id:'spec-fixture',product:sample.name,category:'EM',context:'Surface',revision:'1',tests,issues:[],source:'fixture'},templateId:member.outputId,templateRevision:'1',revision:1,configurationSnapshot:config.value,templateSnapshot:{id:member.outputId,manifest:{tokens:['analysisDate','mic'],requiredFields:['analysisDate','mic']}},environmentalSnapshot:{profile:{id:'fixture',revision:'1'},output:{id:member.outputId,method:member.method,mode:'surface'}},environmentalSession:{id:'session-fixture',members},results:tests.map(test=>({...test,state:'entered',value:'5',qualifier:'',reason:'',remarks:'Passed',remarkMode:'automatic'})),fields:{analysisDate:'11/20/2026',mic:index?'MIC-SPC':'MIC-ACC'},updatedAt:'2026-11-20T00:00:00Z',analyst:'Fixture Analyst'};});
function categoryDraft(category){
 const point={location:'Fixture sampling point',stage:'After cleaning',replicate:'R1',block:'A'};
 const tests=[
  {...criterion('MY'),unit:'cfu/g',criterion:'Nmt 100 cfu/g',...point},
  {...criterion('SPC'),unit:'cfu/mL',criterion:'Nmt 100 cfu/mL',...point},
  {...criterion('EC'),label:'E. coli finding',type:'finding',unit:'',criterion:'Negative',...point},
  {...criterion('CUSTOM'),label:'Custom numeric assay',unit:'fixture units',criterion:'Owner supplied specification',...point},
  ...[{location:'Other fixture point'},{stage:'Before cleaning'},{replicate:'R2'},{channel:'active-air'},{block:'B'}].map(identity=>({...criterion('SPC'),...point,...identity})),
 ].map((test,index)=>({...test,instanceId:'fixture-instance-'+index}));
 return {...drafts[0],sample:{...sample,category,name:'Fixture '+category+' sample',context:'Fixture context'},specification:{...drafts[0].specification,category,context:'Fixture context',tests},environmentalSnapshot:undefined,environmentalSession:undefined,templateSnapshot:{id:'category-fixture',manifest:{tokens:['analysisDate'],requiredFields:['analysisDate']}},results:tests.map(test=>({...test,state:'not_entered',value:'',qualifier:'',reason:'',remarks:'',remarkMode:'automatic'})),fields:{analysisDate:'11/20/2026'}};
}
function numberedDrafts(){
 const points=[['#19 Hook'],['#17 Ladle'],['Fixture control swab'],['#12 Spatula'],['#2 Context probe','Before cleaning'],['#18 Beaker'],['#14 Drum'],['#13 Drum'],['#1 Context reference','Before cleaning'],['#16 Pail'],['#15 Pail'],['#20 Rod']];
 return drafts.map(draft=>{
  const tests=points.flatMap(([location,stage='After cleaning'],point)=>draft.specification.tests.map(test=>({...test,location,stage,replicate:'R1',block:'tests',instanceId:`${draft.id}-point-${point}-${test.test}`})));
  return {...draft,specification:{...draft.specification,tests},results:tests.map((test,index)=>({...test,state:'entered',value:String(index+5),qualifier:'',reason:'',remarks:'Passed',remarkMode:'automatic'}))};
 });
}
const bundle=await build({write:false,bundle:true,format:'iife',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';
 import {createRoot} from 'react-dom/client';
 import {createMemoryRouter,RouterProvider} from 'react-router-dom';
 import {ReportEditor} from './src/reports';
 import {ConfigurationProvider} from './src/configuration';
 import {Session} from './src/ui';
 const router=createMemoryRouter([{path:'/reports/:id',element:<ConfigurationProvider><Session.Provider value={{user:{name:'Fixture Analyst',email:'fixture@example.invalid',role:window.__role},demo:false}}><div className="app app-workspace"><div className="main-wrapper"><div className="workspace-content"><main className="route-stage"><ReportEditor/></main></div></div></div></Session.Provider></ConfigurationProvider>}],{initialEntries:['/reports/acc-fixture']});
 createRoot(document.getElementById('root')).render(<RouterProvider router={router}/>);
 `}});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
await mkdir('output/playwright',{recursive:true});
async function open(width,{role='analyst',single=false,height=1000,theme='light',missing=false,category,fixtureDrafts}={}){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('dialog',async dialog=>{errors.push('Unexpected dialog: '+dialog.message());await dialog.dismiss();});
 await page.route('**/*',route=>route.abort());
 await page.setContent('<html data-theme="light"><body><div id="root"></div></body></html>');
 await page.evaluate(({drafts,config,role,single,theme,missing})=>{
  config.value.general.theme=theme;
  window.__role=role;window.__drafts=structuredClone(drafts);window.__requests=[];window.__downloads=[];window.__failGeneration=false;window.__failSave=false;
  document.addEventListener('click',event=>{const link=event.target.closest?.('a[download]');if(link){window.__downloads.push(link.getAttribute('href'));event.preventDefault();}},true);
  if(single)window.__drafts=[{...window.__drafts[0],environmentalSession:undefined}];
  if(missing)window.__drafts[0].results[0]={...window.__drafts[0].results[0],state:'not_tested',value:'',remarks:''};
  window.fetch=async(input,init={})=>{
   const path=String(input).replace(/^\/api/,''),method=init.method||'GET',body=init.body?JSON.parse(init.body):undefined;
   window.__requests.push({path,method,body});
   const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
   if(path==='/configuration')return response(config);
   if(path==='/references?scope=templates')return response({templates:[],documents:[]});
   if(path.endsWith('/report-details'))return response({optionalFields:[{key:'batchSize',label:'Batch size'},{key:'batch.size',label:'Batch size (legacy alias)'},{key:'fillVolume',label:'Fill volume'},{key:'manufactureDate',label:'Date manufactured'},{key:'expiryDate',label:'Expiry date'},{key:'temperature',label:'Temperature'},{key:'relativeHumidity',label:'Relative humidity'},{key:'page',label:'Page number'},{key:'requestedBy',label:'Requested by'}],incompleteCC:[]});
   if(path.endsWith('/generate-session')||path.endsWith('/generate')){
    if(window.__failGeneration)return response({error:'Fixture generator unavailable'},503);
    const files=window.__drafts.map((draft,index)=>({id:'file-'+index,name:'fixture-'+index+'.docx',monitoringMethod:draft.environmentalSnapshot?.output.method,resultRevision:draft.revision}));
    return response(path.endsWith('/generate-session')?{complete:true,files,errors:[]}:files[0]);
   }
   if(method==='PUT'){
    if(window.__failSave)return response({error:'Fixture save unavailable'},503);
    if(path.endsWith('/session')){
     window.__drafts=window.__drafts.map(draft=>{const update=body.changes.find(item=>item.id===draft.id);return {...draft,...update,revision:draft.revision+1};});
     return response(window.__drafts);
    }
    const index=window.__drafts.findIndex(draft=>path==='/drafts/'+draft.id);
    window.__drafts[index]={...window.__drafts[index],...body,revision:window.__drafts[index].revision+1};
    return response(window.__drafts[index]);
   }
   const draft=window.__drafts.find(draft=>path==='/drafts/'+draft.id);
   return draft?response(draft):response({error:'Unexpected fixture endpoint: '+method+' '+path},404);
  };
 },{drafts:fixtureDrafts||(category?[categoryDraft(category)]:drafts),config,role,single,theme,missing});
 for(const css of styles)await page.addStyleTag({content:css});
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.locator('.result-entry-row').first().waitFor();
 return {page,errors};
}
async function value(page,id,value){await page.locator('#'+id).locator('input[type="text"]').first().fill(value);}
async function requests(page){return page.evaluate(()=>window.__requests.filter(request=>request.method!=='GET'));}
async function checkSkippedSwabs(width){
 const {page,errors}=await open(width,{theme:'dark'});
 for(const row of await page.locator('.result-entry-row').all()){
  const zero=row.getByText(/^0 (RLU|cfu\/swab)$/);
  await zero.click();
  assert.equal(await row.locator('input[type="text"]').count(),0);
  await row.getByText('N/A',{exact:true}).click();
  assert.ok(await row.getByRole('radio',{name:'N/A',exact:true}).isChecked());
  assert.equal(await row.locator('input[type="text"]').count(),0);
 }
 const my=page.locator('#spc-fixture-result-row-0');
 await my.getByText('Actual Result',{exact:true}).click();
 await my.locator('input[type="text"]').fill('0');
 assert.ok(await page.getByRole('button',{name:'Next missing result'}).isDisabled());
 await page.getByRole('button',{name:'Generate all DOCX',exact:true}).click();
 await page.waitForFunction(()=>window.__requests.some(request=>request.path.endsWith('/generate-session')));
 const [saved]=await requests(page);
 assert.deepEqual(saved.body.changes.flatMap(change=>change.results.map(r=>[r.test,r.state,r.value,r.reason])),[
  ['ACCUPOINT','not_tested','','N/A'],['MY','entered','0',''],['SPC','not_tested','','N/A']
 ]);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 await page.close();
 console.log(`PASS ${width}px: environmental zero, reversible N/A, and generation payload`);
}
async function checkEvaluationRemarks(width,name){
 const fixture=drafts.map(draft=>({...draft,sample:{...draft.sample,name},specification:{...draft.specification,tests:draft.specification.tests.map(test=>({...test,criterion:'FOR EVALUATION'}))},results:draft.results.map(result=>({...result,remarks:'Failed',remarkMode:'manual'}))}));
 const {page,errors}=await open(width,{fixtureDrafts:fixture});
 assert.equal(await page.locator('.analyst-remarks-field input,.analyst-remarks-field button').count(),0,'evaluation remarks have no entry controls');
 assert.equal(await page.getByText('Tests without a supported acceptance limit require a manual Passed or Failed remark.',{exact:true}).count(),0,'evaluation products do not ask for manual pass/fail remarks');
 assert.deepEqual(await page.locator('.analyst-remarks-field output').allTextContents(),['————','————','————']);
 assert.deepEqual(await page.locator('.overall-analyst-remarks strong').allTextContents(),['FOR EVALUATION','FOR EVALUATION']);
 await value(page,'acc-fixture-result-row-0','125');
 assert.equal(await page.locator('.analyst-remarks-field output').first().innerText(),'————','editing a measured value does not restore pass/fail remarks');
 await page.getByRole('button',{name:'Generate all DOCX',exact:true}).click();
 await page.waitForFunction(()=>window.__requests.some(request=>request.path.endsWith('/generate-session')));
 const writes=(await requests(page)).filter(request=>request.method==='PUT');
 assert.equal(writes.length,1);
 for(const change of writes[0].body.changes){
  assert.ok(change.results.every(result=>result.remarks==='————'));
  assert.equal(change.fields.overallRemarks,'FOR EVALUATION');
  assert.equal(change.fields['overall.remarks'],'FOR EVALUATION');
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'evaluation remarks do not overflow');
 assert.deepEqual(errors,[]);
 if(name==='Herbycin Syrup')await page.screenshot({path:`output/playwright/evaluation-remarks-${width}.png`,fullPage:true});
 await page.close();console.log(`PASS evaluation remarks: ${name}, ${width}px, fixed row and overall remarks, measurements and generation retained`);
}
async function checkDetailPairs(width){
 const {page,errors}=await open(width);
 const details=page.locator('#report-details .report-details');
 await details.locator('.report-optional-details > summary').click();
 for(const [leftLabel,rightLabel] of [['Temperature','Relative humidity'],['Date manufactured','Expiry date'],['Batch size','Fill volume'],['Analysis date','Page number']]){
  const field=(label)=>details.locator('label.field').filter({has:page.getByText(label,{exact:true})}).locator('input');
  const left=field(leftLabel),right=field(rightLabel);
  const leftBox=await left.boundingBox(),rightBox=await right.boundingBox();
  assert.ok(leftBox&&rightBox&&leftBox.x<rightBox.x&&Math.abs(leftBox.y-rightBox.y)<3,`${leftLabel} and ${rightLabel} share a row at ${width}px`);
  await left.fill(leftLabel==='Analysis date'?'11/20/2026':'12');
  await right.fill('15');
  assert.equal(await left.inputValue(),leftLabel==='Analysis date'?'11/20/2026':'12');
  assert.equal(await right.inputValue(),'15');
  await left.focus();await page.keyboard.press('Tab');
  assert.ok(await right.evaluate(element=>element===document.activeElement),'Tab moves to the paired field on the right');
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'paired detail fields avoid overflow');
 await page.screenshot({path:`output/playwright/report-detail-pairs-${width}.png`,fullPage:true});
 assert.deepEqual(errors,[]);await page.close();
 console.log(`PASS paired report details: ${width}px, editable fields, no overflow`);
}
async function checkNumberedSwabs(width){
 const fixture=numberedDrafts(),{page,errors}=await open(width,{fixtureDrafts:fixture});
 const ordered=['#12 Spatula','#13 Drum','Fixture control swab','#14 Drum','#1 Context reference','#15 Pail','#16 Pail','#17 Ladle','#2 Context probe','#18 Beaker','#19 Hook','#20 Rod'];
 for(const draft of fixture){
  const method=page.locator('#method-'+draft.id);
  assert.deepEqual(await method.locator('.result-point-name').allTextContents(),ordered,'surface point labels follow global numeric order while controls and context slots stay intact');
  for(const point of await method.locator('.result-point').all()){
   const rows=point.locator('.result-entry-row');
   if(draft.id==='spc-fixture'){
    assert.deepEqual(await rows.locator('h3').allTextContents(),['SPC','MY']);
    const left=await rows.nth(0).boundingBox(),right=await rows.nth(1).boundingBox();
    assert.ok(left.x<right.x&&Math.abs(left.y-right.y)<3,'SPC stays left of MY after sorting points');
   }
  }
  const first=method.locator('.result-point').first();
  assert.equal(await first.locator('.result-point-name').innerText(),'#12 Spatula');
  for(const row of await first.locator('.result-entry-row').all()){
   const test=await row.locator('h3').innerText();
   await row.locator('input[type="text"]').fill(test==='ACCUPOINT'?'41':test==='SPC'?'42':'43');
  }
 }
 await page.getByRole('button',{name:'Save session',exact:true}).click();
 await page.waitForFunction(()=>window.__requests.some(request=>request.method==='PUT'));
 const writes=await requests(page);assert.equal(writes.length,1);assert.equal(writes[0].path,'/drafts/acc-fixture/session');
 for(const change of writes[0].body.changes){
  const original=fixture.find(draft=>draft.id===change.id);
  const identity=result=>[result.instanceId,result.test,result.location,result.stage,result.replicate,result.channel,result.block,result.unit];
  assert.deepEqual(change.results.map(identity),original.results.map(identity),'saving uses original result-array identity and order rather than displayed point order');
  for(const [index,result] of change.results.entries())assert.equal(result.value,result.location==='#12 Spatula'?result.test==='ACCUPOINT'?'41':result.test==='SPC'?'42':'43':original.results[index].value,'only the displayed Spatula measurements change');
 }
 assert.deepEqual(await page.locator('#method-spc-fixture .result-point-name').allTextContents(),ordered,'saving does not renumber point labels');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`output/playwright/numbered-swab-${width}.png`,fullPage:true});
 assert.deepEqual(errors,[]);await page.close();
 const ordinary=fixture.map(draft=>({...draft,environmentalSnapshot:undefined}));
 const nonsurface=await open(width,{fixtureDrafts:ordinary});
 for(const draft of ordinary)assert.deepEqual(await nonsurface.page.locator('#method-'+draft.id+' .result-point-name').allTextContents(),draft.specification.tests.filter((test,index,tests)=>tests.findIndex(item=>item.location===test.location&&item.stage===test.stage)===index).map(test=>test.location),'numbered non-surface sampling points keep their original order');
 assert.deepEqual(nonsurface.errors,[]);await nonsurface.page.close();
 console.log(`PASS numbered swabs ${width}px: global numeric labels, preserved control/context slots, SPC/MY pairing, correct edited identities, original saved arrays, non-surface order unchanged`);
}
async function checkCategory(category,width){
 const fixture=categoryDraft(category),{page,errors}=await open(width,{category});
 const points=page.locator('.result-point'),point=points.first();
 assert.equal(await points.count(),6,'sampling location, stage, replicate, channel and block each define separate groups');
 assert.equal(await page.locator('.result-single').count(),5,'single assays retain their own sample groups');
 assert.deepEqual(await point.locator('.result-entry-row h3').allTextContents(),['SPC','MY','E. coli finding','Custom numeric assay'],'SPC and MY lead other related numeric and finding assays without changing their labels');
 const sampleBox=await point.locator('.result-point-details').boundingBox(),spcBox=await page.locator('#acc-fixture-result-row-1').boundingBox(),myBox=await page.locator('#acc-fixture-result-row-0').boundingBox();
 assert.ok(sampleBox.x<spcBox.x&&spcBox.x<myBox.x,'sample details, SPC and MY remain left-to-right');
 assert.ok(Math.abs(sampleBox.y-spcBox.y)<3&&Math.abs(spcBox.y-myBox.y)<3,'sample and first assay pair align');
 assert.match(await point.locator('.result-point-details').innerText(),new RegExp('Fixture '+category+' sample'));
 for(const [index,test] of fixture.specification.tests.entries()){
  const row=page.locator('#acc-fixture-result-row-'+index);
  if(test.type==='finding'){
   assert.equal(await row.locator('input[type="text"]').count(),0,'finding assay uses choices');
   await row.locator('.result-toggle-option').filter({hasText:/^Negative$/}).click();
   assert.ok(await row.getByRole('radio',{name:'Negative',exact:true}).isChecked());
  }else{
   assert.equal(await row.locator('input[type="text"]').count(),1,'numeric assay uses a value input');
   if(category==='FG'&&index<2){
    await row.locator('.result-toggle-option').filter({hasText:`Nmt 10 ${test.unit}`}).click();
    assert.ok(await row.getByRole('radio',{name:'Passed',exact:true}).isChecked());
    await row.locator('.result-toggle-option').filter({hasText:'Actual Result'}).click();
   }
   await value(page,'acc-fixture-result-row-'+index,String(index+11));
  }
  if(test.test==='CUSTOM'){
   assert.ok(await row.getByText('Manual choice required · no acceptance limit',{exact:true}).isVisible());
   await row.locator('.analyst-outcome-option').filter({hasText:'Passed'}).click();
   await value(page,'acc-fixture-result-row-'+index,'28');
   assert.ok(await row.getByRole('radio',{name:'Passed',exact:true}).isChecked(),'required manual remark survives numeric edit');
  }
 }
 const date=page.locator('label.field').filter({has:page.locator('span').filter({hasText:/^Analysis date$/})}).locator('input');
 const batch=page.locator('label.field').filter({has:page.locator('span').filter({hasText:/^Batch size/})}).locator('input');
 assert.equal(await date.count(),1);assert.ok(await date.isVisible());
 assert.equal(await batch.count(),1,'optional aliases remain deduplicated outside environmental sessions');
 assert.equal(await batch.isVisible(),false);
 await page.locator('#report-details .report-optional-details > summary').click();await batch.fill('375');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await page.waitForFunction(()=>window.__requests.some(request=>request.method==='PUT'));
 const saved=(await requests(page))[0];
 assert.equal(saved.path,'/drafts/acc-fixture');assert.equal(saved.body.results.length,fixture.results.length);
 const identities=['test','location','stage','replicate','channel','block','instanceId','unit'];
 const identity=result=>Object.fromEntries(identities.map(key=>[key,result[key]]));
 assert.deepEqual(saved.body.results.map(identity),fixture.results.map(identity),'saving preserves all assay instances, sampling identities and units');
 for(const [index,result] of saved.body.results.entries())assert.equal(result.value,index===2?'Negative':index===3?'28':String(index+11));
 assert.equal(saved.body.results[3].remarks,'Passed');assert.equal(saved.body.results[3].remarkMode,'manual');
 assert.equal(saved.body.fields.batchSize,'375');assert.equal(saved.body.fields['batch.size'],'375');
 await point.screenshot({path:`output/playwright/result-entry-${category}-${width}.png`});
 const spc=page.locator('#acc-fixture-result-row-1');
 const overall=page.locator('.overall-analyst-remarks strong');
 assert.equal(await overall.innerText(),'PASSED');
 await value(page,'acc-fixture-result-row-1','100');
 assert.ok(await spc.getByRole('radio',{name:'Failed',exact:true}).isChecked());
 assert.equal(await overall.innerText(),'Failed in SPC');
 await spc.locator('.analyst-outcome-option').filter({hasText:'Passed'}).click();
 await value(page,'acc-fixture-result-row-1','101');
 assert.equal(await overall.innerText(),'PASSED');
 await spc.getByRole('button',{name:'Use automatic remark'}).click();
 assert.equal(await overall.innerText(),'Failed in SPC');
 await value(page,'acc-fixture-result-row-1','42');
 await page.evaluate(()=>{window.__requests=[];});
 await page.getByRole('button',{name:'Generate DOCX',exact:true}).click();
 await page.getByRole('heading',{name:'DOCX generation complete',exact:true}).waitFor();
 const generated=await requests(page);
 assert.deepEqual(generated.map(request=>[request.method,request.path]),[['PUT','/drafts/acc-fixture'],['POST','/drafts/acc-fixture/generate']]);
 assert.equal(generated[0].body.results[1].value,'42');assert.equal(generated[1].body.revision,3);
 assert.equal(await page.getByRole('dialog').count(),0);
 assert.deepEqual(await page.evaluate(()=>window.__downloads),['/api/files/file-0/download']);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'all-category result entry has no horizontal overflow');
 assert.deepEqual(errors,[]);await page.close();
 console.log(`PASS ${category} ${width}px: sample/SPC/MY columns, numeric/finding/custom assays, independent instances, manual remarks, optional aliases, save and direct generation`);
}
try{
 for(const name of ['Herbycin Syrup','Herbycin Cooling Mouth Spray','Herbycin Mouth Spray','Dr. Wong’s Apple Drink','Dr. Wong’s Apple Fruit Juice'])for(const width of [1440,390])await checkEvaluationRemarks(width,name);
 for(const width of [1440,390,320])await checkDetailPairs(width);
 for(const width of [1440,390]){
  const {page,errors}=await open(width);
  await page.screenshot({path:`output/playwright/result-entry-${width}.png`,fullPage:true});
  if(process.env.RESULT_ENTRY_SCREENSHOT_ONLY){console.log('SCREENSHOT '+width);await page.close();continue;}
  assert.ok(await page.getByRole('heading',{name:'SPC / MY',exact:true}).isVisible());
  const pair=page.locator('.result-pair:not(.result-single)'),spc=pair.locator('.result-entry-row').filter({has:page.getByRole('heading',{name:'SPC',exact:true})}),my=pair.locator('.result-entry-row').filter({has:page.getByRole('heading',{name:'MY',exact:true})});
  const spcBox=await spc.boundingBox(),myBox=await my.boundingBox();
  const sampleDetails=pair.locator('..').locator('.result-point-details'),sampleBox=await sampleDetails.boundingBox();
  assert.match(await sampleDetails.innerText(),/Sample\s+Fixture tank\s+Fixture swabbing session/);
  assert.ok(sampleBox.x<spcBox.x&&spcBox.x<myBox.x,'sample details, SPC and MY stay in left-to-right columns');
  assert.ok(Math.abs(sampleBox.y-spcBox.y)<3&&Math.abs(spcBox.y-myBox.y)<3,'all three columns start on the same row');
  await pair.locator('..').screenshot({path:`output/playwright/sample-spc-my-${width}.png`});
  const analysisDate=page.locator('label.field').filter({has:page.locator('span').filter({hasText:/^Analysis date$/})}).locator('input');
  assert.equal(await analysisDate.count(),1,'shared analysis date appears once');
  assert.ok(await analysisDate.isVisible(),'required analysis date remains visible');
  const batchSize=page.locator('label.field').filter({has:page.locator('span').filter({hasText:/^Batch size/})}).locator('input');
  const requestedBy=page.locator('label.field').filter({has:page.locator('span').filter({hasText:/^Requested by$/})}).locator('input');
  assert.equal(await batchSize.count(),1,'shared aliases render one canonical field');
  assert.equal(await requestedBy.count(),1,'shared optional metadata appears once');
  assert.equal(await batchSize.isVisible(),false,'optional metadata starts collapsed');
  assert.equal(await requestedBy.isVisible(),false);
  const additional=page.locator('#report-details .report-optional-details > summary');
  await additional.click();
  await batchSize.fill('250');await requestedBy.fill('Fixture requester');
  assert.equal(await batchSize.getAttribute('aria-required'),null,'optional aliases remain optional');
  await additional.click();assert.equal(await batchSize.isVisible(),false);
  await additional.click();
  assert.equal(await batchSize.inputValue(),'250','optional metadata survives collapse and expand');
  assert.equal(await requestedBy.inputValue(),'Fixture requester');
  await page.screenshot({path:`output/playwright/result-entry-optional-${width}.png`,fullPage:true});
  await value(page,'acc-fixture-result-row-0','22');
  await value(page,'spc-fixture-result-row-1','44');
  await analysisDate.fill('11/21/2026');
  const mic=page.locator('label.field').filter({has:page.locator('span').filter({hasText:/^Mic$/i})}).locator('input');
  assert.equal(await mic.count(),2,'each method has its own MIC');
  for(const summary of await page.locator('.method-report-details > summary').all())await summary.click();
  await mic.nth(0).fill('MIC-ACC-EDIT');await mic.nth(1).fill('MIC-SPC-EDIT');
  await page.getByRole('button',{name:'Save session',exact:true}).click();
  await page.waitForFunction(()=>window.__requests.some(request=>request.method==='PUT'&&request.path.endsWith('/session')));
  assert.ok(await page.getByRole('button',{name:'Save session',exact:true}).isDisabled());
  const saved=(await requests(page)).filter(request=>request.method==='PUT');
  assert.equal(saved.length,1,'one atomic session save');assert.equal(saved[0].path,'/drafts/acc-fixture/session');
  const byId=Object.fromEntries(saved[0].body.changes.map(draft=>[draft.id,draft]));
  assert.equal(byId['acc-fixture'].results[0].value,'22');assert.equal(byId['spc-fixture'].results.find(result=>result.test==='SPC').value,'44');
  assert.equal(byId['acc-fixture'].fields.analysisDate,'11/21/2026');assert.equal(byId['spc-fixture'].fields.analysisDate,'11/21/2026');
  assert.equal(byId['acc-fixture'].fields.mic,'MIC-ACC-EDIT');assert.equal(byId['spc-fixture'].fields.mic,'MIC-SPC-EDIT');
  for(const draft of Object.values(byId)){
   assert.equal(draft.fields.batchSize,'250');assert.equal(draft.fields['batch.size'],'250','canonical edit updates every shared batch alias');
   assert.equal(draft.fields.requestedBy,'Fixture requester');assert.equal(draft.fields['requested.by'],'Fixture requester');
  }
  assert.equal(await batchSize.inputValue(),'250','optional metadata persists after saving');
  const acc=page.locator('#acc-fixture-result-row-0');
  await acc.locator('.analyst-outcome-option').filter({hasText:'Failed'}).click();
  await value(page,'acc-fixture-result-row-0','23');
  assert.ok(await acc.getByRole('radio',{name:'Failed',exact:true}).isChecked(),'manual analyst override survives a value edit');
  await acc.getByRole('button',{name:'Use automatic remark',exact:true}).click();
  assert.ok(await acc.getByRole('radio',{name:'Passed',exact:true}).isChecked(),'automatic remark returns from current measurement');
  await page.evaluate(()=>{window.__requests=[];});
  await page.getByRole('button',{name:'Generate all DOCX',exact:true}).click();
  await page.getByRole('heading',{name:'DOCX generation complete',exact:true}).waitFor({timeout:5000}).catch(async error=>{console.log(JSON.stringify({errors,requests:await requests(page),alerts:await page.getByRole('alert').allTextContents()}));throw error;});
  const generated=await requests(page);
  assert.deepEqual(generated.map(request=>[request.method,request.path]),[['PUT','/drafts/acc-fixture/session'],['POST','/drafts/acc-fixture/generate-session']]);
  assert.deepEqual(generated[1].body.revisions,{'acc-fixture':3,'spc-fixture':3});
  assert.deepEqual(await page.evaluate(()=>window.__downloads),['/api/files/file-0/download','/api/files/file-1/download']);
  assert.equal(await page.getByRole('dialog').count(),0,'DOCX generation is direct');
  await value(page,'acc-fixture-result-row-0','31');
  await page.evaluate(()=>{window.__failGeneration=true;});
  await page.getByRole('button',{name:'Generate all DOCX',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Fixture generator unavailable'}).waitFor();
  assert.equal(await acc.locator('input[type="text"]').first().inputValue(),'31','generation failure retains the entered value');
  await value(page,'acc-fixture-result-row-0','32');
  await page.evaluate(()=>{window.__failSave=true;});
  await page.getByRole('button',{name:'Save session',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Fixture save unavailable'}).waitFor();
  assert.equal(await acc.locator('input[type="text"]').first().inputValue(),'32','save failure retains the dirty buffer');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS ${width}px: all methods, paired SPC/MY, shared and independent details, optional alias deduplication and retained edits, atomic save, direct generation, analyst remarks, no overflow`);
 }
 if(!process.env.RESULT_ENTRY_SCREENSHOT_ONLY){
  const {page,errors}=await open(390,{role:'viewer'});
  assert.ok(await page.getByRole('button',{name:'Generate all DOCX',exact:true}).isDisabled());
  assert.ok(await page.getByRole('button',{name:'Save session',exact:true}).isDisabled());
  assert.equal(await page.locator('.result-entry-row input:not(:disabled),.result-entry-row select:not(:disabled),#report-details input:not(:disabled)').count(),0);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS viewer: measurements and actions disabled');
  const single=await open(1440,{single:true});
  await value(single.page,'acc-fixture-result-row-0','8');
  await single.page.getByRole('button',{name:'Save draft',exact:true}).click();
  await single.page.waitForFunction(()=>window.__requests.some(request=>request.method==='PUT'));
  assert.deepEqual((await requests(single.page)).map(request=>[request.method,request.path]),[['PUT','/drafts/acc-fixture']]);
  assert.deepEqual(single.errors,[]);await single.page.close();console.log('PASS single draft: existing save endpoint retained');
  for(const [width,height,theme] of [[320,600,'light'],[390,600,'dark'],[720,500,'light']]){
   const {page,errors}=await open(width,{height,theme,missing:true});
   await page.getByRole('button',{name:'Next missing result',exact:true}).click();
   const reason=page.getByLabel('Reason not tested',{exact:true});
   assert.ok(await reason.evaluate(element=>element===document.activeElement),'Next missing focuses the untested result');
   await reason.fill('Fixture reason');
   assert.ok(await reason.evaluate(element=>{const box=element.getBoundingClientRect(),footer=document.querySelector('.sticky-actions').getBoundingClientRect();return box.top>=0&&box.bottom<=footer.top;}),'focused input remains above the sticky footer');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow and reflow layouts avoid overflow');
   assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
   await page.screenshot({path:`output/playwright/result-entry-${width}-${theme}.png`,fullPage:true});
   assert.deepEqual(errors,[]);await page.close();
   console.log(`PASS ${width}x${height} ${theme}: untested result focus, footer clearance, no overflow`);
  }
  for(const category of ['WS','RM','SFG','FG','MIS','ST','EM','CUSTOM'])for(const width of [1440,390])await checkCategory(category,width);
  for(const width of [1440,390])await checkNumberedSwabs(width);
  for(const width of [1440,390])await checkSkippedSwabs(width);
 }
}finally{await browser.close();}
