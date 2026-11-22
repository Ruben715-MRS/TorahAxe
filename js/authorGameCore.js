// =========================================================================
// === TORAHAXE — « AUTEUR ET ŒUVRE » : LES RÈGLES DU JEU DE LA BIBLIOTHÈQUE (pur, sans DOM, testé) ===
// =========================================================================
// Dix questions à quatre propositions, 100 points chacune, tirées de la Bibliothèque (js/libraryCore.js : qui a écrit quoi, quand et où) :
//  - « author » : qui a écrit cette œuvre ? (quatre questions) ;
//  - « work » : lequel de ces quatre livres a été écrit par tel maître ? (trois) ;
//  - « era » : à quelle époque cette œuvre a-t-elle été écrite ? (deux) ;
//  - « oldest » : lequel de ces quatre livres est le plus ancien (ou le plus récent) ? (une).
// Trois séries : tout, les Richonim (1040-1500), les 'Aharonim (depuis 1500). (Avant 1040, trop peu d'œuvres ont un auteur unique et connu pour faire une série à part.)
// La mécanique de partie (questions, score, suite, jeu à plusieurs) est celle de js/quizCore.js.
//
// SEULS DES CAS SANS DISCUSSION. Les œuvres du complément de la Bibliothèque (bib : true), datées par la vie de leur auteur, sont posées pour « qui a écrit ? » et « quelle époque ? » (si toute la vie de l'auteur tient dans une époque), jamais pour « le plus ancien ». La Bibliothèque garde toutes les nuances (école, anonyme, attribution traditionnelle) ; le jeu, lui, n'interroge que :
//  - pour « qui a écrit ? » et « lequel a écrit ? » : les œuvres d'un auteur unique et connu (celles de AUTHORS ci-dessous), sans attribution traditionnelle qui diffère des historiens
//    (le Zohar, le Séfer HaHinoukh, le Bahir… sont exclus), et dont le titre ne contient pas le nom de l'auteur (« Commentaire de Rachi » n'est pas une question) ;
//  - pour « quelle époque ? » : les œuvres datées sur moins de soixante ans, tout entières dans une époque et à trente ans au moins d'une frontière entre deux époques ;
//  - pour « le plus ancien » : des œuvres datées sur moins de soixante ans, sans attribution discutée, séparées d'au moins quarante ans les unes des autres.
// Les noms d'auteurs de AUTHORS sont ceux d'usage courant. Les dates sont celles de la Bibliothèque. À relire par une personne compétente, en particulier la liste AUTHORS.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./libraryCore.js'));
    else root.AuthorGameCore = factory(root.QuizCore, root.LibraryCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz, Library) {
    'use strict';

    var ROUNDS = Quiz.ROUNDS;
    var SECTIONS = ['all', 'richonim', 'aharonim'];
    var SECTION_ERAS = { all: ['tannaim', 'talmud', 'gueonim', 'richonim', 'aharonim'], richonim: ['richonim'], aharonim: ['aharonim'] };
    var ERA_ORDER = ['tannaim', 'talmud', 'gueonim', 'richonim', 'aharonim'];
    var BOUNDARIES = [220, 650, 1040, 1500];     // les frontières entre époques (Library.ERAS)
    var MAX_SPAN = 60;                           // années : au-delà, la datation n'est pas assez précise pour une question
    var BOUNDARY_MARGIN = 30;    // années : une œuvre écrite près d'une frontière (Bartenura vers 1490) est classée tantôt d'un côté, tantôt de l'autre
    var OLDEST_GAP = 40;
    var TYPES_PLAN = ['author', 'author', 'author', 'author', 'work', 'work', 'work', 'era', 'era', 'oldest'];

    // Les auteurs : l'identifiant de la Bibliothèque (authorId) → le nom d'usage, et les mots qui, dans un titre, donneraient l'auteur (en minuscules, sans accent).
    var AUTHORS = {
        yossi_halafta: { name: 'Rabbi Yossi ben Halafta', alias: ['yossi ben halafta'] },
        yehouda_nassi: { name: 'Rabbi Yéhouda HaNassi', alias: ['yehouda hanassi', 'rabbi yehouda'] },
        ahai_gaon: { name: 'Rav Ahaï Gaon', alias: ['ahai'] },
        amram_gaon: { name: 'Rav Amram Gaon', alias: ['amram'] },
        saadia_gaon: { name: 'Rav Saadia Gaon', alias: ['saadia'] },
        sherira_gaon: { name: 'Rav Chérira Gaon', alias: ['cherira'] },
        rif: { name: 'Le Rif (Rabbi Yitzhak Alfassi)', alias: ['rif', 'alfassi'] },
        rachi: { name: 'Rachi', alias: ['rachi'] },
        rachbam: { name: 'Le Rachbam', alias: ['rachbam'] },
        yehouda_halevi: { name: 'Rabbi Yéhouda HaLévi', alias: ['yehouda halevi'] },
        ibn_ezra: { name: 'Rabbi Avraham ibn Ezra', alias: ['ibn ezra'] },
        rambam: { name: 'Le Rambam (Maïmonide)', alias: ['rambam', 'maimonide', 'moche ben maimon'] },
        raavad: { name: 'Le Raavad', alias: ['raavad'] },
        radak: { name: 'Le Radak', alias: ['radak', 'kimhi'] },
        yonah_gerondi: { name: 'Rabbénou Yona de Gérone', alias: ['yona'] },
        maharam_rothenburg: { name: 'Le Maharam de Rothenbourg', alias: ['maharam', 'rothenbourg'] },
        ramban: { name: 'Le Ramban (Nahmanide)', alias: ['ramban', 'nahmanide'] },
        rachba: { name: 'Le Rachba', alias: ['rachba'] },
        meiri: { name: 'Rabbi Menahem HaMéïri', alias: ['meiri'] },
        bahya_acher: { name: 'Rabbénou Bahya ben Acher', alias: ['bahya'] },
        rosh: { name: 'Le Rosh (Rabbénou Acher)', alias: ['rosh'] },
        ritva: { name: 'Le Ritva', alias: ['ritva'] },
        yaakov_acher: { name: 'Rabbi Yaakov ben Acher (Baal HaTourim)', alias: ['baal hatourim', 'yaakov ben acher'] },
        abarbanel: { name: 'Don Yitzhak Abravanel', alias: ['abravanel', 'abarbanel'] },
        bartenura: { name: 'Rabbi Ovadia de Bertinoro', alias: ['bartenura', 'bertinoro'] },
        karo: { name: 'Rabbi Yossef Karo (Maran)', alias: ['karo', 'maran'] },
        ramak: { name: 'Le Ramak (Rabbi Moché Cordovero)', alias: ['ramak', 'cordovero'] },
        rema: { name: 'Le Rema (Rabbi Moché Isserlès)', alias: ['rema', 'isserles'] },
        haim_vital: { name: 'Rabbi Haïm Vital', alias: ['haim vital'] },
        maharal: { name: 'Le Maharal de Prague', alias: ['maharal'] },
        tosafot_yomtov: { name: 'Rabbi Yom Tov Lipman Heller', alias: ['yom tov', 'heller'] },
        shelah: { name: 'Le Chelah (Rabbi Yéchaya Horowitz)', alias: ['chelah', 'horowitz'] },
        ramhal: { name: 'Le Ramhal (Rabbi Moché Haïm Luzzatto)', alias: ['ramhal', 'luzzatto'] },
        or_hahaim: { name: 'Rabbi Haïm ibn Attar', alias: ['or hahaim', 'ibn attar'] },
        gra: { name: 'Le Gaon de Vilna (le Gra)', alias: ['gra', 'gaon de vilna'] },
        yaakov_yosef: { name: 'Rabbi Yaakov Yossef de Polonne', alias: ['yaakov yossef'] },
        elimelech: { name: 'Rabbi Élimélekh de Lizhensk', alias: ['elimelekh'] },
        schneur: { name: 'Rabbi Chnéour Zalman de Liadi', alias: ['chneour', 'liadi'] },
        levi_yitzhak: { name: 'Rabbi Lévi Yitzhak de Berditchev', alias: ['berditchev'] },
        hatam_sofer: { name: 'Le Hatam Sofer', alias: ['hatam sofer'] },
        nahman: { name: 'Rabbi Nahman de Breslev', alias: ['moharan', 'nahman'] },
        haim_volozhin: { name: 'Rabbi Haïm de Volozhin', alias: ['volozhin'] },
        hirsch: { name: 'Rabbi Chimchon Raphaël Hirsch', alias: ['hirsch'] },
        sefat_emet: { name: 'Le Séfat Émet (Rabbi Yéhouda Aryé Leib Alter de Ger)', alias: ['sefat emet', 'safat emet'] },
        epstein: { name: 'Rabbi Yehiel Mikhel Epstein', alias: ['epstein'] },
        chafetz_haim: { name: 'Le Hafets Haïm', alias: ['hafets haim', 'chafetz haim'] },
        haim_brisk: { name: 'Rabbi Haïm Soloveitchik de Brisk', alias: ['haim halevi', 'brisk'] },
        ben_ish_hai: { name: 'Le Ben Ich Haï', alias: ['ben ich hai'] },
        chazon_ich: { name: 'Le Hazon Ich', alias: ['hazon ich', 'chazon ich'] },
        kook: { name: 'Rabbi Avraham Yitzhak Kook', alias: ['kook'] },
        joseph_solov: { name: 'Rabbi Yossef Dov Soloveitchik', alias: ['soloveitchik'] },
        ovadia_yossef: { name: 'Rabbi Ovadia Yossef', alias: ['ovadia yossef'] },
        feinstein: { name: 'Rabbi Moché Feinstein', alias: ['feinstein'] },
        // Complément de la Bibliographie du Commentaire (œuvres datées par la vie de l'auteur)
        avraham_saba: { name: 'Rabbi Avraham Saba', alias: ['saba'] },
        lunshitz: { name: 'Rabbi Chlomo Efraïm Lunshitz', alias: ['lunshitz'] },
        tsidkiya_harofe: { name: 'Rabbi Tsidkiya HaRofé de Rome', alias: ['tsidkiya'] },
        pinhas_horowitz: { name: 'Rabbi Pin’has Horowitz', alias: ['pin has horowitz'] },
        netziv: { name: 'Le Nétsiv (Rabbi Naftali Tsvi Yéhouda Berlin)', alias: ['netsiv', 'netziv'] },
        mecklenburg: { name: 'Rabbi Yaakov Tsvi Mecklenburg', alias: ['mecklenburg'] },
        sorotzkin: { name: 'Rabbi Zalman Sorotzkin', alias: ['sorotzkin'] },
        kamenetsky: { name: 'Rabbi Yaakov Kamenetsky', alias: ['kamenetsky'] },
        rabinowitz: { name: 'Rabbi Haïm D. Rabinowitz', alias: ['rabinowitz'] },
        munk: { name: 'Rabbi Elie Munk', alias: ['munk'] },
        kasher: { name: 'Rabbi Mena’hem Kasher', alias: ['kasher'] },
        bass: { name: 'Rabbi Chabtaï Bass', alias: ['bass'] },
        taz: { name: 'Le Taz (Rabbi David HaLévi Segal)', alias: ['taz'] },
        pardo: { name: 'Rabbi David Pardo', alias: ['pardo'] },
        danon: { name: 'Rabbi Méïr Binyamin Ménachem Danon', alias: ['danon'] },
        heidenheim: { name: 'Rabbi Wolf Heidenheim', alias: ['heidenheim'] },
        david_adeni: { name: 'Rabbi David el Adéni', alias: ['adeni'] },
        zekharia_harofe: { name: 'Rabbi Zékharia ben Chlomo HaRofé', alias: ['zekharia'] },
        tovia: { name: 'Rabbi Tovia ben Eliézer', alias: ['tovia'] },
        menahem_italie: { name: 'Rabbi Menachem ben Chlomo d’Italie', alias: ['menachem ben chlomo'] },
        yissakhar_ber: { name: 'Rabbi Yissakhar Ber HaCohen', alias: ['yissakhar'] },
        gombiner: { name: 'Rabbi Avraham Gombiner', alias: ['gombiner'] },
        teomim: { name: 'Rabbi Yossef Téomim', alias: ['teomim'] },
        eisenstadt: { name: 'Rabbi Avraham Tsvi Hirsch Eisenstadt', alias: ['eisenstadt'] },
        kluger: { name: 'Rabbi Chlomo Kluger', alias: ['kluger'] },
        borenstein: { name: 'Rabbi Avraham Borenstein de Sochachov', alias: ['borenstein', 'avnei nezer', 'sochachov'] },
        steipler: { name: 'Rabbi Yaakov Yisraël Kanievsky (le Steipler)', alias: ['steipler', 'kanievsky'] },
        farhi: { name: 'Rabbi Echtori HaFar’hi', alias: ['far hi'] },
        schwartz: { name: 'Rabbi Yéhossef Schwartz', alias: ['schwartz'] },
        ibn_janah: { name: 'Rabbi Yona ibn Jana’h', alias: ['ibn janah', 'jana h'] },
        maharshal: { name: 'Le Maharchal (Rabbi Chlomo Louria)', alias: ['maharchal', 'maharshal'] },
        aharon_ibn_haim: { name: 'Rabbi Aharon ibn Haïm', alias: ['aharon ibn haim'] },
        lipschutz: { name: 'Rabbi Israël Lipschutz', alias: ['lipschutz'] },
        loerberbaum: { name: 'Rabbi Yaakov Lœrberbaum', alias: ['loerberbaum'] },
        arama: { name: 'Rabbi Yits’hak Arama', alias: ['arama'] },
        finkel: { name: 'Rabbi Nathan Tsvi Finkel (l’Alter de Slabodka)', alias: ['finkel', 'slabodka'] },
        alter_kelm: { name: 'Rabbi Sim’ha Zissel Ziv (l’Alter de Kelm)', alias: ['kelm', 'zissel'] },
        dessler: { name: 'Rabbi Eliyahou Eliézer Dessler', alias: ['dessler'] },
        hutner: { name: 'Rabbi Yits’hak Hutner', alias: ['hutner'] },
        schorr: { name: 'Rabbi Guédaliah Schorr', alias: ['schorr'] },
        wolbe: { name: 'Rabbi Chlomo Wolbe', alias: ['wolbe'] },
        kitov: { name: 'Rabbi Eliyahou Kitov', alias: ['kitov'] },
        krantz: { name: 'Le Maguid de Doubno (Rabbi Yaakov Krantz)', alias: ['krantz', 'maguid de doubno'] },
        eybeschutz: { name: 'Rabbi Yéhonathan Eybeschutz', alias: ['eybeschutz'] },
        sudylkov: { name: 'Rabbi Moché ’Haïm Efraïm de Sudylkov', alias: ['sudylkov'] },
        simhah_bunem: { name: 'Rabbi Sim’ha Bounem de Pschiskha', alias: ['bounem', 'pschiskha'] },
        sochatchov: { name: 'Rabbi Chemouel de Sochatchov', alias: ['sochatchov'] },
        israel_ruzhin: { name: 'Rabbi Israël de Rizhin', alias: ['rizhin'] },
        haim_tyer: { name: 'Rabbi ’Haïm Tyer de Czernowitz', alias: ['czernowitz'] },
        ozharov: { name: 'Rabbi Moché Yé’hiel d’Ozharov', alias: ['ozharov'] },
        tsadok_hacohen: { name: 'Rabbi Tsadok HaCohen de Lublin', alias: ['tsadok'] }
    };
    // Les œuvres de la Bibliothèque que l'on n'interroge pas, bien qu'un auteur soit nommé : plusieurs auteurs, ou une attribution discutée.
    var EXCLUDED = { beer_mayim_haim_betsalel: true, beer_mayim_haim_czernowitz: true, tosafot: true, taz_shakh: true, bavli: true, yerouchalmi: true, tosefta: true, mekhilta: true, sifra: true, yonatan: true, pirke_rabbi_eliezer: true, bahir: true, zohar: true };

    function normalize(text) {
        return String(text == null ? '' : text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim();
    }

    // --- Les œuvres ----------------------------------------------------------------------------------------------------------------------------
    function eraIndex(year) {
        for (var i = 0; i < BOUNDARIES.length; i++) if (year <= BOUNDARIES[i]) return i;
        return BOUNDARIES.length;
    }

    // Le titre donne-t-il le nom de l'auteur ? (« Commentaire de Rachi sur la Torah », « Hidouchim du Ritva », « Piské HaRosh », « Biour HaGra »…) : un mot du titre, avec ou sans
    // l'article « ha » collé, ou une suite de mots, est un des noms de l'auteur.
    function leaks(work) {
        var a = AUTHORS[work.authorId];
        if (!a) return false;
        var title = normalize(work.fr);
        var words = title.split(' ');
        var bare = words.map(function (w) { return w.replace(/^ha(?=.)/, ''); });
        return a.alias.some(function (al) {
            return al.indexOf(' ') >= 0 ? (' ' + title + ' ').indexOf(' ' + al + ' ') >= 0 : words.indexOf(al) >= 0 || bare.indexOf(al) >= 0;
        });
    }

    // Une œuvre dont on peut demander l'auteur : auteur unique et connu, pas d'attribution traditionnelle à part, titre qui ne donne pas la réponse.
    function authorAsked(work) { return !!AUTHORS[work.authorId] && !work.trad && !EXCLUDED[work.id] && !leaks(work); }

    // Une œuvre dont on peut demander l'époque : datée sur moins de soixante ans (ou, pour le complément de la Bibliothèque, par une vie d'auteur tout entière dans une époque), loin des frontières.
    function eraAsked(work) {
        if (work.trad || EXCLUDED[work.id]) return false;
        // Une œuvre datée par la vie de son auteur (« life ») : sûre seulement si toute cette vie tient dans une même époque ; les dates « vers », « mort en » et « contemporain » ne suffisent pas.
        if (work.bib) { if (work.life !== 'life' || work.approx) return false; }
        else if (work.to - work.from > MAX_SPAN) return false;
        if (eraIndex(work.from) !== eraIndex(work.to)) return false;
        return BOUNDARIES.every(function (b) { return Math.abs(work.from - b) >= BOUNDARY_MARGIN && Math.abs(work.to - b) >= BOUNDARY_MARGIN; });
    }

    // Une œuvre que l'on peut classer dans le temps : datée sur moins de soixante ans, sans attribution discutée.
    function dateAsked(work) { return !work.bib && !work.trad && !EXCLUDED[work.id] && work.to - work.from <= MAX_SPAN; }

    function inSection(work, section) { return (SECTION_ERAS[section] || SECTION_ERAS.all).indexOf(Library.eraOf(work)) >= 0; }

    function works(filter, section) { return Library.WORKS.filter(function (w) { return filter(w) && inSection(w, section); }); }

    // --- Les propositions ----------------------------------------------------------------------------------------------------------------------
    function authorOption(id) { return { kind: 'author', id: id, label: AUTHORS[id].name }; }
    function workOption(w) { return { kind: 'work', id: w.id, label: w.fr }; }
    function eraOption(id) {
        var era = Library.ERAS.filter(function (e) { return e.id === id; })[0];
        return { kind: 'era', id: id, label: era.fr };
    }

    // Les auteurs proposés : le bon et trois autres, de préférence de la même époque (pour que l'époque ne trahisse pas la réponse), dans un ordre mêlé.
    function authorChoices(work, rng) {
        var era = eraIndex(work.from);
        var near = [], far = [];
        Object.keys(AUTHORS).forEach(function (id) {
            if (id === work.authorId) return;
            var ws = Library.WORKS.filter(function (w) { return w.authorId === id; });
            if (!ws.length) return;
            (Math.abs(eraIndex(ws[0].from) - era) <= 1 ? near : far).push(id);
        });
        var wrong = Quiz.shuffle(near, rng).concat(Quiz.shuffle(far, rng)).slice(0, Quiz.CHOICES - 1);
        return Quiz.shuffle(wrong.concat(work.authorId), rng);
    }

    // `used` : les œuvres déjà posées dans la partie ; les auteurs déjà posés y sont aussi (`used['a:' + authorId]`), pour varier.
    function pickWork(list, used, rng) {
        var fresh = Quiz.shuffle(list, rng).filter(function (w) { return !used[w.id]; });
        var newAuthor = fresh.filter(function (w) { return !used['a:' + w.authorId]; });
        return (newAuthor[0] || fresh[0]) || null;
    }

    function mark(used, w) { used[w.id] = true; if (w.authorId) used['a:' + w.authorId] = true; }

    function qAuthor(section, used, rng) {
        var w = pickWork(works(authorAsked, section), used, rng);
        if (!w) return null;
        mark(used, w);
        var ids = authorChoices(w, rng);
        return { type: 'author', id: 'a' + w.id, work: w, options: ids.map(authorOption), answer: ids.indexOf(w.authorId) };
    }

    function qWork(section, used, rng) {
        var w = pickWork(works(authorAsked, section), used, rng);
        if (!w) return null;
        mark(used, w);
        // Les trois autres livres : d'autres auteurs, et jamais un livre du même auteur (il serait aussi bon).
        var others = Library.WORKS.filter(function (x) { return x.authorId !== w.authorId && authorAsked(x) && !used[x.id]; });
        var era = eraIndex(w.from);
        var near = Quiz.shuffle(others.filter(function (x) { return Math.abs(eraIndex(x.from) - era) <= 1; }), rng);
        var far = Quiz.shuffle(others.filter(function (x) { return Math.abs(eraIndex(x.from) - era) > 1; }), rng);
        var wrong = [];
        near.concat(far).forEach(function (x) { if (wrong.length < 3 && !wrong.some(function (y) { return y.authorId === x.authorId; })) wrong.push(x); });
        if (wrong.length < 3) return null;
        var list = Quiz.shuffle(wrong.concat(w), rng);
        return { type: 'work', id: 'w' + w.id, work: w, authorId: w.authorId, options: list.map(workOption), answer: list.indexOf(w) };
    }

    function qEra(section, used, rng) {
        var w = pickWork(works(eraAsked, section), used, rng);
        if (!w) return null;
        mark(used, w);
        var era = ERA_ORDER[eraIndex(w.from)];
        var at = ERA_ORDER.indexOf(era);
        // Les quatre époques proposées : la bonne et ses voisines d'abord.
        var byDistance = ERA_ORDER.filter(function (e) { return e !== era; }).sort(function (a, b) { return Math.abs(ERA_ORDER.indexOf(a) - at) - Math.abs(ERA_ORDER.indexOf(b) - at); });
        var chosen = byDistance.slice(0, Quiz.CHOICES - 1).concat(era);
        var ids = ERA_ORDER.filter(function (e) { return chosen.indexOf(e) >= 0; });
        return { type: 'era', id: 'e' + w.id, work: w, era: era, options: ids.map(eraOption), answer: ids.indexOf(era) };
    }

    // Quatre œuvres séparées d'au moins quarante ans : la plus ancienne (ou la plus récente) est sans ambiguïté.
    function qOldest(section, used, rng) {
        var pool = works(dateAsked, section);
        for (var attempt = 0; attempt < 400; attempt++) {
            var four = Quiz.shuffle(pool, rng).slice(0, Quiz.CHOICES);
            if (four.length < Quiz.CHOICES || four.some(function (w) { return used[w.id]; })) continue;
            var sorted = four.slice().sort(function (a, b) { return a.from - b.from; });
            var spaced = sorted.every(function (w, i) { return i === 0 || w.from - sorted[i - 1].to >= OLDEST_GAP; });
            if (!spaced) continue;
            var last = (rng || Math.random)() < 0.5;
            var target = last ? sorted[sorted.length - 1] : sorted[0];
            four.forEach(function (w) { used[w.id] = true; });
            return { type: 'oldest', id: 'o' + target.id, work: target, last: last, options: four.map(workOption), answer: four.indexOf(target) };
        }
        return null;
    }

    var BUILDERS = { author: qAuthor, work: qWork, era: qEra, oldest: qOldest };

    // `rounds` questions. Un type qui ne peut pas être construit dans la série (peu d'œuvres) est remplacé par « qui a écrit ? ».
    function pick(section, rng, rounds) {
        var used = {};
        var types = Quiz.shuffle(TYPES_PLAN, rng).slice(0, rounds);
        while (types.length < rounds) types.push('author');
        var out = [];
        types.forEach(function (type) {
            var q = BUILDERS[type](section, used, rng) || qAuthor(section, used, rng) || qWork(section, used, rng) || qEra(section, used, rng);
            if (q) out.push(q);
        });
        return out;
    }

    // options : { section, rng, rounds, questions } ; `questions`, s'il est donné, fixe les questions (tests).
    function createGame(options) {
        var o = options || {};
        var section = SECTIONS.indexOf(o.section) >= 0 ? o.section : 'all';
        var questions = o.questions || pick(section, o.rng, o.rounds || ROUNDS);
        return Quiz.createState(questions, { section: section });
    }

    function question(state) { return Quiz.question(state); }
    function answer(state, choice) { return Quiz.answer(state, choice, function (q, right) { return { id: q.id, right: right, type: q.type }; }); }
    function next(state) { return Quiz.next(state); }

    return {
        ROUNDS: ROUNDS, POINTS: Quiz.POINTS, SECTIONS: SECTIONS, AUTHORS: AUTHORS, EXCLUDED: EXCLUDED, MAX_SPAN: MAX_SPAN, OLDEST_GAP: OLDEST_GAP,
        authorAsked: authorAsked, eraAsked: eraAsked, dateAsked: dateAsked, leaks: leaks, works: works, authorChoices: authorChoices, qAuthor: qAuthor, qWork: qWork, qEra: qEra, qOldest: qOldest,
        pick: pick, createGame: createGame, question: question, answer: answer, next: next
    };
}));
