// Defaults below come from the 2026 OOS/MLIR archive (most common value per parameter).
export const oosParameters=[
 {name:'SPC',specification:'Nmt 100 cfu/mL',retestDays:2},
 {name:'M&Y',specification:'Nmt 10 cfu/mL',retestDays:7},
 {name:'P. aeruginosa',specification:'Negative',retestDays:2},
 {name:'E. coli',specification:'Negative',retestDays:2},
] as const;
export const oosTypes=['FG','SFG','RM','ST','MIS'] as const;
export const oosDocuments=['alert notice','phase 1','phase 2'] as const;

export type OosForm={product:string;shortName:string;fill:string;batch:string;type:string;number:string;parameter:string;result:string;specification:string;
 dateObserved:string;dateRetest:string;includedProducts:string;analyst:string;analystAbbrev:string};

export const oosParameter=(name:string)=>oosParameters.find(p=>p.name.toLowerCase()===name.trim().toLowerCase());
export function addDays(iso:string,days:number){const d=new Date(iso+'T00:00:00Z');if(Number.isNaN(d.getTime()))return '';d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export const usDate=(iso:string)=>{const [y,m,d]=iso.split('-');return `${m}/${d}/${y}`;};
const words=(text:string)=>text.split(/[\s-]+/).filter(w=>/^\p{L}/u.test(w));
// "Omega Pain Killer Liniment - 120 mL" -> OPKL, matching the archive's short names.
export const shortProductName=(product:string)=>words(product.split(/\s+-\s+|\(/)[0]).map(w=>w[0].toUpperCase()).join('');
export const productFill=(product:string)=>product.match(/\d+(?:\.\d+)?\s*(?:mL|ml|L|g|kg)\b/)?.[0]||'';
// Archive file names use these instead of initials.
const knownAbbreviations:Record<string,string>={'roy vincent codiñera':'ROY','ahrianne b. canoy':'AFC'};
// Middle initials are dropped when a name has more than three parts: "James Bryle A. Goloran" -> JBG.
export function analystAbbreviation(name:string){const known=knownAbbreviations[name.trim().toLowerCase()];if(known)return known;let parts=words(name);if(parts.length>3)parts=parts.filter(w=>!w.endsWith('.'));return parts.map(w=>w[0].toUpperCase()).join('');}

export function oosValues(f:OosForm):Record<string,string>{
 const year=f.dateObserved.slice(0,4),number=f.number.trim().padStart(3,'0');
 return {SampleCompleteName:f.product.trim(),batchNo:f.batch.trim(),dateDeviation:usDate(f.dateObserved),includedProducts:f.includedProducts.trim()||'N/A',
  analyst:f.analyst.trim(),type:f.type,year,number,parameter:f.parameter.trim(),result:f.result.trim(),Specification_of_Parameter:f.specification.trim(),
  incBatchNo:f.batch.trim(),incStatus:'FAILED',incParameter:f.parameter.trim(),incResult:f.result.trim(),calculated_dateDeviation:usDate(f.dateRetest)};
}
export function oosFileName(f:OosForm,document:typeof oosDocuments[number]){
 const v=oosValues(f);
 return `${v.type}-${v.year}-${v.number} ${f.shortName} ${f.fill} - ${v.batchNo} ${v.parameter} (${f.analystAbbrev.trim()}) ${document}.docx`.replace(/[<>:"/\\|?*\u0000-\u001f]+/g,'_').replace(/\s+/g,' ');
}
