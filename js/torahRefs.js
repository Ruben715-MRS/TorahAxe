// =========================================================================
// === TORAHAXE — RÉFÉRENCES DANS LA TORAH : LIVRES, CHAPITRES, VERSETS ET PARACHIOT (pur, testé) ===
// =========================================================================
// Ce qu'il faut pour passer d'un verset à un numéro d'ordre dans toute la Torah (0 à 5845) et à sa paracha, sans charger aucun texte : le nombre de versets de
// chaque chapitre (LAYOUT, vérifié contre data/tanakh/<livre>.json par tests/torahRefs.test.js) et la table des débuts de paracha (data/torah/parashot.json,
// passée en paramètre). Livres numérotés de 1 (Genèse) à 5 (Deutéronome), comme dans parashot.json.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TorahRefs = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var BOOK_IDS = ['genesis', 'exode', 'levitique', 'nombres', 'deuteronome'];      // les fichiers data/tanakh/<id>.json
    var BOOK_NAMES = ['Genèse', 'Exode', 'Lévitique', 'Nombres', 'Deutéronome'];

    // Les versets de chaque chapitre : LAYOUT[livre - 1][chapitre - 1].
    var LAYOUT = [
        // Genèse : 50 chapitres, 1533 versets
        [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 54, 33, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26],
        // Exode : 40 chapitres, 1210 versets
        [22, 25, 22, 31, 23, 30, 29, 28, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 23, 37, 30, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38],
        // Lévitique : 27 chapitres, 859 versets
        [17, 16, 17, 35, 26, 23, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34],
        // Nombres : 36 chapitres, 1288 versets
        [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 35, 28, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 39, 17, 54, 42, 56, 29, 34, 13],
        // Deutéronome : 34 chapitres, 956 versets
        [46, 37, 29, 49, 30, 25, 26, 20, 29, 22, 32, 31, 19, 29, 23, 22, 20, 22, 21, 20, 23, 29, 26, 22, 19, 19, 26, 69, 28, 20, 30, 52, 29, 12]
    ];

    var OFFSETS = [];                 // le numéro d'ordre du premier verset de chaque livre
    var TOTAL = 0;
    LAYOUT.forEach(function (chapters) { OFFSETS.push(TOTAL); chapters.forEach(function (n) { TOTAL += n; }); });

    // Le numéro d'ordre (0 à TOTAL - 1) d'un verset { book, chapter, verse } ; -1 s'il n'existe pas.
    function indexOf(ref) {
        var chapters = LAYOUT[ref.book - 1];
        if (!chapters || !(ref.chapter >= 1 && ref.chapter <= chapters.length) || !(ref.verse >= 1 && ref.verse <= chapters[ref.chapter - 1])) return -1;
        var n = OFFSETS[ref.book - 1];
        for (var c = 0; c < ref.chapter - 1; c++) n += chapters[c];
        return n + ref.verse - 1;
    }

    // Le verset { book, chapter, verse } d'un numéro d'ordre ; null hors de la Torah.
    function refAt(index) {
        if (!(index >= 0 && index < TOTAL)) return null;
        var book = 0;
        while (book + 1 < OFFSETS.length && index >= OFFSETS[book + 1]) book++;
        var rest = index - OFFSETS[book], chapters = LAYOUT[book];
        for (var c = 0; c < chapters.length; c++) {
            if (rest < chapters[c]) return { book: book + 1, chapter: c + 1, verse: rest + 1 };
            rest -= chapters[c];
        }
        return null;
    }

    // « Genèse 6:9 ».
    function label(ref) { return BOOK_NAMES[ref.book - 1] + ' ' + ref.chapter + ':' + ref.verse; }

    // L'indice (dans parashot.json) de la paracha qui contient ce verset : la dernière dont le début ne dépasse pas le verset. `parashot` : { parashot: [{ book, c, v }] }.
    function parashaOf(parashot, book, chapter, verse) {
        var found = -1;
        parashot.parashot.forEach(function (p, i) {
            if (p.book < book || (p.book === book && (p.c < chapter || (p.c === chapter && p.v <= verse)))) found = i;
        });
        return found;
    }

    return { BOOK_IDS: BOOK_IDS, BOOK_NAMES: BOOK_NAMES, LAYOUT: LAYOUT, TOTAL: TOTAL, indexOf: indexOf, refAt: refAt, label: label, parashaOf: parashaOf };
}));
