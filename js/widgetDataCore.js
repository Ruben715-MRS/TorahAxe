// =========================================================================
// === TORAHAXE — LES DONNÉES DES WIDGETS DE L'IPHONE (calculs purs, sans DOM) ===
// =========================================================================
// Un widget iOS (écran d'accueil, écran verrouillé) est un petit programme Swift qui ne sait pas exécuter le JavaScript de l'app. L'app
// calcule donc ici, à chaque ouverture et à chaque changement de lieu ou d'opinion, les jours qui viennent (30 par défaut), et les dépose
// dans un fichier partagé avec le widget (js/app/widgets.js, plugin natif WidgetBridge). Le widget n'invente rien : il choisit seulement,
// selon l'heure, la période et les horaires à afficher. Si l'app n'est pas ouverte pendant un mois, le widget le dit (« Ouvrez TorahAxe »).
//
// Le contenu est celui de l'écran d'accueil (js/app/home.js) et de l'écran Zmanim (js/app/zmanim.js). Un seul fichier sert tous les widgets :
//  - les PÉRIODES : une par jour hébraïque. Comme pour le Siddour (SiddurCore.hebrewDayFixed), le jour hébraïque change à la sortie des
//    étoiles. Chaque période a sa date hébraïque, la paracha de la semaine (celle du Chabbat qui vient), Tahanoun, et la prochaine fête.
//    Sans lieu choisi, le jour hébraïque suit le jour civil de l'appareil (diaspora), comme l'écran d'accueil.
//  - les HORAIRES : la liste à plat des zmanim, triés, arrondis à la minute comme dans l'app, avec l'heure déjà écrite dans le fuseau du lieu,
//    et le jour civil (`day`, « 2026-11-19 ») dont ils font partie : le widget des Zmanim (T2) montre ceux du jour.
//  - les JOURS CIVILS (`days`) : leur nom et l'étude du jour (T4) — Daf Yomi, Téhilim du mois, Michna Yomit, Mitsva du jour —, comme les
//    cartes de l'accueil (le jour civil, de minuit à minuit, pas le jour hébraïque).
//  - les CHABBATS ET FÊTES (`holy`, T3) : de l'allumage des bougies à la havdala, avec la paracha et la haftara. Il faut un lieu.
// Les textes (noms des mois, des fêtes…) sont fournis par l'appelant (i18n) ; à défaut, les libellés français ci-dessous.
// Testé dans tests/widgetDataCore.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./calendarYearCore.js'), require('./hebrewCalendarCore.js'), require('./zmanimCore.js'), require('./sedraCore.js'),
            require('./siddurCore.js'));
    } else {
        root.WidgetDataCore = factory(root.CalendarYearCore, root.HebrewCalendarCore, root.ZmanimCore, root.SedraCore, root.SiddurCore);
    }
}(typeof self !== 'undefined' ? self : this, function (CY, HC, Z, Sedra, S) {
    'use strict';

    var VERSION = 2;
    var DAY_MS = 86400000;
    var DEFAULT_DAYS = 30;

    // Les horaires du widget, dans l'ordre de la journée. `label` : le nom de l'écran d'accueil ; `short` : six lettres au plus, pour le
    // petit rond de l'écran verrouillé.
    var ZMANIM = [
        { key: 'alot', label: 'Aube', short: 'Aube' },
        { key: 'netz', label: 'Lever', short: 'Lever' },
        { key: 'shemaGra', label: 'Fin du Chéma', short: 'Chéma' },
        { key: 'tefilaGra', label: 'Fin de la Téfila', short: 'Téfila' },
        { key: 'chatzot', label: 'Midi solaire', short: 'Midi' },
        { key: 'minchaGedola', label: 'Minha Guédola', short: 'Minha' },
        { key: 'plag', label: 'Plag haMinha', short: 'Plag' },
        { key: 'shkia', label: 'Coucher', short: 'Couch.' },
        { key: 'tzeit', label: 'Sortie des étoiles', short: 'Étoil.' },
        { key: 'chatzotLayla', label: 'Minuit', short: 'Minuit' }
    ];

    var FR_MONTHS = {
        Nisan: 'Nissan', Iyar: 'Iyar', Sivan: 'Sivan', Tamuz: 'Tamouz', Av: 'Av', Elul: 'Elloul', Tishri: 'Tichri', Heshvan: '\'Hechvan',
        Kislev: 'Kislev', Tevet: 'Tévet', Shevat: 'Chevat', Adar: 'Adar', AdarI: 'Adar I', AdarII: 'Adar II'
    };
    var TACHANUN = { yes: 'Avec Tahanoun', morning: 'Tahanoun le matin', no: 'Sans Tahanoun' };

    // Les textes par défaut (français), remplacés champ par champ par ceux de l'appelant.
    function defaultText() {
        return {
            month: function (year, id) { return FR_MONTHS[HC.monthLabelId(year, id)] || FR_MONTHS[id] || id; },
            feast: function (id) { return id; },
            tachanun: TACHANUN,
            today: 'Aujourd\'hui', tomorrow: 'Demain', inDays: 'Dans {n} jours',
            shabbat: 'Chabbat',
            dafSiyum: function (n) { return n === 0 ? 'Dernier jour du traité : siyoum !' : 'Jours restants dans le traité : ' + n; },
            tehilimDay: function (n) { return 'Jour ' + n + ' du mois hébraïque'; }
        };
    }

    function civilOfFixed(fixed) {
        var d = new Date((fixed - 719163) * DAY_MS);
        return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
    }

    // La prochaine fête (fête de la Torah ou fête rabbinique) vue du jour hébraïque `fixed` — la règle de homeNextFeast (js/app/home.js).
    function nextFeast(fixed, israel) {
        var h = HC.hebrewFromFixed(fixed);
        var list = [];
        [h.year, h.year + 1].forEach(function (year) {
            HC.feastsOf(year, israel).forEach(function (f) {
                if ((f.kind === 'moed' || f.kind === 'minor') && f.last >= fixed) list.push(f);
            });
        });
        list.sort(function (a, b) { return a.fixed - b.fixed; });
        if (!list.length) return null;
        var f = list[0];
        var ongoing = f.fixed <= fixed;
        return { id: ongoing ? HC.feastNameId(f.id, fixed, israel) : f.id, ongoing: ongoing, days: ongoing ? 0 : f.fixed - fixed };
    }

    function whenLabel(feast, text) {
        if (feast.ongoing) return text.today;
        if (feast.days === 1) return text.tomorrow;
        return text.inDays.replace('{n}', feast.days);
    }

    // La paracha de la semaine du jour hébraïque `fixed` (celle du Chabbat qui vient), en français et en hébreu ; null pour un Chabbat de fête
    // ou si les noms ne sont pas fournis.
    function parashaOf(fixed, israel, parashot) {
        if (!parashot || !parashot.length) return null;
        var indices = Sedra.parashaOfDate(civilOfFixed(fixed), israel);
        if (!indices || !indices.length) return null;
        var names = indices.map(function (k) { return parashot[k]; });
        if (names.some(function (p) { return !p; })) return null;
        return {
            fr: names.map(function (p) { return p.fr; }).join(' – '),
            he: names.map(function (p) { return p.he; }).join('-')
        };
    }

    // La période d'un jour hébraïque : tout ce que le widget en affiche.
    function periodOf(fixed, start, end, israel, input, text) {
        var h = HC.hebrewFromFixed(fixed);
        var month = text.month(h.year, h.month);
        var feast = nextFeast(fixed, israel);
        var tachanun = Z.tachanunStatus(fixed, israel);
        var par = parashaOf(fixed, israel, input.parashot);
        return {
            start: start,
            end: end,
            weekday: HC.weekdayOf(fixed),             // 0 = dimanche … 6 = Chabbat
            hebrew: h.day + ' ' + month + ' ' + h.year,
            hebrewShort: h.day + ' ' + month,
            hebrewLetters: HC.hebrewNumeral(h.day) + ' ' + HC.monthHebrew(h.year, h.month),
            parasha: par ? par.fr : null,
            parashaHe: par ? par.he : null,
            tachanun: tachanun,
            tachanunLabel: text.tachanun[tachanun] || '',
            feast: feast ? { name: text.feast(feast.id), when: whenLabel(feast, text), ongoing: feast.ongoing, days: feast.days } : null
        };
    }

    function dayKeyOf(civil) {
        return civil.year + '-' + String(civil.month).padStart(2, '0') + '-' + String(civil.day).padStart(2, '0');
    }

    // « vendredi 20 novembre »
    function civilLabel(civil) {
        return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
            .format(new Date(Date.UTC(civil.year, civil.month - 1, civil.day, 12)));
    }

    // L'étude d'un jour civil, comme les cartes de l'accueil. Le Daf Yomi et les Téhilim se calculent ici ; la Michna Yomit et la Mitsva du jour
    // viennent de l'appelant (input.mishnaOf, input.mitsvaOf : (fixed) → { text, sub } ou null), qui a leurs textes.
    function studyOf(fixed, input, text) {
        var out = {};
        var daf = Z.dafYomi(fixed);
        if (daf) out.daf = { text: daf.masechet + ' ' + daf.daf, he: daf.he + ' ' + HC.hebrewNumeral(daf.daf), sub: text.dafSiyum(daf.daysLeft) };
        var h = HC.hebrewFromFixed(fixed);
        var month = HC.monthsOf(h.year).filter(function (m) { return m.id === h.month; })[0];
        var r = Z.tehilimOfDay(h.day, month ? month.days : 30);
        if (r) out.tehilim = { text: r.length === 3 ? r[0] + ' (' + r[1] + '–' + r[2] + ')' : r[0] + '–' + r[1], sub: text.tehilimDay(h.day) };
        var mishna = input.mishnaOf ? input.mishnaOf(fixed) : null;
        if (mishna) out.mishna = mishna;
        var mitsva = input.mitsvaOf ? input.mitsvaOf(fixed) : null;
        if (mitsva) out.mitsva = mitsva;
        return out;
    }

    // Le nom d'un jour saint : la fête en cours, ou « Chabbat » et sa paracha.
    function holyNames(fixed, ctx, israel, input, text) {
        var names = [];
        if (ctx.flags.yomTov) {
            var f = nextFeast(fixed, israel);
            if (f && f.ongoing) names.push(text.feast(f.id));
        }
        if (ctx.flags.shabbat) {
            var par = parashaOf(fixed, israel, input.parashot);
            names.push(par ? text.shabbat + ' ' + par.fr : text.shabbat);
        }
        return names;
    }

    // Les Chabbats et fêtes qui commencent ou durent dans les jours préparés : de l'allumage à la havdala. `zOf(i)` : les horaires du jour civil
    // firstFixed + i. Un Chabbat qui suit une fête (ou l'inverse) forme une seule période ; le deuxième soir d'une fête n'a pas d'allumage
    // propre ici (la flamme se prend d'une flamme existante, comme dans les rappels).
    function holyPeriods(firstFixed, days, israel, zOf, tz, input, text) {
        var out = [];
        var current = null;
        for (var i = 0; i <= days; i++) {
            var fixed = firstFixed + i;
            var today = S.contextFor(fixed, israel), next = S.contextFor(fixed + 1, israel);
            var holyToday = today.flags.shabbat || today.flags.yomTov, holyNext = next.flags.shabbat || next.flags.yomTov;
            if (holyNext && !holyToday) {
                var candles = Z.rounded(zOf(i), 'candles');
                current = { start: candles, startTime: candles === null ? null : Z.formatTime(candles, tz, 'fr'), startDay: civilLabel(civilOfFixed(fixed)),
                    names: [], parasha: null, haftara: null, shabbat: false, yomTov: false };
            }
            if (holyToday && current) {
                holyNames(fixed, today, israel, input, text).forEach(function (n) { if (current.names.indexOf(n) === -1) current.names.push(n); });
                if (today.flags.shabbat) {
                    current.shabbat = true;
                    var par = parashaOf(fixed, israel, input.parashot);
                    if (par) current.parasha = par.fr;
                    if (input.haftaraOf) current.haftara = input.haftaraOf(civilOfFixed(fixed), israel) || null;
                }
                if (today.flags.yomTov) current.yomTov = true;
            }
            if (holyToday && !holyNext && current) {
                var havdalah = Z.rounded(zOf(i), 'havdalah');
                out.push({
                    name: current.names.join(' · '), kind: current.yomTov ? (current.shabbat ? 'both' : 'yomtov') : 'shabbat',
                    start: current.start, startTime: current.startTime, startDay: current.startDay,
                    end: havdalah, endTime: havdalah === null ? null : Z.formatTime(havdalah, tz, 'fr'), endDay: civilLabel(civilOfFixed(fixed)),
                    parasha: current.parasha, haftara: current.haftara
                });
                current = null;
            }
        }
        return out;
    }

    // Les données des widgets. `input` :
    //   place    : le lieu de l'écran Zmanim (ZmanimCore.normalizePlace), ou null ;
    //   opts     : les opinions choisies (zmStoredOpts) ;
    //   nowMs    : l'instant présent ;
    //   days     : le nombre de jours à préparer (30 par défaut) ;
    //   deviceTz : le fuseau de l'appareil, pour les jours sans lieu ;
    //   parashot : la liste des parachiot de data/torah/parashot.json ({ fr, he }) ;
    //   text     : { month(year, id), feast(id), tachanun: { yes, morning, no }, today, tomorrow, inDays }, chaque champ facultatif ;
    //   zmanimLabels : { clé: libellé } facultatif ;
    //   mishnaOf, mitsvaOf : (fixed) → { text, sub } ou null, pour l'étude du jour ;
    //   haftaraOf : (civil, israel) → texte de la haftara du Chabbat (civil : { year, month, day }), facultatif.
    function build(input) {
        input = input || {};
        var text = Object.assign(defaultText(), input.text || {});
        var nowMs = typeof input.nowMs === 'number' ? input.nowMs : Date.now();
        var days = Math.max(1, Math.min(60, input.days || DEFAULT_DAYS));
        var place = input.place || null;
        var tz = place ? place.tz : (input.deviceTz || 'UTC');
        var israel = place ? Z.inIsrael(place) : false;
        var labels = input.zmanimLabels || {};

        // On part de la veille : la période en cours peut avoir commencé hier soir.
        var today = Z.civilDateOf(tz, nowMs);
        var firstFixed = CY.gregorianToFixed(today.year, today.month, today.day) - 1;

        var periods = [];
        var zmanim = [];
        var civilDays = [];
        var bounds = [];     // l'instant où commence le jour hébraïque de chaque jour civil + 1
        var zCache = {};
        var zOf = function (i) {
            if (!zCache[i]) { var c = civilOfFixed(firstFixed + i); zCache[i] = Z.zmanim(place, c.year, c.month, c.day, input.opts || {}); }
            return zCache[i];
        };
        for (var i = 0; i <= days + 1; i++) {
            var civil = civilOfFixed(firstFixed + i);
            var midnight = Z.localToUtc(tz, civil.year, civil.month, civil.day, 0);
            if (i >= 1 && i <= days) {
                var nextCivil = civilOfFixed(firstFixed + i + 1);
                civilDays.push({ day: dayKeyOf(civil), start: midnight, end: Z.localToUtc(tz, nextCivil.year, nextCivil.month, nextCivil.day, 0),
                    label: civilLabel(civil), study: studyOf(firstFixed + i, input, text) });
            }
            if (!place) { bounds.push({ fixed: firstFixed + i, start: midnight }); continue; }
            var z = zOf(i);
            // Le jour hébraïque suivant commence à la sortie des étoiles ; sans sortie des étoiles (été polaire), au coucher, sinon à minuit.
            var night = Z.rounded(z, 'tzeit');
            if (night === null) night = Z.rounded(z, 'shkia');
            if (night === null) night = midnight + DAY_MS;
            bounds.push({ fixed: firstFixed + i + 1, start: night });
            if (i === 0 || i > days) continue;   // la veille et le lendemain du dernier jour ne servent qu'aux bornes
            ZMANIM.forEach(function (item) {
                var ms = Z.rounded(z, item.key);
                if (ms === null || ms === undefined) return;
                zmanim.push({ key: item.key, label: labels[item.key] || item.label, short: item.short, at: ms, time: Z.formatTime(ms, tz, 'fr'), day: dayKeyOf(civil) });
            });
        }
        for (var j = 0; j + 1 < bounds.length; j++) {
            var b = bounds[j], next = bounds[j + 1];
            if (next.start <= nowMs) continue;   // une période déjà finie
            periods.push(periodOf(b.fixed, b.start, next.start, israel, input, text));
            if (periods.length >= days) break;
        }
        zmanim.sort(function (a, b) { return a.at - b.at; });

        return {
            v: VERSION,
            generatedAt: nowMs,
            place: place ? { name: place.name || '', tz: place.tz, israel: israel } : null,
            tz: tz,
            periods: periods,
            zmanim: zmanim.filter(function (e) { return e.at > nowMs - DAY_MS; }),
            days: civilDays,
            holy: place ? holyPeriods(firstFixed, days, israel, zOf, tz, input, text).filter(function (h) { return h.end === null || h.end > nowMs; }) : []
        };
    }

    return { VERSION: VERSION, ZMANIM: ZMANIM, build: build, nextFeast: nextFeast, parashaOf: parashaOf, studyOf: studyOf };
}));
