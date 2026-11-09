const CACHE='stefy-dalszovegek-v34-accessibility';
const FILES=['./','./index.html','./styles.css?v=34.0','./overrides.css?v=34.0','./app.js?v=34.0','./navigation.js?v=editorfix1','./features.js?v=34.0','./enhancements.js?v=34.0','./manifest.webmanifest?v=33.8','./icon-192.png?v=brand7','./icon-512.png?v=brand7','./stefy-band-logo.png?v=brand7','./stage-default.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())))});

// Build update for multi-song gig editing and title-size preferences.

