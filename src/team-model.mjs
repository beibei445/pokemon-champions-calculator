import dex from './dex.json' with {type:'json'};
const stats=['hp','atk','def','spa','spd','spe'];
const species=new Map(dex.pokemon.map(p=>[p.name,p]));
const moves=new Map(dex.moves.map(m=>[m.name,m]));
const items=new Set(['',...dex.items.map(i=>i.name)]);
const natures=new Set(['Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed','Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild','Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky']);
const screens=['isReflect','isLightScreen','isAuroraVeil','isHelpingHand','isFriendGuard','isTailwind'];
export const LOCAL_TEAM_KEY='champions-lab.teams.v1';
export const clone=value=>structuredClone(value);
function requireValue(ok,message){if(!ok)throw new Error(message)}
export function normalizeMember(value){
 requireValue(value&&typeof value==='object'&&!Array.isArray(value),'宝可梦配置格式不正确。');
 const p=species.get(value.species);
 requireValue(p,'队伍中包含不支持的宝可梦形态。');
 requireValue(natures.has(value.nature),'队伍中包含无效性格。');
 requireValue(p.abilities.includes(value.ability),'特性与宝可梦形态不匹配。');
 requireValue(items.has(value.item),'队伍中包含不支持的道具。');
 requireValue(!p.megaItem||value.item===p.megaItem,'Mega 形态需要携带对应 Mega 石。');
 const points=Object.fromEntries(stats.map(s=>[s,value.points?.[s]]));
 requireValue(stats.every(s=>Number.isInteger(points[s])&&points[s]>=0&&points[s]<=32)&&stats.reduce((a,s)=>a+points[s],0)<=66,'能力点每项为 0–32，总计不能超过 66。');
 const boosts=Object.fromEntries(stats.filter(s=>s!=='hp').map(s=>[s,value.boosts?.[s]??0]));
 requireValue(Object.values(boosts).every(n=>Number.isInteger(n)&&n>=-6&&n<=6),'能力等级应为 −6 到 +6。');
 requireValue(Number.isFinite(value.hp)&&value.hp>=1&&value.hp<=100,'当前 HP 应为 1–100%。');
 requireValue(['','brn','par','psn','tox','slp','frz'].includes(value.status),'异常状态不正确。');
 requireValue(Array.isArray(value.moveSlots)&&value.moveSlots.length===4,'每只宝可梦需要四个招式槽位。');
 const moveSlots=value.moveSlots.map(slot=>{
  const m=moves.get(slot?.move);requireValue(m&&!m.unsupported,'队伍包含不支持的攻击招式。');
  let hits=slot.hits??undefined;
  if(hits!==undefined){const range=Array.isArray(m.multihit)?m.multihit:[m.multihit||1,m.multihit||1];requireValue(Number.isInteger(hits)&&hits>=range[0]&&hits<=range[1],'多段招式命中次数不正确。')}
  return {move:slot.move,crit:!!slot.crit,hits};
 });
 const activeMove=Number.isInteger(value.activeMove)&&value.activeMove>=0&&value.activeMove<4?value.activeMove:0;
 return {species:p.name,nature:value.nature,ability:value.ability,abilityOn:!!value.abilityOn,item:value.item,points,boosts,hp:value.hp,status:value.status,moveSlots,activeMove,...moveSlots[activeMove],screens:Object.fromEntries(screens.map(k=>[k,!!value.screens?.[k]]))};
}
export function normalizeField(value){
 requireValue(value&&['Singles','Doubles'].includes(value.gameType),'对战模式不正确。');
 requireValue(['Auto','','Sun','Rain','Sand','Snow'].includes(value.weather),'天气不正确。');
 requireValue(['Auto','','Electric','Grassy','Misty','Psychic'].includes(value.terrain),'场地不正确。');
 return {gameType:value.gameType,weather:value.weather,terrain:value.terrain,gravity:!!value.gravity,trickRoom:!!value.trickRoom};
}
export function normalizeTeam(value){
 requireValue(value&&typeof value==='object'&&!Array.isArray(value),'队伍文件格式不正确。');
 requireValue(typeof value.id==='string'&&/^[a-zA-Z0-9-]{8,80}$/.test(value.id),'队伍编号不正确。');
 requireValue(typeof value.name==='string'&&value.name.trim().length>0&&value.name.trim().length<=48,'队伍名称应为 1–48 个字符。');
 requireValue(Array.isArray(value.members)&&value.members.length===6,'每支队伍需要六个槽位。');
 const members=value.members.map(m=>m===null?null:normalizeMember(m));
 requireValue(members.some(Boolean),'请先加入至少一只宝可梦。');
 return {id:value.id,name:value.name.trim(),members,field:normalizeField(value.field),updatedAt:Number.isSafeInteger(value.updatedAt)&&value.updatedAt>0?value.updatedAt:Date.now(),revision:Number.isSafeInteger(value.revision)&&value.revision>=0?value.revision:0};
}
export function newTeam(){return {id:crypto.randomUUID(),name:'新队伍',members:Array(6).fill(null),field:{gameType:'Singles',weather:'Auto',terrain:'Auto',gravity:false,trickRoom:false},updatedAt:Date.now(),revision:0}}
export function parseTeamFile(text){
 requireValue(text.length<=1024*1024,'队伍文件不能超过 1 MB。');
 let value;try{value=JSON.parse(text)}catch{throw new Error('队伍文件不是有效的 JSON。')}
 requireValue(value.format==='champions-lab-teams'&&value.version===1,'请导入冠军实验室导出的队伍文件。');
 requireValue(Array.isArray(value.teams)&&value.teams.length>0&&value.teams.length<=100,'文件需要包含 1–100 支队伍。');
 return value.teams.map(normalizeTeam);
}
export function teamFile(teams){return JSON.stringify({format:'champions-lab-teams',version:1,teams:teams.map(normalizeTeam)},null,2)}
