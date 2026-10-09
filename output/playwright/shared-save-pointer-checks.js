async (page) => {
 const errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:5173/shared');
 const ids=await page.evaluate(async()=>{const post=async(path,body)=>{const res=await fetch('/api/collaboration'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok)throw new Error(await res.text());return res.json();};const board=await post('',{kind:'kanban',title:'Save and hex — demo fixture'});await post(`/${board.id}/operations`,{operationId:crypto.randomUUID(),operation:{type:'note-add',id:'note',columnId:'todo',title:'Color note',body:'Initial',color:'paper'}});const drawing=await post('',{kind:'drawing',title:'Pointer alignment — demo fixture'});return {board:board.id,drawing:drawing.id};});
 await page.goto(`http://127.0.0.1:5173/shared/${ids.board}`);
 const peerContext=await page.context().browser().newContext({viewport:{width:1440,height:1000}});const peer=await peerContext.newPage();peer.setDefaultTimeout(10000);await peer.goto(`http://127.0.0.1:5173/shared/${ids.board}`);await peer.locator('.sticky-note').waitFor();
 try {
  await page.getByRole('textbox',{name:'Note text: Color note',exact:true}).click();await page.getByRole('complementary',{name:'Note details'}).waitFor();
  let fail=true;await page.route('**/api/collaboration/*/operations',route=>fail?route.fulfill({status:503,contentType:'application/json',body:'{"error":"Synthetic failed save"}'}):route.continue());
  await page.getByRole('textbox',{name:'Note',exact:true}).fill('Text saved together with color');
  await page.getByRole('textbox',{name:'Hex note color',exact:true}).fill('#123ABC');
  const saveNote=page.getByRole('button',{name:'Save note',exact:true});if(!await saveNote.isEnabled())throw new Error('Color save blocked by pending text');await saveNote.click();
  await page.waitForFunction(()=>Object.keys(sessionStorage).some(k=>k.startsWith('ipi:shared-pending:')));
  fail=false;await page.getByRole('button',{name:'Save board',exact:true}).click();
  await peer.waitForFunction(async id=>{const r=await(await fetch('/api/collaboration/'+id)).json();return r.state.notes.note.color==='#123ABC'&&r.state.notes.note.body==='Text saved together with color';},ids.board);
  await peer.waitForFunction(()=>getComputedStyle(document.querySelector('.sticky-note')).backgroundColor==='rgb(18, 58, 188)',null,{timeout:10000});
  await page.waitForFunction(()=>!Object.keys(sessionStorage).some(k=>k.startsWith('ipi:shared-pending:')));
  let dialogs=0;page.on('dialog',async dialog=>{dialogs++;await dialog.dismiss();});
  await page.getByRole('link',{name:'Back to shared tools',exact:true}).click();await page.waitForURL('**/shared?kind=kanban');if(dialogs)throw new Error('Saved note still warns on navigation');
  await page.goto(`http://127.0.0.1:5173/shared/${ids.drawing}`);await page.getByRole('radio',{name:'Line',exact:true}).waitFor();
  const draws=[];let writes=0;page.on('request',request=>{if(request.url().endsWith('/operations'))writes++;});
  for(const fullscreen of [false,true]){
   if(fullscreen)await page.getByRole('button',{name:'Fullscreen',exact:true}).click();
   await page.locator('label').filter({has:page.getByRole('radio',{name:'Line',exact:true})}).click();
   const canvas=page.locator('.excalidraw canvas').first();await canvas.scrollIntoViewIfNeeded();await page.waitForTimeout(800);const box=await canvas.boundingBox();
   const start={x:box.x+300,y:box.y+200},end={x:start.x+150,y:start.y+90};const beforeWrites=writes;
   await page.evaluate(()=>{window.drawFrames=[];window.drawActive=true;let last=performance.now();function sample(now){if(!window.drawActive)return;window.drawFrames.push(now-last);last=now;requestAnimationFrame(sample);}requestAnimationFrame(sample);});
   await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:18});await page.waitForTimeout(300);const duringWrites=writes-beforeWrites;await page.mouse.up();
   let line;const deadline=Date.now()+10000;
   while(Date.now()<deadline){const scene=await(await page.request.get(`http://127.0.0.1:5173/api/collaboration/${ids.drawing}`)).json();const lines=scene.state.elements.filter(e=>e.type==='line'&&!e.isDeleted);if(lines.length===draws.length+1){line=lines.at(-1);break;}await page.waitForTimeout(100);}
   if(!line)throw new Error('Line save acknowledgement did not arrive');
   const point=line.points.at(-1);const delta={x:Math.abs(point[0]-150),y:Math.abs(point[1]-90)};
   const originDelta={x:Math.abs(line.x-300),y:Math.abs(line.y-200)};
   const frames=await page.evaluate(()=>{window.drawActive=false;const frames=window.drawFrames.sort((a,b)=>a-b);return {p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1)};});
   if(delta.x>2||delta.y>2||originDelta.x>2||originDelta.y>2)throw new Error('Line does not match pointer: '+JSON.stringify({delta,originDelta}));if(duringWrites)throw new Error('Network commits during active stroke');draws.push({fullscreen,delta,originDelta,duringWrites,frames});
  }
  await page.getByRole('button',{name:'Exit fullscreen Esc'}).click();
  await page.screenshot({path:'output/playwright/shared-pointer-fixed-desktop.png'});
  await page.goto(`http://127.0.0.1:5173/shared/${ids.board}`);await page.setViewportSize({width:390,height:844});await page.getByRole('textbox',{name:'Note text: Color note',exact:true}).click();await page.getByRole('complementary',{name:'Note details'}).waitFor();
  const hex=page.getByRole('textbox',{name:'Hex note color',exact:true});await hex.fill('#oops00');if(await page.getByRole('button',{name:'Save note',exact:true}).isEnabled())throw new Error('Invalid hex can be saved');await page.getByRole('button',{name:'Save board',exact:true}).click();await page.getByText('Enter a valid six-digit hex color before saving the board.',{exact:true}).waitFor();await hex.fill('#123ABC');await hex.scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/shared-hex-fixed-mobile.png'});
  const darkToggle=page.getByRole('button',{name:'Switch to dark theme',exact:true});if(await darkToggle.count())await darkToggle.click();await page.screenshot({path:'output/playwright/shared-hex-fixed-mobile-dark.png'});
  const overflow=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));if(overflow.document>overflow.width)throw new Error('Mobile overflow');
  if(errors.length)throw new Error(errors.join(';'));return {ids,colorSaveWhilePending:true,retryBoardSave:true,peerRealtime:true,savedNavigationWithoutWarning:true,draws,overflow,errors};
 } finally {await peerContext.close();}
}
