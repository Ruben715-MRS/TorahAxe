// =========================================================================
// === TORAHAXE — LA ROUE DES FÊTES (un seul calendrier, le calendrier juif) ===
// =========================================================================
// Même moteur qu'HistoriAxe (js/calendarWheel.js, pur, testé), avec son tableau CALENDARS réduit au
// seul calendrier juif : TorahAxe n'a pas les 37 autres calendriers (religieux et civils) du monde,
// hors sujet pour une app pleinement juive. Les fonctions (byKind, find, deal, shuffle...) sont
// identiques, donc inchangées : elles continuent de fonctionner sur un tableau d'un seul élément.
// =========================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.CalendarWheel = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var CIVIL_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    var CALENDARS = [

{
            id: 'juif',
            title: 'Calendrier juif',
            short: 'Judaïsme',
            icon: '✡️',
            kind: 'religieux',
            intro: "Un calendrier luni-solaire : les mois suivent la Lune, et un mois en plus (un second Adar) est ajouté sept fois en dix-neuf ans pour rester en phase avec les saisons. La roue part de Tichri, le mois du Nouvel An ; la Torah, elle, appelle Nissan « le premier des mois ».",
            months: ['Tichri', 'Hechvan', 'Kislev', 'Tevet', 'Chevat', 'Adar', 'Nissan', 'Iyar', 'Sivan', 'Tamouz', 'Av', 'Elloul'],
            events: [
                { id: 'rochhachana', name: 'Roch Hachana', icon: '🍎', months: [1], when: '1er et 2 Tichri', explain: "Le Nouvel An juif : on sonne du shofar et on mange une pomme trempée dans du miel pour souhaiter une douce année. Les années se comptent depuis la création du monde, placée par la tradition vers 3761 av. J.-C." },
                { id: 'yomkippour', name: 'Yom Kippour', icon: '🕊️', months: [1], when: '10 Tichri', explain: "Le Grand Pardon, dix jours après Roch Hachana : jeûne complet et prière pendant environ vingt-cinq heures." },
                { id: 'souccot', name: 'Souccot', icon: '🌿', months: [1], when: '15 Tichri', explain: "La fête des Cabanes : pendant une semaine, on mange (et parfois on dort) dans une souccah, une cabane au toit de feuillage, en souvenir de la traversée du désert." },
                { id: 'simhattorah', name: "Sim'hat Torah", icon: '📜', months: [1], when: '22 ou 23 Tichri', explain: "La « joie de la Torah » : on termine la lecture annuelle du Pentateuque et on la recommence aussitôt." },
                { id: 'hanoucca', name: 'Hanoucca', icon: '🕎', months: [3], when: '25 Kislev', explain: "La fête des lumières : huit soirs, on allume une bougie de plus. Elle rappelle la purification du Temple de Jérusalem après la révolte des Maccabées (164 av. J.-C.)." },
                { id: 'jeune10tevet', name: 'Jeûne du 10 Tevet', icon: '⏳', months: [4], when: '10 Tevet', explain: "Un jeûne qui rappelle le début du siège de Jérusalem par Nabuchodonosor, vers 588 av. J.-C." },
                { id: 'toubichvat', name: 'Tou Bichvat', icon: '🌳', months: [5], when: '15 Chevat', explain: "Le Nouvel An des arbres : on mange des fruits (surtout ceux de la Terre d'Israël) et on plante des arbres." },
                { id: 'pourim', name: 'Pourim', icon: '🎭', months: [6], when: '14 Adar', explain: "On lit le livre d'Esther : la reine sauve les Juifs de Perse du ministre Haman. Déguisements, cadeaux et gâteaux (les « oreilles d'Haman »)." },
                { id: 'pessah', name: 'Pessah', icon: '🫓', months: [7], when: '15 Nissan', explain: "La Pâque : la sortie d'Égypte. Pendant une semaine on ne mange que du pain sans levain (la matza) ; le premier soir, on fait le séder." },
                { id: 'yomhashoah', name: 'Yom Hashoah', icon: '🕯️', months: [7], when: '27 Nissan', explain: "Le jour du souvenir de la Shoah : en Israël, des sirènes retentissent et le pays s'arrête deux minutes." },
                { id: 'yomhaatsmaout', name: "Yom Haatsmaout", icon: '🇮🇱', months: [8], when: '5 Iyar', explain: "La fête de l'indépendance d'Israël : le 14 mai 1948, David Ben Gourion proclame l'État, soit le 5 Iyar 5708." },
                { id: 'lagbaomer', name: "Lag Baomer", icon: '🔥', months: [8], when: '18 Iyar', explain: "Le 33e jour du compte du Omer, entre Pessah et Chavouot : feux de joie, pique-niques et mariages, car la période de semi-deuil est levée." },
                { id: 'chavouot', name: 'Chavouot', icon: '📖', months: [9], when: '6 Sivan', explain: "La fête des Semaines, cinquante jours après Pessah : le don de la Torah au Sinaï. On mange des produits laitiers et on étudie toute la nuit." },
                { id: 'jeune17tamouz', name: 'Jeûne du 17 Tamouz', icon: '🧱', months: [10], when: '17 Tamouz', explain: "Ce jour-là, les murailles de Jérusalem sont percées : il ouvre trois semaines de deuil qui mènent à Tisha Beav." },
                { id: 'tishabeav', name: "Tisha Beav", icon: '🏚️', months: [11], when: '9 Av', explain: "Un jeûne en mémoire de la destruction des deux Temples de Jérusalem, en 586 av. J.-C. puis en 70 apr. J.-C." },
                { id: 'toubeav', name: 'Tou Beav', icon: '💞', months: [11], when: '15 Av', explain: "Six jours après le deuil de Tisha Beav, une fête de l'amour : dans l'Antiquité, c'est un jour où l'on se mariait." }
            ]
        }
    ];

    // 3 étoiles au maximum, comme au Chemin. Une erreur = une fête posée dans un mauvais mois : la fête revient
    // dans la liste, et la bonne réponse n'est jamais donnée.
    var MAX_STARS = 3;
    var STAR_ERRORS = [1, 4];

    var KINDS = ['religieux', 'civil'];

    // Les calendriers d'une famille, par ordre alphabétique du nom affiché (« Égypte » se range à E).
    function byKind(kind) {
        return CALENDARS.filter(function (c) { return c.kind === kind; })
            .sort(function (a, b) { return a.short.localeCompare(b.short, 'fr'); });
    }

    function find(id) {
        for (var i = 0; i < CALENDARS.length; i++) if (CALENDARS[i].id === id) return CALENDARS[i];
        return null;
    }

    function findEvent(calendar, eventId) {
        for (var i = 0; i < calendar.events.length; i++) if (calendar.events[i].id === eventId) return calendar.events[i];
        return null;
    }

    // `month` : numéro du mois de la part (1 à 12).
    function accepts(event, month) {
        return event.months.indexOf(month) !== -1;
    }

    // 3 étoiles jusqu'à 1 erreur, 2 jusqu'à 4, 1 ensuite (toute roue terminée en donne au moins une).
    function starsFor(errors) {
        return errors <= STAR_ERRORS[0] ? 3 : errors <= STAR_ERRORS[1] ? 2 : 1;
    }

    // Mélange de Fisher-Yates ; `rng` (0 ≤ x < 1) est injectable pour les tests. Ne modifie pas `list`.
    function shuffle(list, rng) {
        var random = rng || Math.random;
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
        return out;
    }

    // Le tirage d'une partie : l'ordre des fêtes dans la liste du bas. On évite qu'il soit celui du calendrier
    // (ce serait donner la réponse) : si le hasard le rend identique, on décale d'un cran.
    function deal(calendar, rng) {
        var ids = calendar.events.map(function (e) { return e.id; });
        var out = shuffle(ids, rng);
        var sorted = ids.every(function (id, i) { return out[i] === id; });
        if (sorted && out.length > 1) out.push(out.shift());
        return out;
    }

    // Progression : { <calendrier>: { stars, errors } }, le meilleur résultat de chaque roue terminée.
    function normalizeProgress(raw) {
        var out = {};
        if (raw && typeof raw === 'object') {
            CALENDARS.forEach(function (c) {
                var e = raw[c.id];
                if (e && typeof e === 'object' && e.stars >= 1) {
                    out[c.id] = { stars: Math.min(MAX_STARS, Math.floor(e.stars)), errors: Math.max(0, Math.floor(e.errors) || 0) };
                }
            });
        }
        return out;
    }

    // Garde le meilleur : plus d'étoiles, à égalité moins d'erreurs.
    function recordResult(progress, calendarId, errors) {
        var next = normalizeProgress(progress);
        var stars = starsFor(errors);
        var old = next[calendarId];
        if (!old || stars > old.stars || (stars === old.stars && errors < old.errors)) {
            next[calendarId] = { stars: stars, errors: errors };
        }
        return next;
    }

    // Un seul calendrier dans TorahAxe : toujours lui, pas de notion de profil.
    function defaultCalendarId() {
        return 'juif';
    }

    return {
        CALENDARS: CALENDARS, KINDS: KINDS, MAX_STARS: MAX_STARS, byKind: byKind, defaultCalendarId: defaultCalendarId,
        find: find, findEvent: findEvent, accepts: accepts, starsFor: starsFor,
        shuffle: shuffle, deal: deal, normalizeProgress: normalizeProgress, recordResult: recordResult
    };
}));
