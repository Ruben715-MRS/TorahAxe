const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const O = require('../js/orderGameCore.js');
const DATA = {
    parashot: require('../data/torah/parashot.json'), tanakh: require('../data/tanakh/index.json'),
    michna: require('../data/michna/index.json'), talmud: require('../data/talmud/index.json')
};
const CATS = O.categories(DATA);
const cat = id => CATS.find(c => c.id === id);
const labels = id => cat(id).items.map(i => i.label);

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

test('les catégories : huit listes, identifiants uniques dans chaque liste, au moins cinq éléments', () => {
    assert.deepStrictEqual(CATS.map(c => c.id), ['parachiot', 'parachiot_livre', 'tanakh', 'michna', 'talmud', 'generations', 'fils', 'rois']);
    CATS.forEach(c => {
        assert.ok(c.items.length >= 5, c.id);
        assert.strictEqual(new Set(c.items.map(i => i.id)).size, c.items.length, c.id);
        c.items.forEach(i => assert.ok(i.label, c.id));
    });
});

test('tailles : 54 parachiot, 24 livres, 63 traités de la Michna, 37 du Talmud, 10 générations, 12 fils, 23 rois', () => {
    assert.deepStrictEqual(['parachiot', 'tanakh', 'michna', 'talmud', 'generations', 'fils', 'rois'].map(id => cat(id).items.length), [54, 24, 63, 37, 10, 12, 23]);
});

test('les ordres : la Torah, le Tanakh, la Michna, le Talmud, les générations, les fils, les rois', () => {
    assert.deepStrictEqual([labels('parachiot')[0], labels('parachiot')[53]], ['Béréchit', 'Vézot Ha-Bérakha']);
    assert.deepStrictEqual(labels('tanakh').slice(0, 6), ['Genèse', 'Exode', 'Lévitique', 'Nombres', 'Deutéronome', 'Josué']);
    assert.strictEqual(labels('tanakh')[23], 'Chroniques');
    assert.deepStrictEqual([labels('michna')[0], labels('michna')[62]], ['Berakhot', 'Oktsin']);
    assert.ok(labels('michna').indexOf('Yoma') < labels('michna').indexOf('Roch Hachana'), 'Michna : Yoma avant Roch Hachana');
    assert.ok(labels('talmud').indexOf('Roch Hachana') < labels('talmud').indexOf('Yoma'), 'Talmud : Roch Hachana avant Yoma');
    assert.deepStrictEqual(labels('generations'), ['Adam', 'Seth', 'Énosh', 'Kénan', 'Mahalaleel', 'Jéred', 'Hénoc', 'Metuschélah', 'Lémec', 'Noé']);
    assert.deepStrictEqual(labels('fils'), ['Ruben', 'Siméon', 'Lévi', 'Juda', 'Dan', 'Naphtali', 'Gad', 'Acher', 'Issakhar', 'Zébulon', 'Joseph', 'Benjamin']);
    assert.deepStrictEqual(labels('rois').slice(0, 5), ['Saül', 'David', 'Salomon', 'Roboam', 'Abija']);
    assert.strictEqual(labels('rois')[22], 'Sédécias');
});

test('les notes : le livre de chaque paracha, le séder de chaque traité, le rang de chaque génération', () => {
    assert.strictEqual(cat('parachiot').items[0].note, 'Genèse');
    assert.strictEqual(cat('michna').items[0].note, 'Séder Zeraïm');
    assert.strictEqual(cat('tanakh').items[5].note, 'Prophètes');
    assert.strictEqual(cat('generations').items[9].note, '10ᵉ génération');
    assert.strictEqual(cat('fils').items[0].note, '1ᵉʳ fils');
});

test('makeQuestion : cinq éléments distincts, jamais donnés dans le bon ordre, le bon ordre = celui de la liste', () => {
    CATS.forEach(c => {
        for (let seed = 1; seed <= 40; seed++) {
            const q = O.makeQuestion(c, seeded(seed));
            assert.strictEqual(q.items.length, 5);
            assert.strictEqual(new Set(q.order).size, 5);
            assert.notDeepStrictEqual(q.items.map(i => i.id), q.order, c.id + ' donné déjà trié');
            const rank = id => c.items.findIndex(i => i.id === id);
            q.order.forEach((id, i) => { if (i) assert.ok(rank(q.order[i - 1]) < rank(id), c.id); });
            assert.deepStrictEqual(q.items.map(i => i.id).sort(), q.order.slice().sort());
        }
    });
});

test('parachiot_livre : les cinq parachiot sont du même livre', () => {
    for (let seed = 1; seed <= 30; seed++) {
        const q = O.makeQuestion(cat('parachiot_livre'), seeded(seed));
        assert.strictEqual(new Set(q.order.map(id => DATA.parashot.parashot[Number(id.slice(2))].book)).size, 1);
    }
});

test('submit : parfait = 100, une paire échangée = 60, tout faux = 0, une réponse invalide ne compte pas', () => {
    const g = O.createGame({ data: DATA, section: 'textes', rng: seeded(5) });
    const q = O.question(g);
    assert.deepStrictEqual(O.submit(g, q.order.slice(0, 4)), []);                    // incomplet
    assert.deepStrictEqual(O.submit(g, ['x', 'y', 'z', 'u', 'v']), []);              // étrangers
    assert.deepStrictEqual(O.submit(g, q.order.slice(0, 4).concat([q.order[0]])), []);   // doublon
    const swap = q.order.slice(); [swap[0], swap[1]] = [swap[1], swap[0]];
    assert.deepStrictEqual(O.submit(g, swap), ['partial']);
    assert.strictEqual(g.score, 60);
    assert.deepStrictEqual(g.last.correct, [false, false, true, true, true]);
    assert.deepStrictEqual(O.submit(g, q.order), []);                                // déjà rendu
    assert.deepStrictEqual(O.next(g), []);
    assert.strictEqual(g.last, null);
    const q2 = O.question(g);
    const rev = q2.order.slice().reverse();                                          // 5 éléments : le milieu reste en place
    assert.deepStrictEqual(O.submit(g, rev), ['partial']);
    assert.strictEqual(g.last.count, 1);
    assert.strictEqual(g.score, 80);
    O.next(g);
    const q3 = O.question(g);
    const derange = q3.order.slice(1).concat([q3.order[0]]);                         // décalé d'un cran : aucun à sa place
    assert.deepStrictEqual(O.submit(g, derange), ['wrong']);
    assert.strictEqual(g.score, 80);
});

test('une partie : cinq classements, catégories de la section, 500 points quand tout est juste', () => {
    for (const section of O.SECTIONS) {
        const g = O.createGame({ data: DATA, section, rng: seeded(9) });
        assert.strictEqual(g.questions.length, 5);
        const ofSection = new Set(CATS.filter(c => section === 'all' || c.section === section).map(c => c.id));
        g.questions.forEach(q => assert.ok(ofSection.has(q.category), section + ' : ' + q.category));
        while (!g.over) { assert.deepStrictEqual(O.submit(g, O.question(g).order), ['perfect']); O.next(g); }
        assert.strictEqual(g.score, 500);
        assert.strictEqual(g.found, 5);
    }
});

test('« textes » : cinq classements de cinq catégories différentes ; « personnages » reprend ses trois catégories', () => {
    const g = O.createGame({ data: DATA, section: 'textes', rng: seeded(3) });
    assert.strictEqual(new Set(g.questions.map(q => q.category)).size, 5);
    const p = O.createGame({ data: DATA, section: 'personnages', rng: seeded(3) });
    assert.strictEqual(new Set(p.questions.map(q => q.category)).size, 3);
});
