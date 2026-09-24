async page => {
 await page.getByRole('button',{name:'Appearance Theme, density and list size',exact:true}).click();
 await page.getByRole('combobox',{name:'Theme',exact:true}).selectOption('dark');
 await page.getByRole('button',{name:'Save settings',exact:true}).click();
 await page.getByRole('button',{name:'Apply settings',exact:true}).click();
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
 await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
 await page.screenshot({path:'preview/overhaul-settings-dark.png',fullPage:true});
 console.log('Dark preference persisted across browser refresh.');
}
