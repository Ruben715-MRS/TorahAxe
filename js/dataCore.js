// Données de l'appareil : export, import et remise à zéro des réglages et de la progression (localStorage). Pur : testable sous `npm test`.
// Le fichier d'export est un JSON { app: 'torahaxe', v: 1, date, data: { clé: texte } } ; l'import ne reprend que des paires texte → texte.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.DataCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    var APP = 'torahaxe';
    var VERSION = 1;
    var MAX_BYTES = 5 * 1024 * 1024;

    // Anciennes clés héritées d'HistoriAxe → clés TorahAxe. Une valeur déjà présente sous la nouvelle clé n'est jamais écrasée.
    var LEGACY_KEYS = {
        historiaxe_wheel_v1: 'torahaxe_wheel_v1',
        historiaxe_torah_reader_annotations: 'torahaxe_torah_reader_annotations',
        historiaxe_torah_reader_font_v2: 'torahaxe_torah_reader_font_v2',
        historiaxe_torah_reader_position: 'torahaxe_torah_reader_position',
        historiaxe_lexgame_prefs_v1: 'torahaxe_lexgame_prefs_v1'
    };

    // Renvoie une copie de `entries` où les anciennes clés sont remplacées par les nouvelles (sauvegardes d'avant la migration).
    function migrateEntries(entries) {
        var out = {};
        Object.keys(entries || {}).forEach(function (k) { if (!LEGACY_KEYS[k]) out[k] = entries[k]; });
        Object.keys(LEGACY_KEYS).forEach(function (old) {
            var nu = LEGACY_KEYS[old];
            if (entries && typeof entries[old] === 'string' && !(nu in out)) out[nu] = entries[old];
        });
        return out;
    }

    // Copie les anciennes clés du stockage vers les nouvelles (sans toucher aux anciennes : un retour en arrière ne perd rien).
    // Renvoie le nombre de clés copiées ; ne lève jamais (stockage absent ou plein).
    function migrateStorage(storage) {
        var n = 0;
        try {
            Object.keys(LEGACY_KEYS).forEach(function (old) {
                var nu = LEGACY_KEYS[old];
                var v = storage.getItem(old);
                if (v !== null && storage.getItem(nu) === null) { storage.setItem(nu, v); n++; }
            });
        } catch (e) { /* valable pour cette séance */ }
        return n;
    }

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
        return { ok: true, data: migrateEntries(data) };
    }

    function fileName(now) {
        return 'torahaxe-sauvegarde-' + new Date(now === undefined ? Date.now() : now).toISOString().slice(0, 10) + '.json';
    }

    return { APP: APP, VERSION: VERSION, LEGACY_KEYS: LEGACY_KEYS, migrateEntries: migrateEntries, migrateStorage: migrateStorage, buildExport: buildExport, parseImport: parseImport, fileName: fileName };
}));
