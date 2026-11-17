// =========================================================================
// === « LE BON ORDRE » : LE JEU DE CLASSEMENT (onglet « Jouer ») ===
// =========================================================================
// Les règles et les listes sont dans js/orderGameCore.js (pur, testé) : cinq éléments en désordre, à remettre dans l'ordre de la Torah, du Tanakh, de la Michna, du Talmud, des
// générations, des fils de Jacob ou des rois ; 20 points par élément à la bonne place. Ici : le chargement des index (parachiot, Tanakh, Michna, Talmud : environ 40 Ko, une
// fois), les places et les éléments à toucher, et la correction. On touche un élément pour le placer à la première place libre, et un élément placé pour le retirer.
// Tout ce qui vient des données passe par textContent.

let ordergame = null;
let ordergameReturn = 'screen-main';
let ordergameSection = 'all';
let ordergameData = null;         // { parashot, tanakh, michna, talmud }, une fois chargé
let ordergameLoading = false;
let ordergamePlaced = [];         // les identifiants placés, dans l'ordre des places

const ORDERGAME_PREFS_KEY = 'torahaxe_ordergame_prefs_v1';

function openOrderGame(fromScreen) {
    ordergameReturn = fromScreen || 'screen-main';
    showScreen('screen-ordergame', 'forward');
    const raw = QuizUI.loadPrefs(ORDERGAME_PREFS_KEY);
    ordergameSection = raw && OrderGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
    ordergameSetup();
}

function ordergameBack() { gamesBackTo(ordergameReturn); }

function ordergameSetSection(section) {
    if (OrderGameCore.SECTIONS.indexOf(section) < 0) return;
    ordergameSection = section;
    QuizUI.savePrefs(ORDERGAME_PREFS_KEY, { section: ordergameSection });
    ordergameSetup();
}

function ordergameLoad(then) {
    if (ordergameData) { then(); return; }
    if (ordergameLoading) return;
    ordergameLoading = true;
    document.getElementById('ordergame-load').textContent = t('ordergame.loading');
    const json = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });
    Promise.all([json('data/torah/parashot.json'), json('data/tanakh/index.json'), json('data/michna/index.json'), json('data/talmud/index.json')]).then(all => {
        ordergameData = { parashot: all[0], tanakh: all[1], michna: all[2], talmud: all[3] };
        ordergameLoading = false;
        then();
    }).catch(() => { ordergameLoading = false; document.getElementById('ordergame-load').textContent = t('ordergame.load_error'); });
}

function ordergameSetup() {
    ordergame = null;
    QuizUI.phase('ordergame', 'setup');
    QuizUI.chips('ordergame', OrderGameCore.SECTIONS.map(section => ({ id: section, label: t('ordergame.section_' + section) })), ordergameSection, ordergameSetSection);
    const start = document.getElementById('ordergame-start');
    if (ordergameData) { document.getElementById('ordergame-load').textContent = ''; start.classList.remove('hidden'); return; }
    start.classList.add('hidden');
    ordergameLoad(() => { if (!document.getElementById('screen-ordergame').classList.contains('hidden') && !ordergame) ordergameSetup(); });
}

function ordergameStart() {
    if (!ordergameData) return;
    ordergame = OrderGameCore.createGame({ data: ordergameData, section: ordergameSection });
    QuizUI.phase('ordergame', 'play');
    ordergameRender();
}

// --- Un classement ----------------------------------------------------------------------------------------------------------------------------
function ordergameRender() {
    const g = ordergame;
    const q = OrderGameCore.question(g);
    ordergamePlaced = [];
    QuizUI.status('ordergame', g);
    document.getElementById('ordergame-question').textContent = q.instruction;
    document.getElementById('ordergame-feedback').classList.add('hidden');
    document.getElementById('ordergame-actions').classList.remove('hidden');
    ordergameDraw();
}

// Un élément : son nom, et son nom hébreu en petit.
function ordergameChip(detail, className) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.appendChild(document.createTextNode(detail.label));
    if (detail.he) {
        const he = document.createElement('span');
        he.className = 'he'; he.lang = 'he'; he.dir = 'rtl';
        he.textContent = detail.he;
        btn.appendChild(he);
    }
    return btn;
}

function ordergameDraw() {
    const g = ordergame;
    const q = OrderGameCore.question(g);
    const resolved = !!g.resolved;
    const slots = document.getElementById('ordergame-slots');
    toolClear(slots);
    for (let i = 0; i < q.order.length; i++) {
        const li = document.createElement('li');
        li.className = 'ordergame-slot';
        const n = document.createElement('span');
        n.className = 'ordergame-n';
        n.textContent = String(i + 1);
        li.appendChild(n);
        // Une fois corrigé, les places montrent le classement rendu, vert ou rouge.
        const id = resolved ? g.last.placed[i] : ordergamePlaced[i];
        if (id) {
            const chip = ordergameChip(q.details[id], 'ordergame-chip');
            chip.setAttribute('aria-label', t('ordergame.slot_aria', { n: i + 1, label: q.details[id].label }));
            chip.disabled = resolved;
            chip.onclick = () => { ordergamePlaced.splice(i, 1); ordergameDraw(); };
            li.classList.add('is-filled');
            if (resolved) li.classList.add(g.last.correct[i] ? 'correct' : 'wrong');
            li.appendChild(chip);
        } else {
            const empty = document.createElement('span');
            empty.className = 'ordergame-empty';
            empty.textContent = t('ordergame.slot_empty');
            li.appendChild(empty);
        }
        slots.appendChild(li);
    }
    const pool = document.getElementById('ordergame-pool');
    toolClear(pool);
    if (!resolved) {
        q.items.filter(it => ordergamePlaced.indexOf(it.id) < 0).forEach(it => {
            const chip = ordergameChip(q.details[it.id], 'ordergame-chip');
            chip.setAttribute('aria-label', t('ordergame.chip_aria', { label: it.label }));
            chip.onclick = () => { if (ordergamePlaced.length < q.order.length) { ordergamePlaced.push(it.id); ordergameDraw(); } };
            pool.appendChild(chip);
        });
    }
    document.getElementById('ordergame-check').disabled = resolved || ordergamePlaced.length < q.order.length;
    document.getElementById('ordergame-clear').disabled = resolved || !ordergamePlaced.length;
}

function ordergameClear() {
    if (ordergame && !ordergame.resolved) { ordergamePlaced = []; ordergameDraw(); }
}

function ordergameCheck() {
    const g = ordergame;
    const events = OrderGameCore.submit(g, ordergamePlaced.slice());
    if (!events.length) return;
    arcadeSound(events[0] === 'perfect' ? 'good' : 'bad');
    const q = OrderGameCore.question(g);
    QuizUI.status('ordergame', g);
    ordergameDraw();
    document.getElementById('ordergame-actions').classList.add('hidden');
    const last = g.last;
    const title = events[0] === 'perfect' ? t('ordergame.perfect', { points: last.points })
        : events[0] === 'partial' ? t('ordergame.partial', { count: last.count, size: q.order.length, points: last.points }) : t('ordergame.wrong');
    const feedback = document.getElementById('ordergame-feedback');
    feedback.classList.toggle('is-wrong', events[0] !== 'perfect');
    document.getElementById('ordergame-feedback-title').textContent = title;
    // Le bon ordre, avec ce que chaque élément porte de plus (son livre, son séder, son rang).
    const list = document.getElementById('ordergame-answer');
    toolClear(list);
    q.order.forEach((id, i) => {
        const li = document.createElement('li');
        const d = q.details[id];
        li.appendChild(document.createTextNode((i + 1) + '. ' + d.label + ' '));
        if (d.he) {
            const he = document.createElement('span');
            he.lang = 'he'; he.dir = 'rtl';
            he.textContent = d.he;
            li.appendChild(he);
        }
        if (d.note) {
            const small = document.createElement('small');
            small.textContent = ' · ' + d.note;
            li.appendChild(small);
        }
        list.appendChild(li);
    });
    const note = document.getElementById('ordergame-feedback-note');
    note.textContent = q.after;
    note.classList.toggle('hidden', !q.after);
    const next = document.getElementById('ordergame-next');
    next.textContent = t(g.index + 1 >= g.questions.length ? 'ordergame.finish' : 'ordergame.next');
    feedback.classList.remove('hidden');
    next.focus();
}

function ordergameContinue() {
    const g = ordergame;
    if (!g || !g.resolved) return;
    if (OrderGameCore.next(g).includes('done')) { QuizUI.finish('ordergame', g, 'ordergame'); return; }
    ordergameRender();
}
