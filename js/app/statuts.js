// =========================================================================
// === STATUTS ET UNIONS (écran de l'Atelier, groupe « Bible et tradition ») ===
// =========================================================================
// Deux onglets : (1) le catalogue des statuts personnels (cohen, lévi, israël, 'halal, mamzer, guer, divorcée, veuve…), par famille, chaque fiche
// avec sa source dans le Rambam ; (2) le triangle : on choisit le statut du père (en haut à gauche) et de la mère (en haut à droite), et l'écran dit si
// l'union est permise, si les kidouchin prennent, et quel est le statut de l'enfant (en bas), avec la raison et la source de chaque réponse.
// Les données sont dans js/statutsData.js, les calculs dans js/statutsCore.js (testés), les textes de l'écran sous `tools.statuts_*` de ui/fr.json.
// Outil d'étude du Rambam (Hilkhot Issouré Biah), pas une décision halakhique. Tout passe par textContent, jamais par du HTML.

const STA_TABS = ['catalogue', 'triangle'];
let staTab = 'catalogue';
const staState = { father: '', mother: '' };

function toolStatutsInit() {
    staTab = 'catalogue';
    staRender();
}

function staPick(tab) {
    staTab = STA_TABS.indexOf(tab) >= 0 ? tab : 'catalogue';
    staRender();
    const screen = toolEl('screen-tool-statuts');
    if (screen) screen.scrollTop = 0;
}

// --- Briques communes -------------------------------------------------------------------------------------------------------------
function staNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function staHebrew(tag, text, className) {
    const el = staNode(tag, className, text);
    el.lang = 'he';
    el.dir = 'rtl';
    return el;
}

// Le nom hébreu d'un statut d'enfant ou de parent : « כהן / בת כהן » quand les deux formes existent, selon le rôle demandé.
function staHebrewName(id, form) {
    const s = StatutsCore.BY_ID[id];
    if (!s) return '';
    if (form === 'f') return s.heF || s.he;
    if (form === 'm') return s.he;
    return s.heF && s.heF !== s.he ? s.he + ' / ' + s.heF : s.he;
}

function staRender() {
    const tabs = toolEl('tool-statuts-tabs');
    toolClear(tabs);
    STA_TABS.forEach(id => {
        const btn = staNode('button', 'tool-history-chip', t('tools.statuts_tab_' + id));
        btn.type = 'button';
        btn.id = 'tool-statuts-tab-' + id;
        btn.setAttribute('aria-pressed', id === staTab ? 'true' : 'false');
        btn.onclick = () => staPick(id);
        tabs.appendChild(btn);
    });
    const body = toolEl('tool-statuts-body');
    toolClear(body);
    body.appendChild(staNode('p', 'tool-small', t('tools.statuts_lead_' + staTab)));
    ({ catalogue: staRenderCatalogue, triangle: staRenderTriangle })[staTab](body);
    body.appendChild(staNode('p', 'tool-small sta-caveat', t('tools.statuts_caveat')));
}

// =====================================================================================================================================
// === 1. LE CATALOGUE ===
// =====================================================================================================================================
function staTry(id, role) {
    staState[role] = id;
    staPick('triangle');
}

function staCard(s) {
    const card = staNode('article', 'tool-result sta-card');
    card.dataset.status = s.id;
    const head = staNode('div', 'sta-card-head');
    head.appendChild(staHebrew('strong', staHebrewName(s.id), 'kor-he'));
    const names = staNode('span', 'sta-name', s.fr + (s.frF && s.frF !== s.fr ? ' · ' + s.frF : ''));
    head.appendChild(names);
    card.appendChild(head);
    const inTriangle = s.father || s.mother;
    const tags = staNode('div', 'kor-tags');
    tags.appendChild(staNode('span', 'kor-tag' + (inTriangle ? ' sta-tag-in' : ''), t(inTriangle ? 'tools.statuts_in_triangle' : 'tools.statuts_catalogue_only')));
    card.appendChild(tags);
    card.appendChild(staNode('p', 'tool-small', s.summary));
    card.appendChild(staNode('p', 'tool-small kor-ref', s.ref));
    if (s.skip) card.appendChild(staNode('p', 'tool-small sta-skip', t('tools.statuts_skip', { why: s.skip })));
    if (inTriangle) {
        const row = staNode('div', 'sta-try');
        [['father', 'tools.statuts_try_father'], ['mother', 'tools.statuts_try_mother']].forEach(pair => {
            if (!s[pair[0]]) return;
            const btn = staNode('button', 'tool-history-chip sta-try-btn', t(pair[1]));
            btn.type = 'button';
            btn.dataset.role = pair[0];
            btn.onclick = () => staTry(s.id, pair[0]);
            row.appendChild(btn);
        });
        card.appendChild(row);
    }
    return card;
}

function staRenderCatalogue(body) {
    StatutsData.GROUPS.forEach(g => {
        const members = StatutsData.STATUSES.filter(s => s.group === g.id);
        if (!members.length) return;
        const section = staNode('section', 'sta-group');
        section.appendChild(staNode('h3', 'tool-h sta-group-title', g.fr));
        section.appendChild(staNode('p', 'tool-small', g.lead));
        members.forEach(s => section.appendChild(staCard(s)));
        body.appendChild(section);
    });
}

// =====================================================================================================================================
// === 2. LE TRIANGLE ===
// =====================================================================================================================================
// Un sélecteur de statut, rangé par famille. `role` : 'father' ou 'mother' ; la mère s'affiche à la forme féminine.
function staPicker(role) {
    const female = role === 'mother';
    const wrap = staNode('label', 'sta-role sta-role-' + role);
    wrap.appendChild(staNode('span', 'sta-role-title', t(female ? 'tools.statuts_mother' : 'tools.statuts_father')));
    const select = staNode('select', 'tool-input sta-select');
    select.id = 'sta-' + role;
    const none = staNode('option', '', t('tools.statuts_choose'));
    none.value = '';
    select.appendChild(none);
    const list = female ? StatutsCore.MOTHERS : StatutsCore.FATHERS;
    StatutsData.GROUPS.forEach(g => {
        const members = list.filter(s => s.group === g.id);
        if (!members.length) return;
        const og = staNode('optgroup');
        og.label = g.fr;
        members.forEach(s => {
            const opt = staNode('option', '', StatutsCore.label(s.id, female));
            opt.value = s.id;
            og.appendChild(opt);
        });
        select.appendChild(og);
    });
    select.value = staState[role];
    select.onchange = () => { staState[role] = select.value; staRenderResult(); };
    wrap.appendChild(select);
    const he = staHebrew('span', '', 'sta-he');
    he.id = 'sta-he-' + role;
    wrap.appendChild(he);
    return wrap;
}

// Les deux traits qui relient le père et la mère à l'enfant : un triangle.
function staTriangleLines() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'sta-lines');
    svg.setAttribute('viewBox', '0 0 100 40');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    [['25', '0', '50', '40'], ['75', '0', '50', '40']].forEach(p => {
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', p[0]); line.setAttribute('y1', p[1]); line.setAttribute('x2', p[2]); line.setAttribute('y2', p[3]);
        line.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.appendChild(line);
    });
    return svg;
}

function staRenderTriangle(body) {
    const tri = staNode('div', 'sta-triangle');
    const top = staNode('div', 'sta-top');
    top.appendChild(staPicker('father'));
    top.appendChild(staPicker('mother'));
    tri.appendChild(top);

    const mid = staNode('div', 'sta-middle');
    mid.appendChild(staTriangleLines());
    const verdict = staNode('div', 'sta-verdict');
    verdict.id = 'sta-verdict';
    verdict.setAttribute('role', 'status');
    verdict.setAttribute('aria-live', 'polite');
    mid.appendChild(verdict);
    tri.appendChild(mid);

    const child = staNode('div', 'tool-result sta-child');
    child.id = 'sta-child';
    tri.appendChild(child);
    body.appendChild(tri);

    const why = staNode('div', 'sta-why');
    why.id = 'sta-why';
    body.appendChild(why);

    const reset = staNode('button', 'tool-history-chip kor-reset', t('tools.statuts_reset'));
    reset.type = 'button';
    reset.id = 'sta-reset';
    reset.onclick = () => { staState.father = ''; staState.mother = ''; staRender(); };
    body.appendChild(reset);

    staRenderResult();
}

// Une raison ou une note : le texte, puis sa source.
function staReasonItem(x) {
    const li = staNode('li', 'sta-reason');
    li.appendChild(staNode('span', '', x.fr));
    if (x.ref) li.appendChild(staNode('small', 'tool-small kor-ref', x.ref));
    return li;
}

function staWhyBlock(titleKey, items, className) {
    if (!items.length) return null;
    const block = staNode('section', 'tool-result sta-why-block' + (className ? ' ' + className : ''));
    block.appendChild(staNode('h3', 'tool-h', t(titleKey)));
    const ul = staNode('ul', 'sta-reasons');
    items.forEach(x => ul.appendChild(staReasonItem(x)));
    block.appendChild(ul);
    return block;
}

function staRenderResult() {
    const verdict = toolEl('sta-verdict');
    const child = toolEl('sta-child');
    const why = toolEl('sta-why');
    [verdict, child, why].forEach(toolClear);
    verdict.className = 'sta-verdict';
    ['father', 'mother'].forEach(role => {
        const he = toolEl('sta-he-' + role);
        he.textContent = staState[role] ? staHebrewName(staState[role], role === 'mother' ? 'f' : 'm') : '';
    });

    child.appendChild(staNode('span', 'sta-role-title', t('tools.statuts_child')));
    if (!staState.father || !staState.mother) {
        verdict.appendChild(staNode('span', 'sta-verdict-text', t('tools.statuts_hint')));
        child.appendChild(staNode('p', 'sta-child-name', '—'));
        return;
    }

    const res = StatutsCore.evaluate(staState.father, staState.mother);
    const e = StatutsCore.explain(res);

    if (res.scope === 'hors-champ') {
        verdict.classList.add('is-out');
        verdict.appendChild(staNode('span', 'sta-verdict-text', t('tools.statuts_out')));
        child.appendChild(staNode('p', 'sta-child-name', '—'));
        const block = staWhyBlock('tools.statuts_why_notes', e.notes);
        if (block) why.appendChild(block);
        return;
    }

    const level = res.union.level;
    verdict.classList.add('is-' + level);
    verdict.dataset.level = level;
    verdict.appendChild(staNode('span', 'sta-verdict-icon', { permise: '✅', rabbinique: '⚠️', lav: '⛔', erva: '⛔' }[level]));
    verdict.appendChild(staNode('span', 'sta-verdict-text', t('tools.statuts_verdict_' + level)));
    verdict.appendChild(staNode('small', 'tool-small', t('tools.statuts_kiddushin', { v: t('tools.statuts_kiddushin_' + res.kiddushin) })));

    child.dataset.status = res.child.status;
    child.appendChild(staNode('p', 'sta-child-name', StatutsCore.childLabel(res.child.status)));
    child.appendChild(staHebrew('p', staHebrewName(res.child.status), 'kor-he sta-child-he'));
    child.appendChild(staNode('p', 'tool-small', t('tools.statuts_rule_' + res.rule)));

    [staWhyBlock('tools.statuts_why_union', e.union), staWhyBlock('tools.statuts_why_child', e.child), staWhyBlock('tools.statuts_why_notes', e.notes, 'sta-notes')]
        .forEach(block => { if (block) why.appendChild(block); });
}
