// =========================================================================
// === TORAHAXE — GLOSSAIRE DE LA VIE JUIVE (cœur : recherche, sans DOM) ===
// =========================================================================
// Les entrées sont dans js/glossaryData.js. Ici : la recherche, tolérante aux façons d'écrire un mot hébreu en lettres latines (« shabbat », « Chabbat »,
// « Shabbos » ; « Pessah », « Pesach », « Pessa'h » ; « kippour », « kippur »), le filtre par catégorie, l'index des initiales, et les renvois.
// Testé dans tests/glossaryCore.test.js ; l'écran est dans js/app/glossary.js. Tout est sans DOM.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.GlossaryCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var DATA = typeof module === 'object' && module.exports ? require('./glossaryData.js') : GlossaryData;
    var ENTRIES = DATA.ENTRIES;
    var CATEGORIES = DATA.CATEGORIES;

    // Les écrans de l'app vers lesquels une entrée peut renvoyer : `outil` (un identifiant d'openTool) ou `outil:onglet` (l'onglet de l'écran
    // « Commandements et principes »). Le libellé du bouton est dans ui/fr.json : tools.glossary_go_<outil>[_<onglet>].
    var GO_TARGETS = [
        'siddur', 'zmanim', 'hebrewCalendar', 'periods', 'foodlaws', 'benedictions', 'tanakh', 'michna', 'talmud', 'torahReader', 'specialReadings',
        'statuts', 'tsaraat', 'kotel', 'mishkan', 'hassidout', 'transmission', 'gematria', 'lexicon',
        'commandments:peines', 'commandments:mitzvot', 'commandments:shabbat', 'commandments:femmes', 'commandments:pratiques'
    ];

    // Pour chercher sans se soucier de l'orthographe : sans accents, sans majuscules, sans apostrophes ni tirets ; l'hébreu sans voyelles.
    function normalize(s) {
        return String(s == null ? '' : s)
            .normalize('NFD').replace(/[̀-֑ͯ-ׇ]/g, '')
            .toLowerCase()
            .replace(/['’`\-]/g, '');
    }

    // Une clé phonétique grossière, pour que « shabbat », « chabbat » et « shabbos » se rejoignent : sh/kh/ch → h, ou → u, tz → ts, lettres doublées simplifiées, h final tombé.
    function fold(s) {
        var x = normalize(s);
        x = x.replace(/sh/g, 'ch').replace(/kh/g, 'ch').replace(/tz/g, 'ts').replace(/ph/g, 'f')
            .replace(/ch/g, 'h').replace(/ou/g, 'u').replace(/oo/g, 'u').replace(/ck/g, 'k')
            .replace(/([a-z])\1+/g, '$1');
        return x;
    }

    var byId = {};
    ENTRIES.forEach(function (e) {
        byId[e.id] = e;
        e.key = fold(e.tr);
        e.keys = [e.tr].concat(e.alias).map(fold);
        e.heKey = normalize(e.he);
        e.hay = fold([e.tr, e.alias.join(' '), e.id].join(' '));
        e.frKey = fold(e.fr);
    });

    function get(id) { return byId[id] || null; }

    function byAlpha(a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; }

    // Toutes les entrées, par ordre alphabétique de leur nom ; avec une catégorie, seulement celles-là.
    function list(cat) {
        var out = ENTRIES.filter(function (e) { return !cat || cat === 'all' || e.cat === cat; });
        return out.slice().sort(byAlpha);
    }

    // Le rang d'une entrée pour un mot cherché (plus petit = mieux) ; null si le mot n'y est pas.
    function rank(e, w, raw) {
        var i;
        if (e.keys.indexOf(w) >= 0) return 0;                       // c'est le nom, ou une autre écriture, exactement
        for (i = 0; i < e.keys.length; i++) if (e.keys[i].indexOf(w) === 0) return 1; // commence par
        if (e.heKey && raw && /[\u05d0-\u05ea]/.test(raw)) {          // en hébreu : le mot exact, puis un mot qui commence ainsi, puis qui le contient
            if (e.heKey === raw) return 0;
            if (e.heKey.indexOf(raw) === 0) return 1;
            if (e.heKey.indexOf(raw) > 0) return 2;
        }
        if (e.hay.indexOf(w) >= 0) return 2;                        // dans le nom, une écriture ou l'identifiant
        if (w.length >= 3 && e.frKey.indexOf(w) >= 0) return 3;    // dans la définition (pas pour une ou deux lettres : trop de bruit)
        return null;
    }

    // La recherche : tous les mots saisis doivent se trouver (dans le nom, les autres écritures, l'hébreu ou la définition). Du plus pertinent au moins pertinent,
    // puis par ordre alphabétique. Une saisie vide donne la liste entière (de la catégorie, si elle est donnée).
    function search(query, cat) {
        var pool = list(cat);
        var raw = String(query == null ? '' : query).trim();
        if (!raw) return pool;
        var words = raw.split(/\s+/).filter(Boolean);
        var scored = [];
        pool.forEach(function (e) {
            var total = 0;
            for (var i = 0; i < words.length; i++) {
                var r = rank(e, fold(words[i]), normalize(words[i]));
                if (r === null) return;
                total += r;
            }
            scored.push({ e: e, score: total });
        });
        scored.sort(function (a, b) { return a.score - b.score || byAlpha(a.e, b.e); });
        return scored.map(function (s) { return s.e; });
    }

    // Les initiales (A à Z, sans accent) des entrées d'une catégorie, avec leur effectif, dans l'ordre alphabétique : [{ letter: 'A', n: 12 }, …].
    function initials(cat) {
        var counts = {};
        list(cat).forEach(function (e) {
            var l = initialOf(e);
            counts[l] = (counts[l] || 0) + 1;
        });
        return Object.keys(counts).sort().map(function (l) { return { letter: l, n: counts[l] }; });
    }

    function initialOf(e) {
        var c = normalize(e.tr).charAt(0).toUpperCase();
        return /[A-Z]/.test(c) ? c : '#';
    }

    // Les entrées d'une initiale (et d'une catégorie), par ordre alphabétique.
    function byInitial(letter, cat) {
        return list(cat).filter(function (e) { return initialOf(e) === letter; });
    }

    // Les renvois d'une entrée, comme entrées (les identifiants inconnus sont ignorés : le test les interdit).
    function related(id) {
        var e = get(id);
        return e ? e.see.map(get).filter(Boolean) : [];
    }

    // Les entrées qui renvoient à celle-ci (utile pour vérifier qu'aucune n'est orpheline, et pour « voir aussi » dans l'autre sens).
    function backlinks(id) {
        return ENTRIES.filter(function (e) { return e.see.indexOf(id) >= 0; });
    }

    // Un lien « outil » ou « outil:onglet » : { tool, tab } ; null s'il n'y en a pas.
    function parseGo(go) {
        if (!go) return null;
        var i = go.indexOf(':');
        return i < 0 ? { tool: go, tab: '' } : { tool: go.slice(0, i), tab: go.slice(i + 1) };
    }

    // La clé de texte du libellé d'un lien : glossary_go_siddur, glossary_go_commandments_peines.
    function goLabelKey(go) { return 'glossary_go_' + String(go).replace(':', '_'); }

    return {
        ENTRIES: ENTRIES, CATEGORIES: CATEGORIES, GO_TARGETS: GO_TARGETS,
        normalize: normalize, fold: fold, get: get, list: list, search: search, initials: initials, byInitial: byInitial,
        related: related, backlinks: backlinks, parseGo: parseGo, goLabelKey: goLabelKey
    };
}));
