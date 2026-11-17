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

test('migrateEntries : anciennes clés renommées, nouvelle valeur jamais écrasée', () => {
    const r = D.migrateEntries({
        historiaxe_wheel_v1: 'ancien', historiaxe_lexgame_prefs_v1: 'p',
        torahaxe_lexgame_prefs_v1: 'neuf', siddurPrefs: 'x'
    });
    assert.deepStrictEqual(r, { torahaxe_wheel_v1: 'ancien', torahaxe_lexgame_prefs_v1: 'neuf', siddurPrefs: 'x' });
});

test('import : une sauvegarde d\'avant la migration est lue avec les nouvelles clés', () => {
    const r = D.parseImport(JSON.stringify({ app: 'torahaxe', v: 1, data: { historiaxe_torah_reader_position: '12' } }));
    assert.deepStrictEqual(r.data, { torahaxe_torah_reader_position: '12' });
});

test('migrateStorage : copie sans supprimer, idempotent, silencieux si le stockage échoue', () => {
    const m = new Map([['historiaxe_wheel_v1', 'w'], ['historiaxe_torah_reader_font_v2', 'f'], ['torahaxe_torah_reader_font_v2', 'deja']]);
    const st = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
    assert.strictEqual(D.migrateStorage(st), 1);
    assert.strictEqual(m.get('torahaxe_wheel_v1'), 'w');
    assert.strictEqual(m.get('historiaxe_wheel_v1'), 'w');
    assert.strictEqual(m.get('torahaxe_torah_reader_font_v2'), 'deja');
    assert.strictEqual(D.migrateStorage(st), 0);
    assert.strictEqual(D.migrateStorage({ getItem() { throw new Error('x'); } }), 0);
});
