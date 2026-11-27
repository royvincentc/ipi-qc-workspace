import {useContext,useEffect,useRef,useState} from 'react';
import {Download,FileText,ArrowRight,X} from './components/LabIcons';
import {api} from './api';
import {PageTitle,Field,ErrorBox,Badge,SearchInput,Session,useLoad,useCanEdit} from './ui';
import {addDays,analystAbbreviation,oosDocuments,oosFileName,oosParameter,oosParameters,oosTypes,productFill,shortProductName,type OosForm} from '../shared/oos';
import type {Sample} from '../shared/model';

type Generated={mlir:string;files:{id:string;name:string;document:string}[]};
const required:(keyof OosForm)[]=['product','shortName','batch','number','parameter','result','specification','dateObserved','dateRetest','analyst','analystAbbrev'];
const today=()=>new Date().toLocaleDateString('en-CA');

// Derived fields (short name, fill, abbreviation, specification, retest date) follow their source until the analyst edits them.
function apply(f:OosForm,patch:Partial<OosForm>):OosForm{
 const n={...f,...patch};
 if('product' in patch){if(f.shortName===shortProductName(f.product))n.shortName=shortProductName(n.product);if(f.fill===productFill(f.product))n.fill=productFill(n.product);}
 if('analyst' in patch&&f.analystAbbrev===analystAbbreviation(f.analyst))n.analystAbbrev=analystAbbreviation(n.analyst);
 const p=oosParameter(n.parameter);
 if(p&&'parameter' in patch&&(!f.specification||f.specification===oosParameter(f.parameter)?.specification))n.specification=p.specification;
 if(p&&n.dateObserved&&('parameter' in patch||'dateObserved' in patch))n.dateRetest=addDays(n.dateObserved,p.retestDays);
 return n;
}

export default function OosMaker(){
 const {user}=useContext(Session),canEdit=useCanEdit();
 const [form,setForm]=useState<OosForm>(()=>apply({product:'',shortName:'',fill:'',batch:'',type:'FG',number:'',parameter:'',result:'',specification:'',dateObserved:'',dateRetest:'',includedProducts:'',analyst:'',analystAbbrev:''},{dateObserved:today(),analyst:user.name}));
 const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[sampleId,setSampleId]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[generated,setGenerated]=useState<Generated>();
 useEffect(()=>{const timer=setTimeout(()=>setSearch(query),250);return()=>clearTimeout(timer);},[query]);
 const {data:found}=useLoad(()=>api<{items:Sample[]}>('/search?limit=25&q='+encodeURIComponent(search)),[search]);
 const update=(patch:Partial<OosForm>)=>{setForm(f=>apply(f,patch));setGenerated(undefined);setError('');};
 const input=(key:keyof OosForm,props:React.InputHTMLAttributes<HTMLInputElement>={})=><input value={form[key]} disabled={!canEdit||busy} required={required.includes(key)} onChange={e=>update({[key]:e.target.value})} {...props}/>;
 const chooseSample=(id:string)=>{
  setSampleId(id);const s=found?.items.find(item=>item.id===id);if(!s)return;
  update({product:s.name,batch:s.batch,...(oosTypes.includes(s.category as any)?{type:s.category}:{}),...(s.fields?.analyzedBy?{analyst:s.fields.analyzedBy}:{})});
  if(s.fields?.fillVolume)setForm(f=>({...f,fill:s.fields.fillVolume}));
 };
 const products=form.includedProducts.split('\n'),focusRow=useRef(-1);
 const setProducts=(rows:string[])=>update({includedProducts:rows.join('\n')});
 const missing=required.filter(k=>!form[k].trim());
 const valid=!missing.length&&/^\d{1,4}$/.test(form.number.trim())&&form.dateRetest>=form.dateObserved;
 const mlir=`MLIR/${form.type}-${form.dateObserved.slice(0,4)||'YYYY'}-${form.number.trim()?form.number.trim().padStart(3,'0'):'###'}`;
 const generate=async()=>{setBusy(true);setError('');try{setGenerated(await api<Generated>('/oos/generate','POST',form));}catch(e:any){setError(e.message);}finally{setBusy(false);}};

 return <div className="reports-workbench oos-maker">
  <PageTitle title="OOS Maker" description="Fill the alert notice, Phase 1 and Phase 2 MLIR forms for one out-of-specification result."/>
  <div className="reports-layout">
   <section className="panel padded report-setup-panel" aria-labelledby="oos-sample-title">
    <div className="section-heading"><h2 id="oos-sample-title">Sample</h2><FileText size={21} aria-hidden="true"/></div>
    <SearchInput value={query} onChange={setQuery} placeholder="Find sample by ML number, product or batch…"/>
    <Field label="Start from a logged sample" hint="Optional. Fills the product, batch, type and analyst."><select value={sampleId} disabled={!canEdit||busy} onChange={e=>chooseSample(e.target.value)}><option value="">Enter details by hand…</option>{found?.items.map(s=><option key={s.id} value={s.id}>{s.ml} · {s.name} · {s.batch}</option>)}</select></Field>
    <div className="form-grid">
     <Field label="Sample complete name">{input('product',{placeholder:'Omega Pain Killer Liniment - 120 mL'})}</Field>
     <Field label="Batch / lot no.">{input('batch')}</Field>
     <Field label="Short name" hint="Used in the file names.">{input('shortName',{maxLength:40})}</Field>
     <Field label="Fill">{input('fill',{maxLength:40,placeholder:'120 mL'})}</Field>
    </div>
    <div className="section-heading"><h2>Deviation</h2></div>
    <div className="form-grid">
     <Field label="Sample type"><select value={form.type} disabled={!canEdit||busy} onChange={e=>update({type:e.target.value})}>{oosTypes.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
     <Field label="MLIR number" hint="Next number in this type's MLIR log for the year.">{input('number',{inputMode:'numeric',pattern:'\\d{1,4}',placeholder:'205'})}</Field>
     <Field label="Parameter" hint="SPC, M&Y and P. aeruginosa fill the usual specification and retest date.">{input('parameter',{list:'oos-parameters',autoComplete:'off'})}</Field>
     <Field label="Result">{input('result',{placeholder:'TNTC'})}</Field>
     <Field label="Specification">{input('specification')}</Field>
     <Field label="Date observed">{input('dateObserved',{type:'date'})}</Field>
     <Field label="Retest date" hint={form.dateRetest&&form.dateRetest<form.dateObserved?'Must be on or after the date observed.':undefined}>{input('dateRetest',{type:'date',min:form.dateObserved})}</Field>
     <Field label="MLIR initiated by">{input('analyst')}</Field>
     <Field label="Initials" hint="Shown in brackets in the file names.">{input('analystAbbrev',{maxLength:10})}</Field>
     <fieldset className="field oos-products" disabled={!canEdit||busy}>
      <legend>Included products</legend>
      {products.map((product,i)=><div className="oos-product-row" key={i}>
       <input value={product} aria-label={`Included product ${i+1}`} placeholder="Product name - batch no." ref={el=>{if(el&&focusRow.current===i){el.focus();focusRow.current=-1;}}} onChange={e=>setProducts(products.map((p,j)=>j===i?e.target.value:p))}/>
       {products.length>1?<button type="button" className="icon-button" aria-label={`Remove included product ${i+1}`} onClick={()=>{focusRow.current=Math.max(0,i-1);setProducts(products.filter((_,j)=>j!==i));}}><X size={16} aria-hidden="true"/></button>:null}
      </div>)}
      <button type="button" className="button secondary" onClick={()=>{focusRow.current=products.length;setProducts([...products,'']);}}>Add product</button>
      <small>Other products affected by the same deviation. Leave blank for N/A.</small>
     </fieldset>
    </div>
    <datalist id="oos-parameters">{oosParameters.map(p=><option key={p.name} value={p.name}>{p.specification}</option>)}</datalist>
    <ErrorBox message={error}/>
    <div className="report-setup-footer"><small>{valid?'All three forms will be filled from these details.':missing.length?`Still needed: ${missing.length} field${missing.length>1?'s':''}.`:'Check the MLIR number and dates.'}</small><button className="button primary" disabled={!valid||busy||!canEdit} onClick={generate}>{busy?'Generating…':'Generate forms'} <ArrowRight size={17}/></button></div>
   </section>
   <aside className="panel padded saved-reports-panel" aria-labelledby="oos-files-title" aria-live="polite">
    <div className="section-heading"><h2 id="oos-files-title">Documents</h2><Badge tone={generated?'green':'neutral'}>{generated?'Ready':'Preview'}</Badge></div>
    <p className="mono">{generated?.mlir||mlir}</p>
    <ul className="oos-files">{oosDocuments.map(document=>{const file=generated?.files.find(f=>f.document===document);return <li key={document}>
     <span>{file?.name||oosFileName(form,document)}</span>
     {file?<a className="button secondary" href={`/api/files/${file.id}/download`} download={file.name}><Download size={15} aria-hidden="true"/> Download<span className="sr-only"> {document}</span></a>:null}
    </li>;})}</ul>
    <small className="muted">Generated forms are also kept in the File Library.</small>
   </aside>
  </div>
 </div>;
}
