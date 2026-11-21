const test = require('node:test');
const assert = require('node:assert');
const B = require('../js/blessGameCore.js');
const D = require('../js/benedictionsData.js');
const C = require('../js/benedictionsCore.js');

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const BY_NAME = {}; D.FOODS.forEach(f => { BY_NAME[f.n] = f; });
const CONDITIONAL = / (avec|sans|si|quand|dont|pour|lorsque|selon)\b|[,(]/i;

test('liste posée : chaque aliment existe dans le guide, avec cette bénédiction, sans note, sans écart de rite ni de cas', () => {
    Object.keys(B.ASKED).forEach(b => B.ASKED[b].forEach(name => {
        const f = BY_NAME[name];
        assert.ok(f, name + ' : absent du guide');
        assert.strictEqual(f.b, b, name + ' : le guide dit « ' + f.b + ' », pas « ' + b + ' »');
        assert.ok(!f.steps, name + ' : plusieurs cas');
        assert.ok(!(f.notes && f.notes.length), name + ' : le guide y met une note');
        assert.ok(!D.RITE_OVERRIDES[name], name + ' : un écart de rite est signalé');
        assert.ok(!CONDITIONAL.test(name), name + ' : aliment conditionnel');
        D.RITE_ORDER.forEach(rite => {
            const v = C.view(f, rite);
            assert.ok(!v.diff && v.b === b && !v.steps, name + ' : autre bénédiction chez ' + rite);
        });
    }));
});

test('liste posée : pas de doublon, assez d\'aliments par bénédiction', () => {
    const all = [].concat(...Object.values(B.ASKED));
    assert.strictEqual(new Set(all).size, all.length);
    const shown = B.ORDER.map(b => B.foodsOf(b).map(f => f.shown)).flat();
    assert.strictEqual(new Set(shown).size, shown.length, 'deux aliments s\'affichent pareil');
    ['haets', 'haadama', 'mezonot'].forEach(b => assert.ok(B.foodsOf(b).length >= 20, b));
    assert.ok(B.foodsOf('chehakol').length >= 30);
    assert.ok(B.foodsOf('hamotsi').length >= 10);
    assert.strictEqual(B.foodsOf('haguafen').length, 3);
});

test('liste posée : aucun aliment discuté ou à précision (banane, riz, pizza, chocolat, jus de fruits…) n\'est posé', () => {
    const all = [].concat(...Object.values(B.ASKED));
    ['Banane', 'Riz', 'Pizza', 'Chocolat', 'Matsa', 'Petit pain', 'Avocat', 'Framboise', 'Houmous', 'Pop corn', 'Sushi', 'Carotte crue', 'Jus d\'orange', 'Jus de pomme', 'Bretzel'].forEach(n => assert.ok(!all.includes(n), n));
});

test('plan : deux intrus, trois « quel aliment », cinq « quelle bénédiction » sur dix questions', () => {
    for (let seed = 1; seed <= 30; seed++) {
        const types = B.plan(10, seeded(seed));
        assert.strictEqual(types.length, 10);
        assert.strictEqual(types.filter(t => t === 'odd').length, 2);
        assert.strictEqual(types.filter(t => t === 'food').length, 3);
        assert.strictEqual(types.filter(t => t === 'blessing').length, 5);
    }
});

test('questions : quatre propositions distinctes, une seule bonne, de la bonne façon, pour chaque série et chaque tirage', () => {
    B.SECTIONS.forEach(section => {
        for (let seed = 1; seed <= 150; seed++) {
            const g = B.createGame({ section, rng: seeded(seed) });
            assert.strictEqual(g.questions.length, 10, section);
            g.questions.forEach(q => {
                const where = section + ' #' + seed + ' ' + q.type + ' ' + q.id;
                assert.strictEqual(q.options.length, 4, where);
                assert.strictEqual(new Set(q.options.map(o => o.label)).size, 4, where + ' : propositions identiques');
                assert.ok(q.answer >= 0 && q.answer < 4, where);
                if (q.type === 'blessing') {
                    assert.strictEqual(q.food.b, q.blessing, where);
                    assert.strictEqual(q.options[q.answer].b, q.blessing, where);
                    assert.ok(q.options.every(o => o.kind === 'blessing'), where);
                    // l'ordre des propositions est celui du guide, toujours
                    const idx = q.options.map(o => B.ORDER.indexOf(o.b));
                    assert.deepStrictEqual(idx, idx.slice().sort((a, b) => a - b), where + ' : ordre des propositions');
                } else if (q.type === 'food') {
                    assert.strictEqual(q.options[q.answer].b, q.blessing, where);
                    q.options.forEach((o, i) => { if (i !== q.answer) assert.notStrictEqual(o.b, q.blessing, where + ' : une autre proposition est aussi bonne'); });
                } else {
                    const same = q.options.filter(o => o.b === q.blessing);
                    assert.strictEqual(same.length, 3, where + ' : trois aliments de la même bénédiction');
                    assert.notStrictEqual(q.options[q.answer].b, q.blessing, where);
                    assert.strictEqual(q.options[q.answer].b, q.intruderBlessing, where);
                }
                // Chaque aliment de chaque proposition vient du guide, avec la bénédiction annoncée.
                q.options.filter(o => o.kind === 'food').forEach(o => assert.strictEqual(D.FOODS.find(f => f.id === o.id).b, o.b, where));
            });
        }
    });
});

test('parties : la série est respectée, chaque bénédiction de la série est visée, jamais deux fois le même aliment visé', () => {
    B.SECTIONS.forEach(section => {
        const pool = B.POOLS[section];
        for (let seed = 1; seed <= 150; seed++) {
            const g = B.createGame({ section, rng: seeded(seed) });
            const targets = g.questions.map(q => q.blessing);
            assert.ok(targets.every(b => pool.includes(b)), section);
            pool.forEach(b => assert.ok(targets.includes(b), section + ' #' + seed + ' : ' + b + ' jamais visée'));
            const foods = g.questions.map(q => q.food.id);
            assert.strictEqual(new Set(foods).size, foods.length, section + ' #' + seed + ' : un aliment revient');
            assert.ok(targets.filter(b => b === 'haguafen').length <= 2, 'les trois vins ne reviennent pas à chaque question');
        }
    });
});

test('partie : bonne réponse 100 points, mauvaise 0, fin, et jouable à plusieurs', () => {
    const Quiz = require('../js/quizCore.js');
    const g = B.createGame({ section: 'all', rng: seeded(5) });
    for (let i = 0; i < 10; i++) {
        const q = B.question(g);
        const wrong = (q.answer + 1) % 4;
        assert.deepStrictEqual(B.answer(g, i % 2 === 0 ? q.answer : wrong), [i % 2 === 0 ? 'right' : 'wrong']);
        B.next(g);
    }
    assert.strictEqual(g.over, true);
    assert.strictEqual(g.score, 500);
    assert.strictEqual(g.found, 5);
    Quiz.setPendingPlayers(['Anna', 'Ben']);
    const m = B.createGame({ section: 'all', rng: seeded(6) });
    assert.ok(m.multi);
    assert.strictEqual(m.questions.length, 10);
    Quiz.setPendingPlayers(null);
});

test('blessingChoices : la bénédiction la plus confondue est toujours proposée avec la bonne', () => {
    for (let seed = 1; seed <= 40; seed++) {
        assert.ok(B.blessingChoices('haets', seeded(seed)).includes('haadama'));
        assert.ok(B.blessingChoices('haadama', seeded(seed)).includes('haets'));
        assert.ok(B.blessingChoices('hamotsi', seeded(seed)).includes('mezonot'));
        assert.ok(B.blessingChoices('mezonot', seeded(seed)).includes('hamotsi'));
    }
});
