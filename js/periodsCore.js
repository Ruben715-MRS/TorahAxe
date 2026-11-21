// =========================================================================
// === PÉRIODES ET USAGES — DATES, SOUS-PÉRIODES ET STATUT DES RÈGLES (sans DOM) ===
// =========================================================================
// Les données sont dans js/periodsData.js ; l'écran dans js/app/periods.js. Ici, ce qui se calcule, testé dans tests/periodsCore.test.js :
//  - les dates d'une période pour une année hébraïque (selon le rite quand la fin en dépend ; Israël ou diaspora pour le 9 Av déplacé) et ses sous-périodes ;
//  - ce qui est en cours un jour donné, et ce qui vient ensuite (la liste de l'écran, la carte « En ce moment » de l'écran Aujourd'hui) ;
//  - le statut d'une règle pour un rite, un profil (homme / femme) et une sous-période, avec l'usage des autres rites ;
//  - la vue d'une période : règles groupées par rubrique, filtrées par statut.
// Les jours sont des « jours fixes » (voir js/hebrewCalendarCore.js). Le champ `review` des données n'est jamais rendu ici : seule reviewList() le lit.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./periodsData.js'), require('./hebrewCalendarCore.js'));
    else root.PeriodsCore = factory(root.PeriodsData, root.HebrewCalendarCore);
}(typeof self !== 'undefined' ? self : this, function (Data, HC) {
    'use strict';

    function riteOf(rite) { return Data.RITES[rite] ? rite : 'sefarade'; }
    function sexOf(sex) { return sex === 'f' || sex === 'm' ? sex : null; }

    function periodById(id) {
        for (var i = 0; i < Data.PERIODS.length; i++) if (Data.PERIODS[i].id === id) return Data.PERIODS[i];
        return null;
    }

    function fixedOf(year, spec) {
        var g = HC.hebrewToGregorian(year, spec.m, spec.d);
        return g ? g.fixed : null;
    }

    // --- Les dates ---------------------------------------------------------------------------------------------------------------

    function endOf(p, year, rite, israel) {
        var to = p.to;
        if (to.feast) {
            var feast = HC.feastsOf(year, !!israel).filter(function (f) { return f.id === to.feast; })[0];
            return feast ? feast.last : null;
        }
        var spec = (to.rite && to.rite[rite]) || to.default;
        return fixedOf(year, spec);
    }

    // Les sous-périodes des Trois Semaines : du 17 Tamouz à Roch ’Hodech Av ; de Roch ’Hodech Av à la semaine du 9 Av ; cette semaine, qui va du dimanche
    // qui précède le 9 Av (ou le 9 Av lui-même, un dimanche) jusqu'au 9 Av (jeûne déplacé compris).
    function threeWeeksPhases(year, start, end) {
        var av1 = fixedOf(year, { m: 'Av', d: 1 });
        var av9 = fixedOf(year, { m: 'Av', d: 9 });
        if (av1 === null || av9 === null) return [];
        var weekStart = av9 - HC.weekdayOf(av9);   // dimanche = 0
        return [
            { id: 'p1', start: start, end: av1 - 1 },
            { id: 'p2', start: av1, end: weekStart - 1 },
            { id: 'p3', start: weekStart, end: end }
        ];
    }

    // Les sous-périodes d'une fête, d'après le premier jour `first`, le dernier `last` et le nombre de jours de fête au début et à la fin (1 en Israël, 2 dans la diaspora).
    //  Pessah : la veille (14 Nissan), les premiers jours de fête, Hol Hamoed, les derniers jours de fête. Souccot : les premiers jours de fête, puis Hol Hamoed jusqu'à Hochana Rabba.
    function feastPhases(id, first, last, israel) {
        var n = israel ? 1 : 2;
        if (id === 'pessah') {
            return [
                { id: 'p0', start: first - 1, end: first - 1 },
                { id: 'p1', start: first, end: first + n - 1 },
                { id: 'p2', start: first + n, end: last - n },
                { id: 'p3', start: last - n + 1, end: last }
            ];
        }
        if (id === 'souccot') return [{ id: 'p1', start: first, end: first + n - 1 }, { id: 'p2', start: first + n, end: last }];
        return [];
    }

    // Les Roch 'Hodech d'une année (sans Tichri, qui est Roch Hachana) : [{ id (du mois), first (le 1er du mois), start (le 30 qui précède, s'il y en a un), end }].
    function roshHodeshOf(year) {
        var months = HC.monthsOf(year), out = [];
        for (var i = 1; i < months.length; i++) {
            var first = fixedOf(year, { m: months[i].id, d: 1 });
            if (first !== null) out.push({ id: months[i].id, first: first, start: months[i - 1].days === 30 ? first - 1 : first, end: first });
        }
        return out;
    }

    // Le premier samedi entre deux jours (inclus), ou null ; le dernier samedi qui précède ou est un jour donné.
    function saturdayIn(from, to) {
        var s = from + ((6 - HC.weekdayOf(from) + 7) % 7);
        return s <= to ? s : null;
    }
    function saturdayOnOrBefore(day) { return day - ((HC.weekdayOf(day) + 1) % 7); }

    // Les Chabbatot particuliers d'une année : [{ type, day }]. Les règles de calendrier sont celles de la tradition :
    //  Chekalim : le chabbat qui précède Roch 'Hodech Adar (ou qui l'est) ; Zakhor : celui qui précède Pourim ; Hahodech : celui qui précède Roch 'Hodech Nissan (ou qui l'est) ;
    //  Para : le chabbat avant Hahodech ; Chouva : entre Roch Hachana et Kippour ; Hagadol : celui qui précède Pessah ; Hazon : celui qui précède Tich'a BeAv (ou qui l'est) ; Nahamou : celui qui le suit.
    function specialSabbaths(year) {
        var out = [];
        function add(type, day) { if (day !== null && day !== undefined) out.push({ type: type, day: day }); }
        var adar = fixedOf(year, { m: HC.leap(year) ? 'AdarII' : 'Adar', d: 1 });
        var purim = HC.feastsOf(year, false).filter(function (f) { return f.id === 'pourim'; })[0];
        var nisan = fixedOf(year, { m: 'Nisan', d: 1 });
        var hanouka = HC.feastsOf(year, false).filter(function (f) { return f.id === 'hanouka'; })[0];
        if (adar !== null) add('chekalim', saturdayOnOrBefore(adar));
        if (purim) add('zakhor', saturdayOnOrBefore(purim.fixed - 1));
        if (nisan !== null) { add('hahodesh', saturdayOnOrBefore(nisan)); add('para', saturdayOnOrBefore(nisan) - 7); }
        add('chouva', saturdayIn(fixedOf(year, { m: 'Tishri', d: 3 }), fixedOf(year, { m: 'Tishri', d: 9 })));
        add('hagadol', saturdayIn(fixedOf(year, { m: 'Nisan', d: 8 }), fixedOf(year, { m: 'Nisan', d: 14 })));
        add('chazon', saturdayIn(fixedOf(year, { m: 'Av', d: 3 }), fixedOf(year, { m: 'Av', d: 9 })));
        add('nahamou', saturdayIn(fixedOf(year, { m: 'Av', d: 10 }), fixedOf(year, { m: 'Av', d: 16 })));
        if (hanouka) for (var d = saturdayIn(hanouka.fixed, hanouka.last); d !== null && d <= hanouka.last; d += 7) add('hanouka', d);
        roshHodeshOf(year).forEach(function (rc) {
            add('roshhodesh', saturdayIn(rc.start, rc.end));
            add('mevarchim', saturdayIn(rc.first - 7 - (rc.start < rc.first ? 1 : 0), rc.start - 1));
        });
        return out;
    }

    // Les occurrences d'une période dans une année hébraïque : [{ id, year (hébraïque), start, end, phases: [{ id, start, end }], feast?, month? }].
    //  `feast` : l'identifiant de la fête quand une période en regroupe plusieurs (les jeûnes) ; `month` : le mois d'un Roch 'Hodech.
    // `ctx` : { rite, israel }. Une période hebdomadaire (Chabbat) n'a pas d'occurrence par année : voir stateOf.
    function occurrences(p, year, ctx) {
        ctx = ctx || {};
        var israel = !!ctx.israel;
        var kind = p.kind || 'range';
        if (kind === 'feasts') {
            return HC.feastsOf(year, israel).filter(function (f) { return p.feasts.indexOf(f.id) >= 0; }).map(function (f) {
                var start = f.fixed - (p.pre || 0);
                return { id: p.id, year: year, start: start, end: f.last, phases: p.phases ? feastPhases(p.id, f.fixed, f.last, israel) : [], feast: f.id };
            });
        }
        if (kind === 'monthly') {
            return roshHodeshOf(year).map(function (rc) { return { id: p.id, year: year, start: rc.start, end: rc.end, phases: [], month: rc.id }; });
        }
        if (kind === 'shabbatot') {   // un chabbat qui est à la fois deux sortes (Roch 'Hodech et Chekalim) n'est qu'une occurrence, à deux sous-périodes
            var byDay = {}, list = [];
            specialSabbaths(year).forEach(function (x) {
                if (!byDay[x.day]) { byDay[x.day] = { id: p.id, year: year, start: x.day, end: x.day, phases: [] }; list.push(byDay[x.day]); }
                byDay[x.day].phases.push({ id: x.type, start: x.day, end: x.day });
            });
            var order = p.phases.map(function (ph) { return ph.id; });
            list.forEach(function (r) { r.phases.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); }); });
            return list.sort(function (a, b) { return a.start - b.start; });
        }
        if (kind === 'weekly') return [];
        var start = fixedOf(year, p.from);
        var end = endOf(p, year, riteOf(ctx.rite), israel);
        if (start === null || end === null) return [];
        return [{ id: p.id, year: year, start: start, end: end, phases: p.phases ? threeWeeksPhases(year, start, end) : [] }];
    }

    // La première occurrence d'une année, ou null (année hors des bornes, période hebdomadaire).
    function rangeOf(id, year, ctx) {
        var p = periodById(id);
        return p ? (occurrences(p, year, ctx)[0] || null) : null;
    }

    function phaseAt(range, fixed) {
        for (var i = 0; i < range.phases.length; i++) if (fixed >= range.phases[i].start && fixed <= range.phases[i].end) return range.phases[i].id;
        return null;
    }

    // Toutes les sous-périodes en cours un jour donné (un chabbat peut en avoir plusieurs : Roch 'Hodech et Chekalim).
    function phasesAt(range, fixed) {
        return range.phases.filter(function (ph) { return fixed >= ph.start && fixed <= ph.end; }).map(function (ph) { return ph.id; });
    }

    // Les dates de chaque sous-période, pour sa prochaine occurrence (ou celle en cours) : { id : { start, end } }. Pour les Chabbatot particuliers, chacun a sa date.
    function phaseRanges(id, fixed, ctx) {
        var p = periodById(id), h = HC.hebrewFromFixed(fixed), out = {};
        if (!p || !h || !p.phases) return out;
        [h.year, h.year + 1].forEach(function (y) {
            occurrences(p, y, ctx).forEach(function (r) {
                r.phases.forEach(function (ph) {
                    if (ph.end < fixed) return;
                    if (!out[ph.id] || ph.start < out[ph.id].start) out[ph.id] = { start: ph.start, end: ph.end };
                });
            });
        });
        return out;
    }

    // L'état d'une période un jour donné, ou null si elle est hors des bornes du calendrier.
    //  'active' : en cours ; 'soon' : commence dans `lead_days` jours au plus ; 'upcoming' : plus tard.
    // { id, state, range (l'occurrence en cours ou la prochaine), daysTo (jours avant le début ; 0 si en cours), phase (sous-période en cours ou null) }.
    // L'année hébraïque de `fixed` et la suivante suffisent : toute occurrence commence et finit dans une même année hébraïque, et la prochaine est toujours dans l'une des deux.
    function stateOf(id, fixed, ctx) {
        var p = periodById(id);
        var h = HC.hebrewFromFixed(fixed);
        if (!p || !h) return null;
        var best = null;
        if (p.kind === 'weekly') {   // chaque samedi (jour 6)
            var saturday = fixed + ((6 - HC.weekdayOf(fixed) + 7) % 7);
            best = { id: id, year: h.year, start: saturday, end: saturday, phases: [] };
        } else {
            [h.year, h.year + 1].forEach(function (y) {
                occurrences(p, y, ctx).forEach(function (r) {
                    if (r.end < fixed) return;
                    if (!best || r.start < best.start) best = r;
                });
            });
        }
        if (!best) return null;
        var active = best.start <= fixed;
        var daysTo = active ? 0 : best.start - fixed;
        return {
            id: id, state: active ? 'active' : (daysTo <= (p.lead_days || 0) ? 'soon' : 'upcoming'),
            range: best, daysTo: daysTo, phase: active ? phaseAt(best, fixed) : null, phasesNow: active ? phasesAt(best, fixed) : []
        };
    }

    // Toutes les périodes, dans l'ordre de l'écran : celles en cours, puis les plus proches.
    function listView(fixed, ctx) {
        var rank = { active: 0, soon: 0, upcoming: 1 };
        return Data.PERIODS.map(function (p) { return stateOf(p.id, fixed, ctx); }).filter(Boolean)
            .sort(function (a, b) { return rank[a.state] - rank[b.state] || a.range.start - b.range.start; });
    }

    // Ce qui concerne l'écran Aujourd'hui : les périodes en cours et celles qui commencent bientôt.
    function todayView(fixed, ctx) {
        return listView(fixed, ctx).filter(function (s) { return s.state === 'active' || s.state === 'soon'; });
    }

    // --- Le statut des règles ----------------------------------------------------------------------------------------------------

    function pick(value, phase) {
        if (value && typeof value === 'object') return phase && value[phase] !== undefined ? value[phase] : undefined;
        return value;
    }

    // L'écart d'un rite : celui qui est écrit pour lui ; 'habad' suit 'ashkenaze' quand rien n'est écrit.
    function riteLayer(rule, rite) {
        var table = rule.rite || {};
        return table[rite] || (rite === 'habad' ? table.ashkenaze : null) || null;
    }

    // Le statut et la précision d'une règle : { st, note }. `ctx` : { rite, sex, phase }. Sans sous-période choisie, une règle à sous-périodes n'a pas de statut (st = null).
    function resolve(rule, ctx) {
        ctx = ctx || {};
        var rite = riteOf(ctx.rite), sex = sexOf(ctx.sex);
        var st = rule.st, note = rule.note;
        var layer = riteLayer(rule, rite);
        if (layer) {
            if (layer.st !== undefined) st = layer.st;
            if (layer.note !== undefined) note = layer.note;
        }
        var s = sex && rule.sex ? rule.sex[sex] : null;
        if (s && (!s.rite || s.rite.indexOf(rite) >= 0)) {
            if (s.st !== undefined) st = s.st;
            if (s.note !== undefined) note = s.note;
        }
        var status = pick(st, ctx.phase);
        var text = pick(note, ctx.phase);
        return { st: status === undefined ? null : status, note: text || '' };
    }

    // L'usage des autres rites quand il diffère du rite choisi : [{ rites: [ids], st, note }] (les rites qui ont le même usage sont regroupés).
    function others(rule, ctx) {
        var rite = riteOf(ctx.rite);
        var mine = resolve(rule, ctx);
        var groups = [], byKey = {};
        Data.RITE_ORDER.forEach(function (r) {
            if (r === rite) return;
            var o = resolve(rule, { rite: r, sex: ctx.sex, phase: ctx.phase });
            if (o.st === mine.st) return;
            var key = o.st + '|' + o.note;
            if (byKey[key]) { byKey[key].rites.push(r); return; }
            byKey[key] = { rites: [r], st: o.st, note: o.note };
            groups.push(byKey[key]);
        });
        return groups;
    }

    // --- La vue d'une période ------------------------------------------------------------------------------------------------

    function filterOf(filter) { return Data.FILTERS.indexOf(filter) >= 0 ? filter : 'all'; }

    // `ctx` : { rite, sex, phase, filter, fixed, israel }. Retourne null si la période n'existe pas.
    //  { id, he, fr, lead, src, until (texte, selon le rite), phases: [{ id, fr, short }] (vide si la période n'en a pas), phase (la sous-période affichée),
    //    groups: [{ grp, items: [{ id, fr, st, note, src, others }] }], days: [{ id, fr, date, text, src }], total (règles avant filtre) }
    function view(id, ctx) {
        var p = periodById(id);
        if (!p) return null;
        ctx = ctx || {};
        var rite = riteOf(ctx.rite);
        var phases = p.phases || [];
        var phase = null;
        if (phases.length) phase = phases.some(function (x) { return x.id === ctx.phase; }) ? ctx.phase : phases[0].id;
        var filter = filterOf(ctx.filter);
        var groups = [], byGrp = {}, total = 0;
        p.rules.forEach(function (rule) {
            var r = resolve(rule, { rite: rite, sex: ctx.sex, phase: phase });
            if (!r.st) return;
            total++;
            if (filter !== 'all' && Data.STATUS[r.st].filter !== filter) return;
            var item = { id: rule.id, fr: rule.fr, st: r.st, note: r.note, src: rule.src || '', others: others(rule, { rite: rite, sex: ctx.sex, phase: phase }) };
            if (!byGrp[rule.grp]) { byGrp[rule.grp] = { grp: rule.grp, items: [] }; groups.push(byGrp[rule.grp]); }
            byGrp[rule.grp].items.push(item);
        });
        return {
            id: p.id, kind: p.kind || 'range', he: p.he, fr: p.fr, lead: p.lead, src: p.src, until: p.until ? p.until[rite] : '',
            phases: phases.map(function (x) { return { id: x.id, fr: x.fr, short: x.short }; }), phase: phase,
            groups: groups, total: total,
            days: (p.days || []).map(function (d) { return { id: d.id, fr: d.fr, date: d.date, text: d.text, src: d.src || '' }; })
        };
    }

    // La liste des règles et jours particuliers qui attendent une relecture : [{ period, id, fr }]. Réservée à qui lit les données : l'application ne l'appelle pas.
    function reviewList() {
        var out = [];
        Data.PERIODS.forEach(function (p) {
            p.rules.concat(p.days || []).forEach(function (r) { if (r.review) out.push({ period: p.id, id: r.id, fr: r.fr }); });
        });
        return out;
    }

    return {
        riteOf: riteOf, periodById: periodById, rangeOf: rangeOf, phaseAt: phaseAt, phasesAt: phasesAt, phaseRanges: phaseRanges, stateOf: stateOf, listView: listView, todayView: todayView,
        resolve: resolve, others: others, view: view, reviewList: reviewList
    };
}));
