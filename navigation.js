/* App-aware browser history for the installed PWA and its Android Back gesture. */
(()=>{
  let restoring=false;
  const cloneContext=value=>value?{...value,ids:Array.isArray(value.ids)?[...value.ids]:undefined}:null;
  const currentView=()=>({page,activeTag,query,editorId,currentSongId,readerContext:cloneContext(readerContext),returnPage,activeGigId});
  const putState=view=>{const depth=history.state?.stefySongbook?history.state.depth||0:0;history.pushState({stefySongbook:true,depth:depth+1,view},'',`${location.pathname}${location.search}#stefy-${depth+1}`)};
  const replaceView=view=>{const depth=history.state?.stefySongbook?history.state.depth||0:0;history.replaceState({stefySongbook:true,depth,view},'',`${location.pathname}${location.search}#stefy-${depth}`)};
  function restore(view){if(!view)return;restoring=true;page=view.page||'home';activeTag=view.activeTag||'';query=view.query||'';editorId=view.editorId||null;currentSongId=view.currentSongId||null;readerContext=cloneContext(view.readerContext);returnPage=view.returnPage||'home';activeGigId=view.activeGigId||null;modal=null;render();if(currentSongId&&readerContext?.gigId&&state.settings.wake)acquireWakeLock();else{releaseWakeLock();if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{})}restoring=false}
  document.addEventListener('click',event=>{
    const back=event.target.closest('[data-action="back-view"]');
    if(back){event.preventDefault();event.stopImmediatePropagation();if(history.state?.stefySongbook&&(history.state.depth||0)>0)history.back();else setPage('home');return}
    const close=event.target.closest('[data-action="close-reader"]');
    if(close){event.preventDefault();event.stopImmediatePropagation();releaseWakeLock();if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});if(history.state?.stefySongbook&&(history.state.depth||0)>0)history.back();else closeReader();return}
    const tag=event.target.closest('[data-action="tag-filter"]');
    if(tag){putState({...currentView(),page:'songs',activeTag:tag.dataset.tag||'',query:'',currentSongId:null,readerContext:null});return}
    const editReader=event.target.closest('[data-action="edit-reader-song"]');
    if(editReader){const id=currentSongId;putState({...currentView(),page:'editor',editorId:id,currentSongId:null,readerContext:null});return}
    const drawerSong=event.target.closest('[data-action="drawer-song"]');
    if(drawerSong&&currentSongId){replaceView({...currentView(),currentSongId:drawerSong.dataset.id});return}
  },true);
  window.addEventListener('popstate',event=>{if(event.state?.stefySongbook&&event.state.view)restore(event.state.view)});
  window.addEventListener('load',()=>{
    history.replaceState({stefySongbook:true,depth:0,view:currentView()},'',`${location.pathname}${location.search}#stefy-0`);
    const originalSetPage=setPage;
    setPage=function(nextPage){if(!restoring){const view={...currentView(),page:nextPage,activeTag:'',query:'',currentSongId:null,readerContext:null};putState(view)}return originalSetPage(nextPage)};
    const originalEnterSong=enterSong;
    enterSong=async function(id,context=null){const view={...currentView(),currentSongId:id,readerContext:cloneContext(context)};if(currentSongId)replaceView(view);else putState(view);return originalEnterSong(id,context)};
  });
})();
