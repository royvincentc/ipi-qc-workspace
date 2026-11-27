import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays,analystAbbreviation,oosFileName,oosValues,productFill,shortProductName,type OosForm} from '../shared/oos.js';

const form:OosForm={product:'Omega Pain Killer Liniment - 120 mL',shortName:'OPKL',fill:'120 mL',batch:'EYJ169',type:'FG',number:'5',parameter:'SPC',result:'TNTC',
 specification:'Nmt 100 cfu/mL',dateObserved:'2026-12-30',dateRetest:'2027-01-01',includedProducts:'',analyst:'James Bryle A. Goloran',analystAbbrev:'JBG'};

test('OOS defaults follow the archive naming conventions',()=>{
 assert.equal(shortProductName('Omega Pain Killer Liniment - 120 mL'),'OPKL');
 assert.equal(shortProductName('Mama’s Love Cotton Buds (50tips/bag)'),'MLCB');
 assert.equal(productFill('Omega Pain Killer Liniment- 60mL'),'60mL');
 assert.equal(analystAbbreviation('James Bryle A. Goloran'),'JBG');
 assert.equal(analystAbbreviation('Jasmin C. Barangan'),'JCB');
 assert.equal(analystAbbreviation('Roy Vincent Codiñera'),'ROY');
 assert.equal(analystAbbreviation('Ahrianne B. Canoy'),'AFC');
 assert.equal(addDays('2026-12-30',2),'2027-01-01');
 assert.equal(addDays('',2),'');
});

test('OOS values fill every template placeholder and name the three files',()=>{
 const v=oosValues(form);
 assert.equal(v.number,'005');assert.equal(v.year,'2026');assert.equal(v.dateDeviation,'12/30/2026');assert.equal(v.calculated_dateDeviation,'01/01/2027');
 assert.equal(v.includedProducts,'N/A');assert.equal(v.incResult,'TNTC');
 assert.equal(oosValues({...form,includedProducts:' OPKL - EYJ170 \n\n  \nOPKL - EYJ171'}).includedProducts,'OPKL - EYJ170\nOPKL - EYJ171');
 assert.equal(Object.keys(v).length,16);
 assert.equal(oosFileName(form,'phase 1'),'FG-2026-005 OPKL 120 mL - EYJ169 SPC (JBG) phase 1.docx');
 assert.equal(oosFileName({...form,fill:'',batch:'A/B'},'alert notice'),'FG-2026-005 OPKL - A_B SPC (JBG) alert notice.docx');
});
