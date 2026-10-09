const folders:Record<string,string>={SFG:'SFG',FG:'FG',ST:'STAB',STAB:'STAB',MIS:'MISC',MISC:'MISC',EM:'ENVI',ENVI:'ENVI',RM:'RM',WS:'WATER'};
export function reportArchiveSegments(file:{analystEmail:string;analystName:string;category:string;createdAt:string},timezone:string){
 const category=folders[file.category];if(!category)throw new Error('The report sample type could not be resolved. Open its saved draft before organizing it.');
 const date=new Date(file.createdAt);if(!Number.isFinite(date.getTime()))throw new Error('The report creation date is invalid. Contact an administrator.');
 const parts=new Intl.DateTimeFormat('en',{timeZone:timezone,year:'numeric',month:'2-digit'}).formatToParts(date);
 const analyst=file.analystName.replace(/[\\/:*?"<>|]+/g,'-').trim()||file.analystEmail;
 return [`${analyst} (${file.analystEmail})`,parts.find(p=>p.type==='year')!.value,category,parts.find(p=>p.type==='month')!.value];
}
