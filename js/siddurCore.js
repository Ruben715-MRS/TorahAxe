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
        ['roshHashana', /בראש השנה/],
        ['rc', /בראש (חדש|חודש)|בר ?ח\b/],
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
        if (/^אם /.test(r.head) || /שכח/.test(r.head)) return null;          // « si l'on a oublié… » : ce n'est pas une variante du jour
        var atoms = [];
        ATOMS.forEach(function (a) { if (a[1].test(r.head) && atoms.indexOf(a[0]) === -1) atoms.push(a[0]); });
        // « רק בשבת שובה » etc. : « שבת » seul reste « shabbat » ; « חול המועד פסח » ne doit pas aussi compter comme « ch » générique
        if (atoms.indexOf('chPesach') !== -1 || atoms.indexOf('chSukkot') !== -1) atoms = atoms.filter(function (x) { return x !== 'ch'; });
        for (var si = 0; si < SHABBAT_ATOMS.length; si++) if (SHABBAT_ATOMS[si][1].test(r.head)) { atoms = [SHABBAT_ATOMS[si][0]]; break; }
        if (!atoms.length) return null;
        return { atoms: atoms, endsWithColon: r.endsWithColon, hasBody: r.hasBody, insert: /(אומר|אומרים|מוסיפים|מוסיף) כאן/.test(r.head) };
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
            if (!cond || !(cond.endsWithColon || cond.insert) || cond.hasBody) { i++; continue; }
            var from = i + 1;
            if (from >= segments.length) { i++; continue; }
            var next = trees[from];
            var to;
            if (!onlySmall(next)) {
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
            roshHashana: roshHashana, chPesach: chPesach, chSukkot: chSukkot, ch: chPesach || chSukkot,
            shemini: shemini, pesach: pesach, shavuot: shavuot, sukkot: sukkot, yomTov: yomTov,
            hanukkah: inFeast('hanouka'), purim: h.month === purimId && h.day === 14,
            tishaBav: !!fastDay && fastDay.id === 'tichabav', fastPublic: !!fastDay, shabbat: shabbat,
            noTachanun: Z.noTachanun(fixed, israel)
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
        n.push(f.noTachanun ? 'noTachanun' : 'tachanun');
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

    return {
        fingerprint: fingerprint, parse: parse, plain: plain, stripNiqqud: stripNiqqud, conditionOf: conditionOf, analyseSegment: analyseSegment, groups: groups,
        contextFor: contextFor, mevarchim: mevarchim, evaluate: evaluate, hebrewDayFixed: hebrewDayFixed, notesFor: notesFor, omerSegment: omerSegment, decemberStart: decemberStart
    };
}));
