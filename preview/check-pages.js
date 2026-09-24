async page => {
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');
 await page.getByRole('heading',{name:'Hello, Demo',exact:true}).waitFor();
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:'preview/overhaul-desktop-final.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'preview/overhaul-mobile-final.png',fullPage:true});
 const homeOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await page.goto('http://127.0.0.1:5173/samples');
 await page.getByRole('heading',{name:'Samples & history',exact:true}).waitFor();
 await page.getByRole('table').waitFor();
 const samplesOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await page.goto('http://127.0.0.1:5173/library');
 await page.getByRole('heading',{name:'Files & documents',exact:true}).waitFor();
 await page.getByRole('link',{name:'Download',exact:true}).first().waitFor();
 const filesOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await page.goto('http://127.0.0.1:5173/settings');
 await page.getByRole('heading',{name:'Settings center',exact:true}).waitFor();
 await page.screenshot({path:'preview/overhaul-settings-mobile.png',fullPage:true});
 return {errors,homeOverflow,samplesOverflow,filesOverflow};
}
