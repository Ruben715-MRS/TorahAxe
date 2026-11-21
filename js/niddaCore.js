// =========================================================================
// === PURETÉ FAMILIALE (NIDA) : LES DATES CLÉS D'APRÈS LES DATES SAISIES (pur, sans DOM, testé) ===
// =========================================================================
// Entrée : le premier jour des règles (`onset`) et, facultatif, le dernier jour où elles ont été vues (`last`), en 'AAAA-MM-JJ'.
// Sortie : les sept jours blancs (sheva nekiyim) et le soir de l'immersion (tevila).
//
// Règles retenues (le minimum commun, qui ne tranche pas les usages locaux) :
//   - les sept jours de nidda comptent à partir du premier jour des règles ; s'il y a eu du sang plus tard, le compte repart du dernier jour vu ;
//   - les sept jours blancs commencent le lendemain du dernier de ces jours (et après le dernier jour vu) ;
//   - l'immersion a lieu le soir qui suit le septième jour blanc : la nuit du jour suivant.
// Ce qui n'est PAS calculé ici : la vestot (cycle régulier, « veset »), les jours de pureté « dmei tohar », les cas de saignement hors cycle et de
// l'hefsek tahara. Contenu à faire relire par une personne compétente, qui fixera les usages retenus. Les dates ne quittent jamais l'appareil.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.NiddaCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var NIDDA_DAYS = 7;     // jours de nidda, à compter du premier jour des règles
    var CLEAN_DAYS = 7;     // jours blancs
    var MAX_SPAN = 35;      // au-delà, les dates ne sont pas un cycle : on demande de vérifier

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

    // Les dates clés. `onset` : premier jour des règles ; `last` : dernier jour vu (facultatif, par défaut `onset`).
    // Renvoie { ok: true, nidda: { from, to }, clean: { from, to }, tevila: 'AAAA-MM-JJ' (la nuit qui commence ce jour-là) }
    // ou { ok: false, reason : 'onset' | 'order' | 'span' }.
    function compute(onset, last) {
        var a = dayNumber(onset);
        if (a === null) return { ok: false, reason: 'onset' };
        var b = last ? dayNumber(last) : a;
        if (b === null || b < a) return { ok: false, reason: 'order' };
        if (b - a > MAX_SPAN) return { ok: false, reason: 'span' };
        var niddaEnd = Math.max(a + NIDDA_DAYS - 1, b);          // dernier jour de nidda
        var cleanStart = niddaEnd + 1;
        var cleanEnd = cleanStart + CLEAN_DAYS - 1;
        return {
            ok: true,
            nidda: { from: isoOf(a), to: isoOf(niddaEnd) },
            clean: { from: isoOf(cleanStart), to: isoOf(cleanEnd) },
            tevila: isoOf(cleanEnd + 1)
        };
    }

    return { NIDDA_DAYS: NIDDA_DAYS, CLEAN_DAYS: CLEAN_DAYS, MAX_SPAN: MAX_SPAN, dayNumber: dayNumber, isoOf: isoOf, addDays: addDays, compute: compute };
}));
