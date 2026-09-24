'use client';
import {FileText} from 'lucide-react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {dimensions} from '@/lib/content';
export type R=Record<string,any>;
export async function api(body?:R){const r=await fetch('/api/lab',{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});const j=await r.json() as R;if(!r.ok)throw new Error(j.error||'请求未完成，请重试。');return j;}
export function Picker({value,onChange,items,label}:{value:string;onChange:(v:string)=>void;items:string[];label:string}){return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{items.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>}
export function Tag({children,color=''}:{children:React.ReactNode;color?:string}){return <span className={`tag ${color}`}>{children}</span>}
export function Blank({text}:{text:string}){return <div className="blank"><FileText size={28}/><p>{text}</p></div>}
export function date(s:string){return s?new Date(s).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'不限时'}
export function download(name:string,text:string){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/plain;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
export const statusLabel:Record<string,string>={submitted:'待教师复核',reviewed:'已评阅',returned:'待修改'};
export function Radar({values}:{values:number[]}){const point=(i:number,r:number)=>`${150+Math.sin(i*Math.PI*2/5)*r},${130-Math.cos(i*Math.PI*2/5)*r}`;return <svg className="radar" viewBox="0 0 300 270" role="img" aria-label={dimensions.map((x,i)=>`${x} ${Math.round(values[i])}%`).join('，')}>{[25,50,75,100].map(r=><polygon key={r} points={values.map((_,i)=>point(i,r)).join(' ')} fill="none" stroke="#dae2e9"/>)}{values.map((_,i)=><line key={i} x1="150" y1="130" x2={point(i,100).split(',')[0]} y2={point(i,100).split(',')[1]} stroke="#dae2e9"/>)}<polygon points={values.map((v,i)=>point(i,v)).join(' ')} fill="#218a8533" stroke="#16827c" strokeWidth="2"/>{values.map((_,i)=><text key={i} x={point(i,123).split(',')[0]} y={point(i,123).split(',')[1]} textAnchor="middle" fontSize="12" fill="#536276">{dimensions[i]}</text>)}</svg>}

