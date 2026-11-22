const test = require('node:test');
const assert = require('node:assert');
const Data = require('../js/messiahData.js');
const C = require('../js/messiahCore.js');

const ALL1 = Data.CRITERIA.stages[0].items.map(i => i.id);
const ALL2 = Data.CRITERIA.stages[1].items.map(i => i.id);

test('assess : rien de coché, aucun verdict', () => {
    const r = C.assess([]);
    assert.strictEqual(r.verdict, 'none');
    assert.strictEqual(r.missing1.length, ALL1.length);
});

test('assess : étape 1 incomplète, pas de « présumé »', () => {
    assert.strictEqual(C.assess(ALL1.slice(1)).verdict, 'none');
});

test('assess : étape 1 complète = présumé Machiah', () => {
    const r = C.assess(ALL1);
    assert.strictEqual(r.verdict, 'presume');
    assert.strictEqual(r.presume, true);
    assert.strictEqual(r.certain, false);
    assert.deepStrictEqual(r.missing2, ALL2);
});

test('assess : étape 2 sans étape 1 ne donne pas « certain »', () => {
    const r = C.assess(ALL2);
    assert.strictEqual(r.verdict, 'none');
    assert.strictEqual(r.certain, false);
});

test('assess : étape 2 incomplète = encore présumé', () => {
    assert.strictEqual(C.assess(ALL1.concat(ALL2.slice(1))).verdict, 'presume');
});

test('assess : les deux étapes complètes = Machiah certain', () => {
    assert.strictEqual(C.assess(ALL1.concat(ALL2)).verdict, 'certain');
});

test('assess : tué ou échec = n’est pas le Machiah, même avec tout coché', () => {
    assert.strictEqual(C.assess(ALL1.concat(ALL2), { killed: true }).verdict, 'not');
    assert.strictEqual(C.assess(ALL1, { failed: true }).verdict, 'not');
});

test('stepsByLevel : les huit étapes, filtrées par niveau', () => {
    assert.strictEqual(C.stepsByLevel().length, 8);
    assert.strictEqual(C.stepsByLevel('all').length, 8);
    C.stepsByLevel('opinion').forEach(s => assert.strictEqual(s.level, 'opinion'));
    assert.ok(C.stepsByLevel('consensus').length > 0);
    assert.deepStrictEqual(C.stepsByLevel('inconnu'), []);
});

test('les données : niveaux valides, étapes numérotées de 1 à 8, références présentes', () => {
    Data.STEPS.forEach((s, i) => {
        assert.strictEqual(s.n, i + 1);
        assert.ok(Data.LEVELS.indexOf(s.level) >= 0, s.id);
        assert.ok(s.text && s.he && s.fr, s.id);
    });
    Data.VERSES.forEach(v => assert.ok(Data.LEVELS.indexOf(v.level) >= 0 && v.ref, v.id));
    Data.RESURRECTION.sources.forEach(v => assert.ok(Data.LEVELS.indexOf(v.level) >= 0 && v.ref, v.id));
    assert.strictEqual(C.stepById('resurrection').n, 7);
    assert.strictEqual(C.stepById('nope'), null);
});

test('la résurrection selon le Rambam : après l’ère messianique, à sa conclusion, sans « pendant ou à la fin »', () => {
    const txt = JSON.stringify(Data.RESURRECTION) + JSON.stringify(Data.STEPS);
    assert.ok(Data.RESURRECTION.when.rambam.indexOf('après l’ère messianique, à sa conclusion') >= 0);
    assert.ok(txt.indexOf('pendant ou à la fin') === -1);
});
