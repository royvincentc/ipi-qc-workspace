import assert from 'node:assert/strict';
import test from 'node:test';
import {historicalCriteria} from '../server/reports.js';

const testCatalog=[
 {id:'SPC',name:'Standard Plate Count (SPC)',reportLabel:'Standard Plate Count (SPC)',unit:'cfu/mL'},
 {id:'MY',name:'Molds and Yeast',reportLabel:'Molds and Yeast',unit:'cfu/mL'},
 {id:'SAL',name:'Salmonella',reportLabel:'Salmonella',inputType:'finding'},
 {id:'ENT',name:'Enterobacteriaceae',reportLabel:'Enterobacteriaceae',unit:'cfu/mL'}
];

test('owner-confirmed historical product limits override shared defaults',()=>{
 const results=historicalCriteria('Herbycin Cooling Mouth Spray','FG','Routine',['SPC','MY'],testCatalog);
 assert.deepEqual(results.map(x=>x.criterion),['Nmt 10 cfu/mL','Nmt 10 cfu/mL']);
 assert.ok(results.every(x=>x.dateBasis==='owner-confirmed'&&x.source.includes('james.zip')));
});

test('historical baseline retains defaults for products without a mapped exception',()=>{
 const results=historicalCriteria('Example product','FG','Routine',['SPC','MY','SAL'],testCatalog);
 assert.deepEqual(results.map(x=>x.criterion),['Nmt 100 cfu/mL','Nmt 10 cfu/mL','Negative']);
});

test('historical entries preserve product-specific units and qualitative limits',()=>{
 const results=historicalCriteria('Mama\'s Love Cotton','FG','Routine',['SPC','MY'],testCatalog);
 assert.deepEqual(results.map(x=>[x.criterion,x.unit]),[['Nmt 50 cfu/g','cfu/g'],['Nmt 10 cfu/g','cfu/g']]);
});
