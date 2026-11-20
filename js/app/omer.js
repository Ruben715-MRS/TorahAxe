// =========================================================================
// === COMPTE DE L'OMER (écran) ===
// =========================================================================
// Ouvert depuis la carte « Omer » de l'onglet Aujourd'hui, ou en touchant la notification du rappel de l'Omer (js/notifications.js).
// Le soir : la bénédiction puis le compte du jour. Le matin (si l'on a oublié la veille) : le compte seul, sans bénédiction.
// Les textes hébreux viennent de data/siddur/omer.json (celui du Siddour) ; le calcul du jour, de SiddurCore.contextFor (jour hébraïque, tombée de la nuit).

let omerReturn = 'screen-main';
let omerState = { n: 0, mode: 'evening' };
let omerSection = null;

// Le compte du moment : { n, tonight, mode } ; n = 0 hors de la période (1 → 49).
//  Entre la chkia et la sortie des étoiles, le jour hébraïque n'a pas encore changé mais c'est déjà « ce soir » : on propose le compte de ce soir.
function omerToday() {
    try {
        const ctx = sdComputeContext();
        let n = ctx.omer || 0, mode = 'morning';
        if (sdPlace && sdBetweenShkiaAndTzeit()) {
            const israel = profileIsrael(sdPlace);
            n = SiddurCore.contextFor(ctx.fixed + 1, israel).omer || 0;
            mode = 'evening';
        } else if (sdPlace && sdCurrentPrayer() === 'arvit') mode = 'evening';
        else if (!sdPlace) mode = 'evening';
        return { n: n >= 1 && n <= 49 ? n : 0, mode: mode };
    } catch (e) { return { n: 0, mode: 'evening' }; }
}

function omerStripNiqqud(s) { return s.replace(/[֑-ׇ]/g, ''); }
function omerPlain(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent.replace(/[<>]{2}/g, '').replace(/\s+/g, ' ').trim();
}

function omerLoad() {
    if (omerSection) return Promise.resolve(omerSection);
    return sdLoadSection('omer').then(sec => { omerSection = sec; return sec; });
}

// n : le jour à compter (extra de la notification) ; mode : 'evening' | 'morning'.
function openOmer(fromScreen, opts) {
    omerReturn = fromScreen || 'screen-main';
    const today = omerToday();
    const o = opts || {};
    const n = Number.isInteger(o.day) && o.day >= 1 && o.day <= 49 ? o.day : today.n;
    omerState = { n: n, mode: o.mode === 'morning' || o.mode === 'evening' ? o.mode : today.mode };
    showScreen('screen-omer', 'forward');
    omerRender();
}

function omerBack() { gamesBackTo(omerReturn); }

function omerEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}

function omerRender() {
    const body = document.getElementById('omer-body');
    body.textContent = '';
    const { n, mode } = omerState;
    if (!n) {
        body.appendChild(omerEl('p', 'omer-none', t('omer.none')));
        return;
    }
    body.appendChild(omerEl('div', 'omer-day', t('omer.day', { n: n })));
    body.appendChild(omerEl('p', 'omer-count-fr', ZmanimReminderCore.omerCount(n, t)));

    const seg = omerEl('div', 'omer-modes');
    [['evening', t('omer.mode_evening')], ['morning', t('omer.mode_morning')]].forEach(([id, label]) => {
        const b = omerEl('button', 'omer-mode' + (mode === id ? ' is-on' : ''), label);
        b.type = 'button';
        b.setAttribute('aria-pressed', mode === id ? 'true' : 'false');
        b.onclick = () => { omerState.mode = id; omerRender(); };
        seg.appendChild(b);
    });
    body.appendChild(seg);

    const text = omerEl('div', 'omer-text');
    body.appendChild(text);
    body.appendChild(omerEl('p', 'omer-note', t(mode === 'evening' ? 'omer.note_evening' : 'omer.note_morning')));
    const full = omerEl('button', 'omer-full', t('omer.open_siddur'));
    full.type = 'button';
    full.onclick = () => openSiddurSections(['omer'], t('omer.siddur_title'));
    body.appendChild(full);

    omerLoad().then(sec => {
        if (omerState.n !== n || omerState.mode !== mode) return;
        text.textContent = '';
        if (mode === 'evening') {
            const idx = sec.segments.findIndex(s => !/^\s*(<[^>]*>)*\s*(&lt;|<){2}/.test(s) && /עלספירתהעמר/.test(omerStripNiqqud(omerPlain(s)).replace(/\s/g, '')));
            if (idx !== -1) {
                const he = omerEl('p', 'omer-he', omerPlain(sec.segments[idx]));
                he.lang = 'he'; he.dir = 'rtl';
                text.appendChild(he);
                text.appendChild(omerEl('p', 'omer-fr', t('omer.blessing_fr')));
                text.appendChild(omerEl('p', 'omer-translit', t('omer.blessing_translit')));
            }
        }
        const at = SiddurCore.omerSegment(sec.segments, n);
        if (at !== -1) {
            const he = omerEl('p', 'omer-he omer-he-count', omerPlain(sec.segments[at]));
            he.lang = 'he'; he.dir = 'rtl';
            text.appendChild(he);
        }
    }).catch(() => { text.textContent = ''; text.appendChild(omerEl('p', 'omer-note', t('omer.load_error'))); });
}

// La carte de l'onglet Aujourd'hui : null hors de la période.
function omerTodayCard() {
    const o = omerToday();
    if (!o.n) return null;
    return { n: o.n, tonight: o.mode === 'evening' && sdPlace && sdBetweenShkiaAndTzeit() };
}
