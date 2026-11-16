// =========================================================================
// === TORAHAXE — « LE BON ORDRE » : LES RÈGLES DU JEU DE CLASSEMENT (pur, sans DOM, testé) ===
// =========================================================================
// Cinq éléments pris dans une liste dont l'ordre est connu (les parachiot dans l'ordre de la Torah, les livres du Tanakh, les traités de la Michna ou du Talmud,
// les générations d'Adam à Noé, les fils de Jacob, les rois…), donnés en désordre : il faut les remettre dans l'ordre. 20 points par élément à la bonne place
// (100 pour un classement parfait, et un classement au hasard en rapporte 20 en moyenne). Cinq classements par partie, 500 points au plus. La mécanique de partie
// est celle de js/quizCore.js.
//
// Les listes viennent des index de l'application, pas de listes écrites ici : `data` = { parashot (data/torah/parashot.json), tanakh (data/tanakh/index.json),
// michna (data/michna/index.json), talmud (data/talmud/index.json) } ; les générations viennent de js/genealogyCore.js. Deux listes ont des ordres que la tradition
// ne fixe pas d'une seule façon, et la question le dit : le Tanakh (celui des éditions imprimées ; le Talmud, Bava Batra 14b, range autrement les Prophètes et les
// Hagiographes) et le Talmud de Babylone (celui de l'édition de Vilna). Les listes de rois sont celles de l'arbre généalogique : Saül, David et Salomon, puis les
// rois de Juda dans l'ordre de leur succession.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./genealogyCore.js'));
    else root.OrderGameCore = factory(root.QuizCore, root.GenealogyCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz, Genealogy) {
    'use strict';

    var ROUNDS = 5;               // classements par partie
    var SIZE = 5;                 // éléments à classer
    var POINTS = Quiz.POINTS;     // pour un classement parfait : 100, soit 20 par élément à la bonne place
    var SECTIONS = ['all', 'textes', 'personnages'];
    var BOOK_NAMES = ['Genèse', 'Exode', 'Lévitique', 'Nombres', 'Deutéronome'];
    var TANAKH_GROUPS = { torah: 'Torah', nevi: 'Prophètes', ketouvim: 'Hagiographes' };

    function item(id, label, he, note) { return { id: id, label: label, he: he || '', note: note || '' }; }

    // --- Les listes ordonnées ----------------------------------------------------------------------------------------------------------------
    function genealogyItems(ids, noteOf) {
        return ids.map(function (id, i) { var p = Genealogy.byId(id); return item('g:' + id, p.fr, p.he, noteOf ? noteOf(i, ids.length) : ''); });
    }
    function genealogyIds(categoryId) {
        return Genealogy.CATEGORIES.filter(function (c) { return c.id === categoryId; })[0].ids;
    }
    function ordinal(n) { return n === 1 ? '1ᵉʳ' : n + 'ᵉ'; }

    // `data` : voir l'en-tête. Chaque catégorie : { id, section, instruction, size, items (dans le bon ordre), parts (facultatif : sous-listes dont on tire les éléments) }.
    function categories(data) {
        var out = [];
        var parashot = data.parashot.parashot.map(function (p, i) { return item('p:' + i, p.fr, p.he, BOOK_NAMES[p.book - 1]); });
        out.push({ id: 'parachiot', section: 'textes', instruction: 'Remettez ces parachiot dans l’ordre de la Torah.', items: parashot });
        out.push({
            id: 'parachiot_livre', section: 'textes', instruction: 'Remettez ces parachiot du même livre dans l’ordre où on les lit.', items: parashot,
            parts: BOOK_NAMES.map(function (b, k) { return parashot.filter(function (p) { return data.parashot.parashot[Number(p.id.slice(2))].book === k + 1; }); })
        });
        out.push({
            id: 'tanakh', section: 'textes', instruction: 'Remettez ces livres dans l’ordre du Tanakh, celui des éditions imprimées (Torah, Prophètes, Hagiographes).',
            items: data.tanakh.books.map(function (b) { return item('t:' + b.id, b.fr, b.he, TANAKH_GROUPS[b.group] || ''); }),
            after: 'Le Talmud (Bava Batra 14b) range les Prophètes et les Hagiographes dans un autre ordre : celui-ci est l’ordre des éditions imprimées.'
        });
        var michna = [];
        data.michna.sedarim.forEach(function (s) { s.tractates.forEach(function (t) { michna.push(item('m:' + t.id, t.fr, t.he, 'Séder ' + s.fr)); }); });
        out.push({ id: 'michna', section: 'textes', instruction: 'Remettez ces traités dans l’ordre de la Michna.', items: michna });
        var talmud = [];
        data.talmud.sedarim.forEach(function (s) { s.tractates.forEach(function (t) { talmud.push(item('b:' + t.id, t.fr, t.he, 'Séder ' + s.fr)); }); });
        out.push({
            id: 'talmud', section: 'textes', instruction: 'Remettez ces traités dans l’ordre du Talmud de Babylone (édition de Vilna).', items: talmud,
            after: 'Cet ordre diffère de celui de la Michna : par exemple, Roch Hachana précède Yoma dans le Talmud, et le suit dans la Michna.'
        });
        out.push({ id: 'generations', section: 'personnages', instruction: 'Remettez ces personnages dans l’ordre des générations, d’Adam à Noé.',
            items: genealogyItems(genealogyIds('ten'), function (i) { return ordinal(i + 1) + ' génération'; }) });
        out.push({ id: 'fils', section: 'personnages', instruction: 'Remettez ces fils de Jacob dans l’ordre de leur naissance.',
            items: genealogyItems(genealogyIds('tribes'), function (i) { return ordinal(i + 1) + ' fils'; }) });
        out.push({ id: 'rois', section: 'personnages', instruction: 'Remettez ces souverains dans l’ordre de leur règne : Saül, David et Salomon, puis ceux de Juda.',
            items: genealogyItems(genealogyIds('united').concat(genealogyIds('judah')), function (i) { return i < 3 ? 'Royaume réuni' : 'Roi de Juda'; }) });
        return out;
    }

    // --- Les questions -----------------------------------------------------------------------------------------------------------------------
    function ids(list) { return list.map(function (x) { return x.id; }); }
    function sameOrder(a, b) { return a.length === b.length && a.every(function (x, i) { return x === b[i]; }); }

    // Une question : { type: 'order', id, category, instruction, after, order (les identifiants dans le bon ordre), items (les éléments, en désordre : jamais déjà dans le bon ordre),
    // details (identifiant → { label, he, note }) }.
    function makeQuestion(category, rng) {
        var random = rng || Math.random;
        var pool = category.parts ? Quiz.shuffle(category.parts, random)[0] : category.items;
        var rank = {};
        category.items.forEach(function (it, i) { rank[it.id] = i; });
        var chosen = Quiz.shuffle(pool, random).slice(0, SIZE).sort(function (a, b) { return rank[a.id] - rank[b.id]; });
        var order = ids(chosen);
        var shuffled = Quiz.shuffle(chosen, random);
        var guard = 0;
        while (sameOrder(ids(shuffled), order) && guard++ < 50) shuffled = Quiz.shuffle(chosen, random);
        var details = {};
        chosen.forEach(function (it) { details[it.id] = { label: it.label, he: it.he, note: it.note }; });
        return { type: 'order', id: category.id + ':' + order.join(','), category: category.id, instruction: category.instruction, after: category.after || '', order: order, items: shuffled, details: details };
    }

    // Les catégories d'une partie : toutes celles de la section, dans un ordre mêlé, reprises si la section en a moins que de classements.
    function pickCategories(all, section, rng, rounds) {
        var pool = all.filter(function (c) { return section === 'all' || c.section === section; });
        var out = [];
        while (out.length < rounds) out = out.concat(Quiz.shuffle(pool, rng));
        return out.slice(0, rounds);
    }

    // options : { data, section, rng, rounds, questions } ; `questions`, s'il est donné, fixe la partie (tests).
    function createGame(options) {
        var o = options || {};
        var section = SECTIONS.indexOf(o.section) >= 0 ? o.section : 'all';
        var questions = o.questions || pickCategories(categories(o.data), section, o.rng, o.rounds || ROUNDS).map(function (c) { return makeQuestion(c, o.rng); });
        var state = Quiz.createState(questions, { section: section });
        state.last = null;           // le dernier classement rendu : { placed (identifiants), correct (booléens par place), count, points }
        return state;
    }

    function question(state) { return Quiz.question(state); }

    // Le classement rendu : les identifiants des éléments, dans l'ordre choisi (tous les cinq). Points : 20 par élément à la bonne place.
    // Renvoie ['perfect'], ['partial'] (au moins un à la bonne place) ou ['wrong'] ; [] si la réponse n'est pas un classement de cette question, ou déjà rendue.
    function submit(state, placed) {
        var q = question(state);
        if (state.over || !q || state.resolved || !Array.isArray(placed) || placed.length !== q.order.length) return [];
        if (!sameOrder(placed.slice().sort(), q.order.slice().sort())) return [];
        var correct = placed.map(function (id, i) { return id === q.order[i]; });
        var count = correct.filter(Boolean).length;
        var points = Math.round(POINTS * count / q.order.length);
        state.last = { placed: placed.slice(), correct: correct, count: count, points: points };
        state.resolved = count === q.order.length ? 'right' : count > 0 ? 'partial' : 'wrong';
        state.score += points;
        if (count === q.order.length) state.found += 1;
        state.results.push({ id: q.id, right: count === q.order.length, correct: count, points: points });
        return [count === q.order.length ? 'perfect' : count > 0 ? 'partial' : 'wrong'];
    }

    function next(state) {
        var events = Quiz.next(state);
        state.last = null;
        return events;
    }

    return {
        ROUNDS: ROUNDS, SIZE: SIZE, POINTS: POINTS, SECTIONS: SECTIONS, categories: categories, makeQuestion: makeQuestion, pickCategories: pickCategories,
        createGame: createGame, question: question, submit: submit, next: next
    };
}));
