import {writeFile} from 'node:fs/promises';
import path from 'node:path';
if(process.env.DEMO_MODE!=='true'||path.resolve(process.env.DEMO_DB_PATH||'')!==path.resolve('.data/environmental-local-setup'))throw new Error('Use the environmental local demo database explicitly.');
const {db,close}=await import('../server/db.js');
const {previewEnvironmentalBatch,publishEnvironmentalBatch,approveEnvironmentalAliases}=await import('../server/environmental-batch.js');
try{
 const id=process.argv[2];if(!id)throw new Error('Supply the prepared archive ID.');
 if(process.argv.includes('--approve-aliases')){const aliases=await approveEnvironmentalAliases(id,'owner-authorized-local-alias-approval');await writeFile('output/environmental-automation-review/automatic-product-aliases.json',JSON.stringify(aliases,null,2));console.log(JSON.stringify({aliasesApproved:aliases.aliases.length,heldNames:aliases.held.length}));}
 const templates=(await db.query('SELECT data FROM templates')).rows.map(r=>r.data),layouts:Record<string,string>={};
 for(const family of ['environmental-grouped-5c','environmental-gip-4c','environmental-water-4c','environmental-warehouse-phase-air-7c']){const matches=templates.filter(t=>t.family===family&&t.verified&&t.active!==false);if(matches.length===1)layouts[family]=matches[0].id;}
 const rules={facility:'',context:'',criterionDate:'',effectiveFrom:'',createProducts:true,unchanged:true,layouts};
 const preview=await previewEnvironmentalBatch(id,rules),selected=preview.proposals.filter(p=>!p.issues.length&&!p.published).map(p=>p.key);
 const counts:Record<string,number>={};for(const p of preview.proposals)for(const issue of p.issues)counts[issue]=(counts[issue]||0)+1;
 const summary={documents:preview.documents,proposals:preview.proposals.length,ready:selected.length,published:preview.proposals.filter(p=>p.published).length,issues:counts,documentExceptions:preview.exceptions.length};
 await writeFile('output/environmental-automation-review/live-context-pattern-preview.json',JSON.stringify({rules,summary,preview},null,2));console.log(JSON.stringify(summary));
 if(process.argv.includes('--publish')&&selected.length){const results=await publishEnvironmentalBatch(id,rules,selected,preview.configurationRevision,'owner-authorized-local-publication');await writeFile('output/environmental-automation-review/local-pattern-publication.json',JSON.stringify(results,null,2));console.log(JSON.stringify({results:results.results.map(r=>({name:r.name,status:r.status,...('message' in r?{message:r.message}: {})}))}));}
}finally{await close();}
