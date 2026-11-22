const test = require('node:test');
const assert = require('node:assert');
const K = require('../js/ketoretCore.js');

test('onze aromates : quatre de la Torah, sept ajoutés par les Sages', () => {
    assert.strictEqual(K.SPICES.length, 11);
    assert.strictEqual(K.TORAH_SPICES.length, 4);
    assert.strictEqual(K.SAGES_SPICES.length, 7);
    assert.deepStrictEqual(K.TORAH_SPICES.map(s => s.maneh), [70, 70, 70, 70]);   // « à poids égal » (Exode 30:34)
});

test('poids : 368 maneh = 365 jours + 3 pour Yom Kippour (Kéritot 6a)', () => {
    assert.strictEqual(K.totalManeh(), 368);
    assert.strictEqual(K.TOTAL_MANEH, K.DAYS + K.KIPPUR_EXTRA);
    assert.strictEqual(K.totalManeh(), K.TOTAL_MANEH);
    assert.strictEqual(K.torahManeh(), 280);
});

test('parts : la somme des pourcentages fait 100', () => {
    const sum = K.SPICES.reduce((a, s) => a + K.share(s), 0);
    assert.ok(Math.abs(sum - 100) < 1e-9);
    const day = K.SPICES.reduce((a, s) => a + K.dailyShare(s), 0);
    assert.ok(Math.abs(day - 1) < 1e-9);
});

test('byWeight : du plus lourd au plus léger, identifiants uniques', () => {
    const w = K.byWeight().map(s => s.maneh);
    assert.deepStrictEqual(w, w.slice().sort((a, b) => b - a));
    assert.strictEqual(new Set(K.SPICES.map(s => s.id)).size, 11);
    assert.strictEqual(K.spice('levona').he, 'הלבונה');
    assert.strictEqual(K.spice('nope'), null);
});

test('ordre de grandeur : de l\'ordre de 150 kg', () => {
    assert.strictEqual(K.approxTotalKg(), 150);
});

test('contenu : chaque fiche porte un texte et une source, les avis sont signalés', () => {
    K.SPICES.forEach(s => { assert.ok(s.he && s.fr && s.identification, s.id); });
    K.SERVICE.concat(K.MEANINGS, K.ADDITIVES).forEach(x => { assert.ok(x.id && x.fr && x.text, x.id); });
    K.SERVICE.forEach(x => assert.ok(x.ref, x.id));
    K.MEANINGS.forEach(x => assert.ok(x.who, x.id));
    assert.ok(K.ADDITIVES.find(a => a.id === 'jordan').opinion);
});
