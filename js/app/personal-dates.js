// =========================================================================
// === DATES PERSONNELLES : HAZKARA (YAHRZEIT), ANNIVERSAIRES HÉBRAÏQUES, BAR ET BAT-MITSVA (écran, formulaire, rappels) ===
// =========================================================================
// Le calcul (règles de l'Adar, du 30 'Hechvan et du 30 Kislev, bar et bat-mitsva, rappels) est dans js/personalDatesCore.js (pur, testé). Ici : le registre local (localStorage,
// `torahaxe_dates_v1`), l'écran (à venir, mes dates, calculateur de bar et bat-mitsva, rappels), le formulaire d'ajout et de modification, et les cartes de l'accueil.
// Le mot « Hazkara » (séfarade) ou « Yahrzeit » (ashkénaze) et la règle de l'Adar viennent du rite choisi dans les Réglages (js/app/settings.js : riteGet, datesTerm). Les rappels sont des
// notifications locales de l'iPhone (js/notifications.js), programmées avec les autres. Tout ce qui est saisi passe par textContent ou par la valeur d'un champ, jamais par du HTML.

const DATES_KEY = 'torahaxe_dates_v1';
let datesReturn = 'screen-main';
let datesData = null;            // { calendar, parashot } pour la paracha d'une bar-mitsva, une fois chargés
let datesCalc = { civil: '', after: false, sex: 'm', result: null };   // le calculateur de bar et bat-mitsva
let datesReminderMsg = '';
let datesForm = null;            // le formulaire ouvert : voir datesNewForm
let datesDeleteAsk = false;

function datesStore() { return PersonalDatesCore.normalizeStore(QuizUI.loadPrefs(DATES_KEY)); }

function datesSave(store) {
    QuizUI.savePrefs(DATES_KEY, store);
    // Les rappels sont recalculés tout de suite : une date ajoutée ce soir peut avoir son rappel demain matin.
    if (typeof TorahAxeNotifications !== 'undefined' && TorahAxeNotifications.isSupported()) TorahAxeNotifications.scheduleZmanim();
}

function dEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

// --- Le texte des dates -----------------------------------------------------------------------------------------------------------------------------
function datesMonthName(year, id) { return t('tools.hcal_month_' + HebrewCalendarCore.monthLabelId(year, id)); }
function datesHebrewText(h) { return h.day + ' ' + datesMonthName(h.year, h.month) + ' ' + h.year; }
function datesCivilText(c, withWeekday) {
    return new Date(c.year, c.month - 1, c.day).toLocaleDateString('fr-FR', { weekday: withWeekday === false ? undefined : 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function datesFixedCivil(fixed) { return CalendarYearCore.fixedToGregorian(fixed); }
function datesTypeLabel(type) { return t('dates.type_' + type, { term: datesTerm() }); }
function datesShortLabel(type) { return t('dates.short_' + type, { term: datesTerm() }); }
function datesInText(n) { return n === 0 ? t('dates.in_days_0') : n === 1 ? t('dates.in_days_1') : t('dates.in_days_n', { n: n }); }
function datesYearsText(item, n) { return t(item.type === 'hazkara' ? 'dates.years_hazkara' : 'dates.years_other', { n: n }); }
function datesTodayFixed() { return homeDay().fixed; }

// --- L'accueil ----------------------------------------------------------------------------------------------------------------------------------------
// Les dates des 7 prochains jours, pour les cartes de l'onglet « Aujourd'hui » : [{ label, value, sub }]. Une Hazkara de demain « commence ce soir » (le jour commence à la tombée de la nuit).
function datesTodayCards() {
    try {
        const store = datesStore();
        if (!store.items.length) return [];
        const up = PersonalDatesCore.upcoming(store.items, datesTodayFixed(), 7, riteGet());
        return up.slice(0, 2).map(u => ({
            label: datesShortLabel(u.item.type), value: u.item.name,
            sub: (u.item.type === 'hazkara' && u.inDays === 1 ? t('dates.tonight') : datesInText(u.inDays)) + ' · ' + datesYearsText(u.item, u.years)
        }));
    } catch (e) { return []; }
}

// --- L'écran -----------------------------------------------------------------------------------------------------------------------------------------
function openDates(fromScreen) {
    datesReturn = fromScreen || 'screen-main';
    showScreen('screen-dates', 'forward');
    datesReminderMsg = '';
    datesRender();
}

function datesBack() { datesCloseForm(); gamesBackTo(datesReturn); }

// Les parachiot et le calendrier des Chabbats : ceux de l'accueil s'ils sont chargés, sinon on les charge (3 Ko et 11 Ko).
function datesLoadParasha(then) {
    if (datesData) { then(); return; }
    if (typeof homeParasha !== 'undefined' && homeParasha) { datesData = homeParasha; then(); return; }
    fetch('data/torah/parashot.json').then(r => (r.ok ? r.json() : null)).then(parashot => { datesData = { calendar: null, parashot: parashot }; then(); })
        .catch(() => { datesData = { calendar: null, parashot: null }; then(); });
}

function datesRender() {
    const body = document.getElementById('dates-body');
    toolClear(body);
    const store = datesStore();
    const rite = riteGet();
    const today = datesTodayFixed();

    const add = dEl('button', 'btn', '+ ' + t('dates.add'));
    add.type = 'button';
    add.onclick = () => datesOpenForm(null);
    body.appendChild(add);

    // À venir (90 jours).
    body.appendChild(dEl('h2', 'home-section-title', t('dates.upcoming_title')));
    const up = PersonalDatesCore.upcoming(store.items, today, 90, rite);
    if (!store.items.length) body.appendChild(dEl('p', 'tool-small', t('dates.empty', { term: datesTerm() })));
    else if (!up.length) body.appendChild(dEl('p', 'tool-small', t('dates.upcoming_none')));
    up.forEach(u => body.appendChild(datesRow(u.item, u)));

    // Mes dates : chacune avec sa prochaine occurrence.
    if (store.items.length) {
        body.appendChild(dEl('h2', 'home-section-title', t('dates.mine_title')));
        store.items.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr')).forEach(item => {
            const n = PersonalDatesCore.next(item, today, rite);
            body.appendChild(datesRow(item, n ? Object.assign({ item: item, inDays: n.fixed - today }, n) : null, true));
        });
    }

    datesRenderCalculator(body);
    datesRenderReminders(body, store);
    body.appendChild(dEl('p', 'tool-small dates-rules', t('dates.rules_note')));
}

// Une ligne : le nom, le type, la date (civile et hébraïque) et le délai ; un appui ouvre le formulaire.
function datesRow(item, occ, compact) {
    const row = dEl('button', 'dates-card');
    row.type = 'button';
    row.onclick = () => datesOpenForm(item);
    const head = dEl('div', 'dates-card-head');
    head.appendChild(dEl('strong', '', item.name));
    head.appendChild(dEl('span', 'dates-card-type', datesShortLabel(item.type)));
    row.appendChild(head);
    if (occ) {
        const civil = datesFixedCivil(occ.fixed);
        row.appendChild(dEl('span', 'dates-card-date', datesCivilText(civil) + ' · ' + datesHebrewText(occ.hebrew)));
        row.appendChild(dEl('small', 'dates-card-meta', (item.type === 'hazkara' && occ.inDays === 1 ? t('dates.tonight') : datesInText(occ.inDays)) + ' · ' + datesYearsText(item, occ.years)));
    } else {
        row.appendChild(dEl('small', 'dates-card-meta', t('dates.next_none')));
    }
    if (compact) row.appendChild(dEl('small', 'dates-card-meta', t('dates.born_line', { hebrew: datesHebrewText(item.hebrew) })));
    return row;
}

// --- Le calculateur de bar et bat-mitsva -------------------------------------------------------------------------------------------------------
function datesRenderCalculator(body) {
    body.appendChild(dEl('h2', 'home-section-title', t('dates.calc_title')));
    const card = dEl('div', 'dates-calc');
    const birth = document.createElement('input');
    birth.type = 'date';
    birth.className = 'dates-input';
    birth.value = datesCalc.civil;
    birth.setAttribute('aria-label', t('dates.calc_birth'));
    const lab1 = dEl('label', 'dates-field');
    lab1.append(dEl('span', '', t('dates.calc_birth')), birth);
    const after = document.createElement('input');
    after.type = 'checkbox';
    after.checked = datesCalc.after;
    const lab2 = dEl('label', 'dates-check');
    lab2.append(after, dEl('span', '', t('dates.calc_after')));
    const seg = dEl('div', 'segmented');
    [['m', 'dates.f_sex_m'], ['f', 'dates.f_sex_f']].forEach(([id, key]) => {
        const b = dEl('button', datesCalc.sex === id ? 'active' : '', t(key));
        b.type = 'button';
        b.setAttribute('aria-pressed', datesCalc.sex === id ? 'true' : 'false');
        b.onclick = () => { datesCalc.civil = birth.value; datesCalc.after = after.checked; datesCalc.sex = id; datesCalc.result = null; datesRender(); };
        seg.appendChild(b);
    });
    const go = dEl('button', 'btn', t('dates.calc_go'));
    go.type = 'button';
    go.onclick = () => { datesCalc.civil = birth.value; datesCalc.after = after.checked; datesCalcRun(); };
    card.append(lab1, lab2, seg, go);
    if (datesCalc.result) card.appendChild(datesCalcResultNode(datesCalc.result));
    body.appendChild(card);
}

// Le calcul : la date hébraïque de naissance, puis la bar ou bat-mitsva, son Chabbat et la paracha qu'on y lit.
function datesCalcRun() {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datesCalc.civil);
    if (!m) { datesCalc.result = { error: t('dates.calc_invalid') }; datesRender(); return; }
    const civil = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
    if (!HebrewCalendarCore.isSupportedGregorian(civil.year, civil.month, civil.day)) { datesCalc.result = { error: t('dates.err_year') }; datesRender(); return; }
    const birth = PersonalDatesCore.hebrewOfCivil(civil, datesCalc.after);
    const b = PersonalDatesCore.barBatMitsva(birth, datesCalc.sex, riteGet());
    datesCalc.result = { birth: birth, b: b, sex: datesCalc.sex, civil: civil, after: datesCalc.after, parasha: undefined };
    datesRender();
    datesLoadParasha(() => {
        const idx = PersonalDatesCore.parashaOfShabbat(b.shabbat, typeof zmStoredIsrael === 'function' && zmStoredIsrael());
        datesCalc.result.parasha = idx && datesData.parashot ? idx.map(k => datesData.parashot.parashot[k].fr).join(' – ') : null;
        if (document.getElementById('screen-dates') && !document.getElementById('screen-dates').classList.contains('hidden')) datesRender();
    });
}

function datesCalcResultNode(r) {
    const box = dEl('div', 'dates-result');
    if (r.error) { box.appendChild(dEl('p', 'dates-error', r.error)); return box; }
    box.appendChild(dEl('p', 'tool-small', t('dates.calc_birth_hebrew', { date: datesHebrewText(r.birth) })));
    box.appendChild(dEl('strong', '', t('dates.calc_result', { kind: t('dates.kind_' + r.sex), hebrew: datesHebrewText(r.b.hebrew), civil: datesCivilText(r.b.civil) })));
    if (r.b.fixed === r.b.shabbat) box.appendChild(dEl('p', '', t('dates.calc_is_shabbat')));
    else box.appendChild(dEl('p', '', t('dates.calc_shabbat', { kindShort: t('dates.kindshort_' + r.sex), civil: datesCivilText(r.b.shabbatCivil) })));
    if (r.parasha) box.appendChild(dEl('p', '', t('dates.calc_parasha', { name: r.parasha })));
    else if (r.parasha === null) box.appendChild(dEl('p', 'tool-small', t('dates.calc_parasha_none')));
    const add = dEl('button', 'btn btn-secondary', t('dates.calc_add'));
    add.type = 'button';
    add.onclick = () => datesOpenForm(null, { type: 'birthday', civil: r.civil, after: r.after, sex: r.sex });
    box.appendChild(add);
    return box;
}

// --- Les rappels --------------------------------------------------------------------------------------------------------------------------------------
function datesStoredPlace() {
    try { return ZmanimCore.normalizePlace(JSON.parse(localStorage.getItem('zmanimPlace') || 'null')); } catch (e) { return null; }
}

function datesRenderReminders(body, store) {
    body.appendChild(dEl('h2', 'home-section-title', t('dates.rem_title')));
    const card = dEl('div', 'dates-calc');
    const supported = typeof TorahAxeNotifications !== 'undefined' && TorahAxeNotifications.isSupported();
    if (!supported) { card.appendChild(dEl('p', 'tool-small', t('dates.rem_unsupported'))); body.appendChild(card); return; }
    if (!datesStoredPlace()) card.appendChild(dEl('p', 'tool-small', t('dates.rem_need_place')));
    const seg = dEl('div', 'segmented');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', t('dates.rem_eve_at'));
    [['shkia', 'dates.rem_eve_shkia'], ['tzeit', 'dates.rem_eve_tzeit']].forEach(([id, key]) => {
        const b = dEl('button', store.eveAt === id ? 'active' : '', t(key));
        b.type = 'button';
        b.setAttribute('aria-pressed', store.eveAt === id ? 'true' : 'false');
        b.onclick = () => { store.eveAt = id; datesSave(store); datesRender(); };
        seg.appendChild(b);
    });
    card.append(dEl('div', 'settings-label', t('dates.rem_eve_at')), seg);
    const enable = dEl('button', 'btn', t('dates.rem_enable'));
    enable.type = 'button';
    enable.onclick = () => {
        TorahAxeNotifications.enableZmanim().then(ok => { datesReminderMsg = t(ok ? 'dates.rem_enabled' : 'dates.rem_denied'); datesRender(); });
    };
    card.appendChild(enable);
    if (datesReminderMsg) card.appendChild(dEl('p', 'tool-small', datesReminderMsg));
    body.appendChild(card);
}

// --- Le formulaire --------------------------------------------------------------------------------------------------------------------------------------
// L'état du formulaire : `item` (la date modifiée, ou null pour une nouvelle) et `prefill` (un anniversaire préparé par le calculateur).
function datesNewForm(item, prefill) {
    const p = prefill || {};
    const type = item ? item.type : (p.type || 'hazkara');
    const f = {
        id: item ? item.id : null, type: type, name: item ? item.name : '',
        mode: item && !item.civil ? 'hebrew' : 'civil',
        civil: '', after: false, hDay: 1, hMonth: 'Tishri', hYear: HebrewCalendarCore.hebrewFromFixed(datesTodayFixed()).year,
        sex: item && item.sex ? item.sex : (p.sex || ''), adar: item && item.adar ? item.adar : 'rite', bothDays: !!(item && item.bothDays),
        eve: item ? item.remind.eve : type === 'hazkara', morning: item ? item.remind.morning : type !== 'hazkara', note: item && item.note ? item.note : '', error: ''
    };
    const c = item ? item.civil : p.civil;
    if (c) { f.civil = c.year + '-' + String(c.month).padStart(2, '0') + '-' + String(c.day).padStart(2, '0'); f.after = !!(item ? c.after : p.after); }
    if (item) { f.hDay = item.hebrew.day; f.hMonth = item.hebrew.month; f.hYear = item.hebrew.year; }
    return f;
}

// La date hébraïque que dit le formulaire (ou null).
function datesFormHebrew(f) {
    if (f.mode === 'civil') {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.civil);
        if (!m || !HebrewCalendarCore.isSupportedGregorian(Number(m[1]), Number(m[2]), Number(m[3]))) return null;
        return PersonalDatesCore.hebrewOfCivil({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }, f.after);
    }
    const h = { day: Number(f.hDay), month: f.hMonth, year: Number(f.hYear) };
    return PersonalDatesCore.isValidHebrew(h) ? h : null;
}

function datesOpenForm(item, prefill) {
    datesForm = datesNewForm(item, prefill);
    datesDeleteAsk = false;
    document.getElementById('date-form-title').textContent = item ? t('dates.edit') : t('dates.add');
    datesRenderForm();
    openModal('modal-date');
}

function datesCloseForm() {
    datesForm = null;
    const m = document.getElementById('modal-date');
    if (m) closeModal('modal-date');
}

function dField(labelText, control) {
    const lab = dEl('label', 'dates-field');
    lab.append(dEl('span', '', labelText), control);
    return lab;
}
function dSelect(options, value, onChange) {
    const sel = document.createElement('select');
    sel.className = 'dates-input';
    options.forEach(([v, label]) => { const o = document.createElement('option'); o.value = String(v); o.textContent = label; sel.appendChild(o); });
    sel.value = String(value);
    sel.onchange = () => onChange(sel.value);
    return sel;
}
function dSegment(options, value, onChange, ariaLabel) {
    const seg = dEl('div', 'segmented');
    seg.setAttribute('role', 'group');
    if (ariaLabel) seg.setAttribute('aria-label', ariaLabel);
    options.forEach(([v, label]) => {
        const b = dEl('button', value === v ? 'active' : '', label);
        b.type = 'button';
        b.setAttribute('aria-pressed', value === v ? 'true' : 'false');
        b.onclick = () => onChange(v);
        seg.appendChild(b);
    });
    return seg;
}
function dCheck(labelText, checked, onChange) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.onchange = () => onChange(input.checked);
    const lab = dEl('label', 'dates-check');
    lab.append(input, dEl('span', '', labelText));
    return lab;
}

// Le formulaire se dessine en deux temps. Le dessin complet (`datesRenderForm`) ne se refait que pour un changement qui modifie sa structure (le type, le mode de saisie). Un champ de date, lui, ne
// rafraîchit que les parties qui en dépendent (les champs de date hébraïque, la date équivalente, les options) : si le formulaire entier se redessinait à la sortie d'un champ, le bouton
// « Enregistrer » touché juste après serait remplacé avant le toucher, et il faudrait le toucher deux fois.
let datesFormBusy = false;
function datesRenderForm() {
    if (datesFormBusy) return;
    datesFormBusy = true;
    try { datesRenderFormNow(); } finally { datesFormBusy = false; }
}

function datesRenderFormNow() {
    const f = datesForm;
    const body = document.getElementById('date-form-body');
    if (document.activeElement && body.contains(document.activeElement)) document.activeElement.blur();
    toolClear(body);
    const redraw = () => datesRenderForm();

    body.appendChild(dField(t('dates.f_type'), dSelect(PersonalDatesCore.TYPES.map(ty => [ty, datesTypeLabel(ty)]), f.type, v => {
        f.type = v;
        if (!f.id) { f.eve = v === 'hazkara'; f.morning = v !== 'hazkara'; }
        redraw();
    })));
    const name = document.createElement('input');
    name.type = 'text'; name.className = 'dates-input'; name.maxLength = 80; name.value = f.name; name.placeholder = t('dates.f_name_ph');
    name.oninput = () => { f.name = name.value; };
    body.appendChild(dField(t('dates.f_name'), name));

    body.appendChild(dSegment([['civil', t('dates.f_mode_civil')], ['hebrew', t('dates.f_mode_hebrew')]], f.mode, v => { f.mode = v; redraw(); }, t('dates.f_mode')));
    const fieldsBox = dEl('div', 'dates-fields');
    const derivedBox = dEl('div', 'dates-derived');
    body.append(fieldsBox, derivedBox);
    datesRenderFields(fieldsBox, derivedBox);

    body.appendChild(dEl('div', 'settings-label', t('dates.f_remind')));
    body.appendChild(dCheck(t('dates.f_remind_eve'), f.eve, v => { f.eve = v; }));
    body.appendChild(dCheck(t('dates.f_remind_morning'), f.morning, v => { f.morning = v; }));
    const note = document.createElement('textarea');
    note.className = 'dates-input'; note.rows = 2; note.maxLength = 300; note.value = f.note; note.placeholder = t('dates.f_note_ph');
    note.oninput = () => { f.note = note.value; };
    body.appendChild(dField(t('dates.f_note'), note));

    if (f.error) body.appendChild(dEl('p', 'dates-error', f.error));
    const actions = dEl('div', 'lexgame-actions');
    const save = dEl('button', 'btn', t('dates.save'));
    save.type = 'button';
    save.onclick = datesSubmitForm;
    const cancel = dEl('button', 'btn btn-secondary', t('dates.cancel'));
    cancel.type = 'button';
    cancel.onclick = datesCloseForm;
    actions.append(save, cancel);
    if (f.id) {
        const del = dEl('button', 'btn btn-secondary', datesDeleteAsk ? t('dates.delete_yes') : t('dates.delete'));
        del.type = 'button';
        del.onclick = () => {
            if (!datesDeleteAsk) { datesDeleteAsk = true; redraw(); return; }
            datesSave(PersonalDatesCore.removeItem(datesStore(), f.id));
            datesCloseForm();
            datesRender();
        };
        actions.appendChild(del);
        if (datesDeleteAsk) body.appendChild(dEl('p', 'tool-small', t('dates.delete_confirm')));
    }
    body.appendChild(actions);
}

// Les champs de la date (civile, ou hébraïque), puis ce qui en dépend.
let datesFieldsBusy = false;       // vrai pendant le dessin des champs : retirer un champ actif peut déclencher son « change » une seconde fois, qui ne doit pas redessiner en plein dessin
function datesRenderFields(fieldsBox, derivedBox) {
    if (datesFieldsBusy) return;
    datesFieldsBusy = true;
    try { datesRenderFieldsNow(fieldsBox, derivedBox); } finally { datesFieldsBusy = false; }
}

function datesRenderFieldsNow(fieldsBox, derivedBox) {
    const f = datesForm;
    if (document.activeElement && fieldsBox.contains(document.activeElement)) document.activeElement.blur();
    toolClear(fieldsBox);
    const derived = () => datesRenderDerived(derivedBox);
    if (f.mode === 'civil') {
        const civil = document.createElement('input');
        civil.type = 'date'; civil.className = 'dates-input'; civil.value = f.civil;
        civil.onchange = () => { f.civil = civil.value; derived(); };
        fieldsBox.appendChild(dField(t('dates.f_civil'), civil));
        fieldsBox.appendChild(dCheck(t('dates.f_after'), f.after, v => { f.after = v; derived(); }));
        fieldsBox.appendChild(dEl('p', 'tool-small', t('dates.f_after_note')));
    } else {
        const yearOk = Number(f.hYear) >= HebrewCalendarCore.HEBREW_MIN && Number(f.hYear) <= HebrewCalendarCore.HEBREW_MAX;
        const months = HebrewCalendarCore.monthsOf(yearOk ? Number(f.hYear) : 5787);
        if (!months.some(m => m.id === f.hMonth)) f.hMonth = months[0].id;
        const year = document.createElement('input');
        year.type = 'number'; year.className = 'dates-input'; year.min = String(HebrewCalendarCore.HEBREW_MIN); year.max = String(HebrewCalendarCore.HEBREW_MAX); year.value = String(f.hYear);
        year.onchange = () => { f.hYear = Number(year.value) || f.hYear; datesRenderFields(fieldsBox, derivedBox); };      // les mois dépendent de l'année (Adar I et II)
        const row = dEl('div', 'dates-row3');
        row.append(
            dField(t('dates.f_hebrew_day'), dSelect(Array.from({ length: 30 }, (_, i) => [i + 1, String(i + 1)]), f.hDay, v => { f.hDay = Number(v); derived(); })),
            dField(t('dates.f_hebrew_month'), dSelect(months.map(m => [m.id, datesMonthName(yearOk ? Number(f.hYear) : 5787, m.id)]), f.hMonth, v => { f.hMonth = v; derived(); })),
            dField(t('dates.f_hebrew_year'), year)
        );
        fieldsBox.appendChild(row);
    }
    derived();
}

// La date équivalente et les options qui ne concernent que certaines dates : le sexe (bar ou bat-mitsva), l'Adar d'une année simple, le 30 'Hechvan ou 30 Kislev.
function datesRenderDerived(box) {
    const f = datesForm;
    toolClear(box);
    const h = datesFormHebrew(f);
    const equiv = dEl('p', 'tool-small dates-equiv');
    if (h) {
        equiv.textContent = f.mode === 'civil' ? t('dates.f_equiv_hebrew', { date: datesHebrewText(h) })
            : t('dates.f_equiv_civil', { date: datesCivilText(datesFixedCivil(CalendarYearCore.hebrewToFixed(h.year, h.month, h.day))) });
    }
    box.appendChild(equiv);
    if (f.type === 'birthday') box.appendChild(dField(t('dates.f_sex'), dSelect([['', t('dates.f_sex_none')], ['m', t('dates.f_sex_m')], ['f', t('dates.f_sex_f')]], f.sex, v => { f.sex = v; })));
    if (f.type === 'hazkara' && h && (h.month === 'Adar' || h.month === 'AdarII') && !HebrewCalendarCore.leap(h.year)) {
        const choice = t(riteGet() === 'sefarade' ? 'dates.f_adar_adar2' : 'dates.f_adar_adar1');
        box.appendChild(dField(t('dates.f_adar'), dSelect([['rite', t('dates.f_adar_rite', { choice: choice })], ['adar1', t('dates.f_adar_adar1')], ['adar2', t('dates.f_adar_adar2')], ['both', t('dates.f_adar_both')]], f.adar, v => { f.adar = v; })));
        box.appendChild(dEl('p', 'tool-small', t('dates.f_adar_note')));
    }
    if (f.type === 'hazkara' && h && h.day === 30 && (h.month === 'Heshvan' || h.month === 'Kislev')) {
        box.appendChild(dCheck(t('dates.f_both_days'), f.bothDays, v => { f.bothDays = v; }));
        box.appendChild(dEl('p', 'tool-small', t('dates.f_both_days_note')));
    }
}

function datesSubmitForm() {
    const f = datesForm;
    if (!f.name.trim()) { f.error = t('dates.err_name'); datesRenderForm(); return; }
    const h = datesFormHebrew(f);
    if (!h) { f.error = t('dates.err_date'); datesRenderForm(); return; }
    const raw = { type: f.type, name: f.name, hebrew: h, remind: { eve: f.eve, morning: f.morning }, note: f.note };
    if (f.mode === 'civil') { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.civil); raw.civil = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), after: f.after }; }
    if (f.type === 'birthday' && f.sex) raw.sex = f.sex;
    if (f.type === 'hazkara') { if (f.adar !== 'rite') raw.adar = f.adar; if (f.bothDays && h.day === 30) raw.bothDays = true; }
    const store = datesStore();
    if (!f.id && store.items.length >= PersonalDatesCore.MAX_ITEMS) { f.error = t('dates.err_full'); datesRenderForm(); return; }
    datesSave(f.id ? PersonalDatesCore.updateItem(store, f.id, raw) : PersonalDatesCore.addItem(store, raw));
    datesCloseForm();
    datesRender();
}
