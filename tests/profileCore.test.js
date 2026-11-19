const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const P = require('../js/profileCore.js');

const sec = id => JSON.parse(fs.readFileSync(__dirname + '/../data/siddur/' + id + '.json', 'utf8'));
const fr = id => JSON.parse(fs.readFileSync(__dirname + '/../data/siddur/fr/' + id + '.json', 'utf8')).t;
const plain = h => h.replace(/<[^>]*>/g, '');

test('normalizeGender : m, f, ou rien', () => {
    assert.strictEqual(P.normalizeGender('m'), 'm');
    assert.strictEqual(P.normalizeGender('f'), 'f');
    assert.strictEqual(P.normalizeGender('x'), null);
    assert.strictEqual(P.normalizeGender(undefined), null);
});

test('sans profil : le livre tel qu\'il est écrit', () => {
    const s = sec('birkhot-hachahar').segments;
    const r = P.adaptSection(s, null);
    assert.strictEqual(r.segments, s);
    assert.strictEqual(r.hidden.size, 0);
});

test('Birkhot haChahar, homme : goy, avad, icha ; rien de la femme', () => {
    const s = sec('birkhot-hachahar').segments;
    const r = P.adaptSection(s, 'm');
    const shown = r.segments.filter((_, i) => !r.hidden.has(i)).map(plain).join('\n');
    assert.match(shown, /עָשַׂנִי גּוֹי:/);
    assert.match(shown, /עָשַׂנִי עָבֶד:/);
    assert.match(shown, /עָשַׂנִי אִשָּׁה:/);
    assert.doesNotMatch(shown, /האשה|האיש|גּוֹיה|שִפְחָה|כִּרְצוֹנוֹ/);
});

test('Birkhot haChahar, femme : goya, chifkha, « chéassani kirtsono », pas « chélo assani icha »', () => {
    const s = sec('birkhot-hachahar').segments;
    const r = P.adaptSection(s, 'f');
    const shown = r.segments.filter((_, i) => !r.hidden.has(i)).map(plain).join('\n');
    assert.match(shown, /עָשַׂנִי גּוֹיה:/);
    assert.match(shown, /עָשַׂנִי שִפְחָה:/);
    assert.match(shown, /שֶׁעָשַׂנִי כִּרְצוֹנוֹ/);
    assert.doesNotMatch(shown, /עָשַׂנִי אִשָּׁה|האשה אומרת|האיש מברך|עָשַׂנִי גּוֹי:|עָשַׂנִי עָבֶד:/);
    assert.strictEqual(r.segments.length, s.length);            // les indices restent ceux du livre
});

test('Modeh ani : « modeh » pour l\'homme, « modah » pour la femme', () => {
    const s = sec('modeh-ani').segments;
    const m = P.adaptSection(s, 'm').segments.map(plain).join(' ');
    const f = P.adaptSection(s, 'f').segments.map(plain).join(' ');
    assert.match(m, /מוֹדֶה אֲנִי/);
    assert.doesNotMatch(m, /האשה|מודָה/);
    assert.match(f, /מוֹדָה אֲנִי/);
    assert.doesNotMatch(f, /האשה|מוֹדֶה/);
});

test('traductions : accordées au profil', () => {
    const t = fr('birkhot-hachahar');
    const goy = t['19'][1];
    assert.strictEqual(P.adaptFr(goy, 'm'), 'Béni sois-Tu, Éternel notre Dieu, Roi de l\'univers, qui ne m\'as pas fait non-Juif.');
    assert.strictEqual(P.adaptFr(goy, 'f'), 'Béni sois-Tu, Éternel notre Dieu, Roi de l\'univers, qui ne m\'as pas fait non-Juive.');
    assert.strictEqual(P.adaptFr(goy, null), goy);
    const modeh = fr('modeh-ani')['3'][1];
    assert.doesNotMatch(P.adaptFr(modeh, 'f'), /Variante|femme/);
    assert.doesNotMatch(P.adaptFr(modeh, 'm'), /Variante|femme/);
});
