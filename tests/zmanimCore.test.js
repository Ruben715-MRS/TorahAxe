// Les profils d'opinions (Rav Posen / Rav Ovadia Yossef) et les formules de la fiche de calcul « Zmanim Diffusion » (Siddour Maguen Avot).
const test = require('node:test');
const assert = require('node:assert');
const Z = require('../js/zmanimCore.js');

const MIN = 60000;
// Jérusalem, niveau de la mer (le lever et le coucher visibles sont alors ceux du niveau de la mer).
const JLM = { name: 'Jérusalem', lat: 31.778, lon: 35.235, elevation: 0, tz: 'Asia/Jerusalem' };
const DAYS = [[2026, 1, 15], [2026, 3, 20], [2026, 6, 21], [2026, 9, 22], [2026, 12, 21]];

test('profileOf : les défauts sont le profil Rav Posen', () => {
    assert.strictEqual(Z.profileOf({}), 'posen');
    assert.strictEqual(Z.profileOf(undefined), 'posen');
});

test('profileOf : le profil Rav Ovadia, et « personnalisé » dès qu\'une clé s\'en écarte', () => {
    assert.strictEqual(Z.profileOf(Z.applyProfile({}, 'ovadia')), 'ovadia');
    assert.strictEqual(Z.profileOf(Object.assign(Z.applyProfile({}, 'ovadia'), { dawn: 'deg161' })), 'custom');
    assert.strictEqual(Z.profileOf({ dawn: 'min90' }), 'custom');
});

test('applyProfile ne touche que les six clés du profil', () => {
    const out = Z.applyProfile({ elevation: 'no', candles: 22, havdalah: 'min72', chatzotLayla: 'stars6' }, 'ovadia');
    assert.strictEqual(out.elevation, 'no');
    assert.strictEqual(out.candles, 22);
    assert.strictEqual(out.havdalah, 'min72');
    assert.strictEqual(out.chatzotLayla, 'stars6');
    Z.PROFILE_KEYS.forEach(k => assert.strictEqual(out[k], Z.PROFILES.ovadia[k]));
    assert.strictEqual(Z.profileOf(Z.applyProfile(out, 'posen')), 'posen');
});

test('applyProfile : un profil inconnu ne change rien, et l\'objet reçu n\'est pas modifié', () => {
    const opts = { dawn: 'min90' };
    assert.deepStrictEqual(Z.applyProfile(opts, 'inconnu'), { dawn: 'min90' });
    Z.applyProfile(opts, 'ovadia');
    assert.deepStrictEqual(opts, { dawn: 'min90' });
});

test('chaque valeur d\'un profil est une opinion connue du moteur', () => {
    Object.keys(Z.PROFILES).forEach(id => {
        const p = Z.PROFILES[id];
        assert.ok(Z.DAWN_OPINIONS[p.dawn], id + ' dawn');
        assert.ok(Z.DAWN_OPINIONS[p.maBasis], id + ' maBasis');
        assert.ok(p.misheyakir in Z.MISHEYAKIR_OPINIONS, id + ' misheyakir');
        assert.ok(Z.NIGHT_OPINIONS[p.tzeit], id + ' tzeit');
        assert.ok(Z.NIGHT_OPINIONS[p.rabbenuTam], id + ' rabbenuTam');
        assert.ok(p.guedola in Z.GUEDOLA_OPINIONS, id + ' guedola');
    });
});

DAYS.forEach(([y, m, d]) => {
    const label = y + '-' + m + '-' + d;
    const ov = () => Z.zmanim(JLM, y, m, d, Z.applyProfile({}, 'ovadia'));
    const po = () => Z.zmanim(JLM, y, m, d, {});

    test('fiche, Rav Ovadia, ' + label + ' : aube B = lever − 72 min zmaniyot, heure zmanit I = (coucher − lever) / 12', () => {
        const z = ov();
        const I = (z.shkia - z.netz) / 12;
        assert.ok(Math.abs(z.shaaGra * MIN - I) < 1);
        assert.ok(Math.abs(z.alot - (z.netz - I / 60 * 72)) < 1);
    });

    test('fiche, Rav Ovadia, ' + label + ' : misheyakir = B + 6 min zmaniyot, nuit F = coucher + 13,5 min zmaniyot, nuit G = coucher + 72', () => {
        const z = ov();
        const I = (z.shkia - z.netz) / 12;
        assert.ok(Math.abs(z.misheyakir - (z.alot + I / 60 * 6)) < 1);
        assert.ok(Math.abs(z.tzeit - (z.shkia + I / 60 * 13.5)) < 1);
        assert.ok(Math.abs(z.rabbenuTam - (z.shkia + I / 60 * 72)) < 1);
    });

    test('fiche, Rav Ovadia, ' + label + ' : Chéma = B + 3 × (G − B) / 12, Min\'ha guédola = lever + 6,5 I', () => {
        const z = ov();
        const I = (z.shkia - z.netz) / 12;
        const B = z.alot, G = z.rabbenuTam;
        assert.ok(Math.abs(z.shemaMa - (B + 3 * (G - B) / 12)) < 1);
        assert.ok(Math.abs(z.tefilaMa - (B + 4 * (G - B) / 12)) < 1);
        assert.ok(Math.abs(z.minchaGedola - (z.netz + 6.5 * I)) < 1);
    });

    test('fiche, Rav Posen, ' + label + ' : Chéma = A + 3 × (H − A) / 12 avec H = D + (D − A)', () => {
        const z = po();
        const A = z.alot, D = z.chatzot, H = D + (D - A);
        assert.ok(Math.abs(z.shemaMa - (A + 3 * (H - A) / 12)) < MIN, 'la fiche suppose la symétrie autour de midi : l\'écart est de quelques secondes');
        assert.ok(Math.abs(z.rabbenuTam - H) < 60000, 'la nuit de 16,1° est le symétrique de l\'aube autour de midi (à la minute près)');
    });

    test('fiche, ' + label + ' : Gra, midi = lever + 6 I, Min\'ha ketana = lever + 9,5 I, plag = coucher − 1,25 I, chéma Gra = lever + 3 I', () => {
        const z = po();
        const I = (z.shkia - z.netz) / 12;
        assert.ok(Math.abs(z.chatzot - (z.netz + 6 * I)) < 1);
        assert.ok(Math.abs(z.minchaKetana - (z.netz + 9.5 * I)) < 1);
        assert.ok(Math.abs(z.plag - (z.shkia - 1.25 * I)) < 1);
        assert.ok(Math.abs(z.shemaGra - (z.netz + 3 * I)) < 1);
        assert.ok(Math.abs(z.tefilaGra - (z.netz + 4 * I)) < 1);
    });
});

test('le profil Rav Ovadia décale l\'aube plus tard en hiver qu\'en été par rapport au 16,1° (minutes proportionnelles)', () => {
    const winter = Z.zmanim(JLM, 2026, 12, 21, Z.applyProfile({}, 'ovadia'));
    const summer = Z.zmanim(JLM, 2026, 6, 21, Z.applyProfile({}, 'ovadia'));
    assert.ok((winter.netz - winter.alot) < (summer.netz - summer.alot));
});

DAYS.forEach(([y, m, d]) => {
    const label = y + '-' + m + '-' + d;
    test('fiche, ' + label + ' : plag Magen Avraham = nuit F − 1,25 I ; fin des jeûnes = coucher + 20 min zmaniyot', () => {
        [{}, Z.applyProfile({}, 'ovadia')].forEach(opts => {
            const z = Z.zmanim(JLM, y, m, d, opts);
            const I = (z.shkia - z.netz) / 12;
            assert.ok(Math.abs(z.plagMa - (z.tzeit - 1.25 * I)) < 1);
            assert.ok(Math.abs(z.fastEnd - (z.shkia + I / 60 * 20)) < 1);
            assert.ok(z.plagMa < z.plag + 40 * MIN && z.plagMa > z.plag - 40 * MIN);
        });
    });
    test('fiche, ' + label + ' : début de la Chéma du soir à 7,083°, entre le coucher et la nuit de Rabénou Tam', () => {
        const z = Z.zmanim(JLM, y, m, d, {});
        assert.ok(z.shemaNight > z.shkia && z.shemaNight < z.rabbenuTam);
        assert.strictEqual(z.shemaNight, z.tzeit, 'le défaut du profil Rav Posen est déjà 7,083°');
    });
});

test('fiche : fin de Chabbat à 30 minutes après le coucher (Israël)', () => {
    const z = Z.zmanim(JLM, 2026, 3, 21, { havdalah: 'min30' });
    assert.ok(Math.abs(z.havdalah - (z.shkia + 30 * MIN)) < 1);
});

test('plag Magen Avraham et fin des jeûnes : null quand la nuit n\'existe pas (été à Tromsø)', () => {
    const tromso = { name: 'Tromsø', lat: 69.65, lon: 18.96, elevation: 0, tz: 'Europe/Oslo' };
    const z = Z.zmanim(tromso, 2026, 6, 21, {});
    assert.strictEqual(z.plagMa, null);
    assert.strictEqual(z.fastEnd, null);
    assert.strictEqual(z.shemaNight, null);
});
