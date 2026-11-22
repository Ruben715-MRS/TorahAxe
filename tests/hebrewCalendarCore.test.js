const test = require('node:test');
const assert = require('node:assert');


test('les dates hassidiques de Habad : seulement avec l\'option habad', () => {
    const C = require('../js/hebrewCalendarCore.js');
    const FR = require('../ui/fr.json').tools;
    assert.ok(!C.feastsOf(5787, false).some(f => f.kind === 'habad'));
    const list = C.feastsOf(5787, false, true).filter(f => f.kind === 'habad');
    assert.strictEqual(list.length, C.HABAD_FEASTS.length);
    list.forEach(f => ['name', 'src', 'what'].forEach(k => assert.ok(FR['hcal_f_' + f.id + '_' + k], f.id + ' ' + k)));
    const kislev19 = list.find(f => f.id === 'habad_19kislev');
    assert.strictEqual(C.hebrewFromFixed(kislev19.fixed).day, 19);
    assert.strictEqual(C.hebrewFromFixed(kislev19.fixed).month, 'Kislev');
    const tamuz = list.find(f => f.id === 'habad_12tamuz');
    assert.strictEqual(tamuz.days, 2);
    assert.ok(C.dayInfo(kislev19.fixed, false, true).feasts.some(f => f.id === 'habad_19kislev'));
    assert.ok(!C.dayInfo(kislev19.fixed, false).feasts.some(f => f.id === 'habad_19kislev'));
    assert.ok(C.feastIds().every(id => id.indexOf('habad_') !== 0));
});
