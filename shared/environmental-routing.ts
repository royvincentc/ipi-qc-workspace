/** Cosmetic name variations only; meaningful product variants remain in the key. */
export function environmentalProductName(name:string){
 return name.normalize('NFKC').trim().replace(/\s*[-(]\s*(?:pilot|demo|process validation|reprocess|trial)\s*\d*\s*\)?$/i,'').replace(/\s*[-(]\s*(?:for\s+)?(?:compounding(?:\s+(?:tanks|utensils|utesils))?|filling|filliing|weighing|tanks|utensils|utesils)\s*\)?$/i,'').replace(/^OPK\s*(?=[- (]|Export)/i,'Omega Pain Killer Liniment ').trim();
}
export const environmentalProductKey=(name:string)=>environmentalProductName(name).toLowerCase().replace(/[’'`]/g,'').replace(/[^a-z0-9]/g,'');
export function environmentalVariant(name:string){return (environmentalProductName(name).toLowerCase().match(/\bpro\b|\bexport\b|\bchina\b|old\s*specs|new\s*specs|\([gp]\)|\bbouquet\b|\bflorabelle\b/g)||[]).map(v=>v.replace(/\s/g,'')).sort().join('|');}
export function documentFacility(area:string){const facilities=[...new Set([...(area.match(/\bPF\s*[-]?\s*\d+\b/gi)||[]).map(v=>v.replace(/[\s-]/g,'').toUpperCase()),...(/\bwater\s+treatment\b/i.test(area)?['WATER TREATMENT']:[]),...(area.match(/\bwarehouse\s+\d+\b/gi)||[]).map(v=>v.replace(/\s+/g,' ').toUpperCase())])];return facilities.length===1?facilities[0]:'';}
export function documentContext(product:string){const match=product.match(/\b(Pilot|Demo|Trial|Process Validation|Reprocess)\b/i);return match?({pilot:'Pilot',demo:'Demo',trial:'TRIAL','process validation':'Process Validation',reprocess:'Reprocess'}[match[1].toLowerCase()]||''):'';}
/** Parenthetical Area description is report metadata, not a testing context. */
export function environmentalAreaType(area:string){return [...area.matchAll(/\(([^()]*)\)/g)].map(m=>m[1].trim().replace(/\s+/g,' ')).filter(Boolean).join(' · ');}
