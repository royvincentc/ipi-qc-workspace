import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {db} from './db.js';
import {getConfiguration} from './configuration.js';
import {environmentalProfiles,publishEnvironmentalProfile} from './environmental.js';
import {privatePath,worker} from './reports.js';
import {environmentalKey,processArea,type EnvironmentalOutput} from '../shared/environmental.js';
import {documentContext,environmentalProductKey} from '../shared/environmental-routing.js';
import type {Template} from '../shared/model.js';

const actor='system:bouquet-spatula';
const referenceId='bouquet-compounding-spatula-cyi48';
const criteria={ACCUPOINT:'NMT 100 RLU',SPC:'NMT 100 cfu/mL',MY:'NMT 30 cfu/mL'} as const;
const sourceRows={ACCUPOINT:'Accupoint Table 1, row 3',SPC:'SPCMY Table 1, row 3',MY:'SPCMY Table 1, row 5'};
const effectiveFrom='2026-09-28';

export async function seedBouquetSpatula(){
 const {value:config}=await getConfiguration();
 const products=config.products.filter(p=>p.active&&!documentContext(p.name)&&environmentalProductKey(p.name)==='cheersbabyoilbouquet'&&config.sampleTypes.some(t=>t.id===p.category&&t.active&&t.register==='environmental'));
 if(!products.length)return;
 const profiles=await environmentalProfiles();
 const layouts=(await db.query('SELECT data FROM templates')).rows.map(row=>row.data as Template);
 for(const product of products){
  const scope=profiles.filter(p=>p.productId===product.id&&p.category===product.category&&environmentalKey(p.facility)==='pf2'&&processArea(p.area)==='compounding'&&['','regular'].includes(environmentalKey(p.context)));
  if(scope.some(p=>p.evidenceIds.includes(referenceId)))continue;
  const current=scope.filter(p=>p.active&&(!p.effectiveTo||p.effectiveTo>=effectiveFrom));
  const surface=current.flatMap(p=>p.outputs.filter(o=>o.mode==='surface'));
  const spatula=surface.flatMap(o=>o.instances).filter(row=>/^spatula(?:\s+\d+)?$/i.test(row.location));
  if(Object.keys(criteria).every(test=>spatula.some(row=>row.test===test)))continue;
  const tanks=current.filter(p=>p.outputs.some(o=>o.mode==='surface'&&o.instances.some(row=>/^mixing tank(?:\s+\d+)?$/i.test(row.location))));
  const areaTypes=[...new Set(tanks.map(p=>environmentalKey(p.areaType||'')))];
  if(areaTypes.length>1)throw new Error(`${product.name} has multiple Mixing Tank area types. Confirm the Spatula area type.`);
  const outputs:EnvironmentalOutput[]=[];
  for(const [method,tests] of [['accupoint',['ACCUPOINT']],['spc-my',['SPC','MY']]] as const){
   if(tests.every(test=>spatula.some(row=>row.test===test)))continue;
   if(tests.some(test=>spatula.some(row=>row.test===test)))throw new Error(`${product.name} has an incomplete approved ${method} Spatula definition. Reconcile it before adding another.`);
   const matching=surface.filter(o=>o.method===method);
   const approved=layouts.filter(t=>t.category===product.category&&t.verified&&t.active!==false&&(matching.length
    ?matching.every(o=>o.templateId===t.id&&o.templateRevision===t.revision)
    :t.family==='environmental-grouped-5c'));
   if(approved.length!==1)throw new Error(`${product.name} requires one compatible approved ${method} layout.`);
   const layout=approved[0];
   outputs.push({id:method,method,name:method==='accupoint'?'ACCUPOINT':'SPCMY',mode:'surface',templateId:layout.id,templateRevision:layout.revision,
    instances:tests.map(test=>({test,label:config.tests.find(t=>t.id===test)?.reportLabel||test,location:'Spatula',stage:'',replicate:'',block:'tests',type:'numeric',
     unit:test==='ACCUPOINT'?'RLU':'cfu/mL',criterion:criteria[test],source:referenceId,sourceLocation:sourceRows[test],date:test==='ACCUPOINT'?'2026-09-25':effectiveFrom,dateBasis:'analysis',revision:referenceId}))});
  }
  const file=`references/${referenceId}.docx`,target=privatePath(file);
  await mkdir(path.dirname(target),{recursive:true});
  await writeFile(target,await readFile(new URL('./evidence/bouquet-compounding-spatula.docx',import.meta.url)));
  const evidence=await worker(['inventory','--input',target]);
  await db.query('INSERT INTO files(id,data) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[referenceId,JSON.stringify({id:referenceId,kind:'reference',name:'Bouquet Compounding Spatula · CYI48 evidence excerpt.docx',path:file,evidence,createdAt:new Date().toISOString()})]);
  await publishEnvironmentalProfile({name:`${product.name} · Compounding Spatula`,productId:product.id,product:product.name,category:product.category,
   facility:'PF2',area:'Compounding',areaType:tanks.length?tanks[0].areaType:'Oils',context:'Regular',equipmentSet:'Compounding Spatula',effectiveFrom,evidenceIds:[referenceId],outputs},actor);
 }
}
