'use strict';
const $=s=>document.querySelector(s);
const state={from:null,to:null,mode:'cond',radar:null,data:null,elapsed:0,selection:null};
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// ---------- icons (original inline SVG, gradient-filled) ----------
const G=`<defs><linearGradient id="gs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient><linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#94a3b8"/><stop offset="1" stop-color="#64748b"/></linearGradient></defs>`;
const sun=(x=32,y=32,r=10)=>`<g stroke="#fbbf24" stroke-width="3" stroke-linecap="round">${[0,45,90,135,180,225,270,315].map(a=>{const c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);return`<line x1="${x+c*(r+5)}" y1="${y+s*(r+5)}" x2="${x+c*(r+9)}" y2="${y+s*(r+9)}"/>`}).join('')}</g><circle cx="${x}" cy="${y}" r="${r}" fill="url(#gs)"/>`;
const moon=(x=30,y=28)=>`<path d="M${x+8} ${y-12}a13 13 0 1 0 10 18a10 10 0 0 1-10-18z" fill="#c7d2fe"/>`;
const cloud=(f='url(#gc)',dy=0)=>`<path transform="translate(0 ${dy})" d="M20 46h26a10 10 0 0 0 0-20a14 14 0 0 0-27-2a9 9 0 0 0 1 22z" fill="${f}"/>`;
const drops=c=>[18,28,38].map((x,i)=>`<line x1="${x+4}" y1="${50+i%2*2}" x2="${x}" y2="${58+i%2*2}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`).join('');
const flakes=()=>[20,32,44].map((x,i)=>`<circle cx="${x}" cy="${54+i%2*4}" r="2.6" fill="#e0f2fe"/>`).join('');
function icon(code,day=true){let b;
 if(code<=1)b=day?sun():moon();
 else if(code==2)b=(day?sun(24,22,8):moon(18,18))+cloud();
 else if(code==3)b=cloud('url(#gd)',-6)+cloud();
 else if(code==45||code==48)b=cloud('url(#gd)',-6)+[44,51,58].map(y=>`<line x1="14" y1="${y}" x2="50" y2="${y}" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>`).join('');
 else if((code>=71&&code<=77)||code==85||code==86)b=cloud('url(#gc)',-6)+flakes();
 else if(code>=95)b=cloud('url(#gd)',-6)+`<path d="M34 40l-8 12h7l-4 10l11-14h-7l4-8z" fill="#facc15"/>`;
 else b=cloud(code>=63||code==65||code==82?'url(#gd)':'url(#gc)',-6)+drops(code==66||code==67||code==56||code==57?'#a5f3fc':'#60a5fa');
 return `<svg viewBox="0 0 64 64" class="ic">${G}${b}</svg>`;}
const WMO={0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Showers',81:'Showers',82:'Violent showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Storm + hail',99:'Storm + hail'};
// ---------- color scales ----------
function condColor(w){const c=w.code;
 if(c>=95)return'#c084fc';if((c>=71&&c<=77)||c==85||c==86)return'#e0f2fe';if([56,57,66,67].includes(c))return'#22d3ee';
 if(c>=51||w.pp>=60)return c>=63&&c!=80?'#2563eb':'#60a5fa';if(c==45||c==48)return'#94a3b8';if(c==3)return'#a1a1aa';return'#fbbf24';}
const TS=[[-20,'#7c3aed'],[0,'#3b82f6'],[8,'#06b6d4'],[15,'#22c55e'],[22,'#eab308'],[29,'#f97316'],[36,'#ef4444'],[45,'#9f1239']];
function lerp(a,b,t){const p=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));const A=p(a),B=p(b);return'#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')}
function tempColor(t){if(t<=TS[0][0])return TS[0][1];for(let i=1;i<TS.length;i++)if(t<=TS[i][0])return lerp(TS[i-1][1],TS[i][1],(t-TS[i-1][0])/(TS[i][0]-TS[i-1][0]));return TS.at(-1)[1]}
// ---------- units ----------
const imperial=/^en-(US|LR|MM)$/.test(navigator.language)||Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('America/');
const fT=c=>imperial?Math.round(c*9/5+32)+'°':Math.round(c)+'°';
const fW=k=>imperial?Math.round(k/1.609)+' mph':Math.round(k)+' km/h';
const fD=m=>imperial?Math.round(m/1609)+' mi':Math.round(m/1000)+' km';
const fDur=s=>{const h=Math.floor(s/3600),m=Math.round(s%3600/60);return h?`${h} h ${m} min`:`${m} min`};
const fTime=(ms,tz)=>new Date(ms).toLocaleTimeString([], {hour:'numeric',minute:'2-digit',timeZone:tz});
const fDay=(ms,tz)=>new Date(ms).toLocaleDateString([], {weekday:'short',timeZone:tz});
// ---------- map ----------
const map=L.map('map',{zoomControl:false,zoomSnap:0.25,attributionControl:true,preferCanvas:false}).setView([39,-98],4);
let base;function setBase(){if(base)map.removeLayer(base);const dark=!document.documentElement.classList.contains('light');
 base=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,className:dark?'tiles-dark':'tiles-light',attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);base.bringToBack();}
const storage={get(key){try{return localStorage.getItem(key)}catch{return null}},set(key,value){try{localStorage.setItem(key,value);return true}catch{return false}}};
const savedTheme=storage.get('rw-theme');if(savedTheme==='light'||(!savedTheme&&matchMedia('(prefers-color-scheme: light)').matches))document.documentElement.classList.add('light');
setBase();
$('#theme').onclick=()=>{document.documentElement.classList.toggle('light');storage.set('rw-theme',document.documentElement.classList.contains('light')?'light':'dark');setBase()};
const routeLayer=L.layerGroup().addTo(map),pinLayer=L.layerGroup().addTo(map),selectionLayer=L.layerGroup().addTo(map);
let selectionMarker;
// ---------- ui helpers ----------
function toast(m,ms=3500){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),ms)}
function loading(m){$('#loader').hidden=!m;if(m)$('#loadmsg').textContent=m}
async function getJSON(url,opt={},tries=2){for(let i=0;i<tries;i++){try{const ctl=new AbortController();const h=setTimeout(()=>ctl.abort(),15000);const r=await fetch(url,{...opt,signal:ctl.signal});clearTimeout(h);if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}catch(e){if(i==tries-1)throw e;await new Promise(r=>setTimeout(r,800))}}}
// ---------- geocoding ----------
const label=r=>[r.name,r.admin1,r.country_code].filter(Boolean).join(', ');
async function omGeo(q,n=5){const name=q.split(',')[0].trim();const hint=q.split(',').slice(1).join(' ').trim().toLowerCase();
 const j=await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=${hint?20:n}&language=en&format=json`);let r=j.results||[];
 if(hint){const ab={al:'alabama',ak:'alaska',az:'arizona',ar:'arkansas',ca:'california',co:'colorado',ct:'connecticut',de:'delaware',fl:'florida',ga:'georgia',hi:'hawaii',id:'idaho',il:'illinois',in:'indiana',ia:'iowa',ks:'kansas',ky:'kentucky',la:'louisiana',me:'maine',md:'maryland',ma:'massachusetts',mi:'michigan',mn:'minnesota',ms:'mississippi',mo:'missouri',mt:'montana',ne:'nebraska',nv:'nevada',nh:'new hampshire',nj:'new jersey',nm:'new mexico',ny:'new york',nc:'north carolina',nd:'north dakota',oh:'ohio',ok:'oklahoma',or:'oregon',pa:'pennsylvania',ri:'rhode island',sc:'south carolina',sd:'south dakota',tn:'tennessee',tx:'texas',ut:'utah',vt:'vermont',va:'virginia',wa:'washington',wv:'west virginia',wi:'wisconsin',wy:'wyoming',dc:'district of columbia'};
  const h=ab[hint]||hint;const f=r.filter(x=>[x.admin1,x.country,x.country_code].some(v=>v&&v.toLowerCase().includes(h)));if(f.length)r=f}
 return r.slice(0,n).map(x=>({lat:x.latitude,lon:x.longitude,name:label(x),short:x.name}))}
async function nominatim(q){const j=await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,{headers:{'Accept-Language':'en'}});
 return j[0]?{lat:+j[0].lat,lon:+j[0].lon,name:j[0].display_name.split(',').slice(0,3).join(','),short:j[0].name||q.split(',')[0]}:null}
async function resolve(q){const m=q.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);if(m)return{lat:+m[1],lon:+m[3],name:q,short:q};
 let r=(await omGeo(q,1).catch(()=>[]))[0];if(!r)r=await nominatim(q).catch(()=>null);return r}
function setupSuggest(id){const inp=$('#'+id),ul=inp.parentNode.querySelector('.sugg');let t,items=[],act=-1;
 inp.addEventListener('input',()=>{state[id]=null;clearTimeout(t);const q=inp.value.trim();if(q.length<3){ul.classList.remove('show');return}
  t=setTimeout(async()=>{items=await omGeo(q).catch(()=>[]);act=-1;ul.innerHTML=items.map((x,i)=>`<li data-i="${i}">${escapeHTML(x.short)} <small>${escapeHTML(x.name.slice(x.short.length+2))}</small></li>`).join('');ul.classList.toggle('show',items.length>0&&document.activeElement===inp)},350)});
 ul.addEventListener('mousedown',e=>{const li=e.target.closest('li');if(!li)return;e.preventDefault();pick(items[li.dataset.i])});
 function pick(x){state[id]=x;inp.value=x.name;ul.classList.remove('show')}
 inp.addEventListener('keydown',e=>{if(!ul.classList.contains('show'))return;if(e.key=='ArrowDown'||e.key=='ArrowUp'){e.preventDefault();act=(act+(e.key=='ArrowDown'?1:-1)+items.length)%items.length;[...ul.children].forEach((li,i)=>li.classList.toggle('act',i==act))}else if(e.key=='Enter'&&act>=0){e.preventDefault();pick(items[act])}else if(e.key=='Escape')ul.classList.remove('show')});
 inp.addEventListener('blur',()=>setTimeout(()=>ul.classList.remove('show'),150))}
setupSuggest('from');setupSuggest('to');
$('#swap').onclick=()=>{[$('#from').value,$('#to').value]=[$('#to').value,$('#from').value];[state.from,state.to]=[state.to,state.from]};
// ---------- routing ----------
async function route(a,b){const u=`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson&annotations=duration,distance&steps=true`;
 const j=await getJSON(u,{},3);if(j.code!=='Ok'||!j.routes?.length)throw new Error(j.message||'No route found');return j.routes[0]}
function hav(a,b){const R=6371e3,r=Math.PI/180,dl=(b[1]-a[1])*r,dn=(b[0]-a[0])*r;const x=Math.sin(dl/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function buildTrack(rt){const c=rt.geometry.coordinates;const dur=rt.legs.flatMap(l=>l.annotation?.duration||[]);const T=[0],D=[0];
 for(let i=1;i<c.length;i++){D.push(D[i-1]+hav(c[i-1],c[i]));T.push(T[i-1]+(dur[i-1]??hav(c[i-1],c[i])/25))}
 // road names along route
 const roads=[];let d=0;for(const s of rt.legs[0].steps){roads.push({d,name:s.ref||s.name||''});d+=s.distance}
 const total=T.at(-1);if(total>0)for(let i=0;i<T.length;i++)T[i]=T[i]/total*rt.duration;
 return{c,T,D,roads}}
function sample(tr,total){const n=Math.min(48,Math.max(8,Math.round(total/1200)));const idx=[];
 for(let k=0;k<=n;k++){const tt=tr.T.at(-1)*k/n;let i=tr.T.findIndex(v=>v>=tt);if(i<0)i=tr.T.length-1;idx.push(i)}return[...new Set(idx)]}
// ---------- weather ----------
async function weather(pts){const lat=pts.map(p=>p[1].toFixed(3)).join(','),lon=pts.map(p=>p[0].toFixed(3)).join(',');
 const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,visibility,snowfall,is_day&timeformat=unixtime&forecast_days=16&timezone=auto`;
 const j=await getJSON(u,{},3);return Array.isArray(j)?j:[j]}
function at(w,ms){const h=w.hourly,t=ms/1000;let i=0,best=1e18;for(let k=0;k<h.time.length;k++){const d=Math.abs(h.time[k]-t);if(d<best){best=d;i=k}}
 return{temp:h.temperature_2m[i],pp:h.precipitation_probability[i]??0,pr:h.precipitation[i]??0,code:h.weather_code[i],wind:h.wind_speed_10m[i],gust:h.wind_gusts_10m[i],vis:h.visibility?.[i],snow:h.snowfall?.[i]??0,day:h.is_day?.[i]!==0,tz:w.timezone,off:best>5400}}
function hazards(w){const z=[];
 if(w.code>=95)z.push('Thunderstorms');if([56,57,66,67].includes(w.code))z.push('Freezing rain/ice');
 if(w.snow>=0.5||[73,75,86].includes(w.code))z.push('Snow');if(w.code==65||w.code==82||w.pr>=7)z.push('Heavy rain');
 if(w.gust>=60)z.push('Strong gusts '+fW(w.gust));if(w.vis!=null&&w.vis<1000)z.push('Low visibility');
 if(w.temp<=0&&w.pr>0)z.push('Icy roads possible');if(w.temp>=40)z.push('Extreme heat');return z}
// ---------- render ----------
function render(){const {tr,pts,wx,rt,depart,mode}=state.data;routeLayer.clearLayers();pinLayer.clearLayers();
 const col=w=>state.mode=='temp'?tempColor(w.temp):condColor(w);
 const all=tr.c.map(p=>[p[1],p[0]]);
 L.polyline(all,{color:'#000',weight:11,opacity:.35,lineCap:'round'}).addTo(routeLayer);
 for(let k=0;k<pts.length-1;k++){const a=pts[k].i,b=pts[k+1].i;L.polyline(all.slice(a,b+1),{color:col(wx[k]),weight:6,opacity:1,lineCap:'round',lineJoin:'round',className:'seg-line'}).addTo(routeLayer)}
 const step=Math.max(1,Math.round(pts.length/(innerWidth<600?6:10)));
 pts.forEach((p,k)=>{if(k%step||k==0||k>pts.length-1-step/2)return;const w=wx[k];
  L.marker(all[p.i],{icon:L.divIcon({className:'',iconSize:[0,0],html:`<div class="wx-pin" style="transform:translate(-50%,-50%)"><div class="b">${icon(w.code,w.day)}${fT(w.temp)}</div></div>`})}).on('click',()=>focusCard(k)).addTo(pinLayer)});
 [[all[0],'#34d399'],[all.at(-1),'#f472b6']].forEach(([ll,c])=>L.marker(ll,{icon:L.divIcon({className:'',iconSize:[16,16],html:`<div class="end-pin" style="background:${c}"></div>`})}).addTo(pinLayer));
 // sheet
 const arr=depart+rt.duration*1000,tz=wx.at(-1).tz,tz0=wx[0].tz;
 $('#summary').innerHTML=`<span class="big">${fDur(rt.duration)}</span><span class="mut">${fD(rt.distance)} · ${fDay(depart,tz0)} ${fTime(depart,tz0)} → ${fDay(arr,tz)} ${fTime(arr,tz)}</span>`+(mode=='arrive'?`<div class="leave">🕑 Leave by ${fDay(depart,tz0)} ${fTime(depart,tz0)}</div>`:'');
 const bad=[];pts.forEach((p,k)=>{const h=hazards(wx[k]);if(h.length)bad.push({k,h})});
 const kinds=[...new Set(bad.flatMap(b=>b.h.map(x=>x.replace(/ \d.*$/,''))))];
 const maxPP=Math.max(...wx.map(w=>w.pp)),tmin=Math.min(...wx.map(w=>w.temp)),tmax=Math.max(...wx.map(w=>w.temp));
 $('#warnings').innerHTML=(bad.length?`<div class="warn">⚠️<div><b>${kinds.join(' · ')}</b><br>Expected near ${escapeHTML([...new Set(bad.map(b=>pts[b.k].place))].slice(0,3).join(', '))} around ${fTime(pts[bad[0].k].ms,wx[bad[0].k].tz)}. Consider adjusting departure.</div></div>`
  :`<div class="warn ok">✅<div><b>No severe weather expected</b><br>${fT(tmin)}–${fT(tmax)} · max rain chance ${maxPP}%</div></div>`)+(wx.some(w=>w.off)?`<div class="warn">ℹ️<div>Part of this trip is beyond the 16-day forecast window; nearest available hour shown.</div></div>`:'');
 $('#legend').innerHTML=state.mode=='temp'?`<div class="bar" style="background:linear-gradient(90deg,${TS.map(s=>s[1]).join(',')})"></div><div style="display:flex;justify-content:space-between;width:100%"><span>${fT(-20)}</span><span>${fT(15)}</span><span>${fT(45)}</span></div>`
  :[['#fbbf24','Clear'],['#a1a1aa','Cloudy'],['#94a3b8','Fog'],['#60a5fa','Rain'],['#2563eb','Heavy rain'],['#e0f2fe','Snow'],['#22d3ee','Ice'],['#c084fc','Storm']].map(([c,n])=>`<span><i style="background:${c}"></i>${n}</span>`).join('');
 $('#timeline').innerHTML=pts.map((p,k)=>{const w=wx[k];const h=hazards(w);
  return`<button type="button" class="card ${h.length?'bad':''}" data-k="${k}" aria-pressed="false" style="--c:${col(w)}"><span><span class="t">${fTime(p.ms,w.tz)}</span><span class="p" title="${escapeHTML(p.place)}">${escapeHTML(p.place)}</span></span>${icon(w.code,w.day)}<span><span class="tmp">${fT(w.temp)}</span><span class="p">${WMO[w.code]||''}</span></span><span class="m"><span>💧${w.pp}%</span><span>💨${fW(w.wind)}</span></span></button>`}).join('');
 document.querySelectorAll('.card').forEach(c=>c.onclick=()=>focusCard(+c.dataset.k,true));
 $('#scrubStart').textContent='Depart '+fDay(depart,tz0)+' '+fTime(depart,tz0);
 $('#scrubEnd').textContent='Arrive '+fDay(arr,tz)+' '+fTime(arr,tz);
 $('#sheet').hidden=false;$('#peek').innerHTML=`<div class="summary">${$('#summary').innerHTML}</div>`;
 selectElapsed(state.elapsed);
}
function selectElapsed(elapsed,{reveal=false,pan=false}={}){
 if(!state.data)return;
 const {tr,rt,pts,wx,depart}=state.data;
 state.elapsed=RouteCore.clamp(elapsed,0,rt.duration);
 const ms=depart+state.elapsed*1000,k=RouteCore.nearestSample(pts,ms),w=wx[k];
 const position=RouteCore.routePosition(tr,rt.duration,state.elapsed),ll=[position.coordinate[1],position.coordinate[0]];
 state.selection={...position,k,ms};
 if(!selectionMarker)selectionMarker=L.circleMarker(ll,{radius:9,color:'#fff',weight:3,fillColor:'#5b8cff',fillOpacity:1}).addTo(selectionLayer).bindTooltip('',{permanent:true,direction:'top',offset:[0,-10],className:'selection-label'});
 else selectionMarker.setLatLng(ll);
 selectionMarker.bringToFront();
 selectionMarker.setTooltipContent(`${fTime(ms,w.tz)} · ${fT(w.temp)} ${WMO[w.code]||'Unknown conditions'} · ${w.pp}% rain`);
 $('#scrub').value=rt.duration?Math.round(state.elapsed/rt.duration*1000):0;
 const text=`${fDay(ms,w.tz)} ${fTime(ms,w.tz)} (${w.tz}) · ${fD(position.distance)} · ${fT(w.temp)} ${WMO[w.code]||'Unknown conditions'} · rain ${w.pp}% · wind ${fW(w.wind)}`;
 $('#scrub').setAttribute('aria-valuetext',text);
 $('#scrubInfo').textContent=text+(w.off?' · Outside forecast window':'');
 let selected;
 document.querySelectorAll('.card').forEach(c=>{const on=+c.dataset.k===k;c.classList.toggle('sel',on);c.setAttribute('aria-pressed',on);if(on)selected=c});
 if(reveal&&selected){
  if(innerWidth<900){const list=$('#timeline');list.scrollTo({left:selected.offsetLeft-list.offsetLeft-(list.clientWidth-selected.offsetWidth)/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
  else selected.scrollIntoView({behavior:'auto',block:'nearest'});
 }
 if(pan)map.panTo(ll,{animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});
}
function focusCard(k,pan=false){if(state.data)selectElapsed((state.data.pts[k].ms-state.data.depart)/1000,{reveal:true,pan})}
$('#scrub').addEventListener('input',e=>{if(state.data)selectElapsed(state.data.rt.duration*Number(e.target.value)/1000,{reveal:true})});

// ---------- time selector ----------
const T={mode:'now',when:null};
const {isoLocal}=RouteCore;
const pad=n=>String(n).padStart(2,'0');
function roundUp(d,m=15){d=new Date(d);d.setSeconds(0,0);d.setMinutes(Math.ceil(d.getMinutes()/m)*m);return d}
function drawDays(){const base=new Date();base.setHours(0,0,0,0);let html='';
 for(let i=0;i<7;i++){const d=new Date(base);d.setDate(d.getDate()+i);const lab=i==0?'Today':i==1?'Tomorrow':d.toLocaleDateString([], {weekday:'short'});
  const on=T.when&&T.when.toDateString()==d.toDateString();html+=`<button type="button" class="day ${on?'on':''}" data-d="${i}">${lab}<small>${d.toLocaleDateString([], {month:'short',day:'numeric'})}</small></button>`}
 html+=`<button type="button" class="day" data-d="pick">📅<small>More</small></button>`;$('#days').innerHTML=html}
function syncPicker(){if(!T.when)T.when=roundUp(Date.now()+(T.mode=='arrive'?3*3600e3:0));
 $('#ptime').value=`${pad(T.when.getHours())}:${pad(T.when.getMinutes())}`;
 $('#pdate').textContent=T.when.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});drawDays()}
function setMode(m){T.mode=m;const i=['now','depart','arrive'].indexOf(m);
 document.querySelectorAll('[data-tm]').forEach(b=>b.setAttribute('aria-checked',b.dataset.tm==m));
 $('.tsel-pill').style.transform=`translateX(${i*100}%)`;$('#picker').classList.toggle('open',m!='now');if(m!='now')syncPicker()}
document.querySelectorAll('[data-tm]').forEach(b=>b.onclick=()=>setMode(b.dataset.tm));
$('#days').onclick=e=>{const b=e.target.closest('.day');if(!b)return;if(b.dataset.d=='pick'){const p=$('#pday');p.value=isoLocal(T.when).slice(0,10);p.showPicker?p.showPicker():p.click();return}
 const d=new Date();d.setDate(d.getDate()+ +b.dataset.d);T.when.setFullYear(d.getFullYear(),d.getMonth(),d.getDate());syncPicker()};
$('#pday').onchange=e=>{const [y,m,d]=e.target.value.split('-').map(Number);if(y){T.when.setFullYear(y,m-1,d);syncPicker()}};
$('#ptime').onchange=e=>{const [h,m]=e.target.value.split(':').map(Number);if(!isNaN(h)){T.when.setHours(h,m,0,0);syncPicker()}};
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{T.when=new Date(T.when.getTime()+ +b.dataset.step*60e3);syncPicker()});
// ---------- main ----------
let running=false;
const tripLibrary=createTripLibrary({storage,notify:toast,onRun:trip=>{
 if(running)return;
 $('#from').value=trip.from;$('#to').value=trip.to;state.from=null;state.to=null;
 T.when=trip.time?new Date(trip.time):null;setMode(trip.mode);run();
}});
async function run(push=true){if(running)return;const fq=$('#from').value.trim(),tq=$('#to').value.trim();if(!fq||!tq)return;
 const mode=T.mode,target=mode=='now'?Date.now():T.when.getTime();
 const trip={from:fq,to:tq,mode,time:mode==='now'?null:isoLocal(T.when)};
 running=true;$('#go').disabled=true;
 try{loading('Finding places…');const [a,b]=await Promise.all([state.from||resolve(fq),state.to||resolve(tq)]);
  if(!a)throw new Error(`Couldn't find “${fq}”`);if(!b)throw new Error(`Couldn't find “${tq}”`);state.from=a;state.to=b;
  loading('Planning route…');const rt=await route(a,b).catch(e=>{throw new Error('Routing service unavailable or no road route ('+e.message+'). Try again in a moment.')});
  const depart=mode=='arrive'?target-rt.duration*1000:target;if(mode=='arrive'&&depart<Date.now()-6e4)toast('To arrive by then you would have needed to leave earlier, so the forecast is for that past departure.',5000);
  const tr=buildTrack(rt);const ids=sample(tr,rt.duration);
  const pts=ids.map((i,k)=>{const rd=[...tr.roads].reverse().find(r=>r.d<=tr.D[i]&&r.name)?.name||'';return{i,ms:depart+tr.T[i]*1000,place:k==0?a.short:k==ids.length-1?b.short:`${fD(tr.D[i])}${rd?' · '+rd:''}`}});
  loading('Fetching forecast…');const raw=await weather(ids.map(i=>tr.c[i]));const wx=pts.map((p,k)=>at(raw[k],p.ms));
  state.data={tr,pts,wx,rt,depart,mode};state.elapsed=0;render();
  state.bounds=L.polyline(tr.c.map(p=>[p[1],p[0]])).getBounds();
  document.body.classList.add('planned');document.body.classList.remove('editing');$('#routeRow').hidden=false;$('#routeRow').setAttribute('aria-expanded','false');
  $('#routeRow .rr-txt').textContent=`${a.short} → ${b.short}`;
  if(document.activeElement&&$('#panel').contains(document.activeElement))document.activeElement.blur();
  $('#scroller').scrollTop=0;Sheet.snap('half',{fit:true});
  if(push)history.replaceState(null,'',RouteCore.serializeTrip(trip));
  tripLibrary.remember(trip);
  document.title=`${a.short} → ${b.short} · Route Weather`;
 }catch(e){console.warn(e);toast(e.message||'Something went wrong')}finally{running=false;$('#go').disabled=false;loading(false)}}
function fitPad(){const g=16;if(innerWidth>=900){const open=!document.body.classList.contains('panel-collapsed');return{paddingTopLeft:[open?$('#panel').getBoundingClientRect().right+g+24:40,open?40:90],paddingBottomRight:[40,80]}}
 const top=$('.top').getBoundingClientRect().bottom+g;return{paddingTopLeft:[30,top],paddingBottomRight:[30,Sheet.visible()+g+52]}}
function fitRoute(animate=true){if(!state.bounds)return;const padding=fitPad();
 if(innerWidth<900&&innerHeight-padding.paddingTopLeft[1]-padding.paddingBottomRight[1]<120)return;
 map.fitBounds(state.bounds,{...padding,animate,duration:.5})}
$('#form').onsubmit=e=>{e.preventDefault();run()};
$('#routeRow').onclick=()=>{const ed=document.body.classList.toggle('editing');$('#routeRow').setAttribute('aria-expanded',ed);if(ed){Sheet.snap('full');setTimeout(()=>$('#from').focus({preventScroll:true}),50)}};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('on',x==b));if(state.data)render()});
$('#share').onclick=async()=>{const url=location.href;try{if(navigator.share)await navigator.share({title:document.title,url});else{await navigator.clipboard.writeText(url);toast('Link copied')}}catch{}};
// ---------- radar ----------
$('#radarBtn').onclick=async()=>{const btn=$('#radarBtn');if(state.radar){map.removeLayer(state.radar);state.radar=null;btn.setAttribute('aria-pressed','false');return}
 try{const j=await getJSON('https://api.rainviewer.com/public/weather-maps.json');const f=j.radar.past.at(-1);
  state.radar=L.tileLayer(`${j.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,{opacity:.7,maxNativeZoom:7,maxZoom:19,attribution:'Radar © <a href="https://www.rainviewer.com/">RainViewer</a>'}).addTo(map);
  btn.setAttribute('aria-pressed','true');toast('Live radar · '+new Date(f.time*1000).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}))}catch{toast('Radar unavailable right now')}};
// ---------- bottom sheet / side panel ----------
const Sheet=(()=>{const el=$('#panel'),hd=$('#handle'),sc=$('#scroller'),root=document.documentElement,body=document.body;
 const ORDER=['peek','half','full'],mq=matchMedia('(min-width:900px)'),rm=matchMedia('(prefers-reduced-motion: reduce)');
 let cur='half',vis=0;
 function viewport(){const v=window.visualViewport;root.style.setProperty('--viewport-h',(v?.height||innerHeight)+'px');root.style.setProperty('--viewport-bottom',Math.max(0,innerHeight-(v?v.height+v.offsetTop:innerHeight))+'px')}
 viewport();
 const fullH=()=>el.offsetHeight;
 const heights=()=>{const H=fullH(),pk=el.querySelector('.peek'),pkH=Math.min(H,hd.offsetHeight+pk.offsetHeight+8);
  return{peek:pkH,half:Math.min(H,Math.max(pkH,Math.round((window.visualViewport?.height||innerHeight)*.48))),full:H}};
 function apply(px,drag){if(drag)clearTimeout(snap.t);vis=RouteCore.clamp(px,heights().peek,fullH());el.classList.toggle('dragging',!!drag);root.style.setProperty('--sheet-h',vis+'px');body.classList.toggle('sheet-drag',!!drag)}
 function snap(name,{fit=false,animate=true}={}){gesture.stop();cur=name;el.dataset.snap=name;body.classList.toggle('snap-full',name=='full'&&!mq.matches);
  if(name!='full')sc.scrollTop=0;
  hd.setAttribute('aria-label',`Resize panel. Currently ${name=='peek'?'collapsed':name=='half'?'half height':'full height'}. Press to change.`);
  el.style.transitionDuration=animate?'':'0s';
  if(mq.matches)return void(fit&&fitRoute(animate));
  el.classList.remove('dragging');apply(heights()[name]);
  if(fit||state.bounds){const d=rm.matches||!animate?0:430;clearTimeout(snap.t);snap.t=setTimeout(()=>{map.invalidateSize();fitRoute(!rm.matches)},d)}}
 function cycle(){snap(ORDER[(ORDER.indexOf(cur)+1)%3])}
 const gesture=createSheetGesture({panel:el,handle:hd,peek:el.querySelector('.peek'),scroller:sc,
  isDesktop:()=>mq.matches,heights,visible:()=>vis,apply,settle:name=>snap(name),cycle});
 hd.addEventListener('keydown',e=>{const i=ORDER.indexOf(cur);
  if(e.key=='Enter'||e.key==' '){e.preventDefault();cycle()}else if(e.key=='ArrowUp'){e.preventDefault();snap(ORDER[Math.min(2,i+1)])}
  else if(e.key=='ArrowDown'){e.preventDefault();snap(ORDER[Math.max(0,i-1)])}else if(e.key=='Home'){e.preventDefault();snap('full')}else if(e.key=='End'){e.preventDefault();snap('peek')}});
 // keyboard focus inside a collapsed sheet: bring it into view
 el.addEventListener('focusin',e=>{if(mq.matches||e.target===hd||cur==='full')return;
  const field=e.target.matches('input,textarea,select')&&e.target.type!=='range';
  if(field||e.target.matches(':focus-visible'))snap('full')});
 // ---- desktop: resizable / collapsible side panel ----
 const rz=$('#resizer'),pt=$('#panelToggle'),W=v=>Math.max(320,Math.min(Math.min(640,innerWidth-360),v));
 let pw=W(+storage.get('rw-panel-w')||400);const setW=v=>{pw=W(v);root.style.setProperty('--panel-w',pw+'px')};setW(pw);
 rz.addEventListener('pointerdown',e=>{e.preventDefault();rz.setPointerCapture(e.pointerId);body.classList.add('resizing');const x0=e.clientX,w0=pw;
  const mv=ev=>setW(w0+ev.clientX-x0),up=()=>{rz.removeEventListener('pointermove',mv);rz.removeEventListener('pointerup',up);rz.removeEventListener('pointercancel',up);body.classList.remove('resizing');storage.set('rw-panel-w',pw);fitRoute()};
  rz.addEventListener('pointermove',mv);rz.addEventListener('pointerup',up);rz.addEventListener('pointercancel',up)});
 rz.addEventListener('keydown',e=>{const d=e.key=='ArrowLeft'?-24:e.key=='ArrowRight'?24:0;if(d){e.preventDefault();setW(pw+d);storage.set('rw-panel-w',pw);clearTimeout(rz.t);rz.t=setTimeout(fitRoute,250)}});
 rz.addEventListener('dblclick',()=>{setW(400);storage.set('rw-panel-w',pw);fitRoute()});
 pt.onclick=()=>{const c=body.classList.toggle('panel-collapsed');pt.setAttribute('aria-expanded',!c);pt.setAttribute('aria-label',c?'Show panel':'Hide panel');pt.textContent=c?'☰':'⟨';
  el.toggleAttribute('inert',c);setTimeout(()=>fitRoute(),rm.matches?0:420)};
 let rt;function resize(){gesture.cancel();viewport();clearTimeout(rt);rt=setTimeout(()=>{setW(pw);snap(cur,{animate:false})},120)}
 addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize);
 addEventListener('blur',()=>gesture.cancel());document.addEventListener('visibilitychange',()=>{if(document.hidden)gesture.cancel()});
 mq.addEventListener('change',()=>{gesture.cancel();if(!mq.matches){body.classList.remove('panel-collapsed');el.removeAttribute('inert')}snap(cur)});
 return{snap,visible:()=>mq.matches?0:vis,get cur(){return cur}}})();
Sheet.snap('half',{animate:false});

// ---------- init from URL ----------
const initialTrip=RouteCore.parseTrip(location.search);
if(initialTrip.time){T.when=new Date(initialTrip.time);setMode(initialTrip.mode)}
if(initialTrip.from&&initialTrip.to){$('#from').value=initialTrip.from;$('#to').value=initialTrip.to;run(false)}
