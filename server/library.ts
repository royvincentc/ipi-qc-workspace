import {db,setting,audit} from './db.js';
import {google} from './google.js';
import {googleId} from './domain.js';
import {defaultConnections} from './samples.js';

const folderMime='application/vnd.google-apps.folder';

export async function syncDriveLibrary(actor:string){
 const connections=await setting('connections',defaultConnections);
 const roots=[...new Set(connections.folders.map((url:string)=>googleId(url,'folder')))];
 const seenFiles=new Set<string>();
 const visitedFolders=new Set<string>();
 const queue=roots.map(id=>({id,rootFolderId:id}));

 while(queue.length){
  const {id:folder,rootFolderId}=queue.shift()!;
  if(visitedFolders.has(folder))continue;
  visitedFolders.add(folder);
  let pageToken='';
  do{
   const params=new URLSearchParams({
    q:`'${folder}' in parents and trashed = false`,
    fields:'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,parents,capabilities(canDownload))',
    pageSize:'100',
    ...(pageToken?{pageToken}:{}),
   });
   const page=await google<any>(`https://www.googleapis.com/drive/v3/files?${params}`);
   for(const item of page.files||[]){
    if(item.mimeType===folderMime){queue.push({id:item.id,rootFolderId});continue;}
    seenFiles.add(item.id);
    const data={
     id:`drive-${item.id}`,
     driveId:item.id,
     name:item.name,
     kind:'library',
     sourceUrl:item.webViewLink,
     modifiedAt:item.modifiedTime,
     mimeType:item.mimeType,
     parents:item.parents||[],
     rootFolderId,
     canDownload:item.capabilities?.canDownload,
    };
    await db.query('INSERT INTO files(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=$2',[data.id,JSON.stringify(data)]);
   }
   pageToken=page.nextPageToken||'';
  }while(pageToken);
 }

 const indexed=(await db.query("SELECT id,data->>'driveId' AS drive_id FROM files WHERE data->>'kind'='library' AND data->>'driveId' IS NOT NULL")).rows;
 const stale=indexed.filter(row=>!seenFiles.has(row.drive_id));
 for(const file of stale)await db.query('DELETE FROM files WHERE id=$1',[file.id]);
 await audit(actor,'library_synchronized','library',{count:seenFiles.size,removed:stale.length,folders:roots.length});
 return {count:seenFiles.size,removed:stale.length};
}

export async function isDriveFileInLinkedFolder(fileId:string,folderUrls:string[]){
 const roots=new Set(folderUrls.map(url=>googleId(url,'folder')));
 const pending=[fileId];
 const visited=new Set<string>();
 while(pending.length){
  const id=pending.shift()!;
  if(visited.has(id))continue;
  visited.add(id);
  if(roots.has(id))return true;
  const item=await google<any>(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,parents,mimeType`);
  pending.push(...(item.parents||[]));
 }
 return false;
}
