// =========================================================================
// === LE CALENDRIER HÉBRAÏQUE ET LES FÊTES (calculs purs, sans DOM) ===
// =========================================================================
// Le calendrier hébraïque arithmétique (Reingold et Dershowitz, Calendrical Calculations) : la date hébraïque d'un jour grégorien et le
// contraire, la forme d'une année (embolismique ou non, 353 à 385 jours), les mois, et les fêtes d'une année avec leurs dates déplacées
// quand un jeûne tombe un chabbat. Les règles de base (1er Tishri, durée des mois) sont celles de js/calendarYearCore.js, qui les
// utilise déjà pour le calendrier annuel : ce fichier ne les recopie pas, il s'en sert.
//
// Une année hébraïque va de Tishri à Elloul : « 5787 » commence en automne 2026 et finit en été 2027. Nisan, Iyar… Elloul portent donc le
// même numéro d'année que Tishri qui les précède, et tombent l'année grégorienne suivante.
// Les dates sont données du jour civil (de minuit à minuit) : le jour hébraïque, lui, commence la veille au coucher du soleil.
// Les années grégoriennes admises vont de 1583 (la réforme de 1582 est entrée dans les usages) à 2400, comme le calendrier annuel.
// Contenu écrit à la main : **à relire par une personne compétente**. Testé dans tests/hebrewCalendarCore.test.js. Écran : js/app/hebrew-calendar.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendarYearCore.js'));
    else root.HebrewCalendarCore = factory(root.CalendarYearCore);
}(typeof self !== 'undefined' ? self : this, function (CY) {
    'use strict';

    var GREGORIAN_MIN = 1583;
    var GREGORIAN_MAX = 2400;
    var HEBREW_MIN = 5344;   // la première année hébraïque qui commence après la réforme grégorienne
    var HEBREW_MAX = 6160;   // la dernière qui commence avant 2400

    // Les mois dans l'ordre de la Torah : Nisan est « le premier des mois » (Exode 12:2). Les identifiants sont ceux de calendarYearCore.js.
    // `from` : le rang à partir de Nisan ; `tishri` : le rang à partir de Tishri, dans une année ordinaire (Adar II, rang 7 en année
    // embolismique, n'a pas de place dans cette liste : voir monthsOf). `days` : 30, 29, ou 0 pour « 29 ou 30 selon l'année ».
    var MONTHS = [
        { id: 'Nisan', he: 'ניסן', days: 30 },
        { id: 'Iyar', he: 'אייר', days: 29 },
        { id: 'Sivan', he: 'סיון', days: 30 },
        { id: 'Tamuz', he: 'תמוז', days: 29 },
        { id: 'Av', he: 'אב', days: 30 },
        { id: 'Elul', he: 'אלול', days: 29 },
        { id: 'Tishri', he: 'תשרי', days: 30 },
        { id: 'Heshvan', he: 'חשון', days: 0 },
        { id: 'Kislev', he: 'כסלו', days: 0 },
        { id: 'Tevet', he: 'טבת', days: 29 },
        { id: 'Shevat', he: 'שבט', days: 30 },
        { id: 'Adar', he: 'אדר', days: 29 },
        { id: 'AdarII', he: 'אדר ב׳', days: 29 }
    ];

    // Les années embolismiques (à treize mois) d'un cycle de dix-neuf ans : les 3e, 6e, 8e, 11e, 14e, 17e et 19e.
    var LEAP_CYCLE_YEARS = [3, 6, 8, 11, 14, 17, 19];

    function monthData(id) {
        for (var i = 0; i < MONTHS.length; i++) if (MONTHS[i].id === id) return MONTHS[i];
        return null;
    }

    function leap(year) { return CY.hebrewLeap(year); }

    // Le rang de l'année dans son cycle de 19 ans (1 à 19).
    function cycleYear(year) { return ((year - 1) % 19) + 1; }

    // Les mois d'une année, de Tishri à Elloul : [{ id, days, index }]. Une année embolismique a Adar I (id « Adar », 30 jours) et Adar II.
    function monthsOf(year) {
        return CY.hebrewMonths(year).map(function (m, i) { return { id: m[0], days: m[1], index: i + 1 }; });
    }

    // La clé d'un nom de mois pour l'affichage : « Adar » devient « AdarI » dans une année embolismique, où il y en a deux.
    function monthLabelId(year, id) {
        return id === 'Adar' && leap(year) ? 'AdarI' : id;
    }

    // Le nom hébreu d'un mois dans une année : « אדר א׳ » pour Adar I d'une année embolismique, « אדר » sinon.
    function monthHebrew(year, id) {
        return id === 'Adar' && leap(year) ? 'אדר א׳' : monthData(id).he;
    }

    function fixedOfGregorian(y, m, d) { return CY.gregorianToFixed(y, m, d); }

    function weekdayOf(fixed) {
        return new Date((fixed - 719163) * 86400000).getUTCDay();   // 0 = dimanche … 6 = samedi
    }

    // La durée de l'année : 353, 354 ou 355 jours (ordinaire), 383, 384 ou 385 (embolismique). Le 1er Tishri est un lundi, un mardi, un jeudi
    // ou un samedi, jamais un dimanche, un mercredi ou un vendredi (« Lo ADU Rosh »).
    function yearInfo(year) {
        var start = CY.hebrewNewYear(year);
        var length = CY.hebrewNewYear(year + 1) - start;
        var kind = length % 10 === 3 ? 'deficient' : (length % 10 === 5 ? 'complete' : 'regular');
        return {
            year: year, leap: leap(year), length: length, kind: kind, cycle: cycleYear(year), start: start,
            end: start + length - 1, newYearWeekday: weekdayOf(start), months: monthsOf(year)
        };
    }

    // Un jour fixe → { year, month (id), day, monthIndex (rang depuis Tishri), leap, weekday, fixed }.
    function hebrewFromFixed(fixed) {
        var year = Math.floor((fixed - CY.hebrewNewYear(1)) / 365.2468) + 1;
        while (CY.hebrewNewYear(year + 1) <= fixed) year++;
        while (CY.hebrewNewYear(year) > fixed) year--;
        var rest = fixed - CY.hebrewNewYear(year);
        var months = monthsOf(year);
        for (var i = 0; i < months.length; i++) {
            if (rest < months[i].days) {
                return { year: year, month: months[i].id, monthIndex: months[i].index, day: rest + 1, leap: leap(year), weekday: weekdayOf(fixed), fixed: fixed };
            }
            rest -= months[i].days;
        }
        return null;   // inatteignable : le dernier mois finit la veille du 1er Tishri suivant
    }

    function isSupportedGregorian(y, m, d) {
        if (!(y >= GREGORIAN_MIN && y <= GREGORIAN_MAX) || !(m >= 1 && m <= 12) || !(d >= 1)) return false;
        var date = new Date(Date.UTC(y, m - 1, d));
        return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
    }

    // Une date grégorienne → la date hébraïque (ou null si elle sort des bornes ou n'existe pas).
    function gregorianToHebrew(y, m, d) {
        if (!isSupportedGregorian(y, m, d)) return null;
        return hebrewFromFixed(fixedOfGregorian(y, m, d));
    }

    // Une date hébraïque → la date grégorienne { year, month, day, weekday } (ou null : mois absent cette année, jour trop grand, année hors bornes).
    function hebrewToGregorian(year, monthId, day) {
        if (!(year >= HEBREW_MIN && year <= HEBREW_MAX) || !(day >= 1)) return null;
        var month = monthsOf(year).filter(function (m) { return m.id === monthId; })[0];
        if (!month || day > month.days) return null;
        var fixed = CY.hebrewToFixed(year, monthId, day);
        var g = CY.fixedToGregorian(fixed);
        return { year: g.year, month: g.month, day: g.day, weekday: weekdayOf(fixed), fixed: fixed };
    }

    // --- Les nombres en lettres hébraïques : 5787 → תשפ״ז, 25 → כ״ה, 15 → ט״ו ------------------------------------------------------
    var UNITS = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    var TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    var HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת'];
    function hebrewNumeral(n) {
        n = Math.floor(n) % 1000;   // les milliers ne s'écrivent pas : 5787 se lit « 787 »
        if (n <= 0) return '';
        var letters = '';
        while (n >= 400) { letters += 'ת'; n -= 400; }
        if (n >= 100) { letters += HUNDREDS[Math.floor(n / 100)]; n %= 100; }
        if (n === 15) letters += 'טו';          // 15 et 16 ne s'écrivent pas יה et יו, qui sont des noms divins
        else if (n === 16) letters += 'טז';
        else { letters += TENS[Math.floor(n / 10)] + UNITS[n % 10]; }
        if (letters.length === 1) return letters + '׳';
        return letters.slice(0, -1) + '״' + letters.slice(-1);
    }

    // --- Les fêtes ---------------------------------------------------------------------------------------------------------------
    // kind : 'moed' (fête de la Torah), 'fast' (jeûne), 'minor' (fête rabbinique ou jour de la tradition), 'modern' (jour d'Israël depuis 1948),
    // 'habad' (date hassidique de 'Habad), 'period' (une période : l'Omer). `days` : la durée, ou { israel, diaspora }. `shift` : si le jeûne tombe un chabbat, 'sun' le reporte
    // au dimanche, 'thu' l'avance au jeudi.
    var FEASTS = [
        { id: 'rosh', month: 'Tishri', day: 1, days: 2, kind: 'moed' },
        { id: 'guedalia', month: 'Tishri', day: 3, kind: 'fast', shift: 'sun' },
        { id: 'kippour', month: 'Tishri', day: 10, kind: 'moed' },
        { id: 'souccot', month: 'Tishri', day: 15, days: 7, kind: 'moed' },
        { id: 'chemini', month: 'Tishri', day: 22, days: { israel: 1, diaspora: 2 }, kind: 'moed' },
        { id: 'hanouka', month: 'Kislev', day: 25, days: 8, kind: 'minor' },
        { id: 'tevet10', month: 'Tevet', day: 10, kind: 'fast' },
        { id: 'tubichvat', month: 'Shevat', day: 15, kind: 'minor' },
        { id: 'pourimkatan', month: 'Adar', day: 14, kind: 'minor', leapOnly: true },
        { id: 'esther', month: 'Adar2', day: 13, kind: 'fast', shift: 'thu' },
        { id: 'pourim', month: 'Adar2', day: 14, kind: 'minor' },
        { id: 'chouchan', month: 'Adar2', day: 15, kind: 'minor' },
        { id: 'pessah', month: 'Nisan', day: 15, days: { israel: 7, diaspora: 8 }, kind: 'moed' },
        { id: 'omer', month: 'Nisan', day: 16, days: 49, kind: 'period' },
        { id: 'shoah', month: 'Nisan', day: 27, kind: 'modern', since: 1951 },
        { id: 'zikaron', month: 'Iyar', day: 4, kind: 'modern', since: 1951 },
        { id: 'atzmaut', month: 'Iyar', day: 5, kind: 'modern', since: 1949 },
        { id: 'pessahcheni', month: 'Iyar', day: 14, kind: 'minor' },
        { id: 'lagbaomer', month: 'Iyar', day: 18, kind: 'minor' },
        { id: 'yerushalayim', month: 'Iyar', day: 28, kind: 'modern', since: 1968 },
        { id: 'chavouot', month: 'Sivan', day: 6, days: { israel: 1, diaspora: 2 }, kind: 'moed' },
        { id: 'tamouz17', month: 'Tamuz', day: 17, kind: 'fast', shift: 'sun' },
        { id: 'tichabav', month: 'Av', day: 9, kind: 'fast', shift: 'sun' },
        { id: 'tubeav', month: 'Av', day: 15, kind: 'minor' }
    ];

    // Les dates hassidiques de 'Habad-Loubavitch (naissances, hiloulot, libérations des Rabbis) : ajoutées seulement pour le profil 'Habad
    // (option `habad` de feastsOf et dayInfo). Elles n'entrent pas dans feastIds(). Lag baOmer, déjà dans FEASTS, n'est pas répété.
    var HABAD_FEASTS = [
        { id: 'habad_6tichri', month: 'Tishri', day: 6, kind: 'habad' },
        { id: 'habad_13tichri', month: 'Tishri', day: 13, kind: 'habad' },
        { id: 'habad_20heshvan', month: 'Heshvan', day: 20, kind: 'habad' },
        { id: 'habad_9kislev', month: 'Kislev', day: 9, kind: 'habad' },
        { id: 'habad_10kislev', month: 'Kislev', day: 10, kind: 'habad' },
        { id: 'habad_14kislev', month: 'Kislev', day: 14, kind: 'habad' },
        { id: 'habad_19kislev', month: 'Kislev', day: 19, kind: 'habad' },
        { id: 'habad_20kislev', month: 'Kislev', day: 20, kind: 'habad' },
        { id: 'habad_5tevet', month: 'Tevet', day: 5, kind: 'habad' },
        { id: 'habad_24tevet', month: 'Tevet', day: 24, kind: 'habad' },
        { id: 'habad_10shevat', month: 'Shevat', day: 10, kind: 'habad' },
        { id: 'habad_22shevat', month: 'Shevat', day: 22, kind: 'habad' },
        { id: 'habad_2nisan', month: 'Nisan', day: 2, kind: 'habad' },
        { id: 'habad_11nisan', month: 'Nisan', day: 11, kind: 'habad' },
        { id: 'habad_13nisan', month: 'Nisan', day: 13, kind: 'habad' },
        { id: 'habad_2iyar', month: 'Iyar', day: 2, kind: 'habad' },
        { id: 'habad_28sivan', month: 'Sivan', day: 28, kind: 'habad' },
        { id: 'habad_3tamuz', month: 'Tamuz', day: 3, kind: 'habad' },
        { id: 'habad_12tamuz', month: 'Tamuz', day: 12, days: 2, kind: 'habad' },
        { id: 'habad_20av', month: 'Av', day: 20, kind: 'habad' },
        { id: 'habad_15elul', month: 'Elul', day: 15, kind: 'habad' },
        { id: 'habad_18elul', month: 'Elul', day: 18, kind: 'habad' }
    ];

    var SATURDAY = 6;

    function daysOf(feast, israel) {
        var d = feast.days;
        if (d && typeof d === 'object') return israel ? d.israel : d.diaspora;
        return d || 1;
    }

    // Les fêtes d'une année hébraïque, dans l'ordre du calendrier civil : [{ id, kind, fixed, last, days, weekday, shifted, month, day }].
    // `fixed` est le premier jour, `last` le dernier ; `shifted` vaut vrai quand le jour a été déplacé (jeûne, jour d'Israël) ; `month` et
    // `day` sont la date hébraïque de la règle (avant tout déplacement). `habad` : vrai pour ajouter les dates hassidiques de 'Habad (kind « habad »). `israel` : vrai pour Israël, faux pour la diaspora (jours de fête en plus).
    function feastsOf(year, israel, habad) {
        var isLeap = leap(year);
        var out = [];
        (habad ? FEASTS.concat(HABAD_FEASTS) : FEASTS).forEach(function (f) {
            if (f.leapOnly && !isLeap) return;
            var month = f.month === 'Adar2' ? (isLeap ? 'AdarII' : 'Adar') : f.month;
            var base = CY.hebrewToFixed(year, month, f.day);
            var fixed = base, shifted = false;
            if (f.shift && weekdayOf(base) === SATURDAY) { fixed = base + (f.shift === 'sun' ? 1 : -2); shifted = true; }
            if (f.id === 'atzmaut' || f.id === 'zikaron') {
                var independence = CY.hebrewToFixed(year, 'Iyar', 5);
                var wd = weekdayOf(independence);
                var celebration = independence;
                var g = CY.fixedToGregorian(independence).year;
                if ((wd === 5 || wd === SATURDAY) && g >= 1951) celebration = independence - (wd === 5 ? 1 : 2);   // vendredi, samedi → jeudi
                else if (wd === 1 && g >= 2004) celebration = independence + 1;                                    // lundi → mardi
                fixed = f.id === 'atzmaut' ? celebration : celebration - 1;
                shifted = fixed !== base;
            } else if (f.id === 'shoah') {
                var wdShoah = weekdayOf(base);
                if (wdShoah === 5) { fixed = base - 1; shifted = true; }          // vendredi → jeudi
                else if (wdShoah === 0) { fixed = base + 1; shifted = true; }     // dimanche → lundi
            }
            if (f.since && CY.fixedToGregorian(fixed).year < f.since) return;
            var days = daysOf(f, israel);
            out.push({ id: f.id, kind: f.kind, fixed: fixed, last: fixed + days - 1, days: days, weekday: weekdayOf(fixed), shifted: shifted, month: month, day: f.day });
        });
        out.sort(function (a, b) { return a.fixed - b.fixed || a.last - b.last; });
        return out;
    }

    // Ce qu'un jour contient : sa date hébraïque, ses fêtes, le numéro du jour de l'Omer, et Roch 'Hodesh.
    function dayInfo(fixed, israel, habad) {
        var h = hebrewFromFixed(fixed);
        var feasts = feastsOf(h.year, israel, habad).filter(function (f) { return f.kind !== 'period' && fixed >= f.fixed && fixed <= f.last; });
        var omerStart = CY.hebrewToFixed(h.year, 'Nisan', 16);
        var omer = fixed >= omerStart && fixed < omerStart + 49 ? fixed - omerStart + 1 : 0;
        var roshChodesh = (h.day === 30 || (h.day === 1 && h.month !== 'Tishri'));
        return { hebrew: h, feasts: feasts, omer: omer, roshChodesh: roshChodesh };
    }

    // 'Hol Hamoed : 'souccot' ou 'pessah' si le jour est un jour intermédiaire de cette fête (ni jour de fête complet, ni Chemini Atséret), sinon null.
    // Souccot : du 16 (Israël) ou du 17 (diaspora) au 21 Tichri, Hocha'ana Raba compris. Pessa'h : du 16 ou du 17 au 20 Nissan.
    function cholHamoedOf(fixed, israel) {
        var year = hebrewFromFixed(fixed).year;
        var s = CY.hebrewToFixed(year, 'Tishri', 15), p = CY.hebrewToFixed(year, 'Nisan', 15);
        var skip = israel ? 1 : 2;
        if (fixed >= s + skip && fixed <= s + 6) return 'souccot';
        if (fixed >= p + skip && fixed <= p + 5) return 'pessah';
        return null;
    }

    // L'identifiant du nom d'une fête pour un jour donné : 'souccot_ch' / 'pessah_ch' pendant 'Hol Hamoed (« 'Hol Hamoed Souccot »), sinon l'identifiant de la fête.
    function feastNameId(feastId, fixed, israel) {
        var ch = (feastId === 'souccot' || feastId === 'pessah') ? cholHamoedOf(fixed, israel) : null;
        return ch === feastId ? feastId + '_ch' : feastId;
    }

    function feastIds() { return FEASTS.map(function (f) { return f.id; }); }

    return {
        GREGORIAN_MIN: GREGORIAN_MIN, GREGORIAN_MAX: GREGORIAN_MAX, HEBREW_MIN: HEBREW_MIN, HEBREW_MAX: HEBREW_MAX,
        MONTHS: MONTHS, LEAP_CYCLE_YEARS: LEAP_CYCLE_YEARS, FEASTS: FEASTS, HABAD_FEASTS: HABAD_FEASTS,
        monthData: monthData, leap: leap, cycleYear: cycleYear, monthsOf: monthsOf, monthLabelId: monthLabelId, monthHebrew: monthHebrew, yearInfo: yearInfo,
        hebrewFromFixed: hebrewFromFixed, gregorianToHebrew: gregorianToHebrew, hebrewToGregorian: hebrewToGregorian,
        isSupportedGregorian: isSupportedGregorian, fixedOfGregorian: fixedOfGregorian, weekdayOf: weekdayOf,
        hebrewNumeral: hebrewNumeral, feastsOf: feastsOf, dayInfo: dayInfo, feastIds: feastIds, cholHamoedOf: cholHamoedOf, feastNameId: feastNameId
    };
}));
