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

test('chaque horaire porte son jour civil, et chaque jour civil son étude', () => {
    const r = W.build({
        place: MARSEILLE, nowMs: Date.UTC(2026, 10, 19, 10, 0), parashot: parashot, days: 3,
        mishnaOf: () => ({ text: 'Michna', sub: 's' }), mitsvaOf: fixed => (fixed % 2 ? null : { text: 'Mitsva', sub: 's' })
    });
    assert.ok(r.zmanim.filter(z => z.day === '2026-11-19').length >= 9);
    assert.strictEqual(r.days.length, 3);
    const d = r.days[0];
    assert.strictEqual(d.day, '2026-11-19');
    assert.strictEqual(d.label, 'jeudi 19 novembre');
    assert.strictEqual(d.start, Z.localToUtc('Europe/Paris', 2026, 11, 19, 0));
    assert.strictEqual(d.end, r.days[1].start);
    assert.deepStrictEqual(d.study.daf, { text: 'Arakhin 2', he: 'ערכין ב׳', sub: 'Jours restants dans le traité : 32' });
    assert.deepStrictEqual(d.study.tehilim, { text: '49–54', sub: 'Jour 9 du mois hébraïque' });
    assert.deepStrictEqual(d.study.mishna, { text: 'Michna', sub: 's' });
    assert.ok(r.days.some(x => !x.study.mitsva) && r.days.some(x => x.study.mitsva));
});

test('Chabbat : de l\'allumage à la havdala, avec paracha et haftara', () => {
    const r = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 19, 10, 0), parashot: parashot, days: 10, haftaraOf: () => 'Osée 12:13' });
    const s = r.holy[0];
    assert.strictEqual(s.name, 'Chabbat Vayétsé');
    assert.strictEqual(s.kind, 'shabbat');
    assert.strictEqual(s.startDay, 'vendredi 20 novembre');
    assert.strictEqual(s.endDay, 'samedi 21 novembre');
    assert.ok(/^16:\d\d$/.test(s.startTime) && /^17:\d\d$/.test(s.endTime));
    assert.ok(s.start < s.end);
    assert.strictEqual(s.parasha, 'Vayétsé');
    assert.strictEqual(s.haftara, 'Osée 12:13');
    assert.strictEqual(r.holy.length, 2);
});

test('une fête qui touche Chabbat forme une seule période ; Kippour seul', () => {
    const r = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 8, 10, 10, 0), parashot: parashot, days: 12, text: { feast: id => id.toUpperCase() } });
    const rh = r.holy[0];
    assert.strictEqual(rh.name, 'ROSH · Chabbat');
    assert.strictEqual(rh.kind, 'both');
    assert.strictEqual(rh.startDay, 'vendredi 11 septembre');
    assert.strictEqual(rh.endDay, 'dimanche 13 septembre');
    const kip = r.holy.find(h => h.name === 'KIPPOUR');
    assert.strictEqual(kip.kind, 'yomtov');
    assert.strictEqual(kip.startDay, 'dimanche 20 septembre');
});

test('pendant Chabbat, la période en cours reste ; sans lieu, aucune', () => {
    const during = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 21, 10, 0), parashot: parashot, days: 3 });
    assert.strictEqual(during.holy[0].name, 'Chabbat Vayétsé');
    assert.ok(during.holy[0].start < Date.UTC(2026, 10, 21, 10, 0));
    assert.deepStrictEqual(W.build({ nowMs: Date.UTC(2026, 10, 19, 10, 0), days: 3 }).holy, []);
});

const HIL = require('../data/hilloulot/hilloulot.json').entries;

test('Omer : le jour du compte dans chaque période, et quand il commence', () => {
    const during = W.build({ place: MARSEILLE, nowMs: Date.UTC(2027, 3, 25, 10, 0), parashot: parashot, days: 2 });
    assert.strictEqual(during.periods[0].omer, 3);
    assert.strictEqual(during.periods[0].omerText, '3 jours du Omer');
    const before = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 20, 10, 0), parashot: parashot, days: 2 });
    assert.strictEqual(before.periods[0].omer, 0);
    assert.strictEqual(before.periods[0].omerText, null);
    assert.deepStrictEqual(before.omerStart, { day: '2027-04-22', label: 'jeudi 22 avril' });   // 15 Nissan 5787 au soir
});

test('À venir : fêtes et jeûnes, Birkat haLévana', () => {
    const r = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 20, 10, 0), parashot: parashot, days: 2, text: { feast: id => id } });
    assert.deepStrictEqual(r.feasts.slice(0, 2).map(f => [f.name, f.kind, f.day]), [['hanouka', 'minor', '2026-12-05'], ['tevet10', 'fast', '2026-12-20']]);
    assert.strictEqual(r.levana.firstDay, '2026-11-16');
    assert.strictEqual(r.levana.lastDay, '2026-11-23');
    assert.ok(r.levana.start < r.levana.end);
    assert.strictEqual(W.build({ nowMs: Date.UTC(2026, 10, 20, 10, 0), days: 2 }).levana, null);   // sans lieu
});

test('Hilloulot : celles du jour et les prochaines', () => {
    const r = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 20, 10, 0), parashot: parashot, days: 12, hilloulot: HIL });
    const p19 = r.periods.find(p => p.hebrewShort === '19 Kislev');
    assert.ok(p19.hilloulot.some(h => /Maguid/.test(h.fr)));
    assert.strictEqual(r.hilloulotNext[0].hebrew, '19 Kislev');
    assert.strictEqual(r.hilloulotNext[0].day, '2026-11-29');
    assert.strictEqual(W.build({ nowMs: 0, days: 1 }).hilloulotNext.length, 0);
});

test('Dates personnelles : les prochaines, avec leur date hébraïque', () => {
    const r = W.build({ place: MARSEILLE, nowMs: Date.UTC(2026, 10, 20, 10, 0), parashot: parashot, days: 2, rite: 'sefarade',
        dates: [{ id: 'a', name: 'Papa', type: 'hazkara', hebrew: { year: 5770, month: 'Tevet', day: 3 } }] });
    assert.deepStrictEqual(r.dates, [{ name: 'Papa', type: 'hazkara', kind: 'Hazkara', years: '17 ans depuis le décès', hebrew: '3 Tévet', day: '2026-12-13', label: 'dimanche 13 décembre' }]);
    assert.deepStrictEqual(W.build({ nowMs: Date.UTC(2026, 10, 20), days: 1 }).dates, []);
});
