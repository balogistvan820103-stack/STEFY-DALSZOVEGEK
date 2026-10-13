const CACHE='stefy-dalszovegek-v33-grid6';
const FILES=['./','./index.html','./styles.css?v=33.5','./overrides.css?v=33.6','./app.js?v=33.4','./navigation.js','./features.js?v=33.4','./enhancements.js?v=33.4','./manifest.webmanifest','./icon-192.png','./icon-512.png','./stefy-band-logo.png','./stage-default.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())))});

// Build update for multi-song gig editing and title-size preferences.

