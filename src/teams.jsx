import React,{useState,useEffect,useCallback,useRef} from 'react';
import {Users,Plus,Cloud,HardDrive,Download,Upload,RefreshCw,Trash2,Copy,CheckCircle2,AlertCircle} from 'lucide-react';
import {clone,newTeam,normalizeTeam,normalizeMember,parseTeamFile,teamFile,LOCAL_TEAM_KEY} from './team-model.mjs';
import {fullName,natures} from './data.js';
import {speciesByName} from './data.js';
import {defaultSet,blankPoints} from './engine.mjs';
import {PokemonCard} from './pokemon-card.jsx';
const sort=teams=>[...teams].sort((a,b)=>b.updatedAt-a.updatedAt);
async function api(path,options){
 let response;try{response=await fetch(path,{...options,credentials:'same-origin',cache:'no-store'})}catch{throw new Error('无法连接云端，草稿已保留。可以先保存到本地。')}
 if(!response.headers.get('Content-Type')?.includes('application/json'))throw new Error('请登录网站后重试云端保存。');
 const body=await response.json();if(!response.ok){const error=new Error(body.error||'云端操作失败。');error.code=body.code;throw error}return body;
}
function readLocal(){
 try{const text=localStorage.getItem(LOCAL_TEAM_KEY);if(!text)return {teams:[],error:''};const value=JSON.parse(text);if(value.format==='champions-lab-teams'&&value.version===1&&Array.isArray(value.teams)&&value.teams.length===0)return {teams:[],error:''};return {teams:parseTeamFile(text),error:''}}
 catch{return {teams:[],error:'本地队伍无法读取，请先导出草稿。浏览器可能限制了存储，或保存的文件已损坏。'}}
}
export function useTeams(){
 const [initial]=useState(readLocal),[local,setLocal]=useState(initial.teams),[localError,setLocalError]=useState(initial.error);
 const [cloud,setCloud]=useState([]),[cloudError,setCloudError]=useState(''),[account,setAccount]=useState(''),[needsLogin,setNeedsLogin]=useState(false);
 const [draft,setDraft]=useState(newTeam),[dirty,setDirty]=useState(false),[tab,setTab]=useState('local'),[source,setSource]=useState('');
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[selectedMember,setSelectedMember]=useState(0);
 const change=patch=>{if(busy)return;setDraft(d=>({...d,...patch}));setDirty(true);setMessage('');setError('')};
 const refreshCloud=useCallback(async()=>{
  setLoading(true);try{const data=await api('/api/teams');setCloud(sort(data.teams.map(normalizeTeam)));setAccount(data.account);setCloudError('');setNeedsLogin(false)}catch(e){setCloudError(e.message);setNeedsLogin(e.code==='signin_required')}finally{setLoading(false)}
 },[]);
 useEffect(()=>{refreshCloud();const handler=e=>{if(e.key===LOCAL_TEAM_KEY){const data=readLocal();setLocal(data.teams);setLocalError(data.error)}};addEventListener('storage',handler);return()=>removeEventListener('storage',handler)},[refreshCloud]);
 function persist(teams){
  if(localError)throw new Error(localError);
  if(teams.length>100)throw new Error('本地最多保存 100 支队伍。');
  try{localStorage.setItem(LOCAL_TEAM_KEY,teams.length?teamFile(teams):JSON.stringify({format:'champions-lab-teams',version:1,teams:[]}))}catch{throw new Error('本地保存失败，草稿已保留。请允许浏览器存储，或导出文件。')}
  setLocal(sort(teams));
 }
 function load(team,origin){
  if(busy)return;
  if(dirty&&!window.confirm('当前队伍有未保存的修改。载入其他队伍会放弃这些修改，是否继续？'))return;
  setDraft(clone(team));setSource(origin);setDirty(false);setSelectedMember(Math.max(0,team.members.findIndex(Boolean)));setMessage('已载入队伍，可直接编辑成员配置。');setError('');
 }
 function fresh(){if(busy)return;if(dirty&&!window.confirm('当前队伍有未保存的修改，是否新建队伍？'))return;setDraft(newTeam());setDirty(false);setSource('');setSelectedMember(0);setError('');setMessage('')}
 function duplicate(){if(busy)return;setDraft(d=>({...clone(d),id:crypto.randomUUID(),name:(d.name.slice(0,44)+' 副本'),revision:0}));setSource('');setDirty(true);setError('');setMessage('副本已建立，请选择本地或云端保存。')}
 function updateMember(index,value){if(busy)return;try{const member=normalizeMember(value);change({members:draft.members.map((m,i)=>i===index?member:m)})}catch(e){setError(e.message)}}
 function editMember(index){if(busy)return;setSelectedMember(index);if(!draft.members[index])updateMember(index,{...defaultSet('left'),points:blankPoints(),nature:'Hardy',item:''})}
 function removeMember(index){change({members:draft.members.map((m,i)=>i===index?null:m)})}

 async function save(destination){
  setBusy(true);setError('');setMessage('');
  try{
   const team=normalizeTeam({...draft,updatedAt:Date.now()});
   if(destination==='local'){persist([...local.filter(t=>t.id!==team.id),team]);setDraft(team);setSource('local');setTab('local');setMessage('已保存到本地。此浏览器关闭后仍可载入。')}
   else{const {team:saved}=await api('/api/teams/'+team.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(team)});setCloud(sort([...cloud.filter(t=>t.id!==team.id),saved]));setDraft(saved);setSource('cloud');setTab('cloud');setMessage('已保存到云端。在其他设备登录同一 ChatGPT 账号即可载入。')}
   setDirty(false);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function remove(team,origin){
  if(!window.confirm(`删除${origin==='local'?'本地':'云端'}队伍「${team.name}」？另一处保存的副本不会被删除。`))return;
  setBusy(true);setError('');try{if(origin==='local')persist(local.filter(t=>t.id!==team.id));else{await api('/api/teams/'+team.id,{method:'DELETE',headers:{'If-Match':String(team.revision)}});setCloud(c=>c.filter(t=>t.id!==team.id))}if(draft.id===team.id&&source===origin){setSource('');setDirty(true)}setMessage('已删除保存记录，当前草稿仍可另存。')}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 function download(all=false){
  setError('');try{const text=teamFile(all?local:[draft]);const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=(all?'冠军实验室-本地队伍':draft.name.replace(/[\\/:*?"<>|]/g,'-'))+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('队伍文件已导出，可导入到其他设备。')}catch(e){setError(e.message)}
 }
 async function importFile(file){
  if(!file||busy)return;setError('');try{if(file.size>1024*1024)throw new Error('队伍文件不能超过 1 MB。');const imported=parseTeamFile(await file.text()).map(t=>({...t,id:crypto.randomUUID(),revision:0,updatedAt:Date.now()}));persist([...local,...imported]);setTab('local');setMessage(`已导入 ${imported.length} 支队伍到本地。选择队伍后也可保存到云端。`)}catch(e){setError(e.message)}
 }
 return {local,cloud,draft,dirty,tab,setTab,source,account,cloudError,localError,needsLogin,busy,loading,selectedMember,editMember,updateMember,removeMember,message,error,change,load,fresh,duplicate,save,remove,download,importFile,refreshCloud};
}
export function TeamsPage({teams}){
 const input=useRef(),t=teams,list=t.tab==='local'?t.local:t.cloud,member=t.draft.members[t.selectedMember];
 return <div className="teams-layout">
  <aside className="teams-library" aria-label="保存的队伍"><div className="team-library-heading"><h2><Users size={19}/>我的队伍</h2><button className="team-icon-button" aria-label="新建队伍" onClick={t.fresh}><Plus size={20}/></button></div>
   <div className="team-storage-tabs" role="group" aria-label="队伍存储位置"><button className={t.tab==='local'?'selected':''} onClick={()=>t.setTab('local')}><HardDrive size={15}/>本地 <span>{t.local.length}</span></button><button className={t.tab==='cloud'?'selected':''} onClick={()=>{t.setTab('cloud');t.refreshCloud()}}><Cloud size={15}/>云端 <span>{t.cloud.length}</span></button></div>
   <div className="team-storage-note">{t.tab==='local'?'保存在当前浏览器，可导出到文件。':'登录同一账号，在电脑与手机之间载入。'}{t.tab==='cloud'&&<button disabled={t.loading||t.busy} onClick={t.refreshCloud} aria-label="刷新云端队伍"><RefreshCw size={14}/></button>}</div>
   {t.tab==='cloud'&&t.account&&<p className="team-account">{t.account}</p>}
   {(t.tab==='local'?t.localError:t.cloudError)&&<div className="team-storage-error" role="alert">{t.tab==='local'?t.localError:t.cloudError}{t.needsLogin&&t.tab==='cloud'&&<a href="/signin-with-chatgpt?return_to=%2F%23teams" target="_top">登录 ChatGPT</a>}</div>}
   <div className="team-saved-list">{list.map(team=><div className={'saved-team '+(t.draft.id===team.id&&t.source===t.tab?'selected':'')} key={team.id}><button className="saved-team-load" onClick={()=>t.load(team,t.tab)} aria-label={'载入队伍 '+team.name}><strong>{team.name}</strong><span>{team.members.filter(Boolean).length} / 6 位 · {new Date(team.updatedAt).toLocaleDateString('zh-CN')}</span><div className="saved-team-sprites">{team.members.filter(Boolean).map((m,i)=><img key={i} src={'/pokemon/'+speciesByName[m.species].sprite+'.webp'} alt={fullName(m.species)}/>)}</div></button><button className="team-icon-button delete-team" aria-label={'删除队伍 '+team.name} disabled={t.busy} onClick={()=>t.remove(team,t.tab)}><Trash2 size={15}/></button></div>)}{!list.length&&<div className="team-empty"><Users size={30}/><strong>{t.loading&&t.tab==='cloud'?'正在读取队伍…':'还没有保存的队伍'}</strong><p>新建队伍，点击位置直接配置宝可梦。</p></div>}</div>
   <div className="team-library-files"><button onClick={()=>input.current?.click()}><Upload size={15}/>导入文件</button><button disabled={!t.local.length} onClick={()=>t.download(true)}><Download size={15}/>导出本地队伍</button><input ref={input} hidden type="file" accept=".json,application/json" aria-label="导入队伍文件" onChange={e=>{t.importFile(e.target.files?.[0]);e.target.value=''}}/></div>
  </aside>
  <section className="team-workspace" aria-label="队伍编辑"><div className="team-workspace-heading"><div><span className="eyebrow">TEAM BUILDER</span><label className="team-name-label"><span>队伍名称</span><input maxLength={48} aria-label="队伍名称" disabled={t.busy} value={t.draft.name} onChange={e=>t.change({name:e.target.value})}/></label><span className="team-draft-state">{t.dirty?'有未保存的修改':t.source?'已保存 · '+(t.source==='local'?'本地':'云端'):'新队伍 · 未保存'} · {t.draft.members.filter(Boolean).length} / 6 位</span></div><div className="team-save-actions"><button className="team-primary" disabled={t.busy} onClick={()=>t.save('local')}><HardDrive size={16}/>保存到本地</button><button className="team-cloud-save" disabled={t.busy||t.loading} onClick={()=>t.save('cloud')}><Cloud size={16}/>保存到云端</button><button className="team-small-action" disabled={t.busy} onClick={t.duplicate}><Copy size={14}/>另存副本</button><button className="team-small-action" onClick={()=>t.download()}><Download size={14}/>导出这支队伍</button></div></div>
   {(t.message||t.error)&&<div className={'team-message '+(t.error?'error':'success')} role={t.error?'alert':'status'}>{t.error?<AlertCircle size={17}/>:<CheckCircle2 size={17}/>}<span>{t.error||t.message}</span></div>}
   <p className="team-instructions">选择一个位置，直接设置宝可梦、形态、性格、特性、道具、能力点和四个招式。</p>
   <div className="team-slot-tabs" aria-label="六个队伍位置">{t.draft.members.map((m,index)=><div key={index} className={'team-slot-tab '+(t.selectedMember===index?'selected ':'')+(!m?'empty':'')}><button className="team-slot-select" disabled={t.busy} aria-label={'配置第'+(index+1)+'位'} aria-pressed={t.selectedMember===index} onClick={()=>t.editMember(index)}><span className="team-slot-number">0{index+1}</span>{m?<><img src={'/pokemon/'+speciesByName[m.species].sprite+'.webp'} alt=""/><span className="team-slot-identity"><strong>{fullName(m.species)}</strong><small>{natures.find(n=>n[0]===m.nature)?.[1]} · {Object.values(m.points).reduce((a,b)=>a+b,0)} / 66 点</small></span></>:<span className="team-slot-identity"><Plus size={20}/><strong>添加宝可梦</strong></span>}</button>{m&&<button className="team-icon-button team-slot-remove" disabled={t.busy} aria-label={'移除第'+(index+1)+'位'} onClick={()=>t.removeMember(index)}><Trash2 size={13}/></button>}</div>)}</div>
   <div className="team-direct-editor" inert={t.busy}><div className="team-direct-heading"><h2>第 {t.selectedMember+1} 位{member?' · '+fullName(member.species):''}</h2><span>修改会保留在草稿，完成后保存队伍</span></div>{member?<PokemonCard key={t.draft.id+'-'+t.selectedMember} side="left" set={member} teamEditor onChange={value=>t.updateMember(t.selectedMember,value)}/>:<div className="team-start-editor"><Users size={34}/><p>从六个位置中选择一个，开始配置你的宝可梦。</p><button className="team-primary" onClick={()=>t.editMember(t.selectedMember)}><Plus size={16}/>配置第 {t.selectedMember+1} 位</button></div>}</div>
   <div className="team-builder-footer"><span>保存后，在伤害计算页的「载入我的队伍」中选择成员即可使用。</span><a href="#damage">前往伤害计算</a></div>
  </section>
 </div>;
}
export function TeamLoadout({teams,onLoad,current}){
 const options=[...teams.local.map(team=>({key:'local:'+team.id,origin:'本地',team})),...teams.cloud.map(team=>({key:'cloud:'+team.id,origin:'云端',team}))];
 const [key,setKey]=useState(''),[notice,setNotice]=useState('');
 const preferred=teams.source?teams.source+':'+teams.draft.id:'';
 const keys=options.map(o=>o.key).join('|');
 useEffect(()=>{if(!key||!options.some(o=>o.key===key)){setKey(options.some(o=>o.key===preferred)?preferred:options[0]?.key||'');setNotice('')}},[keys,key,preferred]);
 const selected=options.find(o=>o.key===key);
 return <section className="party-loadout" aria-label="载入我的队伍"><div className="party-loadout-heading"><h2><Users size={17}/>载入我的队伍</h2>{options.length>0&&<select aria-label="选择已保存队伍" value={selected?.key||''} onChange={e=>{setKey(e.target.value);setNotice('')}}>{options.map(o=><option key={o.key} value={o.key}>{o.origin} · {o.team.name}</option>)}</select>}<button className="team-icon-button" disabled={teams.loading} onClick={teams.refreshCloud} aria-label="刷新可用队伍"><RefreshCw size={14}/></button><a href="#teams">管理队伍</a></div>{selected?<div className="party-member-buttons">{selected.team.members.map((member,index)=>{
 const matches=member&&current&&member.species===current.species&&member.nature===current.nature&&member.ability===current.ability&&member.item===current.item&&JSON.stringify(member.points)===JSON.stringify(current.points)&&member.moveSlots.every((m,i)=>m.move===current.moveSlots?.[i]?.move);
 return <button key={index} disabled={!member} className={matches?'selected':''} aria-label={member?'载入第'+(index+1)+'位 '+fullName(member.species):'第'+(index+1)+'位空位置'} onClick={()=>{onLoad(clone(member));setNotice('已载入第 '+(index+1)+' 位 · '+fullName(member.species))}}><small>0{index+1}</small>{member?<><img src={'/pokemon/'+speciesByName[member.species].sprite+'.webp'} alt=""/><span>{fullName(member.species)}</span></>:<span>空位置</span>}</button>
 })}</div>:<p className="party-loadout-empty">{teams.loading?'正在读取保存的队伍…':'先到「我的队伍」配置并保存，之后在这里选择成员即可。'}</p>}{notice&&<p className="party-loadout-notice" role="status">{notice}</p>}{teams.cloudError&&<p className="party-cloud-note">云端队伍暂未载入，可刷新或到「我的队伍」查看。</p>}</section>;
}
