// =========================================================================
// === LE TALMUD DE BABYLONE (DONNÉES ET RÈGLES, lecteur de l'Atelier) ===
// =========================================================================
// La Guémara en araméen vocalisé, amoud par amoud (une « page » = un amoud : 2a, 2b, 3a…). Pur, sans DOM : testé dans tests/talmudCore.test.js.
// Les données viennent de data/talmud/ (scripts/build_talmud.js) :
//   index.json : { sedarim: [ { id, he, fr, tractates: [ { id, he, fr, start, amudim, chapters: [ { he, from: [amoud, segment] } ] } ] } ] }
//   <traité>.json : { start, pages: [ amoud → [ segment ] ], chapters } ; <commentateur>-<traité>.json : { pages: [ amoud → [ segment → [commentaires] ] ] } ;
//   counts-<traité>.json : { order, pages: [ amoud → [ masque par segment ] ] } (le bit k du masque est celui de order[k]) ; `start` est l'amoud de pages[0] (« 2a »), `from` compte depuis 0.
// Un segment est du texte avec <b> (les mots en gras : « Matni », « Guemara », mot d'ouverture, ligne « Hadran »).
// Dépend de MichnaCore (numérotation hébraïque, voyelles, découpe des <b>) : js/michnaCore.js se charge avant ce fichier.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./michnaCore.js'));
    else root.TalmudCore = factory(root.MichnaCore);
}(typeof self !== 'undefined' ? self : this, function (M) {
    'use strict';

    // Tous les traités à la suite, dans l'ordre de la tradition, chacun avec son ordre.
    function tractates(index) {
        var out = [];
        ((index && index.sedarim) || []).forEach(function (s) {
            s.tractates.forEach(function (t) {
                out.push({ id: t.id, he: t.he, fr: t.fr, start: t.start, amudim: t.amudim, chapters: t.chapters || [], comm: t.comm || [], seder: s.id, sederHe: s.he, sederFr: s.fr });
            });
        });
        return out;
    }

    function find(index, id) {
        var list = tractates(index);
        for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
        return null;
    }

    // Le numéro d'ordre d'un amoud : 2a → 4, 2b → 5 (compté depuis la page 1a).
    function rank(label) {
        var m = /^(\d+)([ab])$/.exec(String(label));
        return m ? parseInt(m[1], 10) * 2 + (m[2] === 'b' ? 1 : 0) : -1;
    }

    // L'amoud d'indice `i` (depuis 0) d'un traité qui commence à `start` : amoudLabel('2a', 1) = '2b'.
    function amoudLabel(start, i) {
        var n = rank(start) + i;
        return Math.floor(n / 2) + (n % 2 ? 'b' : 'a');
    }

    // L'indice d'un amoud (« 13a ») dans le traité, ou -1 s'il n'y est pas.
    function pageOf(tr, label) {
        var i = rank(label) - rank(tr.start);
        return i >= 0 && i < tr.amudim ? i : -1;
    }

    // L'amoud en hébreu : 2a → « ב׳ ע״א », 13b → « י״ג ע״ב ».
    function hebrewAmoud(label) {
        var m = /^(\d+)([ab])$/.exec(String(label));
        if (!m) return String(label);
        return M.hebrewNumber(parseInt(m[1], 10)) + ' ' + (m[2] === 'a' ? 'ע״א' : 'ע״ב');
    }

    // Le numéro de la page vue comme un « daf » : 2a et 2b sont le daf 2.
    function dafOf(label) { return parseInt(label, 10) || 0; }

    // Le chapitre (indice depuis 0) où se trouve le segment `seg` de l'amoud `page` : le dernier chapitre commencé à ce point.
    function chapterAt(tr, page, seg) {
        var at = -1;
        tr.chapters.forEach(function (c, k) {
            if (c.from[0] < page || (c.from[0] === page && c.from[1] <= (seg || 0))) at = k;
        });
        return Math.max(at, 0);
    }

    // Les chapitres qui commencent dans l'amoud : [ { n (depuis 1), he, seg (depuis 0) } ].
    function chaptersStartingIn(tr, page) {
        var out = [];
        tr.chapters.forEach(function (c, k) { if (c.from[0] === page) out.push({ n: k + 1, he: c.he, seg: c.from[1] }); });
        return out;
    }

    // L'amoud suivant (delta = 1) ou précédent (delta = -1), en passant d'un traité à l'autre ; null aux deux extrémités du Talmud disponible.
    // `at` : { id, page } (page : indice depuis 0).
    function step(index, at, delta) {
        var list = tractates(index);
        var i = -1;
        for (var k = 0; k < list.length; k++) if (list[k].id === at.id) { i = k; break; }
        if (i < 0) return null;
        var page = at.page + delta;
        if (page >= 0 && page < list[i].amudim) return { id: at.id, page: page };
        var j = i + delta;
        if (j < 0 || j >= list.length) return null;
        return { id: list[j].id, page: delta > 0 ? 0 : list[j].amudim - 1 };
    }

    // Un segment est-il la ligne qui clôt un chapitre (« Hadran alakh … ») ?
    function isHadran(segment) {
        return /^הדרן עלך/.test(M.stripMarks(M.parseComment(segment).map(function (p) { return p.s; }).join('')));
    }

    return {
        tractates: tractates, find: find, rank: rank, amoudLabel: amoudLabel, pageOf: pageOf, hebrewAmoud: hebrewAmoud, dafOf: dafOf,
        chapterAt: chapterAt, chaptersStartingIn: chaptersStartingIn, step: step, isHadran: isHadran,
        hebrewNumber: M.hebrewNumber, maskIds: M.maskIds, parseComment: M.parseComment, stripMarks: M.stripMarks
    };
}));
