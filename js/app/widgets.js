// =========================================================================
// === TORAHAXE — LES WIDGETS DE L'IPHONE (le lien entre l'app et le widget) ===
// =========================================================================
// Les widgets (ios/App/TorahAxeWidgets, en Swift) ne calculent rien : ils lisent un fichier que l'app prépare ici avec js/widgetDataCore.js,
// à l'ouverture, à chaque retour au premier plan, et quand le lieu ou une opinion des Zmanim change (zmWrite, js/app/zmanim.js). Le fichier
// est déposé par le plugin natif WidgetBridge (ios/App/App/WidgetBridgePlugin.swift) dans l'espace partagé de l'app et de ses widgets
// (App Group « group.com.torahaxe.app »), puis iOS redessine les widgets.
//
// Toucher un widget ouvre l'app sur un lien torahaxe://widget/<écran>. Le lien est reçu par l'app native (SceneDelegate), qui le garde et
// prévient la page (événement « axewidgetroute ») ; la page le reprend avec WidgetBridge.takeRoute(). Le même lien arrive aussi par le plugin
// App (appUrlOpen) : on prend le premier des deux, et l'écran ne s'ouvre qu'une fois.
// Écrans : today (l'accueil), zmanim, shabbat (les Zmanim, vue Chabbat), daf, tehilim, mishna, mitsva (l'étude du jour).
// Sur le web (PWA), il n'y a pas de widget : tout ce fichier est sans effet.

const WIDGET_DAYS = 30;
let widgetParashot = null;        // data/torah/parashot.json, chargé une fois
let widgetHaftarot = null;        // data/torah/haftarot.json, chargé une fois
let widgetTimer = null;
let widgetLastRoute = { route: null, at: 0 };

function widgetPlugin() {
    const c = window.Capacitor;
    return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.WidgetBridge ? c.Plugins.WidgetBridge : null;
}

function widgetFetchJson(url) {
    return fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
}

function widgetLoadData() {
    const jobs = [];
    if (!widgetParashot) jobs.push(widgetFetchJson('data/torah/parashot.json').then(d => { widgetParashot = d && d.parashot ? d.parashot : null; }));
    if (!widgetHaftarot) jobs.push(widgetFetchJson('data/torah/haftarot.json').then(d => { widgetHaftarot = d; }));
    return Promise.all(jobs);
}

function widgetReadPlace() {
    try { return ZmanimCore.normalizePlace(JSON.parse(localStorage.getItem('zmanimPlace') || 'null')); } catch (e) { return null; }
}

function widgetDeviceTz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
}

function widgetStudyOn(kind) {
    return typeof studyCardOn === 'function' ? studyCardOn(kind) : kind !== 'mitsva';
}

// La mitsva du jour d'un jour fixe : le premier commandement de la leçon (comme la carte de l'accueil), ou null.
function widgetMitsvaItems(fixed) {
    if (typeof MitsvaOfDayCore === 'undefined' || typeof CommandmentsCore === 'undefined') return null;
    const HC = HebrewCalendarCore;
    const m = MitsvaOfDayCore.of(fixed, { yearOf: f => HC.hebrewFromFixed(f).year, shevat16: y => HC.hebrewToGregorian(y, 'Shevat', 16).fixed },
        CommandmentsCore.list613('pos'), CommandmentsCore.list613('neg'));
    return m && m.items && m.items.length ? m.items : null;
}

function widgetMitsvaOf(fixed) {
    const items = widgetMitsvaItems(fixed);
    if (!items) return null;
    const c = items[0];
    const others = items.length - 1;
    const more = others > 0 ? ' · ' + (others === 1 ? t('study.mitsva_more_one') : t('study.mitsva_more_many', { n: others })) : '';
    return { text: c.text, sub: t(c.kind === 'pos' ? 'study.mitsva_pos' : 'study.mitsva_neg', { n: c.n }) + ' · ' + c.ref + more };
}

function widgetMishnaOf(fixed) {
    if (typeof MishnaYomiCore === 'undefined') return null;
    const my = MishnaYomiCore.forFixed(fixed);
    return my ? { text: MishnaYomiCore.label(my), sub: t('mishnayomi.card_sub_short', { n: my.daysLeft }) } : null;
}

// La haftara d'un Chabbat (rite séfarade quand il diffère), comme l'écran Zmanim.
function widgetHaftaraOf(civil, israel) {
    if (!widgetHaftarot || typeof HaftarotCore === 'undefined') return null;
    const date = new Date(civil.year, civil.month - 1, civil.day);
    const sab = HaftarotCore.sabbathInfo(TorahCore.parashaForDate(null, date, israel), widgetHaftarot, date);
    const refs = sab && sab.haftara ? (sab.haftara.s || sab.haftara.a) : null;
    return refs && refs.length ? HaftarotCore.refsLabel(refs) : null;
}

// Les données des widgets, avec les textes de l'interface (ui/fr.json).
function widgetBuild() {
    const HC = HebrewCalendarCore;
    const data = WidgetDataCore.build({
        place: widgetReadPlace(),
        opts: typeof zmStoredOpts === 'function' ? zmStoredOpts() : {},
        nowMs: Date.now(),
        days: WIDGET_DAYS,
        deviceTz: widgetDeviceTz(),
        parashot: widgetParashot,
        mishnaOf: widgetMishnaOf,
        mitsvaOf: widgetMitsvaOf,
        haftaraOf: widgetHaftaraOf,
        text: {
            month: (year, id) => t('tools.hcal_month_' + HC.monthLabelId(year, id)),
            feast: id => t('tools.hcal_f_' + id + '_name'),
            tachanun: { yes: t('tools.zm_tachanun'), morning: t('tools.zm_tachanun_morning'), no: t('tools.zm_no_tachanun') },
            dafSiyum: n => (n === 0 ? t('tools.zm_daf_siyum_today') : t('tools.zm_daf_siyum', { n: n })),
            tehilimDay: n => t('tools.zm_tehilim_day', { n: n })
        }
    });
    // Les cartes d'étude masquées dans Réglages › Cartes d'étude du jour le sont aussi dans le widget.
    data.studyCards = { daf: widgetStudyOn('daf'), tehilim: widgetStudyOn('tehilim'), mishna: widgetStudyOn('mishna'), mitsva: widgetStudyOn('mitsva') };
    return data;
}

// Recalcule et envoie les données aux widgets. Regroupe les appels rapprochés (plusieurs réglages changés d'affilée).
function widgetsRefresh() {
    if (!widgetPlugin()) return;
    clearTimeout(widgetTimer);
    widgetTimer = setTimeout(() => {
        widgetLoadData().then(() => {
            const plugin = widgetPlugin();
            if (!plugin) return;
            try {
                plugin.setData({ json: JSON.stringify(widgetBuild()) }).catch(() => { /* App Group absent : rien à faire */ });
            } catch (e) { /* un calcul impossible ne doit jamais gêner l'app */ }
        });
    }, 300);
}

// --- Les liens des widgets ------------------------------------------------------------------------------------------------------------------
function widgetRouteOf(url) {
    const m = /^torahaxe:\/\/widget\/([a-z]+)/.exec(String(url || ''));
    return m ? m[1] : null;
}

// Le jour de l'accueil (le lieu des Zmanim, sinon l'appareil) : celui des cartes d'étude.
function widgetToday() {
    return typeof homeDay === 'function' ? homeDay() : null;
}

const WIDGET_ROUTES = {
    zmanim: () => openTool('zmanim', 'screen-main'),
    shabbat: () => {
        openTool('zmanim', 'screen-main');
        if (typeof zmRender === 'function' && widgetReadPlace()) { zmView = 'shabbat'; zmRender(true); }
    },
    daf: () => {
        const day = widgetToday();
        const daf = day ? ZmanimCore.dafYomi(day.fixed) : null;
        const target = daf && typeof TalmudCore !== 'undefined' ? TalmudCore.dafYomiTarget(null, daf) : null;
        if (!target) return false;
        openTool('talmud', 'screen-main');
        talmudOpenAt(target.id, target.label);
    },
    tehilim: () => {
        const day = widgetToday();
        if (!day || typeof zmTehilimStart !== 'function') return false;
        toolReturns.tanakh = 'screen-main';
        tanakhOpenAt('psaumes', zmTehilimStart(day.ctx.hebrew) - 1, 'he');
    },
    mishna: () => {
        const day = widgetToday();
        const my = day && typeof MishnaYomiCore !== 'undefined' ? MishnaYomiCore.forFixed(day.fixed) : null;
        if (!my) return false;
        michnaOpenAt(my.first.id, my.first.chapter, my.first.mishna, 'screen-main');
    },
    mitsva: () => {
        const day = widgetToday();
        const items = day ? widgetMitsvaItems(day.fixed) : null;
        if (!items) return false;
        homeOpenMitsva(items[0]);
    }
};

function widgetOpenRoute(route) {
    if (!route) return;
    // Le même lien arrive par deux chemins (natif et plugin App) : une seule ouverture.
    const now = Date.now();
    if (widgetLastRoute.route === route && now - widgetLastRoute.at < 3000) return;
    widgetLastRoute = { route: route, at: now };
    let done = false;
    try { done = WIDGET_ROUTES[route] ? WIDGET_ROUTES[route]() !== false : false; } catch (e) { done = false; }
    if (done) return;
    // « today », un écran introuvable aujourd'hui, ou un lien inconnu (widget d'une version future) : l'accueil, onglet Aujourd'hui.
    showScreen('screen-main', 'back');
    if (typeof homeSelectTab === 'function') homeSelectTab('today');
}

// Le lien gardé par l'app native, s'il y en a un.
function widgetTakeRoute() {
    const plugin = widgetPlugin();
    if (!plugin || !plugin.takeRoute) return;
    plugin.takeRoute().then(res => { if (res && res.route) widgetOpenRoute(res.route); }).catch(() => {});
}

// À appeler une fois l'accueil construit (window.onload, js/app/home.js).
function widgetsStart() {
    const plugin = widgetPlugin();
    if (!plugin) return;
    widgetsRefresh();
    window.addEventListener('axewidgetroute', widgetTakeRoute);
    widgetTakeRoute();
    try {
        const app = window.Capacitor.Plugins.App;
        app.addListener('appUrlOpen', ev => widgetOpenRoute(widgetRouteOf(ev && ev.url)));
        app.addListener('appStateChange', state => { if (state && state.isActive) { widgetsRefresh(); widgetTakeRoute(); } });
    } catch (e) { /* sans le plugin App : le lien natif suffit */ }
}
