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
// Le toucher d'un mot (dictionnaire) : `wordAt` retrouve le mot sous le doigt, `lookup` interroge le dictionnaire de la Guémara (GemaraCore, passé en argument).

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

    // Le Daf Yomi (ZmanimCore.dafYomi) range les traités dans l'ordre de ZmanimCore.MASECHTOT ; voici le traité du Talmud de Babylone de chacun (null : sans Guémara
    // ici : Chekalim est du Talmud de Jérusalem, Kinnim et Midot n'ont pas de Guémara).
    var DAF_YOMI = ['berakhot', 'shabbat', 'eruvin', 'pesachim', null, 'yoma', 'sukkah', 'beitzah', 'rosh-hashanah', 'taanit', 'megillah', 'moed-katan', 'chagigah',
        'yevamot', 'ketubot', 'nedarim', 'nazir', 'sotah', 'gittin', 'kiddushin', 'bava-kamma', 'bava-metzia', 'bava-batra', 'sanhedrin', 'makkot', 'shevuot',
        'avodah-zarah', 'horayot', 'zevachim', 'menachot', 'chullin', 'bekhorot', 'arakhin', 'temurah', 'keritot', 'meilah', null, 'tamid', null, 'niddah'];

    // Où ouvrir le Daf Yomi du jour : `daf` est le résultat de ZmanimCore.dafYomi ({ id, daf }). Un daf compte deux amoudim ; on ouvre le premier (« 58a »).
    // null si le traité n'a pas de Guémara ici. Avec l'index, on vérifie aussi que l'amoud existe et on donne son indice (`page`) ; sans l'index
    // (l'accueil ne le charge pas), `page` vaut -1 et l'écran du Talmud le calcule à l'ouverture.
    function dafYomiTarget(index, daf) {
        var id = daf ? DAF_YOMI[daf.id] : null;
        if (!id) return null;
        var label = daf.daf + 'a';
        if (!index) return { id: id, label: label, page: -1 };
        var tr = find(index, id);
        var page = tr ? pageOf(tr, label) : -1;
        return page < 0 ? null : { id: id, label: label, page: page };
    }

    // Les résumés de data/talmud/resume.json : { sedarim: { <ordre>: phrase }, tractates: { <traité>: { book: phrase, chapters: [phrase par chapitre] } } }.
    // Les trois phrases d'un amoud : celle de l'ordre, celle du traité et celle du chapitre où l'amoud commence ('' si le fichier ne la donne pas).
    // `chapter` (depuis 1) : un chapitre précis ; sinon, celui du segment 0 de l'amoud `page`.
    function summaryOf(resume, index, id, chapter) {
        var tr = find(index, id);
        var out = { seder: '', book: '', chapter: '' };
        if (!tr || !resume) return out;
        var book = (resume.tractates || {})[id];
        out.seder = (resume.sedarim || {})[tr.seder] || '';
        out.book = (book && book.book) || '';
        out.chapter = (book && book.chapters && book.chapters[chapter - 1]) || '';
        return out;
    }

    // Les titres de sugya de data/talmud/sugyot.json : { tractates: { <traité>: [ { from: "58a:1", to: "59b:5", title } ] } }. Une référence est « amoud:segment »
    // (segments comptés depuis 1) ; `from` et `to` sont inclus. Un traité n'y figure que là où des titres ont été écrits.
    function refOf(tr, ref) {
        var m = /^(\d+[ab]):(\d+)$/.exec(String(ref || ''));
        if (!m || !tr) return null;
        var page = pageOf(tr, m[1]);
        return page < 0 ? null : { page: page, seg: parseInt(m[2], 10) - 1, label: m[1] };
    }

    // Les sugyot qui touchent l'amoud d'indice `page`, dans l'ordre : [ { title, from, to, starts (segment où elle commence ici, depuis 0, ou -1 si elle vient d'avant), continues } ].
    function sugyotIn(data, tr, page) {
        var out = [];
        ((data && data.tractates && tr && data.tractates[tr.id]) || []).forEach(function (s) {
            var a = refOf(tr, s.from), z = refOf(tr, s.to);
            if (!a || !z || page < a.page || page > z.page) return;
            out.push({ title: s.title, from: a, to: z, starts: a.page === page ? a.seg : -1, continues: a.page < page });
        });
        return out;
    }

    // Les michnayot citées dans la Guémara (data/talmud/michna-ref.json, scripts/build_talmud_michna.js) :
    // { tractates: { <traité>: [ [amoud (indice), segment (depuis 0), chapitre (depuis 1), michna (depuis 1), début (1) ou reprise (0)] ] } }.
    // Les michnayot dont un segment de l'amoud `page` ouvre la citation : [ { seg, c, m, start } ] dans l'ordre du texte.
    function michnaRefIn(refs, tr, page) {
        var list = (refs && refs.tractates && tr && refs.tractates[tr.id]) || [];
        return list.filter(function (a) { return a[0] === page; }).map(function (a) { return { seg: a[1], c: a[2], m: a[3], start: a[4] === 1 }; });
    }

    // Où la michna (chapitre `c`, michna `m`, depuis 1) est citée pour la première fois dans la Guémara : { page, seg, label } ou null (elle n'y est pas citée).
    function talmudOfMishna(refs, tr, c, m) {
        var list = (refs && refs.tractates && tr && refs.tractates[tr.id]) || [];
        for (var i = 0; i < list.length; i++) {
            var a = list[i];
            if (a[2] === c && a[3] === m && a[4] === 1) return { page: a[0], seg: a[1], label: amoudLabel(tr.start, a[0]) };
        }
        return null;
    }

    // --- Le mot touché -------------------------------------------------------------------------------------------------------------------
    // Le mot hébreu ou araméen autour de la position `offset` d'un texte (la position d'un curseur : entre deux lettres) : { start, end (exclu), word } ou null
    // si on n'est pas sur un mot. Un mot est fait de lettres et de voyelles ou accents ; le maqaf et les signes de ponctuation le coupent ; les guillemets
    // et apostrophes au milieu (מ״ט, ר"י) et le geresh à la fin (גמ׳, וכו') en font partie.
    var SEPARATORS = '־׀׃׆';
    function isLetter(c) { return c >= 'א' && c <= 'ת'; }
    function isMark(c) { return c >= '֑' && c <= 'ׇ' && SEPARATORS.indexOf(c) < 0; }
    function isJoiner(c) { return c === '״' || c === '"' || c === '׳' || c === "'" || c === '’'; }
    function inWord(text, i) {
        var c = text.charAt(i);
        if (!c) return false;
        if (isLetter(c) || isMark(c)) return true;
        if (!isJoiner(c) || i === 0) return false;
        var before = text.charAt(i - 1);
        if (!(isLetter(before) || isMark(before))) return false;
        var after = text.charAt(i + 1);
        if (isLetter(after)) return true;                       // au milieu : מ״ט, ר"י
        return c === '׳' || c === "'" || c === '’';             // à la fin : גמ׳, וכו'
    }
    function wordAt(text, offset) {
        text = String(text == null ? '' : text);
        var at = offset;
        if (!inWord(text, at)) at = offset - 1;
        if (at < 0 || !inWord(text, at)) return null;
        var start = at, end = at + 1;
        while (start > 0 && inWord(text, start - 1)) start--;
        while (end < text.length && inWord(text, end)) end++;
        var word = text.slice(start, end);
        return /[א-ת]/.test(word) ? { start: start, end: end, word: word } : null;
    }

    // Ce que le dictionnaire sait d'un mot touché : { word, key, abbr, direct, moreDirect, near, guess }.
    //  - abbr : les abréviations qui s'écrivent ainsi (מ״ט), si le mot porte un guillemet ou un geresh ;
    //  - direct : les mots du dictionnaire dont c'est l'écriture ou une forme, avec ou sans préfixe collé (דהכא → הכא) ; au plus 4, `moreDirect` en compte le reste ;
    //  - near : des mots qui commencent comme lui ou qui l'ont dans une expression (au plus 2) : plus loin, à lire avec prudence ;
    //  - guess : { roots, results } quand rien ne correspond mais qu'une racine est possible (une hypothèse, jamais une certitude).
    // `G` : GemaraCore ; `norm` : la normalisation de LexiconCore (lettres seules, finales ordinaires).
    function lookup(G, norm, word) {
        var key = norm(word);
        if (!key) return null;
        var out = { word: word, key: key, abbr: [], direct: [], moreDirect: 0, near: [], guess: null };
        if (/[״"׳']/.test(word)) out.abbr = G.searchAbbreviations(word).results.filter(function (a) { return a.key === key; }).slice(0, 3);
        var found = G.search(word);
        if (found.kind === 'guess') {
            out.guess = { roots: found.roots, results: found.results.slice(0, 3) };
            return out;
        }
        var variants = [key];
        if (key.length >= 3 && G.PREFIXES.indexOf(key.charAt(0)) >= 0) variants.push(key.slice(1));
        if (key.length >= 4 && G.PREFIXES.indexOf(key.charAt(0)) >= 0 && G.PREFIXES.indexOf(key.charAt(1)) >= 0) variants.push(key.slice(2));
        var isDirect = function (e) {
            return variants.some(function (v) { return e.key === v || e.forms.some(function (f) { return norm(f) === v; }); });
        };
        var family = found.kind === 'root' ? found.family : [];
        // Le mot écrit exactement ainsi d'abord, puis ses formes et préfixes, puis le reste de la famille (le tri est stable : l'ordre du dictionnaire sinon).
        var rank = function (e) { return e.key === key ? 0 : (isDirect(e) ? 1 : 2); };
        var direct = found.results.filter(function (e) { return isDirect(e) || family.indexOf(e) >= 0; })
            .map(function (e, i) { return { e: e, r: rank(e), i: i }; })
            .sort(function (a, b) { return a.r - b.r || a.i - b.i; })
            .map(function (x) { return x.e; });
        out.direct = direct.slice(0, 4);
        out.moreDirect = Math.max(0, direct.length - 4);
        out.near = found.results.filter(function (e) { return direct.indexOf(e) < 0; }).slice(0, 2);
        return out;
    }

    return {
        tractates: tractates, find: find, rank: rank, amoudLabel: amoudLabel, pageOf: pageOf, hebrewAmoud: hebrewAmoud, dafOf: dafOf,
        chapterAt: chapterAt, chaptersStartingIn: chaptersStartingIn, step: step, isHadran: isHadran, dafYomiTarget: dafYomiTarget, DAF_YOMI: DAF_YOMI, wordAt: wordAt, lookup: lookup, summaryOf: summaryOf, refOf: refOf, sugyotIn: sugyotIn, michnaRefIn: michnaRefIn, talmudOfMishna: talmudOfMishna,
        hebrewNumber: M.hebrewNumber, maskIds: M.maskIds, parseComment: M.parseComment, stripMarks: M.stripMarks
    };
}));
