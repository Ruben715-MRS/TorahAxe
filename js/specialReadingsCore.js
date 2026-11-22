// =========================================================================
// === LES LECTURES SPÉCIALES DE L'ANNÉE : TORAH, MAFTIR, HAFTARA (calculs purs, sans DOM) ===
// =========================================================================
// Données : data/torah/special-readings.json (scripts/build_special_readings.py). Les références sont celles du tableau « Lecture de la Torah, du Maftir et des
// Haftarot spéciales » du Houmach Artscroll, édition Edmond J. Safra (calendrier de la Diaspora) ; le découpage en montées vient de Hebcal (@hebcal/leyning). Ici : nommer une
// référence en français, numéroter les montées, et couper une plage en morceaux de versets pour l'afficher. Testé dans tests/specialReadingsCore.test.js.
//
// Une plage est [livre, c1, v1, c2, v2] (livre 1 = Genèse à 5 = Deutéronome). Un « bloc » de Torah : { r: [plages], a: [montées], rep?: reprise, s?: [montées d'un
// Chabbat], lab? } ; une montée est elle aussi une plage.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SpecialReadingsCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var BOOK_NAMES = ['Genèse', 'Exode', 'Lévitique', 'Nombres', 'Deutéronome'];
    // Le nom du livre dans les références de Hebcal (js/haftarotCore.js : BOOKS), pour ouvrir le texte dans le Tanakh.
    var HEBCAL_BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'];
    var NAMES = ['Cohen', 'Lévi', 'Israël'];
    var HE_BOOK_NAMES = ['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים'];

    // Les haftarot : le livre en français (tel que l'écrit le livre) → [nom Hebcal, nom hébreu].
    var HAFTARA_BOOKS = {
        'Samuel I': ['I Samuel', 'שמואל א'], 'Samuel II': ['II Samuel', 'שמואל ב'], 'Rois I': ['I Kings', 'מלכים א'], 'Rois II': ['II Kings', 'מלכים ב'],
        'Isaïe': ['Isaiah', 'ישעיהו'], 'Jérémie': ['Jeremiah', 'ירמיהו'], 'Ézéchiel': ['Ezekiel', 'יחזקאל'], 'Josué': ['Joshua', 'יהושע'],
        'Zacharie': ['Zechariah', 'זכריה'], 'Michée': ['Micah', 'מיכה'], 'Jonas': ['Jonah', 'יונה'], 'Habakkouk': ['Habakkuk', 'חבקוק'], 'Malachie': ['Malachi', 'מלאכי']
    };
    // Là où la numérotation du livre n'est pas celle du texte du Tanakh : Jérémie 31 commence, dans le texte, par « En ce temps-là » (verset 1) ; la haftara débute au verset 2.
    var HAFTARA_TEXT = { 'Jérémie 31:1-19': ['Jeremiah', '31:2', '31:20'] };

    // Un nombre en lettres hébraïques (15 et 16 : טו et טז).
    var LETTERS = [[400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'], [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'], [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'],
        [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'], [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א']];
    function numeral(n) {
        if (n === 15) return 'טו';
        if (n === 16) return 'טז';
        for (var i = 0; i < LETTERS.length; i++) if (n >= LETTERS[i][0]) return LETTERS[i][1] + numeral(n - LETTERS[i][0]);
        return '';
    }

    // « 29:12-16 », « 33:1-34:12 », « 21:1-34 » (le verset seul : « 3:12 »).
    function span(r) {
        var a = r[1] + ':' + r[2];
        if (r[1] === r[3]) return r[2] === r[4] ? a : a + '-' + r[4];
        return a + '-' + r[3] + ':' + r[4];
    }

    // « Nombres 29:12-16 ».
    function refLabel(r) { return BOOK_NAMES[r[0] - 1] + ' ' + span(r); }

    // Les mêmes en hébreu : « במדבר כט:יב-טז ».
    function spanHe(r) {
        var a = numeral(r[1]) + ':' + numeral(r[2]);
        if (r[1] === r[3]) return r[2] === r[4] ? a : a + '-' + numeral(r[4]);
        return a + '-' + numeral(r[3]) + ':' + numeral(r[4]);
    }
    function refLabelHe(r) { return HE_BOOK_NAMES[r[0] - 1] + ' ' + spanHe(r); }
    function rangesLabelHe(ranges) {
        return ranges.map(function (r, i) { return i && ranges[i - 1][0] === r[0] ? spanHe(r) : refLabelHe(r); }).join(' ; ');
    }

    // Une haftara écrite comme dans le livre (« Samuel I 1:1-2:10 », « Michée 7:18-20 ») → { book (Hebcal), from, to, he (étiquette hébraïque), fr } ; null si inconnue.
    function parseHaftara(text) {
        var m = /^(.+) (\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/.exec(text);
        if (!m || !HAFTARA_BOOKS[m[1]]) return null;
        var c1 = +m[2], v1 = +m[3], c2 = m[4] ? +m[4] : c1, v2 = m[5] ? +m[5] : v1;
        var he = HAFTARA_BOOKS[m[1]][1] + ' ' + spanHe([0, c1, v1, c2, v2]);
        var ref = HAFTARA_TEXT[text] || [HAFTARA_BOOKS[m[1]][0], c1 + ':' + v1, c2 + ':' + v2];
        return { ref: ref, he: he, fr: text };
    }
    function haftaraRefs(list) { return list.map(function (t) { return parseHaftara(t).ref; }); }
    function haftaraLabel(list, hebrew) {
        return hebrew ? list.map(function (t) { return parseHaftara(t).he; }).join(' ; ') : list.join(' ; ');
    }

    // Plusieurs plages d'une même lecture : « Exode 32:11-14 ; 34:1-10 » (le livre n'est répété que s'il change).
    function rangesLabel(ranges) {
        return ranges.map(function (r, i) {
            return i && ranges[i - 1][0] === r[0] ? span(r) : refLabel(r);
        }).join(' ; ');
    }

    // Les plages au format des références de Hebcal ([livre, 'c:v', 'c:v']), que le Tanakh sait afficher (HaftarotCore).
    function tanakhRefs(ranges) {
        return ranges.map(function (r) { return [HEBCAL_BOOKS[r[0] - 1], r[1] + ':' + r[2], r[3] + ':' + r[4]]; });
    }

    // Le nom d'une montée : 1 Cohen, 2 Lévi, 3 Israël, puis « 4e »… « 7e ». `n` : son numéro (depuis 1).
    function aliyahName(n) { return n <= 3 ? NAMES[n - 1] : n + 'e'; }

    // Les montées d'un bloc, prêtes à afficher : [{ n, name, range, repeat? }]. `base` : le nombre de montées déjà lues avant ce bloc (la seconde lecture de
    // Hanouca ou de 'Hol HaMoèd de Pessa'h est la quatrième montée) ; `shabbat` : le découpage en sept montées d'une fête qui tombe un Chabbat.
    function aliyot(block, shabbat, base) {
        var list = shabbat && block.s ? block.s : block.a;
        var from = base || 0;
        var out = list.map(function (r, i) { return { n: from + i + 1, name: aliyahName(from + i + 1), range: r }; });
        if (!shabbat && block.rep) out.push({ n: from + list.length + 1, name: aliyahName(from + list.length + 1), range: block.rep, repeat: true });
        return out;
    }

    // Combien de montées les blocs précédents ont-ils lues ?
    function baseOf(item, index, shabbat) {
        var n = 0;
        for (var i = 0; i < index; i++) n += aliyot(item.torah[i], shabbat, n).length;
        return n;
    }

    // Une fête a-t-elle un découpage différent quand elle tombe un Chabbat ?
    function hasShabbat(item) {
        return !!item.torah && item.torah.some(function (b) { return !!b.s; });
    }

    // Les morceaux de versets d'une plage : [{ c, from, to }] (chapitre depuis 1 ; versets de `from` à `to` inclus). `lengths[livre-1][c-1]` : le nombre de versets.
    function segments(r, lengths) {
        var out = [];
        for (var c = r[1]; c <= r[3]; c++) {
            var n = lengths[r[0] - 1][c - 1];
            out.push({ c: c, from: c === r[1] ? r[2] : 1, to: c === r[3] ? r[4] : n });
        }
        return out;
    }

    // Les occasions d'un groupe de data/torah/special-readings.json ('all' : toutes).
    function itemsOf(data, group) {
        return data.items.filter(function (it) { return group === 'all' || it.g === group; });
    }

    // Toutes les plages de Torah d'une occasion (pour les vérifications) : les blocs (montées de semaine et de Chabbat), puis les maftirs.
    function allRanges(item) {
        var out = [];
        (item.torah || []).forEach(function (b) {
            b.r.forEach(function (r) { out.push(r); });
            b.a.forEach(function (r) { out.push(r); });
            (b.s || []).forEach(function (r) { out.push(r); });
            if (b.rep) out.push(b.rep);
        });
        (item.maftir || []).forEach(function (m) { out.push(m.r); });
        return out;
    }

    return { BOOK_NAMES: BOOK_NAMES, numeral: numeral, spanHe: spanHe, refLabelHe: refLabelHe, rangesLabelHe: rangesLabelHe, parseHaftara: parseHaftara, haftaraRefs: haftaraRefs, haftaraLabel: haftaraLabel, span: span, refLabel: refLabel, rangesLabel: rangesLabel, tanakhRefs: tanakhRefs, aliyahName: aliyahName,
        aliyot: aliyot, baseOf: baseOf, hasShabbat: hasShabbat, segments: segments, itemsOf: itemsOf, allRanges: allRanges };
}));
