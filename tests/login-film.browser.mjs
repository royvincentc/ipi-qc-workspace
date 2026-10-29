import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

const main=await readFile('src/main.tsx','utf8');
const styles=await Promise.all([...main.matchAll(/import '\.\/(.*?\.css)'/g)].map(match=>readFile('src/'+match[1],'utf8')));
const bundle=await build({
  write:false,bundle:true,format:'iife',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},
  plugins:[{name:'composition-preview',setup(build){
    build.onLoad({filter:/[/\\]LoginFilm\.tsx$/},async args=>({
      contents:await readFile(args.path,'utf8')+'\nexport {CultureComposition};',loader:'tsx',resolveDir:path.dirname(args.path),
    }));
  }}],
  stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {Player} from '@remotion/player';
    import {CultureComposition,LoginFilm,Loading} from './src/LoginFilm';
    const root=createRoot(document.getElementById('root'));
    window.preview=()=>root.render(<div style={{width:'min(100%,680px)',aspectRatio:'680 / 540'}}>
      <Player ref={player=>window.player=player} component={CultureComposition} durationInFrames={240} fps={30}
        compositionWidth={680} compositionHeight={540} style={{width:'100%',height:'100%'}}/>
    </div>);
    window.loading=()=>root.render(<Loading/>);
    window.controls=()=>root.render(<LoginFilm controls/>);
    window.preview();
  `},
});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>route.abort());
    await page.setContent('<html data-theme="dark"><body><div id="root"></div></body></html>');
    for(const css of styles)await page.addStyleTag({content:css});
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.waitForFunction(()=>window.player);
    const strokes=page.locator('path[pathLength="1"]');
    assert.equal(await strokes.count(),4);
    for(const quadrant of [0,1,2,3]){
      await page.evaluate(frame=>window.player.seekTo(frame),quadrant*60+24);
      await page.waitForFunction(q=>{
        const path=document.querySelectorAll('path[pathLength="1"]')[q];
        return Number(path.getAttribute('stroke-dashoffset'))>0&&Number(path.getAttribute('stroke-dashoffset'))<1;
      },quadrant);
      const state=await strokes.evaluateAll(paths=>paths.map(path=>({
        offset:Number(path.getAttribute('stroke-dashoffset')),
        rotation:path.parentElement.getAttribute('transform'),
        box:(()=>{const b=path.getBBox();return {x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};})(),
      })));
      assert.equal(state[quadrant].rotation,`rotate(${quadrant*90} 340 270)`);
      assert.ok(state[quadrant].box.right<340&&state[quadrant].box.bottom<270,'seed streak stays in its quadrant');
      for(let i=0;i<4;i++)if(i!==quadrant)assert.equal(state[i].offset,i<quadrant?0:1,'quadrants draw in order');
      await mkdir('output/playwright',{recursive:true});
      await page.screenshot({path:`output/playwright/culture-quadrant-${quadrant+1}-${width}.png`});
    }
    await page.evaluate(()=>window.player.seekTo(239));
    await page.waitForFunction(()=>[...document.querySelectorAll('path[pathLength="1"]')].every(path=>Number(path.getAttribute('opacity'))<.01));
    await page.evaluate(()=>window.controls());
    await page.getByRole('button',{name:'Pause background video'}).click();
    await page.getByRole('button',{name:'Play background video'}).waitFor();
    await page.getByRole('button',{name:'Play background video'}).click();
    await page.getByRole('button',{name:'Pause background video'}).waitFor();
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.getByText('Reduced motion',{exact:true}).waitFor();
    await page.evaluate(()=>window.loading());
    await page.getByRole('status').filter({hasText:'Preparing your workspace'}).waitFor();
    await page.waitForFunction(()=>document.querySelectorAll('path[pathLength="1"]').length===4);
    const still=await strokes.evaluateAll(paths=>paths.map(path=>path.outerHTML));
    await page.waitForTimeout(200);
    assert.deepEqual(await strokes.evaluateAll(paths=>paths.map(path=>path.outerHTML)),still,'reduced motion remains still');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
    assert.deepEqual(errors,[]);
    await page.screenshot({path:`output/playwright/culture-loading-reduced-${width}.png`});
    console.log(`PASS ${width}px: four sequential quadrants, loop fade, pause/play, reduced motion, loading status, no overflow`);
    await page.close();
  }
}finally{await browser.close();}
