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

// Les cases de l'onglet Aujourd'hui : [{ kind, label }] ; `kinds` : celles dont l'étude existe aujourd'hui.
function studyChips(kinds, fixed) {
    const store = studyStore();
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
