// =========================================================================
// === CALENDRIER HÉBRAÏQUE ET FÊTES (écran de l'Atelier) ===
// =========================================================================
// Quatre onglets : un convertisseur (jour grégorien ↔︎ jour hébraïque, avec les fêtes du jour), les fêtes d'une année hébraïque (Israël ou
// diaspora, avec leur source), les mois de l'année avec leur longueur et leur date, et la règle du calendrier (cycle de 19 ans, retards de
// Roch Hachana, jeûnes déplacés). Les calculs sont dans js/hebrewCalendarCore.js (pur, testé). Tout ce qui vient de la saisie passe par
// textContent, jamais par du HTML. Le contenu religieux est écrit à la main : à relire par une personne compétente.

let hcalTab = 'convert';
let hcalYear = null;          // l'année hébraïque affichée (onglets Fêtes et Mois) ; null = l'année en cours
let hcalIsrael = false;       // vrai : les dates d'Israël ; faux : celles de la diaspora
// Sans choix fait sur cet écran : le domicile du profil (js/app/first-profile.js).
try { const v = localStorage.getItem('hcalIsrael'); hcalIsrael = v === null ? localStorage.getItem('torahaxe_domicile_v1') === 'israel' : v === '1'; } catch (e) { /* stockage indisponible : diaspora */ }
const hcalInputs = { gregorian: '', day: '1', month: 'Tishri', year: '' };
const HCAL_TABS = [
    { id: 'convert', icon: '🔁' },
    { id: 'feasts', icon: '🕯️' },
    { id: 'months', icon: '🌙' },
    { id: 'rules', icon: '📐' }
];

function hcalLang() { return (typeof i18n !== 'undefined' && i18n.currentLang) || 'fr'; }

function hcalToday() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

// Un jour fixe → un texte de date grégorienne : « jeudi 2 avril 2026 ».
function hcalGregorianText(fixed, opts) {
    const d = new Date((fixed - 719163) * 86400000);
    const options = Object.assign({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, opts || {});
    try { return new Intl.DateTimeFormat(hcalLang(), options).format(d); } catch (e) { return d.toISOString().slice(0, 10); }
}

function hcalMonthName(year, id) { return t('tools.hcal_month_' + HebrewCalendarCore.monthLabelId(year, id)); }

// « 14 Adar II 5784 »
function hcalHebrewText(h) { return h.day + ' ' + hcalMonthName(h.year, h.month) + ' ' + h.year; }

// « י״ד אדר ב׳ תשפ״ד »
function hcalHebrewLetters(h) {
    const C = HebrewCalendarCore;
    return C.hebrewNumeral(h.day) + ' ' + C.monthHebrew(h.year, h.month) + ' ' + C.hebrewNumeral(h.year);
}

function hcalCurrentYear() {
    const today = hcalToday();
    const h = HebrewCalendarCore.gregorianToHebrew(today.year, today.month, today.day);
    return h ? h.year : 5786;
}

function hcalClampYear(y) {
    const C = HebrewCalendarCore;
    return Math.min(C.HEBREW_MAX, Math.max(C.HEBREW_MIN, y));
}

function hcalEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function hcalPara(parent, text, className) {
    const p = hcalEl('p', className || 'tool-small', text);
    parent.appendChild(p);
    return p;
}

function hcalHebrewLine(parent, text, className) {
    const p = hcalEl('p', className || 'hcal-he', text);
    p.lang = 'he';
    p.dir = 'rtl';
    parent.appendChild(p);
    return p;
}

// Une fête ouverte depuis l'accueil (« Prochaine fête ») : l'onglet Fêtes, son année et sa zone, puis l'encadré de cette fête déplié.
let hcalPendingFeast = null;
function hcalOpenFeast(id, year, israel) {
    hcalTab = 'feasts';
    hcalYear = year;
    hcalIsrael = !!israel;
    hcalPendingFeast = id;
    openTool('hebrewCalendar', 'screen-main');
}

function toolHebrewCalendarInit() {
    if (hcalYear === null) hcalYear = hcalCurrentYear();
    const tabs = toolEl('tool-hcal-tabs');
    toolClear(tabs);
    HCAL_TABS.forEach(tab => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'tool-hcal-tab-' + tab.id;
        btn.setAttribute('aria-pressed', tab.id === hcalTab ? 'true' : 'false');
        btn.textContent = tab.icon + ' ' + t('tools.hcal_tab_' + tab.id);
        btn.onclick = () => { hcalTab = tab.id; toolHebrewCalendarInit(); };
        tabs.appendChild(btn);
    });
    hcalRender();
}

function hcalRender() {
    const body = toolEl('tool-hcal-body');
    toolClear(body);
    ({ convert: hcalConvertTab, feasts: hcalFeastsTab, months: hcalMonthsTab, rules: hcalRulesTab }[hcalTab])(body);
}

// --- Un tableau (même présentation que les poids et mesures) ----------------------------------------------------------
function hcalTable(parent, headers, rows, caption) {
    const wrap = hcalEl('div', 'measures-table-wrap');
    const table = hcalEl('table', 'tool-table measures-table');
    if (caption) table.appendChild(hcalEl('caption', '', caption));
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    headers.forEach(text => {
        const th = hcalEl('th', '', text);
        th.scope = 'col';
        hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    rows.forEach(cells => {
        const tr = document.createElement('tr');
        cells.forEach((text, i) => {
            const cell = hcalEl(i === 0 ? 'th' : 'td', '', text);
            if (i === 0) cell.scope = 'row';
            tr.appendChild(cell);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    parent.appendChild(wrap);
}

// =========================================================================
// Onglet « Convertir »
// =========================================================================
function hcalConvertTab(body) {
    const C = HebrewCalendarCore;
    const today = hcalToday();
    const todayHebrew = C.gregorianToHebrew(today.year, today.month, today.day);
    if (todayHebrew) {
        const box = hcalEl('section', 'tool-panel hcal-today');
        hcalPara(box, t('tools.hcal_today', { date: hcalHebrewText(todayHebrew) }), 'tool-big hcal-today-line');
        hcalHebrewLine(box, hcalHebrewLetters(todayHebrew));
        body.appendChild(box);
    }
    if (!hcalInputs.gregorian) hcalInputs.gregorian = hcalIsoDate(today);
    if (!hcalInputs.year) hcalInputs.year = String(hcalCurrentYear());
    body.appendChild(hcalGregorianPanel());
    body.appendChild(hcalHebrewPanel());
    hcalUpdateGregorian();
    hcalFillMonths();
}

function hcalIsoDate(d) {
    return String(d.year).padStart(4, '0') + '-' + String(d.month).padStart(2, '0') + '-' + String(d.day).padStart(2, '0');
}

function hcalGregorianPanel() {
    const panel = hcalEl('section', 'tool-panel');
    panel.appendChild(hcalEl('h3', 'tool-h', t('tools.hcal_g2h_title')));
    const field = hcalEl('div', 'tool-field');
    const label = hcalEl('label', '', t('tools.hcal_g2h_label'));
    label.setAttribute('for', 'tool-hcal-greg');
    const input = document.createElement('input');
    input.type = 'date';
    input.id = 'tool-hcal-greg';
    input.className = 'tool-input';
    input.min = '1583-01-01';
    input.max = '2400-12-31';
    input.value = hcalInputs.gregorian;
    input.oninput = () => { hcalInputs.gregorian = input.value; hcalUpdateGregorian(); };
    field.appendChild(label);
    field.appendChild(input);
    panel.appendChild(field);
    const msg = hcalEl('p', 'tool-msg');
    msg.id = 'tool-hcal-greg-msg';
    msg.setAttribute('role', 'status');
    panel.appendChild(msg);
    const out = hcalEl('div', 'hcal-result hidden');
    out.id = 'tool-hcal-greg-result';
    panel.appendChild(out);
    return panel;
}

function hcalUpdateGregorian() {
    const C = HebrewCalendarCore;
    const msg = toolEl('tool-hcal-greg-msg'), out = toolEl('tool-hcal-greg-result');
    if (!msg || !out) return;
    toolClear(out);
    msg.textContent = '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hcalInputs.gregorian);
    const h = m ? C.gregorianToHebrew(Number(m[1]), Number(m[2]), Number(m[3])) : null;
    if (!h) {
        out.classList.add('hidden');
        if (hcalInputs.gregorian) msg.textContent = t('tools.hcal_msg_bad_greg');
        return;
    }
    out.classList.remove('hidden');
    hcalDescribeDay(out, h.fixed);
}

// La date hébraïque d'un jour, ses lettres, ses fêtes, le compte de l'Omer et Roch 'Hodesh.
function hcalDescribeDay(out, fixed) {
    const C = HebrewCalendarCore;
    const info = C.dayInfo(fixed, hcalIsrael, hcalHabad());
    const h = info.hebrew;
    out.appendChild(hcalEl('p', 'tool-big', hcalHebrewText(h)));
    hcalHebrewLine(out, hcalHebrewLetters(h));
    hcalPara(out, hcalGregorianText(fixed) + ' · ' + t('tools.hcal_wd_' + h.weekday));
    const lines = [];
    info.feasts.forEach(f => lines.push('🕯️ ' + t('tools.hcal_f_' + C.feastNameId(f.id, fixed, hcalIsrael) + '_name')));
    if (info.omer) lines.push('🔢 ' + (info.omer === 1 ? t('tools.hcal_omer_day_1') : t('tools.hcal_omer_day', { n: info.omer })));
    if (info.roshChodesh) lines.push('🌙 ' + t('tools.hcal_roch_hodesh'));
    if (lines.length) {
        const ul = hcalEl('ul', 'hcal-list');
        lines.forEach(text => ul.appendChild(hcalEl('li', '', text)));
        out.appendChild(ul);
    } else {
        hcalPara(out, t('tools.hcal_no_feast'));
    }
    hcalPara(out, t('tools.hcal_night_note'));
    // L'année hébraïque de ce jour, sur la grande frise (les années comptent depuis la création du monde).
    const chr = hcalEl('div', 'gen-actions');
    out.appendChild(chr);
    if (typeof chrAddYearButton === 'function') chrAddYearButton(chr, h.year, 'screen-tool-hebrew-calendar');
}

function hcalHebrewPanel() {
    const C = HebrewCalendarCore;
    const panel = hcalEl('section', 'tool-panel');
    panel.appendChild(hcalEl('h3', 'tool-h', t('tools.hcal_h2g_title')));
    const field = hcalEl('div', 'tool-field');
    const inline = hcalEl('div', 'tool-inline');

    const day = document.createElement('input');
    day.type = 'number';
    day.inputMode = 'numeric';
    day.min = '1';
    day.max = '30';
    day.step = '1';
    day.id = 'tool-hcal-day';
    day.className = 'tool-input';
    day.value = hcalInputs.day;
    day.setAttribute('aria-label', t('tools.hcal_day_label'));
    day.oninput = () => { hcalInputs.day = day.value; hcalUpdateHebrew(); };

    const month = document.createElement('select');
    month.id = 'tool-hcal-month';
    month.className = 'tool-input';
    month.setAttribute('aria-label', t('tools.hcal_month_label'));
    month.onchange = () => { hcalInputs.month = month.value; hcalUpdateHebrew(); };

    const year = document.createElement('input');
    year.type = 'number';
    year.inputMode = 'numeric';
    year.min = String(C.HEBREW_MIN);
    year.max = String(C.HEBREW_MAX);
    year.step = '1';
    year.id = 'tool-hcal-year';
    year.className = 'tool-input';
    year.value = hcalInputs.year;
    year.setAttribute('aria-label', t('tools.hcal_year_label'));
    year.oninput = () => { hcalInputs.year = year.value; hcalFillMonths(); hcalUpdateHebrew(); };

    inline.appendChild(day);
    inline.appendChild(month);
    inline.appendChild(year);
    const label = hcalEl('label', '', t('tools.hcal_h2g_title'));
    label.setAttribute('for', 'tool-hcal-day');
    field.appendChild(label);
    field.appendChild(inline);
    panel.appendChild(field);
    const msg = hcalEl('p', 'tool-msg');
    msg.id = 'tool-hcal-heb-msg';
    msg.setAttribute('role', 'status');
    panel.appendChild(msg);
    const out = hcalEl('div', 'hcal-result hidden');
    out.id = 'tool-hcal-heb-result';
    panel.appendChild(out);
    return panel;
}

// Les mois de l'année saisie, de Tichri à Elloul. Le mois choisi est gardé quand il existe encore.
function hcalFillMonths() {
    const C = HebrewCalendarCore;
    const select = toolEl('tool-hcal-month');
    if (!select) return;
    const year = Number(hcalInputs.year);
    const valid = year >= C.HEBREW_MIN && year <= C.HEBREW_MAX;
    const months = C.monthsOf(valid ? year : hcalCurrentYear());
    const labelYear = valid ? year : hcalCurrentYear();
    toolClear(select);
    months.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = hcalMonthName(labelYear, m.id);
        select.appendChild(opt);
    });
    if (!months.some(m => m.id === hcalInputs.month)) hcalInputs.month = months[0].id;
    select.value = hcalInputs.month;
    hcalUpdateHebrew();
}

function hcalUpdateHebrew() {
    const C = HebrewCalendarCore;
    const msg = toolEl('tool-hcal-heb-msg'), out = toolEl('tool-hcal-heb-result');
    if (!msg || !out) return;
    toolClear(out);
    msg.textContent = '';
    out.classList.add('hidden');
    if (!hcalInputs.day || !hcalInputs.year) return;
    const day = Number(hcalInputs.day), year = Number(hcalInputs.year);
    const validYear = Number.isInteger(year) && year >= C.HEBREW_MIN && year <= C.HEBREW_MAX;
    const month = validYear ? C.monthsOf(year).find(m => m.id === hcalInputs.month) : null;
    if (!validYear || !month || !Number.isInteger(day) || day < 1) {
        msg.textContent = t('tools.hcal_msg_bad_heb', { min: C.HEBREW_MIN, max: C.HEBREW_MAX });
        return;
    }
    if (day > month.days) {
        msg.textContent = t('tools.hcal_msg_bad_day', { days: month.days, year: year });
        return;
    }
    out.classList.remove('hidden');
    hcalDescribeDay(out, C.hebrewToGregorian(year, hcalInputs.month, day).fixed);
}

// =========================================================================
// Choix de l'année et de la zone (onglets « Fêtes » et « Mois »)
// =========================================================================
function hcalYearControls(parent, withZone) {
    const C = HebrewCalendarCore;
    const nav = hcalEl('div', 'hcal-nav');
    const prev = hcalEl('button', 'tool-history-chip hcal-step', '‹');
    prev.type = 'button';
    prev.setAttribute('aria-label', t('tools.hcal_year_prev'));
    prev.disabled = hcalYear <= C.HEBREW_MIN;
    prev.onclick = () => { hcalYear = hcalClampYear(hcalYear - 1); hcalRender(); };
    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'numeric';
    input.className = 'tool-input hcal-year-input';
    input.min = String(C.HEBREW_MIN);
    input.max = String(C.HEBREW_MAX);
    input.step = '1';
    input.id = 'tool-hcal-year-nav';
    input.value = String(hcalYear);
    input.setAttribute('aria-label', t('tools.hcal_year_label'));
    input.onchange = () => {
        const n = Number(input.value);
        if (Number.isInteger(n)) hcalYear = hcalClampYear(n);
        // Redessiné après l'événement : le champ qui vient de perdre le focus ne doit pas être retiré de la page pendant son « blur ».
        setTimeout(hcalRender, 0);
    };
    const next = hcalEl('button', 'tool-history-chip hcal-step', '›');
    next.type = 'button';
    next.setAttribute('aria-label', t('tools.hcal_year_next'));
    next.disabled = hcalYear >= C.HEBREW_MAX;
    next.onclick = () => { hcalYear = hcalClampYear(hcalYear + 1); hcalRender(); };
    nav.appendChild(prev);
    nav.appendChild(input);
    nav.appendChild(next);
    parent.appendChild(nav);

    const info = C.yearInfo(hcalYear);
    const from = hcalGregorianText(info.start, { weekday: undefined, day: 'numeric', month: 'long', year: 'numeric' });
    const to = hcalGregorianText(info.end, { weekday: undefined, day: 'numeric', month: 'long', year: 'numeric' });
    // Les lettres hébraïques sur leur propre ligne : mêlées à une date en français, elles brouillent l'ordre de lecture.
    hcalHebrewLine(parent, C.hebrewNumeral(hcalYear), 'hcal-he hcal-year-he');
    hcalPara(parent, t('tools.hcal_from_to', { from: from, to: to }), 'tool-small hcal-year-line');

    if (withZone) {
        const zone = hcalEl('div', 'tool-history-chips');
        zone.setAttribute('role', 'group');
        zone.setAttribute('aria-label', t('tools.hcal_where_aria'));
        [['diaspora', false], ['israel', true]].forEach(([id, israel]) => {
            const btn = hcalEl('button', 'tool-history-chip', t('tools.hcal_where_' + id));
            btn.type = 'button';
            btn.id = 'tool-hcal-where-' + id;
            btn.setAttribute('aria-pressed', hcalIsrael === israel ? 'true' : 'false');
            btn.onclick = () => {
                hcalIsrael = israel;
                try { localStorage.setItem('hcalIsrael', israel ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
                hcalRender();
            };
            zone.appendChild(btn);
        });
        parent.appendChild(zone);
        hcalPara(parent, t('tools.hcal_where_note'));
    }
}

// =========================================================================
// Onglet « Fêtes »
// =========================================================================
// Vrai si le rite choisi dans les Réglages est 'Habad : le calendrier ajoute alors les dates hassidiques.
function hcalHabad() { return typeof riteFull === 'function' && riteFull() === 'habad'; }

function hcalFeastsTab(body) {
    const C = HebrewCalendarCore;
    const today = hcalToday();
    const todayFixed = C.fixedOfGregorian(today.year, today.month, today.day);
    const panel = hcalEl('section', 'tool-panel');
    hcalYearControls(panel, true);
    if (hcalHabad()) hcalPara(panel, t('tools.hcal_habad_note'), 'tool-small');
    body.appendChild(panel);

    // « À venir » : la première fête qui n'est pas finie, seulement si aujourd'hui est dans l'année affichée.
    const feasts = C.feastsOf(hcalYear, hcalIsrael, hcalHabad());
    const info = C.yearInfo(hcalYear);
    const nextIndex = todayFixed >= info.start && todayFixed <= info.end ? feasts.findIndex(f => f.last >= todayFixed) : -1;
    const list = hcalEl('div', 'hcal-feasts');
    feasts.forEach((f, i) => list.appendChild(hcalFeastRow(f, i === nextIndex)));
    body.appendChild(list);

    // Venue de l'accueil : on déplie l'encadré de la fête et on le fait voir.
    if (hcalPendingFeast) {
        const id = hcalPendingFeast;
        hcalPendingFeast = null;
        const target = list.querySelector('#hcal-feast-' + CSS.escape(id));
        if (target) {
            target.open = true;
            setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
        }
    }
}

function hcalFeastRow(f, isNext) {
    const C = HebrewCalendarCore;
    const details = hcalEl('details', 'hcal-feast is-' + f.kind);
    details.id = 'hcal-feast-' + f.id;
    const summary = document.createElement('summary');
    const head = hcalEl('span', 'hcal-feast-head');
    const name = hcalEl('strong', 'hcal-feast-name', t('tools.hcal_f_' + f.id + '_name'));
    head.appendChild(name);
    const date = f.days > 1
        ? t('tools.hcal_from_to', { from: hcalGregorianText(f.fixed, { year: undefined }), to: hcalGregorianText(f.last) })
        : hcalGregorianText(f.fixed);
    head.appendChild(hcalEl('span', 'hcal-feast-date', date));
    summary.appendChild(head);
    const badges = hcalEl('span', 'hcal-badges');
    badges.appendChild(hcalEl('span', 'hcal-badge is-' + f.kind, t('tools.hcal_kind_' + f.kind)));
    if (isNext) badges.appendChild(hcalEl('span', 'hcal-badge is-next', t('tools.hcal_next_badge')));
    summary.appendChild(badges);
    details.appendChild(summary);

    const content = hcalEl('div', 'hcal-feast-body');
    const h = C.hebrewFromFixed(f.fixed);
    hcalPara(content, hcalHebrewText(h) + (f.days > 1 ? ' → ' + hcalHebrewText(C.hebrewFromFixed(f.last)) : ''), 'tool-small hcal-feast-hebrew');
    if (f.shifted) {
        const ruleDate = hcalGregorianText(C.hebrewToGregorian(hcalYear, f.month, f.day).fixed);
        hcalPara(content, t('tools.hcal_shifted', { date: ruleDate }), 'tool-small hcal-shifted');
    }
    hcalPara(content, t('tools.hcal_f_' + f.id + '_what'));
    hcalPara(content, t('tools.hcal_source', { src: t('tools.hcal_f_' + f.id + '_src') }), 'tool-small hcal-source');
    // L'événement que la fête rappelle (la sortie d'Égypte, le don de la Torah, la destruction du Temple…), sur la grande frise.
    const chr = hcalEl('div', 'gen-actions');
    content.appendChild(chr);
    if (typeof chrAddTargetButton === 'function' && typeof ChronologieCore !== 'undefined') chrAddTargetButton(chr, model => ChronologieCore.forFeast(model, f.id), 'screen-tool-hebrew-calendar');
    details.appendChild(content);
    return details;
}

// =========================================================================
// Onglet « Mois »
// =========================================================================
function hcalMonthsTab(body) {
    const C = HebrewCalendarCore;
    const panel = hcalEl('section', 'tool-panel');
    hcalYearControls(panel, false);
    const info = C.yearInfo(hcalYear);
    hcalPara(panel, t('tools.hcal_year_summary', {
        kind: t('tools.hcal_year_' + (info.leap ? 'leap' : 'common') + '_ext') + ' ' + t('tools.hcal_kind_' + info.kind),
        length: info.length, cycle: info.cycle, weekday: t('tools.hcal_wd_' + info.newYearWeekday)
    }));
    body.appendChild(panel);

    const box = hcalEl('section', 'tool-panel');
    box.appendChild(hcalEl('h3', 'tool-h', t('tools.hcal_months_title', { year: hcalYear })));
    hcalPara(box, t('tools.hcal_months_note'));
    const list = hcalEl('div', 'hcal-months');
    info.months.forEach(m => {
        const key = C.monthLabelId(hcalYear, m.id);
        const first = C.hebrewToGregorian(hcalYear, m.id, 1);
        const card = hcalEl('article', 'hcal-month');
        const head = hcalEl('div', 'hcal-month-head');
        head.appendChild(hcalEl('strong', 'hcal-month-name', hcalMonthName(hcalYear, m.id)));
        const he = hcalEl('span', 'hcal-month-he', C.monthHebrew(hcalYear, m.id));
        he.lang = 'he';
        he.dir = 'rtl';
        head.appendChild(he);
        card.appendChild(head);
        hcalPara(card, t('tools.hcal_month_line', { days: m.days, start: hcalGregorianText(first.fixed, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) }), 'tool-small hcal-month-line');
        hcalPara(card, t('tools.hcal_sign_label', { sign: t('tools.hcal_sign_' + key) }), 'tool-small');
        hcalPara(card, t('tools.hcal_events_' + key));
        list.appendChild(card);
    });
    box.appendChild(list);
    body.appendChild(box);

    const four = hcalEl('section', 'tool-panel');
    four.appendChild(hcalEl('h3', 'tool-h', t('tools.hcal_four_title')));
    const ul = hcalEl('ul', 'hcal-list');
    [1, 2, 3, 4].forEach(n => ul.appendChild(hcalEl('li', '', t('tools.hcal_four_' + n))));
    four.appendChild(ul);
    body.appendChild(four);
}

// =========================================================================
// Onglet « La règle »
// =========================================================================
function hcalRulesTab(body) {
    const C = HebrewCalendarCore;
    const box = hcalEl('section', 'tool-panel hcal-rules');
    const section = (n) => {
        box.appendChild(hcalEl('h3', 'tool-h', t('tools.hcal_rule_title_' + n)));
        hcalPara(box, t('tools.hcal_rule_' + n));
    };
    section(1);
    section(2);

    // Les 19 années du cycle : les embolismiques en couleur, l'année choisie entourée.
    const chosen = C.cycleYear(hcalYear);
    const cycle = hcalEl('ol', 'hcal-cycle');
    cycle.setAttribute('aria-label', t('tools.hcal_cycle_caption', { year: hcalYear, cycle: chosen }));
    for (let n = 1; n <= 19; n++) {
        const isLeap = C.LEAP_CYCLE_YEARS.includes(n);
        const li = hcalEl('li', 'hcal-cycle-year' + (isLeap ? ' is-leap' : '') + (n === chosen ? ' is-chosen' : ''), String(n));
        li.title = t(isLeap ? 'tools.hcal_cycle_leap' : 'tools.hcal_cycle_common');
        cycle.appendChild(li);
    }
    box.appendChild(cycle);
    hcalPara(box, t('tools.hcal_cycle_caption', { year: hcalYear, cycle: chosen }) + ' (' + t(C.leap(hcalYear) ? 'tools.hcal_cycle_leap' : 'tools.hcal_cycle_common') + ')');

    section(3);
    box.appendChild(hcalEl('h3', 'tool-h', t('tools.hcal_rule_title_4')));
    hcalPara(box, t('tools.hcal_rule_4'));
    const forms = ['deficient', 'regular', 'complete'];
    const rows = [];
    [false, true].forEach(isLeap => forms.forEach((form, i) => {
        const length = (isLeap ? 383 : 353) + i;
        rows.push([String(length), t('tools.hcal_form_' + form) + (isLeap ? ' · ' + t('tools.hcal_cycle_leap') : ''), t('tools.hcal_hk_' + form)]);
    }));
    hcalTable(box, [t('tools.hcal_col_len'), t('tools.hcal_col_form'), t('tools.hcal_col_hk')], rows);
    [5, 6, 7, 8, 9, 10].forEach(section);
    body.appendChild(box);
}
