const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/mishkanCore.js');

test('camps : les totaux des deux recensements', () => {
    const T = M.campTable();
    assert.deepEqual(T.camps.map(c => c.side), ['east', 'south', 'west', 'north']);
    assert.deepEqual(T.camps.map(c => c.nb1), [186400, 151450, 108100, 157600]);
    assert.deepEqual(T.camps.map(c => c.nb26), [201300, 106430, 130800, 163200]);
    assert.equal(T.total.nb1, 603550);
    assert.equal(T.total.nb26, 601730);
    assert.equal(T.total.diff, -1820);
    assert.equal(T.levi.diff, 700);
    T.camps.forEach(c => assert.equal(c.tribes.length, 3));
});

test('Lévites et premiers-nés : 22 300, 8 580, rachat de 1 365 sicles', () => {
    const L = M.levitesTable();
    assert.equal(L.month, 22300);
    assert.equal(L.work, 8580);
    assert.equal(M.LEVI_CENSUS.nb1 - M.LEVITES_TOTAL_TEXT, 300);
    assert.deepEqual(M.redemption(), { surplus: 273, shekels: 1365 });
});

test('plan du Temple : chaque degré, du mont au Saint des saints, a une zone dans le cadre', () => {
    const P = M.TEMPLE_PLAN;
    const ids = P.zones.map(z => z.id).concat(['mount', 'hel']);
    M.HOLINESS.slice(3).forEach(h => assert.ok(ids.includes(h.id), h.id));
    P.zones.forEach(z => {
        assert.ok(M.HOLINESS.some(h => h.id === z.id), z.id);
        assert.ok(z.x >= 0 && z.y >= P.viewBox[1] && z.x + z.w <= P.viewBox[2] && z.y + z.h <= P.viewBox[1] + P.viewBox[3], z.id);
    });
});
