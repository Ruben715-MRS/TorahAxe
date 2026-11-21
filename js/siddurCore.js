// =========================================================================
// === LE SIDDOUR SÉFARADE DES JOURS DE SEMAINE : QUELLE VARIANTE DIT-ON AUJOURD'HUI ? (calculs purs, sans DOM) ===
// =========================================================================
// Le texte (data/siddur/, en hébreu vocalisé, domaine public, voir scripts/build_siddur.js) est celui d'un siddour imprimé : il porte ses
// consignes en petits caractères (<small>) : « בקיץ: » (en été), « בחורף: » (en hiver), « בעשרת ימי תשובה: », « בראש חדש: », « בחנוכה: »…
// Ce fichier lit ces consignes et dit, pour un jour hébraïque donné, quelle variante s'applique : « on » (oui), « off » (non) ou « unknown »
// (on ne sait pas : par exemple « בתענית יחיד », un jeûne que seul le fidèle connaît).
//
// Règle d'or : on NE RETOUCHE JAMAIS le texte. Le résultat sert à mettre en valeur la variante du jour et à estomper les autres : rien n'est
// supprimé, rien n'est déplacé (une consigne comme « עֹשֶׂה שָׁלוֹם [בעשרת ימי תשובה אומר: הַשָּׁלוֹם] בִּמְרוֹמָיו » REMPLACE un mot : ajouter ou
// retirer du texte à notre façon le fausserait). Une consigne que l'on ne reconnaît pas reste telle qu'elle est écrite.
//
// Le jour est le jour HÉBRAÏQUE : il change à la sortie des étoiles (hebrewDayFixed), donc Arvit du soir est déjà « demain ».
// Contenu halakhique écrit à la main (la table des consignes, les dates des changements de saison) : **à relire par une personne compétente**.
// Testé dans tests/siddurCore.test.js. Écran : js/app/siddur.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendarYearCore.js'), require('./hebrewCalendarCore.js'), require('./zmanimCore.js'));
    else root.SiddurCore = factory(root.CalendarYearCore, root.HebrewCalendarCore, root.ZmanimCore);
}(typeof self !== 'undefined' ? self : this, function (CY, HC, Z) {
    'use strict';

    // --- Le texte : de l'HTML restreint (<b>, <small>, <big>, <br>) lu en arbre ----------------------------------------------------------
    // Un nœud : { t: 'text', v } ou { t: 'tag', n: 'b'|'small'|'big'|'br', c: [nœuds] }. Les entités &lt; et &gt; deviennent < et >.
    var TOKEN = /<(\/?)(b|small|big|br)\s*\/?>|[^<]+/gi;

    function decode(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }

    function parse(html) {
        var root = { t: 'tag', n: 'root', c: [] };
        var stack = [root];
        var m;
        TOKEN.lastIndex = 0;
        while ((m = TOKEN.exec(html)) !== null) {
            if (m[2]) {
                var name = m[2].toLowerCase();
                if (m[1]) {                                  // balise fermante : on remonte jusqu'à l'ouvrante de même nom
                    for (var i = stack.length - 1; i > 0; i--) if (stack[i].n === name) { stack.length = i; break; }
                } else {
                    var node = { t: 'tag', n: name, c: [] };
                    stack[stack.length - 1].c.push(node);
                    if (name !== 'br') stack.push(node);
                }
            } else {
                stack[stack.length - 1].c.push({ t: 'text', v: decode(m[0]) });
            }
        }
        return root;
    }

    function plain(node) {
        if (Array.isArray(node)) return node.map(plain).join('');
        return node.t === 'text' ? node.v : node.c.map(plain).join('');
    }
    var NIQQUD = /[֑-ׇ]/g;
    function stripNiqqud(s) { return s.replace(NIQQUD, ''); }
    function hasHebrew(s) { return /[א-ת]/.test(s); }
    function norm(s) { return stripNiqqud(s).replace(/["״'׳־\-–]/g, ' ').replace(/\s+/g, ' ').trim(); }

    // --- Les consignes ---------------------------------------------------------------------------------------------------------------------
    // Les mots-clés d'une consigne (sans voyelles ni guillemets) : chacun est une « raison » de dire la variante ; une consigne qui en cite plusieurs
    // vaut pour l'une OU l'autre (« בראש חודש ובחול המועד » : Roch 'Hodesh ou 'Hol haMoed). L'ordre compte : le plus précis d'abord.
    var ATOMS = [
        ['aseret', /עשרת ימי תשובה/],
        ['roshHashana', /בראש השנה|^ברה ש$/],
        ['moadim', /^במועדים/],
        ['rc', /בראש (חדש|חודש)|בליל ראש (חדש|חודש)|(^|\s)בר ?ח(\s|$)/],
        ['chPesach', /(חוה מ|חול המועד) פסח/],
        ['chSukkot', /(חוה מ|חול המועד) סוכות/],
        ['ch', /חול המועד|חוה מ\b|חוהמ/],
        ['shemini', /בשמיני עצרת/],
        ['pesach', /^בפסח|ובפסח|, בפסח/],
        ['shavuot', /בשבועות/],
        ['sukkot', /^בסוכות|ובסוכות/],
        ['yomTov', /ביום טוב|ביו ט|יום טוב|וביו ט/],
        ['hanukkah', /חנוכה/],
        ['purim', /פורים/],
        ['tishaBav', /תשעה באב/],
        ['fastPublic', /תענית ציבור/],
        ['fastIndividual', /תענית יחיד/],
        ['noTachanun', /ימים שאין בהם תחנון/],
        ['summer', /בקיץ/],
        ['winter', /בחורף/],
        ['shabbat', /^בשבת|ובשבת|, בשבת/]
    ];

    // Les consignes propres à Chabbat : elles ne valent pas pour tous les Chabbats (« בשבת שובה » : le Chabbat des dix jours de pénitence ; « בשבת ר"ח » : un Chabbat
    // qui est aussi Roch 'Hodesh…). Une condition de cette liste REMPLACE les atomes simples qu'elle contient (« shabbat » + « rc » seraient lus « Chabbat OU Roch 'Hodesh »).
    var SHABBAT_ATOMS = [
        ['notShabbatRc', /(כשלא|שלא|לא) חל ראש (חדש|חודש) בשבת/],
        ['shabbatRc', /חל ראש (חדש|חודש) בשבת/],
        ['shabbatZachor', /בשבת זכור|שבת זכור/],
        ['mevarchim', /בשבת שלפני ראש (חדש|חודש)|שבת שלפני ראש (חדש|חודש)/],
        ['shabbatShuva', /בשבת (שובה|תשובה)|שבת שובה/],
        ['shabbatSpecial', /בשבת (ר ?ח|ראש חדש|ראש חודש) או|בשבת חנוכה או|בשבת חול המועד או/],
        ['shabbatRc', /בשבת (ר ח|ראש חדש|ראש חודש)/],
        ['shabbatHanukkah', /בשבת חנוכה/],
        ['shabbatCh', /בשבת (חול המועד|חוה מ|חוהמ)/]
    ];

    // Le début d'une consigne (avant le premier « : », ou toute la consigne s'il n'y en a pas), borné pour ne pas prendre une phrase pour une condition.
    function rubricHead(text) {
        var n = norm(text);
        var colon = text.indexOf(':');
        var head = colon >= 0 ? norm(text.slice(0, colon)) : n;
        return { n: n, head: head, endsWithColon: /:\s*$/.test(text.trim()), hasBody: colon >= 0 && hasHebrew(text.slice(colon + 1)) };
    }

    // Une consigne reconnue : { atoms: [...], endsWithColon, hasBody, insert } ; null sinon. `insert` : la consigne annonce un ajout « ici » (« אומר כאן »).
    function conditionOf(text) {
        var r = rubricHead(text);
        if (!r.head || r.head.length > 110) return null;
        // Une consigne s'écrit sans voyelles ; un texte vocalisé (le corps d'une variante) n'en est pas une.
        var rawHead = text.indexOf(':') >= 0 ? text.slice(0, text.indexOf(':')) : text;
        if ((rawHead.match(/[\u05B0-\u05C7]/g) || []).length > 1) return null;
        // « si l'on a oublié… » n'est pas une variante du jour ; mais « בתענית… אומר כאן…, וכן שליח ציבור ששכח… » en est une (elle commence par sa condition)
        if (/^אם /.test(r.head) || (/שכח/.test(r.head) && !/^ב(תענית|תשעה באב)/.test(r.head))) return null;          // « si l'on a oublié… » : ce n'est pas une variante du jour
        var atoms = [];
        ATOMS.forEach(function (a) { if (a[1].test(r.head) && atoms.indexOf(a[0]) === -1) atoms.push(a[0]); });
        // « רק בשבת שובה » etc. : « שבת » seul reste « shabbat » ; « חול המועד פסח » ne doit pas aussi compter comme « ch » générique
        if (atoms.indexOf('chPesach') !== -1 || atoms.indexOf('chSukkot') !== -1) atoms = atoms.filter(function (x) { return x !== 'ch'; });
        for (var si = 0; si < SHABBAT_ATOMS.length; si++) if (SHABBAT_ATOMS[si][1].test(r.head)) { atoms = [SHABBAT_ATOMS[si][0]]; break; }
        if (!atoms.length) return null;
        return { atoms: atoms, endsWithColon: r.endsWithColon, hasBody: r.hasBody, insert: /(אומר|אומרים|מוסיפים|מוסיף) כאן/.test(r.head), psalm: /מזמור זה/.test(r.head) };
    }

    // « été / hiver » : la même consigne sert à deux choses (Machiv haRouah / Morid hatal, et Barekh alénou / Barekhénou). Le corps du texte les distingue.
    function refineSeason(atoms, bodyText) {
        if (atoms.indexOf('summer') === -1 && atoms.indexOf('winter') === -1) return atoms;
        var b = norm(bodyText);
        var kind = /ותן טל ומטר|ברך עלינו|ברכנו יהוה|ברכנו ה /.test(b) ? 'barech' : 'dew';
        return atoms.map(function (a) { return a === 'summer' ? kind + 'Summer' : a === 'winter' ? kind + 'Winter' : a; });
    }

    // --- Les variantes dans un segment ---------------------------------------------------------------------------------------------------
    // Annote l'arbre d'un segment : un nœud peut recevoir `m` = { id, atoms, role: 'self' | 'marker' | 'body', label }. Les nœuds de même `id` forment
    // une variante (marqueur + corps) ; un nœud 'self' est une variante à lui seul (« בעשרת ימי תשובה אומר: הַשָּׁלוֹם »). Un marqueur sans corps
    // (une simple consigne) reçoit role 'rubric' : on peut le mettre en valeur, il n'estompe rien.
    function isMarkerText(t) { return !!conditionOf(t); }

    function annotate(node, counter) {
        var kids = node.c;
        for (var i = 0; i < kids.length; i++) {
            var k = kids[i];
            if (k.t !== 'tag' || k.n !== 'small') {
                if (k.t === 'tag' && k.n !== 'br') annotate(k, counter);
                continue;
            }
            var text = plain(k);
            var cond = conditionOf(text);
            if (!cond) { annotate(k, counter); continue; }
            if (cond.hasBody) {                                              // « בעשרת ימי תשובה אומר: הַשָּׁלוֹם » : marqueur et corps dans la même balise
                k.m = { id: counter.n++, atoms: refineSeason(cond.atoms, text.slice(text.indexOf(':') + 1)), role: 'self', label: text.slice(0, text.indexOf(':')).trim() };
                continue;
            }
            if (!cond.endsWithColon) { k.m = { id: counter.n++, atoms: cond.atoms, role: 'rubric', label: text.trim() }; continue; }
            // Un marqueur qui finit par « : » : son corps est le nœud suivant (une balise <small> qui n'est pas un marqueur), ou la suite du texte
            // jusqu'au marqueur suivant.
            var j = i + 1;
            while (j < kids.length && kids[j].t === 'text' && !kids[j].v.trim()) j++;
            var id = counter.n++;
            var body = [];
            if (j < kids.length && kids[j].t === 'tag' && kids[j].n === 'small' && !isMarkerText(plain(kids[j]))) {
                body = [kids[j]];
                annotate(kids[j], counter);
                i = j;
            } else {
                var e = i + 1;
                while (e < kids.length && !(kids[e].t === 'tag' && kids[e].n === 'small' && isMarkerText(plain(kids[e])))) { body.push(kids[e]); e++; }
                i = e - 1;
            }
            var bodyText = plain(body);
            if (!hasHebrew(bodyText)) { k.m = { id: id, atoms: cond.atoms, role: 'rubric', label: text.trim() }; continue; }
            var atoms = refineSeason(cond.atoms, bodyText);
            k.m = { id: id, atoms: atoms, role: 'marker', label: text.trim().replace(/:$/, '') };
            body.forEach(function (b) { b.m = { id: id, atoms: atoms, role: 'body' }; });
        }
    }

    function analyseSegment(html, counter) {
        var tree = parse(html);
        annotate(tree, counter || { n: 1 });
        return tree;
    }

    // --- Les blocs : une consigne seule dans son segment, suivie de segments de texte ---------------------------------------------------
    // « בקיץ: » (un segment) puis la bénédiction d'été (le segment suivant) ; « בראש חודש ובחול המועד מוסיפים: » puis tout l'ajout (Yaalé véyavo)…
    // Retourne [{ from, to, atoms, title }] : les segments from..to (inclus) sont le corps ; `from - 1` est la consigne. Les consignes qui ne se
    // terminent pas par « : » (sauf « אומר כאן ») ne forment pas de bloc : le segment suivant n'est pas forcément à elles (« בראש חדש יש לומר כאן הלל… »).
    function onlySmall(tree) {
        var kids = tree.c.filter(function (k) { return !(k.t === 'text' && !k.v.trim()); });
        return kids.length > 0 && kids.every(function (k) { return k.t === 'tag' && k.n === 'small'; });
    }

    function groups(segments) {
        var trees = segments.map(function (s) { return parse(s); });
        var out = [];
        var i = 0;
        while (i < segments.length) {
            var tree = trees[i];
            var text = plain(tree);
            var cond = onlySmall(tree) && !/[֑-ׇ]/.test(text) ? conditionOf(text) : null;
            if (!cond || !(cond.endsWithColon || cond.insert || cond.psalm) || cond.hasBody) { i++; continue; }
            var from = i + 1;
            if (from >= segments.length) { i++; continue; }
            var next = trees[from];
            var to;
            if (cond.psalm) {                                                // « …לומר מזמור זה » : le psaume (vocalisé) est le segment suivant, seul
                if (!/[֑-ׇ]/.test(plain(next))) { i++; continue; }
                to = from;
            } else if (!onlySmall(next)) {
                to = from;                                                   // le corps est un seul segment de texte (été / hiver)
            } else {
                to = from;
                while (to + 1 < segments.length && onlySmall(trees[to + 1]) && /[֑-ׇ]/.test(plain(trees[to + 1]))) to++;
                if (!/[֑-ׇ]/.test(plain(trees[from]))) { i++; continue; }
            }
            var bodyText = plain(trees.slice(from, to + 1).map(function (t) { return t; }));
            out.push({ header: i, from: from, to: to, atoms: refineSeason(cond.atoms, bodyText), title: text.replace(/\s+/g, ' ').trim() });
            i = to + 1;
        }
        return out;
    }

    // --- Le calendrier du jour hébraïque ------------------------------------------------------------------------------------------------------
    // Les dates du changement de saison. Machiv haRouah : de Chémini Atséret (22 Tichri) à Pessa'h (15 Nisan) ; Morid hatal : le reste. Véten tal
    // oumatar (Barekh alénou) : en Israël dès le 7 'Hechvan ; dans la diaspora dès le soir du 4 décembre (5 l'année qui précède une année civile
    // bissextile), jusqu'à Pessa'h. Un jour de fête n'est pas un jour de ce siddour : on ne se soucie que des jours ordinaires.
    function decemberStart(year) {
        var leapNext = ((year + 1) % 4 === 0 && (year + 1) % 100 !== 0) || (year + 1) % 400 === 0;
        return CY.gregorianToFixed(year, 12, leapNext ? 6 : 5);     // le jour civil qui suit le soir du 4 (ou du 5) décembre
    }

    // Le Chabbat qui précède Roch 'Hodesh : un des six jours suivants est le premier jour du mois (le 30 du mois précédent, ou le 1er), sauf Tichri (Roch Hachana).
    function mevarchim(fixed) {
        for (var d = 1; d <= 6; d++) {
            var h = HC.hebrewFromFixed(fixed + d);
            var prev = HC.hebrewFromFixed(fixed + d - 1);
            var first = h.day === 30 || (h.day === 1 && prev.day !== 30);
            if (first) return !(h.day === 1 && h.month === 'Tishri') && !(h.day === 30 && prev.month === 'Elul');
        }
        return false;
    }

    function contextFor(fixed, israel) {
        var h = HC.hebrewFromFixed(fixed);
        var year = h.year;
        var at = function (month, day, y) { return CY.hebrewToFixed(y === undefined ? year : y, month, day); };
        // L'hiver (Machiv haRouah) : du 22 Tichri au 15 Nisan de la MÊME année hébraïque (Tichri en est le premier mois, Nisan le septième).
        var winterFrom = at('Tishri', 22), winterTo = at('Nisan', 15);
        var dewWinter = fixed >= winterFrom && fixed < winterTo;
        // Véten tal oumatar : le décembre de cette année hébraïque est celui de l'année civile (année hébraïque − 3761).
        var talFrom = israel ? at('Heshvan', 7) : decemberStart(year - 3761);
        var talTo = winterTo;
        var barechWinter = fixed >= talFrom && fixed < talTo;
        var feasts = HC.feastsOf(year, israel);
        var inFeast = function (id) { return feasts.some(function (f) { return f.id === id && fixed >= f.fixed && fixed <= f.last; }); };
        var fastDay = feasts.filter(function (f) { return f.kind === 'fast' && f.fixed === fixed; })[0];
        var pesachFirst = at('Nisan', 15), sukkotFirst = at('Tishri', 15);
        var ytPesach = israel ? [pesachFirst, pesachFirst + 6] : [pesachFirst, pesachFirst + 1, pesachFirst + 6, pesachFirst + 7];
        var ytSukkot = israel ? [sukkotFirst, sukkotFirst + 7] : [sukkotFirst, sukkotFirst + 1, sukkotFirst + 7, sukkotFirst + 8];
        var pesach = inFeast('pessah'), sukkot = fixed >= sukkotFirst && fixed <= sukkotFirst + 6;
        var chPesach = pesach && ytPesach.indexOf(fixed) === -1;
        var chSukkot = sukkot && ytSukkot.indexOf(fixed) === -1;
        var shemini = fixed === at('Tishri', 22) || (!israel && fixed === at('Tishri', 23));
        var shavuot = inFeast('chavouot');
        var roshHashana = h.month === 'Tishri' && h.day <= 2;
        var yomTov = roshHashana || (h.month === 'Tishri' && h.day === 10) || ytPesach.indexOf(fixed) !== -1 || ytSukkot.indexOf(fixed) !== -1 || shemini || shavuot;
        var shabbat = HC.weekdayOf(fixed) === 6;
        var info = HC.dayInfo(fixed, israel);
        var purimId = HC.leap(year) ? 'AdarII' : 'Adar';
        var flags = {
            dewWinter: dewWinter, dewSummer: !dewWinter, barechWinter: barechWinter, barechSummer: !barechWinter,
            aseret: h.month === 'Tishri' && h.day <= 10,
            rc: h.day === 1 || h.day === 30,
            roshHashana: roshHashana, moadim: pesach || sukkot || shavuot || shemini, chPesach: chPesach, chSukkot: chSukkot, ch: chPesach || chSukkot,
            shemini: shemini, pesach: pesach, shavuot: shavuot, sukkot: sukkot, yomTov: yomTov,
            hanukkah: inFeast('hanouka'), purim: h.month === purimId && h.day === 14,
            tishaBav: !!fastDay && fastDay.id === 'tichabav', fastPublic: !!fastDay, shabbat: shabbat,
            noTachanun: Z.noTachanun(fixed, israel),
            tachanunMorning: Z.tachanunStatus(fixed, israel) === 'morning'
        };
        // Chabbats particuliers : le Chabbat des dix jours de pénitence, un Chabbat qui est aussi Roch 'Hodesh, 'Hol haMoed ou Hanouka, et le Chabbat qui précède Roch 'Hodesh.
        flags.shabbatShuva = shabbat && flags.aseret;
        flags.shabbatRc = shabbat && flags.rc;
        flags.notShabbatRc = shabbat && !flags.rc;
        flags.shabbatHanukkah = shabbat && flags.hanukkah;
        flags.shabbatCh = shabbat && flags.ch;
        flags.shabbatSpecial = shabbat && (flags.rc || flags.ch || flags.hanukkah);
        flags.mevarchim = shabbat && mevarchim(fixed);
        // Chabbat Zakhor : le Chabbat qui précède Pourim (Pourim tombe dans les six jours suivants).
        var purimDay = CY.hebrewToFixed(year, HC.leap(year) ? 'AdarII' : 'Adar', 14) - fixed;
        flags.shabbatZachor = shabbat && purimDay >= 1 && purimDay <= 6;
        return { fixed: fixed, hebrew: h, israel: !!israel, flags: flags, omer: info.omer, weekday: HC.weekdayOf(fixed), fast: fastDay ? fastDay.id : null, feasts: info.feasts.map(function (f) { return f.id; }) };
    }

    // Une variante s'applique-t-elle ? 'on' si l'une des raisons est vraie, 'unknown' si l'une est inconnue (jeûne de l'intéressé) et aucune vraie, sinon 'off'.
    var UNKNOWN_ATOMS = { fastIndividual: true };
    function evaluate(atoms, ctx) {
        var unknown = false;
        for (var i = 0; i < atoms.length; i++) {
            var a = atoms[i];
            if (UNKNOWN_ATOMS[a]) { unknown = true; continue; }
            if (ctx.flags[a] === true) return 'on';
            if (ctx.flags[a] === undefined) unknown = true;
        }
        return unknown ? 'unknown' : 'off';
    }

    // Le jour hébraïque (jour fixe) d'un instant en un lieu : il change à la sortie des étoiles.
    function hebrewDayFixed(place, nowMs, opts) {
        var d = Z.civilDateOf(place.tz, nowMs);
        var z = Z.zmanim(place, d.year, d.month, d.day, opts);
        var night = Z.rounded(z, 'tzeit');
        var fixed = CY.gregorianToFixed(d.year, d.month, d.day);
        return night !== null && nowMs >= night ? fixed + 1 : fixed;
    }

    // Ce qui change aujourd'hui, pour le résumé de l'écran : des identifiants (traduits par l'écran).
    function notesFor(ctx) {
        var f = ctx.flags, n = [];
        if (f.shabbat) n.push('shabbat');
        if (f.yomTov) n.push('yomTov');
        n.push(f.dewWinter ? 'machiv' : 'morid');
        n.push(f.barechWinter ? 'tal' : 'noTal');
        if (f.aseret) n.push('aseret');
        if (f.rc) n.push('rc');
        if (f.ch) n.push('ch');
        if (f.hanukkah) n.push('hanukkah');
        if (f.purim) n.push('purim');
        if (f.tishaBav) n.push('tishaBav');
        else if (f.fastPublic) n.push('fast');
        n.push(f.noTachanun ? 'noTachanun' : f.tachanunMorning ? 'tachanunMorning' : 'tachanun');
        if (ctx.omer) n.push('omer');
        return n;
    }

    // Omer : la ligne du jour N (les lignes « << הַיּוֹם … לָעֹמֶר >> » sont dans l'ordre) → l'indice du segment, ou -1.
    function omerSegment(segments, day) {
        var seen = 0;
        for (var i = 0; i < segments.length; i++) {
            var t = plain(parse(segments[i]));
            if (/^\s*<</.test(t) && /לעו?מר/.test(stripNiqqud(t))) { seen++; if (seen === day) return i; }
        }
        return -1;
    }

    // Empreinte du texte d'un segment sans voyelles : lie une traduction à son texte source.
    function fingerprint(html) {
        var text = stripNiqqud(plain(parse(html))).replace(/\s+/g, ' ').trim();
        var h = 5381;
        for (var i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
        return h.toString(36);
    }


    // Le psaume du jour (Chir chel yom) : chaque en-tête du livre dit à quel jour vaut le psaume qui le suit. 'on', 'off', 'unknown'
    // (la maison d'un deuil : l'application ne le sait pas), ou null si le texte n'est pas un de ces en-têtes.
    var WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'ששי'];
    function dayPsalm(text, ctx) {
        var t = norm(text);
        var m = /מזמור ליום (ראשון|שני|שלישי|רביעי|חמישי|ששי)/.exec(t);
        if (m) return ctx.weekday === WEEKDAYS.indexOf(m[1]) ? 'on' : 'off';
        var yes = null;
        if (/בצום גדליה|בעשרה בטבת/.test(t)) yes = ctx.fast === 'guedalia' || ctx.fast === 'tevet10';
        else if (/למחרת יום הכי?פורים/.test(t)) yes = ctx.hebrew.month === 'Tishri' && ctx.hebrew.day === 11;
        else if (/בחנוכה/.test(t)) yes = !!ctx.flags.hanukkah;
        else if (/בתענית אסתר|בפורים/.test(t)) yes = ctx.fast === 'esther' || !!ctx.flags.purim;
        else if (/בשבעה עשר בתמוז/.test(t)) yes = ctx.fast === 'tamouz17';
        else if (/בבית האבל/.test(t)) return 'unknown';
        else return null;
        return yes ? 'on' : 'off';
    }

    // --- Roch 'Hodech, Hanouka, Pourim, 'Hol haMoed (un jour de semaine) : l'office entier, dans l'ordre du livre ----------------------------------
    // Le livre (data/siddur/) range chacune de ces occasions à part. Ici, on compose l'office du jour à partir de ses sections : celles de la semaine jusqu'à
    // l'Amida, puis celles de l'occasion à la place des sections de la semaine qu'elles remplacent, puis la fin habituelle. Chabbat et les fêtes (Yom Tov) ont leurs
    // propres offices : aucune occasion n'est rendue ces jours-là.
    var OCCASIONS = ['rc', 'hanouka', 'pourim', 'chPesach', 'chSukkot'];
    var OCC_HE = { rc: 'ראש חודש', hanouka: 'חנוכה', pourim: 'פורים', chPesach: 'חול המועד פסח', chSukkot: 'חול המועד סוכות' };
    var RC_SECTIONS = ['rh-ordre', 'rh-hallel', 'rh-ouva-letsion', 'rh-chir-chel-yom', 'rh-moussaf', 'rh-barkhi-nafchi', 'rh-qave', 'rh-ketoret', 'rh-alenou'];
    var KEEP_AFTER = ['chacharit-treize-principes', 'chacharit-dix-souvenirs'];
    // Les sections « Hallel » du livre se terminent par la sortie du rouleau et la lecture de Roch 'Hodech (Pin'has) : à partir de ce segment, on ne les montre pas
    // quand l'occasion a sa propre lecture (Hanouka, 'Hol haMoed).
    var HALLEL_TAIL_FROM = 34;

    // Les occasions du jour, dans l'ordre : ['rc', 'hanouka'] (Roch 'Hodech Tévet tombe pendant Hanouka), ['pourim'], ['chPesach']… Vide un jour ordinaire, un Chabbat, un Yom Tov.
    function occasionsOf(ctx) {
        if (!ctx || !ctx.flags || ctx.flags.shabbat || ctx.flags.yomTov) return [];
        var f = ctx.flags, out = [];
        if (f.rc) out.push('rc');
        if (f.hanukkah) out.push('hanouka');
        if (f.purim) out.push('pourim');
        if (f.chPesach) out.push('chPesach');
        if (f.chSukkot) out.push('chSukkot');
        return out;
    }

    // Les occasions d'un Chabbat (qui n'est pas aussi un jour de fête) : Roch 'Hodech, Hanouka, 'Hol haMoed. Pourim ne tombe pas un Chabbat.
    function shabbatOccasionsOf(ctx) {
        if (!ctx || !ctx.flags || !ctx.flags.shabbat || ctx.flags.yomTov) return [];
        var f = ctx.flags, out = [];
        if (f.rc) out.push('rc');
        if (f.hanukkah) out.push('hanouka');
        if (f.chPesach) out.push('chPesach');
        if (f.chSukkot) out.push('chSukkot');
        return out;
    }

    // Un jour de Roch 'Hodech qui n'est ni Chabbat ni jour de fête.
    function isRoshChodeshWeekday(ctx) { return occasionsOf(ctx).indexOf('rc') >= 0; }

    // Les offices de Chabbat un Chabbat d'occasion. Le livre annonce le Hallel dans l'Amida de Cha'harit (« en Chabbat Roch 'Hodech, 'Hol haMoed ou Hanouka, on dit ici le Hallel, avant le Kaddich »)
    // sans en donner le texte : on le met après l'Amida (sans la sortie du rouleau de Roch 'Hodech qui le suit, la Torah de Chabbat étant celle du livre). À Hanouka, les lectures du
    // second rouleau suivent celle de Chabbat. Au Moussaf de 'Hol haMoed, le mizmor de la fête suit l'Amida.
    function shabbatOfficeFor(group, ids, occ, has) {
        var out = ids.slice(), trim = {};
        var after = function (anchor, id) { var at = out.indexOf(anchor); if (at >= 0 && has(id)) { out.splice(at + 1, 0, id); return true; } return false; };
        if (group === 'chabbat-chacharit') {
            if (after('chabbat-ch-amida', 'rh-hallel')) trim['rh-hallel'] = HALLEL_TAIL_FROM;
            if (occ.indexOf('hanouka') >= 0) after('chabbat-ch-tora', 'hanouka-chacharit');
        } else if (group === 'chabbat-moussaf') {
            if (occ.indexOf('chPesach') >= 0) after('chabbat-mo-amida', 'regalim-mizmor-pessah');
            else if (occ.indexOf('chSukkot') >= 0) after('chabbat-mo-amida', 'regalim-mizmor-souccot');
        }
        return { ids: out, trim: trim };
    }

    // Les sections de Cha'harit de l'office du jour ; null si le livre n'a pas de quoi composer l'office (on garde alors celui de la semaine).
    function chacharitFor(ids, occ, has) {
        var cut = ids.indexOf('chacharit-amida');
        if (cut < 0) return null;
        var head = ids.slice(0, cut + 1), tail = ids.slice(cut + 1);
        var without = function (list, drop) { return list.filter(function (x) { return drop.indexOf(x) < 0; }); };
        var all = function (list) { return list.every(has); };
        var keep = tail.filter(function (id) { return KEEP_AFTER.indexOf(id) >= 0; });
        var has_ = function (o) { return occ.indexOf(o) >= 0; };
        if (has_('rc')) {
            var rc = RC_SECTIONS.slice();
            if (has_('hanouka') && has('hanouka-chacharit')) rc.splice(rc.indexOf('rh-hallel') + 1, 0, 'hanouka-chacharit');     // la lecture de Hanouka, après celle de Roch 'Hodech
            return all(rc) ? { ids: head.concat(rc, keep), trim: {} } : null;
        }
        if (has_('hanouka')) {
            var han = ['rh-hallel', 'chacharit-tora', 'hanouka-chacharit'];
            if (!all(han)) return null;
            var trimH = {}; trimH['rh-hallel'] = HALLEL_TAIL_FROM;
            return { ids: head.concat(han, without(tail, ['chacharit-vidoui', 'chacharit-tora'])), trim: trimH };
        }
        if (has_('pourim')) {
            // la Méguila se lit après Achré, avant la fin d'Ouva lé-Tsion (« Véata kadoch ») ; la Torah de Pourim (Amalek) se lit comme en semaine
            var pou = ['pourim-jour', 'chacharit-tora', 'chacharit-achre', 'pourim-meguila', 'pourim-chochanat-yaakov'];
            if (!all(pou)) return null;
            return { ids: head.concat(pou, without(tail, ['chacharit-vidoui', 'chacharit-tora', 'chacharit-achre'])), trim: {} };
        }
        if (has_('chPesach') || has_('chSukkot')) {
            var mizmor = has_('chPesach') ? 'regalim-mizmor-pessah' : 'regalim-mizmor-souccot';
            var hm = ['hm-hallel', 'chacharit-tora', 'chacharit-achre', 'chacharit-ouva-letsion', 'chacharit-beit-yaakov', 'hm-moussaf', mizmor, 'chacharit-qave', 'chacharit-alenou'];
            if (!all(hm)) return null;
            var trimM = {}; trimM['hm-hallel'] = HALLEL_TAIL_FROM;
            return { ids: head.concat(hm, keep), trim: trimM };
        }
        return null;
    }

    // L'office du jour : { ids, trim } pour `base` ('chacharit', 'minha', 'arvit'), d'après les sections de la semaine (`ids`), les occasions du jour et les sections que le livre
    // contient (`available`, facultatif). `trim` : { identifiant de section : premier segment à ne pas montrer }. Un jour ordinaire : les sections de la semaine, telles quelles.
    // `opts.friday` : le vendredi, avant Chabbat. `base` peut aussi être un groupe de Chabbat (« chabbat-chacharit », « chabbat-moussaf »…) : voir shabbatOfficeFor.
    function officeFor(base, ids, occ, available, opts) {
        var plain = { ids: ids.slice(), trim: {} };
        if (!occ || !occ.length) return plain;
        var has = function (id) { return ids.indexOf(id) >= 0 || !available || available.indexOf(id) >= 0; };
        if (/^chabbat-/.test(base)) return shabbatOfficeFor(base, ids, occ, has);
        // Le vendredi de Hanouka, on allume avant Chabbat : l'allumage suit Min'ha (les bougies de Hanouka avant celles de Chabbat).
        if (base === 'minha' && occ.indexOf('hanouka') >= 0 && opts && opts.friday && has('hanouka-allumage')) return { ids: ids.concat(['hanouka-allumage']), trim: {} };
        if (base === 'chacharit') return chacharitFor(ids, occ, has) || plain;
        if (base === 'arvit') {
            var out = ids.slice();
            if (occ.indexOf('pourim') >= 0 && has('pourim-meguila') && has('pourim-chochanat-yaakov')) {
                var at = out.indexOf('arvit-amida');
                if (at >= 0) { out.splice(at + 1, 0, 'pourim-meguila', 'pourim-chochanat-yaakov'); return { ids: out, trim: {} }; }
            }
            if (occ.indexOf('hanouka') >= 0 && has('hanouka-allumage') && has('hanouka-maoz-tsour')) return { ids: out.concat(['hanouka-allumage', 'hanouka-maoz-tsour']), trim: {} };
        }
        return plain;      // Min'ha : les sections de la semaine (Yaalé véyavo, Al hanissim sont dans l'Amida)
    }

    // --- Birkat haMazon et Mé'en chaloch : repères de lecture (sans DOM) ---------------------------------------------------------------------
    // Le Zimoun : qui parle ? `bare` est le segment sans voyelles ni ponctuation. Retourne 'lead' (l'officiant), 'resp' (les assistants),
    // 'again' (l'officiant reprend), 'go' (l'officiant poursuit), 'fast' (celui qui n'a pas mangé), ou null.
    function zimounRole(bare) {
        if (/^(ויאמר המזמן|ואומר המזמן|המזמן אומר)$/.test(bare)) return 'lead';
        if (/^(והמסובים עונים|המסובים עונים|ועונין המסובין)$/.test(bare)) return 'resp';
        if (/^וחוזר המזמן$/.test(bare)) return 'again';
        if (/^וממשיך$/.test(bare)) return 'go';
        if (/^מי שלא אכל עונה$/.test(bare)) return 'fast';
        return null;
    }

    // Mé'en chaloch : une ligne du menu « selon ce qu'on a mangé » → 0 (céréales), 1 (vin), 2 (sept espèces), ou -1.
    function mcRowKind(bare) {
        if (/^(אם אכל מזונות|על חמשת מיני דגן)/.test(bare)) return 0;
        if (/^(אם שתה יין|על היין)/.test(bare)) return 1;
        if (/^(אם אכל פרות משבעת|פירות שבעת המינים|על פירות משבעת המינים)/.test(bare)) return 2;
        return -1;
    }

    // Les suites de trois lignes (céréales, vin, sept espèces) : chacune devient un tableau. `bares` : les segments sans voyelles.
    function mcTables(bares) {
        var out = [];
        for (var i = 0; i + 2 < bares.length; i++) {
            if (mcRowKind(bares[i]) === 0 && mcRowKind(bares[i + 1]) === 1 && mcRowKind(bares[i + 2]) === 2) { out.push({ from: i, to: i + 2 }); i += 2; }
        }
        return out;
    }

    return {
        zimounRole: zimounRole, mcRowKind: mcRowKind, mcTables: mcTables,
        RC_SECTIONS: RC_SECTIONS, OCCASIONS: OCCASIONS, OCC_HE: OCC_HE, HALLEL_TAIL_FROM: HALLEL_TAIL_FROM, occasionsOf: occasionsOf, shabbatOccasionsOf: shabbatOccasionsOf, isRoshChodeshWeekday: isRoshChodeshWeekday, officeFor: officeFor,
        fingerprint: fingerprint, parse: parse, plain: plain, stripNiqqud: stripNiqqud, conditionOf: conditionOf, analyseSegment: analyseSegment, groups: groups,
        contextFor: contextFor, mevarchim: mevarchim, evaluate: evaluate, hebrewDayFixed: hebrewDayFixed, notesFor: notesFor, omerSegment: omerSegment, decemberStart: decemberStart, dayPsalm: dayPsalm
    };
}));
