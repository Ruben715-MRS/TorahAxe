// =========================================================================
// === TORAHAXE — « QUIZ DE LA PARACHA » : LES RÈGLES DU QUIZ PAR NIVEAUX (pur, sans DOM, testé) ===
// =========================================================================
// Un quiz sur une paracha, à trois niveaux : niveau 1 (facile, 100 points : les faits du texte), niveau 2 (moyen, 200 points : les détails, les nombres), niveau 3 (difficile, 300 points :
// les « pourquoi » d'après Rachi). AVANT CHAQUE QUESTION, le joueur choisit son niveau ; la question est alors tirée dans ce niveau. Une partie compte six questions (trois par joueur à
// plusieurs : voir js/quizCore.js, `roundsFor`). Une bonne réponse rapporte les points du niveau, une mauvaise n'en rapporte pas.
// À PLUSIEURS, une mauvaise réponse permet au joueur suivant de VOLER LA QUESTION : le tour suivant est cette même question, sans la proposition déjà essayée en vain, aux mêmes points,
// et sans choix de niveau. La question volée prend la place du tour suivant : le nombre de tours de chacun ne change pas.
//
// Les questions sont dans data/torah/quiz/<paracha>.json (une paracha par fichier ; index.json en donne la liste), écrites pour TorahAxe d'après le texte de la Torah (Bible du Rabbinat) et le
// commentaire de Rachi. Chacune porte sa référence et des « mots-preuves » qui doivent figurer dans le verset (niveaux 1 et 2) ou dans Rachi (niveau 3) : tests/parashaQuizData.test.js le vérifie.
// Format d'un fichier : { v: 1, parasha: 'Vayétsé', levels: { '1': [question], '2': [question], '3': [question] } } ; une question :
//   { q: la question, a: la bonne réponse, w: [trois mauvaises réponses], ref: 'chapitre:verset' | 'c:v-v' | 'c:v-c:v', proof: [mots-preuves], x: l'explication affichée après la réponse }.
// La mécanique de partie (score, suite, jeu à plusieurs) est celle de js/quizCore.js.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'));
    else root.ParashaQuizCore = factory(root.QuizCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz) {
    'use strict';

    var LEVELS = [1, 2, 3];
    var ROUNDS = 6;
    var CHOICES = 4;

    // L'identifiant d'une paracha : son nom sans accent, en minuscules, les espaces et apostrophes remplacés par des traits d'union (« Vayichla'h » → « vayichla-h »).
    function slug(name) {
        return String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    // « 29:24 », « 31:19-20 », « 29:35-30:1 » → { from: { c, v }, to: { c, v } } ; null si le texte n'est pas une référence.
    function parseRef(text) {
        var m = /^(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/.exec(String(text).trim());
        if (!m) return null;
        var from = { c: +m[1], v: +m[2] };
        var to = m[4] ? { c: m[3] ? +m[3] : from.c, v: +m[4] } : { c: from.c, v: from.v };
        return { from: from, to: to };
    }

    // Les points d'une bonne réponse à ce niveau : 100, 200, 300.
    function pointsOf(level) { return level * Quiz.POINTS; }

    // --- Les données ---------------------------------------------------------------------------------------------------------------------------
    // Les questions d'un niveau d'un fichier, ou [].
    function poolOf(data, level) { return (data && data.levels && data.levels[String(level)]) || []; }

    // Le nombre de questions de chaque niveau : { 1: n, 2: n, 3: n }.
    function counts(data) {
        var out = {};
        LEVELS.forEach(function (l) { out[l] = poolOf(data, l).length; });
        return out;
    }

    function total(data) { return LEVELS.reduce(function (n, l) { return n + poolOf(data, l).length; }, 0); }

    // Une question prête à jouer : les quatre réponses mêlées, l'indice de la bonne.
    function prepare(raw, level, rng) {
        var all = Quiz.shuffle([raw.a].concat(raw.w), rng);
        return { id: level + ':' + raw.ref + ':' + raw.q.slice(0, 24), type: 'quiz', level: level, q: raw.q, a: raw.a, x: raw.x || '', ref: raw.ref, rashi: level === 3, options: all.map(function (label) { return { label: label }; }), answer: all.indexOf(raw.a) };
    }

    // --- La partie -----------------------------------------------------------------------------------------------------------------------------
    // options : { data, rng, rounds } ; `rounds` : le nombre de tours (six par défaut, plus à plusieurs : voir quizCore.roundsFor) ; jamais plus que de questions disponibles.
    // Les tours sont vides (`null`) jusqu'à ce que le joueur choisisse son niveau (choose). `queues` : les questions restantes de chaque niveau, mêlées.
    function createGame(options) {
        var o = options || {};
        var rounds = Math.min(o.rounds || Quiz.roundsFor(ROUNDS), total(o.data));
        var queues = {};
        LEVELS.forEach(function (l) { queues[l] = Quiz.shuffle(poolOf(o.data, l), o.rng).map(function (raw) { return prepare(raw, l, o.rng); }); });
        var turns = [];
        for (var i = 0; i < rounds; i++) turns.push(null);
        var state = Quiz.createState(turns, { queues: queues, parasha: o.data && o.data.parasha, maxScore: 0 });
        return state;
    }

    function question(state) { return Quiz.question(state); }

    // Le tour en cours attend-il le choix d'un niveau ? (jamais pour une question volée : elle est déjà là)
    function pending(state) { return !state.over && !state.empty && !Quiz.question(state); }

    // Les questions encore disponibles à chaque niveau.
    function available(state) {
        var out = {};
        LEVELS.forEach(function (l) { out[l] = state.queues[l].length; });
        return out;
    }

    // Reste-t-il de quoi jouer le tour en cours ? Sinon la partie est finie (on ne pose pas deux fois une question).
    function playable(state) {
        return !!Quiz.question(state) || LEVELS.some(function (l) { return state.queues[l].length > 0; });
    }

    // Le joueur choisit son niveau : la question de ce niveau est tirée. ['chosen'] ; [] si le tour n'attend pas de choix ou si le niveau n'a plus de question.
    function choose(state, level) {
        if (!pending(state) || LEVELS.indexOf(level) < 0 || !state.queues[level].length) return [];
        var q = state.queues[level].shift();
        state.questions[state.index] = q;
        state.maxScore += pointsOf(level);
        return ['chosen'];
    }

    // Une question volée : la même question, sans la réponse que le joueur précédent a essayée en vain, aux mêmes points.
    function steal(q, wrongChoice) {
        var rest = q.options.filter(function (o, i) { return i !== wrongChoice; });
        return { id: q.id + ':vol', type: 'quiz', level: q.level, q: q.q, a: q.a, x: q.x, ref: q.ref, rashi: q.rashi, steal: true, options: rest, answer: rest.map(function (o) { return o.label; }).indexOf(q.a) };
    }

    // Répond. ['right'] ou ['wrong'] ; [] si rien ne se passe. Une bonne réponse rapporte les points du niveau ; à plusieurs, une mauvaise sur une question qui n'est pas déjà volée
    // donne la même question au joueur suivant (s'il reste un tour).
    function answer(state, choice) {
        var q = Quiz.question(state);
        if (!q) return [];
        var events = Quiz.answer(state, choice, function (x, right) { return { id: x.id, right: right, level: x.level, steal: !!x.steal }; });
        if (events[0] === 'right') state.score += (q.level - 1) * Quiz.POINTS;
        if (events[0] === 'wrong' && state.multi && !q.steal && state.index + 1 < state.questions.length) {
            state.questions[state.index + 1] = steal(q, choice);
            state.maxScore += pointsOf(q.level);
        }
        return events;
    }

    // Tour suivant : ['done'] à la fin de la partie, [] sinon.
    function next(state) { return Quiz.next(state); }

    return {
        LEVELS: LEVELS, ROUNDS: ROUNDS, CHOICES: CHOICES, slug: slug, parseRef: parseRef, pointsOf: pointsOf, poolOf: poolOf, counts: counts, total: total, prepare: prepare, createGame: createGame,
        question: question, pending: pending, available: available, playable: playable, choose: choose, steal: steal, answer: answer, next: next
    };
}));
