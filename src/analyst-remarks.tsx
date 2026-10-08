import {useId} from 'react';
import {Check, X} from 'lucide-react';

/** Explicit analyst choice; an empty result never defaults to Passed. */
export function AnalystRemarks({value,disabled,onChange}:{value:string;disabled:boolean;onChange:(value:string)=>void}){
 const id=useId();
 const selected=value==='Passed'?'passed':value==='Failed'?'failed':'unset';
 return <div className="field analyst-remarks-field"><span id={`${id}-label`}>Analyst remarks</span>
  <div className="analyst-outcome" role="radiogroup" aria-labelledby={`${id}-label`} data-outcome={selected} aria-disabled={disabled}>
   <span className="analyst-outcome-thumb" aria-hidden="true"/>
   {(['Passed','Failed'] as const).map(outcome=><label className="analyst-outcome-option" key={outcome}>
    <input type="radio" name={id} value={outcome} checked={value===outcome} disabled={disabled} onChange={()=>onChange(outcome)}/>
    <span>{outcome==='Passed'?<Check size={16} aria-hidden="true"/>:<X size={16} aria-hidden="true"/>}{outcome}</span>
   </label>)}
  </div>
 </div>;
}
