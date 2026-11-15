// =========================================================================
// === HISTORIAXE — DICTIONNAIRE FRANÇAIS – ARAMÉEN (GUÉMARA) (recherche, sans DOM) ===
// =========================================================================
// La recherche dans les deux sens, sur les entrées de js/gemaraData.js (voir js/app/gemara.js pour l'écran). Le moteur reprend les règles du
// dictionnaire hébreu (js/lexiconCore.js, dont il emprunte la normalisation) avec quatre différences propres à l'araméen talmudique :
//  - Les préfixes : le ד (« qui, de ») est le préfixe le plus courant de la Guémara ; il s'ajoute à ceux de l'hébreu (ו ה ב ל כ מ ש) :
//    דהכא trouve הָכָא, ואמר trouve אָמַר. Ils ne sont retirés que si le mot tel quel ne donne rien (דינא n'est pas « ד » + « ינא »).
//  - Les formes : il n'existe pas de texte lemmatisé libre du Talmud ; les formes écrites (אמרינן, אימא…) sont donc écrites à la main dans chaque
//    entrée (champ « formes » de scripts/gemara/entries.tsv) et forment l'index des formes, comme js/lexiconForms.js pour la Bible.
//  - Le repli par la racine : quand aucun mot ni aucune forme écrite ne correspond, `guessRoots` retire les préfixes et les terminaisons verbales
//    (י נ ת א מ…, ו י ה ת נן ין…) et les lettres faibles (ו י א) pour proposer des racines : אזלינן → אזל, קמו → קום, איתעביד → עבד. Le résultat est
//    `{ kind: 'guess' }` : une hypothèse, annoncée comme telle, qui ne remplace jamais un mot trouvé.
//  - Les expressions : une entrée peut compter plusieurs mots (מַאי טַעְמָא) ; on la trouve aussi en tapant un seul de ses mots (טעמא).
//  - Les abréviations (ת״ר, מ״ט…) forment un second jeu d'entrées, avec leur propre recherche (`searchAbbreviations`) : on tape le sigle avec ou sans
//    guillemet (מ״ט, מ"ט, מט), son développé (קל וחומר) ou un de ses mots, ou la traduction en français. Les sigles ambigus (ר״י…) en sont absents.
//  - Les sages (Tannaïm, Amoraïm d'Israël et de Babylonie) forment un troisième jeu d'entrées (`searchSages`) : on tape le nom en français (avec ses autres
//    graphies : Akiba, Rachbi, Resh Lakish…) ou en hébreu, avec ou sans le titre (רבי, רב, רבן : « עקיבא » trouve רַבִּי עֲקִיבָא), ou un mot de la
//    biographie (« Michna »), ou leur sigle (ר״ע, ר״י : plusieurs maîtres si le sigle est ambigu). Les maîtres et disciples cités qui ont leur fiche deviennent
//    des liens (`sageByName`). Les sigles de sages sont aussi des abréviations (catégorie « sages », champ `sages`) : ils renvoient à leurs fiches.
//  - Les paliers (1 essentiel, 2 courant, 3 spécialisé) remplacent les niveaux de fréquence dans la Torah : on ne dispose pas de comptes fiables,
//    c'est un classement éditorial. Les catégories (question, réponse, mot de liaison, source, raisonnement, droit) servent de second filtre.
// Les entrées sont rangées dans l'ordre du fichier de données : à score égal, la première passe avant.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory(require('./lexiconCore.js'), require('./gemaraData.js'));
    else root.GemaraCore = factory(root.LexiconCore, root.GemaraData);
})(typeof self !== 'undefined' ? self : this, function (Lexicon, Data) {
    'use strict';

    var normalizeHebrew = Lexicon.normalizeHebrew;
    var normalizeFrench = Lexicon.normalizeFrench;
    var hasHebrew = Lexicon.hasHebrew;

    var PREFIXES = 'ודבהלכמש';
    var MAX_RESULTS = 200;
    var CATEGORIES = Data.CATEGORIES.slice();
    // Les catégories propres à un traité (Chabbat, Pessahim…) et celles qui servent partout : le filtre les range en deux groupes.
    var TREATISE_CATEGORIES = Data.TREATISE_CATEGORIES.slice();
    // Les catégories par thème (l'agriculture et la Terre d'Israël : Zeraïm) : ni une fonction ni un traité de la Guémara.
    var THEME_CATEGORIES = Data.THEME_CATEGORIES.slice();
    var FUNCTION_CATEGORIES = CATEGORIES.filter(function (c) { return TREATISE_CATEGORIES.indexOf(c) < 0 && THEME_CATEGORIES.indexOf(c) < 0; });
    var TIERS = [1, 2, 3];
    var ABBR_CATEGORIES = Data.ABBR_CATEGORIES.slice();
    var SAGE_GROUPS = Data.SAGE_GROUPS.slice();
    var TITLES = ['רבי', 'רבן', 'רב'];      // les titres : retirés du nom pour qu'on trouve un sage sans eux

    var ENTRIES = Data.ENTRIES.map(function (e, i) {
        var key = normalizeHebrew(e[0]);
        return {
            id: i, he: e[0], tr: e[1], cat: e[2], fr: e[3], root: e[4], origin: e[5], note: e[6] || null,
            forms: e[7] ? e[7].split(' ') : [], heb: e[8] || null, tier: e[9],
            key: key, rootKey: e[4] ? normalizeHebrew(e[4]) : null,
            // Les mots d'une expression, sans voyelles : « מאי טעמא » → [« מאי », « טעמא »].
            wordKeys: e[0].split(/[\s־]+/).map(normalizeHebrew).filter(Boolean),
            frKeys: e[3].map(normalizeFrench)
        };
    });

    // Les grilles de conjugaison (js/gemaraData.js, CONJUGATIONS) : 12 cases par verbe, rangées dans CONJUGATION_ROWS (de quoi les afficher). Les écritures
    // d'une grille sont aussi des formes du verbe : on les retrouve par la recherche, comme les formes saisies à la main.
    var CONJUGATION_ROWS = [
        { group: 'past', rows: ['p3ms', 'p3pl', 'p2ms', 'p1s', 'p1pl'] },
        { group: 'participle', rows: ['ms', 'fs', 'pl'] },
        { group: 'future', rows: ['fut', 'jus'] },
        { group: 'imperative', rows: ['imp'] },
        { group: 'infinitive', rows: ['inf'] }
    ];
    var CONJUGATION_CELLS = CONJUGATION_ROWS.reduce(function (all, g) { return all.concat(g.rows); }, []);
    (Data.CONJUGATIONS || []).forEach(function (c) {
        var entry = ENTRIES.filter(function (e) { return e.he === c[0]; })[0];
        if (!entry) return;
        entry.conj = {};
        CONJUGATION_CELLS.forEach(function (cell, i) {
            var form = c[1][i];
            entry.conj[cell] = form || null;
            if (form && entry.forms.indexOf(form) === -1 && normalizeHebrew(form) !== entry.key) entry.forms.push(form);
        });
    });

    // Les abréviations : le sigle sans guillemet (clé de recherche), les mots du développé, et le mot lié du dictionnaire (ou null).
    var ABBREVIATIONS = Data.ABBREVIATIONS.map(function (a, i) {
        return {
            id: i, sigle: a[0], full: a[1], tr: a[2], fr: a[3], cat: a[4], wordKey: a[5] || null, note: a[6] || null,
            // Les sages que le sigle désigne (noms français) : plusieurs = sigle ambigu, dont le sens dépend du passage.
            sages: a[7] || [], ambiguous: (a[7] || []).length > 1,
            key: normalizeHebrew(a[0]),
            wordKeys: a[1].split(/[\s־]+/).map(normalizeHebrew).filter(Boolean),
            frKeys: a[3].map(normalizeFrench)
        };
    });

    // Les sages : le nom hébreu sans voyelles (clé), sans son titre (clé nue), et les mots du nom ; les noms français (nom usuel, autres graphies,
    // transcription) et les mots de la biographie pour la recherche en français. L'ordre du fichier est chronologique.
    function stripTitle(key) {
        for (var i = 0; i < TITLES.length; i++) {
            if (key.indexOf(TITLES[i]) === 0 && key.length > TITLES[i].length + 1) return key.slice(TITLES[i].length);
        }
        return key;
    }
    var SAGES = Data.SAGES.map(function (a, i) {
        var key = normalizeHebrew(a[0]);
        var names = [a[2]].concat(a[3], [a[1]]);
        return {
            id: i, he: a[0], tr: a[1], name: a[2], aliases: a[3], grp: a[4], period: a[5], masters: a[6], disciples: a[7], bio: a[8], fame: a[9],
            key: key, bareKey: stripTitle(key),
            wordKeys: a[0].split(/[\s־]+/).map(normalizeHebrew).filter(Boolean),
            frKeys: names.map(normalizeFrench),
            bioWords: normalizeFrench(a[8]).split(' ')
        };
    });

    // Les sigles par lesquels un sage est désigné (ר״ע pour Rabbi Akiva), et, pour un sigle, les fiches des sages qu'il peut désigner.
    SAGES.forEach(function (a) {
        a.sigles = ABBREVIATIONS.filter(function (b) { return b.sages.indexOf(a.name) >= 0; });
        a.sigleKeys = a.sigles.map(function (b) { return b.key; });
    });

    // Le sage qui porte ce nom français (nom usuel), ou null : sert aux liens des maîtres et des disciples.
    function sageByName(name) {
        var q = normalizeFrench(name);
        return SAGES.find(function (x) { return normalizeFrench(x.name) === q; }) || null;
    }

    function entryById(id) { return ENTRIES[id] || null; }

    // Les fiches des sages qu'une abréviation désigne (vide pour une abréviation ordinaire).
    function sagesOf(abbr) { return (abbr && abbr.sages || []).map(sageByName).filter(Boolean); }

    // Le mot du dictionnaire auquel renvoie une abréviation (écriture sans voyelles, sans espace), ou null.
    function wordOf(abbr) {
        if (!abbr || !abbr.wordKey) return null;
        return ENTRIES.find(function (e) { return e.key.replace(/\s/g, '') === abbr.wordKey; }) || null;
    }

    // Tous les mots d'une racine (écrite avec ou sans voyelles), dans l'ordre du dictionnaire.
    function family(rootText) {
        var key = normalizeHebrew(rootText);
        if (!key) return [];
        return ENTRIES.filter(function (e) { return e.rootKey === key; });
    }

    // Les écritures possibles d'un mot sans ses préfixes : lui-même, puis privé d'une ou de deux lettres de préfixe (il reste au moins deux lettres).
    function prefixVariants(key) {
        var out = [key];
        if (key.length >= 3 && PREFIXES.indexOf(key.charAt(0)) >= 0) out.push(key.slice(1));
        if (key.length >= 4 && PREFIXES.indexOf(key.charAt(0)) >= 0 && PREFIXES.indexOf(key.charAt(1)) >= 0) out.push(key.slice(2));
        return out;
    }

    // L'index des formes : une écriture (consonnes seules) → les mots dont elle est une forme, dans l'ordre du dictionnaire.
    var formIndexCache = null;
    function formIndex() {
        if (formIndexCache) return formIndexCache;
        formIndexCache = {};
        ENTRIES.forEach(function (e) {
            e.forms.forEach(function (f) {
                var k = normalizeHebrew(f);
                if (!k) return;
                var list = (formIndexCache[k] = formIndexCache[k] || []);
                if (list.indexOf(e) === -1) list.push(e);
            });
        });
        return formIndexCache;
    }

    // Le repli par la racine. Les racines connues (celles des entrées), puis les morphèmes qu'on peut retirer d'une forme écrite sans voyelles.
    var rootIndexCache = null;
    function rootIndex() {
        if (rootIndexCache) return rootIndexCache;
        rootIndexCache = {};
        ENTRIES.forEach(function (e) {
            if (!e.rootKey || e.rootKey.length !== 3) return;
            (rootIndexCache[e.rootKey] = rootIndexCache[e.rootKey] || []).push(e);
        });
        return rootIndexCache;
    }
    // Préfixes de conjugaison (futur י נ ת א, participe מ, passif et dérivés אית את אשת הת…) et terminaisons (pluriel, féminin, personnes, pronoms
    // compléments : אמרינהו). Écrits avec voyelles ou non, ils sont ramenés à l'écriture sans voyelles, finales ordinaires.
    var VERB_PREFIXES = ['', 'קא', 'י', 'נ', 'ת', 'א', 'מ', 'לי', 'ל', 'אי', 'את', 'אית', 'אשת', 'אישת', 'הת', 'ית', 'נת', 'תת', 'מת', 'הו'].map(normalizeHebrew);
    var VERB_SUFFIXES = ['', 'ו', 'י', 'ה', 'ת', 'תי', 'נא', 'נן', 'ינן', 'ין', 'ן', 'ים', 'ות', 'תו', 'תון', 'ינא', 'ית', 'ך', 'יה', 'יהו', 'הו', 'נהו', 'ינהו', 'ינהי', 'ינון', 'תא', 'תיה', 'תיהו', 'תינהו', 'תן'].map(normalizeHebrew);
    var WEAK = 'יוא';

    // Les racines de trois lettres qu'un radical (une forme dépouillée de ses préfixes et terminaisons) peut cacher, avec un coût (plus il est bas, plus
    // l'hypothèse est simple) : le radical lui-même ; sans une lettre faible intercalée (עביד → עבד) ; avec une lettre faible rendue (קמ → קום, חז → חזי).
    function coreRoots(core) {
        var out = [];
        // Une racine qui commence par א prend un י au futur (ניזיל = נ + איזל : אזל) ; le ת des formes en אשת- s'intercale après une sifflante (אשתכח = שכח).
        var variants = [core];
        if (core.length >= 3 && core.charAt(0) === 'י') variants.push('א' + core.slice(1));
        if (core.length >= 4 && 'שסצז'.indexOf(core.charAt(0)) >= 0 && core.charAt(1) === 'ת') variants.push(core.charAt(0) + core.slice(2));
        variants.forEach(function (v) { coreRootsOf(v, out); });
        return out;
    }
    function coreRootsOf(core, out) {
        function add(r, cost) { if (r.length === 3) out.push({ root: r, cost: cost }); }
        var n = core.length, i;
        if (n === 3) add(core, 0);
        if (n === 2) {
            'יהאו'.split('').forEach(function (w) { add(core + w, 1); });
            'וי'.split('').forEach(function (w) { add(core.charAt(0) + w + core.charAt(1), 1); });
            add('א' + core, 1);
            add('י' + core, 2);
            add('נ' + core, 2);
        }
        if (n === 4) {
            for (i = 1; i < 4; i++) if (WEAK.indexOf(core.charAt(i)) >= 0) add(core.slice(0, i) + core.slice(i + 1), 1);
            if ('אהמנתי'.indexOf(core.charAt(0)) >= 0) add(core.slice(1), 1);
        }
        if (n === 5) {
            for (i = 1; i < 5; i++) {
                if (WEAK.indexOf(core.charAt(i)) < 0) continue;
                var rest = core.slice(0, i) + core.slice(i + 1);
                for (var j = 1; j < 4; j++) if (WEAK.indexOf(rest.charAt(j)) >= 0) add(rest.slice(0, j) + rest.slice(j + 1), 2);
            }
        }
    }

    // Les racines (parmi celles du dictionnaire) que cette forme peut venir de, de la plus simple à la plus lointaine : [{ root, cost }]. Vide si aucune.
    function guessRoots(text) {
        var key = normalizeHebrew(text);
        if (!key || key.length < 3) return [];
        var known = rootIndex();
        var found = {};
        // Chaque préfixe de mot (ד ו ה ב ל כ מ ש) retiré compte une unité ; chaque préfixe et chaque terminaison verbale aussi.
        prefixVariants(key).forEach(function (variant, vi) {
            VERB_PREFIXES.forEach(function (p, pi) {
                if (p && variant.indexOf(p) !== 0) return;
                VERB_SUFFIXES.forEach(function (suf, si) {
                    var core = variant.slice(p.length);
                    if (suf) {
                        if (core.length - suf.length < 2 || core.slice(core.length - suf.length) !== suf) return;
                        core = core.slice(0, core.length - suf.length);
                    }
                    coreRoots(core).forEach(function (c) {
                        if (!known[c.root]) return;
                        var cost = c.cost + vi + (p ? 1 : 0) + (suf ? 1 : 0);
                        if (found[c.root] === undefined || cost < found[c.root]) found[c.root] = cost;
                    });
                });
            });
        });
        var all = Object.keys(found).map(function (r) { return { root: r, cost: found[r] }; }).sort(function (a, b) { return a.cost - b.cost || (a.root < b.root ? -1 : 1); });
        // Les hypothèses bien plus lointaines que la meilleure ne sont que du bruit.
        return all.filter(function (g) { return g.cost <= all[0].cost + 1; });
    }

    function searchAramaic(text) {
        var key = normalizeHebrew(text);
        if (!key) return { kind: 'empty', results: [] };
        var fam = key.length === 3 ? family(key) : [];
        var rootHit = fam.length > 0;
        // Chaque mot garde sa meilleure raison d'être là : { entry, score, form }.
        var best = {};
        function offer(entry, score, viaForm) {
            var current = best[entry.id];
            if (!current || score > current.score) best[entry.id] = { entry: entry, score: score, form: viaForm };
        }
        ENTRIES.forEach(function (e) {
            if (e.key === key) offer(e, 100, false);
            else if (key.length >= 2 && e.key.indexOf(key) === 0) offer(e, 50, false);
            // Un mot d'une expression (le premier est déjà couvert par le début de l'écriture) : « טעמא » → מַאי טַעְמָא.
            else if (e.wordKeys.length > 1 && e.wordKeys.indexOf(key) > 0) offer(e, 60, false);
        });
        if (!rootHit) {
            var index = formIndex();
            (index[key] || []).forEach(function (e) { offer(e, 90, true); });
            // Sans les préfixes : le mot entier (95), ou une de ses formes (85). Seule l'écriture exacte d'un mot empêche de couper un préfixe.
            var exact = Object.keys(best).some(function (id) { return best[id].score >= 100; });
            if (!exact) {
                var variants = prefixVariants(key).slice(1);
                var whole = false;
                variants.forEach(function (v, i) {
                    ENTRIES.forEach(function (e) { if (e.key === v) { offer(e, 95 - i, false); whole = true; } });
                });
                if (!whole) variants.forEach(function (v, i) { (index[v] || []).forEach(function (e) { offer(e, 85 - i, true); }); });
            }
        }
        var scored = Object.keys(best).map(function (id) { return best[id]; });
        scored.sort(function (a, b) { return b.score - a.score || a.entry.id - b.entry.id; });
        var kept = scored.slice(0, MAX_RESULTS);
        var results = kept.map(function (s) { return s.entry; });
        if (rootHit) {
            var seen = {};
            fam.forEach(function (e) { seen[e.id] = true; });
            return { kind: 'root', root: fam[0].root, family: fam, results: fam.concat(results.filter(function (e) { return !seen[e.id]; })) };
        }
        // Rien ne correspond : on tente le repli par la racine (une hypothèse : au plus trois racines, les verbes d'abord dans chaque famille).
        if (!results.length) {
            var guessed = guessRoots(key).slice(0, 3);
            if (guessed.length) {
                var index = rootIndex();
                var list = [];
                guessed.forEach(function (g) {
                    index[g.root].slice().sort(function (a, b) { return (b.key === g.root) - (a.key === g.root) || (b.cat === 'verbe') - (a.cat === 'verbe') || a.id - b.id; }).forEach(function (e) {
                        if (list.indexOf(e) === -1) list.push(e);
                    });
                });
                return { kind: 'guess', roots: guessed.map(function (g) { return g.root; }), results: list.slice(0, MAX_RESULTS) };
            }
        }
        return { kind: 'aramaic', results: results, formHits: kept.filter(function (s) { return s.form; }).map(function (s) { return s.entry; }) };
    }

    function searchFrench(text) {
        var q = normalizeFrench(text);
        if (!q) return { kind: 'empty', results: [] };
        var scored = [];
        ENTRIES.forEach(function (e) {
            var score = 0;
            e.frKeys.forEach(function (g, i) {
                var s = 0;
                var words = g.split(' ');
                if (g === q) s = i === 0 ? 100 : 90;
                else if (words.indexOf(q) >= 0 || (' ' + g + ' ').indexOf(' ' + q + ' ') >= 0) s = 70;   // le mot, ou l'expression, dans une traduction : « il a dit », « a fortiori »
                else if (g.indexOf(q) === 0) s = 60;                     // un début de traduction : « rais » → « raisonnement »
                else if (q.length >= 3 && words.some(function (w) { return w.indexOf(q) === 0; })) s = 40;
                score = Math.max(score, s);
            });
            if (score) scored.push({ entry: e, score: score });
        });
        scored.sort(function (a, b) { return b.score - a.score || a.entry.id - b.entry.id; });
        return { kind: 'french', results: scored.slice(0, MAX_RESULTS).map(function (s) { return s.entry; }) };
    }

    // Un des mots d'un développé, avec ou sans le préfixe collé (« וחומר » se trouve aussi par « חומר » ; il reste au moins trois lettres).
    function hasWord(wordKeys, key) {
        return wordKeys.some(function (w) { return w === key || (w.length >= 4 && PREFIXES.indexOf(w.charAt(0)) >= 0 && w.slice(1) === key); });
    }

    // La recherche d'une abréviation : par le sigle (100 : exact ; 50 : début), par un mot du développé (60), ou par la traduction (comme searchFrench).
    function searchAbbreviations(text) {
        var s = String(text == null ? '' : text).trim();
        if (!s) return { kind: 'all', results: ABBREVIATIONS.slice() };
        var scored = [];
        if (hasHebrew(s)) {
            var key = normalizeHebrew(s);
            ABBREVIATIONS.forEach(function (a) {
                var score = 0;
                if (a.key === key) score = 100;
                else if (key.length >= 2 && a.key.indexOf(key) === 0) score = 50;
                else if (hasWord(a.wordKeys, key)) score = 60;
                else if (key.length >= 3 && a.wordKeys.join('') === key) score = 95;      // le développé entier, espaces compris : « קל וחומר »
                if (score) scored.push({ entry: a, score: score });
            });
        } else {
            var q = normalizeFrench(s);
            if (!q) return { kind: 'empty', results: [] };
            ABBREVIATIONS.forEach(function (a) {
                var score = 0;
                a.frKeys.forEach(function (g, i) {
                    var sc = 0;
                    var words = g.split(' ');
                    if (g === q) sc = i === 0 ? 100 : 90;
                    else if (words.indexOf(q) >= 0 || (' ' + g + ' ').indexOf(' ' + q + ' ') >= 0) sc = 70;
                    else if (g.indexOf(q) === 0) sc = 60;
                    else if (q.length >= 3 && words.some(function (w) { return w.indexOf(q) === 0; })) sc = 40;
                    score = Math.max(score, sc);
                });
                if (score) scored.push({ entry: a, score: score });
            });
        }
        // Un sigle trouvé tel quel (ר״י) : pas les autres sigles qui commencent par les mêmes lettres.
        if (scored.some(function (x) { return x.score === 100; })) scored = scored.filter(function (x) { return x.score >= 95; });
        scored.sort(function (x, y) { return y.score - x.score || x.entry.id - y.entry.id; });
        return { kind: 'abbreviations', results: scored.map(function (x) { return x.entry; }) };
    }

    // L'abréviation que ce texte écrit exactement (avec ou sans guillemet), ou null : ר״ע, רע. Il faut deux lettres au moins.
    function sigleOf(text) {
        var s = String(text == null ? '' : text).trim();
        if (!hasHebrew(s)) return null;
        var key = normalizeHebrew(s);
        if (key.length < 2) return null;
        return ABBREVIATIONS.find(function (a) { return a.key === key; }) || null;
    }

    // Le filtre par catégorie d'une liste d'abréviations ; 'all', null ou rien = pas de filtre.
    function filterAbbreviations(list, opts) {
        var cat = opts && opts.cat;
        return list.filter(function (a) { return isAll(cat) || a.cat === cat; });
    }

    // La recherche d'un sage. En hébreu : le nom exact (100), le nom sans son titre (95 ; « עקיבא » ou « ר עקיבא »), un début de nom (50), un mot du nom (60).
    // En français : le nom ou une autre graphie (100 le nom usuel, 90 une autre graphie, 70 un mot ou une expression d'un nom, 60 un début de nom,
    // 40 un début de mot), puis, plus bas (20), un mot de la biographie (« michna » trouve Rabbi Yehouda HaNasi) pour une saisie d'au moins quatre lettres.
    function searchSages(text) {
        var s = String(text == null ? '' : text).trim();
        if (!s) return { kind: 'all', results: SAGES.slice() };
        var scored = [];
        if (hasHebrew(s)) {
            var key = normalizeHebrew(s);
            SAGES.forEach(function (a) {
                var score = 0;
                if (a.key === key) score = 100;
                else if (a.sigleKeys.indexOf(key) >= 0) score = 96;                                  // un sigle : ר״ע trouve Rabbi Akiva, ר״י ses cinq candidats
                else if (a.bareKey !== a.key && (a.bareKey === key || 'ר' + a.bareKey === key)) score = 95;
                else if (key.length >= 2 && a.key.indexOf(key) === 0) score = 50;
                else if (a.wordKeys.indexOf(key) >= 0) score = 60;
                if (score) scored.push({ entry: a, score: score });
            });
        } else {
            var q = normalizeFrench(s);
            if (!q) return { kind: 'empty', results: [] };
            SAGES.forEach(function (a) {
                var score = 0;
                a.frKeys.forEach(function (g, i) {
                    var sc = 0;
                    var words = g.split(' ');
                    if (g === q) sc = i === 0 ? 100 : 90;
                    else if (words.indexOf(q) >= 0 || (' ' + g + ' ').indexOf(' ' + q + ' ') >= 0) sc = 70;
                    else if (g.indexOf(q) === 0) sc = 60;
                    else if (q.length >= 3 && words.some(function (w) { return w.indexOf(q) === 0; })) sc = 40;
                    score = Math.max(score, sc);
                });
                if (!score && q.length >= 4 && a.bioWords.indexOf(q) >= 0) score = 20;
                if (score) scored.push({ entry: a, score: score });
            });
        }
        // À score égal : le nom le plus court (« Rabbi Yohanan » avant « Rabban Yohanan ben Zakkaï »), puis le plus célèbre, puis l'ordre chronologique.
        // Un sigle trouvé tel quel (ר״ח) : on ne garde que les maîtres qu'il désigne, pas les noms qui commencent par les mêmes lettres.
        if (scored.some(function (x) { return x.score === 96; })) scored = scored.filter(function (x) { return x.score >= 95; });
        scored.sort(function (x, y) {
            return y.score - x.score || x.entry.name.split(' ').length - y.entry.name.split(' ').length || y.entry.fame - x.entry.fame || x.entry.id - y.entry.id;
        });
        return { kind: 'sages', results: scored.map(function (x) { return x.entry; }) };
    }

    // Le filtre par groupe (tannaim, amoraim_israel, amoraim_babylonie) ; 'all', null ou rien = pas de filtre.
    function filterSages(list, opts) {
        var grp = opts && opts.grp;
        return list.filter(function (a) { return isAll(grp) || a.grp === grp; });
    }

    // La recherche : de l'araméen si le texte contient une lettre hébraïque, du français sinon. Un texte vide donne tout le dictionnaire.
    function search(text) {
        var s = String(text == null ? '' : text).trim();
        if (!s) return { kind: 'all', results: ENTRIES.slice() };
        return hasHebrew(s) ? searchAramaic(s) : searchFrench(s);
    }

    // Les filtres : un palier (1, 2, 3) et/ou une catégorie ; 'all', null ou rien = pas de filtre.
    function isAll(v) { return v === undefined || v === null || v === 'all'; }
    function filter(list, opts) {
        var tier = opts && opts.tier, cat = opts && opts.cat;
        return list.filter(function (e) { return (isAll(tier) || e.tier === tier) && (isAll(cat) || e.cat === cat); });
    }

    // Combien de mots par catégorie (dans l'ordre de CATEGORIES), pour un palier donné.
    function categoryStats(tier) {
        return CATEGORIES.map(function (c) {
            return { cat: c, count: filter(ENTRIES, { tier: tier, cat: c }).length };
        });
    }

    return {
        ENTRIES: ENTRIES, CATEGORIES: CATEGORIES, TREATISE_CATEGORIES: TREATISE_CATEGORIES, THEME_CATEGORIES: THEME_CATEGORIES, FUNCTION_CATEGORIES: FUNCTION_CATEGORIES, TIERS: TIERS, PREFIXES: PREFIXES,
        ABBREVIATIONS: ABBREVIATIONS, ABBR_CATEGORIES: ABBR_CATEGORIES, SAGES: SAGES, SAGE_GROUPS: SAGE_GROUPS,
        entryById: entryById, family: family, guessRoots: guessRoots, CONJUGATION_ROWS: CONJUGATION_ROWS, search: search, filter: filter, categoryStats: categoryStats,
        searchAbbreviations: searchAbbreviations, filterAbbreviations: filterAbbreviations, sigleOf: sigleOf, wordOf: wordOf, sagesOf: sagesOf,
        searchSages: searchSages, filterSages: filterSages, sageByName: sageByName
    };
});
