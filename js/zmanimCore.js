// =========================================================================
// === LES ZMANIM : HORAIRES HALAKHIQUES D'UN JOUR, POUR N'IMPORTE QUEL LIEU (calculs purs, sans DOM) ===
// =========================================================================
// Un lieu (latitude, longitude, altitude, fuseau IANA) et un jour civil donnent les horaires du jour : aube, lever, fin des temps de la
// Chéma et de la Tefila, midi, Minha, plag, coucher, sortie des étoiles, allumage des bougies, fin de Chabbat. S'y ajoutent, calculés
// sans réseau : le Daf Yomi (Bavli), les Téhilim du mois, Tahanoun ou non, et la fenêtre de Birkat haLevana (le molad).
//
// Méthode : l'algorithme solaire de la NOAA (Meeus, « Astronomical Algorithms »), qui est public. Le soleil atteint une altitude donnée
// (−0,833° au lever et au coucher : demi-disque + réfraction ; −16,1° pour l'aube de Magen Avraham ; etc.) à un instant que l'on affine
// par itérations. Un horaire est un instant (millisecondes UTC) : le fuseau et l'heure d'été ne servent qu'à l'AFFICHAGE (Intl), donc
// aucune table de fuseaux n'est embarquée. Aux latitudes où le soleil ne descend pas assez (été à Tromsø), l'horaire n'existe pas : null,
// jamais une heure inventée.
//
// Le jour est le jour CIVIL du lieu (minuit à minuit, dans son fuseau) ; le jour hébraïque commence au coucher la veille.
// Arrondi à la minute : un moment « avant lequel il faut avoir fini » (fin de la Chéma, de la Tefila, bougies, coucher) est arrondi vers
// le bas ; un moment « à partir duquel c'est permis » (aube, lever, sortie des étoiles) est arrondi vers le haut : on ne se trompe ainsi
// que dans le sens de la prudence (voir roundMinute).
// Contenu halakhique écrit à la main : **à relire par une personne compétente**. Testé dans tests/zmanimCore.test.js. Écran : js/app/zmanim.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendarYearCore.js'), require('./hebrewCalendarCore.js'));
    else root.ZmanimCore = factory(root.CalendarYearCore, root.HebrewCalendarCore);
}(typeof self !== 'undefined' ? self : this, function (CY, HC) {
    'use strict';

    var MIN = 60000, HOUR = 3600000, DAY = 86400000;
    var RAD = Math.PI / 180, DEG = 180 / Math.PI;

    // --- Fuseaux : décalage d'un fuseau IANA à un instant, par Intl (heure d'été comprise) -------------------------------------------
    var formatters = {};
    function formatterFor(tz) {
        if (!formatters[tz]) {
            formatters[tz] = new Intl.DateTimeFormat('en-US', {
                timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
            });
        }
        return formatters[tz];
    }

    // Un fuseau est-il reconnu par Intl ? (une saisie fausse ne doit pas faire planter l'écran)
    function isValidTimeZone(tz) {
        if (typeof tz !== 'string' || !tz) return false;
        try { formatterFor(tz).format(0); return true; } catch (e) { return false; }
    }

    // Décalage en millisecondes (heure locale − UTC) du fuseau à l'instant `utcMs`.
    function tzOffsetMs(tz, utcMs) {
        var parts = {};
        formatterFor(tz).formatToParts(new Date(utcMs)).forEach(function (p) { parts[p.type] = p.value; });
        var asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
        return asUtc - Math.floor(utcMs / 1000) * 1000;
    }

    // L'instant UTC où il est `hour` heures (locales) le jour civil y-m-d, dans le fuseau.
    function localToUtc(tz, y, m, d, hour) {
        var wall = Date.UTC(y, m - 1, d, hour);
        var guess = wall - tzOffsetMs(tz, wall);
        return wall - tzOffsetMs(tz, guess);
    }

    // Le jour civil { year, month, day } d'un instant, dans le fuseau.
    function civilDateOf(tz, utcMs) {
        var local = new Date(utcMs + tzOffsetMs(tz, utcMs));
        return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate() };
    }

    // --- Le soleil (NOAA / Meeus) -------------------------------------------------------------------------------------------------------
    function julianCentury(utcMs) { return (utcMs / DAY + 2440587.5 - 2451545) / 36525; }

    // Déclinaison du soleil (degrés) et équation du temps (minutes) à un instant.
    function sunAt(utcMs) {
        var T = julianCentury(utcMs);
        var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
        var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
        var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
        var C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
            Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
        var omega = 125.04 - 1934.136 * T;
        var lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
        var eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(omega * RAD);
        var decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) * DEG;
        var y = Math.pow(Math.tan(eps * RAD / 2), 2);
        var eqt = 4 * DEG * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) -
            0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
        return { decl: decl, eqt: eqt };
    }

    // Le midi solaire (instant UTC) le plus proche du midi civil du jour, au lieu donné.
    function solarNoon(place, y, m, d) {
        var civilNoon = localToUtc(place.tz, y, m, d, 12);
        var t = civilNoon;
        for (var i = 0; i < 3; i++) {
            var s = sunAt(t);
            var base = Date.UTC(y, m - 1, d) + (720 - 4 * place.lon - s.eqt) * MIN;
            var shift = Math.round((civilNoon - base) / DAY);
            t = base + shift * DAY;
        }
        return t;
    }

    // L'instant où le soleil atteint `altitude` degrés (négative : sous l'horizon), `rising` : vrai le matin, faux le soir.
    // null si le soleil n'y arrive pas ce jour-là (nuit blanche, jour polaire).
    function solarEvent(place, y, m, d, altitude, rising) {
        var noon = solarNoon(place, y, m, d);
        var eqNoon = sunAt(noon).eqt;
        var t = noon;
        for (var i = 0; i < 4; i++) {
            var s = sunAt(t);
            var cosH = (Math.sin(altitude * RAD) - Math.sin(place.lat * RAD) * Math.sin(s.decl * RAD)) / (Math.cos(place.lat * RAD) * Math.cos(s.decl * RAD));
            if (cosH < -1 || cosH > 1 || isNaN(cosH)) return null;
            var hourAngle = Math.acos(cosH) * DEG;
            t = noon + (eqNoon - s.eqt) * MIN + (rising ? -1 : 1) * hourAngle * 4 * MIN;
        }
        return Math.round(t);
    }

    // --- Les opinions (réglages) ---------------------------------------------------------------------------------------------------------
    // Altitude du soleil au lever et au coucher visibles : −0,833° (demi-disque + réfraction) ; l'altitude du lieu l'abaisse un peu.
    var SUNRISE_ALTITUDE = -0.8333;
    function horizonAltitude(elevation) { return SUNRISE_ALTITUDE - (elevation > 0 ? 0.02933 * Math.sqrt(elevation) : 0); }

    // L'aube : en degrés sous l'horizon, en minutes fixes, ou en minutes zmaniyot avant le lever. Sert aussi, symétrique, à la base de Magen Avraham.
    var DAWN_OPINIONS = {
        deg161: { deg: 16.1 },   // Rav Posen (défaut)
        prop72: { zm: 72 },      // 72 minutes zmaniyot (« proportionnelles »), Rav Ovadia Yossef
        deg19: { deg: 19.75 },   // 'Hazon Ich
        deg18: { deg: 18 },      // crépuscule astronomique
        min72: { min: 72 },      // minutes fixes
        min90: { min: 90 }
    };
    // La sortie des étoiles (Tzeit haCokhavim), la fin de Chabbat (Havdala) et la nuit de Rabénou Tam.
    var NIGHT_OPINIONS = {
        deg85: { deg: 8.5 },     // le plus répandu pour la fin de Chabbat
        deg7083: { deg: 7.083 }, // trois étoiles moyennes : sortie des étoiles
        deg161: { deg: 16.1 },   // Rabénou Tam, en degrés
        deg6: { deg: 6 },
        min30: { min: 30 },
        min40: { min: 40 },
        min42: { min: 42 },
        min50: { min: 50 },
        min72: { min: 72 },      // Rabénou Tam, en minutes fixes
        prop72: { zm: 72 },      // 72 minutes zmaniyot (« proportionnelles »), Rav Ovadia Yossef
        zm135: { zm: 13.5 }      // 13,5 minutes zmaniyot après le coucher, Rav Ovadia Yossef
    };
    // Minha Guedola : « lahumra » (le plus tardif de 30 minutes fixes et d'une demi-heure zmanit, défaut), une demi-heure zmanit, ou 30 minutes fixes.
    var GUEDOLA_OPINIONS = { lahumra: 'lahumra', halfHour: 'halfHour', fixed30: 'fixed30' };
    // Misheyakir (début des téfilin et de la Chéma) : 11° (défaut), 10,2° (Otsrot Yérouchalayim), ou 6 minutes zmaniyot après l'aube (Rav Ovadia Yossef).
    var MISHEYAKIR_OPINIONS = { deg11: 11, deg102: 10.2, alot6: 0 };   // alot6 : 6 minutes zmaniyot après l'aube (voir zmanim)

    // tzeit : la sortie des étoiles ; havdalah : la fin de Chabbat et des fêtes ; rabbenuTam : la nuit de Rabénou Tam.
    var DEFAULTS = { elevation: 'yes', dawn: 'deg161', maBasis: 'deg161', tzeit: 'deg7083', havdalah: 'deg85', rabbenuTam: 'deg161', misheyakir: 'deg11', guedola: 'lahumra', chatzotLayla: 'chatzot12', candles: 'auto' };

    // Un lieu en Israël (cadre grossier) : sert aux défauts (bougies, jours de fête, Tahanoun), jamais à un calcul d'horaire.
    function inIsrael(place) {
        return place.lat >= 29.45 && place.lat <= 33.35 && place.lon >= 34.2 && place.lon <= 35.9;
    }
    function distanceKm(lat1, lon1, lat2, lon2) {
        var dLat = (lat2 - lat1) * RAD, dLon = (lon2 - lon1) * RAD;
        var a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.pow(Math.sin(dLon / 2), 2);
        return 6371 * 2 * Math.asin(Math.sqrt(a));
    }

    // Les minutes avant le coucher pour allumer les bougies : Jérusalem 40, Haïfa 30, ailleurs en Israël 20, diaspora 18 (la coutume la plus courante).
    function candleMinutes(place, setting) {
        if (typeof setting === 'number') return setting;
        if (distanceKm(place.lat, place.lon, 31.778, 35.235) <= 20) return 40;
        if (distanceKm(place.lat, place.lon, 32.794, 34.99) <= 12) return 30;
        if (inIsrael(place)) return 20;
        return 18;
    }

    // --- Les horaires d'un jour ----------------------------------------------------------------------------------------------------------
    // Un moment défini par une règle : { deg } degrés sous l'horizon ; { min } minutes fixes ; { zm } minutes ZMANIYOT (« proportionnelles » : 1/60
    // d'une heure zmanit du Gra, donc 72 minutes zmaniyot = 1,2 heure zmanit, ce que prend le calendrier de Rav Ovadia Yossef).
    function at(place, y, m, d, rule, rising, sunrise, sunset) {
        if (rule.deg !== undefined) return solarEvent(place, y, m, d, -rule.deg, rising);
        if (sunrise === null || sunset === null) return null;
        var offset = rule.zm !== undefined ? rule.zm * (sunset - sunrise) / 12 / 60 : rule.min * MIN;
        return rising ? sunrise - offset : sunset + offset;
    }
    function add(base, ms) { return base === null ? null : base + ms; }

    // Les horaires du jour civil y-m-d au lieu `place` { lat, lon, elevation, tz }. Tous les champs sont des instants UTC (ms) ou null.
    //  netz, shkia : lever et coucher visibles (altitude du lieu comprise) ; les heures zmaniyot se calculent, elles, au niveau de la mer.
    //  shaaGra, shaaMa : la durée d'une heure zmanit, en minutes.
    function zmanim(place, y, m, d, opts) {
        var o = Object.assign({}, DEFAULTS, opts || {});
        var dawn = DAWN_OPINIONS[o.dawn] || DAWN_OPINIONS[DEFAULTS.dawn];
        var starsRule = NIGHT_OPINIONS[o.tzeit] || NIGHT_OPINIONS[DEFAULTS.tzeit];
        var havdalahRule = NIGHT_OPINIONS[o.havdalah] || NIGHT_OPINIONS[DEFAULTS.havdalah];
        var tam = NIGHT_OPINIONS[o.rabbenuTam] || NIGHT_OPINIONS[DEFAULTS.rabbenuTam];
        var misheyakirDeg = MISHEYAKIR_OPINIONS[o.misheyakir] || MISHEYAKIR_OPINIONS[DEFAULTS.misheyakir];
        var maRule = DAWN_OPINIONS[o.maBasis] || DAWN_OPINIONS[DEFAULTS.maBasis];
        // « Utiliser l'altitude » : non → le lever et le coucher sont ceux du niveau de la mer.
        var elevation = o.elevation !== 'no' && place.elevation > 0 ? place.elevation : 0;

        var seaRise = solarEvent(place, y, m, d, SUNRISE_ALTITUDE, true);
        var seaSet = solarEvent(place, y, m, d, SUNRISE_ALTITUDE, false);
        var netz = elevation > 0 ? solarEvent(place, y, m, d, horizonAltitude(elevation), true) : seaRise;
        var shkia = elevation > 0 ? solarEvent(place, y, m, d, horizonAltitude(elevation), false) : seaSet;
        var out = { netz: netz, shkia: shkia, shaaGra: null, shaaMa: null };

        var alot = at(place, y, m, d, dawn, true, seaRise, seaSet);
        // Magen Avraham : l'aube et le soir d'une MÊME opinion (réglage « maBasis », indépendant de l'aube affichée).
        var maDawn = at(place, y, m, d, maRule, true, seaRise, seaSet);
        var maDusk = at(place, y, m, d, maRule, false, seaRise, seaSet);
        out.alot = alot;
        if (o.misheyakir === 'alot6') out.misheyakir = alot === null || seaRise === null || seaSet === null ? null : alot + 6 * (seaSet - seaRise) / 12 / 60;   // 6 minutes zmaniyot après l'aube
        else out.misheyakir = solarEvent(place, y, m, d, -misheyakirDeg, true);
        out.tzeit = at(place, y, m, d, starsRule, false, seaRise, seaSet);
        out.rabbenuTam = at(place, y, m, d, tam, false, seaRise, seaSet);

        if (seaRise !== null && seaSet !== null) {
            var gra = (seaSet - seaRise) / 12;
            out.shaaGra = gra / MIN;
            out.chatzot = seaRise + 6 * gra;
            out.shemaGra = seaRise + 3 * gra;
            out.tefilaGra = seaRise + 4 * gra;
            // « lahumra » (par rigueur) : le plus tardif de 30 minutes fixes et d'une demi-heure zmanit.
            out.minchaGedola = o.guedola === 'halfHour' ? out.chatzot + gra / 2 : o.guedola === 'fixed30' ? out.chatzot + 30 * MIN : out.chatzot + Math.max(30 * MIN, gra / 2);
            out.minchaKetana = seaRise + 9.5 * gra;
            out.plag = seaRise + 10.75 * gra;
            out.chatzotLayla = out.chatzot + 12 * HOUR;
            if (o.chatzotLayla === 'stars6') out.chatzotLayla = out.tzeit === null ? null : out.tzeit + 6 * HOUR;   // Breslev : 6 heures après la sortie des étoiles
        } else {
            ['shemaGra', 'tefilaGra', 'chatzot', 'minchaGedola', 'minchaKetana', 'plag', 'chatzotLayla'].forEach(function (k) { out[k] = null; });
        }
        if (maDawn !== null && maDusk !== null) {
            var ma = (maDusk - maDawn) / 12;
            out.shaaMa = ma / MIN;
            out.shemaMa = maDawn + 3 * ma;
            out.tefilaMa = maDawn + 4 * ma;
        } else {
            out.shemaMa = null; out.tefilaMa = null;
        }
        out.candles = shkia === null ? null : shkia - candleMinutes(place, o.candles) * MIN;
        out.havdalah = at(place, y, m, d, havdalahRule, false, seaRise, seaSet);
        return out;
    }

    // --- Le 'hamets, la veille de Pessa'h (14 Nisan) ---------------------------------------------------------------------------------------------
    // Les dernières heures pour MANGER le 'hamets et pour le BRÛLER, selon trois usages, calculés comme dans CalJ (formules retrouvées sur des relevés de
    // trois lieux et saisons : Marseille 2026 et 2027, New York 2027 ; 36 valeurs à une minute près) :
    //  - Habad : la fin de la 4e (manger) et de la 5e (brûler) heure zmanit du Gra, à partir du lever ;
    //  - Rav Posen : les heures dont la durée est celle d'un douzième du temps qui va de l'aube (16,1°) à la sortie des étoiles (7,083°), comptées depuis l'aube ;
    //  - Rav Ovadia Yossef : depuis l'aube de 72 minutes proportionnelles, avec l'heure de Magen Avraham à 16,1° (un douzième du temps de l'aube à la nuit de 16,1°).
    // Des limites (« avant lesquelles »), donc arrondies vers le bas. Fixes : elles ne suivent pas les opinions réglées pour les autres horaires.
    // Retourne { habad, posen, ovadia } : chacun { eat, burn } (instants UTC, ou null).
    function hametsTimes(place, y, m, d) {
        var rise = solarEvent(place, y, m, d, SUNRISE_ALTITUDE, true), set = solarEvent(place, y, m, d, SUNRISE_ALTITUDE, false);
        var none = { eat: null, burn: null };
        if (rise === null || set === null) return { habad: none, posen: none, ovadia: none };
        var gra = (set - rise) / 12;
        var alot161 = solarEvent(place, y, m, d, -16.1, true), dusk161 = solarEvent(place, y, m, d, -16.1, false), stars = solarEvent(place, y, m, d, -7.083, false);
        var out = { habad: { eat: rise + 4 * gra, burn: rise + 5 * gra }, posen: none, ovadia: none };
        if (alot161 !== null && stars !== null) {
            var posenHour = (stars - alot161) / 12;
            out.posen = { eat: alot161 + 4 * posenHour, burn: alot161 + 5 * posenHour };
        }
        if (alot161 !== null && dusk161 !== null) {
            var maHour = (dusk161 - alot161) / 12, alot72 = rise - 1.2 * gra;
            out.ovadia = { eat: alot72 + 4 * maHour, burn: alot72 + 5 * maHour };
        }
        ['habad', 'posen', 'ovadia'].forEach(function (k) { out[k] = { eat: roundMinute(out[k].eat, 'floor'), burn: roundMinute(out[k].burn, 'floor') }; });
        return out;
    }

    // Arrondi à la minute (un instant → un instant). 'floor' : vers le bas, 'ceil' : vers le haut, 'round' : au plus proche.
    function roundMinute(ms, mode) {
        if (ms === null || ms === undefined) return null;
        var q = ms / MIN;
        return (mode === 'floor' ? Math.floor(q) : mode === 'ceil' ? Math.ceil(q) : Math.round(q)) * MIN;
    }
    // Le sens d'arrondi de chaque horaire (voir l'en-tête) : prudence.
    var ROUNDING = {
        alot: 'ceil', misheyakir: 'ceil', netz: 'ceil', shemaMa: 'floor', shemaGra: 'floor', tefilaMa: 'floor', tefilaGra: 'floor',
        chatzot: 'round', minchaGedola: 'ceil', minchaKetana: 'ceil', plag: 'ceil', shkia: 'floor', tzeit: 'ceil', rabbenuTam: 'ceil',
        chatzotLayla: 'round', candles: 'floor', havdalah: 'ceil'
    };
    function rounded(z, key) { return roundMinute(z[key], ROUNDING[key] || 'round'); }

    // « 07:26 », dans le fuseau du lieu. null → « — ».
    function formatTime(ms, tz, locale) {
        if (ms === null || ms === undefined) return '—';
        return new Intl.DateTimeFormat(locale || 'fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
    }
    // Une durée en minutes : « 0:49 ».
    function formatDuration(minutes) {
        if (minutes === null || minutes === undefined) return '—';
        var total = Math.floor(minutes + 1e-9);
        return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
    }

    // --- Chabbat ---------------------------------------------------------------------------------------------------------------------------
    // Le Chabbat qui suit (ou qui est) le jour civil donné : { friday, saturday, candles, havdalah } (instants arrondis) ; les dates sont des jours civils.
    function shabbatOf(place, y, m, d, opts) {
        var o = Object.assign({}, DEFAULTS, opts || {});
        var noon = Date.UTC(y, m - 1, d);
        var weekday = new Date(noon).getUTCDay();
        var toFriday = (5 - weekday + 7) % 7;
        if (weekday === 6) toFriday = -1;                       // un samedi : le Chabbat du jour
        var fri = new Date(noon + toFriday * DAY), sat = new Date(noon + (toFriday + 1) * DAY);
        var zf = zmanim(place, fri.getUTCFullYear(), fri.getUTCMonth() + 1, fri.getUTCDate(), o);
        var zs = zmanim(place, sat.getUTCFullYear(), sat.getUTCMonth() + 1, sat.getUTCDate(), o);
        return {
            friday: { year: fri.getUTCFullYear(), month: fri.getUTCMonth() + 1, day: fri.getUTCDate() },
            saturday: { year: sat.getUTCFullYear(), month: sat.getUTCMonth() + 1, day: sat.getUTCDate() },
            candles: rounded(zf, 'candles'),
            havdalah: rounded(zs, 'havdalah')
        };
    }

    // --- Daf Yomi (Talmud de Babylone, cycle de 2 711 jours) ---------------------------------------------------------------------------
    // Le 14e cycle a commencé le 5 janvier 2020 par Bérakhot 2. [nom, hébreu, dernière page, première page (2 par défaut)] (Shekalim : Talmud de Jérusalem).
    // Méïla, Kinnim, Tamid et Midot se suivent dans la numérotation du Chass : Méïla 2-22, Kinnim 23-25, Tamid 26-33, Midot 34-37. Total : 2 711 dapim.
    var MASECHTOT = [
        ['Berakhot', 'ברכות', 64], ['Shabbat', 'שבת', 157], ['Erouvin', 'עירובין', 105], ['Pessa\'him', 'פסחים', 121], ['Shekalim', 'שקלים', 22],
        ['Yoma', 'יומא', 88], ['Soucca', 'סוכה', 56], ['Beitsa', 'ביצה', 40], ['Roch Hachana', 'ראש השנה', 35], ['Taanit', 'תענית', 31],
        ['Méguila', 'מגילה', 32], ['Moed Katan', 'מועד קטן', 29], ['\'Haguiga', 'חגיגה', 27], ['Yévamot', 'יבמות', 122], ['Ketoubot', 'כתובות', 112],
        ['Nédarim', 'נדרים', 91], ['Nazir', 'נזיר', 66], ['Sota', 'סוטה', 49], ['Guittin', 'גיטין', 90], ['Kidouchin', 'קידושין', 82],
        ['Bava Kama', 'בבא קמא', 119], ['Bava Metsia', 'בבא מציעא', 119], ['Bava Batra', 'בבא בתרא', 176], ['Sanhédrin', 'סנהדרין', 113],
        ['Makkot', 'מכות', 24], ['Chévouot', 'שבועות', 49], ['Avoda Zara', 'עבודה זרה', 76], ['Horayot', 'הוריות', 14], ['Zévahim', 'זבחים', 120],
        ['Menahot', 'מנחות', 110], ['\'Houlin', 'חולין', 142], ['Békhorot', 'בכורות', 61], ['Arakhin', 'ערכין', 34], ['Temoura', 'תמורה', 34],
        ['Kérétot', 'כריתות', 28], ['Méïla', 'מעילה', 22], ['Kinnim', 'קינים', 25, 23], ['Tamid', 'תמיד', 33, 26], ['Midot', 'מידות', 37, 34], ['Nidda', 'נדה', 73]
    ];
    var DAF_CYCLE_START = CY.gregorianToFixed(2020, 1, 5);
    var DAF_CYCLE_LENGTH = MASECHTOT.reduce(function (n, m) { return n + m[2] - (m[3] || 2) + 1; }, 0);

    // Le Daf Yomi d'un jour (jour fixe) : { masechet, he, daf, last, daysLeft (jours avant la fin du traité, 0 le dernier jour), cycle }.
    // null avant le 5 janvier 2020 (les cycles précédents n'avaient pas la même numérotation).
    function dafYomi(fixed) {
        if (fixed < DAF_CYCLE_START) return null;
        var offset = (fixed - DAF_CYCLE_START) % DAF_CYCLE_LENGTH;
        var cycle = 14 + Math.floor((fixed - DAF_CYCLE_START) / DAF_CYCLE_LENGTH);
        for (var i = 0; i < MASECHTOT.length; i++) {
            var first = MASECHTOT[i][3] || 2;
            var pages = MASECHTOT[i][2] - first + 1;
            if (offset < pages) return { id: i, masechet: MASECHTOT[i][0], he: MASECHTOT[i][1], daf: offset + first, last: MASECHTOT[i][2], daysLeft: pages - 1 - offset, cycle: cycle };
            offset -= pages;
        }
        return null;
    }

    // --- Téhilim du mois ---------------------------------------------------------------------------------------------------------------
    // La division en 30 jours, de loin la plus répandue : [début, fin], les numéros de Psaumes ; [119, 1, 96] : un psaume coupé.
    var TEHILIM_DAYS = [
        [1, 9], [10, 17], [18, 22], [23, 28], [29, 34], [35, 38], [39, 43], [44, 48], [49, 54], [55, 59], [60, 65], [66, 68], [69, 71], [72, 76], [77, 78],
        [79, 82], [83, 87], [88, 89], [90, 96], [97, 103], [104, 105], [106, 107], [108, 112], [113, 118], [119, 1, 96], [119, 97, 176], [120, 134],
        [135, 139], [140, 144], [145, 150]
    ];
    // Les Téhilim du jour hébraïque `day` d'un mois de `monthDays` jours : un mois de 29 jours réunit les jours 29 et 30 sur le 29e.
    function tehilimOfDay(day, monthDays) {
        if (monthDays === 29 && day === 29) return [TEHILIM_DAYS[28][0], TEHILIM_DAYS[29][1]];
        return TEHILIM_DAYS[day - 1] || null;
    }

    // --- Tahanoun ------------------------------------------------------------------------------------------------------------------------
    // Vrai si l'on ne dit pas Tahanoun ce jour-là (Chaharit et Minha). `israel` : jours de fête d'Israël (un jour de moins en Tishri).
    // La liste est celle des jours où tous s'accordent ; les coutumes qui diffèrent (par exemple la fin de la période de Roch Hachana à Souccot
    // chez les ashkénazes) ne sont pas prises en compte. Contenu à relire par une personne compétente.
    function noTachanun(fixed, israel) {
        var h = HC.hebrewFromFixed(fixed);
        var m = h.month, dd = h.day;
        var leap = HC.leap(h.year);
        if (HC.weekdayOf(fixed) === 6) return true;                         // Chabbat
        if (dd === 1 || dd === 30) return true;                             // Roch 'Hodesh (le 30 est son premier jour)
        if (m === 'Nisan') return true;                                     // tout Nisan
        if (m === 'Iyar' && (dd === 14 || dd === 18)) return true;         // Pessa'h Chéni, Lag baOmer
        if (m === 'Sivan' && dd <= 12) return true;                         // du 1er au 12 Sivan
        if (m === 'Av' && (dd === 9 || dd === 15)) return true;             // Tich'a beAv, Tou beAv
        if (m === 'Shevat' && dd === 15) return true;                       // Tou biChvat
        if (m === 'Kislev' && dd >= 25) return true;                        // Hanouka
        if (m === 'Tevet') {
            var kislevDays = HC.monthsOf(h.year).filter(function (x) { return x.id === 'Kislev'; })[0].days;
            if (dd <= (kislevDays === 30 ? 2 : 3)) return true;             // fin de Hanouka : 2 Tevet, ou 3 si Kislev n'a que 29 jours
        }
        if (leap && m === 'Adar' && (dd === 14 || dd === 15)) return true;                 // Pourim Katan (Adar I)
        if (m === (leap ? 'AdarII' : 'Adar') && (dd === 14 || dd === 15)) return true;    // Pourim, Chouchan Pourim
        if (m === 'Tishri') {
            if (dd <= 2 || dd === 9 || dd === 10) return true;              // Roch Hachana, veille et jour de Kippour
            if (dd >= 15 && dd <= (israel ? 23 : 24)) return true;          // Souccot jusqu'à Isrou 'Hag
        }
        return false;
    }

    // Tahanoun du jour : 'no' (jamais), 'morning' (le matin seulement : la veille d'un jour sans Tahanoun, c'est-à-dire le vendredi, la veille de
    // fête, de Roch 'Hodesh, de Pourim, Hanouka, Tou Bichvat, Lag baOmer… on ne le dit pas à Minha) ou 'yes'.
    function tachanunStatus(fixed, israel) {
        if (noTachanun(fixed, israel)) return 'no';
        return noTachanun(fixed + 1, israel) ? 'morning' : 'yes';
    }

    // --- Le molad et Birkat haLevana -----------------------------------------------------------------------------------------------------
    // Le molad (la « nouvelle lune » moyenne) d'un mois hébraïque, en temps moyen de Jérusalem, converti en instant UTC.
    // Constantes de la tradition : mois moyen de 29 j 12 h 793 'helakim ; première molad de l'ère à −876/25920 jour de minuit (Reingold et Dershowitz).
    var MONTH_DAYS = 29 + 13753 / 25920;
    var HEBREW_EPOCH = -1373427;
    var JERUSALEM_MEAN_OFFSET_MS = 35.2354 * 4 * MIN;      // le temps moyen de Jérusalem avance de 2 h 20 min 56 s sur UTC
    function moladOf(year, month) {
        var list = HC.monthsOf(year);
        var index = 0;
        for (var i = 0; i < list.length; i++) if (list[i].id === month) index = i;
        var elapsed = Math.floor((235 * year - 234) / 19) + index;
        var days = HEBREW_EPOCH - 876 / 25920 + elapsed * MONTH_DAYS;
        return Math.round((days - 719163) * DAY - JERUSALEM_MEAN_OFFSET_MS);
    }

    var HALF_MONTH_MS = (765433 / 2) * (DAY / 25920);       // 14 j 18 h 22 min 1 2/3 s

    // La fenêtre de Birkat haLevana pour la molad d'un mois : de `start` à `end` (instants UTC). `waitDays` : 7 (séfarade, le Mékhaber) ou 3.
    function levanaWindow(year, month, waitDays) {
        var molad = moladOf(year, month);
        return { molad: molad, start: molad + (waitDays || 7) * DAY, end: molad + HALF_MONTH_MS };
    }

    // La fenêtre en soirées pour un lieu : de la première soirée à la dernière, comme jours civils { year, month, day }. Une soirée compte si sa
    // nuit (de la sortie des étoiles à l'aube du lendemain) recoupe la fenêtre : on peut dire la bénédiction jusqu'à l'aube. null s'il n'y en a aucune.
    function levanaEvenings(place, win, opts) {
        var first = civilDateOf(place.tz, win.start);
        var best = null, last = null;
        for (var i = -1; i < 20; i++) {
            var base = new Date(Date.UTC(first.year, first.month - 1, first.day) + i * DAY);
            var next = new Date(base.getTime() + DAY);
            var z = zmanim(place, base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), opts);
            var zNext = zmanim(place, next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), opts);
            var nightStart = rounded(z, 'tzeit'), nightEnd = rounded(zNext, 'alot');
            if (nightStart === null || nightEnd === null) continue;
            if (nightStart <= win.end && nightEnd >= win.start) {
                var day = { year: base.getUTCFullYear(), month: base.getUTCMonth() + 1, day: base.getUTCDate() };
                if (!best) best = day;
                last = day;
            }
        }
        return best ? { first: best, last: last } : null;
    }

    // --- Les hilloulot ---------------------------------------------------------------------------------------------------------------------
    // La hilloula d'un maître est l'anniversaire de son décès selon le calendrier HÉBRAÏQUE (data/hilloulot/hilloulot.json, voir scripts/hilloulot/build.js :
    // les dates « documentées » y sont vérifiées contre Wikidata). Les entrées d'Adar : celui qui est mort en Adar d'une année ordinaire est commémoré en
    // Adar II d'une année embolismique ; celui qui est mort en Adar II l'est en Adar d'une année ordinaire. Un mois de 29 jours n'a pas de 30 : on
    // ne déplace pas ces jours-là (aucune entrée ne tombe un 30).
    function hilloulotFor(entries, hebrew) {
        if (!Array.isArray(entries)) return [];
        var leap = HC.leap(hebrew.year);
        var adarLike = hebrew.month === 'Adar' || hebrew.month === 'AdarII';
        return entries.filter(function (e) {
            if (e.day !== hebrew.day) return false;
            if (adarLike && (e.month === 'Adar' || e.month === 'AdarII')) return leap ? hebrew.month === 'AdarII' : hebrew.month === 'Adar';
            return e.month === hebrew.month;
        });
    }

    // --- Les lieux -------------------------------------------------------------------------------------------------------------------------
    // Un lieu valide { name, lat, lon, elevation, tz }, ou null : une position enregistrée ou saisie ne doit jamais faire planter un calcul.
    function normalizePlace(p) {
        if (!p || typeof p !== 'object') return null;
        var lat = Number(p.lat), lon = Number(p.lon), elevation = Number(p.elevation || 0);
        if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
        if (!isValidTimeZone(p.tz)) return null;
        return {
            name: String(p.name || '').slice(0, 120),
            lat: lat, lon: lon,
            elevation: isFinite(elevation) ? Math.min(9000, Math.max(0, elevation)) : 0,
            tz: p.tz
        };
    }

    // La réponse du service de géocodage Open-Meteo (https://geocoding-api.open-meteo.com/v1/search) → des lieux. Ce service renvoie, pour
    // chaque résultat, le nom, le pays, la région, les coordonnées, l'altitude et le fuseau IANA : de quoi calculer sans autre table.
    function parseGeocoding(json) {
        var list = json && Array.isArray(json.results) ? json.results : [];
        var out = [];
        list.forEach(function (r) {
            var place = normalizePlace({ name: r.name, lat: r.latitude, lon: r.longitude, elevation: r.elevation, tz: r.timezone });
            if (!place) return;
            var where = [r.admin1, r.country].filter(function (x) { return x && x !== r.name; });
            out.push({ place: place, detail: where.join(', '), id: r.id });
        });
        return out;
    }

    // La réponse d'un service de géocodage inverse (BigDataCloud « reverse-geocode-client ») → le nom de la localité, ou '' si rien d'utilisable.
    function parseReverseGeocoding(json) {
        if (!json || typeof json !== 'object') return '';
        var name = [json.city, json.locality, json.principalSubdivision].map(function (x) { return typeof x === 'string' ? x.trim() : ''; }).filter(Boolean)[0];
        return name ? name.slice(0, 60) : '';
    }

    // Distance (km) entre deux lieux : sert à repérer un lieu déjà enregistré.
    function sameSpot(a, b) { return distanceKm(a.lat, a.lon, b.lat, b.lon) < 1; }

    return {
        DEFAULTS: DEFAULTS, DAWN_OPINIONS: DAWN_OPINIONS, NIGHT_OPINIONS: NIGHT_OPINIONS, GUEDOLA_OPINIONS: GUEDOLA_OPINIONS, MISHEYAKIR_OPINIONS: MISHEYAKIR_OPINIONS,
        MASECHTOT: MASECHTOT, DAF_CYCLE_LENGTH: DAF_CYCLE_LENGTH, TEHILIM_DAYS: TEHILIM_DAYS,
        isValidTimeZone: isValidTimeZone, tzOffsetMs: tzOffsetMs, localToUtc: localToUtc, civilDateOf: civilDateOf,
        solarEvent: solarEvent, solarNoon: solarNoon, inIsrael: inIsrael, candleMinutes: candleMinutes,
        zmanim: zmanim, hametsTimes: hametsTimes, roundMinute: roundMinute, rounded: rounded, formatTime: formatTime, formatDuration: formatDuration,
        shabbatOf: shabbatOf, dafYomi: dafYomi, tehilimOfDay: tehilimOfDay, noTachanun: noTachanun, tachanunStatus: tachanunStatus,
        moladOf: moladOf, levanaWindow: levanaWindow, levanaEvenings: levanaEvenings,
        hilloulotFor: hilloulotFor, normalizePlace: normalizePlace, parseGeocoding: parseGeocoding, parseReverseGeocoding: parseReverseGeocoding, sameSpot: sameSpot
    };
}));
