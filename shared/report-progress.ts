export function estimatedReportProgress(seconds:number){
 // shortcut: the API exposes no work percentage; replace this estimate when server progress is available.
 return Math.min(95,Math.max(0,Math.round(100*(1-Math.exp(-seconds/30)))));
}
