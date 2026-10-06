import {z} from 'zod';

export const worksheetColumnIds = ['identity','type','batch','source','status','note','updated'] as const;
export type WorksheetColumnId=typeof worksheetColumnIds[number];

export const worksheetColumnDefinitions=[
  {id:'identity',label:'Sample / control number',width:280,sort:'ml',defaultDirection:'asc'},
  {id:'type',label:'Sample type',width:155,sort:'category',defaultDirection:'asc'},
  {id:'batch',label:'Batch / received',width:175,sort:'received',defaultDirection:'desc'},
  {id:'source',label:'Source location',width:185,sort:'source',defaultDirection:'asc'},
  {id:'status',label:'Source status',width:140,sort:'status',defaultDirection:'asc'},
  {id:'note',label:'Workspace note',width:235,sort:'note',defaultDirection:'asc'},
  {id:'updated',label:'Workspace record',width:220,sort:'recent',defaultDirection:'desc'},
] as const satisfies readonly {id:WorksheetColumnId;label:string;width:number;sort:string;defaultDirection:'asc'|'desc'}[];

const worksheetColumnIdSchema=z.enum(worksheetColumnIds);
export const worksheetLayoutSchema=z.object({
  columns:z.array(worksheetColumnIdSchema).length(worksheetColumnIds.length),
  frozenColumns:z.number().int().min(0).max(worksheetColumnIds.length-1),
  frozenRows:z.number().int().min(0).max(5),
  locked:z.boolean(),
}).superRefine((layout,context)=>{
  if(new Set(layout.columns).size!==worksheetColumnIds.length){
    context.addIssue({code:'custom',path:['columns'],message:'Every worksheet column must appear exactly once.'});
  }
});

export type WorksheetLayout=z.infer<typeof worksheetLayoutSchema>;
export const defaultWorksheetLayout:WorksheetLayout={
  columns:[...worksheetColumnIds],
  frozenColumns:1,
  frozenRows:0,
  locked:true,
};
