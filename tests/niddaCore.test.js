const test = require('node:test');
const assert = require('node:assert');
const N = require('../js/niddaCore.js');

test('dates : valides seulement si elles existent, sans décalage de fuseau', () => {
    assert.strictEqual(N.dayNumber('2026-02-29'), null);          // 2026 n'est pas bissextile
    assert.strictEqual(N.dayNumber('2028-02-29') !== null, true);
    assert.strictEqual(N.dayNumber('21/11/2026'), null);
    assert.strictEqual(N.isoOf(N.dayNumber('2026-12-31') + 1), '2027-01-01');
    assert.strictEqual(N.addDays('2026-11-28', -1), '2026-11-27');
});

test('cas simple : sept jours de nidda, sept jours blancs, immersion la nuit suivante', () => {
    const r = N.compute('2026-11-21', null);
    assert.strictEqual(r.ok, true);
    assert.deepStrictEqual(r.nidda, { from: '2026-11-21', to: '2026-11-27' });
    assert.deepStrictEqual(r.clean, { from: '2026-11-28', to: '2026-12-04' });
    assert.strictEqual(r.tevila, '2026-12-05');
});

test('dernier jour de sang plus tard : le compte repart de ce jour', () => {
    const r = N.compute('2026-11-21', '2026-11-24');
    assert.deepStrictEqual(r.nidda, { from: '2026-11-21', to: '2026-11-27' });   // au moins sept jours
    assert.deepStrictEqual(r.clean, { from: '2026-11-28', to: '2026-12-04' });
    const long = N.compute('2026-11-21', '2026-11-30');
    assert.deepStrictEqual(long.nidda, { from: '2026-11-21', to: '2026-11-30' });
    assert.deepStrictEqual(long.clean, { from: '2026-12-01', to: '2026-12-07' });
    assert.strictEqual(long.tevila, '2026-12-08');
});

test('changement de mois et d\'année', () => {
    const r = N.compute('2026-12-28', null);
    assert.deepStrictEqual(r.nidda, { from: '2026-12-28', to: '2027-01-03' });
    assert.strictEqual(r.tevila, '2027-01-11');
});

test('entrées refusées : date invalide, dernier jour avant le premier, écart trop grand', () => {
    assert.deepStrictEqual(N.compute('', null), { ok: false, reason: 'onset' });
    assert.deepStrictEqual(N.compute('2026-13-01', null), { ok: false, reason: 'onset' });
    assert.deepStrictEqual(N.compute('2026-11-21', '2026-11-20'), { ok: false, reason: 'order' });
    assert.deepStrictEqual(N.compute('2026-11-01', '2026-12-20'), { ok: false, reason: 'span' });
});
