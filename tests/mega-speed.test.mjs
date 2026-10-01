import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculate} from '@smogon/calc';
import {defaultSet,defaultField,makePokemon,runCalculation,blankPoints,gen,Move,Field,Pokemon,runMoveSet,selectMoveSlot,updateMoveSlot,speedForSet,compareSpeed,minimumSpeedPoints,theoreticalSpeed,resolvedField} from '../src/engine.mjs';
const field={...defaultField(),weather:'',terrain:''};
const gardevoir={...defaultSet('left'),species:'Gardevoir-Mega',nature:'Modest',points:{...blankPoints(),hp:2,spa:32,spe:32},ability:'Pixilate',item:'Gardevoirite',move:'Hyper Voice'};

test('Pixilate Mega Gardevoir converts Normal to Fairy and includes 1.2 power and 1.5 STAB',()=>{
 const target=defaultSet('left');
 const r=runCalculation(gardevoir,target,field);
 assert.equal(r.originalType,'Normal');assert.equal(r.type,'Fairy');assert.equal(r.convertedBy,'Pixilate');assert.equal(r.abilityPowerMultiplier,1.2);assert.equal(r.abilityBoostedBP,108);assert.equal(r.stab,1.5);
 assert.deepEqual(r.rolls,[194,198,198,200,204,206,210,210,212,216,218,218,222,224,228,230]);
 const attacker=makePokemon({...gardevoir,ability:'Synchronize'});
 const manual=calculate(gen,attacker,makePokemon(target),new Move(gen,'Hyper Voice',{overrides:{type:'Fairy',basePower:108}}),new Field());
 assert.deepEqual(r.rolls,manual.damage);
});
test('Pixilate conversion changes effectiveness, including damaging Ghost types',()=>{
 const target={...defaultSet('left'),species:'Gengar',ability:'Cursed Body'};
 assert.equal(runCalculation({...gardevoir,ability:'Synchronize'},target,field).max,0);
 assert.ok(runCalculation(gardevoir,target,field).min>0);
});
test('naturally Fairy moves do not receive another Pixilate power boost',()=>{
 const r=runCalculation({...gardevoir,move:'Moonblast'},defaultSet('left'),field);
 const control=runCalculation({...gardevoir,ability:'Synchronize',move:'Moonblast'},defaultSet('left'),field);
 assert.deepEqual(r.rolls,control.rolls);assert.equal(r.abilityPowerMultiplier,1);assert.equal(r.convertedBy,'');assert.equal(r.stab,1.5);
});
test('normal Gardevoir keeps Normal Hyper Voice without Pixilate',()=>{
 const r=runCalculation({...gardevoir,species:'Gardevoir',ability:'Synchronize',item:''},defaultSet('left'),field);
 assert.equal(r.type,'Normal');assert.equal(r.stab,1);assert.equal(r.abilityPowerMultiplier,1);
});
test('Weather Ball does not falsely attribute weather conversion to a different ability',()=>{
 const r=runCalculation({...defaultSet('left'),move:'Weather Ball'},defaultSet('right'),{...field,weather:'Rain'});
 assert.equal(r.type,'Water');assert.equal(r.convertedBy,'');assert.equal(r.abilityPowerMultiplier,1);
});
test('Aerilate, Refrigerate and Champions Dragonize are applied after Mega evolution',()=>{
 for(const [species,ability,type,item] of [['Salamence-Mega','Aerilate','Flying','Salamencite'],['Glalie-Mega','Refrigerate','Ice','Glalitite'],['Feraligatr-Mega','Dragonize','Dragon','Feraligite']]){
  const r=runCalculation({...defaultSet('left'),species,ability,item,move:'Double-Edge'},defaultSet('left'),field);
  assert.equal(r.type,type);assert.equal(r.abilityPowerMultiplier,1.2);assert.equal(r.stab,1.5);assert.ok(r.max>0);
 }
});
test('Mega Huge Power matches explicitly doubled attack stats',()=>{
 const s={...defaultSet('left'),species:'Mawile-Mega',ability:'Huge Power',item:'Mawilite',move:'Iron Head'};
 const r=runCalculation(s,defaultSet('left'),field);
 const rawAttack=makePokemon(s).rawStats.atk;
 const attacker=new Pokemon(gen,s.species,{nature:s.nature,evs:s.points,boosts:s.boosts,item:s.item,ability:'Intimidate',abilityOn:false,overrides:{baseStats:{atk:rawAttack*2-s.points.atk-20}}});
 const control=calculate(gen,attacker,makePokemon(defaultSet('left')),new Move(gen,'Iron Head'),new Field());
 assert.deepEqual(r.rolls,control.damage);
});
test('all Mega form metadata matches Champions-specific base stats and ability',()=>{
 const dex=JSON.parse(readFileSync(new URL('../src/dex.json',import.meta.url),'utf8'));
 const megas=dex.pokemon.filter(s=>s.name.includes('-Mega'));
 assert.ok(megas.length>70);
 for(const s of megas){const canonical=gen.species.get(s.id);assert.deepEqual(s.baseStats,canonical.baseStats);assert.deepEqual(s.types,canonical.types);assert.deepEqual(s.abilities,[canonical.abilities[0]]);assert.ok(s.megaItem)}
});
test('four moves compute independently and per-slot critical state is preserved',()=>{
 const s=updateMoveSlot(defaultSet('left'),2,{crit:true});
 const r=runMoveSet(s,defaultSet('right'),field);assert.equal(r.length,4);
 for(let i=0;i<4;i++)assert.deepEqual(r[i].rolls,runCalculation({...s,...s.moveSlots[i]},defaultSet('right'),field).rolls);
 assert.equal(s.moveSlots[0].crit,false);assert.equal(s.moveSlots[2].crit,true);
 const selected=selectMoveSlot(s,0);assert.equal(selected.move,'Rock Slide');assert.equal(selected.crit,false);assert.equal(selected.moveSlots[2].crit,true);
});
test('four-slot special attacks do not carry stat boosts to the next slot',()=>{
 const s={...defaultSet('left'),moveSlots:Array.from({length:4},()=>({move:'Meteor Beam',crit:false}))};
 const before=JSON.stringify(s);const r=runMoveSet(s,defaultSet('right'),field);
 assert.deepEqual(r[0].rolls,r[1].rolls);assert.equal(JSON.stringify(s),before);
});
test('speed respects nature, stat points and both positive and negative stages',()=>{
 const s={...defaultSet('left'),nature:'Jolly',points:{...blankPoints(),spe:32}};
 assert.equal(speedForSet(s,field).raw,169);assert.equal(speedForSet(s,field).effective,169);
 assert.equal(speedForSet({...s,boosts:{...s.boosts,spe:1}},field).effective,253);
 assert.equal(speedForSet({...s,boosts:{...s.boosts,spe:-1}},field).effective,112);
});
test('Choice Scarf, Tailwind, paralysis and combinations follow engine rounding',()=>{
 const s={...defaultSet('left'),nature:'Jolly',points:{...blankPoints(),spe:32},item:'Choice Scarf'};
 assert.equal(speedForSet(s,field).effective,253);
 assert.equal(speedForSet({...s,status:'par'},field).effective,126);
 assert.equal(speedForSet({...s,screens:{...s.screens,isTailwind:true}},field).effective,507);
});
test('weather speed abilities activate only under matching weather',()=>{
 const s={...defaultSet('left'),species:'Excadrill',ability:'Sand Rush',nature:'Hardy',points:blankPoints(),item:''};
 assert.equal(speedForSet(s,field).effective,108);assert.equal(speedForSet(s,{...field,weather:'Sand'}).effective,216);
});
test('Quick Feet prevents the usual paralysis speed halving',()=>{
 const s={...defaultSet('left'),species:'Jolteon',ability:'Quick Feet',nature:'Timid',points:{...blankPoints(),spe:32},item:'',status:'par'};
 assert.equal(speedForSet(s,field).effective,300);
});
test('speed ties are not counted as outspeeding and Trick Room reverses ordering',()=>{
 const s=defaultSet('left');assert.equal(compareSpeed(s,s,field).winner,'tie');
 assert.equal(compareSpeed(s,defaultSet('right'),field).winner,'right');
 assert.equal(compareSpeed(s,defaultSet('right'),{...field,trickRoom:true}).winner,'left');
});
test('minimum speed allocation requires a strict speed advantage',()=>{
 const s={...defaultSet('left'),nature:'Hardy'};
 const target={...defaultSet('right'),species:'Tyranitar',nature:'Jolly',points:{...blankPoints(),spe:32},item:'',ability:'Sand Stream'};
 assert.equal(compareSpeed(s,target,field).right.effective,124);assert.equal(minimumSpeedPoints(s,target,field),3);
 assert.equal(minimumSpeedPoints(s,defaultSet('right'),{...field,trickRoom:true}),0);
 const tooFast={...target,species:'Aerodactyl-Mega',item:'Aerodactylite',ability:'Tough Claws'};assert.equal(minimumSpeedPoints(s,tooFast,field),null);
});
test('theoretical Champions tiers use no editable IVs and separate Mega speed',()=>{
 assert.deepEqual(theoreticalSpeed(102),{min:109,neutral:122,maxNeutral:154,max:169,scarf:253,tailwind:338});
 assert.ok(theoreticalSpeed(92).max<theoreticalSpeed(102).max);
});
test('automatic weather ordering accounts for scarf and speed boosts',()=>{
 const char={...defaultSet('right'),nature:'Hardy',points:blankPoints()};
 const pelipper={...defaultSet('left'),species:'Pelipper',nature:'Hardy',points:{...blankPoints(),spe:32},ability:'Drizzle',item:''};
 assert.equal(resolvedField(makePokemon(char),makePokemon(pelipper),defaultField()).weather,'Rain');
 assert.equal(resolvedField(makePokemon(char),makePokemon({...pelipper,item:'Choice Scarf'}),defaultField()).weather,'Sun');
});
