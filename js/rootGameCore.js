// =========================================================================
// === TORAHAXE — « FAMILLES DE RACINES » : LES RÈGLES DU JEU DES RACINES HÉBRAÏQUES (pur, sans DOM, testé) ===
// =========================================================================
// Un mot hébreu vient d'une racine de trois consonnes ; ses voyelles, ses préfixes et ses suffixes en font toute une famille (roi, régner, royaume, reine : MLK). Dix questions à quatre
// propositions, 100 points chacune, trois façons de demander :
//  - « intruder » : trois de ces mots viennent de la même racine, lequel est l'intrus ? (quatre questions) ;
//  - « family » : lequel de ces mots vient de telle racine ? (trois) ;
//  - « root » : quelle est la racine de ce mot ? (trois).
// Trois séries : tout, les racines (que des « quelle racine ? »), les familles (intrus et « lequel vient de ? »).
// La mécanique de partie (questions, score, suite, jeu à plusieurs) est celle de js/quizCore.js ; les mots, leur traduction et leur racine sont ceux du dictionnaire (js/lexiconCore.js).
//
// SEULES DES FAMILLES SANS DISCUSSION. Le dictionnaire compte 731 racines, mais il range sous une même suite de consonnes des racines homonymes qui n'ont rien à voir (SHVA :
// jurer / être rassasié / semaine ; AREV : soir / garantir / mélange ; SHAR : rester / chair / levain ; ASAR : dix / richesse / dîme…) et des verbes à lettre faible dont la racine n'apparaît
// pas dans le mot (KOUM, BO). Le jeu n'interroge donc que les familles de FAMILIES ci-dessous : vingt et une racines régulières, dont tous les mots, dans leur sens courant, viennent
// bien de la même racine (une liste écrite pour ce jeu, mot par mot, à partir du dictionnaire ; les mots sont comparés sous leur forme canonique : l'ordre des voyelles et du daguesh ne compte pas). Les mauvaises propositions sont toujours des mots ou des racines de ces mêmes familles ;
// et jamais une racine dont les trois lettres se trouveraient dans le mot posé (elle pourrait passer pour une autre lecture du mot). tests/rootGameCore.test.js vérifie, mot par mot, la
// racine dans le dictionnaire. Outil d'étude. À relire par une personne compétente, en particulier la liste FAMILIES.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./lexiconCore.js'));
    else root.RootGameCore = factory(root.QuizCore, root.LexiconCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz, Lexicon) {
    'use strict';

    var ROUNDS = Quiz.ROUNDS;
    var SECTIONS = ['all', 'racines', 'familles'];
    var PLANS = {
        all: ['intruder', 'intruder', 'intruder', 'intruder', 'family', 'family', 'family', 'root', 'root', 'root'],
        racines: ['root', 'root', 'root', 'root', 'root', 'root', 'root', 'root', 'root', 'root'],
        familles: ['intruder', 'intruder', 'intruder', 'intruder', 'intruder', 'family', 'family', 'family', 'family', 'family']
    };

    // Les familles : la racine (consonnes ordinaires, sans lettre finale) → les mots du dictionnaire (tels qu'ils y sont écrits, avec voyelles). Chaque famille : trois mots au moins.
    var FAMILIES = {
        'מלכ': ['מֶלֶךְ', 'מָלַךְ', 'מַמְלָכָה', 'מַלְכוּת', 'מַלְכָּה', 'מְלוּכָה'],
        'קדש': ['קֹדֶשׁ', 'קָדַשׁ', 'קָדוֹשׁ', 'מִקְדָּשׁ'],
        'פקד': ['פָּקַד', 'פְּקֻדָּה', 'פִּקּוּד', 'פִּקָּדוֹן'],
        'זכר': ['זָכַר', 'זִכְרוֹן', 'זֵכֶר', 'אַזְכָּרָה'],
        'שכב': ['שָׁכַב', 'מִשְׁכָּב', 'שְׁכָבָה', 'שְׁכֹבֶת'],
        'גבר': ['גִּבּוֹר', 'גֶּבֶר', 'גְּבוּרָה', 'גָּבַר', 'גְּבֶרֶת'],
        'אכל': ['אָכַל', 'אֹכֶל', 'מַאֲכָל', 'אׇכְלָה'],
        'גדל': ['גָּדוֹל', 'גָּדַל', 'מִגְדָּל', 'גֹּדֶל'],
        'קרב': ['קָרַב', 'קֶרֶב', 'קׇרְבָּן', 'קָרוֹב', 'קָרֵב'],
        'גבל': ['גְּבוּל', 'גְּבוּלָה', 'גָּבַל'],
        'צדק': ['צַדִּיק', 'צְדָקָה', 'צֶדֶק', 'צָדַק'],
        'טהר': ['טָהֵר', 'טָהוֹר', 'טׇהֳרָה'],
        'משח': ['מָשַׁח', 'מָשִׁיחַ', 'מִשְׁחָה'],
        'חלק': ['חֵלֶק', 'חָלַק', 'חֶלְקָה', 'מַחֲלֹקֶת'],
        'לבנ': ['לָבָן', 'לָבַן', 'לְבֵנָה', 'לְבוֹנָה'],
        'נדב': ['נָדִיב', 'נְדָבָה', 'נָדַב'],
        'בכר': ['בְּכוֹר', 'בִּכּוּר', 'בְּכוֹרָה', 'בְּכִירָה'],
        'ישר': ['יָשָׁר', 'יָשַׁר', 'מִישׁוֹר', 'מֵישָׁר'],
        'חננ': ['חָנַן', 'תַּחֲנוּן', 'חַנּוּן'],
        'פלט': ['פְּלֵיטָה', 'פָּלַט', 'פָּלִיט'],
        'עלה': ['עָלָה', 'עֹלָה', 'מַעֲלָה', 'עֲלִיָּה']
    };
    var ROOTS = Object.keys(FAMILIES);

    // --- Les lettres ---------------------------------------------------------------------------------------------------------------------------
    var FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
    // Les consonnes d'un texte hébreu, lettres finales ramenées aux ordinaires, sans voyelles.
    function consonants(text) {
        return String(text).replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '').split('').map(function (c) { return FINALS[c] || c; }).join('');
    }

    // Les lettres de `root` se suivent-elles, dans l'ordre, dans `word` ? Alors le mot pourrait se lire comme venant de cette racine.
    function contains(word, rootLetters) {
        var i = 0;
        for (var k = 0; k < word.length && i < rootLetters.length; k++) if (word.charAt(k) === rootLetters.charAt(i)) i++;
        return i === rootLetters.length;
    }

    function shared(a, b) { var n = 0; a.split('').forEach(function (c) { if (b.indexOf(c) >= 0) n++; }); return n; }

    // --- Les mots ------------------------------------------------------------------------------------------------------------------------------
    var ENTRIES = Lexicon.search('').results;
    var FAMILY = {};          // racine → [{ id, he, fr, key (consonnes), root (la racine ordinaire), rootShown (la racine telle que le dictionnaire l'écrit) }]
    ROOTS.forEach(function (r) {
        FAMILY[r] = FAMILIES[r].map(function (he) {
            var e = ENTRIES.filter(function (x) { return x.he.normalize('NFC') === he.normalize('NFC') && x.root && consonants(x.root) === r; })[0];
            return e ? { id: e.id, he: e.he, fr: e.fr[0], key: consonants(e.he), root: r, rootShown: e.root } : null;
        }).filter(Boolean);
    });

    function family(r) { return FAMILY[r] || []; }
    function rootShown(r) { return FAMILY[r][0].rootShown; }

    // --- Les propositions ----------------------------------------------------------------------------------------------------------------------
    function wordOption(w) { return { kind: 'word', id: w.id, label: w.he, fr: w.fr, root: w.root }; }
    function rootOption(r) { return { kind: 'root', root: r, label: rootShown(r) }; }

    // Les racines `n` autres que `not`, de préférence celles qui ressemblent le plus à `like` (lettres communes) ; `ok(r)` écarte celles qui ne conviennent pas.
    function otherRoots(n, not, like, ok, rng) {
        var pool = Quiz.shuffle(ROOTS.filter(function (r) { return not.indexOf(r) < 0 && (!ok || ok(r)); }), rng);
        pool.sort(function (a, b) { return shared(b, like) - shared(a, like); });
        // On prend parmi les plus ressemblantes, mais pas toujours les n premières : de quoi varier.
        return Quiz.shuffle(pool.slice(0, n + 6), rng).slice(0, n);
    }

    function freeRoot(used, rng, minWords) {
        return Quiz.shuffle(ROOTS.filter(function (r) { return !used[r] && family(r).length >= (minWords || 1); }), rng)[0] || null;
    }

    // --- Les questions -------------------------------------------------------------------------------------------------------------------------
    function qIntruder(used, rng) {
        var r = freeRoot(used, rng, 3);
        if (!r) return null;
        used[r] = true;
        var three = Quiz.shuffle(family(r), rng).slice(0, 3);
        // L'intrus vient d'une autre famille, de préférence qui lui ressemble ; jamais un mot où l'on pourrait lire la racine de la famille.
        var others = otherRoots(ROOTS.length, [r], r, null, rng);
        var intruder = null;
        for (var i = 0; i < others.length && !intruder; i++) {
            intruder = Quiz.shuffle(family(others[i]), rng).filter(function (w) { return !contains(w.key, r); })[0] || null;
        }
        if (!intruder) return null;
        var all = Quiz.shuffle(three.concat(intruder), rng);
        return { type: 'intruder', id: 'i' + r + intruder.id, root: r, intruder: intruder, options: all.map(wordOption), answer: all.indexOf(intruder) };
    }

    function qFamily(used, rng) {
        var r = freeRoot(used, rng, 1);
        if (!r) return null;
        used[r] = true;
        var right = Quiz.shuffle(family(r), rng)[0];
        // Trois mots de trois autres familles, sans lettres de la racine demandée en bonne place.
        var roots = otherRoots(ROOTS.length, [r], r, null, rng);
        var wrong = [];
        roots.forEach(function (o) {
            if (wrong.length >= 3) return;
            var w = Quiz.shuffle(family(o), rng).filter(function (x) { return !contains(x.key, r); })[0];
            if (w) wrong.push(w);
        });
        if (wrong.length < 3) return null;
        var all = Quiz.shuffle(wrong.concat(right), rng);
        return { type: 'family', id: 'f' + r + right.id, root: r, word: right, options: all.map(wordOption), answer: all.indexOf(right) };
    }

    function qRoot(used, rng) {
        var r = freeRoot(used, rng, 1);
        if (!r) return null;
        used[r] = true;
        var w = Quiz.shuffle(family(r), rng)[0];
        // Trois autres racines, dont aucune ne tient dans le mot posé (sinon elle serait une autre lecture possible), les plus ressemblantes d'abord.
        var wrong = otherRoots(3, [r], w.key, function (o) { return !contains(w.key, o); }, rng);
        if (wrong.length < 3) return null;
        var all = Quiz.shuffle(wrong.concat(r), rng);
        return { type: 'root', id: 'r' + r + w.id, root: r, word: w, options: all.map(rootOption), answer: all.indexOf(r) };
    }

    var BUILDERS = { intruder: qIntruder, family: qFamily, root: qRoot };

    // `rounds` questions ; une question qu'on ne peut pas construire est remplacée par « quelle est la racine ? ».
    function pick(section, rng, rounds) {
        var used = {};
        var plan = Quiz.shuffle(PLANS[section] || PLANS.all, rng).slice(0, rounds);
        var out = [];
        plan.forEach(function (type) {
            var q = BUILDERS[type](used, rng) || qRoot(used, rng);
            if (q) out.push(q);
        });
        return out;
    }

    // options : { section, rng, rounds, questions } ; `questions`, s'il est donné, fixe les questions (tests).
    function createGame(options) {
        var o = options || {};
        var section = SECTIONS.indexOf(o.section) >= 0 ? o.section : 'all';
        var questions = o.questions || pick(section, o.rng, o.rounds || ROUNDS);
        return Quiz.createState(questions, { section: section });
    }

    function question(state) { return Quiz.question(state); }
    function answer(state, choice) { return Quiz.answer(state, choice, function (q, right) { return { id: q.id, right: right, type: q.type }; }); }
    function next(state) { return Quiz.next(state); }

    return {
        ROUNDS: ROUNDS, POINTS: Quiz.POINTS, SECTIONS: SECTIONS, FAMILIES: FAMILIES, ROOTS: ROOTS, consonants: consonants, contains: contains, family: family, rootShown: rootShown,
        qIntruder: qIntruder, qFamily: qFamily, qRoot: qRoot, pick: pick, createGame: createGame, question: question, answer: answer, next: next
    };
}));
