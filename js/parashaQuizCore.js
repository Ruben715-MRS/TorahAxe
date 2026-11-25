// =========================================================================
// === TORAHAXE — « QUIZ DE LA PARACHA » : LES RÈGLES DU QUIZ PAR NIVEAUX (pur, sans DOM, testé) ===
// =========================================================================
// Un quiz sur une paracha, à trois niveaux : niveau 1 (facile, 100 points : les faits du texte), niveau 2 (moyen, 200 points : les détails, les nombres), niveau 3 (difficile, 300 points :
// les « pourquoi » d'après Rachi). On CHOISIT SON NIVEAU AVANT DE COMMENCER et on y reste jusqu'au bout : la partie tire ses questions dans ce niveau seulement.
// Deux modes, choisis avant de commencer :
//   - CLASSÉ (`classe`) : six questions, chacune chronométrée (30 s au niveau 1, 45 s au niveau 2, 60 s au niveau 3). Une bonne réponse rapporte les points du niveau, et jusqu'à la moitié
//     de plus si elle vient vite (`bonusOf`) : le temps restant compte, le niveau de base reste acquis. Un temps écoulé compte comme une mauvaise réponse. Une mauvaise réponse ne rapporte rien.
//   - ENTRAÎNEMENT (`entrainement`) : toutes les questions du niveau, sans chronomètre ni score. Après chaque erreur, la source s'affiche et la proposition est retirée : on peut réessayer
//     autant de fois qu'il faut. `found` compte les bonnes réponses du premier coup. Jamais à plusieurs.
// Une partie CLASSÉE compte six questions (trois par joueur à plusieurs : voir js/quizCore.js, `roundsFor`), jamais plus que le niveau n'en a.
// À PLUSIEURS (classé seulement), une mauvaise réponse ou un temps écoulé permet au joueur suivant de VOLER LA QUESTION : le tour suivant est cette même question, sans la proposition déjà essayée en vain, aux mêmes points de base.
// La question volée prend la place du tour suivant : le nombre de tours de chacun ne change pas.
//
// Les questions sont dans data/torah/quiz/<paracha>.json (une paracha par fichier ; index.json en donne la liste), écrites pour TorahAxe d'après le texte de la Torah (Bible du Rabbinat) et le
// commentaire de Rachi. Chacune porte sa référence et des « mots-preuves » qui doivent figurer dans le verset (niveaux 1 et 2) ou dans Rachi (niveau 3) : tests/parashaQuizData.test.js le vérifie.
// Format d'un fichier : { v: 1, parasha: 'Vayétsé', levels: { '1': [question], '2': [question], '3': [question] } } ; une question :
//   { q: la question, a: la bonne réponse, w: [trois mauvaises réponses], ref: 'chapitre:verset' | 'c:v-v' | 'c:v-c:v', proof: [mots-preuves], x: l'explication affichée après la réponse }.
// Une réponse est un texte, ou { t: le nom, he: son écriture hébraïque (avec voyelles) } quand les quatre réponses sont des noms de personnes ou de lieux : l'hébreu s'affiche alors sous chaque nom.
// La mécanique de partie (score, suite, jeu à plusieurs) est celle de js/quizCore.js.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'));
    else root.ParashaQuizCore = factory(root.QuizCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz) {
    'use strict';

    var LEVELS = [1, 2, 3];
    var ROUNDS = 6;
    var CHOICES = 4;
    var CLASSE = 'classe';
    var PRACTICE = 'entrainement';
    var MODES = [CLASSE, PRACTICE];
    var LIMIT_S = { 1: 30, 2: 45, 3: 60 };   // secondes par question, en mode classé
    var BONUS = 0.5;                          // une réponse immédiate rapporte jusqu'à 50 % de plus que le niveau

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

    // Le temps d'une question classée, en millisecondes.
    function limitOf(level) { return LIMIT_S[level] * 1000; }

    // Les points d'une bonne réponse classée : les points du niveau, plus jusqu'à BONUS de plus selon le temps restant (`leftMs`, sur `limitOf`).
    // Sans temps connu (`leftMs` absent ou null), les points du niveau.
    function bonusOf(level, leftMs) {
        if (leftMs === null || leftMs === undefined) return pointsOf(level);
        var share = Math.min(1, Math.max(0, leftMs / limitOf(level)));
        return Math.round(pointsOf(level) * (1 + BONUS * share));
    }

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

    // Le texte d'une réponse (un texte, ou { t, he }) et son écriture hébraïque (ou '').
    function textOf(x) { return typeof x === 'string' ? x : x.t; }
    function hebrewOf(x) { return typeof x === 'string' ? '' : (x.he || ''); }

    // Une question prête à jouer : les quatre réponses mêlées (avec leur hébreu, s'il y en a), l'indice de la bonne.
    function prepare(raw, level, rng) {
        var all = Quiz.shuffle([raw.a].concat(raw.w), rng);
        var right = textOf(raw.a);
        return {
            id: level + ':' + raw.ref + ':' + raw.q.slice(0, 24), type: 'quiz', level: level, q: raw.q, a: right, ah: hebrewOf(raw.a), x: raw.x || '', ref: raw.ref, rashi: level === 3,
            options: all.map(function (x) { return { label: textOf(x), he: hebrewOf(x) }; }), answer: all.map(textOf).indexOf(right)
        };
    }

    // --- La partie -----------------------------------------------------------------------------------------------------------------------------
    // options : { data, level, mode, rng, rounds } ; `level` : le niveau choisi (1 par défaut) ; `mode` : CLASSE (par défaut) ou PRACTICE (entraînement) ; `rounds` : le nombre de tours
    // (six par défaut en classé, plus à plusieurs : voir quizCore.roundsFor ; toutes les questions en entraînement), jamais plus que de questions dans ce niveau. Les questions sont
    // tirées au hasard dans le niveau. Un entraînement n'est jamais à plusieurs : il annule la prochaine partie à plusieurs annoncée.
    function createGame(options) {
        var o = options || {};
        var level = LEVELS.indexOf(o.level) >= 0 ? o.level : 1;
        var practice = o.mode === PRACTICE;
        if (practice) Quiz.setPendingPlayers(null);
        var pool = poolOf(o.data, level);
        var rounds = Math.min(practice ? pool.length : (o.rounds || Quiz.roundsFor(ROUNDS)), pool.length);
        var questions = Quiz.shuffle(pool, o.rng).slice(0, rounds).map(function (raw) { return prepare(raw, level, o.rng); });
        return Quiz.createState(questions, {
            level: level, parasha: o.data && o.data.parasha, mode: practice ? PRACTICE : CLASSE, practice: practice, timed: !practice,
            limitMs: practice ? null : limitOf(level), maxScore: practice ? 0 : Math.round(questions.length * pointsOf(level) * (1 + BONUS)),
            attempts: 0, tried: []
        });
    }

    function question(state) { return Quiz.question(state); }

    // Une question volée : la même question, sans la réponse que le joueur précédent a essayée en vain, aux mêmes points.
    function steal(q, wrongChoice) {
        var rest = q.options.filter(function (o, i) { return i !== wrongChoice; });
        return { id: q.id + ':vol', type: 'quiz', level: q.level, q: q.q, a: q.a, x: q.x, ref: q.ref, rashi: q.rashi, steal: true, ah: q.ah, options: rest, answer: rest.map(function (o) { return o.label; }).indexOf(q.a) };
    }

    // Classé. Répond : ['right'] ou ['wrong'] ; [] si rien ne se passe. `leftMs` : le temps restant quand le joueur répond (null hors chrono) ; une bonne réponse rapporte
    // `bonusOf(niveau, leftMs)`. À plusieurs, une mauvaise sur une question qui n'est pas déjà volée donne la même question au joueur suivant (s'il reste un tour).
    function answer(state, choice, leftMs) {
        var q = Quiz.question(state);
        if (!q) return [];
        if (state.practice) return tryAnswer(state, choice);
        var events = Quiz.answer(state, choice, function (x, right) { return { id: x.id, right: right, level: x.level, steal: !!x.steal, points: 0 }; });
        if (events[0] === 'right') {
            var points = bonusOf(q.level, state.timed ? leftMs : null);
            state.score += points - Quiz.POINTS;      // Quiz.answer a déjà ajouté 100
            state.results[state.results.length - 1].points = points;
        }
        if (events[0] === 'wrong' && state.multi && !q.steal && state.index + 1 < state.questions.length) {
            state.questions[state.index + 1] = steal(q, choice);
        }
        return events;
    }

    // Classé. Le temps est écoulé sans réponse : une mauvaise réponse, rien de gagné ; à plusieurs, la question est volée au joueur suivant (toutes les propositions, sans retrait).
    // Renvoie ['timeout'], ou [] si la question est déjà répondue.
    function timeout(state) {
        var q = Quiz.question(state);
        if (!q) return [];
        var events = Quiz.expire(state, function (x) { return { id: x.id, right: false, level: x.level, steal: !!x.steal, points: 0 }; });
        if (events[0] === 'timeout' && state.multi && !q.steal && state.index + 1 < state.questions.length) {
            state.questions[state.index + 1] = steal(q, null);
        }
        return events;
    }

    // Entraînement. Une proposition : ['right'] si c'est la bonne (la question est résolue), ['wrong'] sinon (la proposition est retirée, on peut en essayer une autre) ;
    // [] si la proposition est déjà essayée ou si rien ne se passe. `found` compte les bonnes réponses du premier coup ; `results` garde le nombre d'essais.
    function tryAnswer(state, choice) {
        var q = Quiz.question(state);
        if (state.over || !q || state.resolved || !(choice >= 0 && choice < q.options.length) || state.tried.indexOf(choice) >= 0) return [];
        if (choice !== q.answer) {
            state.attempts += 1;
            state.tried.push(choice);
            return ['wrong'];
        }
        state.resolved = 'right';
        state.picked = choice;
        if (state.attempts === 0) state.found += 1;
        state.results.push({ id: q.id, right: state.attempts === 0, level: q.level, attempts: state.attempts, points: 0 });
        return ['right'];
    }

    // Tour suivant : ['done'] à la fin de la partie, [] sinon. Les essais repartent de zéro.
    function next(state) {
        var events = Quiz.next(state);
        state.attempts = 0;
        state.tried = [];
        return events;
    }

    return {
        LEVELS: LEVELS, ROUNDS: ROUNDS, CHOICES: CHOICES, CLASSE: CLASSE, PRACTICE: PRACTICE, MODES: MODES, BONUS: BONUS, slug: slug, parseRef: parseRef, pointsOf: pointsOf, limitOf: limitOf, bonusOf: bonusOf,
        poolOf: poolOf, counts: counts, total: total, textOf: textOf, hebrewOf: hebrewOf, prepare: prepare, createGame: createGame,
        question: question, steal: steal, answer: answer, timeout: timeout, tryAnswer: tryAnswer, next: next
    };
}));
