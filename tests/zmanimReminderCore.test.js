const test = require('node:test');
const assert = require('node:assert');

// --- Hanouka : un rappel chaque soir, avec le nombre de bougies ---------------------------------------------------------------------------------
test('Hanouka 5787 : un rappel chaque soir (1 à 8 bougies), le vendredi avant Chabbat, le samedi à la sortie de Chabbat', () => {
    const R = require('../js/zmanimReminderCore.js');
    const Z = require('../js/zmanimCore.js');
    const place = Z.normalizePlace({ name: 'Marseille', lat: 43.2965, lon: 5.3698, elevation: 0, tz: 'Europe/Paris' });
    const from = Date.parse('2026-12-01T10:00:00+01:00');
    const items = R.plan({ on: true, candles: { on: false }, omer: { on: false }, hanouka: { on: true } }, place, {}, from, 12, false).filter(x => x.kind === 'hanouka');
    assert.deepStrictEqual(items.map(x => x.night), [1, 2, 3, 4, 5, 6, 7, 8]);
    items.forEach(x => assert.ok(x.at > from));
    const fr = items.filter(x => x.friday), sa = items.filter(x => x.motsei);
    assert.deepStrictEqual(fr.map(x => x.night), [1, 8]);      // 5787 : Hanouka commence un vendredi soir (4 décembre 2026) et finit un vendredi
    assert.deepStrictEqual(sa.map(x => x.night), [2]);
    fr.forEach(x => assert.ok(x.at < x.time, 'le vendredi : avant les bougies de Chabbat'));
    const d = R.describe(items[2], (k, p) => k + (p ? JSON.stringify(p) : ''), place, 'fr');
    assert.match(d.title, /zmr_han_title_n.*"n":3/);
});

test('Hanouka : rien hors de la fête, ni si le réglage est coupé', () => {
    const R = require('../js/zmanimReminderCore.js');
    const Z = require('../js/zmanimCore.js');
    const place = Z.normalizePlace({ name: 'Marseille', lat: 43.2965, lon: 5.3698, elevation: 0, tz: 'Europe/Paris' });
    const base = Date.parse('2026-12-01T10:00:00+01:00');
    assert.strictEqual(R.plan({ on: true, hanouka: { on: true } }, place, {}, Date.parse('2026-10-01T10:00:00+02:00'), 7, false).filter(x => x.kind === 'hanouka').length, 0);
    assert.strictEqual(R.plan({ on: true, hanouka: { on: false }, candles: { on: true } }, place, {}, base, 12, false).filter(x => x.kind === 'hanouka').length, 0);
});

// --- Plag Magen Avraham, début de la Chéma du soir, fin des jeûnes ------------------------------------------------------------------------------
test('rappel personnalisé : plag Magen Avraham et Chéma du soir sont proposés, avec leur horaire', () => {
    const R = require('../js/zmanimReminderCore.js');
    const Z = require('../js/zmanimCore.js');
    ['plagMa', 'shemaNight', 'fastEnd'].forEach(k => assert.ok(R.CUSTOM_KEYS.includes(k), k));
    const place = Z.normalizePlace({ name: 'Marseille', lat: 43.2965, lon: 5.3698, elevation: 0, tz: 'Europe/Paris' });
    const from = Date.parse('2026-06-10T00:30:00+02:00');
    const items = R.plan({ on: true, candles: { on: false }, omer: { on: false }, hanouka: { on: false }, days: [0, 1, 2, 3, 4, 5, 6], custom: { plagMa: 10, shemaNight: 0 } }, place, {}, from, 1, false);
    assert.ok(items.some(x => x.key === 'plagMa'));
    assert.ok(items.some(x => x.key === 'shemaNight'));
    const z = Z.zmanim(place, 2026, 6, 10, {});
    assert.strictEqual(items.find(x => x.key === 'plagMa').time, Z.rounded(z, 'plagMa'));
});

test('rappel de fin de jeûne : uniquement les jours de jeûne (17 Tamouz 5786 = jeudi 2 juillet 2026)', () => {
    const R = require('../js/zmanimReminderCore.js');
    const Z = require('../js/zmanimCore.js');
    const place = Z.normalizePlace({ name: 'Marseille', lat: 43.2965, lon: 5.3698, elevation: 0, tz: 'Europe/Paris' });
    const from = Date.parse('2026-06-30T00:30:00+02:00');
    const items = R.plan({ on: true, candles: { on: false }, omer: { on: false }, hanouka: { on: false }, days: [0, 1, 2, 3, 4, 5, 6], custom: { fastEnd: 0 } }, place, {}, from, 10, false)
        .filter(x => x.key === 'fastEnd');
    assert.strictEqual(items.length, 1);
    const day = Z.civilDateOf(place.tz, items[0].time);
    assert.deepStrictEqual([day.year, day.month, day.day], [2026, 7, 2]);
});
