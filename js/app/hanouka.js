// =========================================================================
// === HANOUKA : LE SOIR (écran) ===
// =========================================================================
// Ouvert en touchant la notification du rappel de Hanouka (js/notifications.js, route « hanouka »).
// Montre le nombre de bougies du soir, l'ordre de l'allumage, les bénédictions (data/siddur/hanouka-allumage.json) et les chants (Maoz Tsour,
// data/siddur/hanouka-maoz-tsour.json), avec leur traduction (data/siddur/fr/). Le texte complet reste dans le Siddour.

let hanoukaReturn = 'screen-main';
let hanoukaState = { night: 0, friday: false };

// Les bougies de ce soir quand on ouvre l'écran sans notification : 0 hors de Hanouka.
function hanoukaTonight() {
    try {
        const ctx = sdComputeContext();
        const part = DayNotesCore.notesOf(ctx.fixed, ctx.israel).parts.filter(p => p.type === 'hanouka' && !p.last)[0];
        return part ? { night: part.candles, friday: part.weekday === 5 } : { night: 0, friday: false };
    } catch (e) { return { night: 0, friday: false }; }
}

function openHanouka(fromScreen, opts) {
    hanoukaReturn = fromScreen || 'screen-main';
    const o = opts || {};
    const today = Number.isInteger(o.night) && o.night >= 1 && o.night <= 8 ? { night: o.night, friday: !!o.friday } : hanoukaTonight();
    hanoukaState = today;
    showScreen('screen-hanouka', 'forward');
    hanoukaRender();
}

function hanoukaBack() { gamesBackTo(hanoukaReturn); }

function hanoukaEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}

function hanoukaPlain(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent.replace(/\s+/g, ' ').trim();
}

// Un bloc « hébreu puis français ».
function hanoukaVerse(parent, he, fr, cls) {
    const box = hanoukaEl('div', 'han-verse' + (cls ? ' ' + cls : ''));
    if (he) { const h = hanoukaEl('p', 'han-he', he); h.lang = 'he'; h.dir = 'rtl'; box.appendChild(h); }
    if (fr) box.appendChild(hanoukaEl('p', 'han-fr', fr));
    parent.appendChild(box);
}

function hanoukaRender() {
    const body = document.getElementById('hanouka-body');
    body.textContent = '';
    const { night, friday } = hanoukaState;
    if (!night) {
        body.appendChild(hanoukaEl('p', 'han-note', t('hanouka.none')));
        return;
    }
    body.appendChild(hanoukaEl('div', 'han-night', t('hanouka.night', { n: night })));
    const flames = hanoukaEl('div', 'han-flames');
    flames.setAttribute('aria-hidden', 'true');
    flames.appendChild(hanoukaEl('span', 'han-shamash', '🕯️'));
    for (let i = 0; i < night; i++) flames.appendChild(hanoukaEl('span', 'han-flame', '🕯️'));
    body.appendChild(flames);
    body.appendChild(hanoukaEl('p', 'han-count', t(night === 1 ? 'hanouka.count_1' : 'hanouka.count_n', { n: night })));
    body.appendChild(hanoukaEl('p', 'han-note', t('hanouka.how')));
    if (friday) body.appendChild(hanoukaEl('p', 'han-note han-warn', t('hanouka.friday')));
    else if (new Date().getDay() === 6) body.appendChild(hanoukaEl('p', 'han-note han-warn', t('hanouka.motsei')));

    const text = hanoukaEl('div', 'han-text');
    body.appendChild(text);
    const full = hanoukaEl('button', 'omer-full', t('hanouka.open_siddur'));
    full.type = 'button';
    full.onclick = () => openSiddurSections(['hanouka-allumage', 'hanouka-maoz-tsour'], t('hanouka.siddur_title'));
    body.appendChild(full);

    Promise.all([sdLoadSection('hanouka-allumage'), sdLoadFr('hanouka-allumage'), sdLoadSection('hanouka-maoz-tsour'), sdLoadFr('hanouka-maoz-tsour')]).then(([all, allFr, maoz, maozFr]) => {
        if (hanoukaState.night !== night) return;
        text.textContent = '';
        const fr = (tr, i) => (tr && tr[i] ? tr[i][1] : '');
        const he = (sec, i) => hanoukaPlain(sec.segments[i] || '');
        text.appendChild(hanoukaEl('h3', 'han-h', t('hanouka.blessings')));
        hanoukaVerse(text, he(all, 3), fr(allFr, 3));                 // « … lehadlik ner Hanouka »
        hanoukaVerse(text, he(all, 4), fr(allFr, 4));                 // « … chéassa nissim »
        if (night === 1) {
            text.appendChild(hanoukaEl('p', 'han-note', t('hanouka.first_night')));
            hanoukaVerse(text, he(all, 6), fr(allFr, 6));             // Chéhé'héyanou
        }
        text.appendChild(hanoukaEl('p', 'han-note', t('hanouka.after_lighting')));
        hanoukaVerse(text, he(all, 8), fr(allFr, 8));                 // Hanérot halalou
        text.appendChild(hanoukaEl('h3', 'han-h', t('hanouka.songs')));
        text.appendChild(hanoukaEl('p', 'han-note', t('hanouka.maoz_title')));
        for (let i = 1; i <= 6; i++) hanoukaVerse(text, he(maoz, i), fr(maozFr, i));
    }).catch(() => { text.textContent = ''; text.appendChild(hanoukaEl('p', 'han-note', t('hanouka.load_error'))); });
}
