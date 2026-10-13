/* v33 performance lists, reversible UI state, manual ordering and local fonts. */
(()=>{
  const escText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeSettings=()=>{
    for(const key of ['gigSearchById','gigScrollById','gigProgress','homeFonts'])if(!state.settings[key]||typeof state.settings[key]!=='object'||Array.isArray(state.settings[key]))state.settings[key]={};
    for(const key of ['songOrder','favoriteOrder'])if(!Array.isArray(state.settings[key]))state.settings[key]=[];
    if(typeof state.settings.performanceLocked!=='boolean')state.settings.performanceLocked=false;
    if(typeof state.settings.favoriteManual!=='boolean')state.settings.favoriteManual=false;
    if(typeof state.settings.libraryManual!=='boolean')state.settings.libraryManual=false;
  };
  const isLocked=()=>state.settings?.performanceLocked===true;
  const currentView=()=>history.state?.stefySongbook&&history.state.view?history.state.view:null;
  let pendingReturnView=null,editedSongId=null,drag=null,pressTimer=0,suppressClickUntil=0,searchSaveTimer=0,scrollSaveTimer=0,dragScrollTimer=0;

  function currentScrollSnapshot(){
    const view=currentView()||{};
    const snap={page,activeTag,query,activeGigId,windowY:window.scrollY||0};
    if(page==='gigSongs'){
      const box=$('#gigTitleList');
      snap.panelY=box?.scrollTop||0;
      if(activeGigId){safeSettings();state.settings.gigScrollById[activeGigId]=snap.panelY}
    }
    if(history.state?.stefySongbook){history.replaceState({...history.state,view:{...view,__scrollSnapshot:snap}},'',location.href)}
    return {...view,__scrollSnapshot:snap};
  }
  function restoreScroll(snapshot,focusId=null){
    if(!snapshot)return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(snapshot.page==='gigSongs'){
        const box=$('#gigTitleList');
        if(box)box.scrollTop=snapshot.panelY??state.settings.gigScrollById?.[snapshot.activeGigId]??0;
      }else window.scrollTo(0,Number(snapshot.windowY)||0);
      if(focusId){const row=document.querySelector(`[data-id="${CSS.escape(focusId)}"]`);if(row){row.classList.add('recently-edited');row.scrollIntoView({block:'center',behavior:'auto'});setTimeout(()=>row.classList.remove('recently-edited'),1800)}}
    }));
  }
  window.addEventListener('popstate',()=>{
    const snapshot=history.state?.view?.__scrollSnapshot;
    if(snapshot)restoreScroll(snapshot);
  });

  const baseRender=render;
  function activeFontPrefs(){
    safeSettings();
    const options=['current','modern','classic','handwriting','thin','stage'];
    return ['headline','subtitle','slogan'].reduce((o,key)=>{const value=state.settings.homeFonts[key];o[key]=options.includes(value)?value:'current';return o},{});
  }
  function applyHomeFonts(){
    const prefs=activeFontPrefs();
    for(const [key,font] of Object.entries(prefs)){
      const el=$(`[data-home-label="${key}"]`);if(!el)continue;
      el.classList.remove('home-font-modern','home-font-classic','home-font-handwriting','home-font-thin','home-font-stage');
      if(font!=='current')el.classList.add(`home-font-${font}`);
      el.dataset.homeFont=font;
    }
  }
  const baseSettings=settingsView;
  const fontChoices=[['current','Jelenlegi alapbetű'],['modern','Modern, vastag'],['classic','Klasszikus, elegáns'],['handwriting','Kézírásos'],['thin','Vékony, letisztult'],['stage','Díszes, színpadi']];
  settingsView=function(){
    let html=baseSettings();
    for(const key of ['headline','subtitle','slogan']){
      const select=`<label class="field home-font-picker"><span>Betűtípus</span><select class="select" data-home-font="${key}">${fontChoices.map(([id,label])=>`<option value="${id}" ${activeFontPrefs()[key]===id?'selected':''}>${label}</option>`).join('')}</select></label>`;
      const re=new RegExp(`(<input type="text" maxlength="80" data-home-text="${key}"[^>]*>)`);
      html=html.replace(re,`$1${select}`);
    }
    return html;
  };

  function gigLockControl(){
    return `<label class="performance-lock ${isLocked()?'locked':''}"><input type="checkbox" data-performance-lock ${isLocked()?'checked':''}><span class="lock-indicator">${isLocked()?'🔒':'🔓'}</span><span><strong>FELLÉPÉSI MÓD ZÁROLÁSA</strong><small>${isLocked()?'Szerkesztés és törlés letiltva':'A műsor szerkeszthető'}</small></span></label>`;
  }
  const baseGigList=gigList;
  gigList=function(){
    let html=baseGigList();
    const anchor='<div style="max-width:790px;margin-top:20px">';
    return html.replace(anchor,`${gigLockControl()}${anchor}`);
  };
  function gigSongRows(g){
    const q=String(state.settings.gigSearchById?.[g.id]||'').trim().toLocaleLowerCase('hu');
    const current=state.settings.gigProgress?.[g.id];
    const songs=(g.songIds||[]).map((id,index)=>({song:songById(id),id,index})).filter(x=>x.song&&( !q||x.song.title.toLocaleLowerCase('hu').includes(q)));
    if(!songs.length)return `<div class="empty gig-empty"><h3>${q?'Nincs találat':'Nincs dal a listában'}</h3><p>${q?'Töröld a keresést a teljes sorrend megtekintéséhez.':'Szerkeszd a listát, és adj hozzá dalokat.'}</p></div>`;
    return songs.map(({song,id,index})=>`<div class="gig-title-row ${id===current?'is-current-song':''}" role="group" data-reorder-row data-reorder-kind="gig" data-id="${escText(id)}" data-position="${index}"><span class="row-number">${index+1}.</span><button class="gig-title-open" data-action="open-gig-song" data-id="${escText(id)}">${escText(song.title)}</button>${id===current?'<span class="current-song-badge">AKTUÁLIS</span>':''}${!isLocked()&&!q?'<span class="song-reorder-handle" data-reorder-handle title="Hosszan nyomd meg, majd húzd a rendezéshez" aria-label="Dal átrendezése">⠿</span>':''}</div>`).join('');
  }
  function gigSongsView(){
    safeSettings();
    const g=gigById(activeGigId);
    if(!g){page='gigs';return baseRender()}
    const q=state.settings.gigSearchById[g.id]||'';
    return `<div class="gig-song-page"><div class="page-back"><button class="btn back-view" data-action="back-view"><span aria-hidden="true">←</span> Vissza a listákhoz</button></div><div class="eyebrow">FELLÉPÉSI LISTA</div><h1 class="gig-song-page-title">${escText(g.name)}</h1><p class="subtitle">${escText(dateLabel(g.date))} · ${g.songIds.length} dal · a mentett sorrendben</p>${gigLockControl()}${!isLocked()?`<button class="btn gig-edit-list-button" data-action="edit-gig-from-list">✎ Műsor szerkesztése</button>`:''}<label class="searchbox gig-title-search"><span>⌕</span><input id="gigTitleSearch" placeholder="Keresés ebben a fellépési listában…" value="${escText(q)}" autocomplete="off"></label><div class="gig-title-list" id="gigTitleList">${gigSongRows(g)}</div></div>`;
  }
  render=function(){
    safeSettings();
    if(isLocked()&&page==='gigEditor')page='gigSongs';
    if(page==='gigSongs'&&!currentSongId){
      document.body.className=state.settings.theme==='custom'?'':state.settings.theme;
      $('#overlay').innerHTML='';$('.topbar').style.display='flex';$('.bottom-nav').style.display='flex';
      $('#main').innerHTML=gigSongsView();
      $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='gigs'));
      applyReaderStyles();
      const id=activeGigId,box=$('#gigTitleList');if(box)box.scrollTop=state.settings.gigScrollById[id]||0;
      applyHomeFonts();return;
    }
    baseRender();
    applyHomeFonts();
    if(editedSongId&&['songs','favorites'].includes(page)){
      const edited=document.querySelector(`.song-row[data-id="${CSS.escape(editedSongId)}"]`);
      if(edited){edited.classList.add('recently-edited');setTimeout(()=>edited.classList.remove('recently-edited'),1800)}
    }
  };
  const baseSongsView=songsView;
  songsView=function(){
    let html=baseSongsView();
    const manual=`<label class="library-order-mode"><span>Lista</span><select class="select" id="libraryOrderMode"><option value="sorted" ${state.settings.libraryManual?'':'selected'}>Rendezés szerint</option><option value="manual" ${state.settings.libraryManual?'selected':''}>Kézi sorrend</option></select></label>`;
    return html.replace('<div class="toolbar">','<div class="toolbar">'+manual);
  };
  const baseFilteredSongs=filteredSongs;
  function baseOrder(ids,all){const allIds=(all||[]).map(item=>typeof item==='string'?item:item?.id).filter(Boolean),valid=new Set(allIds),seen=new Set(ids||[]);return [...(ids||[]).filter(id=>valid.has(id)),...allIds.filter(id=>!seen.has(id))]}
  function sortedByManual(list,ids){const order=baseOrder(ids,list);const rank=new Map(order.map((id,i)=>[id,i]));return list.slice().sort((a,b)=>(rank.get(a.id)??1e9)-(rank.get(b.id)??1e9)||a.title.localeCompare(b.title,'hu'))}
  filteredSongs=function(list=state.songs,q=query){
    const a=baseFilteredSongs(list,q);
    if(!String(q||'').trim()&&page==='songs'&&state.settings.libraryManual)return sortedByManual(a,state.settings.songOrder);
    if(!String(q||'').trim()&&page==='favorites'&&state.settings.favoriteManual)return sortedByManual(a,state.settings.favoriteOrder);
    return a;
  };
  favoritesView=function(){
    const a=state.settings.favoriteManual?sortedByManual(state.songs.filter(s=>s.favorite),state.settings.favoriteOrder):baseFilteredSongs(state.songs.filter(s=>s.favorite));
    return `${pageHeader('SAJÁT VÁLOGATÁS','Kedvencek',`${a.length} kedvenc dal`)}<div class="favorite-order-toolbar"><label><span>Sorrend</span><select class="select" id="favoriteOrderMode"><option value="sorted" ${state.settings.favoriteManual?'':'selected'}>Alkalmazás rendezése</option><option value="manual" ${state.settings.favoriteManual?'selected':''}>Kézi sorrend</option></select></label></div>${songRows(a)}`;
  };
  const baseSongRows=songRows;
  songRows=function(rows,options={}){
    let html=baseSongRows(rows,options);
    const manual=!html.includes('data-song-select')&&((page==='songs'&&state.settings.libraryManual&&!query)||(page==='favorites'&&state.settings.favoriteManual));
    if(manual){const kind=page==='favorites'?'favorites':'songs';html=html.replace(/<div class="song-row" data-action="open-song" data-id="([^"]+)" role="button" tabindex="0">/g,(whole,id)=>`${whole.replace(' role="button"',` data-reorder-row data-reorder-kind="${kind}" role="button"`)}<span class="song-reorder-handle" data-reorder-handle title="Hosszan nyomd meg, majd húzd a rendezéshez" aria-label="Dal átrendezése">⠿</span>`)}
    return html;
  };

  function pushView(next){
    const depth=history.state?.stefySongbook?Number(history.state.depth)||0:0;
    const view={page,activeTag,query,editorId,currentSongId:null,readerContext:null,returnPage,activeGigId,...next};
    history.pushState({stefySongbook:true,depth:depth+1,view},'',`${location.pathname}${location.search}#stefy-${depth+1}`);
    page=view.page;activeGigId=view.activeGigId||null;currentSongId=null;readerContext=null;query=view.query||'';activeTag=view.activeTag||'';modal=null;render();
  }
  function launchGig(id){
    const g=gigById(id);if(!g)return;
    safeSettings();activeGigId=id;
    state.settings.gigSearchById[id]||='';
    state.settings.gigScrollById[id]??=0;
    pushView({page:'gigSongs',activeGigId:id,currentSongId:null,readerContext:null});
    if(state.settings.wake)acquireWakeLock();
  }
  const baseEnterSong=enterSong;
  enterSong=async function(id,context=null){
    safeSettings();
    if(context?.gigId){state.settings.gigProgress[context.gigId]=id;activeGigId=context.gigId}
    const result=await baseEnterSong(id,context);
    if(pendingReturnView&&history.state?.stefySongbook){
      const h=history.state;history.replaceState({...h,view:{...h.view,returnView:pendingReturnView}},'',location.href);
    }
    pendingReturnView=null;
    return result;
  };
  function returnFromEditor(){
    const current=history.state?.view;
    const origin=current?.returnView||window.__stefyReturnView;
    if(!origin)return;
    const target={...origin,page:origin.page||'songs',currentSongId:null,readerContext:null,editorId:null};
    page=target.page;activeTag=target.activeTag||'';query=target.query||'';activeGigId=target.activeGigId||null;currentSongId=null;readerContext=null;editorId=null;
    const depth=history.state?.depth||0;
    history.replaceState({stefySongbook:true,depth,view:target},'',`${location.pathname}${location.search}#stefy-${depth}`);
    render();restoreScroll(target.__scrollSnapshot,editedSongId);window.__stefyReturnView=null;
  }
  const baseSaveSong=saveSong;
  saveSong=async function(form){
    if(isLocked()){notify('A fellépési mód zárolva van. Előbb oldd fel a szerkesztéshez.');return}
    editedSongId=editorId;
    await baseSaveSong(form);
    returnFromEditor();
  };

  function mergeVisibleOrder(fullIds,visibleIds,oldVisible){
    const next=[...fullIds],slots=[];
    for(let i=0;i<next.length;i++)if(oldVisible.includes(next[i]))slots.push(i);
    slots.forEach((slot,i)=>{if(visibleIds[i])next[slot]=visibleIds[i]});
    return next;
  }
  function reorderRows(){return [...document.querySelectorAll('[data-reorder-row],.gig-song[data-gig-song]')]}
  function beginRowDrag(handle){
    const row=handle.closest('[data-reorder-row],.gig-song[data-gig-song]');if(!row)return false;
    const kind=row.dataset.reorderKind||'gig';
    if(isLocked()||((kind==='songs'||kind==='favorites')&&!handle.closest('.song-list')))return false;
    return {row,kind,container:row.closest('#gigSongs,#gigTitleList,.song-list'),moved:false,started:false,pointerId:null};
  }
  function reorderAtPoint(d,x,y){
    const hit=document.elementFromPoint(x,y)?.closest('[data-reorder-row],.gig-song[data-gig-song]');
    if(!hit||hit===d.row||hit.parentElement!==d.container)return;
    const rect=hit.getBoundingClientRect(),after=y>rect.top+rect.height/2;
    hit.parentElement.insertBefore(d.row,after?hit.nextSibling:hit);d.moved=true;
    if(d.kind==='gig')d.container.querySelectorAll('.row-number').forEach((n,i)=>n.textContent=`${i+1}.`);
  }
  function updateDragAutoScroll(d){
    const container=d.container,style=container?getComputedStyle(container):null;
    const internal=container&&container.scrollHeight>container.clientHeight+4&&/(auto|scroll)/.test(`${style.overflowY} ${style.overflow}`);
    const rect=internal?container.getBoundingClientRect():{top:0,bottom:innerHeight};
    const edge=Math.min(72,Math.max(38,(rect.bottom-rect.top)*.12));
    const direction=d.pointerY<rect.top+edge?-1:d.pointerY>rect.bottom-edge?1:0;
    d.scrollDirection=direction;d.scrollInternal=internal;
    if(!direction){clearInterval(dragScrollTimer);dragScrollTimer=0;return}
    if(dragScrollTimer)return;
    dragScrollTimer=setInterval(()=>{
      if(!drag?.started){clearInterval(dragScrollTimer);dragScrollTimer=0;return}
      if(!drag.scrollDirection)return;
      if(drag.scrollInternal)container.scrollTop+=drag.scrollDirection*18;else window.scrollBy(0,drag.scrollDirection*18);
      reorderAtPoint(drag,drag.pointerX,drag.pointerY);
    },35);
  }
  function persistReorder(stateDrag){
    const {kind,container}=stateDrag;if(!container)return;
    const rows=[...container.querySelectorAll(kind==='gig'?'.gig-title-row[data-id],.gig-song[data-gig-song]':'.song-row[data-id]')];
    const ids=rows.map(row=>row.dataset.id||row.dataset.gigSong);
    safeSettings();
    if(kind==='gig'){
      const g=gigById(activeGigId);if(!g)return;
      if(page==='gigSongs')g.songIds=ids;
      else g.songIds=ids;
      g.updatedAt=new Date().toISOString();
    }else if(kind==='songs'){
      const all=state.songs.map(s=>s.id),old=baseOrder(state.settings.songOrder,sortedByManual(state.songs,[]).map(s=>s.id));
      state.settings.songOrder=mergeVisibleOrder(old,ids,old.filter(id=>ids.includes(id)));
      for(const id of all)if(!state.settings.songOrder.includes(id))state.settings.songOrder.push(id);
    }else if(kind==='favorites'){
      const all=state.songs.filter(s=>s.favorite).map(s=>s.id),old=baseOrder(state.settings.favoriteOrder,sortedByManual(state.songs.filter(s=>s.favorite),[]).map(s=>s.id));
      state.settings.favoriteOrder=mergeVisibleOrder(old,ids,old.filter(id=>ids.includes(id)));
      for(const id of all)if(!state.settings.favoriteOrder.includes(id))state.settings.favoriteOrder.push(id);
    }
    persist();render();
  }
  document.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('[data-reorder-handle],.gig-songs .drag-handle');if(!handle)return;
    const d=beginRowDrag(handle);if(!d)return;
    event.preventDefault();event.stopImmediatePropagation();d.pointerId=event.pointerId;drag=d;
    pressTimer=setTimeout(()=>{if(!drag)return;drag.started=true;drag.row.classList.add('reorder-dragging');document.body.classList.add('reordering')},300);
  },true);
  document.addEventListener('pointermove',event=>{
    if(!drag)return;event.stopImmediatePropagation();
    if(!drag.started){if(Math.abs(event.movementX||0)+Math.abs(event.movementY||0)>12){clearTimeout(pressTimer);drag=null}return}
    event.preventDefault();drag.pointerX=event.clientX;drag.pointerY=event.clientY;
    reorderAtPoint(drag,drag.pointerX,drag.pointerY);updateDragAutoScroll(drag);
  },true);
  document.addEventListener('pointerup',event=>{
    if(!drag)return;event.stopImmediatePropagation();clearTimeout(pressTimer);clearInterval(dragScrollTimer);dragScrollTimer=0;const d=drag;drag=null;document.body.classList.remove('reordering');
    d.row.classList.remove('reorder-dragging');
    if(d.started&&d.moved){suppressClickUntil=Date.now()+300;persistReorder(d)}
  },true);
  document.addEventListener('pointercancel',()=>{clearTimeout(pressTimer);clearInterval(dragScrollTimer);dragScrollTimer=0;drag?.row.classList.remove('reorder-dragging');drag=null;document.body.classList.remove('reordering')},true);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-reorder-handle],.gig-songs .drag-handle')){event.preventDefault();event.stopImmediatePropagation();return}
    if(Date.now()<suppressClickUntil){suppressClickUntil=0;event.preventDefault();event.stopImmediatePropagation()}
  },true);

  document.addEventListener('click',async event=>{
    const el=event.target.closest('[data-action]');if(!el)return;const action=el.dataset.action;
    if(action==='start-gig'){event.preventDefault();event.stopImmediatePropagation();launchGig(el.dataset.id);return}
    if(action==='edit-gig-from-list'){
      event.preventDefault();event.stopImmediatePropagation();if(isLocked()){notify('A fellépési mód zárolva van. Előbb oldd fel a szerkesztéshez.');return}
      const origin=currentScrollSnapshot();pushView({page:'gigEditor',activeGigId,returnView:origin});return;
    }
    if(action==='open-gig-song'&&page==='gigSongs'){
      event.preventDefault();event.stopImmediatePropagation();const id=el.dataset.id;
      const view=currentScrollSnapshot();pendingReturnView=view;window.__stefyReturnView=view;
      await enterSong(id,{gigId:activeGigId});if(state.settings.wake)await acquireWakeLock();
      if(document.documentElement.requestFullscreen)try{await document.documentElement.requestFullscreen({navigationUI:'hide'})}catch{}
      return;
    }
    if(action==='toggle-performance-lock'){
      event.preventDefault();event.stopImmediatePropagation();safeSettings();state.settings.performanceLocked=!state.settings.performanceLocked;await persist();render();notify(state.settings.performanceLocked?'Fellépési mód zárolva.':'A fellépési mód feloldva.');return;
    }
  },true);
  document.addEventListener('change',async event=>{
    if(event.target.matches('[data-performance-lock]')){
      safeSettings();state.settings.performanceLocked=event.target.checked;await persist();render();notify(state.settings.performanceLocked?'Fellépési mód zárolva.':'A fellépési mód feloldva.');return;
    }
    if(event.target.id==='libraryOrderMode'){
      safeSettings();state.settings.libraryManual=event.target.value==='manual';await persist();render();return;
    }
    if(event.target.id==='favoriteOrderMode'){
      safeSettings();state.settings.favoriteManual=event.target.value==='manual';await persist();render();return;
    }
    if(event.target.matches('[data-home-font]')){
      safeSettings();state.settings.homeFonts[event.target.dataset.homeFont]=event.target.value;applyHomeFonts();await persist();return;
    }
  },true);
  document.addEventListener('input',event=>{
    if(event.target.id==='gigTitleSearch'){
      safeSettings();const id=activeGigId,stateBox=$('#gigTitleList'),y=stateBox?.scrollTop||0;
      state.settings.gigSearchById[id]=event.target.value;const selection=[event.target.selectionStart,event.target.selectionEnd];
      const list=$('#gigTitleList');if(list)list.innerHTML=gigSongRows(gigById(id));
      const next=$('#gigTitleSearch');if(next){next.focus();next.setSelectionRange(...selection)}
      const newList=$('#gigTitleList');if(newList)newList.scrollTop=y;
      clearTimeout(searchSaveTimer);searchSaveTimer=setTimeout(()=>persist(),300);return;
    }
  },true);
  document.addEventListener('scroll',event=>{
    const box=event.target;if(box?.id!=='gigTitleList'||!activeGigId)return;
    safeSettings();state.settings.gigScrollById[activeGigId]=box.scrollTop;
    clearTimeout(scrollSaveTimer);scrollSaveTimer=setTimeout(()=>persist(),500);
  },true);

  document.addEventListener('click',event=>{
    const row=event.target.closest('.song-row[data-action="open-song"]');
    if(row&&!event.target.closest('[data-reorder-handle]')){
      pendingReturnView=currentScrollSnapshot();window.__stefyReturnView=pendingReturnView;
    }
    if(isLocked()&&event.target.closest('#quickAdd,[data-action="edit-reader-song"],[data-action="delete-song"],[data-action="edit-gig"],[data-action="delete-gig"],[data-action="duplicate-gig"],[data-action="new-gig"],[data-action="save-gig"],[data-action="add-gig-songs"],[data-action="remove-gig-song"],[data-action="move-gig-song"],[data-action="new-song"],[data-action="toggle-edit-favorite"],[data-action="import-files"],[data-action="import-folder"]')){
      event.preventDefault();event.stopImmediatePropagation();notify('A fellépési mód zárolva van. Előbb oldd fel a szerkesztéshez.');return;
    }
  },true);
  document.addEventListener('submit',event=>{if(isLocked()&&event.target.id==='songForm'){event.preventDefault();event.stopImmediatePropagation();notify('A fellépési mód zárolva van. Előbb oldd fel a szerkesztéshez.')}},true);
  const baseSaveGig=saveGig;
  saveGig=async function(){
    if(isLocked()){notify('A fellépési mód zárolva van. Előbb oldd fel a szerkesztéshez.');return}
    const origin=history.state?.view?.returnView;
    await baseSaveGig();
    if(origin){page=origin.page||'gigSongs';activeTag=origin.activeTag||'';query=origin.query||'';activeGigId=origin.activeGigId||null;currentSongId=null;readerContext=null;const depth=history.state?.depth||0;history.replaceState({stefySongbook:true,depth,view:origin},'',`${location.pathname}${location.search}#stefy-${depth}`);render();restoreScroll(origin.__scrollSnapshot)}
  };
  /* Preserve the source list and its viewport when returning from a song/editor. */
  window.addEventListener('load',()=>{
    safeSettings();
    document.body.classList.add('v33-ready');
  },{once:true});
  window.__stefyPerformanceLock=()=>isLocked();
  window.__stefyRecordListView=()=>{pendingReturnView=currentScrollSnapshot();window.__stefyReturnView=pendingReturnView;return pendingReturnView};
})();
