// Données de l'appareil : export, import et remise à zéro des réglages et de la progression (localStorage). Pur : testable sous `npm test`.
// Le fichier d'export est un JSON { app: 'torahaxe', v: 1, date, data: { clé: texte } } ; l'import ne reprend que des paires texte → texte.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.DataCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    var APP = 'torahaxe';
    var VERSION = 1;
    var MAX_BYTES = 5 * 1024 * 1024;

    // `entries` : un objet clé → texte (les paires du stockage).
    function buildExport(entries, now) {
        var data = {};
        Object.keys(entries || {}).sort().forEach(function (k) { if (typeof entries[k] === 'string') data[k] = entries[k]; });
        return { app: APP, v: VERSION, date: new Date(now === undefined ? Date.now() : now).toISOString(), data: data };
    }

    // Lit un fichier d'export : { ok: true, data } ou { ok: false, error }.
    function parseImport(text) {
        if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'Fichier vide.' };
        if (text.length > MAX_BYTES) return { ok: false, error: 'Fichier trop volumineux.' };
        var obj;
        try { obj = JSON.parse(text); } catch (e) { return { ok: false, error: 'Ce fichier n\'est pas une sauvegarde TorahAxe.' }; }
        if (!obj || obj.app !== APP || !obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) return { ok: false, error: 'Ce fichier n\'est pas une sauvegarde TorahAxe.' };
        if (obj.v !== VERSION) return { ok: false, error: 'Version de sauvegarde non prise en charge.' };
        var data = {};
        Object.keys(obj.data).forEach(function (k) { if (typeof obj.data[k] === 'string') data[k] = obj.data[k]; });
        return { ok: true, data: data };
    }

    function fileName(now) {
        return 'torahaxe-sauvegarde-' + new Date(now === undefined ? Date.now() : now).toISOString().slice(0, 10) + '.json';
    }

    return { APP: APP, VERSION: VERSION, buildExport: buildExport, parseImport: parseImport, fileName: fileName };
}));
