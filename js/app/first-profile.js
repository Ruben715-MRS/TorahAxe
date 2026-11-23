// Profil de l'utilisateur : homme ou femme, domicile (Israël ou diaspora) (js/profileCore.js) et rite (js/app/settings.js). Au premier lancement, une fiche d'accueil pose
// les trois questions ; les Réglages permettent de les changer ensuite. Le genre sert à montrer, dans le Siddour, la version du texte qui concerne la personne (bénédictions
// du matin, Modé ani) ; le domicile règle les jours de fête, la paracha et la prière (profileIsrael). Rien n'est envoyé nulle part : tout reste sur l'appareil.
const GENDER_KEY = 'torahaxe_gender_v1';
const WELCOME_KEY = 'torahaxe_welcome_v1';
const DOMICILE_KEY = 'torahaxe_domicile_v1';
const DOMICILE_ASKED_KEY = 'torahaxe_domicile_asked_v1';

function profileGender() {
    try { return ProfileCore.normalizeGender(localStorage.getItem(GENDER_KEY)); } catch (e) { return null; }
}
function profileGenderSet(g) {
    const v = ProfileCore.normalizeGender(g);
    try { if (v) localStorage.setItem(GENDER_KEY, v); else localStorage.removeItem(GENDER_KEY); } catch (e) { /* valable pour cette séance */ }
    // L'accueil (carte des mitsvot des femmes) et le Siddour suivent le nouveau profil.
    profileRefreshAll();
}
function profileWelcomeDone() {
    try { return localStorage.getItem(WELCOME_KEY) === '1'; } catch (e) { return true; }   // sans stockage, on ne repose pas la question à chaque ouverture
}
function profileWelcomeMark() {
    try { localStorage.setItem(WELCOME_KEY, '1'); } catch (e) { /* sans importance */ }
}


// --- Domicile ------------------------------------------------------------------------------------------------------------------------------
function profileDomicile() {
    try { return ProfileCore.normalizeDomicile(localStorage.getItem(DOMICILE_KEY)); } catch (e) { return null; }
}
function profileDomicileSet(d) {
    const v = ProfileCore.normalizeDomicile(d);
    try { if (v) localStorage.setItem(DOMICILE_KEY, v); else localStorage.removeItem(DOMICILE_KEY); } catch (e) { /* valable pour cette séance */ }
    profileDomicileAskedMark();
    // L'écran Calendrier suit le domicile tant qu'on n'y a pas fait son propre choix.
    try { if (localStorage.getItem('hcalIsrael') === null && typeof hcalIsrael !== 'undefined') hcalIsrael = v === 'israel'; } catch (e) { /* sans importance */ }
    profileRefreshAll();
}
function profileDomicileAskedMark() { try { localStorage.setItem(DOMICILE_ASKED_KEY, '1'); } catch (e) { /* sans importance */ } }
function profileDomicileAsked() { try { return localStorage.getItem(DOMICILE_ASKED_KEY) === '1'; } catch (e) { return true; } }

// Une première suggestion : d'après le lieu des Zmanim s'il y en a un, sinon le fuseau horaire de l'appareil.
function profileDomicileGuess() {
    try {
        const p = ZmanimCore.normalizePlace(JSON.parse(localStorage.getItem('zmanimPlace') || 'null'));
        if (p) return ZmanimCore.inIsrael(p) ? 'israel' : 'diaspora';
    } catch (e) { /* on se rabat sur le fuseau */ }
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* diaspora */ }
    return ProfileCore.guessDomicile(tz);
}

// Israël (vrai) ou diaspora (faux) pour les jours de fête, la paracha et la prière : le domicile s'il est choisi, sinon le lieu (comme avant).
function profileIsrael(place) {
    return ProfileCore.isIsrael(profileDomicile(), place ? ZmanimCore.inIsrael(place) : false);
}

// La mention de voyage : le lieu des Zmanim n'est pas du côté où la personne habite. Un paragraphe, ou null.
function profileTravelNoteEl(place) {
    if (!place) return null;
    const kind = ProfileCore.travelNote(profileDomicile(), ZmanimCore.inIsrael(place));
    if (!kind) return null;
    const p = profileNode('p', 'profile-travel', t('welcome.travel_' + kind));
    p.setAttribute('role', 'note');
    return p;
}

// Tout ce qui dépend du profil se redessine : l'accueil, le Siddour et les Zmanim s'ils sont ouverts.
function profileRefreshAll() {
    if (typeof homeRefresh === 'function') homeRefresh();
    const open = id => { const el = typeof toolEl === 'function' ? toolEl(id) : null; return !!el && !el.classList.contains('hidden'); };
    if (open('screen-tool-siddur') && typeof sdRerender === 'function') sdRerender();
    if (open('screen-tool-zmanim') && typeof zmRender === 'function') zmRender(true);
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
    const seg = profileNode('div', 'ben-rites' + (options.length === 2 ? ' seg-2' : ''));      // la bande du guide des Bénédictions (css/style.css)
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', label);
    options.forEach(o => {
        const b = profileNode('button', 'ben-rite', o.label);
        b.type = 'button';
        b.setAttribute('aria-pressed', o.id === current ? 'true' : 'false');
        b.onclick = () => {
            Array.prototype.forEach.call(seg.children, el => el.setAttribute('aria-pressed', el === b ? 'true' : 'false'));
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
    const dom = profileChoices(t('welcome.domicile_label'), [
        { id: 'israel', label: t('welcome.domicile_israel') }, { id: 'diaspora', label: t('welcome.domicile_diaspora') }, { id: 'none', label: t('welcome.domicile_none') }
    ], profileDomicile() || 'none', id => profileDomicileSet(id === 'none' ? null : id));
    dom.appendChild(profileNode('p', 'modal-desc', t('welcome.domicile_settings_note')));
    body.appendChild(dom);
}

// La fiche d'accueil : au premier lancement seulement (« Plus tard » compte aussi : on ne la repose pas).
function profileWelcomeShow() {
    if (document.getElementById('first-profile')) return;
    let gender = profileGender();
    let rite = typeof riteStored === 'function' ? riteStored() : null;
    let domicile = profileDomicile() || profileDomicileGuess();       // pré-cochée, jamais imposée : la personne peut la changer

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
    const hint = profileNode('p', 'modal-desc first-profile-hint', t('welcome.pick_both'));
    const refresh = () => { start.disabled = !(gender && rite); hint.hidden = !start.disabled; };

    const g = profileChoices(t('welcome.gender_label'), [{ id: 'm', label: t('welcome.gender_m') }, { id: 'f', label: t('welcome.gender_f') }], gender, id => { gender = id; refresh(); });
    g.appendChild(profileNode('p', 'modal-desc', t('welcome.gender_note')));
    const d = profileChoices(t('welcome.domicile_label'), [{ id: 'israel', label: t('welcome.domicile_israel') }, { id: 'diaspora', label: t('welcome.domicile_diaspora') }], domicile, id => { domicile = id; });
    d.appendChild(profileNode('p', 'modal-desc', t('welcome.domicile_note')));
    const r = profileChoices(t('welcome.rite_label'), PROFILE_RITES.map(x => ({ id: x[0], label: t(x[1]) })), rite, id => { rite = id; refresh(); });
    r.appendChild(profileNode('p', 'modal-desc', t('welcome.rite_note')));

    const close = () => { profileWelcomeMark(); profileDomicileAskedMark(); overlay.remove(); };
    start.onclick = () => {
        if (!(gender && rite)) return;
        profileGenderSet(gender);
        profileDomicileSet(domicile);
        if (typeof riteSet === 'function') riteSet(rite);
        close();
    };
    const skip = profileNode('button', 'final-link', t('welcome.skip'));
    skip.type = 'button';
    skip.onclick = close;

    const actions = profileNode('div', 'first-profile-actions');
    actions.append(start, skip);
    card.append(g, d, r, hint, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    refresh();
    try { card.querySelector('button').focus(); } catch (e) { /* sans importance */ }
}

// Les personnes qui ont déjà passé la fiche n'ont pas été interrogées sur leur domicile : une question, une seule fois, pré-remplie d'après leur lieu.
function profileDomicileAskShow() {
    if (document.getElementById('first-profile')) return;
    let domicile = profileDomicileGuess();
    const overlay = profileNode('div', 'first-profile-overlay');
    overlay.id = 'first-profile';
    const card = profileNode('div', 'first-profile-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'first-profile-title');
    const title = profileNode('h2', 'first-profile-title', t('welcome.ask_title'));
    title.id = 'first-profile-title';
    card.append(title, profileNode('p', 'first-profile-intro', t('welcome.ask_intro')));
    const d = profileChoices(t('welcome.domicile_label'), [{ id: 'israel', label: t('welcome.domicile_israel') }, { id: 'diaspora', label: t('welcome.domicile_diaspora') }], domicile, id => { domicile = id; });
    d.appendChild(profileNode('p', 'modal-desc', t('welcome.domicile_note')));
    const ok = profileNode('button', 'btn', t('welcome.ask_confirm'));
    ok.type = 'button';
    ok.onclick = () => { profileDomicileSet(domicile); overlay.remove(); };
    const later = profileNode('button', 'final-link', t('welcome.skip'));
    later.type = 'button';
    later.onclick = () => { profileDomicileAskedMark(); overlay.remove(); };
    const actions = profileNode('div', 'first-profile-actions');
    actions.append(ok, later);
    card.append(d, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    try { ok.focus(); } catch (e) { /* sans importance */ }
}

function profileWelcomeMaybeShow() {
    if (!profileWelcomeDone()) profileWelcomeShow();
    else if (!profileDomicileAsked()) profileDomicileAskShow();
}
