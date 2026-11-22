// =========================================================================
// === LE MACHIAH ET LA RÉSURRECTION DES MORTS (écran d'Étude) ===
// =========================================================================
// Cinq onglets : (1) qui est le Machiah et les versets fondateurs ; (2) comment le reconnaître, avec les critères du Rambam à cocher ; (3) les huit étapes de la
// venue, à filtrer par niveau ; (4) la résurrection (sources, moment, comparaison Rambam / autres opinions) ; (5) ce que l'on ne sait pas. Chaque élément porte
// un badge « Consensus », « Opinion » ou « Tradition » : on ne confond pas ce que toute la tradition admet avec la position d'un maître ou un récit d'aggada.
// Les données sont dans js/messiahData.js, les règles dans js/messiahCore.js (testées), les textes de l'écran sous `tools.mes_*` de ui/fr.json.
// Outil d'étude, pas une décision de halakha. Tout passe par textContent, jamais par du HTML.

const MES_TABS = ['qui', 'reconnaitre', 'etapes', 'resurrection', 'cache'];
let mesTab = 'qui';
const mesState = { level: 'all', checked: [], failed: false };

function toolMessiahInit() {
    mesTab = 'qui';
    mesState.level = 'all';
    mesState.checked = [];
    mesState.failed = false;
    mesRender();
}

function mesPick(tab) {
    mesTab = MES_TABS.indexOf(tab) >= 0 ? tab : 'qui';
    mesRender();
    const screen = toolEl('screen-tool-messiah');
    if (screen) screen.scrollTop = 0;
}

function mesNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function mesHebrew(tag, text, className) {
    const el = mesNode(tag, className, text);
    el.lang = 'he';
    el.dir = 'rtl';
    return el;
}

function mesBadge(level) {
    const b = mesNode('span', 'kor-tag mes-badge mes-badge-' + level, t('tools.mes_level_' + level));
    b.dataset.level = level;
    return b;
}

function mesRender() {
    const tabs = toolEl('tool-mes-tabs');
    toolClear(tabs);
    MES_TABS.forEach(id => {
        const btn = mesNode('button', 'tool-history-chip', t('tools.mes_tab_' + id));
        btn.type = 'button';
        btn.id = 'tool-mes-tab-' + id;
        btn.setAttribute('aria-pressed', id === mesTab ? 'true' : 'false');
        btn.onclick = () => mesPick(id);
        tabs.appendChild(btn);
    });
    const body = toolEl('tool-mes-body');
    toolClear(body);
    body.appendChild(mesNode('p', 'tool-small', t('tools.mes_lead_' + mesTab)));
    ({ qui: mesRenderWho, reconnaitre: mesRenderRecognize, etapes: mesRenderSteps, resurrection: mesRenderResurrection, cache: mesRenderHidden }[mesTab])(body);
}

// Une carte : un mot hébreu, un titre, un badge, un texte, une référence.
function mesCard(item) {
    const card = mesNode('article', 'tool-result kor-type');
    card.dataset.row = item.id;
    const head = mesNode('div', 'kor-type-head');
    if (item.he) head.appendChild(mesHebrew('strong', item.he, 'kor-he'));
    if (item.fr) head.appendChild(mesNode('span', 'kor-type-name', item.fr));
    card.appendChild(head);
    if (item.level) {
        const tags = mesNode('div', 'kor-tags');
        tags.appendChild(mesBadge(item.level));
        card.appendChild(tags);
    }
    if (item.text) card.appendChild(mesNode('p', 'tool-small', item.text));
    if (item.ref) card.appendChild(mesNode('p', 'tool-small kor-ref', item.ref));
    return card;
}

// --- 1. Qui est-il ? ---------------------------------------------------------------------------------------------------------------
function mesRenderWho(body) {
    const D = MessiahData;
    const main = mesNode('article', 'tool-result kor-type mes-def');
    const head = mesNode('div', 'kor-type-head');
    head.appendChild(mesHebrew('strong', D.DEFINITION.he, 'kor-he'));
    main.appendChild(head);
    const tags = mesNode('div', 'kor-tags');
    tags.appendChild(mesBadge('consensus'));
    main.appendChild(tags);
    main.appendChild(mesNode('p', 'tool-small', D.DEFINITION.fr));
    main.appendChild(mesNode('p', 'tool-small', D.DEFINITION.principle));
    main.appendChild(mesNode('p', 'tool-small kor-ref', D.DEFINITION.ref));
    body.appendChild(main);
    body.appendChild(mesNode('h3', 'kor-group-title', t('tools.mes_verses_title')));
    D.VERSES.forEach(v => body.appendChild(mesCard(v)));
    body.appendChild(mesLegend());
}

// La légende des trois niveaux, en bas de chaque onglet qui en porte.
function mesLegend() {
    const details = mesNode('details', 'kor-details mes-legend');
    details.appendChild(mesNode('summary', '', t('tools.mes_legend_title')));
    MessiahData.LEVELS.forEach(level => {
        const row = mesNode('p', 'tool-small');
        row.appendChild(mesBadge(level));
        row.appendChild(document.createTextNode(' ' + t('tools.mes_legend_' + level)));
        details.appendChild(row);
    });
    return details;
}

// --- 2. Le reconnaître -------------------------------------------------------------------------------------------------------------
function mesRenderRecognize(body) {
    const C = MessiahData.CRITERIA;
    C.stages.forEach((stage, index) => {
        const group = mesNode('section', 'kor-section');
        const head = mesNode('div', 'kor-type-head');
        head.appendChild(mesHebrew('strong', stage.he, 'kor-he'));
        head.appendChild(mesNode('span', 'kor-type-name', t('tools.mes_stage_' + stage.id)));
        group.appendChild(head);
        stage.items.forEach(item => {
            const label = mesNode('label', 'kor-day');
            const input = mesNode('input');
            input.type = 'checkbox';
            input.id = 'mes-crit-' + item.id;
            input.checked = mesState.checked.indexOf(item.id) >= 0;
            input.onchange = () => {
                const i = mesState.checked.indexOf(item.id);
                if (input.checked && i < 0) mesState.checked.push(item.id);
                if (!input.checked && i >= 0) mesState.checked.splice(i, 1);
                mesUpdateVerdict();
            };
            label.appendChild(input);
            label.appendChild(mesNode('span', 'kor-day-text', item.text));
            group.appendChild(label);
        });
        body.appendChild(group);
        if (index === 0) body.appendChild(mesNode('p', 'tool-small kor-ref', t('tools.mes_stage_then')));
    });
    const failed = mesNode('label', 'kor-day');
    const failedInput = mesNode('input');
    failedInput.type = 'checkbox';
    failedInput.id = 'mes-failed';
    failedInput.checked = mesState.failed;
    failedInput.onchange = () => { mesState.failed = failedInput.checked; mesUpdateVerdict(); };
    failed.appendChild(failedInput);
    failed.appendChild(mesNode('span', 'kor-day-text', t('tools.mes_failed_label')));
    body.appendChild(failed);
    const verdict = mesNode('p', 'tool-result mes-verdict', '');
    verdict.id = 'mes-verdict';
    verdict.setAttribute('role', 'status');
    verdict.setAttribute('aria-live', 'polite');
    body.appendChild(verdict);
    body.appendChild(mesNode('p', 'tool-small', C.failure));
    body.appendChild(mesNode('p', 'tool-small', C.perfect));
    body.appendChild(mesNode('p', 'tool-small kor-ref', C.ref));
    body.appendChild(mesNode('p', 'tool-small', t('tools.mes_no_miracle')));
    mesUpdateVerdict();
}

function mesUpdateVerdict() {
    const el = toolEl('mes-verdict');
    if (!el) return;
    const r = MessiahCore.assess(mesState.checked, { failed: mesState.failed });
    el.dataset.verdict = r.verdict;
    el.textContent = t('tools.mes_verdict_' + r.verdict);
}

// --- 3. Les étapes -----------------------------------------------------------------------------------------------------------------
function mesRenderSteps(body) {
    const chips = mesNode('div', 'tool-history-chips');
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', t('tools.mes_filter_aria'));
    ['all'].concat(MessiahData.LEVELS).forEach(level => {
        const btn = mesNode('button', 'tool-history-chip', t(level === 'all' ? 'tools.mes_filter_all' : 'tools.mes_level_' + level));
        btn.type = 'button';
        btn.id = 'mes-filter-' + level;
        btn.setAttribute('aria-pressed', level === mesState.level ? 'true' : 'false');
        btn.onclick = () => { mesState.level = level; mesRender(); };
        chips.appendChild(btn);
    });
    body.appendChild(chips);
    const steps = MessiahCore.stepsByLevel(mesState.level);
    const list = mesNode('div', 'kor-list mes-steps');
    list.id = 'mes-steps';
    steps.forEach(s => {
        const details = mesNode('details', 'kor-details mes-step');
        details.dataset.row = s.id;
        const summary = mesNode('summary', 'mes-step-sum');
        summary.appendChild(mesNode('span', 'mes-step-n', String(s.n)));
        summary.appendChild(mesNode('span', 'mes-step-title', s.fr));
        summary.appendChild(mesBadge(s.level));
        details.appendChild(summary);
        details.appendChild(mesHebrew('p', s.he, 'kor-he'));
        details.appendChild(mesNode('p', 'tool-small', s.text));
        s.opinions.forEach(o => {
            const p = mesNode('p', 'tool-small');
            p.appendChild(mesNode('strong', '', o.who + ' : '));
            p.appendChild(document.createTextNode(o.text));
            details.appendChild(p);
        });
        if (s.refs) details.appendChild(mesNode('p', 'tool-small kor-ref', s.refs));
        list.appendChild(details);
    });
    body.appendChild(list);
    body.appendChild(mesNode('p', 'tool-msg', steps.length ? t('tools.mes_count', { n: steps.length, total: MessiahData.STEPS.length }) : t('tools.mes_none')));
    const refs = mesNode('details', 'kor-details');
    refs.appendChild(mesNode('summary', '', t('tools.mes_refs_title')));
    refs.appendChild(mesNode('p', 'tool-small', t('tools.mes_refs_lead')));
    MessiahData.TALMUD_REFS.forEach(r => {
        const p = mesNode('p', 'tool-small');
        p.appendChild(mesNode('strong', '', r.ref + ' : '));
        p.appendChild(document.createTextNode(r.object));
        refs.appendChild(p);
    });
    body.appendChild(refs);
    body.appendChild(mesLegend());
}

// --- 4. La résurrection ------------------------------------------------------------------------------------------------------------
function mesRenderResurrection(body) {
    const R = MessiahData.RESURRECTION;
    body.appendChild(mesNode('p', 'tool-small', R.principle));
    body.appendChild(mesNode('h3', 'kor-group-title', t('tools.mes_res_sources')));
    R.sources.forEach(s => body.appendChild(mesCard(s)));

    body.appendChild(mesNode('h3', 'kor-group-title', t('tools.mes_res_when')));
    const when = mesNode('article', 'tool-result kor-type');
    const wtags = mesNode('div', 'kor-tags');
    wtags.appendChild(mesBadge('opinion'));
    when.appendChild(wtags);
    when.appendChild(mesNode('p', 'tool-small', R.when.rambam));
    when.appendChild(mesNode('p', 'tool-small', R.when.note));
    when.appendChild(mesNode('p', 'tool-small kor-ref', R.when.ref));
    body.appendChild(when);

    body.appendChild(mesNode('h3', 'kor-group-title', t('tools.mes_res_traditions')));
    const trad = mesNode('article', 'tool-result kor-type');
    const ttags = mesNode('div', 'kor-tags');
    ttags.appendChild(mesBadge('tradition'));
    trad.appendChild(ttags);
    R.traditions.forEach(x => trad.appendChild(mesNode('p', 'tool-small', x.text)));
    trad.appendChild(mesNode('p', 'tool-small', R.traditionsNote));
    body.appendChild(trad);

    body.appendChild(mesNode('h3', 'kor-group-title', t('tools.mes_res_who')));
    body.appendChild(mesNode('p', 'tool-small', R.who));

    body.appendChild(mesNode('h3', 'kor-group-title', t('tools.mes_res_compare')));
    R.compare.forEach(row => {
        const card = mesNode('article', 'tool-result kor-type mes-compare');
        card.dataset.row = row.id;
        card.appendChild(mesNode('strong', 'kor-type-name', t('tools.mes_cmp_' + row.id)));
        const a = mesNode('p', 'tool-small');
        a.appendChild(mesNode('strong', '', t('tools.mes_cmp_rambam') + ' : '));
        a.appendChild(document.createTextNode(row.rambam));
        const b = mesNode('p', 'tool-small');
        b.appendChild(mesNode('strong', '', t('tools.mes_cmp_other') + ' : '));
        b.appendChild(document.createTextNode(row.other));
        card.appendChild(a);
        card.appendChild(b);
        body.appendChild(card);
    });
    body.appendChild(mesNode('p', 'tool-small', R.safe));
    body.appendChild(mesLegend());
}

// --- 5. Ce qu'on ne sait pas -------------------------------------------------------------------------------------------------------
function mesRenderHidden(body) {
    MessiahData.HIDDEN.forEach(h => body.appendChild(mesCard({ id: h.id, text: h.text, ref: h.ref })));
}
