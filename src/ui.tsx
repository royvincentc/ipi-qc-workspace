import {useCatalog,useUnsaved,useConfiguration} from './configuration';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,FlaskConical,Search} from 'lucide-react';
import type {Sample,User} from '../shared/model';

export const Session=createContext<{user:User;demo:boolean}>({user:{email:'',name:'',role:'viewer'},demo:false});
export const Notice=createContext<(message:string,error?:boolean)=>void>(()=>{});
export function useLoad<T>(fetcher:()=>Promise<T>,deps:unknown[]=[]){const [data,setData]=useState<T>(),[error,setError]=useState(''),[version,setVersion]=useState(0);useEffect(()=>{let active=true;setError('');setData(undefined);fetcher().then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[...deps,version]);return {data,setData,error,reload:()=>setVersion(v=>v+1)};}
export function PageTitle({eyebrow,title,description,action}:{eyebrow?:string;title:string;description:string;action?:ReactNode}){const {config}=useConfiguration();return <div className="page-heading"><div><div className="eyebrow">{eyebrow||config.value.general.department.toUpperCase()}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;}
export function Empty({title,children}:{title:string;children?:ReactNode}){return <div className="empty"><FlaskConical size={32}/><h3>{title}</h3><p>{children}</p></div>;}
export function ErrorBox({message}:{message:string}){return message?<div className="error" role="alert">{message}</div>:null;}
export function Loading(){return <div className="loading-state" role="status" aria-live="polite"><div className="loading-orbit" aria-hidden="true"><FlaskConical/><i/><i/><i/></div><strong>Preparing your workspace</strong><span className="typing-status">Checking samples and records</span></div>;}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:string}){return <span className={`badge ${tone}`}>{children}</span>;}
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){return <label className="field"><span>{label}</span>{children}{hint?<small>{hint}</small>:null}</label>;}
export function SampleList({samples}:{samples:Sample[]}){const {categories,testLabels}=useCatalog();return samples.length?<div className="sample-list">{samples.map(s=><Link className="sample-row" to={`/samples/${s.id}`} key={s.id}><div className="sample-icon"><FlaskConical size={20}/></div><div className="sample-main"><span className="mono muted">{s.ml}</span><strong>{s.name||'Incomplete source record'}</strong><span className="muted">{categories[s.category]} · Batch {s.batch||'not entered'}</span></div><div className="sample-meta"><Badge tone={s.status==='RELEASED'?'green':'amber'}>{s.status||'Not recorded'}</Badge>{s.duplicate?<Badge tone="red">Duplicate ML</Badge>:null}<small>{s.source.sheet}</small></div><ArrowUpRight size={18}/></Link>)}</div>:<Empty title="No samples found">Try another search or connect your logbook in Settings.</Empty>;}
export function SearchInput({value,onChange,placeholder='Search ML number, product or batch…'}:{value:string;onChange:(v:string)=>void;placeholder?:string}){return <div className="search"><Search size={18}/><input aria-label={placeholder} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>;}
export function useCanEdit(){return useContext(Session).user.role!=='viewer';}
