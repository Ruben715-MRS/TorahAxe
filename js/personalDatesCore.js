// =========================================================================
// === TORAHAXE — DATES PERSONNELLES : HAZKARA (YAHRZEIT), ANNIVERSAIRES HÉBRAÏQUES, BAR ET BAT-MITSVA (pur, sans DOM, testé) ===
// =========================================================================
// Une date personnelle est une date du calendrier hébraïque qui revient chaque année : le jour d'un décès (la Hazkara, que les ashkénazes appellent Yahrzeit), un anniversaire de
// naissance, un autre anniversaire (mariage…). Ce fichier dit quel jour civil elle tombe chaque année, calcule la bar ou la bat-mitsva, et prépare les rappels. Tout est local.
//
// LES RÈGLES. Elles suivent Hebcal (qui applique l'algorithme de Reingold et Dershowitz, « Calendrical Calculations », conforme à l'usage ashkénaze) et la page de Chabad sur le yahrtzeit ;
// les deux disent elles-mêmes que certaines communautés ont d'autres coutumes (« consult your rabbi »). Ce qui suit est donc une règle par défaut, jamais un avis de halakha, et ce
// fichier est à faire relire par une personne compétente. Cas par cas :
//  - Le jour hébraïque commence à la tombée de la nuit : un décès ou une naissance après la nuit tombante compte pour le jour hébraïque suivant (`hebrewOfCivil`).
//  - Règle générale : le même quantième du même mois. La Hazkara commence le soir précédent ; la première est celle de l'année hébraïque qui suit celle du décès.
//  - HAZKARA d'un décès un 30 'Hechvan ou un 30 Kislev, une année où ce mois n'a que 29 jours : si la première Hazkara (un an après) n'avait pas ce 30, c'est le 29 du mois ; si elle l'avait, c'est le
//    1er du mois suivant (1er Kislev, 1er Tevet) — Chabad le dit pour 'Hechvan et ajoute que « la même règle s'applique au 30 Kislev » ; Hebcal ne précise que le premier cas. Certains font les deux jours
//    (option `bothDays`).
//  - HAZKARA d'un décès en Adar d'une année simple, une année embolismique : Adar I pour la coutume ashkénaze et 'Habad (Rema, Yoreh Déa 402:12 ; Chabad : « the common custom ») ; Adar II pour les
//    Espagnols et Portugais, qui « n'observent jamais en Adar I la date d'une année simple » (Hebcal), selon le Choulhan Aroukh (Orah 'Haïm 568:7). C'est la seule règle qui dépend du rite, et elle
//    se règle pour chaque date (`adar`: 'rite' | 'adar1' | 'adar2' | 'both').
//  - HAZKARA d'un décès en Adar I d'une année embolismique : Adar I dans une année embolismique, l'Adar unique dans une année simple ; le 30 Adar I, le 30 Chevat dans une année simple.
//  - HAZKARA d'un décès en Adar II : Adar II dans une année embolismique, l'Adar unique dans une année simple.
//  - ANNIVERSAIRE de naissance ou de mariage (et bar ou bat-mitsva, qui suit la même règle) : né en Adar d'une année simple, c'est Adar II dans une année embolismique (« toujours le dernier mois ») ; né en
//    Adar I, Adar I dans une année embolismique et l'Adar unique dans une année simple ; né un 30 'Hechvan, 30 Kislev ou 30 Adar I, le 1er du mois suivant les années où ce jour n'existe pas.
// Le nombre de jours de 'Hechvan et de Kislev (29 ou 30) vient de js/hebrewCalendarCore.js ; la paracha d'un Chabbat, de js/sedraCore.js (toute date de 1583 à 2400, diaspora et Israël).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./hebrewCalendarCore.js'), require('./calendarYearCore.js'), require('./zmanimCore.js'), require('./torahCore.js'));
    else root.PersonalDatesCore = factory(root.HebrewCalendarCore, root.CalendarYearCore, root.ZmanimCore, root.TorahCore);
}(typeof self !== 'undefined' ? self : this, function (HC, CY, Z, Torah) {
    'use strict';

    var TYPES = ['hazkara', 'birthday', 'other'];
    var RITES = ['sefarade', 'ashkenaze'];
    var ADAR_CHOICES = ['rite', 'adar1', 'adar2', 'both'];
    var MIN = 60000, DAY = 86400000;
    var MAX_ITEMS = 60;

    // --- Les dates -------------------------------------------------------------------------------------------------------------------------
    function fixedOfCivil(c) { return CY.gregorianToFixed(c.year, c.month, c.day); }
    function civilOfFixed(f) { return CY.fixedToGregorian(f); }

    // La date hébraïque { day, month (identifiant : 'Kislev', 'Adar', 'AdarII'…), year } d'une date civile. Après la tombée de la nuit, c'est déjà le jour hébraïque suivant.
    function hebrewOfCivil(civil, afterNightfall) {
        var h = HC.hebrewFromFixed(fixedOfCivil(civil) + (afterNightfall ? 1 : 0));
        return { day: h.day, month: h.month, year: h.year };
    }

    function monthDays(year, id) {
        var m = HC.monthsOf(year).filter(function (x) { return x.id === id; })[0];
        return m ? m.days : 0;
    }

    function isValidHebrew(h) {
        return !!h && Number.isInteger(h.year) && h.year >= HC.HEBREW_MIN && h.year <= HC.HEBREW_MAX && Number.isInteger(h.day) && h.day >= 1 && h.day <= monthDays(h.year, h.month);
    }

    function nextMonthId(year, id) {
        var months = HC.monthsOf(year), i = months.map(function (m) { return m.id; }).indexOf(id);
        return months[i + 1] ? months[i + 1].id : 'Tishri';
    }

    // --- Les règles : quel jour une date hébraïque tombe-t-elle une année donnée ? -------------------------------------------------------------------
    // kind : 'hazkara' ou 'event' (anniversaire de naissance, de mariage, bar et bat-mitsva). o : { rite, adar, bothDays }. Renvoie la liste des jours fixes (un, ou deux avec « les deux »).
    function resolve(kind, ev, year, o) {
        var opts = o || {};
        var leapOrig = HC.leap(ev.year), leapNow = HC.leap(year);
        var m = ev.month, d = ev.day;
        var months = [m];
        var days = [d];
        var nextMonth = null;

        if (m === 'Adar' || m === 'AdarII') {
            if (!leapOrig) {
                // L'Adar d'une année simple.
                if (!leapNow) months = ['Adar'];
                else if (kind === 'event') months = ['AdarII'];
                else {
                    var choice = opts.adar && opts.adar !== 'rite' ? opts.adar : (opts.rite === 'sefarade' ? 'adar2' : 'adar1');
                    months = choice === 'both' ? ['Adar', 'AdarII'] : choice === 'adar2' ? ['AdarII'] : ['Adar'];     // dans une année embolismique, « Adar » est Adar I
                }
            } else if (m === 'Adar') {
                // Adar I d'une année embolismique.
                if (leapNow) months = ['Adar'];
                else if (d === 30) { if (kind === 'event') { months = ['Nisan']; days = [1]; } else { months = ['Shevat']; days = [30]; } }
                else months = ['Adar'];
            } else {
                // Adar II.
                months = [leapNow ? 'AdarII' : 'Adar'];
            }
        } else if (d === 30 && (m === 'Heshvan' || m === 'Kislev') && monthDays(year, m) < 30) {
            // Un 30 'Hechvan ou 30 Kislev, une année où ce mois n'a que 29 jours.
            var next = nextMonthId(year, m);
            if (kind === 'event') { months = [next]; days = [1]; }
            else {
                var firstHad30 = monthDays(ev.year + 1, m) === 30;
                if (opts.bothDays) { months = [m, next]; days = [29, 1]; }
                else if (firstHad30) { months = [next]; days = [1]; }
                else days = [29];
            }
        }
        var out = [];
        months.forEach(function (month, i) {
            var day = days.length > 1 ? days[i] : days[0];
            if (month === 'Adar' && day > monthDays(year, 'Adar')) day = monthDays(year, 'Adar');
            out.push(CY.hebrewToFixed(year, month, day));
        });
        return out.filter(function (f, i, a) { return a.indexOf(f) === i; }).sort(function (a, b) { return a - b; });
    }

    // Les réglages d'une date, tels que `resolve` les attend.
    function optsOf(item, rite) { return { rite: rite, adar: item.adar, bothDays: !!item.bothDays }; }

    // Les jours (fixes) où une date tombe l'année hébraïque `year`.
    function daysIn(item, year, rite) { return resolve(item.type === 'hazkara' ? 'hazkara' : 'event', item.hebrew, year, optsOf(item, rite)); }

    // --- Les occurrences ----------------------------------------------------------------------------------------------------------------------
    // Les occurrences d'une date entre deux jours fixes (inclus) : [{ fixed, year, years, hebrew }] triées. `years` : le nombre d'années (la Hazkara commence un an après le décès).
    function occurrences(item, fromFixed, toFixed, rite) {
        var out = [];
        var y0 = HC.hebrewFromFixed(fromFixed).year - 1, y1 = HC.hebrewFromFixed(toFixed).year + 1;
        for (var y = Math.max(y0, item.hebrew.year + 1); y <= y1; y++) {
            daysIn(item, y, rite).forEach(function (f) {
                if (f >= fromFixed && f <= toFixed) out.push({ fixed: f, year: y, years: y - item.hebrew.year, hebrew: HC.hebrewFromFixed(f) });
            });
        }
        return out.sort(function (a, b) { return a.fixed - b.fixed; });
    }

    // La prochaine occurrence à partir d'un jour fixe (aujourd'hui compris), ou null.
    function next(item, fromFixed, rite) {
        var found = occurrences(item, fromFixed, fromFixed + 800, rite);
        return found.length ? found[0] : null;
    }

    // Toutes les dates à venir dans les `days` jours : [{ item, fixed, year, years, hebrew, inDays }] triées par jour.
    function upcoming(items, fromFixed, days, rite) {
        var out = [];
        items.forEach(function (item) {
            occurrences(item, fromFixed, fromFixed + days, rite).forEach(function (o) { out.push({ item: item, fixed: o.fixed, year: o.year, years: o.years, hebrew: o.hebrew, inDays: o.fixed - fromFixed }); });
        });
        return out.sort(function (a, b) { return a.fixed - b.fixed || (a.item.name < b.item.name ? -1 : 1); });
    }

    // --- Bar et bat-mitsva ---------------------------------------------------------------------------------------------------------------------
    // La bar-mitsva (13 ans) ou la bat-mitsva (12 ans) d'une naissance hébraïque `birth` : { age, year, fixed, civil, weekday, shabbat (le premier Chabbat à partir de ce jour, sans compter le jour si ce n'est pas un Chabbat) }.
    // `sex` : 'm' ou 'f'. Les mêmes règles que l'anniversaire de naissance (Adar, 30 'Hechvan, 30 Kislev).
    function barBatMitsva(birth, sex, rite) {
        var age = sex === 'f' ? 12 : 13, year = birth.year + age;
        var fixed = resolve('event', birth, year, { rite: rite })[0];
        var weekday = HC.weekdayOf(fixed);
        var shabbat = fixed + ((6 - weekday + 7) % 7);
        return { age: age, year: year, fixed: fixed, hebrew: HC.hebrewFromFixed(fixed), civil: civilOfFixed(fixed), weekday: weekday, shabbat: shabbat, shabbatCivil: civilOfFixed(shabbat) };
    }

    // La paracha lue à un Chabbat (jour fixe) : les indices dans parashot.json (deux si deux parachiot réunies), ou null (Chabbat de fête, ou date hors du calendrier de l'application, 1583 à 2400).
    // `israel` : le calendrier d'Israël (la paracha diffère parfois de la diaspora) ; faux par défaut.
    function parashaOfShabbat(fixedShabbat, israel) {
        var c = civilOfFixed(fixedShabbat);
        var idx = Torah.parashaForDate(null, new Date(c.year, c.month - 1, c.day), !!israel);
        return idx && idx.length ? idx : null;
    }

    // --- Le registre ----------------------------------------------------------------------------------------------------------------------------
    // { v: 1, items: [{ id, type, name, hebrew: { day, month, year }, civil?: { year, month, day, after }, sex?, adar?, bothDays?, remind: { eve, morning }, note? }], eveAt: 'shkia' | 'tzeit' }
    function emptyStore() { return { v: 1, items: [], eveAt: 'shkia' }; }

    function cleanItem(raw, i) {
        if (!raw || typeof raw !== 'object' || TYPES.indexOf(raw.type) < 0 || typeof raw.name !== 'string' || !raw.name.trim() || !isValidHebrew(raw.hebrew)) return null;
        var h = raw.hebrew;
        var item = {
            id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 40) : 'd' + i,
            type: raw.type, name: raw.name.trim().slice(0, 80), hebrew: { day: h.day, month: h.month, year: h.year },
            remind: { eve: raw.remind ? raw.remind.eve === true : raw.type === 'hazkara', morning: raw.remind ? raw.remind.morning === true : raw.type !== 'hazkara' }
        };
        if (raw.sex === 'm' || raw.sex === 'f') item.sex = raw.sex;
        if (ADAR_CHOICES.indexOf(raw.adar) > 0) item.adar = raw.adar;
        if (raw.bothDays === true) item.bothDays = true;
        if (typeof raw.note === 'string' && raw.note.trim()) item.note = raw.note.trim().slice(0, 300);
        var c = raw.civil;
        if (c && Number.isInteger(c.year) && Number.isInteger(c.month) && Number.isInteger(c.day)) item.civil = { year: c.year, month: c.month, day: c.day, after: c.after === true };
        return item;
    }

    // Un registre lu du stockage : tout ce qui est abîmé est écarté.
    function normalizeStore(raw) {
        var out = emptyStore();
        if (!raw || typeof raw !== 'object') return out;
        if (raw.eveAt === 'tzeit') out.eveAt = 'tzeit';
        if (Array.isArray(raw.items)) {
            var seen = {};
            raw.items.slice(0, MAX_ITEMS).forEach(function (r, i) {
                var item = cleanItem(r, i);
                if (item && !seen[item.id]) { seen[item.id] = true; out.items.push(item); }
            });
        }
        return out;
    }

    function addItem(store, raw) {
        var s = normalizeStore(store);
        var used = {};
        s.items.forEach(function (x) { used[x.id] = true; });
        var n = s.items.length + 1;
        while (used['d' + n]) n++;
        var item = cleanItem(Object.assign({}, raw, { id: raw && raw.id && !used[raw.id] ? raw.id : 'd' + n }), 0);
        if (item && s.items.length < MAX_ITEMS) s.items.push(item);
        return s;
    }
    function updateItem(store, id, raw) {
        var s = normalizeStore(store);
        var item = cleanItem(Object.assign({}, raw, { id: id }), 0);
        if (item) s.items = s.items.map(function (x) { return x.id === id ? item : x; });
        return s;
    }
    function removeItem(store, id) {
        var s = normalizeStore(store);
        s.items = s.items.filter(function (x) { return x.id !== id; });
        return s;
    }

    // --- Les rappels ------------------------------------------------------------------------------------------------------------------------------
    function addDays(date, n) {
        var d = new Date(Date.UTC(date.year, date.month - 1, date.day) + n * DAY);
        return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
    }

    // Les rappels des `days` prochains jours civils du lieu : [{ at, kind: 'personal', id, type, name, when: 'eve' | 'morning', years, time }] triés. « La veille au soir » : au coucher du soleil
    // ou à la sortie des étoiles (`eveAt`), le soir qui commence le jour de la date (la Hazkara commence à la tombée de la nuit) ; « le matin » : au lever du soleil, le jour même.
    function plan(store, place, zmanimOpts, fromMs, days, rite) {
        var s = normalizeStore(store);
        if (!place || !s.items.length) return [];
        var today = Z.civilDateOf(place.tz, fromMs);
        var fromFixed = fixedOfCivil(today);
        var horizon = days === undefined ? 7 : days;
        var out = [];
        s.items.forEach(function (item) {
            if (!item.remind.eve && !item.remind.morning) return;
            occurrences(item, fromFixed, fromFixed + horizon + 1, rite).forEach(function (o) {
                if (item.remind.morning && o.fixed - fromFixed <= horizon) {
                    var d = civilOfFixed(o.fixed);
                    var netz = Z.rounded(Z.zmanim(place, d.year, d.month, d.day, zmanimOpts), 'netz');
                    if (netz !== null && netz > fromMs) out.push({ at: netz, kind: 'personal', id: item.id, type: item.type, name: item.name, when: 'morning', years: o.years, time: netz });
                }
                if (item.remind.eve) {
                    var e = civilOfFixed(o.fixed - 1);
                    var t = Z.rounded(Z.zmanim(place, e.year, e.month, e.day, zmanimOpts), s.eveAt);
                    if (t !== null && t > fromMs && o.fixed - 1 - fromFixed <= horizon) out.push({ at: t, kind: 'personal', id: item.id, type: item.type, name: item.name, when: 'eve', years: o.years, time: t });
                }
            });
        });
        return out.sort(function (a, b) { return a.at - b.at; });
    }

    // { title, body } d'un rappel. `tr(clé, params)` : la traduction (ui/fr.json, dates.rem_*) ; `term` : « Hazkara » ou « Yahrzeit » (le rite choisi).
    function describe(item, tr, term) {
        var key = 'dates.rem_' + item.type + '_' + item.when;
        return { title: tr(key + '_title', { name: item.name, term: term }), body: tr(key + '_body', { name: item.name, years: item.years, term: term }) };
    }

    return {
        TYPES: TYPES, RITES: RITES, ADAR_CHOICES: ADAR_CHOICES, MAX_ITEMS: MAX_ITEMS,
        hebrewOfCivil: hebrewOfCivil, monthDays: monthDays, isValidHebrew: isValidHebrew, resolve: resolve, daysIn: daysIn, occurrences: occurrences, next: next, upcoming: upcoming,
        barBatMitsva: barBatMitsva, parashaOfShabbat: parashaOfShabbat, emptyStore: emptyStore, normalizeStore: normalizeStore, addItem: addItem, updateItem: updateItem, removeItem: removeItem,
        plan: plan, describe: describe
    };
}));
