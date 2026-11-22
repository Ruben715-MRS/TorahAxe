// =========================================================================
// === HAFTAROT ET PARACHA PAR DATE (règles, sans DOM) ===
// =========================================================================
// Les haftarot sont dans data/torah/haftarot.json (scripts/build_haftarot.js) ; les parachiot de chaque Chabbat se calculent (js/sedraCore.js, TorahCore.parashaForDate). Ici : lire ces
// fichiers (le shabbat d'une date, la haftara d'une paracha ou d'un shabbat), nommer une référence en français et la placer dans les livres de data/tanakh.
// Testé dans tests/haftarotCore.test.js, qui vérifie chaque référence contre les chapitres et versets des livres.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HaftarotCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Le livre de la haftara (nom hebcal) → le livre de data/tanakh, sa partie (livres en plusieurs parties : nom dans `parts`), son nom français.
    var BOOKS = {
        // La Torah : pas des haftarot, mais le Tanakh affiche de la même façon une plage de la Torah (les lectures spéciales : js/specialReadingsCore.js).
        'Genesis': { id: 'genesis', part: null, fr: 'Genèse' },
        'Exodus': { id: 'exode', part: null, fr: 'Exode' },
        'Leviticus': { id: 'levitique', part: null, fr: 'Lévitique' },
        'Numbers': { id: 'nombres', part: null, fr: 'Nombres' },
        'Deuteronomy': { id: 'deuteronome', part: null, fr: 'Deutéronome' },
        'Joshua': { id: 'josue', part: null, fr: 'Josué' },
        'Jonah': { id: 'douze', part: 'Jonas', fr: 'Jonas' },
        'Habakkuk': { id: 'douze', part: 'Habacuc', fr: 'Habacuc' },
        'Judges': { id: 'juges', part: null, fr: 'Juges' },
        'I Samuel': { id: 'samuel', part: 'I Samuel', fr: '1 Samuel' },
        'II Samuel': { id: 'samuel', part: 'II Samuel', fr: '2 Samuel' },
        'I Kings': { id: 'rois', part: 'I Rois', fr: '1 Rois' },
        'II Kings': { id: 'rois', part: 'II Rois', fr: '2 Rois' },
        'Isaiah': { id: 'isaie', part: null, fr: 'Isaïe' },
        'Jeremiah': { id: 'jeremie', part: null, fr: 'Jérémie' },
        'Ezekiel': { id: 'ezechiel', part: null, fr: 'Ézéchiel' },
        'Hosea': { id: 'douze', part: 'Osée', fr: 'Osée' },
        'Joel': { id: 'douze', part: 'Joël', fr: 'Joël' },
        'Amos': { id: 'douze', part: 'Amos', fr: 'Amos' },
        'Obadiah': { id: 'douze', part: 'Abdias', fr: 'Abdias' },
        'Micah': { id: 'douze', part: 'Michée', fr: 'Michée' },
        'Zechariah': { id: 'douze', part: 'Zacharie', fr: 'Zacharie' },
        'Malachi': { id: 'douze', part: 'Malachie', fr: 'Malachie' }
    };

    // Pourquoi la haftara de ce shabbat n'est pas l'habituelle (le texte de hebcal → le nom français). Le premier motif qui convient l'emporte.
    var WHY = [
        [/Shekalim/, 'Chabbat Chékalim'],
        [/Zachor/, 'Chabbat Zakhor'],
        [/Parah/, 'Chabbat Para'],
        [/HaChodesh/, 'Chabbat HaHodech'],
        [/HaGadol/, 'Chabbat HaGadol'],
        [/Shuva/, 'Chabbat Chouva (entre Roch Hachana et Kippour)'],
        [/Chanukah/, 'Hanoucca'],
        [/17 Tammuz/, 'Entre le 17 Tamouz et Tich’a BeAv'],
        [/Machar Chodesh/, 'Veille de Roch ’Hodech (Machar ’Hodech)'],
        [/Rosh Chodesh/, 'Roch ’Hodech'],
        [/Consolation/, 'Haftara de consolation'],
        [/Special Shabbat/, 'Après un chabbat spécial']
    ];
    function whyLabel(why) {
        for (var i = 0; i < WHY.length; i++) if (WHY[i][0].test(why || '')) return WHY[i][1];
        return '';
    }

    // « 54:1 » → [54, 1].
    function cv(s) { return String(s).split(':').map(Number); }

    // Une référence [livre, 'c:v', 'c:v'] → { book, id, part, fr, c1, v1, c2, v2 }, ou null si le livre est inconnu.
    function parseRef(ref) {
        var b = BOOKS[ref[0]];
        if (!b) return null;
        var from = cv(ref[1]), to = cv(ref[2]);
        return { book: ref[0], id: b.id, part: b.part, fr: b.fr, c1: from[0], v1: from[1], c2: to[0], v2: to[1] };
    }

    // « Isaïe 54:1–55:5 » ; dans un seul chapitre : « Isaïe 54:1–10 ».
    function refLabel(ref) {
        var p = parseRef(ref);
        if (!p) return '';
        if (p.c1 === p.c2) return p.fr + ' ' + p.c1 + ':' + p.v1 + (p.v2 === p.v1 ? '' : '–' + p.v2);
        return p.fr + ' ' + p.c1 + ':' + p.v1 + '–' + p.c2 + ':' + p.v2;
    }
    // Plusieurs références d'une même haftara : « Isaïe 6:1–7:6 ; 9:5–6 ».
    function refsLabel(refs) {
        return refs.map(function (r, i) {
            var l = refLabel(r);
            var prev = i ? parseRef(refs[i - 1]) : null;
            var p = parseRef(r);
            return prev && prev.id === p.id && prev.part === p.part ? l.slice(p.fr.length + 1) : l;
        }).join(' ; ');
    }
    // Les références d'une haftara rangées par livre de data/tanakh, dans l'ordre : [{ id, refs }]. Presque toujours un seul livre (Osée, Joël et Michée, des
    // douze petits prophètes, comptent pour un seul) ; le rite séfarade du 26 juillet 2025 mêle Jérémie et Isaïe.
    function groupByBook(refs) {
        var out = [];
        refs.forEach(function (r) {
            var p = parseRef(r);
            if (!p) return;
            var last = out[out.length - 1];
            if (last && last.id === p.id) last.refs.push(r);
            else out.push({ id: p.id, refs: [r] });
        });
        return out;
    }

    // Les morceaux de texte d'une référence dans le livre chargé : [{ c, from, to }] (chapitre depuis 0 ; versets de `from` à `to` exclu).
    // `partFirst` : l'indice du premier chapitre de la partie (0 pour un livre sans parties) ; `lengths[c]` : le nombre de versets du chapitre c.
    function segments(ref, partFirst, lengths) {
        var p = parseRef(ref);
        if (!p) return [];
        var out = [];
        for (var ch = p.c1; ch <= p.c2; ch++) {
            var c = partFirst + ch - 1;
            var from = ch === p.c1 ? p.v1 - 1 : 0;
            var to = ch === p.c2 ? p.v2 : lengths[c];
            out.push({ c: c, from: from, to: to });
        }
        return out;
    }

    // Le samedi de `date` ou le premier qui suit : 'AAAA-MM-JJ'.
    function sabbathKey(date) {
        var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
        var pad = function (n) { return n < 10 ? '0' + n : String(n); };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    // La haftara d'une paracha lue seule : { a, s } (s : absent si le rite séfarade est le même), ou null (Vézot Ha-Bérakha : lue à Sim’hat Torah).
    function regular(data, index) {
        return (data && data.regular && data.regular[index]) || null;
    }

    // Tout ce qu'on sait d'un shabbat : { key, indices, haftara : { a, s }, why (le nom français du shabbat particulier, ou '') }, ou null si le calendrier
    // ne dit rien (fête, ou année hors du calendrier). `indices` : les parachiot de ce Chabbat (TorahCore.parashaForDate), null si c'est une fête ; `data` : data/torah/haftarot.json.
    function sabbathInfo(indices, data, date) {
        if (!indices || !indices.length) return null;
        var key = sabbathKey(date);
        var special = data && data.sabbaths && data.sabbaths[key];
        // Les Chabbatot particuliers (Chekalim, Zakhor, Hanouka, Roch Hodech…) ne sont listés que pour les années de data/torah/haftarot.json : hors de cette plage on ne peut pas
        // savoir si ce Chabbat en est un, donc on ne donne pas de haftara (plutôt qu'une haftara ordinaire peut-être fausse).
        var listed = data && data.sabbaths ? Object.keys(data.sabbaths).sort() : [];
        if (!special && listed.length && (key < listed[0].slice(0, 4) + '-01-01' || key > listed[listed.length - 1].slice(0, 4) + '-12-31')) return { key: key, indices: indices, haftara: null, why: '' };
        var haftara = special ? { a: special.a, s: special.s } : indices.length > 1 ? (data && data.combined && data.combined[indices.join('-')]) : regular(data, indices[0]);
        return { key: key, indices: indices, haftara: haftara || null, why: special ? whyLabel(special.why) : '' };
    }
    return { BOOKS: BOOKS, whyLabel: whyLabel, parseRef: parseRef, refLabel: refLabel, refsLabel: refsLabel, groupByBook: groupByBook, segments: segments, sabbathKey: sabbathKey, regular: regular, sabbathInfo: sabbathInfo };
}));
