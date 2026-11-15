const test = require('node:test');
const assert = require('node:assert');
const D = require('../js/dataCore.js');

test('export puis import : mêmes données, clés triées, valeurs non texte écartées', () => {
    const ex = D.buildExport({ b: '2', a: '1', c: 3 }, Date.UTC(2026, 10, 15));
    assert.deepStrictEqual(Object.keys(ex.data), ['a', 'b']);
    assert.strictEqual(ex.date, '2026-11-15T00:00:00.000Z');
    const r = D.parseImport(JSON.stringify(ex));
    assert.strictEqual(r.ok, true);
    assert.deepStrictEqual(r.data, { a: '1', b: '2' });
});

test('import : refuse un fichier étranger, abîmé ou d\'une autre version', () => {
    assert.strictEqual(D.parseImport('').ok, false);
    assert.strictEqual(D.parseImport('pas du json').ok, false);
    assert.strictEqual(D.parseImport('{"app":"autre","v":1,"data":{}}').ok, false);
    assert.strictEqual(D.parseImport('{"app":"torahaxe","v":9,"data":{}}').ok, false);
    assert.strictEqual(D.parseImport('{"app":"torahaxe","v":1,"data":[1]}').ok, false);
});

test('fileName : porte la date', () => {
    assert.strictEqual(D.fileName(Date.UTC(2026, 10, 15)), 'torahaxe-sauvegarde-2026-11-15.json');
});
