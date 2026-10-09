const folders:Record<string,string>={SFG:'SFG',FG:'FG',ST:'STAB',STAB:'STAB',MIS:'MISC',MISC:'MISC',EM:'ENVI',ENVI:'ENVI',RM:'RM',WS:'WATER'};
export function reportArchiveAnalyst(file:{reportAnalyst?:string},pinned?:{fields?:Record<string,string>;sample?:{fields?:Record<string,string>};resultSource?:{analyst?:string}}){
 const analyst=[file.reportAnalyst,pinned?.fields?.analyst,pinned?.fields?.micAnalyst,pinned?.sample?.fields?.analyzedBy,pinned?.sample?.fields?.analyst,pinned?.resultSource?.analyst].find(value=>typeof value==='string'&&value.trim());
 if(!analyst)throw new Error('The report Analyzed by name is missing. Open its saved draft before organizing it.');
 return analyst.trim();
}
export function reportArchiveSegments(file:{reportAnalyst:string;category:string;createdAt:string},timezone:string){
 const category=folders[file.category];if(!category)throw new Error('The report sample type could not be resolved. Open its saved draft before organizing it.');
 const date=new Date(file.createdAt);if(!Number.isFinite(date.getTime()))throw new Error('The report creation date is invalid. Contact an administrator.');
 const parts=new Intl.DateTimeFormat('en',{timeZone:timezone,year:'numeric',month:'2-digit'}).formatToParts(date);
 const analyst=file.reportAnalyst.replace(/[\\/:*?"<>|]+/g,'-').trim();
 if(!analyst)throw new Error('The report Analyzed by name is missing. Open its saved draft before organizing it.');
 return [analyst,parts.find(p=>p.type==='year')!.value,category,parts.find(p=>p.type==='month')!.value];
}
