// =========================================================================
// === TORAHAXE — « MITSVA EXPRESS » : LES RÈGLES DU JEU SUR LES 613 COMMANDEMENTS (sans DOM) ===
// =========================================================================
// On voit un commandement de la liste de Maïmonide (js/commandments613Data.js, par js/commandmentsCore.js) ; il faut vite retrouver d'où le Rambam le tire.
// Dix questions par partie, 100 points chacune, un temps écoulé compte faux (js/quizCore.js). Trois sortes de questions :
//  - « parasha » : la paracha du verset que le Rambam cite à l'appui (les 54 parachiot de data/torah/parashot.json) ; les trois fausses réponses viennent du
//    même livre, rangées dans l'ordre de la Torah, pour qu'on ne devine pas par le livre ;
//  - « book » : le livre de la Torah (Genèse, Exode, Lévitique, Nombres, Deutéronome), quatre des cinq proposés : une question de chauffe ;
//  - « kind » : positif ou négatif ? Posée seulement pour les rares commandements positifs formulés à la forme négative (« N'offrir que des animaux sans
//    défaut »), que la formulation ne trahit pas : au plus une par partie.
// Ne sont posés que les commandements dont le verset cité est un verset simple (« Exode 23:25 », ou une plage de versets d'une seule paracha) : les trois
// qui citent plusieurs passages (Nombres 18:2,4…) sont écartés, aucune paracha n'étant alors LA bonne réponse. Les commandements ont plusieurs sources dans la
// Torah : la question est toujours « le verset que le Rambam cite », jamais « où ce commandement apparaît ».
// Contenu d'après le Mishné Torah et le Séfer ha-Mitsvot, comme l'outil des 613 : à relire par une personne compétente.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./commandmentsCore.js'), require('./quizCore.js'), require('./torahRefs.js'));
    else root.MitsvaGameCore = factory(root.CommandmentsCore, root.QuizCore, root.TorahRefs);
}(typeof self !== 'undefined' ? self : this, function (Commandments, Quiz, Refs) {
    'use strict';

    var ROUNDS = Quiz.ROUNDS;
    var TIMES = { parasha: 12000, book: 8000, kind: 10000 };    // le temps par question, selon sa sorte (ms)
    var BOOKS = { 'Genèse': 1, 'Exode': 2, 'Lévitique': 3, 'Nombres': 4, 'Deutéronome': 5 };
    var BOOK_NAMES = ['Genèse', 'Exode', 'Lévitique', 'Nombres', 'Deutéronome'];
    var REF = /^(Genèse|Exode|Lévitique|Nombres|Deutéronome) (\d+):(\d+)(?:-(\d+))?$/;

    var parashaOf = Refs.parashaOf;   // l'indice (dans parashot.json) de la paracha qui contient un verset (js/torahRefs.js)

    // Les commandements jouables : { kind, n, text, ref, book (1 à 5), bookFr, parasha (indice), trap (positif formulé à la forme négative) }.
    // `parashot` : le contenu de data/torah/parashot.json.
    function items(parashot) {
        var out = [];
        Commandments.list613('all').forEach(function (c) {
            var m = REF.exec(c.ref);
            if (!m) return;
            var book = BOOKS[m[1]], chapter = Number(m[2]), verse = Number(m[3]);
            var first = parashaOf(parashot, book, chapter, verse);
            if (m[4] && parashaOf(parashot, book, chapter, Number(m[4])) !== first) return;   // une plage à cheval sur deux parachiot : pas de bonne réponse unique
            if (first < 0) return;
            out.push({ kind: c.kind, n: c.n, text: c.text, ref: c.ref, book: book, bookFr: m[1], parasha: first, trap: c.kind === 'pos' && /^(N'|Ne )/.test(c.text) });
        });
        return out;
    }

    function parashaLabel(parashot, i) { return { index: i, fr: parashot.parashot[i].fr, he: parashot.parashot[i].he, book: parashot.parashot[i].book }; }

    // Une question : { type, id, item, shown (l'énoncé), options: [{ label, ... }], answer, timeMs }. Les propositions de « parasha » portent `fr`/`he` ;
    // celles de « book » et « kind » une clé de traduction (`label`, que l'écran traduit : mitsvagame.pos / mitsvagame.neg).
    function makeQuestion(parashot, item, type, rng) {
        var id = item.kind + item.n;
        var q = { type: type, id: id, item: item, shown: item.text, timeMs: TIMES[type] };
        if (type === 'kind') {
            q.options = [{ label: 'pos', value: 'pos', he: 'מִצְוַת עֲשֵׂה' }, { label: 'neg', value: 'neg', he: 'מִצְוַת לֹא תַעֲשֶׂה' }];
            q.answer = item.kind === 'pos' ? 0 : 1;
        } else if (type === 'book') {
            var others = Quiz.shuffle(BOOK_NAMES.filter(function (b) { return b !== item.bookFr; }), rng).slice(0, Quiz.CHOICES - 1);
            var books = BOOK_NAMES.filter(function (b) { return b === item.bookFr || others.indexOf(b) >= 0; });   // dans l'ordre de la Torah
            q.options = books.map(function (b) { return { label: b, value: b, he: parashot.books[BOOK_NAMES.indexOf(b)] }; });
            q.answer = books.indexOf(item.bookFr);
        } else {
            var same = [];
            parashot.parashot.forEach(function (p, i) { if (p.book === item.book && i !== item.parasha) same.push(i); });
            var picks = Quiz.shuffle(same, rng).slice(0, Quiz.CHOICES - 1).concat([item.parasha]).sort(function (a, b) { return a - b; });
            q.options = picks.map(function (i) { var l = parashaLabel(parashot, i); return { label: l.fr, he: l.he, value: i }; });
            q.answer = picks.indexOf(item.parasha);
        }
        return q;
    }

    // Les questions d'une partie : `rounds` commandements, à parts égales de positifs et de négatifs ; « parasha » dans six cas sur dix, « book » dans les autres ;
    // et, une fois sur deux, une question « kind » sur l'un des rares positifs formulés à la forme négative.
    function pick(parashot, rng, rounds) {
        var random = rng || Math.random;
        var all = items(parashot);
        var traps = all.filter(function (it) { return it.trap; });
        var withTrap = traps.length > 0 && random() < 0.5;
        var normal = rounds - (withTrap ? 1 : 0);
        var pos = Quiz.shuffle(all.filter(function (it) { return it.kind === 'pos' && !it.trap; }), random);
        var neg = Quiz.shuffle(all.filter(function (it) { return it.kind === 'neg'; }), random);
        var nPos = Math.floor(normal / 2);
        var chosen = pos.slice(0, nPos).concat(neg.slice(0, normal - nPos));
        var questions = chosen.map(function (it) { return makeQuestion(parashot, it, random() < 0.6 ? 'parasha' : 'book', random); });
        if (withTrap) questions.push(makeQuestion(parashot, Quiz.shuffle(traps, random)[0], 'kind', random));
        return Quiz.shuffle(questions, random);
    }

    // options : { parashot (obligatoire), rng, rounds, questions } ; `questions`, s'il est donné, fixe les questions (tests).
    function createGame(options) {
        var o = options || {};
        var questions = o.questions || pick(o.parashot, o.rng, o.rounds || ROUNDS);
        return Quiz.createState(questions, {});
    }

    function question(state) { return Quiz.question(state); }
    function answer(state, choice) { return Quiz.answer(state, choice, function (q, right) { return { id: q.id, right: right, type: q.type }; }); }
    function expire(state) { return Quiz.expire(state, function (q, right) { return { id: q.id, right: right, type: q.type }; }); }
    function next(state) { return Quiz.next(state); }

    return {
        ROUNDS: ROUNDS, TIMES: TIMES, POINTS: Quiz.POINTS, BOOK_NAMES: BOOK_NAMES,
        parashaOf: parashaOf, items: items, makeQuestion: makeQuestion, pick: pick, createGame: createGame, question: question, answer: answer, expire: expire, next: next
    };
}));
