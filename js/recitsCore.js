// =========================================================================
// === TORAHAXE — RÉCITS : LE FORMAT D'UN RÉCIT ET SES RÈGLES (PUR) ===
// =========================================================================
// Un récit est un long article d'histoire (25 à 35 minutes de lecture), découpé en chapitres, avec des cartes, des encadrés
// et des mots soulignés qui ouvrent une fiche. Les fichiers sont dans assets/recits/ (catalogue : index.json ; un récit :
// <id>.json). La charte d'écriture est dans docs/recits-charte.md. Ce module n'a aucune dépendance au DOM : il est testé hors
// navigateur (tests/recitsCore.test.js), et ce test vérifie aussi chaque récit publié.
//
// Un récit : { id, titre, sousTitre, auteur, niveau, chapitres: [{ titre, blocs: [...] }], fiches: { <id>: { titre, texte,
//   image?, legende? } }, evenements: [<identifiants d'événements de data/fr.json, pour le quiz de fin>], themes: [<id de thème>],
//   sources: [<texte>] }.
// Un bloc : { type: 'p', texte } | { type: 'h', texte } (intertitre) | { type: 'figure', src, legende, credit } |
//   { type: 'encadre', titre, texte } (texte : des paragraphes séparés par une ligne vide) | { type: 'citation', texte, source } |
//   { type: 'frise', items: [{ date, texte }] }.
// Dans les textes : *italique*, et [[mot affiché|fiche:<id>]] (une fiche du récit) ou [[mot affiché|evt:<id>]] (la fiche d'un
// événement de l'app, avec son portrait éventuel).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RecitsCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Vitesse de lecture retenue pour annoncer la durée : un lecteur attentif d'un texte d'histoire, pas un lecteur pressé.
    var WORDS_PER_MINUTE = 230;
    var BLOCK_TYPES = ['p', 'h', 'figure', 'encadre', 'citation', 'frise'];
    var LINK_KINDS = ['fiche', 'evt'];
    var NIVEAUX = ['decouverte', 'moyen', 'avance'];

    var LINK_RE = /\[\[([^\]|]+)\|([a-z]+):([A-Za-z0-9_\-]+)\]\]/g;

    // Découpe un texte en morceaux : { t: 'text', v } | { t: 'em', v } | { t: 'link', v, kind, id }. L'italique ne traverse
    // pas un lien, et un lien n'est pas en italique : c'est assez pour un récit, et l'affichage reste simple (textContent).
    function parseInline(text) {
        var out = [];
        var s = String(text == null ? '' : text);
        var last = 0;
        var m;
        LINK_RE.lastIndex = 0;
        while ((m = LINK_RE.exec(s)) !== null) {
            pushEmphasis(out, s.slice(last, m.index));
            out.push({ t: 'link', v: m[1], kind: m[2], id: m[3] });
            last = LINK_RE.lastIndex;
        }
        pushEmphasis(out, s.slice(last));
        return out;
    }

    function pushEmphasis(out, s) {
        if (!s) return;
        var parts = s.split('*');
        // Un nombre pair de morceaux : une étoile orpheline. On la garde telle quelle plutôt que de mettre la fin en italique.
        if (parts.length % 2 === 0) { out.push({ t: 'text', v: s }); return; }
        parts.forEach(function (p, i) {
            if (!p) return;
            out.push({ t: i % 2 ? 'em' : 'text', v: p });
        });
    }

    // Le texte lisible d'un passage, sans balisage.
    function plainText(text) {
        return parseInline(text).map(function (x) { return x.v; }).join('');
    }

    function countWords(text) {
        var words = plainText(text).split(/[\s  ]+/).filter(function (w) { return /[0-9A-Za-zÀ-ÿ]/.test(w); });
        return words.length;
    }

    // Tous les textes lus d'un bloc (pour compter les mots et chercher les liens).
    function blockTexts(b) {
        if (!b) return [];
        if (b.type === 'p' || b.type === 'h') return [b.texte];
        if (b.type === 'figure') return [b.legende];
        if (b.type === 'encadre') return [b.titre, b.texte];
        if (b.type === 'citation') return [b.texte, b.source];
        if (b.type === 'frise') return (b.items || []).map(function (it) { return it.texte; });
        return [];
    }

    function chapterWords(ch) {
        var n = countWords(ch.titre);
        (ch.blocs || []).forEach(function (b) { blockTexts(b).forEach(function (t) { n += countWords(t); }); });
        return n;
    }

    function wordCount(recit) {
        return (recit.chapitres || []).reduce(function (n, ch) { return n + chapterWords(ch); }, 0);
    }

    // La hauteur estimée d'un chapitre affiché (en pixels, sur un téléphone de 390 px de large, texte à la taille normale) : sert au défilement automatique
    // « finir en X minutes » à prévoir ce qu'il reste à parcourir dans les chapitres pas encore affichés. Les coefficients viennent d'un ajustement aux
    // hauteurs réellement mesurées de 71 chapitres (10 récits) : une base par chapitre, 3,9 px par mot, 263 px par figure, et deux corrections : le chapitre
    // d'ouverture n'a pas de base (son en-tête la compense) et le dernier ajoute le bloc de fin (la suite du récit, le quiz). Erreur moyenne : 4 à 6 %
    // sur ce qu'il reste à parcourir ; test e2e/prompteur.spec.js, qui la remesure. À refaire si la mise en page des récits change.
    var PX_BASE = 325, PX_PER_WORD = 3.9, PX_PER_FIGURE = 263, PX_OPENING = -334, PX_ENDING = 584;
    function chapterPxEstimate(recit, index) {
        var chapters = (recit && recit.chapitres) || [];
        var ch = chapters[index];
        if (!ch) return 0;
        var figures = (ch.blocs || []).filter(function (b) { return b.type === 'figure'; }).length;
        return PX_BASE + (index === 0 ? PX_OPENING : 0) + (index === chapters.length - 1 ? PX_ENDING : 0) + PX_PER_WORD * chapterWords(ch) + PX_PER_FIGURE * figures;
    }

    // La durée annoncée : un intervalle de dix minutes autour du temps de lecture, arrondi à 5 minutes (« 25-35 min »).
    function readingMinutes(recit) {
        return Math.max(1, Math.round(wordCount(recit) / WORDS_PER_MINUTE));
    }
    function readingRange(recit) {
        var m = readingMinutes(recit);
        var mid = Math.max(10, Math.round(m / 5) * 5);
        return [mid - 5, mid + 5];
    }

    // Tous les liens d'un récit : [{ kind, id, chapitre }].
    function links(recit) {
        var out = [];
        (recit.chapitres || []).forEach(function (ch, ci) {
            (ch.blocs || []).forEach(function (b) {
                blockTexts(b).forEach(function (t) {
                    parseInline(t).forEach(function (x) { if (x.t === 'link') out.push({ kind: x.kind, id: x.id, chapitre: ci }); });
                });
            });
        });
        return out;
    }

    // Les erreurs de forme d'un récit (liste vide : il est publiable). `knownEvents` (facultatif) : l'ensemble des
    // identifiants d'événements de l'app, pour vérifier les liens evt: et le quiz.
    function validate(recit, knownEvents) {
        var errors = [];
        if (!recit || typeof recit !== 'object') return ['pas un objet'];
        ['id', 'titre', 'sousTitre', 'auteur'].forEach(function (k) {
            if (typeof recit[k] !== 'string' || !recit[k].trim()) errors.push('champ manquant : ' + k);
        });
        if (NIVEAUX.indexOf(recit.niveau) < 0) errors.push('niveau inconnu : ' + recit.niveau);
        if (!Array.isArray(recit.chapitres) || recit.chapitres.length < 2) errors.push('il faut au moins deux chapitres');
        var fiches = recit.fiches || {};
        (recit.chapitres || []).forEach(function (ch, ci) {
            if (!ch.titre) errors.push('chapitre ' + ci + ' sans titre');
            if (!Array.isArray(ch.blocs) || !ch.blocs.length) errors.push('chapitre ' + ci + ' vide');
            (ch.blocs || []).forEach(function (b, bi) {
                var where = 'chapitre ' + ci + ', bloc ' + bi;
                if (BLOCK_TYPES.indexOf(b.type) < 0) { errors.push(where + ' : type inconnu ' + b.type); return; }
                if ((b.type === 'p' || b.type === 'h') && !b.texte) errors.push(where + ' : texte vide');
                if (b.type === 'figure' && (!b.src || !b.legende || !b.credit)) errors.push(where + ' : figure sans source, légende ou crédit');
                if (b.type === 'encadre' && (!b.titre || !b.texte)) errors.push(where + ' : encadré incomplet');
                if (b.type === 'citation' && (!b.texte || !b.source)) errors.push(where + ' : citation sans source');
                if (b.type === 'frise' && (!Array.isArray(b.items) || b.items.length < 2)) errors.push(where + ' : frise trop courte');
                blockTexts(b).forEach(function (t) {
                    var stars = (String(t || '').replace(LINK_RE, '').match(/\*/g) || []).length;
                    if (stars % 2) errors.push(where + ' : italique non fermé');
                });
            });
        });
        links(recit).forEach(function (l) {
            if (LINK_KINDS.indexOf(l.kind) < 0) errors.push('lien de sorte inconnue : ' + l.kind + ':' + l.id);
            else if (l.kind === 'fiche' && !fiches[l.id]) errors.push('fiche introuvable : ' + l.id);
            else if (l.kind === 'evt' && knownEvents && !knownEvents.has(l.id)) errors.push('événement introuvable : ' + l.id);
        });
        Object.keys(fiches).forEach(function (id) {
            var f = fiches[id];
            if (!f || !f.titre || !f.texte) errors.push('fiche incomplète : ' + id);
            if (f && f.image && !f.legende) errors.push('fiche ' + id + ' : image sans légende');
        });
        if (!Array.isArray(recit.evenements) || recit.evenements.length < 5) errors.push('il faut au moins cinq événements pour le quiz');
        else if (knownEvents) recit.evenements.forEach(function (id) { if (!knownEvents.has(id)) errors.push('événement du quiz introuvable : ' + id); });
        return errors;
    }

    // --- Progression de lecture -----------------------------------------------------------------------------------
    // L'état d'un récit, enregistré par l'app : { ch: chapitre ouvert, y: part du chapitre déjà lue (0 à 1), at: date (ms),
    // fini: date de la fin de lecture (ms) ou absent }.
    // La part lue du récit entier (0 à 1), chapitres pondérés par leur nombre de mots.
    function progress(recit, state) {
        if (!state) return 0;
        if (state.fini) return 1;
        var chs = recit.chapitres || [];
        if (!chs.length) return 0;
        var words = chs.map(chapterWords);
        var total = words.reduce(function (a, b) { return a + b; }, 0) || 1;
        var ch = Math.min(Math.max(0, state.ch | 0), chs.length - 1);
        var y = Math.min(Math.max(0, Number(state.y) || 0), 1);
        var done = 0;
        for (var i = 0; i < ch; i++) done += words[i];
        done += words[ch] * y;
        return Math.min(1, done / total);
    }

    // Le catalogue du plus récent au plus ancien : par date de publication, puis, le même jour, le dernier ajouté au
    // catalogue en premier.
    function byNewest(catalog) {
        return catalog.map(function (r, i) { return { r: r, i: i }; })
            .sort(function (a, b) { return String(b.r.publie).localeCompare(String(a.r.publie)) || b.i - a.i; })
            .map(function (x) { return x.r; });
    }

    // Le récit à mettre en avant sur l'accueil : celui qu'on a commencé le plus récemment sans le finir, sinon le plus récent
    // qu'on n'a pas lu, sinon le plus récent tout court. `catalog` : les entrées d'index.json (champ `publie`, AAAA-MM-JJ).
    function featured(catalog, states) {
        if (!Array.isArray(catalog) || !catalog.length) return null;
        states = states || {};
        var started = catalog.filter(function (r) { var s = states[r.id]; return s && !s.fini && s.at; })
            .sort(function (a, b) { return states[b.id].at - states[a.id].at; });
        if (started.length) return { recit: started[0], status: 'reprendre' };
        var byDate = byNewest(catalog);
        var unread = byDate.filter(function (r) { var s = states[r.id]; return !s || !s.fini; });
        if (unread.length) return { recit: unread[0], status: 'nouveau' };
        return { recit: byDate[0], status: 'relire' };
    }

    return {
        WORDS_PER_MINUTE: WORDS_PER_MINUTE, NIVEAUX: NIVEAUX,
        parseInline: parseInline, plainText: plainText, countWords: countWords,
        wordCount: wordCount, chapterWords: chapterWords, chapterPxEstimate: chapterPxEstimate, readingMinutes: readingMinutes, readingRange: readingRange,
        links: links, validate: validate, progress: progress, featured: featured, byNewest: byNewest
    };
}));
