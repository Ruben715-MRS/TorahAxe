const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/sedraCore.js');
const T = require('../js/torahCore.js');
const HC = require('../js/hebrewCalendarCore.js');
const CY = require('../js/calendarYearCore.js');
const CAL = require('../data/torah/calendar.json');
const PAR = require('../data/torah/parashot.json');

const fx = (y, m, d) => CY.gregorianToFixed(y, m, d);
const name = idx => idx && idx.map(i => PAR.parashot[i].fr).join(' – ');

test('le calendrier d\'origine (data/torah/calendar.json, 2025 à 2036, diaspora, 583 Chabbatot) : le calcul donne exactement les mêmes parachiot', () => {
    let n = 0;
    Object.keys(CAL.sabbaths).forEach(key => {
        const [y, m, d] = key.split('-').map(Number);
        assert.deepStrictEqual(S.parashaOfShabbat(fx(y, m, d), false), CAL.sabbaths[key], key);
        n++;
    });
    assert.strictEqual(n, 583);
});

test('et les Chabbatot qui manquent au fichier d\'origine sont bien des Chabbatot de fête (sans paracha ordinaire)', () => {
    let fetes = 0;
    for (let f = fx(2025, 1, 4); f <= fx(2036, 12, 27); f += 7) {
        const key = (g => g.year + '-' + String(g.month).padStart(2, '0') + '-' + String(g.day).padStart(2, '0'))(CY.fixedToGregorian(f));
        if (!CAL.sabbaths[key]) { fetes += 1; assert.strictEqual(S.parashaOfShabbat(f, false), null, key); }
    }
    assert.ok(fetes > 30 && fetes < 90, 'Chabbatot de fête : ' + fetes);
});

test('des dates connues : Vayétsé le 21 novembre 2026, Béréchit le 17 octobre 2026, la paracha avant Roch Hachana, Devarim avant le 9 Av', () => {
    assert.strictEqual(name(S.parashaOfShabbat(fx(2026, 11, 21), false)), 'Vayétsé');
    assert.strictEqual(name(S.parashaOfShabbat(fx(2026, 10, 10), false)), 'Béréchit');
    assert.strictEqual(name(S.parashaOfShabbat(fx(2026, 9, 5), false)), 'Nitsavim – Vayélekh');                // le Chabbat avant Roch Hachana 5787 (samedi 12 septembre 2026)
    assert.strictEqual(name(S.parashaOfShabbat(fx(2026, 7, 18), false)), 'Devarim');                        // 9 Av 5786 = jeudi 23 juillet 2026 : Chabbat 'Hazon le 18
});

test('Israël et la diaspora : identiques la plupart des Chabbatot, décalées quand le dernier jour de Pessa\'h (ou le 2ᵉ de Chavouot) tombe un Chabbat : la diaspora lit la fête, Israël la paracha', () => {
    let same = 0, diff = 0, festivalInDiasporaOnly = 0;
    for (let f = fx(2025, 1, 4); f <= fx(2036, 12, 27); f += 7) {
        const d = S.parashaOfShabbat(f, false), i = S.parashaOfShabbat(f, true);
        if (JSON.stringify(d) === JSON.stringify(i)) same += 1; else diff += 1;
        if (d === null && i !== null) festivalInDiasporaOnly += 1;
    }
    assert.ok(diff > 0 && same > diff * 5, 'identiques ' + same + ', différents ' + diff);
    assert.ok(festivalInDiasporaOnly >= 3, 'fêtes seulement en diaspora : ' + festivalInDiasporaOnly);
});

test('toute la plage du calendrier (1583 à 2400, diaspora et Israël) : le cycle se tient — chaque année, les parachiot se suivent sans trou ni répétition de Béréchit à Ha\'azinou', () => {
    for (const israel of [false, true]) {
        for (let year = HC.HEBREW_MIN + 1; year <= HC.HEBREW_MAX - 1; year++) {
            const rh = CY.hebrewToFixed(year, 'Tishri', 1), next = CY.hebrewToFixed(year + 1, 'Tishri', 1);
            const first = rh + ((6 - HC.weekdayOf(rh) + 7) % 7);
            const read = [];
            for (let f = first; f < next; f += 7) { const p = S.parashaOfShabbat(f, israel); if (p) read.push(...p); }
            const i = read.indexOf(0);
            assert.ok(i >= 0, 'Béréchit manque en ' + year);
            const cycle = read.slice(i);                                                         // de Béréchit à la dernière lue avant Roch Hachana
            cycle.forEach((p, k) => { if (k) assert.strictEqual(p, cycle[k - 1] + 1, 'trou ou répétition en ' + year + ' (' + (israel ? 'Israël' : 'diaspora') + ') : ' + cycle.join(',')); });
            assert.ok(cycle[cycle.length - 1] === 50 || cycle[cycle.length - 1] === 51, 'dernière paracha en ' + year + ' : ' + cycle[cycle.length - 1]);   // Nitsavim (50) ou Vayélekh (51) avant Roch Hachana
        }
    }
});

test('toute la plage : Devarim est lue le Chabbat qui précède le 9 Av (Chabbat \'Hazon), diaspora et Israël', () => {
    for (let year = HC.HEBREW_MIN + 1; year <= HC.HEBREW_MAX - 1; year++) {
        const tishaBav = CY.hebrewToFixed(year, 'Av', 9);
        const wd = HC.weekdayOf(tishaBav);
        const shabbat = wd === 6 ? tishaBav : tishaBav - wd - 1;                               // le Chabbat qui précède le 9 Av, ou le 9 Av lui-même si c'est un Chabbat (le jeûne est reporté au dimanche)
        [false, true].forEach(israel => assert.ok(S.parashaOfShabbat(shabbat, israel).includes(43), 'Devarim (43) le Chabbat \'Hazon, année ' + year));
    }
});

test('hors du calendrier de l\'application, un jour qui n\'est pas un Chabbat : null', () => {
    assert.strictEqual(S.parashaOfShabbat(fx(2401, 6, 5), false), null);
    assert.strictEqual(S.parashaOfShabbat(fx(1582, 6, 5), false), null);
    assert.strictEqual(S.parashaOfShabbat(fx(2026, 11, 20), false), null);
    assert.strictEqual(S.isSupported(fx(1583, 1, 1)), true);
    assert.strictEqual(S.isSupported(fx(2400, 12, 31)), true);
    assert.strictEqual(S.isSupported(fx(2401, 1, 1)), false);
});

test('parashaOfDate : la paracha du Chabbat qui suit (ou du jour même) ; TorahCore.parashaForDate l\'utilise, avec ou sans l\'ancien calendrier', () => {
    assert.strictEqual(name(S.parashaOfDate({ year: 2026, month: 11, day: 17 }, false)), 'Vayétsé');         // un mardi
    assert.strictEqual(name(S.parashaOfDate({ year: 2026, month: 11, day: 21 }, false)), 'Vayétsé');         // le Chabbat lui-même
    assert.strictEqual(name(S.parashaOfDate({ year: 2026, month: 11, day: 22 }, false)), 'Vayichla\'h');     // le dimanche : la semaine suivante
    assert.deepStrictEqual(T.parashaForDate(CAL, new Date(2026, 10, 17)), [6]);
    assert.deepStrictEqual(T.parashaForDate(null, new Date(2026, 10, 17)), [6]);
    assert.deepStrictEqual(T.parashaForDate(null, new Date(1900, 0, 1)), S.parashaOfDate({ year: 1900, month: 1, day: 1 }, false));
    assert.strictEqual(T.parashaForDate(null, new Date(2401, 5, 1)), null);
});
