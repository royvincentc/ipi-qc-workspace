import {useEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {Player,type PlayerRef} from '@remotion/player';
import {AbsoluteFill,Easing,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {useWorkspaceMotion} from './motion';

const chapters={
  home:{label:'Reception',motifs:['specimen','culture','microscopy']},
  new:{label:'Sample intake',motifs:['pipette','specimen','barcode']},
  samples:{label:'Sample records',motifs:['rack','barcode','logbook']},
  worksheet:{label:'Laboratory worksheet',motifs:['pipette','wells','incubator']},
  reports:{label:'Results & reports',motifs:['plot','document','folios']},
  library:{label:'Reference library',motifs:['book','folios','method']},
  shared:{label:'Shared workspace',motifs:['board','links','branch']},
  assistant:{label:'Smart assistant',motifs:['search','method','citations']},
  settings:{label:'Workspace settings',motifs:['sliders','key','calibration']},
} as const;
type Chapter=keyof typeof chapters;
type FilmProps={chapter:Chapter;variation:number};

/** Route-specific laboratory studies; all movement is driven by the Remotion frame. */
export function WorkflowComposition({chapter,variation}:FilmProps){
  const frame=useCurrentFrame();
  const {width}=useVideoConfig();
  const cycle=(frame/180)*Math.PI*2;
  const chapterIndex=Math.max(0,Object.keys(chapters).indexOf(chapter));
  const phase=cycle+chapterIndex*.35+variation*.4;
  const liquidY=19-Math.sin(phase)*5;
  const focusX=Math.sin(phase)*4;
  const focusY=Math.sin(phase*2)*3;
  const scan=interpolate((frame+variation*12)%180,[0,90,180],[4,28,4],{easing:Easing.bezier(.45,0,.55,1)});
  const blocks=[
    {fg:'#FF2070',accent:'#FCFF1A'},
    {fg:'#FCFF1A',accent:'#FF2070'},
    {fg:'#EEF0E7',accent:'#FF2070'},
  ] as const;
  return <AbsoluteFill style={{background:'transparent',overflow:'hidden'}}>
    <svg viewBox={`0 0 ${width} 86`} width="100%" height="100%" aria-hidden="true">
      {blocks.map((block,i)=>{
        const motif=chapters[chapter].motifs[i];
        return <g key={i} transform={`translate(${width*(i+.5)/3-33.6} 9.4) scale(2.1)`} data-lab-study={motif}>
          <g stroke={block.fg} strokeWidth=".8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {motif==='specimen'&&<>
              <path d="M9 6V25Q9 30 15 30Q21 30 21 25V6"/>
              <rect x="7" y="2" width="16" height="5" rx="1.5"/>
              <path d={`M11 ${liquidY}Q15 ${liquidY+Math.cos(phase)*2} 19 ${liquidY}V25Q19 28 15 28Q11 28 11 25Z`} fill={block.accent} fillOpacity=".8" stroke="none"/>
              <rect x="11" y="11" width="8" height="6" rx="1" fill={block.fg} fillOpacity=".15"/>
              <path d="M13 13H17M13 15H16"/>
              <g transform={`translate(0 ${Math.sin(phase)*7})`} stroke={block.accent} opacity=".8">
                <path d="M27 12H30M27 16H32M27 20H30"/>
              </g>
            </>}
            {motif==='culture'&&<>
              <circle cx="16" cy="16" r="14"/>
              <circle cx="16" cy="16" r="11.5" opacity=".4"/>
              {[[11,10,1.7],[20,9,1.1],[16,17,2.2],[9,21,1.2],[23,20,1.6],[18,25,.9]].map(([x,y,r],index)=>
                <circle key={index} cx={x} cy={y} r={r*(1+.35*Math.sin(phase+index))} fill={block.fg} stroke="none" opacity={.4+.5*(.5+.5*Math.sin(phase+index*.6))}/>
              )}
              <path d="M5 16H27" opacity=".4" transform={`rotate(${(phase*180)/Math.PI} 16 16)`}/>
              <circle cx={16+focusX} cy={16+focusY} r="4" stroke={block.accent} strokeWidth="1.8"/>
              <path d="M16 2A14 14 0 0 1 30 16" stroke={block.accent} strokeWidth="2" transform={`rotate(${(phase*180)/Math.PI} 16 16)`}/>
            </>}
            {motif==='microscopy'&&<>
              <circle cx="16" cy="16" r="14"/>
              <path d="M16 2V5M16 27V30M2 16H5M27 16H30" opacity=".5"/>
              <g transform={`translate(${Math.sin(phase)*2.5} ${Math.cos(phase)*2.5})`}>
                <rect x="8" y="9" width="7" height="3" rx="1.5" transform="rotate(-30 11.5 10.5)"/>
                <rect x="18" y="18" width="7" height="3" rx="1.5" transform="rotate(40 21.5 19.5)"/>
                <circle cx="11" cy="21" r="1.3" fill={block.fg} stroke="none"/>
                <circle cx="20" cy="10" r="1.2" fill={block.fg} stroke="none"/>
              </g>
              <g transform={`translate(${focusX} ${focusY})`}>
                <path d="M10 13V10H13M19 10H22V13M22 19V22H19M13 22H10V19" stroke={block.accent} strokeWidth="1.6"/>
              </g>
            </>}
            {motif==='pipette'&&<>
              <g transform={`translate(0 ${Math.sin(phase)*2})`}>
                <path d="M15 3V1M11 3H19V8L17 11V19L15 23L13 19V11L11 8Z"/>
                <path d="M13 6H17M15 11V18" stroke={block.accent}/>
              </g>
              <circle cx="15" cy={25+Math.sin(phase)*3} r={1.1+.4*Math.cos(phase)} fill={block.accent} stroke="none"/>
              <path d="M5 30H27M8 27V30M24 27V30"/>
            </>}
            {motif==='barcode'&&<>
              <path d="M7 2H25L29 6V30H3V6Z"/>
              {[7,10,12,16,20,23,25].map((x,index)=><path key={x} d={`M${x} 10V24`} strokeWidth={index%3===0?1.5:.6}/>)}
              <path d={`M1 ${scan}H31`} stroke={block.accent} strokeWidth="1.5"/>
              <path d="M11 5H21"/>
            </>}
            {motif==='rack'&&<>
              <path d="M2 23H30V30H2ZM5 26H27"/>
              {[5,13,21].map((x,index)=><g key={x}>
                <path d={`M${x} 6V20Q${x+2} 24 ${x+4} 20V6`}/>
                <path d={`M${x-1} 3H${x+5}V6H${x-1}Z`}/>
                <path d={`M${x+1} ${15+Math.sin(phase+index)*3}V20H${x+3}`} stroke={block.accent} strokeWidth="1.5"/>
              </g>)}
            </>}
            {motif==='logbook'&&<>
              <rect x="4" y="2" width="25" height="28" rx="2"/>
              <path d="M9 2V30M2 7H6M2 14H6M2 21H6M2 27H6"/>
              {[8,14,20,26].map((y,index)=><path key={y} d={`M13 ${y}H24`} opacity={.3+.6*(.5+.5*Math.sin(phase-index))}/>)}
              <path d={`M12 ${scan}H26`} stroke={block.accent}/>
            </>}
            {motif==='wells'&&<>
              <rect x="1" y="2" width="30" height="28" rx="3"/>
              {Array.from({length:12},(_,index)=><circle key={index} cx={6+index%4*6.5} cy={7+Math.floor(index/4)*9} r="2" fill={block.accent} fillOpacity={.15+.65*(.5+.5*Math.sin(phase-index*.5))}/>)}
            </>}
            {motif==='incubator'&&<>
              <rect x="3" y="2" width="26" height="28" rx="2"/>
              <rect x="6" y="9" width="20" height="17" rx="1"/>
              <path d="M8 15H24M8 21H24M23 12V16"/>
              <path d="M7 6H17" stroke={block.accent} strokeDasharray="2 2" strokeDashoffset={Math.sin(phase)*4}/>
              <path d={`M12 24Q${9+Math.sin(phase)*2} 21 12 18Q15 15 12 12`} stroke={block.accent} opacity=".7"/>
            </>}
            {motif==='plot'&&<>
              <path d="M3 2V30H30M3 9H30M3 19H30" strokeOpacity=".4"/>
              <path d={`M5 25Q10 ${18+Math.sin(phase)*3} 15 20T28 6`} strokeWidth="1.3"/>
              <circle cx={scan} cy={26-scan*.65} r="2" fill={block.accent} stroke="none"/>
            </>}
            {motif==='document'&&<>
              <path d="M5 2H21L28 9V30H5ZM21 2V9H28"/>
              {[14,19,24].map((y,index)=><path key={y} d={`M9 ${y}H${20+Math.sin(phase-index)*3}`} stroke={index===2?block.accent:undefined}/>)}
              <path d="M9 27H17" opacity=".4"/>
            </>}
            {motif==='folios'&&<>
              <path d="M4 25H1V2H22V5M8 28H4V5H25V8" opacity=".45"/>
              <g transform={`translate(${Math.sin(phase)*1.5} 0)`}>
                <rect x="8" y="8" width="21" height="22" rx="1"/>
                <path d="M12 14H25M12 19H25M12 24H21" stroke={block.accent}/>
              </g>
            </>}
            {motif==='book'&&<>
              <path d="M16 6Q9 1 2 3V27Q9 25 16 30Q23 25 30 27V3Q23 1 16 6V30"/>
              <path d="M6 9L12 11M6 15L12 17M20 11L26 9M20 17L26 15" opacity=".5"/>
              <path d={`M16 6Q${20+Math.sin(phase)*7} 1 27 3V26Q22 25 16 30Z`} fill={block.accent} fillOpacity={.1+.15*(.5+.5*Math.sin(phase))}/>
            </>}
            {motif==='method'&&<>
              <path d="M16 3L28 10V23L16 30L4 23V10ZM4 10L16 17L28 10M16 17V30" opacity=".5"/>
              {[[16,3],[28,10],[28,23],[16,30],[4,23],[4,10],[16,17]].map(([x,y],index)=><circle key={index} cx={x} cy={y} r={1.4+.4*Math.sin(phase-index)} fill={index%2?block.fg:block.accent} stroke="none"/>)}
            </>}
            {motif==='board'&&<>
              <rect x="1" y="2" width="30" height="28" rx="2"/>
              <path d="M11 6V27M21 6V27" opacity=".4"/>
              {[4,14,24].map((x,index)=><rect key={x} x={x} y={9+Math.sin(phase-index)*4} width="4" height="8" rx="1" fill={block.accent} fillOpacity=".4"/>)}
            </>}
            {motif==='links'&&<>
              <path d="M6 5L26 16L6 27M6 5V27" strokeDasharray="2 2" strokeDashoffset={-frame/15}/>
              {[[6,5],[26,16],[6,27]].map(([x,y])=><circle key={y} cx={x} cy={y} r="3" fill="#0C0E09"/>)}
              <circle cx={6+20*(.5+.5*Math.sin(phase))} cy={5+11*(.5+.5*Math.sin(phase))} r="1.5" fill={block.accent} stroke="none"/>
            </>}
            {motif==='branch'&&<>
              <path d="M16 3V13M16 13L5 23V29M16 13L27 23V29"/>
              <circle cx="16" cy="3" r="2"/>
              <rect x="2" y="24" width="6" height="6" rx="1"/>
              <rect x="24" y="24" width="6" height="6" rx="1"/>
              <circle cx="16" cy={5+(.5+.5*Math.sin(phase))*8} r="1.8" fill={block.accent} stroke="none"/>
            </>}
            {motif==='search'&&<>
              <path d="M2 2H22V29H2ZM6 8H17M6 13H17M6 18H13" opacity=".5"/>
              <g transform={`translate(${Math.sin(phase)*3} ${Math.cos(phase)*3})`}>
                <circle cx="18" cy="17" r="7" stroke={block.accent} strokeWidth="1.3"/>
                <path d="M23 22L29 28" stroke={block.accent} strokeWidth="2"/>
              </g>
            </>}
            {motif==='citations'&&<>
              <path d="M3 2H23V26H3ZM8 30H28V6" opacity=".7"/>
              <path d="M7 8H18M7 13H18M7 18H14"/>
              <path d="M18 21L22 17M21 22L25 18" stroke={block.accent} strokeWidth="2" opacity={.4+.6*(.5+.5*Math.sin(phase))}/>
            </>}
            {motif==='sliders'&&<>
              {[7,16,25].map((x,index)=><g key={x}>
                <path d={`M${x} 2V30`}/>
                <rect x={x-3} y={12+Math.sin(phase+index*2)*7} width="6" height="5" rx="1" fill="#0C0E09" stroke={block.accent}/>
              </g>)}
            </>}
            {motif==='key'&&<>
              <g transform={`rotate(${Math.sin(phase)*12} 16 16)`}>
                <circle cx="10" cy="9" r="6"/>
                <circle cx="10" cy="9" r="2" stroke={block.accent}/>
                <path d="M14 14L28 28L25 31L22 28L24 26L21 23L19 25L16 22L18 20"/>
              </g>
            </>}
            {motif==='calibration'&&<>
              <circle cx="16" cy="16" r="14"/>
              <path d="M16 4V7M4 16H7M25 16H28M7 7L9 9M25 7L23 9" opacity=".5"/>
              <path d="M16 16L16 6" stroke={block.accent} strokeWidth="1.5" transform={`rotate(${Math.sin(phase)*65} 16 16)`}/>
              <circle cx="16" cy="16" r="2" fill={block.accent} stroke="none"/>
              <path d="M11 25H21"/>
            </>}
          </g>
        </g>;
      })}
    </svg>
  </AbsoluteFill>;
}

export function WorkflowFilm(){
  const {pathname}=useLocation();
  const chapter=(pathname==='/'?'home':pathname.split('/')[1]) as Chapter;
  const info=chapters[chapter];
  const player=useRef<PlayerRef>(null);
  const container=useRef<HTMLElement>(null);
  const art=useRef<HTMLDivElement>(null);
  const [filmWidth,setFilmWidth]=useState(720);
  const [inView,setInView]=useState(true);
  const [variation,setVariation]=useState(0);
  const {animate,reduced,visible,setMotion}=useWorkspaceMotion();
  useEffect(()=>{
    const observer=new ResizeObserver(([entry])=>setFilmWidth(Math.max(1,Math.round(entry.contentRect.width))));
    if(art.current)observer.observe(art.current);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.05});
    if(container.current)observer.observe(container.current);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const sync=()=>{
      if(!player.current)return;
      if(animate&&visible&&inView)player.current.play();
      else player.current.pause();
      if(reduced)player.current.seekTo(45);
    };
    sync();
    const raf=requestAnimationFrame(sync);
    const timer=window.setTimeout(sync,80);
    return()=>{cancelAnimationFrame(raf);window.clearTimeout(timer);};
  },[animate,reduced,visible,inView,pathname]);
  useEffect(()=>{
    const change=(event:Event)=>{
      const target=event.target as HTMLElement;
      if(!target.closest('.tabs button,.intake-mode button,.worksheet-type-tabs button,.assay-selector button,.settings-nav button,.mobile-settings-select'))return;
      requestAnimationFrame(()=>{setVariation(value=>value+1);player.current?.seekTo(reduced?45:0);if(animate&&!reduced)player.current?.play();});
    };
    document.addEventListener('click',change);
    document.addEventListener('change',change);
    return()=>{document.removeEventListener('click',change);document.removeEventListener('change',change);};
  },[animate,reduced]);
  if(!info)return null;
  return <section ref={container} className="workflow-film" aria-label={`${info.label} motion illustration`} data-chapter={chapter}>
    <div ref={art} className="workflow-film-art" aria-hidden="true">
      <Player ref={player} component={WorkflowComposition} inputProps={{chapter,variation}} durationInFrames={180} fps={30} compositionWidth={filmWidth} compositionHeight={86} loop autoPlay={animate&&!reduced} initiallyMuted controls={false} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} initiallyShowControls={false} moveToBeginningWhenEnded={false} initialFrame={reduced?45:0} style={{width:'100%',height:'100%'}}/>
    </div>
    <div className="workflow-film-controls">
      <span>Illustrative motion</span>
      <button type="button" disabled={reduced} onClick={()=>setMotion(!animate)} aria-label={reduced?'System reduced motion is on':animate?'Pause workspace motion':'Play workspace motion'}>{reduced?'Reduced motion':animate?'Pause motion':'Play motion'}</button>
      <button type="button" disabled={!animate} aria-label="Replay workspace scene" onClick={()=>{setVariation(value=>value+1);player.current?.seekTo(0);}}>Replay</button>
    </div>
  </section>;
}
