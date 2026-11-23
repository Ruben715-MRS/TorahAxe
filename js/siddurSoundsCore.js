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
//   daguèch dur : daguèch dans une lettre autre que בגדכפת, ou dans une de בגדכפת après une voyelle ; SAUF après l'article (הַתּוֹעִים) ou l'article contracté (בַּיָּם), et pour le
//                 mappiq du « ה » final (אֱלוֹהַּ, לָהּ) : le Maguen Avot ne les met pas en gras (relevé sur ses pages : les signes en gras y sont des losanges).
//   chéva na    : sûr au début du mot, sous une lettre à daguèch dur, sous la première de deux lettres identiques, en second de deux chévas de suite (au milieu du mot),
//                 et après une voyelle longue sûre (tséré, 'holam, chourouk, 'hirik male, kamats avec méteg) SAUF dans ces cas, où le chéva est muet :
//                 · après le « וּ » (et) du début du mot : וּשְׁבוּעָתוֹ « ouchvou'ato », וּבְרָכָה « ouvrakha » (le Maguen Avot ne le met pas en gras) ;
//                 · devant un suffixe d'une lettre : טוּבְךָ « touvkha », יְמִינְךָ, מַלְכוּתְךָ, עִירְךָ (l'accent reste sur la voyelle longue) ;
//                 · en araméen (קוּדְשָׁא, שְׁכִינְתָּא, רָחִיצְנָא, וּפוּרְקַן, צְלוֹתְהוֹן… : terminaisons ָא, הוֹן, ֵהּ, ַן) ;
//                 · dans une forme en « ָה » à l'accent sur l'avant-dernière syllabe (נֵלְכָה).
//   gros kamats : sûr devant un 'hataf kamats (צָהֳרַיִם), devant ׇ (kamats katan noté), et pour les mots de CHAMETS_KATAN (liste écrite à la main) quand le chéva ferme la syllabe
//                 au milieu du mot (pas קָדְשָׁךְ, dont le chéva est final), ainsi que « כָּל » joint par un maqaf.
//   Un kamats suivi d'un chéva, hors de cette liste, reste SANS marque : « חָכְמָה » (gros kamats) et « הָלְכוּ » (kamats ordinaire, chéva na) s'écrivent pareil.
// Contenu de grammaire écrit à la main : **à relire par une personne compétente** (et la liste ci-dessous à compléter).
// Testé dans tests/siddurSoundsCore.test.js. Écran : js/app/siddur.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SiddurSounds = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    var PATAH = 0x5B7, SHVA = 0x5B0, HATAF_KAMATS = 0x5B3, HIRIQ = 0x5B4, TSERE = 0x5B5, KAMATS = 0x5B8, HOLAM = 0x5B9, HOLAM_HASER = 0x5BA, KUBUTZ = 0x5BB, METEG = 0x5BD, DAGESH = 0x5BC, KAMATS_KATAN = 0x5C7;
    var BGDKPT = 'בגדכפת';
    var WORD = /[א-ת][֑-ׇ]*(?:[א-ת][֑-ׇ]*)*/g;

    // Les mots à gros kamats : consonnes seules (sans voyelles), avec leurs préfixes ובהלכמש et quelques terminaisons admis. Liste de départ, à compléter.
    var CHAMETS_KATAN = ['חכמה', 'חכמת', 'חכמתי', 'חכמתו', 'חכמתך', 'חכמתם', 'קדשו', 'קדשך', 'קדשי', 'קדשם', 'קדשכם', 'קדשנו', 'קדשה', 'ארחו', 'ארחך', 'ארחי', 'שרשו', 'שרשי', 'חפני', 'עזו', 'עזך', 'עזי', 'עזנו'];
    var KATAN_RE = new RegExp('^[ובהלכמש]{0,3}(?:' + CHAMETS_KATAN.join('|') + ')(?:ך|ם|ן|נו|כם|ה)?$');
    // Les mots dont on ne marque rien : le Nom divin (on lit Adonaï, pas ce qui est écrit).
    var SKIP = /^[ובהלכמש]{0,3}יהוה$/;

    // kamats/patah (\u05B7\u05B8) + alef/yod ; « הוֹן » ; « ֵהּ » (tséré, hé avec mappiq) ; patah/kamats + noun final
    var ARAMAIC_END = /(?:[\u05B7\u05B8][\u0591-\u05C7]*[\u05D0\u05D9]|\u05D4\u05D5\u05B9\u05DF|\u05B5\u05BC?\u05D4\u05BC|[\u05B7\u05B8][\u0591-\u05C7]*\u05DF)$/;
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
        // « וּ » (et) en tête de mot : le chéva qui suit ne se prononce pas (וּשְׁמוֹר : « ouchmor », וּבְרָכָה : « ouvrakha »), malgré la voyelle longue.
        if (i === 1 && isMaterVav(p) && !has(p, HOLAM)) return false;
        if (isMaterVav(p)) return true;
        if (isMaterYod(p, cls[i - 2])) return true;
        // א muet après une voyelle longue (תֹּאמְרוּ : le tav a le 'holam, l'alef ne porte rien) : c'est la voyelle d'avant qui compte
        if (p.c === 'א' && !vowelOf(p) && cls[i - 2]) { var pv = vowelOf(cls[i - 2]); if (pv === HOLAM || pv === TSERE) return true; }
        var v = vowelOf(p);
        if (v === TSERE || v === HOLAM || v === HOLAM_HASER) return true;
        if (v === KAMATS && has(p, METEG)) return true;
        return false;
    }
    // Le « ה » final avec daguèch est un mappiq (on l'entend : אֱלוֹהַּ, לָהּ, שְׁמֵהּ), pas un daguèch dur.
    function isMappiq(cl, last) { return last && cl.c === 'ה' && has(cl, DAGESH); }
    // Le daguèch qui suit l'article (הַתּוֹעִים, הַשִּׁירָה, הַזֹּאת) ou l'article contracté (בַּיָּם, לַמִּשְׁפָּט) : le Maguen Avot ne le met pas en gras (on ne double pas la lettre).
    function afterArticle(cls, i) {
        var p = cls[i - 1];
        if (!p || vowelOf(p) !== PATAH || cls.length < 3) return false;
        if (p.c === 'ה') return i === 1 || (i === 2 && 'וכלבמש'.indexOf(cls[0].c) >= 0);      // הַ, וְהַ, בְּהַ… (l'article précédé d'une particule)
        return i === 1 && 'בכל'.indexOf(p.c) >= 0;                                            // בַּ, כַּ, לַ : l'article contracté avec la particule
    }

    // Les lettres à mettre en gras dans un mot : [{ i, n, k }]. `maqafAfter` : le mot est suivi d'un maqaf (« כָּל־ »).
    function marksOf(word, maqafAfter) {
        var cls = clusters(word), out = [];
        if (!cls.length || SKIP.test(strip(word))) return out;
        var skeleton = strip(word);
        var katanWord = KATAN_RE.test(skeleton);
        var last = cls.length - 1;
        // L'araméen (Kaddich, Zohar) : après une voyelle longue le chéva y est muet (קוּדְשָׁא « koudcha », שְׁכִינְתָּא « chékhinta », רָחִיצְנָא), contrairement à l'hébreu.
        // On le reconnaît à ses terminaisons (ָא, הוֹן, ֵהּ, ַן) ; en cas de doute on ne marque rien.
        var aramaic = ARAMAIC_END.test(word);
        for (var i = 0; i <= last; i++) {
            var cl = cls[i], v = vowelOf(cl), kind = null;
            if (isMaterVav(cl)) continue;
            // 1. le daguèch dur
            if (has(cl, DAGESH) && !isMappiq(cl, i === last) && !afterArticle(cls, i)) {
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
                else if (nx && has(nx, SHVA) && katanWord && i + 1 < last) kind = 'katan';
                else if (skeleton === 'כל' && maqafAfter && i === 0) kind = 'katan';
            }
            // 3. le chéva na
            if (!kind && v === SHVA && i < last) {
                var na = false, why = '';
                if (i === 0) { na = true; why = 'debut'; }                                  // début de mot
                else if (has(cl, DAGESH) && BGDKPT.indexOf(cl.c) < 0) { na = true; why = 'dagesh'; }
                else if (has(cl, DAGESH) && i > 0 && vowelOf(cls[i - 1]) && vowelOf(cls[i - 1]) !== SHVA) { na = true; why = 'dagesh'; }
                else if (cls[i + 1] && cls[i + 1].c === cl.c) { na = true; why = 'double'; }  // première de deux lettres identiques : הַלְלוּ
                else if (vowelOf(cls[i - 1]) === SHVA) { na = true; why = 'deux'; }          // second de deux chévas de suite
                else if (!aramaic && longBefore(cls, i)) {
                    // après une voyelle longue sûre, à condition qu'au moins deux lettres suivent (sinon c'est un mot à suffixe : טוּבְךָ « touvkha »,
                    // יְמִינְךָ « yéminkha », מַלְכוּתְךָ : l'accent reste sur la voyelle longue et le chéva est muet) et qu'une voyelle y soit
                    // (une forme en « ָה » à l'accent sur l'avant-dernière syllabe — נֵלְכָה, אֵלְכָה — reste sans marque : on ne sait pas si le chéva est muet.)
                    var cohort = last - i === 2 && cls[last].c === 'ה' && !vowelOf(cls[last]) && vowelOf(cls[last - 1]) === KAMATS;
                    for (var j = i + 1; !cohort && last - i >= 2 && j <= last; j++) { var vj = vowelOf(cls[j]); if ((vj && vj !== SHVA) || isMaterVav(cls[j])) { na = true; why = 'long'; break; } }
                }
                if (na) { kind = 'na'; }
            }
            if (kind) out.push({ i: cl.i, n: cl.n, k: kind, why: kind === 'na' ? why : kind });
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
