'use strict';
(function (root) {
  function createTripLibrary({storage,notify,onRun}) {
    const C = root.RouteCore;
    const $ = s => document.querySelector(s);
    const key = 'rw-trips-v1';
    let library = C.readLibrary(storage.get(key)), current = null;
    const id = () => root.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    function commit(next) {
      if (!storage.set(key,JSON.stringify(next))) {
        notify('Could not store trips. Browser storage may be blocked or full.');
        return false;
      }
      library = next;
      render();
      return true;
    }
    function save(trip) {
      if (!trip) return;
      if (library.saved.length >= 30) { notify('You have 30 saved trips. Delete one before saving another.'); return; }
      const record = {...trip,id:id(),name:`${trip.from} → ${trip.to}`.slice(0,120),updatedAt:Date.now()};
      if (commit({...library,saved:[record,...library.saved]})) notify('Trip saved');
    }
    function button(text,action,record) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = text;
      b.setAttribute('aria-label',`${text} ${record.name}`);
      b.onclick = action;
      return b;
    }
    function row(record,saved) {
      const el = document.createElement('article');el.className = 'trip-item';
      const name = document.createElement('b');name.className = 'trip-title';name.textContent = record.name;el.append(name);
      const route = document.createElement('p');route.textContent = `${record.from} → ${record.to}`;el.append(route);
      const timing = document.createElement('p');
      timing.textContent = record.mode === 'now' ? 'Leave now when re-run' : `${record.mode === 'arrive' ? 'Arrive by' : 'Depart at'} ${new Date(record.time).toLocaleString()}`;
      el.append(timing);
      const actions = document.createElement('div');actions.className = 'trip-actions';el.append(actions);
      actions.append(button('Run',()=>onRun({...record}),record));
      let editor;
      if (saved) {
        actions.append(button('Rename',()=>{editor.hidden=false;editor.querySelector('input').focus();},record));
        editor = document.createElement('form');editor.className='trip-rename';editor.hidden=true;
        const input = document.createElement('input');input.value=record.name;input.maxLength=120;input.required=true;
        input.setAttribute('aria-label','New trip name');
        const done = document.createElement('button');done.type='submit';done.className='chip';done.textContent='Apply name';
        const cancel = button('Cancel',()=>{editor.hidden=true;input.value=record.name;},record);
        editor.append(input,done,cancel);
        editor.onsubmit = e => {
          e.preventDefault();const name=input.value.trim().slice(0,120);
          if (!name) { input.setCustomValidity('Enter a trip name.');input.reportValidity();return; }
          commit({...library,saved:library.saved.map(t=>t.id===record.id?{...t,name,updatedAt:Date.now()}:t)});
        };
        input.oninput = ()=>input.setCustomValidity('');
        el.append(editor);
      } else actions.append(button('Save',()=>save(record),record));
      actions.append(button('Delete',()=>{
        const list=saved?'saved':'recent';
        if(commit({...library,[list]:library[list].filter(t=>t.id!==record.id)}))notify(saved?'Saved trip deleted':'Recent search deleted');
      },record));
      return el;
    }
    function render() {
      for (const [selector,list,saved] of [['#savedTrips',library.saved,true],['#recentTrips',library.recent,false]]) {
        const target=$(selector);target.replaceChildren();
        if (!list.length) { const p=document.createElement('p');p.className='library-note';p.textContent=saved?'No saved trips yet.':'Successful searches appear here.';target.append(p); }
        else for (const record of list) target.append(row(record,saved));
      }
      $('#savedCount').textContent=`(${library.saved.length}/30)`;
    }
    $('#saveTrip').onclick=()=>save(current);
    render();
    return {
      remember(trip) {
        current={from:trip.from,to:trip.to,mode:trip.mode,time:trip.time};
        $('#saveTrip').disabled=false;
        commit(C.addRecent(library,current,id(),Date.now()));
      }
    };
  }
  root.createTripLibrary = createTripLibrary;
})(globalThis);
