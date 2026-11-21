'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Z = require('../js/zmanimCore.js');

test('géocodage inverse : le nom de la ville est choisi en priorité', () => {
    assert.strictEqual(Z.parseReverseGeocoding({ city: 'Marseille', locality: '1er Arrondissement', principalSubdivision: 'Provence' }), 'Marseille');
    assert.strictEqual(Z.parseReverseGeocoding({ city: '', locality: 'Allauch', principalSubdivision: 'Provence' }), 'Allauch');
    assert.strictEqual(Z.parseReverseGeocoding({ city: '  ', locality: '', principalSubdivision: 'Provence' }), 'Provence');
});

test('géocodage inverse : une réponse inutilisable donne une chaîne vide', () => {
    assert.strictEqual(Z.parseReverseGeocoding(null), '');
    assert.strictEqual(Z.parseReverseGeocoding({}), '');
    assert.strictEqual(Z.parseReverseGeocoding({ city: 42 }), '');
});
