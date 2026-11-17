// =========================================================================
// === TORAHAXE — « DANS QUELLE PARACHA ? » : LES RÈGLES DU JEU DU VERSET (pur, sans DOM, testé) ===
// =========================================================================
// Un verset tiré au hasard dans toute la Torah (5 846 versets) ; de quelle paracha vient-il ? On part avec 100 points. Un indice montre le verset qui suit
// directement (il passe au besoin au chapitre ou au livre suivant) et coûte 20 points : cinq indices au plus, donc six versets, et le nom de la paracha est
// dévoilé quand les points tombent à zéro. Une mauvaise réponse coûte aussi 20 points (sans quoi on gagnerait en essayant toutes les parachiot) et écarte la
// paracha choisie. Cinq versets par partie, 500 points au plus ; la partie compte le total des points restants à chaque bonne réponse.
//
// Sont exclus du tirage : les versets qui ne sont que « Vayédaber Hachem El Moché Lémor » (« L'Éternel parla à Moïse en disant »), trop nombreux pour être
// distingués, et les cinq derniers versets de la Torah (il faut pouvoir donner cinq indices). Les versets cités en indice, eux, sont tous permis.
// Le texte est celui de data/tanakh/<livre>.json (hébreu vocalisé et traduction de la Bible du Rabbinat) ; `books` : les cinq fichiers chargés, dans l'ordre.
// La mécanique de partie vient de js/quizCore.js, les références de js/torahRefs.js.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./torahRefs.js'));
    else root.VerseGameCore = factory(root.QuizCore, root.TorahRefs);
}(typeof self !== 'undefined' ? self : this, function (Quiz, Refs) {
    'use strict';

    var ROUNDS = 5;           // versets par partie
    var START_POINTS = 100;   // points en jeu au début de chaque verset
    var HINT_COST = 20;       // par indice (un verset de plus)
    var WRONG_COST = 20;      // par mauvaise réponse
    var MAX_HINTS = 5;        // donc six versets au plus (le dernier fait tomber les points à zéro)
    var FORMULA = 'וידבר יהוה אל משה לאמר';

    // --- Le texte --------------------------------------------------------------------------------------------------------------------------
    // Le verset tel qu'on le lit : sans les marques de paragraphe « (פ) » et « (ס) » (y compris au milieu d'un verset : Exode 20:13), avec le qere à la place du
    // ketiv (« ketiv#[qere] » dans la source, ou un simple « [mot] »), et le nun hafukha « (׆) » ramené à son caractère.
    function cleanVerse(text) {
        return String(text || '')
            .replace(/\s*\((?:פ|ס)\)\s*/g, ' ')
            .replace(/\S*#\[([^\]]*)\]/g, '$1')
            .replace(/\(׆\)/g, '׆')
            .replace(/[#{}\[\]]/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    // Les lettres seules, le maqaf comme une espace : de quoi reconnaître la formule.
    function consonants(text) {
        return cleanVerse(text).replace(/־/g, ' ').replace(/[֑-ׇ]/g, '').replace(/[^א-ת\s]/g, '').replace(/\s+/g, ' ').trim();
    }

    // Vrai pour un verset qui n'est que « Vayédaber Hachem El Moché Lémor ».
    function isFormula(text) { return consonants(text) === FORMULA; }

    // Le verset { book, chapter, verse } : { he, fr, ref (« Genèse 6:9 »), index }. `books` : les cinq fichiers, dans l'ordre de la Torah.
    function verse(books, index) {
        var ref = Refs.refAt(index);
        if (!ref) return null;
        var book = books[ref.book - 1];
        return { he: cleanVerse(book.chapters[ref.chapter - 1][ref.verse - 1]), fr: book.french[ref.chapter - 1][ref.verse - 1], ref: Refs.label(ref), index: index };
    }

    // Peut-on tirer ce verset au départ ? Pas la formule, et de quoi donner cinq indices.
    function eligible(books, index) {
        return index >= 0 && index <= Refs.TOTAL - 1 - MAX_HINTS && !isFormula(verse(books, index).he);
    }

    // --- La partie -------------------------------------------------------------------------------------------------------------------------
    // Une question : { type: 'verse', id, index, ref, label, book, parasha (indice dans parashot.json), parashaFr, parashaHe }.
    function makeQuestion(parashot, index) {
        var ref = Refs.refAt(index);
        var p = Refs.parashaOf(parashot, ref.book, ref.chapter, ref.verse);
        return { type: 'verse', id: 'v' + index, index: index, ref: ref, label: Refs.label(ref), book: ref.book, parasha: p, parashaFr: parashot.parashot[p].fr, parashaHe: parashot.parashot[p].he };
    }

    // `rounds` numéros de versets distincts, tirés au hasard (chaque verset a la même chance : une longue paracha sort plus souvent qu'une courte).
    function pick(books, rng, rounds) {
        var random = rng || Math.random;
        var out = [];
        var guard = 0;
        while (out.length < rounds && guard++ < 100000) {
            var i = Math.floor(random() * Refs.TOTAL);
            if (out.indexOf(i) < 0 && eligible(books, i)) out.push(i);
        }
        return out;
    }

    var CFG = { start: START_POINTS, hintCost: HINT_COST, wrongCost: WRONG_COST, maxHints: MAX_HINTS };   // la mécanique des indices : js/quizCore.js

    // options : { books, parashot, rng, rounds, indices } ; `indices`, s'il est donné, fixe les versets de départ (tests).
    function createGame(options) {
        var o = options || {};
        var indices = o.indices || pick(o.books, o.rng, o.rounds || ROUNDS);
        var state = Quiz.createState(indices.map(function (i) { return makeQuestion(o.parashot, i); }), {});
        Quiz.resetRound(state, CFG);
        return state;
    }

    function question(state) { return Quiz.question(state); }

    // Les versets à montrer : le premier et les indices demandés, [{ he, fr, ref, index }].
    function shownVerses(books, state) {
        var q = question(state), out = [];
        if (!q) return out;
        for (var k = 0; k < state.shown; k++) out.push(verse(books, q.index + k));
        return out;
    }

    // Un indice : le verset suivant, pour 20 points. ['hint'], et ['revealed'] en plus quand les points tombent à zéro (la paracha est alors dévoilée) ;
    // [] si le verset est déjà résolu ou si les cinq indices sont donnés.
    function hint(state) { return Quiz.roundHint(state, CFG); }

    // Une réponse : l'indice de la paracha (dans parashot.json). ['right'] (les points restants sont gagnés), ['wrong'] (20 points de moins, la paracha est écartée),
    // ['wrong', 'revealed'] quand cette erreur fait tomber les points à zéro ; [] si rien ne se passe (verset résolu, paracha déjà essayée).
    function guess(state, parasha) {
        var q = question(state);
        if (!q || !(parasha >= 0)) return [];
        return Quiz.roundGuess(state, parasha, parasha === q.parasha, CFG);
    }

    // Verset suivant : ['done'] à la fin de la partie, [] sinon.
    function next(state) {
        var events = Quiz.next(state);
        if (!events.length && !state.over) Quiz.resetRound(state, CFG);
        return events;
    }

    return {
        ROUNDS: ROUNDS, START_POINTS: START_POINTS, HINT_COST: HINT_COST, WRONG_COST: WRONG_COST, MAX_HINTS: MAX_HINTS,
        cleanVerse: cleanVerse, consonants: consonants, isFormula: isFormula, verse: verse, eligible: eligible, makeQuestion: makeQuestion, pick: pick,
        createGame: createGame, question: question, shownVerses: shownVerses, hint: hint, guess: guess, next: next
    };
}));
