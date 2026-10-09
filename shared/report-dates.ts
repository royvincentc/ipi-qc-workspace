/** A month-only date represents a range; it never implies a particular day. */
export function reportDateRange(value:string,format='en-PH',allowMonth=false):{start:number;end:number}|undefined{
 const text=value.trim();
 const monthOnly=allowMonth?text.match(/^(\d{1,2})\/(\d{4})$/):null;
 const iso=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
 const full=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(!monthOnly&&!iso&&!full)return undefined;
 const [year,month,day]=monthOnly?[Number(monthOnly[2]),Number(monthOnly[1]),1]:iso?[Number(iso[1]),Number(iso[2]),Number(iso[3])]:format==='en-GB'?[Number(full![3]),Number(full![2]),Number(full![1])]:[Number(full![3]),Number(full![1]),Number(full![2])];
 if(year<1||month<1||month>12||day<1)return undefined;
 const date=new Date(0);date.setUTCFullYear(year,month-1,day);date.setUTCHours(0,0,0,0);
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return undefined;
 const start=date.getTime();
 if(monthOnly){date.setUTCFullYear(year,month,1);return {start,end:date.getTime()-1};}
 return {start,end:start};
}
