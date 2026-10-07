import {useId, useRef, type PointerEvent} from 'react';

/** Context illustration only: these marks never encode sample measurements. */
export function LabGraphic({kind='dish'}:{kind?:'dish'|'assay'|'sheets'|'vessel'}){
  const id=useId().replace(/:/g,'');
  const ref=useRef<HTMLSpanElement>(null);
  const move=(event:PointerEvent<HTMLSpanElement>)=>{
    if(event.pointerType!=='mouse'||!matchMedia('(hover:hover) and (pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches||event.currentTarget.closest('.app-low-performance,.motion-off')||document.hidden)return;
    const rect=event.currentTarget.getBoundingClientRect();
    const svg=ref.current?.firstElementChild as SVGElement;
    const scale=getComputedStyle(event.currentTarget).getPropertyValue('--lab-graphic-scale').trim()||'1.35';
    if(svg)svg.style.transform=`scale(${scale}) perspective(480px) rotateX(${-(event.clientY-rect.top-rect.height/2)/rect.height*8}deg) rotateY(${(event.clientX-rect.left-rect.width/2)/rect.width*8}deg)`;
  };
  const reset=()=>{const svg=ref.current?.firstElementChild as SVGElement;const scale=ref.current?getComputedStyle(ref.current).getPropertyValue('--lab-graphic-scale').trim()||'1.35':'1.35';if(svg)svg.style.transform=`scale(${scale})`;};
  return <span ref={ref} className={`lab-object lab-object-${kind}`} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset} aria-hidden="true">
    <svg viewBox="0 0 144 112" focusable="false">
      <defs>
        <linearGradient id={`${id}glass`} x1="0" y1="0" x2=".7" y2="1"><stop stopColor="var(--glass-highlight)"/><stop offset=".5" stopColor="var(--glass-mid)"/><stop offset="1" stopColor="var(--glass-edge)"/></linearGradient>
        <linearGradient id={`${id}lime`} x2=".4" y2="1"><stop stopColor="#f0fac0"/><stop offset="1" stopColor="#a6bb58"/></linearGradient>
        <linearGradient id={`${id}paper`} x2="1" y2="1"><stop stopColor="var(--paper-light)"/><stop offset="1" stopColor="var(--paper-shade)"/></linearGradient>
      </defs>
      {kind==='dish'?<>
        <ellipse cx="73" cy="92" rx="48" ry="9" fill="var(--object-shadow)"/>
        <path className="dish-wall" d="M22 49v17c0 23 23 35 51 35s51-12 51-35V49" fill={`url(#${id}glass)`} stroke="var(--glass-stroke)"/>
        <ellipse className="dish-rim" cx="73" cy="49" rx="51" ry="34" fill={`url(#${id}glass)`} stroke="var(--glass-stroke)" strokeWidth="1.4"/>
        <ellipse cx="73" cy="50" rx="44" ry="28" fill="var(--agar-fill)" stroke="var(--glass-stroke)"/>
        <path className="dish-highlight" d="M30 47c0-15 18-26 40-27M83 79c18-3 30-11 33-22" fill="none" stroke="var(--glass-highlight)" strokeWidth="2" strokeLinecap="round"/>
        <g className="dish-colonies" fill={`url(#${id}lime)`} stroke="#99a84c" strokeWidth=".5">{[[48,43,5],[56,39,5],[60,47,5],[51,52,4],[43,50,4],[84,64,5],[92,60,5],[99,68,5],[87,73,4],[96,77,4]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r}/>)}</g>
      </>:kind==='assay'?<>
        <ellipse cx="72" cy="97" rx="37" ry="5" fill="var(--object-shadow)"/>
        <g className="assay-rings" fill="none" stroke="var(--assay-line)"><circle cx="72" cy="51" r="41"/><circle cx="72" cy="51" r="30"/><circle cx="72" cy="51" r="18"/><path className="assay-sweep" d="M72 10a41 41 0 0 1 41 41" stroke="#bedb65" strokeWidth="2.5" strokeLinecap="round"/></g>
        <path d="M31 51h82M72 10v82" stroke="var(--assay-line)" strokeDasharray="2 5" opacity=".35"/>
        <g className="assay-specimen"><circle cx="58" cy="48" r="4" fill="#a5bd5b"/><circle cx="87" cy="41" r="2.5" fill="#a5bd5b"/></g>
      </>:kind==='sheets'?<>
        <ellipse cx="74" cy="99" rx="41" ry="6" fill="var(--object-shadow)"/>
        <g className="report-sheet-back" transform="rotate(-12 59 53)"><rect x="33" y="13" width="53" height="74" rx="4" fill={`url(#${id}paper)`} stroke="var(--glass-stroke)"/><path d="M42 26h35M42 33h35M42 40h35M42 47h30M42 54h33M42 61h25" stroke="var(--paper-rule)" strokeWidth="1.4"/></g>
        <rect x="95" y="22" width="7" height="20" rx="3" fill="#dcf489" transform="rotate(12 98 32)"/>
        <g className="report-sheet-front" transform="rotate(10 87 62)"><rect x="57" y="29" width="54" height="70" rx="4" fill={`url(#${id}paper)`} stroke="var(--glass-stroke)"/><path d="M67 42h33M67 49h33M67 56h33M67 63h30M67 70h33M67 77h25M67 84h20" stroke="var(--paper-rule)" strokeWidth="1.4"/></g>
      </>:<>
        <ellipse cx="72" cy="100" rx="29" ry="5" fill="var(--object-shadow)"/>
        <rect x="49" y="20" width="46" height="77" rx="12" fill={`url(#${id}glass)`} stroke="var(--glass-stroke)"/>
        <path d="M50 65h44v19c0 7-6 12-12 12H62c-6 0-12-5-12-12Z" fill="var(--agar-fill)"/>
        <rect x="47" y="12" width="50" height="17" rx="5" fill="var(--paper-shade)" stroke="var(--glass-stroke)"/>
        <path d="M57 37v43M83 42h7M83 52h7M83 62h7" stroke="var(--glass-highlight)" strokeWidth="2" strokeLinecap="round"/>
        <rect x="61" y="48" width="19" height="26" rx="2" fill="var(--paper-light)"/><path d="M65 55h11M65 60h11M65 65h7" stroke="var(--paper-rule)"/>
      </>}
    </svg>
  </span>;
}
