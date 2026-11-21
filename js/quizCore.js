// =========================================================================
// === TORAHAXE — MOTEUR COMMUN DES JEUX À CHOIX MULTIPLES (pur, sans DOM, testé sous `npm test`) ===
// =========================================================================
// Les jeux « Mots du Tanakh », « Mots de la Guémara » et « Maîtres et élèves » partagent la même mécanique : une liste de questions à quatre
// propositions, une réponse par question, 100 points la bonne réponse, une fiche, puis la question suivante. Cette mécanique vit ici, une seule fois ;
// chaque jeu garde ses règles propres (js/lexiconGameCore.js, js/gemaraGameCore.js, js/transmissionGameCore.js : choix des questions, des
// distracteurs, répétition espacée). Le pendant à l'écran est js/app/quiz-ui.js. Un futur jeu à quatre propositions n'écrit que ses questions.
//
// Une question : { type, options: [{ label, … }], answer: index de la bonne proposition, … } ; une partie (`state`) :
// { questions, index, score, found, results, resolved: null | 'right' | 'wrong', picked, over, empty, …champs propres au jeu }.
//
// À PLUSIEURS (au tour par tour, on se passe le téléphone) : `setPendingPlayers(noms)` annonce que la prochaine partie créée se joue à plusieurs ; `createState` la rattache aussitôt
// (`state.multi`). Les questions sont réparties à tour de rôle (la question i est celle du joueur i modulo n) et le nombre de questions est ramené à un multiple du nombre de joueurs,
// pour que chacun en ait autant. Les points de chaque question vont à celui qui y a répondu : ils sont versés à `next`, d'après ce que le jeu a ajouté à `state.score` et `state.found`,
// quelle que soit la façon dont le jeu les compte. Tout jeu qui passe par `createState` et `next` est donc jouable à plusieurs sans rien écrire de plus.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.QuizCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var ROUNDS = 10;   // questions par partie
    var CHOICES = 4;   // propositions par question
    var POINTS = 100;  // par bonne réponse

    // Mélange de Fisher-Yates (une copie) ; `rng` : un générateur dans [0, 1[ (Math.random par défaut).
    function shuffle(list, rng) {
        var random = rng || Math.random;
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
        return out;
    }

    // --- À plusieurs ----------------------------------------------------------------------------------------------------------------------------
    var MIN_PLAYERS = 2;
    var MAX_PLAYERS = 6;
    var NAME_MAX = 20;
    var pendingPlayers = null;

    // Les noms retenus : de 2 à 6, rognés ; un nom vide devient « Joueur n ». `null` si la liste ne fait pas une partie à plusieurs.
    function cleanNames(names) {
        if (!Array.isArray(names) || names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) return null;
        return names.map(function (name, i) {
            var n = String(name === null || name === undefined ? '' : name).replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
            return n || 'Joueur ' + (i + 1);
        });
    }

    // Le nombre de questions à tirer pour un jeu qui en pose `base` seul : à plusieurs, chaque joueur doit en avoir au moins trois (les jeux à cinq questions en donneraient une ou deux
    // par personne). Les jeux à dix questions n'ont pas besoin de cet appel : dix questions font déjà trois tours pour trois joueurs.
    var MIN_EACH = 3;
    function roundsFor(base) { return pendingPlayers ? Math.max(base, MIN_EACH * pendingPlayers.length) : base; }

    // La prochaine partie créée sera jouée à plusieurs par ces joueurs (`null` : annule). Renvoie les noms retenus, ou null.
    function setPendingPlayers(names) {
        pendingPlayers = names ? cleanNames(names) : null;
        return pendingPlayers;
    }

    // Rattache les joueurs à la partie : ramène les questions à un multiple du nombre de joueurs. Sans assez de questions pour que chacun en ait une, la partie reste en solo.
    function attachPlayers(state, names) {
        var list = cleanNames(names);
        if (!list) return false;
        var usable = Math.floor(state.questions.length / list.length) * list.length;
        if (usable < list.length) return false;
        state.questions = state.questions.slice(0, usable);
        state.multi = { players: list.map(function (name) { return { name: name, score: 0, found: 0 }; }), settledScore: 0, settledFound: 0 };
        return true;
    }

    // Le joueur de la question en cours (index), ou null hors partie à plusieurs.
    function ownerIndex(state) { return state.multi ? state.index % state.multi.players.length : null; }
    function currentPlayer(state) { return state.multi ? state.multi.players[state.index % state.multi.players.length] : null; }

    // Verse au joueur de la question en cours ce que le jeu a ajouté au score et aux bonnes réponses depuis la dernière fois.
    function settle(state) {
        var m = state.multi;
        if (!m) return;
        var player = m.players[state.index % m.players.length];
        player.score += state.score - m.settledScore;
        player.found += state.found - m.settledFound;
        m.settledScore = state.score;
        m.settledFound = state.found;
    }

    // Le classement : { rows: [{ name, score, found, rank }] du premier au dernier (égalités : même rang, ordre de jeu), winners: [noms], tie: plusieurs gagnants }.
    function standings(state) {
        var rows = state.multi.players.map(function (p, i) { return { name: p.name, score: p.score, found: p.found, order: i }; });
        rows.sort(function (a, b) { return b.score - a.score || a.order - b.order; });
        rows.forEach(function (r, i) { r.rank = i > 0 && rows[i - 1].score === r.score ? rows[i - 1].rank : i + 1; delete r.order; });
        var winners = rows.filter(function (r) { return r.rank === 1; }).map(function (r) { return r.name; });
        return { rows: rows, winners: winners, tie: winners.length > 1 };
    }

    // Une partie neuve sur ces questions ; `extra` : les champs propres au jeu (niveau, section…), recopiés tels quels.
    function createState(questions, extra) {
        var state = {
            questions: questions, index: 0, score: 0, found: 0, results: [], resolved: null, picked: null,
            over: !questions.length, empty: !questions.length
        };
        Object.keys(extra || {}).forEach(function (k) { state[k] = extra[k]; });
        if (pendingPlayers) { attachPlayers(state, pendingPlayers); pendingPlayers = null; }
        return state;
    }

    function question(state) { return state.questions[state.index] || null; }

    // Répond en choisissant une proposition. Renvoie ['right'] ou ['wrong'] ; vide si rien ne se passe (partie finie, question déjà répondue,
    // proposition hors de la liste). `describe(q, right)` : ce que le jeu garde de la réponse dans `results` (par défaut : id, right, type).
    function answer(state, choice, describe) {
        var q = question(state);
        if (state.over || !q || state.resolved || !(choice >= 0 && choice < q.options.length)) return [];
        var right = choice === q.answer;
        state.resolved = right ? 'right' : 'wrong';
        state.picked = choice;
        if (right) { state.score += POINTS; state.found += 1; }
        state.results.push(describe ? describe(q, right) : { id: q.id, right: right, type: q.type });
        return [state.resolved];
    }

    // Le temps est écoulé sans réponse (jeux chronométrés) : la question est comptée fausse, sans proposition choisie. Renvoie ['timeout'], ou []
    // si rien ne se passe. Même ligne dans `results` que `answer`, avec `timeout: true`.
    function expire(state, describe) {
        var q = question(state);
        if (state.over || !q || state.resolved) return [];
        state.resolved = 'wrong';
        state.picked = null;
        var entry = describe ? describe(q, false) : { id: q.id, right: false, type: q.type };
        entry.timeout = true;
        state.results.push(entry);
        return ['timeout'];
    }

    // --- Les manches à indices (« Dans quelle paracha ? », « Qui suis-je ? ») ---------------------------------------------------------------------
    // Une question qu'on résout en piochant des indices : `cfg` = { start (points au départ), hintCost, wrongCost, maxHints }. Chaque indice et chaque mauvaise
    // réponse coûtent des points ; à zéro, la réponse est dévoilée (`resolved` = 'revealed', rien n'est gagné). Les champs de la manche (`shown`, `points`, `wrong`)
    // sont dans la partie ; `results` garde pour chaque question { id, right, revealed, hints, wrong, points }.
    function resetRound(state, cfg) {
        state.shown = 1;                 // éléments montrés (1 + les indices demandés)
        state.points = cfg.start;        // points en jeu pour cette question
        state.wrong = [];                // les mauvaises réponses déjà essayées (clés quelconques)
    }

    function finishRound(state, outcome) {
        var q = question(state);
        state.resolved = outcome;
        if (outcome === 'right') { state.score += state.points; state.found += 1; }
        state.results.push({ id: q.id, right: outcome === 'right', revealed: outcome === 'revealed', hints: state.shown - 1, wrong: state.wrong.length, points: outcome === 'right' ? state.points : 0 });
    }

    // Un indice : ['hint'], et ['revealed'] en plus quand les points tombent à zéro ; [] si la question est résolue ou si tous les indices sont donnés.
    function roundHint(state, cfg) {
        if (state.over || state.resolved || state.shown >= 1 + cfg.maxHints) return [];
        state.shown += 1;
        state.points = Math.max(0, state.points - cfg.hintCost);
        if (state.points <= 0) { finishRound(state, 'revealed'); return ['hint', 'revealed']; }
        return ['hint'];
    }

    // Une réponse : `key` identifie la réponse (déjà essayée → rien), `right` dit si elle est bonne. ['right'], ['wrong'], ['wrong', 'revealed'] ou [].
    function roundGuess(state, key, right, cfg) {
        if (state.over || !question(state) || state.resolved || state.wrong.indexOf(key) >= 0) return [];
        if (right) { finishRound(state, 'right'); return ['right']; }
        state.wrong.push(key);
        state.points = Math.max(0, state.points - cfg.wrongCost);
        if (state.points <= 0) { finishRound(state, 'revealed'); return ['wrong', 'revealed']; }
        return ['wrong'];
    }

    // Passe à la question suivante. Renvoie ['done'] à la fin de la partie, [] si elle continue (ou si la question n'est pas répondue).
    function next(state) {
        if (state.over || !state.resolved) return [];
        settle(state);
        state.resolved = null;
        state.picked = null;
        state.index += 1;
        if (state.index >= state.questions.length) { state.over = true; return ['done']; }
        return [];
    }

    return { ROUNDS: ROUNDS, CHOICES: CHOICES, POINTS: POINTS, MIN_PLAYERS: MIN_PLAYERS, MAX_PLAYERS: MAX_PLAYERS, setPendingPlayers: setPendingPlayers, roundsFor: roundsFor, attachPlayers: attachPlayers, ownerIndex: ownerIndex, currentPlayer: currentPlayer, standings: standings, shuffle: shuffle, createState: createState, question: question, answer: answer, expire: expire, next: next, resetRound: resetRound, roundHint: roundHint, roundGuess: roundGuess };
});
