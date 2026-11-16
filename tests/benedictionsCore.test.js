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

test('les rites : \'Habad est la liste telle quelle, les autres ont leurs écarts', () => {
    const riz = find('Riz');
    assert.strictEqual(C.view(riz, 'habad').b, 'chehakol');
    assert.strictEqual(C.view(riz, undefined).b, 'chehakol');
    assert.strictEqual(C.view(riz, 'inconnu').b, 'chehakol');
    ['sefarade', 'ashkenaze'].forEach(r => {
        const v = C.view(riz, r);
        assert.strictEqual(v.b, 'mezonot');
        assert.ok(v.diff && v.habad === 'chehakol' && v.note);
    });
});

test('les rites : une précision sans changement de bénédiction', () => {
    const banane = find('Banane');
    const v = C.view(banane, 'sefarade');
    assert.strictEqual(v.b, 'haadama');
    assert.ok(!v.diff && v.note);
    assert.strictEqual(C.view(banane, 'habad').note, null);
    assert.strictEqual(C.view(find('Matsa'), 'sefarade').b, 'mezonot');
    assert.strictEqual(C.view(find('Matsa'), 'ashkenaze').b, 'hamotsi');
});

test('les rites : le filtre et les compteurs suivent le rite', () => {
    const chehakolHabad = C.filterFoods({ b: 'chehakol', rite: 'habad' }).map(f => f.n);
    const chehakolSef = C.filterFoods({ b: 'chehakol', rite: 'sefarade' }).map(f => f.n);
    assert.ok(chehakolHabad.indexOf('Riz') !== -1 && chehakolSef.indexOf('Riz') === -1);
    assert.ok(C.filterFoods({ b: 'mezonot', rite: 'sefarade' }).some(f => f.n === 'Riz'));
    assert.strictEqual(C.countByBlessing('sefarade').mezonot, C.countByBlessing('habad').mezonot + 4);
});

test('les écarts de rite ne désignent que des aliments qui existent', () => {
    const names = D.FOODS.map(f => f.n);
    Object.keys(D.RITE_OVERRIDES).forEach(n => assert.ok(names.indexOf(n) !== -1, n));
    assert.deepStrictEqual(D.RITE_ORDER.slice().sort(), Object.keys(D.RITES).sort());
});

test('les bénédictions finales : déduites de la bénédiction initiale', () => {
    const f = (name, rite) => C.finalsOf(find(name), rite);
    assert.deepStrictEqual(f('Pain de seigle', 'habad'), ['hamazon']);
    assert.deepStrictEqual(f('Gâteau', 'sefarade'), ['hamihya']);
    assert.deepStrictEqual(f('Vin de raisin frais ou de raisin sec', 'ashkenaze'), ['hagefen']);
    assert.deepStrictEqual(f('Datte', 'habad'), ['haets']);
    assert.deepStrictEqual(f('Pomme', 'habad'), ['nefachot']);
    assert.deepStrictEqual(f('Carotte crue', 'sefarade'), ['nefachot']);
    assert.deepStrictEqual(f('Viande', 'ashkenaze'), ['nefachot']);
    assert.deepStrictEqual(f("Aspirine n'ayant pas de goût", 'habad'), []);
});

test('les bénédictions finales : le riz finit par Boré Nefachot dans les trois rites', () => {
    ['sefarade', 'ashkenaze', 'habad'].forEach(r => ['Riz', 'Soupe au riz', 'Omelette au riz'].forEach(n => assert.deepStrictEqual(C.finalsOf(find(n), r), ['nefachot'], n + ' ' + r)));
});

test('les bénédictions finales : la matsa suit le rite', () => {
    assert.deepStrictEqual(C.finalsOf(find('Matsa'), 'habad'), ['hamazon']);
    assert.deepStrictEqual(C.finalsOf(find('Matsa'), 'ashkenaze'), ['hamazon']);
    assert.deepStrictEqual(C.finalsOf(find('Matsa'), 'sefarade'), ['hamihya']);
    assert.ok(C.finalNote(find('Matsa'), 'sefarade'));
    assert.strictEqual(C.finalNote(find('Matsa'), 'habad'), null);
});

test('les bénédictions finales : un cas à plusieurs étapes, et la quantité', () => {
    assert.deepStrictEqual(C.finalsOf(find('Glace dans un cornet sucré'), 'habad'), ['nefachot', 'hamihya']);
    assert.deepStrictEqual(C.finalsOf(find('Spaghetti et boulettes de viande, s\'ils sont mangés séparément'), 'sefarade'), ['hamihya', 'nefachot']);
    assert.ok(/huitième de litre/.test(C.shiur('nefachot', find('Café'), 'habad')));
    assert.ok(/kazaït/.test(C.shiur('nefachot', find('Viande'), 'habad')));
    assert.ok(/revi/.test(C.shiur('hagefen', find('Champagne'), 'sefarade')));
});

test('les bénédictions finales : tous les aliments sont couverts, et les données sont cohérentes', () => {
    const names = D.FOODS.map(f => f.n);
    D.LIQUIDS.concat(D.SEVEN_SPECIES, Object.keys(D.FINAL_OVERRIDES), Object.keys(D.FINAL_NOTES)).forEach(n => assert.ok(names.indexOf(n) !== -1, n));
    D.FOODS.forEach(f => ['sefarade', 'ashkenaze', 'habad'].forEach(r => {
        const finals = C.finalsOf(f, r);
        finals.forEach(k => assert.ok(D.FINALS[k], f.n + ' : ' + k));
        if (f.b !== 'aucune') assert.ok(finals.length > 0, f.n);
    }));
    D.FINAL_ORDER.forEach(k => D.FINALS[k].sections.forEach(id => assert.ok(require('fs').existsSync(__dirname + '/../data/siddur/' + id + '.json'), id)));
});
