// =========================================================================
// === TORAHAXE — LES WIDGETS DE L'IPHONE (le lien entre l'app et le widget) ===
// =========================================================================
// Le widget (ios/App/TorahAxeWidgets, en Swift) ne calcule rien : il lit un fichier que l'app prépare ici avec js/widgetDataCore.js, à
// l'ouverture, à chaque retour au premier plan, et quand le lieu ou une opinion des Zmanim change (zmWrite, js/app/zmanim.js). Le fichier
// est déposé par le plugin natif WidgetBridge (ios/App/App/WidgetBridgePlugin.swift) dans l'espace partagé de l'app et de ses widgets
// (App Group « group.com.torahaxe.app »), puis iOS redessine les widgets.
//
// Toucher un widget ouvre l'app sur un lien torahaxe://widget/<écran> : « today » (l'accueil, onglet Aujourd'hui) ou « zmanim ».
// Sur le web (PWA), il n'y a pas de widget : tout ce fichier est sans effet.

const WIDGET_DAYS = 30;
let widgetParashot = null;        // data/torah/parashot.json, chargé une fois
let widgetTimer = null;

function widgetPlugin() {
    const c = window.Capacitor;
    return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.WidgetBridge ? c.Plugins.WidgetBridge : null;
}

function widgetLoadParashot() {
    if (widgetParashot) return Promise.resolve(widgetParashot);
    return fetch('data/torah/parashot.json')
        .then(r => (r.ok ? r.json() : null))
        .then(data => { widgetParashot = data && data.parashot ? data.parashot : null; return widgetParashot; })
        .catch(() => null);
}

function widgetReadPlace() {
    try { return ZmanimCore.normalizePlace(JSON.parse(localStorage.getItem('zmanimPlace') || 'null')); } catch (e) { return null; }
}

function widgetDeviceTz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
}

// Les données du widget, avec les textes de l'interface (ui/fr.json).
function widgetBuild(parashot) {
    const HC = HebrewCalendarCore;
    return WidgetDataCore.build({
        place: widgetReadPlace(),
        opts: typeof zmStoredOpts === 'function' ? zmStoredOpts() : {},
        nowMs: Date.now(),
        days: WIDGET_DAYS,
        deviceTz: widgetDeviceTz(),
        parashot: parashot,
        text: {
            month: (year, id) => t('tools.hcal_month_' + HC.monthLabelId(year, id)),
            feast: id => t('tools.hcal_f_' + id + '_name'),
            tachanun: { yes: t('tools.zm_tachanun'), morning: t('tools.zm_tachanun_morning'), no: t('tools.zm_no_tachanun') }
        }
    });
}

// Recalcule et envoie les données au widget. Regroupe les appels rapprochés (plusieurs réglages changés d'affilée).
function widgetsRefresh() {
    if (!widgetPlugin()) return;
    clearTimeout(widgetTimer);
    widgetTimer = setTimeout(() => {
        widgetLoadParashot().then(parashot => {
            const plugin = widgetPlugin();
            if (!plugin) return;
            try {
                plugin.setTodayData({ json: JSON.stringify(widgetBuild(parashot)) }).catch(() => { /* widget absent (iOS < 17) : rien à faire */ });
            } catch (e) { /* un calcul impossible ne doit jamais gêner l'app */ }
        });
    }, 300);
}

// --- Les liens des widgets ------------------------------------------------------------------------------------------------------------------
function widgetRouteOf(url) {
    const m = /^torahaxe:\/\/widget\/([a-z]+)/.exec(String(url || ''));
    return m ? m[1] : null;
}

function widgetOpenRoute(route) {
    if (!route) return;
    if (route === 'zmanim' && typeof openTool === 'function') { openTool('zmanim', 'screen-main'); return; }
    // « today » et tout lien inconnu (d'une version future) : l'accueil, onglet Aujourd'hui.
    showScreen('screen-main', 'back');
    if (typeof homeSelectTab === 'function') homeSelectTab('today');
}

// À appeler une fois l'accueil construit (window.onload, js/app/home.js).
function widgetsStart() {
    const plugin = widgetPlugin();
    if (!plugin) return;
    widgetsRefresh();
    try {
        const app = window.Capacitor.Plugins.App;
        app.addListener('appUrlOpen', ev => widgetOpenRoute(widgetRouteOf(ev && ev.url)));
        app.addListener('appStateChange', state => { if (state && state.isActive) widgetsRefresh(); });
        // Lancement à froid par un widget : le lien est celui du lancement.
        app.getLaunchUrl().then(res => { if (res && res.url) widgetOpenRoute(widgetRouteOf(res.url)); }).catch(() => {});
    } catch (e) { /* sans le plugin App : les widgets restent à jour à chaque ouverture */ }
}
