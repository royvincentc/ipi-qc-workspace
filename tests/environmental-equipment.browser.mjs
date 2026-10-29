import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

const main=await readFile(new URL('../src/main.tsx',import.meta.url),'utf8');
const styles=await Promise.all([...main.matchAll(/import '\.\/(.*?\.css)'/g)].map(match=>readFile(new URL('../src/'+match[1],import.meta.url),'utf8')));
const bundle=await build({write:false,bundle:true,format:'iife',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React,{useState} from 'react';
 import {createRoot} from 'react-dom/client';
 import {EnvironmentalEquipment} from './src/environmental-equipment';
 const parameters=[{method:'accupoint',test:'ACCUPOINT',label:'Accupoint',criterion:'Nmt 100 RLU',unit:'RLU'},{method:'spc-my',test:'SPC',label:'SPC',criterion:'Nmt 100 cfu/mL',unit:'cfu/mL'},{method:'spc-my',test:'MY',label:'MY',criterion:'Nmt 30 cfu/mL',unit:'cfu/mL'}];
 const catalog={revision:'fixture',profileId:'tank-only',items:[{id:'mixing tank',name:'Mixing Tank',defaultQuantity:1,parameters},{id:'spatula',name:'Spatula',defaultQuantity:0,parameters},{id:'unapproved',name:'Incomplete definition',defaultQuantity:0,parameters:[],issue:'Missing approved Accupoint definition'}]};
 function Fixture(){const [value,setValue]=useState([{id:'mixing tank',quantity:1}]);return <div className="app app-workspace"><div className="main-wrapper"><div className="workspace-content"><main className="route-stage"><div className="reports-workbench"><section className="panel padded"><EnvironmentalEquipment catalog={catalog} value={value} disabled={false} onChange={setValue}/><output id="selection" hidden>{JSON.stringify(value)}</output></section></div></main></div></div></div>;}
 createRoot(document.getElementById('root')).render(<Fixture/>);
 `}});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>route.abort());
  await page.setContent('<html data-theme="dark"><body><div id="root"></div></body></html>');
  for(const css of styles)await page.addStyleTag({content:css});
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.getByRole('checkbox',{name:/Mixing Tank/}).waitFor();
  assert.equal(await page.getByRole('checkbox',{name:/Spatula/}).count(),0);
  await page.getByText('Add equipment manually',{exact:true}).click();
  await page.getByLabel('Equipment to add').selectOption('unapproved');
  await page.getByRole('status').filter({hasText:'Missing approved Accupoint definition'}).waitFor();
  assert.ok(await page.getByRole('button',{name:'Add equipment',exact:true}).isDisabled());
  await page.getByLabel('Equipment to add').selectOption('spatula');
  const quantity=page.getByLabel('Quantity to add');
  await quantity.fill('1.5');assert.ok(await page.getByRole('button',{name:'Add equipment',exact:true}).isDisabled());
  await quantity.fill('301');assert.ok(await page.getByRole('button',{name:'Add equipment',exact:true}).isDisabled());
  await quantity.fill('1');await page.getByRole('button',{name:'Add equipment',exact:true}).click();
  assert.ok(await page.getByRole('checkbox',{name:/Spatula/}).isChecked());
  assert.equal(await page.getByLabel('Spatula quantity',{exact:true}).inputValue(),'1');
  const selection=JSON.parse(await page.locator('#selection').textContent());
  assert.deepEqual(selection,[{id:'mixing tank',quantity:1},{id:'spatula',quantity:1}]);
  assert.equal(await page.getByLabel('Equipment to add').locator('option[value="spatula"]').count(),0);
  assert.equal(await page.getByLabel('Equipment to add').locator('option[value="unapproved"]').evaluate(option=>option.disabled),false,'discovered equipment remains selectable so its approval issue can be read');
  await page.getByRole('button',{name:'Increase Spatula quantity',exact:true}).click();
  assert.equal(await page.getByLabel('Spatula quantity',{exact:true}).inputValue(),'2');
  await page.getByRole('button',{name:'Reduce Spatula quantity',exact:true}).click();
  await page.getByText('Edit equipment point labels',{exact:false}).click();
  await page.getByRole('group',{name:'Spatula',exact:true}).getByRole('textbox').fill('Spatula A');
  assert.deepEqual(JSON.parse(await page.locator('#selection').textContent())[1].labels,['Spatula A']);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  assert.deepEqual(errors,[]);
  await mkdir('output/playwright',{recursive:true});
  await page.screenshot({path:`output/playwright/manual-equipment-${width}.png`,fullPage:true});
  await page.close();console.log(`PASS ${width}px: manual addition, quantity validation, duplicate prevention, labels, no overflow`);
 }
}finally{await browser.close();}
