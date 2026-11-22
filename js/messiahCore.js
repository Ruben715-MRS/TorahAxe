// =========================================================================
// === LE MACHIAH ET LA RÉSURRECTION DES MORTS — RÈGLES (sans DOM) ===
// =========================================================================
// Les données sont dans js/messiahData.js ; l'écran dans js/app/messiah.js. Ici, ce qui se calcule, testé dans tests/messiahCore.test.js :
//  - le verdict des critères du Rambam (Hilkhot Melakhim 11:4) d'après les cases cochées : aucun, « présumé Machiah » (étape 1 complète),
//    « Machiah certain » (étape 1 et étape 2 complètes), ou « n'est pas le Machiah » (il a échoué ou il a été tué) ;
//  - les étapes de la venue, filtrées par niveau (consensus, opinion, tradition) ;
//  - la recherche d'une étape par son identifiant.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./messiahData.js'));
    else root.MessiahCore = factory(root.MessiahData);
}(typeof self !== 'undefined' ? self : this, function (Data) {
    'use strict';

    function setOf(list) {
        var set = {};
        (list || []).forEach(function (id) { set[id] = true; });
        return set;
    }

    function stageById(id) {
        var stages = Data.CRITERIA.stages;
        for (var i = 0; i < stages.length; i++) if (stages[i].id === id) return stages[i];
        return null;
    }

    // `checked` : les identifiants cochés ; `flags` : { killed (il a été tué), failed (il n'a pas réussi) }.
    // Résultat : { verdict ('none' | 'presume' | 'certain' | 'not'), presume (étape 1 complète), certain (étape 2 complète), missing1, missing2 (identifiants manquants) }.
    // Un critère de l'étape 2 coché sans que l'étape 1 soit complète ne donne pas « certain » : on ne peut être certain sans être d'abord présumé.
    function assess(checked, flags) {
        var set = setOf(checked);
        flags = flags || {};
        var missing1 = stageById('presume').items.map(function (i) { return i.id; }).filter(function (id) { return !set[id]; });
        var missing2 = stageById('certain').items.map(function (i) { return i.id; }).filter(function (id) { return !set[id]; });
        var presume = missing1.length === 0;
        var certain = presume && missing2.length === 0;
        var verdict = 'none';
        if (flags.killed || flags.failed) verdict = 'not';
        else if (certain) verdict = 'certain';
        else if (presume) verdict = 'presume';
        return { verdict: verdict, presume: presume, certain: certain, missing1: missing1, missing2: missing2 };
    }

    // Les étapes de la venue, dans l'ordre ; `level` absent, vide ou « all » : toutes.
    function stepsByLevel(level) {
        return Data.STEPS.filter(function (s) { return !level || level === 'all' || s.level === level; });
    }

    function stepById(id) {
        for (var i = 0; i < Data.STEPS.length; i++) if (Data.STEPS[i].id === id) return Data.STEPS[i];
        return null;
    }

    return { assess: assess, stepsByLevel: stepsByLevel, stepById: stepById, stageById: stageById };
}));
