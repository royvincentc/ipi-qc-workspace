async page => {
 await page.getByRole('combobox',{name:'Entry state',exact:true}).nth(0).selectOption('entered');
 await page.getByRole('combobox',{name:'Entry state',exact:true}).nth(1).selectOption('entered');
 await page.getByRole('textbox',{name:'Actual result (cfu/g)',exact:true}).nth(0).fill('0');
 await page.getByRole('textbox',{name:'Actual result (cfu/g)',exact:true}).nth(1).fill('0');
 await page.getByRole('textbox',{name:'Analysis date',exact:true}).fill('2026-09-24');
 await page.getByRole('textbox',{name:'Logbook / page reference',exact:true}).fill('DEMO UX check');
 await page.getByRole('textbox',{name:'Batch Size',exact:true}).fill('100 units');
 await page.getByRole('textbox',{name:'Expiry Date',exact:true}).fill('2027-09-24');
 await page.getByRole('textbox',{name:'Fill Volume',exact:true}).fill('100 units');
 await page.getByRole('textbox',{name:'Manufacture Date',exact:true}).fill('2026-09-23');
 await page.getByRole('textbox',{name:'Purpose',exact:true}).fill('De-identified software verification');
 await page.getByRole('textbox',{name:'Requested By',exact:true}).fill('Demo laboratory');
 await page.getByRole('textbox',{name:'Overall Remarks',exact:true}).fill('DEMONSTRATION ONLY - NOT A LABORATORY RESULT');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
}

