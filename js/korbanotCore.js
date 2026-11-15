// =========================================================================
// === HISTORIAXE — LES KORBANOT : FILTRES ET CALCULS (sans DOM) ===
// =========================================================================
// Les données sont dans js/korbanotData.js ; l'écran dans js/app/korbanot.js. Ici, ce qui se calcule, testé dans tests/korbanotCore.test.js :
//  - le tableau des offrandes, filtré par type, collectif ou individuel, animal, sexe, caractère (obligatoire ou volontaire), sainteté, texte ;
//  - le moussaf : on choisit des jours (ou des fêtes), on obtient le total des animaux, de la farine, de l'huile et du vin ;
//  - les accompagnements (farine, huile, vin) d'un nombre d'animaux, et les mena'hot (offrandes de farine) filtrées ;
//  - les princes : on choisit des jours de l'inauguration de l'autel, on obtient les animaux et les métaux ;
//  - les prélèvements et dîmes : à partir d'une quantité, la terouma, les dîmes et ce qui reste ;
//  - le rachat des premiers-nés (Nombres 3), détaillé ligne à ligne.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./korbanotData.js'));
    else root.KorbanotCore = factory(root.KorbanotData);
}(typeof self !== 'undefined' ? self : this, function (Data) {
    'use strict';

    function normalize(text) {
        return String(text == null ? '' : text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe')
            .replace(/[^a-z0-9]+/g, ' ').trim();
    }

    var TYPE_BY_ID = {};
    Data.TYPES.forEach(function (t) { TYPE_BY_ID[t.id] = t; });

    // La sainteté d'une ligne : celle de son type, sauf les deux agneaux de paix de Chavouot, comptés parmi les sacrifices suprêmement saints.
    function holinessOf(row) {
        return row.id === 'c-deux-pains' ? 'suprême' : TYPE_BY_ID[row.type].holiness;
    }

    // --- Le tableau des offrandes ----------------------------------------------------------------------------------------
    // `f` : { type, scope, species, sex, duty, holiness, query } ; une valeur absente, vide ou « all » ne filtre pas.
    function active(v) { return v !== undefined && v !== null && v !== '' && v !== 'all'; }

    function filterRows(f) {
        f = f || {};
        var q = active(f.query) ? normalize(f.query) : '';
        return Data.ROWS.filter(function (r) {
            if (active(f.type) && r.type !== f.type) return false;
            if (active(f.scope) && r.scope !== f.scope) return false;
            if (active(f.species) && r.species.indexOf(f.species) < 0) return false;
            if (active(f.sex) && !(r.sex === f.sex || r.sex === 'MF')) return false;
            if (active(f.duty) && !(r.duty === f.duty || r.duty === 'les-deux')) return false;
            if (active(f.holiness) && holinessOf(r) !== f.holiness) return false;
            if (q && normalize([r.situation, r.animal, TYPE_BY_ID[r.type].fr, r.ref, r.part].join(' ')).indexOf(q) < 0) return false;
            return true;
        });
    }

    // --- Le moussaf -------------------------------------------------------------------------------------------------------
    var DAY_BY_ID = {};
    Data.MOUSSAF.forEach(function (d) { DAY_BY_ID[d.id] = d; });

    // Les offrandes de jours choisis (identifiants de Data.MOUSSAF), chacune multipliée par ses jours (Pessa'h : 7) et suivie des occasions qu'elle
    // inclut (Roch Hachana : le moussaf de Roch 'Hodech). Avec `options.tamid`, deux agneaux de plus par jour (le sacrifice quotidien).
    // Retour : { occasions, days, bulls, rams, lambs, goats, animals, flour (dixièmes d'épha), oil et wine (douzièmes de hin) }.
    function moussafTotals(ids, options) {
        options = options || {};
        var total = { occasions: 0, days: 0, bulls: 0, rams: 0, lambs: 0, goats: 0, animals: 0, flour: 0, oil: 0, wine: 0 };
        var done = {};
        function add(day, mult) {
            total.days += mult;
            total.bulls += day.bulls * mult; total.rams += day.rams * mult; total.lambs += day.lambs * mult; total.goats += day.goats * mult;
        }
        (ids || []).forEach(function (id) {
            var day = DAY_BY_ID[id];
            if (!day || done[id]) return;
            done[id] = true;
            total.occasions += 1;
            add(day, day.times);
            // Les occasions incluses s'ajoutent aux offrandes, mais pas aux jours (le même jour du calendrier).
            day.includes.forEach(function (other) {
                var o = DAY_BY_ID[other];
                if (!o) return;
                total.bulls += o.bulls * o.times; total.rams += o.rams * o.times; total.lambs += o.lambs * o.times; total.goats += o.goats * o.times;
            });
        });
        if (options.tamid) total.lambs += Data.TAMID.lambs * total.days;
        total.animals = total.bulls + total.rams + total.lambs + total.goats;
        // Farine, huile et vin accompagnent chaque ola (jamais le bouc de 'hatat).
        total.flour = total.bulls * Data.SIDES.bull.flour + total.rams * Data.SIDES.ram.flour + total.lambs * Data.SIDES.lamb.flour;
        total.oil = total.bulls * Data.SIDES.bull.oil + total.rams * Data.SIDES.ram.oil + total.lambs * Data.SIDES.lamb.oil;
        total.wine = total.bulls * Data.SIDES.bull.wine + total.rams * Data.SIDES.ram.wine + total.lambs * Data.SIDES.lamb.wine;
        return total;
    }

    // Des sélections toutes faites.
    function moussafPresets() {
        var souccot = Data.MOUSSAF.filter(function (d) { return /^souccot-/.test(d.id); }).map(function (d) { return d.id; });
        return {
            pessah: ['pessah'],
            souccot: souccot,
            souccot8: souccot.concat(['chemini-atseret']),
            hautesFetes: ['roch-hachana', 'kippour'],
            all: Data.MOUSSAF.map(function (d) { return d.id; }),
            none: []
        };
    }

    // --- Les fractions de mesure -------------------------------------------------------------------------------------------
    function gcd(a, b) { return b ? gcd(b, a % b) : a; }
    // Des douzièmes de hin, écrits en fractions simples : 3 → « 1/4 hin », 6 → « 1/2 hin », 25 → « 2 hin et 1/12 ».
    function hinText(twelfths) {
        var whole = Math.floor(twelfths / 12), rem = twelfths % 12;
        var frac = rem ? (rem / gcd(rem, 12)) + '/' + (12 / gcd(rem, 12)) : '';
        if (!whole) return frac ? frac + ' hin' : '0 hin';
        return whole + ' hin' + (frac ? ' et ' + frac : '');
    }
    // Des dixièmes d'épha, en décimal à la française : 10 → « 1 épha », 25 → « 2,5 épha », 3 → « 3/10 d'épha ».
    function ephaText(tenths) {
        if (tenths < 10) return tenths + '/10 d\'épha';
        return String(tenths / 10).replace('.', ',') + ' épha';
    }

    // --- Les accompagnements (nessakhim) --------------------------------------------------------------------------------------------
    // `counts` : { <identifiant d'un accompagnement>: nombre d'animaux } → ce qu'il faut en farine (issaron), en huile et en vin (log), animal par animal.
    function accompanimentTotals(counts) {
        counts = counts || {};
        var total = { animals: 0, flour: 0, oil: 0, wine: 0, lines: [] };
        Data.ACCOMPANIMENTS.forEach(function (a) {
            var n = Math.max(0, Math.floor(Number(counts[a.id]) || 0));
            if (!n) return;
            total.animals += n;
            total.flour += a.flour * n; total.oil += a.oil * n; total.wine += a.wine * n;
            total.lines.push({ id: a.id, n: n, flour: a.flour * n, oil: a.oil * n, wine: a.wine * n });
        });
        return total;
    }

    // --- Les mena'hot -----------------------------------------------------------------------------------------------------------------
    // `f` : { flour: 'blé' | 'orge', incense: 'oui' | 'non', burned, scope, query } ; « individuel » et « collectif » gardent aussi les lignes « les deux ».
    function filterMenahot(f) {
        f = f || {};
        var q = active(f.query) ? normalize(f.query) : '';
        return Data.MENAHOT.filter(function (m) {
            if (active(f.flour) && m.flour !== f.flour) return false;
            if (active(f.incense) && m.incense !== (f.incense === 'oui')) return false;
            if (active(f.burned) && m.burned !== f.burned) return false;
            if (active(f.scope) && !(m.scope === f.scope || m.scope === 'les-deux')) return false;
            if (q && normalize([m.fr, m.note, m.ref, m.measure, m.oil].join(' ')).indexOf(q) < 0) return false;
            return true;
        });
    }

    // --- Les princes -------------------------------------------------------------------------------------------------------
    // Les jours choisis (1 à 12) → ce que les princes ont offert en tout.
    function princesTotals(days) {
        var picked = [];
        (days || []).forEach(function (d) { if (d >= 1 && d <= 12 && picked.indexOf(d) < 0) picked.push(d); });
        var n = picked.length, o = Data.PRINCE_OFFERING;
        var t = {
            n: n, silver: n * (o.silverBowl + o.silverBasin), gold: n * o.goldLadle,
            olaBulls: n * o.olaBulls, olaRams: n * o.olaRams, olaLambs: n * o.olaLambs, hatatGoats: n * o.hatatGoats,
            chelamimOxen: n * o.chelamimOxen, chelamimRams: n * o.chelamimRams, chelamimGoats: n * o.chelamimGoats, chelamimLambs: n * o.chelamimLambs
        };
        t.ola = t.olaBulls + t.olaRams + t.olaLambs;
        t.chelamim = t.chelamimOxen + t.chelamimRams + t.chelamimGoats + t.chelamimLambs;
        t.animals = t.ola + t.hatatGoats + t.chelamim;
        return t;
    }

    // --- Les dons faits au cohen ---------------------------------------------------------------------------------------------
    function giftsByGroup(group) {
        return Data.GIFTS.filter(function (g) { return !group || group === 'all' || g.group === group; });
    }

    // --- Les prélèvements et les dîmes ---------------------------------------------------------------------------------------
    function round2(x) { return Math.round(x * 100) / 100; }

    // `total` : la récolte ; `den` : 40, 50 ou 60 (la terouma est le 1/den) ; `kind` : 'sheni' ou 'ani' (le second prélèvement).
    // Terouma = 1/den ; maasser richon = 1/10 de ce qui reste ; terouma de la dîme = 1/10 du maasser richon (pour le cohen, le lévite garde le reste) ;
    // maasser chéni ou 'ani = 1/10 de ce qui reste après le maasser richon ; le propriétaire garde le reste.
    function titheBreakdown(total, den, kind) {
        var amount = Number(total);
        if (!(amount > 0)) amount = 0;
        var d = [40, 50, 60].indexOf(den) >= 0 ? den : 50;
        var terumah = amount / d;
        var afterTerumah = amount - terumah;
        var richon = afterTerumah / 10;
        var terumatMaasser = richon / 10;
        var afterRichon = afterTerumah - richon;
        var second = afterRichon / 10;
        var owner = afterRichon - second;
        return {
            total: round2(amount), den: d, kind: kind === 'ani' ? 'ani' : 'sheni',
            terumah: round2(terumah), maasserRichon: round2(richon), terumatMaasser: round2(terumatMaasser), levi: round2(richon - terumatMaasser),
            second: round2(second), owner: round2(owner)
        };
    }

    // --- Le rachat des premiers-nés ---------------------------------------------------------------------------------------------
    // Les lignes du calcul de Nombres 3 : lévites, premiers-nés d'Israël, surplus, chekels.
    function levitesRedemption() {
        var L = Data.LEVITES;
        var levites = L.gershon + L.kehat + L.merari;
        var counted = levites - L.firstbornLevites;
        var excess = L.firstbornIsrael - counted;
        return {
            gershon: L.gershon, kehat: L.kehat, merari: L.merari, levites: levites, firstbornLevites: L.firstbornLevites, counted: counted,
            firstbornIsrael: L.firstbornIsrael, excess: excess, shekelsEach: L.shekelsEach, shekels: excess * L.shekelsEach, ref: L.ref
        };
    }

    return {
        holinessOf: holinessOf, filterRows: filterRows, TYPE_BY_ID: TYPE_BY_ID,
        moussafTotals: moussafTotals, moussafPresets: moussafPresets, hinText: hinText, ephaText: ephaText,
        accompanimentTotals: accompanimentTotals, filterMenahot: filterMenahot, princesTotals: princesTotals, giftsByGroup: giftsByGroup, titheBreakdown: titheBreakdown, levitesRedemption: levitesRedemption
    };
}));
