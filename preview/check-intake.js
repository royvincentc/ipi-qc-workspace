async page => {
 await page.getByRole('textbox', {name:'Date and time received *',exact:true}).fill('2026-09-24T11:00');
 await page.getByRole('textbox', {name:'Facility *',exact:true}).fill('Demo facility');
 await page.getByRole('combobox', {name:'Sample / product name *',exact:true}).fill('De-identified monitoring check');
 await page.getByRole('textbox', {name:'Area *',exact:true}).fill('Demo area');
 await page.getByRole('textbox', {name:'Batch / lot number *',exact:true}).fill('UX-CHECK-001');
 await page.getByRole('button', {name:'Confirm and log sample',exact:true}).click();
}
