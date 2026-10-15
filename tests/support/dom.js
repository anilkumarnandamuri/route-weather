'use strict';
const voids = new Set(['input','meta','link','br','hr','img']);
const decode = s => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g,(_,c)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'",nbsp:' '}[c]));
class Element {
  constructor(tag,document) {
    this.tagName=tag.toUpperCase();this.ownerDocument=document;this.children=[];this.attributes={};this.dataset={};this.style={setProperty(k,v){this[k]=v;}};
    this.listeners={};this.value='';this.hidden=false;this.disabled=false;this.scrollTop=0;this.scrollLeft=0;this.clientWidth=390;this.clientHeight=500;
    this.offsetHeight=tag==='aside'?750:tag==='div'?52:24;this.offsetWidth=104;this.offsetLeft=0;this.scrollHeight=1000;
    this.classList={contains:c=>this.className.split(/\s+/).includes(c),
      add:(...cs)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...cs])].join(' ');},
      remove:(...cs)=>{this.className=this.className.split(/\s+/).filter(c=>!cs.includes(c)).join(' ');},
      toggle:(c,force)=>{const on=force===undefined?!this.classList.contains(c):!!force;this.classList[on?'add':'remove'](c);return on;}};
  }
  set className(v){this.attributes.class=v;}
  get className(){return this.attributes.class||'';}
  get type(){return this.attributes.type||'text';}
  set type(v){this.attributes.type=v;}
  get id(){return this.attributes.id||'';}
  set id(v){this.attributes.id=v;}
  setAttribute(k,v){v=String(v);this.attributes[k]=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;if(k==='value')this.value=v;if(k==='hidden')this.hidden=true;if(k==='disabled')this.disabled=true;}
  getAttribute(k){return this.attributes[k]??null;}
  removeAttribute(k){delete this.attributes[k];}
  toggleAttribute(k,on){if(on)this.setAttribute(k,'');else this.removeAttribute(k);}
  append(...children){for(const child of children){child.parentNode=this;this.children.push(child);}}
  replaceChildren(...children){this.children=[];this._text='';this.append(...children);}
  set textContent(v){this.children=[];this._text=String(v);}
  get textContent(){return (this._text||'')+this.children.map(c=>c.textContent).join('');}
  set innerHTML(v){this._html=v;this.replaceChildren();parse(v,this,this.ownerDocument);}
  get innerHTML(){return this._html||'';}
  matches(selector){return selector.split(',').some(s=>{
    s=s.trim();if(s===':focus-visible')return !!this.focusVisible;const attrs=[...s.matchAll(/\[([^=\]]+)(?:=['"]?([^'"\]]*)['"]?)?\]/g)];
    const plain=s.replace(/\[[^\]]+\]/g,'');
    const tag=plain.match(/^[\w-]+/),id=plain.match(/#([\w-]+)/),classes=[...plain.matchAll(/\.([\w-]+)/g)];
    return (!tag||this.tagName===tag[0].toUpperCase())&&(!id||this.id===id[1])&&classes.every(c=>this.classList.contains(c[1]))&&attrs.every(a=>this.getAttribute(a[1])!==null&&(a[2]===undefined||this.getAttribute(a[1])===a[2]));
  });}
  closest(selector){let el=this;while(el){if(el.matches(selector))return el;el=el.parentNode;}return null;}
  contains(child){while(child){if(child===this)return true;child=child.parentNode;}return false;}
  querySelectorAll(selector){
    const parts=selector.trim().split(/\s+/),last=parts.pop(),found=[];
    const visit=el=>{for(const child of el.children){if(child.matches(last)){
      let ancestor=child.parentNode,i=parts.length-1;
      while(ancestor&&i>=0){if(ancestor.matches(parts[i]))i--;ancestor=ancestor.parentNode;}
      if(i<0)found.push(child);
    }visit(child);}};visit(this);return found;
  }
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  addEventListener(name,cb){(this.listeners[name]||=[]).push(cb);}
  removeEventListener(name,cb){this.listeners[name]=(this.listeners[name]||[]).filter(f=>f!==cb);}
  fire(name,props={}){const e={type:name,target:this,currentTarget:this,preventDefault(){this.defaultPrevented=true;},...props};this['on'+name]?.(e);for(const cb of this.listeners[name]||[])cb(e);return e;}
  click(){if(!this.disabled)this.fire('click');}
  focus(){this.ownerDocument.activeElement=this;}
  blur(){this.ownerDocument.activeElement=this.ownerDocument.body;}
  scrollTo({left}){this.scrollLeft=left;}
  scrollIntoView(){this.revealed=true;}
  getBoundingClientRect(){return {top:this.id==='panel'?400:10,bottom:this.id==='panel'?1150:68,right:410};}
  setPointerCapture(id){this.capture=id;}
  hasPointerCapture(id){return this.capture===id;}
  releasePointerCapture(){this.capture=null;}
  setCustomValidity(s){this.validationMessage=s;}
  reportValidity(){}
}
function parse(html,parent,document){
  const stack=[parent];
  for(const token of html.match(/<[^>]*>|[^<]+/g)||[]){
    if(token.startsWith('<!'))continue;
    if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
    if(!token.startsWith('<')){stack.at(-1)._text=(stack.at(-1)._text||'')+decode(token);continue;}
    const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
    const el=new Element(tag,document);
    for(const a of token.slice(tag.length+1,-1).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))el.setAttribute(a[1],decode(a[2]??a[3]??a[4]??''));
    stack.at(-1).append(el);
    if(!voids.has(tag)&&!token.endsWith('/>'))stack.push(el);
  }
}
function documentFrom(html){
  const doc={createElement:tag=>new Element(tag,doc),listeners:{},addEventListener(name,cb){(this.listeners[name]||=[]).push(cb);}};
  const container=new Element('document',doc);parse(html,container,doc);
  doc.documentElement=container.querySelector('html');doc.body=container.querySelector('body');doc.activeElement=doc.body;
  doc.querySelector=s=>container.querySelector(s);doc.querySelectorAll=s=>container.querySelectorAll(s);
  return doc;
}
module.exports={documentFrom};
