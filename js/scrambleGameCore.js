// =========================================================================
// === TORAHAXE — « LE VERSET EN DÉSORDRE » : LES RÈGLES DU JEU DES MOTS À REMETTRE EN ORDRE (pur, sans DOM, testé) ===
// =========================================================================
// Un verset de la Torah est coupé en mots, donnés en désordre : on les remet dans l'ordre. Cinq versets par partie, 100 points en jeu pour chacun. Un mot demandé en
// indice se place tout seul à la bonne place (la première place libre) et coûte 20 points ; trois indices au plus. Une vérification fausse coûte 20 points aussi, mais
// les mots qui étaient à la bonne place restent fixés : on avance. À zéro point, le verset est dévoilé et rien n'est gagné. La mécanique de points et d'indices est
// celle de js/quizCore.js (les manches à indices), le texte et les références sont ceux du jeu « Dans quelle paracha ? » (js/verseGameCore.js, js/torahRefs.js).
//
// Un « mot » est ce qui est écrit entre deux espaces : le maqaf lie deux mots en un seul (« עַל־הָאָרֶץ »), comme dans le texte. Seul l'ordre exact du verset est
// accepté ; deux mots identiques sont interchangeables (on compare les mots, pas les pièces). La traduction française (Bible du Rabbinat) est montrée pour guider, et
// peut être masquée : sans elle, le jeu demande de connaître le verset. Le jeu a trois niveaux de longueur.
//
// Sont exclus du tirage : la formule « Vayédaber Hachem El Moché Lémor », les versets de moins de quatre mots ou de moins de trois mots différents.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./torahRefs.js'), require('./verseGameCore.js'));
    else root.ScrambleGameCore = factory(root.QuizCore, root.TorahRefs, root.VerseGameCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz, Refs, Verse) {
    'use strict';

    var ROUNDS = 5;
    var START_POINTS = 100;
    var HINT_COST = 20;
    var WRONG_COST = 20;
    var MAX_HINTS = 3;
    // Longueurs (en mots) de chaque niveau ; 'all' les réunit.
    var LEVELS = { all: [4, 16], court: [4, 6], moyen: [7, 10], long: [11, 16] };
    var LEVEL_IDS = ['all', 'court', 'moyen', 'long'];
    var CFG = { start: START_POINTS, hintCost: HINT_COST, wrongCost: WRONG_COST, maxHints: MAX_HINTS };

    // Les mots d'un verset tel qu'on le lit (voir VerseGameCore.cleanVerse).
    function words(text) { return Verse.cleanVerse(text).split(' ').filter(Boolean); }

    function distinct(list) { return list.filter(function (w, i) { return list.indexOf(w) === i; }).length; }

    function levelRange(level) { return LEVELS[level] || LEVELS.all; }

    // Un verset qu'on peut faire remettre en ordre, à ce niveau ?
    function eligible(text, level) {
        if (Verse.isFormula(text)) return false;
        var w = words(text), r = levelRange(level);
        return w.length >= r[0] && w.length <= r[1] && distinct(w) >= 3;
    }

    // Les mots mêlés : jamais dans l'ordre du verset (sauf impossibilité, qu'`eligible` écarte).
    function scramble(list, rng) {
        var out = list.slice();
        for (var guard = 0; guard < 50; guard++) {
            out = Quiz.shuffle(list, rng);
            if (out.join('\u0001') !== list.join('\u0001')) return out;
        }
        return out.slice(1).concat(out[0]);
    }

    // Une question : { type: 'scramble', id, index, ref, label, words, pool (les mots mêlés), fr }.
    function makeQuestion(books, index, rng) {
        var v = Verse.verse(books, index);
        var w = words(v.he);
        return { type: 'scramble', id: 's' + index, index: index, ref: Refs.refAt(index), label: v.ref, words: w, pool: scramble(w, rng), fr: v.fr };
    }

    // `rounds` numéros de versets distincts, de ce niveau, tirés au hasard.
    function pick(books, level, rng, rounds) {
        var random = rng || Math.random;
        var out = [];
        var guard = 0;
        while (out.length < rounds && guard++ < 200000) {
            var i = Math.floor(random() * Refs.TOTAL);
            if (out.indexOf(i) < 0 && eligible(Verse.verse(books, i).he, level)) out.push(i);
        }
        return out;
    }

    // La manche : aucun mot fixé, tous les points en jeu.
    function startRound(state) {
        var q = Quiz.question(state);
        Quiz.resetRound(state, CFG);
        state.locked = q ? q.words.map(function () { return false; }) : [];
    }

    // options : { books, level, rng, rounds, indices } ; `indices`, s'il est donné, fixe les versets (tests).
    function createGame(options) {
        var o = options || {};
        var level = LEVEL_IDS.indexOf(o.level) >= 0 ? o.level : 'all';
        var indices = o.indices || pick(o.books, level, o.rng, o.rounds || ROUNDS);
        var state = Quiz.createState(indices.map(function (i) { return makeQuestion(o.books, i, o.rng); }), { level: level });
        startRound(state);
        return state;
    }

    function question(state) { return Quiz.question(state); }

    function lockedCount(state) { return state.locked.filter(Boolean).length; }

    // Les places, dans l'ordre : le mot fixé de chaque place (le bon mot) ou null.
    function fixedWords(state) {
        var q = question(state);
        return q ? q.words.map(function (w, i) { return state.locked[i] ? w : null; }) : [];
    }

    // Les mots encore à placer : ceux du verset moins ceux qui sont fixés (en comptant les doublons), dans l'ordre mêlé de la question.
    function remainingPool(state) {
        var q = question(state);
        if (!q) return [];
        var fixed = fixedWords(state).filter(function (w) { return w !== null; });
        return q.pool.filter(function (w) {
            var k = fixed.indexOf(w);
            if (k < 0) return true;
            fixed.splice(k, 1);
            return false;
        });
    }

    // Un indice : le prochain mot se place tout seul. ['hint'], et ['revealed'] en plus quand les points tombent à zéro ; [] si le verset est résolu, si les trois indices
    // sont donnés, ou s'il ne reste que deux places libres (un indice ne laisserait plus rien à chercher).
    function hint(state) {
        var q = question(state);
        if (!q || state.over || state.resolved || q.words.length - lockedCount(state) <= 2) return [];
        var events = Quiz.roundHint(state, CFG);
        if (!events.length) return events;
        if (events.indexOf('revealed') >= 0) { state.locked = q.words.map(function () { return true; }); return events; }
        state.locked[state.locked.indexOf(false)] = true;
        return events;
    }

    // Les places où le mot posé est le bon (sans rien révéler d'autre). `placed` : la liste des mots posés, place par place (null : place libre).
    function correctPlaces(q, placed) {
        return q.words.map(function (w, i) { return placed[i] === w; });
    }

    // Une vérification : `placed` est la liste complète des mots posés, dans l'ordre des places (fixés compris). ['right'] (les points restants sont gagnés), ['wrong'] (20 points
    // de moins, les mots bien placés restent fixés), ['wrong', 'revealed'] quand cette erreur fait tomber les points à zéro ; [] si rien ne se passe (liste incomplète,
    // même arrangement déjà essayé, verset résolu).
    function check(state, placed) {
        var q = question(state);
        if (!q || placed.length !== q.words.length || placed.some(function (w) { return typeof w !== 'string'; })) return [];
        var good = correctPlaces(q, placed);
        var right = good.every(Boolean);
        var events = Quiz.roundGuess(state, placed.join('\u0001'), right, CFG);
        if (!events.length) return events;
        if (right || events.indexOf('revealed') >= 0) state.locked = q.words.map(function () { return true; });
        else good.forEach(function (ok, i) { if (ok) state.locked[i] = true; });
        return events;
    }

    // Verset suivant : ['done'] à la fin de la partie, [] sinon.
    function next(state) {
        var events = Quiz.next(state);
        if (!events.length && !state.over) startRound(state);
        return events;
    }

    return {
        ROUNDS: ROUNDS, START_POINTS: START_POINTS, HINT_COST: HINT_COST, WRONG_COST: WRONG_COST, MAX_HINTS: MAX_HINTS, LEVELS: LEVELS, LEVEL_IDS: LEVEL_IDS,
        words: words, eligible: eligible, scramble: scramble, makeQuestion: makeQuestion, pick: pick, createGame: createGame, question: question, lockedCount: lockedCount,
        fixedWords: fixedWords, remainingPool: remainingPool, hint: hint, correctPlaces: correctPlaces, check: check, next: next
    };
}));
