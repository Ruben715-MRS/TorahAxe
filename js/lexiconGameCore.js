// =========================================================================
// === HISTORIAXE — « MOTS ESSENTIELS » : LES RÈGLES DU JEU DE VOCABULAIRE HÉBREU (sans DOM) ===
// =========================================================================
// Un jeu de réflexion, sans minuteur : on apprend les mots les plus fréquents de la Torah (les niveaux de fréquence du
// dictionnaire, js/lexiconCore.js). Ici, seulement les règles (états purs, sans DOM ni stockage) ; l'écran est dans
// js/app/lexicon-game.js. Testé dans tests/lexiconGameCore.test.js.
//
// Ce qu'on apprend : le mot hébreu vocalisé et sa traduction. La transcription n'est jamais montrée (un joueur qui veut apprendre
// un mot sait déjà le prononcer). Dix questions à quatre choix ; une bonne réponse vaut 100 points.
//
// Les mots du jeu (`isPlayable`) : les noms communs, verbes, adjectifs, adverbes et nombres. Sont écartés les noms propres et
// divins (Moïse, Israël, le Tétragramme… : on les lit, on ne les apprend pas comme du vocabulaire) et les mots outils (« sur »,
// « vers », « que », la marque du complément d'objet… : « marque du complément d'objet » est une mauvaise question de traduction).
//
// La mémoire (étape 2) : la même répétition espacée que pour les événements (js/srs.js, boîtes de Leitner à échéances). Un mot raté
// retombe en boîte 1 et revient le lendemain ; un mot réussi à l'échéance monte d'une boîte (1, 3, 7, 14, puis 30 jours). Un mot est
// « maîtrisé » à partir de la boîte 4 : trois révisions réussies, espacées. Chaque partie mêle, dans cet ordre de priorité, les mots
// à réviser aujourd'hui, au moins deux mots nouveaux (jusqu'à cinq, les plus fréquents d'abord) tant qu'il en reste, puis des mots déjà vus
// pour renforcer. La progression se range par numéro de Strong et se synchronise avec le compte (js/storage.js, `LEXICON_KEY`).
//
// Les extensions (étape 3) : cinq sortes de questions, choisies mot par mot selon sa maîtrise (une boîte basse reste en « que veut dire ce
// mot ? » ; plus le mot est su, plus la question se corse).
//  - he-fr   : « que veut dire ce mot ? » (le mot vocalisé, quatre traductions) ;
//  - scroll  : la même, mais le mot s'écrit sans voyelles, comme dans un rouleau de la Torah ;
//  - fr-he   : « comment dit-on … en hébreu ? » (une traduction, quatre mots hébreux) ;
//  - root    : « quelle est la racine de ce mot ? » (quatre racines de trois lettres), pour les mots dérivés dont la racine a une famille ;
//  - value   : « quelle est la valeur de ce mot en guématria ? » (quatre nombres), pour les mots de quatre lettres au plus.
// Un réglage « rouleau » met toutes les questions en lettres sans voyelles. Le niveau « courants » (378 mots) se débloque quand 80 % des
// mots très fréquents sont maîtrisés.
//
// Pas d'ambiguïté : deux mots qui partagent une traduction (« homme » pour אִישׁ et אָדָם, « avec », « moi ») ne sont jamais
// proposés ensemble, et leur libellé reçoit une seconde traduction (« homme, mari » / « homme, être humain ») pour qu'une seule
// réponse soit juste.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./lexiconCore.js'), require('./quizCore.js'), require('./srs.js'), require('./gematriaCore.js'));
    else root.LexiconGameCore = factory(root.LexiconCore, root.QuizCore, root.SRS, root.GematriaCore);
}(typeof self !== 'undefined' ? self : this, function (Lexicon, Quiz, SRS, Gematria) {
    'use strict';

    var ROUNDS = Quiz.ROUNDS;   // questions par partie
    var CHOICES = Quiz.CHOICES; // réponses proposées
    var MASTERED_BOX = 4;     // boîte à partir de laquelle un mot est « maîtrisé » (intervalle de 14 jours atteint)
    var NEW_PER_SESSION = 5;  // mots nouveaux au plus par partie…
    var MIN_NEW = 2;          // …et au moins deux tant qu'il en reste, même quand beaucoup de mots sont à réviser
    var UNLOCK_RATIO = 0.8;   // part des mots du niveau précédent à maîtriser pour débloquer le suivant
    // Les niveaux, du plus fréquent au plus rare (js/lexiconCore.js) : 3 très fréquents (Torah, 100 occurrences ou plus), 2 courants (20 à 99),
    // 1 rares (1 à 19 dans la Torah), 0 absents de la Torah (présents dans les Prophètes et les Écrits). Chacun se débloque quand 80 % du précédent est maîtrisé.
    var LEVELS = [3, 2, 1, 0];
    var TYPES = ['he-fr', 'scroll', 'fr-he', 'root', 'value'];

    // --- Quels mots jouer -----------------------------------------------------------------------------------------------
    function isName(e) { return /^(nom propre|nom divin|nom \(peuple\)|titre)/.test(e.pos); }
    function isFunctionWord(e) { return /^(préposition|particule|pronom|interjection|conjonction|adverbe de négation)/.test(e.pos); }
    function isPlayable(e) {
        return !isName(e) && !isFunctionWord(e) && !/araméen/.test(e.pos) && /^(verbe|nom|adjectif|adverbe|numéral)/.test(e.pos);
    }

    // Le genre d'un mot : les mauvaises réponses sont de même genre que la bonne (un verbe parmi des verbes).
    function kindOf(e) {
        if (/^verbe/.test(e.pos)) return 'verbe';
        if (/numéral/.test(e.pos)) return 'nombre';
        if (/^adjectif/.test(e.pos)) return 'adjectif';
        if (/^adverbe/.test(e.pos)) return 'adverbe';
        return 'nom';
    }

    // Les mots jouables d'un niveau de fréquence (3 : très fréquents, 2 : courants), du plus fréquent au moins fréquent.
    // Un niveau demandé, ramené à un niveau connu (3 par défaut).
    function clampLevel(level) { var n = Number(level); return LEVELS.indexOf(n) >= 0 ? n : 3; }
    function poolOf(level) {
        return Lexicon.ENTRIES.filter(function (e) { return e.level === level && isPlayable(e); });
    }

    // --- Le libellé d'une traduction -------------------------------------------------------------------------------------
    function glossKeys(e) { return e.fr.map(Lexicon.normalizeFrench); }
    function overlaps(a, b) {
        var kb = glossKeys(b);
        return glossKeys(a).some(function (k) { return kb.indexOf(k) >= 0; });
    }

    // Combien de mots jouables partagent chaque première traduction : si plusieurs, on ajoute la seconde au libellé.
    var firstCount = null;
    function countFirsts() {
        firstCount = {};
        Lexicon.ENTRIES.filter(isPlayable).forEach(function (e) {
            var k = Lexicon.normalizeFrench(e.fr[0]);
            firstCount[k] = (firstCount[k] || 0) + 1;
        });
    }

    // La traduction affichée comme réponse : la première, plus la seconde si la première est ambiguë.
    function labelOf(e) {
        if (!firstCount) countFirsts();
        var shared = firstCount[Lexicon.normalizeFrench(e.fr[0])] > 1;
        return shared && e.fr.length > 1 ? e.fr[0] + ', ' + e.fr[1] : e.fr[0];
    }

    // --- Les mauvaises réponses ------------------------------------------------------------------------------------------
    // `count` mots du `pool`, de même genre que `word` d'abord, qui ne partagent aucune traduction avec lui et dont le libellé diffère.
    function distractors(word, pool, rng, count) {
        var taken = {};
        taken[labelOf(word)] = true;
        var candidates = Quiz.shuffle(pool.filter(function (e) {
            return e.strong !== word.strong && !overlaps(word, e);
        }), rng);
        var same = candidates.filter(function (e) { return kindOf(e) === kindOf(word); });
        var other = candidates.filter(function (e) { return kindOf(e) !== kindOf(word); });
        var out = [];
        same.concat(other).forEach(function (e) {
            var label = labelOf(e);
            if (out.length >= count || taken[label]) return;
            taken[label] = true;
            out.push(e);
        });
        return out;
    }

    // --- Les autres sortes de questions --------------------------------------------------------------------------------------
    // Le mot sans voyelles ni signes de cantillation, comme dans un rouleau de la Torah (les lettres finales restent telles quelles).
    function scrollForm(he) { return he.replace(/[\u0591-\u05C7]/g, ''); }
    function formOf(e, scroll) { return scroll ? scrollForm(e.he) : e.he; }

    // Des mots hébreux de même genre, sans traduction commune avec `word`, et dont l'écriture affichée diffère de toutes les autres.
    function hebrewDistractors(word, pool, rng, count, scroll) {
        var taken = {};
        taken[formOf(word, scroll)] = true;
        var out = [];
        var candidates = Quiz.shuffle(pool.filter(function (e) { return e.strong !== word.strong && !overlaps(word, e); }), rng);
        var same = candidates.filter(function (e) { return kindOf(e) === kindOf(word); });
        var other = candidates.filter(function (e) { return kindOf(e) !== kindOf(word); });
        same.concat(other).forEach(function (e) {
            var form = formOf(e, scroll);
            if (out.length >= count || taken[form]) return;
            taken[form] = true;
            out.push(e);
        });
        return out;
    }

    // La question de racine : un mot dérivé (son écriture n'est pas celle de sa racine), dont la racine a une famille d'au moins deux mots dans le
    // dictionnaire, et dont le rattachement n'est pas discuté (les remarques le disent).
    function rootEligible(e) {
        return !!(e.rootKey && e.key !== e.rootKey && Lexicon.family(e.root).length >= 2 && !/discut|lexiques y voient|origine/i.test(e.note || ''));
    }

    // Trois autres racines du dictionnaire, de préférence qui ont une lettre en commun avec la bonne (des fausses pistes plausibles).
    function rootDistractors(word, rng, count) {
        var seen = {};
        seen[word.root] = true;
        var roots = [];
        Lexicon.ENTRIES.forEach(function (e) { if (e.root && !seen[e.root]) { seen[e.root] = true; roots.push(e.root); } });
        var share = function (r) { return r.split('').some(function (c) { return word.root.indexOf(c) >= 0; }); };
        var shuffled = Quiz.shuffle(roots, rng);
        return shuffled.filter(share).concat(shuffled.filter(function (r) { return !share(r); })).slice(0, count);
    }

    // La valeur d'un mot en guématria (standard, lettres finales ordinaires) ; les mots de quatre lettres au plus.
    function valueOf(e) { return Gematria.compute(e.he, 'standard').total; }
    function valueEligible(e) { return !!Gematria && e.key.length >= 2 && e.key.length <= 4; }

    // Trois autres nombres plausibles : un écart de dizaine, d'unité ou de centaine, jamais zéro ni la bonne valeur.
    function valueDistractors(value, rng, count) {
        var deltas = Quiz.shuffle([-100, -50, -30, -20, -10, -9, -7, -6, -5, -3, -2, -1, 1, 2, 3, 5, 6, 7, 9, 10, 20, 30, 50, 100], rng);
        var out = [];
        deltas.forEach(function (d) {
            var v = value + d;
            if (out.length < count && v > 0 && out.indexOf(v) < 0) out.push(v);
        });
        return out;
    }

    // Quelles questions un mot admet.
    function typesFor(e) {
        var types = ['he-fr', 'scroll', 'fr-he'];
        if (rootEligible(e)) types.push('root');
        if (valueEligible(e)) types.push('value');
        return types;
    }

    // Le poids de chaque sorte de question selon la boîte du mot : un mot fragile reste en « que veut dire ce mot ? », un mot su se corse.
    function typeWeights(box) {
        if (box <= 1) return { 'he-fr': 1 };
        if (box === 2) return { 'he-fr': 6, 'fr-he': 4 };
        if (box === 3) return { 'scroll': 3.5, 'fr-he': 3.5, 'he-fr': 1.5, 'root': 1.5 };
        return { 'scroll': 3, 'fr-he': 2.5, 'root': 2, 'value': 2.5 };
    }

    // La sorte de question d'un mot, d'après son état dans la progression (`entry`, ou rien pour un mot jamais vu).
    function pickType(word, entry, rng) {
        var allowed = typesFor(word);
        var weights = typeWeights(entry && entry.box ? entry.box : 1);
        var choices = Object.keys(weights).filter(function (t) { return allowed.indexOf(t) >= 0; });
        if (!choices.length) return 'he-fr';
        var total = choices.reduce(function (a, t) { return a + weights[t]; }, 0);
        var r = (rng || Math.random)() * total;
        for (var i = 0; i < choices.length; i++) {
            r -= weights[choices[i]];
            if (r < 0) return choices[i];
        }
        return choices[choices.length - 1];
    }

    // --- La progression ------------------------------------------------------------------------------------------------------
    // { v: 1, words: { <numéro de Strong>: { box, lastReviewed, failCount, successCount } } } : tout ce qui est abîmé est écarté.
    function normalizeProgress(raw) {
        var out = { v: 1, words: {} };
        var words = raw && typeof raw === 'object' && raw.words && typeof raw.words === 'object' ? raw.words : {};
        Object.keys(words).forEach(function (id) {
            var e = words[id];
            if (!/^H\d+$/.test(id) || !e || typeof e !== 'object') return;
            out.words[id] = {
                box: Math.min(SRS.MAX_BOX, Math.max(1, Math.round(e.box) || 1)),
                lastReviewed: e.lastReviewed > 0 ? e.lastReviewed : 0,
                failCount: e.failCount > 0 ? Math.floor(e.failCount) : 0,
                successCount: e.successCount > 0 ? Math.floor(e.successCount) : 0
            };
        });
        return out;
    }

    function isMastered(entry) { return !!entry && entry.box >= MASTERED_BOX; }

    // Une réponse sur un mot : la progression suivante (rien n'est écrit : voir `lexiconRecord` dans js/storage.js pour la version stockée).
    function recordResult(progress, strong, right, now) {
        var next = normalizeProgress(progress);
        next.words[strong] = SRS.applyResult(next.words[strong], !!right, now);
        return next;
    }

    // Le bilan d'un niveau : { total, mastered, learning (vus, pas encore maîtrisés), unseen, due (vus et à réviser aujourd'hui) }.
    function summary(progress, level, now) {
        var p = normalizeProgress(progress);
        var t = now || Date.now();
        var out = { total: 0, mastered: 0, learning: 0, unseen: 0, due: 0 };
        poolOf(clampLevel(level)).forEach(function (e) {
            var entry = p.words[e.strong];
            out.total += 1;
            if (!entry) { out.unseen += 1; return; }
            if (isMastered(entry)) out.mastered += 1; else out.learning += 1;
            if (SRS.isDue(entry, t)) out.due += 1;
        });
        return out;
    }

    // Un niveau se débloque quand 80 % du niveau qui le précède est maîtrisé : { unlocked, need, have }. Le plus fréquent est toujours ouvert.
    function unlockInfo(progress, level, now) {
        var lv = clampLevel(level);
        var i = LEVELS.indexOf(lv);
        if (i === 0) return { unlocked: true, need: 0, have: 0 };
        var s = summary(progress, LEVELS[i - 1], now);
        var need = Math.ceil(UNLOCK_RATIO * s.total);
        return { unlocked: s.mastered >= need, need: need, have: s.mastered };
    }

    // Les mots d'une partie : `{ progress, level, now, rng, rounds }` → { wordIds, types, due, fresh, extra }.
    //  1. les mots à réviser aujourd'hui, les plus fragiles d'abord (boîte basse, puis plus long retard) ;
    //  2. des mots nouveaux (au moins deux tant qu'il en reste, au plus cinq), les plus fréquents d'abord ;
    //  3. des mots déjà vus et pas encore dus, pour renforcer ;
    //  4. enfin, si la partie n'est pas pleine, d'autres mots nouveaux.
    // L'ordre final est mélangé : les mots nouveaux ne s'amassent pas au début.
    function chooseSession(options) {
        var random = options.rng || Math.random;
        var now = options.now || Date.now();
        var rounds = options.rounds || ROUNDS;
        var level = clampLevel(options.level);
        var p = normalizeProgress(options.progress);
        var seen = [], unseen = [];
        poolOf(level).forEach(function (e) { (p.words[e.strong] ? seen : unseen).push(e); });
        var due = seen.filter(function (e) { return SRS.isDue(p.words[e.strong], now); }).sort(function (a, b) {
            return SRS.compareUrgency({ entry: p.words[a.strong] }, { entry: p.words[b.strong] });
        });
        var notDue = seen.filter(function (e) { return due.indexOf(e) < 0; });
        var reserved = Math.min(MIN_NEW, unseen.length);
        var picks = due.slice(0, rounds - reserved);
        var fresh = unseen.slice(0, Math.min(unseen.length, rounds - picks.length, NEW_PER_SESSION));
        picks = picks.concat(fresh);
        var extra = Quiz.shuffle(notDue, random).slice(0, rounds - picks.length);
        picks = picks.concat(extra);
        if (picks.length < rounds) {
            var more = unseen.slice(fresh.length, fresh.length + rounds - picks.length);
            fresh = fresh.concat(more);
            picks = picks.concat(more);
        }
        var ordered = Quiz.shuffle(picks, random);
        var types = {};
        ordered.forEach(function (e) { types[e.strong] = pickType(e, p.words[e.strong], random); });
        return {
            wordIds: ordered.map(function (e) { return e.strong; }), types: types,
            due: Math.min(due.length, rounds - reserved), fresh: fresh.length, extra: extra.length
        };
    }

    // --- La partie ---------------------------------------------------------------------------------------------------------
    // Une question. `type` : voir l'en-tête ; `scroll` : tout en lettres sans voyelles. Une question : { type, strong, word, shown, prompt, options, answer } ;
    // `shown` : le mot hébreu affiché (ou, pour « fr-he », rien) ; `prompt` : la traduction demandée (« fr-he ») ; chaque proposition : { label, lang }
    // (`lang` : 'fr', 'he' ou 'num'), plus son numéro de Strong quand c'est un mot.
    function makeQuestion(word, pool, rng, type, scroll) {
        var kind = type && typesFor(word).indexOf(type) >= 0 ? type : 'he-fr';
        var useScroll = !!scroll || kind === 'scroll';
        var q = { type: kind, strong: word.strong, word: word, shown: formOf(word, useScroll), prompt: null };
        var options, answerIndex;
        if (kind === 'fr-he') {
            var wrongHe = hebrewDistractors(word, pool, rng, CHOICES - 1, !!scroll);
            var allHe = Quiz.shuffle([word].concat(wrongHe), rng);
            options = allHe.map(function (e) { return { strong: e.strong, label: formOf(e, !!scroll), lang: 'he' }; });
            answerIndex = allHe.indexOf(word);
            q.shown = null;
            q.prompt = labelOf(word);
        } else if (kind === 'root') {
            var roots = Quiz.shuffle([word.root].concat(rootDistractors(word, rng, CHOICES - 1)), rng);
            options = roots.map(function (r) { return { label: r, lang: 'he' }; });
            answerIndex = roots.indexOf(word.root);
        } else if (kind === 'value') {
            var value = valueOf(word);
            var values = Quiz.shuffle([value].concat(valueDistractors(value, rng, CHOICES - 1)), rng);
            options = values.map(function (v) { return { label: String(v), lang: 'num', value: v }; });
            answerIndex = values.indexOf(value);
        } else {
            var wrong = distractors(word, pool, rng, CHOICES - 1);
            var all = Quiz.shuffle([word].concat(wrong), rng);
            options = all.map(function (e) { return { strong: e.strong, label: labelOf(e), lang: 'fr' }; });
            answerIndex = all.indexOf(word);
        }
        q.options = options;
        q.answer = answerIndex;
        return q;
    }

    // `options` : { level: 3, rng, rounds, wordIds, types, scroll } ; `wordIds` (numéros de Strong), s'il est donné, fixe les mots et leur ordre ;
    // `types` : { <numéro de Strong>: sorte de question } (par défaut « he-fr ») ; `scroll` : tout en lettres sans voyelles.
    // Les distractors viennent du niveau choisi, complété par les mots jouables des autres niveaux si le niveau est trop petit.
    function createGame(options) {
        options = options || {};
        var random = options.rng || Math.random;
        var level = clampLevel(options.level);
        var pool = poolOf(level);
        var everyone = Lexicon.ENTRIES.filter(isPlayable);
        var byStrong = {};
        everyone.forEach(function (e) { byStrong[e.strong] = e; });
        var rounds = options.rounds || ROUNDS;
        var words = options.wordIds
            ? options.wordIds.map(function (id) { return byStrong[id]; }).filter(Boolean)
            : Quiz.shuffle(pool, random);
        words = words.slice(0, rounds);
        var distractPool = pool.length >= 12 ? pool : everyone;
        var questions = words.map(function (w) { return makeQuestion(w, distractPool, random, options.types && options.types[w.strong], options.scroll); });
        return Quiz.createState(questions, { level: level, scroll: !!options.scroll });
    }

    // Les mots déjà vus et à réviser aujourd'hui, tous niveaux confondus : [{ id (numéro de Strong), ref (le mot), entry (sa progression) }]. Sert à la révision commune (js/reviewCore.js).
    function dueItems(progress, now) {
        var p = normalizeProgress(progress);
        var t = now || Date.now();
        return Lexicon.ENTRIES.filter(function (e) { return isPlayable(e) && p.words[e.strong] && SRS.isDue(p.words[e.strong], t); })
            .map(function (e) { return { id: e.strong, ref: e, entry: p.words[e.strong] }; });
    }

    // Les questions de ces mots (`wordIds`, avec `types` : numéro de Strong → sorte de question) : chaque mot a ses mauvaises réponses dans son propre niveau.
    function makeQuestions(options) {
        var random = options.rng || Math.random;
        var everyone = Lexicon.ENTRIES.filter(isPlayable);
        var byStrong = {};
        everyone.forEach(function (e) { byStrong[e.strong] = e; });
        var pools = {};
        return (options.wordIds || []).map(function (id) { return byStrong[id]; }).filter(Boolean).map(function (w) {
            var pool = pools[w.level] || (pools[w.level] = poolOf(w.level));
            return makeQuestion(w, pool.length >= 12 ? pool : everyone, random, options.types && options.types[w.strong], options.scroll);
        });
    }

    function question(state) { return Quiz.question(state); }
    // Répond en choisissant une proposition (0 à 3) : ['right'], ['wrong'], ou [] si rien ne se passe.
    function answer(state, choice) { return Quiz.answer(state, choice, function (q, right) { return { strong: q.strong, right: right, type: q.type }; }); }
    // Question suivante : ['done'] à la fin de la partie, [] sinon.
    function next(state) { return Quiz.next(state); }

    return {
        ROUNDS: ROUNDS, CHOICES: CHOICES, POINTS: Quiz.POINTS, MASTERED_BOX: MASTERED_BOX, NEW_PER_SESSION: NEW_PER_SESSION, MIN_NEW: MIN_NEW,
        normalizeProgress: normalizeProgress, isMastered: isMastered, recordResult: recordResult, summary: summary, chooseSession: chooseSession,
        LEVELS: LEVELS, clampLevel: clampLevel, UNLOCK_RATIO: UNLOCK_RATIO, TYPES: TYPES, unlockInfo: unlockInfo, scrollForm: scrollForm, valueOf: valueOf, typesFor: typesFor, pickType: pickType,
        rootEligible: rootEligible, hebrewDistractors: hebrewDistractors,
        isName: isName, isFunctionWord: isFunctionWord, isPlayable: isPlayable, kindOf: kindOf, poolOf: poolOf,
        labelOf: labelOf, overlaps: overlaps, distractors: distractors,
        createGame: createGame, dueItems: dueItems, makeQuestions: makeQuestions, question: question, answer: answer, next: next
    };
}));
