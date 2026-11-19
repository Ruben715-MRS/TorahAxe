// =========================================================================
// === TORAHAXE — LES DONNÉES DES WIDGETS DE L'IPHONE (calculs purs, sans DOM) ===
// =========================================================================
// Un widget iOS (écran d'accueil, écran verrouillé) est un petit programme Swift qui ne sait pas exécuter le JavaScript de l'app. L'app
// calcule donc ici, à chaque ouverture et à chaque changement de lieu ou d'opinion, les jours qui viennent (30 par défaut), et les dépose
// dans un fichier partagé avec le widget (js/app/widgets.js, plugin natif WidgetBridge). Le widget n'invente rien : il choisit seulement,
// selon l'heure, la période et les horaires à afficher. Si l'app n'est pas ouverte pendant un mois, le widget le dit (« Ouvrez TorahAxe »).
//
// Le contenu est celui de l'écran d'accueil (js/app/home.js) et de l'écran Zmanim (js/app/zmanim.js) :
//  - les PÉRIODES : une par jour hébraïque. Comme pour le Siddour (SiddurCore.hebrewDayFixed), le jour hébraïque change à la sortie des
//    étoiles. Chaque période a sa date hébraïque, la paracha de la semaine (celle du Chabbat qui vient), Tahanoun, et la prochaine fête.
//    Sans lieu choisi, le jour hébraïque suit le jour civil de l'appareil (diaspora), comme l'écran d'accueil.
//  - les HORAIRES : la liste à plat des zmanim, triés, arrondis à la minute comme dans l'app, avec l'heure déjà écrite dans le fuseau du lieu.
// Les textes (noms des mois, des fêtes…) sont fournis par l'appelant (i18n) ; à défaut, les libellés français ci-dessous.
// Testé dans tests/widgetDataCore.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./calendarYearCore.js'), require('./hebrewCalendarCore.js'), require('./zmanimCore.js'), require('./sedraCore.js'));
    } else {
        root.WidgetDataCore = factory(root.CalendarYearCore, root.HebrewCalendarCore, root.ZmanimCore, root.SedraCore);
    }
}(typeof self !== 'undefined' ? self : this, function (CY, HC, Z, Sedra) {
    'use strict';

    var VERSION = 1;
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
            today: 'Aujourd\'hui', tomorrow: 'Demain', inDays: 'Dans {n} jours'
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

    // Les données des widgets. `input` :
    //   place    : le lieu de l'écran Zmanim (ZmanimCore.normalizePlace), ou null ;
    //   opts     : les opinions choisies (zmStoredOpts) ;
    //   nowMs    : l'instant présent ;
    //   days     : le nombre de jours à préparer (30 par défaut) ;
    //   deviceTz : le fuseau de l'appareil, pour les jours sans lieu ;
    //   parashot : la liste des parachiot de data/torah/parashot.json ({ fr, he }) ;
    //   text     : { month(year, id), feast(id), tachanun: { yes, morning, no }, today, tomorrow, inDays }, chaque champ facultatif ;
    //   zmanimLabels : { clé: libellé } facultatif.
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
        var bounds = [];     // l'instant où commence le jour hébraïque de chaque jour civil + 1
        for (var i = 0; i <= days + 1; i++) {
            var civil = civilOfFixed(firstFixed + i);
            var midnight = Z.localToUtc(tz, civil.year, civil.month, civil.day, 0);
            if (!place) { bounds.push({ fixed: firstFixed + i, start: midnight }); continue; }
            var z = Z.zmanim(place, civil.year, civil.month, civil.day, input.opts || {});
            // Le jour hébraïque suivant commence à la sortie des étoiles ; sans sortie des étoiles (été polaire), au coucher, sinon à minuit.
            var night = Z.rounded(z, 'tzeit');
            if (night === null) night = Z.rounded(z, 'shkia');
            if (night === null) night = midnight + DAY_MS;
            bounds.push({ fixed: firstFixed + i + 1, start: night });
            if (i === 0 || i > days) continue;   // la veille et le lendemain du dernier jour ne servent qu'aux bornes
            ZMANIM.forEach(function (item) {
                var ms = Z.rounded(z, item.key);
                if (ms === null || ms === undefined) return;
                zmanim.push({ key: item.key, label: labels[item.key] || item.label, short: item.short, at: ms, time: Z.formatTime(ms, tz, 'fr') });
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
            zmanim: zmanim.filter(function (e) { return e.at > nowMs - DAY_MS; })
        };
    }

    return { VERSION: VERSION, ZMANIM: ZMANIM, build: build, nextFeast: nextFeast, parashaOf: parashaOf };
}));
