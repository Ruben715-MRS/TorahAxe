const test = require('node:test');
const assert = require('node:assert');
const N = require('../js/niddaCore.js');

test('dates : valides seulement si elles existent, sans décalage de fuseau', () => {
    assert.strictEqual(N.dayNumber('2026-02-29'), null);
    assert.strictEqual(N.dayNumber('2028-02-29') !== null, true);
    assert.strictEqual(N.dayNumber('21/11/2026'), null);
    assert.strictEqual(N.isoOf(N.dayNumber('2026-12-31') + 1), '2027-01-01');
    assert.strictEqual(N.addDays('2026-11-28', -1), '2026-11-27');
});

test('nidda : sept jours à partir du début du flux, prolongés si le sang dure plus longtemps', () => {
    assert.deepStrictEqual(N.compute('2026-11-21', null).nidda, { from: '2026-11-21', to: '2026-11-27' });
    assert.deepStrictEqual(N.compute('2026-11-21', '2026-11-24').nidda, { from: '2026-11-21', to: '2026-11-27' });
    assert.deepStrictEqual(N.compute('2026-11-21', '2026-11-30').nidda, { from: '2026-11-21', to: '2026-11-30' });
});

test('premier hefsek possible : 5e jour (ashkénaze), 4e jour (séfarade), après le dernier jour vu', () => {
    const r = N.compute('2026-11-21', null);
    assert.strictEqual(r.earliest.ashk, '2026-11-25');
    assert.strictEqual(r.earliest.sef, '2026-11-24');
    const late = N.compute('2026-11-21', '2026-11-27');
    assert.strictEqual(late.earliest.sef, '2026-11-28');
    assert.strictEqual(late.earliest.ashk, '2026-11-28');
});

test('sans hefsek : pas de jours blancs ni de tevila, seulement les dates possibles', () => {
    const r = N.compute('2026-11-21', null, { usage: 'ashk' });
    assert.strictEqual(r.hefsek, undefined);
    assert.strictEqual(r.clean, undefined);
    assert.strictEqual(r.tevila, undefined);
    assert.deepStrictEqual(Object.keys(r.earliest), ['ashk']);
});

test('avec hefsek : sept jours blancs le lendemain, tevila la nuit suivant le septième', () => {
    const r = N.compute('2026-11-21', null, { usage: 'ashk', hefsek: '2026-11-25' });
    assert.strictEqual(r.hefsek, '2026-11-25');
    assert.deepStrictEqual(r.clean, { from: '2026-11-26', to: '2026-12-02' });
    assert.strictEqual(r.tevila, '2026-12-03');
});

test('hefsek trop tôt : refusé, avec la première date possible', () => {
    assert.deepStrictEqual(N.compute('2026-11-21', null, { usage: 'ashk', hefsek: '2026-11-24' }), { ok: false, reason: 'hefsekEarly', earliest: '2026-11-25' });
    assert.strictEqual(N.compute('2026-11-21', null, { usage: 'sef', hefsek: '2026-11-23' }).reason, 'hefsekEarly');
});

test('sans usage choisi : le hefsek doit tomber après la date la plus tôt des deux usages', () => {
    assert.strictEqual(N.compute('2026-11-21', null, { hefsek: '2026-11-23' }).reason, 'hefsekEarly');
    assert.strictEqual(N.compute('2026-11-21', null, { hefsek: '2026-11-24' }).tevila, '2026-12-02');
});

test('entrées refusées : date invalide, dernier jour avant le premier, écart trop grand', () => {
    assert.deepStrictEqual(N.compute('', null), { ok: false, reason: 'onset' });
    assert.deepStrictEqual(N.compute('2026-13-01', null), { ok: false, reason: 'onset' });
    assert.deepStrictEqual(N.compute('2026-11-21', '2026-11-20'), { ok: false, reason: 'order' });
    assert.deepStrictEqual(N.compute('2026-11-01', '2026-12-20'), { ok: false, reason: 'span' });
});

test('calendrier hébraïque : jour et mois hébraïques, prochain jour du mois au mois suivant', () => {
    assert.deepStrictEqual(N.hebrewOf('2026-11-21'), { day: 11, monthId: 'Kislev', year: 5787 });
    assert.strictEqual(N.nextSameHebrewDay('2026-11-21'), '2026-12-21');   // 11 Kislev → 11 Tévet
});

test('vestot : ona beinonit (30e jour inclus), yom haḥodech, haflagah ; même moment que le dernier début', () => {
    const v = N.vestot([{ date: '2026-10-01', ona: 'day' }, { date: '2026-11-01', ona: 'night' }]);
    assert.strictEqual(v.ok, true);
    const by = k => v.list.find(x => x.kind === k);
    assert.deepStrictEqual(by('beinonit'), { kind: 'beinonit', date: '2026-11-30', ona: 'night' });   // 1er novembre + 29 jours
    assert.deepStrictEqual(by('haflagah'), { kind: 'haflagah', date: '2026-12-02', ona: 'night' });   // intervalle de 31 jours
    assert.strictEqual(by('hodesh').ona, 'night');
    assert.deepStrictEqual(v.usages, ['31e jour', '24 heures']);
});

test('vestot : sans deuxième début, pas de haflagah ; sans début, rien', () => {
    const one = N.vestot([{ date: '2026-11-21', ona: 'day' }]);
    assert.strictEqual(one.list.some(x => x.kind === 'haflagah'), false);
    assert.strictEqual(one.list.some(x => x.kind === 'beinonit'), true);
    assert.deepStrictEqual(N.vestot([]), { ok: false, reason: 'none' });
});
