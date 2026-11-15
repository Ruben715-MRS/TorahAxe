// =========================================================================
// === LA DIRECTION DU KOTEL : CAP, DISTANCE ET CAP LU SUR UNE BOUSSOLE (calculs purs, sans DOM) ===
// =========================================================================
// On prie face à Jérusalem (en Israël, face au Mont du Temple ; à Jérusalem, face au Mont du Temple). La boussole vise le Kotel (le Mur occidental).
// Deux façons de dire « la direction de Jérusalem » quand on en est loin :
//  - le GRAND CERCLE : le plus court chemin sur la sphère (celui d'un avion) ; le cap initial. C'est le calcul de la plupart des applications ;
//  - la LIGNE DROITE SUR LA CARTE (loxodromie) : un cap constant, tel qu'on le lit sur une carte de Mercator. Pour certains décisionnaires
//    (par exemple, pour l'Amérique du Nord, « vers l'est »), c'est cette direction qui compte.
// De loin, les deux diffèrent de plusieurs dizaines de degrés (New York) : l'écran offre les deux, le grand cercle par défaut, et renvoie à son rabbin.
// Une boussole indique le nord MAGNÉTIQUE : js/geomagCore.js donne l'écart avec le vrai nord (la déclinaison), à corriger.
// Testé dans tests/compassCore.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.CompassCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var RAD = Math.PI / 180;
    // Le Kotel (Mur occidental), Jérusalem.
    var KOTEL = { lat: 31.7767, lon: 35.2345, name: 'Kotel' };
    var EARTH_KM = 6371;

    // Un angle ramené à [0, 360[.
    function norm(deg) { return ((deg % 360) + 360) % 360; }
    // Un écart d'angle ramené à ]−180, 180].
    function signed(deg) { var d = norm(deg); return d > 180 ? d - 360 : d; }

    // Distance sur la sphère (km).
    function distanceKm(lat1, lon1, lat2, lon2) {
        var dLat = (lat2 - lat1) * RAD, dLon = (lon2 - lon1) * RAD;
        var a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.pow(Math.sin(dLon / 2), 2);
        return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    // Le cap initial du grand cercle, en degrés depuis le nord vrai, dans le sens des aiguilles d'une montre.
    function greatCircleBearing(lat1, lon1, lat2, lon2) {
        var p1 = lat1 * RAD, p2 = lat2 * RAD, dl = (lon2 - lon1) * RAD;
        var y = Math.sin(dl) * Math.cos(p2);
        var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
        return norm(Math.atan2(y, x) / RAD);
    }

    // Le cap constant de la loxodromie (la ligne droite d'une carte de Mercator), en degrés depuis le nord vrai.
    function rhumbBearing(lat1, lon1, lat2, lon2) {
        var p1 = lat1 * RAD, p2 = lat2 * RAD, dl = (lon2 - lon1) * RAD;
        if (Math.abs(dl) > Math.PI) dl = dl > 0 ? dl - 2 * Math.PI : dl + 2 * Math.PI;      // par le chemin le plus court en longitude
        var dpsi = Math.log(Math.tan(Math.PI / 4 + p2 / 2) / Math.tan(Math.PI / 4 + p1 / 2));
        return norm(Math.atan2(dl, dpsi) / RAD);
    }

    // La direction du Kotel depuis un lieu : { bearing, distanceKm, here } ; `here` : on est (à moins de 100 m) au Kotel, plus de direction à donner.
    // method : 'great' (grand cercle, défaut) ou 'rhumb' (ligne droite sur la carte).
    function toKotel(lat, lon, method) {
        var km = distanceKm(lat, lon, KOTEL.lat, KOTEL.lon);
        if (km < 0.1) return { bearing: null, distanceKm: km, here: true };
        var bearing = method === 'rhumb' ? rhumbBearing(lat, lon, KOTEL.lat, KOTEL.lon) : greatCircleBearing(lat, lon, KOTEL.lat, KOTEL.lon);
        return { bearing: bearing, distanceKm: km, here: false };
    }

    // Le cap VRAI d'un cap lu sur une boussole (nord magnétique) : on ajoute la déclinaison (positive à l'est).
    function trueHeading(magneticHeading, declination) { return norm(magneticHeading + (declination || 0)); }

    // De combien tourner (degrés, ]−180, 180]) pour faire face à `bearing` quand on regarde dans la direction `heading` : positif : vers la droite.
    function turnBy(bearing, heading) { return signed(bearing - heading); }

    // Une moyenne glissante pour un angle (le saut 359° → 1° ne doit pas faire tourner l'aiguille à l'envers) : `alpha` entre 0 (ne bouge pas) et 1 (brut).
    function smooth(previous, next, alpha) {
        if (previous === null || previous === undefined) return norm(next);
        return norm(previous + alpha * signed(next - previous));
    }

    // Les 16 vents : une clé de traduction (N, NNE… ; O pour l'ouest, comme en français).
    var WINDS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    function wind(deg) { return WINDS[Math.round(norm(deg) / 22.5) % 16]; }

    return {
        KOTEL: KOTEL, WINDS: WINDS, norm: norm, signed: signed, distanceKm: distanceKm,
        greatCircleBearing: greatCircleBearing, rhumbBearing: rhumbBearing, toKotel: toKotel,
        trueHeading: trueHeading, turnBy: turnBy, smooth: smooth, wind: wind
    };
}));
