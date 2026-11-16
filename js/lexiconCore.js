// =========================================================================
// === TORAHAXE — DICTIONNAIRE FRANÇAIS – HÉBREU BIBLIQUE (recherche, sans DOM) ===
// =========================================================================
// La recherche dans les deux sens, sur les entrées de js/lexiconData.js (voir js/app/lexicon.js pour l'écran).
//  - En français : sans tenir compte des accents ni des majuscules ; un mot exact passe avant un début de mot, qui passe avant un mot dans une phrase.
//  - En hébreu : sans voyelles ni signes de cantillation, les lettres finales comptant comme les lettres ordinaires. Les préfixes courants
//    (ו « et », ה « le », ב « dans », ל « pour », כ « comme », מ « de », ש « que ») sont retirés si le mot tel quel ne donne rien : הַמֶּלֶךְ trouve מֶלֶךְ.
//  - Une racine de trois lettres que le dictionnaire connaît donne toute sa famille de mots.
//  - Un mot tel qu'on le lit dans un verset (conjugué, au pluriel, avec un suffixe) est retrouvé par l'index des formes (js/lexiconForms.js) : « יאמר » mène à
//    אָמַר. Les mots trouvés ainsi se reconnaissent (`formHits`) ; ils passent après les mots dont l'écriture est exactement celle qu'on a tapée. On ne cherche pas
//    les formes quand on tape une racine de trois lettres connue (c'est alors la famille qui s'affiche).
//  - Les niveaux de fréquence dans la Torah (Genèse à Deutéronome), de 1 à 3, comme les niveaux de renommée des figures : 3 · très fréquent
//    (100 occurrences ou plus), 2 · courant (20 à 99), 1 · rare (1 à 19) ; 0 pour un mot absent de la Torah (aucune marque). Les seuils sont ici,
//    et un seul endroit : ils donnent 143 mots au niveau 3 (64 % du texte de la Torah), 378 au niveau 2 et 810 au niveau 1 ; 171 mots sont absents.
//  - L'index des 22 lettres : les mots (ou les racines) qui commencent par une lettre, dans l'ordre alphabétique.
// Les entrées sont rangées de la plus fréquente à la moins fréquente (js/lexiconData.js) : à score égal, le mot le plus courant passe en premier.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory(require('./lexiconData.js'), require('./lexiconForms.js'));
    else root.LexiconCore = factory(root.LexiconData, root.LexiconForms);
})(typeof self !== 'undefined' ? self : this, function (Data, FormsData) {
    'use strict';

    var FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
    var PREFIXES = 'ובהלכמש';
    var MAX_RESULTS = 200;

    // Les seuils des niveaux de fréquence dans la Torah (nombre d'occurrences dans les cinq livres).
    var LEVEL_HIGH = 100;
    var LEVEL_MID = 20;
    function levelOf(torahCount) {
        var n = Number(torahCount) || 0;
        return n >= LEVEL_HIGH ? 3 : n >= LEVEL_MID ? 2 : n >= 1 ? 1 : 0;
    }
    // Un niveau demandé : 'all' (ou rien) = tous ; sinon 0, 1, 2 ou 3.
    function wantsLevel(e, level) { return level === undefined || level === null || level === 'all' || e.level === level; }

    // « הַמֶּלֶךְ » → « המלכ » : les lettres hébraïques seules, sans voyelles, finales ramenées à la forme ordinaire.
    function normalizeHebrew(text) {
        return String(text == null ? '' : text).split('').map(function (ch) { return FINALS[ch] || ch; })
            .filter(function (ch) { return ch >= 'א' && ch <= 'ת'; }).join('');
    }

    // « Père » → « pere » : minuscules, sans accents, sans ponctuation (les apostrophes et traits d'union deviennent des espaces).
    function normalizeFrench(text) {
        return String(text == null ? '' : text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function hasHebrew(text) { return /[א-ת]/.test(String(text == null ? '' : text)); }

    var ENTRIES = Data.ENTRIES.map(function (e, i) {
        return {
            id: i, he: e[0], tr: e[1], pos: e[2], fr: e[3], root: e[4], ref: e[5], note: e[6] || null, strong: e[7], occ: e[8], torah: e[9] || 0, level: levelOf(e[9]), doubt: e[10] === true,
            key: normalizeHebrew(e[0]), rootKey: e[4] ? normalizeHebrew(e[4]) : null,
            frKeys: e[3].map(normalizeFrench)
        };
    });

    function entryById(id) { return ENTRIES[id] || null; }

    // Tous les mots d'une racine (écrite avec ou sans voyelles), dans l'ordre du dictionnaire.
    function family(rootText) {
        var key = normalizeHebrew(rootText);
        if (!key) return [];
        return ENTRIES.filter(function (e) { return e.rootKey === key; });
    }

    // Les écritures possibles d'un mot sans ses préfixes : lui-même, puis privé d'une ou de deux lettres de préfixe (il reste au moins deux lettres).
    function prefixVariants(key) {
        var out = [key];
        if (key.length >= 3 && PREFIXES.indexOf(key.charAt(0)) >= 0) out.push(key.slice(1));
        if (key.length >= 4 && PREFIXES.indexOf(key.charAt(0)) >= 0 && PREFIXES.indexOf(key.charAt(1)) >= 0) out.push(key.slice(2));
        return out;
    }

    // L'index des formes : une écriture (consonnes seules) → les mots du dictionnaire dont elle est une forme, du plus courant au moins courant.
    // Construit à la première recherche seulement.
    var formIndexCache = null;
    function formIndex() {
        if (formIndexCache) return formIndexCache;
        formIndexCache = {};
        var byStrong = {};
        ENTRIES.forEach(function (e) { byStrong[e.strong] = e; });
        var forms = (FormsData && FormsData.FORMS) || {};
        Object.keys(forms).forEach(function (strong) {
            var entry = byStrong[strong];
            if (!entry) return;
            forms[strong].split(' ').forEach(function (f) { (formIndexCache[f] = formIndexCache[f] || []).push(entry); });
        });
        Object.keys(formIndexCache).forEach(function (f) { formIndexCache[f].sort(function (a, b) { return a.id - b.id; }); });
        return formIndexCache;
    }

    function searchHebrew(text) {
        var key = normalizeHebrew(text);
        if (!key) return { kind: 'empty', results: [] };
        // Une racine connue : toute la famille.
        var fam = key.length === 3 ? family(key) : [];
        var rootHit = fam.length > 0;
        // Chaque mot garde sa meilleure raison d'être là : { entry, score, form } (`form` : trouvé par une forme du texte, pas par son écriture).
        var best = {};
        function offer(entry, score, viaForm) {
            var current = best[entry.id];
            if (!current || score > current.score) best[entry.id] = { entry: entry, score: score, form: viaForm };
        }
        // Le mot tel quel d'abord : l'écriture exacte (100), le début d'un mot connu (50).
        ENTRIES.forEach(function (e) {
            if (e.key === key) offer(e, 100, false);
            else if (key.length >= 2 && e.key.indexOf(key) === 0) offer(e, 50, false);
        });
        if (!rootHit) {
            // Les mots dont c'est une forme du texte (90) : « יאמר » → אָמַר.
            var index = formIndex();
            (index[key] || []).forEach(function (e) { offer(e, 90, true); });
            // Sans les préfixes (« le roi », « et la parole », « dans la maison ») : le mot entier (95), ou une de ses formes (85). Seule l'écriture exacte d'un mot
            // empêche de couper un préfixe (« שבת » n'est pas « ש » + « בת ») : une forme rare ne doit pas cacher le mot (« המלך » est « le roi », pas « faire régner »).
            var exact = Object.keys(best).some(function (id) { return best[id].score >= 100; });
            if (!exact) {
                var variants = prefixVariants(key).slice(1);
                var whole = false;       // un mot entier a été trouvé sous l'écriture privée de son préfixe : on n'y ajoute pas des formes lointaines
                variants.forEach(function (v, i) {
                    ENTRIES.forEach(function (e) { if (e.key === v) { offer(e, 95 - i, false); whole = true; } });
                });
                if (!whole) variants.forEach(function (v, i) { (index[v] || []).forEach(function (e) { offer(e, 85 - i, true); }); });
            }
        }
        var scored = Object.keys(best).map(function (id) { return best[id]; });
        scored.sort(function (a, b) { return b.score - a.score || a.entry.id - b.entry.id; });
        var kept = scored.slice(0, MAX_RESULTS);
        var results = kept.map(function (s) { return s.entry; });
        if (rootHit) {
            // La famille d'abord, puis les autres résultats éventuels.
            var seen = {};
            fam.forEach(function (e) { seen[e.id] = true; });
            return { kind: 'root', root: fam[0].root, family: fam, results: fam.concat(results.filter(function (e) { return !seen[e.id]; })) };
        }
        return { kind: 'hebrew', results: results, formHits: kept.filter(function (s) { return s.form; }).map(function (s) { return s.entry; }) };
    }

    function searchFrench(text) {
        var q = normalizeFrench(text);
        if (!q) return { kind: 'empty', results: [] };
        var scored = [];
        ENTRIES.forEach(function (e) {
            var score = 0;
            e.frKeys.forEach(function (g, i) {
                var s = 0;
                var words = g.split(' ');
                if (g === q) s = i === 0 ? 100 : 90;
                else if (words.indexOf(q) >= 0) s = 70;                  // le mot dans une expression : « être roi »
                else if (g.indexOf(q) === 0) s = 60;                     // un début de traduction : « rég » → « régner »
                else if (q.length >= 3 && words.some(function (w) { return w.indexOf(q) === 0; })) s = 40;
                score = Math.max(score, s);
            });
            if (score) scored.push({ entry: e, score: score });
        });
        scored.sort(function (a, b) { return b.score - a.score || a.entry.id - b.entry.id; });
        return { kind: 'french', results: scored.slice(0, MAX_RESULTS).map(function (s) { return s.entry; }) };
    }

    // --- L'index des lettres ---------------------------------------------------------------------------------------------------------
    // Les 22 lettres, dans l'ordre de l'alphabet (les formes finales n'ouvrent jamais un mot).
    var ALPHABET = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');

    // Pour chaque lettre : combien de mots et combien de racines commencent par elle. [{ letter, words, roots }]
    function initialStats(level) {
        var words = {}, roots = {}, seenRoot = {};
        ENTRIES.forEach(function (e) {
            if (!wantsLevel(e, level)) return;
            var c = e.key.charAt(0);
            words[c] = (words[c] || 0) + 1;
            if (e.rootKey && !seenRoot[e.rootKey]) {
                seenRoot[e.rootKey] = true;
                roots[e.rootKey.charAt(0)] = (roots[e.rootKey.charAt(0)] || 0) + 1;
            }
        });
        return ALPHABET.map(function (l) { return { letter: l, words: words[l] || 0, roots: roots[l] || 0 }; });
    }

    // Les mots qui commencent par une lettre, dans l'ordre alphabétique (à lettres égales, le plus fréquent d'abord).
    function byInitial(letter, level) {
        var l = normalizeHebrew(letter).charAt(0);
        return ENTRIES.filter(function (e) { return l && e.key.charAt(0) === l && wantsLevel(e, level); })
            .sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : a.id - b.id; });
    }

    // Les racines qui commencent par une lettre, dans l'ordre alphabétique, avec leurs mots : [{ root, entries }].
    function rootsOf(letter, level) {
        var l = normalizeHebrew(letter).charAt(0);
        var groups = {};
        ENTRIES.forEach(function (e) {
            if (wantsLevel(e, level) && e.rootKey && l && e.rootKey.charAt(0) === l) (groups[e.rootKey] = groups[e.rootKey] || { root: e.root, entries: [] }).entries.push(e);
        });
        return Object.keys(groups).sort().map(function (k) { return groups[k]; });
    }

    // Garde, parmi des résultats de recherche, les mots d'un niveau (voir levelOf).
    function filterByLevel(list, level) { return list.filter(function (e) { return wantsLevel(e, level); }); }

    // La recherche : de l'hébreu si le texte contient une lettre hébraïque, du français sinon. Un texte vide donne tout le dictionnaire.
    function search(text) {
        var s = String(text == null ? '' : text).trim();
        if (!s) return { kind: 'all', results: ENTRIES.slice() };
        return hasHebrew(s) ? searchHebrew(s) : searchFrench(s);
    }

    return {
        ENTRIES: ENTRIES, normalizeHebrew: normalizeHebrew, normalizeFrench: normalizeFrench, hasHebrew: hasHebrew,
        LEVEL_HIGH: LEVEL_HIGH, LEVEL_MID: LEVEL_MID, levelOf: levelOf, filterByLevel: filterByLevel,
        ALPHABET: ALPHABET, initialStats: initialStats, byInitial: byInitial, rootsOf: rootsOf,
        entryById: entryById, family: family, search: search
    };
});
