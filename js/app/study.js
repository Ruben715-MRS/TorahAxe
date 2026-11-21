// =========================================================================
// === SUIVI D'ÉTUDE (case « étudié » sous l'étude du jour ; réglage dans les Réglages) ===
// =========================================================================
// Désactivé par défaut. Voir js/studyCore.js pour le principe (repère personnel, sur l'appareil ; hors série et niveaux).
const STUDY_KEY = 'torahaxe_study_v1';

function studyStore() {
    try { return StudyCore.normalize(JSON.parse(localStorage.getItem(STUDY_KEY) || 'null')); } catch (e) { return StudyCore.normalize(null); }
}
function studySave(store) { try { localStorage.setItem(STUDY_KEY, JSON.stringify(store)); } catch (e) { /* valable pour cette séance */ } }
function studyOn() { return studyStore().on; }

function studySetOn(on) {
    const s = studyStore();
    s.on = !!on;
    studySave(s);
    if (typeof apRender === 'function') apRender();
}

function studyToggle(kind, fixed) {
    studySave(StudyCore.toggle(studyStore(), kind, fixed));
    if (typeof homeRefresh === 'function') homeRefresh();
}

// Les cartes d'étude affichées dans l'onglet Aujourd'hui (Réglages › Cartes d'étude).
function studyCardOn(kind) { return StudyCore.cardOn(studyStore(), kind); }
function studySetCard(kind, on) {
    studySave(StudyCore.setCard(studyStore(), kind, on));
    if (typeof apRender === 'function') apRender();
}

// Les cases de l'onglet Aujourd'hui : [{ kind, label }] ; `kinds` : celles dont l'étude existe aujourd'hui.
function studyChips(kinds, fixed) {
    const store = studyStore();
    kinds = kinds.filter(k => StudyCore.cardOn(store, k));
    if (!store.on || !kinds.length) return null;
    const row = document.createElement('div');
    row.className = 'study-chips';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', t('study.group'));
    kinds.forEach(kind => {
        const done = StudyCore.isDone(store, kind, fixed);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'study-chip' + (done ? ' is-done' : '');
        b.setAttribute('aria-pressed', done ? 'true' : 'false');
        b.textContent = (done ? '✓ ' : '○ ') + t('study.kind_' + kind);
        b.onclick = () => studyToggle(kind, fixed);
        row.appendChild(b);
    });
    return row;
}

// Le réglage (Réglages) : une case à cocher, avec une phrase d'explication.
function stRender(body) {
    const group = document.createElement('div');
    group.className = 'settings-group';
    const label = document.createElement('div');
    label.className = 'settings-label';
    label.textContent = t('study.setting_label');
    const seg = document.createElement('div');
    seg.className = 'segmented';
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', t('study.setting_label'));
    const on = studyOn();
    [[false, t('study.off')], [true, t('study.on')]].forEach(([value, text]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = text;
        b.className = on === value ? 'active' : '';
        b.setAttribute('aria-pressed', on === value ? 'true' : 'false');
        b.onclick = () => studySetOn(value);
        seg.appendChild(b);
    });
    const note = document.createElement('p');
    note.className = 'modal-desc';
    note.textContent = t('study.setting_note');
    group.append(label, seg, note);
    body.appendChild(group);
}

// Le réglage des cartes (Réglages) : une case par carte.
function stCardsRender(body) {
    const group = document.createElement('div');
    group.className = 'settings-group';
    const label = document.createElement('div');
    label.className = 'settings-label';
    label.textContent = t('study.cards_label');
    group.appendChild(label);
    StudyCore.KINDS.forEach(kind => {
        const row = document.createElement('label');
        row.className = 'settings-check';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = studyCardOn(kind);
        box.onchange = () => studySetCard(kind, box.checked);
        const text = document.createElement('span');
        text.textContent = ' ' + t('study.card_' + kind);
        row.append(box, text);
        group.appendChild(row);
    });
    const note = document.createElement('p');
    note.className = 'modal-desc';
    note.textContent = t('study.cards_note');
    group.appendChild(note);
    body.appendChild(group);
}
