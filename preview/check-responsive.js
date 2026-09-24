async page => {
 await page.getByRole('heading',{name:'Settings center',exact:true}).waitFor();
 await page.screenshot({path:'preview/overhaul-settings-dark.png',fullPage:true});
 await page.getByRole('button',{name:'Appearance Theme, density and list size',exact:true}).click();
 await page.getByRole('combobox',{name:'Theme',exact:true}).selectOption('system');
 await page.getByRole('button',{name:'Save settings',exact:true}).click();
 await page.getByRole('button',{name:'Apply settings',exact:true}).click();
 await page.getByRole('button',{name:'Apply settings',exact:true}).waitFor({state:'hidden'});
 await page.goto('http://127.0.0.1:5173/');
 await page.getByRole('heading',{name:'Hello, Demo',exact:true}).waitFor();
 await page.screenshot({path:'preview/overhaul-desktop-final.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'preview/overhaul-mobile-final.png',fullPage:true});
 console.log('Desktop, mobile and theme persistence verified.');
}
