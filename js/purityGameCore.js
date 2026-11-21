// =========================================================================
// === TORAHAXE — « PUR OU IMPUR ? » : LES RÈGLES DU JEU DE TRI CHRONOMÉTRÉ (sans DOM) ===
// =========================================================================
// On voit un animal ; en huit secondes, « pur » (permis) ou « impur » (interdit) ? Dix animaux par partie, 100 points chacun, un temps écoulé compte faux.
// La mécanique (questions, score, suite) est celle de js/quizCore.js, avec deux propositions fixes (Pur à gauche, Impur à droite : la main apprend vite).
//
// Les animaux viennent des données de l'outil Cacherout (js/foodLawsData.js), à l'exception de la liste « animaux de mer impurs » ci-dessous, écrite pour
// ce jeu : l'outil ne nomme aucun poisson ni fruit de mer interdit, ni les quadrupèdes impurs courants (cheval, chien…). Principe : seuls des cas SANS
// discussion sont posés. On écarte donc ce que les données signalent comme discuté (girafe, paon, dinde, oiseaux de tradition locale…), les animaux de la
// Torah dont l'identification est perdue (le zémer, l'antilope, le tétras, la vallérie…), les poissons à exception ou à identification incertaine, les espèces
// exotiques, et tout poisson dont le statut diffère selon les communautés (esturgeon, espadon…). La question n'est jamais « peut-on le manger ici et
// maintenant ? » mais « cet animal est-il pur ou impur selon la Torah ? ». Outil d'étude, pas une décision de halakha.
// À relire par une personne compétente, en particulier les deux listes écrites pour ce jeu (SEA_IMPURE, LAND_IMPURE) et les listes blanches (TORAH_PURE, TORAH_BIRDS, LAND_PURE).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./foodLawsData.js'), require('./quizCore.js'));
    else root.PurityGameCore = factory(root.FoodLawsData, root.QuizCore);
}(typeof self !== 'undefined' ? self : this, function (Data, Quiz) {
    'use strict';

    var ROUNDS = Quiz.ROUNDS;
    var TIME_MS = 8000;                         // le temps par animal
    var SECTIONS = ['all', 'terre', 'oiseaux', 'eau'];
    var OPTIONS = [{ label: 'pur', value: 'pur', he: 'טָהוֹר' }, { label: 'impur', value: 'impur', he: 'טָמֵא' }];   // `label` : la clé de traduction (purgame.pur / purgame.impur) ; `he` : tahor / tamé

    // Les animaux de mer et d'eau douce impurs, sans discussion : sans nageoires ou sans écailles (Lévitique 11:10-12 ; Deutéronome 14:10). [nom, raison]
    var SEA_IMPURE = [
        ['La crevette', 'Un crustacé : ni nageoires ni écailles.'], ['Le crabe', 'Un crustacé : ni nageoires ni écailles.'],
        ['Le homard', 'Un crustacé : ni nageoires ni écailles.'], ['La langoustine', 'Un crustacé : ni nageoires ni écailles.'],
        ['La moule', 'Un mollusque : ni nageoires ni écailles.'], ['L’huître', 'Un mollusque : ni nageoires ni écailles.'],
        ['La coquille Saint-Jacques', 'Un mollusque : ni nageoires ni écailles.'], ['Le calamar', 'Un mollusque : ni nageoires ni écailles.'],
        ['Le poulpe', 'Un mollusque : ni nageoires ni écailles.'], ['La seiche', 'Un mollusque : ni nageoires ni écailles.'],
        ['L’anguille', 'Elle n’a pas d’écailles.'], ['Le requin', 'Il n’a pas d’écailles au sens de la Torah.'],
        ['La raie', 'Elle n’a pas d’écailles.'], ['Le silure (poisson-chat)', 'Il n’a pas d’écailles.'],
        ['Le dauphin', 'Un mammifère marin : ni nageoires ni écailles au sens de la Torah.'], ['La baleine', 'Un mammifère marin : ni nageoires ni écailles au sens de la Torah.']
    ];

    // Les quadrupèdes impurs courants, sans discussion : ni pied fendu ni rumination (ou, pour le sanglier, le pied fendu sans la rumination, comme le porc).
    var NO_SIGNS = 'Il ne rumine pas et n’a pas le pied fendu.';
    var LAND_IMPURE = [
        ['Le cheval', NO_SIGNS], ['L’âne', NO_SIGNS], ['Le chien', NO_SIGNS], ['Le chat', NO_SIGNS], ['Le lion', NO_SIGNS], ['Le loup', NO_SIGNS], ['L’ours', NO_SIGNS],
        ['Le renard', NO_SIGNS], ['L’éléphant', NO_SIGNS], ['Le singe', NO_SIGNS], ['Le rhinocéros', NO_SIGNS], ['Le kangourou', NO_SIGNS],
        ['Le sanglier', 'Il a le pied fendu mais il ne rumine pas, comme le porc.']
    ];

    // Ce que les données nomment et que l'on ne pose que s'il n'y a aucun doute (on ne fait pas jouer les identifications perdues ou discutées).
    var TORAH_PURE = { chor: true, 'sse-kessavim': true, 'sse-izim': true, ayal: true, tsvi: true };
    var TORAH_BIRDS = { nesher: true, ayya: true, orev: true, 'bat-yaana': true, chahaf: true, nets: true, kos: true, chalakh: true, kaat: true, hassida: true, anafa: true, atalef: true, daa: true };
    // Les animaux d'aujourd'hui à deux signes, reconnaissables (les espèces exotiques ou sans nom courant sont laissées).
    var LAND_PURE = ['Zébu', 'Yak', 'Buffle d’eau (buffle asiatique)', 'Bison d’Amérique', 'Bison d’Europe', 'Buffle d’Afrique', 'Impala', 'Springbok', 'Oryx', 'Éland', 'Gnou',
        'Mouflon', 'Chamois', 'Isard', 'Bœuf musqué', 'Cerf élaphe', 'Cerf de Virginie', 'Daim', 'Élan', 'Wapiti', 'Renne (caribou)'];

    function terreWhy(a) {
        if (a.signs === 'both') return 'Il a le pied fendu et il rumine.';
        if (a.signs === 'hoof') return 'Il a le pied fendu mais il ne rumine pas.';
        if (a.signs === 'cud') return 'Il rumine mais il n’a pas le pied fendu.';
        return 'Il ne porte pas les deux signes.';
    }

    function build() {
        var items = [];
        function add(item) { items.push(item); }

        // Les animaux nommés dans la Torah : quadrupèdes (purs et impurs) et rampants.
        Data.ANIMALS.forEach(function (a) {
            if (a.cat === 'terre' && (a.status === 'impur' || TORAH_PURE[a.id])) add({ id: 'a:' + a.id, fr: a.fr, he: a.he, status: a.status, group: 'terre', why: terreWhy(a), ref: a.ref });
            else if (a.cat === 'rampant' && !/^Tout/.test(a.fr)) add({ id: 'a:' + a.id, fr: a.fr, he: a.he, status: 'impur', group: 'terre', why: 'Un rampant : interdit.', ref: a.ref });
        });
        // Les animaux d'aujourd'hui qui portent les deux signes, reconnaissables ; et les quadrupèdes impurs courants.
        Data.LAND_CONTEMPORARY.forEach(function (a) {
            if (LAND_PURE.indexOf(a.fr) >= 0) add({ id: 'l:' + a.fr, fr: a.fr, status: 'pur', group: 'terre', why: 'Il a le pied fendu et il rumine.' });
        });
        LAND_IMPURE.forEach(function (x, i) { add({ id: 'i:' + i, fr: x[0], status: 'impur', group: 'terre', why: x[1] }); });
        // Les oiseaux de la liste interdite de la Torah.
        Data.BIRDS.forEach(function (b) {
            if (!TORAH_BIRDS[b.id]) return;
            add({ id: 'b:' + b.id, fr: b.fr, he: b.he, status: 'impur', group: 'oiseaux',
                why: b.id === 'atalef' ? 'La Torah la range parmi les oiseaux interdits.' : 'Un oiseau de la liste des interdits.',
                ref: 'Lévitique ' + b.lev + (b.dt ? ' ; Deutéronome ' + b.dt : '') });
        });
        // Les oiseaux dont la tradition est universelle (la dinde, discutée au fil des siècles, est écartée).
        Data.BIRDS_CASHER.forEach(function (b) {
            if (b.status !== 'courant' || /^Dinde/.test(b.fr)) return;
            add({ id: 'c:' + b.fr, fr: b.fr, status: 'pur', group: 'oiseaux', why: 'Un oiseau dont la tradition (mésora) est universelle.' });
        });
        // Les poissons de la liste du Consistoire, sans exception ni identification incertaine : nageoires et écailles (Lévitique 11:9).
        Data.CONSISTOIRE_POISSONS.forEach(function (p) {
            if (p.excl || p.note || /probablement|confirmer/i.test(p.lat || '')) return;
            add({ id: 'f:' + p.fr, fr: p.fr, status: 'pur', group: 'eau', why: 'Il a des nageoires et des écailles.', ref: 'Lévitique 11:9' });
        });
        SEA_IMPURE.forEach(function (x, i) { add({ id: 's:' + i, fr: x[0], status: 'impur', group: 'eau', why: x[1], ref: 'Lévitique 11:10-12' }); });
        return items;
    }
    var ITEMS = build();

    function items(section) { return ITEMS.filter(function (it) { return section === 'all' || SECTIONS.indexOf(section) < 0 || it.group === section; }); }

    // Une question : { type: 'item', id, item, shown (le nom), shownHe, options (Pur, Impur), answer (0 ou 1) }.
    function makeQuestion(item) {
        return { type: 'item', id: item.id, item: item, shown: item.fr, shownHe: item.he || '', options: OPTIONS, answer: item.status === 'pur' ? 0 : 1 };
    }

    // `rounds` animaux, à parts égales de purs et d'impurs quand la section le permet, dans un ordre mêlé.
    function pick(section, rng, rounds) {
        var pool = items(section);
        var pur = Quiz.shuffle(pool.filter(function (it) { return it.status === 'pur'; }), rng);
        var impur = Quiz.shuffle(pool.filter(function (it) { return it.status === 'impur'; }), rng);
        var nPur = Math.min(pur.length, Math.max(Math.floor(rounds / 2), rounds - impur.length));
        var nImpur = Math.min(impur.length, rounds - nPur);
        return Quiz.shuffle(pur.slice(0, nPur).concat(impur.slice(0, nImpur)), rng);
    }

    // options : { section, rng, rounds, questions } ; `questions`, s'il est donné, fixe les questions (tests).
    function createGame(options) {
        var o = options || {};
        var section = SECTIONS.indexOf(o.section) >= 0 ? o.section : 'all';
        var questions = o.questions || pick(section, o.rng, o.rounds || ROUNDS).map(makeQuestion);
        return Quiz.createState(questions, { section: section });
    }

    function question(state) { return Quiz.question(state); }
    function answer(state, choice) { return Quiz.answer(state, choice, function (q, right) { return { id: q.id, right: right, type: q.type }; }); }
    function expire(state) { return Quiz.expire(state, function (q, right) { return { id: q.id, right: right, type: q.type }; }); }
    function next(state) { return Quiz.next(state); }

    return {
        ROUNDS: ROUNDS, TIME_MS: TIME_MS, POINTS: Quiz.POINTS, SECTIONS: SECTIONS, OPTIONS: OPTIONS, SEA_IMPURE: SEA_IMPURE, ITEMS: ITEMS,
        items: items, makeQuestion: makeQuestion, pick: pick, createGame: createGame, question: question, answer: answer, expire: expire, next: next
    };
}));
