// =========================================================================
// === TORAHAXE — ÉCRAN COMMUN DES JEUX À CHOIX MULTIPLES (pendant DOM de js/quizCore.js) ===
// =========================================================================
// Les trois jeux (« Mots du Tanakh » `lexgame`, « Mots de la Guémara » `gemgame`, « Maîtres et élèves » `trgame`) ont le même écran : réglages
// (`-setup`), question (`-play`), fin de partie (`-over`). Ce fichier fait ce qui est identique pour tous ; chaque jeu garde ce qui lui est propre
// (le texte de la question, la fiche après la réponse, ses réglages, sa mémoire). `p` est le préfixe des identifiants du jeu (`lexgame`…) ET des
// clés de traduction (`lexgame.status`, `lexgame.right`…). Tout ce qui vient des données passe par textContent, jamais par du HTML.
const QuizUI = (function () {
    'use strict';
    const $ = id => document.getElementById(id);

    // Montre une seule des trois phases : 'setup', 'play' ou 'over'. Le bandeau d'état se vide en dehors de la question.
    function phase(p, name) {
        ['setup', 'play', 'over'].forEach(n => $(p + '-' + n).classList.toggle('hidden', n !== name));
        if (name !== 'play') $(p + '-status').textContent = '';
        const multi = $(p + '-multi');
        if (multi && name === 'setup') multi.classList.add('hidden');
    }

    // « Question 3 sur 10 — 200 points ».
    function status(p, g) {
        if (g.multi) {
            $(p + '-status').textContent = t('multi.status', { name: QuizCore.currentPlayer(g).name, n: g.index + 1, total: g.questions.length });
            if (!g.resolved && g.multi.gated !== g.index) gateShow(p, g);
            return;
        }
        $(p + '-status').textContent = t(p + '.status', { n: g.index + 1, total: g.questions.length, score: g.score });
    }

    // Les boutons de réponse. `describe(option)` renvoie { label, he?, lang } : `he` est le nom en lettres hébraïques, affiché sous le nom latin ; lang 'he' (hébreu, de droite à gauche) ou 'num' (nombre) ; rien pour du français.
    // `onPick(i)` est appelé avec l'indice de la proposition choisie.
    function options(p, q, describe, onPick) {
        $(p + '-feedback').classList.add('hidden');
        const box = $(p + '-options');
        toolClear(box);
        q.options.forEach((option, i) => {
            const d = describe(option);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-option cause-card lexgame-option';
            if (d.lang === 'he') { btn.lang = 'he'; btn.dir = 'rtl'; btn.classList.add('lexgame-option-he'); }
            if (d.lang === 'num') btn.classList.add('lexgame-option-num');
            btn.dataset.choice = String(i);
            btn.appendChild(document.createTextNode(d.label));
            // Le nom en lettres hébraïques sous le nom latin (quand la réponse en a un qui ne trahit pas la question).
            if (d.he) {
                const he = document.createElement('span');
                he.className = 'he';
                he.lang = 'he'; he.dir = 'rtl';
                he.textContent = d.he;
                btn.appendChild(he);
            }
            btn.setAttribute('aria-label', t(p + '.option_aria', { n: i + 1, label: d.label }));
            btn.onclick = () => onPick(i);
            box.appendChild(btn);
        });
    }

    // Après la réponse : le son, la bonne réponse en vert, la réponse choisie à tort en rouge, puis la fiche.
    // `info` : { line, extra?, note? } (textes bruts) ; `extra` est une ligne en plus (famille de la racine, détail du calcul).
    function resolve(p, g, q, choice, info) {
        const right = g.resolved === 'right';
        arcadeSound(right ? 'good' : 'bad');
        status(p, g);
        document.querySelectorAll('#' + p + '-options .lexgame-option').forEach(btn => {
            const i = Number(btn.dataset.choice);
            btn.disabled = true;
            if (i === q.answer) btn.classList.add('correct');
            else if (i === choice) btn.classList.add('wrong');
        });
        const feedback = $(p + '-feedback');
        feedback.classList.toggle('is-wrong', !right);
        $(p + '-feedback-title').textContent = t(p + (right ? '.right' : '.wrong'));
        $(p + '-feedback-text').textContent = info.line;
        const extra = $(p + '-feedback-extra');
        if (extra) {
            extra.textContent = info.extra || '';
            extra.classList.toggle('hidden', !info.extra);
        }
        const note = $(p + '-feedback-note');
        note.textContent = info.note || '';
        note.classList.toggle('hidden', !info.note);
        const next = $(p + '-next');
        next.textContent = t(p + (g.index + 1 >= g.questions.length ? '.finish' : '.next'));
        feedback.classList.remove('hidden');
        next.focus();
    }

    // Le mot ou la phrase en grand : hébreu (de droite à gauche) ou français.
    function word(p, text, french) {
        const el = $(p + '-word');
        el.textContent = text;
        el.lang = french ? 'fr' : 'he';
        el.dir = french ? 'ltr' : 'rtl';
        el.classList.toggle('is-french', !!french);
    }

    // Fin de partie : « 7 sur 10, 700 points. Meilleur score : … » ; `progressText` (facultatif) : le bilan de la mémoire.
    function finish(p, g, bestKey, progressText) {
        if (g.multi) { multiFinish(p, g); return; }
        const replay = $(p + '-over-multi');
        if (replay) replay.classList.add('hidden');
        const ranking = $(p + '-over-ranking');
        if (ranking) ranking.classList.add('hidden');
        const best = arcadeRecord(bestKey, g.score);
        phase(p, 'over');
        $(p + '-over-text').textContent = t(p + '.found', { found: g.found, total: g.questions.length, score: g.score }) + ' ' + t('arcade.best', { score: best[bestKey] });
        // Le résumé de la progression (points d'expérience, série, badges) : js/app/progress.js enregistre la partie, qui est terminée. L'écran de fin de certains jeux n'a pas de ligne
        // pour lui : elle est créée. `g.maxScore` : le total possible quand les points varient (le Quiz de la paracha : 100, 200 ou 300 selon le niveau choisi).
        const gain = typeof progressRecord === 'function' ? progressRecord(p, g.score, g.maxScore || g.questions.length * 100) : '';
        let prog = $(p + '-over-progress');
        if (!prog) {
            prog = document.createElement('p');
            prog.id = p + '-over-progress';
            $(p + '-over-text').insertAdjacentElement('afterend', prog);
        }
        prog.textContent = [progressText, gain].filter(Boolean).join(' · ');
    }

    // La barre de progression des jeux à mémoire (« 47 mots sur 107 maîtrisés »).
    function progress(p, label, mastered, total) {
        $(p + '-progress-text').textContent = label;
        const bar = $(p + '-bar');
        bar.setAttribute('aria-valuemax', String(total));
        bar.setAttribute('aria-valuenow', String(mastered));
        $(p + '-bar-fill').style.width = (total ? Math.round(100 * mastered / total) : 0) + '%';
    }

    // Une rangée de boutons (sections) : `items` = [{ id, label, he? }], `current` l'identifiant choisi, `onPick(id)` ; `he` : le nom en lettres hébraïques, après le nom latin.
    function chips(p, items, current, onPick) {
        const holder = $(p + '-sections');
        toolClear(holder);
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tool-history-chip';
            btn.id = p + '-section-' + item.id;
            btn.setAttribute('aria-pressed', item.id === current ? 'true' : 'false');
            btn.appendChild(document.createTextNode(item.label));
            if (item.he) {
                const he = document.createElement('span');
                he.className = 'he';
                he.lang = 'he'; he.dir = 'rtl';
                he.textContent = ' ' + item.he;
                btn.appendChild(he);
            }
            btn.onclick = () => onPick(item.id);
            holder.appendChild(btn);
        });
    }

    // La barre de temps des jeux chronométrés (`-timer`, `-timer-fill`, `-time` ; clé de traduction `.time_left`) : un seul chronomètre à la fois. À zéro, `onExpire()`
    // est appelé une fois. Si l'écran `screenId` est quitté sans passer par « Retour » (un lien de l'accueil), le chronomètre s'arrête de lui-même.
    let timerId = null;
    let heldTimer = null;      // un chrono en attente du joueur (à plusieurs)
    let gate = null;           // l'écran « passez le téléphone »
    function timerStop() {
        heldTimer = null;
        if (timerId) { clearInterval(timerId); timerId = null; }
    }
    function timerHide(p) {
        $(p + '-timer').classList.add('hidden');
        $(p + '-time').classList.add('hidden');
    }
    function timerDraw(p, ms, left) {
        const bar = $(p + '-timer');
        $(p + '-timer-fill').style.width = Math.round(100 * Math.max(0, left) / ms) + '%';
        bar.classList.toggle('is-low', left <= 2500);
        const seconds = Math.ceil(Math.max(0, left) / 1000);
        bar.setAttribute('aria-valuemax', String(Math.ceil(ms / 1000)));
        bar.setAttribute('aria-valuenow', String(seconds));
        bar.setAttribute('aria-valuetext', t(p + '.time_left', { n: seconds }));
        $(p + '-time').textContent = t(p + '.time_left', { n: seconds });
    }
    function timerStart(p, ms, screenId, onExpire) {
        timerStop();
        $(p + '-timer').classList.remove('hidden');
        $(p + '-time').classList.remove('hidden');
        timerDraw(p, ms, ms);
        // À plusieurs, le chrono ne part pas tant que le téléphone n'est pas dans les mains du joueur (voir gateShow).
        if (gate && !gate.classList.contains('hidden')) { heldTimer = [p, ms, screenId, onExpire]; return; }
        const deadline = Date.now() + ms;
        timerId = setInterval(() => {
            if ($(screenId).classList.contains('hidden')) { timerStop(); return; }
            const left = deadline - Date.now();
            timerDraw(p, ms, left);
            if (left <= 0) { timerStop(); onExpire(); }
        }, 100);
    }

    // Les réglages de l'appareil (JSON dans le stockage local) : lus sans jamais planter, écrits sans jamais bloquer.
    function loadPrefs(key) {
        try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; }
    }
    function savePrefs(key, prefs) {
        try { localStorage.setItem(key, JSON.stringify(prefs)); } catch (e) { /* stockage indisponible */ }
    }


    // --- À plusieurs : on se passe le téléphone ---------------------------------------------------------------------------------------------------
    // Les règles sont dans js/quizCore.js (`setPendingPlayers`, `standings`…). Ici : le bouton « Jouer à plusieurs » des réglages du jeu (`multiMount`), le choix des joueurs, l'écran
    // « passez le téléphone » entre deux questions (la question suivante reste cachée, et le chrono n'a pas commencé) et le classement de fin. Une partie à plusieurs ne compte
    // pas dans la progression personnelle (série, niveaux, record) ni dans la mémoire des mots : elle n'est pas le fait d'une seule personne.
    const MULTI_KEY = 'torahaxe_multi_v1';
    const multiLast = {};      // les joueurs de la dernière partie de chaque jeu, pour rejouer

    function multiPrefs() {
        const raw = loadPrefs(MULTI_KEY) || {};
        const count = Math.min(QuizCore.MAX_PLAYERS, Math.max(QuizCore.MIN_PLAYERS, Number(raw.count) || 2));
        return { count: count, names: Array.isArray(raw.names) ? raw.names.map(String) : [] };
    }

    function multiNode(tag, cls, attrs, text) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        Object.keys(attrs || {}).forEach(k => node.setAttribute(k, attrs[k]));
        if (text !== undefined) node.textContent = text;
        return node;
    }

    // Lance la partie du jeu `p` à plusieurs : la prochaine partie créée par le jeu est rattachée aux joueurs (quizCore.createState).
    function multiStartWith(p, names) {
        const set = QuizCore.setPendingPlayers(names);
        try {
            const start = window[p + 'Start'];
            if (typeof start === 'function') start();
        } finally { QuizCore.setPendingPlayers(null); }
        if (set) multiLast[p] = set;
    }

    function multiNamesDraw(p, count) {
        const box = $(p + '-multi-names');
        const saved = multiPrefs().names;
        const typed = [...box.querySelectorAll('input')].map(i => i.value);
        toolClear(box);
        for (let i = 0; i < count; i++) {
            const input = multiNode('input', 'tool-input', { type: 'text', maxlength: String(20), autocomplete: 'off', placeholder: t('multi.name_placeholder', { n: i + 1 }), 'aria-label': t('multi.name_aria', { n: i + 1 }) });
            input.value = typed[i] !== undefined ? typed[i] : (saved[i] || '');
            box.appendChild(input);
        }
    }

    function multiCountPick(p, count) {
        const holder = $(p + '-multi-count');
        [...holder.children].forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.count) === count ? 'true' : 'false'));
        multiNamesDraw(p, count);
    }

    function multiGo(p) {
        const names = [...$(p + '-multi-names').querySelectorAll('input')].map(i => i.value);
        savePrefs(MULTI_KEY, { count: names.length, names: names });
        multiStartWith(p, names);
    }

    // Ajoute aux réglages du jeu `p` le bouton « Jouer à plusieurs » et son panneau (nombre de joueurs, noms). Sans effet si le jeu n'a pas d'écran de réglages ou l'a déjà.
    function multiMount(p) {
        const setup = $(p + '-setup');
        if (!setup || $(p + '-multi')) return;
        const open = multiNode('button', 'btn btn-secondary', { type: 'button', id: p + '-multi-open' }, t('multi.button'));
        open.setAttribute('data-i18n', 'multi.button');
        const panel = multiNode('div', 'multi-panel hidden', { id: p + '-multi' });
        const help = multiNode('p', 'tool-small', { 'data-i18n': 'multi.help' }, t('multi.help'));
        const count = multiNode('div', 'lexgame-levels', { id: p + '-multi-count', role: 'group', 'data-i18n-attr': 'aria-label:multi.count_aria' });
        for (let n = QuizCore.MIN_PLAYERS; n <= QuizCore.MAX_PLAYERS; n++) {
            const b = multiNode('button', 'tool-history-chip', { type: 'button', 'data-count': String(n), 'aria-pressed': 'false' }, String(n));
            b.onclick = () => multiCountPick(p, n);
            count.appendChild(b);
        }
        const names = multiNode('div', 'multi-names', { id: p + '-multi-names' });
        const go = multiNode('button', 'btn', { type: 'button', id: p + '-multi-go', 'data-i18n': 'multi.go' }, t('multi.go'));
        go.onclick = () => multiGo(p);
        [help, count, names, go].forEach(n => panel.appendChild(n));
        open.onclick = () => {
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) multiCountPick(p, multiPrefs().count);
        };
        const start = setup.querySelector('button[onclick^="' + p + 'Start"]');
        if (start && start.nextSibling) { setup.insertBefore(open, start.nextSibling); setup.insertBefore(panel, open.nextSibling); }
        else { setup.appendChild(open); setup.appendChild(panel); }
    }

    // L'écran « passez le téléphone » : plein écran, le nom du joueur, les points de chacun, un bouton. Le chrono retenu repart à ce moment-là.
    function gateHide() {
        if (gate) gate.classList.add('hidden');
        if (heldTimer) { const h = heldTimer; heldTimer = null; timerStart(h[0], h[1], h[2], h[3]); }
    }

    function gateShow(p, g) {
        g.multi.gated = g.index;
        if (!gate) {
            gate = multiNode('div', 'multi-gate hidden', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'multi-gate-name' });
            document.body.appendChild(gate);
        }
        toolClear(gate);
        const cur = QuizCore.currentPlayer(g);
        const card = multiNode('div', 'multi-gate-card');
        card.appendChild(multiNode('p', 'multi-gate-lead', {}, t('multi.pass_to')));
        card.appendChild(multiNode('p', 'multi-gate-name', { id: 'multi-gate-name' }, cur.name));
        card.appendChild(multiNode('p', 'tool-small', {}, t('multi.turn_info', { n: g.index + 1, total: g.questions.length })));
        card.appendChild(multiNode('p', 'multi-gate-scores', {}, g.multi.players.map(pl => t('multi.scoreboard', { name: pl.name, score: pl.score })).join(' · ')));
        const ready = multiNode('button', 'btn', { type: 'button', id: 'multi-gate-ready' }, t('multi.ready'));
        ready.onclick = gateHide;
        const stop = multiNode('button', 'btn btn-secondary', { type: 'button' }, t('multi.stop'));
        stop.onclick = () => {
            timerStop();
            gate.classList.add('hidden');
            const back = window[p + 'Back'];
            if (typeof back === 'function') back();
        };
        card.appendChild(ready);
        card.appendChild(stop);
        gate.appendChild(card);
        gate.classList.remove('hidden');
        timerStop();
        ready.focus();
    }

    // La fin d'une partie à plusieurs : le gagnant (ou l'égalité), le classement, « Rejouer à plusieurs ». Rien n'est enregistré dans la progression.
    function multiFinish(p, g) {
        timerStop();
        if (gate) gate.classList.add('hidden');
        const st = QuizCore.standings(g);
        phase(p, 'over');
        $(p + '-over-text').textContent = st.tie ? t('multi.tie', { names: st.winners.join(', ') }) : t('multi.winner', { name: st.winners[0] });
        const prog = $(p + '-over-progress');
        if (prog) prog.textContent = '';
        const over = $(p + '-over');
        let list = $(p + '-over-ranking');
        if (!list) {
            list = multiNode('ol', 'multi-ranking', { id: p + '-over-ranking', 'aria-label': t('multi.ranking_aria') });
            $(p + '-over-text').insertAdjacentElement('afterend', list);
        }
        list.classList.remove('hidden');
        toolClear(list);
        st.rows.forEach(r => list.appendChild(multiNode('li', r.rank === 1 ? 'is-first' : '', {}, t('multi.ranking_line', { rank: r.rank, name: r.name, score: r.score, found: t(r.found === 1 ? 'multi.found_one' : 'multi.found_many', { n: r.found }) }))));
        let again = $(p + '-over-multi');
        if (!again) {
            again = multiNode('button', 'btn btn-secondary', { type: 'button', id: p + '-over-multi' }, t('multi.replay'));
            over.appendChild(again);
        }
        again.classList.remove('hidden');
        again.onclick = () => multiStartWith(p, multiLast[p] || g.multi.players.map(pl => pl.name));
    }

    return { multiMount: multiMount, multiStartWith: multiStartWith, phase: phase, status: status, options: options, resolve: resolve, word: word, finish: finish, progress: progress, chips: chips, timerStart: timerStart, timerStop: timerStop, timerHide: timerHide, loadPrefs: loadPrefs, savePrefs: savePrefs };
})();
