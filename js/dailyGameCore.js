// =========================================================================
// === TORAHAXE — « DÉFI DU JOUR » : CINQ QUESTIONS LIÉES À LA DATE (pur, sans DOM, testé) ===
// =========================================================================
// Chaque jour, le même défi pour tout le monde : cinq questions à quatre réponses, tirées du calendrier du jour (la paracha de la semaine et la suivante, le traité du
// Daf Yomi, le mois hébraïque qui suit, la prochaine fête, les Téhilim du jour). Les réponses se trouvent aussi dans l'onglet « Aujourd'hui » : le défi invite à les
// connaître plutôt qu'à les chercher. 100 points par bonne réponse, 500 au plus ; la mécanique de partie est celle de js/quizCore.js.
//
// Le défi est le même pour tous parce que tout vient de la date : le tirage des cinq questions, leur ordre et celui des propositions sont mêlés par un générateur
// pseudo-aléatoire dont la graine est la date (« 2026-11-16 »). Les faits viennent des modules de calendrier de l'application, sans rien recopier : js/hebrewCalendarCore.js
// (mois, fêtes), js/zmanimCore.js (Daf Yomi, Téhilim), js/torahCore.js (paracha de la semaine) et js/siddurCore.js (Chabbat et jours de fête).
//
// Pas de défi le Chabbat ni les jours de fête (Yom Tov) : l'application ne propose rien ces jours-là (`isRestDay`). Le jour civil sert de repère ; la veille, après l'entrée de Chabbat,
// reste au choix de chacun. La série de jours de la progression devra, elle, ne jamais pénaliser ces jours-là.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./hebrewCalendarCore.js'), require('./zmanimCore.js'), require('./calendarYearCore.js'), require('./siddurCore.js'), require('./torahCore.js'));
    else root.DailyGameCore = factory(root.QuizCore, root.HebrewCalendarCore, root.ZmanimCore, root.CalendarYearCore, root.SiddurCore, root.TorahCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz, HC, Z, CY, Siddur, Torah) {
    'use strict';

    var QUESTIONS = 5;
    var TYPES = ['parasha', 'parasha_next', 'daf', 'month_next', 'month_now', 'feast', 'tehilim'];
    var FEAST_HE = {
        rosh: 'ראש השנה', guedalia: 'צום גדליה', kippour: 'יום כיפור', souccot: 'סוכות', chemini: 'שמיני עצרת', hanouka: 'חנוכה', tevet10: 'עשרה בטבת', tubichvat: 'ט״ו בשבט',
        pourimkatan: 'פורים קטן', esther: 'תענית אסתר', pourim: 'פורים', chouchan: 'שושן פורים', pessah: 'פסח', omer: 'ספירת העומר', shoah: 'יום השואה', zikaron: 'יום הזיכרון',
        atzmaut: 'יום העצמאות', pessahcheni: 'פסח שני', lagbaomer: 'ל״ג בעומר', yerushalayim: 'יום ירושלים', chavouot: 'שבועות', tamouz17: 'י״ז בתמוז', tichabav: 'תשעה באב', tubeav: 'ט״ו באב'
    };

    // --- La date ---------------------------------------------------------------------------------------------------------------------------
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    // « 2026-11-16 » : la clé du jour (enregistrement du défi, graine du tirage).
    function dateKey(civil) { return civil.year + '-' + pad(civil.month) + '-' + pad(civil.day); }
    function fixedOf(civil) { return CY.gregorianToFixed(civil.year, civil.month, civil.day); }

    // Chabbat ou jour de fête : pas de défi. `israel` : les jours de fête d'Israël (un jour de moins qu'en diaspora).
    function isRestDay(civil, israel) {
        var f = Siddur.contextFor(fixedOf(civil), !!israel).flags;
        return !!(f.shabbat || f.yomTov);
    }

    // Un générateur pseudo-aléatoire (mulberry32) dont la graine est une chaîne : le même texte donne toujours la même suite, sur tous les appareils.
    function seededRng(text) {
        var h = 1779033703 ^ text.length;
        for (var i = 0; i < text.length; i++) { h = Math.imul(h ^ text.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
        var a = h >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // --- Les faits du jour --------------------------------------------------------------------------------------------------------------------
    // Les traités du Daf Yomi (nom, nom hébreu) : un tour complet du cycle les donne tous.
    var DAF_NAMES = null;
    function dafNames() {
        if (!DAF_NAMES) {
            var seen = {}, list = [], base = CY.gregorianToFixed(2026, 11, 16);
            for (var i = 0; i < Z.DAF_CYCLE_LENGTH + 10; i++) {
                var d = Z.dafYomi(base + i);
                if (d && !seen[d.masechet]) { seen[d.masechet] = true; list.push({ fr: d.masechet, he: d.he }); }
            }
            DAF_NAMES = list;
        }
        return DAF_NAMES;
    }

    function tehilimText(r) { return r.length === 3 ? r[0] + ' (' + r[1] + '–' + r[2] + ')' : r[0] + '–' + r[1]; }

    // ctx : { civil, israel, calendar (data/torah/calendar.json), parashot (data/torah/parashot.json), names }
    // names : { month(annéeHébraïque, idDuMois) → nom français, feast(idDeFête, jourFixe, israel) → nom français } — les noms sont dans ui/fr.json, que ce module ne lit pas.
    function facts(ctx) {
        var fixed = fixedOf(ctx.civil), israel = !!ctx.israel;
        var h = HC.hebrewFromFixed(fixed);
        var out = { fixed: fixed, hebrew: h, israel: israel };
        out.daf = Z.dafYomi(fixed) || null;
        var months = HC.monthsOf(h.year);
        out.months = months.map(function (m) { return { id: m.id, fr: ctx.names.month(h.year, m.id), he: HC.monthHebrew(h.year, m.id) }; });
        var at = -1;
        months.forEach(function (m, i) { if (m.id === h.month) at = i; });
        out.monthNow = out.months[at];
        out.monthNext = out.months[(at + 1) % months.length];
        var month = months[at];
        out.tehilim = Z.tehilimOfDay(h.day, month ? month.days : 30);
        // La prochaine fête : celles de la tradition (grandes fêtes et fêtes mineures), l'année en cours et la suivante ; « en cours » tant qu'elle dure.
        var feasts = HC.feastsOf(h.year, israel).concat(HC.feastsOf(h.year + 1, israel))
            .filter(function (f) { return (f.kind === 'moed' || f.kind === 'minor'); })
            .sort(function (a, b) { return a.fixed - b.fixed; });
        var upcoming = feasts.filter(function (f) { return f.last >= fixed; });
        out.feasts = feasts;
        out.feast = upcoming.length ? { f: upcoming[0], ongoing: upcoming[0].fixed <= fixed, days: upcoming[0].fixed - fixed } : null;
        // La paracha de la semaine : une seule (les semaines à deux parachiot sont écartées de la question « laquelle ? », pas de la suivante).
        var idx = ctx.calendar && ctx.parashot ? Torah.parashaForDate(ctx.calendar, new Date(ctx.civil.year, ctx.civil.month - 1, ctx.civil.day)) : null;
        out.parashaIdx = idx && idx.length ? idx : null;
        return out;
    }

    // --- Les questions -------------------------------------------------------------------------------------------------------------------------
    // Une proposition : { label, he, id }.
    function opt(label, he, id) { return { label: label, he: he || '', id: id }; }

    // Quatre propositions mêlées (la bonne et trois autres, distinctes par leur nom), et l'indice de la bonne.
    function build(type, ask, explain, right, others, rng) {
        var seen = {}; seen[right.label] = true;
        var wrong = [];
        Quiz.shuffle(others, rng).forEach(function (o) { if (wrong.length < Quiz.CHOICES - 1 && !seen[o.label]) { seen[o.label] = true; wrong.push(o); } });
        if (wrong.length < Quiz.CHOICES - 1) return null;
        var all = Quiz.shuffle([right].concat(wrong), rng);
        return { type: type, id: 'daily:' + type, ask: ask, explain: explain, options: all, answer: all.indexOf(right) };
    }

    function parashaOpt(ctx, i) { var p = ctx.parashot.parashot[i]; return opt(p.fr, p.he, 'p' + i); }

    // Les parachiot d'un même livre que la bonne réponse d'abord (plausibles), puis les autres.
    function parashaDistractors(ctx, right) {
        var book = ctx.parashot.parashot[right].book, near = [], far = [];
        ctx.parashot.parashot.forEach(function (p, i) { if (i !== right) (p.book === book ? near : far).push(parashaOpt(ctx, i)); });
        return near.concat(far);
    }

    var MAKERS = {
        parasha: function (f, ctx, rng) {
            if (!f.parashaIdx || f.parashaIdx.length !== 1) return null;
            var i = f.parashaIdx[0], p = ctx.parashot.parashot[i];
            return build('parasha', 'Quelle est la paracha de cette semaine ?', 'La paracha de cette semaine est ' + p.fr + ' (' + p.he + ').', parashaOpt(ctx, i), Quiz.shuffle(parashaDistractors(ctx, i), rng).slice(0, 12), rng);
        },
        parasha_next: function (f, ctx, rng) {
            if (!f.parashaIdx) return null;
            var last = f.parashaIdx[f.parashaIdx.length - 1], total = ctx.parashot.parashot.length, i = (last + 1) % total;
            var p = ctx.parashot.parashot[i], cur = f.parashaIdx.map(function (k) { return ctx.parashot.parashot[k].fr; }).join(' – ');
            return build('parasha_next', 'Quelle paracha lira-t-on après celle de cette semaine ?', 'Après ' + cur + ', on lit ' + p.fr + ' (' + p.he + ').', parashaOpt(ctx, i), parashaDistractors(ctx, i), rng);
        },
        daf: function (f, ctx, rng) {
            if (!f.daf) return null;
            var names = dafNames(), right = opt(f.daf.masechet, f.daf.he, 'd' + f.daf.masechet);
            var others = names.filter(function (n) { return n.fr !== f.daf.masechet; }).map(function (n) { return opt(n.fr, n.he, 'd' + n.fr); });
            return build('daf', 'Quel traité du Talmud étudie-t-on aujourd’hui au Daf Yomi ?', 'Aujourd’hui, le Daf Yomi est ' + f.daf.masechet + ' ' + f.daf.daf + ' (' + f.daf.he + ').', right, others, rng);
        },
        month_next: function (f, ctx, rng) {
            var right = opt(f.monthNext.fr, f.monthNext.he, 'm' + f.monthNext.id);
            var others = f.months.filter(function (m) { return m.id !== f.monthNext.id && m.id !== f.monthNow.id; }).map(function (m) { return opt(m.fr, m.he, 'm' + m.id); });
            return build('month_next', 'Quel mois hébraïque suit le mois actuel ?', 'Nous sommes le ' + f.hebrew.day + ' ' + f.monthNow.fr + ' ' + f.hebrew.year + ' : le mois suivant est ' + f.monthNext.fr + ' (' + f.monthNext.he + ').', right, others, rng);
        },
        month_now: function (f, ctx, rng) {
            var right = opt(f.monthNow.fr, f.monthNow.he, 'm' + f.monthNow.id);
            var others = f.months.filter(function (m) { return m.id !== f.monthNow.id; }).map(function (m) { return opt(m.fr, m.he, 'm' + m.id); });
            return build('month_now', 'Dans quel mois hébraïque sommes-nous ?', 'Nous sommes le ' + f.hebrew.day + ' ' + f.monthNow.fr + ' ' + f.hebrew.year + ' (' + f.monthNow.he + ').', right, others, rng);
        },
        feast: function (f, ctx, rng) {
            if (!f.feast) return null;
            var nameOf = function (x) { return ctx.names.feast(x.id, x.fixed, f.israel); };
            var he = function (x) { return FEAST_HE[x.id] || ''; };
            var right = opt(nameOf(f.feast.f), he(f.feast.f), 'f' + f.feast.f.id);
            var others = f.feasts.filter(function (x) { return x.id !== f.feast.f.id; }).map(function (x) { return opt(nameOf(x), he(x), 'f' + x.id); });
            var when = f.feast.ongoing ? 'Elle est en cours aujourd’hui.' : f.feast.days === 1 ? 'Elle commence demain.' : 'Elle commence dans ' + f.feast.days + ' jours.';
            return build('feast', f.feast.ongoing ? 'Quelle fête célèbre-t-on en ce moment ?' : 'Quelle est la prochaine fête ?', right.label + ' (' + right.he + ') : ' + when, right, others, rng);
        },
        tehilim: function (f, ctx, rng) {
            if (!f.tehilim) return null;
            var right = opt(tehilimText(f.tehilim), '', 't' + tehilimText(f.tehilim));
            var others = [];
            for (var d = 1; d <= 30; d++) { var r = Z.tehilimOfDay(d, 30); if (r) others.push(opt(tehilimText(r), '', 't' + tehilimText(r))); }
            return build('tehilim', 'Quels psaumes lit-on aujourd’hui, selon la répartition du mois ?', 'Le ' + f.hebrew.day + ' du mois hébraïque, on lit les psaumes ' + right.label + '.', right, others, rng);
        }
    };

    // Les cinq questions du jour. Le tirage des types, l'ordre et les propositions dépendent de la seule date : « 2026-11-16 » donne le même défi à tous.
    function questionsFor(ctx) {
        var key = dateKey(ctx.civil);
        var f = facts(ctx);
        var rng = seededRng('torahaxe-defi-' + key);
        var made = [];
        Quiz.shuffle(TYPES, rng).forEach(function (type) {
            if (made.length >= QUESTIONS) return;
            var q = MAKERS[type](f, ctx, rng);
            if (q) made.push(q);
        });
        return made;
    }

    // --- La partie -----------------------------------------------------------------------------------------------------------------------------
    function createGame(ctx) {
        var state = Quiz.createState(questionsFor(ctx), { key: dateKey(ctx.civil) });
        return state;
    }
    function question(state) { return Quiz.question(state); }
    function answer(state, choice) { return Quiz.answer(state, choice, function (q, right) { return { id: q.id, right: right, type: q.type }; }); }
    function next(state) { return Quiz.next(state); }

    // --- Le registre des défis faits ---------------------------------------------------------------------------------------------------------
    // { v: 1, days: { 'AAAA-MM-JJ': { score, found, total } } } : seul le premier défi terminé d'un jour compte. Fonctions pures : l'écran lit et écrit le stockage.
    function emptyStore() { return { v: 1, days: {} }; }
    function normalizeStore(raw) {
        var out = emptyStore();
        var days = raw && typeof raw === 'object' && raw.days && typeof raw.days === 'object' ? raw.days : {};
        Object.keys(days).forEach(function (k) {
            var d = days[k];
            if (/^\d{4}-\d{2}-\d{2}$/.test(k) && d && typeof d === 'object' && d.score >= 0 && d.total > 0) out.days[k] = { score: Math.floor(d.score), found: Math.floor(d.found) || 0, total: Math.floor(d.total) };
        });
        return out;
    }
    // Le registre après ce défi terminé (le premier du jour est gardé ; un défi rejoué ne change rien).
    function record(store, state) {
        var next = normalizeStore(store);
        if (state && state.over && state.key && !next.days[state.key]) next.days[state.key] = { score: state.score, found: state.found, total: state.questions.length };
        return next;
    }
    function resultOf(store, key) { return normalizeStore(store).days[key] || null; }

    return {
        QUESTIONS: QUESTIONS, TYPES: TYPES, FEAST_HE: FEAST_HE, POINTS: Quiz.POINTS,
        dateKey: dateKey, isRestDay: isRestDay, seededRng: seededRng, dafNames: dafNames, facts: facts, questionsFor: questionsFor,
        createGame: createGame, question: question, answer: answer, next: next, emptyStore: emptyStore, normalizeStore: normalizeStore, record: record, resultOf: resultOf
    };
}));
