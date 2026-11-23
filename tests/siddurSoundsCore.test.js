const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/siddurSoundsCore.js');

// Les lettres mises en gras d'un mot : « lettre:son »
const bold = (w, maqaf) => S.marksOf(w, !!maqaf).map(m => w.substr(m.i, m.n).replace(/[֑-ׇ]/g, '') + ':' + m.k).join(' ');
const joined = (t) => S.split(t).map(x => typeof x === 'string' ? x : x.s).join('');

test('daguèch dur : תִּפֹּל (« tippol ») : le second pé, pas le tav du début de mot', () => {
    assert.strictEqual(bold('תִּפֹּל'), 'פ:dagesh');
});
test('daguèch dur : dans une lettre autre que בגדכפת, toujours (hors article)', () => {
    assert.strictEqual(bold('הִנָּשֵׂא'), 'נ:dagesh');
    assert.strictEqual(bold('וַיִּקְרָא'), 'י:dagesh');
});
test('daguèch léger (début de mot, ou après un chéva) : pas de marque', () => {
    assert.strictEqual(bold('בָּרוּךְ'), '');
    assert.strictEqual(bold('וַיִּשְׁתַּחֲווּ'), 'י:dagesh');      // le yod double ; le tav après un chéva reste léger
});
test('chéva na : début de mot, après une voyelle longue sûre (יוֹשְׁבֵי : « yochévé »)', () => {
    assert.strictEqual(bold('יוֹשְׁבֵי'), 'ש:na');
});
test('chéva na : la première de deux lettres identiques (הַלְלוּ)', () => {
    assert.strictEqual(bold('הַלְלוּ'), 'ל:na');
});
test('chéva muet en fin de mot : pas de marque', () => {
    assert.strictEqual(bold('יֵלֵךְ'), '');
    assert.strictEqual(bold('יֵשְׁתְּ'), '');      // second chéva de fin de mot
});
test('gros kamats : un mot de la liste, et devant un hataf kamats', () => {
    assert.strictEqual(bold('חָכְמָה'), 'ח:katan');
    assert.strictEqual(bold('צָהֳרַיִם'), 'צ:katan');
});
test('un kamats devant un chéva, hors de la liste, reste sans marque (gros kamats ou non : le texte ne le dit pas)', () => {
    assert.strictEqual(bold('הָלְכוּ'), '');
});
test('« כָּל » joint par un maqaf se lit [o]', () => {
    assert.strictEqual(bold('כָּל', true), 'כ:katan');
    assert.strictEqual(bold('כָּל', false), '');
});
test('בְּעָזְּךָ : les trois sons réunis', () => {
    assert.strictEqual(bold('בְּעָזְּךָ'), 'ב:na ע:katan ז:dagesh');
});
test('le Nom divin n\'est jamais marqué', () => {
    assert.strictEqual(bold('יְהֹוָה'), '');
    assert.strictEqual(bold('לַיהֹוָה'), '');
});
test('split : le texte recollé est identique, avec ou sans voyelles', () => {
    const t = 'בְּעָזְּךָ תִּפֹּל, יוֹשְׁבֵי בֵיתֶךָ־כָּל abc';
    assert.strictEqual(joined(t), t);
    assert.strictEqual(joined('בראשית'), 'בראשית');
    assert.deepStrictEqual(S.split('בראשית ברא'), ['בראשית ברא']);
});

// --- Les erreurs relevées en comparant avec le Maguen Avot (וּשְׁבוּעָתוֹ) ---
test('« וּ » (et) en tête de mot : son chéva n\'est pas marqué (וּשְׁבוּעָתוֹ, וּבְרָכָה, וּשְׁמוֹ)', () => {
    assert.strictEqual(bold('וּשְׁבוּעָתוֹ'), '');
    assert.strictEqual(bold('וּבְרָכָה'), '');
    assert.strictEqual(bold('וּשְׁמוֹ'), '');
    assert.strictEqual(bold('וּבְבִנְיַן'), 'ב:na');           // deux lettres identiques : « ouvévinian »
});
test('mot à suffixe d\'une lettre : le chéva après la voyelle longue n\'est pas marqué', () => {
    assert.strictEqual(bold('טוּבְךָ'), '');
    assert.strictEqual(bold('מַלְכוּתְךָ'), '');
    assert.strictEqual(bold('עִירְךָ'), '');
    assert.strictEqual(bold('יְמִינְךָ'), 'י:na');             // seul le chéva du début est marqué
});
test('araméen et forme en « ָה » : rien (le chéva y est muet ou douteux)', () => {
    assert.strictEqual(bold('קוּדְשָׁא'), '');
    assert.strictEqual(bold('רָחִיצְנָא'), '');
    assert.strictEqual(bold('נֵלְכָה'), '');
});
test('l\'alef muet après un \'holam ne cache pas la voyelle longue (תֹּאמְרוּ)', () => {
    assert.strictEqual(bold('תֹּאמְרוּ'), 'מ:na');
});
test('kamats devant un chéva FINAL : ce n\'est pas un gros kamats (מִקְדָּשָׁךְ)', () => {
    assert.strictEqual(bold('מִקְדָּשָׁךְ'), '');
    assert.strictEqual(bold('קָדְשְׁךָ'), 'ק:katan ש:na');
});

// --- Écarts relevés sur les pages du Maguen Avot (gros losanges = sons particuliers) ---
test('le daguèch après l\'article (ou l\'article contracté) n\'est pas en gras : הַתּוֹעִים, הַשִּׁירָה, הַזֹּאת, בַּיָּם', () => {
    ['הַתּוֹעִים', 'הַשִּׁירָה', 'הַזֹּאת', 'בַּיָּם', 'הַמַּיִם'].forEach(w => assert.strictEqual(bold(w), '', w));
    assert.strictEqual(bold('וְהַבָּאִים'), 'ו:na');
});
test('le « ה » final avec mappiq n\'est pas un daguèch dur : אֱלוֹהַּ, לָהּ, שְׁמֵהּ', () => {
    assert.strictEqual(bold('אֱלוֹהַּ'), '');
    assert.strictEqual(bold('לָהּ'), '');
    assert.strictEqual(bold('שְׁמֵהּ'), 'ש:na');
});
test('même lettre en gras que le Maguen Avot : שֶׁבְּרָאָנוּ, לִבֵּנוּ, וְחַיֵּי, וְרֹכְבוֹ', () => {
    assert.strictEqual(bold('שֶׁבְּרָאָנוּ'), 'ב:dagesh');
    assert.strictEqual(bold('לִבֵּנוּ'), 'ב:dagesh');
    assert.strictEqual(bold('וְחַיֵּי'), 'ו:na י:dagesh');
    assert.strictEqual(bold('וְרֹכְבוֹ'), 'ו:na כ:na');
});
