const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/torahReadingCore.js');
const Sedra = require('../js/sedraCore.js');
const CY = require('../js/calendarYearCore.js');
const data = require('../data/torah/weekday.json');
const F = (y, m, d) => CY.gregorianToFixed(y, m, d);

test('les données : 54 parachiot de trois montées, et les jours particuliers', () => {
    assert.strictEqual(data.parashot.length, 54);
    data.parashot.forEach(p => assert.strictEqual(p.a.length, 3));
    assert.deepStrictEqual(data.parashot[0].a[0], [1, 1, 1, 5]);       // Béréchit : 1, 1-5
    assert.strictEqual(data.special.rc.a.length, 4);
    assert.deepStrictEqual(data.special.fast.a[0], [32, 11, 32, 14]);
});

test('lundi et jeudi : le début de la paracha du Chabbat qui vient', () => {
    const thu = R.readingFor(F(2026, 11, 19), false);
    assert.strictEqual(thu.kind, 'parasha');
    assert.strictEqual(thu.parasha, Sedra.parashaOfShabbat(F(2026, 11, 21), false)[0]);
    assert.strictEqual(R.readingFor(F(2026, 11, 18), false).kind, 'none');            // mercredi
    assert.strictEqual(R.nextReading(F(2026, 11, 18), false).fixed, F(2026, 11, 19));
    assert.strictEqual(R.aliyot(thu, data).length, 3);
});

test('les jours particuliers remplacent la lecture de la paracha', () => {
    assert.strictEqual(R.readingFor(F(2026, 11, 11), false).kind, 'rc');               // 1er Kislev 5787
    assert.strictEqual(R.readingFor(F(2026, 12, 7), false).kind, 'hanukkah');
    assert.strictEqual(R.readingFor(F(2026, 12, 20), false).kind, 'fast');             // 10 Tevet
    assert.strictEqual(R.readingFor(F(2027, 3, 23), false).kind, 'purim');
    assert.strictEqual(R.aliyot({ kind: 'hanukkah' }, data), null);
});
