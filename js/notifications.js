// =========================================================================
// === RAPPELS (NOTIFICATIONS LOCALES DE L'IPHONE) ===
// =========================================================================
// Programme les rappels choisis dans Zmanim › Réglages › Rappels (bougies, Omer, Roch 'Hodesh, Birkat haLévana, horaires personnalisés).
// Le calcul est dans js/zmanimReminderCore.js (pur) ; ici, seulement le dialogue avec le plugin Capacitor @capacitor/local-notifications.
// Tout se passe SUR L'APPAREIL : rien n'est envoyé nulle part. Hors de l'app iPhone (navigateur), il n'y a pas de plugin : rien n'est programmé,
// et l'écran des réglages le dit.
// iOS garde au plus 64 notifications en attente : on n'en programme que les plus proches (7 jours, 40 au plus) et l'on recalcule à chaque
// ouverture de l'app, à chaque retour au premier plan et après chaque changement de réglage, de lieu ou d'opinion.
// Les identifiants de nos notifications sont dans une plage réservée (ID_BASE…), pour n'annuler que les nôtres.
// Testé dans tests/notifications.test.js (plugin simulé).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = { create: factory };
    else root.TorahAxeNotifications = factory({
        plugin: function () {
            var c = root.Capacitor;
            return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.LocalNotifications ? c.Plugins.LocalNotifications : null;
        },
        core: function () { return root.ZmanimReminderCore; },
        settings: function () { try { return JSON.parse(root.localStorage.getItem('zmanimReminders') || 'null'); } catch (e) { return null; } },
        place: function () { try { return root.ZmanimCore.normalizePlace(JSON.parse(root.localStorage.getItem('zmanimPlace') || 'null')); } catch (e) { return null; } },
        opts: function () { return typeof root.zmStoredOpts === 'function' ? root.zmStoredOpts() : {}; },
        // Israël ou diaspora d'après le domicile choisi (js/app/first-profile.js) ; undefined : le lieu décide.
        israel: function () { try { var d = root.localStorage.getItem('torahaxe_domicile_v1'); return d === 'israel' ? true : d === 'diaspora' ? false : undefined; } catch (e) { return undefined; } },
        // Les dates personnelles (Hazkara, anniversaires : js/personalDatesCore.js) : leur registre, le rite choisi (qui règle l'Adar). Facultatif : sans elles, rien de plus n'est programmé.
        datesCore: function () { return root.PersonalDatesCore; },
        dates: function () { try { return JSON.parse(root.localStorage.getItem('torahaxe_dates_v1') || 'null'); } catch (e) { return null; } },
        rite: function () { try { return root.localStorage.getItem('torahaxe_rite_v1') === 'ashkenaze' ? 'ashkenaze' : 'sefarade'; } catch (e) { return 'sefarade'; } },
        tr: function (key, params) { return t(key, params); },   // t : constante globale de js/i18n.js (pas une propriété de window)
        now: function () { return Date.now(); },
        locale: 'fr'
    });
}(typeof self !== 'undefined' ? self : this, function (deps) {
    'use strict';

    var ID_BASE = 7340000;       // la plage réservée : ID_BASE … ID_BASE + 999
    var ID_SPAN = 1000;
    var HORIZON_DAYS = 7;
    var chain = Promise.resolve();   // les programmations se suivent : jamais deux à la fois

    function isSupported() { return !!deps.plugin(); }

    // « granted » | « denied » | « prompt » | « unsupported »
    function permission() {
        var p = deps.plugin();
        if (!p) return Promise.resolve('unsupported');
        return p.checkPermissions().then(function (r) { return r.display; }).catch(function () { return 'denied'; });
    }

    // Demande l'autorisation (la fenêtre du système n'apparaît qu'une fois), puis programme. Vrai si les rappels sont autorisés.
    function enableZmanim() {
        var p = deps.plugin();
        if (!p) return Promise.resolve(false);
        return p.requestPermissions().then(function (r) {
            var ok = r.display === 'granted';
            return ok ? scheduleZmanim().then(function () { return true; }) : false;
        }).catch(function () { return false; });
    }

    function pendingOurs(p) {
        return p.getPending().then(function (r) {
            return (r.notifications || []).filter(function (n) { return n.id >= ID_BASE && n.id < ID_BASE + ID_SPAN; }).map(function (n) { return { id: n.id }; });
        });
    }

    function run() {
        var p = deps.plugin();
        var core = deps.core();
        if (!p || !core) return Promise.resolve(0);
        var settings = core.normalize(deps.settings());
        var place = deps.place();
        var zmanimItems = core.anyEnabled(settings) && place ? core.plan(settings, place, deps.opts(), deps.now(), HORIZON_DAYS, deps.israel ? deps.israel() : undefined) : [];
        // Les rappels des dates personnelles ne dépendent pas du réglage des Zmanim : ils ont leur choix par date. Ils ont besoin du lieu (lever du soleil, coucher, sortie des étoiles).
        var dates = deps.datesCore ? deps.datesCore() : null;
        var rite = deps.rite ? deps.rite() : 'sefarade';
        var personalItems = dates && place && deps.dates ? dates.plan(deps.dates(), place, deps.opts(), deps.now(), HORIZON_DAYS, rite) : [];
        var items = zmanimItems.concat(personalItems).sort(function (a, b) { return a.at - b.at; }).slice(0, core.MAX_PENDING);
        var term = deps.tr(rite === 'ashkenaze' ? 'dates.term_yahrzeit' : 'dates.term_hazkara');
        return pendingOurs(p).then(function (old) {
            return old.length ? p.cancel({ notifications: old }) : null;
        }).then(function () {
            if (!items.length) return 0;
            return permission().then(function (state) {
                if (state !== 'granted') return 0;
                var list = items.map(function (item, i) {
                    var text = item.kind === 'personal' ? dates.describe(item, deps.tr, term) : core.describe(item, deps.tr, place, deps.locale);
                    var n = { id: ID_BASE + i, title: text.title, body: text.body, schedule: { at: new Date(item.at), allowWhileIdle: true } };
                    // Ce qu'on ouvre en touchant la notification (voir onOpen)
                    if (item.kind === 'omer') n.extra = { route: 'omer', mode: item.when === 'morning' ? 'morning' : 'evening', day: item.day };
                    else if (item.kind === 'hanouka') n.extra = { route: 'hanouka', night: item.night, friday: !!item.friday };
                    else if (item.kind === 'personal') n.extra = { route: 'dates' };
                    return n;
                });
                return p.schedule({ notifications: list }).then(function () { return list.length; });
            });
        });
    }

    // Annule les anciens rappels et programme les prochains. Renvoie le nombre de rappels programmés (0 hors de l'app, sans autorisation ou sans rappel choisi).
    function scheduleZmanim() {
        chain = chain.then(run, run).catch(function () { return 0; });
        return chain;
    }

    // Quand on touche une de nos notifications : handler(extra) avec { route: 'omer', mode, day }, { route: 'hanouka', night, friday } ou { route: 'dates' }. Sans plugin : rien.
    function onOpen(handler) {
        var p = deps.plugin();
        if (!p || typeof p.addListener !== 'function') return false;
        try {
            p.addListener('localNotificationActionPerformed', function (ev) {
                var n = ev && ev.notification;
                if (n && n.extra && n.extra.route) handler(n.extra);
            });
        } catch (e) { return false; }
        return true;
    }

    // Un rappel d'essai dans quelques secondes, pour vérifier que les notifications arrivent bien.
    function sendTest(seconds) {
        var p = deps.plugin();
        if (!p) return Promise.resolve(false);
        return p.requestPermissions().then(function (r) {
            if (r.display !== 'granted') return false;
            return p.schedule({ notifications: [{ id: ID_BASE + ID_SPAN - 1, title: 'TorahAxe', body: deps.tr('tools.zm_rem_test_body'), schedule: { at: new Date(deps.now() + (seconds || 5) * 1000) } }] }).then(function () { return true; });
        }).catch(function () { return false; });
    }

    return { ID_BASE: ID_BASE, isSupported: isSupported, permission: permission, enableZmanim: enableZmanim, scheduleZmanim: scheduleZmanim, onOpen: onOpen, sendTest: sendTest };
}));
