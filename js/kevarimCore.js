// =========================================================================
// === LES TOMBEAUX (KEVARIM) DES GRANDS MAÎTRES (DONNÉES ET RÈGLES, outil de la boîte à outils) ===
// =========================================================================
// Les 179 hilloulot majeures du judaïsme orthodoxe (de la Bible à nos jours, tous rites, tous pays) avec leur tombeau, placées sur un planisphère.
// Pur, sans DOM : testé dans tests/kevarimCore.test.js. Les données viennent de data/kevarim/kevarim.json (généré par scripts/build_kevarim.py
// d'après le fichier de Ruben, scripts/sources/hiloulot-majeures.xlsx).
//
// Une entrée : { id, he, fr, dateText (la date du décès telle que donnée), hilloula ({ month, day, kind, year, gregYear } ou null : pas de jour et de mois
//   précis, donc pas de hilloula à célébrer), hilId (la même personne dans data/hilloulot/hilloulot.json, dont les dates sont vérifiées, ou null),
//   authorId (le maître dans la chaîne de transmission, ce qui relie la fiche à la bibliothèque, ou null),
//   place ({ key, name, lat, lon, precision } ou null : plusieurs lieux possibles, lieu vague ou inconnu), tombText (le tombeau, tel que donné),
//   status ('documente' | 'tradition' | 'conteste' | 'inconnu'), statusText, bio, groupText, era, rite, born, works }.
// `precision` : 'site' (le lieu même), 'ville' (le centre de la ville) ou 'region' (une zone) : les points sont APPROXIMATIFS, jamais l'emplacement d'une tombe.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.KevarimCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Du plus sûr au moins sûr : c'est l'ordre des filtres et celui qui décide de la couleur d'un point où plusieurs maîtres reposent (Hébron : six).
    var STATUSES = [
        { id: 'documente', fr: 'Documenté', color: '#2f7d4f' },
        { id: 'tradition', fr: 'Tradition', color: '#c07a14' },
        { id: 'conteste', fr: 'Contesté', color: '#b3402f' },
        { id: 'inconnu', fr: 'Tombe inconnue ou perdue', color: '#6d7480' }
    ];
    var ERAS = [
        { id: 'biblique', fr: 'Bible' },
        { id: 'talmud', fr: 'Michna et Talmud' },
        { id: 'gueonim', fr: 'Guéonim' },
        { id: 'richonim', fr: 'Richonim' },
        { id: 'aharonim', fr: '’Aharonim et époque moderne' }
    ];
    var RITES = [
        { id: 'sefarade', fr: 'Séfarade et Orient' },
        { id: 'ashkenaze', fr: 'Ashkénaze' },
        { id: 'hassidout', fr: 'Hassidout' }
    ];
    var PRECISIONS = { site: 'le lieu même', ville: 'le centre de la ville', region: 'une zone approximative' };
    // Les mois de data/…json (ceux de js/hebrewCalendarCore.js) en français.
    var MONTH_FR = {
        Nisan: 'Nissan', Iyar: 'Iyar', Sivan: 'Sivan', Tamuz: 'Tamouz', Av: 'Av', Elul: 'Elloul', Tishri: 'Tichri', Heshvan: '’Hechvan',
        Kislev: 'Kislev', Tevet: 'Tévet', Shevat: 'Chevat', Adar: 'Adar', AdarI: 'Adar I', AdarII: 'Adar II'
    };

    function statusOf(id) { return STATUSES.filter(function (s) { return s.id === id; })[0] || null; }
    function statusRank(id) { for (var i = 0; i < STATUSES.length; i++) if (STATUSES[i].id === id) return i; return STATUSES.length; }

    // Pour la recherche : sans accents, sans nikkud (points-voyelles hébreux), sans majuscules ni ponctuation.
    function normalize(text) {
        return String(text == null ? '' : text).toLowerCase()
            .replace(/[֑-ׇ]/g, '')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[’'`´]/g, '')
            .replace(/[^a-z0-9א-ת]+/g, ' ').trim();
    }

    function byId(entries, id) {
        for (var i = 0; i < entries.length; i++) if (entries[i].id === id) return entries[i];
        return null;
    }

    // Le maître de la chaîne de transmission (ou son premier tombeau placé sur la carte, de préférence) : pour le lien depuis la bibliothèque.
    function forAuthor(entries, authorId) {
        if (!authorId) return null;
        var mine = entries.filter(function (e) { return e.authorId === authorId; });
        return mine.filter(function (e) { return e.place; })[0] || mine[0] || null;
    }

    // « 20 Tévet » ; '' quand l'entrée n'a pas de hilloula.
    function hilloulaLabel(entry) {
        var h = entry && entry.hilloula;
        if (!h) return '';
        return h.day + ' ' + (MONTH_FR[h.month] || h.month);
    }

    // Les filtres : { status, era, rite, query, mappedOnly } ; 'all' ou absent = pas de filtre.
    function filter(entries, f) {
        var o = f || {};
        var q = normalize(o.query).split(' ').filter(Boolean);
        return entries.filter(function (e) {
            if (o.status && o.status !== 'all' && e.status !== o.status) return false;
            if (o.era && o.era !== 'all' && e.era !== o.era) return false;
            if (o.rite && o.rite !== 'all' && e.rite !== o.rite) return false;
            if (o.mappedOnly && !e.place) return false;
            if (!q.length) return true;
            var hay = normalize([e.fr, e.he, e.bio, e.tombText, e.groupText, e.born, e.works, e.dateText].join(' '));
            return q.every(function (w) { return hay.indexOf(w) >= 0; });
        });
    }

    function count(entries, key) {
        var out = {};
        entries.forEach(function (e) { out[e[key]] = (out[e[key]] || 0) + 1; });
        return out;
    }

    // Les entrées placées, regroupées par point : [{ key, name, lat, lon, precision, entries, status }]. `status` : le plus sûr des statuts du point.
    function groups(entries) {
        var by = {}, out = [];
        entries.forEach(function (e) {
            if (!e.place) return;
            var g = by[e.place.key];
            if (!g) {
                g = by[e.place.key] = { key: e.place.key, name: e.place.name, lat: e.place.lat, lon: e.place.lon, precision: e.place.precision, entries: [], status: e.status };
                out.push(g);
            }
            g.entries.push(e);
            if (statusRank(e.status) < statusRank(g.status)) g.status = e.status;
        });
        return out;
    }

    // Les points en GeoJSON pour MapLibre : la couleur et la taille sont des propriétés du point.
    function geojson(entries) {
        return {
            type: 'FeatureCollection',
            features: groups(entries).map(function (g) {
                return {
                    type: 'Feature',
                    properties: { key: g.key, name: g.name, n: g.entries.length, status: g.status, color: statusOf(g.status).color },
                    geometry: { type: 'Point', coordinates: [g.lon, g.lat] }
                };
            })
        };
    }

    // Les entrées qui ont une hilloula et ne sont pas déjà dans data/hilloulot/hilloulot.json, au format de ce fichier (pour ZmanimCore.hilloulotFor
    // et les listes de l'accueil et des widgets) : { id, fr, he, month, day, kind, year, gregYear, bio }.
    function hilloulot(entries) {
        return entries.filter(function (e) { return e.hilloula && !e.hilId; }).map(function (e) {
            var h = e.hilloula;
            return { id: 'kev-' + e.id, fr: e.fr, he: e.he, month: h.month, day: h.day, kind: h.kind || 'tradition', year: h.year || null, gregYear: h.gregYear || null, bio: e.bio };
        });
    }

    // Les points sont des repères (centre de ville, zone) : jamais une adresse. Le texte d'avertissement de la fiche.
    function precisionLabel(place) { return place && PRECISIONS[place.precision] ? PRECISIONS[place.precision] : ''; }

    return {
        STATUSES: STATUSES, ERAS: ERAS, RITES: RITES, PRECISIONS: PRECISIONS, MONTH_FR: MONTH_FR,
        statusOf: statusOf, statusRank: statusRank, normalize: normalize, byId: byId, forAuthor: forAuthor, hilloulaLabel: hilloulaLabel,
        filter: filter, count: count, groups: groups, geojson: geojson, hilloulot: hilloulot, precisionLabel: precisionLabel
    };
}));
