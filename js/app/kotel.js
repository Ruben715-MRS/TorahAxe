// =========================================================================
// === BOUSSOLE DU KOTEL (écran de l'Atelier, groupe « Bible et tradition ») ===
// =========================================================================
// Montre dans quelle direction se trouve le Kotel (Jérusalem) depuis le lieu de l'écran Zmanim (ou la position de l'appareil). Le cap vient de js/compassCore.js
// (grand cercle, ou ligne droite sur la carte, au choix) ; le capteur de l'iPhone donne le nord MAGNÉTIQUE, corrigé de la déclinaison (js/geomagCore.js, WMM 2025)
// pour viser juste : sans cette correction, la boussole se tromperait d'une douzaine de degrés à New York.
// La position ne quitte jamais l'appareil. Les capteurs ne tournent que sur cet écran (écouteurs retirés au retour).
// Hors iPhone (ordinateur), pas de capteur : le cadran est fixe, nord en haut, avec le cap à suivre.
// Tout ce qui s'affiche passe par textContent / attributs SVG, jamais par du HTML. Contenu halakhique (le choix du calcul) : à relire par une personne compétente.

const KOTEL_PREFS_KEY = 'kotelPrefs';
const KOTEL_FACING_DEG = 3;           // « face au Kotel » à ±3°

let kotelPrefs = { method: 'great', declination: true };
let kotelPlace = null;                // { name, lat, lon } : le lieu de Zmanim, ou la position de l'appareil
let kotelHeading = null;              // le cap VRAI de l'appareil (degrés), ou null sans capteur
let kotelSensor = 'off';              // 'off' | 'on' | 'denied' | 'none'
let kotelRaf = 0;
let kotelWasFacing = false;
let kotelRawHeading = null;

function kotelLoadPrefs() {
    try {
        const p = JSON.parse(localStorage.getItem(KOTEL_PREFS_KEY) || '{}');
        if (p.method === 'rhumb' || p.method === 'great') kotelPrefs.method = p.method;
        if (typeof p.declination === 'boolean') kotelPrefs.declination = p.declination;
    } catch (e) { /* stockage indisponible : réglages par défaut */ }
}
function kotelSavePrefs() {
    try { localStorage.setItem(KOTEL_PREFS_KEY, JSON.stringify(kotelPrefs)); } catch (e) { /* idem */ }
}

function kotelEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}
const KOTEL_SVG = 'http://www.w3.org/2000/svg';
function kotelSvg(tag, attrs) {
    const el = document.createElementNS(KOTEL_SVG, tag);
    Object.keys(attrs || {}).forEach(k => el.setAttribute(k, attrs[k]));
    return el;
}

function kotelStoredPlace() {
    try {
        const p = ZmanimCore.normalizePlace(JSON.parse(localStorage.getItem('zmanimPlace') || 'null'));
        return p ? { name: p.name, lat: p.lat, lon: p.lon } : null;
    } catch (e) { return null; }
}

function toolKotelInit() {
    kotelLoadPrefs();
    kotelPlace = kotelStoredPlace();
    kotelHeading = null;
    kotelRawHeading = null;
    kotelWasFacing = false;
    kotelRender();
    if (kotelPlace) kotelStartSensor(true);
}

function kotelBack() {
    kotelStopSensor();
    toolBack('kotel');
}

// --- Les calculs de l'écran ----------------------------------------------------------------------------------------------------------------------
function kotelCompute() {
    if (!kotelPlace) return null;
    const dir = CompassCore.toKotel(kotelPlace.lat, kotelPlace.lon, kotelPrefs.method);
    const decl = GeomagCore.declination(kotelPlace.lat, kotelPlace.lon, Date.now());
    return { dir: dir, decl: decl };
}

// --- Le capteur ----------------------------------------------------------------------------------------------------------------------------------
function kotelOnOrientation(e) {
    let magnetic = null;
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) magnetic = e.webkitCompassHeading;          // iPhone : cap magnétique
    else if (e.type === 'deviceorientationabsolute' && typeof e.alpha === 'number') magnetic = CompassCore.norm(360 - e.alpha);       // Android : alpha absolu
    if (magnetic === null) return;
    kotelRawHeading = CompassCore.smooth(kotelRawHeading, magnetic, 0.25);
    const c = kotelCompute();
    const decl = kotelPrefs.declination && c ? c.decl.degrees : 0;
    kotelHeading = CompassCore.trueHeading(kotelRawHeading, decl);
    if (!kotelRaf) kotelRaf = requestAnimationFrame(() => { kotelRaf = 0; kotelUpdateNeedle(); });
}

// La boussole démarre d'elle-même partout où le système le permet (Android, navigateurs) et, sur iPhone, dès que l'autorisation a déjà été
// accordée. Sinon (« auto » vrai, aucun geste de l'utilisateur) iOS refuse de poser la question : le bouton « Activer la boussole » reste
// alors le seul moyen, car la fenêtre d'autorisation d'Apple ne peut s'ouvrir que sur un toucher.
let kotelAutoTimer = 0;
function kotelStartSensor(auto) {
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) { kotelSensor = 'none'; kotelRender(); return; }
    const start = () => {
        window.addEventListener('deviceorientationabsolute', kotelOnOrientation, true);
        window.addEventListener('deviceorientation', kotelOnOrientation, true);
        kotelSensor = 'on';
        kotelRender();
        // Un appareil sans capteur (ordinateur) n'envoie jamais de cap : on le dit au lieu d'attendre indéfiniment.
        if (auto === true) {
            clearTimeout(kotelAutoTimer);
            kotelAutoTimer = setTimeout(() => {
                if (kotelSensor === 'on' && kotelHeading === null) { kotelStopSensor(); kotelSensor = 'none'; kotelRender(); }
            }, 2500);
        }
    };
    if (typeof DOE.requestPermission === 'function') {
        DOE.requestPermission().then(r => {
            if (r === 'granted') start();
            else if (auto !== true) { kotelSensor = 'denied'; kotelRender(); }
        }).catch(() => { if (auto !== true) { kotelSensor = 'denied'; kotelRender(); } });
    } else {
        start();
    }
}

function kotelStopSensor() {
    clearTimeout(kotelAutoTimer);
    window.removeEventListener('deviceorientationabsolute', kotelOnOrientation, true);
    window.removeEventListener('deviceorientation', kotelOnOrientation, true);
    if (kotelRaf) { cancelAnimationFrame(kotelRaf); kotelRaf = 0; }
    kotelSensor = 'off';
    kotelHeading = null;
    kotelRawHeading = null;
}

function kotelLocate() {
    if (typeof HistoriAxeLocation === 'undefined' || !HistoriAxeLocation.isSupported()) { showToast(t('tools.zm_gps_unavailable')); return; }
    HistoriAxeLocation.locate().then(pos => {
        if (!pos) { showToast(t('tools.zm_gps_failed')); return; }
        kotelPlace = { name: t('tools.zm_my_position'), lat: pos.lat, lon: pos.lon };
        kotelRender();
        if (kotelSensor === 'off') kotelStartSensor(true);
    });
}

// --- Le dessin -----------------------------------------------------------------------------------------------------------------------------------
const KOTEL_C = 160;     // centre du cadran (viewBox 320 × 320)
function kotelPolar(deg, radius) {
    const a = (deg - 90) * Math.PI / 180;
    return [KOTEL_C + radius * Math.cos(a), KOTEL_C + radius * Math.sin(a)];
}

function kotelDial(bearing) {
    const svg = kotelSvg('svg', { viewBox: '0 0 320 320', role: 'img', id: 'kotel-dial', class: 'kt-dial' });
    svg.setAttribute('aria-label', bearing === null ? t('tools.kotel_dial_here') : t('tools.kotel_dial_aria', { deg: Math.round(bearing), wind: t('tools.kotel_wind_' + CompassCore.wind(bearing)) }));
    svg.appendChild(kotelSvg('circle', { cx: KOTEL_C, cy: KOTEL_C, r: 150, class: 'kt-ring' }));
    svg.appendChild(kotelSvg('circle', { cx: KOTEL_C, cy: KOTEL_C, r: 150, class: 'kt-ring-glow', id: 'kotel-glow' }));
    const rose = kotelSvg('g', { id: 'kotel-rose' });
    for (let d = 0; d < 360; d += 5) {
        const major = d % 90 === 0, mid = d % 30 === 0;
        const [x1, y1] = kotelPolar(d, major ? 128 : mid ? 134 : 140), [x2, y2] = kotelPolar(d, 148);
        rose.appendChild(kotelSvg('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'kt-tick' + (major ? ' is-major' : '') + (d === 0 ? ' is-north' : '') }));
    }
    [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'O']].forEach(([d, letter]) => {
        const [x, y] = kotelPolar(d, 112);
        const text = kotelSvg('text', { x: x, y: y + 6, 'text-anchor': 'middle', class: 'kt-letter' + (d === 0 ? ' is-north' : '') });
        text.textContent = letter;
        rose.appendChild(text);
    });
    if (bearing !== null) {
        const arrow = kotelSvg('g', { id: 'kotel-arrow', transform: 'rotate(' + bearing.toFixed(2) + ' ' + KOTEL_C + ' ' + KOTEL_C + ')' });
        arrow.appendChild(kotelSvg('path', { d: 'M160 28 L178 92 L160 80 L142 92 Z', class: 'kt-arrow' }));
        arrow.appendChild(kotelSvg('line', { x1: 160, y1: 80, x2: 160, y2: 160, class: 'kt-arrow-stem' }));
        rose.appendChild(arrow);
    }
    svg.appendChild(rose);
    svg.appendChild(kotelSvg('circle', { cx: KOTEL_C, cy: KOTEL_C, r: 6, class: 'kt-hub' }));
    // le repère fixe : l'avant de l'appareil
    svg.appendChild(kotelSvg('path', { d: 'M160 1 L171 17 L149 17 Z', class: 'kt-pointer' }));
    return svg;
}

// Fait tourner le cadran (sans tout redessiner) et dit si l'on fait face au Kotel.
function kotelUpdateNeedle() {
    const c = kotelCompute();
    const rose = document.getElementById('kotel-rose');
    const status = document.getElementById('kotel-status');
    const glow = document.getElementById('kotel-glow');
    if (!rose || !c) return;
    if (kotelHeading === null) { rose.setAttribute('transform', ''); return; }
    rose.setAttribute('transform', 'rotate(' + (-kotelHeading).toFixed(2) + ' ' + KOTEL_C + ' ' + KOTEL_C + ')');
    if (c.dir.bearing === null) return;
    const turn = CompassCore.turnBy(c.dir.bearing, kotelHeading);
    const facing = Math.abs(turn) <= KOTEL_FACING_DEG;
    if (glow) glow.classList.toggle('is-facing', facing);
    if (status) {
        status.classList.toggle('is-facing', facing);
        status.textContent = facing ? t('tools.kotel_facing')
            : t(turn > 0 ? 'tools.kotel_turn_right' : 'tools.kotel_turn_left', { deg: Math.round(Math.abs(turn)) });
    }
    if (facing && !kotelWasFacing) {
        try { if (typeof appSettings === 'undefined' || appSettings.haptics !== false) window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }); } catch (e) { /* pas de retour haptique : tant pis */ }
    }
    kotelWasFacing = facing;
}

function kotelRender() {
    const body = toolEl('tool-kotel-body');
    if (!body) return;
    toolClear(body);
    const c = kotelCompute();

    // Le lieu
    const placeBox = kotelEl('section', 'kt-place');
    const where = kotelEl('div', 'kt-where');
    if (kotelPlace) {
        where.appendChild(kotelEl('strong', '', kotelPlace.name || t('tools.zm_place_unnamed')));
        where.appendChild(kotelEl('small', '', Math.abs(kotelPlace.lat).toFixed(2) + '°' + (kotelPlace.lat >= 0 ? 'N' : 'S') + ' · ' + Math.abs(kotelPlace.lon).toFixed(2) + '°' + (kotelPlace.lon >= 0 ? 'E' : 'O')));
    } else {
        where.appendChild(kotelEl('strong', '', t('tools.kotel_no_place')));
    }
    placeBox.appendChild(where);
    const actions = kotelEl('div', 'kt-actions');
    const gps = kotelEl('button', 'kt-ghost', '📡 ' + t('tools.kotel_gps_short'));
    gps.type = 'button';
    gps.id = 'kotel-gps';
    gps.setAttribute('aria-label', t('tools.zm_gps'));
    gps.onclick = kotelLocate;
    actions.appendChild(gps);
    const choose = kotelEl('button', 'kt-ghost', '📍 ' + t('tools.kotel_choose_short'));
    choose.type = 'button';
    choose.id = 'kotel-choose';
    choose.setAttribute('aria-label', t('tools.kotel_choose'));
    choose.onclick = () => { kotelStopSensor(); openTool('zmanim', 'screen-tool-kotel'); };
    actions.appendChild(choose);
    placeBox.appendChild(actions);
    body.appendChild(placeBox);

    if (!c) return;

    // Le cadran
    const stage = kotelEl('div', 'kt-stage');
    stage.appendChild(kotelDial(c.dir.bearing));
    body.appendChild(stage);

    const status = kotelEl('p', 'kt-status', '');
    status.id = 'kotel-status';
    status.setAttribute('aria-live', 'polite');
    if (c.dir.here) status.textContent = t('tools.kotel_here');
    else if (kotelSensor === 'on' && kotelHeading === null) status.textContent = t('tools.kotel_waiting');
    else if (kotelSensor !== 'on') status.textContent = t('tools.kotel_static');
    body.appendChild(status);

    // Le cap, la distance, la déclinaison
    const info = kotelEl('section', 'kt-info');
    info.id = 'kotel-info';
    if (!c.dir.here) {
        const big = kotelEl('p', 'kt-bearing');
        big.id = 'kotel-bearing';
        big.appendChild(kotelEl('strong', '', Math.round(c.dir.bearing) + '°'));
        big.appendChild(kotelEl('span', '', ' ' + t('tools.kotel_wind_' + CompassCore.wind(c.dir.bearing))));
        info.appendChild(big);
        info.appendChild(kotelEl('p', 'kt-distance', t('tools.kotel_distance', { km: Math.round(c.dir.distanceKm).toLocaleString(zmLocale()) })));
    }
    const sign = c.decl.degrees >= 0 ? t('tools.kotel_decl_east') : t('tools.kotel_decl_west');
    info.appendChild(kotelEl('p', 'kt-decl', t('tools.kotel_decl', { deg: Math.abs(c.decl.degrees).toFixed(1), side: sign })));
    if (!c.decl.valid) info.appendChild(kotelEl('p', 'tool-msg', t('tools.kotel_decl_old')));
    body.appendChild(info);

    // La boussole de l'appareil
    if (kotelSensor === 'off' || kotelSensor === 'denied') {
        const btn = kotelEl('button', 'tool-history-chip kt-sensor', '🧭 ' + t('tools.kotel_sensor_on'));
        btn.type = 'button';
        btn.id = 'kotel-sensor';
        btn.onclick = () => kotelStartSensor();
        body.appendChild(btn);
        if (kotelSensor === 'denied') body.appendChild(kotelEl('p', 'tool-msg', t('tools.kotel_sensor_denied')));
    }
    if (kotelSensor === 'none') body.appendChild(kotelEl('p', 'tool-msg', t('tools.kotel_sensor_none')));

    // Le calcul de la direction (grand cercle ou ligne droite) et la déclinaison
    const settings = kotelEl('section', 'kt-settings');
    const line = kotelEl('div', 'kt-method-line');
    line.appendChild(kotelEl('span', 'kt-method-label', t('tools.kotel_method_label')));
    const chips = kotelEl('div', 'kt-method');
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', t('tools.kotel_method_title'));
    [['great', 'tools.kotel_method_great', 'tools.kotel_method_great'], ['rhumb', 'tools.kotel_method_rhumb_short', 'tools.kotel_method_rhumb']].forEach(([id, key, full]) => {
        const b = kotelEl('button', 'kt-ghost kt-method-btn', t(key));
        b.type = 'button';
        b.id = 'kotel-method-' + id;
        b.setAttribute('aria-label', t(full));
        b.setAttribute('aria-pressed', kotelPrefs.method === id ? 'true' : 'false');
        b.onclick = () => { kotelPrefs.method = id; kotelSavePrefs(); kotelRender(); kotelUpdateNeedle(); };
        chips.appendChild(b);
    });
    line.appendChild(chips);
    settings.appendChild(line);
    settings.appendChild(kotelEl('p', 'tool-small', t(kotelPrefs.method === 'great' ? 'tools.kotel_method_great_note' : 'tools.kotel_method_rhumb_note')));
    const label = kotelEl('label', 'kt-check');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = 'kotel-declination';
    box.checked = kotelPrefs.declination;
    box.onchange = () => { kotelPrefs.declination = box.checked; kotelSavePrefs(); kotelRawHeading = null; kotelRender(); };
    label.appendChild(box);
    label.appendChild(document.createTextNode(' ' + t('tools.kotel_decl_correct')));
    settings.appendChild(label);
    settings.appendChild(kotelEl('p', 'tool-small', t('tools.kotel_halakha')));
    body.appendChild(settings);

    kotelUpdateNeedle();
}
