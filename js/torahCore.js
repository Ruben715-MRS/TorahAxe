// =========================================================================
// === HISTORIAXE — TORAH EN HÉBREU (décodage et chargement à la demande, sans DOM) ===
// =========================================================================
// Lit data/torah/torah.json, produit par scripts/build_torah.js (format v1 : voir ce fichier).
// Le texte n'est téléchargé que lorsqu'un écran le demande : `load()` lance le téléchargement une
// seule fois et garde la promesse. En cas d'échec (hors ligne, réseau coupé), la promesse est
// oubliée, pour qu'un nouvel essai soit possible.
//
// Trois modes d'affichage, dérivés du même texte (aucune donnée supplémentaire) :
//  - 'full'        : voyelles et cantillation (te'amim) ;
//  - 'vowels'      : voyelles, sans cantillation ;
//  - 'consonants'  : lettres seules ; le maqaf, le paseq, le sof pasuk et le nun hafukha sont gardés.
//
// Contrat : `decode` rend exactement les blocs de la source tikkun.io (texte, versets, aliyot,
// petuchot). Une petucha reçoit de nouveau son marqueur « #(פ) » en fin de bloc, comme dans la source.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else root.TorahCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var DEFAULT_URL = 'data/torah/torah.json';
    var FORMAT_VERSIONS = [1, 2];
    // Séparateurs du champ « t » (voir scripts/build_torah.js) : absents du texte hébreu.
    var BLOCK_SEP = '\n';
    var LINE_SEP = '\u000b';
    var SEG_SEP = '\t';
    var PETUCHA_TOKEN = '#(פ)';
    var MODES = ['full', 'vowels', 'consonants'];
    var READINGS = ['qere', 'ketiv'];

    var CANTILLATION = /[֑-֯]/g;          // te'amim
    var MARKS = /[֑-ׇ]/g;                 // voyelles, cantillation, ponctuation hébraïque
    var KEEP_IN_CONSONANTS = { '־': true, '׀': true, '׃': true, '׆': true }; // maqaf, paseq, sof pasuk, nun hafukha

    // Texte d'un segment dans le mode demandé. Chaque caractère est traité isolément : on peut
    // donc appliquer la fonction à un segment, une ligne ou un bloc entier.
    function stripMarks(text, mode) {
        if (mode === undefined || mode === 'full') return text;
        if (mode === 'vowels') return text.replace(CANTILLATION, '');
        if (mode === 'consonants') {
            return text.replace(MARKS, function (c) { return KEEP_IN_CONSONANTS[c] ? c : ''; });
        }
        throw new Error('Torah : mode inconnu « ' + mode + ' »');
    }

    // Transforme le format compact en blocs au format de la source.
    function decode(compact) {
        if (!compact || FORMAT_VERSIONS.indexOf(compact.v) < 0) throw new Error('Torah : version de format inconnue');
        var texts = compact.t.split(BLOCK_SEP);
        if (texts.length !== compact.n) throw new Error('Torah : nombre de blocs incohérent');
        if (compact.vs.length % 4 !== 0 || compact.a.length % 3 !== 0) throw new Error('Torah : index mal formé');

        var blocks = new Array(texts.length);
        for (var i = 0; i < texts.length; i++) {
            blocks[i] = { text: null, verses: [], aliyot: [], isPetucha: false };
        }
        compact.p.forEach(function (idx) { blocks[idx].isPetucha = true; });

        var cur = 0;
        for (var k = 0; k < compact.vs.length; k += 4) {
            cur += compact.vs[k];
            blocks[cur].verses.push({ book: compact.vs[k + 1], chapter: compact.vs[k + 2], verse: compact.vs[k + 3] });
        }
        cur = 0;
        for (var j = 0; j < compact.a.length; j += 3) {
            cur += compact.a[j];
            var item = {};
            if (compact.a[j + 1] !== -1) item.standard = compact.a[j + 1];
            if (compact.a[j + 2] !== -1) item.double = compact.a[j + 2];
            blocks[cur].aliyot.push(item);
        }
        for (var b = 0; b < blocks.length; b++) {
            var raw = texts[b] + (blocks[b].isPetucha ? PETUCHA_TOKEN : '');
            blocks[b].text = raw.split(LINE_SEP).map(function (line) { return line.split(SEG_SEP); });
        }
        // Pages de la source : [{ start, end }] (fin exclue). Non énumérable, pour que les comparaisons JSON restent inchangées.
        var pages = (compact.pg || [0]).map(function (start, k, all) {
            return { start: start, end: k + 1 < all.length ? all[k + 1] : blocks.length };
        });
        Object.defineProperty(blocks, 'pages', { value: pages, enumerable: false });
        return blocks;
    }

    // Ketiv / qere : dans la source, « mot écrit#[lecture] » (33 cas). Le qere est ce qu'on lit,
    // le ketiv ce qui est écrit. Le crochet remplace le mot qui le précède dans le même segment.
    var KETIV_QERE = /\S*#\[([^\]]*)\]/g;
    function applyReading(text, reading) {
        if (reading === 'ketiv') return text.replace(/(\S*)#\[[^\]]*\]/g, '$1');
        if (reading === undefined || reading === 'qere') return text.replace(KETIV_QERE, '$1');
        throw new Error('Torah : lecture inconnue « ' + reading + ' »');
    }

    // Marques de la source qui ne sont pas du texte : le nun hafukha s'écrit « (׆) » ou « #(׆) »
    // (on garde le caractère), et un « # » isolé précède certains mots (on le retire).
    function cleanMarks(text) {
        return text.replace(/#?\(׆\)/g, '׆').replace(/#/g, '');
    }

    // Texte d'un segment prêt à afficher : lecture choisie, marques nettoyées, puis voyelles selon le mode.
    function segmentText(seg, opts) {
        var text = cleanMarks(applyReading(seg, opts.reading));
        return stripMarks(text, opts.vowels);
    }

    // Lignes d'un bloc, prêtes à afficher. `opts` : { vowels: 'full'|'vowels'|'consonants', reading: 'qere'|'ketiv' }
    // (par défaut : voyelles complètes, lecture qere). Le marqueur de petucha n'est pas du texte : il est retiré
    // (le bloc garde son drapeau isPetucha). Les segments d'une ligne se raccordent sans séparateur.
    function blockLines(block, opts) {
        if (typeof opts === 'string') opts = { vowels: opts }; // compatibilité : un simple mode
        opts = opts || {};
        return block.text.map(function (segments) {
            return segments.map(function (seg) {
                return segmentText(seg.split(PETUCHA_TOKEN).join(''), opts);
            }).join('');
        });
    }

    // Index des chapitres : pour chaque chapitre (livre, chapitre), le premier bloc qui porte un de ses versets,
    // et le bloc où commence le suivant (fin exclue). Une ligne de la source n'est pas découpée au verset : le bloc
    // appartient au chapitre dont un verset y commence en dernier. Renvoie [{ book, chapter, start, end }] dans l'ordre.
    function chapterIndex(blocks) {
        var chapters = [];
        var seen = {};
        blocks.forEach(function (block, i) {
            block.verses.forEach(function (v) {
                var key = v.book + ':' + v.chapter;
                if (seen[key]) return;
                seen[key] = true;
                chapters.push({ book: v.book, chapter: v.chapter, start: i, end: blocks.length });
            });
        });
        for (var k = 0; k + 1 < chapters.length; k++) chapters[k].end = chapters[k + 1].start;
        return chapters;
    }

    // Index verset → bloc : « livre:chapitre:verset » → index du bloc où le verset commence.
    function verseBlockIndex(blocks) {
        var map = {};
        blocks.forEach(function (block, i) {
            block.verses.forEach(function (v) {
                var key = v.book + ':' + v.chapter + ':' + v.verse;
                if (!(key in map)) map[key] = i;
            });
        });
        return map;
    }

    // Découpe la Torah en paracha. `starts` : [{ book, c, v }] dans l'ordre de la Torah (le premier verset de chaque paracha).
    // Chaque paracha va du bloc de son premier verset jusqu'au bloc de la suivante (fin exclue). Renvoie [{ index, start, end }].
    // Lève une erreur si un verset n'existe pas dans le texte.
    function parashaRanges(blocks, starts) {
        var map = verseBlockIndex(blocks);
        var ranges = starts.map(function (s, k) {
            var key = s.book + ':' + s.c + ':' + s.v;
            if (!(key in map)) throw new Error('Torah : verset de paracha introuvable (' + key + ')');
            return { index: k, start: map[key], end: blocks.length };
        });
        for (var k = 0; k + 1 < ranges.length; k++) {
            ranges[k].end = ranges[k + 1].start;
            if (ranges[k].end < ranges[k].start) throw new Error('Torah : parachiot dans le désordre');
        }
        return ranges;
    }

    // --- Rendu façon tikkun.io (akivajgordon/tikkun.io, MIT : src/text-filter.ts, src/hebrew-numeral.ts,
    //     src/display-range.ts, src/view-model/aliyah-labeller.ts) ---------------------------------------------------

    var NUN = '׆'; // nun hafukha, « ׆ »

    // Vue « ketiv » (annotations activées) : le qere est entre accolades (surligné), le ketiv est retiré.
    function ketivText(text) {
        var t = text.replace('#(פ)', '')
            .replace('(' + NUN + ')#', NUN + ' ')
            .replace('#(' + NUN + ')', ' ' + NUN);
        t = t.split(' ').map(function (mot) {
            return mot.split('־').map(function (word) {
                var parts = word.split('#');
                return parts.length <= 1 ? parts[0] : parts.slice(1);
            }).join('־');
        }).join(' ');
        return t.replace(/\[/g, '{').replace(/\]/g, '}');
    }

    // Vue « sans voyelles » (annotations désactivées) : les consonnes du ketiv seul.
    function kriText(text) {
        return text.replace('#(פ)', '')
            .replace('(' + NUN + ')#', NUN + ' ')
            .replace('#(' + NUN + ')', ' ' + NUN)
            .replace(/־/g, ' ')
            .replace(/#\[.+?\]/g, ' ')
            .replace(new RegExp('[^א-ת\\s' + NUN + ']', 'g'), '')
            .replace(/\s{2,}/g, ' ');
    }

    var HEB_LETTERS = [[400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'], [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'],
        [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'], [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'], [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א']];

    // Nombre en lettres hébraïques (15 et 16 s'écrivent טו et טז, pas יה et יו).
    function hebrewNumeral(n) {
        if (n <= 0) return '';
        if (n === 15) return 'טו';
        if (n === 16) return 'טז';
        for (var i = 0; i < HEB_LETTERS.length; i++) {
            if (n >= HEB_LETTERS[i][0]) return HEB_LETTERS[i][1] + hebrewNumeral(n - HEB_LETTERS[i][0]);
        }
        return '';
    }

    // Étiquette de versets d'une ligne : « א:א » pour un premier verset (chapitre et verset), « כא-כב » pour une plage.
    function versesRangeLabel(verses) {
        if (!verses.length) return '';
        var labels = verses.map(function (v) {
            var parts = [];
            if (v.verse === 1) parts.push(hebrewNumeral(v.chapter));
            parts.push(hebrewNumeral(v.verse));
            return parts.join(':');
        });
        return labels.length === 1 ? labels[0] : labels[0] + '-' + labels[labels.length - 1];
    }

    var ALIYAH_ORDINALS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'ששי', 'שביעי'];
    // La source compte les aliyot 1 à 7, puis le maftir sous le numéro 8.
    function aliyahStartName(n, parashaHe) {
        if (n === 8) return 'מפטיר';
        if (n === 1) return parashaHe;
        return ALIYAH_ORDINALS[n - 1] || '';
    }
    function aliyahEndName(n) {
        if (n === 8) return 'מפטיר';
        return ALIYAH_ORDINALS[n - 1] || '';
    }

    // Étiquettes d'aliyot par bloc, pour la paracha des blocs [start, end). Renvoie { indexDeBloc: [étiquettes] }.
    // Une aliyah commence au premier verset de son bloc ; elle finit au verset qui précède la suivante.
    // Une étiquette « סוף … » suit la fin d'une aliyah, comme dans tikkun.io (aliyah-labeller.ts).
    function aliyahLabels(blocks, start, end, parashaHe) {
        var verses = [];
        var position = {};
        for (var b = start; b < end; b++) {
            blocks[b].verses.forEach(function (v) {
                var key = v.book + ':' + v.chapter + ':' + v.verse;
                if (!(key in position)) position[key] = verses.length;
                verses.push({ key: key, block: b });
            });
        }
        var aliyot = [];
        for (var c = start; c < end; c++) {
            var first = blocks[c].verses[0];
            if (!first) continue;
            blocks[c].aliyot.forEach(function (a) {
                if (a.standard !== undefined) {
                    aliyot.push({ n: a.standard, pos: position[first.book + ':' + first.chapter + ':' + first.verse] });
                }
            });
        }
        var startsAt = {};
        var endsAt = {};
        aliyot.forEach(function (a, k) {
            (startsAt[a.pos] = startsAt[a.pos] || []).push(a.n);
            var last = k + 1 < aliyot.length ? aliyot[k + 1].pos - 1 : verses.length - 1;
            endsAt[last] = a.n;
        });
        var out = {};
        var previousEnd = null;
        verses.forEach(function (v, i) {
            var starts = startsAt[i] || [];
            var labels = starts.map(function (n) { return aliyahStartName(n, parashaHe); });
            if (previousEnd !== null) {
                var fin = 'סוף ' + aliyahEndName(previousEnd);
                if (starts.length === 0 || starts.indexOf(previousEnd + 1) < 0) labels.push(fin);
            }
            previousEnd = endsAt.hasOwnProperty(i) ? endsAt[i] : null;
            if (labels.length) (out[v.block] = out[v.block] || []).push.apply(out[v.block], labels);
        });
        return out;
    }

    // Paraschiyot de la semaine. `calendar` : { sabbaths: { 'AAAA-MM-JJ': [indices de parashot.json] } }, un samedi par clé.
    // Renvoie les indices du prochain samedi à partir de `date` (le jour même compte), ou null si le calendrier ne va pas jusque-là.
    function parashaForDate(calendar, date) {
        if (!calendar || !calendar.sabbaths) return null;
        var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
        var pad = function (n) { return n < 10 ? '0' + n : String(n); };
        var key = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        return calendar.sabbaths[key] || null;
    }

    // Chargeur : `fetchFn(url)` doit renvoyer une réponse façon fetch. Renvoie une fonction `load()`
    // qui résout vers les blocs décodés ; le téléchargement n'a lieu qu'au premier appel.
    function createLoader(fetchFn, url) {
        var pending = null;
        return function load() {
            if (pending) return pending;
            pending = Promise.resolve()
                .then(function () { return fetchFn(url || DEFAULT_URL); })
                .then(function (res) {
                    if (!res || !res.ok) throw new Error('Torah : HTTP ' + (res ? res.status : 'sans réponse'));
                    return res.json();
                })
                .then(decode)
                .catch(function (err) {
                    pending = null; // hors ligne ou erreur : un nouvel appel retentera le téléchargement
                    throw err;
                });
            return pending;
        };
    }

    var defaultLoad = null;
    // Chargeur partagé de l'app : utilise le fetch global, au premier appel seulement.
    function load() {
        if (!defaultLoad) defaultLoad = createLoader(function (u) { return fetch(u); });
        return defaultLoad();
    }

    return {
        DEFAULT_URL: DEFAULT_URL,
        MODES: MODES,
        READINGS: READINGS,
        PETUCHA_TOKEN: PETUCHA_TOKEN,
        stripMarks: stripMarks,
        decode: decode,
        blockLines: blockLines,
        chapterIndex: chapterIndex,
        verseBlockIndex: verseBlockIndex,
        parashaForDate: parashaForDate,
        ketivText: ketivText,
        kriText: kriText,
        hebrewNumeral: hebrewNumeral,
        versesRangeLabel: versesRangeLabel,
        aliyahLabels: aliyahLabels,
        parashaRanges: parashaRanges,
        segmentText: segmentText,
        createLoader: createLoader,
        load: load
    };
});
