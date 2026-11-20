import {sessionDetailGroups} from '../shared/environmental-session';
import {reportPurpose} from '../shared/report-purpose';
import {AnalystRemarks,ResultToggle} from './analyst-remarks';
import Dialog from './dialog';
import {useCatalog,useUnsaved} from './configuration';
import {useContext,useState,useEffect,useRef} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {FileText,ArrowRight,Save,Download,CheckCircle2,History,ExternalLink, Trash2} from './components/LabIcons';
import {api} from './api';
import {ReportProgress,ReportPreviewButton} from './report-feedback';
import {CultureShift} from './culture-shift';
import {equipmentSelectionSchema,orderNumberedSamplingPoints,type EquipmentQuantity,type EquipmentCatalog} from '../shared/environmental';
import {EnvironmentalEquipment} from './environmental-equipment';
import {LabGraphic} from './LabGraphic';
import {PageTitle,useLoad,Notice,Field,Badge,ErrorBox,Loading,Empty,SearchInput,useCanEdit, Session} from './ui';
import {hasAutomaticAnalystRemark,isSurfaceSpcMy,microbiologyResultLimit,initializeResultRemarks,updateResultRemark,overallAnalystRemarks,microbiologyLimit,reportIssues,resultIssues,resultKey,type Draft,type DraftSummary,type Result,type Sample,type ReportSetup} from '../shared/model';
function downloadGeneratedDocx(file:any){const link=document.createElement('a');link.href=`/api/files/${file.id}/download`;link.download=file.name;document.body.append(link);link.click();link.remove();}
export function Reports(){
 const [query,setQuery]=useState(''),[search,setSearch]=useState('');
 useEffect(()=>{const timer=setTimeout(()=>setSearch(query),250);return()=>clearTimeout(timer);},[query]);
 const [params]=useSearchParams(),[selected,setSelected]=useState(params.get('sample')||'');
 const [productOptions,setProductOptions]=useState<NonNullable<ReportSetup['productOptions']>>([]);
 const [productId,setProductId]=useState(''),[profileId,setProfileId]=useState(''),[outputId,setOutputId]=useState('');
 const [equipment,setEquipment]=useState<EquipmentQuantity[]>([]),[equipmentRevision,setEquipmentRevision]=useState(''),[catalog,setCatalog]=useState<EquipmentCatalog>();
 const autoSelectProfile=useRef('');
 const [includeOpenPlate,setIncludeOpenPlate]=useState<boolean>();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [draftQuery,setDraftQuery]=useState(''),[page,setPage]=useState(0);
 const navigate=useNavigate(),canEdit=useCanEdit(),{user}=useContext(Session),notify=useContext(Notice);
 const {data:drafts,error:loadError,reload}=useLoad<DraftSummary[]>(()=>api('/drafts'));
 const {data:found}=useLoad(async()=>{const result=await api<{items:Sample[]}>('/search?limit=25&q='+encodeURIComponent(search));if(selected&&!result.items.some(s=>s.id===selected)){const extra=await api('/samples/'+selected);result.items.unshift(extra.sample);}return result;},[search,selected]);
 const equipmentKey=JSON.stringify(equipment);
 const {data:setup,error:setupError}=useLoad<ReportSetup|undefined>(()=>selected?api(`/report-setup/${selected}`,'POST',{productId:productId||undefined,profileId:profileId||undefined,outputId:outputId||undefined,equipment:equipment.length?equipment:undefined,equipmentRevision:equipmentRevision||undefined,includeOpenPlate}):Promise.resolve(undefined),[selected,productId,profileId,outputId,equipmentKey,equipmentRevision,includeOpenPlate]);
 useEffect(()=>{if(setup?.productOptions)setProductOptions(setup.productOptions);},[setup?.productOptions]);
 useEffect(()=>{const next=setup?.environmental?.equipment;if(!next||next.profileId!==(profileId||undefined))return;if(!profileId&&setup?.environmental?.profiles.length===1){const id=setup.environmental.profiles[0].id;autoSelectProfile.current=id;setProfileId(id);return;}setCatalog(next);if(autoSelectProfile.current&&autoSelectProfile.current===profileId){setEquipment(next.items.filter(item=>item.defaultQuantity>0).every(item=>!item.issue)?next.items.filter(item=>item.defaultQuantity>0).map(item=>({id:item.id,quantity:item.defaultQuantity,...(item.defaultLabels?{labels:item.defaultLabels}:{})})):[]);setEquipmentRevision(next.revision);autoSelectProfile.current='';}},[setup,profileId]);
 const chooseSample=(id:string)=>{setSelected(id);setProductId('');setProductOptions([]);setProfileId('');setOutputId('');setIncludeOpenPlate(undefined);setEquipment([]);setEquipmentRevision('');setCatalog(undefined);autoSelectProfile.current='';setError('');};
 const sample=setup?.sample||found?.items.find(s=>s.id===selected),profiles=setup?.environmental?.profiles||[],activeCatalog=catalog||setup?.environmental?.equipment,quantityMode=Boolean(activeCatalog&&!outputId&&(profiles.length<2||profileId));
 const changeEquipment=(value:EquipmentQuantity[])=>{setEquipment(value);setEquipmentRevision(activeCatalog?.revision||'');setError('');};
 const parsedSelection=equipmentSelectionSchema.safeParse({equipment});
 const currentSelection=parsedSelection.success?[...(parsedSelection.data.equipment||[])].filter(q=>q.quantity>0).sort((a,b)=>a.id.localeCompare(b.id)):[];
 const patternSelection=activeCatalog?.items.filter(item=>!item.issue&&item.defaultQuantity>0).map(item=>({id:item.id,quantity:item.defaultQuantity,...(item.defaultLabels?{labels:item.defaultLabels}:{})})).sort((a,b)=>a.id.localeCompare(b.id))||[];
 const patternFallback=!equipment.length&&patternSelection.length>0&&JSON.stringify(setup?.environmental?.snapshot?.equipment?.selection)===JSON.stringify(patternSelection)&&setup?.environmental?.snapshot?.equipment?.revision===activeCatalog?.revision;
 const setupMatches=!quantityMode||parsedSelection.success&&JSON.stringify(setup?.environmental?.snapshot?.equipment?.selection)===JSON.stringify(currentSelection)&&setup?.environmental?.snapshot?.equipment?.revision===equipmentRevision||patternFallback;
 const ready=Boolean(setup?.template&&(!setup.layoutResolution||setup.layoutResolution.status==='ready')&&setupMatches&&(includeOpenPlate===undefined||!setup.environmental?.openPlate||setup.environmental.openPlate.included===includeOpenPlate));
 const groups=new Map<string,DraftSummary[]>();
 for(const draft of drafts||[]){const key=draft.sessionId||draft.id;groups.set(key,[...(groups.get(key)||[]),draft]);}
 const saved=[...groups.values()].filter(items=>items.some(d=>`${d.sample.name} ${d.sample.ml} ${d.outputName||''}`.toLowerCase().includes(draftQuery.toLowerCase())));
 const maxPage=Math.max(0,Math.ceil(saved.length/8)-1),currentPage=Math.min(page,maxPage);
 if(!drafts)return loadError?<ErrorBox message={loadError}/>:<Loading/>;
 return <div className="reports-workbench reports-setup">
  <PageTitle title="Reports and Results" description="Choose a sample, enter its measurements, and prepare the report for review."/>
  <div className="reports-layout">
   <section className="panel padded report-setup-panel" id="results-details">
    <div className="section-heading"><h2>Prepare a report</h2><FileText size={21} aria-hidden="true"/></div>
    <SearchInput value={query} onChange={setQuery} placeholder="Find sample by ML number, product or batch…"/>
    <Field label="Select a logged sample"><select value={selected} onChange={e=>chooseSample(e.target.value)}><option value="">Choose from the logbook…</option>{found?.items.map(s=><option key={s.id} value={s.id}>{s.ml} · {s.name} · {s.batch}</option>)}</select></Field>
    {sample?<div className="report-selected-sample"><div><Badge>{sample.category}</Badge><strong className="mono">{sample.ml}</strong><span>Batch {sample.batch}</span></div><h2>{sample.name}</h2><p>{[sample.context,sample.fields?.facility,sample.fields?.area].filter(Boolean).join(' · ')}</p><Link to={`/samples/${sample.id}`}>View source record <ExternalLink size={13}/></Link></div>:<p className="report-setup-intro">Start with a logged sample. Its product, testing context and approved standards will appear here.</p>}
    {productOptions.length?<Field label="Managed product and package size" hint="Choose the product for this sample. Its approved standards will load before you create the draft."><select value={productId} disabled={busy} onChange={e=>{setProductId(e.target.value);setProfileId('');setOutputId('');setEquipment([]);setEquipmentRevision('');setCatalog(undefined);setIncludeOpenPlate(undefined);setError('');}}><option value="">Choose matching product...</option>{productOptions.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>:null}
    {profiles.length>1&&!outputId?<Field label="Approved sampling pattern"><select value={profileId} onChange={e=>{const id=e.target.value;autoSelectProfile.current=id;setProfileId(id);setOutputId('');setIncludeOpenPlate(undefined);setEquipment([]);setEquipmentRevision('');setCatalog(undefined);}}><option value="">Choose the applicable pattern…</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name} · {p.equipmentSet}</option>)}</select></Field>:null}
    {!quantityMode&&setup?.environmental?.otherOutputs?.length?<Field label="Monitoring output"><select value={outputId?JSON.stringify([profileId,outputId]):!catalog&&setup.environmental.snapshot?JSON.stringify([setup.environmental.snapshot.profile.id,setup.environmental.snapshot.output.id]):''} onChange={e=>{const pair=e.target.value?JSON.parse(e.target.value):['',''];autoSelectProfile.current='';setProfileId(pair[0]);setOutputId(pair[1]);setEquipment([]);setEquipmentRevision('');}}><option value="">{catalog?'Surface swabs · Accupoint + SPCMY':'Select monitoring output…'}</option>{setup.environmental.otherOutputs.map(o=><option key={o.profileId+o.outputId} value={JSON.stringify([o.profileId,o.outputId])}>{o.name}</option>)}</select></Field>:null}
    {quantityMode?<><EnvironmentalEquipment key={selected} catalog={activeCatalog!} value={equipment} disabled={!canEdit||busy} onChange={changeEquipment}/><p className="muted">ACCUPOINT and SPCMY are always included.</p>{setup?.environmental?.openPlate?<div className="equipment-choice"><label className="equipment-include"><input type="checkbox" checked={includeOpenPlate??setup.environmental.openPlate.included} disabled={!canEdit||busy} onChange={e=>{setIncludeOpenPlate(e.target.checked);}}/><span><strong>Envi Open Plate</strong><small>{setup.environmental.openPlate.issue||'Detected in the approved sampling patterns · adds a third file'}</small></span></label></div>:null}</>:null}
    {setup?.environmental&&!quantityMode&&setup.environmental.outputs.length>1&&setup.environmental.pairedOutputs?.length!==setup.environmental.outputs.length?<Field label="Monitoring method"><select value={outputId} onChange={e=>setOutputId(e.target.value)}><option value="">Choose output…</option>{setup.environmental.outputs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>:null}
    {selected&&!setup&&!setupError?<Loading compact label={catalog?'Updating the sampling-point preview…':'Loading product standards and report layouts…'}/>:null}
    {ready&&setup?<div className="equipment-preview-ready" key={quantityMode?equipmentKey:setup.template!.id}>
     <div className="report-preview-heading"><LabGraphic kind={quantityMode?'vessel':'sheets'}/><div><h3>{quantityMode?'Sampling points ready':'Report setup ready'}</h3><p>{setup.environmental?.pairedOutputs?.length?'One session · separate measurements for each report':`${setup.specification.tests.length} applicable test parameters · ${setup.specification.context}`}</p></div></div>
     {setup.environmental?.pairedOutputs?.length?<div className="method-preview-summary">{setup.environmental.pairedOutputs.map(o=><span key={o.id}><strong>{o.name}</strong>{o.instances.length} parameter rows · {[...new Set(o.instances.map(r=>r.unit))].join(', ')}</span>)}</div>:<p className="muted">Layout: {setup.template!.name}</p>}
     <details className="sampling-point-preview"><summary>View points and approved standards</summary><div className="table-scroll"><table><thead><tr><th>Method / point</th><th>Parameter</th><th>Standard</th></tr></thead><tbody>{(setup.environmental?.pairedOutputs?.flatMap(o=>o.instances.map(r=>({...r,method:o.name})))||setup.specification.tests.map(r=>({...r,method:''}))).map((r,index)=><tr key={index}><td>{[r.method,r.location,r.stage,r.replicate].filter(Boolean).join(' · ')||'Product sample'}</td><td>{r.label}</td><td>{r.criterion}</td></tr>)}</tbody></table></div></details>
    </div>:null}
    {setup?.layoutResolution&&setup.layoutResolution.status!=='ready'&&setup.layoutResolution.status!=='selection'?<ErrorBox message={setup.layoutResolution.message}/>:null}
    {setup?.layoutResolution?.status==='selection'&&!quantityMode?<p className="report-setup-help">{setup.layoutResolution.message}</p>:null}
    {setup?.environmental&&(setup.layoutResolution?.status==='missing'||activeCatalog?.items.some(i=>i.issue))&&canEdit?<Link className="button secondary" to="/settings?section=templates#environmental-patterns">Review approved equipment definitions <ArrowRight size={16}/></Link>:null}
    <ErrorBox message={setupError||error}/>
    <div className="report-setup-footer"><small>{setup?.environmental?'Equipment rows are fixed when drafts are created. Enter actual measurements in the next step.':'Results already recorded in IPI Results are copied by ML number. Missing measurements stay open for entry.'}</small><button className="button primary" disabled={!ready||busy||!canEdit} onClick={async()=>{setBusy(true);setError('');try{const snapshot=setup!.environmental?.snapshot;const selection=snapshot?.equipment?{profileId:snapshot.profile.id,equipment:snapshot.equipment.selection,equipmentRevision:snapshot.equipment.revision,includeOpenPlate:setup!.environmental?.openPlate?.included}:{profileId:snapshot?.profile.id||profileId||undefined,outputId:snapshot?.output.id||outputId||undefined};const draft=await api('/drafts','POST',{sampleId:selected,productId:productId||undefined,...selection});navigate(`/reports/${draft.id}`);}catch(e:any){setError(e.message);}finally{setBusy(false);}}}>{setup?.environmental?.pairedOutputs?.length?'Create session drafts':'Create result draft'} <ArrowRight size={17}/></button></div>
   </section>
   <aside className="panel padded saved-reports-panel" aria-labelledby="saved-reports-title">
    <div className="section-heading"><h2 id="saved-reports-title">Saved reports</h2><Badge>{groups.size}</Badge></div><p>Resume a draft or its paired method reports.</p>
    {drafts.length?<SearchInput value={draftQuery} onChange={q=>{setDraftQuery(q);setPage(0);}} placeholder="Find saved report by sample or ML…"/>:null}
    <div className="saved-reports-list">{saved.slice(currentPage*8,currentPage*8+8).map(items=><div className="draft-link" key={items[0].sessionId||items[0].id}><Link className="draft-identity" to={`/reports/${items[0].id}`}><strong>{items[0].sample.name}</strong><span className="mono">{items[0].sample.ml}</span><small>{new Date(items[0].updatedAt).toLocaleString()}</small></Link><div className="draft-method-links">{items.map(d=><div key={d.id}><Link className="draft-method-open" to={`/reports/${d.id}`}>{d.outputName||'Result draft'}<span>r{d.revision}</span><ArrowRight size={14}/></Link>{user.role==='administrator'?<button className="icon-button" disabled={busy} aria-label={`Delete ${d.outputName||'draft'} for ${d.sample.name}`} onClick={async()=>{if(!confirm('Delete this draft?'))return;setBusy(true);setError('');try{await api(`/drafts/${d.id}`,'DELETE');notify('Draft deleted');reload();}catch(e:any){setError(e.message);}finally{setBusy(false);}}}><Trash2 size={15}/></button>:null}</div>)}</div></div>)}</div>
    {!saved.length?<Empty title={drafts.length?'No matching drafts':'No saved reports yet'}>{drafts.length?'Try the sample name or ML number.':'Create a report from a logged sample to start.'}</Empty>:null}
    {saved.length>8?<nav className="report-pagination" aria-label="Saved report pages"><button className="button secondary" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous</button><span>{currentPage+1} of {maxPage+1}</span><button className="button secondary" disabled={currentPage>=maxPage} onClick={()=>setPage(currentPage+1)}>Next</button></nav>:null}
   </aside>
  </div>

 </div>;
}

function ReportDetails({keys,draft,canEdit,onChange,optional=[],heading='Report details',compact=false}:{keys:string[];draft:Draft;canEdit:boolean;onChange:(key:string,value:string)=>void;optional?:{key:string;label:string}[];heading?:string;compact?:boolean}){
 const dateIssue=reportIssues(draft).find(issue=>issue.startsWith('Analysis date'));
 const required=new Set(['analysisDate',...((draft.templateSnapshot?.manifest.requiredFields||[]) as string[]),...((draft.templateSnapshot?.manifest.tokens||[]) as string[]).filter(key=>['mic','page'].includes(key))]);
 const aliasesFor=(key:string):readonly string[]=>sessionDetailGroups.find(group=>(group as readonly string[]).includes(key))||[key];
 const detailKeys=[...new Set(keys.map(key=>optional.find(f=>aliasesFor(key).includes(f.key))?.key||aliasesFor(key)[0]))];
 const isRequired=(key:string)=>aliasesFor(key).some(alias=>required.has(alias));
 const additional=detailKeys.filter(key=>!isRequired(key)&&optional.some(f=>aliasesFor(key).includes(f.key)));
 const dateFormat=draft.configurationSnapshot?.general.dateFormat==='en-GB'?'DD/MM/YYYY':'MM/DD/YYYY';
 const analysisDateHint=dateIssue?.includes('valid date')?`Enter a valid date as ${dateFormat} or YYYY-MM-DD.`:dateIssue?.includes('required')?`Enter the analysis date as ${dateFormat}.`:`Correct the source date if needed. Use ${dateFormat}.`;
 const renderDetail=(key:string)=>{const aliases:readonly string[]=sessionDetailGroups.find(group=>(group as readonly string[]).includes(key))||[key];const value=key==='purpose'&&['SFG','FG','ST','MIS'].includes(draft.sample.category)?reportPurpose(draft.sample,draft.fields):[key,...aliases].map(alias=>draft.fields[alias]).find(value=>value!==undefined)??aliases.map(alias=>draft.sample.fields[alias]).find(value=>value!==undefined)??'';const label=optional.find(f=>f.key===key)?.label||({analysisDate:'Analysis date',page:'Page number'} as Record<string,string>)[key]||key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[._]/g,' ').replace(/^./,x=>x.toUpperCase());const partialDate=['date.mfd','manufactureDate','exp.date','expiryDate'].includes(key);const hasUnit=['temperature','relativeHumidity'].includes(key);const hint=partialDate?'Use MM/DD/YYYY or MM/YYYY.':isRequired(key)&&key!=='analysisDate'?(compact?'Required for this report.':'Required for all session reports.'):optional.some(f=>f.key===key)?'Optional — leave blank if unavailable.':key==='page'?'Only enter a page number if the source sheet has none.':key==='analysisDate'?analysisDateHint:undefined;return <Field key={key} label={label} hint={hint}><div className={hasUnit?'result-with-unit':undefined}><input type="text" inputMode={hasUnit?'decimal':key==='analysisDate'||partialDate?'numeric':undefined} placeholder={key==='analysisDate'?dateFormat:partialDate?'MM/DD/YYYY or MM/YYYY':key==='page'?'Page number':undefined} aria-required={isRequired(key)||undefined} aria-invalid={key==='analysisDate'&&Boolean(dateIssue)} disabled={!canEdit} value={key==='page'?draft.fields.page||draft.fields.pageNumber||'':key==='temperature'?value.replace(/\s*°\s*C$/i,''):key==='relativeHumidity'?value.replace(/\s*%\s*$/,''):value} onChange={e=>onChange(key,e.target.value)} />{key==='temperature'?<span aria-hidden="true">°C</span>:key==='relativeHumidity'?<span aria-hidden="true">%</span>:null}</div></Field>};
 return <section className={`report-details${keys.length?' has-fallbacks':''}`} aria-label="Report details">
  {!compact?<p className="report-source-note"><CheckCircle2 size={15}/><span>{draft.environmentalSnapshot?'Sample details and sampling-pattern revision are saved with this draft. Enter current analysis dates, environmental conditions and results.':'Sample details come from the source sheet. Correct the analysis date here if needed; release date and time are added when the report is generated.'}</span></p>:null}
  {detailKeys.length?<div className="report-detail-fallbacks"><h2>{heading}</h2>{!compact?<p>Correct the analysis date if needed. {draft.environmentalSession?'These details apply to all session reports.':'Complete required details; optional fields may stay blank.'}</p>:null}<div className="form-grid">{detailKeys.filter(key=>!additional.includes(key)).map(renderDetail)}</div>{additional.length?<details className="report-optional-details"><summary>Additional report details · Optional</summary><div className="form-grid">{additional.map(renderDetail)}</div></details>:null}</div>:null}
 </section>;
}
export function ReportEditor(){
 const {id}=useParams();
 const {data,error}=useLoad<Draft[]>(async()=>{
  const first=await api<Draft>(`/drafts/${id}`);
  if(!first.environmentalSession)return [first];
  return Promise.all(first.environmentalSession.members.map(m=>m.draftId===id?first:api<Draft>(`/drafts/${m.draftId}`)));
 },[id]);
 return data?<Editor key={id} initial={data}/>:error?<ErrorBox message={error}/>:<Loading/>;
}

function Editor({initial}:{initial:Draft[]}){
 const saved=useRef(initial);
 const [drafts,setDrafts]=useState(()=>initial.map(d=>({...d,results:initializeResultRemarks(d)})));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[generationPhase,setGenerationPhase]=useState('');
 const [files,setFiles]=useState<any[]>([]),[complete,setComplete]=useState(true),[history,setHistory]=useState<any[]>();
 const [historyDraft,setHistoryDraft]=useState(initial[0].id);
 const notify=useContext(Notice),canEdit=useCanEdit(),{categories}=useCatalog();
 const {data:refs}=useLoad(()=>api('/references?scope=templates'));
 const draft=drafts[0],isSession=Boolean(draft.environmentalSession);
 const {data:detailsByDraft,error:reportDetailsError}=useLoad<Record<string,{optionalFields:{key:string;label:string}[];incompleteCC:string[]}>>(async()=>Object.fromEntries(await Promise.all(drafts.map(async d=>[d.id,await api(`/drafts/${d.id}/report-details`)]))),[drafts.map(d=>`${d.id}:${d.revision}`).join(',')]);
 const reportDetails=detailsByDraft?.[draft.id];
 const dirty=drafts.some((d,i)=>JSON.stringify([d.results,d.fields])!==JSON.stringify([saved.current[i].results,saved.current[i].fields]));
 const clearUnsaved=useUnsaved(dirty);
 useUnsaved(!!generationPhase);
 const issues=drafts.flatMap(d=>reportIssues(d).map(issue=>`${isSession?methodName(d)+': ':''}${issue}`));
 const total=drafts.reduce((n,d)=>n+d.results.length,0),entered=drafts.reduce((n,d)=>n+d.results.filter(r=>r.state==='entered').length,0);
 const templateKeys=[...new Set(drafts.flatMap(d=>{const t=d.templateSnapshot||refs?.templates.find((t:any)=>t.id===d.templateId);return [...(t?.manifest.requiredFields||[]),...(t?.manifest.tokens||[])] as string[];}))];
 const detailKeys=[...new Set(['analysisDate',...templateKeys.filter(key=>{
  if(key.startsWith('report.')||key.startsWith('sample.')||key.startsWith('result.')||key.startsWith('rows.'))return false;
  if(['analysisDate','analyst','micAnalyst','mic','logbook','logbookReference','releaseDate','d.release','t.release','sample.released','overallRemarks','overall.remarks','type','tests','test','location','stage','replicate','channel','phase','activeValue','passiveValue','block','groupKey','criterion','value','remarks'].includes(key))return false;
  if(key==='page'&&String(draft.sample.fields.pageNumber||draft.sample.fields.page||'').trim())return false;
  return !reportDetails||['temperature','relativeHumidity','page'].includes(key)||drafts.some(d=>((d.templateSnapshot?.manifest.requiredFields||[]) as string[]).includes(key));
 }),...drafts.flatMap(d=>detailsByDraft?.[d.id]?.optionalFields.map(f=>f.key)||[])])];
 const sharedKey=(key:string)=>sessionDetailGroups.some(group=>(group as readonly string[]).includes(key));
 const sharedKeys=isSession?detailKeys.filter(sharedKey):detailKeys;
 const methodKeys=(d:Draft)=>{
  if(!isSession)return [];
  const template=d.templateSnapshot||refs?.templates.find((t:any)=>t.id===d.templateId);
  const keys=[...new Set([...(template?.manifest.requiredFields||[]) as string[],...(template?.manifest.tokens||[]) as string[],...(detailsByDraft?.[d.id]?.optionalFields.map(f=>f.key)||[])])];
  return keys.filter(key=>!sharedKey(key)&&(detailKeys.includes(key)||['mic','logbook','logbookReference'].includes(key))&&!key.startsWith('sample.')&&!key.startsWith('report.')&&!key.startsWith('result.'));
 };
 const invalidate=()=>{setFiles([]);setError('');};
 const update=(id:string,i:number,patch:Partial<Result>)=>{
  setDrafts(all=>all.map(d=>{
   if(d.id!==id)return d;
   const results=d.results.map((r,j)=>{if(i!==j)return r;const t=d.specification.tests.find(t=>resultKey(t)===resultKey(r));return t&&overallAnalystRemarks(d)!==undefined?updateResultRemark(t,r,patch):{...r,...patch};});
   const next={...d,results},overall=overallAnalystRemarks(next);
   return overall===undefined?next:{...next,fields:{...next.fields,overallRemarks:overall,'overall.remarks':overall}};
  }));invalidate();
 };
 const field=(key:string,value:string,id=draft.id)=>{
  const aliases=sessionDetailGroups.find(group=>(group as readonly string[]).includes(key))||(['logbook','logbookReference'].includes(key)?['logbook','logbookReference']:[key]);
  setDrafts(all=>all.map(d=>d.id===id||sharedKey(key)?{...d,fields:{...d.fields,...Object.fromEntries(aliases.map(alias=>[alias,value]))}}:d));invalidate();
 };
 const save=async()=>{
  try{
   const changes=drafts.map((d,i)=>({id:d.id,revision:saved.current[i].revision,results:d.results,fields:d.fields}));
   const fresh=isSession?await api<Draft[]>(`/drafts/${draft.id}/session`,'PUT',{changes}):[await api<Draft>(`/drafts/${draft.id}`,'PUT',changes[0])];
   saved.current=fresh;setDrafts(fresh);clearUnsaved();notify(isSession?'Session saved':'Draft saved');return fresh;
  }catch(e:any){setError(`Could not save all changes: ${e.message}. Unsaved entries remain on this page.`);return null;}
 };
 const saveDrafts=async()=>{setBusy(true);setError('');try{await save();}finally{setBusy(false);}};
 const generate=async()=>{
  if(busy)return;
  setBusy(true);setGenerationPhase(dirty?'Saving results and details…':'Preparing DOCX…');setFiles([]);setError('');
  try{
   const current=dirty?await save():drafts;if(!current)return;
   setGenerationPhase(isSession?'Preparing all session DOCX files…':'Preparing your DOCX file…');
   if(isSession){
    const generated=await api(`/drafts/${draft.id}/generate-session`,'POST',{revisions:Object.fromEntries(current.map(d=>[d.id,d.revision]))});
    setComplete(generated.complete);setFiles(generated.files);generated.files.forEach(downloadGeneratedDocx);
    if(!generated.complete)setError(generated.errors.join(' '));
    notify(generated.complete?'Session DOCX files generated; downloads started.':'Some files need attention. Available downloads started.');
   }else{
    if(issues.length)notify('Incomplete entries will remain blank. Review the DOCX before use.');
    const generated=await api(`/drafts/${draft.id}/generate`,'POST',{revision:current[0].revision});
    setComplete(true);setFiles([generated]);downloadGeneratedDocx(generated);notify('DOCX generated; download started.');
   }
  }catch(e:any){setError(`Report generation did not finish: ${e.message}. Your saved results remain available.`);}
  finally{setBusy(false);setGenerationPhase('');}
 };
 const nextMissing=()=>{
  for(const d of drafts){const i=d.results.findIndex(r=>r.state!=='entered');if(i<0)continue;
   const row=document.getElementById(`${d.id}-result-row-${i}`);
   const input=(row?.querySelector('input:not([type=radio]):not(:disabled)')||row?.querySelector('input:not(:disabled),select:not(:disabled)')) as HTMLElement|null;
   input?.focus({preventScroll:true});(input||row)?.scrollIntoView({block:'center'});break;
  }
 };
 useEffect(()=>{if(files.length&&!document.activeElement?.closest('.culture-game')){const heading=document.getElementById('document-preview-title');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'nearest'});}},[files]);
 return <div className="reports-workbench reports-editor reports-streamlined">
  <Link className="back" to="/reports">← Reports and Results</Link>
  <PageTitle title="Results and report" description="Enter measurements, complete shared details, and download from this page." action={<button className="button secondary" disabled={busy} onClick={async()=>{try{setHistoryDraft(draft.id);setHistory(await api(`/drafts/${draft.id}/history`));}catch(e:any){setError(e.message);}}}><History size={16}/>Revision history</button>}/>
  <div className="sample-confirm"><div><Badge>{categories[draft.sample.category]||draft.sample.category}</Badge><strong>{draft.sample.name}</strong><span className="mono">{draft.sample.ml}</span><span>Batch <b>{draft.sample.batch}</b></span></div><Link to={`/samples/${draft.sampleId}`}>Source record <ExternalLink size={15}/></Link></div>
  <nav className="result-workspace-nav" id="results-details" aria-label="Jump to report section">{drafts.map(d=><a key={d.id} href={`#method-${d.id}`}>{methodName(d)}<span>{d.results.filter(r=>r.state==='entered').length}/{d.results.length}</span></a>)}<a href="#report-details">Report details</a></nav>
  <div id="report-action-error" tabIndex={-1}><ErrorBox message={error||reportDetailsError}/></div>
  {generationPhase?<ReportProgress phase={generationPhase} focus/>:null}
  <CultureShift generating={!!generationPhase} ready={!!files.length&&complete} onViewReport={()=>document.getElementById('document-preview-title')?.scrollIntoView({block:'start'})}/>
  <div className="result-entry-toolbar"><span><strong>{entered} of {total}</strong> measurements entered{isSession?' · shared report details':''}</span><button className="button secondary" disabled={busy||!drafts.some(d=>d.results.some(r=>r.state!=='entered'))} onClick={nextMissing}>Next missing result <ArrowRight size={15}/></button></div>
  {drafts.map(d=><section className="panel padded report-results-panel" id={`method-${d.id}`} key={d.id} aria-label={`${methodName(d)} measurements`}>
   <div className="section-heading"><h2>{methodName(d)}</h2><Badge>{d.specification.context}</Badge></div>
   {d.resultSource?<details className="result-import-evidence"><summary>IPI Results · {d.results.filter(r=>r.sourceValue!==undefined).length} imported measurements</summary><p><a href={d.resultSource.url} target="_blank" rel="noreferrer">{d.resultSource.sheet} · row {d.resultSource.row} <ExternalLink size={13}/></a><span>Matched {d.resultSource.ml} · checked {new Date(d.resultSource.observedAt).toLocaleString()}</span></p><small>Original source values are retained. Analyst overrides remain yours.</small></details>:null}
   {d.specification.tests.some(t=>!hasAutomaticAnalystRemark(t))?<p className="info">Tests without a supported acceptance limit require a manual Passed or Failed remark.</p>:null}
   <MeasurementRows draft={d} refs={refs} busy={busy} canEdit={canEdit} update={(i,patch)=>update(d.id,i,patch)}/>
   {methodKeys(d).length?<details className="method-report-details" open={methodKeys(d).some(key=>{const original=initial.find(x=>x.id===d.id)!;return (key==='mic'||((original.templateSnapshot?.manifest.requiredFields||[]) as string[]).includes(key))&&!String(original.fields[key]||original.sample.fields[key]||'').trim();})}><summary>{methodName(d)} report details</summary><ReportDetails keys={methodKeys(d)} optional={detailsByDraft?.[d.id]?.optionalFields} heading={`${methodName(d)} details`} compact draft={d} canEdit={canEdit&&!busy} onChange={(key,value)=>field(key,value,d.id)}/></details>:null}
   {overallAnalystRemarks(d)!==undefined?<div className="overall-analyst-remarks" role="status"><span>{methodName(d)} overall remarks</span><strong>{overallAnalystRemarks(d)||'Awaiting analyst remarks'}</strong></div>:null}
  </section>)}
  <div id="report-details"><ReportDetails keys={sharedKeys} optional={drafts.flatMap(d=>detailsByDraft?.[d.id]?.optionalFields||[])} heading={isSession?'Shared report details':'Report details'} compact draft={draft} canEdit={canEdit&&!busy} onChange={field}/></div>
  <details className="report-review-summary"><summary>{issues.length?`${issues.length} items to complete`:'Required entries complete'} · View report checks</summary>{issues.length?<ul className="issue-list">{issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul>:<p>Results are ready for document generation.</p>}<p>{isSession?'All session measurements and required details must be complete.':'Missing result cells remain blank in the document.'} Review and signature take place outside this dashboard.</p></details>
  {files.length?<section className="document-output" aria-label="Generated reports"><header className="document-output-head"><div className="document-output-copy" role="status"><h2 id="document-preview-title" tabIndex={-1}>{complete?'DOCX generation complete':'Some DOCX files need attention'}</h2><p>Downloads started. Use the links if your browser blocks automatic downloads.</p></div><div className="document-output-actions">{files.map(output=><div className="document-output-file" key={output.id}><ReportPreviewButton file={output}/><a className="button secondary" href={`/api/files/${output.id}/download`}><Download size={17}/>{output.monitoringMode==='open-plate'?'Open Plate':output.monitoringMethod==='accupoint'?'ACCUPOINT':output.monitoringMethod==='spc-my'?'SPCMY':'Download'} DOCX</a></div>)}</div></header>{files.some(f=>f.sourceChanged)?<p className="info">The source sample changed after this draft was created. Confirm the saved draft details before use.</p>:null}<footer className="document-output-footer"><span>External review and signature required. Generating a report does not release the sample.</span><details><summary>Generation details</summary>{files.map(f=><dl className="details" key={f.id}><div><dt>File</dt><dd>{f.name}</dd></div><div><dt>Saved results</dt><dd>Revision {f.resultRevision}</dd></div><div><dt>Configuration</dt><dd>Revision {f.configurationRevision||'Legacy report'}</dd></div><div><dt>File fingerprint</dt><dd className="fingerprint">{f.sha256}</dd></div></dl>)}</details></footer></section>:null}
  <div className="sticky-actions"><span role="status"><span className={`status-dot ${dirty?'pending':''}`}/>{error?<a href="#report-action-error">Needs attention · View error</a>:dirty?'Unsaved changes':isSession?'Session saved':`Saved revision ${draft.revision}`}</span><div><button className="button secondary" disabled={busy||!dirty||!canEdit} onClick={saveDrafts}><Save size={16}/>{isSession?'Save session':'Save draft'}</button><button className="button primary" disabled={busy||!canEdit} onClick={generate}><Download size={17}/>{busy?generationPhase?'Preparing DOCX…':'Saving…':isSession?'Generate all DOCX':'Generate DOCX'}</button></div></div>
  {history?<Dialog title="Revision history" onClose={()=>setHistory(undefined)} wide>{isSession?<Field label="Report method"><select value={historyDraft} onChange={async e=>{const id=e.target.value;try{const rows=await api(`/drafts/${id}/history`);setHistoryDraft(id);setHistory(rows);}catch(e:any){setError(e.message);}}}>{drafts.map(d=><option key={d.id} value={d.id}>{methodName(d)}</option>)}</select></Field>:null}{history.map(h=><details className="history" key={h.revision}><summary>Revision {h.revision} · {h.data.analyst} · {new Date(h.data.updatedAt).toLocaleString()}</summary><dl className="details">{h.data.results.map((r:Result)=><div key={resultKey(r)}><dt>{h.data.specification.tests.find((t:any)=>resultKey(t)===resultKey(r))?.label||r.test} {[r.location,r.stage,r.replicate].filter(Boolean).join(' · ')}</dt><dd>{r.state==='entered'?[r.qualifier,r.value,r.unit].filter(Boolean).join(' '):r.state==='not_tested'?'Not tested: '+r.reason:'Not entered'}</dd></div>)}{Object.entries(h.data.fields).map(([k,v])=><div key={k}><dt>{k.replace(/([A-Z])/g,' $1')}</dt><dd>{String(v)||'Not entered'}</dd></div>)}</dl></details>)}</Dialog>:null}
 </div>;
}

function methodName(draft:Draft){return draft.environmentalSnapshot?.output.mode==='open-plate'?'Envi Open Plate':draft.environmentalSnapshot?.output.method==='accupoint'?'ACCUPOINT':isSurfaceSpcMy(draft)?'SPC / MY':'Result measurements';}

function MeasurementRows({draft,canEdit,busy,update,refs}:{draft:Draft;canEdit:boolean;busy:boolean;update:(i:number,patch:Partial<Result>)=>void;refs:any}){
 const groups=new Map<string,number[]>();
 draft.results.forEach((r,i)=>{const key=JSON.stringify([r.location,r.stage,r.replicate,r.channel,r.block]);groups.set(key,[...(groups.get(key)||[]),i]);});
 const points=[...groups.entries()];
 const ordered=draft.environmentalSnapshot?.output.mode==='surface'?orderNumberedSamplingPoints(points,([,indices])=>draft.results[indices[0]].location||'',([,indices])=>{const r=draft.results[indices[0]];return JSON.stringify([r.stage,r.replicate,r.channel,r.block]);}):points;
 return <div className="sample-measurements">{ordered.map(([key,indices])=>{
  const testOrder=(i:number)=>draft.results[i].test==='SPC'?0:draft.results[i].test==='MY'?1:2;
  indices.sort((a,b)=>testOrder(a)-testOrder(b));
  const point=draft.results[indices[0]];
  return <section className="result-point" key={key} aria-label={[point.location||draft.sample.name,point.stage,point.replicate,point.channel].filter(Boolean).join(' · ')}>
   <div className="result-point-details"><span className="result-column-label">Sample</span><h3 className="result-point-name">{point.location||draft.sample.name}</h3><p>{point.location?draft.sample.name:draft.sample.ml}</p><small>{[point.stage,point.replicate,point.channel,point.block&&point.block!=='tests'?point.block:undefined,point.location?undefined:draft.sample.batch?`Batch ${draft.sample.batch}`:undefined].filter(Boolean).join(' · ')}</small></div>
   <div className={`result-pair${indices.length===1?' result-single':''}`}>{indices.map(i=>{const r=draft.results[i];const t=draft.specification.tests.find(t=>resultKey(t)===resultKey(r))!;const rowIssues=r.state==='entered'?resultIssues({...draft,specification:{...draft.specification,tests:[t]},results:[r]}):[];return <div className={`test-card result-entry-row`} id={`${draft.id}-result-row-${i}`} tabIndex={-1} key={resultKey(r)} aria-label={[t.location,t.label].filter(Boolean).join(" · ")}><div className="test-title"><div><h3 title={t.label}>{['SPC','MY'].includes(t.test)?t.test:t.label}</h3>{r.sourceValue!==undefined?<small className="result-source-status result-provenance">{r.value===r.sourceValue?"From IPI Results":"Edited from IPI Results"}{r.sourceHeader?` · ${r.sourceHeader}`:``}</small>:r.state==='entered'&&r.value?<small className="result-source-status">Entered manually</small>:draft.environmentalSnapshot?<small className="result-source-status">Enter this point’s measured result</small>:draft.resultLookup==='matched'?<small className="result-source-status">No value in the matching IPI Results row · enter manually if available</small>:draft.resultLookup==='not_found'?<small className="result-source-status">No matching ML number in IPI Results · enter manually if available</small>:draft.resultLookup==='demo'?<small className="result-source-status">Demo mode · Results lookup is disabled</small>:null}</div><div className="criterion"><small>Standard specification</small><strong>{t.criterion}</strong></div></div><div className="result-grid">{r.state==='entered'||r.state==='not_entered'?<>{t.type==='numeric'?<>{t.test==='ACCUPOINT'?<><ResultToggle label="Result choice" disabled={!canEdit||busy} value={r.value==='0'&&r.qualifier!=='='?'zero':'exact'} options={[{value:'zero',label:'0 RLU'},{value:'exact',label:'Exact value'}]} onChange={choice=>update(i,{state:choice==='zero'?'entered':'not_entered',qualifier:choice==='zero'?'':'=',value:choice==='zero'?'0':''})}/>{!(r.value==='0'&&r.qualifier!=='=')?<Field label="Value"><div className="result-with-unit"><input disabled={!canEdit||busy} type="text" inputMode="decimal" value={r.value} onChange={e=>update(i,{state:e.target.value?'entered':'not_entered',value:e.target.value,qualifier:'='})} placeholder="Enter measured result"/><span aria-hidden="true">RLU</span></div></Field>:null}</>:microbiologyLimit(t.test,t.criterion)?<><ResultToggle label="Qualifier" disabled={!canEdit||busy} value={r.qualifier} options={[{value:'Nmt',label:overallAnalystRemarks(draft)===undefined&&!isSurfaceSpcMy(draft)?microbiologyLimit(t.test,t.criterion)!:microbiologyResultLimit(t)},{value:'',label:'Actual Result'}]} onChange={qualifier=>update(i,{state:qualifier==='Nmt'?'entered':'not_entered',qualifier:qualifier as Result['qualifier'],value:''})}/>{r.qualifier===''?<Field label="value" hint={t.unit?`${t.unit} will be added to the report`:'The result unit will be added to the report'}><input disabled={!canEdit||busy} type="text" value={r.value} onChange={e=>update(i,{state:e.target.value?'entered':'not_entered',value:e.target.value})} placeholder="Enter value"/></Field>:null}</>:<><ResultToggle label="Qualifier" disabled={!canEdit||busy} value={r.qualifier} options={[{value:'',label:'Exact value'},{value:'Nmt',label:'Nmt'},{value:'<',label:'Less than'},{value:'<=',label:'Less than or equal'}]} onChange={qualifier=>update(i,{qualifier:qualifier as Result['qualifier']})}/><Field label="value" hint={t.unit?`${t.unit} will be added to the report`:undefined}><input disabled={!canEdit||busy} type="text" value={r.value} onChange={e=>update(i,{state:e.target.value?'entered':'not_entered',value:e.target.value})} placeholder="Enter measured result"/></Field></>}</>:<ResultToggle label="Actual finding" disabled={!canEdit||busy} value={r.value} options={[{value:'Positive',label:'Positive'},{value:'Negative',label:'Negative'}]} onChange={value=>update(i,{state:'entered',value})}/>}<AnalystRemarks disabled={!canEdit||busy||r.state!=='entered'} value={r.remarks} mode={r.remarkMode} manualRequired={!hasAutomaticAnalystRemark(t)} onAutomatic={hasAutomaticAnalystRemark(t)&&overallAnalystRemarks(draft)!==undefined?()=>update(i,{remarkMode:"automatic"}):undefined} onChange={remarks=>update(i,{remarks,remarkMode:"manual"})}/></>:r.state==='not_tested'?<Field label="Reason not tested"><input disabled={!canEdit||busy} value={r.reason} onChange={e=>update(i,{reason:e.target.value})}/></Field>:<>{t.type==='numeric'?<Field label="Result value"><div className={t.test==='ACCUPOINT'?'result-with-unit':undefined}><input disabled={!canEdit||busy} type="text" inputMode="decimal" value={r.value} onChange={e=>update(i,{state:e.target.value?'entered':'not_entered',value:e.target.value,...(t.test==='ACCUPOINT'?{qualifier:'=' as const}:{})})} placeholder="Enter measured result"/>{t.test==='ACCUPOINT'?<span aria-hidden="true">RLU</span>:null}</div></Field>:<ResultToggle label="Actual finding" disabled={!canEdit||busy} value={r.value} options={[{value:'Positive',label:'Positive'},{value:'Negative',label:'Negative'}]} onChange={value=>update(i,{state:'entered',value})}/>}<p className="muted">No result found for this test. Enter it when available.</p></>}</div>{rowIssues.length?<ul className="result-row-issues">{rowIssues.map((issue,index)=><li key={index}>{issue}</li>)}</ul>:null}<details className="result-state-options"><summary>Entry options</summary><Field label="Entry state"><select disabled={!canEdit||busy} value={r.state} onChange={e=>update(i,{state:e.target.value as Result['state'],value:'',qualifier:''})}><option value="not_entered">Not entered</option><option value="entered">Result entered</option><option value="not_tested">Not tested</option></select></Field></details><details className="evidence"><summary>Specification source · {t.date}</summary><p>{refs?.documents?.find((f:any)=>f.id===t.source)?.name||t.source}</p><small>{t.sourceLocation} · Date basis: {t.dateBasis}</small></details></div>;})}</div>
  </section>;
 })}</div>;
}
