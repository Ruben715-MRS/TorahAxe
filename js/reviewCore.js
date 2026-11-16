// =========================================================================
// === TORAHAXE — « À RÉVISER AUJOURD'HUI » : LA RÉVISION COMMUNE À TOUS LES JEUX À MÉMOIRE (pur, sans DOM, testé) ===
// =========================================================================
// Chaque jeu à répétition espacée (« Mots du Tanakh », « Mots de la Guémara ») garde sa propre progression. Cette révision les réunit : elle prend, tous jeux
// et tous niveaux confondus, ce qui arrive à échéance aujourd'hui (js/srs.js), les plus fragiles d'abord, et en fait une seule séance de dix questions à
// quatre propositions, que js/quizCore.js fait jouer comme n'importe quelle partie. Rien de nouveau n'y est appris : on ne révise que ce qui a été vu.
// Un jeu de plus à répétition espacée s'ajoute en une ligne dans SOURCES (il doit offrir dueItems, pickType et makeQuestions).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./srs.js'), require('./lexiconGameCore.js'), require('./gemaraGameCore.js'));
    else root.ReviewCore = factory(root.QuizCore, root.SRS, root.LexiconGameCore, root.GemaraGameCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz, SRS, Lexicon, Gemara) {
    'use strict';

    // Les jeux à mémoire : `core` (leurs règles), `idKey` (le champ de l'identifiant dans les questions et les résultats), `optKey` (le nom, dans createGame/makeQuestions,
    // de la liste d'identifiants).
    var SOURCES = {
        lexicon: { core: Lexicon, idKey: 'strong', optKey: 'wordIds' },
        gemara: { core: Gemara, idKey: 'id', optKey: 'cardIds' }
    };
    var GAMES = Object.keys(SOURCES);

    // Tout ce qui est à réviser, les plus fragiles d'abord : [{ game, id, ref, entry }]. `progress` : { lexicon, gemara } (les progressions telles que stockées).
    function due(progress, now) {
        var items = [];
        GAMES.forEach(function (game) {
            SOURCES[game].core.dueItems(progress && progress[game], now).forEach(function (it) { items.push({ game: game, id: it.id, ref: it.ref, entry: it.entry }); });
        });
        return items.sort(function (a, b) { return SRS.compareUrgency(a, b); });
    }

    // Le bilan : { total, lexicon, gemara, session (combien de questions la prochaine séance contiendra) }.
    function summary(progress, now, rounds) {
        var items = due(progress, now);
        var out = { total: items.length, session: Math.min(items.length, rounds || Quiz.ROUNDS) };
        GAMES.forEach(function (game) { out[game] = items.filter(function (it) { return it.game === game; }).length; });
        return out;
    }

    // Une séance : `{ progress, now, rng, rounds, scroll }`. Les `rounds` plus urgents, puis l'ordre mélangé ; chaque question porte son jeu (`q.game`).
    // Vide (`empty`, `over`) quand rien n'est à réviser.
    function createGame(options) {
        var random = options.rng || Math.random;
        var rounds = options.rounds || Quiz.ROUNDS;
        var picks = Quiz.shuffle(due(options.progress, options.now).slice(0, rounds), random);
        var questions = [];
        GAMES.forEach(function (game) {
            var src = SOURCES[game];
            var mine = picks.filter(function (it) { return it.game === game; });
            var types = {};
            mine.forEach(function (it) { types[it.id] = src.core.pickType(it.ref, it.entry, random); });
            var made = {};
            var opts = { types: types, rng: random, scroll: !!options.scroll };
            opts[src.optKey] = mine.map(function (it) { return it.id; });
            src.core.makeQuestions(opts).forEach(function (q) { q.game = game; made[q[src.idKey]] = q; });
            mine.forEach(function (it) { if (made[it.id]) it.question = made[it.id]; });
        });
        picks.forEach(function (it) { if (it.question) questions.push(it.question); });
        return Quiz.createState(questions, { mode: 'review' });
    }

    function question(state) { return Quiz.question(state); }
    // Répond : ['right'], ['wrong'] ou [] ; le résultat garde le jeu et l'identifiant (pour enregistrer la réponse dans la bonne progression).
    function answer(state, choice) {
        return Quiz.answer(state, choice, function (q, right) { return { game: q.game, id: q[SOURCES[q.game].idKey], right: right, type: q.type }; });
    }
    function next(state) { return Quiz.next(state); }

    return { GAMES: GAMES, due: due, summary: summary, createGame: createGame, question: question, answer: answer, next: next };
}));
