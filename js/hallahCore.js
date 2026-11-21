// Hafrachat halla : que faire d'une pâte, d'après le poids de farine. Pur : testable sous `npm test`.
// Les seuils sont ceux qu'on cite le plus (en grammes de farine) ; les avis diffèrent, d'où trois paliers et non un chiffre unique :
//   moins de 1 200 g : rien à prélever ; de 1 200 à 1 666 g : on prélève sans bénédiction ; de 1 666 g à 2 250 g : avec bénédiction selon l'usage le plus répandu
//   (le 'Hazon Ich demande 2 250 g) ; à partir de 2 250 g : avec bénédiction, de l'avis de tous.
// Contenu à faire relire par un rabbin : certains usages séfarades et locaux diffèrent.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HallahCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    var MIN = 1200, COMMON = 1666, STRICT = 2250;

    // Le poids saisi (nombre, ou texte avec virgule) et son unité ('g' ou 'kg') en grammes ; null si ce n'est pas un nombre positif.
    function toGrams(value, unit) {
        var n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
        if (!isFinite(n) || n <= 0) return null;
        return Math.round(unit === 'kg' ? n * 1000 : n);
    }

    // Le palier : 'none' | 'noBless' | 'bless' | 'blessAll' (ou null sans poids valide).
    function assess(grams) {
        if (!(grams > 0)) return null;
        if (grams < MIN) return 'none';
        if (grams < COMMON) return 'noBless';
        if (grams < STRICT) return 'bless';
        return 'blessAll';
    }

    return { MIN: MIN, COMMON: COMMON, STRICT: STRICT, toGrams: toGrams, assess: assess };
}));
