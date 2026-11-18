const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/siddurCore.js');
const CY = require('../js/calendarYearCore.js');
const fs = require('fs');

const flags = (y, m, d) => S.contextFor(CY.gregorianToFixed(y, m, d), false).flags;

test('Chabbat Chouva : le Chabbat des dix jours de pénitence', () => {
    assert.strictEqual(flags(2026, 9, 19).shabbatShuva, true);
    assert.strictEqual(flags(2026, 11, 21).shabbatShuva, false);
});

test('Chabbat Hanouka, Chabbat Roch \'Hodesh, Chabbat qui précède Roch \'Hodesh', () => {
    const hanouka = flags(2026, 12, 5);
    assert.ok(hanouka.shabbatHanukkah && hanouka.shabbatSpecial && hanouka.mevarchim);
    assert.ok(!flags(2026, 11, 21).mevarchim);
    const rc = flags(2027, 1, 9);
    assert.ok(rc.shabbatRc && rc.shabbatSpecial && !rc.notShabbatRc);
    assert.ok(flags(2026, 11, 21).notShabbatRc);
});

test('Chabbat Zakhor : le Chabbat qui précède Pourim', () => {
    assert.strictEqual(flags(2027, 3, 20).shabbatZachor, true);     // Pourim : mardi 23 mars 2027
    assert.strictEqual(flags(2027, 3, 13).shabbatZachor, false);
    assert.strictEqual(flags(2026, 11, 21).shabbatZachor, false);
    assert.deepStrictEqual(S.conditionOf('בשבת זכור, קודם הוצאת ספר תורה').atoms, ['shabbatZachor']);
});

test('une consigne propre à Chabbat remplace les atomes simples (pas « Chabbat OU Roch \'Hodesh »)', () => {
    assert.deepStrictEqual(S.conditionOf('בשבת שובה מוסיפים:').atoms, ['shabbatShuva']);
    assert.deepStrictEqual(S.conditionOf('בשבת ר"ח או חול המועד או חנוכה אומרים כאן הלל').atoms, ['shabbatSpecial']);
    assert.deepStrictEqual(S.conditionOf('ואם חל ראש חודש בשבת יאמר').atoms, ['shabbatRc']);
    assert.deepStrictEqual(S.conditionOf('כשלא חל ראש חודש בשבת יאמר').atoms, ['notShabbatRc']);
    assert.deepStrictEqual(S.conditionOf('בראש חדש:').atoms, ['rc']);   // inchangé
});

test('chaque section du siddour a un fichier, et chaque groupe de l\'index est lisible', () => {
    const index = JSON.parse(fs.readFileSync(__dirname + '/../data/siddur/index.json', 'utf8'));
    const seen = new Set();
    index.groups.forEach(g => {
        assert.ok(!seen.has(g.id), 'groupe en double : ' + g.id);
        seen.add(g.id);
        g.sections.forEach(s => {
            const data = JSON.parse(fs.readFileSync(__dirname + '/../data/siddur/' + s.id + '.json', 'utf8'));
            assert.strictEqual(data.id, s.id);
            assert.strictEqual(data.segments.length, s.segments, s.id);
        });
    });
    const temps = index.groups.find(g => g.id === 'temps').sections.map(x => x.id);
    assert.ok(temps.indexOf('pourim-zakhor') !== -1 && temps.indexOf('pourim-zakhor') < temps.indexOf('pourim-meguila'));
    const jeunes = index.groups.find(g => g.id === 'jeunes').sections.map(x => x.id);
    assert.ok(jeunes.indexOf('selihot-generales') !== -1);
    assert.ok(jeunes.indexOf('tichabav-eikha') === -1, 'l\'Eikha est dans le Tanakh, pas recopiée');
    ['hanouka-maoz-tsour', 'hanouka-zemer-chabbat', 'pourim-chochanat-yaakov', 'pourim-qerovets'].forEach(id => assert.ok(temps.indexOf(id) !== -1, id));
    const zem = index.groups.find(g => g.id === 'zemirot-chabbat').sections.map(x => x.id);
    assert.ok(zem.length >= 30 && zem.every(id => /^zem-/.test(id)));
    const zemSections = index.groups.find(g => g.id === 'zemirot-chabbat').sections;
    const moments = ['soir', 'matin', 'apres-midi', 'motsei'];
    assert.ok(zemSections.every(s => moments.indexOf(s.tab) !== -1), 'chaque chant a son onglet');
    assert.ok(zemSections.every(s => !/\(/.test(s.fr)), 'le moment n\'est plus dans le titre');
    moments.forEach(m => assert.ok(zemSections.some(s => s.tab === m), m));
    ['chabbat-chirei', 'chabbat-chants-motsei'].forEach(id => assert.ok(!index.groups.some(g => g.sections.some(x => x.id === id)), id + ' est dans le recueil'));
    ['chabbat-accueil', 'chabbat-arvit', 'chabbat-soir', 'chabbat-chacharit', 'chabbat-moussaf', 'chabbat-minha', 'motsei-chabbat', 'michnayot-chabbat', 'pirkei-avot', 'regalim'].forEach(id => assert.ok(seen.has(id), id));
});

test('chaque chant du recueil a son paratexte et sa traduction, rattachée au bon segment', () => {
    const index = JSON.parse(fs.readFileSync(__dirname + '/../data/siddur/index.json', 'utf8'));
    const frIndex = JSON.parse(fs.readFileSync(__dirname + '/../data/siddur/fr/index.json', 'utf8'));
    index.groups.find(g => g.id === 'zemirot-chabbat').sections.forEach(s => {
        const sec = JSON.parse(fs.readFileSync(__dirname + '/../data/siddur/' + s.id + '.json', 'utf8'));
        assert.ok(sec.about && sec.about.auteur && sec.about.contexte && sec.about.sens, s.id + ' : paratexte incomplet');
        const fr = JSON.parse(fs.readFileSync(__dirname + '/../data/siddur/fr/' + s.id + '.json', 'utf8'));
        const keys = Object.keys(fr.t);
        assert.ok(keys.length >= 1, s.id + ' : aucune traduction');
        keys.forEach(k => assert.strictEqual(fr.t[k][0], S.fingerprint(sec.segments[k]), s.id + ' segment ' + k));
        assert.strictEqual(frIndex.sections[s.id], keys.length, s.id + ' : index des traductions');
    });
});

test('psaume du jour : celui du jour et ceux des jours particuliers', () => {
    const ctx = (y, m, d) => S.contextFor(CY.gregorianToFixed(y, m, d), false);
    const wed = ctx(2026, 11, 18);                       // mercredi
    assert.strictEqual(S.dayPsalm('מזמור ליום רביעי', wed), 'on');
    assert.strictEqual(S.dayPsalm('מִזְמוֹר לְיוֹם שְׁלִישִׁי', wed), 'off');
    assert.strictEqual(S.dayPsalm('למחרת יום הכיפורים אומרים', wed), 'off');
    assert.strictEqual(S.dayPsalm('בבית האבל אומרים', wed), 'unknown');
    assert.strictEqual(S.dayPsalm('לדוד מזמור ליהוה הארץ', wed), null);
    assert.strictEqual(S.dayPsalm('בחנוכה אומרים', ctx(2026, 12, 7)), 'on');
    assert.strictEqual(S.dayPsalm('למחרת יום הכיפורים אומרים', ctx(2026, 9, 22)), 'on');   // 11 Tichri 5787
    assert.strictEqual(S.dayPsalm('בצום גדליה ובעשרה בטבת אומרים', ctx(2026, 12, 20)), 'on'); // 10 Tevet 5787
});
