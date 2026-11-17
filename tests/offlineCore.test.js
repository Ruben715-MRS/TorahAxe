const test = require('node:test');
const assert = require('node:assert');
const O = require('../js/offlineCore.js');

const SCOPE = 'https://torahaxe.example/';
const SHELL = new Set(['index.html', 'js/app/home.js', 'css/style.css']);

test('classify : la page d\'accueil et les fichiers de la coquille', () => {
    assert.strictEqual(O.classify(SCOPE, SCOPE, SHELL), 'shell');
    assert.strictEqual(O.classify(SCOPE + 'index.html', SCOPE, SHELL), 'shell');
    assert.strictEqual(O.classify(SCOPE + 'js/app/home.js?v=3', SCOPE, SHELL), 'shell');
});

test('classify : les textes de data/ sont des données, même inconnus', () => {
    assert.strictEqual(O.classify(SCOPE + 'data/talmud/shabbat.json', SCOPE, SHELL), 'data');
    assert.strictEqual(O.classify(SCOPE + 'data/siddur/fr/arvit-amida.json', SCOPE, SHELL), 'data');
});

test('classify : le reste passe sans le service worker (autre origine, fichier hors liste, sw.js lui-même)', () => {
    assert.strictEqual(O.classify('https://geocoding-api.open-meteo.com/v1/search?name=Paris', SCOPE, SHELL), 'skip');
    assert.strictEqual(O.classify(SCOPE + 'js/inconnu.js', SCOPE, SHELL), 'skip');
    assert.strictEqual(O.classify(SCOPE + 'sw.js', SCOPE, SHELL), 'skip');
    assert.strictEqual(O.classify('pas une adresse', SCOPE, SHELL), 'skip');
});

test('classify : application servie dans un sous-dossier', () => {
    const scope = 'https://exemple.org/torahaxe/';
    assert.strictEqual(O.classify(scope + 'data/x.json', scope, SHELL), 'data');
    assert.strictEqual(O.classify('https://exemple.org/autre/data/x.json', scope, SHELL), 'skip');
});

test('staleCaches : anciennes coquilles et anciens formats de données, jamais les caches des autres', () => {
    const cur = O.shellCacheName('abc');
    const names = [cur, O.shellCacheName('old'), O.DATA_CACHE, 'torahaxe-data-v0', 'historiaxe-data-v1.0.224', 'autre-app'];
    assert.deepStrictEqual(O.staleCaches(names, cur), [O.shellCacheName('old'), 'torahaxe-data-v0']);
});
