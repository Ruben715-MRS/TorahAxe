// =========================================================================
// === TORAHAXE — RÉFÉRENCES DANS LES PROPHÈTES ET LES HAGIOGRAPHES : LES 34 LIVRES, LEURS CHAPITRES ET LEURS VERSETS (pur, testé) ===
// =========================================================================
// Ce qu'il faut pour tirer un verset au hasard dans le Nakh (Neviim et Ketouvim), lui donner son livre et son chapitre et trouver le verset suivant, sans charger aucun texte :
// le nombre de versets de chaque chapitre de chaque livre (vérifié contre data/tanakh/<fichier>.json par tests/nakhRefs.test.js).
//
// 34 livres, ceux que la tradition compte : 21 Neviim (Josué, Juges, I et II Samuel, I et II Rois, Isaïe, Jérémie, Ézéchiel, les douze petits prophètes un par un) et 13 Ketouvim
// (Psaumes, Proverbes, Job, Cantique, Ruth, Lamentations, Qohélet, Esther, Daniel, Esdras, Néhémie, I et II Chroniques). Plusieurs livres se partagent un fichier de data/tanakh/
// (Samuel, Rois, les douze, Esdras et Néhémie, Chroniques) : `file` est ce fichier, `first` l'indice (de 0) du premier chapitre du livre dans le fichier ; les chapitres d'un livre sont
// numérotés de 1 dans ce livre, comme dans les éditions (II Samuel 1 est le chapitre 32 du fichier).
// `hide` : les façons d'écrire le nom du livre dans les résumés de chapitre (data/tanakh/resume-<fichier>.json) : le mode « Contenu » les masque, sans quoi le résumé donnerait la réponse.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.NakhRefs = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var GROUPS = [
        { id: 'nevi', fr: 'Neviim', he: 'נביאים' },
        { id: 'ketouvim', fr: 'Ketouvim', he: 'כתובים' }
    ];

    // Dans l'ordre du Tanakh. `verses` : le nombre de versets de chaque chapitre.
    var BOOKS = [
        { id: 'josue', file: 'josue', group: 'nevi', fr: 'Josué', he: 'יהושע', first: 0, hide: ['Josué'],
          verses: [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33] },
        { id: 'juges', file: 'juges', group: 'nevi', fr: 'Juges', he: 'שופטים', first: 0, hide: [],
          verses: [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25] },
        { id: 'samuel-1', file: 'samuel', group: 'nevi', fr: 'I Samuel', he: 'שמואל א', first: 0, hide: ['Samuel'],
          verses: [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 16, 23, 28, 23, 44, 25, 12, 25, 11, 31, 13] },
        { id: 'samuel-2', file: 'samuel', group: 'nevi', fr: 'II Samuel', he: 'שמואל ב', first: 31, hide: ['Samuel'],
          verses: [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 32, 44, 26, 22, 51, 39, 25] },
        { id: 'rois-1', file: 'rois', group: 'nevi', fr: 'I Rois', he: 'מלכים א', first: 0, hide: [],
          verses: [53, 46, 28, 20, 32, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 54] },
        { id: 'rois-2', file: 'rois', group: 'nevi', fr: 'II Rois', he: 'מלכים ב', first: 22, hide: [],
          verses: [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 20, 22, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30] },
        { id: 'isaie', file: 'isaie', group: 'nevi', fr: 'Isaïe', he: 'ישעיהו', first: 0, hide: ['Isaïe'],
          verses: [31, 22, 26, 6, 30, 13, 25, 23, 20, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 11, 25, 24] },
        { id: 'jeremie', file: 'jeremie', group: 'nevi', fr: 'Jérémie', he: 'ירמיהו', first: 0, hide: ['Jérémie'],
          verses: [19, 37, 25, 31, 31, 30, 34, 23, 25, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34] },
        { id: 'ezechiel', file: 'ezechiel', group: 'nevi', fr: 'Ézéchiel', he: 'יחזקאל', first: 0, hide: ['Ézéchiel','Ezéchiel'],
          verses: [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 44, 37, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35] },
        { id: 'osee', file: 'douze', group: 'nevi', fr: 'Osée', he: 'הושע', first: 0, hide: ['Osée'],
          verses: [9, 25, 5, 19, 15, 11, 16, 14, 17, 15, 11, 15, 15, 10] },
        { id: 'joel', file: 'douze', group: 'nevi', fr: 'Joël', he: 'יואל', first: 14, hide: ['Joël'],
          verses: [20, 27, 5, 21] },
        { id: 'amos', file: 'douze', group: 'nevi', fr: 'Amos', he: 'עמוס', first: 18, hide: ['Amos'],
          verses: [15, 16, 15, 13, 27, 14, 17, 14, 15] },
        { id: 'abdias', file: 'douze', group: 'nevi', fr: 'Abdias', he: 'עובדיה', first: 27, hide: ['Abdias'],
          verses: [21] },
        { id: 'jonas', file: 'douze', group: 'nevi', fr: 'Jonas', he: 'יונה', first: 28, hide: ['Jonas'],
          verses: [16, 11, 10, 11] },
        { id: 'michee', file: 'douze', group: 'nevi', fr: 'Michée', he: 'מיכה', first: 32, hide: ['Michée'],
          verses: [16, 13, 12, 14, 14, 16, 20] },
        { id: 'nahum', file: 'douze', group: 'nevi', fr: 'Nahum', he: 'נחום', first: 39, hide: ['Nahum'],
          verses: [14, 14, 19] },
        { id: 'habacuc', file: 'douze', group: 'nevi', fr: 'Habacuc', he: 'חבקוק', first: 42, hide: ['Habacuc'],
          verses: [17, 20, 19] },
        { id: 'sophonie', file: 'douze', group: 'nevi', fr: 'Sophonie', he: 'צפניה', first: 45, hide: ['Sophonie'],
          verses: [18, 15, 20] },
        { id: 'aggee', file: 'douze', group: 'nevi', fr: 'Aggée', he: 'חגי', first: 48, hide: ['Aggée'],
          verses: [15, 23] },
        { id: 'zacharie', file: 'douze', group: 'nevi', fr: 'Zacharie', he: 'זכריה', first: 50, hide: ['Zacharie'],
          verses: [17, 17, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21] },
        { id: 'malachie', file: 'douze', group: 'nevi', fr: 'Malachie', he: 'מלאכי', first: 64, hide: ['Malachie'],
          verses: [14, 17, 24] },
        { id: 'psaumes', file: 'psaumes', group: 'ketouvim', fr: 'Psaumes', he: 'תהלים', first: 0, hide: ['Psaumes','Psaume'],
          verses: [6, 12, 9, 9, 13, 11, 18, 10, 21, 18, 7, 9, 6, 7, 5, 11, 15, 51, 15, 10, 14, 32, 6, 10, 22, 12, 14, 9, 11, 13, 25, 11, 22, 23, 28, 13, 40, 23, 14, 18, 14, 12, 5, 27, 18, 12, 10, 15, 21, 23, 21, 11, 7, 9, 24, 14, 12, 12, 18, 14, 9, 13, 12, 11, 14, 20, 8, 36, 37, 6, 24, 20, 28, 23, 11, 13, 21, 72, 13, 20, 17, 8, 19, 13, 14, 17, 7, 19, 53, 17, 16, 16, 5, 23, 11, 13, 12, 9, 9, 5, 8, 29, 22, 35, 45, 48, 43, 14, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 14, 10, 8, 12, 15, 21, 10, 20, 14, 9, 6] },
        { id: 'proverbes', file: 'proverbes', group: 'ketouvim', fr: 'Proverbes', he: 'משלי', first: 0, hide: ['Proverbes'],
          verses: [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31] },
        { id: 'job', file: 'job', group: 'ketouvim', fr: 'Job', he: 'איוב', first: 0, hide: ['Job'],
          verses: [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 32, 26, 17] },
        { id: 'cantique', file: 'cantique', group: 'ketouvim', fr: 'Cantique des cantiques', he: 'שיר השירים', first: 0, hide: ['Cantique','Cantiques'],
          verses: [17, 17, 11, 16, 16, 12, 14, 14] },
        { id: 'ruth', file: 'ruth', group: 'ketouvim', fr: 'Ruth', he: 'רות', first: 0, hide: ['Ruth'],
          verses: [22, 23, 18, 22] },
        { id: 'lamentations', file: 'lamentations', group: 'ketouvim', fr: 'Lamentations', he: 'איכה', first: 0, hide: ['Lamentations'],
          verses: [22, 22, 66, 22, 22] },
        { id: 'qohelet', file: 'qohelet', group: 'ketouvim', fr: 'Qohélet', he: 'קהלת', first: 0, hide: ['Qohélet','Ecclésiaste'],
          verses: [18, 26, 22, 17, 19, 12, 29, 17, 18, 20, 10, 14] },
        { id: 'esther', file: 'esther', group: 'ketouvim', fr: 'Esther', he: 'אסתר', first: 0, hide: ['Esther'],
          verses: [22, 23, 15, 17, 14, 14, 10, 17, 32, 3] },
        { id: 'daniel', file: 'daniel', group: 'ketouvim', fr: 'Daniel', he: 'דניאל', first: 0, hide: ['Daniel'],
          verses: [21, 49, 33, 34, 30, 29, 28, 27, 27, 21, 45, 13] },
        { id: 'esdras', file: 'esdras', group: 'ketouvim', fr: 'Esdras', he: 'עזרא', first: 0, hide: ['Esdras'],
          verses: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44] },
        { id: 'nehemie', file: 'esdras', group: 'ketouvim', fr: 'Néhémie', he: 'נחמיה', first: 10, hide: ['Néhémie'],
          verses: [11, 20, 38, 17, 19, 19, 72, 18, 37, 40, 36, 47, 31] },
        { id: 'chroniques-1', file: 'chroniques', group: 'ketouvim', fr: 'I Chroniques', he: 'דברי הימים א', first: 0, hide: ['Chroniques'],
          verses: [54, 55, 24, 43, 41, 66, 40, 40, 44, 14, 47, 41, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30] },
        { id: 'chroniques-2', file: 'chroniques', group: 'ketouvim', fr: 'II Chroniques', he: 'דברי הימים ב', first: 29, hide: ['Chroniques'],
          verses: [18, 17, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 23, 14, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23] }
    ];

    BOOKS.forEach(function (b) {
        b.chapters = b.verses.length;
        b.total = b.verses.reduce(function (n, v) { return n + v; }, 0);
    });

    var FILES = [];
    BOOKS.forEach(function (b) { if (FILES.indexOf(b.file) < 0) FILES.push(b.file); });

    function book(i) { return BOOKS[i] || null; }

    // Les livres d'un groupe ('nevi' ou 'ketouvim'), sous la forme d'indices dans BOOKS.
    function inGroup(group) {
        var out = [];
        BOOKS.forEach(function (b, i) { if (b.group === group) out.push(i); });
        return out;
    }

    // Le poids d'un livre dans le tirage : la racine carrée de son nombre de versets (les Psaumes ne noient pas Ruth, et Ruth ne sort pas aussi souvent que les Psaumes).
    function weight(i) { return Math.sqrt(BOOKS[i].total); }

    // Le numéro d'ordre (0 à total - 1) d'un verset du livre `i` ; -1 s'il n'existe pas.
    function ordinal(i, chapter, verse) {
        var b = BOOKS[i];
        if (!b || !(chapter >= 1 && chapter <= b.chapters) || !(verse >= 1 && verse <= b.verses[chapter - 1])) return -1;
        var n = 0;
        for (var c = 0; c < chapter - 1; c++) n += b.verses[c];
        return n + verse - 1;
    }

    // Le verset { chapter, verse } d'un numéro d'ordre du livre `i` ; null hors du livre.
    function at(i, n) {
        var b = BOOKS[i];
        if (!b || !(n >= 0 && n < b.total)) return null;
        for (var c = 0; c < b.chapters; c++) {
            if (n < b.verses[c]) return { chapter: c + 1, verse: n + 1 };
            n -= b.verses[c];
        }
        return null;
    }

    // Le verset qui suit celui-ci dans le livre (il passe au chapitre suivant) ; null à la fin du livre.
    function next(i, chapter, verse) {
        var n = ordinal(i, chapter, verse);
        return n < 0 ? null : at(i, n + 1);
    }

    // « Isaïe 40:1 ».
    function label(i, chapter, verse) { return BOOKS[i].fr + ' ' + chapter + ':' + verse; }

    // L'indice (de 0) du chapitre dans le fichier du livre : de quoi lire ou charger ce chapitre.
    function fileChapter(i, chapter) { return BOOKS[i].first + chapter - 1; }

    // Le livre (indice dans BOOKS) d'un chapitre d'un fichier (indice de 0), ou -1.
    function bookOf(file, fileChapterIndex) {
        for (var i = 0; i < BOOKS.length; i++) {
            var b = BOOKS[i];
            if (b.file === file && fileChapterIndex >= b.first && fileChapterIndex < b.first + b.chapters) return i;
        }
        return -1;
    }

    return { GROUPS: GROUPS, BOOKS: BOOKS, FILES: FILES, book: book, inGroup: inGroup, weight: weight, ordinal: ordinal, at: at, next: next, label: label, fileChapter: fileChapter, bookOf: bookOf };
}));
