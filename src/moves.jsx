import React from 'react';
import {Swords,Shield,Check,ChevronRight,Sparkles} from 'lucide-react';
import {Type,Picker,Toggle,Select} from './components.jsx';
import {getMoveSlots,updateMoveSlot,selectMoveSlot,Move,gen} from './engine.mjs';
import {moves,moveByName,typeNames,tr} from './data.js';
const pct=n=>n.toFixed(1);

export function ConversionNote({result}){
 if(!result?.convertedBy)return null;
 return <span className="conversion-note"><Sparkles size={12}/>{tr('abilities',result.convertedBy)}{result.abilityPowerMultiplier>1?` · 威力 ×${result.abilityPowerMultiplier}`:''}{result.stab>1?` · 本系 ×${result.stab}`:''}</span>;
}
export function TerrainNote({result}){
 if(!result?.terrainNote)return null;
 return <span className="terrain-note"><Sparkles size={12}/>{result.terrainNote}</span>;
}

export function MovePanel({side,set,onChange,results,editOnly=false}){
 const mine=side==='left';const slots=getMoveSlots(set);
 return <div className="move-section four-moves"><div className="move-label"><Swords size={15}/><h3>招式配置</h3><span>{editOnly?'攻击 / 变化 · 四个槽位':'4 个槽位 · 同时查看'}</span></div><div className="move-slot-grid">{slots.map((slot,i)=>{
  const move=moveByName[slot.move],result=results?.[i];
  const defaultHits=new Move(gen,slot.move,{ability:set.ability,item:set.item}).hits;
  const change=patch=>onChange(updateMoveSlot(set,i,patch));
  return <div key={i} className={'move-slot '+(set.activeMove===i?'selected':'')}>
   <button className="slot-heading" onClick={()=>onChange(selectMoveSlot(set,i))} aria-label={`${mine?'我方':'对手'}招式 ${i+1} 详情`} aria-pressed={set.activeMove===i}><span className="slot-number">0{i+1}</span><span>{move?.category==='Status'?'变化':move?.category==='Physical'?'物理':'特殊'}</span>{set.activeMove===i&&<Check size={12}/>}</button>
   <Picker label={`${mine?'我方':'对手'}招式${i+1}`} compact value={slot.move} options={moves} onChange={move=>change({move,crit:false,hits:undefined})} renderExtra={x=><span className="move-option-tags">{x.category==='Status'&&<small className="status-move-badge">变化</small>}<Type type={x.type}/></span>}/>
   <div className="slot-type"><Type type={move?.type}/>{result?.type!==move?.type&&result&&<><ChevronRight size={11}/><Type type={result.type}/></>}<span>{move?.category==='Status'?<b className="status-move-caption">不计算伤害</b>:<>威力 <b>{move?.bp||'—'}</b>{result?.abilityPowerMultiplier>1&&<b> → {result.abilityBoostedBP}</b>}</>}</span></div>
   <ConversionNote result={result}/>
   <TerrainNote result={result}/>
   {!editOnly&&(move?.category==='Status'?<button className="slot-status" onClick={()=>onChange(selectMoveSlot(set,i))}>变化招式，不计算伤害</button>:<><button className="slot-damage" onClick={()=>onChange(selectMoveSlot(set,i))} aria-label={`${mine?'我方':'对手'}招式${i+1}伤害详情`}><strong>{result?`${pct(result.minPercent)}–${pct(result.maxPercent)}%`:'计算中'}</strong><span>{result?`${result.min}–${result.max} 伤害`:''}</span></button>
   <div className="slot-verdict"><span className={result?.ko===0?'safe-text':result?.ko===1?'danger-text':'risky-text'}>{result?`目标存活 ${pct(result.survive*100)}%`:''}</span><Toggle checked={slot.crit} onChange={crit=>change({crit})}>要害</Toggle></div></>)}
   {move?.multihit&&<Select label={`${mine?'我方':'对手'}招式${i+1}命中次数`} value={slot.hits||defaultHits} options={Array.from({length:typeof move.multihit==='number'?1:move.multihit[1]-move.multihit[0]+1},(_,i)=>{const n=typeof move.multihit==='number'?move.multihit:move.multihit[0]+i;return[n,n+' 次']})} onChange={v=>change({hits:Number(v)})}/>}
  </div>
 })}</div><p className="four-move-note">{editOnly?'攻击与变化招式可自由搭配，保存后可完整载入伤害计算页。':'攻击招式独立计算；变化招式保留配置，效果需手动设置。'}</p></div>;
}

export function MoveComparison({incoming,results,set,onSelect}){
 const slots=getMoveSlots(set);
 return <section className={'move-comparison '+(incoming?'incoming':'outgoing')} aria-label={incoming?'对手四招伤害总览':'我方四招伤害总览'}><div className="comparison-heading">{incoming?<Shield size={15}/>:<Swords size={15}/>}<h3>{incoming?'对手四招 · 我方承伤':'我方四招 · 对手承伤'}</h3><span>点击选择</span></div>{results.map((result,i)=><button key={i} className={'comparison-row '+(set.activeMove===i?'selected':'')} onClick={()=>onSelect(i)} aria-label={`${incoming?'对手':'我方'}招式${i+1} ${tr('moves',slots[i].move)}计算结果`} aria-pressed={set.activeMove===i}><span className="comparison-number">0{i+1}</span><span className="comparison-name">{tr('moves',slots[i].move)}<Type type={result.type}/></span>{result.isStatus?<><strong className="status-move-caption">变化招式</strong><span className="comparison-status">不计算伤害</span></>:<><strong>{pct(result.minPercent)}–{pct(result.maxPercent)}%</strong><span className={'comparison-survive '+(result.ko===0?'safe-text':result.ko===1?'danger-text':'risky-text')}>{pct(result.survive*100)}%<small>存活</small></span></>}</button>)}</section>;
}
