import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculate} from '@smogon/calc';
import {defaultSet,defaultField,blankPoints,runCalculation,makePokemon,gen,Move,Field} from '../src/engine.mjs';
const field={...defaultField(),weather:'',terrain:''};
const attacker={...defaultSet('left'),species:'Gardevoir',ability:'Synchronize',nature:'Modest',item:'',points:{...blankPoints(),spa:32},move:'Expanding Force'};
const target={...defaultSet('left'),item:'',nature:'Hardy',points:blankPoints()};
function control(set,defender,bp,type,spread=false){return calculate(gen,makePokemon(set),makePokemon(defender),new Move(gen,'Psychic',{overrides:{basePower:bp,type,category:'Special',target:spread?'allAdjacentFoes':'any'}}),new Field({gameType:spread?'Doubles':'Singles'})).damage}
test('Expanding Force uses 80 × 1.5 × terrain 1.3, with an independent 156 BP control',()=>{
 const result=runCalculation(attacker,target,{...field,terrain:'Psychic'});
 assert.equal(result.bp,120);assert.equal(result.moveTerrainMultiplier,1.5);assert.equal(result.terrainBoost,1.3);assert.equal(result.stab,1.5);
 assert.deepEqual(result.rolls,control(attacker,target,156,'Psychic'));
 assert.deepEqual(runCalculation(attacker,target,field).rolls,control(attacker,target,80,'Psychic'));
});
test('Doubles Expanding Force activates spread only with a grounded user in Psychic Terrain',()=>{
 const result=runCalculation(attacker,target,{...field,terrain:'Psychic',gameType:'Doubles'});
 assert.equal(result.spreadMultiplier,.75);assert.deepEqual(result.rolls,control(attacker,target,156,'Psychic',true));
 const noTerrain=runCalculation(attacker,target,{...field,gameType:'Doubles'});
 assert.equal(noTerrain.spreadMultiplier,1);assert.deepEqual(noTerrain.rolls,control(attacker,target,80,'Psychic'));
});
test('Flying, Levitate and Air Balloon users do not gain Psychic terrain Expanding Force boosts',()=>{
 for(const set of [{...attacker,species:'Charizard',ability:'Blaze'},{...attacker,species:'Rotom',ability:'Levitate'},{...attacker,item:'Air Balloon'}]){
  const result=runCalculation(set,target,{...field,terrain:'Psychic',gameType:'Doubles'});
  assert.equal(result.attackerGrounded,false);assert.equal(result.moveTerrainMultiplier,1);assert.equal(result.terrainBoost,1);assert.equal(result.spreadMultiplier,1);assert.deepEqual(result.rolls,control(set,target,80,'Psychic'));
 }
});
test('Gravity and Iron Ball restore grounded terrain bonuses',()=>{
 for(const patch of [{item:'Iron Ball'},{}]){
  const set={...attacker,species:'Charizard',ability:'Blaze',...patch};
  const result=runCalculation(set,target,{...field,terrain:'Psychic',gravity:!patch.item});
  assert.equal(result.attackerGrounded,true);assert.deepEqual(result.rolls,control(set,target,156,'Psychic'));
 }
});
test('Expanding Force activation depends on the attacker, even when the target is airborne',()=>{
 const defender={...target,species:'Charizard',ability:'Blaze'};
 const result=runCalculation(attacker,defender,{...field,terrain:'Psychic'});
 assert.equal(result.defenderGrounded,false);assert.equal(result.moveTerrainMultiplier,1.5);assert.deepEqual(result.rolls,control(attacker,defender,156,'Psychic'));
});
test('Automatic Psychic Surge produces the same result as explicit Psychic Terrain',()=>{
 const a={...attacker,species:'Indeedee-F',ability:'Psychic Surge'};
 assert.deepEqual(runCalculation(a,target,{...field,terrain:'Auto'}).rolls,runCalculation(a,target,{...field,terrain:'Psychic'}).rolls);
});
test('Rising Voltage doubles for a grounded target; general boost requires a grounded attacker',()=>{
 const a={...attacker,species:'Raichu',ability:'Static',move:'Rising Voltage'};
 const d={...target,species:'Snorlax',ability:'Thick Fat'};
 const r=runCalculation(a,d,{...field,terrain:'Electric'});assert.deepEqual(r.rolls,control(a,d,182,'Electric'));assert.equal(r.moveTerrainMultiplier,2);
 const flying={...d,species:'Charizard',ability:'Blaze'};const r2=runCalculation(a,flying,{...field,terrain:'Electric'});assert.deepEqual(r2.rolls,control(a,flying,91,'Electric'));assert.equal(r2.moveTerrainMultiplier,1);
 const airborne={...a,item:'Air Balloon'};const r3=runCalculation(airborne,d,{...field,terrain:'Electric'});assert.deepEqual(r3.rolls,control(airborne,d,140,'Electric'));assert.equal(r3.terrainBoost,1);
});
test('Terrain Pulse changes type and doubles on all four terrains; Misty has no general Fairy boost',()=>{
 const neutralTarget={...target,species:'Snorlax',ability:'Thick Fat'};
 const a={...attacker,move:'Terrain Pulse'};
 for(const [terrain,type,bp]of [['Psychic','Psychic',130],['Electric','Electric',130],['Grassy','Grass',130],['Misty','Fairy',100]]){
  const r=runCalculation(a,neutralTarget,{...field,terrain});assert.equal(r.type,type);assert.equal(r.moveTerrainMultiplier,2);assert.deepEqual(r.rolls,control(a,neutralTarget,bp,type));
 }
 const r=runCalculation({...a,item:'Air Balloon'},neutralTarget,{...field,terrain:'Psychic'});assert.equal(r.type,'Normal');assert.equal(r.moveTerrainMultiplier,1);assert.deepEqual(r.rolls,control({...a,item:'Air Balloon'},neutralTarget,50,'Normal'));
});
test('Misty Explosion uses 1.5 move power, without a general Fairy terrain bonus',()=>{
 const a={...attacker,move:'Misty Explosion'};const r=runCalculation(a,target,{...field,terrain:'Misty',gameType:'Doubles'});
 assert.equal(r.terrainBoost,1);assert.equal(r.moveTerrainMultiplier,1.5);assert.deepEqual(r.rolls,control(a,target,150,'Fairy',true));
 assert.equal(runCalculation({...a,item:'Air Balloon'},target,{...field,terrain:'Misty'}).moveTerrainMultiplier,1);
});
test('Psychic, Electric and Grass generic attacks use fixed-point 5325/4096 terrain boosts',()=>{
 const neutralTarget={...target,species:'Snorlax',ability:'Thick Fat'};
 for(const [move,terrain,type,bp]of [['Psychic','Psychic','Psychic',117],['Thunderbolt','Electric','Electric',117],['Energy Ball','Grassy','Grass',117]]){
  const a={...attacker,move};const r=runCalculation(a,neutralTarget,{...field,terrain});assert.deepEqual(r.rolls,control(a,neutralTarget,bp,type));assert.equal(r.terrainBoost,1.3);
 }
});
test('Misty dragon reduction depends on the target being grounded',()=>{
 const a={...target,move:'Dragon Claw'};
 assert.equal(runCalculation(a,target,{...field,terrain:'Misty'}).terrainReduction,.5);
 assert.equal(runCalculation(a,{...target,species:'Charizard',ability:'Blaze'},{...field,terrain:'Misty'}).terrainReduction,1);
});
test('Grassy halves Earthquake and Bulldoze against grounded targets, but not Earth Power',()=>{
 for(const move of ['Earthquake','Bulldoze']){
  const a={...target,move};const r=runCalculation(a,target,{...field,terrain:'Grassy'});assert.equal(r.terrainReduction,.5);
  const manual=calculate(gen,makePokemon(a),makePokemon(target),new Move(gen,move,{overrides:{basePower:new Move(gen,move).bp/2}}),new Field());assert.deepEqual(r.rolls,manual.damage);
 }
 assert.equal(runCalculation({...target,move:'Earth Power'},target,{...field,terrain:'Grassy'}).terrainReduction,1);
});
test('Steel Roller fails without a terrain and succeeds with any terrain',()=>{
 const a={...target,move:'Steel Roller'};assert.equal(runCalculation(a,target,field).max,0);
 for(const terrain of ['Psychic','Electric','Grassy','Misty'])assert.ok(runCalculation(a,target,{...field,terrain}).max>0);
});
test('Psychic Terrain blocks priority only against grounded targets',()=>{
 const a={...target,move:'Quick Attack'};assert.equal(runCalculation(a,target,{...field,terrain:'Psychic'}).max,0);
 assert.ok(runCalculation(a,{...target,species:'Charizard',ability:'Blaze'},{...field,terrain:'Psychic'}).max>0);
});
test('Grassy Glide conditional priority is blocked by Queenly Majesty and Armor Tail',()=>{
 const a={...target,species:'Rillaboom',ability:'Grassy Surge',move:'Grassy Glide'};
 for(const [species,ability]of [['Tsareena','Queenly Majesty'],['Farigiraf','Armor Tail']]){
  const d={...target,species,ability};assert.equal(runCalculation(a,d,{...field,terrain:'Grassy'}).max,0);
  assert.equal(runCalculation(a,d,{...field,terrain:'Grassy'}).priority,1);
  assert.ok(runCalculation(a,d,field).max>0);
  assert.ok(runCalculation({...a,item:'Air Balloon'},d,{...field,terrain:'Grassy'}).max>0);
 }
});
