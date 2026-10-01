import dex from './dex.json' with {type:'json'};
import translations from './translations.json';
export const id=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
export const tr=(kind,name)=>translations[kind]?.[id(name)]||name;
export const pokemon=dex.pokemon;
export const speciesByName=Object.fromEntries(pokemon.map(s=>[s.name,s]));
export const families=[...new Set(pokemon.map(s=>s.root))].map(root=>{
 const forms=pokemon.filter(s=>s.root===root);
 return {value:root,label:forms[0].zh,sub:root,number:forms[0].number,forms};
}).sort((a,b)=>a.number-b.number);
export const moves=dex.moves.map(m=>({...m,value:m.name,label:m.zh,sub:m.name}));
export const moveByName=Object.fromEntries(moves.map(s=>[s.name,s]));
export const items=[{value:'',label:'不携带道具',sub:'None'},...dex.items.map(i=>({value:i.name,label:i.zh,sub:i.name}))];
export const typeNames={Normal:'一般',Fire:'火',Water:'水',Electric:'电',Grass:'草',Ice:'冰',Fighting:'格斗',Poison:'毒',Ground:'地面',Flying:'飞行',Psychic:'超能力',Bug:'虫',Rock:'岩石',Ghost:'幽灵',Dragon:'龙',Dark:'恶',Steel:'钢',Fairy:'妖精'};
export const statNames={hp:'HP',atk:'攻击',def:'防御',spa:'特攻',spd:'特防',spe:'速度'};
export const statCodes={hp:'H',atk:'A',def:'B',spa:'C',spd:'D',spe:'S'};
export const statColors={hp:'#24ab87',atk:'#e98557',def:'#deb647',spa:'#7476df',spd:'#50a9c6',spe:'#d178aa'};
export const natures=[['Hardy','勤奋','',''],['Lonely','怕寂寞','atk','def'],['Brave','勇敢','atk','spe'],['Adamant','固执','atk','spa'],['Naughty','顽皮','atk','spd'],['Bold','大胆','def','atk'],['Docile','坦率','',''],['Relaxed','悠闲','def','spe'],['Impish','淘气','def','spa'],['Lax','乐天','def','spd'],['Timid','胆小','spe','atk'],['Hasty','急躁','spe','def'],['Serious','认真','',''],['Jolly','爽朗','spe','spa'],['Naive','天真','spe','spd'],['Modest','内敛','spa','atk'],['Mild','慢吞吞','spa','def'],['Quiet','冷静','spa','spe'],['Bashful','害羞','',''],['Rash','马虎','spa','spd'],['Calm','温和','spd','atk'],['Gentle','温顺','spd','def'],['Sassy','自大','spd','spe'],['Careful','慎重','spd','spa'],['Quirky','浮躁','','']];
export function formName(s){
 const suffix=s.name.slice(s.root.length).replace(/^-/, '');
 if(!suffix)return '普通形态';
 const names={Mega:'Mega', 'Mega-X':'Mega X','Mega-Y':'Mega Y','Mega-Z':'Mega Z',Alola:'阿罗拉',Galar:'伽勒尔',Hisui:'洗翠',Paldea:'帕底亚',Blade:'刀剑形态',Shield:'盾牌形态',F:'雌性',M:'雄性','F-Mega':'Mega 雌性','M-Mega':'Mega 雄性',Heat:'加热',Wash:'清洗',Frost:'结冰',Fan:'旋转',Mow:'切割','Paldea-Combat':'帕底亚斗战','Paldea-Blaze':'帕底亚火炽','Paldea-Aqua':'帕底亚水澜',Hangry:'空腹','Low-Key':'低调','Hero':'全能','Super':'特大','Small':'小型','Large':'大型','Average':'中型','F-Therian':'雌性灵兽',Therian:'灵兽',Incarnate:'化身','Unbound':'解放','White':'焰白','Black':'暗黑'};
 return names[suffix]||suffix;
}
export function fullName(name){const s=speciesByName[name];return s?s.zh+(formName(s)==='普通形态'?'':' · '+formName(s)):name;}
