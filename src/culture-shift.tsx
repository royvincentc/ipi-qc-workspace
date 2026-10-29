import {useRef,useState,type KeyboardEvent} from 'react';
import {cultureCells,newCultureRun,stepCulture,type Cell,type CultureAction,type Mutation} from '../shared/culture-shift';
import './culture-shift.css';

const mutations:{id:Mutation;name:string;description:string}[]=[
 {id:'membrane',name:'Thick skin',description:'+2 max vitality. Recover 4 vitality.'},
 {id:'catalyst',name:'Hot chemistry',description:'+1 damage to strikes and enzyme pulses.'},
 {id:'resonance',name:'Wide awake',description:'+1 tile of enzyme pulse reach.'},
];
const themes=['Rose agar','Blue broth','Honey medium','Violet culture'];
const position=(cell:Cell)=>`column ${cell.x+1}, row ${cell.y+1}`;
const directions=[{label:'Move up',key:'up',dx:0,dy:-1,path:'m8 13 4-5 4 5'},{label:'Move left',key:'left',dx:-1,dy:0,path:'m14 7-5 5 5 5'},{label:'Move down',key:'down',dx:0,dy:1,path:'m8 11 4 5 4-5'},{label:'Move right',key:'right',dx:1,dy:0,path:'m10 7 5 5-5 5'}];

export function CultureShift({generating,ready,onViewReport}:{generating:boolean;ready:boolean;onViewReport:()=>void}){
 const [run,setRun]=useState<ReturnType<typeof newCultureRun>|null>(null),[folded,setFolded]=useState(false);
 const board=useRef<HTMLDivElement>(null);
 const act=(action:CultureAction)=>setRun(current=>current?stepCulture(current,action):current);
 const start=()=>{setRun(newCultureRun());setFolded(false);requestAnimationFrame(()=>board.current?.focus({preventScroll:true}));};
 const keyDown=(event:KeyboardEvent<HTMLDivElement>)=>{
  if(event.target!==event.currentTarget)return;
  const moves:Record<string,[number,number]>={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
  const key=event.key.length===1?event.key.toLowerCase():event.key;
  if(moves[key]){event.preventDefault();act({type:'move',dx:moves[key][0],dy:moves[key][1]});}
  if(key===' '||key==='e'){event.preventDefault();act({type:'pulse'});}
  if(key==='.'){event.preventDefault();act({type:'wait'});}
 };
 if(!generating&&!run)return null;
 return <section className={`culture-game culture-theme-${run?(run.plate-1)%4:0}`} aria-label="Culture Shift game">
  <header className="culture-header">
   <div><h2>Culture Shift<span>A petri-dish roguelike</span></h2><p>{run?'One tiny organism. A very big survival instinct.':'A little evolution while your report takes shape.'}</p></div>
   {run?<button type="button" className="culture-text-button" aria-expanded={!folded} onClick={()=>setFolded(value=>!value)}>{folded?'Resume culture':'Minimize game'}</button>:null}
  </header>
  {run?<div className="culture-report-status"><span role="status">{generating?'Your report is preparing in the background.':ready?'Your report is ready. Keep playing for as long as you like.':'Your culture can continue. Check report status and any errors below.'}</span>{!generating&&ready?<button type="button" className="culture-text-button" onClick={onViewReport}>View report</button>:null}</div>:null}
  {!run?<div className="culture-invitation"><div className="culture-specimen" aria-hidden="true"><svg viewBox="0 0 120 100"><ellipse cx="60" cy="52" rx="48" ry="38" fill="none" stroke="currentColor" strokeWidth="2"/><ellipse cx="60" cy="52" rx="40" ry="30" fill="currentColor" opacity=".12"/><path d="M40 51c-4-19 29-24 37-10 12 17-9 35-24 26-8-3-14-7-13-16Z" fill="currentColor"/><circle cx="56" cy="49" r="3" fill="#fff"/><circle cx="69" cy="47" r="3" fill="#fff"/><circle cx="28" cy="44" r="4" fill="#af4261"/><circle cx="85" cy="66" r="5" fill="#af4261"/></svg></div><div><p>Explore a living plate. Outsmart rival colonies. Choose mutations and see how far your strain survives.</p><small>Turn based. No timer. Your report never interrupts a run.</small></div><button type="button" className="culture-primary" onClick={start}>Start a culture</button></div>:!folded?<>
   <div className="culture-layout">
    <div className="culture-playfield">
     <div className="culture-plate-label"><strong>Plate {String(run.plate).padStart(2,'0')}</strong><span>{themes[(run.plate-1)%4]}</span><span>Turn {run.turn}</span></div>
     <div className="culture-board" ref={board} tabIndex={0} onKeyDown={keyDown} role="group" aria-label="Culture plate. Arrow keys or W A S D to move, Space to pulse, period to wait." aria-describedby="culture-instructions culture-positions">
      <svg viewBox="0 0 460 460" role="img" aria-label={`Plate ${run.plate}. You are at column ${run.player.x+1}, row ${run.player.y+1}. ${run.food.length} nutrients and ${run.rivals.length} rivals remain.`}>
       <circle className="culture-rim" cx="230" cy="230" r="222"/><circle className="culture-agar" cx="230" cy="230" r="211"/>
       {cultureCells.map(c=><circle key={`${c.x}-${c.y}`} cx={54+c.x*44} cy={54+c.y*44} r="2" className="culture-grid"/>)}
       <circle cx={54+run.exit.x*44} cy={54+run.exit.y*44} r="17" className={`culture-gate${run.food.length?'':' culture-gate-open'}`}/>
       <path d={`M${46+run.exit.x*44} ${54+run.exit.y*44}h16m-6-6 6 6-6 6`} className="culture-gate-arrow"/>
       {run.food.map(c=><g key={`${c.x}-${c.y}`} transform={`translate(${54+c.x*44} ${54+c.y*44})`} className="culture-food"><path d="M0-10 8-4 8 5 0 10-8 5-8-4Z"/><circle r="3"/></g>)}
       {run.rivals.map((c,i)=><g key={i} transform={`translate(${54+c.x*44} ${54+c.y*44})`} className="culture-rival"><path d="m0-17 5 5 8-1 1 8 5 5-6 5-1 8-8-1-6 4-4-7-7-3 2-8-3-6 8-3Z"/><path d="m-5-3 3 3-3 3m10-6-3 3 3 3"/>{c.hp>1?<text y="29" textAnchor="middle">{c.hp}</text>:null}</g>)}
       <g transform={`translate(${54+run.player.x*44} ${54+run.player.y*44})`} className="culture-player">
        <path className="culture-pulse-range" d={`M0 ${-run.range*44} ${run.range*44} 0 0 ${run.range*44} ${-run.range*44} 0Z`} strokeDasharray="3 7"/>
        <path d="M-17 0C-22-19 7-26 18-10 31 7 9 26-8 17-18 14-20 7-17 0Z"/><circle cx="-5" cy="-4" r="3"/><circle cx="7" cy="-5" r="3"/><path className="culture-smile" d="M-4 6q5 5 10-1"/>
       </g>
      </svg>
     </div>
     <div className="culture-legend"><span><i className="culture-key-player"/>You</span><span><i className="culture-key-rival"/>Rival</span><span><i className="culture-key-food"/>Nutrient</span><span><i className="culture-key-gate"/>Transfer gate</span></div>
    </div>
    <aside className="culture-console">
     <div className="culture-vitals"><div><span>Vitality</span><strong>{run.hp}<small> / {run.maxHp}</small></strong></div><meter min={0} max={run.maxHp} value={run.hp} low={3} optimum={run.maxHp} aria-label="Organism vitality"/></div>
     <dl className="culture-stats"><div><dt>Pulse charges</dt><dd>{run.energy}</dd></div><div><dt>Nutrients</dt><dd>{3-run.food.length} / 3</dd></div><div><dt>Research score</dt><dd>{run.score}</dd></div><div><dt>Strike / reach</dt><dd>{run.power} / {run.range}</dd></div></dl>
     <p className="culture-objective">{run.food.length?'Collect the three golden nutrients. Then find the transfer gate.':'Gate open. Reach the ring to evolve into the next plate.'}</p>
     <p className="culture-message" role="status" aria-live="polite" aria-atomic="true">{run.message} <span>Turn {run.turn}.</span></p>
     {run.mode==='playing'?<div className="culture-controls">
      <div className="culture-dpad">{directions.map(d=><button type="button" className={`culture-direction culture-${d.key}`} key={d.key} aria-label={d.label} onClick={()=>act({type:'move',dx:d.dx,dy:d.dy})}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={d.path}/></svg></button>)}<button type="button" className="culture-wait" aria-label="Wait one turn" onClick={()=>act({type:'wait'})}>Wait</button></div>
      <button type="button" className="culture-primary culture-pulse-button" disabled={!run.energy} onClick={()=>act({type:'pulse'})}>Enzyme pulse <span>{run.energy} left</span></button>
     </div>:null}
     <p id="culture-instructions" className="culture-instructions">Focus the plate to use arrow keys or WASD. Space: pulse. Period: wait. Moving into a rival strikes it. Rivals act every second turn.</p>
     <details className="culture-map-text"><summary>Read plate positions</summary><p id="culture-positions">You: {position(run.player)}. Nutrients: {run.food.length?run.food.map(position).join('; '):'all collected'}. Rivals: {run.rivals.length?run.rivals.map(r=>`${position(r)}, ${r.hp} vitality`).join('; '):'none'}. Transfer gate: {position(run.exit)}, {run.food.length?'locked':'open'}.</p></details>
     {run.mutations.length?<p className="culture-mutation-history">Your strain: {mutations.filter(m=>run.mutations.includes(m.id)).map(m=>`${m.name}${run.mutations.filter(id=>id===m.id).length>1?` x${run.mutations.filter(id=>id===m.id).length}`:''}`).join(', ')}</p>:null}
    </aside>
   </div>
   {run.mode==='mutation'?<div className="culture-evolution"><h3>Survival changes you.</h3><p>Choose one mutation. The next plate brings a new layout and stronger rivals.</p><div>{mutations.map(m=><button type="button" key={m.id} onClick={()=>{act({type:'mutate',mutation:m.id});board.current?.focus({preventScroll:true});}}><strong>{m.name}</strong><span>{m.description}</span></button>)}</div></div>:null}
   {run.mode==='ended'?<div className="culture-ending"><div><h3>A small life. A worthy culture.</h3><p>Reached plate {run.plate} with {run.score} research points. Every run begins with a different culture.</p></div><button type="button" className="culture-primary" onClick={start}>Grow a new strain</button></div>:null}
   <footer className="culture-footer"><span>A fictional ecosystem. No sample data is used.</span><span>Run stays while this report page is open.</span></footer>
  </>:null}
 </section>;
}
