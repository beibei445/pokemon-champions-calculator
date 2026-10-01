import React,{useState,useMemo,useRef,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Swords,Shield,Gauge,SlidersHorizontal,ArrowLeftRight,X,RotateCcw,Info,ChevronRight,ExternalLink,CheckCircle2,AlertCircle,Users} from 'lucide-react';
import {defaultSet,defaultField,runMoveSet,selectMoveSlot,compareSpeed} from './engine.mjs';
import {typeNames,fullName,tr} from './data.js';
import {PokemonCard} from './pokemon-card.jsx';
import './style.css';
import './teams.css';
import {Type,Toggle} from './components.jsx';
import {MoveComparison,ConversionNote,TerrainNote} from './moves.jsx';
import {SpeedPage} from './speed-page.jsx';
import {useTeams,TeamsPage,TeamLoadout} from './teams.jsx';
import {clone} from './team-model.mjs';
const viewFromHash=()=>location.hash.startsWith('#teams')?'teams':location.hash.startsWith('#speed')?'speed':'damage';
const pct=n=>n.toFixed(1);


function DamageResult({result,attacker,defender,incoming,active,onClick}){
 if(result.isStatus)return <article className={'damage-result status-result '+(active?'active':'')}><div className="result-direction"><span className={'direction-icon '+(incoming?'opponent-icon':'mine-icon')}>{incoming?<Shield size={17}/>:<Swords size={17}/>}</span><span>{incoming?'对手招式':'我方招式'}</span><span className="status-move-badge">变化</span></div><div className="matchup-label">{fullName(attacker.species)}</div><div className="result-move"><span>{tr('moves',attacker.move)}</span><Type type={result.type}/></div><div className="status-result-note"><Info size={23}/><strong>变化招式，不计算伤害</strong><p>保留在四招配置中，可用于配队与展示。</p></div><button className={'detail-button '+(active?'chosen':'')} onClick={onClick}>{active?'正在查看招式说明':'查看招式说明'}<ChevronRight size={13}/></button></article>;
 const good=result.ko===0;const bad=result.ko>=1-1e-9;const status=good?'safe':bad?'danger':'risky';
 const rows=result.rolls||result.distribution.map(([n])=>n);const maxDamage=result.max||1;
 return <article className={'damage-result '+(active?'active ':'')+status}><div className="result-direction"><span className={'direction-icon '+(incoming?'opponent-icon':'mine-icon')}>{incoming?<Shield size={17}/>:<Swords size={17}/>}</span><span>{incoming?'对手攻击 · 我方承伤':'我方攻击 · 对手承伤'}</span><span className="live-label">实时</span></div><div className="matchup-label">{fullName(attacker.species)}<ChevronRight size={12}/>{fullName(defender.species)}</div><div className="result-move"><span>{tr('moves',attacker.move)}</span><Type type={result.type}/>{attacker.crit&&<small>要害</small>}</div><ConversionNote result={result}/><TerrainNote result={result}/><div className="damage-number"><strong>{pct(result.minPercent)}<span>–</span>{pct(result.maxPercent)}<small>%</small></strong><span>{result.min} – {result.max} 点伤害</span></div><div className="damage-track"><span style={{width:Math.min(result.maxPercent,100)+'%'}}/><b style={{width:Math.min(result.minPercent,100)+'%'}}/><i style={{left:Math.min(result.currentHP/result.maxHP*100,100)+'%'}}/></div><div className="track-legend"><span>0%</span><span>满 HP 的百分比</span><span>100%</span></div><div className="survival-verdict">{good?<CheckCircle2 size={21}/>:<AlertCircle size={21}/>}<div><strong>{result.label}</strong><span>{result.guard?result.guard+'触发，至少保留 1 HP':good?`命中后剩余 ${result.minRemaining}–${result.maxRemaining} HP`:bad?'当前 HP 下，所有伤害浮动均可击倒':`一击倒下概率 ${pct(result.ko*100)}%`}</span></div><b>{pct(result.survive*100)}<small>% 存活</small></b></div><button className={'detail-button '+(active?'chosen':'')} onClick={onClick}>{active?'正在查看伤害细节':'查看伤害细节'}<ChevronRight size={13}/></button></article>
}
function Details({result,attacker,defender}){
 const [tab,setTab]=useState('rolls');
 if(result.isStatus)return <section className="details-panel status-details"><div className="details-heading"><div><h3>招式说明</h3><span>{tr('moves',attacker.move)} · 变化 · {typeNames[result.type]}</span></div><Info size={18}/></div><p>{result.description}</p></section>;
 const graph=result.rolls?result.rolls.map((n,i)=>({damage:n,label:85+i,prob:1/16})):result.distribution.map(([damage,prob])=>({damage,label:damage,prob}));
 return <section className="details-panel"><div className="details-heading"><div><h3>伤害细节</h3><span>{tr('moves',attacker.move)} · {fullName(defender.species)}</span></div><div className="small-tabs"><button className={tab==='rolls'?'selected':''} onClick={()=>setTab('rolls')}>伤害分布</button><button className={tab==='formula'?'selected':''} onClick={()=>setTab('formula')}>计算条件</button></div></div>{tab==='rolls'?<><div className="roll-subtitle"><span>{result.rolls?'16 档等概率随机数':'总伤害概率分布（各次命中独立）'}</span><span><i className="legend-safe"/>存活 <i className="legend-ko"/>倒下</span></div><div className={'roll-chart '+(!result.rolls?'distribution-chart':'')}>{graph.map((r,i)=><div className={'roll-column '+(r.damage>=result.currentHP&&!result.guard?'ko':'')} key={i} title={`${r.damage} 点伤害 · 概率 ${pct(r.prob*100)}%`}><small>{graph.length<=20?r.damage:''}</small><div className="roll-bar" style={{height:Math.max(4,result.rolls?r.damage/(result.max||1)*64:r.prob/Math.max(...graph.map(x=>x.prob))*64)+'px'}}/><span>{graph.length<=20?r.label:''}</span></div>)}</div><p className="chart-note">{result.rolls?'横轴为随机数百分比，柱上数字为实际伤害。':'固定命中次数；不包含招式未命中的概率。'} 存活判断以当前 {result.currentHP} HP 为准。</p></>:<div className="condition-list"><div><span>规则</span><b>冠军 · Lv. 50 · 能力点制</b></div><div><span>承伤 HP</span><b>{result.currentHP} / {result.maxHP}</b></div><div><span>招式分类</span><b>{result.category==='Physical'?'物理':'特殊'} · {typeNames[result.type]} · 威力 {result.bp||'变化'}</b></div><div><span>原始 / 实际属性</span><b>{typeNames[result.originalType]} → {typeNames[result.type]}</b></div><div><span>特性威力 / 本系</span><b>×{result.abilityPowerMultiplier} / ×{result.stab}</b></div><div><span>接地情况</span><b>攻击方{result.attackerGrounded?'接地':'未接地'} / 防守方{result.defenderGrounded?'接地':'未接地'}</b></div><div><span>招式 / 场地 / 群攻</span><b>×{result.moveTerrainMultiplier} / ×{result.terrainBoost} / ×{result.spreadMultiplier}</b></div><div><span>场地减伤 / 先制度</span><b>×{result.terrainReduction} / {result.priority>0?'+':''}{result.priority}</b></div><div><span>天气 / 场地</span><b>{weatherText(result.weather)} / {terrainText(result.terrain)}</b></div><div><span>攻击方特性</span><b>{tr('abilities',attacker.ability)}</b></div><div><span>防守方特性</span><b>{tr('abilities',defender.ability)}</b></div><div><span>伤害描述</span><code>{result.description}</code></div></div>}</section>
}
const weatherText=w=>({Sun:'晴天',Rain:'雨天',Sand:'沙暴',Snow:'雪天',Auto:'自动（特性）'}[w]||'无天气');
const terrainText=t=>({Electric:'电气',Grassy:'青草',Misty:'薄雾',Psychic:'精神',Auto:'自动（特性）'}[t]||'无场地');
function RulesModal({onClose}){const ref=useRef();useEffect(()=>{ref.current?.focus();const h=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const els=ref.current.querySelectorAll('button,a');const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h)},[]);return <div className="modal-backdrop" onClick={onClose}><section ref={ref} tabIndex={-1} className="rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="关闭说明"><X/></button><span className="eyebrow">CALCULATION NOTES</span><h2 id="rules-title">计算规则与范围</h2><p>采用 Smogon 的冠军专用引擎（第 0 世代），固定等级 50。HP = 种族值 + 能力点 + 75；其他能力 = ⌊(种族值 + 能力点 + 20) × 性格修正⌋。每项能力点最多 32，总计最多 66。</p><p>普通与 Mega 使用独立种族值、属性和特性。妖精皮肤等特性按变更后的招式属性计算克制，附加 1.2 倍威力修正，并按变更后的属性判断本系加成；界面会显示转换和修正。Mega 形态固定携带对应 Mega 石；选择形态表示已经完成变化。引擎自动处理开启的威吓；天气和场地可自动根据双方特性确定，多个触发特性时速度更慢者后生效，速度相同请手动选择。自动天气已计入速度等级、讲究围巾与麻痹；同速或已有天气、场地和顺风影响入场顺序时请手动指定。</p><p>存活概率以招式命中为条件，包含 85–100 的 16 档伤害浮动；多段招式按所选命中次数对独立随机数求和。满 HP 的气势披带与结实在单次命中时保留 1 HP。精神／电气／青草场地对接地使用者的对应属性招式约增伤 1.3 倍；广域战力在精神场地且使用者接地时另外提升威力 1.5 倍，并变为群攻。双打默认存在多个目标，群攻按 0.75 倍计算。薄雾场地降低接地目标受到的龙系伤害，青草场地降低接地目标受到的地震与重踏伤害。这里评估本次攻击，不含后续回合、天气扣血、反伤和回合末回复；伤害值仍显示道具保护前的理论伤害。</p><p>数据库含引擎支持的 358 个形态、335 个攻击招式和 190 个变化招式，不作为当前赛季可用名单；招式选择不校验学习表。需要上一击伤害、蓄力次数或队伍信息的六个招式已标注为不可选择；变化招式用于配队与展示，不计算伤害，也不会自动施加效果；其他特殊招式按引擎支持范围计算。比赛前建议与游戏内实数值核对。</p><div className="sources"><a href="https://github.com/smogon/damage-calc" target="_blank" rel="noreferrer">伤害引擎 · Smogon <ExternalLink size={13}/></a><a href="https://github.com/PokeAPI/pokeapi" target="_blank" rel="noreferrer">中文名称 · PokéAPI <ExternalLink size={13}/></a><a href="https://play.pokemonshowdown.com/sprites/dex/" target="_blank" rel="noreferrer">形态图像 · Pokémon Showdown <ExternalLink size={13}/></a></div><small>宝可梦为 Nintendo / Game Freak / Creatures 的商标。本工具为非官方爱好者项目。</small></section></div>}

function App(){
 const [left,setLeft]=useState(()=>defaultSet('left'));
 const [right,setRight]=useState(()=>defaultSet('right'));
 const [field,setField]=useState(defaultField);
 const [detail,setDetail]=useState('outgoing');
 const [rules,setRules]=useState(false);
 const [view,setView]=useState(viewFromHash);
 const teams=useTeams();
 const loadOwnMember=member=>{setLeft(clone(member));setDetail('outgoing')};
 useEffect(()=>{
  const navigate=()=>setView(viewFromHash());
  addEventListener('hashchange',navigate);return()=>removeEventListener('hashchange',navigate);
 },[]);
 useEffect(()=>{document.title=(view==='teams'?'我的队伍':view==='speed'?'速度线':'伤害计算器')+' · 冠军实验室'},[view]);
 const calc=useMemo(()=>{
  try{
   const incomingAll=runMoveSet(right,left,field),outgoingAll=runMoveSet(left,right,field);
   return {incomingAll,outgoingAll,incoming:incomingAll[right.activeMove||0],outgoing:outgoingAll[left.activeMove||0],speed:compareSpeed(left,right,field)};
  }catch(error){return {error:error.message}}
 },[left,right,field]);
 const updateField=patch=>setField(f=>({...f,...patch}));
 const changeLeft=(value,options)=>{setLeft(value);if(options?.focusMove||value.activeMove!==left.activeMove)setDetail('outgoing')};
 const changeRight=(value,options)=>{setRight(value);if(options?.focusMove||value.activeMove!==right.activeMove)setDetail('incoming')};
 const reset=()=>{setLeft(defaultSet('left'));setRight(defaultSet('right'));setField(defaultField());setDetail('outgoing')};
 useEffect(()=>{
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  try{Promise.resolve(context.registerTool({
   name:'calculate_current_matchup',title:'读取双方四招伤害与速度',
   description:'读取当前双方宝可梦的四招独立伤害范围、存活概率、特性属性转换和速度比较。',
   inputSchema:{type:'object',properties:{},additionalProperties:false},
   annotations:{readOnlyHint:true,untrustedContentHint:false},
   execute:input=>{
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('此操作只接受空对象');
    if(calc.error)throw new Error(calc.error);
    const summarize=(results,set)=>results.map((r,i)=>({move:set.moveSlots[i].move,type:r.type,category:r.category,isStatus:!!r.isStatus,min:r.min,max:r.max,survive:r.survive,label:r.label,convertedBy:r.convertedBy,abilityPowerMultiplier:r.abilityPowerMultiplier,stab:r.stab}));
    return {incoming:summarize(calc.incomingAll,right),outgoing:summarize(calc.outgoingAll,left),speed:calc.speed};
   }
  },{signal:lifecycle.signal})).catch(()=>{});}catch{}
  return()=>lifecycle.abort();
 },[calc,left,right]);
 return <>
  <header className="site-header"><div className="header-inner">
   <a href="#damage" className="brand" aria-label="冠军实验室首页"><span className="brand-icon"><Swords size={21}/></span><span>冠军实验室<small>CHAMPIONS LAB</small></span><span className="brand-divider"/><span className="brand-caption">对战工具</span></a>
   <nav className="header-nav" aria-label="工具页面"><a href="#damage" className={view==='damage'?'selected':''} aria-current={view==='damage'?'page':undefined}><Swords size={16}/>伤害计算</a><a href="#speed" className={view==='speed'?'selected':''} aria-current={view==='speed'?'page':undefined}><Gauge size={16}/>速度线</a><a href="#teams" className={view==='teams'?'selected':''} aria-current={view==='teams'?'page':undefined}><Users size={16}/>我的队伍</a></nav>
   <div className="header-actions"><span className="version-badge">Pokémon Champions</span><button onClick={()=>setRules(true)}><Info size={16}/><span>计算说明</span></button></div>
  </div></header>
  <main>
   <div className="page-heading"><div><div className="eyebrow">{view==='teams'?'YOUR TEAM LIBRARY':view==='speed'?'SPEED TIERS & TURN ORDER':'BATTLE DAMAGE CALCULATOR'}</div><h1>{view==='teams'?'保存配队，随时开战':view==='speed'?'把握速度，先手一步':'每一点耐久，都有答案'}<span>。</span></h1><p>{view==='teams'?'六个队伍槽位，本地与云端都能保存。':view==='speed'?'对照速度线，找到先手所需的每一点配速。':'四招伤害同时查看，普通与 Mega 特性分别计算。'}</p></div>{view!=='teams'&&<div className="page-actions"><button className="subtle-button" onClick={reset}><RotateCcw size={15}/>重置</button><button className="swap-button" onClick={()=>{setLeft(right);setRight(left)}}><ArrowLeftRight size={16}/>交换双方</button></div>}</div>
   {view==='teams'?<TeamsPage teams={teams}/>:view==='speed'?<SpeedPage left={left} right={right} onLeft={setLeft} onRight={setRight} field={field} onField={setField}/>:<>
    <section className="battle-settings" aria-label="对战环境"><div className="settings-title"><SlidersHorizontal size={16}/><span>对战环境</span></div><div className="battle-mode" role="group" aria-label="对战模式"><button className={field.gameType==='Singles'?'selected':''} onClick={()=>updateField({gameType:'Singles'})}>单打</button><button className={field.gameType==='Doubles'?'selected':''} onClick={()=>updateField({gameType:'Doubles'})}>双打</button></div><div className="settings-divider"/><div className="weather-control"><span>天气</span><select aria-label="天气" value={field.weather} onChange={e=>updateField({weather:e.target.value})}>{[['Auto','自动 · 特性'],['','无天气'],['Sun','晴天'],['Rain','雨天'],['Sand','沙暴'],['Snow','雪天']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></div><div className="weather-control"><span>场地</span><select aria-label="场地" value={field.terrain} onChange={e=>updateField({terrain:e.target.value})}>{[['Auto','自动 · 特性'],['','无场地'],['Electric','电气场地'],['Grassy','青草场地'],['Misty','薄雾场地'],['Psychic','精神场地']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></div><Toggle checked={field.gravity} onChange={v=>updateField({gravity:v})}>重力</Toggle><div className="rules-pill"><Shield size={13}/>50 级 · 66 能力点</div></section>
    <TeamLoadout teams={teams} onLoad={loadOwnMember} current={left}/>
    {!calc.error&&<div className="mobile-results-summary"><a href="#battle-results"><Swords size={15}/><span>对手承伤 · 招式{left.activeMove+1}<b>{calc.outgoing.isStatus?'变化 · 不计算伤害':`${pct(calc.outgoing.minPercent)}–${pct(calc.outgoing.maxPercent)}%`}</b></span><strong>{calc.outgoing.label}</strong></a><a href="#battle-results"><Shield size={15}/><span>我方承伤 · 招式{right.activeMove+1}<b>{calc.incoming.isStatus?'变化 · 不计算伤害':`${pct(calc.incoming.minPercent)}–${pct(calc.incoming.maxPercent)}%`}</b></span><strong>{calc.incoming.label}</strong></a></div>}
    <div className="calculator-grid">
     <PokemonCard side="left" set={left} onChange={changeLeft} results={calc.outgoingAll}/>
     <section className="results-column" aria-label="双向计算结果" id="battle-results"><div className="results-heading"><span className="results-line"/><span><Swords size={15}/>四招对战结果</span><span className="results-line"/></div>{calc.error?<div role="alert" className="error-result">无法计算：{calc.error}</div>:<>
      <div className="result-group"><MoveComparison results={calc.outgoingAll} set={left} onSelect={i=>{changeLeft(selectMoveSlot(left,i));setDetail('outgoing')}}/><DamageResult active={detail==='outgoing'} result={calc.outgoing} attacker={left} defender={right} onClick={()=>setDetail('outgoing')}/></div>
      <div className="versus"><span/>VS<span/></div>
      <div className="result-group"><MoveComparison incoming results={calc.incomingAll} set={right} onSelect={i=>{changeRight(selectMoveSlot(right,i));setDetail('incoming')}}/><DamageResult incoming active={detail==='incoming'} result={calc.incoming} attacker={right} defender={left} onClick={()=>setDetail('incoming')}/></div>
      <Details result={calc[detail]} attacker={detail==='incoming'?right:left} defender={detail==='incoming'?left:right}/>
     </>}<div className="result-footnote"><Info size={13}/><span>四招分别使用同一初始状态计算，不代表连续四次攻击。以命中为条件，不包含回合末伤害或回复；双打群攻默认命中多个目标。</span></div></section>
     <PokemonCard side="right" set={right} onChange={changeRight} results={calc.incomingAll}/>
    </div>
   </>}
   <footer><div><span className="footer-mark"><Swords size={14}/></span><span>冠军实验室</span><i/>为每一次配点提供依据</div><button onClick={()=>setRules(true)}>Smogon 引擎 · 数据与计算说明<ChevronRight size={13}/></button></footer>
  </main>
  {rules&&<RulesModal onClose={()=>setRules(false)}/>}
 </>;
}
createRoot(document.getElementById('root')).render(<App/>);
