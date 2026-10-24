import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='tmp/redesign-review/workspace-films';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference',recordVideo:{dir:out,size:{width:1440,height:1000}}});
await context.addInitScript(()=>localStorage.setItem('ipi.reception.motion','on'));
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const checks=[];
const motifSets={
  home:['specimen','culture','microscopy'],
  new:['pipette','specimen','barcode'],
  samples:['rack','barcode','logbook'],
  worksheet:['pipette','wells','incubator'],
  reports:['plot','document','folios'],
  library:['book','folios','method'],
  shared:['board','links','branch'],
  assistant:['search','method','citations'],
  settings:['sliders','key','calibration'],
};
const seenMotifSets=new Set();
const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow');
const svg=()=>page.locator('.workflow-film-art svg').innerHTML();
const artSize=async()=>{
  assert.equal(await page.locator('.workflow-film-art text,.workflow-film-copy').count(),0,'artwork has no captions');
  for(const motif of await page.locator('.workflow-film-art [data-lab-study]').all()){
    const bounds=await motif.boundingBox();
    assert.ok(bounds&&bounds.height>=50,`${await motif.getAttribute('data-lab-study')}: artwork remains at least 50px tall`);
  }
};
for(const [route,chapter] of [['/','home'],['/new','new'],['/samples','samples'],['/worksheet','worksheet'],['/reports','reports'],['/library','library'],['/shared','shared'],['/assistant','assistant'],['/settings','settings']]){
  await page.goto(`http://127.0.0.1:5174${route}`);
  await page.locator(`.workflow-film[data-chapter="${chapter}"]`).waitFor();
  await page.waitForTimeout(750);
  const motifs=await page.locator('.workflow-film-art [data-lab-study]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-lab-study')));
  assert.deepEqual(motifs,motifSets[chapter],`${chapter}: route motifs visible`);
  seenMotifSets.add(JSON.stringify([...motifs].sort()));
  const before=await svg();
  await page.waitForTimeout(180);
  assert.notEqual(await svg(),before,`${chapter}: advancing frames`);
  await overflow();
  await artSize();
  await page.screenshot({path:`${out}/${chapter}-desktop.png`});
  await page.getByRole('button',{name:'Pause workspace motion',exact:true}).click();
  await page.waitForTimeout(90);
  const still=await svg();
  await page.waitForTimeout(150);
  assert.equal(await svg(),still,`${chapter}: pause freezes film`);
  await page.getByRole('button',{name:'Play workspace motion',exact:true}).click();
  await page.getByRole('button',{name:'Replay workspace scene',exact:true}).click();
  const replayed=await svg();
  await page.waitForTimeout(180);
  assert.notEqual(await svg(),replayed,`${chapter}: replay continues animating`);
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(400);
  await overflow();
  await artSize();
  await page.screenshot({path:`${out}/${chapter}-mobile.png`});
  await page.setViewportSize({width:1440,height:1000});
  checks.push(`${chapter}: live frames, pause, replay, desktop/mobile overflow`);
}
assert.equal(seenMotifSets.size,9,'all nine routes have unique motif sets');
await page.goto('http://127.0.0.1:5174/new');
await page.getByRole('button',{name:'Batch entry',exact:true}).click();
await page.waitForTimeout(100);
assert.equal(await page.getByRole('button',{name:'Batch entry',exact:true}).getAttribute('aria-pressed'),'true');
await page.getByRole('button',{name:'One sample',exact:true}).click();
await page.getByRole('button',{name:/Finished Goods/}).filter({hasText:/^Finished Goods/}).click();
const field=page.locator('input[type=text]').filter({visible:true}).first();
// Draft-preservation check uses a local field only; nothing is submitted.
await field.fill('Motion review draft');
await page.getByRole('button',{name:'Replay workspace scene',exact:true}).click();
await page.getByRole('button',{name:'Pause workspace motion',exact:true}).click();
assert.equal(await field.inputValue(),'Motion review draft');
page.once('dialog',dialog=>dialog.accept());
await page.locator('.workspace-tabs a[href="/samples"]').click();
await page.getByRole('button',{name:'Play workspace motion',exact:true}).waitFor();
assert.equal(await page.evaluate(()=>localStorage.getItem('ipi.reception.motion')),'off');
checks.push('intake mode and draft preserved; global preference carries through client navigation');
await page.getByRole('button',{name:'Play workspace motion',exact:true}).click();
await page.emulateMedia({reducedMotion:'reduce'});
await page.getByRole('button',{name:'System reduced motion is on',exact:true}).waitFor();
assert.equal(await page.getByRole('button',{name:'Replay workspace scene',exact:true}).isDisabled(),true);
const reduced=await svg();await page.waitForTimeout(200);assert.equal(await svg(),reduced);
checks.push('reduced motion stays still and disables replay');
await page.emulateMedia({reducedMotion:'no-preference'});
await page.locator('.utility-nav a[href="/shared"]').click();
await page.locator('.shared-tools').waitFor();
const sharedTabs=page.locator('.shared-tools .tabs button');
for(let index=0;index<await sharedTabs.count();index++){await sharedTabs.nth(index).click();await page.waitForTimeout(80);}
checks.push('shared tool tabs remain interactive');
await page.goto('http://127.0.0.1:5174/settings');
await page.locator('.settings-nav button').first().waitFor();
for(const label of ['Appearance','Connections','People','Activity']){
  const target=page.locator('.settings-nav button').filter({hasText:label}).first();
  if(await target.count()){await target.click();await page.waitForTimeout(200);}
}
checks.push('settings sections remain interactive');
await page.goto('http://127.0.0.1:5174/assistant');
await page.waitForTimeout(900);
await page.screenshot({path:`${out}/assistant-final.png`});
assert.deepEqual(errors,[]);
await context.close();await browser.close();
await writeFile(`${out}/checks.json`,JSON.stringify({checks,errors},null,2));
console.log(JSON.stringify({checks,errors},null,2));
