import React,{useState,useRef,useEffect} from 'react';
import {ChevronDown,Search,Check} from 'lucide-react';
import {typeNames} from './data.js';

export function Type({type}){return <span className={'type type-'+type}>{typeNames[type]||type}</span>}
export function Picker({value,options,onChange,label,compact=false,renderExtra}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);const root=useRef(),input=useRef();
 const selected=options.find(x=>x.value===value);
 const filtered=options.filter(x=>(x.label+' '+x.sub+' '+x.value).toLowerCase().includes(query.toLowerCase().trim()));
 useEffect(()=>{if(open){input.current?.focus();function click(e){if(!root.current?.contains(e.target))setOpen(false)}document.addEventListener('pointerdown',click);return()=>document.removeEventListener('pointerdown',click)}},[open]);
 const choose=x=>{if(x.unsupported)return;onChange(x.value);setOpen(false);setQuery('');setActive(0)};
 return <div className={'picker '+(compact?'compact':'')} ref={root}><button type="button" className="picker-trigger" aria-label={label} aria-expanded={open} aria-haspopup="listbox" onClick={()=>{setOpen(!open);setQuery('');setActive(0)}}><span>{selected?.label||value||'请选择'}</span><ChevronDown size={16}/></button>{open&&<div className="picker-popover"><div className="picker-search"><Search size={16}/><input ref={input} aria-label={'搜索'+label} placeholder="搜索中文 / English" value={query} onChange={e=>{setQuery(e.target.value);setActive(0)}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);if(e.key==='ArrowDown'){e.preventDefault();setActive(Math.min(active+1,filtered.length-1))}if(e.key==='ArrowUp'){e.preventDefault();setActive(Math.max(active-1,0))}if(e.key==='Enter'&&filtered[active]){e.preventDefault();choose(filtered[active])}}}/></div><div className="picker-options" role="listbox" aria-label={label}>{filtered.map((x,i)=><button type="button" role="option" disabled={x.unsupported} aria-selected={value===x.value} className={'picker-option '+(i===active?'focused':'')} key={x.value} onClick={()=>choose(x)} onMouseEnter={()=>setActive(i)}><span><strong>{x.label}</strong><small>{x.sub}{x.unsupported?' · 需要额外对战信息':''}</small></span>{renderExtra?renderExtra(x):value===x.value?<Check size={15}/>:null}</button>)}{!filtered.length&&<p className="empty-search">没有找到匹配结果</p>}</div></div>}</div>
}
export function Select({label,value,options,onChange}){return <label className="field-label"><span>{label}</span><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>}
export function Toggle({checked,onChange,children}){return <label className="toggle-label"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span className="check-box">{checked&&<Check size={12}/>}</span>{children}</label>}

