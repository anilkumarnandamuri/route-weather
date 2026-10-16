'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const {documentFrom} = require('./dom.js');
const route = {duration:1200,distance:300000,geometry:{coordinates:[[-122,37],[-121,36.5],[-120,36],[-119,35.5]]},legs:[{annotation:{duration:[100,300,200]},steps:[{distance:300000,name:'Fixture road',ref:'R1'}]}]};
function boot({search='',entries=new Map(),blocked=false,width=390,failWeather=false,failRouting=false}={}) {
  const document=documentFrom(fs.readFileSync('index.html','utf8'));
  const requests=[],markers=[],fits=[],warnings=[],timers=new Map();let timer=0,pan=null;
  const location={search,href:'http://localhost/'+search};
  const map={setView(){return this;},removeLayer(){},invalidateSize(){},fitBounds(bounds,options){fits.push(options);},panTo(ll){pan=ll;}};
  const layer=()=>({addTo(){return this;},clearLayers(){},bringToBack(){}});
  const marker=ll=>{const m={ll,handlers:{},addTo(){return this;},on(name,cb){this.handlers[name]=cb;return this;},setLatLng(v){this.ll=v;},bringToFront(){},bindTooltip(text){this.tooltip=text;return this;},setTooltipContent(text){this.tooltip=text;return this;}};markers.push(m);return m;};
  const storage={getItem(k){if(blocked)throw Error('blocked');return entries.get(k)??null;},setItem(k,v){if(blocked)throw Error('blocked');entries.set(k,String(v));}};
  const ctx=vm.createContext({document,console:{...console,warn:e=>warnings.push(e.message)},URLSearchParams,Date,Intl,Math,AbortController,
    innerWidth:width,innerHeight:844,localStorage:storage,crypto:require('node:crypto').webcrypto,
    location,history:{replaceState(a,b,url){location.search=url;location.href='http://localhost/'+url;}},
    navigator:{language:'en-US',clipboard:{writeText:async()=>{}}},
    matchMedia:q=>({matches:q.includes('min-width')?width>=900:false,addEventListener(){}}),
    getComputedStyle:()=>({paddingBottom:'16'}),addEventListener(){},
    setTimeout(cb,ms){if(ms===800)queueMicrotask(cb);else timers.set(++timer,{cb,ms});return timer;},clearTimeout:id=>timers.delete(id),
    requestAnimationFrame:()=>0,cancelAnimationFrame(){},performance:{now:()=>0},
    L:{map:()=>map,tileLayer:layer,layerGroup:layer,polyline:()=>({...layer(),getBounds:()=>({})}),marker,circleMarker:marker,divIcon:x=>x},
    fetch:async url=>{
      requests.push(url);let data;
      if(url.includes('router.project-osrm')){if(failRouting)throw Error('fixture offline');data={code:'Ok',routes:[route]};}
      else if(url.includes('api.open-meteo.com')){
        if(failWeather)throw Error('fixture weather unavailable');
        const count=new URL(url).searchParams.get('latitude').split(',').length;
        data=Array.from({length:count},(_,i)=>{
          const time=Array.from({length:800},(_,k)=>Math.floor(Date.now()/3600000)*3600+(k-400)*3600);
          const repeat=value=>time.map(()=>value);
          return {timezone:'America/Los_Angeles',hourly:{time,temperature_2m:repeat(10+i),precipitation_probability:repeat(i*10),precipitation:repeat(0),weather_code:repeat(i===2?61:0),wind_speed_10m:repeat(12),wind_gusts_10m:repeat(18),visibility:repeat(10000),snowfall:repeat(0),is_day:repeat(1)}};
        });
      } else if(url.includes('geocoding-api'))data={results:[{latitude:37,longitude:-122,name:'Fixture city',admin1:'CA',country_code:'US'}]};
      else throw Error('Unexpected fixture URL '+url);
      return {ok:true,json:async()=>data};
    }});
  ctx.window=ctx;
  for(const file of ['core.js','sheet.js','library.js','app.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
  return {document,ctx,entries,requests,markers,location,fits,warnings,
    flushTimers(ms){for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.cb();}},get pan(){return pan;},read:expr=>vm.runInContext(expr,ctx),
    async idle(){for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));},
    async search(from='37,-122',to='35.5,-119'){document.querySelector('#from').value=from;document.querySelector('#to').value=to;document.querySelector('#form').fire('submit');await this.idle();}};
}
module.exports={boot,route};
