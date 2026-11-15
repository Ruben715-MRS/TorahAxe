// =========================================================================
// === LES KORBANOT : LE RITUEL, OÙ ET COMMENT (huitième onglet de « Offrandes et sacrifices ») ===
// =========================================================================
// On choisit une sorte d'offrande ; l'écran dit où on l'abat, où va le sang (avec l'autel dessiné vu du dessus), ce qu'on fait du reste du sang et de
// la viande, et jusqu'à quand on peut la manger (avec une ligne de temps). Les données sont dans js/korbanotRitualData.js (testé) ; les schémas
// sont dessinés ici en SVG. Aucune image de livre. Tout passe par textContent, jamais par du HTML.

let korRitualId = 'ola';
const KOR_SVG_NS = 'http://www.w3.org/2000/svg';

function korSvg(tag, attrs, parent, text) {
    const el = document.createElementNS(KOR_SVG_NS, tag);
    Object.keys(attrs || {}).forEach(k => el.setAttribute(k, attrs[k]));
    if (text !== undefined) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
}

function korRenderRitual(body) {
    const R = KorbanotRitual;
    ['kk', 'kal'].forEach(level => {
        const group = korNode('section', 'kor-ritual-group');
        group.appendChild(korNode('h3', 'tool-h', R.LEVELS[level].fr));
        const chips = korNode('div', 'tool-history-chips kor-chips');
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', t('tools.korbanot_ritual_choose_aria') + ' : ' + R.LEVELS[level].short);
        R.ofLevel(level).forEach(c => {
            const btn = korNode('button', 'tool-history-chip', c.fr);
            btn.type = 'button';
            btn.id = 'kor-ritual-' + c.id;
            btn.setAttribute('aria-pressed', c.id === korRitualId ? 'true' : 'false');
            btn.onclick = () => { korRitualId = c.id; korRender(); };
            chips.appendChild(btn);
        });
        group.appendChild(chips);
        body.appendChild(group);
    });
    body.appendChild(korRitualCard(R.find(korRitualId)));
}

function korRitualCard(c) {
    const R = KorbanotRitual;
    const card = korNode('article', 'tool-result kor-ritual-card');
    card.id = 'kor-ritual-card';
    const head = korNode('div', 'kor-type-head');
    head.appendChild(korHebrew('strong', c.he, 'kor-he'));
    head.appendChild(korNode('span', 'kor-type-name', c.fr));
    card.appendChild(head);
    const badges = korNode('div', 'kor-ritual-badges');
    badges.appendChild(korNode('span', 'kor-ritual-badge is-' + c.level, R.LEVELS[c.level].short));
    badges.appendChild(korNode('span', 'kor-ritual-badge is-eaten', t('tools.korbanot_ritual_eaten_' + c.eaten)));
    card.appendChild(badges);

    const row = (labelKey, text) => {
        const block = korNode('div', 'kor-ritual-row');
        block.appendChild(korNode('strong', 'kor-ritual-label', t(labelKey)));
        block.appendChild(korNode('p', 'tool-small', text));
        card.appendChild(block);
    };
    row('tools.korbanot_ritual_cases', c.cases);
    row('tools.korbanot_ritual_slaughter', c.slaughter);
    row('tools.korbanot_ritual_blood', c.blood);
    card.appendChild(korNode('h4', 'tool-h kor-ritual-h', t('tools.korbanot_ritual_altar_title')));
    card.appendChild(korAltarSvg(c));
    card.appendChild(korNode('p', 'tool-small', t('tools.korbanot_ritual_legend')));
    row('tools.korbanot_ritual_residual', c.residual);
    row('tools.korbanot_ritual_meat', c.meat);
    row('tools.korbanot_ritual_deadline', c.deadlineText);
    card.appendChild(korTimelineSvg(c));
    card.appendChild(korNode('p', 'tool-small kor-ritual-source', t('tools.korbanot_ritual_source', { src: c.ref })));
    return card;
}

// L'autel vu du dessus : le nord en haut, le sanctuaire à l'ouest, la rampe au sud ; en jaune où l'on abat, en rouge où va le sang.
function korAltarSvg(c) {
    const svg = korSvg('svg', { viewBox: '0 0 230 180', class: 'kor-ritual-svg', role: 'img', 'aria-label': t('tools.korbanot_ritual_altar_title') });
    const text = (x, y, size, anchor, label, cls) => korSvg('text', { x: x, y: y, 'font-size': size, 'text-anchor': anchor, class: 'kor-ritual-text' + (cls ? ' ' + cls : '') }, svg, label);
    // Le sanctuaire à l'ouest, la rampe au sud.
    korSvg('rect', { x: 4, y: 60, width: 22, height: 60, class: 'kor-ritual-sanctuary' }, svg);
    const sanct = text(15, 94, 7, 'middle', t('tools.korbanot_ritual_label_sanctuary'));
    sanct.setAttribute('transform', 'rotate(-90 15 90)');
    korSvg('polygon', { points: '115,150 155,150 147,176 123,176', class: 'kor-ritual-ramp' }, svg);
    text(135, 170, 6.5, 'middle', t('tools.korbanot_ritual_label_ramp'));
    // Où l'on abat : au nord de l'autel, ou partout dans la cour.
    if (c.slaughterMark === 'north') {
        korSvg('rect', { x: 78, y: 4, width: 114, height: 24, class: 'kor-ritual-slaughter' }, svg);
        text(135, 19, 8, 'middle', t('tools.korbanot_ritual_label_slaughter'));
    } else if (c.slaughterMark === 'court') {
        korSvg('rect', { x: 34, y: 2, width: 194, height: 176, class: 'kor-ritual-slaughter is-court' }, svg);
        text(131, 14, 8, 'middle', t('tools.korbanot_ritual_label_anywhere'));
    }
    // L'autel : la base, les parois, le dessus et ses quatre cornes.
    korSvg('rect', { x: 78, y: 34, width: 114, height: 114, class: 'kor-ritual-base' }, svg);
    korSvg('rect', { x: 92, y: 48, width: 86, height: 86, class: 'kor-ritual-wall' }, svg);
    korSvg('rect', { x: 106, y: 62, width: 58, height: 58, class: 'kor-ritual-top' }, svg);
    const corners = [[106, 62], [164, 62], [106, 120], [164, 120]];
    const horns = c.bloodMark === 'horns';
    corners.forEach(p => korSvg('rect', { x: p[0] - 4, y: p[1] - 4, width: 8, height: 8, class: 'kor-ritual-horn' + (horns ? ' is-blood' : '') }, svg));
    text(135, 94, 8, 'middle', t('tools.korbanot_ritual_label_altar'));
    // Le sang.
    const dot = (x, y) => korSvg('circle', { cx: x, cy: y, r: 6, class: 'kor-ritual-blood' }, svg);
    if (c.bloodMark === 'ne-sw') { dot(178, 48); dot(92, 134); }
    if (c.bloodMark === 'bird-upper') dot(164, 120);
    if (c.bloodMark === 'bird-lower') dot(92, 134);
    if (c.bloodMark === 'lower-once') korSvg('rect', { x: 92, y: 48, width: 86, height: 86, class: 'kor-ritual-lower' }, svg);
    if (c.bloodMark === 'inner') {
        korSvg('line', { x1: 74, y1: 91, x2: 32, y2: 91, class: 'kor-ritual-arrow' }, svg);
        korSvg('polygon', { points: '30,91 38,86 38,96', class: 'kor-ritual-arrow-head' }, svg);
        text(48, 82, 6.5, 'middle', t('tools.korbanot_ritual_label_toward'), 'is-blood');
    }
    // Le reste du sang : sur la base sud ou ouest.
    if (c.residualMark === 'south') korSvg('line', { x1: 78, y1: 148, x2: 192, y2: 148, class: 'kor-ritual-residual' }, svg);
    if (c.residualMark === 'west') korSvg('line', { x1: 78, y1: 34, x2: 78, y2: 148, class: 'kor-ritual-residual' }, svg);
    // Les lieux de la mélika, en jaune : au sud-est (ola) ou au sud-ouest (faute).
    if (c.slaughterMark === 'melika-se') korSvg('circle', { cx: 164, cy: 120, r: 9, class: 'kor-ritual-slaughter-dot' }, svg);
    if (c.slaughterMark === 'melika-sw') korSvg('circle', { cx: 92, cy: 134, r: 9, class: 'kor-ritual-slaughter-dot' }, svg);
    // Les repères du dessus (le sang des oiseaux) passent devant le jaune.
    if (c.slaughterMark === 'melika-se' || c.slaughterMark === 'melika-sw') {
        const p = c.slaughterMark === 'melika-se' ? [164, 120] : [92, 134];
        korSvg('circle', { cx: p[0], cy: p[1], r: 6, class: 'kor-ritual-blood' }, svg);
    }
    return svg;
}

// La ligne de temps du délai : le jour de l'offrande, la nuit, le jour suivant ; en vert, la plage où l'on peut manger.
function korTimelineSvg(c) {
    const R = KorbanotRitual;
    const T = R.TIMELINE;
    const svg = korSvg('svg', { viewBox: '0 0 240 70', class: 'kor-ritual-svg is-time', role: 'img', 'aria-label': t('tools.korbanot_ritual_time_title') });
    const ox = 10;
    korSvg('rect', { x: ox + T.day1[0], y: 14, width: T.day1[1] - T.day1[0], height: 16, class: 'kor-ritual-day' }, svg);
    korSvg('rect', { x: ox + T.night[0], y: 14, width: T.night[1] - T.night[0], height: 16, class: 'kor-ritual-night' }, svg);
    korSvg('rect', { x: ox + T.day2[0], y: 14, width: T.day2[1] - T.day2[0], height: 16, class: 'kor-ritual-day' }, svg);
    const label = (x, y, txt, anchor) => korSvg('text', { x: x, y: y, 'font-size': 7, 'text-anchor': anchor || 'middle', class: 'kor-ritual-text' }, svg, txt);
    label(ox + 40, 10, t('tools.korbanot_ritual_time_day'));
    label(ox + 110, 10, t('tools.korbanot_ritual_time_night'));
    label(ox + 180, 10, t('tools.korbanot_ritual_time_next'));
    const win = R.eatingWindow(c.deadline);
    if (win) {
        korSvg('rect', { x: ox + win[0], y: 36, width: win[1] - win[0], height: 9, rx: 2, class: 'kor-ritual-eat' }, svg);
        label(ox + (win[0] + win[1]) / 2, 55, t('tools.korbanot_ritual_time_eat'));
        if (c.deadline !== 'two') {
            korSvg('line', { x1: ox + T.midnight, y1: 12, x2: ox + T.midnight, y2: 48, class: 'kor-ritual-tick' }, svg);
            label(ox + T.midnight, 65, t('tools.korbanot_ritual_time_midnight'));
        }
    } else {
        label(ox + 110, 48, t('tools.korbanot_ritual_time_none'));
    }
    return svg;
}
