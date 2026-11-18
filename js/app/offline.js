// Enregistre le service worker (sw.js) : après une première visite en ligne, l'application s'ouvre et se lit sans réseau (voir js/offlineCore.js pour ce qui est gardé).
// Pas dans l'application iOS ni Android (Capacitor) : tout y est déjà dans le paquet, et un service worker n'y servirait qu'à brouiller les mises à jour.
const TorahOffline = (() => {
    function native() {
        try { return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()); } catch (e) { return false; }
    }
    function enabled() {
        return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !native();
    }
    function register() {
        if (!enabled()) return;
        // Après `load` : l'enregistrement et le rangement de la coquille ne disputent pas le réseau au premier affichage.
        window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* sans conséquence : l'application marche en ligne */ }); });
    }
    // Demande au service worker de ranger ces textes (adresses relatives) s'ils ne le sont pas déjà. Résout { total, added, failed }, ou null s'il n'y a pas de service worker.
    function precache(urls) {
        if (!enabled()) return Promise.resolve(null);
        return navigator.serviceWorker.ready.then(reg => new Promise(resolve => {
            if (!reg.active) { resolve(null); return; }
            const ch = new MessageChannel();
            const timer = setTimeout(() => resolve(null), 300000);
            ch.port1.onmessage = e => { clearTimeout(timer); resolve(e.data || null); };
            reg.active.postMessage({ type: 'precache', urls: urls }, [ch.port2]);
        })).catch(() => null);
    }
    return { enabled, register, precache };
})();
TorahOffline.register();
