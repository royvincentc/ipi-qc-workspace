/** Sync the complete stored report list, independent of library filters and pagination. */
export async function syncPendingReports(reports:{id:string;name:string;driveId?:string}[],sync:(id:string)=>Promise<unknown>){
 const result={synced:0,skipped:0,failed:[] as {id:string;name:string;error:string}[]};
 for(const report of reports){
  if(report.driveId){result.skipped++;continue;}
  try{await sync(report.id);result.synced++;}
  catch(error){result.failed.push({id:report.id,name:report.name,error:error instanceof Error?error.message:String(error)});}
 }
 return result;
}
