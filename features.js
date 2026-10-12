/* Focused UI additions: stage home, bulk TXT import and multi-song organization. */
(()=>{
let selectionMode=false;
const selectedSongIds=new Set();
const gigSongSelection=new Set();
let gigSongSearch='';
let homeEditMode=false,homeDrag=null,homeSaveTimer=0;
const HOME_DEFAULTS={headline:'STEFY-BAND',subtitle:'DALSZÖVEGEK',slogan:'Mindig veled a színpadon.',headlineSize:clampHomeSize(54),subtitleSize:32,sloganSize:17,headlineColor:'#ffffff',subtitleColor:'#f4c95d',sloganColor:'#f4f1ea',headlineAlign:'center',subtitleAlign:'center',sloganAlign:'center',headlineX:50,headlineY:39,subtitleX:50,subtitleY:51,sloganX:50,sloganY:63,background:'',backgroundDisabled:false,backgroundZoom:1,backgroundX:50,backgroundY:50,darkness:.48};
function clampHomeSize(value){return Math.max(18,Math.min(100,Number(value)||54))}
function homeDesign(){const saved=state.settings.homeDesign&&typeof state.settings.homeDesign==='object'?state.settings.homeDesign:{};const n=(key,fallback,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(saved[key]))?Number(saved[key]):fallback));const color=(key,fallback)=>/^#[\da-f]{6}$/i.test(saved[key]||'')?saved[key]:fallback;const text=(key)=>typeof saved[key]==='string'?saved[key].slice(0,80):HOME_DEFAULTS[key];const align=(key)=>['left','center','right'].includes(saved[key])?saved[key]:'center';const background=typeof saved.background==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=]+$/i.test(saved.background)&&saved.background.length<12000000?saved.background:'';state.settings.homeDesign={headline:text('headline'),subtitle:text('subtitle'),slogan:text('slogan'),headlineSize:n('headlineSize',54,18,100),subtitleSize:n('subtitleSize',32,18,100),sloganSize:n('sloganSize',17,18,100),headlineColor:color('headlineColor','#ffffff'),subtitleColor:color('subtitleColor','#f4c95d'),sloganColor:color('sloganColor','#f4f1ea'),headlineAlign:align('headlineAlign'),subtitleAlign:align('subtitleAlign'),sloganAlign:align('sloganAlign'),headlineX:n('headlineX',50,5,95),headlineY:n('headlineY',39,12,84),subtitleX:n('subtitleX',50,5,95),subtitleY:n('subtitleY',51,12,84),sloganX:n('sloganX',50,5,95),sloganY:n('sloganY',63,12,84),background,backgroundDisabled:saved.backgroundDisabled===true,backgroundZoom:n('backgroundZoom',1,1,2.5),backgroundX:n('backgroundX',50,0,100),backgroundY:n('backgroundY',50,0,100),darkness:n('darkness',.48,0,.9)};return state.settings.homeDesign}
const baseHomeView=homeView;
homeView=function(){
  const d=homeDesign(),custom=d.background||(!d.backgroundDisabled&&state.settings.theme==='custom'&&state.settings.background?state.settings.background:'');
  const bg=custom?`url("${esc(custom)}")`:`url('stage-default.png')`;
  const pos=(key)=>`left:${d[key+'X']}%;top:${d[key+'Y']}%;color:${esc(d[key+'Color'])};--home-label-size:${clampHomeSize(d[key+'Size'])}px;text-align:${d[key+'Align']}`;
  return `<section class="home-stage ${custom?'has-photo':''}" style="--home-image:${bg};--home-brightness:${state.settings.brightness??1};--home-scrim:${d.darkness};--home-bg-size:${d.backgroundZoom>1.01?`${Math.round(d.backgroundZoom*100)}% auto`:'cover'};--home-bg-position:${d.backgroundX}% ${d.backgroundY}%"><div class="home-spotlight home-spotlight-blue"></div><div class="home-spotlight home-spotlight-red"></div><div class="home-spotlight home-spotlight-gold"></div><div class="home-vinyl" aria-hidden="true"><span>♫</span></div><div class="home-wordmark home-custom-wordmark"><span class="home-stefy home-custom-label" data-home-label="headline" style="${pos('headline')} ">${esc(d.headline)}</span><span class="home-title home-custom-label" data-home-label="subtitle" style="${pos('subtitle')}">${esc(d.subtitle)}</span><span class="home-tagline home-custom-label" data-home-label="slogan" style="${pos('slogan')}">${esc(d.slogan)}</span></div><div class="home-stage-line" aria-hidden="true"></div></section>`;
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

const existingSettingsView=settingsView;settingsView=function(){
  const titleSlider=`<label class="slider-row"><span>DALCÍMEK BETŰMÉRETE</span><input type="range" min="18" max="36" step="1" value="${state.settings.songTitleFont??24}" data-setting="songTitleFont"><b id="songTitleFontValue">${state.settings.songTitleFont??24}px</b></label>`;
  const d=homeDesign(),html=existingSettingsView().replace(/<label class="slider-row"><span>DALCÍMEK BETŰMÉRETE<\/span>.*?<\/label>/g,'').replace(/(<label class="slider-row"><span>Betűméret<\/span>.*?<\/label>)/,`$1${titleSlider}`);
  const labelEditor=(key,title)=>`<fieldset class="home-label-settings"><legend>${title}</legend><label class="field"><span>Szöveg</span><input type="text" maxlength="80" data-home-text="${key}" value="${esc(d[key])}"></label><div class="home-editor-grid"><label class="slider-row"><span>Betűméret</span><input type="range" min="18" max="100" value="${clampHomeSize(d[key+'Size'])}" data-home-design="${key}Size"><b>${clampHomeSize(d[key+'Size'])} px</b></label><label class="field"><span>Szín</span><input type="color" data-home-design="${key}Color" value="${esc(d[key+'Color'])}"></label><label class="field"><span>Igazítás</span><select class="select" data-home-design="${key}Align"><option value="left" ${d[key+'Align']==='left'?'selected':''}>Balra</option><option value="center" ${d[key+'Align']==='center'?'selected':''}>Középre</option><option value="right" ${d[key+'Align']==='right'?'selected':''}>Jobbra</option></select></label><label class="slider-row"><span>Vízszintes hely</span><input type="range" min="5" max="95" value="${d[key+'X']}" data-home-design="${key}X"><b>${d[key+'X']}%</b></label><label class="slider-row"><span>Függőleges hely</span><input type="range" min="12" max="84" value="${d[key+'Y']}" data-home-design="${key}Y"><b>${d[key+'Y']}%</b></label></div></fieldset>`;
  const editor=`<section class="panel home-editor-panel"><div class="section-head"><div><div class="eyebrow">KEZDŐKÉPERNYŐ SZERKESZTÉSE</div><h3>Élő előnézet</h3></div><button class="btn" data-action="toggle-home-edit">${homeEditMode?'Kész':'Szöveg mozgatása'}</button></div><p class="small-muted">${homeEditMode?'Fogd meg és húzd a feliratokat az előnézetben.':'Kapcsold be a mozgatást, majd húzd a feliratokat a kívánt helyre.'}</p><div class="home-editor-preview">${homeView()}</div><div class="home-editor-controls">${labelEditor('headline','Főcím')}${labelEditor('subtitle','Alcím')}${labelEditor('slogan','Szlogen')}</div><div class="home-editor-grid home-bg-controls"><label class="field"><span>Háttérkép kiválasztása vagy cseréje</span><input type="file" accept="image/*" id="homeBackgroundFile"><small class="help">A kép helyben mentődik, legfeljebb 8 MB lehet.</small></label>${d.background||(!d.backgroundDisabled&&state.settings.theme==='custom'&&state.settings.background)?'<button class="btn danger" data-action="remove-home-background">Háttérkép törlése</button>':''}<label class="slider-row"><span>Háttér nagyítása</span><input type="range" min="1" max="2.5" step=".05" value="${d.backgroundZoom}" data-home-design="backgroundZoom"><b>${Number(d.backgroundZoom).toFixed(2)}×</b></label><label class="slider-row"><span>Vízszintes képhely</span><input type="range" min="0" max="100" value="${d.backgroundX}" data-home-design="backgroundX"><b>${d.backgroundX}%</b></label><label class="slider-row"><span>Függőleges képhely</span><input type="range" min="0" max="100" value="${d.backgroundY}" data-home-design="backgroundY"><b>${d.backgroundY}%</b></label><label class="slider-row"><span>Háttér sötétítése</span><input type="range" min="0" max=".9" step=".01" value="${d.darkness}" data-home-design="darkness"><b>${Math.round(d.darkness*100)}%</b></label></div><button class="btn ghost" data-action="reset-home-design">Alapértelmezett visszaállítása</button></section>`;
  return html.replace(/<\/div><\/div>$/,`</div>${editor}</div>`);
};
const baseRenderModal=renderModal;
renderModal=function(){
  if(modal?.type==='multiAddGigSongs'){
    const g=gigById(activeGigId),existing=new Set(g?.songIds||[]),q=gigSongSearch.trim().toLocaleLowerCase('hu');
    const songs=state.songs.filter(s=>!q||[s.title,s.artist,...(s.tags||[]),s.lyrics].some(v=>String(v||'').toLocaleLowerCase('hu').includes(q))).slice().sort((a,b)=>a.title.localeCompare(b.title,'hu'));
    const rows=songs.map(s=>{const inGig=existing.has(s.id),checked=gigSongSelection.has(s.id);return `<label class="multi-song-row ${inGig?'already-added':''}"><input type="checkbox" data-gig-pick="${esc(s.id)}" ${checked?'checked':''} ${inGig?'disabled':''}><span class="multi-song-title">${esc(s.title)}</span>${inGig?'<small>Már a listában</small>':''}</label>`}).join('')||'<div class="empty" style="padding:20px"><p style="margin:0">Nincs találat.</p></div>';
    $('#overlay').innerHTML=`<div class="modal-backdrop" data-action="backdrop"><section class="modal gig-add-modal"><div class="section-head"><h3>Dalok hozzáadása</h3><button class="btn ghost" data-action="close-modal">×</button></div><label class="searchbox gig-song-search"><span>⌕</span><input id="gigSongSearch" placeholder="Dal keresése…" value="${esc(gigSongSearch)}" autocomplete="off"></label><p class="gig-pick-count"><strong id="gigPickCount">${gigSongSelection.size}</strong> dal kijelölve</p><div class="multi-song-list" id="multiGigSongRows">${rows}</div><div class="modal-actions"><button class="btn" data-action="close-modal">Mégsem</button><button class="btn primary" data-action="confirm-multi-gig-songs" ${gigSongSelection.size?'':'disabled'}>Kijelöltek hozzáadása (${gigSongSelection.size})</button></div></section></div>`;return;
  }
  if(modal?.type==='textImportPreview'){
    const s=modal.stats;
    $('#overlay').innerHTML=`<div class="modal-backdrop" data-action="backdrop"><section class="modal"><div class="section-head"><h3>${esc(modal.title)}</h3><button class="btn ghost" data-action="cancel-text-import">×</button></div><p>TXT-fájlok átnézve. A dalcím a fájlnévből készül; az új dalok az <strong>Importált dalok</strong> címkét kapják.</p><div class="import-summary"><div><b>${s.added}</b><span>importálható</span></div><div><b>${s.existed}</b><span>már létezik / címütközés</span></div><div><b>${s.skipped}</b><span>nem támogatott vagy méretkorlát</span></div><div><b>${s.invalid}</b><span>üres, hibás vagy nem olvasható</span></div></div>${modal.candidates.length?`<div class="import-preview-list">${modal.candidates.slice(0,8).map(x=>`<span>${esc(x.title)}</span>`).join('')}${modal.candidates.length>8?`<span>… és még ${modal.candidates.length-8} dal</span>`:''}</div>`:''}<div class="modal-actions"><button class="btn" data-action="cancel-text-import">Mégsem</button><button class="btn primary" data-action="confirm-text-import" ${s.added?'':'disabled'}>Importálás (${s.added})</button></div></section></div>`;return;
  }
  baseRenderModal();
};

document.addEventListener('click',event=>{
  const gigPick=event.target.closest('[data-gig-pick]');if(gigPick){return}
  const gigAction=event.target.closest('[data-action]')?.dataset.action;
  if(gigAction==='add-gig-songs'){event.preventDefault();event.stopImmediatePropagation();gigSongSelection.clear();gigSongSearch='';modal={type:'multiAddGigSongs',title:'Dalok hozzáadása'};renderModal();return}
  if(gigAction==='confirm-multi-gig-songs'){event.preventDefault();event.stopImmediatePropagation();const g=gigById(activeGigId);if(!g)return;const existing=new Set(g.songIds);for(const song of state.songs)if(gigSongSelection.has(song.id)&&!existing.has(song.id)){g.songIds.push(song.id);existing.add(song.id)}const name=$('#gigName')?.value?.trim();const date=$('#gigDate')?.value;if(name)g.name=name;if(date!==undefined)g.date=date;g.updatedAt=new Date().toISOString();gigSongSelection.clear();gigSongSearch='';modal=null;persist().then(()=>{render();notify('A kijelölt dalok hozzáadva és mentve.')});return}
  if(gigAction==='close-modal'&&modal?.type==='multiAddGigSongs'){event.preventDefault();event.stopImmediatePropagation();gigSongSelection.clear();gigSongSearch='';modal=null;renderModal();return}
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
  const gigBox=event.target.closest('[data-gig-pick]');if(gigBox){if(gigBox.checked)gigSongSelection.add(gigBox.dataset.gigPick);else gigSongSelection.delete(gigBox.dataset.gigPick);const count=$('#gigPickCount');if(count)count.textContent=String(gigSongSelection.size);const button=$('[data-action="confirm-multi-gig-songs"]');if(button){button.disabled=!gigSongSelection.size;button.textContent=`Kijelöltek hozzáadása (${gigSongSelection.size})`}return}
  const checkbox=event.target.closest('[data-song-select]');if(checkbox){const id=checkbox.dataset.songSelect;if(checkbox.checked)selectedSongIds.add(id);else selectedSongIds.delete(id);updateBulkCount();return}
  if(event.target.id==='bulkTextFiles'||event.target.id==='folderTextFiles'){const files=Array.from(event.target.files||[]);event.target.value='';if(files.length)importTextBatch(files)}
});
document.addEventListener('input',event=>{if(event.target.id==='gigSongSearch'&&modal?.type==='multiAddGigSongs'){gigSongSearch=event.target.value;renderModal();const input=$('#gigSongSearch');input?.focus();input?.setSelectionRange(gigSongSearch.length,gigSongSearch.length)}},true);
document.addEventListener('input',event=>{if(event.target.matches('[data-setting="songTitleFont"]')){const value=Math.max(18,Math.min(36,Number(event.target.value)||24));state.settings.songTitleFont=value;applyReaderStyles();const label=$('#songTitleFontValue');if(label)label.textContent=`${value}px`;persist();event.stopImmediatePropagation()}},true);

function saveHomeDesignSoon(){clearTimeout(homeSaveTimer);homeSaveTimer=setTimeout(()=>persist(),180)}
function renderHomeLabel(key){const d=homeDesign(),el=$(`[data-home-label="${key}"]`);if(!el)return;el.textContent=d[key];el.style.left=`${d[key+'X']}%`;el.style.top=`${d[key+'Y']}%`;el.style.color=d[key+'Color'];el.style.setProperty('--home-label-size',`${clampHomeSize(d[key+'Size'])}px`);el.style.textAlign=d[key+'Align'];el.classList.toggle('is-draggable',homeEditMode)}
function refreshHomePreview(){const d=homeDesign(),stage=$('.home-editor-preview .home-stage');if(stage){const image=d.background||(!d.backgroundDisabled&&state.settings.theme==='custom'&&state.settings.background?state.settings.background:'');stage.style.setProperty('--home-image',image?`url("${image}")`:`url('stage-default.png')`);stage.style.setProperty('--home-scrim',d.darkness);stage.style.setProperty('--home-bg-size',d.backgroundZoom>1.01?`${Math.round(d.backgroundZoom*100)}% auto`:'cover');stage.style.setProperty('--home-bg-position',`${d.backgroundX}% ${d.backgroundY}%`)}['headline','subtitle','slogan'].forEach(renderHomeLabel);$('.home-editor-panel .small-muted')?.replaceChildren(document.createTextNode(homeEditMode?'Fogd meg és húzd a feliratokat az előnézetben.':'Kapcsold be a mozgatást, majd húzd a feliratokat a kívánt helyre.'));const button=$('[data-action="toggle-home-edit"]');if(button)button.textContent=homeEditMode?'Kész':'Szöveg mozgatása'}
document.addEventListener('click',event=>{const action=event.target.closest('[data-action]')?.dataset.action;if(action==='toggle-home-edit'){event.preventDefault();event.stopImmediatePropagation();homeEditMode=!homeEditMode;refreshHomePreview();return}if(action==='reset-home-design'){event.preventDefault();event.stopImmediatePropagation();clearTimeout(homeSaveTimer);state.settings.homeDesign={...HOME_DEFAULTS,backgroundDisabled:true};homeEditMode=false;persist().then(()=>{render();notify('A kezdőképernyő alapbeállításai visszaálltak.')});return}if(action==='remove-home-background'){event.preventDefault();event.stopImmediatePropagation();const d=homeDesign();d.background='';d.backgroundDisabled=true;persist().then(()=>{render();notify('A kezdőképernyő háttérképe visszaállt az alapképre.')})}},true);
document.addEventListener('input',event=>{const textKey=event.target.dataset.homeText,designKey=event.target.dataset.homeDesign;if(textKey){const d=homeDesign();d[textKey]=event.target.value;renderHomeLabel(textKey);saveHomeDesignSoon();return}if(designKey){const d=homeDesign();d[designKey]=event.target.type==='range'?Number(event.target.value):event.target.value;const output=event.target.parentElement?.querySelector('b');if(output)output.textContent=designKey.endsWith('Size')?`${d[designKey]} px`:designKey==='backgroundZoom'?`${Number(d[designKey]).toFixed(2)}×`:designKey==='darkness'?`${Math.round(d[designKey]*100)}%`:`${d[designKey]}%`;if(['headline','subtitle','slogan'].some(key=>designKey.startsWith(key)))renderHomeLabel(designKey.replace(/(Size|Color|Align|X|Y)$/,''));else refreshHomePreview();saveHomeDesignSoon()}},true);
document.addEventListener('change',event=>{if(event.target.id==='homeBackgroundFile'&&event.target.files?.[0]){const file=event.target.files[0];if(file.size>8*1024*1024){notify('A kép legfeljebb 8 MB lehet.');event.target.value='';return}if(!file.type.startsWith('image/')){notify('Válassz képfájlt.');event.target.value='';return}const reader=new FileReader();reader.onload=()=>{const d=homeDesign();d.background=reader.result;d.backgroundDisabled=false;persist().then(()=>{render();notify('A kezdőképernyő háttérképe mentve.')})};reader.onerror=()=>notify('A képet nem sikerült beolvasni.');reader.readAsDataURL(file)}});
document.addEventListener('pointerdown',event=>{const label=event.target.closest('.home-editor-preview [data-home-label]');if(!homeEditMode||!label)return;event.preventDefault();const stage=label.closest('.home-stage'),r=stage.getBoundingClientRect(),lr=label.getBoundingClientRect(),key=label.dataset.homeLabel;homeDrag={key,rect:r,id:label,offsetX:event.clientX-(lr.left+lr.width/2),offsetY:event.clientY-(lr.top+lr.height/2)};label.setPointerCapture?.(event.pointerId);label.classList.add('dragging')},true);
document.addEventListener('pointermove',event=>{if(!homeDrag)return;const d=homeDesign(),r=homeDrag.rect,key=homeDrag.key;d[key+'X']=Math.max(5,Math.min(95,Math.round((event.clientX-homeDrag.offsetX-r.left)/r.width*100)));d[key+'Y']=Math.max(12,Math.min(84,Math.round((event.clientY-homeDrag.offsetY-r.top)/r.height*100)));renderHomeLabel(key);for(const axis of ['X','Y']){const input=$(`[data-home-design="${key+axis}"]`);if(input){input.value=d[key+axis];const b=input.parentElement.querySelector('b');if(b)b.textContent=`${d[key+axis]}%`}}},true);
document.addEventListener('pointerup',()=>{if(homeDrag){homeDrag.id.classList.remove('dragging');homeDrag=null;saveHomeDesignSoon()}},true);

})();
