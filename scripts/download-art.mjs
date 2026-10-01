import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
const dex=JSON.parse(readFileSync(new URL('../src/dex.json',import.meta.url),'utf8'));
const directory=new URL('../public/pokemon/',import.meta.url);mkdirSync(directory,{recursive:true});
const csv=await (await fetch('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon.csv')).text();
const id=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const identifiers=Object.fromEntries(csv.trim().split('\n').slice(1).map(row=>{const cols=row.split(',');return[id(cols[1]),cols[0]]}));
const index=await(await fetch('https://play.pokemonshowdown.com/sprites/dex/')).text();
const available=new Set([...index.matchAll(/href="([^"/]+\.png)"/g)].map(m=>m[1]));
const saved=[];const missing=[];let next=0;
async function worker(){while(next<dex.pokemon.length){const s=dex.pokemon[next++];const dest=new URL(s.sprite+'.png',directory);if(existsSync(dest)){saved.push(s.sprite);continue;}
 const aliases={meowsticfmega:'meowsticfemalemega',meowsticmmega:'meowsticmalemega',polteageistantique:'polteageist',taurospaldeaaqua:'taurospaldeaaquabreed',taurospaldeablaze:'taurospaldeablazebreed',taurospaldeacombat:'taurospaldeacombatbreed'};
 const artwork=identifiers[aliases[s.id]||s.id];const urls=[];
 if(artwork)urls.push(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${artwork}.png`);
 urls.push(`https://play.pokemonshowdown.com/sprites/dex/${s.sprite}.png`);
 let success=false;
 for(const url of urls){try{const r=await fetch(url,{signal:AbortSignal.timeout(18000)});if(r.ok){writeFileSync(dest,Buffer.from(await r.arrayBuffer()));saved.push(s.sprite);success=true;break;}}catch{}}
 if(!success)missing.push(s.sprite);
}}
await Promise.all(Array.from({length:12},worker));
writeFileSync(new URL('available.json',directory),JSON.stringify(saved));
writeFileSync(new URL('../src/artwork.json',import.meta.url),JSON.stringify(saved));
console.log(JSON.stringify({saved:saved.length,missing}));
