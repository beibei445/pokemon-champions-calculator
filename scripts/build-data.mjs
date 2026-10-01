import calc from '@smogon/calc';
import {Dex} from '@pkmn/dex';
import {writeFileSync, readFileSync} from 'node:fs';
const gen=calc.Generations.get(0);
const translations=JSON.parse(readFileSync(new URL('../src/translations.json',import.meta.url),'utf8'));
const id=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const abilityIds=new Set(Array.from(gen.abilities).map(a=>a.id));
const items=Array.from(gen.items).map(i=>({name:i.name,zh:translations.items[i.id]||i.name}));
const pokemon=Array.from(gen.species).filter(s=>!s.name.endsWith('-Both')).map(s=>{
 const dex=Dex.species.get(s.name);
 const root=dex.exists?dex.baseSpecies:(s.baseSpecies||s.name.split('-')[0]);
 const abilities=s.name.includes('-Mega')?Object.values(s.abilities||{}):Array.from(new Set([...Object.values(s.abilities||{}),...Object.values(dex.abilities||{})])).filter(a=>abilityIds.has(id(a)));
 return {...s,root,number:dex.num||0,abilities,megaItem:dex.requiredItem||'',sprite:s.name.toLowerCase().replace(/[^a-z0-9-]/g,''),zh:translations.species[id(root)]||root};
});
const moves=Array.from(gen.moves).map(m=>{
 const move=new calc.Move(gen,m.name);
 const incomplete=m.name==='Metal Claw';
 return {name:m.name,zh:translations.moves[m.id]||m.name,type:incomplete?'Steel':move.type,category:incomplete?'Physical':move.category,bp:incomplete?50:move.bp,multihit:m.multihit,flags:m.flags,target:move.target,unsupported:['Counter','Mirror Coat','Metal Burst','Comeuppance','Spit Up','Beat Up'].includes(m.name)};
}).filter(m=>m.category!=='Status');
writeFileSync(new URL('../src/dex.json',import.meta.url),JSON.stringify({pokemon,moves,items}));
console.log({pokemon:pokemon.length,moves:moves.length,items:items.length});
