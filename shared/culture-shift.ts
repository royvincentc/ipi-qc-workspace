export type Cell = {x:number;y:number};
export type Rival = Cell & {hp:number};
export type Mutation = 'membrane'|'catalyst'|'resonance';
export type CultureRun = {
 seed:number;plate:number;turn:number;player:Cell;hp:number;maxHp:number;
 energy:number;power:number;range:number;score:number;food:Cell[];rivals:Rival[];
 exit:Cell;mode:'playing'|'mutation'|'ended';message:string;mutations:Mutation[];
};
export type CultureAction = {type:'move';dx:number;dy:number}|{type:'pulse'}|{type:'wait'}|{type:'mutate';mutation:Mutation};
export const cultureCells:Cell[] = Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)})).filter(c=>(c.x-4)**2+(c.y-4)**2<=20);
export const cultureDistance = (a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const same = (a:Cell,b:Cell)=>a.x===b.x&&a.y===b.y;
export const inCulture = (c:Cell)=>cultureCells.some(cell=>same(cell,c));

function populate(run:CultureRun):CultureRun{
 let seed=run.seed>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const pool=cultureCells.filter(c=>cultureDistance(c,{x:4,y:4})>=3);
 const take=()=>pool.splice(Math.floor(random()*pool.length),1)[0];
 const exit=take(),food=Array.from({length:3},take);
 const rivals=Array.from({length:Math.min(4+run.plate,14)},()=>({...take(),hp:1+Math.floor(run.plate/4)+(run.plate%5===0?1:0)}));
 return {...run,seed,player:{x:4,y:4},food,rivals,exit,turn:0,mode:'playing',energy:3,message:run.plate%5===0?'A resistant strain. Rivals have thicker membranes.':'Collect all three nutrients, then reach the transfer gate.'};
}
export function newCultureRun(seed=Date.now()):CultureRun{
 return populate({seed,plate:1,turn:0,player:{x:4,y:4},hp:8,maxHp:8,energy:3,power:1,range:2,score:0,food:[],rivals:[],exit:{x:4,y:0},mode:'playing',message:'',mutations:[]});
}
export function stepCulture(run:CultureRun,action:CultureAction):CultureRun{
 if(action.type==='mutate'){
  if(run.mode!=='mutation')return run;
  const next={...run,plate:run.plate+1,mutations:[...run.mutations,action.mutation]};
  if(action.mutation==='membrane'){next.maxHp+=2;next.hp=Math.min(next.maxHp,next.hp+4);}
  if(action.mutation==='catalyst')next.power++;
  if(action.mutation==='resonance')next.range++;
  return populate(next);
 }
 if(run.mode!=='playing')return run;
 const next:CultureRun={...run,player:{...run.player},food:[...run.food],rivals:run.rivals.map(r=>({...r})),turn:run.turn+1};
 let message='You hold position. The culture advances.';
 if(action.type==='move'){
  if(Math.abs(action.dx)+Math.abs(action.dy)!==1)return run;
  const target={x:run.player.x+action.dx,y:run.player.y+action.dy};
  if(!inCulture(target))return run;
  const rival=next.rivals.find(r=>same(r,target));
  if(rival){rival.hp-=next.power;message='Membrane strike.';}else{next.player=target;message='Keep moving. Collect nutrients to recharge your pulse.';}
 }else if(action.type==='pulse'){
  if(!next.energy)return {...run,message:'No pulse charges. Collect a nutrient to recharge.'};
  next.energy--;
  next.rivals.forEach(r=>{if(cultureDistance(r,next.player)<=next.range)r.hp-=next.power+1;});
  message='Enzyme pulse released.';
 }
 const defeated=next.rivals.filter(r=>r.hp<=0).length;
 next.score+=defeated*20;next.rivals=next.rivals.filter(r=>r.hp>0);
 if(next.food.some(c=>same(c,next.player))){
  next.food=next.food.filter(c=>!same(c,next.player));next.energy=Math.min(5,next.energy+1);
  next.hp=Math.min(next.maxHp,next.hp+1);next.score+=10;message='Nutrient absorbed. +1 vitality, +1 pulse.';
 }
 if(!next.food.length&&same(next.player,next.exit)){
  return {...next,mode:'mutation',score:next.score+100,message:'Plate survived. Choose a mutation for the next culture.'};
 }
 // Rivals act every other turn, leaving a readable turn to escape or strike.
 if(next.turn%2===0){
  let damage=0;
  for(const rival of next.rivals){
   if(cultureDistance(rival,next.player)===1){damage++;continue;}
   const candidates=[{x:rival.x+1,y:rival.y},{x:rival.x-1,y:rival.y},{x:rival.x,y:rival.y+1},{x:rival.x,y:rival.y-1}]
    .filter(c=>inCulture(c)&&!same(c,next.player)&&!next.rivals.some(other=>same(c,other)))
    .sort((a,b)=>cultureDistance(a,next.player)-cultureDistance(b,next.player));
   if(candidates[0])Object.assign(rival,candidates[0]);
  }
  next.hp=Math.max(0,next.hp-damage);
  if(damage)message=`Rival contact. Lost ${damage} vitality.`;
 }
 if(next.hp===0){next.mode='ended';message='This culture has ended. A new strain is a new beginning.';}
 return {...next,message};
}
