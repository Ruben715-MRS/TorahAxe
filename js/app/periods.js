// =========================================================================
// === PÉRIODES ET USAGES (écran de l'onglet Explorer, « Lois et pratique ») ===
// =========================================================================
// Ce qui est interdit, permis ou obligatoire à certains moments de l'année (le Omer, les Trois Semaines, Yom Kippour), selon le rite du profil (Réglages) et,
// pour quelques règles, selon qu'on est un homme ou une femme. Deux vues : la liste des périodes (celle qui est en cours d'abord), puis le détail d'une période
// (sous-périodes, filtre par statut, règles groupées par rubrique, usage des autres rites). Les données sont dans js/periodsData.js, les calculs dans
// js/periodsCore.js (testés), les textes de l'écran sous `tools.per_*` de ui/fr.json. Le champ « à faire relire » des données n'est jamais affiché.
// Outil d'étude, pas une décision de halakha. Tout passe par textContent, jamais par du HTML.

const perState = { id: null, phase: null, filter: 'all', direct: false };

function perNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function perHebrew(tag, text, className) {
    const el = perNode(tag, className, text);
    el.lang = 'he';
    el.dir = 'rtl';
    return el;
}

// Le jour et le lieu de l'accueil (le jour hébraïque change à la sortie des étoiles) ; sans eux, le jour de l'appareil.
function perDay() {
    try {
        if (typeof homeDay === 'function') {
            const d = homeDay();
            return { fixed: d.ctx.fixed, israel: d.israel };
        }
    } catch (e) { /* on se rabat sur l'appareil */ }
    const d = new Date();
    return { fixed: CalendarYearCore.gregorianToFixed(d.getFullYear(), d.getMonth() + 1, d.getDate()), israel: typeof profileIsrael === 'function' ? profileIsrael(null) : false };
}

function perCtx(day) {
    const d = day || perDay();
    return {
        rite: typeof riteFull === 'function' ? riteFull() : 'sefarade',
        sex: typeof profileGender === 'function' ? profileGender() : null,
        israel: d.israel, fixed: d.fixed
    };
}

function perDateText(fixed) {
    const h = HebrewCalendarCore.hebrewFromFixed(fixed);
    const greg = hcalGregorianText(fixed, { weekday: undefined, day: 'numeric', month: 'short', year: 'numeric' });
    return h.day + ' ' + hcalMonthName(h.year, h.month) + ' (' + greg + ')';
}

function perRangeText(range) {
    if (range.start === range.end) return t('tools.per_dates_one', { start: perDateText(range.start) });
    return t('tools.per_dates', { start: perDateText(range.start), end: perDateText(range.end) });
}

// Le nom de l'occurrence quand une période en regroupe plusieurs : « Jeûne du 10 Tévet », « Roch 'Hodech Kislev ». Sinon vide.
function perOccName(range) {
    const p = PeriodsCore.periodById(range.id);
    if (range.feast && p && p.feasts && p.feasts.length > 1) return t('tools.hcal_f_' + range.feast + '_name');
    if (range.month) return t('tools.per_rc_of', { month: hcalMonthName(range.year, range.month) });
    return '';
}

function perWhenText(s) {
    if (s.state === 'active') return t('tools.per_state_active');
    if (s.daysTo === 1) return t('tools.per_in_one_day');
    return t('tools.per_in_days', { n: s.daysTo });
}

function toolPeriodsInit() {
    perState.id = null;
    perState.direct = false;
    perRender();
}

// Ouvre une période (depuis la carte de l'écran Aujourd'hui) ; « retour » revient alors à l'écran d'où l'on vient.
function openPeriod(id, from) {
    openTool('periods', from);
    perState.direct = true;
    perPick(id);
}

function periodsBack() {
    if (perState.id && !perState.direct) { perShowList(); return; }
    toolBack('periods');
}

function perShowList() {
    perState.id = null;
    perRender();
    const screen = toolEl('screen-tool-periods');
    if (screen) screen.scrollTop = 0;
}

function perPick(id) {
    if (!PeriodsCore.periodById(id)) return;
    const s = PeriodsCore.stateOf(id, perDay().fixed, perCtx());
    perState.id = id;
    perState.phase = s && s.phase ? s.phase : null;   // la sous-période en cours, sinon la première (la vue la choisit)
    perState.filter = 'all';
    perRender();
    const screen = toolEl('screen-tool-periods');
    if (screen) screen.scrollTop = 0;
}

function perRender() {
    const body = toolEl('tool-per-body');
    toolClear(body);
    body.appendChild(perRiteBar());
    if (perState.id) perRenderDetail(body); else perRenderList(body);
}

// Le rite : une bande de trois choix, celle du Guide des bénédictions. C'est le rite du profil (Réglages) : le changer ici le change partout.
function perRiteBar() {
    const wrap = perNode('div', 'per-rite');
    wrap.appendChild(perNode('span', 'tool-small', t('tools.per_rite_label')));
    const bar = perNode('div', 'ben-rites');
    bar.id = 'per-rites';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', t('tools.per_rite_aria'));
    const current = perCtx().rite;
    PeriodsData.RITE_ORDER.forEach(id => {
        const btn = perNode('button', 'ben-rite', PeriodsData.RITES[id].short);
        btn.type = 'button';
        btn.dataset.rite = id;
        btn.setAttribute('aria-pressed', id === current ? 'true' : 'false');
        btn.onclick = () => { if (typeof riteSet === 'function') riteSet(id); if (typeof homeRefresh === 'function') homeRefresh(); perRender(); };
        bar.appendChild(btn);
    });
    wrap.appendChild(bar);
    return wrap;
}

// --- La liste des périodes -------------------------------------------------------------------------------------------------------------------------------

function perRenderList(body) {
    const ctx = perCtx();
    const states = PeriodsCore.listView(ctx.fixed, ctx);
    const sections = [
        { id: 'now', title: t('tools.per_section_now'), items: states.filter(s => s.state !== 'upcoming') },
        { id: 'next', title: t('tools.per_section_next'), items: states.filter(s => s.state === 'upcoming') }
    ];
    sections.forEach(sec => {
        if (!sec.items.length) return;
        body.appendChild(perNode('h4', 'per-group', sec.title));
        const list = perNode('div', 'per-list');
        sec.items.forEach(s => list.appendChild(perCard(s)));
        body.appendChild(list);
    });
    body.appendChild(perNode('p', 'tool-small per-disclaimer', t('tools.per_disclaimer')));
}

function perCard(s) {
    const p = PeriodsCore.periodById(s.id);
    const card = perNode('button', 'per-card' + (s.state === 'active' ? ' is-active' : ''));
    card.type = 'button';
    card.id = 'per-card-' + s.id;
    card.setAttribute('aria-label', t('tools.per_open_aria', { name: p.fr }));
    const head = perNode('div', 'per-card-head');
    head.appendChild(perNode('strong', 'per-card-name', p.fr));
    head.appendChild(perHebrew('span', p.he, 'per-card-he'));
    card.appendChild(head);
    const occ = perOccName(s.range);
    if (occ) card.appendChild(perNode('span', 'per-occ', occ));
    const meta = perNode('div', 'per-card-meta');
    const when = s.state === 'soon' ? t('tools.per_state_soon') + ' · ' + perWhenText(s) : perWhenText(s);
    meta.appendChild(perNode('span', 'per-badge per-badge-' + s.state, when));
    meta.appendChild(perNode('span', 'tool-small', perRangeText(s.range)));
    card.appendChild(meta);
    card.appendChild(perNode('span', 'tool-small', p.sum));
    card.onclick = () => perPick(s.id);
    return card;
}

// --- Le détail d'une période -----------------------------------------------------------------------------------------------------------------------------

function perChip(id, label, pressed, onClick) {
    const btn = perNode('button', 'tool-history-chip', label);
    btn.type = 'button';
    btn.id = id;
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    btn.onclick = onClick;
    return btn;
}

function perRenderDetail(body) {
    const ctx = perCtx();
    const view = PeriodsCore.view(perState.id, { rite: ctx.rite, sex: ctx.sex, phase: perState.phase, filter: perState.filter });
    const state = PeriodsCore.stateOf(perState.id, ctx.fixed, ctx);

    const back = perNode('button', 'final-link per-back', '‹ ' + t('tools.per_all_periods'));
    back.type = 'button';
    back.id = 'per-back-list';
    back.onclick = () => { if (perState.direct) toolBack('periods'); else perShowList(); };
    body.appendChild(back);

    const head = perNode('div', 'per-head');
    head.appendChild(perNode('h3', 'per-title', view.fr));
    head.appendChild(perHebrew('span', view.he, 'per-card-he'));
    body.appendChild(head);
    body.appendChild(perNode('p', 'tool-small', view.lead));
    if (state) {
        const occ = perOccName(state.range);
        if (occ) body.appendChild(perNode('p', 'per-occ', occ));
        body.appendChild(perNode('p', 'tool-small per-dates', perRangeText(state.range)));
        if (view.until) body.appendChild(perNode('p', 'tool-small per-dates', t('tools.per_until', { until: view.until })));
    }

    // Les sous-périodes : un choix, avec leurs dates ; celle qui est en cours est signalée.
    if (view.phases.length) {
        const chips = perNode('div', 'tool-history-chips');
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', t('tools.per_phase_aria'));
        view.phases.forEach(ph => {
            const now = state && state.phase === ph.id;
            chips.appendChild(perChip('per-phase-' + ph.id, ph.short + (now ? ' · ' + t('tools.per_phase_now') : ''), ph.id === view.phase, () => { perState.phase = ph.id; perRender(); }));
        });
        body.appendChild(chips);
        const range = state ? state.range : PeriodsCore.rangeOf(perState.id, HebrewCalendarCore.hebrewFromFixed(ctx.fixed).year, ctx);
        const sub = range && range.phases.filter(x => x.id === view.phase)[0];
        const info = view.phases.filter(x => x.id === view.phase)[0];
        if (sub && info) body.appendChild(perNode('p', 'tool-small per-dates', info.fr + ' : ' + perRangeText(sub)));
    }

    // Le filtre par statut.
    const filters = perNode('div', 'tool-history-chips');
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', t('tools.per_filter_aria'));
    PeriodsData.FILTERS.forEach(f => filters.appendChild(perChip('per-filter-' + f, t('tools.per_filter_' + f), f === perState.filter, () => { perState.filter = f; perRender(); })));
    body.appendChild(filters);

    if (!view.groups.length) body.appendChild(perNode('p', 'tool-small', t('tools.per_empty')));
    view.groups.forEach(g => {
        body.appendChild(perNode('h4', 'per-group', g.grp));
        const rows = perNode('div', 'tool-rows');
        g.items.forEach(item => rows.appendChild(perRule(item)));
        body.appendChild(rows);
    });

    if (view.days.length) {
        body.appendChild(perNode('h4', 'per-group', t('tools.per_days_title')));
        const rows = perNode('div', 'tool-rows');
        view.days.forEach(d => {
            const row = perNode('div', 'tool-row per-day');
            row.appendChild(perNode('strong', '', d.fr));
            row.appendChild(perNode('span', 'per-note', d.text));
            if (d.src) row.appendChild(perNode('small', 'per-src', t('tools.per_src', { src: d.src })));
            rows.appendChild(row);
        });
        body.appendChild(rows);
    }
    body.appendChild(perNode('p', 'tool-small per-disclaimer', t('tools.per_disclaimer')));
}

// Une règle : le statut (symbole et mot : jamais la couleur seule), l'énoncé, la précision, l'usage des autres rites, la source.
function perRule(item) {
    const S = PeriodsData.STATUS[item.st];
    const row = perNode('div', 'tool-row per-rule per-rule-' + item.st);
    row.id = 'per-rule-' + item.id;
    const head = perNode('div', 'per-rule-head');
    const mark = perNode('span', 'per-mark per-mark-' + item.st, S.symbol);
    mark.setAttribute('aria-hidden', 'true');
    head.appendChild(mark);
    head.appendChild(perNode('strong', 'per-rule-text', item.fr));
    head.appendChild(perNode('span', 'per-status per-status-' + item.st, S.fr));
    row.appendChild(head);
    if (item.note) row.appendChild(perNode('span', 'per-note', item.note));
    item.others.forEach(o => {
        const names = o.rites.map(r => PeriodsData.RITES[r].fr).join(', ');
        const st = PeriodsData.STATUS[o.st];
        const line = perNode('small', 'per-others', t('tools.per_others') + ' — ' + t('tools.per_other_line', { rites: names, status: st ? st.fr.toLowerCase() : '' }) + (o.note ? ' (' + o.note + ')' : ''));
        row.appendChild(line);
    });
    if (item.src) row.appendChild(perNode('small', 'per-src', t('tools.per_src', { src: item.src })));
    return row;
}

// --- La carte de l'écran Aujourd'hui ------------------------------------------------------------------------------------------------------------------
// Une carte par période en cours (ou qui commence demain) : [{ id, label, value, sub }]. `day` est celui de homeDay().
function periodsTodayCards(day) {
    const ctx = perCtx({ fixed: day.ctx.fixed, israel: day.israel });
    return PeriodsCore.todayView(ctx.fixed, ctx).map(s => {
        const p = PeriodsCore.periodById(s.id);
        const v = PeriodsCore.view(s.id, { rite: ctx.rite, sex: ctx.sex, phase: s.phase });
        let sub;
        if (s.state === 'active') {
            const ph = v.phases.filter(x => x.id === v.phase)[0];
            sub = ph ? ph.fr : (perOccName(s.range) || v.until || p.sum);
        } else sub = perWhenText(s);
        return { id: s.id, label: t(s.state === 'active' ? 'tools.per_card_label' : 'tools.per_card_soon'), value: p.fr, sub: sub };
    });
}
