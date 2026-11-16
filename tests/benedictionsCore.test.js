const test = require('node:test');
const assert = require('node:assert');
const D = require('../js/benedictionsData.js');
const C = require('../js/benedictionsCore.js');

const find = (name) => D.FOODS.filter(f => f.n === name)[0];

test('les données : 291 entrées, 33 notes, toutes les bénédictions connues', () => {
    assert.strictEqual(D.FOODS.length, 291);
    assert.strictEqual(Object.keys(D.NOTES).length, 33);
    D.FOODS.forEach(f => {
        C.blessingsOf(f).forEach(b => assert.ok(D.BLESSINGS[b] || b === 'aucune', f.n + ' : ' + b));
        C.notesOf(f).forEach(n => assert.ok(D.NOTES[n], f.n + ' : note ' + n));
    });
    const ids = D.FOODS.map(f => f.id);
    assert.strictEqual(new Set(ids).size, ids.length);
});

test('toutes les notes sont citées par au moins un aliment', () => {
    const cited = new Set();
    D.FOODS.forEach(f => C.notesOf(f).forEach(n => cited.add(n)));
    Object.keys(D.NOTES).forEach(n => assert.ok(cited.has(Number(n)), 'note ' + n));
});

test('quelques aliments, tels que dans le guide', () => {
    assert.strictEqual(find('Abricot').b, 'haets');
    assert.strictEqual(find('Ananas').b, 'haadama');
    assert.strictEqual(find('Gâteau').b, 'mezonot');
    assert.strictEqual(find('Viande').b, 'chehakol');
    assert.strictEqual(find('Champagne').b, 'haguafen');
    assert.strictEqual(find('Jus de raisin').b, 'haguafen');
    assert.strictEqual(find('Matsa').b, 'hamotsi');
    assert.strictEqual(find("Aspirine n'ayant pas de goût").b, 'aucune');
    assert.deepStrictEqual(C.notesOf(find('Banane')), [2]);
});

test('un aliment à plusieurs bénédictions : l\'ordre est conservé', () => {
    const cone = find('Glace dans un cornet sucré');
    assert.deepStrictEqual(cone.steps.map(s => s.b), ['chehakol', 'mezonot']);
    assert.deepStrictEqual(C.blessingsOf(cone), ['chehakol', 'mezonot']);
});

test('la recherche ignore accents et majuscules, et cherche chaque mot', () => {
    assert.ok(C.filterFoods({ query: 'CHEHAKOL' }).length > 50);
    assert.deepStrictEqual(C.filterFoods({ query: 'tarte pomme' }).map(f => f.n), ['Tarte aux pommes']);
    assert.strictEqual(C.filterFoods({ query: 'cotelette veau' }).length, 1);
    assert.strictEqual(C.filterFoods({ query: 'zzzz' }).length, 0);
    assert.strictEqual(C.filterFoods({}).length, 291);
    assert.strictEqual(C.filterFoods({ b: 'all', query: '' }).length, 291);
});

test('le filtre par bénédiction : un aliment à deux cas apparaît sous chacune', () => {
    const mez = C.filterFoods({ b: 'mezonot' }).map(f => f.n);
    const che = C.filterFoods({ b: 'chehakol' }).map(f => f.n);
    assert.ok(mez.indexOf('Glace dans un cornet sucré') !== -1);
    assert.ok(che.indexOf('Glace dans un cornet sucré') !== -1);
    assert.ok(mez.indexOf('Gâteau') !== -1 && che.indexOf('Gâteau') === -1);
    assert.deepStrictEqual(C.filterFoods({ b: 'aucune' }).map(f => f.n), ["Aspirine n'ayant pas de goût"]);
});

test('les compteurs : chaque aliment est compté au moins une fois', () => {
    const counts = C.countByBlessing();
    const total = Object.keys(counts).reduce((s, k) => s + counts[k], 0);
    assert.ok(total >= D.FOODS.length);
    assert.strictEqual(counts.aucune, 1);
});
