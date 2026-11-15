// =========================================================================
// === PUR ET IMPUR : ANIMAUX ET ALIMENTS — FILTRES ET RÈGLES (sans DOM) ===
// =========================================================================
// Les données sont dans js/foodLawsData.js ; l'écran dans js/app/foodlaws.js. Ici, ce qui se calcule, testé dans tests/foodLawsCore.test.js :
//  - le tableau des animaux (quadrupèdes, eau, rampants, insectes), filtré par catégorie, statut, signes, texte ;
//  - la liste des oiseaux interdits, filtrée par verset (Lévitique, Deutéronome, les deux) et par texte ;
//  - la vérification des signes d'une sauterelle ;
//  - les mélanges interdits, filtrés par catégorie et par texte.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./foodLawsData.js'));
    else root.FoodLawsCore = factory(root.FoodLawsData);
}(typeof self !== 'undefined' ? self : this, function (Data) {
    'use strict';

    function normalize(text) {
        return String(text == null ? '' : text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe')
            .replace(/[^a-z0-9א-ת]+/g, ' ').trim();
    }
    function active(v) { return v !== undefined && v !== null && v !== '' && v !== 'all'; }
    function stripNiqqud(text) { return String(text || '').replace(/[֑-ׇ]/g, ''); }

    // `f` : { cat, status, signs, query } ; une valeur absente, vide ou « all » ne filtre pas.
    function filterAnimals(f) {
        f = f || {};
        var q = active(f.query) ? normalize(f.query) : '';
        return Data.ANIMALS.filter(function (a) {
            if (active(f.cat) && a.cat !== f.cat) return false;
            if (active(f.status) && a.status !== f.status) return false;
            if (active(f.signs) && a.signs !== f.signs) return false;
            if (q && normalize(a.fr + ' ' + a.he + ' ' + a.note + ' ' + a.ref).indexOf(q) === -1) return false;
            return true;
        });
    }

    // `f` : { source ('lev' | 'dt' | 'both'), query }.
    function filterBirds(f) {
        f = f || {};
        var q = active(f.query) ? normalize(f.query) : '';
        return Data.BIRDS.filter(function (b) {
            if (f.source === 'lev' && !(b.lev && !b.dt)) return false;
            if (f.source === 'dt' && !(b.dt && !b.lev)) return false;
            if (f.source === 'both' && !(b.lev && b.dt)) return false;
            if (q && normalize(b.fr + ' ' + b.he + ' ' + b.note).indexOf(q) === -1) return false;
            return true;
        });
    }

    // Les signes cochés d'une sauterelle : { ok (vrai si les quatre signes de la Torah et de la Michna sont là), missing (les signes absents),
    // nameKnown (le nom « hagav » est le cinquième signe, de Rabbi Yossi, facultatif) }.
    function checkLocust(checked) {
        var set = {};
        (checked || []).forEach(function (id) { set[id] = true; });
        var required = ['legs', 'jump', 'wings', 'cover'];
        var missing = required.filter(function (id) { return !set[id]; });
        return { ok: missing.length === 0, missing: missing, nameKnown: !!set.name };
    }

    // `f` : { cat, query }.
    function filterMixtures(f) {
        f = f || {};
        var q = active(f.query) ? normalize(f.query) : '';
        return Data.MIXTURES.filter(function (m) {
            if (active(f.cat) && m.cat !== f.cat) return false;
            if (q && normalize(m.fr + ' ' + m.he + ' ' + m.text + ' ' + m.ref + ' ' + m.sources).indexOf(q) === -1) return false;
            return true;
        });
    }

    // `f` : { query } ; la liste des poissons du Consistoire, filtrée par nom, alias, exception ou mention.
    function filterFish(f) {
        f = f || {};
        var q = active(f.query) ? normalize(f.query) : '';
        return Data.CONSISTOIRE_POISSONS.filter(function (p) {
            if (q && normalize(p.fr + ' ' + (p.lat || '') + ' ' + (p.alias || '') + ' ' + (p.excl || '') + ' ' + (p.note || '')).indexOf(q) === -1) return false;
            return true;
        });
    }

    // `f` : { query } ; les animaux terrestres contemporains, filtrés par nom, nom latin, groupe ou mention.
    function filterLand(f) {
        f = f || {};
        var q = active(f.query) ? normalize(f.query) : '';
        return Data.LAND_CONTEMPORARY.filter(function (a) {
            if (q && normalize(a.fr + ' ' + (a.lat || '') + ' ' + (Data.LAND_GROUPS[a.group] || '') + ' ' + (a.note || '')).indexOf(q) === -1) return false;
            return true;
        });
    }

    // `f` : { query } ; les oiseaux contemporains réputés casher, filtrés par nom, nom latin, statut ou mention.
    function filterCasherBirds(f) {
        f = f || {};
        var q = active(f.query) ? normalize(f.query) : '';
        return Data.BIRDS_CASHER.filter(function (b) {
            if (q && normalize(b.fr + ' ' + (b.lat || '') + ' ' + (Data.BIRDS_CASHER_STATUS[b.status] || '') + ' ' + (b.note || '')).indexOf(q) === -1) return false;
            return true;
        });
    }

    return { normalize: normalize, stripNiqqud: stripNiqqud, filterAnimals: filterAnimals, filterBirds: filterBirds, checkLocust: checkLocust, filterMixtures: filterMixtures, filterFish: filterFish, filterLand: filterLand, filterCasherBirds: filterCasherBirds };
}));
