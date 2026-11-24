// =========================================================================
// === TORAHAXE — LA SANCTION DE CHAQUE COMMANDEMENT DES 613 (données) ===
// =========================================================================
// Pour chacun des 365 commandements négatifs, la sanction que la tradition lui attache, dans l'ordre de la liste de Maïmonide (le même que
// js/commandments613Data.js) : un jeton par commandement. Les 248 commandements positifs n'ont, sauf quatre exceptions (POSITIVE), aucune peine fixée.
//
// Les codes :
//   S   lapidation (séquila)             B   bûcher (séréfa)                H   décapitation (héreg)           N   strangulation (hénèk)
//   K   karet (retranchement, peine du Ciel)                                C   mort par le Ciel (mita bidé chamayim)
//   M   malkout (les 39 coups)           P   réparation en argent, sans coups (« lav » qui a un paiement)      A   'acham et réparation
//   Z   peine du faux témoin (subir ce qu'il voulait faire subir)
//   0a  pas de coups : l'interdit se transgresse sans acte (parole, pensée, abstention)
//   0b  pas de coups : réparable par un commandement positif (« lav hanitak laassé »)
//   0g  pas de peine individuelle : interdit adressé au tribunal, au roi ou au peuple, ou sans portée aujourd'hui
//   E   (positifs) aucune peine fixée par la Torah
// Deux codes se joignent par « + » : « S+K » = lapidation par un tribunal (deux témoins, avertissement) ; sans cela, karet. Un « ? » à la fin marque
// un classement moins sûr, qui doit être revu en premier. La logique générale est celle de la Michna (Makkot 3, Sanhédrin 7-11, Kritout 1) et du
// Rambam (Hilkhot Sanhédrin 18-19) : la malkout est la peine par défaut d'un « lav » commis volontairement, avec acte, sans karet ni peine de mort,
// sans paiement, et sans commandement positif qui répare. Contenu écrit de mémoire : à relire par une personne compétente, commandement par commandement.
// Consommé par js/commandmentsCore.js (testé dans tests/commandmentsSanctions.test.js).

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else root.CommandmentsSanctionsData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Les 365 commandements négatifs : dix jetons par ligne, la ligne de 1 à 10, puis de 11 à 20, etc.
    var NEGATIVE = [
        /*   1 */ '0a?', 'M', 'M', 'M?', 'S+K', 'S+K', 'S+K', 'S+K', 'S+K', 'M?',
        /*  11 */ 'M', 'M', 'M', '0a?', 'S', 'S', '0a', '0a', '0a', '0a',
        /*  21 */ '0a', 'M?', 'M', 'M?', 'M?', 'N', 'N', '0a', '0g', 'M?',
        /*  31 */ 'M', 'M', 'M', 'S', 'M', 'M', 'M', 'M', 'M', 'M',
        /*  41 */ 'M', 'M', 'M', 'M', 'M', 'M?', '0a', '0g?', '0g', 'M?',
        /*  51 */ '0g', 'M', 'M?', '0g', '0g', '0g', 'M', '0g', '0a', 'S+K',
        /*  61 */ 'M', 'M', 'C?', '0a', 'M?', 'M?', '0g', 'C', 'M', 'M',
        /*  71 */ 'M', 'C?', 'C?', 'C', 'C?', 'M?', 'K?', 'M?', 'M?', 'M?',
        /*  81 */ 'M?', 'M?', 'K', 'K', 'K', 'M?', 'M?', 'M?', 'K', 'K',
        /*  91 */ 'M?', 'M', 'M?', 'M', 'M', 'M?', 'M', 'M', 'M?', 'M?',
        /* 101 */ 'M', 'M', 'M', 'M', 'M', 'M', 'M?', 'M?', 'M?', 'M?',
        /* 111 */ 'M?', 'M?', 'M', 'M', 'M', '0b?', '0b', '0b', '0b', '0b',
        /* 121 */ 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'K', 'M',
        /* 131 */ 'K', 'K', 'C', 'M?', 'M?', 'M?', 'M?', 'M?', 'M', 'M?',
        /* 141 */ 'M', 'M', 'M', 'M?', 'M?', 'M', 'M?', 'M?', 'M?', 'M?',
        /* 151 */ 'M?', 'M?', 'M?', 'M?', 'M?', '0a?', 'M?', 'M', 'M', 'M',
        /* 161 */ 'M', 'M', 'C', 'C', 'C?', 'M', 'M', 'M', '0g', '0g',
        /* 171 */ 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M',
        /* 181 */ 'M', 'M', 'M', 'K', 'K', 'M', 'M', 'M', 'M', 'M',
        /* 191 */ 'M', 'M', 'M', 'M?', 'S?', 'K', 'K', 'M?', 'M', '0a?',
        /* 201 */ '0a?', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M?',
        /* 211 */ 'M?', 'M?', 'M?', 'M?', 'M', 'M', 'M', 'M', 'M', 'M',
        /* 221 */ 'M', 'M?', 'M?', 'M?', 'M?', 'M?', 'M?', 'M?', '0a?', 'M',
        /* 231 */ '0a?', '0a', '0b', '0a', 'M?', 'M?', '0a?', 'P?', 'M?', '0b',
        /* 241 */ 'M?', 'M?', 'N', 'P', 'P', 'M?', 'P', '0a', 'A', 'P',
        /* 251 */ '0a', '0a', 'P', 'M?', '0a?', '0a?', 'M?', 'M?', 'M?', '0g',
        /* 261 */ 'M?', 'P?', 'M?', 'M?', 'M', '0a', 'M?', 'M?', '0a', '0a',
        /* 271 */ 'M', 'M?', '0a', 'M?', '0a', '0a', '0a', '0a', '0a', '0a',
        /* 281 */ '0a', '0a?', '0a?', '0a', 'Z', '0a', '0a', '0a', 'H', '0a',
        /* 291 */ '0a', '0a', '0g', '0g', '0g', '0g', '0a', 'M?', '0a?', 'M?',
        /* 301 */ '0a', '0a', '0a', '0a', '0a', '0b', 'M?', 'M?', 'M', '0g',
        /* 311 */ '0g', 'N', '0a?', '0a?', 'M', 'M', 'M', 'S', 'N', 'S+K',
        /* 321 */ 'M?', '0g', 'M', 'M', 'M', 'M', 'K', 'M', 'M', 'S+K',
        /* 331 */ 'S+K', 'K', 'K', 'B?', 'B?', 'B?', 'B', 'B', 'B', 'K',
        /* 341 */ 'K', 'K', 'S+K', 'K', 'K', 'K', 'N+K', 'S+K', 'S+K', 'S+K',
        /* 351 */ 'S+K', 'S+K', 'M', 'M', 'M', 'M', 'M', '0b', '0b', 'M',
        /* 361 */ 'M', '0g', 'M?', 'M?', 'M?'
    ];

    // Les seuls commandements positifs dont l'omission entraîne une peine : le karet (Nombres 9:13 ; Lévitique 23:29 ; Genèse 17:14). Numéro → jeton.
    var POSITIVE = { 55: 'K', 57: 'K', 164: 'K', 215: 'K' };

    return { NEGATIVE: NEGATIVE, POSITIVE: POSITIVE };
});
