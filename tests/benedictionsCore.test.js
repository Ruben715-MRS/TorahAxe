const test = require('node:test');
const assert = require('node:assert');
const D = require('../js/benedictionsData.js');
const C = require('../js/benedictionsCore.js');

const find = (name) => D.FOODS.filter(f => f.n === name)[0];

test('les données : 387 entrées, 36 notes, toutes les bénédictions connues', () => {
    assert.strictEqual(D.FOODS.length, 387);
    assert.strictEqual(Object.keys(D.NOTES).length, 36);
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
    assert.strictEqual(C.filterFoods({}).length, 387);
    assert.strictEqual(C.filterFoods({ b: 'all', query: '' }).length, 387);
});

test('les fruits et légumes : on retrouve un aliment par son nom usuel', () => {
    const names = (q) => C.filterFoods({ query: q }).map(f => f.n);
    assert.strictEqual(names('kaki')[0], 'Kaki');
    assert.strictEqual(names('plaqueminier')[0], 'Kaki');
    assert.strictEqual(names('fruit du dragon')[0], 'Fruit du dragon');
    assert.strictEqual(names('pitaya')[0], 'Fruit du dragon');
    assert.ok(names('patate').indexOf('Pomme de terre cuite, écrasée ou frite') !== -1);
    assert.strictEqual(names('batate')[0], 'Patate douce');
    assert.strictEqual(names('chou-fleur')[0], 'Chou fleur');
    assert.ok(names('poivron').indexOf('Poivron rouge') !== -1);
    assert.deepStrictEqual(C.blessingsOf(find('Kaki')), ['haets']);
    assert.deepStrictEqual(C.blessingsOf(find('Fruit du dragon')), ['haadama']);
    assert.deepStrictEqual(C.notesOf(find('Kaki')), [34]);
});

test('les fruits et légumes ajoutés : chaque ajout porte la note de classement', () => {
    D.FOODS.filter(f => f.id >= 292).forEach(f => {
        assert.ok(C.notesOf(f).indexOf(34) !== -1, f.n);
        assert.ok(['haets', 'haadama', 'chehakol'].indexOf(f.b) !== -1, f.n);
    });
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
    D.FINAL_ORDER.forEach(k => D.RITE_ORDER.forEach(r => C.finalOpen(k, r).ids.forEach(id => assert.ok(require('fs').existsSync(__dirname + '/../data/siddur/' + id + '.json'), id + ' (' + k + ', ' + r + ')'))));
});

test('les bénédictions finales : le texte s\'ouvre dans le nusach du rite', () => {
    assert.deepStrictEqual(C.finalOpen('hamazon', 'sefarade').ids, ['birkat-hamazon']);
    assert.deepStrictEqual(C.finalOpen('hamazon', 'ashkenaze').ids, ['birkat-hamazon-ashkenaze']);
    assert.deepStrictEqual(C.finalOpen('hamazon', 'habad').ids, ['birkat-hamazon-habad']);
    assert.deepStrictEqual(C.finalOpen('hamihya', 'sefarade').ids, ['al-hamihya']);
    assert.deepStrictEqual(C.finalOpen('hagefen', 'ashkenaze').ids, ['al-hamihya-ashkenaze']);
    ['sefarade', 'ashkenaze', 'habad'].forEach(r => assert.deepStrictEqual(C.finalOpen('nefachot', r).ids, ['birkhot-hanehenin']));
    assert.deepStrictEqual(C.finalOpen('hamazon', 'inconnu').ids, ['birkat-hamazon-habad']);     // rite inconnu : 'Habad, le rite par défaut
});

test('la pizza : cas selon la pâte et la quantité, dans chaque rite', () => {
    const pizza = find('Pizza');
    const sef = C.view(pizza, 'sefarade');
    assert.deepStrictEqual(sef.steps.map(s => s.b), ['hamotsi', 'mezonot', 'hamotsi', 'hamotsi']);
    assert.ok(sef.diff && sef.note);       // les cas séfarades diffèrent de ceux de 'Habad
    ['ashkenaze', 'habad'].forEach(r => {
        const v = C.view(pizza, r);
        assert.deepStrictEqual(v.steps.map(s => s.b), ['mezonot', 'hamotsi', 'hamotsi']);
        assert.strictEqual(v.diff, false, r);
    });
    assert.deepStrictEqual(C.blessingsOf(pizza, 'sefarade'), ['hamotsi', 'mezonot']);
    assert.deepStrictEqual(C.finalsOf(pizza, 'habad'), ['hamihya', 'hamazon']);
    assert.ok(C.filterFoods({ query: 'pizza', b: 'hamotsi', rite: 'sefarade' }).length === 1);
    assert.ok(C.filterFoods({ query: 'pizza', b: 'hamotsi', rite: 'habad' }).length === 1);
    assert.deepStrictEqual(C.notesOf(pizza), [25]);
});

test('la recherche : singulier et pluriel se confondent, et « pâtes » trouve les pâtes', () => {
    const names = (q) => C.filterFoods({ query: q }).map(f => f.n);
    assert.ok(names('pâtes').indexOf('Pâtes') !== -1);
    assert.ok(names('pates').indexOf('Pâtes') !== -1);
    assert.ok(names('pâte').indexOf('Pâtes') !== -1);
    assert.ok(names('pommes').indexOf('Pomme') !== -1);
    assert.ok(names('carotte').indexOf('Carotte crue') !== -1);
    assert.deepStrictEqual(names('tarte pommes'), ['Tarte aux pommes']);
    assert.strictEqual(find('Pâtes').b, 'mezonot');
});

test('la recherche : les noms les plus courts d\'abord, puis les plus longs', () => {
    const names = (q) => C.filterFoods({ query: q }).map(f => f.n);
    ['pâtes', 'riz', 'pizza', 'soupe', 'gâteau', 'pain'].forEach(q => {
        const lens = names(q).map(n => n.length);
        assert.deepStrictEqual(lens, lens.slice().sort((a, b) => a - b), q);
    });
    assert.strictEqual(names('pâtes')[0], 'Pâtes');
    assert.strictEqual(names('riz')[0], 'Riz');
    assert.strictEqual(names('pizza')[0], 'Pizza');
    // sans recherche : l'ordre du guide
    assert.strictEqual(C.filterFoods({})[0].n, D.FOODS[0].n);
    assert.strictEqual(C.filterFoods({ b: 'haets' })[0].n, D.FOODS.filter(f => f.b === 'haets')[0].n);
});

test('la halakha générale : sections complètes, bénédictions connues, tableau du dessert', () => {
    const H = D.HALAKHA;
    assert.ok(H.note.length > 0);
    assert.strictEqual(H.sections.length, 5);
    H.sections.forEach(sec => {
        assert.ok(sec.id && sec.title, sec.id);
        assert.ok((sec.paras || []).length + (sec.bullets || []).length > 0, sec.id);
        (sec.list || []).forEach(it => assert.ok(D.ORDER.indexOf(it.b) !== -1, it.b));
    });
    assert.deepStrictEqual(H.sections[0].list.map(it => it.b), ['hamotsi', 'mezonot', 'haguafen', 'haets', 'haadama', 'chehakol']);
    const dessert = H.sections.filter(sec => sec.id === 'dessert')[0];
    assert.strictEqual(dessert.table.length, 6);
});

test('la halakha : les exemples renvoient à un aliment de la liste, les sources et liens sont bien formés', () => {
    const H = D.HALAKHA;
    const ikar = H.sections.filter(sec => sec.id === 'ikar')[0];
    ikar.examples.filter(ex => ex.q).forEach(ex => assert.ok(C.filterFoods({ query: ex.q }).length > 0, ex.q));
    H.sections.forEach(sec => (sec.sources || []).forEach(src => {
        assert.ok(src.ref && src.for, sec.id);
    }));
    const links = H.sections.reduce((all, sec) => all.concat(sec.links || []), []);
    links.forEach(l => assert.ok(['ben-texts', 'ben-other'].indexOf(l.panel) !== -1, l.label));
});

test('mon plat : l\'Ikar selon les règles (céréale, pain, principal, majorité, liant, égalité)', () => {
    assert.strictEqual(C.ikarOf([{ b: 'haadama', pct: 60 }, { b: 'chehakol', pct: 40 }]).b, 'haadama');
    assert.strictEqual(C.ikarOf([{ b: 'haadama', pct: 60 }, { b: 'chehakol', pct: 40 }]).rule, 'majorite');
    assert.strictEqual(C.ikarOf([{ b: 'mezonot', pct: 70 }, { b: 'haadama', pct: 30 }]).b, 'mezonot');
    assert.strictEqual(C.ikarOf([{ b: 'mezonot', pct: 10 }, { b: 'chehakol', pct: 90 }]).b, 'mezonot');
    assert.strictEqual(C.ikarOf([{ b: 'chehakol', pct: 90 }, { b: 'mezonot', pct: 10, liant: true }]).b, 'chehakol');
    assert.strictEqual(C.ikarOf([{ b: 'haadama', pct: 80 }, { b: 'hamotsi', pct: 20 }]).b, 'hamotsi');
    assert.strictEqual(C.ikarOf([{ b: 'haets', pct: 30, principal: true }, { b: 'haadama', pct: 70 }]).rule, 'principal');
    const tie = C.ikarOf([{ b: 'haadama', pct: 50 }, { b: 'haets', pct: 50 }]);
    assert.strictEqual(tie.rule, 'egalite');
    assert.strictEqual(tie.b, 'haets');
    assert.strictEqual(C.ikarOf([]).rule, 'none');
    assert.strictEqual(C.ikarOf([{ b: 'aucune', pct: 100 }]).rule, 'none');
});
