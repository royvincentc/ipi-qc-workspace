async (page) => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const id=await page.evaluate(async()=>{const response=await fetch('/api/collaboration',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'kanban',title:'Long content — demo fixture'})});return (await response.json()).id;});
 await page.goto(`http://127.0.0.1:5173/shared/${id}`);await page.getByRole('button',{name:'Add a note',exact:true}).first().waitFor();
 if(await page.locator('.sticky-note').count()!==0)throw new Error('Expected empty board');
 await page.evaluate(async id=>{const response=await fetch(`/api/collaboration/${id}/operations`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operationId:crypto.randomUUID(),operation:{type:'note-add',id:'long',columnId:'todo',title:'Long note',body:'Unbroken'.repeat(1000)+'\n'+'Multiple lines\n'.repeat(100),color:'blue'}})});if(!response.ok)throw new Error(await response.text());},id);
 await page.getByRole('textbox',{name:'Note text: Long note',exact:true}).waitFor();
 const sizes=[];
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:844});await page.waitForTimeout(400);
  await page.getByRole('textbox',{name:'Note text: Long note',exact:true}).click();await page.getByRole('complementary',{name:'Note details'}).waitFor();
  const size=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,noteBodyLength:document.querySelector('.sticky-note textarea').value.length}));
  if(size.document>size.viewport||size.noteBodyLength!==9501)throw new Error(JSON.stringify(size));sizes.push(size);
  await page.getByRole('button',{name:'Close note',exact:true}).click();
 }
 await page.goto('http://127.0.0.1:5173/shared/00000000-0000-4000-8000-000000000000');await page.getByText('This shared resource was deleted or does not exist',{exact:true}).waitFor();
 if(errors.length)throw new Error(errors.join(';'));
 return {emptyBoard:true,longTextAndSidebar:true,sizes,missingResourceError:true,errors};
}
