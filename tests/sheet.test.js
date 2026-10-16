'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const C = require('../core.js');

function setup() {
  class Element {
    constructor() { this.listeners = {}; this.scrollTop = 0; this.scrollHeight = 900; this.clientHeight = 400; this.capture = null; }
    addEventListener(name, cb) { (this.listeners[name] ||= []).push(cb); }
    contains(el) { return el === this; }
    closest() { return null; }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
    getBoundingClientRect() { return {top:800-height}; }
    fire(type, props = {}) {
      const event = {pointerId:1,isPrimary:true,button:0,pointerType:'touch',target:scroller,clientX:100,clientY:400,timeStamp:0,cancelable:true,
        preventDefault(){ this.prevented = true; }, stopImmediatePropagation(){ this.stopped = true; }, ...props};
      for (const listener of this.listeners[type] || []) listener(event);
      return event;
    }
  }
  const panel = new Element(), handle = new Element(), peek = new Element(), scroller = new Element();
  let height = 400, snap = 'half', desktop = false, cycles = 0, clock = 0;
  const frames = new Map();
  let frameId = 0;
  const ctx = vm.createContext({RouteCore:C,innerHeight:800,performance:{now:()=>clock},
    requestAnimationFrame:cb => { frames.set(++frameId,cb); return frameId; },cancelAnimationFrame:id => frames.delete(id)});
  vm.runInContext(fs.readFileSync('sheet.js','utf8'),ctx);
  const controller = ctx.createSheetGesture({panel,handle,peek,scroller,isDesktop:()=>desktop,
    heights:()=>({peek:100,half:400,full:750}),visible:()=>height,apply:h=>{height=h;},
    settle:name=>{snap=name;height={peek:100,half:400,full:750}[name];},cycle:()=>cycles++});
  return {panel,handle,scroller,controller,get height(){return height;},get snap(){return snap;},get cycles(){return cycles;},
    set full(scroll) { height=750; snap='full'; scroller.scrollTop=scroll; },
    set desktop(value) { desktop=value; },
    frame(t) { clock=t; const ready=[...frames.values()];frames.clear();ready.forEach(cb=>cb(t)); },get frames(){return frames.size;}};
}

test('pointer capture retains a sheet drag, then releases and suppresses click', () => {
  const s = setup();
  s.panel.fire('pointerdown',{target:s.handle});
  s.panel.fire('pointermove',{target:s.handle,clientY:200,timeStamp:50});
  assert.equal(s.panel.capture,1);
  assert.equal(s.height,600);
  s.panel.fire('pointerup',{clientY:200,timeStamp:55});
  assert.equal(s.panel.capture,null);
  assert.equal(s.snap,'full');
  assert.equal(s.panel.fire('click').prevented,true);
});

test('full content consumes scroll before collapsing in the same pointer stream', () => {
  const s = setup(); s.full=60;
  s.panel.fire('pointerdown');
  s.panel.fire('pointermove',{clientY:500,timeStamp:50});
  assert.equal(s.scroller.scrollTop,0);
  assert.equal(s.height,710);
  s.panel.fire('pointermove',{clientY:460,timeStamp:80});
  assert.equal(s.height,750);
  s.panel.fire('pointermove',{clientY:400,timeStamp:100});
  assert.equal(s.height,750);
  assert.equal(s.scroller.scrollTop,60);
  s.panel.fire('pointerup',{clientY:400,timeStamp:110});
  assert.equal(s.snap,'full');
});

test('horizontal gestures and input controls never capture or resize the sheet', () => {
  const s=setup();
  s.panel.fire('pointerdown');
  s.panel.fire('pointermove',{clientX:180,clientY:402,timeStamp:30});
  assert.equal(s.panel.capture,null);
  assert.equal(s.height,400);
  s.panel.fire('pointerdown',{target:{closest:()=>true}});
  s.panel.fire('pointermove',{clientY:100,timeStamp:60});
  assert.equal(s.height,400);
});

test('cancellation and lost capture settle without stale velocity or tap cycling', () => {
  for (const kind of ['pointercancel','lostpointercapture']) {
    const s=setup();
    s.panel.fire('pointerdown',{target:s.handle});
    s.panel.fire('pointermove',{clientY:430,timeStamp:10});
    s.panel.fire(kind,{timeStamp:15});
    assert.equal(s.snap,'half');
    assert.equal(s.panel.capture,null);
    assert.equal(s.cycles,0);
    s.panel.fire('pointermove',{clientY:100,timeStamp:25});
    assert.equal(s.height,400);
  }
});

test('a pause before release discards fling velocity', () => {
  const s=setup();
  s.panel.fire('pointerdown',{target:s.handle});
  s.panel.fire('pointermove',{clientY:380,timeStamp:10});
  s.panel.fire('pointerup',{clientY:380,timeStamp:300});
  assert.equal(s.snap,'half');
});

test('multi-touch cancels cleanly, and desktop content stays native', () => {
  const s=setup();
  s.panel.fire('pointerdown');
  s.panel.fire('pointermove',{clientY:350,timeStamp:30});
  s.panel.fire('pointerdown',{pointerId:2,isPrimary:false});
  assert.equal(s.panel.capture,null);
  assert.equal(s.snap,'half');
  s.desktop=true;
  s.panel.fire('pointerdown');
  s.panel.fire('pointermove',{clientY:100,timeStamp:70});
  assert.equal(s.height,400);
});

test('touch scrolling has bounded momentum and a new gesture stops it', () => {
  const s=setup();s.full=50;
  s.panel.fire('pointerdown');
  s.panel.fire('pointermove',{clientY:370,timeStamp:10});
  s.panel.fire('pointermove',{clientY:340,timeStamp:40});
  s.panel.fire('pointerup',{timeStamp:45});
  assert.equal(s.frames,1);
  s.frame(16);
  assert.ok(s.scroller.scrollTop>110);
  s.panel.fire('pointerdown');
  assert.equal(s.frames,0);
  assert.equal(s.snap,'full');
});


test('dragging the grip upward at full height cannot start content momentum',()=>{
  const s=setup();s.full=0;
  s.panel.fire('pointerdown',{target:s.handle});
  s.panel.fire('pointermove',{target:s.handle,clientY:370,timeStamp:10});
  s.panel.fire('pointermove',{target:s.handle,clientY:340,timeStamp:40});
  s.panel.fire('pointerup',{target:s.handle,timeStamp:45});
  s.frame(16);
  assert.equal(s.scroller.scrollTop,0);
  assert.equal(s.frames,0);
  assert.equal(s.snap,'full');
});

test('a cancelled drag never consumes the next tap on an excluded control or desktop',()=>{
  for(const desktop of [false,true]){
    const s=setup();
    s.panel.fire('pointerdown');
    s.panel.fire('pointermove',{clientY:370,timeStamp:10});
    s.panel.fire('pointercancel',{timeStamp:15});
    s.desktop=desktop;
    const input={closest:()=>true};
    s.panel.fire('pointerdown',{target:input,timeStamp:30});
    s.panel.fire('pointerup',{target:input,timeStamp:40});
    assert.notEqual(s.panel.fire('click',{target:input}).prevented,true);
  }
});
