import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

const main=await readFile('src/main.tsx','utf8');
const styles=await Promise.all([...main.matchAll(/import '\.\/(.*?\.css)'/g)].filter(match=>match[1]!=='tailwind.css').map(match=>readFile('src/'+match[1],'utf8')));
const bundle=await build({
  write:false,bundle:true,format:'iife',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},
  plugins:[{name:'composition-preview',setup(build){
    build.onLoad({filter:/[/\\]LoginFilm\.tsx$/},async args=>({
      contents:await readFile(args.path,'utf8')+'\nexport {CultureComposition,ArrivalComposition};',loader:'tsx',resolveDir:path.dirname(args.path),
    }));
  }}],
  stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {Player} from '@remotion/player';
    import {CultureComposition,ArrivalComposition,LoginFilm,Loading,LoginConnecting,WorkspaceArrival} from './src/LoginFilm';
    const root=createRoot(document.getElementById('root'));
    let arrivalKey=0;
    window.preview=()=>root.render(<div style={{width:'min(100%,680px)',aspectRatio:'680 / 540'}}>
      <Player ref={player=>window.player=player} component={CultureComposition} durationInFrames={240} fps={30}
        compositionWidth={680} compositionHeight={540} style={{width:'100%',height:'100%'}}/>
    </div>);
    window.loading=()=>root.render(<Loading/>);
    window.controls=()=>root.render(<LoginFilm controls/>);
    window.connecting=()=>root.render(<LoginConnecting/>);
    window.arrivalPreview=()=>root.render(<div style={{position:'fixed',inset:0,background:'#f5f5ef',color:'#0c0e09'}}>
      <main style={{padding:48,fontSize:32}}>IPI workspace preview</main><Player ref={player=>window.player=player} component={ArrivalComposition}
      durationInFrames={36} fps={30} compositionWidth={innerWidth} compositionHeight={innerHeight}
      style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/></div>);
    window.arrival=()=>{
      sessionStorage.setItem('ipi.login.handoff',String(Date.now()));
      root.render(<WorkspaceArrival key={++arrivalKey}><main id="workspace-main" tabIndex={-1}>Ready workspace</main></WorkspaceArrival>);
    };
    window.preview();
  `},
});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>route.abort());
    await page.route('http://ipi.test/',route=>route.fulfill({contentType:'text/html',body:'<html data-theme="dark"><body><div id="root"></div></body></html>'}));
    await page.goto('http://ipi.test/');
    for(const css of styles)await page.addStyleTag({content:css});
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.waitForFunction(()=>window.player);
    const strokes=page.locator('path[pathLength="1"]');
    assert.equal(await strokes.count(),4);
    for(const quadrant of [0,1,2,3]){
      await page.evaluate(frame=>window.player.seekTo(frame),quadrant*44+24);
      await page.waitForFunction(q=>{
        const path=document.querySelectorAll('path[pathLength="1"]')[q];
        return Number(path.getAttribute('stroke-dashoffset'))>0&&Number(path.getAttribute('stroke-dashoffset'))<1;
      },quadrant);
      const state=await strokes.evaluateAll(paths=>paths.map(path=>({
        offset:Number(path.getAttribute('stroke-dashoffset')),
        quadrant:path.parentElement.getAttribute('data-quadrant'),
        box:(()=>{const b=path.getBBox();return {x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};})(),
      })));
      assert.equal(state[quadrant].quadrant,String(quadrant+1));
      assert.ok(state.every(({box})=>box.x>=130&&box.right<=550&&box.y>=63&&box.bottom<=477),'streaks stay on the agar');
      for(let i=0;i<4;i++)if(i!==quadrant)assert.equal(state[i].offset,i<quadrant?0:1,'quadrants draw in order');
      await mkdir('output/playwright',{recursive:true});
      await page.screenshot({path:`output/playwright/culture-quadrant-${quadrant+1}-${width}.png`});
    }
    const paths=await strokes.evaluateAll(paths=>paths.map(path=>path.getAttribute('d')));
    assert.equal(new Set(paths).size,4,'four distinct sectors, including transfer passes');
    assert.ok(await strokes.evaluateAll(paths=>paths.every(path=>{
      const length=path.getTotalLength();
      for(let distance=0;distance<=length;distance+=8){
        const {x,y}=path.getPointAtLength(distance);
        if(Math.hypot(x-340,y-270)>207)return false;
      }
      return true;
    })),'every streak stays inside the agar circle');
    assert.ok(await page.locator('[data-colonies]').evaluateAll(groups=>groups.every(group=>group.getAttribute('opacity')==='0')),'growth waits until after streaking');
    await page.evaluate(()=>window.player.seekTo(39));
    await page.locator('[data-loop-state="sterilizing"]').waitFor();
    assert.equal(await page.locator('[data-loop-state]').getAttribute('transform'),'translate(553 100)','loop lifts clear of agar between sectors');
    await page.evaluate(()=>window.player.seekTo(224));
    await page.waitForFunction(()=>document.querySelector('[data-colonies="4"]').getAttribute('opacity')==='1');
    const counts=await page.locator('[data-colonies]').evaluateAll(groups=>groups.map(group=>group.querySelectorAll('circle').length));
    assert.ok(counts.every((count,i)=>i===0||count<counts[i-1]),'growth becomes progressively more isolated');
    await page.screenshot({path:`output/playwright/culture-isolation-${width}.png`});
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
    await page.evaluate(()=>window.connecting());
    await page.getByRole('status').filter({hasText:'Connecting to your workspace'}).waitFor();
    assert.equal(await page.locator('.login-grid-edge').count(),2);
    assert.equal(await page.locator('.culture-loading').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','loading surface lets the grid remain visible');
    assert.equal(await page.locator('.login-grid-edge').first().evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.screenshot({path:`output/playwright/login-connecting-${width}.png`});
    await page.evaluate(()=>window.arrival());
    await page.waitForFunction(()=>!document.querySelector('.login-arrival')&&!document.querySelector('[inert]'));
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>window.arrivalPreview());
    await page.locator('.login-arrival-grid').waitFor();
    await page.evaluate(()=>window.player.seekTo(0));
    const closed=await page.locator('svg>path').first().getAttribute('d');
    await page.evaluate(()=>window.player.seekTo(18));
    await page.waitForFunction(previous=>document.querySelector('svg>path').getAttribute('d')!==previous,closed);
    await page.screenshot({path:`output/playwright/login-arrival-${width}.png`});
    await page.evaluate(()=>window.arrival());
    await page.getByRole('button',{name:'Skip animation'}).click();
    await page.waitForFunction(()=>!document.querySelector('.login-arrival')&&!document.querySelector('[inert]'));
    await page.waitForFunction(()=>document.activeElement.id==='workspace-main');
    await page.evaluate(()=>window.arrival());
    await page.locator('.login-arrival').waitFor();
    await page.waitForFunction(()=>!document.querySelector('.login-arrival')&&!document.querySelector('[inert]'));
    await page.evaluate(()=>window.arrival());
    await page.locator('.login-arrival').waitFor();
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>!document.querySelector('.login-arrival')&&!document.querySelector('[inert]'));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'connecting and arrival have no horizontal overflow');
    assert.deepEqual(errors,[]);
    console.log(`PASS ${width}px: sequential transfer, dilution, incubation, pause/play, reduced motion, grid handoff, skip/focus, no overflow`);
    await page.close();
  }
  if(process.env.LOGIN_PREVIEW_URL){
    for(const width of [1440,390]){
      const page=await browser.newPage({viewport:{width,height:900}});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/api/**',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Sign in to access the workspace'})}));
      await page.goto(`${process.env.LOGIN_PREVIEW_URL}/login`);
      try{await page.getByRole('heading',{name:'Sign in.',exact:true}).waitFor();}
      catch(error){
        await page.screenshot({path:`output/playwright/login-live-failure-${width}.png`,fullPage:true});
        console.error({errors,body:(await page.locator('body').innerText()).slice(0,1600)});
        throw error;
      }
      await page.getByRole('button',{name:'Pause background video'}).click();
      await page.getByRole('button',{name:'Play background video'}).waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'live login has no overflow');
      await page.screenshot({path:`output/playwright/login-live-${width}.png`,fullPage:true});
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.getByText('Reduced motion',{exact:true}).waitFor();
      assert.deepEqual(errors,[]);
      console.log(`PASS live ${width}px: Vite login, pause, reduced motion, no overflow or runtime errors`);
      await page.close();
    }
  }
}finally{await browser.close();}
