async(page)=>{
 page.setDefaultTimeout(10000);await page.goto('http://127.0.0.1:5173/shared/76fae173-54cc-4e6a-87df-3580cbed66ff');await page.getByRole('textbox',{name:'Note text: Color note',exact:true}).click();
 let fail=true;await page.route('**/api/collaboration/*/operations',route=>fail?route.fulfill({status:503,contentType:'application/json',body:'{"error":"Synthetic retry check"}'}):route.continue());
 const body=page.getByRole('textbox',{name:'Note',exact:true});await body.fill('Save note retries text without changing metadata');await page.waitForTimeout(500);await page.waitForFunction(()=>Object.keys(sessionStorage).some(key=>key.startsWith('ipi:shared-pending:')),null,{timeout:5000});
 fail=false;await page.getByRole('button',{name:'Save note',exact:true}).click();await page.waitForFunction(()=>!Object.keys(sessionStorage).some(key=>key.startsWith('ipi:shared-pending:')),null,{timeout:10000});
 const result=await(await page.request.get('http://127.0.0.1:5173/api/collaboration/76fae173-54cc-4e6a-87df-3580cbed66ff')).json();if(result.state.notes.note.body!=='Save note retries text without changing metadata')throw new Error('Text-only retry failed');
 const buttons=page.getByRole('group',{name:'Note color',exact:true}).getByRole('button');const sizes=await buttons.evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));if(sizes.length!==8||sizes.some(height=>height<44))throw new Error('Palette touch target regression');
 await page.getByRole('textbox',{name:'Hex note color',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/shared-hex-fixed-mobile-dark.png'});
 return {textOnlySaveNoteRetry:true,paletteCount:sizes.length,minPaletteTargetHeight:Math.min(...sizes)};
}
