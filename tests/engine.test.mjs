import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultSet,defaultField,makePokemon,runCalculation,distribution,blankPoints,validateSet} from '../src/engine.mjs';
const set=(patch={})=>({...defaultSet('left'),...patch});
test('Champions uses direct stat points and nature inside flooring',()=>{
 const p=makePokemon(set());assert.equal(p.maxHP(),215);assert.equal(p.rawStats.atk,152);assert.equal(p.rawStats.spd,150);assert.equal(p.rawStats.spa,90);
});
test('invalid per-stat, total and negative allocations are rejected',()=>{
 for(const points of [{...blankPoints(),hp:33},{...blankPoints(),hp:32,def:32,spd:3},{...blankPoints(),atk:-1},{...blankPoints(),spa:2.2}])assert.throws(()=>validateSet(set({points})),/能力点/);
});
test('Mega form uses its own stats and typing',()=>{
 const normal=makePokemon(set({species:'Charizard',points:blankPoints(),nature:'Hardy'}));const mega=makePokemon(set({species:'Charizard-Mega-Y',points:blankPoints(),nature:'Hardy'}));assert.equal(normal.rawStats.spa,129);assert.equal(mega.rawStats.spa,179);assert.deepEqual(mega.types,['Fire','Flying']);
});
test('auto Drought gives known Champions damage vector',()=>{
 const r=runCalculation(defaultSet('right'),defaultSet('left'),defaultField());assert.deepEqual(r.rolls,[59,60,60,61,62,63,63,64,65,66,66,67,68,69,69,70]);assert.equal(r.currentHP,215);assert.equal(r.weather,'Sun');assert.equal(r.survive,1);
});
test('weather override affects damage',()=>{
 const auto=runCalculation(defaultSet('right'),defaultSet('left'),defaultField());const none=runCalculation(defaultSet('right'),defaultSet('left'),{...defaultField(),weather:''});assert.ok(auto.min>none.min);assert.equal(none.weather,'');
});
test('HP equal to damage is a KO, and current HP is used',()=>{
 const defender=set({hp:28});const result=runCalculation(defaultSet('right'),defender,defaultField());assert.equal(result.currentHP,60);assert.equal(result.ko,15/16);assert.equal(result.label,'有概率倒下');
});
test('double-battle spread damage is lower for Rock Slide',()=>{
 const s=runCalculation(defaultSet('left'),defaultSet('right'),defaultField());const d=runCalculation(defaultSet('left'),defaultSet('right'),{...defaultField(),gameType:'Doubles'});assert.ok(d.max<s.max);
});
test('type immunity and Levitate cause zero damage',()=>{
 const electric=runCalculation(set({move:'Thunderbolt'}),set(),defaultField());assert.equal(electric.max,0);assert.equal(electric.label,'不受伤害');
 const ground=runCalculation(set({move:'Earthquake'}),set({species:'Gengar',ability:'Levitate'}),defaultField());assert.equal(ground.max,0);
});
test('Reflect affects only its defending side and is bypassed by critical hit',()=>{
 const attacker=defaultSet('left'),defender=defaultSet('right');const normal=runCalculation(attacker,defender,defaultField());const screen=runCalculation(attacker,{...defender,screens:{isReflect:true}},defaultField());assert.ok(screen.max<normal.max);const crit=runCalculation({...attacker,crit:true},{...defender,screens:{isReflect:true}},defaultField());assert.ok(crit.max>normal.max);
});
test('full HP Focus Sash prevents single-hit OHKO but not at partial HP',()=>{
 const target=set({species:'Charizard',points:blankPoints(),item:'Focus Sash',ability:'Blaze'});const result=runCalculation(defaultSet('left'),target,defaultField());assert.equal(result.ko,0);assert.equal(result.minRemaining,1);assert.equal(result.guard,'气势披带');assert.equal(runCalculation(defaultSet('left'),{...target,hp:99},defaultField()).ko,1);
});
test('Sturdy prevents OHKO and Mold Breaker bypasses it',()=>{
 const target=set({species:'Charizard',points:blankPoints(),ability:'Sturdy',item:''});assert.equal(runCalculation(defaultSet('left'),target,defaultField()).ko,0);assert.equal(runCalculation({...defaultSet('left'),ability:'Mold Breaker'},target,defaultField()).ko,1);
});
test('independent multi-hit damage distributions normalize and use convolution',()=>{
 const d=distribution([Array.from({length:16},(_,i)=>i),Array.from({length:16},(_,i)=>i)]);assert.equal(d.size,31);assert.equal(d.get(0),1/256);assert.equal(d.get(15),16/256);assert.equal([...d.values()].reduce((a,b)=>a+b,0),1);
 const r=runCalculation(set({move:'Rock Blast',hits:5}),set({species:'Charizard',item:'Focus Sash'}),defaultField());assert.equal(r.guard,'');assert.ok(r.multiHit);assert.ok(Math.abs(r.distribution.reduce((n,[,p])=>n+p,0)-1)<1e-9);assert.equal(r.ko,1);
});
test('fixed damage returns one deterministic outcome',()=>{
 const r=runCalculation(set({move:'Seismic Toss'}),set(),defaultField());assert.equal(r.min,50);assert.equal(r.max,50);assert.deepEqual(r.distribution,[[50,1]]);
});
test('Super Fang halves current HP, ignores damage modifiers and respects Ghost immunity',()=>{
 const r=runCalculation(set({move:'Super Fang'}),set({hp:50}),defaultField());assert.equal(r.min,53);assert.equal(r.max,53);assert.equal(r.ko,0);
 assert.equal(runCalculation(set({move:'Super Fang'}),set({species:'Gengar'}),defaultField()).max,0);
});
test('Endeavor uses current HP difference',()=>{
 const r=runCalculation(set({move:'Endeavor',hp:20}),set(),defaultField());assert.equal(r.min,172);assert.equal(r.max,172);
});
test('OHKO moves respect type immunity, Sturdy at partial HP and Focus Sash',()=>{
 assert.equal(runCalculation(set({move:'Fissure'}),defaultSet('right'),defaultField()).max,0);
 assert.equal(runCalculation(set({move:'Guillotine'}),set({ability:'Sturdy',hp:50}),defaultField()).max,0);
 assert.equal(runCalculation(set({move:'Guillotine'}),set({item:'Focus Sash'}),defaultField()).guard,'气势披带');
});
test('missing upstream Metal Claw parameters are restored',()=>{
 const r=runCalculation(set({move:'Metal Claw'}),set(),defaultField());assert.equal(r.type,'Steel');assert.equal(r.category,'Physical');assert.equal(r.bp,50);assert.ok(r.max>0);
});
test('moves requiring unavailable battle history fail explicitly',()=>{
 assert.throws(()=>runCalculation(set({move:'Counter'}),set(),defaultField()),/当前条件不足/);
});
