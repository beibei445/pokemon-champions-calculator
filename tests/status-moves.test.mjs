import {test} from 'node:test';
import assert from 'node:assert/strict';
import dex from '../src/dex.json' with {type:'json'};
import {defaultSet,defaultField,runCalculation,runMoveSet,updateMoveSlot} from '../src/engine.mjs';
import {newTeam,normalizeMember,teamFile,parseTeamFile} from '../src/team-model.mjs';
import {teamsAPI} from '../server/teams-api.mjs';
import {localDB} from '../server/local-db.mjs';
const names=['Protect','Swords Dance','Tailwind','Trick Room','Will-O-Wisp','Helping Hand','Recover','Spore'];
const statusSet=()=>['Protect','Swords Dance','Tailwind','Trick Room'].reduce((set,move,i)=>updateMoveSlot(set,i,{move}),defaultSet('left'));
test('all status choices have translated names and exclude the engine placeholder',()=>{
 const statuses=dex.moves.filter(m=>m.category==='Status');assert.ok(statuses.length>180);
 assert.ok(statuses.every(m=>m.zh!==m.name));assert.ok(!dex.moves.some(m=>m.name==='(No Move)'));
 for(const name of names)assert.equal(dex.moves.find(m=>m.name===name)?.category,'Status');
});
test('status slots have no damage, STAB, conversion or survival verdict even with Pixilate',()=>{
 const a={...defaultSet('left'),species:'Gardevoir-Mega',ability:'Pixilate',item:'Gardevoirite'};
 for(const move of names){
  const r=runCalculation({...a,move,crit:true},defaultSet('right'),defaultField());
  assert.equal(r.isStatus,true);assert.equal(r.min,null);assert.equal(r.maxPercent,null);assert.equal(r.survive,null);assert.equal(r.ko,null);assert.deepEqual(r.distribution,[]);assert.equal(r.stab,undefined);assert.equal(r.convertedBy,undefined);
  assert.equal(r.type,dex.moves.find(m=>m.name===move).type);
 }
});
test('status moves do not simulate buffs or change independent attack calculations',()=>{
 const a=defaultSet('left'),b=defaultSet('right'),f=defaultField();
 const original=runMoveSet(a,b,f),mixed=updateMoveSlot(a,1,{move:'Swords Dance'}),before=structuredClone(mixed);
 const results=runMoveSet(mixed,b,f);assert.equal(results[1].isStatus,true);
 for(const i of [0,2,3])assert.deepEqual(results[i],original[i]);assert.deepEqual(mixed,before);
 assert.ok(runMoveSet(statusSet(),b,f).every(r=>r.isStatus));
});
test('status moves round-trip in team files and clear irrelevant attack options',()=>{
 const member=statusSet();member.moveSlots[0].crit=true;member.moveSlots[0].hits=1;
 const normalized=normalizeMember(member);assert.equal(normalized.moveSlots[0].crit,false);assert.equal(normalized.moveSlots[0].hits,undefined);
 const team={...newTeam(),members:[member,null,null,null,null,null]};
 const [loaded]=parseTeamFile(teamFile([team]));assert.deepEqual(loaded.members[0],normalized);
});
test('cloud API accepts and returns complete four-status builds',async()=>{
 const DB=localDB();const team={...newTeam(),members:[statusSet(),null,null,null,null,null]};
 const headers={'oai-authenticated-user-id':'status-user','Content-Type':'application/json'};
 try{
  const saved=await teamsAPI(new Request('https://status.local/api/teams/'+team.id,{method:'PUT',headers,body:JSON.stringify(team)}),{DB});assert.equal(saved.status,200);
  const read=await teamsAPI(new Request('https://status.local/api/teams',{headers}),{DB});
  const {teams}=await read.json();assert.deepEqual(teams[0].members[0].moveSlots.map(m=>m.move),team.members[0].moveSlots.map(m=>m.move));
 }finally{DB.close()}
});
