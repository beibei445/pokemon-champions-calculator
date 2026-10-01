import React,{useState,useEffect,useCallback,useRef} from 'react';
import {Users,Plus,Save,Cloud,HardDrive,Download,Upload,RefreshCw,Trash2,Copy,ArrowLeft,CheckCircle2,AlertCircle} from 'lucide-react';
import {clone,newTeam,normalizeTeam,normalizeMember,parseTeamFile,teamFile,LOCAL_TEAM_KEY} from './team-model.mjs';
import {fullName,tr,statCodes,natures} from './data.js';
import {Type} from './components.jsx';
import {speciesByName} from './data.js';
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
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[editing,setEditing]=useState(null);
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
  setDraft(clone(team));setSource(origin);setDirty(false);setEditing(null);setMessage('已载入队伍，可以将成员放入计算器。');setError('');
 }
 function fresh(){if(busy)return;if(dirty&&!window.confirm('当前队伍有未保存的修改，是否新建队伍？'))return;setDraft(newTeam());setDirty(false);setSource('');setEditing(null);setError('');setMessage('')}
 function duplicate(){if(busy)return;setDraft(d=>({...clone(d),id:crypto.randomUUID(),name:(d.name.slice(0,44)+' 副本'),revision:0}));setSource('');setDirty(true);setError('');setMessage('副本已建立，请选择本地或云端保存。')}
 function capture(index,set,field){if(busy)return;try{const member=normalizeMember(set);change({members:draft.members.map((m,i)=>i===index?member:m),field:clone(field)});setMessage(`已加入第 ${index+1} 位，记得保存队伍。`)}catch(e){setError(e.message)}}
 async function save(destination,field){
  setBusy(true);setError('');setMessage('');
  try{
   const team=normalizeTeam({...draft,field:clone(field),updatedAt:Date.now()});
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
 return {local,cloud,draft,dirty,tab,setTab,source,account,cloudError,localError,needsLogin,busy,loading,editing,setEditing,message,error,change,load,fresh,duplicate,capture,save,remove,download,importFile,refreshCloud};
}
export function TeamsPage({teams,left,right,field,onLoad,onField}){
 const input=useRef(),t=teams,list=t.tab==='local'?t.local:t.cloud;
 return <div className="teams-layout">
  <aside className="teams-library" aria-label="保存的队伍"><div className="team-library-heading"><h2><Users size={19}/>我的队伍</h2><button className="team-icon-button" aria-label="新建队伍" onClick={t.fresh}><Plus size={20}/></button></div>
   <div className="team-storage-tabs" role="group" aria-label="队伍存储位置"><button className={t.tab==='local'?'selected':''} onClick={()=>t.setTab('local')}><HardDrive size={15}/>本地 <span>{t.local.length}</span></button><button className={t.tab==='cloud'?'selected':''} onClick={()=>{t.setTab('cloud');t.refreshCloud()}}><Cloud size={15}/>云端 <span>{t.cloud.length}</span></button></div>
   <div className="team-storage-note">{t.tab==='local'?'保存在当前浏览器，可导出到文件。':'登录同一账号，在电脑与手机之间载入。'}{t.tab==='cloud'&&<button disabled={t.loading||t.busy} onClick={t.refreshCloud} aria-label="刷新云端队伍"><RefreshCw size={14}/></button>}</div>
   {t.tab==='cloud'&&t.account&&<p className="team-account">{t.account}</p>}
   {(t.tab==='local'?t.localError:t.cloudError)&&<div className="team-storage-error" role="alert">{t.tab==='local'?t.localError:t.cloudError}{t.needsLogin&&t.tab==='cloud'&&<a href="/signin-with-chatgpt?return_to=%2F%23teams" target="_top">登录 ChatGPT</a>}</div>}
   <div className="team-saved-list">{list.map(team=><div className={'saved-team '+(t.draft.id===team.id&&t.source===t.tab?'selected':'')} key={team.id}><button className="saved-team-load" onClick={()=>t.load(team,t.tab)} aria-label={'载入队伍 '+team.name}><strong>{team.name}</strong><span>{team.members.filter(Boolean).length} / 6 位 · {new Date(team.updatedAt).toLocaleDateString('zh-CN')}</span><div className="saved-team-sprites">{team.members.filter(Boolean).map((m,i)=><img key={i} src={'/pokemon/'+speciesByName[m.species].sprite+'.webp'} alt={fullName(m.species)}/>)}</div></button><button className="team-icon-button delete-team" aria-label={'删除队伍 '+team.name} disabled={t.busy} onClick={()=>t.remove(team,t.tab)}><Trash2 size={15}/></button></div>)}{!list.length&&<div className="team-empty"><Users size={30}/><strong>{t.loading&&t.tab==='cloud'?'正在读取队伍…':'还没有保存的队伍'}</strong><p>把计算器中的宝可梦加入下方槽位，再保存队伍。</p></div>}</div>
   <div className="team-library-files"><button onClick={()=>input.current?.click()}><Upload size={15}/>导入文件</button><button disabled={!t.local.length} onClick={()=>t.download(true)}><Download size={15}/>导出本地队伍</button><input ref={input} hidden type="file" accept=".json,application/json" aria-label="导入队伍文件" onChange={e=>{t.importFile(e.target.files?.[0]);e.target.value=''}}/></div>
  </aside>
  <section className="team-workspace" aria-label="队伍编辑"><div className="team-workspace-heading"><div><span className="eyebrow">TEAM BUILDER</span><label className="team-name-label"><span>队伍名称</span><input maxLength={48} aria-label="队伍名称" disabled={t.busy} value={t.draft.name} onChange={e=>t.change({name:e.target.value})}/></label><span className="team-draft-state">{t.dirty?'有未保存的修改':t.source?'已保存 · '+(t.source==='local'?'本地':'云端'):'新队伍 · 未保存'} · {t.draft.members.filter(Boolean).length} / 6 位</span></div><div className="team-save-actions"><button className="team-primary" disabled={t.busy} onClick={()=>t.save('local',field)}><HardDrive size={16}/>保存到本地</button><button className="team-cloud-save" disabled={t.busy||t.loading} onClick={()=>t.save('cloud',field)}><Cloud size={16}/>保存到云端</button><button className="team-small-action" disabled={t.busy} onClick={t.duplicate}><Copy size={14}/>另存副本</button><button className="team-small-action" onClick={()=>t.download()}><Download size={14}/>导出这支队伍</button></div></div>
   {(t.message||t.error)&&<div className={'team-message '+(t.error?'error':'success')} role={t.error?'alert':'status'}>{t.error?<AlertCircle size={17}/>:<CheckCircle2 size={17}/>}<span>{t.error||t.message}</span></div>}
   <p className="team-instructions">在计算器中配好宝可梦，加入队伍槽位。载入成员后可调整配点，再更新回原槽位。</p>
   <div className="team-member-grid">{t.draft.members.map((member,index)=><article key={index} className={'team-member '+(!member?'empty':'')} aria-label={'队伍第'+(index+1)+'位'}><div className="team-member-top"><span className="team-slot-number">0{index+1}</span>{member&&<button className="team-icon-button" aria-label={'移除第'+(index+1)+'位'} onClick={()=>t.change({members:t.draft.members.map((m,i)=>i===index?null:m)})}><Trash2 size={14}/></button>}</div>{member?<><div className="team-member-identity"><img src={'/pokemon/'+speciesByName[member.species].sprite+'.webp'} alt={fullName(member.species)}/><div><h3>{fullName(member.species)}</h3><span>{tr('abilities',member.ability)} · {tr('items',member.item)||'无道具'}</span><div>{speciesByName[member.species].types.map(type=><Type key={type} type={type}/>)}</div></div></div><div className="team-member-points">{Object.entries(member.points).filter(([,n])=>n>0).map(([s,n])=><span key={s}>{statCodes[s]} <b>{n}</b></span>)}<small>{natures.find(n=>n[0]===member.nature)?.[1]||member.nature}</small></div><div className="team-member-moves">{member.moveSlots.map((slot,i)=><span key={i}>{tr('moves',slot.move)}{slot.crit?' · 要害':''}{slot.hits?' · '+slot.hits+'次':''}</span>)}</div><div className="team-member-load"><button onClick={()=>onLoad(member,'left',index)}>载入我方</button><button onClick={()=>onLoad(member,'right',index)}>载入对手</button></div></>:<div className="team-member-placeholder"><Plus size={27}/><strong>空槽位</strong><span>加入计算器中的配置</span></div>}<div className="team-member-capture"><button onClick={()=>t.capture(index,left,field)} aria-label={'将我方配置存入第'+(index+1)+'位'}>{member?'更新为我方':'加入我方配置'}</button><button onClick={()=>t.capture(index,right,field)} aria-label={'将对手配置存入第'+(index+1)+'位'}>{member?'更新为对手':'加入对手配置'}</button></div></article>)}</div>
   <div className="team-environment"><span>保存时也会记录当前对战模式、天气、场地和戏法空间。</span><button onClick={()=>onField(clone(t.draft.field))}>载入保存的对战环境</button></div>
  </section>
 </div>;
}
export function TeamEditBar({teams,left,right,field}){
 const editing=teams.editing;if(!editing)return null;
 return <div className="team-edit-bar"><span><Users size={17}/>{teams.draft.name} · 第 {editing.index+1} 位 · 正在编辑{editing.side==='left'?'我方':'对手'}</span><button onClick={()=>{teams.capture(editing.index,editing.side==='left'?left:right,field)}}><Save size={15}/>更新回队伍槽位</button><a href="#teams"><ArrowLeft size={15}/>返回队伍保存</a>{teams.message&&<small role="status">{teams.message}</small>}{teams.error&&<small role="alert">{teams.error}</small>}</div>;
}
