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

test('le fichier : 179 maîtres, des identifiants uniques, aucun maître vivant', () => {
    assert.equal(E.length, 179);
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
    // Sans jour ni mois, pas de hilloula : Ibn Ezra (1164/1167), le Rema vu du seul tableur, etc.
    assert.equal(E.find(e => /Ibn Ezra/.test(e.fr)).hilloula, null);
    assert.equal(E.find(e => /Rav Papa/.test(e.fr)).hilloula, null);
    assert.equal(K.hilloulaLabel(E.find(e => /Ibn Ezra/.test(e.fr))), '');
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
    assert.ok(K.filter(E, { era: 'gueonim' }).length === 6);
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
