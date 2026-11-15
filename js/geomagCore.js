// =========================================================================
// === DÉCLINAISON MAGNÉTIQUE (World Magnetic Model 2025, calculs purs, sans DOM) ===
// =========================================================================
// L'écart entre le nord magnétique (celui d'une boussole) et le nord géographique, en degrés (positif : le nord magnétique est à l'EST du vrai nord).
// Sans elle, une boussole se trompe de 12° à New York et de 2° à Marseille : trop pour montrer le Kotel. Le modèle est le WMM 2025 de la NOAA et du
// British Geological Survey (données publiques, valables du 1er janvier 2025 au 31 décembre 2029), évalué par la méthode de son rapport technique
// (harmoniques sphériques de degré 12, fonctions de Legendre de Schmidt, ellipsoïde WGS 84). Les coefficients (G, H : champ principal ; GD, HD : variation
// séculaire par an) sont indexés n(n+1)/2 + m. Hors de la période de validité, l'erreur augmente d'environ 0,1° par an : `valid` le dit.
// Le calcul est vérifié contre les 100 valeurs de référence officielles du modèle pour 2025-2029 (tests/fixtures/wmm2025-test-values.csv, tests/geomagCore.test.js).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.GeomagCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var RAD = Math.PI / 180;
    var EPOCH = 2025.0, VALID_FROM = 2025.0, VALID_TO = 2030.0, N_MAX = 12;
    var G = [0, -29351.8, -1410.8, -2556.6, 2951.1, 1649.3, 1361, -2404.1, 1243.8, 453.6, 895, 799.5, 55.7, -281.1, 12.1, -233.2, 368.9, 187.2, -138.7, -142, 20.9, 64.4, 63.8, 76.9, -115.7, -40.9, 14.9, -60.7, 79.5, -77, -8.8, 59.3, 15.8, 2.5, -11.1, 14.2, 23.2, 10.8, -17.5, 2, -21.7, 16.9, 15, -16.8, 0.9, 4.6, 7.8, 3, -0.2, -2.5, -13.1, 2.4, 8.6, -8.7, -12.9, -1.3, -6.4, 0.2, 2, -1, -0.6, -0.9, 1.5, 0.9, -2.7, -3.9, 2.9, -1.5, -2.5, 2.4, -0.6, -0.1, -0.6, -0.1, 1.1, -1, -0.2, 2.6, -2, -0.2, 0.3, 1.2, -1.3, 0.6, 0.6, 0.5, -0.1, -0.4, -0.2, -1.3, -0.7];
    var H = [0, 0, 4545.4, 0, -3133.6, -815.1, 0, -56.6, 237.5, -549.5, 0, 278.6, -133.9, 212, -375.6, 0, 45.4, 220.2, -122.9, 43, 106.1, 0, -18.4, 16.8, 48.8, -59.8, 10.9, 72.7, 0, -48.9, -14.4, -1, 23.4, -7.4, -25.1, -2.3, 0, 7.1, -12.6, 11.4, -9.7, 12.7, 0.7, -5.2, 3.9, 0, -24.8, 12.2, 8.3, -3.3, -5.2, 7.2, -0.6, 0.8, 10, 0, 3.3, 0, 2.4, 5.3, -9.1, 0.4, -4.2, -3.8, 0.9, -9.1, 0, 0, 2.9, -0.6, 0.2, 0.5, -0.3, -1.2, -1.7, -2.9, -1.8, -2.3, 0, -1.3, 0.7, 1, -1.4, 0, 0.6, -0.1, 0.8, 0.1, -1, 0.1, 0.2];
    var GD = [0, 12, 9.7, -11.6, -5.2, -8, -1.3, -4.2, 0.4, -15.6, -1.6, -2.4, -6, 5.6, -7, 0.6, 1.4, 0, 0.6, 2.2, 0.9, -0.2, -0.4, 0.9, 1.2, -0.9, 0.3, 0.9, 0, -0.1, -0.1, 0.5, -0.1, -0.8, -0.8, 0.8, -0.1, 0.2, 0, 0.5, -0.1, 0.3, 0.2, 0, 0.2, 0, -0.1, 0.1, 0.3, -0.3, 0, 0.3, -0.1, 0.1, -0.1, 0.1, 0, 0.1, 0.1, 0, -0.3, 0, -0.1, -0.1, 0, 0, 0, 0, 0, 0, 0, -0.1, 0, 0, -0.1, -0.1, -0.1, -0.1, 0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0, -0.1, 0, -0.1];
    var HD = [0, 0, -21.5, 0, -27.7, -12.1, 0, 4, -0.3, -4.1, 0, -1.1, 4.1, 1.6, -4.4, 0, -0.5, 2.2, 0.4, 1.7, 1.9, 0, 0.3, -1.6, -0.4, 0.9, 0.7, 0.9, 0, 0.6, 0.5, -0.8, 0, -1, 0.6, -0.2, 0, -0.2, 0.5, -0.4, 0.4, -0.5, -0.6, 0.3, 0.2, 0, -0.3, 0.3, -0.3, 0.3, 0.2, -0.1, -0.2, 0.4, 0.1, 0, 0, 0, -0.2, 0.1, -0.1, 0.1, 0, -0.1, 0.2, 0, 0, 0, 0.1, 0, 0.1, 0, 0, 0.1, 0, 0, 0, 0, 0, 0, 0, -0.1, 0.1, 0, 0, 0, 0, 0, 0, 0, -0.1];
    var A = 6378.137, F = 1 / 298.257223563, RE = 6371.2;
    var E2 = F * (2 - F);

    // Année décimale d'un instant (ms) : 2026,87 pour mi-novembre 2026.
    function decimalYear(ms) {
        var d = new Date(ms), y = d.getUTCFullYear();
        var start = Date.UTC(y, 0, 1), end = Date.UTC(y + 1, 0, 1);
        return y + (ms - start) / (end - start);
    }

    function idx(n, m) { return n * (n + 1) / 2 + m; }

    // Le champ au lieu donné : { declination, inclination, x, y, z, horizontal, total } (degrés, nT). `altKm` : altitude au-dessus de l'ellipsoïde, en km.
    function field(latDeg, lonDeg, altKm, year) {
        var phi = latDeg * RAD, lam = lonDeg * RAD, h = altKm || 0;
        var sinP = Math.sin(phi), cosP = Math.cos(phi);
        var rc = A / Math.sqrt(1 - E2 * sinP * sinP);
        var p = (rc + h) * cosP, z = (rc * (1 - E2) + h) * sinP;
        var r = Math.sqrt(p * p + z * z);
        var phiG = Math.asin(z / r);                                   // latitude géocentrique
        var sinG = Math.sin(phiG), cosG = Math.cos(phiG);
        var dt = year - EPOCH;
        // Fonctions de Legendre de Schmidt et leurs dérivées par rapport à la latitude géocentrique
        var P = [], dP = [], n, m;
        for (n = 0; n <= N_MAX; n++) { P.push(new Array(n + 1).fill(0)); dP.push(new Array(n + 1).fill(0)); }
        P[0][0] = 1; dP[0][0] = 0;
        P[1][0] = sinG; dP[1][0] = cosG;
        P[1][1] = cosG; dP[1][1] = -sinG;
        for (n = 2; n <= N_MAX; n++) {
            for (m = 0; m <= n; m++) {
                if (m === n) {
                    var k = Math.sqrt(1 - 1 / (2 * n));
                    P[n][n] = k * cosG * P[n - 1][n - 1];
                    dP[n][n] = k * (cosG * dP[n - 1][n - 1] - sinG * P[n - 1][n - 1]);
                } else {
                    var den = Math.sqrt(n * n - m * m), sub = Math.sqrt((n - 1) * (n - 1) - m * m);
                    var p2 = n - 2 >= m ? P[n - 2][m] : 0, d2 = n - 2 >= m ? dP[n - 2][m] : 0;
                    P[n][m] = ((2 * n - 1) * sinG * P[n - 1][m] - sub * p2) / den;
                    dP[n][m] = ((2 * n - 1) * (sinG * dP[n - 1][m] + cosG * P[n - 1][m]) - sub * d2) / den;
                }
            }
        }
        var X = 0, Y = 0, Z = 0;                                       // nord, est, bas (géocentriques)
        for (n = 1; n <= N_MAX; n++) {
            var ar = Math.pow(RE / r, n + 2);
            for (m = 0; m <= n; m++) {
                var g = G[idx(n, m)] + GD[idx(n, m)] * dt, hh = H[idx(n, m)] + HD[idx(n, m)] * dt;
                var cm = Math.cos(m * lam), sm = Math.sin(m * lam);
                X -= ar * (g * cm + hh * sm) * dP[n][m];
                Y += ar * m * (g * sm - hh * cm) * P[n][m] / cosG;
                Z -= ar * (n + 1) * (g * cm + hh * sm) * P[n][m];
            }
        }
        var psi = phiG - phi;                                          // retour à la latitude géodésique
        var Xg = X * Math.cos(psi) - Z * Math.sin(psi), Zg = X * Math.sin(psi) + Z * Math.cos(psi);
        var horizontal = Math.sqrt(Xg * Xg + Y * Y);
        return {
            declination: Math.atan2(Y, Xg) / RAD, inclination: Math.atan2(Zg, horizontal) / RAD,
            x: Xg, y: Y, z: Zg, horizontal: horizontal, total: Math.sqrt(horizontal * horizontal + Zg * Zg)
        };
    }

    // La déclinaison (degrés, positive à l'est) en un lieu et à un instant (ms ; maintenant par défaut). `valid` : l'instant est dans la période du modèle.
    function declination(latDeg, lonDeg, ms, altKm) {
        var t = ms === undefined ? Date.now() : ms;
        var year = decimalYear(t);
        return { degrees: field(latDeg, lonDeg, altKm, year).declination, valid: year >= VALID_FROM && year < VALID_TO, year: year };
    }

    return { declination: declination, field: field, decimalYear: decimalYear, EPOCH: EPOCH, VALID_FROM: VALID_FROM, VALID_TO: VALID_TO };
}));
