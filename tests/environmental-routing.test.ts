import {test} from 'node:test';
import assert from 'node:assert/strict';
import {documentFacility,documentContext,environmentalProductKey} from '../shared/environmental-routing.js';
test('explicit facility and conservative cosmetic aliases retain meaningful variants',()=>{
 assert.equal(documentFacility('PF 2 Compounding Area Logbook MIC-12'),'PF2');assert.equal(documentFacility('PF1 / PF2 Filling'),'');assert.equal(documentContext('Oil (Pilot 3)'),'Pilot');
 assert.equal(documentFacility('Water Treatment Area'),'WATER TREATMENT');assert.equal(documentFacility('Warehouse 4 Internal Sampling'),'WAREHOUSE 4');
 assert.equal(environmentalProductKey('Dr. Wong’s Lightening Face Cream (Pilot 1)'),environmentalProductKey("Dr. Wong's Lightening Face Cream"));
 assert.equal(environmentalProductKey('OPK Export- Compounding Utensils'),environmentalProductKey('Omega Pain Killer Liniment - Export'));
 assert.notEqual(environmentalProductKey('OPK Cream'),environmentalProductKey('Omega Pain Killer Liniment'));
 for(const [a,b] of [['Oil (G)','Oil (P)'],['Boost (China)','Boost'],['Oil - Bouquet','Oil - Florabelle'],['Omega - Pro','Omega - Export'],['Omega (Old Specs)','Omega (New Specs)']])assert.notEqual(environmentalProductKey(a),environmentalProductKey(b));
});
