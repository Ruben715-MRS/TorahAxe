// =========================================================================
// === « SUR LA CARTE » : LE JEU DE LOCALISATION (onglet « Jouer ») ===
// =========================================================================
// Les règles, les lieux et le calcul des points sont dans js/mapGameCore.js (pur, testé). Ici : le dessin de la carte en SVG (les terres de data/levant-land.json, les mers
// et le Jourdain de js/biblicalMapsCore.js, sans MapLibre : un dessin fixe, léger, qu'on peut toucher), le point touché, la correction (le bon endroit, la ligne, la distance)
// et la fiche. On touche pour poser un repère, on le déplace en touchant ailleurs, puis « Valider ». Tout ce qui vient des données passe par textContent.

let mapgame = null;
let mapgameReturn = 'screen-main';
let mapgameSection = 'all';
let mapgameLand = null;          // les terres (GeoJSON), une fois chargées
let mapgameLoading = false;
let mapgameProj = null;          // la projection de la carte affichée
let mapgameTouched = null;       // le point touché [lon, lat], avant validation

const MAPGAME_PREFS_KEY = 'torahaxe_mapgame_prefs_v1';
const MAPGAME_WIDTH = 360;       // largeur du dessin, en unités SVG
const SVG_NS = 'http://www.w3.org/2000/svg';

// Les noms de mers posés sur la carte pour s'orienter, par vue : [clé de traduction, [lon, lat], ancrage]. Les lacs (mer Morte, mer de Galilée) ne sont pas nommés : on peut
// les demander.
const MAPGAME_SEAS = {
    terre: [['mapgame.sea_med', [34.14, 32.55], 'start']],
    monde: [['mapgame.sea_med', [28.0, 33.4], 'start'], ['mapgame.sea_red', [35.2, 26.2], 'start'], ['mapgame.sea_gulf', [50.4, 28.2], 'end']]
};

function openMapGame(fromScreen) {
    mapgameReturn = fromScreen || 'screen-main';
    showScreen('screen-mapgame', 'forward');
    const raw = QuizUI.loadPrefs(MAPGAME_PREFS_KEY);
    mapgameSection = raw && MapGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
    mapgameSetup();
}

function mapgameBack() { gamesBackTo(mapgameReturn); }

function mapgameSetSection(section) {
    if (MapGameCore.SECTIONS.indexOf(section) < 0) return;
    mapgameSection = section;
    QuizUI.savePrefs(MAPGAME_PREFS_KEY, { section: mapgameSection });
    mapgameSetup();
}

function mapgameLoad(then) {
    if (mapgameLand) { then(); return; }
    if (mapgameLoading) return;
    mapgameLoading = true;
    document.getElementById('mapgame-load').textContent = t('mapgame.loading');
    fetch('data/levant-land.json').then(r => { if (!r.ok) throw new Error('land'); return r.json(); }).then(geo => {
        mapgameLand = geo;
        mapgameLoading = false;
        then();
    }).catch(() => { mapgameLoading = false; document.getElementById('mapgame-load').textContent = t('mapgame.load_error'); });
}

function mapgameSetup() {
    mapgame = null;
    QuizUI.phase('mapgame', 'setup');
    QuizUI.chips('mapgame', MapGameCore.SECTIONS.map(section => ({ id: section, label: t('mapgame.section_' + section) })), mapgameSection, mapgameSetSection);
    const start = document.getElementById('mapgame-start');
    if (mapgameLand) { document.getElementById('mapgame-load').textContent = ''; start.classList.remove('hidden'); return; }
    start.classList.add('hidden');
    mapgameLoad(() => { if (!document.getElementById('screen-mapgame').classList.contains('hidden') && !mapgame) mapgameSetup(); });
}

function mapgameStart() {
    if (!mapgameLand) return;
    mapgame = MapGameCore.createGame({ section: mapgameSection });
    QuizUI.phase('mapgame', 'play');
    mapgameRender();
}

// --- Le dessin --------------------------------------------------------------------------------------------------------------------------------
function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(k => el.setAttribute(k, attrs[k]));
    return el;
}

// Le chemin d'un anneau [[lon, lat], …] : « M x y L x y … Z ».
function mapgameRingPath(ring, proj) {
    return 'M' + ring.map(c => proj.toXY(c[0], c[1]).map(v => v.toFixed(1)).join(' ')).join('L') + 'Z';
}

// Les terres qui touchent le cadre (un anneau tout entier hors du cadre n'est pas dessiné). Le remplissage « evenodd » laisse les mers intérieures vides.
function mapgameLandPath(geo, proj, bounds) {
    const [w, s] = bounds[0], [e, n] = bounds[1];
    let d = '';
    const addRing = ring => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const c of ring) { if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0]; if (c[1] < minY) minY = c[1]; if (c[1] > maxY) maxY = c[1]; }
        if (maxX < w - 1 || minX > e + 1 || maxY < s - 1 || minY > n + 1) return;
        d += mapgameRingPath(ring, proj);
    };
    (geo.features || [geo]).forEach(f => {
        const g = f.geometry || f;
        if (g.type === 'Polygon') g.coordinates.forEach(addRing);
        else if (g.type === 'MultiPolygon') g.coordinates.forEach(poly => poly.forEach(addRing));
    });
    return d;
}

function mapgameDraw(q) {
    const proj = MapGameCore.projection(q.bounds, MAPGAME_WIDTH);
    mapgameProj = proj;
    const svg = svgEl('svg', { viewBox: '0 0 ' + MAPGAME_WIDTH + ' ' + proj.height.toFixed(1), role: 'img', 'aria-label': t('mapgame.map_aria') });
    svg.appendChild(svgEl('rect', { x: 0, y: 0, width: MAPGAME_WIDTH, height: proj.height.toFixed(1), class: 'mapgame-sea' }));
    svg.appendChild(svgEl('path', { d: mapgameLandPath(mapgameLand, proj, q.bounds), class: 'mapgame-land' }));
    // La mer Morte, la mer de Galilée et le Jourdain, dessinés de l'outil « Cartes », sur la vue de la terre d'Israël.
    if (q.view === 'terre') {
        BiblicalMapsCore.HYDRO.lakes.forEach(l => svg.appendChild(svgEl('path', { d: mapgameRingPath(l.ring, proj), class: 'mapgame-water' })));
        BiblicalMapsCore.HYDRO.rivers.forEach(r => svg.appendChild(svgEl('path', { d: 'M' + r.pts.map(c => proj.toXY(c[0], c[1]).map(v => v.toFixed(1)).join(' ')).join('L'), class: 'mapgame-river' })));
    }
    // Les grands fleuves du cadre « monde » (Nil, Euphrate, Tigre) et leur nom, pour s'orienter.
    ((MapGameCore.RIVERS || {})[q.view] || []).forEach(r => {
        svg.appendChild(svgEl('path', { d: 'M' + r.pts.map(c => proj.toXY(c[0], c[1]).map(v => v.toFixed(1)).join(' ')).join('L'), class: 'mapgame-river' }));
        const mid = r.pts[Math.floor(r.pts.length / 2)], [lx, ly] = proj.toXY(mid[0], mid[1]);
        const name = svgEl('text', { x: (lx + 4).toFixed(1), y: ly.toFixed(1), class: 'mapgame-label' });
        name.textContent = r.fr;
        svg.appendChild(name);
    });
    (MAPGAME_SEAS[q.view] || []).forEach(([key, c, anchor]) => {
        const [x, y] = proj.toXY(c[0], c[1]);
        const text = svgEl('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': anchor, class: 'mapgame-label' });
        text.textContent = t(key);
        svg.appendChild(text);
    });
    svg.addEventListener('click', ev => mapgameTouch(ev, svg));
    const box = document.getElementById('mapgame-map');
    toolClear(box);
    box.appendChild(svg);
    return svg;
}

// Un repère : un cercle (le point touché en bleu, le bon endroit en vert).
function mapgameMark(svg, lonlat, className) {
    const [x, y] = mapgameProj.toXY(lonlat[0], lonlat[1]);
    svg.appendChild(svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 5, class: className }));
}

// --- Le déroulé -------------------------------------------------------------------------------------------------------------------------------
function mapgameRender() {
    const g = mapgame;
    const q = MapGameCore.question(g);
    mapgameTouched = null;
    QuizUI.status('mapgame', g);
    document.getElementById('mapgame-question').textContent = t('mapgame.ask_' + q.kind);
    QuizUI.word('mapgame', q.fr, true);
    document.getElementById('mapgame-he').textContent = q.he;
    document.getElementById('mapgame-feedback').classList.add('hidden');
    document.getElementById('mapgame-actions').classList.remove('hidden');
    mapgameDraw(q);
    mapgameUpdateCheck();
}

function mapgameUpdateCheck() {
    const g = mapgame;
    document.getElementById('mapgame-check').disabled = !!g.resolved || !mapgameTouched;
}

// Le toucher : le point en coordonnées du dessin, puis en longitude et latitude.
function mapgameTouch(ev, svg) {
    const g = mapgame;
    if (!g || g.resolved) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const x = (ev.clientX - rect.left) * (MAPGAME_WIDTH / rect.width);
    const y = (ev.clientY - rect.top) * (MAPGAME_WIDTH / rect.width);
    mapgameTouched = mapgameProj.toLonLat(x, y);
    svg.querySelectorAll('.mapgame-pin').forEach(n => n.remove());
    mapgameMark(svg, mapgameTouched, 'mapgame-pin');
    mapgameUpdateCheck();
}

function mapgameCheck() {
    const g = mapgame;
    if (!mapgameTouched) return;
    const events = MapGameCore.submit(g, mapgameTouched);
    if (!events.length) return;
    arcadeSound(events[0] === 'perfect' ? 'good' : events[0] === 'near' ? 'good' : 'bad');
    const q = MapGameCore.question(g);
    const last = g.last;
    QuizUI.status('mapgame', g);
    // La correction : le contour ou le point du bon endroit, et, pour un point, la ligne entre la réponse et lui.
    const svg = document.querySelector('#mapgame-map svg');
    if (q.ring) svg.appendChild(svgEl('path', { d: mapgameRingPath(q.ring, mapgameProj), class: 'mapgame-zone' }));
    else {
        const [x1, y1] = mapgameProj.toXY(last.touched[0], last.touched[1]), [x2, y2] = mapgameProj.toXY(q.c[0], q.c[1]);
        svg.appendChild(svgEl('line', { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), class: 'mapgame-line' }));
        mapgameMark(svg, q.c, 'mapgame-goal');
    }
    svg.querySelectorAll('.mapgame-pin').forEach(n => n.remove());
    mapgameMark(svg, last.touched, 'mapgame-pin');
    const km = Math.round(last.distanceKm);
    const key = last.points === 100 ? (q.ring ? 'inside' : 'perfect') : last.points > 0 ? (q.ring ? 'near_zone' : 'near') : (q.ring ? 'far_zone' : 'far');
    const feedback = document.getElementById('mapgame-feedback');
    feedback.classList.toggle('is-wrong', last.points < 100);
    document.getElementById('mapgame-feedback-title').textContent = t('mapgame.' + key, { km: km, points: last.points });
    document.getElementById('mapgame-feedback-text').textContent = (q.ref ? q.ref + ' : ' : '') + q.note;
    const note = document.getElementById('mapgame-feedback-note');
    note.textContent = t('mapgame.legend_you') + ' (bleu) · ' + t('mapgame.legend_target') + (q.ring ? ' (rouge)' : ' (vert)');
    note.classList.remove('hidden');
    const next = document.getElementById('mapgame-next');
    next.textContent = t(g.index + 1 >= g.questions.length ? 'mapgame.finish' : 'mapgame.next');
    document.getElementById('mapgame-actions').classList.add('hidden');
    feedback.classList.remove('hidden');
    next.focus();
}

function mapgameContinue() {
    const g = mapgame;
    if (!g || !g.resolved) return;
    if (MapGameCore.next(g).includes('done')) { QuizUI.finish('mapgame', g, 'mapgame'); return; }
    mapgameRender();
}
