const test = require('node:test');
const assert = require('node:assert');
const W = require('../js/widgetDataCore.js');
const Z = require('../js/zmanimCore.js');
const parashot = require('../data/torah/parashot.json').parashot;

const MARSEILLE = { name: 'Marseille', lat: 43.2965, lon: 5.3698, elevation: 0, tz: 'Europe/Paris' };
const JERUSALEM = { name: 'Jérusalem', lat: 31.7683, lon: 35.2137, elevation: 754, tz: 'Asia/Jerusalem' };

test('les horaires de Marseille, le 19 novembre 2026, arrondis comme dans l\'app', () => {
    const r = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 19, 4, 0), parashot: parashot, days: 2 });
    const times = r.zmanim.filter(z => Z.civilDateOf('Europe/Paris', z.at).day === 19).map(z => z.key + ' ' + z.time);
    assert.ok(times.includes('alot 06:08'));
    assert.ok(times.includes('netz 07:37'));
    assert.ok(times.includes('tzeit 17:49'));
    // le minuit halakhique tombe après minuit civil : il appartient à la liste, trié à sa place
    assert.ok(r.zmanim.some(z => z.key === 'chatzotLayla' && z.time === '00:24'));
    for (let i = 1; i < r.zmanim.length; i++) assert.ok(r.zmanim[i - 1].at <= r.zmanim[i].at);
});

test('le jour hébraïque change à la sortie des étoiles', () => {
    const before = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 19, 16, 0), parashot: parashot, days: 2 });
    assert.strictEqual(before.periods[0].hebrew, '9 Kislev 5787');
    const after = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 19, 20, 0), parashot: parashot, days: 2 });
    assert.strictEqual(after.periods[0].hebrew, '10 Kislev 5787');
    assert.strictEqual(after.periods[0].hebrewLetters, 'י׳ כסלו');
    // les périodes se suivent sans trou
    const p = before.periods;
    assert.strictEqual(p[0].end, p[1].start);
    assert.ok(p[0].start <= Date.UTC(2026, 10, 19, 16, 0) && p[0].end > Date.UTC(2026, 10, 19, 16, 0));
    assert.strictEqual(p[0].end, before.zmanim.find(z => z.key === 'tzeit').at);
});

test('paracha, Tahanoun et prochaine fête', () => {
    const r = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 19, 20, 0), parashot: parashot, days: 3 });
    const [fri, sat, sun] = r.periods;
    assert.strictEqual(fri.weekday, 5);
    assert.strictEqual(fri.parasha, 'Vayétsé');
    assert.strictEqual(fri.parashaHe, 'ויצא');
    assert.strictEqual(fri.tachanun, 'morning');           // veille de Chabbat : pas à Minha
    assert.strictEqual(sat.tachanun, 'no');
    assert.strictEqual(sun.tachanun, 'yes');
    assert.strictEqual(sun.parasha, 'Vayichla\'h');        // la semaine suivante commence après Chabbat
    assert.deepStrictEqual(fri.feast, { name: 'hanouka', when: 'Dans 15 jours', ongoing: false, days: 15 });
});

test('les textes de l\'appelant remplacent les libellés par défaut', () => {
    const r = W.build({
        place: MARSEILLE, nowMs: Date.UTC(2026, 11, 5, 12, 0), parashot: parashot, days: 1,
        text: { feast: id => 'F:' + id, today: 'Ce jour' },
        zmanimLabels: { netz: 'Netz ha\'Hama' }
    });
    assert.strictEqual(r.periods[0].feast.name, 'F:hanouka');
    assert.strictEqual(r.periods[0].feast.when, 'Ce jour');
    assert.ok(r.zmanim.some(z => z.key === 'netz' && z.label === 'Netz ha\'Hama'));
});

test('en Israël, la paracha et les fêtes d\'Israël', () => {
    const r = W.build({ place: JERUSALEM, nowMs: Date.UTC(2026, 10, 19, 8, 0), parashot: parashot, days: 1 });
    assert.strictEqual(r.place.israel, true);
    assert.strictEqual(r.periods[0].parasha, 'Vayétsé');
});

test('sans lieu : le jour civil de l\'appareil, sans horaires', () => {
    const r = W.build({ nowMs: Date.UTC(2026, 10, 19, 20, 0), parashot: parashot, days: 2, deviceTz: 'America/New_York' });
    assert.strictEqual(r.place, null);
    assert.strictEqual(r.zmanim.length, 0);
    assert.strictEqual(r.periods[0].hebrew, '9 Kislev 5787');
    assert.strictEqual(r.periods[0].start, Z.localToUtc('America/New_York', 2026, 11, 19, 0));
});

test('trente jours par défaut, et des données de taille raisonnable', () => {
    const r = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 19, 12, 0), parashot: parashot });
    assert.strictEqual(r.periods.length, 30);
    assert.strictEqual(r.v, W.VERSION);
    assert.ok(JSON.stringify(r).length < 100000);
});

test('sans les noms des parachiot : pas de paracha, le reste fonctionne', () => {
    const r = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 19, 12, 0), days: 1 });
    assert.strictEqual(r.periods[0].parasha, null);
    assert.ok(r.periods[0].hebrew);
});
