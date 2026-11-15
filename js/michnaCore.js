// =========================================================================
// === LA MICHNA ET LE BARTENURA (DONNÉES ET RÈGLES, lecteur de l'Atelier) ===
// =========================================================================
// Les 63 traités de la Michna en hébreu, avec le commentaire de Rabbénou Ovadia de Bartenura (hébreu seul). Pur, sans DOM : testé dans
// tests/michnaCore.test.js. Les données viennent de data/michna/ (scripts/build_michna.js) :
//   index.json : { sedarim: [ { id, he, fr, tractates: [ { id, he, fr, chapters, mishnayot } ] } ] }
//   <traité>.json : { chapters: [ chapitre → [ michna → [texte, [commentaires du Bartenura]] ] ] }
// Un commentaire est du texte avec <b> (le mot commenté, le dibour hamatkhil) et <i> (une citation) ; tout le reste est du texte.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MichnaCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Les lettres hébraïques sous la forme de numéros (pour numéroter les michnayot : א, ב, … ; les « 15 » et « 16 » s'écrivent ט״ו et ט״ז).
    var UNITS = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    var TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    var HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת'];
    function hebrewNumber(n) {
        n = Math.floor(n);
        if (!(n > 0 && n < 500)) return String(n);
        var s = HUNDREDS[Math.floor(n / 100)];
        var rest = n % 100;
        if (rest === 15) s += 'טו';
        else if (rest === 16) s += 'טז';
        else s += TENS[Math.floor(rest / 10)] + UNITS[rest % 10];
        return s.length > 1 ? s.slice(0, -1) + '״' + s.slice(-1) : s + '׳';
    }

    // Tous les traités à la suite, dans l'ordre de la tradition, chacun avec son ordre.
    function tractates(index) {
        var out = [];
        ((index && index.sedarim) || []).forEach(function (s) {
            s.tractates.forEach(function (t) {
                out.push({ id: t.id, he: t.he, fr: t.fr, chapters: t.chapters, mishnayot: t.mishnayot, seder: s.id, sederHe: s.he, sederFr: s.fr });
            });
        });
        return out;
    }

    function find(index, id) {
        var list = tractates(index);
        for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
        return null;
    }

    // Le chapitre suivant (delta = 1) ou précédent (delta = -1), en passant d'un traité à l'autre ; null aux deux extrémités de la Michna.
    // `at` : { id, chapter } (chapitre compté à partir de 1).
    function step(index, at, delta) {
        var list = tractates(index);
        var i = -1;
        for (var k = 0; k < list.length; k++) if (list[k].id === at.id) { i = k; break; }
        if (i < 0) return null;
        var chapter = at.chapter + delta;
        if (chapter >= 1 && chapter <= list[i].chapters) return { id: at.id, chapter: chapter };
        var j = i + delta;
        if (j < 0 || j >= list.length) return null;
        return { id: list[j].id, chapter: delta > 0 ? 1 : list[j].chapters };
    }

    // Découpe un commentaire en morceaux { s: texte, k: '' | 'b' | 'i' } (b : mot commenté, i : citation). Les balises ne sont jamais interprétées comme du HTML.
    function parseComment(raw) {
        var out = [];
        var kind = '';
        String(raw || '').split(/(<\/?(?:b|i)>)/).forEach(function (part) {
            var tag = /^<(\/?)(b|i)>$/.exec(part);
            if (tag) kind = tag[1] ? '' : tag[2];
            else if (part) out.push({ s: part, k: kind });
        });
        return out;
    }

    // Retire les voyelles et les accents (mode « sans voyelles ») ; le maqaf et le point-geresh restent.
    var MARKS = /[֑-ׇ]/g;
    function stripMarks(text) { return String(text || '').replace(MARKS, ''); }

    return { hebrewNumber: hebrewNumber, tractates: tractates, find: find, step: step, parseComment: parseComment, stripMarks: stripMarks };
}));
