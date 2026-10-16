'use strict';
(function (root) {
  function createSheetGesture({panel, handle, peek, scroller, isDesktop, heights, visible, apply, settle, cycle}) {
    const C = root.RouteCore;
    let gesture = null, momentum = 0, suppressClick = false;
    const stop = () => { cancelAnimationFrame(momentum); momentum = 0; };
    function release(g) {
      if (panel.hasPointerCapture(g.id)) panel.releasePointerCapture(g.id);
    }
    function coast(speed) {
      let last = performance.now();
      function frame(now) {
        const dt = Math.min(32, now-last);
        last = now;
        const max = Math.max(0, scroller.scrollHeight-scroller.clientHeight);
        const before = scroller.scrollTop;
        scroller.scrollTop = C.clamp(before+speed*dt, 0, max);
        speed *= Math.exp(-dt/180);
        if (Math.abs(speed) > .02 && scroller.scrollTop > 0 && scroller.scrollTop < max) momentum = requestAnimationFrame(frame);
        else momentum = 0;
      }
      momentum = requestAnimationFrame(frame);
    }
    function cancel() {
      stop();
      if (!gesture) return;
      const g = gesture;
      gesture = null;
      release(g);
      if (g.owner !== 'pending') settle(C.snapTarget(heights(), visible(), 0));
    }
    function down(e) {
      stop();
      if (gesture) { if (e.pointerId !== gesture.id) cancel(); return; }
      if (e.isPrimary === false || e.button > 0) return;
      suppressClick = false;
      if (isDesktop() || e.target.closest('input,select,textarea,a,.scrubber')) return;
      const grip = handle.contains(e.target) || peek.contains(e.target);
      if (!grip && !scroller.contains(e.target)) return;
      gesture = {id:e.pointerId,owner:'pending',grip,x:e.clientX,y:e.clientY,lastY:e.clientY,samples:[{y:e.clientY,t:e.timeStamp}]};
    }
    function move(e) {
      const g = gesture;
      if (!g || e.pointerId !== g.id) return;
      if (g.owner === 'pending') {
        const dx = e.clientX-g.x, dy = e.clientY-g.y;
        if (Math.max(Math.abs(dx),Math.abs(dy)) < 7) return;
        if (Math.abs(dx) > Math.abs(dy)) { gesture = null; return; }
        panel.setPointerCapture(g.id);
        const rect = panel.getBoundingClientRect();
        apply(C.clamp((root.visualViewport ? root.visualViewport.height+root.visualViewport.offsetTop : innerHeight)-rect.top, heights().peek, heights().full), true);
        g.owner = 'sheet';
      }
      if (e.cancelable) e.preventDefault();
      const h = heights(), before = visible();
      const delta = e.clientY-g.lastY;
      const result = g.grip ? {height:C.clamp(before-delta,h.peek,h.full),scroll:scroller.scrollTop} :
        C.advanceGesture(before, Math.max(0,scroller.scrollTop), delta, h, Math.max(0,scroller.scrollHeight-scroller.clientHeight));
      const owner = g.grip || result.height !== before || result.height < h.full ? 'sheet' : 'scroll';
      if (owner !== g.owner) g.samples = [];
      g.owner = owner;
      apply(result.height, true);
      scroller.scrollTop = result.scroll;
      g.samples.push({y:e.clientY,t:e.timeStamp});
      g.samples = g.samples.filter(s => e.timeStamp-s.t <= 100);
      g.lastY = e.clientY;
      suppressClick = true;
    }
    function up(e) {
      const g = gesture;
      if (!g || e.pointerId !== g.id) return;
      gesture = null;
      release(g);
      if (g.owner === 'pending') { if (g.grip) cycle(); return; }
      const speed = C.velocity(g.samples,e.timeStamp);
      settle(g.owner === 'scroll' ? 'full' : C.snapTarget(heights(),visible(),speed));
      if (g.owner === 'scroll' && e.pointerType !== 'mouse' && Math.abs(speed) > .05) coast(speed);
    }
    panel.addEventListener('pointerdown',down);
    panel.addEventListener('pointermove',move,{passive:false});
    panel.addEventListener('pointerup',up);
    panel.addEventListener('pointercancel',e => { if (gesture?.id === e.pointerId) cancel(); });
    panel.addEventListener('lostpointercapture',e => { if (gesture?.id === e.pointerId) cancel(); });
    panel.addEventListener('click',e => {
      if (!suppressClick || e.detail === 0) return;
      suppressClick = false;
      e.preventDefault();
      e.stopImmediatePropagation();
    },true);
    panel.addEventListener('wheel',stop,{passive:true});
    return {cancel,stop};
  }
  root.createSheetGesture = createSheetGesture;
})(globalThis);
