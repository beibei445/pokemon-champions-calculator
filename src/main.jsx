import React,{useState,useMemo,useRef,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Swords,Shield,Gauge,SlidersHorizontal,ArrowLeftRight,ChevronDown,Search,Check,X,RotateCcw,Info,Sun,CloudRain,Snowflake,Wind,Sparkles,Heart,ChevronRight,Zap,ExternalLink,CheckCircle2,AlertCircle} from 'lucide-react';
import {STATS,defaultSet,defaultField,makePokemon,runCalculation,blankPoints,Move,gen,runMoveSet,selectMoveSlot,compareSpeed} from './engine.mjs';
import {pokemon,families,speciesByName,moves,moveByName,items,typeNames,statNames,statCodes,statColors,natures,formName,fullName,tr} from './data.js';
import artwork from './artwork.json';
import './style.css';
import {Type,Picker,Select,Toggle} from './components.jsx';
import {MovePanel,MoveComparison,ConversionNote} from './moves.jsx';
import {SpeedPage} from './speed-page.jsx';
const art=new Set(artwork);
const pct=n=>n.toFixed(1);

function PokemonCard({side,set,onChange,results}){
 const mine=side==='left';const s=speciesByName[set.species];const family=families.find(f=>f.value===s.root);const p=makePokemon(set);const used=STATS.reduce((n,k)=>n+set.points[k],0);const nat=natures.find(n=>n[0]===set.nature);const move=moveByName[set.move];const effectiveHits=new Move(gen,set.move,{ability:set.ability,item:set.item}).hits;
 const [advanced,setAdvanced]=useState(false);
 const update=patch=>onChange({...set,...patch});
 const changeSpecies=name=>{const next=speciesByName[name];update({species:name,ability:next.abilities[0]||'',item:next.megaItem||((set.item===s.megaItem)?'':set.item)})};
 const changePoints=(key,value)=>{const limit=Math.min(32,66-used+set.points[key]);update({points:{...set.points,[key]:Math.max(0,Math.min(limit,Math.round(Number(value)||0)))}})};
 const preset=kind=>{let points=blankPoints(),nature='Hardy';if(kind==='physical'){points.hp=32;points.def=32;points.spe=2;nature='Bold'}if(kind==='special'){points.hp=32;points.spd=32;points.spe=2;nature='Calm'}if(kind==='attack'){points.atk=32;points.spe=32;points.hp=2;nature='Adamant'}if(kind==='spattack'){points.spa=32;points.spe=32;points.hp=2;nature='Modest'}update({points,nature})};
 return <section className={'pokemon-card '+side} aria-label={mine?'我方配置':'对手配置'}><div className="card-topline"><span className="side-label"><span className="side-marker"/>{mine?'我方宝可梦':'对手宝可梦'}</span><span className="level">Lv. 50</span></div><div className="pokemon-scene"><div className="scene-ring"/><div className="scene-id">#{String(s.number).padStart(4,'0')}</div>{art.has(s.sprite)?<img className="pokemon-art" src={'/pokemon/'+s.sprite+'.webp'} alt={fullName(s.name)}/>:<div className="no-art"><Sparkles size={32}/><span>该形态暂无图像</span></div>}<div className="scene-types">{s.types.map(t=><Type type={t} key={t}/>)}</div>{s.name.includes('-Mega')&&<span className="mega-badge"><Sparkles size={11}/> MEGA</span>}</div><div className="pokemon-heading"><Picker label={mine?'我方宝可梦':'对手宝可梦'} value={s.root} options={families} onChange={root=>{const f=families.find(f=>f.value===root);changeSpecies((f.forms.find(x=>formName(x)==='普通形态')||f.forms.find(x=>!x.name.includes('-Mega'))||f.forms[0]).name)}}/><span className="pokemon-english">{s.name}</span></div><div className="forms" aria-label="形态">{family.forms.map(f=><button key={f.name} className={set.species===f.name?'selected':''} onClick={()=>changeSpecies(f.name)}>{f.name.includes('-Mega')&&<Sparkles size={12}/>} {formName(f)}</button>)}</div>
 <div className="build-fields"><Select label="性格 / 能力倾向" value={set.nature} onChange={v=>update({nature:v})} options={natures.map(([v,t,plus,minus])=>[v,t+(plus?`（+${statNames[plus]} −${statNames[minus]}）`:'（无修正）')])}/><div className="pair-fields"><Select label="特性" value={set.ability} onChange={v=>update({ability:v})} options={s.abilities.map(a=>[a,tr('abilities',a)])}/><div className="field-label"><span>携带道具</span>{s.megaItem?<div className="fixed-item" title={s.megaItem}><Sparkles size={13}/>{tr('items',s.megaItem)}</div>:<Picker compact label="携带道具" value={set.item} options={items} onChange={v=>update({item:v})}/>}</div></div></div>
 <div className="stats-heading"><h3><SlidersHorizontal size={15}/>能力点分配</h3><span><b className={used===66?'full-points':''}>{used}</b> / 66 <small>SP</small></span></div><div className="presets"><button onClick={()=>preset('physical')}>物耐</button><button onClick={()=>preset('special')}>特耐</button><button onClick={()=>preset('attack')}>物攻</button><button onClick={()=>preset('spattack')}>特攻</button><button onClick={()=>preset('none')} aria-label="清空能力点"><RotateCcw size={12}/></button></div>
 <div className="stats-table"><div className="stats-table-head"><span>能力</span><span>种族值</span><span>能力点</span><span>实数值</span></div>{STATS.map(key=><div key={key} className="stat-row"><span className="stat-label"><i style={{background:statColors[key]}}/>{statNames[key]}{nat[2]===key?<em className="up">↑</em>:nat[3]===key?<em className="down">↓</em>:null}</span><span className="base-stat">{s.baseStats[key]}</span><div className="point-control"><input type="range" aria-label={(mine?'我方':'对手')+statNames[key]+'能力点'} min="0" max="32" value={set.points[key]} onChange={e=>changePoints(key,e.target.value)} style={{'--fill':set.points[key]/32*100+'%'}}/><input type="number" aria-label={(mine?'我方':'对手')+statNames[key]+'能力点数值'} min="0" max="32" value={set.points[key]} onChange={e=>changePoints(key,e.target.value)}/></div><strong className="actual-stat">{p.rawStats[key]}</strong></div>)}</div><div className="stat-total"><span>种族值合计 <b>{STATS.reduce((n,k)=>n+s.baseStats[k],0)}</b></span><span>剩余 <b>{66-used}</b> 点</span></div>
 <div className="hp-control"><div><span><Heart size={13}/>当前 HP</span><span><b>{p.curHP()}</b> / {p.maxHP()} <small>({set.hp}%)</small></span></div><input type="range" min="1" max="100" value={set.hp} aria-label={(mine?'我方':'对手')+'当前HP百分比'} onChange={e=>update({hp:Number(e.target.value)})} style={{'--fill':set.hp+'%'}}/></div>
 <MovePanel side={side} set={set} onChange={value=>onChange(value,{focusMove:true})} results={results}/>
 <button className="advanced-toggle" aria-expanded={advanced} onClick={()=>setAdvanced(!advanced)}><SlidersHorizontal size={14}/>能力等级、状态与壁<ChevronDown size={14} className={advanced?'rotated':''}/></button>{advanced&&<div className="advanced-panel"><div className="boosts">{STATS.filter(k=>k!=='hp').map(k=><Select key={k} label={statNames[k]+'等级'} value={set.boosts[k]} options={Array.from({length:13},(_,i)=>[i-6,i-6>0?'+'+(i-6):String(i-6)])} onChange={v=>update({boosts:{...set.boosts,[k]:Number(v)}})}/>)}</div><Select label="异常状态" value={set.status} options={[["","无异常"],['brn','灼伤'],['par','麻痹'],['psn','中毒'],['tox','剧毒'],['slp','睡眠'],['frz','冰冻']]} onChange={v=>update({status:v})}/><div className="screens">{[['isReflect','反射壁'],['isLightScreen','光墙'],['isAuroraVeil','极光幕'],['isHelpingHand','受到帮助'],['isFriendGuard','队友友情防守'],['isTailwind','顺风']].map(([key,t])=><Toggle key={key} checked={set.screens[key]} onChange={v=>update({screens:{...set.screens,[key]:v}})}>{t}</Toggle>)}<Toggle checked={set.abilityOn} onChange={v=>update({abilityOn:v})}>特性触发 / 威吓入场</Toggle></div><p>能力等级填写额外强化；开启威吓入场时，引擎自动计算攻击降低。</p></div>}</section>
}

function DamageResult({result,attacker,defender,incoming,active,onClick}){
 const good=result.ko===0;const bad=result.ko>=1-1e-9;const status=good?'safe':bad?'danger':'risky';
 const rows=result.rolls||result.distribution.map(([n])=>n);const maxDamage=result.max||1;
 return <article className={'damage-result '+(active?'active ':'')+status}><div className="result-direction"><span className={'direction-icon '+(incoming?'opponent-icon':'mine-icon')}>{incoming?<Shield size={17}/>:<Swords size={17}/>}</span><span>{incoming?'对手攻击 · 我方承伤':'我方攻击 · 对手承伤'}</span><span className="live-label">实时</span></div><div className="matchup-label">{fullName(attacker.species)}<ChevronRight size={12}/>{fullName(defender.species)}</div><div className="result-move"><span>{tr('moves',attacker.move)}</span><Type type={result.type}/>{attacker.crit&&<small>要害</small>}</div><ConversionNote result={result}/><div className="damage-number"><strong>{pct(result.minPercent)}<span>–</span>{pct(result.maxPercent)}<small>%</small></strong><span>{result.min} – {result.max} 点伤害</span></div><div className="damage-track"><span style={{width:Math.min(result.maxPercent,100)+'%'}}/><b style={{width:Math.min(result.minPercent,100)+'%'}}/><i style={{left:Math.min(result.currentHP/result.maxHP*100,100)+'%'}}/></div><div className="track-legend"><span>0%</span><span>满 HP 的百分比</span><span>100%</span></div><div className="survival-verdict">{good?<CheckCircle2 size={21}/>:<AlertCircle size={21}/>}<div><strong>{result.label}</strong><span>{result.guard?result.guard+'触发，至少保留 1 HP':good?`命中后剩余 ${result.minRemaining}–${result.maxRemaining} HP`:bad?'当前 HP 下，所有伤害浮动均可击倒':`一击倒下概率 ${pct(result.ko*100)}%`}</span></div><b>{pct(result.survive*100)}<small>% 存活</small></b></div><button className={'detail-button '+(active?'chosen':'')} onClick={onClick}>{active?'正在查看伤害细节':'查看伤害细节'}<ChevronRight size={13}/></button></article>
}
function Details({result,attacker,defender}){
 const [tab,setTab]=useState('rolls');
 const graph=result.rolls?result.rolls.map((n,i)=>({damage:n,label:85+i,prob:1/16})):result.distribution.map(([damage,prob])=>({damage,label:damage,prob}));
 return <section className="details-panel"><div className="details-heading"><div><h3>伤害细节</h3><span>{tr('moves',attacker.move)} · {fullName(defender.species)}</span></div><div className="small-tabs"><button className={tab==='rolls'?'selected':''} onClick={()=>setTab('rolls')}>伤害分布</button><button className={tab==='formula'?'selected':''} onClick={()=>setTab('formula')}>计算条件</button></div></div>{tab==='rolls'?<><div className="roll-subtitle"><span>{result.rolls?'16 档等概率随机数':'总伤害概率分布（各次命中独立）'}</span><span><i className="legend-safe"/>存活 <i className="legend-ko"/>倒下</span></div><div className={'roll-chart '+(!result.rolls?'distribution-chart':'')}>{graph.map((r,i)=><div className={'roll-column '+(r.damage>=result.currentHP&&!result.guard?'ko':'')} key={i} title={`${r.damage} 点伤害 · 概率 ${pct(r.prob*100)}%`}><small>{graph.length<=20?r.damage:''}</small><div className="roll-bar" style={{height:Math.max(4,result.rolls?r.damage/(result.max||1)*64:r.prob/Math.max(...graph.map(x=>x.prob))*64)+'px'}}/><span>{graph.length<=20?r.label:''}</span></div>)}</div><p className="chart-note">{result.rolls?'横轴为随机数百分比，柱上数字为实际伤害。':'固定命中次数；不包含招式未命中的概率。'} 存活判断以当前 {result.currentHP} HP 为准。</p></>:<div className="condition-list"><div><span>规则</span><b>冠军 · Lv. 50 · 能力点制</b></div><div><span>承伤 HP</span><b>{result.currentHP} / {result.maxHP}</b></div><div><span>招式分类</span><b>{result.category==='Physical'?'物理':'特殊'} · {typeNames[result.type]} · 威力 {result.bp||'变化'}</b></div><div><span>原始 / 实际属性</span><b>{typeNames[result.originalType]} → {typeNames[result.type]}</b></div><div><span>特性威力 / 本系</span><b>×{result.abilityPowerMultiplier} / ×{result.stab}</b></div><div><span>天气 / 场地</span><b>{weatherText(result.weather)} / {terrainText(result.terrain)}</b></div><div><span>攻击方特性</span><b>{tr('abilities',attacker.ability)}</b></div><div><span>防守方特性</span><b>{tr('abilities',defender.ability)}</b></div><div><span>伤害描述</span><code>{result.description}</code></div></div>}</section>
}
const weatherText=w=>({Sun:'晴天',Rain:'雨天',Sand:'沙暴',Snow:'雪天',Auto:'自动（特性）'}[w]||'无天气');
const terrainText=t=>({Electric:'电气',Grassy:'青草',Misty:'薄雾',Psychic:'精神',Auto:'自动（特性）'}[t]||'无场地');
function RulesModal({onClose}){const ref=useRef();useEffect(()=>{ref.current?.focus();const h=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const els=ref.current.querySelectorAll('button,a');const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h)},[]);return <div className="modal-backdrop" onClick={onClose}><section ref={ref} tabIndex={-1} className="rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="关闭说明"><X/></button><span className="eyebrow">CALCULATION NOTES</span><h2 id="rules-title">计算规则与范围</h2><p>采用 Smogon 的冠军专用引擎（第 0 世代），固定等级 50。HP = 种族值 + 能力点 + 75；其他能力 = ⌊(种族值 + 能力点 + 20) × 性格修正⌋。每项能力点最多 32，总计最多 66。</p><p>普通与 Mega 使用独立种族值、属性和特性。妖精皮肤等特性按变更后的招式属性计算克制，附加 1.2 倍威力修正，并按变更后的属性判断本系加成；界面会显示转换和修正。Mega 形态固定携带对应 Mega 石；选择形态表示已经完成变化。引擎自动处理开启的威吓；天气和场地可自动根据双方特性确定，多个触发特性时速度更慢者后生效，速度相同请手动选择。自动天气已计入速度等级、讲究围巾与麻痹；同速或已有天气、场地和顺风影响入场顺序时请手动指定。</p><p>存活概率以招式命中为条件，包含 85–100 的 16 档伤害浮动；多段招式按所选命中次数对独立随机数求和。满 HP 的气势披带与结实在单次命中时保留 1 HP。这里评估本次攻击，不含后续回合、天气扣血、反伤和回合末回复；伤害值仍显示道具保护前的理论伤害。</p><p>数据库含引擎支持的 358 个形态和 335 个攻击招式，不作为当前赛季可用名单；招式选择不校验学习表。需要上一击伤害、蓄力次数或队伍信息的六个招式已标注为不可选择；其他特殊招式按引擎支持范围计算。比赛前建议与游戏内实数值核对。</p><div className="sources"><a href="https://github.com/smogon/damage-calc" target="_blank" rel="noreferrer">伤害引擎 · Smogon <ExternalLink size={13}/></a><a href="https://github.com/PokeAPI/pokeapi" target="_blank" rel="noreferrer">中文名称 · PokéAPI <ExternalLink size={13}/></a><a href="https://play.pokemonshowdown.com/sprites/dex/" target="_blank" rel="noreferrer">形态图像 · Pokémon Showdown <ExternalLink size={13}/></a></div><small>宝可梦为 Nintendo / Game Freak / Creatures 的商标。本工具为非官方爱好者项目。</small></section></div>}

function App(){
 const [left,setLeft]=useState(()=>defaultSet('left'));
 const [right,setRight]=useState(()=>defaultSet('right'));
 const [field,setField]=useState(defaultField);
 const [detail,setDetail]=useState('outgoing');
 const [rules,setRules]=useState(false);
 const [view,setView]=useState(()=>location.hash.startsWith('#speed')?'speed':'damage');
 useEffect(()=>{
  const navigate=()=>setView(location.hash.startsWith('#speed')?'speed':'damage');
  addEventListener('hashchange',navigate);return()=>removeEventListener('hashchange',navigate);
 },[]);
 useEffect(()=>{document.title=(view==='speed'?'速度线':'伤害计算器')+' · 冠军实验室'},[view]);
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
    const summarize=(results,set)=>results.map((r,i)=>({move:set.moveSlots[i].move,type:r.type,min:r.min,max:r.max,survive:r.survive,label:r.label,convertedBy:r.convertedBy,abilityPowerMultiplier:r.abilityPowerMultiplier,stab:r.stab}));
    return {incoming:summarize(calc.incomingAll,right),outgoing:summarize(calc.outgoingAll,left),speed:calc.speed};
   }
  },{signal:lifecycle.signal})).catch(()=>{});}catch{}
  return()=>lifecycle.abort();
 },[calc,left,right]);
 return <>
  <header className="site-header"><div className="header-inner">
   <a href="#damage" className="brand" aria-label="冠军实验室首页"><span className="brand-icon"><Swords size={21}/></span><span>冠军实验室<small>CHAMPIONS LAB</small></span><span className="brand-divider"/><span className="brand-caption">对战工具</span></a>
   <nav className="header-nav" aria-label="工具页面"><a href="#damage" className={view==='damage'?'selected':''} aria-current={view==='damage'?'page':undefined}><Swords size={16}/>伤害计算</a><a href="#speed" className={view==='speed'?'selected':''} aria-current={view==='speed'?'page':undefined}><Gauge size={16}/>速度线</a></nav>
   <div className="header-actions"><span className="version-badge">Pokémon Champions</span><button onClick={()=>setRules(true)}><Info size={16}/><span>计算说明</span></button></div>
  </div></header>
  <main>
   <div className="page-heading"><div><div className="eyebrow">{view==='speed'?'SPEED TIERS & TURN ORDER':'BATTLE DAMAGE CALCULATOR'}</div><h1>{view==='speed'?'把握速度，先手一步':'每一点耐久，都有答案'}<span>。</span></h1><p>{view==='speed'?'对照速度线，找到先手所需的每一点配速。':'四招伤害同时查看，普通与 Mega 特性分别计算。'}</p></div><div className="page-actions"><button className="subtle-button" onClick={reset}><RotateCcw size={15}/>重置</button><button className="swap-button" onClick={()=>{setLeft(right);setRight(left)}}><ArrowLeftRight size={16}/>交换双方</button></div></div>
   {view==='speed'?<SpeedPage left={left} right={right} onLeft={setLeft} onRight={setRight} field={field} onField={setField}/>:<>
    <section className="battle-settings" aria-label="对战环境"><div className="settings-title"><SlidersHorizontal size={16}/><span>对战环境</span></div><div className="battle-mode" role="group" aria-label="对战模式"><button className={field.gameType==='Singles'?'selected':''} onClick={()=>updateField({gameType:'Singles'})}>单打</button><button className={field.gameType==='Doubles'?'selected':''} onClick={()=>updateField({gameType:'Doubles'})}>双打</button></div><div className="settings-divider"/><div className="weather-control"><span>天气</span><select aria-label="天气" value={field.weather} onChange={e=>updateField({weather:e.target.value})}>{[['Auto','自动 · 特性'],['','无天气'],['Sun','晴天'],['Rain','雨天'],['Sand','沙暴'],['Snow','雪天']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></div><div className="weather-control"><span>场地</span><select aria-label="场地" value={field.terrain} onChange={e=>updateField({terrain:e.target.value})}>{[['Auto','自动 · 特性'],['','无场地'],['Electric','电气场地'],['Grassy','青草场地'],['Misty','薄雾场地'],['Psychic','精神场地']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></div><Toggle checked={field.gravity} onChange={v=>updateField({gravity:v})}>重力</Toggle><div className="rules-pill"><Shield size={13}/>50 级 · 66 能力点</div></section>
    {!calc.error&&<div className="mobile-results-summary"><a href="#battle-results"><Swords size={15}/><span>对手承伤 · 招式{left.activeMove+1}<b>{pct(calc.outgoing.minPercent)}–{pct(calc.outgoing.maxPercent)}%</b></span><strong>{calc.outgoing.label}</strong></a><a href="#battle-results"><Shield size={15}/><span>我方承伤 · 招式{right.activeMove+1}<b>{pct(calc.incoming.minPercent)}–{pct(calc.incoming.maxPercent)}%</b></span><strong>{calc.incoming.label}</strong></a></div>}
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
