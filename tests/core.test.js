'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');

test('URL parsing matches the original initialization contract', () => {
  const cases = [
    '', '?from=A&to=B', '?from=A&to=B&mode=now&t=2026-10-15T09:00',
    '?depart=2026-10-15T09:00', '?t=2026-10-15T09:00',
    '?mode=arrive&t=2026-10-15T09:00', '?mode=depart&t=bad&depart=2026-10-15T09:00',
    '?mode=arrive&t=&depart=2026-10-15T09:00', '?mode=unknown&t=2026-10-15T09:00',
    '?mode=&t=2026-10-15T09:00', '?mode=depart', '?mode=arrive&t=not-a-date',
    '?from=S%C3%A3o+Paulo%26x&to=34.05%2C-118.25&from=ignored&foo=bar',
    '?mode=depart&t=2026-10-15T09:00:59', '?from=+&to=B&t=2026-10-15T09:00', '?mode=arrive&t=2026-10-15T09:00Z'
  ];
  for (const search of cases) {
    const q = new URLSearchParams(search);
    let mode = q.get('mode'), time = q.get('t') || q.get('depart');
    if (!mode && time) mode = 'depart';
    const timed = (mode === 'depart' || mode === 'arrive') && time && !isNaN(new Date(time));
    assert.deepEqual(C.parseTrip(search), {from:q.get('from') || '',to:q.get('to') || '',mode:timed ? mode : 'now',time:timed ? time : null}, search);
  }
});

test('URL serialization stays byte compatible and round trips special characters', () => {
  for (const mode of ['now','depart','arrive']) {
    const trip = {from:'São José, CA & + /?',to:'34.05,-118.25',mode,time:mode === 'now' ? null : '2026-10-15T09:00'};
    const old = new URLSearchParams({from:trip.from,to:trip.to});
    if (mode !== 'now') { old.set('mode',mode); old.set('t',trip.time); }
    assert.equal(C.serializeTrip(trip), '?' + old);
    assert.deepEqual(C.parseTrip(C.serializeTrip(trip)),trip);
  }
});

test('sheet bounds, scroll handoff, and reversal conserve gesture distance', () => {
  const h = {peek:100,half:400,full:750};
  assert.deepEqual(C.advanceGesture(750,60,100,h,500), {height:710,scroll:0});
  assert.deepEqual(C.advanceGesture(400,0,-450,h,500), {height:750,scroll:100});
  assert.deepEqual(C.advanceGesture(100,0,2000,h,500), {height:100,scroll:0});
  assert.deepEqual(C.advanceGesture(750,450,-300,h,500), {height:750,scroll:500});
  assert.deepEqual(C.advanceGesture(710,0,-40,h,500), {height:750,scroll:0});
});

test('velocity uses recent samples and a pause cancels an old fling', () => {
  const s = [{y:500,t:0},{y:400,t:40},{y:350,t:90}];
  assert.equal(C.velocity(s,90), 150/90);
  assert.equal(C.velocity(s,250),0);
  const h = {peek:100,half:400,full:750};
  assert.equal(C.snapTarget(h,410,1),'full');
  assert.equal(C.snapTarget(h,410,-1),'half');
  assert.equal(C.snapTarget(h,120,0),'peek');
  assert.equal(C.snapTarget(h,700,0),'full');
});

test('route scrub interpolates time along geometry and clamps both endpoints', () => {
  const track = {c:[[0,0],[10,20],[30,40]],T:[0,100,400],D:[0,1000,4000]};
  assert.deepEqual(C.routePosition(track,800,0),{coordinate:[0,0],distance:0});
  const midpoint = C.routePosition(track,800,400);
  assert.equal(midpoint.distance,2000);
  assert.ok(Math.abs(midpoint.coordinate[0] - (10+20/3)) < 1e-10);
  assert.ok(Math.abs(midpoint.coordinate[1] - (20+20/3)) < 1e-10);
  assert.deepEqual(C.routePosition(track,800,900),{coordinate:[30,40],distance:4000});
  assert.deepEqual(C.routePosition(track,800,-1),{coordinate:[0,0],distance:0});
  assert.equal(C.nearestSample([{ms:1000},{ms:3000},{ms:9000}],2800),1);
});

test('library rejects corrupt storage and malformed records', () => {
  for (const raw of [null,'bad','[]','{"version":9}','{"version":1,"saved":[null,{}]}','{"version":1,"saved":[{"id":"bad","name":"bad","from":"A","to":"B","mode":"now","time":{}}]}']) {
    assert.deepEqual(C.readLibrary(raw),{version:1,saved:[],recent:[]});
  }
});

test('recent trips deduplicate, retain timing, and cap history', () => {
  let library = C.readLibrary(null);
  for (let i=0;i<12;i++) library = C.addRecent(library,{from:'A'+i,to:'B',mode:'now',time:null},String(i),i);
  assert.equal(library.recent.length,10);
  library = C.addRecent(library,{from:'A8',to:'B',mode:'now',time:null},'again',20);
  assert.equal(library.recent[0].id,'again');
  assert.equal(library.recent.filter(t => t.from === 'A8').length,1);
  assert.deepEqual(C.readLibrary(JSON.stringify(library)),library);
});
