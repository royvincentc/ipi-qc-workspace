import test from 'node:test';
import assert from 'node:assert/strict';
import {cultureCells,cultureDistance,inCulture,newCultureRun,stepCulture,type CultureRun} from '../shared/culture-shift';

test('seeded plates have distinct reachable entities and a safe start',()=>{
 for(let seed=1;seed<=100;seed++){
  const run=newCultureRun(seed),entities=[run.player,run.exit,...run.food,...run.rivals];
  assert.equal(new Set(entities.map(c=>`${c.x},${c.y}`)).size,entities.length);
  assert.ok(entities.every(inCulture));
  assert.ok(run.rivals.every(r=>cultureDistance(r,run.player)>=3));
  assert.deepEqual(run,newCultureRun(seed));
 }
 assert.notDeepEqual(newCultureRun(1).food,newCultureRun(2).food);
});
test('invalid moves and exhausted pulses do not advance enemies',()=>{
 const run={...newCultureRun(1),player:{x:4,y:0}};
 assert.equal(stepCulture(run,{type:'move',dx:0,dy:-1}),run);
 assert.equal(stepCulture(run,{type:'move',dx:1,dy:1}),run);
 assert.equal(stepCulture({...run,energy:0},{type:'pulse'}).turn,0);
});
test('strikes, pulses and rival turns use the same turn rules',()=>{
 const run:CultureRun={...newCultureRun(1),rivals:[{x:5,y:4,hp:2}],food:[]};
 const struck=stepCulture(run,{type:'move',dx:1,dy:0});
 assert.deepEqual(struck.player,run.player);assert.equal(struck.rivals[0].hp,1);assert.equal(struck.hp,8);
 const hit=stepCulture(struck,{type:'wait'});assert.equal(hit.hp,7);
 const pulsed=stepCulture(run,{type:'pulse'});assert.equal(pulsed.rivals.length,0);assert.equal(pulsed.energy,2);assert.equal(pulsed.score,20);
});
test('pulse reach uses tile distance, including diagonals after mutation',()=>{
 const run={...newCultureRun(1),range:3,rivals:[{x:6,y:6,hp:2},{x:6,y:5,hp:2}]};
 const next=stepCulture(run,{type:'pulse'});
 assert.deepEqual(next.rivals,[{x:6,y:6,hp:2}]);assert.equal(next.energy,2);
});
test('nutrients recharge and heal; a locked gate never advances a plate',()=>{
 const run={...newCultureRun(1),hp:4,energy:1,rivals:[],food:[{x:5,y:4}],exit:{x:5,y:4}};
 const next=stepCulture(run,{type:'move',dx:1,dy:0});
 assert.equal(next.hp,5);assert.equal(next.energy,2);assert.equal(next.mode,'mutation');
 const locked=stepCulture({...run,food:[{x:2,y:2}]},{type:'move',dx:1,dy:0});
 assert.equal(locked.mode,'playing');
});
test('mutations carry the run forward; ended runs cannot act',()=>{
 const run={...newCultureRun(9),mode:'mutation' as const,hp:2,score:130};
 const next=stepCulture(run,{type:'mutate',mutation:'membrane'});
 assert.equal(next.plate,2);assert.equal(next.maxHp,10);assert.equal(next.hp,6);assert.equal(next.score,130);
 assert.equal(next.food.length,3);assert.deepEqual(next.mutations,['membrane']);
 assert.equal(stepCulture(run,{type:'move',dx:1,dy:0}),run);
 const dead=stepCulture({...run,mode:'playing',turn:1,hp:1,rivals:[{x:5,y:4,hp:1}]},{type:'wait'});
 assert.equal(dead.mode,'ended');assert.equal(dead.hp,0);assert.equal(stepCulture(dead,{type:'pulse'}),dead);
});
test('resistant plates remain stronger even deep into a run',()=>{
 let run=newCultureRun(15);
 for(let plate=2;plate<=20;plate++){
  const previousHp=run.rivals[0].hp;
  run=stepCulture({...run,mode:'mutation'},{type:'mutate',mutation:'membrane'});
  if(plate%5===0)assert.ok(run.rivals.every(r=>r.hp>previousHp));
 }
});
test('long random runs preserve board bounds, health and non-overlap',()=>{
 let run=newCultureRun(42);
 for(let i=0;i<1000;i++){
  if(run.mode==='ended')run=newCultureRun(i);
  else if(run.mode==='mutation')run=stepCulture(run,{type:'mutate',mutation:'catalyst'});
  else run=stepCulture(run,i%5===0?{type:'pulse'}:{type:'move',dx:[1,0,-1,0][i%4],dy:[0,1,0,-1][i%4]});
  assert.ok(run.hp>=0&&run.hp<=run.maxHp);assert.ok(run.energy>=0&&run.energy<=5);
  assert.ok([run.player,...run.rivals].every(inCulture));
  assert.equal(new Set([run.player,...run.rivals].map(c=>`${c.x},${c.y}`)).size,run.rivals.length+1);
 }
 assert.ok(cultureCells.length>50);
});
