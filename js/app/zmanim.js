// =========================================================================
// === ZMANIM : LES HORAIRES DU JOUR POUR N'IMPORTE QUEL LIEU (écran de l'Atelier, groupe « Bible et tradition ») ===
// =========================================================================
// Le lieu se choisit par une recherche (n'importe quelle localité de la Terre), par la position de l'appareil, par des coordonnées saisies,
// ou parmi des favoris. Les horaires sont calculés SUR L'APPAREIL (js/zmanimCore.js, pur et testé) : hors-ligne, rien n'est envoyé. Seule la
// recherche d'une localité interroge un service de géocodage (Open-Meteo) avec le nom tapé, et rien d'autre ; la position de l'appareil,
// elle, ne quitte jamais l'appareil (voir js/location.js). Le lieu, les favoris et les opinions sont gardés dans localStorage.
// Réutilise les fonctions de date de js/app/hebrew-calendar.js (hcalGregorianText, hcalHebrewText, hcalHebrewLetters). Tout ce qui vient de
// la saisie ou du réseau passe par textContent, jamais par du HTML. Contenu halakhique écrit à la main : à relire par une personne compétente.

const ZM_KEYS = { place: 'zmanimPlace', favs: 'zmanimFavs', opts: 'zmanimOpts' };
const ZM_GEOCODER = 'https://geocoding-api.open-meteo.com/v1/search';
const ZM_DAY_MS = 86400000;

let zmPlace = null;          // le lieu courant { name, lat, lon, elevation, tz }
let zmFavs = [];             // les lieux favoris
let zmOpts = {};             // les opinions choisies (clés de ZmanimCore.DEFAULTS)
let zmDate = null;           // le jour affiché { year, month, day }
let zmEditing = false;       // le volet « Lieu » est ouvert
let zmFound = null;          // résultats de la dernière recherche : [{ place, detail }], ou { error }, ou { loading }
let zmTimer = null;
let zmHe = false;            // vrai : les noms des horaires en hébreu (bouton « A / א »), et la mise en page inversée : le nom à droite, l'heure à gauche
try { zmHe = localStorage.getItem('zmanimHebrew') === '1'; } catch (e) { /* stockage indisponible : français */ }
let zmParasha = null;        // { calendar, parashot } une fois chargés
let zmParashaLoading = false;
let zmRem = null;            // les réglages des rappels (voir js/zmanimReminderCore.js)

// Les groupes d'horaires : [clé] pour une ligne simple, [clé Magen Avraham, clé Gra] pour une ligne à deux colonnes.
const ZM_GROUPS = [
    { id: 'morning', icon: '🌅', rows: [['alot'], ['misheyakir'], ['netz'], ['shemaMa', 'shemaGra'], ['tefilaMa', 'tefilaGra']] },
    { id: 'day', icon: '☀️', rows: [['chatzot'], ['minchaGedola'], ['minchaKetana'], ['plag'], ['shkia']] },
    { id: 'night', icon: '🌙', rows: [['tzeit'], ['rabbenuTam'], ['chatzotLayla']] }
];
// Le nom court de chaque horaire (clé i18n) ; les lignes à deux colonnes partagent un nom.
const ZM_LABEL = {
    alot: 'alot', misheyakir: 'misheyakir', netz: 'netz', shemaMa: 'shema', shemaGra: 'shema', tefilaMa: 'tefila', tefilaGra: 'tefila', chatzot: 'chatzot',
    minchaGedola: 'guedola', minchaKetana: 'ketana', plag: 'plag', shkia: 'shkia', tzeit: 'tzeit', rabbenuTam: 'tam', chatzotLayla: 'chatzot_layla'
};
// Les libellés en hébreu (bouton « A / א »). Les noms sont ceux de la tradition ; ils ne passent pas par i18n (l'hébreu n'est pas traduit).
const ZM_HE = {
    alot: 'עלות השחר', misheyakir: 'משיכיר (זמן טלית ותפילין)', netz: 'הנץ החמה', shema: 'סוף זמן קריאת שמע', tefila: 'סוף זמן תפילה', chatzot: 'חצות היום',
    guedola: 'מנחה גדולה', ketana: 'מנחה קטנה', plag: 'פלג המנחה', shkia: 'שקיעת החמה', tzeit: 'צאת הכוכבים', tam: 'צאת רבנו תם', chatzot_layla: 'חצות הלילה',
    morning: 'בוקר', day: 'יום', night: 'ערב ולילה', gra: 'גר״א', ma: 'מג״א', hours: 'שעה זמנית', shabbat: 'שבת', candles: 'הדלקת נרות', havdalah: 'צאת השבת',
    daf: 'דף יומי', tehilim: 'תהילים', tachanun: 'אומרים תחנון', tachanun_morning: 'תחנון בבוקר', rosh_chodesh: 'ראש חודש', no_tachanun: 'אין אומרים תחנון', next: 'הזמן הבא', levana: 'ברכת הלבנה', today: 'היום'
};
// Le libellé d'un identifiant, en hébreu si le bouton « א » est actif, sinon la clé i18n `tools.zm_<fr>` (ou `fr` donné).
function zmL(id, frKey, params) {
    if (zmHe && ZM_HE[id]) return ZM_HE[id];
    return t('tools.' + (frKey || 'zm_' + id), params);
}

// Les réglages proposés : [clé de ZmanimCore.DEFAULTS, valeurs].
const ZM_SETTINGS = [
    ['elevation', ['yes', 'no']],
    ['dawn', ['deg161', 'prop72', 'min72', 'min90', 'deg19', 'deg18']],
    ['misheyakir', ['deg11', 'alot6', 'deg102']],
    ['maBasis', ['deg161', 'prop72', 'min72', 'min90', 'deg19', 'deg18']],
    ['guedola', ['lahumra', 'halfHour', 'fixed30']],
    ['tzeit', ['deg7083', 'deg85', 'zm135', 'min30', 'min40', 'min42']],
    ['havdalah', ['deg85', 'deg7083', 'min42', 'min50', 'min72']],
    ['rabbenuTam', ['deg161', 'prop72', 'min72']],
    ['chatzotLayla', ['chatzot12', 'stars6']],
    ['candles', ['auto', 15, 18, 20, 22, 30, 40]]
];

// --- Stockage -------------------------------------------------------------------------------------------------------------------------
function zmRead(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
}
function zmWrite(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* stockage indisponible : le réglage reste pour la séance */ }
}
function zmLoad() {
    zmPlace = ZmanimCore.normalizePlace(zmRead(ZM_KEYS.place, null));
    const favs = zmRead(ZM_KEYS.favs, []);
    zmFavs = (Array.isArray(favs) ? favs : []).map(ZmanimCore.normalizePlace).filter(Boolean).slice(0, 30);
    const opts = zmRead(ZM_KEYS.opts, {});
    zmOpts = {};
    ZM_SETTINGS.forEach(([key, values]) => {
        const v = opts && opts[key];
        if (values.includes(v)) zmOpts[key] = v;
    });
}

// Les opinions enregistrées, lues sans toucher au lieu courant ni aux réglages chargés (pour l'accueil et le Siddour).
function zmStoredOpts() {
    const stored = zmRead(ZM_KEYS.opts, {});
    const out = {};
    ZM_SETTINGS.forEach(([key, values]) => {
        const v = stored && stored[key];
        if (values.includes(v)) out[key] = v;
    });
    return out;
}

// La fenêtre de Birkat haLévana du mois en cours (ou du suivant si elle est passée), en une ligne ; null s'il n'y en a pas
// ou si elle ne s'ouvre pas dans les 14 jours. Pendant la fenêtre : « Jusqu'au soir du … » ; avant : « Demain soir » / « Dans N jours ».
function zmLevanaInfo(place, civil, h, opts) {
    const Z = ZmanimCore;
    const months = HebrewCalendarCore.monthsOf(h.year);
    const index = months.findIndex(m => m.id === h.month);
    if (index < 0) return null;
    const candidates = [[h.year, months[index].id]];
    candidates.push(index + 1 < months.length ? [h.year, months[index + 1].id] : [h.year + 1, 'Tishri']);
    const dayStart = Z.localToUtc(place.tz, civil.year, civil.month, civil.day, 0);
    const todayFixed = CalendarYearCore.gregorianToFixed(civil.year, civil.month, civil.day);
    for (const [year, month] of candidates) {
        const win = Z.levanaWindow(year, month, opts.levanaWait || 7);
        const evenings = Z.levanaEvenings(place, win, opts);
        if (!evenings) continue;
        const last = Z.localToUtc(place.tz, evenings.last.year, evenings.last.month, evenings.last.day, 23);
        if (last < dayStart) continue;
        const fixedOf = (d) => CalendarYearCore.gregorianToFixed(d.year, d.month, d.day);
        const fmt = (d) => hcalGregorianText(fixedOf(d), { weekday: undefined, year: undefined, month: 'long', day: 'numeric' });
        const daysToFirst = fixedOf(evenings.first) - todayFixed;
        if (daysToFirst <= 0) return 'Jusqu\'au soir du ' + fmt(evenings.last);
        if (daysToFirst > 14) return null;
        const window = t('tools.zm_levana_window', { from: fmt(evenings.first), to: fmt(evenings.last) });
        return (daysToFirst === 1 ? 'Demain soir' : 'Dans ' + daysToFirst + ' jours') + ' : ' + window.charAt(0).toLowerCase() + window.slice(1);
    }
    return null;
}

// --- Dates ----------------------------------------------------------------------------------------------------------------------------
function zmToday() {
    return ZmanimCore.civilDateOf(zmPlace ? zmPlace.tz : 'UTC', Date.now());
}
function zmShift(date, days) {
    const d = new Date(Date.UTC(date.year, date.month - 1, date.day) + days * ZM_DAY_MS);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
function zmSameDay(a, b) { return a.year === b.year && a.month === b.month && a.day === b.day; }
function zmIso(d) { return d.year + '-' + String(d.month).padStart(2, '0') + '-' + String(d.day).padStart(2, '0'); }
function zmFixed(d) { return CalendarYearCore.gregorianToFixed(d.year, d.month, d.day); }
function zmSupported(d) { return d.year >= HebrewCalendarCore.GREGORIAN_MIN && d.year <= HebrewCalendarCore.GREGORIAN_MAX; }
function zmLocale() { return (typeof i18n !== 'undefined' && i18n.currentLang) || 'fr'; }
function zmTime(ms) { return ZmanimCore.formatTime(ms, zmPlace.tz, zmLocale()); }
function zmEl(tag, className, text) { return hcalEl(tag, className, text); }

// « dans 1 h 12 » / « dans 8 min »
function zmIn(ms) {
    const minutes = Math.max(0, Math.round(ms / 60000));
    if (minutes < 60) return t('tools.zm_in_min', { n: minutes });
    return t('tools.zm_in_hm', { h: Math.floor(minutes / 60), m: String(minutes % 60).padStart(2, '0') });
}

// --- Entrée de l'écran ----------------------------------------------------------------------------------------------------------------
// Trois vues (Jour, Chabbat, Semaine) et, derrière la roue crantée, les réglages (affichage, opinions, rappels).
let zmView = 'day';          // 'day' | 'shabbat' | 'week' | 'settings'
let zmPrevView = 'day';      // la vue à retrouver en quittant les réglages
let zmExplain = false;       // vrai : l'explication de chaque horaire est toujours affichée (sinon, au toucher)
let zmHaftarot = null;       // data/torah/haftarot.json, une fois chargé
let zmHaftarotLoading = false;
try { zmExplain = localStorage.getItem('zmanimExplain') === '1'; } catch (e) { /* stockage indisponible : explications au toucher */ }

function toolZmanimInit() {
    zmLoad();
    zmRemLoad();
    zmFound = null;
    zmEditing = !zmPlace;
    zmDate = zmPlace ? zmToday() : null;
    zmView = 'day';
    zmPrevView = 'day';
    zmCalOpen = false;
    zmLoadParasha();
    zmLoadHaftarot();
    zmRender();
    clearInterval(zmTimer);
    zmTimer = setInterval(() => {
        const screen = toolEl('screen-tool-zmanim');
        if (!screen || screen.classList.contains('hidden')) { clearInterval(zmTimer); zmTimer = null; return; }
        if (zmPlace && zmDate && !zmEditing && zmView !== 'settings') zmRender(true);
    }, 30000);
}

function zmLoadParasha() {
    if (zmParasha || zmParashaLoading) return;
    zmParashaLoading = true;
    Promise.all([
        fetch('data/torah/calendar.json').then(r => (r.ok ? r.json() : null)),
        fetch('data/torah/parashot.json').then(r => (r.ok ? r.json() : null))
    ]).then(([calendar, parashot]) => {
        if (calendar && parashot) { zmParasha = { calendar, parashot }; zmRender(true); }
    }).catch(() => { /* sans paracha : le reste fonctionne */ }).then(() => { zmParashaLoading = false; });
}

function zmLoadHaftarot() {
    if (zmHaftarot || zmHaftarotLoading) return;
    zmHaftarotLoading = true;
    fetch('data/torah/haftarot.json').then(r => (r.ok ? r.json() : null)).then(json => {
        if (json) { zmHaftarot = json; if (zmView === 'shabbat') zmRender(true); }
    }).catch(() => { /* sans haftara : le reste fonctionne */ }).then(() => { zmHaftarotLoading = false; });
}

function zmRender(keepScroll) {
    const body = toolEl('tool-zmanim-body');
    if (!body) return;
    const scroller = body.closest('.list-screen') || document.scrollingElement;
    const top = keepScroll && scroller ? scroller.scrollTop : 0;
    toolClear(body);
    const title = toolEl('zm-title');
    if (title) title.textContent = zmView === 'settings' ? 'Réglages' : 'Zmanim';
    const gear = toolEl('zm-gear');
    if (gear) gear.classList.toggle('hidden', zmView === 'settings');
    if (zmView === 'settings') {
        zmSettings(body);
    } else {
        zmPlaceBar(body);
        if (zmEditing) zmPlaceEditor(body);
        if (zmPlace && zmDate) {
            zmDateNav(body);
            zmViewTabs(body);
            if (!zmSupported(zmDate)) body.appendChild(zmEl('p', 'tool-msg', t('tools.zm_out_of_range', { min: HebrewCalendarCore.GREGORIAN_MIN, max: HebrewCalendarCore.GREGORIAN_MAX })));
            else if (zmView === 'shabbat') zmShabbatView(body);
            else if (zmView === 'week') zmWeekView(body);
            else zmDay(body);
        }
    }
    body.appendChild(zmEl('p', 'tool-small zm-disclaimer', t('tools.zm_disclaimer')));
    if (keepScroll && scroller) scroller.scrollTop = top;
}

// Hébreu ou transcription pour les noms des horaires (réglage « Noms des horaires en hébreu »).
function zmSetLang(he) {
    zmHe = he;
    try { localStorage.setItem('zmanimHebrew', he ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
    zmRender(true);
}

function zmSetExplain(on) {
    zmExplain = on;
    try { localStorage.setItem('zmanimExplain', on ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
}

function zmOpenSettings() {
    zmPrevView = zmView === 'settings' ? zmPrevView : zmView;
    zmView = 'settings';
    zmRender();
    const screen = toolEl('screen-tool-zmanim');
    if (screen) screen.scrollTop = 0;
}

// Retour : des réglages à la vue précédente, sinon à l'écran d'où l'on vient.
function zmBack() {
    if (zmView === 'settings') {
        zmView = zmPrevView;
        zmRender();
        return;
    }
    toolBack('zmanim');
}

// Le sélecteur des trois vues.
function zmViewTabs(body) {
    const seg = zmEl('div', 'zm-seg');
    seg.setAttribute('role', 'tablist');
    seg.setAttribute('aria-label', 'Vue des horaires');
    const views = [['day', 'Jour', 'יום'], ['shabbat', 'Chabbat', 'שבת'], ['week', 'Semaine', 'שבוע']];
    views.forEach(([id, fr, he]) => {
        const b = zmEl('button', 'zm-seg-btn' + (zmView === id ? ' is-on' : ''), zmHe ? he : fr);
        b.type = 'button';
        b.id = 'zm-view-' + id;
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', zmView === id ? 'true' : 'false');
        if (zmHe) b.lang = 'he';
        b.onclick = () => { zmView = id; zmRender(); };
        seg.appendChild(b);
    });
    body.appendChild(seg);
}

// --- Le lieu --------------------------------------------------------------------------------------------------------------------------
function zmPlaceLabel(p) {
    const lat = Math.abs(p.lat).toFixed(2) + '°' + (p.lat >= 0 ? 'N' : 'S');
    const lon = Math.abs(p.lon).toFixed(2) + '°' + (p.lon >= 0 ? 'E' : 'O');
    return lat + ' · ' + lon + ' · ' + p.tz;
}

function zmPlaceBar(body) {
    const btn = zmEl('button', 'zm-placebar');
    btn.type = 'button';
    btn.id = 'zm-placebar';
    btn.setAttribute('aria-expanded', zmEditing ? 'true' : 'false');
    btn.appendChild(zmEl('span', 'zm-placebar-icon', '📍'));
    const text = zmEl('span', 'zm-placebar-text');
    text.appendChild(zmEl('strong', '', zmPlace ? (zmPlace.name || t('tools.zm_place_unnamed')) : t('tools.zm_place_choose')));
    if (zmPlace) text.appendChild(zmEl('small', '', zmPlaceLabel(zmPlace)));
    btn.appendChild(text);
    btn.appendChild(zmEl('span', 'zm-placebar-chevron', zmEditing ? '▴' : '▾'));
    btn.onclick = () => { if (!zmPlace) return; zmEditing = !zmEditing; zmRender(); };
    body.appendChild(btn);
}

function zmUsePlace(place) {
    const normalized = ZmanimCore.normalizePlace(place);
    if (!normalized) { showToast(t('tools.zm_place_invalid')); return; }
    zmPlace = normalized;
    zmWrite(ZM_KEYS.place, normalized);
    zmEditing = false;
    zmFound = null;
    zmDate = zmToday();
    zmResched();
    zmRender();
    window.scrollTo && window.scrollTo(0, 0);
}

function zmIsFavorite(place) { return zmFavs.some(f => ZmanimCore.sameSpot(f, place)); }
function zmToggleFavorite() {
    if (!zmPlace) return;
    if (zmIsFavorite(zmPlace)) zmFavs = zmFavs.filter(f => !ZmanimCore.sameSpot(f, zmPlace));
    else zmFavs = [zmPlace].concat(zmFavs).slice(0, 30);
    zmWrite(ZM_KEYS.favs, zmFavs);
    zmRender(true);
}

function zmDeviceTimeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
}

function zmLocate() {
    if (typeof HistoriAxeLocation === 'undefined' || !HistoriAxeLocation.isSupported()) { showToast(t('tools.zm_gps_unavailable')); return; }
    zmFound = { loading: true };
    zmRender(true);
    HistoriAxeLocation.locate().then(pos => {
        if (!pos) { zmFound = { error: t('tools.zm_gps_failed') }; zmRender(true); return; }
        zmUsePlace({ name: t('tools.zm_my_position'), lat: pos.lat, lon: pos.lon, elevation: 0, tz: zmDeviceTimeZone() });
    });
}

function zmSearch(query) {
    const q = String(query || '').trim();
    if (q.length < 2) { zmFound = { error: t('tools.zm_search_short') }; zmRender(true); return; }
    zmFound = { loading: true };
    zmRender(true);
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = setTimeout(() => { if (controller) controller.abort(); }, 8000);
    const url = ZM_GEOCODER + '?name=' + encodeURIComponent(q) + '&count=10&format=json&language=' + encodeURIComponent(zmLocale());
    fetch(url, controller ? { signal: controller.signal } : undefined)
        .then(res => { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
        .then(json => {
            const list = ZmanimCore.parseGeocoding(json);
            zmFound = list.length ? list : { error: t('tools.zm_search_none', { q: q }) };
        })
        .catch(() => { zmFound = { error: t('tools.zm_search_offline') }; })
        .then(() => { clearTimeout(timeout); zmRender(true); });
}

function zmPlaceEditor(body) {
    const panel = zmEl('section', 'tool-panel zm-editor');
    panel.id = 'zm-editor';

    // Recherche d'une localité
    panel.appendChild(zmEl('h3', 'tool-h', t('tools.zm_search_title')));
    const form = zmEl('form', 'tool-inline');
    form.onsubmit = (e) => { e.preventDefault(); zmSearch(input.value); };
    const input = zmEl('input', 'tool-input');
    input.type = 'search';
    input.id = 'zm-search';
    input.placeholder = t('tools.zm_search_placeholder');
    input.setAttribute('aria-label', t('tools.zm_search_title'));
    input.autocomplete = 'off';
    input.enterKeyHint = 'search';
    input.maxLength = 80;
    const go = zmEl('button', 'btn tool-today', t('tools.zm_search_go'));
    go.type = 'submit';
    form.appendChild(input);
    form.appendChild(go);
    panel.appendChild(form);
    const results = zmEl('div', 'zm-results');
    results.setAttribute('aria-live', 'polite');
    if (zmFound && zmFound.loading) results.appendChild(zmEl('p', 'tool-small', t('tools.zm_loading')));
    else if (zmFound && zmFound.error) results.appendChild(zmEl('p', 'tool-msg', zmFound.error));
    else if (Array.isArray(zmFound)) {
        zmFound.forEach(r => {
            const b = zmEl('button', 'zm-result');
            b.type = 'button';
            b.appendChild(zmEl('strong', '', r.place.name));
            b.appendChild(zmEl('small', '', [r.detail, zmPlaceLabel(r.place)].filter(Boolean).join(' — ')));
            b.onclick = () => zmUsePlace(r.place);
            results.appendChild(b);
        });
    }
    panel.appendChild(results);

    // Position de l'appareil
    const gps = zmEl('button', 'tool-history-chip zm-gps', '🛰️ ' + t('tools.zm_gps'));
    gps.type = 'button';
    gps.id = 'zm-gps';
    gps.onclick = zmLocate;
    panel.appendChild(gps);

    // Favoris
    if (zmFavs.length) {
        panel.appendChild(zmEl('h3', 'tool-h', t('tools.zm_favs_title')));
        const list = zmEl('div', 'zm-results');
        zmFavs.forEach(f => {
            const row = zmEl('div', 'zm-fav');
            const pick = zmEl('button', 'zm-result');
            pick.type = 'button';
            pick.appendChild(zmEl('strong', '', f.name || t('tools.zm_place_unnamed')));
            pick.appendChild(zmEl('small', '', zmPlaceLabel(f)));
            pick.onclick = () => zmUsePlace(f);
            const del = zmEl('button', 'zm-fav-del', '✕');
            del.type = 'button';
            del.setAttribute('aria-label', t('tools.zm_fav_remove', { name: f.name || '' }));
            del.onclick = () => { zmFavs = zmFavs.filter(x => x !== f); zmWrite(ZM_KEYS.favs, zmFavs); zmRender(true); };
            row.appendChild(pick);
            row.appendChild(del);
            list.appendChild(row);
        });
        panel.appendChild(list);
    }
    if (zmPlace) {
        const fav = zmEl('button', 'tool-history-chip', zmIsFavorite(zmPlace) ? '★ ' + t('tools.zm_fav_in') : '☆ ' + t('tools.zm_fav_add'));
        fav.type = 'button';
        fav.setAttribute('aria-pressed', zmIsFavorite(zmPlace) ? 'true' : 'false');
        fav.onclick = zmToggleFavorite;
        panel.appendChild(fav);
    }

    // Coordonnées : n'importe quel point de la Terre
    const details = zmEl('details', 'zm-manual');
    details.appendChild(zmEl('summary', '', t('tools.zm_manual_title')));
    details.appendChild(zmEl('p', 'tool-small', t('tools.zm_manual_note')));
    const fields = {};
    [['name', 'text', 'zm_f_name'], ['lat', 'number', 'zm_f_lat'], ['lon', 'number', 'zm_f_lon'], ['elevation', 'number', 'zm_f_elevation']].forEach(([id, type, key]) => {
        const wrap = zmEl('div', 'tool-field');
        const label = zmEl('label', '', t('tools.' + key));
        const f = zmEl('input', 'tool-input');
        f.id = 'zm-f-' + id;
        f.type = type;
        if (type === 'number') { f.step = 'any'; f.inputMode = 'decimal'; }
        if (id === 'name') f.maxLength = 60;
        label.htmlFor = f.id;
        fields[id] = f;
        wrap.appendChild(label);
        wrap.appendChild(f);
        details.appendChild(wrap);
    });
    const tzWrap = zmEl('div', 'tool-field');
    const tzLabel = zmEl('label', '', t('tools.zm_f_tz'));
    const tz = zmEl('input', 'tool-input');
    tz.id = 'zm-f-tz';
    tz.setAttribute('list', 'zm-tz-list');
    tz.value = zmDeviceTimeZone();
    tzLabel.htmlFor = tz.id;
    tzWrap.appendChild(tzLabel);
    tzWrap.appendChild(tz);
    const datalist = zmEl('datalist');
    datalist.id = 'zm-tz-list';
    try { (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : []).forEach(name => { const o = document.createElement('option'); o.value = name; datalist.appendChild(o); }); } catch (e) { /* liste absente : saisie libre */ }
    tzWrap.appendChild(datalist);
    details.appendChild(tzWrap);
    const use = zmEl('button', 'btn', t('tools.zm_f_use'));
    use.type = 'button';
    use.onclick = () => {
        if (!fields.lat.value || !fields.lon.value) { showToast(t('tools.zm_place_invalid')); return; }
        zmUsePlace({ name: fields.name.value.trim(), lat: fields.lat.value, lon: fields.lon.value, elevation: fields.elevation.value || 0, tz: tz.value.trim() });
    };
    details.appendChild(use);
    panel.appendChild(details);
    body.appendChild(panel);
}

// --- Navigation de date -----------------------------------------------------------------------------------------------------------------
let zmCalOpen = false;       // le calendrier (grégorien et hébraïque) est déplié
let zmCalMonth = null;       // le mois affiché { year, month }

function zmHebrewOfCivil(d) {
    return HebrewCalendarCore.hebrewFromFixed(HebrewCalendarCore.fixedOfGregorian(d.year, d.month, d.day));
}
function zmHebrewMonthName(h) { return zmHe ? HebrewCalendarCore.monthHebrew(h.year, h.month) : hcalMonthName(h.year, h.month); }

// « 13 nov. 2026 » et, dessous, « 4 Kislev 5787 »
function zmDateButtonTexts() {
    const lang = zmLocale();
    const dt = new Date(Date.UTC(zmDate.year, zmDate.month - 1, zmDate.day));
    let civil = zmIso(zmDate);
    try { civil = new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(dt); } catch (e) { /* format par défaut */ }
    let hebrew = '';
    if (zmSupported(zmDate)) {
        const h = zmHebrewOfCivil(zmDate);
        hebrew = zmHe ? HebrewCalendarCore.hebrewNumeral(h.day) + ' ' + zmHebrewMonthName(h) + ' ' + HebrewCalendarCore.hebrewNumeral(h.year) : h.day + ' ' + zmHebrewMonthName(h) + ' ' + h.year;
    }
    return { civil: civil, hebrew: hebrew };
}

function zmDateNav(body) {
    const nav = zmEl('div', 'zm-datenav');
    const prev = zmEl('button', 'zm-nav-btn', '‹');
    prev.type = 'button';
    prev.id = 'zm-prev';
    prev.setAttribute('aria-label', t('tools.zm_prev_day'));
    prev.onclick = () => { zmDate = zmShift(zmDate, -1); zmRender(true); };
    const next = zmEl('button', 'zm-nav-btn', '›');
    next.type = 'button';
    next.id = 'zm-next';
    next.setAttribute('aria-label', t('tools.zm_next_day'));
    next.onclick = () => { zmDate = zmShift(zmDate, 1); zmRender(true); };
    // Le champ « date » natif reste dans la page (invisible) : il garde la valeur et sert de point d'entrée programmatique ; l'affichage et le choix
    // passent par le bouton ci-dessous et le calendrier de l'application, qui montre aussi les dates hébraïques (le sélecteur du système ne le peut pas).
    const pick = zmEl('input', 'zm-datepick-hidden');
    pick.type = 'date';
    pick.id = 'zm-date';
    pick.value = zmIso(zmDate);
    pick.min = HebrewCalendarCore.GREGORIAN_MIN + '-01-01';
    pick.max = HebrewCalendarCore.GREGORIAN_MAX + '-12-31';
    pick.tabIndex = -1;
    pick.setAttribute('aria-hidden', 'true');
    pick.onchange = () => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pick.value);
        if (m) { zmDate = { year: +m[1], month: +m[2], day: +m[3] }; zmCalOpen = false; zmRender(true); }
    };
    const texts = zmDateButtonTexts();
    const open = zmEl('button', 'zm-datebtn');
    open.type = 'button';
    open.id = 'zm-datebtn';
    open.setAttribute('aria-label', t('tools.zm_pick_date'));
    open.setAttribute('aria-expanded', zmCalOpen ? 'true' : 'false');
    open.appendChild(zmEl('strong', '', texts.civil));
    if (texts.hebrew) { const he = zmEl('small', '', texts.hebrew); if (zmHe) he.lang = 'he'; open.appendChild(he); }
    open.onclick = () => {
        zmCalOpen = !zmCalOpen;
        zmCalMonth = { year: zmDate.year, month: zmDate.month };
        zmRender(true);
    };
    const today = zmEl('button', 'zm-today', zmHe ? ZM_HE.today : t('tools.zm_today'));
    today.type = 'button';
    today.id = 'zm-today';
    today.disabled = zmSameDay(zmDate, zmToday());
    today.onclick = () => { zmDate = zmToday(); zmCalOpen = false; zmRender(true); };
    nav.appendChild(prev);
    nav.appendChild(open);
    nav.appendChild(next);
    nav.appendChild(today);
    nav.appendChild(pick);
    body.appendChild(nav);
    if (zmCalOpen && zmSupported(zmDate)) zmCalendar(body);
}

// Le calendrier d'un mois : le jour civil en grand, le jour hébraïque en petit dessous ; un point marque Roch 'Hodesh et les fêtes.
function zmCalendar(body) {
    const C = HebrewCalendarCore;
    if (!zmCalMonth) zmCalMonth = { year: zmDate.year, month: zmDate.month };
    const { year, month } = zmCalMonth;
    const israel = ZmanimCore.inIsrael(zmPlace);
    const panel = zmEl('section', 'zm-cal');
    panel.id = 'zm-cal';
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const shiftMonth = (delta) => {
        let y = year, m = month + delta;
        if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
        if (y < C.GREGORIAN_MIN || y > C.GREGORIAN_MAX) return;
        zmCalMonth = { year: y, month: m };
        zmRender(true);
    };
    // l'en-tête : « novembre 2026 » et les mois hébraïques couverts
    const head = zmEl('div', 'zm-cal-head');
    const mk = (id, label, aria, delta) => { const b = zmEl('button', 'zm-cal-nav', label); b.type = 'button'; b.id = id; b.setAttribute('aria-label', aria); b.onclick = () => shiftMonth(delta); return b; };
    head.appendChild(mk('zm-cal-prev', '‹', t('tools.zm_cal_prev'), -1));
    const title = zmEl('div', 'zm-cal-title');
    let monthName = year + '-' + String(month).padStart(2, '0');
    try { monthName = new Intl.DateTimeFormat(zmLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1))); } catch (e) { /* format par défaut */ }
    title.appendChild(zmEl('strong', '', monthName));
    const hFirst = C.hebrewFromFixed(C.fixedOfGregorian(year, month, 1));
    const hLast = C.hebrewFromFixed(C.fixedOfGregorian(year, month, daysInMonth));
    const yearText = (h) => zmHe ? C.hebrewNumeral(h.year) : String(h.year);
    let range = zmHebrewMonthName(hFirst);
    if (hFirst.month !== hLast.month || hFirst.year !== hLast.year) range = (hFirst.year !== hLast.year ? zmHebrewMonthName(hFirst) + ' ' + yearText(hFirst) : zmHebrewMonthName(hFirst)) + ' – ' + zmHebrewMonthName(hLast) + ' ' + yearText(hLast);
    else range += ' ' + yearText(hFirst);
    const sub = zmEl('small', '', range);
    if (zmHe) sub.lang = 'he';
    title.appendChild(sub);
    head.appendChild(title);
    head.appendChild(mk('zm-cal-next', '›', t('tools.zm_cal_next'), 1));
    panel.appendChild(head);
    // les jours de la semaine, du dimanche au samedi (la semaine hébraïque : Chabbat est la dernière colonne)
    const grid = zmEl('div', 'zm-cal-grid');
    const dayLetters = zmHe ? ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'] : [0, 1, 2, 3, 4, 5, 6].map(d => {
        try { return new Intl.DateTimeFormat(zmLocale(), { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + d))); } catch (e) { return ''; }
    });
    dayLetters.forEach((l, i) => { const e = zmEl('span', 'zm-cal-dow' + (i === 6 ? ' is-shabbat' : ''), l); grid.appendChild(e); });
    const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    for (let i = 0; i < offset; i++) grid.appendChild(zmEl('span', 'zm-cal-empty', ''));
    const today = zmToday();
    for (let d = 1; d <= daysInMonth; d++) {
        const fixed = C.fixedOfGregorian(year, month, d);
        const info = C.dayInfo(fixed, israel);
        const h = info.hebrew;
        const cell = zmEl('button', 'zm-cal-day');
        cell.type = 'button';
        cell.dataset.date = zmIso({ year: year, month: month, day: d });
        if (C.weekdayOf(fixed) === 6) cell.classList.add('is-shabbat');
        if (zmSameDay({ year: year, month: month, day: d }, today)) cell.classList.add('is-today');
        if (zmSameDay({ year: year, month: month, day: d }, zmDate)) { cell.classList.add('is-selected'); cell.setAttribute('aria-current', 'date'); }
        if (info.feasts.length || info.roshChodesh) cell.classList.add('is-feast');
        cell.appendChild(zmEl('span', 'zm-cal-civil', String(d)));
        const he = zmEl('span', 'zm-cal-he', h.day === 1 ? zmHebrewMonthName(h) : C.hebrewNumeral(h.day));
        he.lang = 'he';
        cell.appendChild(he);
        cell.setAttribute('aria-label', zmIso({ year: year, month: month, day: d }) + ' · ' + h.day + ' ' + hcalMonthName(h.year, h.month) + ' ' + h.year);
        cell.onclick = () => { zmDate = { year: year, month: month, day: d }; zmCalOpen = false; zmRender(true); };
        grid.appendChild(cell);
    }
    panel.appendChild(grid);
    body.appendChild(panel);
}

// --- Les informations du jour ---------------------------------------------------------------------------------------------------------------
function zmTehilimText(h) {
    const months = HebrewCalendarCore.monthsOf(h.year);
    const month = months.filter(m => m.id === h.month)[0];
    const r = ZmanimCore.tehilimOfDay(h.day, month ? month.days : 30);
    if (!r) return '';
    if (r.length === 3) return r[0] + ' (' + r[1] + '–' + r[2] + ')';
    return r[0] + '–' + r[1];
}

// Le premier psaume du jour (le 119e est coupé en deux : on arrive au 119e).
function zmTehilimStart(h) {
    const months = HebrewCalendarCore.monthsOf(h.year);
    const month = months.filter(m => m.id === h.month)[0];
    const r = ZmanimCore.tehilimOfDay(h.day, month ? month.days : 30);
    return r ? r[0] : 1;
}

function zmParashaText(date) {
    if (!zmParasha) return null;
    const indices = TorahCore.parashaForDate(zmParasha.calendar, new Date(date.year, date.month - 1, date.day));
    if (!indices || !indices.length) return null;
    return indices.map(k => zmParasha.parashot.parashot[k][zmHe ? 'he' : 'fr']).join(' – ');
}

// Un jour en hébreu : « יום שישי ד׳ כסלו » (le nom du jour, puis la date hébraïque en lettres).
const ZM_WEEKDAYS_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
function zmHebrewDay(date) {
    const fixed = zmFixed(date);
    const h = HebrewCalendarCore.hebrewFromFixed(fixed);
    return ZM_WEEKDAYS_HE[HebrewCalendarCore.weekdayOf(fixed)] + ' ' + HebrewCalendarCore.hebrewNumeral(h.day) + ' ' + HebrewCalendarCore.monthHebrew(h.year, h.month);
}

// Les horaires triés d'un jour pour la mise en avant du prochain : [{ key, ms }].
function zmTimeline(z) {
    const keys = ['alot', 'misheyakir', 'netz', 'shemaMa', 'shemaGra', 'tefilaMa', 'tefilaGra', 'chatzot', 'minchaGedola', 'minchaKetana', 'plag', 'shkia', 'tzeit', 'rabbenuTam', 'chatzotLayla'];
    return keys.map(key => ({ key, ms: ZmanimCore.rounded(z, key) })).filter(e => e.ms !== null).sort((a, b) => a.ms - b.ms);
}

function zmZmanName(key, short) {
    const name = zmL(ZM_LABEL[key], 'zm_n_' + ZM_LABEL[key]);
    if (key === 'shemaMa' || key === 'tefilaMa') return short ? zmL('ma') : name + ' · ' + zmL('ma');
    if (key === 'shemaGra' || key === 'tefilaGra') return short ? zmL('gra') : name + ' · ' + zmL('gra');
    return name;
}

// --- Le jour ----------------------------------------------------------------------------------------------------------------------------
function zmDay(body) {
    const C = HebrewCalendarCore, Z = ZmanimCore;
    const israel = Z.inIsrael(zmPlace);
    const fixed = zmFixed(zmDate);
    const info = C.dayInfo(fixed, israel);
    const h = info.hebrew;
    const z = Z.zmanim(zmPlace, zmDate.year, zmDate.month, zmDate.day, zmOpts);
    const isToday = zmSameDay(zmDate, zmToday());
    const now = Date.now();
    const timeline = zmTimeline(z);
    const next = isToday ? timeline.filter(e => e.ms > now)[0] : null;

    // — La carte du jour —
    const hero = zmEl('section', 'zm-hero');
    hero.id = 'zm-hero';
    if (zmHe) hero.classList.add('is-he');
    hero.appendChild(zmEl('p', 'zm-hero-greg', hcalGregorianText(fixed)));
    hero.appendChild(zmEl('h3', 'zm-hero-date', hcalHebrewText(h)));
    const he = zmEl('p', 'zm-hero-he', hcalHebrewLetters(h));
    he.lang = 'he'; he.dir = 'rtl';
    hero.appendChild(he);
    const badges = zmEl('div', 'zm-badges');
    info.feasts.forEach(f => badges.appendChild(zmEl('span', 'zm-badge is-feast', '🕯️ ' + t('tools.hcal_f_' + C.feastNameId(f.id, fixed, israel) + '_name'))));
    if (info.roshChodesh) badges.appendChild(zmEl('span', 'zm-badge is-feast', '🌙 ' + (zmHe ? ZM_HE.rosh_chodesh : t('tools.hcal_roch_hodesh'))));
    if (info.omer) badges.appendChild(zmEl('span', 'zm-badge', '🔢 ' + (info.omer === 1 ? t('tools.hcal_omer_day_1') : t('tools.hcal_omer_day', { n: info.omer }))));
    if (C.weekdayOf(fixed) === 6) badges.appendChild(zmEl('span', 'zm-badge is-feast', '✡️ ' + zmL('shabbat')));
    const tachanun = Z.tachanunStatus(fixed, israel);
    badges.appendChild(zmEl('span', 'zm-badge', tachanun === 'no' ? zmL('no_tachanun') : tachanun === 'morning' ? zmL('tachanun_morning') : zmL('tachanun')));
    hero.appendChild(badges);
    if (isToday && z.tzeit !== null && now >= Z.rounded(z, 'tzeit') && zmSupported(zmShift(zmDate, 1))) {
        const tomorrow = C.dayInfo(fixed + 1, israel).hebrew;
        hero.appendChild(zmEl('p', 'zm-hero-note', '🌙 ' + t('tools.zm_since_nightfall', { date: hcalHebrewText(tomorrow) })));
    }
    hero.appendChild(zmArc(z, isToday ? now : null));
    if (next) {
        const line = zmEl('p', 'zm-next');
        line.appendChild(zmEl('span', 'zm-next-label', zmL('next')));
        line.appendChild(zmEl('strong', '', zmZmanName(next.key) + ' · ' + zmTime(next.ms)));
        line.appendChild(zmEl('span', 'zm-next-in', zmIn(next.ms - now)));
        hero.appendChild(line);
    }
    body.appendChild(hero);

    // Le vendredi et le samedi, un raccourci vers la vue Chabbat
    if (isToday && (C.weekdayOf(fixed) === 5 || C.weekdayOf(fixed) === 6)) zmShabbatBanner(body);
    // la veille de Pessa'h : l'encadré du 'hamets, là où ses horaires comptent
    zmHametsCard(body, fixed, h, israel);
    zmTimesList(body, z, { isToday: isToday, now: now, next: next });
    const hours = zmEl('p', 'tool-small zm-hours');
    hours.textContent = zmHe
        ? ZM_HE.hours + ' : ' + Z.formatDuration(z.shaaGra) + ' (' + ZM_HE.gra + ') · ' + Z.formatDuration(z.shaaMa) + ' (' + ZM_HE.ma + ')'
        : t('tools.zm_hours', { gra: Z.formatDuration(z.shaaGra), ma: Z.formatDuration(z.shaaMa) });
    if (zmHe) { hours.dir = 'rtl'; hours.lang = 'he'; }
    body.appendChild(hours);
    zmLevanaCard(body, h);
}

// Les horaires du jour en une seule liste : le passé estompé, le prochain mis en valeur, un repère « maintenant ».
// L'explication de chaque horaire s'ouvre au toucher (ou reste affichée si le réglage le demande).
function zmTimesList(body, z, state) {
    const card = zmEl('section', 'zm-list' + (zmHe ? ' is-he' : ''));
    card.id = 'zm-list';
    if (zmHe) card.dir = 'rtl';
    let markerPlaced = !state.isToday;
    ZM_GROUPS.forEach(group => {
        card.appendChild(zmEl('h3', 'zm-list-title', zmL(group.id, 'zm_g_' + group.id)));
        group.rows.forEach(row => {
            const allPassed = state.isToday && row.every(key => zmPassed(z, key, state.now));
            if (!markerPlaced && !allPassed) {
                markerPlaced = true;
                card.appendChild(zmEl('div', 'zm-nowmark', (zmHe ? 'עכשיו' : t('tools.zm_now')) + ' · ' + zmTime(state.now)));
            }
            const isNext = !!state.next && row.indexOf(state.next.key) !== -1;
            const r = zmEl('button', 'zm-r' + (isNext ? ' is-next' : '') + (allPassed ? ' is-past' : '') + (zmExplain ? ' is-open' : ''));
            r.type = 'button';
            const name = zmEl('strong', 'zm-r-name', zmL(ZM_LABEL[row[0]], 'zm_n_' + ZM_LABEL[row[0]]));
            if (zmHe) name.lang = 'he';
            r.appendChild(name);
            const times = zmEl('div', 'zm-r-times');
            row.forEach(key => {
                const cell = zmEl('span', 'zm-r-time');
                if (row.length === 2) cell.appendChild(zmEl('small', '', zmZmanName(key, true)));
                const value = zmEl('b', '', zmTime(ZmanimCore.rounded(z, key)));
                value.dir = 'ltr';
                if (ZmanimCore.rounded(z, key) === null) value.title = t('tools.zm_none_title');
                cell.appendChild(value);
                times.appendChild(cell);
            });
            r.appendChild(times);
            if (!zmHe) {
                r.appendChild(zmEl('em', 'zm-r-desc', t('tools.zm_d_' + ZM_LABEL[row[0]])));
                r.setAttribute('aria-expanded', zmExplain ? 'true' : 'false');
                r.onclick = () => { const open = r.classList.toggle('is-open'); r.setAttribute('aria-expanded', open ? 'true' : 'false'); };
            }
            card.appendChild(r);
        });
    });
    if (!markerPlaced) card.appendChild(zmEl('div', 'zm-nowmark', (zmHe ? 'עכשיו' : t('tools.zm_now')) + ' · ' + zmTime(state.now)));
    body.appendChild(card);
}

// --- Chabbat ---------------------------------------------------------------------------------------------------------------------------------
// La paracha d'une date : { index, name } ou null (calendrier non chargé).
function zmParashaOf(date) {
    if (!zmParasha) return null;
    const indices = TorahCore.parashaForDate(zmParasha.calendar, new Date(date.year, date.month - 1, date.day));
    if (!indices || !indices.length) return null;
    return { index: indices[0], name: indices.map(k => zmParasha.parashot.parashot[k][zmHe ? 'he' : 'fr']).join(' – ') };
}

// Le raccourci du vendredi et du samedi, au-dessus des horaires.
function zmShabbatBanner(body) {
    const Z = ZmanimCore;
    const s = Z.shabbatOf(zmPlace, zmDate.year, zmDate.month, zmDate.day, zmOpts);
    if (s.candles === null || s.havdalah === null) return;
    const b = zmEl('button', 'zm-banner');
    b.type = 'button';
    b.id = 'zm-banner';
    const par = zmParashaOf(s.saturday);
    const left = zmEl('span');
    left.appendChild(zmEl('small', '', zmL('shabbat')));
    left.appendChild(zmEl('strong', '', par ? par.name : zmL('shabbat')));
    b.appendChild(left);
    [[zmHe ? ZM_HE.candles : t('tools.zm_candles_short'), s.candles], [zmL('havdalah'), s.havdalah]].forEach(([label, ms]) => {
        const cell = zmEl('span', 'zm-banner-cell');
        cell.appendChild(zmEl('small', '', label));
        const v = zmEl('b', '', zmTime(ms));
        v.dir = 'ltr';
        cell.appendChild(v);
        b.appendChild(cell);
    });
    b.onclick = () => { zmView = 'shabbat'; zmRender(); };
    body.appendChild(b);
}

function zmShabbatView(body) {
    const C = HebrewCalendarCore, Z = ZmanimCore;
    const israel = Z.inIsrael(zmPlace);
    const s = Z.shabbatOf(zmPlace, zmDate.year, zmDate.month, zmDate.day, zmOpts);
    if (s.candles === null || s.havdalah === null) {
        body.appendChild(zmEl('p', 'tool-msg', t('tools.zm_none_title')));
        return;
    }
    zmShabbatCard(body, israel);
    const par = zmParashaOf(s.saturday);
    const rows = zmEl('div', 'home-rows zm-shabbat-rows');
    if (par) {
        const b = zmEl('button', 'home-row');
        b.type = 'button';
        b.id = 'zm-read-parasha';
        const he = zmEl('span', 'he', 'פרשה');
        he.lang = 'he'; he.dir = 'rtl';
        const text = zmEl('span');
        text.appendChild(zmEl('span', 'fr', 'Lire la paracha'));
        text.appendChild(zmEl('span', 'desc', par.name + ' · dans le Tikkoun'));
        b.appendChild(he); b.appendChild(text); b.appendChild(zmEl('span', 'chev', '›'));
        b.onclick = () => openTikkounAtParasha(par.index, 'screen-tool-zmanim');
        rows.appendChild(b);
    }
    // la haftara du chabbat, selon le rite séfarade quand il diffère
    if (zmParasha && zmHaftarot) {
        const sab = HaftarotCore.sabbathInfo(zmParasha.calendar, zmHaftarot, new Date(s.saturday.year, s.saturday.month - 1, s.saturday.day));
        const refs = sab && sab.haftara ? (sab.haftara.s || sab.haftara.a) : null;
        if (refs && refs.length) {
            const row = zmEl('div', 'home-row zm-haftara');
            row.id = 'zm-haftara';
            const he = zmEl('span', 'he', 'הפטרה');
            he.lang = 'he'; he.dir = 'rtl';
            const text = zmEl('span');
            text.appendChild(zmEl('span', 'fr', 'Haftara : ' + HaftarotCore.refsLabel(refs)));
            text.appendChild(zmEl('span', 'desc', (sab.haftara.s ? 'Rite séfarade' : 'Même lecture dans tous les rites') + (sab.why ? ' · ' + sab.why : '')));
            row.appendChild(he); row.appendChild(text); row.appendChild(zmEl('span'));
            rows.appendChild(row);
        }
    }
    if (rows.childElementCount) body.appendChild(rows);
    zmLevanaCard(body, zmHebrewOfCivil(zmDate));
}

// --- La semaine ------------------------------------------------------------------------------------------------------------------------------
// Sept jours, du dimanche au samedi : lever, fin du Chéma (Gra), coucher et sortie des étoiles. Un toucher ouvre le jour.
function zmWeekView(body) {
    const C = HebrewCalendarCore, Z = ZmanimCore;
    const fixed = zmFixed(zmDate);
    const start = fixed - C.weekdayOf(fixed);
    const todayFixed = zmFixed(zmToday());
    const cols = [['netz', 'Lever', 'הנץ'], ['shemaGra', 'Chéma', 'ק״ש'], ['shkia', 'Coucher', 'שקיעה'], ['tzeit', 'Étoiles', 'צאת']];
    const range = zmEl('p', 'zm-week-range');
    range.textContent = hcalGregorianText(start, { weekday: undefined, year: undefined }) + ' – ' + hcalGregorianText(start + 6, { weekday: undefined });
    body.appendChild(range);
    const wrap = zmEl('div', 'zm-week-wrap');
    const table = zmEl('table', 'zm-week');
    table.id = 'zm-week';
    const head = zmEl('tr');
    head.appendChild(zmEl('th', '', zmHe ? 'יום' : 'Jour'));
    cols.forEach(c => head.appendChild(zmEl('th', '', zmHe ? c[2] : c[1])));
    const thead = zmEl('thead');
    thead.appendChild(head);
    table.appendChild(thead);
    const tbody = zmEl('tbody');
    for (let i = 0; i < 7; i++) {
        const f = start + i;
        const d = CalendarYearCore.fixedToGregorian(f);
        const tr = zmEl('tr', (f === todayFixed ? 'is-today ' : '') + (C.weekdayOf(f) === 6 ? 'is-shabbat' : ''));
        const first = zmEl('td');
        const dayBtn = zmEl('button', 'zm-week-day');
        dayBtn.type = 'button';
        dayBtn.appendChild(zmEl('strong', '', hcalGregorianText(f, { weekday: 'short', day: 'numeric', month: undefined, year: undefined })));
        if (zmSupported(d)) {
            const hd = C.hebrewFromFixed(f);
            dayBtn.appendChild(zmEl('small', '', zmHe ? C.hebrewNumeral(hd.day) + ' ' + C.monthHebrew(hd.year, hd.month) : hd.day + ' ' + hcalMonthName(hd.year, hd.month)));
        }
        const open = () => { zmDate = { year: d.year, month: d.month, day: d.day }; zmView = 'day'; zmRender(); };
        dayBtn.onclick = open;
        first.appendChild(dayBtn);
        tr.appendChild(first);
        const z = zmSupported(d) ? Z.zmanim(zmPlace, d.year, d.month, d.day, zmOpts) : null;
        cols.forEach(c => {
            const td = zmEl('td', '', z ? zmTime(Z.rounded(z, c[0])) : '—');
            td.dir = 'ltr';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    body.appendChild(wrap);
    const nav = zmEl('div', 'zm-week-nav');
    [['‹ Semaine précédente', -7], ['Semaine suivante ›', 7]].forEach(([label, delta]) => {
        const b = zmEl('button', 'tool-history-chip', label);
        b.type = 'button';
        b.onclick = () => { const next = zmShift(zmDate, delta); if (zmSupported(next)) { zmDate = next; zmRender(); } };
        nav.appendChild(b);
    });
    body.appendChild(nav);
    body.appendChild(zmEl('p', 'tool-small', 'Fin du Chéma selon le Gra. Touchez un jour pour voir tous ses horaires.'));
}

// --- Les réglages ----------------------------------------------------------------------------------------------------------------------------
function zmSettings(body) {
    body.appendChild(zmEl('h3', 'home-section-title', 'Affichage'));
    const display = zmEl('div', 'zm-set-card zm-set-rows');
    display.appendChild(sdSwitch('Noms des horaires en hébreu', zmHe, on => zmSetLang(on)));
    display.appendChild(sdSwitch('Toujours afficher les explications', zmExplain, on => zmSetExplain(on)));
    body.appendChild(display);
    zmOptions(body);
    zmReminders(body);
}

// --- Le 'hamets, la veille de Pessa'h -----------------------------------------------------------------------------------------------------------
// Le 14 Nisan : jusqu'à quelle heure manger puis brûler le 'hamets, selon trois usages (ZmanimCore.hametsTimes). Si le 14 tombe un Chabbat, on brûle le vendredi.
// La veille au soir : bédikat 'hamets (jeudi soir si le 14 tombe un Chabbat).
function zmHametsCard(body, fixed, h, israel) {
    const C = HebrewCalendarCore, Z = ZmanimCore;
    const weekday = C.weekdayOf(fixed);
    const tomorrow = zmSupported(zmShift(zmDate, 1)) ? C.hebrewFromFixed(fixed + 1) : null;
    const isEve = h.month === 'Nisan' && h.day === 14;
    const fridayBeforeShabbatEve = !!tomorrow && tomorrow.month === 'Nisan' && tomorrow.day === 14 && weekday === 5;
    const bedikaTonight = !!tomorrow && tomorrow.month === 'Nisan' && ((tomorrow.day === 14 && C.weekdayOf(fixed + 1) !== 6) || (tomorrow.day === 13 && C.weekdayOf(fixed + 1) === 5));
    if (bedikaTonight) {
        const z = Z.zmanim(zmPlace, zmDate.year, zmDate.month, zmDate.day, zmOpts);
        const thursday = tomorrow.day === 13;
        const note = zmEl('section', 'zm-hamets-note');
        note.id = 'zm-bedika';
        const time = zmTime(Z.rounded(z, 'tzeit'));
        const text = zmEl('p', '', '🕯️ ' + (zmHe ? 'בדיקת חמץ הערב, מצאת הכוכבים (' + time + ')' : t(thursday ? 'tools.zm_hamets_bedika_thursday' : 'tools.zm_hamets_bedika', { time: time })));
        if (zmHe) { text.lang = 'he'; text.dir = 'rtl'; }
        note.appendChild(text);
        body.appendChild(note);
    }
    if (!isEve && !fridayBeforeShabbatEve) return;
    const times = Z.hametsTimes(zmPlace, zmDate.year, zmDate.month, zmDate.day);
    const shabbat = isEve && weekday === 6;
    const burnOnly = fridayBeforeShabbatEve;
    const card = zmEl('section', 'zm-hamets');
    card.id = 'zm-hamets';
    if (zmHe) card.dir = 'rtl';
    card.appendChild(zmEl('h3', 'zm-hamets-title', '🫓 ' + (zmHe ? 'ערב פסח: חמץ' : t(burnOnly ? 'tools.zm_hamets_burn_title' : 'tools.zm_hamets_title'))));
    const grid = zmEl('div', 'zm-hamets-grid');
    const head = (text) => { const e = zmEl('span', 'zm-hamets-head', text); if (zmHe) e.lang = 'he'; return e; };
    grid.appendChild(zmEl('span', 'zm-hamets-head', ''));
    if (!burnOnly) grid.appendChild(head(zmHe ? 'אכילת חמץ' : t('tools.zm_hamets_eat')));
    if (!shabbat) grid.appendChild(head(zmHe ? 'ביעור חמץ' : t('tools.zm_hamets_burn')));
    [['posen', 'הרב פוזן'], ['ovadia', 'הרב עובדיה יוסף'], ['habad', 'חב״ד']].forEach(([id, he]) => {
        const name = zmEl('strong', 'zm-hamets-name', zmHe ? he : t('tools.zm_hamets_' + id));
        if (zmHe) { name.lang = 'he'; name.dir = 'rtl'; }
        grid.appendChild(name);
        const time = (ms) => { const e = zmEl('span', 'zm-hamets-time', zmTime(ms)); e.dir = 'ltr'; return e; };
        if (!burnOnly) grid.appendChild(time(times[id].eat));
        if (!shabbat) grid.appendChild(time(times[id].burn));
    });
    grid.style.setProperty('--cols', String(1 + (burnOnly || shabbat ? 1 : 2)));
    card.appendChild(grid);
    if (shabbat && !zmHe) card.appendChild(zmEl('p', 'tool-small', t('tools.zm_hamets_shabbat')));
    else if (!zmHe) card.appendChild(zmEl('p', 'tool-small', t('tools.zm_hamets_note')));
    body.appendChild(card);
}

function zmPassed(z, key, now) {
    const ms = ZmanimCore.rounded(z, key);
    return ms !== null && ms <= now;
}

// --- L'arc du soleil ----------------------------------------------------------------------------------------------------------------------
const ZM_SVG = 'http://www.w3.org/2000/svg';
function zmSvg(tag, attrs) {
    const el = document.createElementNS(ZM_SVG, tag);
    Object.keys(attrs || {}).forEach(k => el.setAttribute(k, attrs[k]));
    return el;
}

// De netz à shkia : un arc, le midi solaire au sommet ; un point pour le soleil d'aujourd'hui. Sans lever ni coucher (nuit polaire), pas d'arc.
function zmArc(z, now) {
    const wrap = zmEl('div', 'zm-arc');
    if (z.netz === null || z.shkia === null) return wrap;
    const W = 320, H = 118, X0 = 24, X1 = 296, BASE = 92, TOP = 18;
    const svg = zmSvg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': t('tools.zm_arc_aria', { rise: zmTime(ZmanimCore.rounded(z, 'netz')), set: zmTime(ZmanimCore.rounded(z, 'shkia')) }) });
    const pointAt = (frac) => [X0 + (X1 - X0) * frac, BASE - (BASE - TOP) * Math.sin(Math.PI * frac)];
    let path = '';
    for (let i = 0; i <= 48; i++) { const [x, y] = pointAt(i / 48); path += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
    svg.appendChild(zmSvg('line', { x1: 8, y1: BASE, x2: W - 8, y2: BASE, class: 'zm-arc-horizon' }));
    svg.appendChild(zmSvg('path', { d: path, class: 'zm-arc-path' }));
    const span = z.shkia - z.netz;
    [['shemaGra', 'zm-arc-dot'], ['tefilaGra', 'zm-arc-dot'], ['chatzot', 'zm-arc-dot is-noon'], ['minchaGedola', 'zm-arc-dot'], ['minchaKetana', 'zm-arc-dot'], ['plag', 'zm-arc-dot']].forEach(([key, cls]) => {
        if (z[key] === null) return;
        const [x, y] = pointAt((z[key] - z.netz) / span);
        svg.appendChild(zmSvg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: cls.indexOf('is-noon') !== -1 ? 4 : 2.5, class: cls }));
    });
    if (now !== null && now >= z.netz && now <= z.shkia) {
        const [x, y] = pointAt((now - z.netz) / span);
        svg.appendChild(zmSvg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 9, class: 'zm-arc-sun-halo' }));
        svg.appendChild(zmSvg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 5.5, class: 'zm-arc-sun' }));
    }
    [[X0, 'netz', 'start'], [(X0 + X1) / 2, 'chatzot', 'middle'], [X1, 'shkia', 'end']].forEach(([x, key, anchor]) => {
        const text = zmSvg('text', { x: x, y: 111, class: 'zm-arc-label', 'text-anchor': anchor });
        text.textContent = zmTime(ZmanimCore.rounded(z, key));
        svg.appendChild(text);
    });
    wrap.appendChild(svg);
    return wrap;
}

// --- Chabbat et Birkat haLevana ------------------------------------------------------------------------------------------------------------------
function zmShabbatCard(body, israel) {
    const Z = ZmanimCore;
    const s = Z.shabbatOf(zmPlace, zmDate.year, zmDate.month, zmDate.day, zmOpts);
    if (s.candles === null || s.havdalah === null) return;
    const card = zmEl('section', 'zm-shabbat');
    card.id = 'zm-shabbat';
    if (zmHe) card.dir = 'rtl';
    card.appendChild(zmEl('small', '', zmL('shabbat')));
    const parasha = zmParashaText(s.saturday);
    if (parasha) {
        const name = zmEl('strong', 'zm-shabbat-name', parasha);
        if (zmHe) { name.lang = 'he'; name.dir = 'rtl'; }
        card.appendChild(name);
    }
    const dayOf = (d) => zmHe ? zmHebrewDay(d) : hcalGregorianText(zmFixed(d), { weekday: 'long', day: 'numeric', month: 'long', year: undefined });
    const grid = zmEl('div', 'zm-shabbat-grid');
    [['🕯️', zmHe ? ZM_HE.candles : t('tools.zm_candles', { n: Z.candleMinutes(zmPlace, zmOpts.candles || 'auto') }), s.candles, s.friday], ['✨', zmL('havdalah'), s.havdalah, s.saturday]].forEach(([icon, label, ms, date]) => {
        const cell = zmEl('div', 'zm-shabbat-cell');
        cell.appendChild(zmEl('span', 'zm-shabbat-icon', icon));
        cell.appendChild(zmEl('small', '', label));
        const big = zmEl('strong', '', zmTime(ms));
        big.dir = 'ltr';
        cell.appendChild(big);
        const when = zmEl('small', '', dayOf(date));
        if (zmHe) { when.lang = 'he'; when.dir = 'rtl'; }
        cell.appendChild(when);
        grid.appendChild(cell);
    });
    card.appendChild(grid);
    body.appendChild(card);
}

function zmLevanaCard(body, h) {
    const Z = ZmanimCore;
    // La fenêtre du mois en cours, ou du suivant si elle est passée : on cherche parmi le molad du mois courant et du suivant.
    const months = HebrewCalendarCore.monthsOf(h.year);
    const index = months.findIndex(m => m.id === h.month);
    const candidates = [];
    if (index >= 0) {
        candidates.push([h.year, months[index].id]);
        if (index + 1 < months.length) candidates.push([h.year, months[index + 1].id]);
        else candidates.push([h.year + 1, 'Tishri']);
    }
    const dayEnd = Z.localToUtc(zmPlace.tz, zmDate.year, zmDate.month, zmDate.day, 0);
    for (const [year, month] of candidates) {
        const win = Z.levanaWindow(year, month, zmOpts.levanaWait || 7);
        const evenings = Z.levanaEvenings(zmPlace, win, zmOpts);
        if (!evenings) continue;
        const last = Z.localToUtc(zmPlace.tz, evenings.last.year, evenings.last.month, evenings.last.day, 23);
        if (last < dayEnd) continue;
        const fmt = (d) => hcalGregorianText(zmFixed(d), { weekday: undefined, year: undefined, month: 'long', day: 'numeric' });
        const card = zmEl('section', 'zm-levana');
        card.id = 'zm-levana';
        card.appendChild(zmEl('small', '', '🌒 ' + zmL('levana')));
        card.appendChild(zmEl('strong', '', t('tools.zm_levana_window', { from: fmt(evenings.first), to: fmt(evenings.last) })));
        card.appendChild(zmEl('span', 'tool-small', t('tools.zm_levana_note')));
        body.appendChild(card);
        return;
    }
}

// --- Les opinions ---------------------------------------------------------------------------------------------------------------------------------
// --- Les rappels (notifications de l'iPhone) ------------------------------------------------------------------------------------------------------
function zmRemLoad() {
    try { zmRem = ZmanimReminderCore.normalize(JSON.parse(localStorage.getItem('zmanimReminders') || 'null')); } catch (e) { zmRem = ZmanimReminderCore.defaults(); }
}
// Enregistre les réglages et reprogramme les notifications (annule les anciennes) : sans effet hors de l'app iPhone.
function zmRemSave() {
    zmWrite('zmanimReminders', zmRem);
    zmResched();
}
function zmResched() {
    try { if (typeof TorahAxeNotifications !== 'undefined' && TorahAxeNotifications.scheduleZmanim) TorahAxeNotifications.scheduleZmanim(); } catch (e) { /* sans rappels : le reste fonctionne */ }
}
function zmRemRerender() {
    zmRender(true);
}

function zmRemSelect(parent, id, labelText, options, current, onChange) {
    const wrap = zmEl('div', 'tool-field');
    const label = zmEl('label', '', labelText);
    const select = zmEl('select', 'tool-input');
    select.id = id;
    label.htmlFor = id;
    options.forEach(([value, text]) => {
        const o = document.createElement('option');
        o.value = String(value);
        o.textContent = text;
        select.appendChild(o);
    });
    select.value = String(current);
    select.onchange = () => { onChange(select.value); zmRemSave(); zmRemRerender(); };
    wrap.appendChild(label);
    wrap.appendChild(select);
    parent.appendChild(wrap);
}

function zmReminders(body) {
    if (!zmRem) zmRemLoad();
    const R = ZmanimReminderCore;
    body.appendChild(zmEl('h3', 'home-section-title', t('tools.zm_rem_title')));
    const details = zmEl('div', 'zm-set-card zm-rem');
    details.id = 'zm-rem';
    const native = typeof TorahAxeNotifications !== 'undefined' && TorahAxeNotifications.isSupported && TorahAxeNotifications.isSupported();
    details.appendChild(zmEl('p', 'tool-small', t(native ? 'tools.zm_rem_note' : 'tools.zm_rem_note_web')));

    const master = zmEl('label', 'zm-rem-master');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = 'zm-r-on';
    box.checked = zmRem.on;
    box.onchange = () => {
        if (box.checked && native) {
            TorahAxeNotifications.enableZmanim().then(ok => {
                zmRem.on = ok;
                if (!ok) showToast(t('tools.zm_rem_denied'));
                zmRemSave();
                zmRemRerender();
            });
            return;
        }
        zmRem.on = box.checked;
        zmRemSave();
        zmRemRerender();
    };
    master.appendChild(box);
    master.appendChild(document.createTextNode(' ' + t('tools.zm_rem_master')));
    details.appendChild(master);
    if (native) {
        const test = zmEl('button', 'tool-history-chip', t('tools.zm_rem_test'));
        test.type = 'button';
        test.id = 'zm-r-test';
        test.onclick = () => TorahAxeNotifications.sendTest(5).then(ok => showToast(t(ok ? 'tools.zm_rem_test_sent' : 'tools.zm_rem_denied')));
        details.appendChild(test);
    }

    // Bougies
    zmRemSelect(details, 'zm-r-candles', t('tools.zm_rem_candles'),
        [['off', t('tools.zm_rem_off')]].concat(R.CANDLE_BEFORE.map(n => [n, n === 60 ? t('tools.zm_rem_before_h') : t('tools.zm_rem_before_n', { n: n })])),
        zmRem.candles.on ? zmRem.candles.before : 'off',
        v => { if (v === 'off') zmRem.candles.on = false; else { zmRem.candles.on = true; zmRem.candles.before = Number(v); } });
    // Omer
    zmRemSelect(details, 'zm-r-omer', t('tools.zm_rem_omer'),
        [['off', t('tools.zm_rem_off')], ['tzeit', t('tools.zm_rem_omer_tzeit')], ['shkia', t('tools.zm_rem_omer_shkia')]],
        zmRem.omer.on ? zmRem.omer.at : 'off',
        v => { if (v === 'off') zmRem.omer.on = false; else { zmRem.omer.on = true; zmRem.omer.at = v; } });
    if (zmRem.omer.on) {
        zmRemSelect(details, 'zm-r-omer-text', t('tools.zm_rem_omer_text'),
            [['count', t('tools.zm_rem_omer_text_count')], ['simple', t('tools.zm_rem_omer_text_simple')]],
            zmRem.omer.text, v => { zmRem.omer.text = v; });
    }
    // Roch 'Hodesh
    zmRemSelect(details, 'zm-r-rc', t('tools.zm_rem_rc'),
        [['off', t('tools.zm_rem_off')], ['eve', t('tools.zm_rem_rc_eve')], ['morning', t('tools.zm_rem_rc_morning')]],
        zmRem.roshChodesh.on ? zmRem.roshChodesh.when : 'off',
        v => { if (v === 'off') zmRem.roshChodesh.on = false; else { zmRem.roshChodesh.on = true; zmRem.roshChodesh.when = v; } });
    // Birkat haLévana
    zmRemSelect(details, 'zm-r-levana', t('tools.zm_rem_levana'),
        [['off', t('tools.zm_rem_no')], ['on', t('tools.zm_rem_yes')]],
        zmRem.levana.on ? 'on' : 'off', v => { zmRem.levana.on = v === 'on'; });

    // Rappels personnalisés : les jours de la semaine, puis chaque horaire avec son décalage
    details.appendChild(zmEl('h3', 'tool-h', t('tools.zm_rem_custom_title')));
    details.appendChild(zmEl('p', 'tool-small', t('tools.zm_rem_custom_note')));
    const days = zmEl('div', 'tool-history-chips zm-rem-days');
    days.setAttribute('role', 'group');
    days.setAttribute('aria-label', t('tools.zm_rem_days'));
    for (let d = 0; d < 7; d++) {
        const b = zmEl('button', 'tool-history-chip', t('tools.zm_rem_day_' + d));
        b.type = 'button';
        b.id = 'zm-r-day-' + d;
        b.setAttribute('aria-pressed', zmRem.days.indexOf(d) !== -1 ? 'true' : 'false');
        b.onclick = () => {
            zmRem.days = zmRem.days.indexOf(d) !== -1 ? zmRem.days.filter(x => x !== d) : zmRem.days.concat([d]).sort();
            zmRemSave();
            zmRemRerender();
        };
        days.appendChild(b);
    }
    details.appendChild(days);
    R.CUSTOM_KEYS.forEach(key => {
        zmRemSelect(details, 'zm-r-k-' + key, zmZmanName(key),
            [['off', t('tools.zm_rem_off')]].concat(R.OFFSETS.map(n => [n, n === 0 ? t('tools.zm_rem_now') : n > 0 ? t('tools.zm_rem_before_n', { n: n }) : t('tools.zm_rem_after_n', { n: -n })])),
            zmRem.custom[key] === undefined ? 'off' : zmRem.custom[key],
            v => { if (v === 'off') delete zmRem.custom[key]; else zmRem.custom[key] = Number(v); });
    });
    body.appendChild(details);
}

function zmOptions(body) {
    body.appendChild(zmEl('h3', 'home-section-title', t('tools.zm_opts_title')));
    const details = zmEl('div', 'zm-set-card');
    details.id = 'zm-options';
    details.appendChild(zmEl('p', 'tool-small', t('tools.zm_opts_note')));
    ZM_SETTINGS.forEach(([key, values]) => {
        const wrap = zmEl('div', 'tool-field');
        const label = zmEl('label', '', t('tools.zm_s_' + key));
        const select = zmEl('select', 'tool-input');
        select.id = 'zm-s-' + key;
        label.htmlFor = select.id;
        values.forEach(v => {
            const o = document.createElement('option');
            o.value = String(v);
            o.textContent = typeof v === 'number' ? t('tools.zm_o_candles_n', { n: v }) : t('tools.zm_o_' + key + '_' + v);
            select.appendChild(o);
        });
        const current = zmOpts[key] !== undefined ? zmOpts[key] : ZmanimCore.DEFAULTS[key];
        select.value = String(current);
        select.onchange = () => {
            const v = values.find(x => String(x) === select.value);
            if (v === ZmanimCore.DEFAULTS[key]) delete zmOpts[key]; else zmOpts[key] = v;
            zmWrite(ZM_KEYS.opts, zmOpts);
            zmResched();
            zmRender(true);
        };
        wrap.appendChild(label);
        wrap.appendChild(select);
        details.appendChild(wrap);
    });
    body.appendChild(details);
}
