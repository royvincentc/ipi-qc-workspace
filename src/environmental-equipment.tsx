import {useId,useState} from 'react';
import {Minus,Plus,Layers,Check} from './components/LabIcons';
import type {EquipmentCatalog,EquipmentQuantity} from '../shared/environmental';
import {SearchInput} from './ui';

export function EnvironmentalEquipment({catalog,value,disabled,onChange}:{catalog:EquipmentCatalog;value:EquipmentQuantity[];disabled:boolean;onChange:(value:EquipmentQuantity[])=>void}){
 const id=useId(),[query,setQuery]=useState(''),[quantityText,setQuantityText]=useState<Record<string,string>>({});
 const selected=value.filter(q=>q.quantity>0),total=selected.reduce((n,q)=>n+q.quantity,0);
 const change=(equipmentId:string,quantity:number)=>{
  setQuantityText(text=>{const next={...text};delete next[equipmentId];return next;});
  const current=value.find(q=>q.id===equipmentId),item=catalog.items.find(i=>i.id===equipmentId)!;
  const labels=current?.labels&&Number.isInteger(quantity)&&quantity>0&&quantity<=300?Array.from({length:quantity},(_,index)=>current.labels?.[index]||`${item.name} ${index+1}`):undefined;
  onChange([...value.filter(q=>q.id!==equipmentId),...(quantity!==0?[{id:equipmentId,quantity,...(labels?{labels}:{})}]:[])]);
 };
 const visible=catalog.items.filter(item=>value.some(q=>q.id===item.id)||item.name.toLowerCase().includes(query.toLowerCase()));
 return <section className="equipment-picker" aria-labelledby={id+'-title'}>
  <header className="equipment-picker-head"><div><h2 id={id+'-title'}>Equipment sampled</h2><p>Select each equipment type, then enter how many were sampled.</p></div><Layers size={24} aria-hidden="true"/></header>
  {catalog.items.length>6?<SearchInput value={query} onChange={setQuery} placeholder="Find equipment…"/>:null}
  <div className="equipment-list">
   {visible.map(item=>{const quantity=value.find(q=>q.id===item.id)?.quantity||0;return <div className="equipment-choice" data-selected={quantity>0} key={item.id}>
    <label className="equipment-include"><input type="checkbox" checked={quantity!==0} disabled={disabled||(Boolean(item.issue)&&quantity===0)} onChange={e=>change(item.id,e.target.checked?1:0)}/><span><strong>{item.name}</strong><small>{item.issue||'Accupoint + SPCMY'}</small></span></label>
    {quantity!==0?<div className="equipment-quantity"><button type="button" className="icon-button" disabled={disabled} aria-label={`Reduce ${item.name} quantity`} onClick={()=>change(item.id,Math.max(0,quantity-1))}><Minus size={16}/></button><input aria-label={`${item.name} quantity`} type="number" inputMode="numeric" min={1} max={300} step={1} disabled={disabled} value={quantityText[item.id]??quantity} onChange={e=>{const text=e.target.value;if(text!=='')change(item.id,Number(text));setQuantityText(old=>({...old,[item.id]:text}));}} onBlur={()=>setQuantityText(text=>{const next={...text};delete next[item.id];return next;})}/><button type="button" className="icon-button" disabled={disabled||quantity>=300} aria-label={`Increase ${item.name} quantity`} onClick={()=>change(item.id,quantity+1)}><Plus size={16}/></button></div>:null}
    {quantity>0?<details className="equipment-standards"><summary>Approved parameters</summary>{item.parameters.map((p,index)=><p key={index}><strong>{p.method==='accupoint'?'Accupoint':'SPCMY'} · {p.label}</strong><span>{p.criterion}</span></p>)}</details>:null}
   </div>;})}
   {!visible.length?<p className="muted">No equipment matches this search.</p>:null}
  </div>
  <div className="equipment-count" role="status" aria-live="polite"><Check size={17} aria-hidden="true"/><span>{selected.length?`${selected.length} equipment types · ${total} sampling points`:'Select equipment to start'}<small>The same points appear in both method tables; measurements stay separate.</small></span></div>
  {selected.length?<details className="equipment-labels"><summary>Edit equipment point labels <span>Optional</span></summary><p className="muted">Numbers are labels within this session. Enter the observed equipment identifiers here when they differ.</p>{selected.filter(q=>Number.isInteger(q.quantity)&&q.quantity<=300).map(q=>{const item=catalog.items.find(i=>i.id===q.id)!;return <fieldset key={q.id}><legend>{item.name}</legend><div className="equipment-label-grid">{Array.from({length:q.quantity},(_,index)=><label key={index}><span>Point {index+1}</span><input disabled={disabled} maxLength={200} value={q.labels?.[index]??`${item.name} ${index+1}`} onChange={e=>{const labels=Array.from({length:q.quantity},(_,i)=>q.labels?.[i]??`${item.name} ${i+1}`);labels[index]=e.target.value;onChange(value.map(item=>item.id===q.id?{...item,labels}:item));}}/></label>)}</div></fieldset>;})}</details>:null}
 </section>;
}
