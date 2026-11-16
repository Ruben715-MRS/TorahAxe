// =========================================================================
// === HISTORIAXE — « MOTS DE LA GUÉMARA » : LES RÈGLES DU JEU D'ENTRAÎNEMENT (sans DOM) ===
// =========================================================================
// Un jeu de réflexion, sans minuteur : on apprend ce que contient le dictionnaire araméen (js/gemaraCore.js) — ses mots, ses abréviations et ses
// sages. Ici, seulement les règles (états purs, sans DOM ni stockage) ; l'écran est dans js/app/gemara-game.js. Testé dans tests/gemaraGameCore.test.js.
// Le moteur suit celui de « Mots essentiels » (js/lexiconGameCore.js) : dix questions à quatre choix, 100 points par bonne réponse, répétition
// espacée (js/srs.js, boîtes de Leitner à échéances), parties qui mêlent les cartes à réviser aujourd'hui et des cartes nouvelles.
//
// Une « carte » est un mot, une abréviation ou un sage. Son identifiant est stable quand le dictionnaire grandit : un préfixe (w, a, s) et les
// lettres hébraïques de son écriture (« w:מאי », « a:קו », « s:רביעקיבא »). La progression se range par identifiant et se synchronise avec le
// compte (js/storage.js, `GEMARA_KEY`) : { v: 1, cards: { <identifiant>: { box, lastReviewed, failCount, successCount } } }.
//
// Les questions, selon la carte (un mot raté reste à la première ; plus il est su, plus on passe aux suivantes) :
//  - mot         : ar-fr « que veut dire ce mot ? » (le mot vocalisé, quatre traductions) · fr-ar « comment dit-on… en araméen ? » ;
//  - abréviation : sigle-fr « que signifie ce sigle ? » · fr-sigle « quelle abréviation correspond à… ? » ;
//  - sage        : sage-name « qui est ce sage ? » (son nom hébreu, quatre noms français) · sage-era « à quelle époque a-t-il enseigné ? »
//                  (quatre réponses : Zougot, Tannaïm, Amoraïm d'Israël, Amoraïm de Babylonie).
// Les sigles de maîtres (ר״ע, ר״מ…) sont des abréviations comme les autres, quand ils ne désignent qu'un maître ; ceux dont le sens dépend du passage
// (ר״י, ר״א, ר״ג, ר״ח) n'ont pas de bonne réponse unique : ils sont dans le dictionnaire, pas dans le jeu.
// Seules des questions à réponse certaine : jamais « qui est le disciple de… ? », dont la liste est incomplète (un vrai disciple non listé serait
// compté faux). Deux mots ou abréviations qui partagent une traduction — ou dont l'une contient l'autre (« même » et « même si ») — ne sont jamais proposés
// ensemble, et leur libellé reçoit une seconde traduction quand la première est ambiguë, pour qu'une seule réponse soit juste.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./gemaraCore.js'), require('./lexiconCore.js'), require('./quizCore.js'), require('./srs.js'));
    else root.GemaraGameCore = factory(root.GemaraCore, root.LexiconCore, root.QuizCore, root.SRS);
}(typeof self !== 'undefined' ? self : this, function (Gemara, Lexicon, Quiz, SRS) {
    'use strict';

    var ROUNDS = Quiz.ROUNDS; // questions par partie
    var CHOICES = Quiz.CHOICES; // réponses proposées (l'époque d'un sage en propose autant que de groupes : quatre)
    var MASTERED_BOX = 4;     // boîte à partir de laquelle une carte est « maîtrisée » (intervalle de 14 jours atteint)
    var NEW_PER_SESSION = 5;  // cartes nouvelles au plus par partie…
    var MIN_NEW = 2;          // …et au moins deux tant qu'il en reste
    var SECTIONS = ['all', 'words', 'abbr', 'sages'];
    var KIND_OF_SECTION = { words: 'w', abbr: 'a', sages: 's' };
    var TYPES = ['ar-fr', 'fr-ar', 'sigle-fr', 'fr-sigle', 'sage-name', 'sage-era'];
    var TYPES_OF_KIND = { w: ['ar-fr', 'fr-ar'], a: ['sigle-fr', 'fr-sigle'], s: ['sage-name', 'sage-era'] };

    // --- Les cartes ------------------------------------------------------------------------------------------------------
    // { id, kind, ref (l'entrée du dictionnaire), key, priority } : `priority` ordonne les cartes nouvelles (1 : l'essentiel d'abord).
    var ALL = [];
    var BY_ID = {};
    Gemara.ENTRIES.forEach(function (e) { ALL.push({ id: 'w:' + e.key, kind: 'w', ref: e, key: e.key, priority: e.tier === 1 ? 1 : 3 }); });
    // Un sigle qui désigne plusieurs maîtres (ר״י…) n'est pas une carte : sa bonne réponse dépend du passage, il n'y en a pas une seule.
    Gemara.ABBREVIATIONS.forEach(function (a) { if (!a.ambiguous) ALL.push({ id: 'a:' + a.key, kind: 'a', ref: a, key: a.key, priority: a.cat === 'sages' ? 3 : 2 }); });
    Gemara.SAGES.forEach(function (s) { ALL.push({ id: 's:' + s.key, kind: 's', ref: s, key: s.key, priority: s.fame === 3 ? 2 : s.fame === 2 ? 3 : 4 }); });
    ALL.forEach(function (c, i) { c.order = i; BY_ID[c.id] = c; });

    function cardById(id) { return BY_ID[id] || null; }

    // Les cartes d'une section, l'essentiel d'abord (à priorité égale, l'ordre du dictionnaire).
    function pool(section) {
        var kind = KIND_OF_SECTION[section];
        return ALL.filter(function (c) { return !kind || c.kind === kind; }).sort(function (a, b) { return a.priority - b.priority || a.order - b.order; });
    }

    // --- Les libellés de traduction -------------------------------------------------------------------------------------
    // Les traductions normalisées d'une carte, calculées une fois (la comparaison de toutes les paires de cartes les redemande des centaines de milliers de fois).
    function glossKeys(c) { return c.glossKeys || (c.glossKeys = c.ref.fr.map(Lexicon.normalizeFrench)); }
    // Les mots-outils : une traduction faite d'eux seuls (« que », « ce », « il est ») est contenue dans trop de phrases pour compter comme un recoupement.
    var STOP = ' que qui ce cet cette ces un une il elle le la les de du des a au en et si ne pas est sont nous on quel quelle ';
    function hasContent(phrase) { return phrase.split(' ').some(function (w) { return w && STOP.indexOf(' ' + w + ' ') < 0; }); }
    // Une traduction en contient une autre, mot pour mot (« quelle en est la raison » contient « la raison », « même si » contient « même »).
    function containsPhrase(a, b) { return hasContent(b) && (' ' + a + ' ').indexOf(' ' + b + ' ') >= 0; }
    // Deux cartes se recoupent quand une traduction de l'une est celle de l'autre, ou la contient : ce sont presque des synonymes, une seule
    // réponse ne serait plus juste. Elles ne sont jamais proposées ensemble.
    function overlaps(a, b) {
        var kb = glossKeys(b);
        return glossKeys(a).some(function (ka) {
            return kb.some(function (k) { return ka === k || containsPhrase(ka, k) || containsPhrase(k, ka); });
        });
    }

    // Combien de cartes d'un genre partagent chaque première traduction : si plusieurs, on ajoute la seconde au libellé.
    var firstCount = {};
    function countFirsts(kind) {
        firstCount[kind] = {};
        ALL.filter(function (c) { return c.kind === kind; }).forEach(function (c) {
            var k = Lexicon.normalizeFrench(c.ref.fr[0]);
            firstCount[kind][k] = (firstCount[kind][k] || 0) + 1;
        });
    }

    // La traduction affichée comme réponse (mots et abréviations) : la première, plus la seconde si la première est ambiguë.
    function labelOf(c) {
        if (c.kind === 's') return c.ref.name;
        if (!firstCount[c.kind]) countFirsts(c.kind);
        var shared = firstCount[c.kind][Lexicon.normalizeFrench(c.ref.fr[0])] > 1;
        return shared && c.ref.fr.length > 1 ? c.ref.fr[0] + ', ' + c.ref.fr[1] : c.ref.fr[0];
    }

    // L'écriture affichée d'une carte en hébreu : le mot vocalisé, le sigle, ou le nom du sage.
    function hebrewOf(c) { return c.kind === 'w' ? c.ref.he : c.kind === 'a' ? c.ref.sigle : c.ref.he; }

    // Le groupe d'une carte, pour choisir des fausses pistes du même genre : l'époque d'un sage, « sages » ou « autres » pour une abréviation.
    function groupOf(c) {
        if (c.kind === 's') return c.ref.grp;
        if (c.kind === 'a') return c.ref.cat === 'sages' ? 'sages' : 'autres';
        return null;
    }

    // --- Les mauvaises réponses ------------------------------------------------------------------------------------------
    // `count` cartes du même genre que `card` (de préférence du même groupe : la même époque pour un sage, un autre sigle de maître pour un sigle de maître,
    // pour que la bonne réponse ne se devine pas à la seule présence d'un nom propre), qui ne partagent aucune traduction avec elle et dont
    // l'étiquette (`labelFn`) diffère de toutes les autres : la bonne réponse est la seule possible.
    function distractors(card, rng, count, labelFn) {
        var taken = {};
        taken[labelFn(card)] = true;
        var candidates = Quiz.shuffle(ALL.filter(function (c) {
            return c.kind === card.kind && c.id !== card.id && (card.kind === 's' || !overlaps(card, c));
        }), rng);
        var group = groupOf(card);
        if (group) {
            var same = candidates.filter(function (c) { return groupOf(c) === group; });
            candidates = same.concat(candidates.filter(function (c) { return groupOf(c) !== group; }));
        }
        var out = [];
        candidates.forEach(function (c) {
            var label = labelFn(c);
            if (out.length >= count || taken[label]) return;
            taken[label] = true;
            out.push(c);
        });
        return out;
    }

    // --- Quelles questions poser -----------------------------------------------------------------------------------------
    function typesFor(card) { return TYPES_OF_KIND[card.kind].slice(); }

    // Le poids de chaque sorte de question selon la boîte de la carte : une carte fragile reste à la première question, une carte sue se corse.
    function typeWeights(kind, box) {
        var t = TYPES_OF_KIND[kind];
        if (box <= 1) { var one = {}; one[t[0]] = 1; return one; }
        var w = {};
        if (box === 2) { w[t[0]] = 5; w[t[1]] = 5; } else { w[t[0]] = 3; w[t[1]] = 7; }
        return w;
    }

    // La sorte de question d'une carte, d'après son état dans la progression (`entry`, ou rien pour une carte jamais vue).
    function pickType(card, entry, rng) {
        var weights = typeWeights(card.kind, entry && entry.box ? entry.box : 1);
        var choices = Object.keys(weights);
        var total = choices.reduce(function (a, t) { return a + weights[t]; }, 0);
        var r = (rng || Math.random)() * total;
        for (var i = 0; i < choices.length; i++) {
            r -= weights[choices[i]];
            if (r < 0) return choices[i];
        }
        return choices[choices.length - 1];
    }

    // --- La progression ------------------------------------------------------------------------------------------------------
    // { v: 1, cards: { <identifiant>: { box, lastReviewed, failCount, successCount } } } : tout ce qui est abîmé est écarté.
    function normalizeProgress(raw) {
        var out = { v: 1, cards: {} };
        var cards = raw && typeof raw === 'object' && raw.cards && typeof raw.cards === 'object' ? raw.cards : {};
        Object.keys(cards).forEach(function (id) {
            var e = cards[id];
            if (!/^[was]:[א-ת]+$/.test(id) || !e || typeof e !== 'object') return;
            out.cards[id] = {
                box: Math.min(SRS.MAX_BOX, Math.max(1, Math.round(e.box) || 1)),
                lastReviewed: e.lastReviewed > 0 ? e.lastReviewed : 0,
                failCount: e.failCount > 0 ? Math.floor(e.failCount) : 0,
                successCount: e.successCount > 0 ? Math.floor(e.successCount) : 0
            };
        });
        return out;
    }

    function isMastered(entry) { return !!entry && entry.box >= MASTERED_BOX; }

    // Une réponse sur une carte : la progression suivante (rien n'est écrit : voir `gemaraRecord` dans js/storage.js pour la version stockée).
    function recordResult(progress, id, right, now) {
        var next = normalizeProgress(progress);
        next.cards[id] = SRS.applyResult(next.cards[id], !!right, now);
        return next;
    }

    // Le bilan d'une section : { total, mastered, learning (vues, pas encore maîtrisées), unseen, due (vues et à réviser aujourd'hui) }.
    function summary(progress, section, now) {
        var p = normalizeProgress(progress);
        var t = now || Date.now();
        var out = { total: 0, mastered: 0, learning: 0, unseen: 0, due: 0 };
        pool(section).forEach(function (c) {
            var entry = p.cards[c.id];
            out.total += 1;
            if (!entry) { out.unseen += 1; return; }
            if (isMastered(entry)) out.mastered += 1; else out.learning += 1;
            if (SRS.isDue(entry, t)) out.due += 1;
        });
        return out;
    }

    // Les cartes d'une partie : `{ progress, section, now, rng, rounds }` → { cardIds, types, due, fresh, extra }.
    //  1. les cartes à réviser aujourd'hui, les plus fragiles d'abord ;
    //  2. des cartes nouvelles (au moins deux tant qu'il en reste, au plus cinq), l'essentiel d'abord ;
    //  3. des cartes déjà vues et pas encore dues, pour renforcer ;
    //  4. enfin, si la partie n'est pas pleine, d'autres cartes nouvelles.
    // L'ordre final est mélangé : les cartes nouvelles ne s'amassent pas au début.
    function chooseSession(options) {
        var random = options.rng || Math.random;
        var now = options.now || Date.now();
        var rounds = options.rounds || ROUNDS;
        var p = normalizeProgress(options.progress);
        var seen = [], unseen = [];
        pool(options.section).forEach(function (c) { (p.cards[c.id] ? seen : unseen).push(c); });
        var due = seen.filter(function (c) { return SRS.isDue(p.cards[c.id], now); }).sort(function (a, b) {
            return SRS.compareUrgency({ entry: p.cards[a.id] }, { entry: p.cards[b.id] });
        });
        var notDue = seen.filter(function (c) { return due.indexOf(c) < 0; });
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
        ordered.forEach(function (c) { types[c.id] = pickType(c, p.cards[c.id], random); });
        return {
            cardIds: ordered.map(function (c) { return c.id; }), types: types,
            due: Math.min(due.length, rounds - reserved), fresh: fresh.length, extra: extra.length
        };
    }

    // --- La partie ---------------------------------------------------------------------------------------------------------
    // Une question : { type, id, card, shown, shownLang, options, answer }. `shown` : ce qui s'affiche en grand (le mot, le sigle, le nom hébreu du sage,
    // ou, pour « fr-ar », « fr-sigle » et « sage-era », une traduction ou un nom français) ; `shownLang` : 'he' ou 'fr'. Chaque proposition :
    // { label, lang } (`lang` : 'fr', 'he' ou 'grp' — pour l'époque d'un sage, `label` est alors la clé du groupe, que l'écran traduit).
    function makeQuestion(card, rng, type) {
        var kind = type && TYPES_OF_KIND[card.kind].indexOf(type) >= 0 ? type : TYPES_OF_KIND[card.kind][0];
        var q = { type: kind, id: card.id, card: card, shown: null, shownLang: 'he', options: [], answer: 0 };
        var all, label;
        if (kind === 'ar-fr' || kind === 'sigle-fr' || kind === 'sage-name') {
            q.shown = hebrewOf(card);
            all = Quiz.shuffle([card].concat(distractors(card, rng, CHOICES - 1, labelOf)), rng);
            q.options = all.map(function (c) { return { label: labelOf(c), lang: 'fr' }; });
            q.answer = all.indexOf(card);
        } else if (kind === 'fr-ar' || kind === 'fr-sigle') {
            q.shown = labelOf(card);
            q.shownLang = 'fr';
            all = Quiz.shuffle([card].concat(distractors(card, rng, CHOICES - 1, hebrewOf)), rng);
            q.options = all.map(function (c) { return { label: hebrewOf(c), lang: 'he' }; });
            q.answer = all.indexOf(card);
        } else {
            // sage-era : une réponse par groupe, toujours dans l'ordre chronologique.
            q.shown = card.ref.name;
            q.shownLang = 'fr';
            q.options = Gemara.SAGE_GROUPS.map(function (g) { return { label: g, lang: 'grp' }; });
            q.answer = Gemara.SAGE_GROUPS.indexOf(card.ref.grp);
        }
        return q;
    }

    // `options` : { section: 'all', rng, rounds, cardIds, types } ; `cardIds`, s'il est donné, fixe les cartes et leur ordre ;
    // `types` : { <identifiant>: sorte de question } (par défaut la première de la carte).
    function createGame(options) {
        options = options || {};
        var random = options.rng || Math.random;
        var section = SECTIONS.indexOf(options.section) >= 0 ? options.section : 'all';
        var rounds = options.rounds || ROUNDS;
        var cards = options.cardIds ? options.cardIds.map(cardById).filter(Boolean) : Quiz.shuffle(pool(section), random);
        cards = cards.slice(0, rounds);
        var questions = cards.map(function (c) { return makeQuestion(c, random, options.types && options.types[c.id]); });
        return Quiz.createState(questions, { section: section });
    }

    function question(state) { return Quiz.question(state); }
    // Répond en choisissant une proposition : ['right'], ['wrong'], ou [] si rien ne se passe.
    function answer(state, choice) { return Quiz.answer(state, choice); }
    // Question suivante : ['done'] à la fin de la partie, [] sinon.
    function next(state) { return Quiz.next(state); }

    return {
        ROUNDS: ROUNDS, CHOICES: CHOICES, POINTS: Quiz.POINTS, MASTERED_BOX: MASTERED_BOX, NEW_PER_SESSION: NEW_PER_SESSION, MIN_NEW: MIN_NEW,
        SECTIONS: SECTIONS, TYPES: TYPES, TYPES_OF_KIND: TYPES_OF_KIND,
        cards: pool, cardById: cardById, labelOf: labelOf, hebrewOf: hebrewOf, overlaps: overlaps, distractors: distractors,
        typesFor: typesFor, pickType: pickType,
        normalizeProgress: normalizeProgress, isMastered: isMastered, recordResult: recordResult, summary: summary, chooseSession: chooseSession,
        createGame: createGame, question: question, answer: answer, next: next
    };
}));
