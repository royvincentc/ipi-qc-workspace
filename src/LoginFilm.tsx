import {useEffect,useRef,useState,type ReactNode,type MouseEvent} from 'react';
import {Player,type PlayerRef} from '@remotion/player';
import {AbsoluteFill,Easing,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import './login-refined.css';

const intentKey='ipi.login.handoff';
const ease={easing:Easing.bezier(.22,1,.36,1),extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
// Each new sector crosses the preceding streak only at its first few passes.
const streaks=[
  [[235,128],[393,128],[220,143],[417,143],[205,158],[435,158],[193,173],[445,173],[184,188],[450,188],[178,203],[440,203],[175,218],[420,218]],
  [[399,197],[505,267],[412,208],[513,291],[426,217],[512,317],[456,263],[501,344],[454,292],[480,369],[442,320],[454,390]],
  [[484,338],[427,442],[472,351],[397,454],[457,366],[365,460],[420,394],[334,458],[388,402],[303,451],[354,399],[276,440]],
  [[333,440],[205,399],[314,433],[188,371],[293,424],[177,341],[256,397],[172,309],[235,370],[176,280],[215,341],[190,266],[215,310],[212,267],[236,298],[239,274]],
] as const;
const streakPaths=streaks.map(points=>points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' '));
const streakLengths=streaks.map(points=>points.slice(1).map(([x,y],i)=>Math.hypot(x-points[i][0],y-points[i][1])));
const colonies=streaks.map((points,q)=>Array.from({length:[76,38,17,6][q]},(_,i)=>{
  const position=(i+.4)/[76,38,17,6][q]*(points.length-1);
  const segment=Math.floor(position),fraction=position-segment;
  const [x,y]=points[segment], [nextX,nextY]=points[segment+1];
  return {x:x+(nextX-x)*fraction+Math.sin(i*7)*2,y:y+(nextY-y)*fraction+Math.cos(i*7)*2,r:q===0?3.8:3+(i%3)*.65};
}));
const gridRows=Array.from({length:32},(_,row)=>8+[0,2,1,0,-1,1,-2,0][row%8]);
const gridPath=gridRows.map((columns,row)=>Array.from({length:columns},(_,column)=>
  `M${column*26} ${row*26}h26v26h-26Z`).join('')).join('');

function TransitionGrid(){
  return <div className="login-transition-grid" aria-hidden="true">
    {['left','right'].map(side=><svg key={side} className={`login-grid-edge is-${side}`} viewBox="0 0 286 832" preserveAspectRatio="xMinYMid slice">
      <path d={gridPath} fill="none" stroke="currentColor" strokeWidth=".7"/>
    </svg>)}
  </div>;
}

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
  const fade=interpolate(frame,[228,239],[1,0],ease);
  const active=Math.min(3,Math.floor(frame/44));
  const cleaning=frame<176&&frame%44>=36;
  const points=streaks[active],lengths=streakLengths[active];
  let distance=lengths.reduce((sum,length)=>sum+length,0)*Math.min(1,(frame%44)/36),segment=0;
  while(segment<lengths.length-1&&distance>lengths[segment])distance-=lengths[segment++];
  const fraction=distance/lengths[segment];
  const tip=cleaning?[553,100]:[
    points[segment][0]+(points[segment+1][0]-points[segment][0])*fraction,
    points[segment][1]+(points[segment+1][1]-points[segment][1])*fraction,
  ];
  return <AbsoluteFill style={{background:'transparent',overflow:'hidden'}}>
    <svg viewBox="0 0 680 540" width="100%" height="100%" aria-hidden="true">
      <circle cx="340" cy="270" r="239" fill="#13170e" stroke="#444b36" strokeWidth="1.5"/>
      <circle cx="340" cy="270" r="222" fill="#1b2112" stroke="#69704a" strokeWidth="1"/>
      <circle cx="340" cy="270" r="207" fill="none" stroke="#333d23" strokeWidth="1"/>
      <g opacity={fade}>
        {[0,1,2,3].map(quadrant=>{
          const start=quadrant*44;
          const progress=interpolate(frame,[start,start+36],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
          const growth=interpolate(frame,[180+quadrant*4,210+quadrant*4],[0,1],ease);
          return <g key={quadrant} data-quadrant={quadrant+1}>
            <path d={streakPaths[quadrant]} fill="none" stroke="#fcff1a" strokeWidth={2-quadrant*.35} strokeLinejoin="round" strokeLinecap="round" opacity={.72*fade}
              pathLength="1" strokeDasharray="1" strokeDashoffset={1-progress}/>
            <g opacity={growth} data-colonies={quadrant+1}>
              {quadrant===0&&<path d={streakPaths[0]} fill="none" stroke="#f3f0bc" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" opacity=".65"/>}
              {colonies[quadrant].map(({x,y,r},i)=><circle key={i} cx={x} cy={y} r={r*growth} fill="#f3f0bc"/>)}
            </g>
          </g>;
        })}
      </g>
      {frame<176&&<g data-loop-state={cleaning?'sterilizing':'streaking'} transform={`translate(${tip[0]} ${tip[1]})`} fill="none"
        stroke={cleaning&&frame%44<41?'#ff2070':'#f6f7ef'} strokeWidth="2" opacity=".9">
        <circle r="5"/>
        <path d="M3.5 -3.5l29 -29" strokeLinecap="round"/>
      </g>}
      <path d="M185 120 A215 215 0 0 1 475 103 M161 371 A217 217 0 0 0 226 452" stroke="#f3f4de" strokeOpacity=".38" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M322 33h36 M322 507h36" stroke="#fcff1a" strokeWidth="3"/>
    </svg>
  </AbsoluteFill>;
}

function ArrivalComposition(){
  const frame=useCurrentFrame();
  const {width,height}=useVideoConfig();
  const reveal=interpolate(frame,[6,32],[0,1],ease);
  const fade=interpolate(frame,[4,15],[1,0],ease);
  const curtain=gridRows.map((columns,row)=>{
    const y=row*height/32, nextY=(row+1)*height/32;
    const edge=(width/2+(columns-6)*width/48)*(1-reveal);
    return `M0 ${y}H${edge}V${nextY}H0Z M${width} ${y}H${width-edge}V${nextY}H${width}Z`;
  }).join('');
  return <AbsoluteFill style={{pointerEvents:'none'}}>
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path fill="#0c0e09" d={curtain}/>
    </svg>
    <div className="login-arrival-grid" style={{opacity:1-reveal,transform:`scaleX(${1+reveal*.5})`}}><TransitionGrid/></div>
    <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',opacity:fade,transform:`scale(${interpolate(frame,[0,22],[1,1.12],ease)})`}}>
      <div style={{position:'relative',width:Math.min(width*.8,460),aspectRatio:'680 / 540'}}><CultureComposition/></div>
    </div>
  </AbsoluteFill>;
}

export function LoginFilm({controls=false}:{controls?:boolean}){
  const player=useRef<PlayerRef>(null);
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [paused,setPaused]=useState(()=>{try{return controls&&sessionStorage.getItem('ipi.login.film')==='paused';}catch{return false;}});
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
      if(reduced)player.current.seekTo(224);
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
        initialFrame={reduced?224:0}
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

export function Loading({label='Preparing your workspace',compact=false}:{label?:string;compact?:boolean}){
  return <div className={`loading-state culture-loading${compact?' is-compact':''}`} role="status" aria-live="polite"><LoginFilm/><span>{label}</span></div>;
}

export function LoginConnecting(){
  return <div className="login-connecting"><TransitionGrid/><Loading label="Connecting to your workspace…"/></div>;
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
