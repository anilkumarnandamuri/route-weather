'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {boot,route} = require('./support/app-fixture.js');
const C = require('../core.js');

test('app boots and plans from URL while preserving the incoming URL',async()=>{
  const search='?from=37,-122&to=35.5,-119&depart=2026-10-15T09:00:45&unused=keep';
  const app=boot({search});await app.idle();
  assert.equal(app.document.querySelector('#sheet').hidden,false);
  assert.equal(app.location.search,search);
  assert.equal(app.read('state.data.depart'),new Date('2026-10-15T09:00:45').getTime());
  assert.equal(app.read('state.data.pts.at(-1).ms-state.data.depart'),route.duration*1000);
  assert.ok(app.document.querySelectorAll('.card').length>=2);
  assert.equal(app.read('running'),false);
});

test('scrub endpoints, intermediate marker, card and pin use one selection',async()=>{
  const app=boot();await app.search();
  const scrub=app.document.querySelector('#scrub');
  scrub.value='1000';scrub.fire('input');
  assert.deepEqual(Array.from(app.markers.at(-1).ll),[35.5,-119]);
  assert.equal(app.read('state.elapsed'),route.duration);
  assert.equal(app.document.querySelectorAll('.card.sel').length,1);
  assert.equal(app.document.querySelectorAll('.card').at(-1).getAttribute('aria-pressed'),'true');
  assert.match(app.document.querySelector('#scrubInfo').textContent,/rain 30%/);
  assert.match(app.markers.at(-1).tooltip,/30% rain/);
  scrub.value='500';scrub.fire('input');
  const mid=app.markers.at(-1).ll;
  assert.ok(mid[0]<37&&mid[0]>35.5);
  app.document.querySelectorAll('.card')[1].click();
  assert.equal(app.read('state.elapsed'),200);
  assert.ok(app.pan);
  app.markers.find(m=>m.handlers.click).handlers.click();
  assert.equal(app.read('state.elapsed'),200);
  assert.equal(app.document.querySelectorAll('.card')[1].getAttribute('aria-pressed'),'true');
  scrub.value='0';scrub.fire('input');
  assert.deepEqual(Array.from(app.markers.at(-1).ll),[37,-122]);
  scrub.value='500';scrub.fire('input');
  app.document.querySelector('[data-mode="temp"]').click();
  assert.equal(app.read('state.elapsed'),600);
});

test('saved trips support save, rename, reload, rerun and deletion',async()=>{
  const app=boot();await app.search();
  app.document.querySelector('#saveTrip').click();
  let lib=C.readLibrary(app.entries.get('rw-trips-v1'));
  assert.equal(lib.saved.length,1);assert.equal(lib.recent.length,1);
  const saved=app.document.querySelector('#savedTrips');
  saved.querySelectorAll('button').find(b=>b.textContent==='Rename').click();
  const editor=saved.querySelector('form');editor.querySelector('input').value='<img onerror=evil> Commute';editor.fire('submit');
  lib=C.readLibrary(app.entries.get('rw-trips-v1'));assert.equal(lib.saved[0].name,'<img onerror=evil> Commute');
  const fresh=boot({entries:app.entries});
  assert.match(fresh.document.querySelector('#savedTrips').textContent,/Commute/);
  assert.equal(fresh.document.querySelector('#savedTrips').querySelector('img'),null);
  fresh.document.querySelector('#savedTrips').querySelectorAll('button').find(b=>b.textContent==='Run').click();await fresh.idle();
  assert.equal(fresh.read('state.data.mode'),'now');
  assert.equal(fresh.requests.filter(u=>u.includes('router.project-osrm')).length,1);
  assert.equal(C.readLibrary(fresh.entries.get('rw-trips-v1')).recent.length,1);
  fresh.document.querySelector('#savedTrips').querySelectorAll('button').find(b=>b.textContent==='Delete').click();
  assert.equal(C.readLibrary(fresh.entries.get('rw-trips-v1')).saved.length,0);
  fresh.document.querySelector('#recentTrips').querySelectorAll('button').find(b=>b.textContent==='Save').click();
  assert.equal(C.readLibrary(fresh.entries.get('rw-trips-v1')).saved.length,1);
  fresh.document.querySelector('#recentTrips').querySelectorAll('button').find(b=>b.textContent==='Delete').click();
  assert.equal(C.readLibrary(fresh.entries.get('rw-trips-v1')).recent.length,0);
});

test('blocked storage does not break startup, planning, theme, or desktop width',async()=>{
  const app=boot({blocked:true,width:1280});
  await app.search();
  assert.equal(app.document.querySelector('#sheet').hidden,false);
  app.document.querySelector('#theme').click();
  app.document.querySelector('#saveTrip').click();
  assert.match(app.document.querySelector('#toast').textContent,/Could not store trips/);
  assert.equal(app.document.querySelector('#savedTrips').querySelectorAll('article').length,0);
});

test('recent timed reruns restore arrival mode, time and a fresh route request',async()=>{
  const trip={from:'37,-122',to:'35.5,-119',mode:'arrive',time:'2026-10-16T18:30'};
  const lib=C.addRecent(C.readLibrary(null),trip,'r1',1);
  const app=boot({entries:new Map([['rw-trips-v1',JSON.stringify(lib)]])});
  app.document.querySelector('#recentTrips').querySelectorAll('button').find(b=>b.textContent==='Run').click();await app.idle();
  assert.equal(app.read('T.mode'),'arrive');
  assert.equal(app.read('state.data.depart')+route.duration*1000,new Date(trip.time).getTime());
  assert.equal(app.location.search,C.serializeTrip(trip));
});


test('keyboard sheet controls reach peek, half and full without overshooting short viewports',()=>{
  const app=boot(),handle=app.document.querySelector('#handle');
  handle.fire('keydown',{key:'Home'});assert.equal(app.read('Sheet.cur'),'full');
  handle.fire('keydown',{key:'ArrowDown'});assert.equal(app.read('Sheet.cur'),'half');
  handle.fire('keydown',{key:'End'});assert.equal(app.read('Sheet.cur'),'peek');
  handle.fire('keydown',{key:'ArrowUp'});assert.equal(app.read('Sheet.cur'),'half');
  app.document.querySelector('#panel').offsetHeight=60;
  handle.fire('keydown',{key:'Home'});
  assert.equal(app.document.documentElement.style['--sheet-h'],'60px');
  handle.fire('keydown',{key:'ArrowDown'});
  assert.equal(app.document.documentElement.style['--sheet-h'],'60px');
});

test('corrupt library data is ignored and planning works without secure-context UUIDs',async()=>{
  const app=boot({entries:new Map([['rw-trips-v1','not json']])});
  app.ctx.crypto=undefined;await app.search();
  app.document.querySelector('#saveTrip').click();
  const lib=C.readLibrary(app.entries.get('rw-trips-v1'));
  assert.equal(lib.saved.length,1);assert.equal(typeof lib.saved[0].id,'string');
});

test('failed data services restore controls and never record a successful search',async()=>{
  for(const options of [{failRouting:true},{failWeather:true}]){
    const app=boot(options);await app.search();
    assert.equal(app.document.querySelector('#go').disabled,false);
    assert.equal(app.document.querySelector('#loader').hidden,true);
    assert.equal(app.document.querySelector('#saveTrip').disabled,true);
    assert.equal(C.readLibrary(app.entries.get('rw-trips-v1')).recent.length,0);
    assert.equal(app.read('state.data'),null);
    assert.match(app.document.querySelector('#toast').textContent,/unavailable/);
  }
});

test('a second submit while planning cannot interleave a competing route',async()=>{
  const app=boot();
  app.document.querySelector('#from').value='37,-122';app.document.querySelector('#to').value='35.5,-119';
  app.document.querySelector('#form').fire('submit');
  app.document.querySelector('#form').fire('submit');
  await app.idle();
  assert.equal(app.requests.filter(u=>u.includes('router.project-osrm')).length,1);
  assert.equal(C.readLibrary(app.entries.get('rw-trips-v1')).recent.length,1);
});


test('full-sheet scrolling preserves map zoom when no useful map viewport remains',async()=>{
  const app=boot();await app.search();app.flushTimers(430);
  assert.equal(app.fits.length,1);
  app.read("Sheet.snap('full')");app.flushTimers(430);
  assert.equal(app.fits.length,1);
  app.read("Sheet.snap('half')");app.flushTimers(430);
  assert.equal(app.fits.length,2);
  for(const fit of app.fits)assert.ok(844-fit.paddingTopLeft[1]-fit.paddingBottomRight[1]>=120);
});


test('pointer focus keeps the scrubber stationary while text and keyboard focus expand the sheet',()=>{
  const app=boot(),panel=app.document.querySelector('#panel'),scrub=app.document.querySelector('#scrub');
  panel.fire('focusin',{target:scrub});assert.equal(app.read('Sheet.cur'),'half');
  panel.fire('focusin',{target:app.document.querySelector('#saveTrip')});assert.equal(app.read('Sheet.cur'),'half');
  scrub.focusVisible=true;
  panel.fire('focusin',{target:scrub});assert.equal(app.read('Sheet.cur'),'full');
  app.read("Sheet.snap('half')");
  panel.fire('focusin',{target:app.document.querySelector('#from')});assert.equal(app.read('Sheet.cur'),'full');
});
