// =========================================================================
// === TORAHAXE — « QUI SUIS-JE ? » : LES RÈGLES DU JEU DES INDICES (pur, sans DOM, testé) ===
// =========================================================================
// Un personnage parle à la première personne : « Je suis mort à l'âge de 930 ans. » Qui est-ce ? Quatre noms sont proposés d'emblée. On part avec 100 points ; chaque
// indice de plus (du plus vague au plus précis) coûte 20 points. UNE SEULE réponse : une erreur vaut 0 point et dévoile la réponse. (Avec quatre noms et des erreurs à
// 20 points, on gagnerait au moins 40 points en les essayant tous, sans lire un indice ; c'est l'inverse de « Dans quelle paracha ? », où les 54 parachiot rendent
// l'essai de toutes impraticable.) Cinq personnages par partie, 500 points au plus. La mécanique des indices est celle de js/quizCore.js.
//
// Deux sections :
//  - « bible » : vingt-neuf personnages de la Bible, indices écrits à la main (js/whoData.js) ;
//  - « sages » : les sages du Talmud (js/gemaraCore.js, les plus connus), indices tirés de leur fiche : l'époque, la période, leurs maîtres, leurs disciples,
//    puis ce que le dictionnaire dit d'eux. Une phrase de leur fiche n'est jamais un indice si elle contient leur nom ou l'un de leurs autres noms. Un sage
//    qui n'a pas au moins quatre indices n'est pas posé.
// Les fausses réponses sont des personnages de la même section, du même sexe quand c'est possible (« mon épouse » ne laisserait aucun doute), et pour moitié du même
// groupe (la même époque, ou le même rôle : patriarches, rois…) pour qu'elles soient plausibles.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./whoData.js'), require('./gemaraCore.js'));
    else root.WhoGameCore = factory(root.QuizCore, root.WhoData, root.GemaraCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz, Data, Gemara) {
    'use strict';

    var ROUNDS = 5;                 // personnages par partie
    var START_POINTS = 100;
    var HINT_COST = 20;             // par indice
    var WRONG_COST = START_POINTS;  // une erreur fait tomber les points à zéro : une seule réponse par personnage
    var MAX_CLUES = 5;              // indices montrés au plus (le premier, puis quatre de plus)
    var MIN_CLUES = 4;
    var SECTIONS = ['all', 'bible', 'sages'];
    var SAGE_ERAS = {
        zougot: 'Je fais partie des Zougot, les paires de maîtres d’avant les Tannaïm.',
        tannaim: 'Je suis un sage de l’époque des Tannaïm, ceux de la Michna.',
        amoraim_israel: 'Je suis un sage de l’époque des Amoraïm, en terre d’Israël.',
        amoraim_babylonie: 'Je suis un sage de l’époque des Amoraïm, en Babylonie.'
    };
    var FEMALE_SAGES = { 'Imma Chalom': true, 'Rachel (épouse de Rabbi Akiva)': true, 'Bruria': true, 'Yalta': true };

    // --- Reconnaître un nom ----------------------------------------------------------------------------------------------------------------
    function normalize(text) {
        return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`´]/g, ' ').replace(/[^a-z0-9א-ת\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    // Les noms à ne jamais montrer, normalisés (le nom entier, ses variantes, et chaque mot qui l'identifie : « Hillel » dans « Hillel l'Ancien »).
    function namesOf(person) {
        var out = [person.fr].concat(person.aliases || []);
        var keys = [];
        out.forEach(function (n) {
            var k = normalize(n);
            if (k.length >= 3) keys.push(k);
        });
        return keys;
    }
    // Le texte contient-il l'un de ces noms, en mot entier ?
    function mentions(text, keys) {
        var hay = ' ' + normalize(text) + ' ';
        return keys.some(function (k) { return hay.indexOf(' ' + k + ' ') >= 0; });
    }

    // Tous les noms complets connus (Bible et sages), du plus long au plus court : « Rav Houna » contient « Rav » sans désigner Rav.
    var ALL_NAMES = null;
    function allNames() {
        if (!ALL_NAMES) {
            var names = Data.BIBLE.map(function (p) { return p.fr; }).concat(Gemara.SAGES.map(function (s) { return s.name; }));
            ALL_NAMES = names.map(normalize).filter(function (k) { return k.length >= 3; }).sort(function (a, b) { return b.length - a.length; });
        }
        return ALL_NAMES;
    }

    // Le texte désigne-t-il ce personnage ? Les noms complets des AUTRES personnages sont d'abord effacés du texte, pour qu'un nom court (« Rav », « Rabbi Yehouda »)
    // ne soit pas reconnu au milieu du nom d'un autre (« Rav Houna », « Rabbi Yehouda bar Ilaï »).
    function mentionsPerson(text, person) {
        var own = namesOf(person);
        var hay = ' ' + normalize(text) + ' ';
        allNames().forEach(function (n) { if (own.indexOf(n) < 0) hay = hay.split(' ' + n + ' ').join('  '); });
        return own.some(function (k) { return hay.indexOf(' ' + k + ' ') >= 0; });
    }

    // --- Les sages : des indices tirés de leur fiche -----------------------------------------------------------------------------------------
    // Les phrases d'une fiche : coupées après un point suivi d'une espace et d'une majuscule (une abréviation comme « v. 50 » ne coupe pas), puis recollées tant qu'une
    // citation « … » est restée ouverte.
    function sentences(text) {
        var source = String(text || ''), parts = [], re = /\.\s+(?=[A-ZÀ-ÖØ-Ý«])/g, from = 0, m;   // pas de « lookbehind » : les anciens WebKit ne le comprennent pas
        while ((m = re.exec(source))) { parts.push(source.slice(from, m.index + 1)); from = m.index + m[0].length; }
        parts.push(source.slice(from));
        parts = parts.map(function (x) { return x.trim(); }).filter(Boolean);
        var out = [];
        parts.forEach(function (part) {
            var last = out[out.length - 1];
            if (last !== undefined && (last.split('«').length - 1) > (last.split('»').length - 1)) out[out.length - 1] = last + ' ' + part;
            else out.push(part);
        });
        return out;
    }

    // Une phrase de fiche qui ne dit que « Élève de X » ou « Maître de Y » répète l'indice des maîtres ou des disciples : l'indice coûterait 20 points pour rien.
    var KINSHIP = /^(élève|disciple|maître|fils|fille|père|petit-fils|beau-père|gendre|frère|sœur|contemporain)\b/i;
    function repeatsKinship(sentence, used) {
        return KINSHIP.test(sentence) && used.some(function (name) { return mentions(sentence, [normalize(name)]); });
    }

    function sageClues(sage, person) {
        var clues = [];
        var used = [];
        if (SAGE_ERAS[sage.grp]) clues.push(SAGE_ERAS[sage.grp]);
        if (sage.period) clues.push('Mon époque : ' + sage.period.replace(/\.$/, '') + '.');
        if (sage.masters.length) { used = used.concat(sage.masters); clues.push((sage.masters.length > 1 ? 'Mes maîtres : ' : 'Mon maître : ') + sage.masters.slice(0, 2).join(', ') + '.'); }
        if (sage.disciples.length) { used = used.concat(sage.disciples); clues.push((sage.disciples.length > 1 ? 'Parmi mes disciples : ' : 'Mon disciple : ') + sage.disciples.slice(0, 2).join(', ') + '.'); }
        // Ni phrase qui nomme le sage, ni phrase qui répète les maîtres ou les disciples, ni phrase qui renvoie à une phrase écartée (« Leurs débats… »).
        var bio = sentences(sage.bio).filter(function (x) { return !mentionsPerson(x, person) && !repeatsKinship(x, used) && !/^(leurs?|ils|elles|ces|cet|cette)\b/i.test(x); });
        bio.slice(0, 2).forEach(function (x) { clues.push('Ce que l’on dit de moi : ' + x); });
        return { clues: clues, bioClues: Math.min(2, bio.length) };
    }

    // Les siècles d'une période (« fin du Iᵉʳ – début du IIᵉ siècle », « Iᵉʳ siècle av. J.-C. », « v. 50 – v. 135 ») : négatifs avant l'ère commune.
    var ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
    function centuriesOf(period) {
        var out = [], text = String(period || ''), m, re = /\b(I|II|III|IV|V|VI)(?:ᵉʳ|ᵉ)(?:\s+siècle)?(\s+av\.)?/g;
        while ((m = re.exec(text))) out.push(m[2] ? -ROMAN[m[1]] : ROMAN[m[1]]);
        var y, ry = /v\.\s*(\d+)/g;
        while ((y = ry.exec(text))) out.push(Math.ceil(Number(y[1]) / 100));
        return out;
    }

    function buildSages() {
        var out = [];
        Gemara.SAGES.forEach(function (s) {
            if (s.fame < 2) return;
            var person = { id: 's:' + s.name, fr: s.name, he: s.he, sex: FEMALE_SAGES[s.name] ? 'f' : 'm', grp: s.grp, aliases: s.aliases || [], section: 'sages',
                           centuries: centuriesOf(s.period), relatives: s.masters.concat(s.disciples) };
            var built = sageClues(s, person);
            if (built.bioClues < 1 || built.clues.length < MIN_CLUES) return;       // pas de fiche qui désigne le sage sans le nommer : on ne le pose pas
            person.clues = built.clues.slice(0, MAX_CLUES);
            // Les indices vagues d'abord, la fiche en dernier : si plus de cinq, on garde l'époque, la période, puis ce qui reste de plus précis.
            if (built.clues.length > MAX_CLUES) person.clues = built.clues.slice(0, MAX_CLUES - built.bioClues).concat(built.clues.slice(built.clues.length - built.bioClues));
            out.push(person);
        });
        return out;
    }

    var PEOPLE = Data.BIBLE.map(function (p) { return { id: p.id, fr: p.fr, he: p.he, sex: p.sex, grp: p.grp, aliases: p.aliases, clues: p.clues, section: 'bible' }; }).concat(buildSages());

    function people(section) { return PEOPLE.filter(function (p) { return section === 'all' || SECTIONS.indexOf(section) < 0 || p.section === section; }); }

    // --- Les questions ---------------------------------------------------------------------------------------------------------------------------
    // Un indice vrai de deux personnages à la fois ne départage rien : chaque indice ne doit convenir qu'à UNE des quatre propositions.
    function sharesClue(a, b) { return a.clues.some(function (c) { return b.clues.indexOf(c) >= 0; }); }
    // Pour les sages, l'époque (premier indice), la période, les maîtres et les disciples doivent aussi écarter chaque fausse réponse :
    // pas de sage de la même époque, d'un siècle qui se recoupe, ni avec un maître ou un disciple en commun.
    function clashes(a, b) {
        if (sharesClue(a, b)) return true;
        if (a.section !== 'sages') return false;
        return a.grp === b.grp
            || a.centuries.some(function (c) { return b.centuries.indexOf(c) >= 0; })
            || a.relatives.some(function (n) { return b.relatives.indexOf(n) >= 0; });
    }

    // Trois fausses réponses : de la même section, du même sexe si la section en a assez, jamais la bonne réponse, et aucune à laquelle un indice de la bonne réponse conviendrait.
    // Dans la Bible, la moitié vient du même groupe (de la même famille) ; chez les sages, jamais du même groupe : le premier indice est l'époque.
    function distractors(person, rng) {
        var peers = PEOPLE.filter(function (p) { return p.section === person.section && p.id !== person.id; });
        var pool = peers.filter(function (p) { return !clashes(person, p); });
        if (pool.length < Quiz.CHOICES - 1) pool = peers.filter(function (p) { return !sharesClue(person, p); });   // jamais le cas avec les données actuelles
        var sameSex = pool.filter(function (p) { return p.sex === person.sex; });
        if (sameSex.length >= Quiz.CHOICES - 1) pool = sameSex;
        var sameGrp = Quiz.shuffle(pool.filter(function (p) { return p.grp === person.grp; }), rng).slice(0, 2);
        var others = Quiz.shuffle(pool.filter(function (p) { return sameGrp.indexOf(p) < 0; }), rng);
        return sameGrp.concat(others).slice(0, Quiz.CHOICES - 1);
    }

    // Une question : { type: 'who', id, person, clues, options: [{ label, he, id }], answer, maxHints }.
    function makeQuestion(person, rng) {
        var opts = Quiz.shuffle([person].concat(distractors(person, rng)), rng);
        return {
            type: 'who', id: person.id, person: person, clues: person.clues,
            options: opts.map(function (p) { return { label: p.fr, he: p.he, id: p.id }; }), answer: opts.indexOf(person),
            maxHints: Math.min(MAX_CLUES - 1, person.clues.length - 1)
        };
    }

    // `rounds` personnages de la section, à parts égales de la Bible et des sages dans « tous ».
    function pick(section, rng, rounds) {
        var random = rng || Math.random;
        var chosen;
        if (section === 'all') {
            var bible = Quiz.shuffle(people('bible'), random), sages = Quiz.shuffle(people('sages'), random);
            var nBible = Math.ceil(rounds / 2);
            chosen = Quiz.shuffle(bible.slice(0, nBible).concat(sages.slice(0, rounds - nBible)), random);
        } else {
            chosen = Quiz.shuffle(people(section), random).slice(0, rounds);
        }
        return chosen.map(function (p) { return makeQuestion(p, random); });
    }

    // La mécanique d'une manche dépend de la question : le nombre d'indices varie (un personnage a de quatre à cinq indices).
    function cfgOf(state) {
        var q = Quiz.question(state);
        return { start: START_POINTS, hintCost: HINT_COST, wrongCost: WRONG_COST, maxHints: q ? q.maxHints : 0 };
    }

    // options : { section, rng, rounds, questions } ; `questions`, s'il est donné, fixe la partie (tests).
    function createGame(options) {
        var o = options || {};
        var section = SECTIONS.indexOf(o.section) >= 0 ? o.section : 'all';
        var state = Quiz.createState(o.questions || pick(section, o.rng, o.rounds || Quiz.roundsFor(ROUNDS)), { section: section });
        if (state.questions.length) Quiz.resetRound(state, cfgOf(state));
        return state;
    }

    function question(state) { return Quiz.question(state); }
    // Les indices montrés, du plus vague au plus précis.
    function shownClues(state) { var q = question(state); return q ? q.clues.slice(0, state.shown) : []; }
    // Un indice de plus, pour 20 points : ['hint'] (et ['revealed'] si les points tombent à zéro) ; [] s'il n'y en a plus ou si la question est résolue.
    function hint(state) { return Quiz.roundHint(state, cfgOf(state)); }
    // Une réponse : l'indice de la proposition (0 à 3). ['right'], ou ['wrong', 'revealed'] : l'erreur vaut 0 point et dévoile la réponse ; [] si rien ne se passe.
    function guess(state, choice) {
        var q = question(state);
        if (!q || !(choice >= 0 && choice < q.options.length)) return [];
        return Quiz.roundGuess(state, choice, choice === q.answer, cfgOf(state));
    }
    function next(state) {
        var events = Quiz.next(state);
        if (!events.length && !state.over) Quiz.resetRound(state, cfgOf(state));
        return events;
    }

    return {
        ROUNDS: ROUNDS, START_POINTS: START_POINTS, HINT_COST: HINT_COST, WRONG_COST: WRONG_COST, MAX_CLUES: MAX_CLUES, MIN_CLUES: MIN_CLUES, SECTIONS: SECTIONS,
        PEOPLE: PEOPLE, people: people, clashes: clashes, namesOf: namesOf, mentions: mentions, mentionsPerson: mentionsPerson, normalize: normalize, sentences: sentences, makeQuestion: makeQuestion, pick: pick,
        createGame: createGame, question: question, shownClues: shownClues, hint: hint, guess: guess, next: next
    };
}));
