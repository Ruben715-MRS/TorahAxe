// =========================================================================
// === TSARAAT (écran de l'Atelier, groupe « Bible et tradition ») ===
// =========================================================================
// Cinq onglets : (1) le parcours, étape par étape : on choisit un support (peau, calvitie, inflammation, nétek, vêtements, maisons), le cohen examine,
// on dit ce qu'il voit, et l'écran mène à la circonstance suivante jusqu'au verdict, avec une frise des jours (0, 7, 14, 21) et le chemin déjà fait ;
// (2) les couleurs des plaies ; (3) « Et ensuite ? », la purification du métsora et celle de la maison ; (4) « Cohen », un cas tiré au sort dont on
// trouve la suite ; (5) un petit lexique.
// Les données sont dans js/tsaraatData.js, les calculs dans js/tsaraatCore.js (testés), les textes de l'écran sous `tools.tsaraat_*` de ui/fr.json.
// Outil d'étude du Lévitique 13-14, pas une décision halakhique. Tout passe par textContent, jamais par du HTML.

const TSA_TABS = ['parcours', 'couleurs', 'ensuite', 'cohen', 'mots'];
let tsaTab = 'parcours';
const tsaState = { support: 'peau', choices: [] };
const tsaCohen = { kase: null, picked: null, ok: 0, total: 0, filter: '' };

// Des pastilles de couleur approximatives pour le tableau des couleurs : l'écran est décoratif ici, le texte dit la couleur.
const TSA_SWATCH = {
    skin: ['#ffffff', '#f1ede4', '#e9e2cf', '#f6efe0'],
    clothes: ['#2f6b3a', '#8b1f1f'],
    houses: ['#2f6b3a', '#8b1f1f']
};

function toolTsaraatInit() {
    tsaTab = 'parcours';
    tsaState.support = 'peau';
    tsaState.choices = [];
    tsaCohen.kase = null;
    tsaCohen.picked = null;
    tsaCohen.ok = 0;
    tsaCohen.total = 0;
    tsaCohen.filter = '';
    tsaRender();
}

function tsaPick(tab) {
    tsaTab = TSA_TABS.indexOf(tab) >= 0 ? tab : 'parcours';
    tsaRender();
    const screen = toolEl('screen-tool-tsaraat');
    if (screen) screen.scrollTop = 0;
}

// --- Briques communes -------------------------------------------------------------------------------------------------------------
function tsaNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function tsaHebrew(tag, text, className) {
    const el = tsaNode(tag, className, text);
    el.lang = 'he';
    el.dir = 'rtl';
    return el;
}

function tsaButton(className, text, onclick) {
    const btn = tsaNode('button', className, text);
    btn.type = 'button';
    btn.onclick = onclick;
    return btn;
}

function tsaList(lines, className) {
    const ul = tsaNode('ul', className || 'kor-lines');
    lines.forEach(line => ul.appendChild(tsaNode('li', 'tool-small', line)));
    return ul;
}

function tsaRender() {
    const tabs = toolEl('tool-tsaraat-tabs');
    toolClear(tabs);
    TSA_TABS.forEach(id => {
        const btn = tsaButton('tool-history-chip', t('tools.tsaraat_tab_' + id), () => tsaPick(id));
        btn.id = 'tool-tsaraat-tab-' + id;
        btn.setAttribute('aria-pressed', id === tsaTab ? 'true' : 'false');
        tabs.appendChild(btn);
    });
    const body = toolEl('tool-tsaraat-body');
    toolClear(body);
    body.appendChild(tsaNode('p', 'tool-small', t('tools.tsaraat_lead_' + tsaTab)));
    ({ parcours: tsaRenderParcours, couleurs: tsaRenderColors, ensuite: tsaRenderAfter, cohen: tsaRenderCohen, mots: tsaRenderWords })[tsaTab](body);
    body.appendChild(tsaNode('p', 'tool-small tsa-caveat', t('tools.tsaraat_caveat')));
}

// =====================================================================================================================================
// === 1. LE PARCOURS ===
// =====================================================================================================================================
function tsaSupport() { return TsaraatCore.SUPPORT_BY_ID[tsaState.support]; }

function tsaChoose(index) {
    tsaState.choices.push(index);
    tsaRender();
}

function tsaBack() {
    tsaState.choices.pop();
    tsaRender();
}

function tsaRestart() {
    tsaState.choices = [];
    tsaRender();
}

function tsaSelectSupport(id) {
    tsaState.support = id;
    tsaState.choices = [];
    tsaRender();
}

// La frise : les jours d'examen de ce support ; ceux déjà atteints sont pleins.
function tsaTimeline(supportId) {
    const tl = TsaraatCore.timeline(supportId, tsaState.choices);
    const wrap = tsaNode('div', 'tsa-timeline');
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', t('tools.tsaraat_timeline_aria', { reached: tl.reached, max: tl.maxDay }));
    tl.marks.forEach((day, i) => {
        if (i > 0) wrap.appendChild(tsaNode('span', 'tsa-line' + (day <= tl.reached ? ' is-reached' : '')));
        const mark = tsaNode('span', 'tsa-day' + (day <= tl.reached ? ' is-reached' : '') + (day === tl.reached ? ' is-current' : ''));
        mark.appendChild(tsaNode('span', 'tsa-dot'));
        mark.appendChild(tsaNode('span', 'tsa-day-label', t('tools.tsaraat_day', { n: day })));
        wrap.appendChild(mark);
    });
    return wrap;
}

// Le chemin déjà fait : ce que le cohen a vu à chaque jour d'examen.
function tsaTrail(support, steps) {
    const ol = tsaNode('ol', 'tsa-trail');
    ol.setAttribute('aria-label', t('tools.tsaraat_trail_aria'));
    steps.forEach(step => {
        const node = support.nodes[step.nodeId];
        const opt = node.options[step.optionIndex];
        const li = tsaNode('li', 'tsa-trail-step');
        li.appendChild(tsaNode('span', 'tsa-trail-day', t('tools.tsaraat_day', { n: node.day })));
        li.appendChild(tsaNode('span', 'tsa-trail-text', TsaraatCore.observation(node, opt)));
        ol.appendChild(li);
    });
    return ol;
}

// Où mène la fin du parcours ? Vers « Et ensuite ? » pour une personne déclarée métsora, ou pour la maison déclarée pure (le rite des oiseaux).
function tsaAfterLink(support, leafId, leaf) {
    const person = ['peau', 'calvitie', 'inflammation', 'netek'].indexOf(support.id) >= 0;
    if (person && leaf.verdict === 'metsora') return 'tools.tsaraat_next_person';
    if (support.id === 'maison' && leafId === 'pur_oiseaux') return 'tools.tsaraat_next_house';
    return '';
}

function tsaVerdictCard(support, leafId, leaf) {
    const v = TsaraatData.VERDICTS[leaf.verdict];
    const card = tsaNode('article', 'tool-result tsa-verdict is-' + leaf.verdict);
    const head = tsaNode('div', 'tsa-verdict-head');
    head.appendChild(tsaNode('span', 'tsa-verdict-icon', v.icon));
    head.appendChild(tsaNode('strong', 'tsa-verdict-title', v.fr));
    card.appendChild(head);
    if (leaf.short !== v.fr) card.appendChild(tsaNode('p', 'tsa-verdict-short', leaf.short));
    card.appendChild(tsaNode('p', 'tool-small', leaf.text));
    card.appendChild(tsaNode('h3', 'tool-h', t('tools.tsaraat_todo')));
    card.appendChild(tsaList(leaf.todo));
    if (leaf.later) {
        card.appendChild(tsaNode('h3', 'tool-h', t('tools.tsaraat_later')));
        card.appendChild(tsaNode('p', 'tool-small', leaf.later));
    }
    if (leaf.trad) card.appendChild(tsaNode('p', 'tool-small tsa-trad', t('tools.tsaraat_trad')));
    card.appendChild(tsaNode('p', 'tool-small kor-ref', t('tools.tsaraat_source', { ref: leaf.ref })));
    const link = tsaAfterLink(support, leafId, leaf);
    if (link) {
        const btn = tsaButton('btn tsa-after', t(link), () => tsaPick('ensuite'));
        btn.id = 'tsa-after';
        card.appendChild(btn);
    }
    return card;
}

function tsaQuestionCard(support, node) {
    const card = tsaNode('article', 'tool-result tsa-question');
    card.appendChild(tsaNode('span', 'tsa-question-day', t('tools.tsaraat_day', { n: node.day })));
    card.appendChild(tsaNode('p', 'tsa-question-text', node.q));
    if (node.note) card.appendChild(tsaNode('p', 'tool-small', node.note));
    if (node.trad) card.appendChild(tsaNode('p', 'tool-small tsa-trad', t('tools.tsaraat_trad')));
    card.appendChild(tsaNode('p', 'tool-small kor-ref', t('tools.tsaraat_source', { ref: node.ref })));
    const opts = tsaNode('div', 'tsa-options');
    node.options.forEach((opt, i) => {
        const btn = tsaButton('tsa-option', TsaraatCore.observation(node, opt), () => tsaChoose(i));
        btn.dataset.option = String(i);
        opts.appendChild(btn);
    });
    card.appendChild(opts);
    return card;
}

// L'arbre en entier, replié : pour étudier d'un coup d'œil sans répondre aux questions.
function tsaTreeList(support, nodeId) {
    const node = support.nodes[nodeId];
    const ul = tsaNode('ul', 'tsa-tree');
    node.options.forEach(opt => {
        const target = support.nodes[opt.to];
        const li = tsaNode('li', 'tsa-tree-item');
        li.appendChild(tsaNode('span', 'tsa-tree-obs', TsaraatCore.observation(node, opt)));
        if (TsaraatCore.isLeaf(target)) {
            li.appendChild(tsaNode('strong', 'tsa-tree-leaf is-' + target.verdict, ' → ' + TsaraatData.VERDICTS[target.verdict].icon + ' ' + target.short));
        } else {
            li.appendChild(tsaNode('span', 'tsa-tree-next', ' → ' + t('tools.tsaraat_day', { n: target.day }) + ' : ' + target.action));
            li.appendChild(tsaTreeList(support, opt.to));
        }
        ul.appendChild(li);
    });
    return ul;
}

function tsaRenderParcours(body) {
    const chips = tsaNode('div', 'tool-history-chips is-scroll tsa-supports');
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', t('tools.tsaraat_supports_aria'));
    TsaraatData.SUPPORTS.forEach(s => {
        const chip = tsaButton('tool-history-chip', s.fr, () => tsaSelectSupport(s.id));
        chip.dataset.support = s.id;
        chip.setAttribute('aria-pressed', s.id === tsaState.support ? 'true' : 'false');
        chips.appendChild(chip);
    });
    body.appendChild(chips);

    const support = tsaSupport();
    const head = tsaNode('div', 'tsa-support-head');
    head.appendChild(tsaHebrew('strong', support.he, 'kor-he'));
    head.appendChild(tsaNode('span', 'tool-small kor-ref', support.ref));
    body.appendChild(head);
    body.appendChild(tsaNode('p', 'tool-small', support.lead));
    body.appendChild(tsaTimeline(support.id));

    const w = TsaraatCore.walk(support.id, tsaState.choices);
    if (w.steps.length) body.appendChild(tsaTrail(support, w.steps));
    if (w.done) body.appendChild(tsaVerdictCard(support, w.nodeId, w.node));
    else body.appendChild(tsaQuestionCard(support, w.node));

    const nav = tsaNode('div', 'kor-step-nav tsa-nav');
    const back = tsaButton('btn btn-secondary', t('tools.tsaraat_back'), tsaBack);
    back.id = 'tsa-back';
    back.disabled = !tsaState.choices.length;
    const restart = tsaButton('btn btn-secondary', t('tools.tsaraat_restart'), tsaRestart);
    restart.id = 'tsa-restart';
    restart.disabled = !tsaState.choices.length;
    nav.appendChild(back);
    nav.appendChild(restart);
    body.appendChild(nav);

    if (support.id === 'maison') {
        const rules = tsaNode('article', 'tool-result');
        rules.appendChild(tsaNode('h3', 'tool-h', t('tools.tsaraat_house_rules')));
        rules.appendChild(tsaList(TsaraatData.HOUSE_RULES.map(r => r.t)));
        body.appendChild(rules);
    }

    const details = tsaNode('details', 'kor-details tsa-tree-details');
    details.appendChild(tsaNode('summary', '', t('tools.tsaraat_tree')));
    details.appendChild(tsaTreeList(support, 'start'));
    body.appendChild(details);
}

// =====================================================================================================================================
// === 2. LES COULEURS ===
// =====================================================================================================================================
function tsaColorRow(label, swatch, extra) {
    const row = tsaNode('div', 'tsa-color-row');
    const dot = tsaNode('span', 'tsa-swatch');
    dot.style.backgroundColor = swatch;
    dot.setAttribute('aria-hidden', 'true');
    row.appendChild(dot);
    const text = tsaNode('span', 'tsa-color-text');
    text.appendChild(tsaNode('strong', '', label));
    if (extra) text.appendChild(extra);
    row.appendChild(text);
    return row;
}

function tsaRenderColors(body) {
    const C = TsaraatData.COLORS;

    const skin = tsaNode('article', 'tool-result');
    skin.appendChild(tsaNode('h3', 'tool-h', t('tools.tsaraat_colors_skin')));
    C.skin.forEach((c, i) => {
        const extra = tsaNode('span', 'tool-small');
        extra.appendChild(tsaHebrew('span', c.he, 'tsa-color-he'));
        extra.appendChild(document.createTextNode(' · ' + t(c.derived ? 'tools.tsaraat_colors_derived' : 'tools.tsaraat_colors_base')));
        skin.appendChild(tsaColorRow(c.t, TSA_SWATCH.skin[i], extra));
    });
    skin.appendChild(tsaNode('p', 'tool-small', C.skinNote));
    skin.appendChild(tsaNode('p', 'tool-small tsa-trad', t('tools.tsaraat_colors_trad')));
    body.appendChild(skin);

    [['clothes', 'tools.tsaraat_colors_clothes'], ['houses', 'tools.tsaraat_colors_houses']].forEach(pair => {
        const card = tsaNode('article', 'tool-result');
        card.appendChild(tsaNode('h3', 'tool-h', t(pair[1])));
        C[pair[0]].forEach((c, i) => {
            card.appendChild(tsaColorRow(c.t, TSA_SWATCH[pair[0]][i], tsaNode('span', 'tool-small kor-ref', t('tools.tsaraat_source', { ref: c.ref }))));
        });
        body.appendChild(card);
    });
}

// =====================================================================================================================================
// === 3. ET ENSUITE ? ===
// =====================================================================================================================================
function tsaRenderAfter(body) {
    const list = tsaNode('ol', 'tsa-steps');
    TsaraatData.PURIFICATION.forEach(step => {
        const li = tsaNode('li', 'tool-result tsa-step');
        li.dataset.step = step.id;
        const head = tsaNode('div', 'tsa-step-head');
        head.appendChild(tsaNode('span', 'tsa-step-day', step.day === null ? t('tools.tsaraat_before') : t('tools.tsaraat_day', { n: step.day })));
        head.appendChild(tsaNode('strong', 'tsa-step-title', step.title));
        li.appendChild(head);
        li.appendChild(tsaList(step.lines));
        li.appendChild(tsaNode('p', 'tool-small kor-ref', t('tools.tsaraat_source', { ref: step.ref })));
        list.appendChild(li);
    });
    body.appendChild(list);
    [TsaraatData.POOR, TsaraatData.HOUSE_PURIFICATION].forEach(block => {
        const card = tsaNode('article', 'tool-result tsa-aside');
        card.appendChild(tsaNode('h3', 'tool-h', block.title));
        card.appendChild(tsaList(block.lines));
        card.appendChild(tsaNode('p', 'tool-small kor-ref', t('tools.tsaraat_source', { ref: block.ref })));
        body.appendChild(card);
    });
    const korbanot = tsaButton('tool-history-chip kor-dict', t('tools.tsaraat_to_korbanot'), () => openTool('korbanot', 'screen-tool-tsaraat'));
    korbanot.id = 'tsa-to-korbanot';
    body.appendChild(korbanot);
}

// =====================================================================================================================================
// === 4. COHEN : UN CAS TIRÉ AU SORT ===
// =====================================================================================================================================
function tsaNewCase() {
    tsaCohen.kase = TsaraatCore.makeCase(Math.random, tsaCohen.filter || undefined);
    tsaCohen.picked = null;
    tsaRender();
}

function tsaAnswer(index) {
    if (tsaCohen.picked !== null) return;
    tsaCohen.picked = index;
    tsaCohen.total += 1;
    if (TsaraatCore.checkCase(tsaCohen.kase, index)) tsaCohen.ok += 1;
    tsaRender();
}

function tsaRenderCohen(body) {
    const chips = tsaNode('div', 'tool-history-chips is-scroll tsa-supports');
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', t('tools.tsaraat_supports_aria'));
    [{ id: '', fr: t('tools.tsaraat_filter_all') }].concat(TsaraatData.SUPPORTS).forEach(s => {
        const chip = tsaButton('tool-history-chip', s.fr, () => { tsaCohen.filter = s.id; tsaCohen.kase = null; tsaRender(); });
        chip.dataset.filter = s.id;
        chip.setAttribute('aria-pressed', s.id === tsaCohen.filter ? 'true' : 'false');
        chips.appendChild(chip);
    });
    body.appendChild(chips);

    if (!tsaCohen.kase) tsaCohen.kase = TsaraatCore.makeCase(Math.random, tsaCohen.filter || undefined);
    const kase = tsaCohen.kase;
    const support = TsaraatCore.SUPPORT_BY_ID[kase.support];
    const answered = tsaCohen.picked !== null;

    body.appendChild(tsaNode('p', 'tool-small tsa-score', t('tools.tsaraat_score', { ok: tsaCohen.ok, total: tsaCohen.total })));

    const card = tsaNode('article', 'tool-result tsa-case');
    const head = tsaNode('div', 'tsa-support-head');
    head.appendChild(tsaHebrew('strong', support.he, 'kor-he-small'));
    head.appendChild(tsaNode('span', 'tsa-case-support', support.fr));
    card.appendChild(head);
    if (kase.story.length) {
        card.appendChild(tsaNode('h3', 'tool-h', t('tools.tsaraat_story')));
        const ol = tsaNode('ol', 'tsa-trail');
        kase.story.forEach(s => {
            const li = tsaNode('li', 'tsa-trail-step');
            li.appendChild(tsaNode('span', 'tsa-trail-day', t('tools.tsaraat_day', { n: s.day })));
            li.appendChild(tsaNode('span', 'tsa-trail-text', s.text));
            ol.appendChild(li);
        });
        card.appendChild(ol);
    }
    card.appendChild(tsaNode('span', 'tsa-question-day', t('tools.tsaraat_day', { n: kase.day })));
    card.appendChild(tsaNode('p', 'tsa-question-text', kase.observation));
    card.appendChild(tsaNode('p', 'tool-small', t('tools.tsaraat_case_ask')));
    const opts = tsaNode('div', 'tsa-options');
    kase.choices.forEach((label, i) => {
        let cls = 'tsa-option';
        if (answered && i === kase.answer) cls += ' is-right';
        else if (answered && i === tsaCohen.picked) cls += ' is-wrong';
        const btn = tsaButton(cls, label, () => tsaAnswer(i));
        btn.dataset.choice = String(i);
        btn.disabled = answered;
        opts.appendChild(btn);
    });
    card.appendChild(opts);
    body.appendChild(card);

    if (answered) {
        const right = TsaraatCore.checkCase(kase, tsaCohen.picked);
        const fb = tsaNode('article', 'tool-result tsa-feedback ' + (right ? 'is-right' : 'is-wrong'));
        fb.id = 'tsa-feedback';
        fb.setAttribute('role', 'status');
        fb.appendChild(tsaNode('strong', 'tsa-feedback-title', (right ? '✅ ' : '❌ ') + t(right ? 'tools.tsaraat_right' : 'tools.tsaraat_wrong')));
        fb.appendChild(tsaNode('p', 'tool-small', t('tools.tsaraat_answer_is', { label: kase.explain.label })));
        if (kase.leaf) fb.appendChild(tsaNode('p', 'tool-small', kase.explain.text));
        if (kase.explain.trad) fb.appendChild(tsaNode('p', 'tool-small tsa-trad', t('tools.tsaraat_trad')));
        fb.appendChild(tsaNode('p', 'tool-small kor-ref', t('tools.tsaraat_source', { ref: kase.explain.ref })));
        body.appendChild(fb);
        const next = tsaButton('btn', t('tools.tsaraat_next_case'), tsaNewCase);
        next.id = 'tsa-next-case';
        body.appendChild(next);
    }
}

// =====================================================================================================================================
// === 5. LES MOTS ===
// =====================================================================================================================================
function tsaRenderWords(body) {
    TsaraatData.GLOSSARY.forEach(g => {
        const card = tsaNode('article', 'tool-result tsa-word');
        const head = tsaNode('div', 'sta-card-head');
        head.appendChild(tsaHebrew('strong', g.he, 'kor-he'));
        head.appendChild(tsaNode('span', 'sta-name', g.fr));
        card.appendChild(head);
        card.appendChild(tsaNode('p', 'tool-small', g.text));
        body.appendChild(card);
    });
}
