// =========================================================================
// === TORAHAXE — PROGRESSION : SÉRIE DE JOURS, NIVEAUX PAR DOMAINE, BADGES (pur, sans DOM, testé) ===
// =========================================================================
// Tout vient d'un seul registre, alimenté à la fin de chaque partie de n'importe quel jeu : { v: 1, days: { 'AAAA-MM-JJ': { n, xp } }, games: { <jeu>: { n, perfect, best, xp } } }.
//
// La série de jours : un jour compte quand au moins une partie, de n'importe quel jeu (le défi du jour comme les autres), a été jouée jusqu'à la fin. Le Chabbat et les jours de
// fête (Yom Tov) ne comptent pas, ni pour ni contre : ils sont sautés (la série est « gelée »), qu'on joue ces jours-là ou non. Un jour ordinaire sans partie interrompt la série,
// sauf aujourd'hui, qui peut encore être joué (la série est « en attente »). La plus longue série se calcule de la même façon sur tout l'historique.
//
// Les niveaux : chaque partie terminée rapporte de 20 à 100 points d'expérience (20 pour avoir terminé, jusqu'à 80 de plus selon le score), versés au domaine du jeu (hébreu, Tanakh,
// sages, halakha, histoire, géographie). Dix niveaux par domaine. Les badges se calculent sur le registre, sans rien stocker de plus.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendarYearCore.js'), require('./siddurCore.js'));
    else root.ProgressCore = factory(root.CalendarYearCore, root.SiddurCore);
}(typeof self !== 'undefined' ? self : this, function (CY, Siddur) {
    'use strict';

    // Les jeux et leur domaine. Les identifiants sont ceux de l'écran (préfixe de QuizUI), plus « wheel » (la roue des fêtes) et « frise ».
    var GAMES = {
        lexgame: 'hebreu', gemgame: 'hebreu', review: 'hebreu',
        parashagame: 'tanakh', mitsvagame: 'tanakh', ordergame: 'tanakh', scrgame: 'tanakh',
        whogame: 'sages', trgame: 'sages',
        purgame: 'halakha', wheel: 'halakha', dailygame: 'halakha',
        mapgame: 'geographie', frise: 'histoire'
    };
    var DOMAINS = [
        { id: 'hebreu', he: 'עברית' }, { id: 'tanakh', he: 'תנ״ך' }, { id: 'sages', he: 'חכמים' },
        { id: 'halakha', he: 'הלכה' }, { id: 'histoire', he: 'היסטוריה' }, { id: 'geographie', he: 'גאוגרפיה' }
    ];
    // Les points d'expérience qu'il faut avoir pour atteindre le niveau 1, 2, 3… 10.
    var LEVELS = [0, 150, 400, 800, 1400, 2200, 3300, 4800, 6800, 9500];

    // --- Le registre -------------------------------------------------------------------------------------------------------------------------
    function emptyStore() { return { v: 1, days: {}, games: {} }; }

    function whole(n) { return n > 0 ? Math.floor(n) : 0; }

    // Un registre lu du stockage : tout ce qui est abîmé est écarté.
    function normalize(raw) {
        var out = emptyStore();
        var days = raw && typeof raw === 'object' && raw.days && typeof raw.days === 'object' ? raw.days : {};
        Object.keys(days).forEach(function (k) {
            var d = days[k];
            if (/^\d{4}-\d{2}-\d{2}$/.test(k) && d && typeof d === 'object' && d.n > 0) out.days[k] = { n: whole(d.n), xp: whole(d.xp) };
        });
        var games = raw && typeof raw === 'object' && raw.games && typeof raw.games === 'object' ? raw.games : {};
        Object.keys(games).forEach(function (id) {
            var g = games[id];
            if (GAMES[id] && g && typeof g === 'object' && g.n > 0) out.games[id] = { n: whole(g.n), perfect: whole(g.perfect), best: Math.min(100, whole(g.best)), xp: whole(g.xp) };
        });
        return out;
    }

    // Les points d'expérience d'une partie terminée : 20, plus jusqu'à 80 selon le score (`max` : le score parfait).
    function xpOf(score, max) {
        var ratio = max > 0 ? Math.max(0, Math.min(1, score / max)) : 0;
        return Math.round(20 + 80 * ratio);
    }

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function dateKey(civil) { return civil.year + '-' + pad(civil.month) + '-' + pad(civil.day); }
    function fixedOf(civil) { return CY.gregorianToFixed(civil.year, civil.month, civil.day); }

    // Le registre après une partie terminée : `play` = { date (jour civil { year, month, day }), game, score, max, xp (facultatif : remplace le calcul) }.
    function record(store, play) {
        var next = normalize(store);
        if (!GAMES[play.game]) return next;
        var key = dateKey(play.date);
        var xp = play.xp >= 0 ? Math.round(play.xp) : xpOf(play.score, play.max);
        var d = next.days[key] || { n: 0, xp: 0 };
        d.n += 1; d.xp += xp;
        next.days[key] = d;
        var g = next.games[play.game] || { n: 0, perfect: 0, best: 0, xp: 0 };
        g.n += 1; g.xp += xp;
        if (play.max > 0 && play.score >= play.max) g.perfect += 1;
        g.best = Math.max(g.best, play.max > 0 ? Math.round(100 * Math.max(0, Math.min(play.max, play.score)) / play.max) : 0);
        next.games[play.game] = g;
        return next;
    }

    // --- Les niveaux -------------------------------------------------------------------------------------------------------------------------
    // Le niveau d'un total de points d'expérience : { level (1 à 10), xp, from (le seuil du niveau), to (le seuil du suivant, null au dernier), pct (avancement vers le suivant) }.
    function levelOf(xp) {
        var total = whole(xp), level = 1;
        for (var i = 0; i < LEVELS.length; i++) if (total >= LEVELS[i]) level = i + 1;
        var from = LEVELS[level - 1], to = level < LEVELS.length ? LEVELS[level] : null;
        return { level: level, xp: total, from: from, to: to, pct: to === null ? 100 : Math.round(100 * (total - from) / (to - from)) };
    }

    // Les points d'expérience par domaine : { hebreu: n, … } (zéro pour un domaine où rien n'a été joué).
    function domainXp(store) {
        var out = {};
        DOMAINS.forEach(function (d) { out[d.id] = 0; });
        var s = normalize(store);
        Object.keys(s.games).forEach(function (id) { out[GAMES[id]] += s.games[id].xp; });
        return out;
    }

    function domainLevels(store) {
        var xp = domainXp(store), out = {};
        DOMAINS.forEach(function (d) { out[d.id] = levelOf(xp[d.id]); });
        return out;
    }

    // --- La série de jours ---------------------------------------------------------------------------------------------------------------------
    // Les jours de repos (Chabbat, Yom Tov) mis en mémoire : ce calcul est le plus coûteux de la série.
    var REST_CACHE = {};
    function isRest(fixed, israel) {
        var k = fixed + (israel ? 'i' : 'd');
        if (REST_CACHE[k] === undefined) {
            var flags = Siddur.contextFor(fixed, !!israel).flags;
            REST_CACHE[k] = !!(flags.shabbat || flags.yomTov);
        }
        return REST_CACHE[k];
    }

    // La série à la date `today` ({ year, month, day }) : { current, longest, status, lastActive }.
    //  status : 'active' (une partie a été jouée aujourd'hui), 'pending' (pas encore aujourd'hui : la série tient jusqu'à ce soir), 'frozen' (aujourd'hui est un Chabbat ou un jour de fête :
    //  elle attend), 'none' (pas de série). `israel` : les jours de fête d'Israël (un jour de moins qu'en diaspora).
    function streak(store, today, israel) {
        var s = normalize(store);
        var keys = Object.keys(s.days).sort();
        var T = fixedOf(today);
        var activeAt = function (fixed) { var g = CY.fixedToGregorian(fixed); return !!s.days[dateKey(g)]; };
        var out = { current: 0, longest: 0, status: 'none', lastActive: keys.length ? keys[keys.length - 1] : null };
        if (!keys.length) return out;
        var first = keys[0].split('-').map(Number);
        var firstFixed = CY.gregorianToFixed(first[0], first[1], first[2]);
        var todayRest = isRest(T, israel);
        var todayActive = !todayRest && activeAt(T);
        // La série en cours : en remontant depuis aujourd'hui, on saute les jours de repos, on compte les jours jouées, on s'arrête au premier jour ordinaire sans partie
        // (aujourd'hui excepté : il peut encore être joué).
        for (var d = T; d >= firstFixed; d--) {
            if (isRest(d, israel)) continue;
            if (activeAt(d)) out.current += 1;
            else if (d !== T) break;
        }
        // La plus longue : sur tout l'historique, jusqu'à aujourd'hui.
        var run = 0;
        for (var e = firstFixed; e <= T; e++) {
            if (isRest(e, israel)) continue;
            if (activeAt(e)) { run += 1; if (run > out.longest) out.longest = run; } else run = 0;
        }
        out.status = out.current === 0 ? 'none' : todayRest ? 'frozen' : todayActive ? 'active' : 'pending';
        return out;
    }

    // --- Les badges ----------------------------------------------------------------------------------------------------------------------------
    // Chaque badge : { id, group, target, value(stats) } ; il est gagné quand value ≥ target. `stats` : voir statsOf.
    var BADGES = [
        { id: 'first', group: 'parties', target: 1, value: function (s) { return s.games; } },
        { id: 'games10', group: 'parties', target: 10, value: function (s) { return s.games; } },
        { id: 'games50', group: 'parties', target: 50, value: function (s) { return s.games; } },
        { id: 'games100', group: 'parties', target: 100, value: function (s) { return s.games; } },
        { id: 'perfect1', group: 'parfait', target: 1, value: function (s) { return s.perfect; } },
        { id: 'perfect10', group: 'parfait', target: 10, value: function (s) { return s.perfect; } },
        { id: 'streak3', group: 'serie', target: 3, value: function (s) { return s.streakLongest; } },
        { id: 'streak7', group: 'serie', target: 7, value: function (s) { return s.streakLongest; } },
        { id: 'streak30', group: 'serie', target: 30, value: function (s) { return s.streakLongest; } },
        { id: 'daily1', group: 'defi', target: 1, value: function (s) { return s.daily; } },
        { id: 'daily7', group: 'defi', target: 7, value: function (s) { return s.daily; } },
        { id: 'variety5', group: 'variete', target: 5, value: function (s) { return s.distinct; } },
        { id: 'variety10', group: 'variete', target: 10, value: function (s) { return s.distinct; } },
        { id: 'level3', group: 'niveau', target: 3, value: function (s) { return s.topLevel; } },
        { id: 'level5', group: 'niveau', target: 5, value: function (s) { return s.topLevel; } },
        { id: 'allDomains', group: 'niveau', target: 6, value: function (s) { return s.domainsStarted; } }
    ];

    // Les chiffres dont les badges ont besoin.
    function statsOf(store, streakInfo) {
        var s = normalize(store);
        var levels = domainLevels(s);
        var stats = { games: 0, perfect: 0, daily: 0, distinct: Object.keys(s.games).length, streakLongest: streakInfo ? streakInfo.longest : 0, topLevel: 1, domainsStarted: 0, days: Object.keys(s.days).length };
        Object.keys(s.games).forEach(function (id) { stats.games += s.games[id].n; stats.perfect += s.games[id].perfect; });
        stats.daily = s.games.dailygame ? s.games.dailygame.n : 0;
        DOMAINS.forEach(function (d) { if (levels[d.id].level > stats.topLevel) stats.topLevel = levels[d.id].level; if (levels[d.id].level >= 2) stats.domainsStarted += 1; });
        return stats;
    }

    // Les badges, gagnés ou non : [{ id, group, target, value, earned }].
    function badges(store, streakInfo) {
        var stats = statsOf(store, streakInfo);
        return BADGES.map(function (b) { var v = b.value(stats); return { id: b.id, group: b.group, target: b.target, value: Math.min(v, b.target), earned: v >= b.target }; });
    }

    // Ce qu'une partie vient de changer : les badges gagnés, les niveaux franchis. `before` et `after` : les registres avant et après (`record`).
    function changes(before, after, todayBefore, todayAfter, israel) {
        var sb = streak(before, todayBefore, israel), sa = streak(after, todayAfter, israel);
        var bb = badges(before, sb).filter(function (b) { return b.earned; }).map(function (b) { return b.id; });
        var newBadges = badges(after, sa).filter(function (b) { return b.earned && bb.indexOf(b.id) < 0; }).map(function (b) { return b.id; });
        var lb = domainLevels(before), la = domainLevels(after), levelUps = [];
        DOMAINS.forEach(function (d) { if (la[d.id].level > lb[d.id].level) levelUps.push({ domain: d.id, level: la[d.id].level }); });
        return { newBadges: newBadges, levelUps: levelUps, streak: sa, streakBefore: sb };
    }

    return {
        GAMES: GAMES, DOMAINS: DOMAINS, LEVELS: LEVELS, BADGES: BADGES, emptyStore: emptyStore, normalize: normalize, xpOf: xpOf, dateKey: dateKey, record: record,
        levelOf: levelOf, domainXp: domainXp, domainLevels: domainLevels, streak: streak, statsOf: statsOf, badges: badges, changes: changes
    };
}));
