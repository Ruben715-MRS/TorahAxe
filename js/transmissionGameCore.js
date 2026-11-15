// =========================================================================
// === HISTORIAXE — « MAÎTRES ET ÉLÈVES » : LES RÈGLES DU JEU (sans DOM) ===
// =========================================================================
// Un jeu de réflexion, sans minuteur, sur la chaîne de transmission (js/transmissionCore.js) : qui a reçu la Torah de qui. Ici, seulement les règles (états
// purs, sans DOM ni stockage) ; l'écran est dans js/app/transmission-game.js. Testé dans tests/transmissionGameCore.test.js.
// Dix questions à quatre choix, 100 points par bonne réponse, deux sortes de questions :
//  - « Qui est le maître de… ? » : un élève, quatre noms, un seul est un de ses maîtres ;
//  - « L'intrus » : un maître, quatre noms, trois sont ses élèves et un n'en est pas un.
//
// Une seule réponse juste, ou la question n'est pas posée. La carte est incomplète (un maître ou un élève réel peut y manquer), donc une fausse piste n'est
// jamais prise « parmi ceux qui ne sont pas liés » : elle est prise parmi ceux qui ne PEUVENT PAS l'être, à cause de l'ordre de la transmission
// (le rang d'un élève est toujours plus bas que celui de ses maîtres) :
//  - pour « qui est le maître de X ? », les fausses pistes sont des maîtres de rang plus bas que X (donc venus après lui : deux rangs de plus si possible) ;
//  - pour l'intrus, il est de rang égal ou plus haut que le maître (un contemporain ou un ancien ne peut pas être son élève).
// Les bonnes réponses sont des liens sûrs : jamais un lien discuté (« ? »), ni un lien de famille seul. Une question est posée seulement s'il y a de quoi
// la poser (trois élèves sûrs pour l'intrus, trois fausses pistes possibles pour le maître).
// Trois sections, comme les boutons de l'écran de la chaîne : « Pirké Avot » (seulement les maîtres du traité), « Tannaïm » (avec les autres tannaïm de la Michna)
// ou « Tout » (avec les amoraïm).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./transmissionCore.js'), require('./arcadeCore.js'));
    else root.TransmissionGameCore = factory(root.TransmissionCore, root.ArcadeCore);
}(typeof self !== 'undefined' ? self : this, function (T, Arcade) {
    'use strict';

    var ROUNDS = 10;
    var CHOICES = 4;
    var POINTS = 100;
    var MAX_INTRUS = 4;       // questions « intrus » au plus par partie (le reste : « qui est le maître de… ? »)
    var SECTIONS = ['avot', 'tannaim', 'all'];
    var SURE_KINDS = { maitre: 1, second: 1, pere: 1, beaupere: 1 };

    function isAmora(p) { return p.grp.indexOf('amoraim') === 0; }
    // Les maîtres de la section : ceux que le bouton correspondant de l'écran de la chaîne affiche.
    function inSection(section, p) { if (p.hass || p.med) return false; return section === 'all' || (section === 'tannaim' ? !isAmora(p) : !p.more); }

    // Un lien sûr : ni discuté, ni de simple famille.
    function sure(edge) { return !edge.doubt && !!SURE_KINDS[edge.kind]; }

    function sagesOf(section) { return T.SAGES.filter(function (p) { return inSection(section, p); }); }

    // --- Les sujets possibles ---------------------------------------------------------------------------------------------
    // Les fausses pistes d'un maître : des maîtres de la section, de rang supérieur à celui de l'élève (au moins deux rangs de plus si possible).
    function laterSages(section, student, minGap) {
        return sagesOf(section).filter(function (p) { return p.id !== student.id && p.row >= student.row + minGap && !p.group; });
    }

    // Un élève peut être posé s'il a un maître sûr de la section et au moins trois fausses pistes de rang plus bas.
    function whoSubjects(section) {
        return sagesOf(section).filter(function (s) {
            var masters = T.mastersOf(s.id).filter(function (e) { return sure(e) && inSection(section, T.byId(e.from)); });
            return masters.length > 0 && laterSages(section, s, 1).length >= CHOICES - 1;
        });
    }

    // Un maître peut être posé pour l'intrus s'il a au moins trois élèves sûrs de la section et un intrus possible (rang égal ou plus haut).
    function intrusSubjects(section) {
        return sagesOf(section).filter(function (m) {
            var students = T.studentsOf(m.id).filter(function (e) { return sure(e) && inSection(section, T.byId(e.to)); });
            return students.length >= CHOICES - 1 && earlierSages(section, m).length > 0;
        });
    }

    function earlierSages(section, master) {
        return sagesOf(section).filter(function (p) { return p.id !== master.id && p.row <= master.row && !p.group; });
    }

    // --- Les questions ----------------------------------------------------------------------------------------------------
    function names(list) { return list.map(function (p) { return p.fr; }); }

    // « Qui est le maître de X ? » : une bonne réponse (un maître sûr), trois fausses pistes venues après X.
    function makeWho(section, student, rng) {
        var masters = T.mastersOf(student.id);
        var sureMasters = masters.filter(function (e) { return sure(e) && inSection(section, T.byId(e.from)); });
        var right = T.byId(Arcade.shuffle(sureMasters, rng)[0].from);
        var far = Arcade.shuffle(laterSages(section, student, 2), rng);
        var near = Arcade.shuffle(laterSages(section, student, 1).filter(function (p) { return p.row < student.row + 2; }), rng);
        var wrong = [];
        far.concat(near).forEach(function (p) { if (wrong.length < CHOICES - 1 && wrong.every(function (w) { return w.fr !== p.fr; }) && p.fr !== right.fr) wrong.push(p); });
        var all = Arcade.shuffle([right].concat(wrong), rng);
        return {
            type: 'who', id: 'who:' + student.id, subject: student, shown: student.fr, shownHe: student.he,
            options: all.map(function (p) { return { label: p.fr, id: p.id }; }), answer: all.indexOf(right),
            masters: masters.map(function (e) { return { id: e.from, fr: T.byId(e.from).fr, kind: e.kind, doubt: e.doubt, src: e.src }; })
        };
    }

    // « L'intrus » : trois élèves sûrs de X et un maître qui ne peut pas l'être. L'intrus est de préférence de la génération de X ou de la précédente
    // (il ne se devine pas à son époque), sinon n'importe quel ancien.
    function makeIntrus(section, master, rng) {
        var students = T.studentsOf(master.id);
        var sureStudents = Arcade.shuffle(students.filter(function (e) { return sure(e) && inSection(section, T.byId(e.to)); }), rng)
            .slice(0, CHOICES - 1).map(function (e) { return T.byId(e.to); });
        var taken = {};
        sureStudents.forEach(function (p) { taken[p.fr] = true; });
        var earlier = earlierSages(section, master).filter(function (p) { return !taken[p.fr]; });
        var close = Arcade.shuffle(earlier.filter(function (p) { return p.row >= master.row - 1; }), rng);
        var intrus = (close.length ? close : Arcade.shuffle(earlier, rng))[0];
        var all = Arcade.shuffle(sureStudents.concat([intrus]), rng);
        return {
            type: 'intrus', id: 'intrus:' + master.id, subject: master, shown: master.fr, shownHe: master.he,
            options: all.map(function (p) { return { label: p.fr, id: p.id }; }), answer: all.indexOf(intrus),
            students: students.map(function (e) { return { id: e.to, fr: T.byId(e.to).fr, kind: e.kind, doubt: e.doubt, src: e.src }; }),
            intrus: intrus.fr
        };
    }

    // Les questions d'une partie : quelques « intrus » (dans la limite de ceux qu'on peut poser), les autres « qui est le maître de… ? », chacun sur un
    // sujet différent, dans un ordre mêlé.
    function makeQuestions(section, rng, rounds) {
        var random = rng || Math.random;
        var total = rounds || ROUNDS;
        var intrusPool = Arcade.shuffle(intrusSubjects(section), random);
        var whoPool = Arcade.shuffle(whoSubjects(section), random);
        var nIntrus = Math.min(MAX_INTRUS, intrusPool.length, Math.floor(total / 2));
        nIntrus = Math.max(nIntrus, Math.min(intrusPool.length, total - whoPool.length));
        var list = intrusPool.slice(0, nIntrus).map(function (m) { return makeIntrus(section, m, random); })
            .concat(whoPool.slice(0, total - nIntrus).map(function (s) { return makeWho(section, s, random); }));
        return Arcade.shuffle(list, random).slice(0, total);
    }

    // --- La partie --------------------------------------------------------------------------------------------------------
    // options : { section, rng, rounds, questions } ; `questions`, s'il est donné, fixe les questions (tests).
    function createGame(options) {
        var o = options || {};
        var section = SECTIONS.indexOf(o.section) >= 0 ? o.section : 'all';
        var questions = o.questions || makeQuestions(section, o.rng, o.rounds);
        return { section: section, questions: questions, index: 0, score: 0, found: 0, results: [], resolved: null, picked: null, over: !questions.length, empty: !questions.length };
    }

    function question(state) { return state.questions[state.index] || null; }

    // Répond en choisissant une proposition. Renvoie ['right'] ou ['wrong'] ; vide si rien ne se passe.
    function answer(state, choice) {
        var q = question(state);
        if (state.over || !q || state.resolved || !(choice >= 0 && choice < q.options.length)) return [];
        var right = choice === q.answer;
        state.resolved = right ? 'right' : 'wrong';
        state.picked = choice;
        if (right) { state.score += POINTS; state.found += 1; }
        state.results.push({ id: q.id, right: right, type: q.type });
        return [state.resolved];
    }

    // Passe à la question suivante. Renvoie ['done'] à la fin de la partie, [] si elle continue.
    function next(state) {
        if (state.over || !state.resolved) return [];
        state.resolved = null;
        state.picked = null;
        state.index += 1;
        if (state.index >= state.questions.length) { state.over = true; return ['done']; }
        return [];
    }

    return {
        ROUNDS: ROUNDS, CHOICES: CHOICES, POINTS: POINTS, SECTIONS: SECTIONS,
        sagesOf: sagesOf, whoSubjects: whoSubjects, intrusSubjects: intrusSubjects, makeWho: makeWho, makeIntrus: makeIntrus, makeQuestions: makeQuestions,
        createGame: createGame, question: question, answer: answer, next: next
    };
}));
