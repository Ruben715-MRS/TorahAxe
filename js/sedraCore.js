// =========================================================================
// === TORAHAXE — LA PARACHA DE LA SEMAINE, CALCULÉE POUR TOUTE DATE (pur, sans DOM, testé) ===
// =========================================================================
// La lecture de la Torah suit un cycle arithmétique, fixé par le calendrier hébraïque : une année hébraïque ne peut avoir que quatorze types de suites de parachiot (embolismique ou
// non, jour de Roch Hachana, année déficiente, régulière ou complète), et Israël diffère de la diaspora dans sept d'entre eux (le 8ᵉ jour de Pessa'h, ou le 2ᵉ de Chavouot, tombe un Chabbat :
// la diaspora lit la fête, Israël la paracha suivante, et la diaspora rattrape son retard en réunissant deux parachiot plus tard). js/sedraTables.js donne ces suites, générées par
// scripts/build_sedra.js d'après @hebcal/core et vérifiées sur toutes les années que le calendrier de l'application sait calculer (1583 à 2400 : 817 années hébraïques, diaspora et Israël, sans
// une seule contradiction entre deux années du même type). Ce fichier n'a que la recherche : l'année du Chabbat, son type, sa place dans la suite.
// Les indices sont ceux de data/torah/parashot.json (0 : Béréchit … 52 : Ha'azinou). Un Chabbat de fête (Roch Hachana, Kippour, Souccot, Pessa'h, Chavouot, Chemini Atséret) n'a pas de paracha
// ordinaire : `null`. Hors des dates que le calendrier sait calculer : `null` aussi (voir `isSupported`).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendarYearCore.js'), require('./hebrewCalendarCore.js'), require('./sedraTables.js'));
    else root.SedraCore = factory(root.CalendarYearCore, root.HebrewCalendarCore, root.SedraTables);
}(typeof self !== 'undefined' ? self : this, function (CY, HC, TABLES) {
    'use strict';

    // Le type d'une année : « L » (embolismique) ou « p » (simple), le jour de Roch Hachana (1 lundi, 2 mardi, 4 jeudi, 6 Chabbat), et la longueur : D, R ou C. Même clé que scripts/build_sedra.js.
    function keyOf(year) {
        var months = HC.monthsOf(year);
        var heshvan = months.filter(function (m) { return m.id === 'Heshvan'; })[0].days, kislev = months.filter(function (m) { return m.id === 'Kislev'; })[0].days;
        var type = heshvan === 30 && kislev === 30 ? 'C' : heshvan === 29 && kislev === 29 ? 'D' : 'R';
        return (HC.leap(year) ? 'L' : 'p') + HC.weekdayOf(CY.hebrewToFixed(year, 'Tishri', 1)) + type;
    }

    var DECODED = {};
    function sequence(key, israel) {
        var t = TABLES[key];
        var str = israel && t.i !== undefined ? t.i : t.d;
        var id = key + (israel && t.i !== undefined ? 'i' : 'd');
        if (!DECODED[id]) DECODED[id] = str.split(',').map(Number);
        return DECODED[id];
    }

    // Peut-on calculer cette date (jour fixe) ? Le calendrier de l'application va de 1583 à 2400.
    function isSupported(fixed) {
        var g;
        try { g = CY.fixedToGregorian(fixed); } catch (e) { return false; }
        return HC.isSupportedGregorian(g.year, g.month, g.day);
    }

    // Les parachiot lues le Chabbat `fixed` (jour fixe d'un samedi) : un tableau d'indices (un, ou deux réunies), ou null (Chabbat de fête, date hors du calendrier, ou pas un samedi).
    // `israel` : le calendrier d'Israël (vrai) ou de la diaspora.
    function parashaOfShabbat(fixed, israel) {
        if (!isSupported(fixed) || HC.weekdayOf(fixed) !== 6) return null;
        var year = HC.hebrewFromFixed(fixed).year;
        var rh = CY.hebrewToFixed(year, 'Tishri', 1);
        var first = rh + ((6 - HC.weekdayOf(rh) + 7) % 7);
        var entry = sequence(keyOf(year), !!israel)[(fixed - first) / 7];
        if (entry === undefined || entry < 0) return null;
        return entry >= 100 ? [entry - 100, entry - 99] : [entry];
    }

    // La paracha de la semaine d'une date civile { year, month, day } : celle du Chabbat qui la suit (ou du jour même, si c'est un Chabbat).
    function parashaOfDate(civil, israel) {
        var fixed = CY.gregorianToFixed(civil.year, civil.month, civil.day);
        return parashaOfShabbat(fixed + ((6 - HC.weekdayOf(fixed) + 7) % 7), israel);
    }

    return { keyOf: keyOf, isSupported: isSupported, parashaOfShabbat: parashaOfShabbat, parashaOfDate: parashaOfDate };
}));
