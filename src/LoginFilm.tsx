import {useEffect,useRef,useState,type ReactNode,type MouseEvent} from 'react';
import {Player,type PlayerRef} from '@remotion/player';
import {AbsoluteFill,Easing,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import './login-refined.css';

const intentKey='ipi.login.handoff';
const ease={easing:Easing.bezier(.22,1,.36,1),extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;

export function hasLoginHandoff(){
  try{
    const timestamp=Number(sessionStorage.getItem(intentKey));
    return timestamp>0&&Date.now()-timestamp>=0&&Date.now()-timestamp<10*60_000;
  }catch{return false;}
}

export function rememberLoginHandoff(event:MouseEvent<HTMLAnchorElement>){
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  try{sessionStorage.setItem(intentKey,String(Date.now()));}catch{/* Sign-in works without browser storage. */}
}

function CultureComposition(){
  const frame=useCurrentFrame();
  const cycle=(frame/240)*Math.PI*2;
  return <AbsoluteFill style={{background:'transparent',overflow:'hidden'}}>
    <svg viewBox="0 0 680 540" width="100%" height="100%" aria-hidden="true">
      <circle cx="340" cy="270" r="239" fill="#13170e" stroke="#444b36" strokeWidth="1.5"/>
      <circle cx="340" cy="270" r="222" fill="#1b2112" stroke="#69704a" strokeWidth="1"/>
      <circle cx="340" cy="270" r="207" fill="none" stroke="#333d23" strokeWidth="1"/>
      <g transform={`rotate(${Math.sin(cycle)*3} 340 270)`}>
        <path d="M220 150 Q465 105 448 174 Q210 151 228 217 Q470 188 447 251 Q215 226 233 291 Q455 264 435 326 Q250 312 263 365 Q413 350 395 397"
          fill="none" stroke="#fcff1a" strokeWidth="2" strokeLinecap="round" opacity=".5"
          pathLength="1" strokeDasharray=".72 .28" strokeDashoffset={-frame/240}/>
        {Array.from({length:39},(_,i)=>{
          const angle=i*2.39996;
          const distance=30+Math.sqrt(i/39)*151;
          const x=340+Math.cos(angle)*distance;
          const y=270+Math.sin(angle)*distance;
          const grow=interpolate(Math.sin(cycle-i*.21),[-1,1],[.72,1],ease);
          const r=(i%5===0?13:5+i%6)*grow;
          return <g key={i}>
            <circle cx={x} cy={y} r={r+4} fill="none" stroke={i%4===0?'#fcff1a':'#ff2070'} strokeOpacity=".18"/>
            <circle cx={x} cy={y} r={r} fill={i%4===0?'#fcff1a':'#ff2070'} opacity={.65+grow*.3}/>
            <circle cx={x-2} cy={y-2} r={r*.24} fill="#f6f7ef" opacity=".35"/>
          </g>;
        })}
      </g>
      <path d="M185 120 A215 215 0 0 1 475 103 M161 371 A217 217 0 0 0 226 452" stroke="#f3f4de" strokeOpacity=".38" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M322 33h36 M322 507h36" stroke="#fcff1a" strokeWidth="3"/>
    </svg>
  </AbsoluteFill>;
}

function ArrivalComposition(){
  const frame=useCurrentFrame();
  const {width,height}=useVideoConfig();
  const reveal=interpolate(frame,[15,35],[0,Math.hypot(width,height)],ease);
  const fade=interpolate(frame,[8,19],[1,0],ease);
  return <AbsoluteFill style={{pointerEvents:'none'}}>
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path fill="#0c0e09" fillRule="evenodd" d={`M0 0H${width}V${height}H0Z M${width/2-reveal} ${height/2}a${reveal} ${reveal} 0 1 0 ${2*reveal} 0a${reveal} ${reveal} 0 1 0 ${-2*reveal} 0`}/>
    </svg>
    <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',opacity:fade,transform:`scale(${interpolate(frame,[0,22],[1,1.12],ease)})`}}>
      <div style={{position:'relative',width:Math.min(width*.8,460),aspectRatio:'680 / 540'}}><CultureComposition/></div>
    </div>
  </AbsoluteFill>;
}

export function LoginFilm({controls=false}:{controls?:boolean}){
  const player=useRef<PlayerRef>(null);
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [paused,setPaused]=useState(()=>{try{return sessionStorage.getItem('ipi.login.film')==='paused';}catch{return false;}});
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReduced(media.matches);
    media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    const update=()=>{
      if(!player.current)return;
      if(reduced||paused||document.hidden)player.current.pause();
      else player.current.play();
      if(reduced)player.current.seekTo(60);
    };
    update();
    const raf=requestAnimationFrame(update);
    document.addEventListener('visibilitychange',update);
    return()=>{cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',update);};
  },[reduced,paused]);
  return <div className={`login-film ${paused||reduced?'is-paused':''}`}>
    <div className="login-film-stage" aria-hidden="true">
      <Player
        ref={player}
        component={CultureComposition}
        durationInFrames={240}
        fps={30}
        compositionWidth={680}
        compositionHeight={540}
        loop
        initiallyMuted
        controls={false}
        clickToPlay={false}
        doubleClickToFullscreen={false}
        spaceKeyToPlayOrPause={false}
        initiallyShowControls={false}
        moveToBeginningWhenEnded={false}
        initialFrame={reduced?60:0}
        style={{width:'100%',height:'100%'}}
      />
    </div>
    {controls&&<div className="login-film-control">
      {reduced?<span>Reduced motion</span>:
        <button type="button" onClick={()=>{
          setPaused(!paused);
          try{sessionStorage.setItem('ipi.login.film',paused?'playing':'paused');}catch{/* Playback controls also work without storage. */}
        }} aria-label={paused?'Play background video':'Pause background video'} title={paused?'Play background video':'Pause background video'}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">{paused?<path d="M5 3l8 5-8 5z"/>:<path d="M4 3h3v10H4zm5 0h3v10H9z"/>}</svg>
          <span>{paused?'Play motion':'Pause motion'}</span>
        </button>}
    </div>}
  </div>;
}

export function LoginConnecting(){
  return <div className="login-connecting"><LoginFilm controls/><p role="status">Connecting to your workspace…</p></div>;
}

export function WorkspaceArrival({children}:{children:ReactNode}){
  const [arriving,setArriving]=useState(hasLoginHandoff);
  const player=useRef<PlayerRef>(null);
  const focusAfterArrival=useRef(arriving);
  useEffect(()=>{
    try{sessionStorage.removeItem(intentKey);}catch{/* This marker never grants access. */}
    if(!arriving){
      if(focusAfterArrival.current&&document.activeElement===document.body)document.getElementById('workspace-main')?.focus({preventScroll:true});
      focusAfterArrival.current=false;
      return;
    }
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const finish=()=>setArriving(false);
    if(media.matches){finish();return;}
    const update=()=>{if(media.matches)finish();};
    const current=player.current;
    current?.addEventListener('ended',finish);
    media.addEventListener('change',update);
    // A failed player must never leave the authenticated workspace covered.
    const timer=window.setTimeout(finish,1800);
    return()=>{window.clearTimeout(timer);current?.removeEventListener('ended',finish);media.removeEventListener('change',update);};
  },[arriving]);
  return <><div className="workspace-arrival-content" inert={arriving||undefined}>{children}</div>{arriving&&<div className="login-arrival">
    <div className="login-arrival-scene" aria-hidden="true"><Player ref={player} component={ArrivalComposition}
      compositionWidth={window.innerWidth} compositionHeight={window.innerHeight}
      durationInFrames={36} fps={30} autoPlay initiallyMuted controls={false}
      clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false}
      moveToBeginningWhenEnded={false} style={{width:'100%',height:'100%'}}/></div>
    <button type="button" onClick={()=>setArriving(false)}>Skip animation</button>
  </div>}</>;
}
