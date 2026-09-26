/* Focused UI additions: stage home, bulk TXT import and multi-song organization. */
(()=>{
let selectionMode=false;
const selectedSongIds=new Set();
const baseHomeView=homeView;
homeView=function(){
  const custom=state.settings.theme==='custom'&&state.settings.background;
  const bg=custom?`url("${esc(state.settings.background)}")`:`url('stage-default.png')`;
  return `<section class="home-stage ${custom?'has-photo':''}" style="--home-image:${bg};--home-brightness:${state.settings.brightness??1};--home-scrim:${state.settings.overlay??.55}"><div class="home-spotlight home-spotlight-blue"></div><div class="home-spotlight home-spotlight-red"></div><div class="home-spotlight home-spotlight-gold"></div><div class="home-vinyl" aria-hidden="true"><span>♫</span></div><div class="home-wordmark"><span class="home-stefy">STEFY-BAND</span><span class="home-title">DALSZÖVEGEK</span><span class="home-tagline">Mindig veled a színpadon.</span></div><div class="home-stage-line" aria-hidden="true"></div></section>`;
};
const baseRender=render;
render=function(){baseRender();const splash=!currentSongId&&page==='home';document.body.classList.toggle('splash-page',splash);if(!currentSongId){$('.topbar').style.display=splash?'none':'flex';$('.bottom-nav').style.display='flex'}};
const basePageHeader=pageHeader;
pageHeader=function(...args){return `<div class="page-back"><button class="btn ghost back-view" data-action="back-view">← Vissza</button></div>${basePageHeader(...args)}`};
const baseSongsView=songsView;
const baseSongRowsWithSelection=songRows;
songRows=function(rows,options={}){
  let html=baseSongRowsWithSelection(rows,options);
  if(page==='songs'&&selectionMode&&!options.remove)html=html.replace(/<div class="song-row" data-action="open-song" data-id="([^"]+)" role="button" tabindex="0">/g,(whole,id)=>`${whole}<input class="song-select" type="checkbox" aria-label="Dal kijelölése" data-song-select="${id}" ${selectedSongIds.has(id)?'checked':''}>`);
  return html;
};
function bulkBar(){
  const tags=state.tags.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
  return `<div class="bulk-bar" id="bulkBar"><strong><span id="bulkCount">${selectedSongIds.size}</span> kijelölve</strong><button class="btn ghost" data-action="bulk-select-visible">Láthatók kijelölése</button><select id="bulkTagSelect" aria-label="Címke hozzáadása"><option value="">Címke hozzáadása…</option>${tags}</select><button class="btn" data-action="bulk-apply-tag">Hozzáadás</button><button class="btn danger" data-action="bulk-delete">Törlés</button><button class="btn ghost" data-action="bulk-clear">Kijelölés törlése</button></div>`;
}
function importTools(){
  const directoryProbe=document.createElement('input');directoryProbe.type='file';
  const folderPicker=typeof window.showDirectoryPicker==='function'||'webkitdirectory'in directoryProbe;
  return `<div class="library-shortcuts"><button class="btn ghost" data-action="page" data-page="favorites">⭐ Kedvencek</button><button class="btn ghost" data-action="page" data-page="recent">🕐 Legutóbbiak</button><button class="btn ghost" data-action="page" data-page="tags">🏷️ Címkék</button></div><div class="import-tools">${folderPicker?'<label class="btn import-btn" for="folderTextFiles" data-action="import-folder">📁 Mappa importálása</label>':''}<button class="btn import-btn" data-action="import-files">📄 Fájlok tömeges importálása</button><button class="btn" data-action="toggle-selection">☑ Több dal kijelölése${selectionMode?' ✓':''}</button><input type="file" id="bulkTextFiles" accept=".txt,text/plain" multiple hidden><input type="file" id="folderTextFiles" accept=".txt,text/plain" webkitdirectory directory multiple hidden><span class="import-note">${folderPicker?'TXT-fájlokat és almappákat is beolvas.':'Mappaválasztó nem érhető el ebben a böngészőben; jelölj ki egyszerre több TXT-fájlt.'}</span></div>`;
}
songsView=function(){
  let html=baseSongsView();
  html=html.replace('<div class="toolbar">',`${importTools()}<div class="toolbar">`);
  if(selectionMode)html=html.replace('<div class="song-list">',`${bulkBar()}<div class="song-list">`);
  return html;
};
const baseRenderReader=renderReader;
renderReader=function(){baseRenderReader();if(currentSongId&&!readerContext?.gigId){const b=$('.reader-close');if(b){b.textContent='← Vissza';b.setAttribute('aria-label','Vissza')}}};

function updateBulkCount(){const el=$('#bulkCount');if(el)el.textContent=String(selectedSongIds.size)}
function textTitle(name){return String(name||'').replace(/\\/g,'/').split('/').pop().replace(/\.txt$/i,'').replace(/\s+/g,' ').trim().slice(0,180)}
function normalizedTitle(name){return String(name||'').normalize('NFC').trim().toLocaleLowerCase('hu')}
async function readTxtFile(file){
  const bytes=await file.arrayBuffer();let text=new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/,'');
  if(text.includes('\uFFFD')){try{const legacy=new TextDecoder('windows-1250').decode(bytes).replace(/^\uFEFF/,'');if((legacy.match(/\uFFFD/g)||[]).length<(text.match(/\uFFFD/g)||[]).length)text=legacy}catch{}}
  if(!text.trim())throw Error('empty');
  const controls=(text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g)||[]).length;if(controls/Math.max(text.length,1)>.01)throw Error('binary');
  return text.replace(/\r\n?/g,'\n').trim();
}
async function collectDirectory(handle,files=[],depth=0){
  if(depth>24)throw Error('depth');
  for await(const entry of handle.values()){
    if(entry.kind==='file'){try{files.push(await entry.getFile())}catch{files.push({name:entry.name,__readError:true})}}
    else if(entry.kind==='directory')await collectDirectory(entry,files,depth+1);
    if(files.length>=10000)break;
  }
  return files;
}
async function importTextBatch(files){
  let skipped=0,invalid=0,existed=0,readBytes=0;const candidates=[],seen=new Set(state.songs.map(s=>normalizedTitle(s.title))),limit=Math.min(files.length,10000);
  skipped+=Math.max(0,files.length-limit);
  for(const file of Array.from(files).slice(0,limit)){
    if(file.__readError){invalid++;continue}
    if(!/\.txt$/i.test(file.name||'')){skipped++;continue}
    const title=textTitle(file.name);
    if(!title||title.length<1||file.size>2*1024*1024){invalid++;continue}
    if(readBytes+file.size>50*1024*1024){skipped++;continue}
    let lyrics;try{lyrics=await readTxtFile(file)}catch{invalid++;continue}
    readBytes+=file.size;
    const key=normalizedTitle(title);
    if(seen.has(key)){existed++;continue}
    seen.add(key);candidates.push({id:uid(),title,artist:'',lyrics,tags:[],favorite:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastOpened:null});
  }
  modal={type:'textImportPreview',title:'TXT-dalok importálása',candidates,stats:{input:limit,added:candidates.length,existed,skipped,invalid}};renderModal();
}
async function beginFolderImport(){
  if(typeof window.showDirectoryPicker==='function'){
    try{const handle=await window.showDirectoryPicker({mode:'read'});notify('A mappa fájljainak feldolgozása…');await importTextBatch(await collectDirectory(handle))}catch(error){if(error?.name!=='AbortError')notify('A mappát nem sikerült beolvasni. Próbáld meg a fájlok tömeges importálását.')}return;
  }
  const folderInput=$('#folderTextFiles');if(folderInput&&'webkitdirectory'in folderInput)folderInput.click();
}
async function commitTextImport(){
  const preview=modal;if(!preview||preview.type!=='textImportPreview')return;
  const tag=state.tags.find(t=>normalizedTitle(t)==='importált dalok')||'Importált dalok';if(preview.candidates.length&&!state.tags.includes(tag))state.tags.push(tag);
  const existing=new Set(state.songs.map(s=>normalizedTitle(s.title)));let added=0,existedNow=0;
  for(const candidate of preview.candidates){const key=normalizedTitle(candidate.title);if(existing.has(key)){existedNow++;continue}candidate.tags=[tag];state.songs.push(candidate);existing.add(key);added++}
  const stats={...preview.stats,added,existed:preview.stats.existed+existedNow};modal=null;await persist();render();notify(`Importálva: ${stats.added} · már létezett: ${stats.existed} · kihagyva: ${stats.skipped} · hibás: ${stats.invalid}`);
}

const baseRenderModal=renderModal;
renderModal=function(){
  if(modal?.type==='textImportPreview'){
    const s=modal.stats;
    $('#overlay').innerHTML=`<div class="modal-backdrop" data-action="backdrop"><section class="modal"><div class="section-head"><h3>${esc(modal.title)}</h3><button class="btn ghost" data-action="cancel-text-import">×</button></div><p>TXT-fájlok átnézve. A dalcím a fájlnévből készül; az új dalok az <strong>Importált dalok</strong> címkét kapják.</p><div class="import-summary"><div><b>${s.added}</b><span>importálható</span></div><div><b>${s.existed}</b><span>már létezik / címütközés</span></div><div><b>${s.skipped}</b><span>nem támogatott vagy méretkorlát</span></div><div><b>${s.invalid}</b><span>üres, hibás vagy nem olvasható</span></div></div>${modal.candidates.length?`<div class="import-preview-list">${modal.candidates.slice(0,8).map(x=>`<span>${esc(x.title)}</span>`).join('')}${modal.candidates.length>8?`<span>… és még ${modal.candidates.length-8} dal</span>`:''}</div>`:''}<div class="modal-actions"><button class="btn" data-action="cancel-text-import">Mégsem</button><button class="btn primary" data-action="confirm-text-import" ${s.added?'':'disabled'}>Importálás (${s.added})</button></div></section></div>`;return;
  }
  baseRenderModal();
};

document.addEventListener('click',event=>{
  const box=event.target.closest('[data-song-select]');if(box){event.stopImmediatePropagation();return}
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  if(action==='import-folder'){
    if(typeof window.showDirectoryPicker==='function'){event.preventDefault();event.stopImmediatePropagation();beginFolderImport()}
    else event.stopPropagation();
    return;
  }
  if(['import-folder','import-files','toggle-selection','bulk-select-visible','bulk-apply-tag','bulk-delete','bulk-clear','confirm-text-import','cancel-text-import'].includes(action)){event.preventDefault();event.stopImmediatePropagation()}
  if(action==='import-files')$('#bulkTextFiles')?.click();
  if(action==='toggle-selection'){selectionMode=!selectionMode;if(!selectionMode)selectedSongIds.clear();render()}
  if(action==='bulk-select-visible'){const visible=activeTag?filteredSongs().filter(s=>(s.tags||[]).includes(activeTag)):filteredSongs();visible.forEach(s=>selectedSongIds.add(s.id));$$('[data-song-select]').forEach(box=>box.checked=true);updateBulkCount()}
  if(action==='bulk-apply-tag'){
    const tag=$('#bulkTagSelect')?.value;if(!tag){notify('Válassz címkét.');return}
    state.songs.filter(s=>selectedSongIds.has(s.id)).forEach(s=>{s.tags=[...new Set([...(s.tags||[]),tag])];s.updatedAt=new Date().toISOString()});persist();selectedSongIds.clear();notify('A címke hozzáadva a kijelölt dalokhoz.');render();
  }
  if(action==='bulk-delete')showConfirm(`Biztosan törlöd a kijelölt ${selectedSongIds.size} dalt?`,async()=>{const ids=new Set(selectedSongIds);state.songs=state.songs.filter(s=>!ids.has(s.id));state.recent=state.recent.filter(id=>!ids.has(id));state.gigs.forEach(g=>g.songIds=g.songIds.filter(id=>!ids.has(id)));selectedSongIds.clear();await persist();render();notify('A kijelölt dalok törölve.')},{danger:true,confirmText:'Törlés'});
  if(action==='bulk-clear'){selectedSongIds.clear();render()}
  if(action==='confirm-text-import')commitTextImport();
  if(action==='cancel-text-import'){modal=null;renderModal()}
},true);
document.addEventListener('change',event=>{
  const checkbox=event.target.closest('[data-song-select]');if(checkbox){const id=checkbox.dataset.songSelect;if(checkbox.checked)selectedSongIds.add(id);else selectedSongIds.delete(id);updateBulkCount();return}
  if(event.target.id==='bulkTextFiles'||event.target.id==='folderTextFiles'){const files=Array.from(event.target.files||[]);event.target.value='';if(files.length)importTextBatch(files)}
});

})();
