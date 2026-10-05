import {useCatalog,useUnsaved,useConfiguration} from './configuration';
import {useContext,useEffect,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,Plus,FileText,FlaskConical,RefreshCw,Link2,Clock3,CheckCircle2,FolderOpen} from 'lucide-react';
import {api} from './api';
import {PageTitle,SampleList,useLoad,Session,Notice,Badge,Field,SearchInput,ErrorBox,Loading,Empty,useCanEdit} from './ui';
import {type Category,type Sample} from '../shared/model';
export function SampleDetail(){
  const {config}=useConfiguration();
  const {categories}=useCatalog();
  const {id}=useParams();
  const {data,error}=useLoad(()=>api(`/samples/${id}`),[id]);
  const canEdit=useCanEdit();
  if(!data)return error?<ErrorBox message={error}/>:<Loading/>;
  const s=data.sample as Sample;
  const source=s.source||{};
  const fields=s.fields||{};
  const drafts=data.drafts||[];
  const history=data.history||[];
  const values={
    'ML number':s.ml,
    'Batch / lot':s.batch,
    'Received':s.received,
    'Testing context':s.context||'Not recorded',
    'Source status':s.status||'Not recorded',
    'Source remarks':s.remarks||'Not recorded',
    ...Object.fromEntries(Object.entries(fields)
      .filter(([key])=>!['ml','name','batch','received','status','remarks','context'].includes(key))
      .map(([key,value])=>[
        config.value.sampleTypes.find(type=>type.id===s.category)?.fields.find(field=>field.key===key)?.label
          ||key.replace(/([A-Z])/g,' $1').replace(/^./,letter=>letter.toUpperCase()),
        value,
      ])),
  };
  return <>
    <Link className="back" to="/samples">← Sample lookup</Link>
    <PageTitle title={s.name||'Incomplete sample'} eyebrow={s.ml} description={`${categories[s.category]||s.category||'Sample type not recorded'} · Batch ${s.batch||'not recorded'}`} action={canEdit?<Link to={`/reports?sample=${s.id}`} className="button primary"><FileText size={18}/> Prepare report</Link>:null}/>
    <div className="two-col">
      <section className="panel padded">
        <h2>Sample record</h2>
        <dl className="details">{Object.entries(values).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value==null||value===''?'—':String(value)}</dd></div>)}</dl>
      </section>
      <div className="stack">
        <section className="panel padded">
          <h2>Source location</h2>
          <p>{source.sheet||'No source sheet recorded.'}</p>
          <dl className="details">
            <div><dt>Section</dt><dd>{source.section||'Not recorded'}</dd></div>
            <div><dt>Row</dt><dd>{source.row??'Not recorded'}</dd></div>
            <div><dt>Range</dt><dd>{source.range||'Not recorded'}</dd></div>
            <div><dt>Last observed</dt><dd>{source.observedAt?new Date(source.observedAt).toLocaleString():'Not recorded'}</dd></div>
          </dl>
          {source.url?<a className="button secondary" href={source.url} target="_blank" rel="noreferrer">Open source record <ArrowUpRight size={16}/></a>:null}
        </section>
        <section className="panel padded">
          <h2>Report drafts</h2>
          {drafts.length?drafts.map((draft:any)=><Link className="draft-link" key={draft.id||`${draft.revision}-${draft.updatedAt}`} to={`/reports/${draft.id}`}><strong>Analysis report · revision {draft.revision}</strong><small>{draft.updatedAt?new Date(draft.updatedAt).toLocaleString():'Updated time not recorded'}</small></Link>):<p>No reports prepared for this sample.</p>}
        </section>
        <section className="panel padded">
          <h2>Source history</h2>
          {history.length?history.map((entry:any,index:number)=><p key={entry.created_at||index}>Observed {entry.created_at?new Date(entry.created_at).toLocaleString():'at an unrecorded time'} · {entry.data?.sheet||'Source sheet not recorded'}, row {entry.data?.row??'not recorded'}</p>):<p>No source changes recorded.</p>}
        </section>
      </div>
    </div>
  </>;
}
