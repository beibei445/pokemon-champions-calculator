import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultSet,defaultField,updateMoveSlot} from '../src/engine.mjs';
import {newTeam,normalizeTeam,parseTeamFile,teamFile} from '../src/team-model.mjs';
import {teamsAPI} from '../server/teams-api.mjs';
import {localDB} from '../server/local-db.mjs';
const makeTeam=()=>({...newTeam(),name:'精神场地队',members:[updateMoveSlot(defaultSet('right'),1,{crit:true}),defaultSet('left'),null,null,null,null],field:{...defaultField(),terrain:'Psychic',gameType:'Doubles'}});
function request(method,path,user='user-a',body,headers={}){return new Request('https://team-test.local'+path,{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})})}
test('team import/export preserves Mega form, ability, points, four moves and battle context',()=>{
 const team=makeTeam();const [roundTrip]=parseTeamFile(teamFile([team]));assert.deepEqual(roundTrip,normalizeTeam(team));
 assert.equal(roundTrip.members[0].species,'Charizard-Mega-Y');assert.equal(roundTrip.members[0].moveSlots[1].crit,true);assert.equal(roundTrip.field.terrain,'Psychic');
});
test('untrusted team files reject invalid forms, points, moves and mismatched Mega stones',()=>{
 for(const mutate of [t=>t.members[0].points.spa=33,t=>t.members[0].item='Leftovers',t=>t.members[1].moveSlots[0].move='unknown',t=>t.members[1].ability='Drought']){
  const team=makeTeam();mutate(team);assert.throws(()=>normalizeTeam(team));
 }
 assert.throws(()=>parseTeamFile('{"version":99}'));assert.throws(()=>normalizeTeam(newTeam()));
});
test('cloud teams persist across sessions and isolate signed-in users',async()=>{
 const DB=localDB();try{
  const team=makeTeam();const saved=await teamsAPI(request('PUT','/api/teams/'+team.id,'user-a',team),{DB});assert.equal(saved.status,200);
  const first=await saved.json();assert.equal(first.team.revision,1);
  const read=await (await teamsAPI(request('GET','/api/teams','user-a'),{DB})).json();assert.equal(read.teams.length,1);assert.equal(read.teams[0].name,team.name);
  const other=await (await teamsAPI(request('GET','/api/teams','user-b'),{DB})).json();assert.deepEqual(other.teams,[]);
  const another=await teamsAPI(request('PUT','/api/teams/'+team.id,'user-b',team),{DB});assert.equal(another.status,200);
  const deleted=await teamsAPI(request('DELETE','/api/teams/'+team.id,'user-a',undefined,{'If-Match':'1'}),{DB});assert.equal(deleted.status,200);
  const remaining=await (await teamsAPI(request('GET','/api/teams','user-b'),{DB})).json();assert.equal(remaining.teams.length,1);
 }finally{DB.close()}
});
test('missing identity, cross-origin writes and malformed payloads are rejected',async()=>{
 const DB=localDB();try{
  assert.equal((await teamsAPI(request('GET','/api/teams',null),{DB})).status,401);
  const team=makeTeam();assert.equal((await teamsAPI(request('PUT','/api/teams/'+team.id,'user-a',team,{Origin:'https://untrusted.example'}),{DB})).status,403);
  team.members[0].points.hp=32;assert.equal((await teamsAPI(request('PUT','/api/teams/'+team.id,'user-a',team),{DB})).status,400);
 }finally{DB.close()}
});
test('stale cloud saves and deletions do not overwrite another device',async()=>{
 const DB=localDB();try{
  const team=makeTeam();const original=await (await teamsAPI(request('PUT','/api/teams/'+team.id,'user-a',team),{DB})).json();
  const update={...original.team,name:'手机修改'};assert.equal((await teamsAPI(request('PUT','/api/teams/'+team.id,'user-a',update),{DB})).status,200);
  assert.equal((await teamsAPI(request('PUT','/api/teams/'+team.id,'user-a',{...original.team,name:'过期电脑配置'}),{DB})).status,409);
  assert.equal((await teamsAPI(request('DELETE','/api/teams/'+team.id,'user-a',undefined,{'If-Match':'1'}),{DB})).status,409);
  const read=await (await teamsAPI(request('GET','/api/teams','user-a'),{DB})).json();assert.equal(read.teams[0].name,'手机修改');
 }finally{DB.close()}
});
test('database failures return a recoverable error rather than false save success',async()=>{
 const r=await teamsAPI(request('GET','/api/teams'),{});assert.equal(r.status,503);assert.equal((await r.json()).code,'storage_unavailable');
});
