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

const OFFICE_IDX = require('../data/siddur/index.json');
const OFFICE_ALL = [].concat(...OFFICE_IDX.groups.map(g => g.sections.map(x => x.id)));
const officeIds = id => OFFICE_IDX.groups.find(g => g.id === id).sections.map(x => x.id);
const ctxOf = o => ({ flags: Object.assign({ rc: false, shabbat: false, yomTov: false, hanukkah: false, purim: false, chPesach: false, chSukkot: false }, o) });

test("occasionsOf : Roch 'Hodech, Hanouka, Pourim, 'Hol haMoed, dans l'ordre ; rien Chabbat ni jour de fête", () => {
    const S2 = require('../js/siddurCore.js');
    assert.deepStrictEqual(S2.occasionsOf(ctxOf({})), []);
    assert.deepStrictEqual(S2.occasionsOf(ctxOf({ rc: true })), ['rc']);
    assert.deepStrictEqual(S2.occasionsOf(ctxOf({ rc: true, hanukkah: true })), ['rc', 'hanouka']);
    assert.deepStrictEqual(S2.occasionsOf(ctxOf({ purim: true })), ['pourim']);
    assert.deepStrictEqual(S2.occasionsOf(ctxOf({ chPesach: true })), ['chPesach']);
    assert.deepStrictEqual(S2.occasionsOf(ctxOf({ chSukkot: true })), ['chSukkot']);
    assert.deepStrictEqual(S2.occasionsOf(ctxOf({ rc: true, shabbat: true })), []);
    assert.deepStrictEqual(S2.occasionsOf(ctxOf({ hanukkah: true, yomTov: true })), []);
    assert.deepStrictEqual(S2.occasionsOf(null), []);
    assert.strictEqual(S2.isRoshChodeshWeekday(ctxOf({ rc: true })), true);
    assert.strictEqual(S2.isRoshChodeshWeekday(ctxOf({ rc: true, shabbat: true })), false);
    assert.strictEqual(S2.isRoshChodeshWeekday(ctxOf({ hanukkah: true })), false);
    assert.strictEqual(S2.OCC_HE.rc, 'ראש חודש');
});

test('officeFor : un jour ordinaire, les sections de la semaine telles quelles', () => {
    const S2 = require('../js/siddurCore.js');
    ['chacharit', 'minha', 'arvit'].forEach(b => assert.deepStrictEqual(S2.officeFor(b, officeIds(b), [], OFFICE_ALL), { ids: officeIds(b), trim: {} }));
});

test("Roch 'Hodech : Cha'harit suit l'ordre du livre (Hallel, Torah, Moussaf, Barkhi nafchi…)", () => {
    const S2 = require('../js/siddurCore.js');
    const group = officeIds('chacharit');
    const rc = S2.officeFor('chacharit', group, ['rc'], OFFICE_ALL).ids;
    const cut = rc.indexOf('chacharit-amida');
    assert.deepStrictEqual(rc.slice(0, cut + 1), group.slice(0, group.indexOf('chacharit-amida') + 1));       // la semaine jusqu'à l'Amida
    assert.deepStrictEqual(rc.slice(cut + 1, cut + 10), S2.RC_SECTIONS);                                         // puis Roch 'Hodech, dans l'ordre
    assert.deepStrictEqual(rc.slice(cut + 10), ['chacharit-treize-principes', 'chacharit-dix-souvenirs']);       // puis la fin habituelle
    ['chacharit-vidoui', 'chacharit-tora', 'chacharit-achre', 'chacharit-ouva-letsion', 'chacharit-chir-chel-yom', 'chacharit-qave', 'chacharit-alenou'].forEach(id => assert.ok(!rc.includes(id), id));
    // sans une section du livre : on garde l'office de la semaine
    assert.deepStrictEqual(S2.officeFor('chacharit', group, ['rc'], ['chacharit-amida']).ids, group);
});

test("Hanouka : Hallel (sans la lecture de Roch 'Hodech), Torah, lectures de Hanouka, puis la suite ; Roch 'Hodech Tévet y ajoute les sections de Roch 'Hodech", () => {
    const S2 = require('../js/siddurCore.js');
    const group = officeIds('chacharit');
    const han = S2.officeFor('chacharit', group, ['hanouka'], OFFICE_ALL);
    const cut = han.ids.indexOf('chacharit-amida');
    assert.deepStrictEqual(han.ids.slice(cut + 1, cut + 4), ['rh-hallel', 'chacharit-tora', 'hanouka-chacharit']);
    assert.deepStrictEqual(han.trim, { 'rh-hallel': S2.HALLEL_TAIL_FROM });
    assert.ok(!han.ids.includes('chacharit-vidoui'));
    assert.ok(han.ids.includes('chacharit-achre') && han.ids.includes('chacharit-chir-chel-yom') && han.ids.includes('chacharit-alenou'));
    const both = S2.officeFor('chacharit', group, ['rc', 'hanouka'], OFFICE_ALL).ids;
    assert.strictEqual(both[both.indexOf('rh-hallel') + 1], 'hanouka-chacharit');
    assert.ok(both.includes('rh-moussaf') && both.includes('rh-barkhi-nafchi'));
});

test('Pourim : la Méguila après Achré, Chochanat Ya\'akov ; Arvit : la Méguila après l\'Amida', () => {
    const S2 = require('../js/siddurCore.js');
    const ch = S2.officeFor('chacharit', officeIds('chacharit'), ['pourim'], OFFICE_ALL).ids;
    const cut = ch.indexOf('chacharit-amida');
    assert.deepStrictEqual(ch.slice(cut + 1, cut + 6), ['pourim-jour', 'chacharit-tora', 'chacharit-achre', 'pourim-meguila', 'pourim-chochanat-yaakov']);
    assert.ok(ch.includes('chacharit-ouva-letsion') && !ch.includes('chacharit-vidoui'));
    const ar = S2.officeFor('arvit', officeIds('arvit'), ['pourim'], OFFICE_ALL).ids;
    assert.deepStrictEqual(ar, ['arvit-barekhou', 'arvit-chema', 'arvit-amida', 'pourim-meguila', 'pourim-chochanat-yaakov', 'arvit-alenou']);
});

test("'Hol haMoed : Hallel, Moussaf et le mizmor de la fête (Pessa'h ou Souccot)", () => {
    const S2 = require('../js/siddurCore.js');
    const group = officeIds('chacharit');
    const p = S2.officeFor('chacharit', group, ['chPesach'], OFFICE_ALL);
    const s3 = S2.officeFor('chacharit', group, ['chSukkot'], OFFICE_ALL);
    assert.ok(p.ids.includes('regalim-mizmor-pessah') && !p.ids.includes('regalim-mizmor-souccot'));
    assert.ok(s3.ids.includes('regalim-mizmor-souccot') && !s3.ids.includes('regalim-mizmor-pessah'));
    [p, s3].forEach(o => {
        assert.strictEqual(o.ids[o.ids.indexOf('chacharit-amida') + 1], 'hm-hallel');
        assert.ok(o.ids.indexOf('hm-moussaf') > o.ids.indexOf('chacharit-ouva-letsion'));
        assert.deepStrictEqual(o.trim, { 'hm-hallel': S2.HALLEL_TAIL_FROM });
        assert.ok(!o.ids.includes('chacharit-chir-chel-yom'));
    });
});

test('Arvit de Hanouka : l\'allumage et Maoz Tsour après la prière ; Min\'ha : inchangée', () => {
    const S2 = require('../js/siddurCore.js');
    assert.deepStrictEqual(S2.officeFor('arvit', officeIds('arvit'), ['hanouka'], OFFICE_ALL).ids, officeIds('arvit').concat(['hanouka-allumage', 'hanouka-maoz-tsour']));
    ['rc', 'hanouka', 'pourim', 'chPesach'].forEach(o => assert.deepStrictEqual(S2.officeFor('minha', officeIds('minha'), [o], OFFICE_ALL).ids, officeIds('minha')));
});

test("Les Hallel du livre : la lecture de Roch 'Hodech commence bien au segment coupé", () => {
    const S2 = require('../js/siddurCore.js');
    const plainTxt = h => h.replace(/<[^>]*>/g, '');
    ['rh-hallel', 'hm-hallel'].forEach(id => {
        const d = require('../data/siddur/' + id + '.json');
        assert.ok(/קודם הוצאת ספר תורה/.test(plainTxt(d.segments[S2.HALLEL_TAIL_FROM])), id);
    });
});

test("Chabbat d'occasion : shabbatOccasionsOf (Chabbat Roch 'Hodech, Hanouka, 'Hol haMoed ; rien un Chabbat ordinaire ni de fête)", () => {
    const S2 = require('../js/siddurCore.js');
    const sh = o => ctxOf(Object.assign({ shabbat: true }, o));
    assert.deepStrictEqual(S2.shabbatOccasionsOf(sh({})), []);
    assert.deepStrictEqual(S2.shabbatOccasionsOf(sh({ rc: true })), ['rc']);
    assert.deepStrictEqual(S2.shabbatOccasionsOf(sh({ hanukkah: true })), ['hanouka']);
    assert.deepStrictEqual(S2.shabbatOccasionsOf(sh({ rc: true, hanukkah: true })), ['rc', 'hanouka']);
    assert.deepStrictEqual(S2.shabbatOccasionsOf(sh({ chPesach: true })), ['chPesach']);
    assert.deepStrictEqual(S2.shabbatOccasionsOf(sh({ chSukkot: true })), ['chSukkot']);
    assert.deepStrictEqual(S2.shabbatOccasionsOf(sh({ hanukkah: true, yomTov: true })), []);
    assert.deepStrictEqual(S2.shabbatOccasionsOf(ctxOf({ hanukkah: true })), []);        // pas un Chabbat
    assert.deepStrictEqual(S2.shabbatOccasionsOf(null), []);
});

test("Chabbat d'occasion : Hallel après l'Amida de Cha'harit, lectures de Hanouka après la Torah, mizmor au Moussaf de 'Hol haMoed", () => {
    const S2 = require('../js/siddurCore.js');
    const ch = officeIds('chabbat-chacharit');
    const han = S2.officeFor('chabbat-chacharit', ch, ['hanouka'], OFFICE_ALL);
    assert.strictEqual(han.ids[han.ids.indexOf('chabbat-ch-amida') + 1], 'rh-hallel');
    assert.strictEqual(han.ids[han.ids.indexOf('chabbat-ch-tora') + 1], 'hanouka-chacharit');
    assert.deepStrictEqual(han.trim, { 'rh-hallel': S2.HALLEL_TAIL_FROM });
    assert.strictEqual(han.ids.length, ch.length + 2);                                                   // rien n'est retiré du Chabbat
    const rc = S2.officeFor('chabbat-chacharit', ch, ['rc'], OFFICE_ALL);
    assert.ok(rc.ids.includes('rh-hallel') && !rc.ids.includes('hanouka-chacharit'));
    const mo = officeIds('chabbat-moussaf');
    assert.strictEqual(S2.officeFor('chabbat-moussaf', mo, ['chPesach'], OFFICE_ALL).ids[1], 'regalim-mizmor-pessah');
    assert.strictEqual(S2.officeFor('chabbat-moussaf', mo, ['chSukkot'], OFFICE_ALL).ids[1], 'regalim-mizmor-souccot');
    assert.deepStrictEqual(S2.officeFor('chabbat-moussaf', mo, ['hanouka'], OFFICE_ALL).ids, mo);        // Hanouka : rien à ajouter au Moussaf
    ['chabbat-minha', 'chabbat-arvit'].forEach(g => assert.deepStrictEqual(S2.officeFor(g, officeIds(g), ['hanouka'], OFFICE_ALL).ids, officeIds(g)));
    assert.deepStrictEqual(S2.officeFor('chabbat-chacharit', ch, [], OFFICE_ALL).ids, ch);               // Chabbat ordinaire : inchangé
});

test("Le vendredi de Hanouka : l'allumage après Min'ha, avant Chabbat ; pas les autres jours", () => {
    const S2 = require('../js/siddurCore.js');
    const mi = officeIds('minha');
    assert.deepStrictEqual(S2.officeFor('minha', mi, ['hanouka'], OFFICE_ALL, { friday: true }).ids, mi.concat(['hanouka-allumage']));
    assert.deepStrictEqual(S2.officeFor('minha', mi, ['hanouka'], OFFICE_ALL, { friday: false }).ids, mi);
    assert.deepStrictEqual(S2.officeFor('minha', mi, ['rc'], OFFICE_ALL, { friday: true }).ids, mi);
});

// --- Birkat haMazon et Mé'en chaloch : rôles du Zimoun et tableaux --------------------------------------------------------------------
const bareOf = (html) => S.stripNiqqud(S.plain(S.parse(html))).replace(/[,.:;־\-–]/g, ' ').replace(/\s+/g, ' ').trim();
const segsOf = (id) => JSON.parse(fs.readFileSync(__dirname + '/../data/siddur/' + id + '.json', 'utf8')).segments.map(bareOf);

test('Zimoun : qui parle, dans les trois rites', () => {
    assert.strictEqual(S.zimounRole('ויאמר המזמן'), 'lead');
    assert.strictEqual(S.zimounRole('והמסובים עונים'), 'resp');
    assert.strictEqual(S.zimounRole('המזמן אומר'), 'lead');
    assert.strictEqual(S.zimounRole('וחוזר המזמן'), 'again');
    assert.strictEqual(S.zimounRole('וממשיך'), 'go');
    assert.strictEqual(S.zimounRole('מי שלא אכל עונה'), 'fast');
    assert.strictEqual(S.zimounRole('אם המסובים שלושה או יותר חייבים לזמן ככתוב כאן'), null);
    const roles = (id) => segsOf(id).map(S.zimounRole).filter(Boolean);
    assert.deepStrictEqual(roles('birkat-hamazon'), ['lead', 'resp', 'lead', 'resp', 'resp']);
    assert.deepStrictEqual(roles('birkat-hamazon-ashkenaze'), ['lead', 'resp', 'again', 'go', 'resp', 'fast', 'again']);
    assert.strictEqual(roles('birkat-hamazon-habad').length, 12);
});

test("Mé'en chaloch : chaque rite donne ses tableaux (céréales, vin, sept espèces)", () => {
    assert.deepStrictEqual(S.mcTables(segsOf('al-hamihya')), [{ from: 2, to: 4 }, { from: 14, to: 16 }, { from: 18, to: 20 }]);
    assert.deepStrictEqual(S.mcTables(segsOf('al-hamihya-ashkenaze')), [{ from: 2, to: 4 }, { from: 6, to: 8 }, { from: 10, to: 12 }]);
    assert.deepStrictEqual(S.mcTables(['ברוך אתה', 'אם שתה יין', 'אם אכל מזונות']), []);
});

test('Arvit de semaine : le psaume « Barkhi nafchi » de la nuit de Roch \'Hodech est replié, ouvert seulement ces jours-là', () => {
    const wk = require('../data/siddur/arvit-barekhou.json').segments;
    assert.deepStrictEqual(S.conditionOf('בליל ראש חודש יש הנוהגים לומר מזמור זה קודם ערבית').atoms, ['rc']);
    const groups = S.groups(wk);
    assert.strictEqual(groups.length, 1);
    assert.deepStrictEqual({ header: groups[0].header, from: groups[0].from, to: groups[0].to, atoms: groups[0].atoms }, { header: 1, from: 2, to: 2, atoms: ['rc'] });
    assert.ok(wk[2].replace(/[\u0591-\u05C7]/g, '').includes('ברכי נפשי'));          // le segment 2 est bien le psaume
    // hors Roch 'Hodech : « off » ; la nuit de Roch 'Hodech (30 Hechvan 5787 = 10 nov. 2026, au soir) : « on »
    assert.strictEqual(S.evaluate(groups[0].atoms, S.contextFor(CY.gregorianToFixed(2026, 11, 21), false)), 'off');
    assert.strictEqual(S.evaluate(groups[0].atoms, S.contextFor(CY.gregorianToFixed(2026, 11, 10), false)), 'on');
});

test('Chabbat : la consigne de la nuit de Roch \'Hodech ne fait pas de bloc (le psaume n\'est pas imprimé là)', () => {
    const sh = require('../data/siddur/chabbat-arvit-barekhou.json').segments;
    assert.deepStrictEqual(S.groups(sh), []);
});

test('Jours de Moussaf : Chabbat, fête, Roch \'Hodesh, \'Hol haMoed (Migdol / Magdil)', () => {
    assert.deepStrictEqual(S.conditionOf('בשבת ויו"ט וביום שמתפללים מוסף יאמר: מגדול').atoms.sort(), ['musafDay', 'shabbat', 'yomTov']);
    assert.strictEqual(flags(2026, 11, 21).musafDay, true);          // Chabbat
    assert.strictEqual(flags(2026, 11, 18).musafDay, false);         // mercredi ordinaire
    assert.strictEqual(flags(2027, 1, 9).musafDay, true);            // Chabbat Roch 'Hodesh
    assert.strictEqual(flags(2026, 10, 1).musafDay, true);           // 'Hol haMoed Souccot
    assert.strictEqual(S.evaluate(['yomTov', 'musafDay', 'shabbat'], S.contextFor(CY.gregorianToFixed(2026, 11, 18), false)), 'off');
});

test('Hodou : « יְהֹוָה הוּא הָאֱלֹהִים » (dix jours de pénitence et Hochana Rabba) est un bloc, « pas aujourd\'hui » les autres jours', () => {
    const d = JSON.parse(fs.readFileSync(__dirname + '/../data/siddur/chacharit-hodou.json', 'utf8'));
    const g = S.groups(d.segments).filter(x => x.header === 6);
    assert.strictEqual(g.length, 1);
    assert.deepStrictEqual([g[0].from, g[0].to], [7, 7]);              // seule cette phrase : « עומדים ואומרים » (segment 8) suit sans en faire partie
    assert.deepStrictEqual(g[0].atoms, ['aseret', 'hoshanaRabba']);
    const on = (y, m, day) => S.evaluate(g[0].atoms, S.contextFor(CY.gregorianToFixed(y, m, day), false));
    assert.strictEqual(on(2026, 9, 14), 'on');        // 3 Tichri
    assert.strictEqual(on(2026, 9, 21), 'on');        // 10 Tichri (Yom Kippour)
    assert.strictEqual(on(2026, 10, 2), 'on');        // 21 Tichri : Hochana Rabba
    assert.strictEqual(on(2026, 9, 22), 'off');       // 11 Tichri
    assert.strictEqual(on(2026, 10, 1), 'off');       // 20 Tichri
    assert.strictEqual(on(2026, 11, 23), 'off');      // un jour ordinaire
});
