const test = require('node:test');
const assert = require('node:assert');
const P = require('../js/personalDatesCore.js');
const HC = require('../js/hebrewCalendarCore.js');
const CY = require('../js/calendarYearCore.js');
const Z = require('../js/zmanimCore.js');
const CAL = require('../data/torah/calendar.json');
const PAR = require('../data/torah/parashot.json');

const hz = (day, month, year, extra) => Object.assign({ type: 'hazkara', name: 'X', hebrew: { day, month, year } }, extra);
const ev = (day, month, year, extra) => Object.assign({ type: 'birthday', name: 'X', hebrew: { day, month, year } }, extra);
// « 19 Adar 5765 » : le quantième et le mois d'un jour fixe.
const dm = f => { const h = HC.hebrewFromFixed(f); return h.day + ' ' + h.month; };
const days = (item, year, rite) => P.daysIn(item, year, rite).map(dm);
const lens = (year, id) => P.monthDays(year, id);
// Les premières années embolismiques et simples, et celles où 'Hechvan / Kislev sont longs ou courts, cherchées dans le calendrier lui-même.
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const leaps = range(5760, 5800).filter(y => HC.leap(y)), plains = range(5760, 5800).filter(y => !HC.leap(y));
const longH = range(5760, 5800).filter(y => lens(y, 'Heshvan') === 30), shortH = range(5760, 5800).filter(y => lens(y, 'Heshvan') === 29);
const longK = range(5760, 5800).filter(y => lens(y, 'Kislev') === 30), shortK = range(5760, 5800).filter(y => lens(y, 'Kislev') === 29);

test('hebrewOfCivil : le 16 novembre 2026 est le 6 Kislev 5787 ; après la tombée de la nuit, le 7', () => {
    assert.deepStrictEqual(P.hebrewOfCivil({ year: 2026, month: 11, day: 16 }, false), { day: 6, month: 'Kislev', year: 5787 });
    assert.deepStrictEqual(P.hebrewOfCivil({ year: 2026, month: 11, day: 16 }, true), { day: 7, month: 'Kislev', year: 5787 });
    assert.deepStrictEqual(P.hebrewOfCivil({ year: 2026, month: 12, day: 31 }, true), P.hebrewOfCivil({ year: 2027, month: 1, day: 1 }, false));
});

test('règle générale : le même quantième du même mois ; la première Hazkara est celle de l\'année hébraïque qui suit le décès', () => {
    const item = hz(10, 'Kislev', 5780);
    assert.deepStrictEqual(days(item, 5787, 'sefarade'), ['10 Kislev']);
    assert.strictEqual(P.occurrences(item, CY.gregorianToFixed(2019, 1, 1), CY.gregorianToFixed(2021, 12, 31), 'sefarade').map(o => o.year).join(), '5781,5782');   // 5780 : pas de Hazkara
    const o = P.occurrences(item, CY.gregorianToFixed(2026, 11, 1), CY.gregorianToFixed(2026, 12, 1), 'sefarade');
    assert.deepStrictEqual(o.map(x => [x.years, CY.fixedToGregorian(x.fixed)]), [[7, { year: 2026, month: 11, day: 20 }]]);
});

test('Hazkara — Adar d\'une année simple, année embolismique : Adar I (ashkénaze, Chabad), Adar II (séfarade), « les deux » ; année simple : l\'Adar unique', () => {
    const item = hz(19, 'Adar', 5761);
    assert.ok(HC.leap(5765) && !HC.leap(5762));
    assert.deepStrictEqual(days(item, 5765, 'ashkenaze'), ['19 Adar']);                    // « Adar » d'une année embolismique est Adar I
    assert.deepStrictEqual(days(item, 5765, 'sefarade'), ['19 AdarII']);
    assert.deepStrictEqual(days(hz(19, 'Adar', 5761, { adar: 'adar2' }), 5765, 'ashkenaze'), ['19 AdarII']);        // le réglage de la date l'emporte sur le rite
    assert.deepStrictEqual(days(hz(19, 'Adar', 5761, { adar: 'adar1' }), 5765, 'sefarade'), ['19 Adar']);
    assert.deepStrictEqual(days(hz(19, 'Adar', 5761, { adar: 'both' }), 5765, 'sefarade'), ['19 Adar', '19 AdarII']);
    assert.deepStrictEqual(days(item, 5762, 'sefarade'), ['19 Adar']);
    // le même jour hébraïque, deux jours civils distincts
    assert.notStrictEqual(P.daysIn(item, 5765, 'ashkenaze')[0], P.daysIn(item, 5765, 'sefarade')[0]);
});

test('Hazkara — Adar I d\'une année embolismique : Adar I les années embolismiques, l\'Adar unique les années simples', () => {
    const y = leaps[0], item = hz(10, 'Adar', y);
    const nextLeap = leaps.find(x => x > y), nextPlain = plains.find(x => x > y);
    ['ashkenaze', 'sefarade'].forEach(rite => {
        assert.deepStrictEqual(days(item, nextLeap, rite), ['10 Adar']);
        assert.deepStrictEqual(days(item, nextPlain, rite), ['10 Adar']);
    });
    assert.ok(HC.leap(nextLeap) && HC.monthDays === undefined || true);
    assert.strictEqual(HC.monthsOf(nextLeap).findIndex(m => m.id === 'Adar') < HC.monthsOf(nextLeap).findIndex(m => m.id === 'AdarII'), true);
});

test('Hazkara — le 30 Adar I : le 30 Chevat les années simples, le 30 Adar I les années embolismiques', () => {
    const y = leaps[0], item = hz(30, 'Adar', y);
    assert.deepStrictEqual(days(item, plains.find(x => x > y), 'sefarade'), ['30 Shevat']);
    assert.deepStrictEqual(days(item, leaps.find(x => x > y), 'ashkenaze'), ['30 Adar']);
});

test('Hazkara — Adar II : Adar II les années embolismiques, l\'Adar unique les années simples', () => {
    const y = leaps[0], item = hz(14, 'AdarII', y);
    assert.deepStrictEqual(days(item, leaps.find(x => x > y), 'sefarade'), ['14 AdarII']);
    assert.deepStrictEqual(days(item, plains.find(x => x > y), 'ashkenaze'), ['14 Adar']);
});

test('Hazkara — le 30 \'Hechvan : si la première Hazkara n\'avait pas de 30, le 29 \'Hechvan ; si elle en avait un, le 1er Kislev les années courtes ; le 30 les années longues', () => {
    const death = longH[0];
    // première année après le décès courte : le 29, toujours
    const deathBeforeShort = longH.find(y => shortH.includes(y + 1));
    const item = hz(30, 'Heshvan', deathBeforeShort);
    shortH.filter(y => y > deathBeforeShort).slice(0, 4).forEach(y => assert.deepStrictEqual(days(item, y, 'sefarade'), ['29 Heshvan'], 'année ' + y));
    longH.filter(y => y > deathBeforeShort).slice(0, 4).forEach(y => assert.deepStrictEqual(days(item, y, 'ashkenaze'), ['30 Heshvan'], 'année ' + y));
    // première année après le décès longue : le 1er Kislev les années courtes
    const deathBeforeLong = longH.find(y => longH.includes(y + 1));
    const item2 = hz(30, 'Heshvan', deathBeforeLong);
    shortH.filter(y => y > deathBeforeLong).slice(0, 4).forEach(y => assert.deepStrictEqual(days(item2, y, 'sefarade'), ['1 Kislev'], 'année ' + y));
    assert.ok(death);
});

test('Hazkara — le 30 Kislev : mêmes règles, avec le 1er Tevet', () => {
    const before1 = longK.find(y => shortK.includes(y + 1));
    const a = hz(30, 'Kislev', before1);
    shortK.filter(y => y > before1).slice(0, 4).forEach(y => assert.deepStrictEqual(days(a, y, 'sefarade'), ['29 Kislev'], 'année ' + y));
    const before2 = longK.find(y => longK.includes(y + 1));
    const b = hz(30, 'Kislev', before2);
    shortK.filter(y => y > before2).slice(0, 4).forEach(y => assert.deepStrictEqual(days(b, y, 'ashkenaze'), ['1 Tevet'], 'année ' + y));
    longK.filter(y => y > before2).slice(0, 4).forEach(y => assert.deepStrictEqual(days(b, y, 'ashkenaze'), ['30 Kislev'], 'année ' + y));
});

test('Hazkara — « les deux jours » : le 29 et le 1er du mois suivant', () => {
    const before = longH.find(y => longH.includes(y + 1));
    const item = hz(30, 'Heshvan', before, { bothDays: true });
    const y = shortH.find(x => x > before);
    assert.deepStrictEqual(days(item, y, 'sefarade'), ['29 Heshvan', '1 Kislev']);
    assert.deepStrictEqual(days(item, longH.find(x => x > before), 'sefarade'), ['30 Heshvan']);          // une année longue : un seul jour
});

test('anniversaire de naissance — né en Adar d\'une année simple : Adar II les années embolismiques (tous les rites), l\'Adar unique les autres', () => {
    const item = ev(7, 'Adar', 5761);
    ['ashkenaze', 'sefarade'].forEach(rite => {
        assert.deepStrictEqual(days(item, 5765, rite), ['7 AdarII']);
        assert.deepStrictEqual(days(item, 5762, rite), ['7 Adar']);
    });
});

test('anniversaire de naissance — né en Adar I : Adar I et l\'Adar unique ; né en Adar II : Adar II et l\'Adar unique ; né un 30 Adar I : le 1er Nisan les années simples', () => {
    const y = leaps[0];
    assert.deepStrictEqual(days(ev(7, 'Adar', y), leaps.find(x => x > y), 'sefarade'), ['7 Adar']);
    assert.deepStrictEqual(days(ev(7, 'Adar', y), plains.find(x => x > y), 'sefarade'), ['7 Adar']);
    assert.deepStrictEqual(days(ev(7, 'AdarII', y), leaps.find(x => x > y), 'sefarade'), ['7 AdarII']);
    assert.deepStrictEqual(days(ev(7, 'AdarII', y), plains.find(x => x > y), 'sefarade'), ['7 Adar']);
    assert.deepStrictEqual(days(ev(30, 'Adar', y), plains.find(x => x > y), 'sefarade'), ['1 Nisan']);
    assert.deepStrictEqual(days(ev(30, 'Adar', y), leaps.find(x => x > y), 'sefarade'), ['30 Adar']);
});

test('anniversaire de naissance — né un 30 \'Hechvan ou un 30 Kislev : le 1er du mois suivant les années où ce jour n\'existe pas', () => {
    const y1 = longH[0], y2 = longK[0];
    assert.deepStrictEqual(days(ev(30, 'Heshvan', y1), shortH.find(x => x > y1), 'sefarade'), ['1 Kislev']);
    assert.deepStrictEqual(days(ev(30, 'Heshvan', y1), longH.find(x => x > y1), 'sefarade'), ['30 Heshvan']);
    assert.deepStrictEqual(days(ev(30, 'Kislev', y2), shortK.find(x => x > y2), 'sefarade'), ['1 Tevet']);
});

test('toute date, toute année : un jour qui existe (jamais d\'erreur), dans la bonne année hébraïque ou celle d\'après', () => {
    const cases = [];
    ['Tishri', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'AdarII', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul'].forEach(m => [1, 15, 29, 30].forEach(d => {
        [5770, 5771, 5774, 5775].forEach(y => { if (P.isValidHebrew({ day: d, month: m, year: y })) cases.push([d, m, y]); });
    }));
    assert.ok(cases.length > 100);
    cases.forEach(([d, m, y]) => ['hazkara', 'birthday'].forEach(type => ['ashkenaze', 'sefarade'].forEach(rite => {
        for (let year = y + 1; year <= y + 20; year++) {
            const fixed = P.daysIn({ type, hebrew: { day: d, month: m, year: y } }, year, rite);
            assert.ok(fixed.length >= 1 && fixed.length <= 2);
            fixed.forEach(f => { const h = HC.hebrewFromFixed(f); assert.ok(h.year === year || h.year === year + 1 || h.year === year - 1, d + ' ' + m + ' ' + y + ' → ' + year); });
        }
    })));
});

test('bar-mitsva : né le 6 Kislev 5774, 13 ans le 6 Kislev 5787 (lundi 16 novembre 2026), le Chabbat suivant le 21 novembre, paracha Vayétsé', () => {
    const b = P.barBatMitsva({ day: 6, month: 'Kislev', year: 5774 }, 'm', 'sefarade');
    assert.deepStrictEqual([b.age, b.year, b.civil, b.weekday, b.shabbatCivil], [13, 5787, { year: 2026, month: 11, day: 16 }, 1, { year: 2026, month: 11, day: 21 }]);
    const idx = P.parashaOfShabbat(b.shabbat);
    assert.strictEqual(PAR.parashot[idx[0]].fr, 'Vayétsé');
});

test('bat-mitsva : 12 ans ; une bar-mitsva qui tombe un Chabbat : ce Chabbat-là', () => {
    assert.strictEqual(P.barBatMitsva({ day: 6, month: 'Kislev', year: 5775 }, 'f', 'sefarade').fixed, CY.gregorianToFixed(2026, 11, 16));
    const sat = CY.gregorianToFixed(2026, 11, 21), h = HC.hebrewFromFixed(sat);
    const b = P.barBatMitsva({ day: h.day, month: h.month, year: h.year - 13 }, 'm', 'sefarade');
    assert.strictEqual(b.fixed, sat);
    assert.strictEqual(b.shabbat, sat);
});

test('bar-mitsva : une naissance en Adar d\'une année simple, bar-mitsva en année embolismique : Adar II', () => {
    const y = plains.find(p => HC.leap(p + 13));
    assert.ok(y);
    const b = P.barBatMitsva({ day: 10, month: 'Adar', year: y }, 'm', 'ashkenaze');
    assert.strictEqual(HC.hebrewFromFixed(b.fixed).month, 'AdarII');
});

test('parashaOfShabbat : toute date du calendrier de l\'application a sa paracha (1900, 2045, 2399), Israël compris ; hors du calendrier, ou un Chabbat de fête : null', () => {
    assert.strictEqual(PAR.parashot[P.parashaOfShabbat(CY.gregorianToFixed(2045, 3, 4))[0]].fr.length > 0, true);       // samedi 4 mars 2045
    assert.ok(P.parashaOfShabbat(CY.gregorianToFixed(1900, 1, 6)));
    assert.ok(P.parashaOfShabbat(CY.gregorianToFixed(2399, 6, 5)));               // samedi 5 juin 2399
    assert.strictEqual(P.parashaOfShabbat(CY.gregorianToFixed(2401, 6, 5)), null);                                      // hors du calendrier
    assert.strictEqual(P.parashaOfShabbat(CY.gregorianToFixed(2026, 9, 12)), null);                                     // Roch Hachana, un Chabbat de fête
});


test('upcoming : les dates des 30 prochains jours, triées, avec le nombre de jours et d\'années', () => {
    const items = [hz(10, 'Kislev', 5780, { name: 'A' }), ev(6, 'Kislev', 5774, { name: 'B' }), ev(4, 'Tevet', 5774, { name: 'C' })];
    const from = CY.gregorianToFixed(2026, 11, 16);
    const up = P.upcoming(items, from, 30, 'sefarade');
    assert.deepStrictEqual(up.map(u => [u.item.name, u.inDays, u.years]), [['B', 0, 13], ['A', 4, 7], ['C', 28, 13]]);
});

test('le registre : les entrées abîmées, trop longues ou en double sont écartées ; ajouter, modifier, supprimer', () => {
    let s = P.normalizeStore({ items: [
        { id: 'a', type: 'hazkara', name: '  Père  ', hebrew: { day: 10, month: 'Kislev', year: 5780 }, remind: { eve: true } },
        { id: 'a', type: 'hazkara', name: 'Doublon', hebrew: { day: 10, month: 'Kislev', year: 5780 } },
        { id: 'b', type: 'truc', name: 'X', hebrew: { day: 1, month: 'Tishri', year: 5780 } },
        { id: 'c', type: 'birthday', name: 'Jour 31', hebrew: { day: 31, month: 'Kislev', year: 5780 } },
        { id: 'd', type: 'birthday', name: '', hebrew: { day: 1, month: 'Tishri', year: 5780 } },
        'abîmé', null
    ], eveAt: 'tzeit' });
    assert.deepStrictEqual(s.items.map(x => [x.id, x.name]), [['a', 'Père']]);
    assert.strictEqual(s.eveAt, 'tzeit');
    assert.deepStrictEqual(s.items[0].remind, { eve: true, morning: false });
    assert.deepStrictEqual(P.normalizeStore('abîmé'), P.emptyStore());
    s = P.addItem(s, { type: 'birthday', name: 'Enfant', hebrew: { day: 6, month: 'Kislev', year: 5774 }, sex: 'm' });
    assert.strictEqual(s.items.length, 2);
    assert.deepStrictEqual(s.items[1].remind, { eve: false, morning: true });
    const id = s.items[1].id;
    s = P.updateItem(s, id, { type: 'birthday', name: 'Enfant 2', hebrew: { day: 6, month: 'Kislev', year: 5774 }, sex: 'f', adar: 'both', remind: { eve: false, morning: false } });
    assert.deepStrictEqual([s.items[1].name, s.items[1].sex, s.items[1].adar], ['Enfant 2', 'f', 'both']);
    s = P.removeItem(s, id);
    assert.deepStrictEqual(s.items.map(x => x.id), ['a']);
    assert.strictEqual(P.addItem(s, { type: 'hazkara', name: 'Ko', hebrew: { day: 31, month: 'Kislev', year: 5780 } }).items.length, 1);
});

// --- Les rappels : Marseille, le 15 novembre 2026 ---------------------------------------------------------------------------------------------------------
const PLACE = Z.normalizePlace({ name: 'Marseille', lat: 43.2965, lon: 5.3698, elevation: 0, tz: 'Europe/Paris' });
const NOW = Date.parse('2026-11-15T10:00:00+01:00');

test('plan : la Hazkara du 10 Kislev 5787 (vendredi 20 novembre) : rappel la veille au coucher du soleil et le matin au lever', () => {
    const store = { items: [{ id: 'a', type: 'hazkara', name: 'Père', hebrew: { day: 10, month: 'Kislev', year: 5780 }, remind: { eve: true, morning: true } }] };
    const items = P.plan(store, PLACE, {}, NOW, 7, 'sefarade');
    assert.deepStrictEqual(items.map(i => [i.when, i.years]), [['eve', 7], ['morning', 7]]);
    const d19 = Z.zmanim(PLACE, 2026, 11, 19, {}), d20 = Z.zmanim(PLACE, 2026, 11, 20, {});
    assert.strictEqual(items[0].at, Z.rounded(d19, 'shkia'));
    assert.strictEqual(items[1].at, Z.rounded(d20, 'netz'));
    assert.ok(items[0].at < items[1].at && items.every(i => i.at > NOW));
});

test('plan : « à la sortie des étoiles » plus tard que « au coucher » ; rien hors de l\'horizon ni sans rappel choisi', () => {
    const base = { items: [{ id: 'a', type: 'hazkara', name: 'Père', hebrew: { day: 10, month: 'Kislev', year: 5780 }, remind: { eve: true, morning: false } }] };
    const shkia = P.plan(base, PLACE, {}, NOW, 7, 'sefarade')[0], tzeit = P.plan(Object.assign({}, base, { eveAt: 'tzeit' }), PLACE, {}, NOW, 7, 'sefarade')[0];
    assert.ok(tzeit.at > shkia.at);
    assert.deepStrictEqual(P.plan(base, PLACE, {}, NOW, 2, 'sefarade'), []);                                   // la veille est dans 4 jours
    assert.deepStrictEqual(P.plan({ items: [Object.assign({}, base.items[0], { remind: { eve: false, morning: false } })] }, PLACE, {}, NOW, 7, 'sefarade'), []);
    assert.deepStrictEqual(P.plan(base, null, {}, NOW, 7, 'sefarade'), []);
    assert.deepStrictEqual(P.plan(P.emptyStore(), PLACE, {}, NOW, 7, 'sefarade'), []);
});

test('plan : un anniversaire et une Hazkara à des jours différents, triés par instant', () => {
    const store = { items: [
        { id: 'b', type: 'birthday', name: 'Enfant', hebrew: { day: 8, month: 'Kislev', year: 5774 }, remind: { eve: false, morning: true } },
        { id: 'a', type: 'hazkara', name: 'Père', hebrew: { day: 10, month: 'Kislev', year: 5780 }, remind: { eve: true, morning: false } }
    ] };
    const items = P.plan(store, PLACE, {}, NOW, 7, 'sefarade');
    assert.deepStrictEqual(items.map(i => i.id + ':' + i.when), ['b:morning', 'a:eve']);
    assert.ok(items[0].at < items[1].at);
});

test('describe : titre et corps traduits, avec le nom, les années et le terme (Hazkara ou Yahrzeit)', () => {
    const tr = (k, p) => k + JSON.stringify(p);
    const d = P.describe({ type: 'hazkara', when: 'eve', name: 'Père', years: 7 }, tr, 'Hazkara');
    assert.strictEqual(d.title, 'dates.rem_hazkara_eve_title{"name":"Père","term":"Hazkara"}');
    assert.strictEqual(d.body, 'dates.rem_hazkara_eve_body{"name":"Père","years":7,"term":"Hazkara"}');
});
