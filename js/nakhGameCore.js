// =========================================================================
// === TORAHAXE — « DANS QUEL LIVRE DU NAKH ? » : LES RÈGLES DU JEU (pur, sans DOM, testé) ===
// =========================================================================
// Le pendant de « Dans quelle paracha ? » (js/verseGameCore.js) pour les Prophètes et les Hagiographes, qui n'ont pas de parachiot : on cherche le LIVRE (34 livres : voir js/nakhRefs.js),
// et, pour les plus forts, le CHAPITRE. Trois modes, cinq questions chacun, 100 points la question :
//   - « Livre » (mode 'book') : un verset tiré au hasard ; de quel livre vient-il ? Un indice montre le verset qui suit (dans le même livre) et coûte 20 points, cinq indices au plus ; une mauvaise
//     réponse coûte 20 points et écarte le livre choisi ; à zéro, le livre est dévoilé (rien n'est gagné).
//   - « Livre et chapitre » (mode 'chapter') : même verset, même barème pour le livre. Une fois le livre trouvé, il faut donner le chapitre, en UN SEUL essai : le chapitre exact garde tous les
//     points restants ; chaque chapitre d'écart en retire une part (voir `chapterShare`), jusqu'à zéro. Le livre trouvé compte toujours comme une bonne réponse, même si le chapitre est loin.
//   - « Contenu » (mode 'content') : le résumé d'un chapitre (data/tanakh/resume-<fichier>.json) est affiché, le nom du livre masqué ; de quel livre ? Pas d'indice, cinq essais : 100, 80, 60,
//     40 puis 20 points ; le cinquième essai raté dévoile le livre.
// Les livres sont tirés au hasard SANS REMISE (cinq livres différents par partie), avec le poids de js/nakhRefs.js (la racine carrée de la taille du livre : les Psaumes et Chroniques ne
// noient pas Ruth). Un verset n'est tiré que s'il a cinq versets après lui DANS LE MÊME LIVRE (on ne donne jamais en indice le verset d'un autre livre).
// Le tirage ne demande aucun texte (seulement la disposition des chapitres) : le jeu ne charge que les fichiers des cinq livres tirés. Le texte est celui de data/tanakh/<fichier>.json.
// La mécanique de partie (points, indices, tours, jeu à plusieurs) vient de js/quizCore.js ; le nettoyage des versets, de js/verseGameCore.js.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./nakhRefs.js'), require('./verseGameCore.js'));
    else root.NakhGameCore = factory(root.QuizCore, root.NakhRefs, root.VerseGameCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz, Refs, Verses) {
    'use strict';

    var MODES = ['book', 'chapter', 'content'];
    var ROUNDS = 5;           // questions par partie
    var START_POINTS = 100;   // points en jeu au début de chaque question
    var HINT_COST = 20;       // par indice (un verset de plus)
    var WRONG_COST = 20;      // par mauvais livre
    var MAX_HINTS = 5;        // le dernier indice fait tomber les points à zéro
    var CONTENT_TRIES = 5;    // mode Contenu : 100 - 4 × 20 = 20 points au cinquième essai
    var MAX_TOLERANCE = 6;    // chapitres d'écart à partir desquels un grand livre ne rapporte plus rien
    var MIN_TOLERANCE = 2;    // et un petit livre (Ruth : 4 chapitres)

    var CFG = { start: START_POINTS, hintCost: HINT_COST, wrongCost: WRONG_COST, maxHints: MAX_HINTS };
    var CONTENT_CFG = { start: START_POINTS, hintCost: 0, wrongCost: WRONG_COST, maxHints: 0 };

    // --- Le chapitre : la distance et les points -------------------------------------------------------------------------------------------------
    // La tolérance d'un livre : le nombre de chapitres d'écart à partir duquel le chapitre ne rapporte plus rien. Elle suit la longueur du livre (un huitième, entre 2 et 6 chapitres) :
    // 2 chapitres pour Ruth, Esther ou Daniel, 4 pour Proverbes, 6 pour les Psaumes ou Isaïe. Sans cela, dans un livre de quatre chapitres, n'importe quel chapitre serait « proche ».
    function tolerance(chapters) { return Math.min(MAX_TOLERANCE, Math.max(MIN_TOLERANCE, Math.round(chapters / 8))); }

    // La part des points gardée à `distance` chapitres de la bonne réponse : 1 au chapitre exact, puis une perte égale à chaque chapitre (1/tolérance), 0 à la tolérance.
    function chapterShare(distance, chapters) {
        var w = tolerance(chapters);
        return distance >= w ? 0 : 1 - distance / w;
    }

    // Les points gardés : la part des points en jeu, arrondie aux 5 points.
    function chapterPoints(points, distance, chapters) { return Math.round(points * chapterShare(distance, chapters) / 5) * 5; }

    // --- Le résumé d'un chapitre, sans le nom du livre -------------------------------------------------------------------------------------------
    function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    // Le résumé avec le nom du livre (`hide` de js/nakhRefs.js) remplacé par « … » : « Josué envoie deux espions » → « … envoie deux espions ». Mot entier, majuscules ou non.
    function maskSummary(text, book) {
        var out = String(text || '');
        var names = (Refs.BOOKS[book].hide || []).slice().sort(function (a, b) { return b.length - a.length; });
        names.forEach(function (name) {
            out = out.replace(new RegExp('(^|[^\\p{L}])' + escapeRe(name) + '(?![\\p{L}])', 'giu'), '$1…');
        });
        return out;
    }

    // --- Le tirage ----------------------------------------------------------------------------------------------------------------------------------
    // `rounds` livres distincts (indices dans NakhRefs.BOOKS), tirés au hasard ; `weightOf(i)` : le poids de chaque livre.
    function pickBooks(rounds, rng, weightOf) {
        var random = rng || Math.random;
        var weigh = weightOf || Refs.weight;
        var pool = Refs.BOOKS.map(function (b, i) { return i; });
        var out = [];
        while (out.length < rounds && pool.length) {
            var sum = pool.reduce(function (s, i) { return s + weigh(i); }, 0);
            var r = random() * sum;
            var k = 0;
            while (k < pool.length - 1) { r -= weigh(pool[k]); if (r < 0) break; k++; }
            out.push(pool.splice(k, 1)[0]);
        }
        return out;
    }

    // Un verset du livre `i`, tiré au hasard (chaque verset a la même chance dans son livre) parmi ceux qui laissent cinq versets d'indice après eux : { chapter, verse }.
    function pickVerse(i, rng) {
        var random = rng || Math.random;
        return Refs.at(i, Math.floor(random() * (Refs.BOOKS[i].total - MAX_HINTS)));
    }

    function makeQuestion(book, chapter, verse) {
        var b = Refs.BOOKS[book];
        return { type: 'verse', id: 'n' + book + ':' + chapter + ':' + verse, book: book, chapter: chapter, verse: verse, label: Refs.label(book, chapter, verse), file: b.file, fileChapter: Refs.fileChapter(book, chapter), chapters: b.chapters };
    }

    function resetRound(state) {
        Quiz.resetRound(state, state.cfg);
        state.stage = 'book';          // 'book' ; puis 'chapter' (mode « Livre et chapitre ») une fois le livre trouvé
        state.chapterGuess = null;     // le chapitre donné
        state.distance = null;         // son écart avec le bon chapitre
        state.kept = null;             // la part des points gardée
    }

    // options : { mode ('book' ou 'chapter'), rng, rounds, picks } ; `picks` ([{ book, chapter, verse }]), s'il est donné, fixe les questions (tests).
    function createGame(options) {
        var o = options || {};
        var mode = o.mode === 'chapter' ? 'chapter' : 'book';
        var picks = o.picks;
        if (!picks) {
            picks = pickBooks(o.rounds || Quiz.roundsFor(ROUNDS), o.rng).map(function (i) {
                var v = pickVerse(i, o.rng);
                return { book: i, chapter: v.chapter, verse: v.verse };
            });
        }
        var state = Quiz.createState(picks.map(function (p) { return makeQuestion(p.book, p.chapter, p.verse); }), { cfg: CFG, mode: mode });
        resetRound(state);
        return state;
    }

    // --- Mode « Contenu » ---------------------------------------------------------------------------------------------------------------------------
    // `summaries` : { <fichier>: { chapters: [résumés] } } (les fichiers data/tanakh/resume-<fichier>.json).
    function makeContentQuestion(summaries, book, chapter) {
        var b = Refs.BOOKS[book];
        var fileChapter = Refs.fileChapter(book, chapter);
        var raw = summaries[b.file] && summaries[b.file].chapters ? summaries[b.file].chapters[fileChapter] : '';
        return { type: 'content', id: 'c' + book + ':' + chapter, book: book, chapter: chapter, label: '', file: b.file, fileChapter: fileChapter, chapters: b.chapters, summary: maskSummary(raw, book) };
    }

    // `rounds` livres distincts, et un chapitre au hasard dans chacun. Le poids d'un livre : la racine carrée de son nombre de chapitres (les résumés sont par chapitre).
    function pickContent(rounds, rng) {
        var random = rng || Math.random;
        return pickBooks(rounds, rng, function (i) { return Math.sqrt(Refs.BOOKS[i].chapters); }).map(function (i) {
            return { book: i, chapter: 1 + Math.floor(random() * Refs.BOOKS[i].chapters) };
        });
    }

    // options : { summaries, rng, rounds, picks } ; `picks` ([{ book, chapter }]) fixe les questions (tests).
    function createContentGame(options) {
        var o = options || {};
        var picks = o.picks || pickContent(o.rounds || Quiz.roundsFor(ROUNDS), o.rng);
        var state = Quiz.createState(picks.map(function (p) { return makeContentQuestion(o.summaries || {}, p.book, p.chapter); }), { cfg: CONTENT_CFG, mode: 'content' });
        resetRound(state);
        return state;
    }

    // --- La partie ----------------------------------------------------------------------------------------------------------------------------------
    function cfgOf(state) { return state.cfg || CFG; }

    function question(state) { return Quiz.question(state); }

    // Le texte d'un verset : { he, fr, ref, chapter, verse }. `files` : { <fichier>: le contenu de data/tanakh/<fichier>.json }.
    function verseText(files, book, chapter, verse) {
        var b = Refs.BOOKS[book];
        var data = files[b.file];
        var c = Refs.fileChapter(book, chapter);
        return { he: Verses.cleanVerse(data.chapters[c][verse - 1]), fr: data.french[c][verse - 1], ref: Refs.label(book, chapter, verse), chapter: chapter, verse: verse };
    }

    // Les versets à montrer : le verset tiré, puis un de plus par indice demandé.
    function shownVerses(files, state) {
        var q = question(state), out = [];
        if (!q || q.type !== 'verse') return out;
        var n = Refs.ordinal(q.book, q.chapter, q.verse);
        for (var k = 0; k < state.shown; k++) {
            var r = Refs.at(q.book, n + k);
            if (r) out.push(verseText(files, q.book, r.chapter, r.verse));
        }
        return out;
    }

    // Un indice : le verset suivant, pour 20 points. ['hint'], et ['revealed'] en plus quand les points tombent à zéro ; [] si la question est résolue, si les cinq indices sont donnés ou
    // dans le mode Contenu.
    function hint(state) { return Quiz.roundHint(state, cfgOf(state)); }

    // Une réponse sur le livre (indice dans NakhRefs.BOOKS). ['right'] (les points restants sont gagnés), ['wrong'] (20 points de moins, le livre est écarté), ['wrong', 'revealed'] quand cette
    // erreur fait tomber les points à zéro ; [] si rien ne se passe. Dans le mode « Livre et chapitre », le bon livre ne termine pas la question : ['book'], puis `guessChapter`.
    function guessBook(state, book) {
        var q = question(state);
        if (!q || !(book >= 0) || state.over || state.resolved || state.stage !== 'book') return [];
        var right = book === q.book;
        if (right && state.mode === 'chapter') {
            if (state.wrong.indexOf(book) >= 0) return [];
            state.stage = 'chapter';
            return ['book'];
        }
        return Quiz.roundGuess(state, book, right, cfgOf(state));
    }

    // Le chapitre (de 1 au nombre de chapitres du livre), en un seul essai, une fois le livre trouvé (mode « Livre et chapitre »). ['right'] : les points gardés sont gagnés (peut-être 0) ;
    // `state.distance`, `state.kept` et `state.points` disent l'écart, la part gardée et les points gagnés. [] si rien ne se passe.
    function guessChapter(state, chapter) {
        var q = question(state);
        if (!q || state.mode !== 'chapter' || state.over || state.resolved || state.stage !== 'chapter') return [];
        if (!(chapter >= 1 && chapter <= q.chapters) || chapter !== Math.floor(chapter)) return [];
        state.chapterGuess = chapter;
        state.distance = Math.abs(chapter - q.chapter);
        state.kept = chapterShare(state.distance, q.chapters);
        state.points = chapterPoints(state.points, state.distance, q.chapters);
        return Quiz.roundGuess(state, 'c' + chapter, true, cfgOf(state));
    }

    // Question suivante : ['done'] à la fin de la partie, [] sinon.
    function next(state) {
        var events = Quiz.next(state);
        if (!events.length && !state.over) resetRound(state);
        return events;
    }

    return {
        MODES: MODES, ROUNDS: ROUNDS, START_POINTS: START_POINTS, HINT_COST: HINT_COST, WRONG_COST: WRONG_COST, MAX_HINTS: MAX_HINTS, CONTENT_TRIES: CONTENT_TRIES, CFG: CFG, CONTENT_CFG: CONTENT_CFG,
        tolerance: tolerance, chapterShare: chapterShare, chapterPoints: chapterPoints, maskSummary: maskSummary, pickBooks: pickBooks, pickVerse: pickVerse, makeQuestion: makeQuestion,
        createGame: createGame, makeContentQuestion: makeContentQuestion, pickContent: pickContent, createContentGame: createContentGame, cfgOf: cfgOf, question: question, verseText: verseText,
        shownVerses: shownVerses, hint: hint, guessBook: guessBook, guessChapter: guessChapter, next: next
    };
}));
