async page => {
 await page.getByRole('combobox',{name:'Product and testing context',exact:true}).selectOption({label:'De-identified Product A · 100 units · Routine'});
 await page.getByRole('combobox',{name:'Standardized report layout',exact:true}).selectOption({label:'IPI archive layout · de-identified two-test copy'});
 await page.getByRole('checkbox',{name:'I confirm the selected product, batch and testing context match this sample.'}).check();
 await page.getByRole('button',{name:'Create result draft',exact:true}).click();
}
