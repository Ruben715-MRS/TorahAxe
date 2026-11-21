// =========================================================================
// === TORAHAXE — « DÉFI GUÉMATRIA » : LES RÈGLES DU JEU DU CALCUL DES MOTS (pur, sans DOM, testé) ===
// =========================================================================
// Dix questions à quatre propositions, 100 points chacune, sur la guématria STANDARD (mispar hechrechi : alef = 1 … tav = 400 ; les lettres finales valent comme les autres) :
//  - « letter » : quelle est la valeur de cette lettre ? ;
//  - « value » : quelle est la valeur de ce mot ? (quatre propositions chiffrées) ;
//  - « word » : lequel de ces mots vaut tel nombre ? ;
//  - « same » : lequel de ces mots a la même valeur que celui-ci ?
// Quatre séries : tout, les lettres seules, les mots courts (2 ou 3 lettres), les mots longs (4 à 6 lettres). Un chronomètre est facultatif : c'est le « défi » (voir timeFor).
// La mécanique de partie (questions, score, suite, jeu à plusieurs) est celle de js/quizCore.js ; le calcul est celui de js/gematriaCore.js (celui de l'outil Guématria) ; les mots sont
// ceux du dictionnaire (js/lexiconCore.js).
//
// Les mots posés : les plus fréquents de la Bible (niveaux 2 et 3 du dictionnaire), de 2 à 6 lettres, sans traduction douteuse ni marque grammaticale, sans les Noms divins écrits en
// toutes lettres (le Tétragramme, Adonaï) : on ne les additionne pas pour un jeu. Un mot est posé une fois au plus par partie, et deux entrées aux mêmes consonnes comptent pour un seul mot.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./gematriaCore.js'), require('./lexiconCore.js'));
    else root.GimGameCore = factory(root.QuizCore, root.GematriaCore, root.LexiconCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz, Gematria, Lexicon) {
    'use strict';

    var ROUNDS = Quiz.ROUNDS;
    var SECTIONS = ['all', 'lettres', 'courts', 'longs'];
    var MIN_LETTERS = 2;
    var MAX_LETTERS = 6;
    var MIN_LEVEL = 2;
    var DIVINE = { 'יהוה': true, 'אדני': true };    // les Noms que l'on n'additionne pas pour un jeu
    // Les types de chaque série (dix questions).
    var PLANS = {
        all: ['letter', 'letter', 'value', 'value', 'value', 'value', 'word', 'word', 'same', 'same'],
        lettres: ['letter', 'letter', 'letter', 'letter', 'letter', 'letter', 'letter', 'letter', 'letter', 'letter'],
        courts: ['value', 'value', 'value', 'value', 'value', 'word', 'word', 'word', 'same', 'same'],
        longs: ['value', 'value', 'value', 'value', 'value', 'word', 'word', 'word', 'same', 'same']
    };
    var LETTER_RANGE = { all: [MIN_LETTERS, MAX_LETTERS], courts: [2, 3], longs: [4, 6] };

    // --- Les mots ------------------------------------------------------------------------------------------------------------------------------
    function value(he) { return Gematria.compute(he, 'standard').total; }

    var WORDS = [];
    var SEEN = {};
    Lexicon.search('').results.forEach(function (e) {
        if (e.doubt || e.level < MIN_LEVEL || DIVINE[e.key] || SEEN[e.key] || /^\[/.test(e.fr[0])) return;
        var c = Gematria.compute(e.he, 'standard');
        if (c.ignored || c.letters.length < MIN_LETTERS || c.letters.length > MAX_LETTERS) return;
        SEEN[e.key] = true;
        WORDS.push({ id: e.id, he: e.he, fr: e.fr[0], key: e.key, letters: c.letters.length, value: c.total });
    });

    // Les mots d'une série (longueur) ; `section` inconnue : tous.
    function wordsOf(section) {
        var r = LETTER_RANGE[section] || LETTER_RANGE.all;
        return WORDS.filter(function (w) { return w.letters >= r[0] && w.letters <= r[1]; });
    }

    // Le détail du calcul : [{ letter (la lettre ordinaire), value }] et le total.
    function breakdown(he) {
        var c = Gematria.compute(he, 'standard');
        return { parts: c.letters.map(function (l) { return { letter: l.char, value: l.value }; }), total: c.total };
    }

    // Le temps du chronomètre facultatif, en millisecondes : de quoi additionner à la main.
    function timeFor(q) {
        if (q.type === 'letter') return 10000;
        var n = q.word.letters;
        return q.type === 'value' ? 12000 + 5000 * n : 20000 + 8000 * n;
    }

    // --- Les propositions ----------------------------------------------------------------------------------------------------------------------
    function numberOption(n) { return { kind: 'num', value: n, label: String(n) }; }
    function wordOption(w) { return { kind: 'word', id: w.id, label: w.he, fr: w.fr, value: w.value }; }

    // Des totaux plausibles pour un mot dont la valeur est `v` : ceux d'une erreur d'une lettre (une lettre prise pour sa voisine ou pour une autre de même dizaine), puis des écarts
    // simples (une dizaine, une unité, une centaine) ; trois au plus, distincts, jamais `v`, jamais nuls.
    function wrongTotals(word, rng) {
        var v = word.value;
        var letters = Gematria.parse(word.he).letters;
        var values = Gematria.LETTERS.map(function (l) { return l.value; });
        var out = [];
        function add(n) { if (n > 0 && n !== v && out.indexOf(n) < 0) out.push(n); }
        Quiz.shuffle(letters.map(function (l, i) { return i; }), rng).forEach(function (i) {
            if (out.length >= 3) return;
            var own = Gematria.letterValue(letters[i].base, 'standard', letters[i].char).value;
            // une autre lettre de la même famille (unités, dizaines, centaines), ou la voisine dans l'alphabet
            var idx = values.indexOf(own);
            var neighbours = [values[idx - 1], values[idx + 1]].filter(function (x) { return x !== undefined; });
            Quiz.shuffle(neighbours, rng).slice(0, 1).forEach(function (x) { add(v - own + x); });
        });
        Quiz.shuffle([10, -10, 1, -1, 100, -100, 20, -20, 5, -5, 30, -30, 3, -3], rng).forEach(function (d) { if (out.length < 3) add(v + d); });
        return out.slice(0, 3);
    }

    // `n` mots dont la valeur n'est pas `v`, deux à deux de valeurs différentes, les plus proches (en valeur) d'abord parmi un tirage, jamais `exclude` ; `pool` : les mots possibles.
    function wordsNear(pool, v, n, exclude, rng) {
        var taken = {};
        var out = [];
        var sorted = Quiz.shuffle(pool, rng).filter(function (w) { return w.value !== v && !exclude[w.key]; });
        sorted.sort(function (a, b) { return Math.abs(a.value - v) - Math.abs(b.value - v); });
        // On prend parmi les plus proches mais pas toujours les n plus proches : de quoi varier (un tirage dans les vingt premiers).
        Quiz.shuffle(sorted.slice(0, 24), rng).forEach(function (w) {
            if (out.length < n && !taken[w.value]) { taken[w.value] = true; out.push(w); }
        });
        return out;
    }

    function pickFree(list, used, rng) { return Quiz.shuffle(list, rng).filter(function (w) { return !used[w.key]; })[0] || null; }

    // --- Les questions -------------------------------------------------------------------------------------------------------------------------
    function qLetter(section, used, rng) {
        var pool = Gematria.LETTERS.filter(function (l) { return !used['L' + l.letter]; });
        var pick = Quiz.shuffle(pool, rng)[0];
        if (!pick) return null;
        used['L' + pick.letter] = true;
        var values = Gematria.LETTERS.map(function (l) { return l.value; });
        var idx = values.indexOf(pick.value);
        // Les autres valeurs : celles des lettres voisines d'abord, pour que l'on connaisse vraiment l'alphabet.
        var near = [values[idx - 2], values[idx - 1], values[idx + 1], values[idx + 2]].filter(function (x) { return x !== undefined; });
        var wrong = Quiz.shuffle(near, rng).concat(Quiz.shuffle(values.filter(function (x) { return x !== pick.value && near.indexOf(x) < 0; }), rng)).slice(0, Quiz.CHOICES - 1);
        var all = wrong.concat(pick.value).sort(function (a, b) { return a - b; });
        return { type: 'letter', id: 'l' + pick.letter, letter: pick.letter, name: pick.name, value: pick.value, options: all.map(numberOption), answer: all.indexOf(pick.value) };
    }

    function qValue(section, used, rng) {
        var w = pickFree(wordsOf(section), used, rng);
        if (!w) return null;
        used[w.key] = true;
        var all = Quiz.shuffle(wrongTotals(w, rng).concat(w.value), rng).sort(function (a, b) { return a - b; });
        return { type: 'value', id: 'v' + w.id, word: w, value: w.value, options: all.map(numberOption), answer: all.indexOf(w.value) };
    }

    function qWord(section, used, rng) {
        var pool = wordsOf(section);
        var w = pickFree(pool, used, rng);
        if (!w) return null;
        used[w.key] = true;
        var exclude = {};
        exclude[w.key] = true;
        var wrong = wordsNear(pool, w.value, Quiz.CHOICES - 1, exclude, rng);
        if (wrong.length < Quiz.CHOICES - 1) return null;
        var all = Quiz.shuffle(wrong.concat(w), rng);
        return { type: 'word', id: 'w' + w.id, word: w, value: w.value, options: all.map(wordOption), answer: all.indexOf(w) };
    }

    // Deux mots de même valeur (consonnes différentes) : celui qu'on montre et celui qu'on cherche.
    function qSame(section, used, rng) {
        var pool = wordsOf(section);
        var byValue = {};
        pool.forEach(function (w) { (byValue[w.value] = byValue[w.value] || []).push(w); });
        var starts = pool.filter(function (w) { return !used[w.key] && byValue[w.value].some(function (x) { return x.key !== w.key && !used[x.key]; }); });
        var shown = Quiz.shuffle(starts, rng)[0];
        if (!shown) return null;
        var right = Quiz.shuffle(byValue[shown.value].filter(function (x) { return x.key !== shown.key && !used[x.key]; }), rng)[0];
        used[shown.key] = true;
        used[right.key] = true;
        var exclude = {};
        exclude[shown.key] = true;
        exclude[right.key] = true;
        var wrong = wordsNear(pool, shown.value, Quiz.CHOICES - 1, exclude, rng);
        if (wrong.length < Quiz.CHOICES - 1) return null;
        var all = Quiz.shuffle(wrong.concat(right), rng);
        return { type: 'same', id: 's' + shown.id, word: shown, value: shown.value, options: all.map(wordOption), answer: all.indexOf(right) };
    }

    var BUILDERS = { letter: qLetter, value: qValue, word: qWord, same: qSame };

    // `rounds` questions ; un type qui ne peut pas être construit est remplacé par « valeur du mot » (ou de la lettre, dans la série des lettres).
    function pick(section, rng, rounds) {
        var used = {};
        var plan = Quiz.shuffle(PLANS[section] || PLANS.all, rng).slice(0, rounds);
        var out = [];
        plan.forEach(function (type) {
            var q = BUILDERS[type](section, used, rng) || (section === 'lettres' ? qLetter(section, used, rng) : qValue(section, used, rng));
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
    function expire(state) { return Quiz.expire(state, function (q) { return { id: q.id, right: false, type: q.type }; }); }
    function next(state) { return Quiz.next(state); }

    return {
        ROUNDS: ROUNDS, POINTS: Quiz.POINTS, SECTIONS: SECTIONS, WORDS: WORDS, DIVINE: DIVINE, value: value, wordsOf: wordsOf, breakdown: breakdown, timeFor: timeFor, wrongTotals: wrongTotals,
        qLetter: qLetter, qValue: qValue, qWord: qWord, qSame: qSame, pick: pick, createGame: createGame, question: question, answer: answer, expire: expire, next: next
    };
}));
