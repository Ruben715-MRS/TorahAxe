const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/siddurSoundsCore.js');

// Les lettres mises en gras d'un mot : « lettre:son »
const bold = (w, maqaf) => S.marksOf(w, !!maqaf).map(m => w.substr(m.i, m.n).replace(/[֑-ׇ]/g, '') + ':' + m.k).join(' ');
const joined = (t) => S.split(t).map(x => typeof x === 'string' ? x : x.s).join('');

test('daguèch dur : תִּפֹּל (« tippol ») : le second pé, pas le tav du début de mot', () => {
    assert.strictEqual(bold('תִּפֹּל'), 'פ:dagesh');
});
test('daguèch dur : dans une lettre autre que בגדכפת, toujours', () => {
    assert.strictEqual(bold('הַמַּיִם'), 'מ:dagesh');
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
