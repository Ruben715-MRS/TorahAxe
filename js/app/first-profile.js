// Profil de l'utilisateur : homme ou femme (js/profileCore.js) et rite (js/app/settings.js). Au premier lancement, une fiche d'accueil pose les deux questions ;
// les Réglages permettent de les changer ensuite. Le genre sert à montrer, dans le Siddour, la version du texte qui concerne la personne (bénédictions du matin, Modé ani).
// Rien n'est envoyé nulle part : tout reste sur l'appareil.
const GENDER_KEY = 'torahaxe_gender_v1';
const WELCOME_KEY = 'torahaxe_welcome_v1';

function profileGender() {
    try { return ProfileCore.normalizeGender(localStorage.getItem(GENDER_KEY)); } catch (e) { return null; }
}
function profileGenderSet(g) {
    const v = ProfileCore.normalizeGender(g);
    try { if (v) localStorage.setItem(GENDER_KEY, v); else localStorage.removeItem(GENDER_KEY); } catch (e) { /* valable pour cette séance */ }
    // L'accueil (carte des mitsvot des femmes) et le Siddour suivent le nouveau profil.
    if (typeof homeRefresh === 'function') homeRefresh();
    const screen = typeof toolEl === 'function' ? toolEl('screen-tool-siddur') : null;
    if (screen && !screen.classList.contains('hidden') && typeof sdRerender === 'function') sdRerender();
}
function profileWelcomeDone() {
    try { return localStorage.getItem(WELCOME_KEY) === '1'; } catch (e) { return true; }   // sans stockage, on ne repose pas la question à chaque ouverture
}
function profileWelcomeMark() {
    try { localStorage.setItem(WELCOME_KEY, '1'); } catch (e) { /* sans importance */ }
}

function profileNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

// Une rangée de choix exclusifs : { id, label }, avec le choix courant.
function profileChoices(label, options, current, onPick) {
    const wrap = profileNode('div', 'settings-group');
    wrap.appendChild(profileNode('div', 'settings-label', label));
    const seg = profileNode('div', 'segmented');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', label);
    options.forEach(o => {
        const b = profileNode('button', o.id === current ? 'active' : '', o.label);
        b.type = 'button';
        b.setAttribute('aria-pressed', o.id === current ? 'true' : 'false');
        b.onclick = () => {
            Array.prototype.forEach.call(seg.children, el => { const on = el === b; el.className = on ? 'active' : ''; el.setAttribute('aria-pressed', on ? 'true' : 'false'); });
            onPick(o.id);
        };
        seg.appendChild(b);
    });
    wrap.appendChild(seg);
    return wrap;
}

const PROFILE_RITES = [['sefarade', 'dates.rite_sefarade'], ['ashkenaze', 'dates.rite_ashkenaze'], ['habad', 'dates.rite_habad']];

// Réglages : le profil, avant le rite.
function profileRender(body) {
    const cur = profileGender() || 'none';
    const g = profileChoices(t('welcome.settings_label'), [
        { id: 'm', label: t('welcome.gender_m') }, { id: 'f', label: t('welcome.gender_f') }, { id: 'none', label: t('welcome.gender_none') }
    ], cur, id => profileGenderSet(id === 'none' ? null : id));
    g.appendChild(profileNode('p', 'modal-desc', t('welcome.settings_note')));
    body.appendChild(g);
}

// La fiche d'accueil : au premier lancement seulement (« Plus tard » compte aussi : on ne la repose pas).
function profileWelcomeShow() {
    if (document.getElementById('first-profile')) return;
    let gender = profileGender();
    let rite = typeof riteStored === 'function' ? riteStored() : null;

    const overlay = profileNode('div', 'first-profile-overlay');
    overlay.id = 'first-profile';
    const card = profileNode('div', 'first-profile-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'first-profile-title');
    const title = profileNode('h2', 'first-profile-title', t('welcome.title'));
    title.id = 'first-profile-title';
    card.append(title, profileNode('p', 'first-profile-intro', t('welcome.intro')));

    const start = profileNode('button', 'btn', t('welcome.start'));
    start.type = 'button';
    const hint = profileNode('p', 'modal-desc', t('welcome.pick_both'));
    const refresh = () => { start.disabled = !(gender && rite); hint.hidden = !start.disabled; };

    const g = profileChoices(t('welcome.gender_label'), [{ id: 'm', label: t('welcome.gender_m') }, { id: 'f', label: t('welcome.gender_f') }], gender, id => { gender = id; refresh(); });
    g.appendChild(profileNode('p', 'modal-desc', t('welcome.gender_note')));
    const r = profileChoices(t('welcome.rite_label'), PROFILE_RITES.map(x => ({ id: x[0], label: t(x[1]) })), rite, id => { rite = id; refresh(); });
    r.appendChild(profileNode('p', 'modal-desc', t('welcome.rite_note')));

    const close = () => { profileWelcomeMark(); overlay.remove(); };
    start.onclick = () => {
        if (!(gender && rite)) return;
        profileGenderSet(gender);
        if (typeof riteSet === 'function') riteSet(rite);
        close();
    };
    const skip = profileNode('button', 'final-link', t('welcome.skip'));
    skip.type = 'button';
    skip.onclick = close;

    card.append(g, r, hint, start, skip);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    refresh();
    try { card.querySelector('button').focus(); } catch (e) { /* sans importance */ }
}

function profileWelcomeMaybeShow() {
    if (!profileWelcomeDone()) profileWelcomeShow();
}
