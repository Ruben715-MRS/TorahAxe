// Les tombeaux des grands maîtres : js/kevarimCore.js et les données de data/kevarim/kevarim.json.
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../js/kevarimCore.js');
const T = require('../js/transmissionCore.js');
const L = require('../js/libraryCore.js');
const Z = require('../js/zmanimCore.js');
const HC = require('../js/hebrewCalendarCore.js');
const CY = require('../js/calendarYearCore.js');
const DATA = require('../data/kevarim/kevarim.json');
const HIL = require('../data/hilloulot/hilloulot.json').entries;
const E = DATA.entries;

test('le fichier : 199 maîtres, des identifiants uniques, aucun maître vivant', () => {
    assert.equal(E.length, 199);
    assert.equal(new Set(E.map(e => e.id)).size, E.length);
    assert.ok(!E.some(e => /baba baroukh|baba baruch/i.test(e.fr)), 'Baba Baroukh est vivant : exclu');
    E.forEach(e => {
        assert.ok(e.fr && e.he, 'nom français et hébreu : ' + e.id);
        assert.ok(K.statusOf(e.status), 'statut connu : ' + e.id);
        assert.ok(K.ERAS.some(x => x.id === e.era), 'époque connue : ' + e.id);
        assert.ok(e.rite === '' || K.RITES.some(x => x.id === e.rite), 'rite connu : ' + e.id);
    });
});

test('les points : coordonnées valides, précision connue, jamais pour une tombe « inconnue » sans lieu', () => {
    const placed = E.filter(e => e.place);
    assert.ok(placed.length > 120);
    placed.forEach(e => {
        const p = e.place;
        assert.ok(Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180, 'coordonnées : ' + e.id);
        assert.ok(K.PRECISIONS[p.precision], 'précision : ' + e.id);
    });
    // Moïse : sa tombe est inconnue (Deutéronome 34:6), aucun point.
    const moise = E.find(e => /Moché Rabbénou/.test(e.fr));
    assert.equal(moise.place, null);
    assert.equal(moise.status, 'inconnu');
    // Les trois lieux du tableur avec coordonnées sont repris tels quels.
    assert.deepEqual([E.find(e => /Rimon|Chimon bar Yo/.test(e.fr)).place.lat, E.find(e => /Chimon bar Yo/.test(e.fr)).place.lon], [32.9808, 35.4406]);
});

test('les six tombes de Hébron partagent un seul point', () => {
    const g = K.groups(E).find(x => x.key === 'hebron');
    assert.equal(g.entries.length, 6);
    assert.equal(g.status, 'tradition');
});

test('l’identifiant de la chaîne de transmission existe, et la bibliothèque s’y rattache', () => {
    const linked = E.filter(e => e.authorId);
    assert.ok(linked.length > 80);
    linked.forEach(e => assert.ok(T.byId(e.authorId), 'maître inconnu de la chaîne : ' + e.authorId + ' (' + e.id + ')'));
    assert.equal(new Set(linked.map(e => e.authorId)).size, linked.length, 'un maître de la chaîne par entrée');
    // Rachi, Rambam, Rema : leurs œuvres sont dans la bibliothèque et leur tombeau est sur la fiche.
    ['rachi', 'rambam', 'rema'].forEach(id => {
        assert.ok(L.worksOf(id).length > 0, id);
        assert.ok(K.forAuthor(E, id), id);
    });
    assert.equal(K.forAuthor(E, 'inexistant'), null);
    assert.equal(K.forAuthor(E, null), null);
});

test('les hilloulot : seules les lignes avec un jour et un mois précis en ont une', () => {
    const withHil = E.filter(e => e.hilloula);
    assert.ok(withHil.length >= 50);
    withHil.forEach(e => {
        assert.ok(K.MONTH_FR[e.hilloula.month], 'mois : ' + e.id);
        assert.ok(e.hilloula.day >= 1 && e.hilloula.day <= 30, 'jour : ' + e.id);
    });
    // Sans jour ni mois, pas de hilloula : le Rema vu du seul tableur, etc. (Ibn Ezra a un jour confirmé : 1 Adar.)
    assert.equal(E.find(e => /Ibn Ezra/.test(e.fr)).hilloula.day, 1);
    assert.equal(E.find(e => /Rav Papa/.test(e.fr)).hilloula, null);
    assert.notEqual(K.hilloulaLabel(E.find(e => /Ibn Ezra/.test(e.fr))), '');
    assert.equal(K.hilloulaLabel(E.find(e => /Rambam/.test(e.fr))), '20 Tévet');
});

test('les dates de data/hilloulot/hilloulot.json priment, et aucune n’est reprise deux fois', () => {
    const byHil = {};
    E.filter(e => e.hilId).forEach(e => {
        const h = HIL.find(x => x.id === e.hilId);
        assert.ok(h, 'hilId inconnu : ' + e.hilId);
        assert.ok(e.hilloula, 'une personne de hilloulot.json a une hilloula : ' + e.id);
        assert.equal(e.hilloula.month, h.month, e.id);
        assert.equal(e.hilloula.day, h.day, e.id);
        assert.ok(!byHil[e.hilId], 'doublon : ' + e.hilId);
        byHil[e.hilId] = true;
    });
    const extra = K.hilloulot(E);
    assert.ok(extra.length >= 15);
    assert.ok(!extra.some(x => E.find(e => 'kev-' + e.id === x.id).hilId), 'une personne de hilloulot.json n’est pas redoublée');
    // Même forme que hilloulot.json : ZmanimCore.hilloulotFor les trouve le bon jour (Noam Elimelekh : 21 Adar).
    const all = HIL.concat(extra);
    const day = HC.hebrewFromFixed(CY.hebrewToFixed(5788, 'Adar', 21));   // 5788 : année ordinaire
    assert.ok(Z.hilloulotFor(all, day).some(e => /Elimelekh/.test(e.fr)));
});

test('le tableur : la date de hilloula d’un jour « Lag BaOmer » est celle du 18 Iyar', () => {
    const rachbi = E.find(e => /Chimon bar Yo/.test(e.fr));
    assert.deepEqual([rachbi.hilloula.month, rachbi.hilloula.day], ['Iyar', 18]);
});

test('les filtres et la recherche', () => {
    assert.equal(K.filter(E, {}).length, E.length);
    assert.ok(K.filter(E, { status: 'documente' }).every(e => e.status === 'documente'));
    assert.ok(K.filter(E, { era: 'gueonim' }).length === 7);
    assert.ok(K.filter(E, { rite: 'hassidout' }).every(e => e.rite === 'hassidout'));
    assert.ok(K.filter(E, { mappedOnly: true }).every(e => e.place));
    const total = K.STATUSES.reduce((n, s) => n + K.filter(E, { status: s.id }).length, 0);
    assert.equal(total, E.length, 'chaque entrée a un statut');
    // Sans accent, sans apostrophe ni casse ; en hébreu, sans nikkud.
    assert.ok(K.filter(E, { query: 'maimonide' }).some(e => /Rambam/.test(e.fr)));
    assert.ok(K.filter(E, { query: 'HAIM' }).length > 3);
    assert.ok(K.filter(E, { query: 'רש"י' }).length >= 0);
    assert.equal(K.filter(E, { query: 'zzzz introuvable' }).length, 0);
    assert.equal(K.normalize('רָחֵל אִמֵּנוּ'), K.normalize('רחל אמנו'));
    assert.deepEqual(Object.keys(K.count(E, 'status')).sort(), ['conteste', 'documente', 'inconnu', 'tradition']);
});

test('le GeoJSON : un point par lieu, la couleur du statut le plus sûr', () => {
    const geo = K.geojson(E);
    assert.equal(geo.features.length, K.groups(E).length);
    geo.features.forEach(f => {
        assert.ok(/^#[0-9a-f]{6}$/.test(f.properties.color));
        assert.ok(f.properties.n >= 1);
        assert.equal(f.geometry.coordinates.length, 2);
    });
    assert.equal(K.geojson([]).features.length, 0);
});

test('le fond de carte mondial : des terres, sans frontières', () => {
    const land = require('../data/world-land.json');
    assert.equal(land.type, 'FeatureCollection');
    assert.ok(land.features.length >= 1);
    assert.ok(land.features.every(f => /Polygon/.test(f.geometry.type)));
    // Aucune arête ne fait le tour du monde (un polygone qui traverse l'antiméridien mal découpé trace des traits horizontaux sur la carte).
    const polys = land.features.flatMap(f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates));
    polys.forEach(poly => poly.forEach(ring => ring.forEach((pt, i) => { if (i) assert.ok(Math.abs(pt[0] - ring[i - 1][0]) <= 180, 'arête trop longue'); })));
});

test('Hillel et Chammaï reposent à Méron (tradition), avec le Rachbi', () => {
    ['Hillel HaZaken', 'Chammaï HaZaken'].forEach(n => {
        const e = E.find(x => x.fr.indexOf(n) === 0);
        assert.equal(e.place.key, 'meron', n);
        assert.equal(e.status, 'tradition', n);
    });
    assert.equal(K.groups(E).find(g => g.key === 'meron').entries.length, 3);
});

test('les frontières actuelles : des lignes seules, aucune arête qui fait le tour du monde', () => {
    ['../data/world-borders.json', '../data/levant-borders.json'].forEach(f => {
        const g = require(f);
        const lines = g.features.flatMap(x => (x.geometry.type === 'LineString' ? [x.geometry.coordinates] : x.geometry.coordinates));
        assert.ok(lines.length >= 5, f);
        lines.forEach(l => l.forEach((pt, i) => { assert.ok(Math.abs(pt[0]) <= 180 && Math.abs(pt[1]) <= 90, f); if (i) assert.ok(Math.abs(pt[0] - l[i - 1][0]) <= 180, f + ' : arête trop longue'); }));
    });
});

test('le tri alphabétique suit l\'alphabet hébreu (lettres finales ramenées à leur forme de base)', () => {
    const sorted = K.sortBy(DATA.entries, 'alpha');
    assert.equal(sorted.length, DATA.entries.length);
    for (let i = 1; i < sorted.length; i++) {
        const a = K.hebKey(sorted[i - 1].he), b = K.hebKey(sorted[i].he);
        assert.ok(a <= b, sorted[i - 1].fr + ' avant ' + sorted[i].fr);
    }
    assert.equal(K.hebKey('מלך'), K.hebKey('מלכ'), 'finale ם/ך ramenée à מ/כ');
    assert.ok(K.hebKey('א') < K.hebKey('ב') && K.hebKey('ת') > K.hebKey('ש'));
});

test('le tri annuel part de Tichri : Tichri en premier, Elloul en dernier, sans date à la fin', () => {
    const dated = K.sortBy(DATA.entries, 'annual').filter(e => e.hilloula);
    assert.equal(dated[0].hilloula.month, 'Tishri');
    assert.equal(dated[dated.length - 1].hilloula.month, 'Elul');
    const order = ['Tishri', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'AdarII', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul'];
    for (let i = 1; i < dated.length; i++) {
        const a = dated[i - 1].hilloula, b = dated[i].hilloula;
        assert.ok(order.indexOf(a.month) < order.indexOf(b.month) || (a.month === b.month && a.day <= b.day), dated[i - 1].fr + ' avant ' + dated[i].fr);
    }
    const all = K.sortBy(DATA.entries, 'annual');
    const firstUndated = all.findIndex(e => !e.hilloula);
    assert.ok(all.slice(firstUndated).every(e => !e.hilloula), 'les sans date sont à la fin');
});

test('le tri chronologique : année du décès croissante, sans année à la fin', () => {
    const sorted = K.sortBy(DATA.entries, 'chrono');
    let last = -Infinity, seenNull = false;
    sorted.forEach(e => {
        const y = K.deathYear(e);
        if (y == null) { seenNull = true; return; }
        assert.ok(!seenNull, e.fr + ' daté après une entrée sans année');
        assert.ok(y >= last, e.fr);
        last = y;
    });
});

test('l\'année du décès se lit dans les formes du tableur', () => {
    const y = t => K.deathYear({ dateText: t });
    assert.equal(y('1 Tevet (tradition) / ~1638 av. J.-C.'), -1638);
    assert.equal(y('~10 ap. J.-C. (tradition)'), 10);
    assert.equal(y('10 Tichri ~135'), 135);
    assert.equal(y('IIe s.'), 150);
    assert.equal(y('Début IIe s.'), 110);
    assert.equal(y('Fin XIIe s.'), 1190);
    assert.equal(y('1164/1167'), 1167);
    assert.equal(y('1174 approx.'), 1174);
    assert.equal(y('15 Nissan (tradition)'), null, 'un jour et un mois ne sont pas une année');
    assert.equal(y('Tradition'), null);
    assert.equal(K.deathYear({ dateText: 'x', hilloula: { gregYear: 1204 } }), 1204, 'l\'année de la hilloula prime');
});

test('le décès : date civile suivie de l\'année juive ; julienne avant 1582 ; sans calcul, la date du tableur', () => {
    const find = re => E.find(e => re.test(e.fr));
    assert.equal(K.deathLabel(find(/Hazon Ish/)), '24 octobre 1953 (5714)');
    assert.equal(K.deathLabel(find(/Rambam/)), '13 décembre 1204 julien (4965)');
    assert.equal(K.deathLabel(find(/Yehochoua/)), '26 Nissan (tradition)', 'pas de date civile sans année');
    assert.equal(K.deathLabel(find(/Ketav Sofer/)), '31 décembre 1871 (5632)');
});
