import {Pokemon,Move,Field,Generations,calculate} from '@smogon/calc';
import {getFinalSpeed,checkItem,getStabMod,isGrounded} from '@smogon/calc/dist/mechanics/util.js';
export {Pokemon,Move,Field};
export const gen=Generations.get(0);
export const STATS=['hp','atk','def','spa','spd','spe'];
export const blankPoints=()=>Object.fromEntries(STATS.map(s=>[s,0]));
export function validateSet(set){
 if(!gen.species.get(set.species.toLowerCase().replace(/[^a-z0-9]/g,'')))throw new Error('请选择数据库中的宝可梦。');
 if(STATS.some(s=>!Number.isInteger(set.points[s])||set.points[s]<0||set.points[s]>32)||STATS.reduce((n,s)=>n+set.points[s],0)>66)throw new Error('能力点每项应为 0–32，总计不能超过 66。');
 if(!Number.isFinite(set.hp)||set.hp<1||set.hp>100)throw new Error('当前 HP 百分比应为 1–100。');
 if(Object.entries(set.boosts).some(([s,n])=>!STATS.includes(s)||!Number.isInteger(n)||n< -6||n>6))throw new Error('能力等级应为 −6 到 +6。');
}
export function makePokemon(set){
 validateSet(set);
 const p=new Pokemon(gen,set.species,{level:50,nature:set.nature,evs:set.points,boosts:set.boosts,ability:set.ability||undefined,abilityOn:!!set.abilityOn,item:set.item||undefined,status:set.status||'',moves:getMoveSlots(set).map(m=>m.move)});
 p.originalCurHP=Math.max(1,Math.floor(p.maxHP()*set.hp/100));
 return p;
}
export function convolve(a,b){
 const result=new Map();
 for(const [x,px]of a)for(const[y,py]of b)result.set(x+y,(result.get(x+y)||0)+px*py);
 return result;
}
export function distribution(damage){
 if(typeof damage==='number')return new Map([[damage,1]]);
 if(!damage.length)return new Map([[0,1]]);
 if(Array.isArray(damage[0]))return damage.reduce((d,row)=>convolve(d,distribution(row)),new Map([[0,1]]));
 if(damage.length<16)return new Map([[damage.reduce((a,b)=>a+b,0),1]]);
 const result=new Map();for(const n of damage)result.set(n,(result.get(n)||0)+1/damage.length);return result;
}
const weatherAbilities={'Drought':'Sun','Drizzle':'Rain','Sand Stream':'Sand','Snow Warning':'Snow'};
const terrainAbilities={'Electric Surge':'Electric','Grassy Surge':'Grassy','Misty Surge':'Misty','Psychic Surge':'Psychic'};
function automaticEffect(a,b,map){
 const x=map[a.ability],y=map[b.ability];
 if(!x)return y||'';if(!y||x===y)return x;
 // The slower weather/terrain setter activates last. A tie requires an explicit selection.
 const entryField=new Field();checkItem(a,false);checkItem(b,false);
 const aSpeed=getFinalSpeed(gen,a,entryField,entryField.attackerSide),bSpeed=getFinalSpeed(gen,b,entryField,entryField.defenderSide);
 if(aSpeed===bSpeed)return '';
 return aSpeed<bSpeed?x:y;
}
export function resolvedField(a,b,field){
 return {...field,weather:field.weather==='Auto'?automaticEffect(a,b,weatherAbilities):field.weather,terrain:field.terrain==='Auto'?automaticEffect(a,b,terrainAbilities):field.terrain};
}
export function runCalculation(attacking,defending,field){
 const attacker=makePokemon(attacking),defender=makePokemon(defending);
 const resolved=resolvedField(attacker,defender,field);
 const battleField=new Field({gameType:field.gameType,weather:resolved.weather||undefined,terrain:resolved.terrain||undefined,isGravity:!!field.gravity,attackerSide:attacking.screens,defenderSide:defending.screens});
 if(!gen.moves.get(attacking.move.toLowerCase().replace(/[^a-z0-9]/g,'')))throw new Error('请选择冠军招式数据库中的招式。');
 if(['Counter','Mirror Coat','Metal Burst','Comeuppance','Spit Up','Beat Up'].includes(attacking.move))throw new Error('该招式需要上一击伤害、蓄力次数或队伍信息；当前条件不足，无法给出可靠结果。');
 const overrides=attacking.move==='Metal Claw'?{basePower:50,category:'Physical',type:'Steel',flags:{contact:1,slicing:1}}:undefined;
 const move=new Move(gen,attacking.move,{ability:attacker.ability,item:attacker.item,isCrit:!!attacking.crit,hits:attacking.hits||undefined,overrides});
 // Status moves are saved build choices, not attacks or simulated battle actions.
 if(move.category==='Status')return {isStatus:true,category:'Status',type:move.type,bp:0,min:null,max:null,minPercent:null,maxPercent:null,ko:null,survive:null,rolls:null,distribution:[],label:'变化招式',description:'变化招式，不计算伤害。招式效果不会自动施加到其他招式；需要时请手动调整强化、状态或对战环境。',weather:resolved.weather||'',terrain:resolved.terrain||''};
 // Champions calc omits Grassy Glide's conditional priority. Set it before immunity checks.
 const groundingAttacker=attacker.clone();checkItem(groundingAttacker,false);
 if(move.name==='Grassy Glide'&&resolved.terrain==='Grassy'&&isGrounded(groundingAttacker,battleField)){
  move.priority=1;move.overrides={...move.overrides,priority:1};
 }
 const result=calculate(gen,attacker,defender,move,battleField);
 // Damage arrays retain per-hit mechanics; convolve independent hit rolls for exact OHKO probability.
 if(['Super Fang','Endeavor','Fissure','Guillotine','Horn Drill','Sheer Cold'].includes(move.name)){
  const probe=new Move(gen,move.name,{ability:attacker.ability,item:attacker.item,overrides:{basePower:1}});
  const canHit=calculate(gen,attacker,defender,probe,battleField).range()[1]>0;
  const ohko=['Fissure','Guillotine','Horn Drill','Sheer Cold'].includes(move.name);
  const sturdyBlocks=ohko&&defender.ability==='Sturdy'&&attacker.ability!=='Mold Breaker';
  const iceBlocks=move.name==='Sheer Cold'&&defender.types.includes('Ice');
  result.damage=!canHit||sturdyBlocks||iceBlocks?0:move.name==='Super Fang'?Math.max(1,Math.floor(defender.curHP()/2)):move.name==='Endeavor'?Math.max(0,defender.curHP()-attacker.curHP()):defender.maxHP();
 }
 const dist=distribution(result.damage);
 const values=[...dist.keys()];const min=Math.min(...values),max=Math.max(...values);
 const currentHP=defender.curHP(),maxHP=defender.maxHP();
 let ko=[...dist].reduce((n,[d,p])=>n+(d>=currentHP?p:0),0);
 const singleHit=!Array.isArray(result.damage?.[0])&&move.hits===1;
 const abilityIgnored=attacker.ability==='Mold Breaker';
 const sash=defender.item==='Focus Sash'&&currentHP===maxHP&&singleHit;
 const sturdy=defender.ability==='Sturdy'&&!abilityIgnored&&currentHP===maxHP&&singleHit;
 const survivalGuard=(sash||sturdy)&&max>=currentHP;
 if(survivalGuard)ko=0;
 const label=max===0?'不受伤害':ko===0?'稳稳吃下':ko>=1-1e-9?'必定倒下':'有概率倒下';
 let rolls=null;
 if(Array.isArray(result.damage)&&!Array.isArray(result.damage[0])&&result.damage.length===16)rolls=result.damage;
 const minRemaining=survivalGuard?Math.max(1,currentHP-max):Math.max(0,currentHP-max);
 const maxRemaining=survivalGuard?Math.max(1,currentHP-min):Math.max(0,currentHP-min);
 const originalMove=new Move(gen,attacking.move,{overrides});
 const conversionCandidate=result.rawDesc.attackerAbility||attacking.ability;
 const convertedBy=originalMove.type!==result.move.type&&['Pixilate','Aerilate','Refrigerate','Dragonize','Liquid Voice','Normalize'].includes(conversionCandidate)?conversionCandidate:'';
 const ateBoost=originalMove.type==='Normal'&&originalMove.type!==result.move.type&&['Pixilate','Aerilate','Refrigerate','Dragonize'].includes(convertedBy);
 const abilityPowerMultiplier=ateBoost?1.2:1;
 const stab=getStabMod(result.attacker,result.move,{})/4096;
 const terrainInfo=terrainConditions(result);
 return {min,max,minPercent:min/maxHP*100,maxPercent:max/maxHP*100,currentHP,maxHP,ko:Math.min(1,Math.max(0,ko)),survive:1-Math.min(1,Math.max(0,ko)),label,rolls,distribution:[...dist].sort((a,b)=>a[0]-b[0]),minRemaining,maxRemaining,guard:survivalGuard?(sash?'气势披带':'结实'):'',weather:result.field.weather||'',terrain:result.field.terrain||'',description:max===0?'该招式因免疫或发动条件无法造成伤害。':result.fullDesc('%',false),category:result.move.category,type:result.move.type,bp:result.rawDesc.moveBP||result.move.bp,originalType:originalMove.type,originalBP:originalMove.bp,convertedBy,abilityPowerMultiplier,abilityBoostedBP:ateBoost?Math.floor(originalMove.bp*1.2):originalMove.bp,stab,attack:result.attacker.stats,defense:result.defender.stats,multiHit:!singleHit,hitCount:move.hits,...terrainInfo};
}
function terrainConditions(result){
 const {attacker,defender,move,field}=result,terrain=field.terrain||'';
 const attackerGrounded=isGrounded(attacker,field),defenderGrounded=isGrounded(defender,field);
 const moveTerrainMultiplier=move.name==='Expanding Force'&&terrain==='Psychic'&&attackerGrounded?1.5:move.name==='Rising Voltage'&&terrain==='Electric'&&defenderGrounded?2:move.name==='Terrain Pulse'&&terrain&&attackerGrounded?2:move.name==='Misty Explosion'&&terrain==='Misty'&&attackerGrounded?1.5:1;
 const terrainBoost=attackerGrounded&&((terrain==='Psychic'&&move.type==='Psychic')||(terrain==='Grassy'&&move.type==='Grass')||(terrain==='Electric'&&move.type==='Electric'))?1.3:1;
 const terrainReduction=defenderGrounded&&((terrain==='Misty'&&move.type==='Dragon')||(terrain==='Grassy'&&['Earthquake','Bulldoze'].includes(move.name)))?0.5:1;
 const spreadMultiplier=field.gameType==='Doubles'&&['allAdjacent','allAdjacentFoes'].includes(move.target)?0.75:1;
 const relevant=!!terrain||['Expanding Force','Rising Voltage','Terrain Pulse','Misty Explosion','Grassy Glide','Steel Roller'].includes(move.name);
 let terrainNote='';
 if(relevant){
  const notes=[];
  if(moveTerrainMultiplier!==1)notes.push('招式威力 ×'+moveTerrainMultiplier);
  if(terrainBoost!==1)notes.push('场地增伤 ×1.3');
  if(terrainReduction!==1)notes.push('场地减伤 ×0.5');
  if(spreadMultiplier!==1)notes.push('双打群攻 ×0.75');
  if(move.name==='Grassy Glide'&&move.priority===1)notes.push('接地先制 +1');
  if(move.name==='Expanding Force'&&terrain==='Psychic'&&!attackerGrounded)notes.push('使用者未接地，无场地增伤／群攻');
  if(move.name==='Rising Voltage'&&terrain==='Electric'&&!defenderGrounded)notes.push('目标未接地，招式不翻倍');
  if(move.name==='Terrain Pulse'&&terrain&&!attackerGrounded)notes.push('使用者未接地，不变属性／不翻倍');
  if(move.name==='Steel Roller'&&!terrain)notes.push('无场地，招式失败');
  if(move.priority>0&&terrain==='Psychic'&&defenderGrounded)notes.push('精神场地阻挡先制招式');
  terrainNote=notes.join(' · ');
 }
 return {attackerGrounded,defenderGrounded,moveTerrainMultiplier,terrainBoost,terrainReduction,spreadMultiplier,priority:move.priority,terrainNote};
}
export function defaultSet(side){
 return {species:side==='left'?'Garchomp':'Charizard-Mega-Y',points:side==='left'?{hp:32,atk:2,def:0,spa:0,spd:32,spe:0}:{hp:2,atk:0,def:0,spa:32,spd:0,spe:32},nature:side==='left'?'Careful':'Modest',ability:side==='left'?'Rough Skin':'Drought',abilityOn:true,item:side==='left'?'Leftovers':'Charizardite Y',hp:100,status:'',boosts:{atk:0,def:0,spa:0,spd:0,spe:0},move:side==='left'?'Rock Slide':'Flamethrower',crit:false,hits:undefined,activeMove:0,moveSlots:(side==='left'?['Rock Slide','Earthquake','Dragon Claw','Iron Head']:['Flamethrower','Air Slash','Solar Beam','Focus Blast']).map(move=>({move,crit:false,hits:undefined})),screens:{isReflect:false,isLightScreen:false,isAuroraVeil:false,isHelpingHand:false,isFriendGuard:false,isTailwind:false}};
}
export const defaultField=()=>({gameType:'Singles',weather:'Auto',terrain:'Auto',gravity:false});

export function getMoveSlots(set){
 if(Array.isArray(set.moveSlots)&&set.moveSlots.length===4)return set.moveSlots;
 return Array.from({length:4},()=>({move:set.move,crit:!!set.crit,hits:set.hits}));
}
export function selectMoveSlot(set,index){
 if(!Number.isInteger(index)||index<0||index>3)throw new Error('招式槽位必须为 0–3。');
 return {...set,activeMove:index,...getMoveSlots(set)[index]};
}
export function updateMoveSlot(set,index,patch){
 const slots=getMoveSlots(set).map((slot,i)=>i===index?{...slot,...patch}:{...slot});
 return selectMoveSlot({...set,moveSlots:slots},index);
}
export function runMoveSet(attacking,defending,field){
 return getMoveSlots(attacking).map(slot=>runCalculation({...attacking,...slot},defending,field));
}
export function speedForSet(set,field){
 const p=makePokemon(set);const battleField=new Field({weather:field.weather||undefined,terrain:field.terrain||undefined,attackerSide:set.screens});
 checkItem(p,battleField.isMagicRoom);
 const effective=getFinalSpeed(gen,p,battleField,battleField.attackerSide);
 return {base:p.species.baseStats.spe,raw:p.rawStats.spe,effective,points:set.points.spe,boost:set.boosts.spe,weather:battleField.weather||'',terrain:battleField.terrain||''};
}
export function compareSpeed(left,right,field){
 const a=makePokemon(left),b=makePokemon(right);const resolved=resolvedField(a,b,field);
 if(['Air Lock','Cloud Nine'].includes(a.ability)||['Air Lock','Cloud Nine'].includes(b.ability))resolved.weather='';
 const mine=speedForSet(left,resolved),opponent=speedForSet(right,resolved);
 const difference=mine.effective-opponent.effective;
 const winner=difference===0?'tie':(field.trickRoom?difference<0:difference>0)?'left':'right';
 return {left:mine,right:opponent,winner,difference,trickRoom:!!field.trickRoom,weather:resolved.weather,terrain:resolved.terrain};
}
export function minimumSpeedPoints(left,right,field){
 for(let sp=0;sp<=32;sp++)if(compareSpeed({...left,points:{...blankPoints(),spe:sp}},right,field).winner==='left')return sp;
 return null;
}
export function theoreticalSpeed(base){
 const neutral=base+20,maxNeutral=base+52,max=Math.floor(maxNeutral*1.1);
 return {min:Math.floor(neutral*.9),neutral,maxNeutral,max,scarf:Math.floor(max*1.5),tailwind:max*2};
}
