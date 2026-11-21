// =========================================================================
// === PURETÉ FAMILIALE (NIDA) : LES DATES CLÉS D'APRÈS LES DATES SAISIES (pur, sans DOM, testé) ===
// =========================================================================
// Entrées (dates 'AAAA-MM-JJ') : le début du flux (`onset`), le dernier jour où il a été vu (`last`, facultatif), le hefsek tahara réussi (`hefsek`,
// facultatif), l'usage de la personne (`usage` : 'ashk' ou 'sef' ; sans usage, les deux dates sont données). Les vestot se calculent à partir de
// l'historique des débuts de flux (`starts` : [{ date, ona: 'day' | 'night' }], du plus ancien au plus récent).
//
// Règles retenues (à faire relire par une personne compétente : les usages diffèrent, et chaque usage est indiqué à l'écran) :
//   - le décompte de la nidda part du début du flux, qui est le premier jour ; la nidda dure au moins sept jours ; si le sang dure plus longtemps,
//     le dernier jour vu prolonge la nidda ;
//   - le hefsek tahara n'est pas possible avant le cinquième jour (usage ashkénaze) ou le quatrième jour (usage séfarade, selon le Choulhan Aroukh),
//     compté à partir du début du flux, et jamais le jour même où l'on a vu du sang ;
//   - les sept jours blancs commencent le lendemain du hefsek réussi ; le hefsek ne compte pas parmi eux ;
//   - l'immersion (tevila) a lieu le soir qui suit le septième jour blanc, c'est-à-dire la nuit du jour suivant.
// Ce qui n'est PAS calculé : la vestot établie (« veset kavua », cycle fixe reconnu après trois fois) ; les jours de pureté au-delà des sept jours blancs ;
// les taches (ketem) et la hargasha ; les cas de saignement hors cycle. L'application rappelle de consulter un rabbin ou une yoetzet dans ces cas.
//
// Les vestot (veset che'eino kavua) : trois onot, calculées depuis le dernier début de flux (jour du flux inclus), chacune de même moment (jour ou nuit) que ce début :
//   - l'ona beinonit : le 30e jour (le 31e et les 24 heures ne sont que des usages de certaines communautés, indiqués à part) ;
//   - le yom haḥodech : le même jour du mois hébraïque, au mois suivant où ce jour existe ;
//   - la haflagah : le même nombre de jours que l'intervalle entre les deux derniers débuts de flux (il faut au moins deux débuts).
// Les dates qui suivent un nouveau début de flux ne valent plus : les calculs repartent du dernier début.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendarYearCore.js'), require('./hebrewCalendarCore.js'));
    else root.NiddaCore = factory(root.CalendarYearCore, root.HebrewCalendarCore);
}(typeof self !== 'undefined' ? self : this, function (CY, HC) {
    'use strict';

    var NIDDA_DAYS = 7;          // jours de nidda, à compter du début du flux
    var CLEAN_DAYS = 7;          // jours blancs
    var MAX_SPAN = 35;           // au-delà, les dates ne sont pas un même cycle : on demande de vérifier
    var MAX_STARTS = 3;          // débuts de flux gardés dans l'historique
    var EPOCH_FIXED = CY.gregorianToFixed(1970, 1, 1);     // le jour 0 (1er janvier 1970) en « jours fixes » du calendrier
    // Le premier jour de nidda qui permet le hefsek, selon l'usage (1 = le début du flux).
    var USAGES = {
        ashk: { id: 'ashk', firstHefsekDay: 5, note: 'Usage ashkénaze : hefsek à partir du 5e jour (Rama, YD 196).' },
        sef: { id: 'sef', firstHefsekDay: 4, note: 'Usage séfarade selon le Choulhan Aroukh : hefsek à partir du 4e jour. Certaines communautés attendent le 5e jour.' }
    };

    // « 2026-11-21 » → nombre de jours depuis 1970 (sans fuseau horaire) ; null si la date n'est pas valide.
    function dayNumber(iso) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
        if (!m) return null;
        var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
        var d = new Date(t);
        if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
        return Math.round(t / 86400000);
    }

    // Le jour `n` (nombre de jours depuis 1970) en 'AAAA-MM-JJ'.
    function isoOf(n) {
        var d = new Date(n * 86400000);
        var pad = function (x) { return x < 10 ? '0' + x : String(x); };
        return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    }

    function addDays(iso, k) {
        var n = dayNumber(iso);
        return n === null ? null : isoOf(n + k);
    }

    // Le jour calendaire hébraïque d'une date 'AAAA-MM-JJ' : { day, monthId, year } ou null hors des années couvertes.
    function hebrewOf(iso) {
        var n = dayNumber(iso);
        if (n === null) return null;
        try {
            var h = HC.hebrewFromFixed(n + EPOCH_FIXED);
            return h && h.day ? { day: h.day, monthId: h.month, year: h.year } : null;
        } catch (e) { return null; }
    }

    // --- La nidda, le hefsek, les jours blancs -----------------------------------------------------------------------------------------------------
    // Les dates de la nidda et le premier hefsek possible, pour chaque usage (ou pour l'usage donné). Erreur : { ok: false, reason }.
    function niddaOf(onset, last) {
        var a = dayNumber(onset);
        if (a === null) return { ok: false, reason: 'onset' };
        var b = last ? dayNumber(last) : a;
        if (b === null || b < a) return { ok: false, reason: 'order' };
        if (b - a > MAX_SPAN) return { ok: false, reason: 'span' };
        var end = Math.max(a + NIDDA_DAYS - 1, b);
        return { ok: true, a: a, b: b, end: end, nidda: { from: isoOf(a), to: isoOf(end) } };
    }

    // Le premier hefsek possible : le jour de l'usage compté depuis le début du flux, et après le dernier jour vu.
    function earliestHefsek(niddaInfo, usageId) {
        var u = USAGES[usageId];
        var byUsage = niddaInfo.a + u.firstHefsekDay - 1;
        return isoOf(Math.max(byUsage, niddaInfo.b + 1));
    }

    // Calcul complet : { ok, nidda, earliest : { ashk, sef } | { [usage] }, hefsek?, clean?, tevila? }.
    // `hefsek` : la date du hefsek tahara réussi. Sans elle, on donne seulement la nidda et le premier hefsek possible.
    function compute(onset, last, opts) {
        var o = opts || {};
        var n = niddaOf(onset, last || null);
        if (!n.ok) return n;
        var usages = o.usage && USAGES[o.usage] ? [o.usage] : ['ashk', 'sef'];
        var earliest = {};
        usages.forEach(function (u) { earliest[u] = earliestHefsek(n, u); });
        var out = { ok: true, nidda: n.nidda, earliest: earliest };
        if (!o.hefsek) return out;
        var h = dayNumber(o.hefsek);
        if (h === null) return { ok: false, reason: 'hefsek' };
        if (o.usage && h < dayNumber(earliest[o.usage])) return { ok: false, reason: 'hefsekEarly', earliest: earliest[o.usage] };
        if (!o.usage && h < Math.min(dayNumber(earliest.ashk), dayNumber(earliest.sef))) return { ok: false, reason: 'hefsekEarly', earliest: earliest.sef };
        out.hefsek = isoOf(h);
        out.clean = { from: isoOf(h + 1), to: isoOf(h + CLEAN_DAYS) };
        out.tevila = isoOf(h + CLEAN_DAYS + 1);
        return out;
    }

    // --- Les vestot ------------------------------------------------------------------------------------------------------------------------------------
    // Le prochain jour du mois hébraïque égal à celui de `iso`, au mois suivant où il existe (on saute les mois qui n'ont pas ce jour) ; null si introuvable.
    function nextSameHebrewDay(iso) {
        var n = dayNumber(iso);
        var h = hebrewOf(iso);
        if (n === null || !h) return null;
        for (var k = 1; k <= 70; k++) {
            var f = hebrewOf(isoOf(n + k));
            if (!f) return null;
            if (f.day === h.day && f.monthId !== h.monthId) return isoOf(n + k);
        }
        return null;
    }

    // Les vestot à observer après le dernier début de flux. `starts` : [{ date, ona }] du plus ancien au plus récent.
    // Renvoie { ok, list : [{ kind : 'beinonit' | 'hodesh' | 'haflagah', date, ona }], usages : ['31e jour', '24 heures'] } ou { ok: false, reason }.
    function vestot(starts) {
        var list = (starts || []).slice().sort(function (x, y) { return dayNumber(x.date) - dayNumber(y.date); });
        if (!list.length) return { ok: false, reason: 'none' };
        var last = list[list.length - 1];
        var n = dayNumber(last.date);
        if (n === null) return { ok: false, reason: 'onset' };
        var ona = last.ona === 'night' ? 'night' : 'day';
        var out = { ok: true, list: [], usages: ['31e jour', '24 heures'] };
        out.list.push({ kind: 'beinonit', date: isoOf(n + 29), ona: ona });
        var hodesh = nextSameHebrewDay(last.date);
        if (hodesh) out.list.push({ kind: 'hodesh', date: hodesh, ona: ona });
        if (list.length >= 2) {
            var prev = dayNumber(list[list.length - 2].date);
            if (prev !== null && prev < n) out.list.push({ kind: 'haflagah', date: isoOf(n + (n - prev)), ona: ona });
        }
        return out;
    }

    return {
        NIDDA_DAYS: NIDDA_DAYS, CLEAN_DAYS: CLEAN_DAYS, MAX_SPAN: MAX_SPAN, MAX_STARTS: MAX_STARTS, USAGES: USAGES,
        dayNumber: dayNumber, isoOf: isoOf, addDays: addDays, hebrewOf: hebrewOf,
        niddaOf: niddaOf, earliestHefsek: earliestHefsek, compute: compute,
        nextSameHebrewDay: nextSameHebrewDay, vestot: vestot
    };
}));
