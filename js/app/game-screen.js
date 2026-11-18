// =========================================================================
// === GABARIT D'ÉCRAN DE JEU : LE HTML D'UN JEU, CONSTRUIT À PARTIR DE SON PLAN (js/gamesCatalog.js, champ `screen`) ===
// =========================================================================
// Tous les jeux ont le même squelette : retour, titre, bandeau d'état, trois phases (réglages `-setup`, partie `-play`, fin `-over`). Ce fichier le construit ; chaque jeu ne
// décrit dans le catalogue que ce qui lui est propre, pièce par pièce. Les identifiants sont ceux qu'attendent js/app/quiz-ui.js et les jeux : `<id>-status`, `<id>-setup`,
// `<id>-options`, `<id>-feedback-title`… ; les fonctions appelées par les boutons suivent le nom du jeu : `<id>Back()`, `<id>Start()`, `<id>Continue()`.
// Les textes viennent de ui/fr.json (clés `<id>.…`, posées par js/i18n.js au démarrage) : le titre seul a un texte d'attente (le nom du jeu). Rien n'est construit avec du HTML :
// seulement des nœuds DOM.
//
// Le plan : { setup: [pièces], play: [pièces], over: { progress: true, replay: 'fn()' }, back: 'fn()' }. Pièces de réglages :
//   { part: 'load' }                              la ligne d'état du chargement (`-load`)
//   { part: 'sections', aria: 'section_aria' }    les boutons de choix (`-sections`) ; `aria` : la clé du nom du groupe
//   { part: 'toggle', id, on, label, cls }        une case à cocher (`-<id>`), `on` : la fonction appelée au changement, `label` : la clé du texte, `checked`
//   { part: 'how', keys: ['how', …] }             des paragraphes d'explication (clés `<id>.<clé>`)
//   { part: 'start', id: true }                   le bouton « Jouer » (avec l'identifiant `-start` si `id`)
// Pièces de la partie :
//   { part: 'question' } { part: 'word', french, cls } { part: 'he' } { part: 'timer', seconds } { part: 'options', cls }
//   { part: 'feedback', body: ['text', 'extra', 'note', { el }], actions: [{ key, fn, cls }] }   la fiche après la réponse ; `body` : ce qu'elle contient (défaut : text, note)
// Toute pièce peut être { part: 'el', tag, id, cls, key, attrs, onclick, children: [éléments libres] } : un élément libre (`id` relatif au jeu : `-<id>`).
const GameScreen = (function () {
    'use strict';

    function el(tag, cls, attrs, text) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        Object.keys(attrs || {}).forEach(k => { if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) node.setAttribute(k, attrs[k] === true ? '' : String(attrs[k])); });
        if (text) node.textContent = text;
        return node;
    }

    // Un élément libre. `spec` : { tag, id, cls, key (clé de traduction du texte), attrs, onclick, type (boutons) }.
    function free(p, spec) {
        const attrs = Object.assign({}, spec.attrs);
        if (spec.id) attrs.id = p + '-' + spec.id;
        if (spec.key) attrs['data-i18n'] = p + '.' + spec.key;
        if (spec.onclick) attrs.onclick = spec.onclick;
        if (spec.tag === 'button') attrs.type = spec.type || 'button';
        const node = el(spec.tag || 'div', spec.cls, attrs);
        (spec.children || []).forEach(c => node.appendChild(free(p, c)));
        return node;
    }

    const SETUP = {
        load: p => el('p', 'tool-small', { id: p + '-load', role: 'status' }),
        sections: (p, o) => el('div', 'lexgame-levels', { id: p + '-sections', role: 'group', 'data-i18n-attr': 'aria-label:' + p + '.' + (o.aria || 'section_aria') }),
        toggle: (p, o) => {
            const label = el('label', o.cls);
            label.appendChild(el('input', '', { type: 'checkbox', id: p + '-' + o.id, onchange: o.on, checked: o.checked }));
            label.appendChild(document.createTextNode(' '));
            label.appendChild(el('span', '', { 'data-i18n': p + '.' + o.label }));
            return label;
        },
        how: (p, o) => o.keys.map(k => el('p', 'tool-small', { 'data-i18n': p + '.' + k })),
        start: (p, o) => el('button', 'btn', { type: 'button', id: o.id ? p + '-start' : null, onclick: p + 'Start()', 'data-i18n': 'arcade.play' })
    };

    const PLAY = {
        question: p => el('p', 'cause-question', { id: p + '-question' }),
        word: (p, o) => el('p', ['lexgame-word', o.french ? 'is-french' : '', o.cls || ''].filter(Boolean).join(' '), { id: p + '-word', lang: o.french ? null : 'he', dir: o.french ? null : 'rtl' }),
        he: p => el('p', 'tool-small trgame-he', { id: p + '-he', lang: 'he', dir: 'rtl' }),
        timer: (p, o) => {
            const bar = el('div', 'lexgame-bar quiz-timer', { id: p + '-timer', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': o.seconds, 'aria-valuenow': o.seconds, 'data-i18n-attr': 'aria-label:' + p + '.time_aria' });
            bar.appendChild(el('i', '', { id: p + '-timer-fill' }));
            return [bar, el('p', 'tool-small quiz-time', { id: p + '-time' })];
        },
        options: (p, o) => el('div', ['cause-cards', o.cls || ''].filter(Boolean).join(' '), { id: p + '-options' }),
        feedback: (p, o) => {
            const box = el('div', 'wheel-feedback hidden', { id: p + '-feedback', role: 'status' });
            box.appendChild(el('strong', '', { id: p + '-feedback-title' }));
            (o.body || ['text', 'note']).forEach(part => {
                if (part === 'text') box.appendChild(el('p', '', { id: p + '-feedback-text' }));
                else if (part === 'extra') box.appendChild(el('p', 'tool-small hidden', { id: p + '-feedback-extra' }));
                else if (part === 'note') box.appendChild(el('p', 'tool-small hidden', { id: p + '-feedback-note' }));
                else box.appendChild(free(p, part.el));
            });
            const actions = el('div', 'lexgame-actions');
            actions.appendChild(el('button', 'btn', { type: 'button', id: p + '-next', onclick: p + 'Continue()' }));
            (o.actions || []).forEach(a => actions.appendChild(el('button', a.cls || 'btn lexgame-dict-btn', { type: 'button', onclick: a.fn, 'data-i18n': p + '.' + a.key })));
            box.appendChild(actions);
            return box;
        }
    };

    function append(parent, built) { (Array.isArray(built) ? built : [built]).forEach(n => parent.appendChild(n)); }

    function phase(p, tag, parts, table) {
        const root = tag;
        (parts || []).forEach(o => append(root, o.part === 'el' ? free(p, o) : table[o.part](p, o)));
        return root;
    }

    // Construit l'écran d'un jeu du catalogue (`game.screen` : son plan) et le renvoie.
    function build(game) {
        const p = game.id;
        const plan = game.screen || {};
        const screen = el('div', 'list-screen hidden', { id: 'screen-' + p });
        screen.appendChild(el('button', 'back-btn', { onclick: plan.back || p + 'Back()', 'aria-label': 'Retour', 'data-i18n-attr': 'aria-label:nav.back' }, '‹'));
        screen.appendChild(el('h2', 'header-title', { 'data-i18n': p + '.title' }, game.fr));
        screen.appendChild(el('p', 'modes-header-subtitle', { id: p + '-status', role: 'status' }));
        screen.appendChild(phase(p, el('div', 'lexgame-setup', { id: p + '-setup' }), plan.setup, SETUP));
        screen.appendChild(phase(p, el('div', 'hidden', { id: p + '-play' }), plan.play, PLAY));
        const over = el('div', 'arcade-over hidden', { id: p + '-over' });
        over.appendChild(el('h3', '', { 'data-i18n': 'arcade.over' }));
        over.appendChild(el('p', '', { id: p + '-over-text' }));
        if (plan.over && plan.over.progress) over.appendChild(el('p', '', { id: p + '-over-progress' }));
        over.appendChild(el('button', 'btn', { type: 'button', onclick: p + 'Start()', 'data-i18n': 'arcade.replay' }));
        screen.appendChild(over);
        return screen;
    }

    // Monte les écrans décrits par le catalogue, à côté des écrans déjà dans la page. À appeler avant que js/i18n.js ne pose les textes.
    function mountAll(games) {
        const anchor = document.getElementById('screen-lexgame') || document.getElementById('screen-main');
        const parent = anchor ? anchor.parentNode : document.body;
        games.forEach(game => {
            if (!game.screen || document.getElementById('screen-' + game.id)) return;
            parent.insertBefore(build(game), anchor || null);
        });
    }

    return { build: build, mountAll: mountAll };
})();
GameScreen.mountAll(GamesCatalog.GAMES);
