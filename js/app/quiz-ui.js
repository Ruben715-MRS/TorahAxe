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
    }

    // « Question 3 sur 10 — 200 points ».
    function status(p, g) {
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
        const best = arcadeRecord(bestKey, g.score);
        phase(p, 'over');
        $(p + '-over-text').textContent = t(p + '.found', { found: g.found, total: g.questions.length, score: g.score }) + ' ' + t('arcade.best', { score: best[bestKey] });
        // Le résumé de la progression (points d'expérience, série, badges) : js/app/progress.js enregistre la partie, qui est terminée. L'écran de fin de certains jeux n'a pas de ligne
        // pour lui : elle est créée.
        const gain = typeof progressRecord === 'function' ? progressRecord(p, g.score, g.questions.length * 100) : '';
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
    function timerStop() {
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
        const deadline = Date.now() + ms;
        timerDraw(p, ms, ms);
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

    return { phase: phase, status: status, options: options, resolve: resolve, word: word, finish: finish, progress: progress, chips: chips, timerStart: timerStart, timerStop: timerStop, timerHide: timerHide, loadPrefs: loadPrefs, savePrefs: savePrefs };
})();
