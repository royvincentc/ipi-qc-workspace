import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,Beaker,ChevronDown,FileText,FlaskConical,FolderOpen,MapPin,MessageSquare,Plus,Search,Thermometer} from 'lucide-react';
import {LabGraphic} from './LabGraphic';
import {Badge,ErrorBox,useLoad} from './ui';
import {api} from './api';
import {resultDisplayValue,resultKey,type Sample} from '../shared/model';

type Assay={id:string;name:string;shortName?:string;reportLabel?:string;active?:boolean;categories?:string[]};
type PathName='source'|'tests'|'report'|'actions';

function WorkflowConnector({path,active,pulseId,enabled,flowing,paused}:{path:PathName;active:boolean;pulseId:number;enabled:boolean;flowing:boolean;paused:boolean}){
  const ref=useRef<SVGSVGElement>(null);
  const paths:Record<PathName,string>={
    source:'M0 174h7q10 0 10-12V54q0-12 12-12h11M17 162v109q0 12 12 12h11',
    tests:'M0 52h41M0 174h41M0 296h41',
    report:'M0 52h41M0 174h41M0 296h41',
    actions:'M0 52h41M0 174h41M0 296h41',
  };
  const d=paths[path];
  useEffect(()=>{
    const svg=ref.current;
    if(!svg)return;
    if(paused)svg.pauseAnimations?.();
    else {
      svg.unpauseAnimations?.();
      if(active){
        const animation=svg.querySelector('animateMotion') as SVGAnimationElement|null;
        animation?.beginElement?.();
      }
    }
  },[active,pulseId,paused]);
  return <div className={`workbench-connect ${enabled?'is-visible':''} ${enabled&&flowing?'is-flowing':''} ${active&&enabled?'is-pulsing':''}`} aria-hidden="true">
    <svg ref={ref} viewBox="0 0 41 348" preserveAspectRatio="none">
      <path className="connection-base" d={d}/>
      {path==='source'?<><circle cx="39" cy="42" r="3.4"/><circle cx="39" cy="283" r="3.4"/></>:<>
        <circle cx="2" cy="52" r="3.3"/><circle cx="39" cy="52" r="3.3"/>
        <circle cx="2" cy="174" r="3.3"/><circle cx="39" cy="174" r="3.3"/>
        <circle cx="2" cy="296" r="3.3"/><circle cx="39" cy="296" r="3.3"/>
        <path className="connector-branch" d="M9 52v100q0 22 18 22h10M21 174v100q0 22 18 22M31 166l7 8-7 8"/>
      </>}
      {enabled?<g className="connection-flow">
        <path className="connection-pulse" d={d} pathLength="100"/>
      </g>:null}
      {active&&enabled?<circle key={pulseId} className="connection-bead" r="3.1"><animateMotion begin="indefinite" dur="1600ms" path={d} repeatCount="indefinite" fill="remove"/></circle>:null}
    </svg>
  </div>;
}

export function SampleWorkbench({samples,drafts,edit,categoryName,assays,selectedSampleId,onSelectSample}:{samples:Sample[];drafts:any[];edit:boolean;categoryName:(id:string)=>string;assays:Assay[];selectedSampleId:string;onSelectSample:(id:string)=>void}){
  const [connections,setConnections]=useState(true);
  const [motionRequested,setMotionRequested]=useState(true);
  const [reducedMotion,setReducedMotion]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [pageVisible,setPageVisible]=useState(()=>typeof document==='undefined'||document.visibilityState!=='hidden');
  const [inView,setInView]=useState(true);
  const [selectedStage,setSelectedStage]=useState<PathName|null>(null);
  const [query,setQuery]=useState('');
  const [matches,setMatches]=useState<any[]>([]);
  const [searchOpen,setSearchOpen]=useState(false);
  const [searching,setSearching]=useState(false);
  const [searchError,setSearchError]=useState('');
  const [totalMatches,setTotalMatches]=useState(0);
  const [searchPage,setSearchPage]=useState(1);
  const [loadingMore,setLoadingMore]=useState(false);
  const searchGeneration=useRef(0);
  const [activeMatch,setActiveMatch]=useState(-1);
  const [searchedSample,setSearchedSample]=useState<any>();
  const searchRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    ++searchGeneration.current;
    let active=true;
    setMatches([]);setActiveMatch(-1);setSearchError('');setTotalMatches(0);setSearchPage(1);setLoadingMore(false);
    if(!query.trim()){setSearching(false);return;}
    setSearching(true);
    const timer=setTimeout(()=>api(`/search?workflow=true&sort=latest&direction=desc&limit=50&q=${encodeURIComponent(query.trim())}`).then(data=>{
      if(active){setMatches(data.items);setTotalMatches(data.total);setSearching(false);}
    }).catch(e=>{if(active){setSearchError(e.message);setSearching(false);}}),250);
    return()=>{active=false;clearTimeout(timer);};
  },[query]);
  const loadMoreMatches=async()=>{
    if(loadingMore||searching)return;
    const generation=searchGeneration.current;
    setLoadingMore(true);setSearchError('');
    try{
      const data=await api(`/search?workflow=true&sort=latest&direction=desc&limit=50&page=${searchPage+1}&q=${encodeURIComponent(query.trim())}`);
      if(generation!==searchGeneration.current)return;
      setMatches(items=>[...items,...data.items.filter((item:any)=>!items.some(existing=>existing.id===item.id))]);
      setTotalMatches(data.total);setSearchPage(page=>page+1);
    }catch(e:any){if(generation===searchGeneration.current)setSearchError(e.message);}
    finally{if(generation===searchGeneration.current)setLoadingMore(false);}
  };
  useEffect(()=>{if(activeMatch>=0)document.getElementById(`workflow-match-${activeMatch}`)?.scrollIntoView({block:'nearest'});},[activeMatch]);
  useEffect(()=>{
    const dismiss=(event:PointerEvent)=>{if(!searchRef.current?.contains(event.target as Node))setSearchOpen(false);};
    document.addEventListener('pointerdown',dismiss);
    return()=>document.removeEventListener('pointerdown',dismiss);
  },[]);
  const chooseSample=(item:any)=>{setSearchedSample(item);onSelectSample(item.id);setQuery(item.ml);setSearchOpen(false);};
  const [pulseTarget,setPulseTarget]=useState<PathName|null>(null);
  const [pulseId,setPulseId]=useState(0);
  const root=useRef<HTMLElement>(null);
  const sample=searchedSample?.id===selectedSampleId?searchedSample:samples.find(s=>s.id===selectedSampleId)||samples[0];
  const {data:record,error}=useLoad(()=>sample?api(`/samples/${sample.id}`):Promise.resolve(undefined),[sample?.id]);
  const related=drafts.filter(d=>(d.sample?.id||d.sampleId)===sample?.id);
  const savedDrafts=record?.sample?.id===sample?.id?record.drafts||[]:[];
  const draft=[...savedDrafts,...related].sort((a:any,b:any)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0]||(sample?.draftId?{id:sample.draftId,revision:sample.draftRevision}:undefined);
  const {data:detail,error:draftError}=useLoad(()=>draft?api(`/drafts/${draft.id}`):Promise.resolve(undefined),[draft?.id]);
  const {data:setup,error:setupError}=useLoad(()=>sample&&!draft?api(`/sample-workflow/${sample.id}`):Promise.resolve(undefined),[sample?.id,draft?.id]);
  const resolved=record?.sample?.id===sample?.id?record.sample:sample;
  const loadedDraft=detail?.draft||detail;
  const draftRecord=loadedDraft?.id===draft?.id?loadedDraft:undefined;
  const results=Array.isArray(draftRecord?.results)?draftRecord.results:setup?.sample?.id===sample?.id?setup.results||[]:[];
  const specification=draftRecord?.specification||(setup?.sample?.id===sample?.id?setup.specification:undefined);
  const layoutResolution=setup?.sample?.id===sample?.id&&!draft?setup.layoutResolution:undefined;
  const layoutBlocked=Boolean(layoutResolution&&layoutResolution.status!=='ready');
  const availableAssays=assays.filter(test=>test.active!==false&&(!test.categories?.length||!sample?.category||test.categories.includes(sample.category)));
  // Connectors show the selected sample's workflow, including stages awaiting data.
  // Missing parameters and drafts remain explicit within their respective panels.
  const action=draft?`/reports/${draft.id}`:sample?`/reports?sample=${sample.id}`:'/reports';
  const motionSupported=!reducedMotion;
  const motionEnabled=motionRequested&&motionSupported;
  const paused=!pageVisible||!inView;
  const previousSample=useRef(sample?.id);

  useEffect(()=>{
    const query=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReducedMotion(query.matches);
    query.addEventListener?.('change',update);
    return()=>query.removeEventListener?.('change',update);
  },[]);
  useEffect(()=>{
    const update=()=>setPageVisible(document.visibilityState!=='hidden');
    document.addEventListener('visibilitychange',update);
    update();
    return()=>document.removeEventListener('visibilitychange',update);
  },[]);
  useEffect(()=>{
    const element=root.current;
    if(!element||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.01});
    observer.observe(element);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    if(previousSample.current!==sample?.id){
      previousSample.current=sample?.id;
      setSelectedStage(null);
      setPulseTarget(motionEnabled&&connections&&!paused?'source':null);
      setPulseId(value=>value+1);
    }
  },[sample?.id,motionEnabled,connections,paused]);
  useEffect(()=>{
    if(!motionEnabled||!connections||paused)setPulseTarget(null);
  },[motionEnabled,connections,paused]);
  const pulse=(path:PathName)=>{
    setSelectedStage(path);
    setPulseTarget(motionEnabled&&connections&&!paused?path:null);
    setPulseId(value=>value+1);
  };
  return <section ref={root} className={`sample-workbench ${connections?'connections-on':'connections-off'} ${motionEnabled?'motion-preview-on':'motion-off'} ${paused?'motion-paused':''}`} aria-label="Selected sample workflow">
    <div className="workbench-toolbar">
      <div className="workbench-options">
        <div className="workbench-option"><span>Show connections</span><button type="button" className="lab-switch" role="switch" aria-label="Show connections" aria-checked={connections} onClick={()=>setConnections(value=>!value)}><i/></button></div>
        <div className="workbench-option"><span>Motion preview</span><button type="button" className="lab-switch" role="switch" aria-label="Motion preview" aria-checked={motionEnabled} disabled={!motionSupported} title={reducedMotion?'Motion is off because reduced motion is enabled':'Toggle motion preview'} onClick={()=>setMotionRequested(value=>!value)}><i/></button></div>
      </div>
      <div className="workflow-search" ref={searchRef} onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget))setSearchOpen(false);}}>
        <label className="workflow-search-field"><Search size={20} aria-hidden="true"/><input role="combobox" aria-label="Find workflow sample by ML or control number" aria-autocomplete="list" aria-expanded={searchOpen&&Boolean(query.trim())} aria-controls="workflow-sample-matches" aria-activedescendant={searchOpen&&activeMatch>=0?`workflow-match-${activeMatch}`:undefined} autoComplete="off" placeholder="Search by ML or control number…" value={query} onFocus={()=>setSearchOpen(true)} onChange={event=>{setQuery(event.target.value);setSearchOpen(true);}} onKeyDown={event=>{
          if(event.key==='Escape'){setSearchOpen(false);setActiveMatch(-1);}
          if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setSearchOpen(true);setActiveMatch(index=>matches.length?(event.key==='ArrowDown'?(index+1)%matches.length:(index-1+matches.length)%matches.length):-1);}
          if(event.key==='Enter'&&searchOpen&&!searching){event.preventDefault();const item=matches[activeMatch]||(matches.length===1?matches[0]:undefined);if(item)chooseSample(item);}
        }}/>{query?<button type="button" aria-label="Clear sample search" onClick={()=>{setQuery('');searchRef.current?.querySelector('input')?.focus();}}><Plus size={18} style={{transform:'rotate(45deg)'}}/></button>:null}</label>
        {searchOpen&&query.trim()?<div className="workflow-search-dropdown"><div id="workflow-sample-matches" role="listbox" aria-label="Matching samples" aria-busy={searching}>
          {matches.map((item,index)=><button type="button" role="option" id={`workflow-match-${index}`} aria-selected={index===activeMatch} key={item.id} onMouseDown={event=>event.preventDefault()} onClick={()=>chooseSample(item)}>
            <strong>{item.ml} <span>{item.name||'Incomplete record'}</span></strong>
            <small>Received: {item.received||'Not recorded'} · Analyzed: {item.analysisDate||'Not recorded'}</small>
            <small>Analyzed by: {item.analyzedBy||'Not recorded'}</small>
          </button>)}
        </div>{searching?<p role="status">Searching samples…</p>:!matches.length&&!searchError?<p role="status">No matching samples. Try another ML or control number.</p>:matches.length?<p role="status">Showing {matches.length} of {totalMatches} matches · Newest received first</p>:null}
        {searchError?<p role="alert">Search unavailable. Please try again. {searchError}</p>:null}
        {matches.length<totalMatches?<button className="workflow-search-more" type="button" disabled={loadingMore} onClick={loadMoreMatches}>{loadingMore?'Loading more samples…':searchError?'Retry loading more':'Load more matches'}</button>:null}</div>:null}
      </div>
      <div className="workbench-utilities" aria-label="Quick workspace actions">
        <Link className="workbench-tool-button" to={edit?'/new':'/samples'} title={edit?'Log a sample':'Browse samples'} aria-label={edit?'Log a sample':'Browse samples'}>{edit?<Plus size={24}/>:<Search size={21}/>}</Link>
        <Link className="workbench-tool-button" to="/reports" title="Prepare a report" aria-label="Prepare a report"><FileText size={21}/></Link>
        <Link className="workbench-tool-button" to="/library" title="Open files and reports" aria-label="Open files and reports"><FolderOpen size={21}/></Link>
      </div>
    </div>

    <div className="workbench-grid">
      <svg className="workbench-tray-outline" viewBox="0 0 1448 491" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M28 1H440q14 0 24 12l17 17q10 11 25 11h552q15 0 25-11l17-17q10-12 24-12h296q27 0 27 27v435q0 27-27 27H28q-27 0-27-27V28Q1 1 28 1Z"/>
      </svg>
      <article className="sample-identity" aria-label="Selected sample details">
        <div className="identity-topline">
          <span className="identity-icon"><FlaskConical size={25}/></span>
          {samples.length>1?<label className="identity-sample-picker" title="Change selected sample"><span className="sr-only">Current workflow sample</span><ChevronDown size={17}/><select aria-label="Current workflow sample" value={sample?.id||''} onChange={event=>onSelectSample(event.target.value)}>{(sample?[sample,...samples.filter(item=>item.id!==sample.id)]:samples).map(item=><option key={item.id} value={item.id}>{item.ml} · {item.name||'Incomplete record'}</option>)}</select></label>:edit?<Link className="identity-add" to="/new" aria-label="Log another sample" title="Log another sample"><Plus size={19}/></Link>:null}
        </div>
        <h2>{sample?.name||'Choose a sample to begin'}</h2>
        {sample?<dl>
          <div><dt>Sample ID</dt><dd>{sample.ml||'Not recorded'}</dd></div>
          <div><dt>Batch / lot</dt><dd>{sample.batch||'Not recorded'}</dd></div>
          <div><dt>Product type</dt><dd>{categoryName(sample.category)}</dd></div>
          <div><dt>Testing context</dt><dd>{sample.context||'Not recorded'}</dd></div>
          <div><dt>Location</dt><dd>{resolved?.fields?.area||resolved?.fields?.location||'Not recorded'}</dd></div>
          <div><dt>Source status</dt><dd><Badge tone={sample.status==='RELEASED'?'green':sample.status?'neutral':'amber'}>{sample.status||'Not recorded'}</Badge></dd></div>
        </dl>:<p className="identity-empty">Select a logged sample to view its source details.</p>}
        {sample?<div className="identity-links"><Link to={`/samples/${sample.id}`}><FileText size={18}/>View history</Link><Link to={`/samples/${sample.id}`}><Search size={18}/>Sample details</Link></div>:<Link className="button secondary" to="/samples">Find a sample</Link>}
      </article>

      <WorkflowConnector path="source" active={pulseTarget==='source'} pulseId={pulseId} enabled={connections&&Boolean(sample)} flowing={motionEnabled} paused={paused||!motionEnabled}/>
      <div className={`workflow-step ${selectedStage==='source'?'is-selected':''}`}>
        <article className="workflow-panel">
          <span className="workflow-context-icon" aria-hidden="true"><FlaskConical size={21}/></span>
          <LabGraphic key={selectedStage==='source'?pulseId:'source'} kind="dish"/>
          <h3 className="workflow-title-heading"><button className="workflow-title" type="button" aria-pressed={selectedStage==='source'} onClick={()=>pulse('source')}>Sample information</button></h3>
          <div className="workflow-facts">
            <div><MapPin size={19}/><span>Type &amp; location<small>{sample?categoryName(sample.category):'No sample selected'}{resolved?.fields?.area?` · ${resolved.fields.area}`:''}</small></span></div>
            <div><Thermometer size={19}/><span>Environmental conditions<small>{resolved?.fields?.temperature||resolved?.fields?.humidity||'Not recorded'}</small></span></div>
            <div><MessageSquare size={19}/><span>Source notes<small>{resolved?.remarks||'Not recorded'}</small></span></div>
          </div>
          <ErrorBox message={error}/>
        </article>
        <span className="workflow-caption">Source</span>
      </div>

      <WorkflowConnector path="tests" active={pulseTarget==='tests'} pulseId={pulseId} enabled={connections&&Boolean(sample)} flowing={motionEnabled} paused={paused||!motionEnabled}/>
      <div className={`workflow-step ${selectedStage==='tests'?'is-selected':''}`}>
        <article className="workflow-panel">
          <span className="workflow-context-icon" aria-hidden="true"><Beaker size={21}/></span>
          <LabGraphic key={selectedStage==='tests'?pulseId:'tests'} kind="assay"/>
          <h3 className="workflow-title-heading"><button className="workflow-title" type="button" aria-pressed={selectedStage==='tests'} onClick={()=>pulse('tests')}>Product parameters</button></h3>
          <div className="workflow-facts workflow-parameter-results" aria-live="polite">
            {(specification?.tests||[]).map((test:any)=>{
              const meta=availableAssays.find(assay=>assay.id===test.test);
              const result=results.find((item:any)=>resultKey(item)===resultKey(test));
              const value=result?.state==='entered'?resultDisplayValue(test,result):result?.state==='not_tested'?`Not tested · ${result.reason||'Reason recorded in draft'}`:draft?(draftRecord?'Not entered':'Loading results…'):setup?.resultLookup==='not_found'?'No result recorded':'Not entered';
              return <div key={resultKey(test)}><Beaker size={19}/><span><strong>{meta?.shortName||test.test}</strong>{[test.location,test.stage,test.replicate].filter(Boolean).length?<small>{[test.location,test.stage,test.replicate].filter(Boolean).join(' · ')}</small>:null}<small className="parameter-value">{value}</small><small>{test.criterion||'Criteria not recorded'}</small></span></div>;
            })}
            {!specification?<p>{draftError||setupError?'Parameters unavailable':sample?'Loading product parameters…':'Select a sample to see its parameters'}</p>:!specification.tests?.length?<p>{setup?.environmental?'An approved sampling pattern is needed to supply locations and criteria.':'No parameters configured for this product.'}</p>:null}
          </div>
          <ErrorBox message={draftError||setupError}/>
        </article>
        <span className="workflow-caption">Results</span>
      </div>

      <WorkflowConnector path="report" active={pulseTarget==='report'} pulseId={pulseId} enabled={connections&&Boolean(sample)} flowing={motionEnabled} paused={paused||!motionEnabled}/>
      <div className={`workflow-step ${selectedStage==='report'?'is-selected':''}`}>
        <article className={`workflow-panel ${layoutBlocked?'is-blocked':''}`}>
          <span className="workflow-context-icon" aria-hidden="true"><FileText size={21}/></span>
          <LabGraphic key={selectedStage==='report'?pulseId:'report'} kind="sheets"/>
          <h3 className="workflow-title-heading"><button className="workflow-title" type="button" aria-pressed={selectedStage==='report'} onClick={()=>pulse('report')}>Draft report</button></h3>
          <div className="workflow-facts">
            <div><FileText size={19}/><span>Saved draft<small>{draft?<Badge>Draft · revision {draft.revision}</Badge>:'No related draft'}</small></span></div>
            {!layoutBlocked?<><div><MessageSquare size={19}/><span>Required inputs<small>{draft?draft.referenceIssue?'Reference needs attention':draft.missing?`${draft.missing} required items missing`:'Inputs complete':'Resolved when preparing a report'}</small></span></div>
            <div><FolderOpen size={19}/><span>Linked source<small>{sample?.ml||'Not selected'}</small></span></div></>:null}
          </div>
          {layoutBlocked?<div className="workflow-resolution" role="region" aria-label="Report setup issue" tabIndex={0}><ErrorBox message={layoutResolution.message}/></div>:null}
          {layoutBlocked&&setup?.environmental&&layoutResolution.status==='missing'?<Link className="workflow-report-link" to="/settings?section=templates#environmental-patterns">Configure sampling pattern <ArrowRight size={14}/></Link>:null}
          {sample?<Link className="workflow-report-link" to={`${action}#results-details`}>Results &amp; details <ArrowRight size={14}/></Link>:null}
        </article>
        <span className="workflow-caption">Report draft</span>
      </div>

      <WorkflowConnector path="actions" active={false} pulseId={pulseId} enabled={connections&&Boolean(sample)} flowing={motionEnabled} paused={paused||!motionEnabled}/>
      <div className="workbench-actions" aria-label="Workspace actions">
        {[
          {to:edit?'/new':'/samples',label:edit?'Log sample':'Browse samples',icon:FlaskConical},
          {to:'/samples',label:'Find sample',icon:Search},
          {to:action,label:'Results entry',icon:Beaker},
          {to:'/reports',label:'Report drafts',icon:FileText},
          {to:'/library',label:'File library',icon:FolderOpen},
          {to:'/assistant',label:'Smart assistant',icon:Search},
        ].map((item,index)=>{const Icon=item.icon;return <Link className={`action-tile ${index===0?'primary-tile':''}`} key={item.label} to={item.to}><Icon size={26}/><strong>{item.label}</strong><span><ArrowRight size={17}/></span></Link>;})}
      </div>
    </div>
  </section>;
}
