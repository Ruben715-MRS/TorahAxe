// =========================================================================
// === LA CHRONOLOGIE (DONNÉES ET RÈGLES, outil « Explorer ») ===
// =========================================================================
// Une grande frise où l'on voit, au même endroit, ce qui se passe en même temps : les époques, le Michkan et le Temple, les prophètes, les juges et les rois,
// les événements. Pur, sans DOM : testé dans tests/chronologieCore.test.js. Les données sont dans data/chronologie.json ; les rois de Juda et le début
// des rois d'Israël ne sont PAS recopiés : ils viennent de js/genealogyChronology.js (une seule source pour les dates des règnes).
//
// Un élément : { id, voie, fr, he?, from, to?, approx?, kind?, saut?, note?, gen?, outil? }
//   from, to : années depuis la création du monde (AM) ; sans `to`, c'est un repère ponctuel ;
//   approx : date approximative (≈) ;  kind : 'detail' (barre secondaire), 'oppression' (domination étrangère) ;
//   saut : l'époque a un bouton de saut dans l'écran ;  gen : identifiant d'une personne de la généalogie ;  outil : l'outil à ouvrir (« mishkan »).
// La datation est celle de la tradition (Séder Olam) : l'année N de la création est 3761 − N av. J.-C. L'année 3761 est l'an 1 de l'ère commune.
// Quand une partie du livre d'origine (création, puis 3338 à nos jours) sera ajoutée, on élargit `plage` et on ajoute des éléments, sans toucher au code.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./genealogyChronology.js'));
    else root.ChronologieCore = factory(root.GenealogyChronology || null);
}(typeof self !== 'undefined' ? self : this, function (GC) {
    'use strict';

    var CREATION_OFFSET = 3761;

    // --- Les deux calendriers ---------------------------------------------------------------------------------------------------
    // Année civile signée (négative : avant l'ère commune ; pas d'année zéro).
    function civilYear(am) {
        return am < CREATION_OFFSET ? -(CREATION_OFFSET - am) : am - (CREATION_OFFSET - 1);
    }
    function civilLabel(am) {
        var y = civilYear(am);
        return y < 0 ? (-y) + ' av. J.-C.' : y + ' ap. J.-C.';
    }
    function amLabel(am) { return 'AM ' + am; }
    // `mode` : 'am' (années hébraïques) ou 'civil'.
    function yearLabel(am, mode) { return mode === 'civil' ? civilLabel(am) : amLabel(am); }

    // Les dates d'un élément : « AM 2448–2488 » ou « 1313 av. J.-C. – 1273 av. J.-C. », précédées de ≈ quand elles sont approximatives.
    function dating(item, mode) {
        var ap = item.approx ? '≈ ' : '';
        if (item.to === undefined || item.to === item.from) return ap + yearLabel(item.from, mode);
        if (mode === 'civil') return ap + civilLabel(item.from) + ' – ' + civilLabel(item.to);
        return ap + 'AM ' + item.from + '–' + item.to;
    }
    function duration(item) {
        if (item.to === undefined || item.to === item.from) return 0;
        return item.to - item.from;
    }
    function durationLabel(item) {
        var d = duration(item);
        if (!d) return '';
        return d + (d > 1 ? ' ans' : ' an');
    }

    // --- Les rois : depuis js/genealogyChronology.js -----------------------------------------------------------------------------
    function yearsOf(length) {
        var m = /^(\d+) an/.exec(length || '');
        return m ? parseInt(m[1], 10) : 0;    // « 6 mois », « 7 jours » : pas d'années entières
    }
    function kingNote(k, trad) {
        var parts = [k.length ? 'Durée du règne : ' + k.length + '.' : ''];
        if (trad && trad.note) parts.push(trad.note);
        return parts.filter(Boolean).join(' ');
    }
    // Les rois de Juda : les dates de la tradition, telles quelles.
    function judahItems() {
        if (!GC) return [];
        return GC.JUDAH.map(function (k) {
            var t = GC.traditional(k);
            if (!t) return null;
            var item = { id: 'k_' + k.id, voie: 'juda', fr: k.fr, from: t.start, approx: t.status === 'approx', note: kingNote(k, t) };
            if (t.end > t.start) item.to = t.end;
            if (k.id) item.gen = k.id;
            return item;
        }).filter(Boolean);
    }
    // Les rois d'Israël dont la tradition donne le début (de Jéroboam à Jéroboam II) : chacun finit au plus tard quand le suivant commence.
    function israelItems() {
        if (!GC) return [];
        var kings = GC.ISRAEL.map(function (k) { return { k: k, t: GC.traditional(k) }; }).filter(function (x) { return x.t && x.t.start !== undefined; });
        return kings.map(function (x, i) {
            var years = yearsOf(x.k.length);
            var item = { id: 'k_' + x.k.id, voie: 'israel', fr: x.k.fr, from: x.t.start, approx: true, note: kingNote(x.k, null) };
            var end = years ? x.t.start + years : 0;
            if (kings[i + 1] && (!end || kings[i + 1].t.start < end)) end = kings[i + 1].t.start;
            if (end > x.t.start) item.to = end;
            if (x.k.id) item.gen = x.k.id;
            return item;
        });
    }

    // --- Le modèle ------------------------------------------------------------------------------------------------------------------
    // `data` : le contenu de data/chronologie.json. Renvoie { plage, sources, voies: [{ id, fr, items }], items, byId, sauts }.
    function build(data) {
        var all = data.items.concat(judahItems(), israelItems());
        var byId = {};
        all.forEach(function (x) { byId[x.id] = x; });
        var voies = data.voies.map(function (v) {
            return { id: v.id, fr: v.fr, items: all.filter(function (x) { return x.voie === v.id; }).sort(function (a, b) { return a.from - b.from || (b.to || b.from) - (a.to || a.from); }) };
        });
        var sauts = all.filter(function (x) { return x.saut; }).sort(function (a, b) { return a.from - b.from; });
        return { plage: data.plage, sources: data.sources, voies: voies, items: all, byId: byId, sauts: sauts, livres: data.livres || {}, fetes: data.fetes || {} };
    }

    // La partie d'un élément qui tombe dans la plage affichée : { from, to, cutLeft, cutRight }.
    function clip(item, plage) {
        var to = item.to === undefined ? item.from : item.to;
        return {
            from: Math.max(item.from, plage[0]), to: Math.min(to, plage[1]),
            cutLeft: item.from < plage[0], cutRight: to > plage[1]
        };
    }

    // --- La mise en rangées ---------------------------------------------------------------------------------------------------
    // Les éléments d'une voie se chevauchent (plusieurs prophètes en même temps) : on les range sur des rangées, du haut vers le bas, sans que deux éléments
    // (ou deux étiquettes) se recouvrent. opts : { scale (px par année), charW (px par caractère), pad (px autour d'une étiquette), minW (largeur minimale
    // d'une barre), gap (px entre deux éléments), point (largeur du repère d'un événement ponctuel) }.
    // Renvoie { rows (nombre), placed: [{ item, x, w, row, inside (l'étiquette tient dans la barre), point }] }, x et w en px depuis le début de la plage.
    function layout(items, plage, opts) {
        var o = opts || {};
        var scale = o.scale || 8, charW = o.charW || 6.5, pad = o.pad || 10, minW = o.minW || 14, gap = o.gap || 6, pointW = o.point || 12;
        var placed = [];
        var rowEnds = [];
        items.slice().sort(function (a, b) { return a.from - b.from || (b.to || b.from) - (a.to || a.from); }).forEach(function (item) {
            var c = clip(item, plage);
            if (c.to < plage[0] || c.from > plage[1]) return;
            var isPoint = item.to === undefined || item.to === item.from;
            var labelW = item.fr.length * charW + pad;
            var x = (c.from - plage[0]) * scale;
            var w, inside, extent;
            if (isPoint) {
                w = pointW; inside = false; extent = pointW + 4 + labelW;
            } else {
                w = Math.max((c.to - c.from) * scale, minW);
                inside = labelW <= w;
                extent = inside ? w : w + 4 + labelW;
            }
            var row = 0;
            while (rowEnds[row] !== undefined && rowEnds[row] + gap > x) row++;
            rowEnds[row] = x + extent;
            placed.push({ item: item, x: x, w: w, row: row, inside: inside, point: isPoint, cutLeft: c.cutLeft, cutRight: c.cutRight });
        });
        return { rows: Math.max(rowEnds.length, 1), placed: placed };
    }

    // --- La recherche ---------------------------------------------------------------------------------------------------------
    function norm(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9א-ת ]+/g, ' ').replace(/\s+/g, ' ').trim();
    }
    // Recherche : chaque mot de la requête doit se trouver dans le nom, l'hébreu ou la note. Les noms d'abord (le nom commence par la requête, puis
    // contient tous les mots), les notes ensuite ; à égalité, dans l'ordre du temps.
    function search(model, query) {
        var q = norm(query);
        if (!q) return [];
        var words = q.split(' ');
        var scored = [];
        model.items.forEach(function (x) {
            var name = norm(x.fr), he = x.he ? norm(x.he) : '', note = norm(x.note);
            var all = name + ' ' + he + ' ' + note;
            for (var i = 0; i < words.length; i++) if (all.indexOf(words[i]) === -1) return;
            var inName = words.every(function (w) { return name.indexOf(w) !== -1 || (he && he.indexOf(w) !== -1); });
            var score = name.indexOf(q) === 0 || (he && he.indexOf(q) === 0) ? 0 : name.indexOf(q) !== -1 ? 1 : inName ? 2 : 3;
            scored.push({ x: x, score: score });
        });
        return scored.sort(function (a, b) { return a.score - b.score || a.x.from - b.x.from; }).map(function (r) { return r.x; });
    }

    // Ce qui se passe en même temps : les éléments des AUTRES voies (hors époques) qui recouvrent l'élément, du plus proche au plus lointain de son début.
    // Pour un événement ponctuel, ceux dont la période contient son année ; pour une période, ceux qui y commencent ou la traversent.
    function contemporains(model, item, limit) {
        var a = item.from, b = item.to === undefined ? item.from : item.to;
        return model.items.filter(function (x) {
            if (x.voie === item.voie || x.voie === 'eres' || x.kind === 'detail') return false;
            var xa = x.from, xb = x.to === undefined ? x.from : x.to;
            return xa <= b && xb >= a;
        }).sort(function (p, q) {
            return Math.abs(p.from - a) - Math.abs(q.from - a) || p.from - q.from;
        }).slice(0, limit || 8);
    }

    // --- Situer une fiche d'un autre outil sur la frise ------------------------------------------------------------------------------
    // Trois façons : un élément précis de la frise (lien `gen` vers la généalogie, ou `sage` vers la chaîne de transmission), une période d'années
    // (un maître dont on connaît la vie, une œuvre), ou, à défaut, l'époque du maître. Le résultat : { item } ou { from, to, label }.
    var LANE_PRIORITY = ['patriarches', 'chefs', 'juda', 'israel', 'prophetie', 'sages', 'bavel', 'judee', 'maitres', 'hassidim', 'lieu', 'empires', 'babylonie', 'oeuvres', 'evenements', 'eres'];
    // Les groupes de la chaîne de transmission et l'époque qui les contient.
    var GROUP_ERA = { sinai: 'moise_ere', zougot: 'zougot_ere', tannaim: 'tannaim_ere', amoraim_israel: 'amoraim_ere', amoraim_babylonie: 'amoraim_ere',
        gueonim: 'geonim_ere', richonim: 'richonim_ere', aharonim: 'acharonim_ere', hassidout: 'acharonim_ere' };
    function ce(year) { return year + 3760; }
    function lanePos(x) { var i = LANE_PRIORITY.indexOf(x.voie); return i === -1 ? 99 : i; }
    function forGen(model, id) {
        var hits = model.items.filter(function (x) { return x.gen === id; }).sort(function (a, b) { return lanePos(a) - lanePos(b) || a.from - b.from; });
        return hits.length ? { item: hits[0] } : null;
    }
    function yearOf(text) { var m = /(\d{4})/.exec(String(text || '')); return m ? parseInt(m[1], 10) : null; }
    // `sage` : un maître de js/transmissionCore.js.
    function forSage(model, sage) {
        var hit = model.items.filter(function (x) { return x.sage && [].concat(x.sage).indexOf(sage.id) !== -1; })[0];
        if (hit) return { item: hit };
        var born = sage.born, died = sage.died;
        if (sage.hass) { born = yearOf(sage.naissance); died = yearOf(sage.deces); }
        if (born && died) return { from: ce(born), to: ce(died), label: sage.fr };
        if (born) return { from: ce(born), to: ce(born), label: sage.fr };
        var era = model.byId[GROUP_ERA[sage.grp]];
        return era ? { item: era } : null;
    }
    // Un livre du Tanakh : l'époque qu'il raconte (un élément de la frise, ou une période en années de la création).
    function forBook(model, bookId, label) {
        var b = model.livres[bookId];
        if (!b) return null;
        if (b.item) return model.byId[b.item] ? { item: model.byId[b.item] } : null;
        return { from: b.from, to: b.to, label: label || bookId };
    }
    // Une fête du Calendrier : l'événement qu'elle rappelle.
    function forFeast(model, feastId) {
        var id = model.fetes[feastId];
        return id && model.byId[id] ? { item: model.byId[id] } : null;
    }
    // `from`, `to` : des années de l'ère commune (une œuvre).
    function forYears(label, from, to) {
        if (!from) return null;
        return { from: ce(from), to: ce(to || from), label: label };
    }

    // Les graduations de la règle, en années depuis la création : une toutes les `step` années (10 par défaut). En mode 'am', les multiples de `step` ;
    // en mode 'civil', les années civiles rondes (−460, −450…), converties en années de la création.
    function ticks(plage, step, mode) {
        var s = step || 10, out = [], y;
        if (mode === 'civil') {
            for (var c = Math.ceil(civilYear(plage[0]) / s) * s; ; c += s) {
                if (c === 0) continue;                                   // pas d'année zéro
                y = c < 0 ? CREATION_OFFSET + c : c + CREATION_OFFSET - 1;
                if (y > plage[1]) break;
                if (y >= plage[0]) out.push(y);
            }
            return out;
        }
        for (y = Math.ceil(plage[0] / s) * s; y <= plage[1]; y += s) out.push(y);
        return out;
    }

    return {
        CREATION_OFFSET: CREATION_OFFSET, civilYear: civilYear, civilLabel: civilLabel, amLabel: amLabel, yearLabel: yearLabel, dating: dating, duration: duration,
        durationLabel: durationLabel, build: build, clip: clip, layout: layout, search: search, contemporains: contemporains, forGen: forGen, forSage: forSage, forBook: forBook, forFeast: forFeast, forYears: forYears, ce: ce, GROUP_ERA: GROUP_ERA, ticks: ticks, norm: norm
    };
}));
