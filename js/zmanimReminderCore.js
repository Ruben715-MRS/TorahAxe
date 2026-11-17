// =========================================================================
// === RAPPELS DES ZMANIM : QUOI RAPPELER, ET QUAND (calculs purs, sans DOM) ===
// =========================================================================
// Les rappels sont des notifications locales de l'iPhone (js/notifications.js, @capacitor/local-notifications) : calculées SUR L'APPAREIL, aucun
// serveur. iOS limite à 64 le nombre de notifications en attente : on ne programme donc que les plus proches (quelques jours), et l'on recalcule
// à chaque ouverture de l'app, après chaque changement de réglage, de lieu ou d'opinion.
//
// Les rappels, comme dans CalJ (« Réglages › Rappels ») :
//  - bougies de Chabbat et de fête : un délai avant l'allumage ;
//  - compte de l'Omer : à la sortie des étoiles ou au coucher, avec le texte du compte ou un simple rappel ;
//  - Roch 'Hodesh : la veille au soir, ou le matin ;
//  - Birkat haLévana : le premier soir possible, et le dernier ;
//  - rappels personnalisés : n'importe quel horaire du jour, décalé de quelques minutes avant, aux jours de la semaine choisis.
// Ce fichier produit une liste triée { at, kind, key, ... } ; les textes viennent de describe() (traduction injectée, pour rester testable).
// Testé dans tests/zmanimReminderCore.test.js. Programmation : js/notifications.js (scheduleZmanim) ; réglages : js/app/zmanim.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendarYearCore.js'), require('./hebrewCalendarCore.js'), require('./zmanimCore.js'), require('./siddurCore.js'));
    else root.ZmanimReminderCore = factory(root.CalendarYearCore, root.HebrewCalendarCore, root.ZmanimCore, root.SiddurCore);
}(typeof self !== 'undefined' ? self : this, function (CY, HC, Z, S) {
    'use strict';

    var MIN = 60000, DAY = 86400000;

    // Les horaires qu'on peut rappeler (les clés de ZmanimCore.zmanim), dans l'ordre de la journée.
    var CUSTOM_KEYS = ['alot', 'misheyakir', 'netz', 'shemaMa', 'shemaGra', 'tefilaMa', 'tefilaGra', 'chatzot', 'minchaGedola', 'minchaKetana', 'plag', 'shkia', 'tzeit', 'rabbenuTam', 'chatzotLayla'];
    var CANDLE_BEFORE = [15, 20, 30, 45, 60, 90];                 // minutes avant l'allumage
    var OFFSETS = [-30, -20, -15, -10, -5, 0, 5, 10, 15, 20, 30, 45, 60];   // minutes AVANT l'horaire (0 : à l'heure ; négatif : APRÈS, comme le « +20 min » de CalJ)
    var MAX_PENDING = 40;                                         // iOS : 64 notifications en attente au plus, partagées avec le reste de l'app

    function defaults() {
        return {
            on: false,
            candles: { on: false, before: 60 },
            omer: { on: true, at: 'tzeit', text: 'count', morning: false },   // at : 'tzeit' | 'shkia' (la veille au soir, avec bénédiction) ; text : 'count' (le compte) | 'simple' ; morning : rappel du matin (sans bénédiction)
            roshChodesh: { on: false, when: 'eve' },              // when : 'eve' (la veille au soir) | 'morning'
            levana: { on: false, every: true },     // every : un rappel chaque soir de la fenêtre (sinon, seulement le premier et le dernier soir)
            days: [0, 1, 2, 3, 4, 5, 6],                          // jours de la semaine des rappels personnalisés (0 = dimanche)
            custom: {}                                            // { clé d'horaire: décalage en minutes avant (0 à l'heure) }
        };
    }

    // Des réglages sûrs, quoi qu'on ait enregistré : valeurs inconnues → défauts.
    function normalize(raw) {
        var d = defaults();
        if (!raw || typeof raw !== 'object') return d;
        var out = defaults();
        out.on = raw.on === true;
        if (raw.candles && typeof raw.candles === 'object') {
            out.candles.on = raw.candles.on === true;
            out.candles.before = CANDLE_BEFORE.indexOf(raw.candles.before) !== -1 ? raw.candles.before : d.candles.before;
        }
        if (raw.omer && typeof raw.omer === 'object') {
            out.omer.on = raw.omer.on === true;
            out.omer.morning = raw.omer.morning === true;
            out.omer.at = raw.omer.at === 'shkia' ? 'shkia' : 'tzeit';
            out.omer.text = raw.omer.text === 'simple' ? 'simple' : 'count';
        }
        if (raw.roshChodesh && typeof raw.roshChodesh === 'object') {
            out.roshChodesh.on = raw.roshChodesh.on === true;
            out.roshChodesh.when = raw.roshChodesh.when === 'morning' ? 'morning' : 'eve';
        }
        if (raw.levana && typeof raw.levana === 'object') { out.levana.on = raw.levana.on === true; out.levana.every = raw.levana.every !== false; }
        if (Array.isArray(raw.days)) {
            var days = raw.days.filter(function (x, i, a) { return Number.isInteger(x) && x >= 0 && x <= 6 && a.indexOf(x) === i; });
            out.days = days.sort();
        }
        if (raw.custom && typeof raw.custom === 'object') {
            CUSTOM_KEYS.forEach(function (key) {
                var v = raw.custom[key];
                if (OFFSETS.indexOf(v) !== -1) out.custom[key] = v;
            });
        }
        return out;
    }

    // Y a-t-il quelque chose à programmer ? (le réglage général, puis au moins un rappel choisi)
    function anyEnabled(s) {
        return s.on && (s.candles.on || s.omer.on || s.omer.morning || s.roshChodesh.on || s.levana.on || (s.days.length > 0 && Object.keys(s.custom).length > 0));
    }

    function addDays(date, n) {
        var d = new Date(Date.UTC(date.year, date.month - 1, date.day) + n * DAY);
        return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
    }

    // Les rappels des `days` prochains jours civils du lieu, à partir de `fromMs` : [{ at, kind, key, offset, time, ... }] trié, au plus MAX_PENDING.
    //  kind : 'custom' (key, offset) | 'candles' (before, yomTov) | 'omer' (day) | 'roshChodesh' (when) | 'levana' (last).
    //  `time` : l'horaire lui-même (instant), `at` : l'instant du rappel.
    function plan(settingsRaw, place, zmanimOpts, fromMs, days) {
        var s = normalize(settingsRaw);
        if (!anyEnabled(s) || !place) return [];
        var israel = Z.inIsrael(place);
        var today = Z.civilDateOf(place.tz, fromMs);
        var out = [];
        var seenLevana = {};
        var horizon = days === undefined ? 7 : days;
        for (var i = 0; i <= horizon; i++) {
            var date = addDays(today, i);
            var z = Z.zmanim(place, date.year, date.month, date.day, zmanimOpts);
            var fixed = CY.gregorianToFixed(date.year, date.month, date.day);
            var weekday = HC.weekdayOf(fixed);
            var ctxToday = S.contextFor(fixed, israel), ctxNext = S.contextFor(fixed + 1, israel);
            var push = function (item) { if (item.at > fromMs) out.push(item); };

            // Les rappels personnalisés
            if (s.days.indexOf(weekday) !== -1) {
                CUSTOM_KEYS.forEach(function (key) {
                    if (s.custom[key] === undefined) return;
                    var time = Z.rounded(z, key);
                    if (time === null) return;
                    push({ at: time - s.custom[key] * MIN, kind: 'custom', key: key, offset: s.custom[key], time: time });
                });
            }
            // Les bougies : la veille de Chabbat ou de fête (pas le deuxième soir d'une fête : la flamme se prend d'une flamme existante)
            if (s.candles.on && (ctxNext.flags.shabbat || ctxNext.flags.yomTov) && !ctxToday.flags.yomTov) {
                var candles = Z.rounded(z, 'candles');
                if (candles !== null) push({ at: candles - s.candles.before * MIN, kind: 'candles', before: s.candles.before, time: candles, yomTov: ctxNext.flags.yomTov && !ctxNext.flags.shabbat });
            }
            // L'Omer : le soir qui commence le jour hébraïque N
            if (s.omer.on && ctxNext.omer >= 1 && ctxNext.omer <= 49) {
                var evening = Z.rounded(z, s.omer.at);
                if (evening !== null) push({ at: evening, kind: 'omer', day: ctxNext.omer, time: evening, simple: s.omer.text === 'simple' });
            }
            // L'Omer, le matin (au lever du soleil) : le jour hébraïque N a commencé la veille au soir ; si on a oublié, on compte sans bénédiction
            if (s.omer.morning && ctxToday.omer >= 1 && ctxToday.omer <= 49) {
                var sunrise = Z.rounded(z, 'netz');
                if (sunrise !== null) push({ at: sunrise, kind: 'omer', when: 'morning', day: ctxToday.omer, time: sunrise, simple: false });
            }
            // Roch 'Hodesh
            if (s.roshChodesh.on) {
                if (s.roshChodesh.when === 'eve' && ctxNext.flags.rc) {
                    var shkia = Z.rounded(z, 'shkia');
                    if (shkia !== null) push({ at: shkia - 30 * MIN, kind: 'roshChodesh', when: 'eve', time: shkia, twoDays: ctxNext.hebrew.day === 30 });
                } else if (s.roshChodesh.when === 'morning' && ctxToday.flags.rc) {
                    var netz = Z.rounded(z, 'netz');
                    if (netz !== null) push({ at: netz, kind: 'roshChodesh', when: 'morning', time: netz, twoDays: ctxToday.hebrew.day === 30 });
                }
            }
            // Birkat haLévana : le premier soir possible du mois en cours (ou du suivant), et le dernier
            if (s.levana.on) {
                var months = HC.monthsOf(ctxToday.hebrew.year);
                var idx = months.findIndex(function (m) { return m.id === ctxToday.hebrew.month; });
                var cands = [[ctxToday.hebrew.year, ctxToday.hebrew.month]];
                if (idx >= 0) cands.push(idx + 1 < months.length ? [ctxToday.hebrew.year, months[idx + 1].id] : [ctxToday.hebrew.year + 1, 'Tishri']);
                cands.forEach(function (c) {
                    var key = c[0] + c[1];
                    if (seenLevana[key] === undefined) {
                        var win = Z.levanaWindow(c[0], c[1], 7);
                        seenLevana[key] = Z.levanaEvenings(place, win, zmanimOpts);
                    }
                    var ev = seenLevana[key];
                    if (!ev) return;
                    var same = function (a) { return a.year === date.year && a.month === date.month && a.day === date.day; };
                    var tzeit = Z.rounded(z, 'tzeit');
                    if (tzeit === null) return;
                    var dn = function (a) { return Date.UTC(a.year, a.month - 1, a.day) / DAY; };
                    var left = dn(ev.last) - dn(date) + 1;          // les soirées restantes, celle-ci comprise
                    if (same(ev.last)) push({ at: tzeit, kind: 'levana', last: true, left: 1, time: tzeit });
                    else if (same(ev.first)) push({ at: tzeit, kind: 'levana', last: false, first: true, left: left, time: tzeit, until: ev.last });
                    else if (s.levana.every && left > 1 && dn(date) > dn(ev.first)) push({ at: tzeit, kind: 'levana', last: false, first: false, left: left, time: tzeit });
                });
            }
        }
        out.sort(function (a, b) { return a.at - b.at; });
        // un même instant et un même type ne se répètent pas (la fenêtre de la Lévana est vue deux fois)
        var dedup = [];
        out.forEach(function (x) {
            var prev = dedup[dedup.length - 1];
            if (prev && prev.at === x.at && prev.kind === x.kind && prev.key === x.key) return;
            dedup.push(x);
        });
        return dedup.slice(0, MAX_PENDING);
    }

    // --- Les textes ----------------------------------------------------------------------------------------------------------------------
    // Le texte du compte de l'Omer : « 8 jours, soit une semaine et un jour ».
    function omerCount(n, tr) {
        var weeks = Math.floor(n / 7), days = n % 7;
        if (n < 7) return n === 1 ? tr('tools.zmr_omer_1') : tr('tools.zmr_omer_days', { n: n });
        var w = weeks === 1 ? tr('tools.zmr_omer_week_1') : tr('tools.zmr_omer_weeks', { n: weeks });
        if (!days) return tr('tools.zmr_omer_exact', { n: n, weeks: w });
        var d = days === 1 ? tr('tools.zmr_omer_day_1') : tr('tools.zmr_omer_days_n', { n: days });
        return tr('tools.zmr_omer_full', { n: n, weeks: w, days: d });
    }

    // { title, body } d'un rappel. `tr(clé, params)` : la traduction (js/i18n.js) ; `place` : pour l'heure locale.
    function describe(item, tr, place, locale) {
        var time = Z.formatTime(item.time, place.tz, locale);
        if (item.kind === 'candles') {
            return {
                title: tr(item.yomTov ? 'tools.zmr_candles_yt_title' : 'tools.zmr_candles_title'),
                body: tr('tools.zmr_candles_body', { n: item.before, time: time })
            };
        }
        if (item.kind === 'omer' && item.when === 'morning') {
            return { title: tr('tools.zmr_omer_title', { n: item.day }), body: tr('tools.zmr_omer_morning_body', { text: omerCount(item.day, tr) }) };
        }
        if (item.kind === 'omer') {
            return {
                title: tr('tools.zmr_omer_title', { n: item.day }),
                body: item.simple ? tr('tools.zmr_omer_simple') : tr('tools.zmr_omer_body', { text: omerCount(item.day, tr) })
            };
        }
        if (item.kind === 'roshChodesh') {
            return item.when === 'eve'
                ? { title: tr(item.twoDays ? 'tools.zmr_rc_eve_title_2' : 'tools.zmr_rc_eve_title'), body: tr('tools.zmr_rc_eve_body') }
                : { title: tr('tools.zmr_rc_morning_title'), body: tr('tools.zmr_rc_morning_body') };
        }
        if (item.kind === 'levana') {
            if (item.last) return { title: tr('tools.zmr_levana_title'), body: tr('tools.zmr_levana_last') };
            if (item.first) return { title: tr('tools.zmr_levana_title'), body: tr('tools.zmr_levana_first', { n: item.left }) };
            return { title: tr('tools.zmr_levana_title'), body: tr('tools.zmr_levana_left', { n: item.left }) };
        }
        var name = tr('tools.zmr_n_' + item.key);
        return {
            title: name,
            body: item.offset === 0 ? tr('tools.zmr_custom_now', { time: time }) : item.offset > 0 ? tr('tools.zmr_custom_before', { n: item.offset, time: time }) : tr('tools.zmr_custom_after', { n: -item.offset, time: time })
        };
    }

    return {
        CUSTOM_KEYS: CUSTOM_KEYS, CANDLE_BEFORE: CANDLE_BEFORE, OFFSETS: OFFSETS, MAX_PENDING: MAX_PENDING,
        defaults: defaults, normalize: normalize, anyEnabled: anyEnabled, plan: plan, describe: describe, omerCount: omerCount
    };
}));
