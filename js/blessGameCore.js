// =========================================================================
// === TORAHAXE — « QUELLE BÉNÉDICTION ? » : LES RÈGLES DU JEU DES BÉNÉDICTIONS (pur, sans DOM, testé) ===
// =========================================================================
// Dix questions à quatre propositions, 100 points chacune, trois façons de demander :
//  - « blessing » : un aliment est montré, quelle bénédiction dit-on avant de le manger ? (la moitié des questions) ;
//  - « food » : quel aliment, parmi quatre, prend telle bénédiction ? ;
//  - « odd » : trois aliments prennent la même bénédiction, lequel est l'intrus ?
// Quatre séries : tout, fruits et légumes (Haets, Haadama), pain et pâtisseries (Hamotsi, Mezonot), le reste (Chéhakol, Haguafen).
// La mécanique de partie (questions, score, suite, jeu à plusieurs) est celle de js/quizCore.js ; les bénédictions, leurs noms, leur texte hébreu et la règle qui les fonde sont
// celles de js/benedictionsData.js (guide du Beth Loubavitch).
//
// RIEN D'AUTRE QUE DES CAS SANS DISCUSSION. Le jeu ne pose pas les 471 lignes du guide : seuls les aliments de ASKED ci-dessous le sont. Ce sont des aliments courants, dont la
// bénédiction est la même dans les trois usages de l'application (séfarade, ashkénaze, 'Habad) et ne dépend ni d'une note du guide, ni d'une quantité, ni de la façon de les manger. On écarte
// ce que le guide assortit d'une note (banane, riz, pizza, chocolat, carotte crue…), tout aliment composé ou conditionnel (« avec », « sans », « si »…), les jus de fruits, les fruits
// et légumes dont le classement est discuté (avocat, framboise, goyave, houmous, pop-corn…), les pains et gâteaux qui demandent une quantité ou une précision (pain perdu, pain de dattes,
// sushi…), et la bénédiction finale (les règles des finales sont celles de l'application, pas du guide : à faire relire avant d'en faire un jeu). tests/blessGameCore.test.js vérifie
// que chaque aliment de ASKED existe dans le guide, avec cette bénédiction, sans note, sans écart de rite : si le guide change, le test le dit.
// Outil d'étude, pas une décision de halakha. À relire par une personne compétente, en particulier la liste ASKED.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./benedictionsData.js'));
    else root.BlessGameCore = factory(root.QuizCore, root.BenedictionsData);
}(typeof self !== 'undefined' ? self : this, function (Quiz, Data) {
    'use strict';

    var ROUNDS = Quiz.ROUNDS;
    var SECTIONS = ['all', 'fruits', 'cereales', 'reste'];
    var ORDER = ['hamotsi', 'mezonot', 'haguafen', 'haets', 'haadama', 'chehakol'];   // l'ordre des propositions (et du guide)
    var POOLS = {
        all: ORDER,
        fruits: ['haets', 'haadama'],
        cereales: ['hamotsi', 'mezonot'],
        reste: ['chehakol', 'haguafen']
    };
    // Les bénédictions que l'on confond le plus : elles passent en premier parmi les mauvaises propositions.
    var NEIGHBORS = {
        haets: ['haadama', 'chehakol'], haadama: ['haets', 'chehakol'], hamotsi: ['mezonot', 'chehakol'], mezonot: ['hamotsi', 'chehakol'],
        chehakol: ['haadama', 'haguafen'], haguafen: ['chehakol', 'haets']
    };
    // Le nom court d'un aliment à l'écran, quand la ligne du guide est plus longue qu'il ne faut.
    var SHOWN = { 'Vin de raisin frais ou de raisin sec': 'Vin', 'Olives mûres ou préparées': 'Olive', 'Pain à base d\'une des cinq céréales': 'Pain' };

    // Les aliments posés, par bénédiction (noms exacts des lignes du guide). Voir l'en-tête : cas courants et sans discussion seulement.
    var ASKED = {
        haets: ['Abricot', 'Amande', 'Cerise', 'Clémentine', 'Datte', 'Figue', 'Grenade', 'Mandarine', 'Mangue', 'Nashi', 'Noisette', 'Noix', 'Noix de cajou', 'Noix de coco',
            'Noix de pécan', 'Olives mûres ou préparées', 'Orange', 'Pamplemousse', 'Pêche', 'Pistache', 'Poire', 'Pomme', 'Prune', 'Pruneau', 'Raisin sec'],
        haadama: ['Ananas', 'Artichaut', 'Asperge', 'Aubergine', 'Betterave', 'Brocolis', 'Cacahuète', 'Cantaloup', 'Carotte cuite', 'Céleri', 'Chips', 'Chou fleur', 'Chou rouge',
            'Concombre', 'Courgette', 'Epinard', 'Fenouil', 'Fraise', 'Frite', 'Haricot vert', 'Laitue', 'Lentille', 'Melon', 'Navet', 'Pastèque', 'Patate douce', 'Petit pois',
            'Poireau', 'Pois chiche', 'Poivron rouge', 'Purée de pommes de terre', 'Radis', 'Tomate', 'Tomate cerise'],
        chehakol: ['Agneau', 'Bière', 'Bœuf', 'Barbe à papa', 'Beurre', 'Canard', 'Caramel', 'Champignon', 'Dinde', 'Eau gazeuse', 'Fromage', 'Fromage blanc', 'Hareng', 'Lait',
            'Limonade', 'Marshmallow', 'Miel', 'Mousse au chocolat', 'Nougat', 'Poisson', 'Poulet', 'Rhum', 'Salami', 'Sardine', 'Saumon', 'Sorbet', 'Sucette', 'Sucre', 'Thé',
            'Thon', 'Tofu', 'Truite', 'Veau', 'Viande', 'Vodka', 'Whisky', 'Yaourt'],
        hamotsi: ['Bagel', 'Baguette', 'Pain à base d\'une des cinq céréales', 'Pain à l\'oignon', 'Pain complet', 'Pain de mie', 'Pain de seigle', 'Pain italien', 'Pita',
            'Sandwich au fromage', 'Sandwich aux œufs', 'Sandwich de poulet'],
        mezonot: ['Beignet aux fruits', 'Biscuit au gingembre', 'Cake', 'Couscous', 'Crêpe nature', 'Donut', 'Flocon d\'avoine', 'Gaufre', 'Gâteau', 'Gâteau au chocolat',
            'Gâteau au fromage', 'Gâteau au miel', 'Gâteau aux fruits', 'Lasagnes', 'Macaroni', 'Millefeuilles', 'Muffin', 'Nouille', 'Pancake', 'Pâtes', 'Ravioli cuit', 'Semoule',
            'Spaghetti', 'Strudel aux pommes'],
        haguafen: ['Champagne', 'Jus de raisin', 'Vin de raisin frais ou de raisin sec']
    };

    // --- Les aliments --------------------------------------------------------------------------------------------------------------------------
    var BY_NAME = {};
    Data.FOODS.forEach(function (f) { BY_NAME[f.n] = f; });

    // Les aliments posés d'une bénédiction : [{ id, name (celui du guide), shown (celui de l'écran), b }].
    var FOODS = {};
    ORDER.forEach(function (b) {
        FOODS[b] = ASKED[b].map(function (name) { return { id: BY_NAME[name].id, name: name, shown: SHOWN[name] || name, b: b }; });
    });

    function foodsOf(b) { return FOODS[b] || []; }

    function pool(section) { return POOLS[section] || POOLS.all; }

    // --- Une question --------------------------------------------------------------------------------------------------------------------------
    function blessingOption(b) {
        var def = Data.BLESSINGS[b];
        return { kind: 'blessing', b: b, label: def.fr, he: def.he };
    }

    // Les quatre bénédictions proposées : la bonne et trois autres (les plus confondues d'abord), dans l'ordre fixe du guide (la main apprend vite).
    function blessingChoices(b, rng) {
        var others = ORDER.filter(function (x) { return x !== b; });
        var near = NEIGHBORS[b].filter(function (x) { return others.indexOf(x) >= 0; });
        var rest = Quiz.shuffle(others.filter(function (x) { return near.indexOf(x) < 0; }), rng);
        var chosen = near.concat(rest).slice(0, Quiz.CHOICES - 1).concat(b);
        return ORDER.filter(function (x) { return chosen.indexOf(x) >= 0; });
    }

    // `count` aliments pris à tour de rôle dans les bénédictions `bs` (un de chacune avant d'en reprendre : les mauvaises propositions ne sont pas toutes de la même bénédiction), sans
    // jamais redonner un nom déjà pris dans la même question. `used` garde ce que la partie a déjà montré : 2 pour un aliment qui était LA réponse (visé ou intrus : `hard`), 1 pour
    // une mauvaise proposition. On prend d'abord ce qui n'a jamais été montré, puis ce qui n'a été qu'une mauvaise proposition ; une réponse déjà donnée ne revient qu'en dernier
    // recours (la série « le reste » n'a que trois vins).
    function takeFoods(count, bs, used, rng, hard) {
        var out = [];
        [function (f) { return !used[f.id]; }, function (f) { return used[f.id] !== 2; }, function () { return true; }].forEach(function (allowed) {
            var lists = Quiz.shuffle(bs, rng).map(function (b) { return Quiz.shuffle(foodsOf(b), rng); });
            var progress = true;
            while (out.length < count && progress) {
                progress = false;
                lists.forEach(function (list) {
                    while (list.length && out.length < count) {
                        var f = list.shift();
                        if (!allowed(f) || out.some(function (o) { return o.id === f.id || o.shown === f.shown; })) continue;
                        out.push(f); used[f.id] = hard ? 2 : Math.max(used[f.id] || 0, 1); progress = true;
                        break;
                    }
                });
            }
        });
        return out;
    }

    // `type` : 'blessing' | 'food' | 'odd' ; `b` : la bénédiction visée ; `used` : les aliments déjà posés dans la partie (jamais deux fois le même).
    function makeQuestion(type, b, used, rng) {
        var def = Data.BLESSINGS[b];
        var q = { type: type, blessing: b, he: def.he, fr: def.fr, use: def.use };
        if (type === 'blessing') {
            var food = takeFoods(1, [b], used, rng, true)[0];
            var choices = blessingChoices(b, rng);
            q.id = 'b' + food.id;
            q.food = food;
            q.options = choices.map(blessingOption);
            q.answer = choices.indexOf(b);
            return q;
        }
        if (type === 'food') {
            var right = takeFoods(1, [b], used, rng, true)[0];
            var wrongBs = NEIGHBORS[b].concat(ORDER.filter(function (x) { return x !== b && NEIGHBORS[b].indexOf(x) < 0; }));
            var wrong = takeFoods(Quiz.CHOICES - 1, wrongBs.slice(0, 3), used, rng);
            if (wrong.length < Quiz.CHOICES - 1) wrong = wrong.concat(takeFoods(Quiz.CHOICES - 1 - wrong.length, wrongBs, used, rng));
            var all = Quiz.shuffle([right].concat(wrong), rng);
            q.id = 'f' + right.id;
            q.options = all.map(function (f) { return { kind: 'food', label: f.shown, b: f.b, id: f.id }; });
            q.answer = all.indexOf(right);
            q.food = right;
            return q;
        }
        // odd : trois aliments de la bénédiction `b`, un intrus d'une bénédiction voisine.
        var same = takeFoods(3, [b], used, rng, true);
        var intruder = takeFoods(1, NEIGHBORS[b], used, rng, true)[0];
        var list = Quiz.shuffle(same.concat(intruder), rng);
        q.id = 'o' + intruder.id;
        q.options = list.map(function (f) { return { kind: 'food', label: f.shown, b: f.b, id: f.id }; });
        q.answer = list.indexOf(intruder);
        q.food = intruder;
        q.intruderBlessing = intruder.b;
        return q;
    }

    // Les types de la partie : la moitié « blessing », trois « food », le reste « odd ».
    function plan(rounds, rng) {
        var odd = Math.max(1, Math.floor(rounds / 5));
        var food = Math.max(1, Math.floor(rounds * 3 / 10));
        var types = [];
        for (var i = 0; i < rounds; i++) types.push(i < odd ? 'odd' : i < odd + food ? 'food' : 'blessing');
        return Quiz.shuffle(types, rng);
    }

    // `rounds` questions. Chaque bénédiction de la série est visée au moins une fois ; le reste se partage au prorata du nombre d'aliments (douze au plus), sans viser plus de la moitié
    // des aliments d'une bénédiction (les trois vins ne reviennent pas cinq fois). Dans un ordre mêlé.
    function pick(section, rng, rounds) {
        var random = rng || Math.random;
        var bs = pool(section);
        var chosen = Quiz.shuffle(bs, rng).slice(0, rounds);
        var count = {};
        chosen.forEach(function (b) { count[b] = (count[b] || 0) + 1; });
        while (chosen.length < rounds) {
            var open = bs.filter(function (b) { return (count[b] || 0) < Math.max(1, Math.floor(foodsOf(b).length / 2)); });
            if (!open.length) open = bs;
            var total = open.reduce(function (sum, b) { return sum + Math.min(foodsOf(b).length, 12); }, 0);
            var r = random() * total, b = open[open.length - 1];
            for (var i = 0; i < open.length; i++) { r -= Math.min(foodsOf(open[i]).length, 12); if (r < 0) { b = open[i]; break; } }
            chosen.push(b);
            count[b] = (count[b] || 0) + 1;
        }
        var used = {};
        var targets = Quiz.shuffle(chosen, rng);
        var types = plan(rounds, rng);
        // Les questions dont la bénédiction a le moins d'aliments sont construites d'abord : elles prennent les rares aliments avant les autres.
        var built = [];
        targets.map(function (b, i) { return i; })
            .sort(function (x, y) { return foodsOf(targets[x]).length - foodsOf(targets[y]).length || x - y; })
            .forEach(function (i) { built[i] = makeQuestion(types[i], targets[i], used, rng); });
        return built;
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
    function next(state) { return Quiz.next(state); }

    return {
        ROUNDS: ROUNDS, POINTS: Quiz.POINTS, SECTIONS: SECTIONS, POOLS: POOLS, ORDER: ORDER, ASKED: ASKED, SHOWN: SHOWN,
        foodsOf: foodsOf, blessingChoices: blessingChoices, makeQuestion: makeQuestion, plan: plan, pick: pick, createGame: createGame, question: question, answer: answer, next: next
    };
}));
