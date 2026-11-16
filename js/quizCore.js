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

    // Une partie neuve sur ces questions ; `extra` : les champs propres au jeu (niveau, section…), recopiés tels quels.
    function createState(questions, extra) {
        var state = {
            questions: questions, index: 0, score: 0, found: 0, results: [], resolved: null, picked: null,
            over: !questions.length, empty: !questions.length
        };
        Object.keys(extra || {}).forEach(function (k) { state[k] = extra[k]; });
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

    // Passe à la question suivante. Renvoie ['done'] à la fin de la partie, [] si elle continue (ou si la question n'est pas répondue).
    function next(state) {
        if (state.over || !state.resolved) return [];
        state.resolved = null;
        state.picked = null;
        state.index += 1;
        if (state.index >= state.questions.length) { state.over = true; return ['done']; }
        return [];
    }

    return { ROUNDS: ROUNDS, CHOICES: CHOICES, POINTS: POINTS, shuffle: shuffle, createState: createState, question: question, answer: answer, expire: expire, next: next };
});
