// =========================================================================
// === SIDDOUR : LES SONS PARTICULIERS À METTRE EN GRAS (calculs purs, sans DOM) ===
// =========================================================================
// Trois sons que le lecteur francophone prononce mal s'il lit « à la française » (voir la page « Les dix bonnes raisons de prier dans ce Siddour ») :
//   - le gros kamats, ou kamats katan, qui se lit [o] (קָדְשְׁךָ : « kodéchékha ») ;
//   - le chéva na, le chéva que l'on prononce [é] (יוֹשְׁבֵי : « yochévé ») ;
//   - le daguèch dur (daguèch 'hazak), qui double la lettre (תִּפֹּל : « tippol »).
// Les voyelles sont des signes combinés posés sur la lettre : on ne peut pas les mettre en gras seules sans les décrocher de leur lettre. On met donc en gras
// LA LETTRE ENTIÈRE (la lettre et tous ses signes) qui porte le son particulier. `split` renvoie le texte découpé : des chaînes simples, et des objets
// { s, k } pour les lettres à mettre en gras (k : 'katan' | 'na' | 'dagesh').
//
// PRUDENCE : le texte du siddour ne note pas le kamats katan (pas de ׇ). Reconnaître chaque son demande de la grammaire (syllabes, accent tonique) que le texte
// ne donne pas : ici on ne marque que ce qui est SÛR, et on laisse le doute sans marque plutôt que d'en mettre une fausse.
//   daguèch dur : toujours sûr (daguèch dans une lettre autre que בגדכפת, ou dans une de בגדכפת après une voyelle).
//   chéva na    : sûr au début du mot, sous une lettre à daguèch dur, sous la première de deux lettres identiques, en second de deux chévas de suite (au milieu du mot),
//                 et après une voyelle longue sûre (tséré, 'holam, chourouk, 'hirik male, kamats avec méteg) quand une autre voyelle suit.
//   gros kamats : sûr devant un 'hataf kamats (צָהֳרַיִם), devant ׇ (kamats katan noté), et pour les mots de CHAMETS_KATAN (liste écrite à la main) ainsi que « כָּל » joint par un maqaf.
//   Un kamats suivi d'un chéva, hors de cette liste, reste SANS marque : « חָכְמָה » (gros kamats) et « הָלְכוּ » (kamats ordinaire, chéva na) s'écrivent pareil.
// Contenu de grammaire écrit à la main : **à relire par une personne compétente** (et la liste ci-dessous à compléter).
// Testé dans tests/siddurSoundsCore.test.js. Écran : js/app/siddur.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SiddurSounds = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    var SHVA = 0x5B0, HATAF_KAMATS = 0x5B3, HIRIQ = 0x5B4, TSERE = 0x5B5, KAMATS = 0x5B8, HOLAM = 0x5B9, HOLAM_HASER = 0x5BA, KUBUTZ = 0x5BB, METEG = 0x5BD, DAGESH = 0x5BC, KAMATS_KATAN = 0x5C7;
    var BGDKPT = 'בגדכפת';
    var WORD = /[א-ת][֑-ׇ]*(?:[א-ת][֑-ׇ]*)*/g;

    // Les mots à gros kamats : consonnes seules (sans voyelles), avec leurs préfixes ובהלכמש et quelques terminaisons admis. Liste de départ, à compléter.
    var CHAMETS_KATAN = ['חכמה', 'חכמת', 'חכמתי', 'חכמתו', 'חכמתך', 'חכמתם', 'קדשו', 'קדשך', 'קדשי', 'קדשם', 'קדשכם', 'קדשנו', 'קדשה', 'ארחו', 'ארחך', 'ארחי', 'שרשו', 'שרשי', 'חפני', 'עזו', 'עזך', 'עזי', 'עזנו', 'ענו'];
    var KATAN_RE = new RegExp('^[ובהלכמש]{0,3}(?:' + CHAMETS_KATAN.join('|') + ')(?:ך|ם|ן|נו|כם|ה)?$');
    // Les mots dont on ne marque rien : le Nom divin (on lit Adonaï, pas ce qui est écrit).
    var SKIP = /^[ובהלכמש]{0,3}יהוה$/;

    function strip(s) { return s.replace(/[֑-ׇ]/g, ''); }

    // Un mot → ses lettres : { c: la lettre, m: ses signes (codes), i: sa place dans le mot, n: sa longueur }.
    function clusters(word) {
        var out = [], re = /([א-ת])([֑-ׇ]*)/g, m;
        while ((m = re.exec(word))) {
            var marks = [];
            for (var k = 0; k < m[2].length; k++) marks.push(m[2].charCodeAt(k));
            out.push({ c: m[1], m: marks, i: m.index, n: m[0].length });
        }
        return out;
    }
    function has(cl, code) { return cl.m.indexOf(code) >= 0; }
    function vowelOf(cl) {
        for (var k = 0; k < cl.m.length; k++) { var c = cl.m[k]; if ((c >= SHVA && c <= KUBUTZ) || c === KAMATS_KATAN) return c; }
        return 0;
    }
    // ו avec daguèch et sans voyelle = chourouk ; ו avec 'holam seul = 'holam male : ce sont des voyelles, pas des consonnes.
    function isMaterVav(cl) {
        if (cl.c !== 'ו') return false;
        var v = vowelOf(cl);
        return (!v && has(cl, DAGESH)) || (v === HOLAM && !has(cl, DAGESH));
    }
    function isMaterYod(cl, prev) {
        if (cl.c !== 'י' || vowelOf(cl) || !prev) return false;
        var v = vowelOf(prev);
        return v === HIRIQ || v === TSERE;
    }
    // La voyelle qui précède (la lettre d'avant) est-elle une voyelle longue SÛRE ?
    function longBefore(cls, i) {
        var p = cls[i - 1];
        if (!p) return false;
        if (isMaterVav(p)) return true;
        if (isMaterYod(p, cls[i - 2])) return true;
        var v = vowelOf(p);
        if (v === TSERE || v === HOLAM || v === HOLAM_HASER) return true;
        if (v === KAMATS && has(p, METEG)) return true;
        return false;
    }
    function isMappiq(cl, last) { return last && (cl.c === 'ה' || cl.c === 'א') && has(cl, DAGESH) && !vowelOf(cl); }

    // Les lettres à mettre en gras dans un mot : [{ i, n, k }]. `maqafAfter` : le mot est suivi d'un maqaf (« כָּל־ »).
    function marksOf(word, maqafAfter) {
        var cls = clusters(word), out = [];
        if (!cls.length || SKIP.test(strip(word))) return out;
        var skeleton = strip(word);
        var katanWord = KATAN_RE.test(skeleton);
        var last = cls.length - 1;
        for (var i = 0; i <= last; i++) {
            var cl = cls[i], v = vowelOf(cl), kind = null;
            if (isMaterVav(cl)) continue;
            // 1. le daguèch dur
            if (has(cl, DAGESH) && !isMappiq(cl, i === last)) {
                if (BGDKPT.indexOf(cl.c) < 0) kind = 'dagesh';
                else if (i > 0) {
                    var pv = vowelOf(cls[i - 1]);
                    if (isMaterVav(cls[i - 1]) || isMaterYod(cls[i - 1], cls[i - 2]) || (pv && pv !== SHVA)) kind = 'dagesh';
                }
            }
            // 2. le gros kamats
            if (!kind && (v === KAMATS_KATAN)) kind = 'katan';
            if (!kind && v === KAMATS) {
                var nx = cls[i + 1];
                if (nx && has(nx, HATAF_KAMATS)) kind = 'katan';
                else if (nx && has(nx, SHVA) && katanWord) kind = 'katan';
                else if (skeleton === 'כל' && maqafAfter && i === 0) kind = 'katan';
            }
            // 3. le chéva na
            if (!kind && v === SHVA && i < last) {
                var na = false;
                if (i === 0) na = true;                                                     // début de mot
                else if (has(cl, DAGESH) && BGDKPT.indexOf(cl.c) < 0) na = true;           // lettre à daguèch dur
                else if (has(cl, DAGESH) && i > 0 && vowelOf(cls[i - 1]) && vowelOf(cls[i - 1]) !== SHVA) na = true;
                else if (cls[i + 1] && cls[i + 1].c === cl.c) na = true;                    // première de deux lettres identiques : הַלְלוּ
                else if (vowelOf(cls[i - 1]) === SHVA) na = true;                           // second de deux chévas de suite
                else if (longBefore(cls, i)) {
                    // après une voyelle longue sûre, à condition qu'une autre voyelle suive (sinon le chéva est muet)
                    for (var j = i + 1; j <= last; j++) { var vj = vowelOf(cls[j]); if ((vj && vj !== SHVA) || isMaterVav(cls[j])) { na = true; break; } }
                }
                if (na) kind = 'na';
            }
            if (kind) out.push({ i: cl.i, n: cl.n, k: kind });
        }
        return out;
    }

    // Le texte → des chaînes et des { s, k }. Même texte une fois recollé.
    function split(text) {
        var out = [], pos = 0, m;
        WORD.lastIndex = 0;
        while ((m = WORD.exec(text))) {
            var marks = marksOf(m[0], text.charAt(m.index + m[0].length) === '־');
            marks.forEach(function (mk) {
                var from = m.index + mk.i;
                if (from > pos) out.push(text.slice(pos, from));
                out.push({ s: text.substr(from, mk.n), k: mk.k });
                pos = from + mk.n;
            });
        }
        if (pos < text.length) out.push(text.slice(pos));
        return out;
    }

    return { split: split, marksOf: marksOf, CHAMETS_KATAN: CHAMETS_KATAN };
}));
