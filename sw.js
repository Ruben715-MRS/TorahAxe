// =========================================================================
// === TORAHAXE — SERVICE WORKER : l'application et ses textes sans réseau ===
// =========================================================================
// Règles et noms de caches : js/offlineCore.js. Liste et version de la coquille : sw-version.js, généré au déploiement (scripts/swManifest.js).
// Sans ce fichier (poste de développement), le service worker ne fait rien : tout passe par le réseau.
importScripts('js/offlineCore.js');
let CFG = null;
try { importScripts('sw-version.js'); CFG = self.TORAHAXE_SW || null; } catch (e) { /* développement : pas de version */ }

const O = self.OfflineCore;
const SCOPE = self.registration.scope;
const SHELL = CFG ? new Set(CFG.files) : null;
const SHELL_CACHE = CFG ? O.shellCacheName(CFG.version) : null;
const keyOf = rel => new URL(rel, SCOPE).href;

// Exécute `task` sur chaque élément, `limit` à la fois (la coquille compte quelque 180 fichiers : pas tous d'un coup).
function pool(items, limit, task) {
    let i = 0;
    const worker = () => (i < items.length ? Promise.resolve(task(items[i++])).then(worker) : Promise.resolve());
    return Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// `no-cache` : revalide auprès du serveur (réponse 304, presque gratuite quand la page vient d'être chargée) sans se fier à une copie périmée.
const fresh = url => fetch(new Request(url, { cache: 'no-cache' }));

self.addEventListener('install', event => {
    if (!CFG) { self.skipWaiting(); return; }
    event.waitUntil((async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
            await pool(CFG.files, 8, async rel => {
                const res = await fresh(keyOf(rel));
                if (!res.ok) throw new Error(rel + ' : ' + res.status);
                await cache.put(keyOf(rel), res);
            });
        } catch (e) {
            await caches.delete(SHELL_CACHE);   // coquille incomplète : on ne la garde pas, l'ancienne version continue, on réessaiera à la prochaine visite
            throw e;
        }
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const stale = O.staleCaches(await caches.keys(), SHELL_CACHE);
        await Promise.all(stale.map(n => caches.delete(n)));
        await self.clients.claim();
    })());
});

// Coquille : le cache d'abord (la version du cache est celle du déploiement). Données : le cache d'abord, revalidé en arrière-plan ; à la première lecture, le réseau.
self.addEventListener('fetch', event => {
    const req = event.request;
    if (!CFG || req.method !== 'GET' || req.headers.has('range')) return;
    const kind = O.classify(req.url, SCOPE, SHELL);
    if (kind === 'shell') {
        // La clé est celle du fichier de la coquille (« / » et « /?x=1 » sont index.html), pas l'adresse demandée.
        const key = keyOf(O.relativePath(req.url, SCOPE));
        event.respondWith(caches.open(SHELL_CACHE).then(c => c.match(key)).then(hit => hit || fetch(req)));
    } else if (kind === 'data') {
        event.respondWith((async () => {
            const cache = await caches.open(O.DATA_CACHE);
            const hit = await cache.match(req.url);
            const net = fetch(req).then(res => {
                if (res.status === 200 && res.type === 'basic') cache.put(req.url, res.clone()).catch(() => { /* stockage plein : sans conséquence */ });
                return res;
            });
            if (hit) { event.waitUntil(net.catch(() => { /* hors réseau : la copie rangée suffit */ })); return hit; }
            return net;
        })());
    }
});

// La page demande de ranger d'avance des textes (le Siddour) : seuls ceux qui ne sont pas déjà dans le cache sont lus. Réponse : { total, added, failed }.
self.addEventListener('message', event => {
    const d = event.data || {};
    if (!CFG || d.type !== 'precache' || !Array.isArray(d.urls)) return;
    const port = event.ports && event.ports[0];
    event.waitUntil((async () => {
        const cache = await caches.open(O.DATA_CACHE);
        const urls = d.urls.map(u => keyOf(u)).filter(u => O.classify(u, SCOPE, SHELL) === 'data');
        let added = 0, failed = 0;
        await pool(urls, 4, async url => {
            if (await cache.match(url)) return;
            try {
                const res = await fetch(url);
                if (res.status === 200 && res.type === 'basic') { await cache.put(url, res); added++; } else failed++;
            } catch (e) { failed++; }
        });
        if (port) port.postMessage({ total: urls.length, added: added, failed: failed });
    })());
});
