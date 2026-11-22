// =========================================================================
// === GUÉMATRIA (écran de l'Atelier, groupe « Bible et tradition ») ===
// =========================================================================
// On tape un mot hébreu : chaque lettre s'affiche avec sa valeur dessous (comme les chiffres romains), puis l'addition. Quatre modes de calcul
// (standard, katan, milui, atbash) et, en options, le mispar gadol (lettres finales à 500–900) et la réduction à un chiffre. Les calculs sont dans js/gematriaCore.js (pur, testé) ; les textes
// sous `tools.gematria_*` de ui/fr.json. Tout ce qui vient de la saisie passe par textContent, jamais par du HTML.
//
// Comparer : le bouton « Comparer » ouvre un second champ (B). Les deux textes partagent le mode et les options ; sous les deux résultats, un bandeau
// donne l'égalité ou l'écart, le rapport s'il est entier, la réduction commune et les lettres en commun (surlignées dans les deux mots). « Échanger » permute A et B.
// Les identifiants du second texte portent le suffixe « -b » (tool-gematria-input-b, …).

let gematriaMode = 'standard';
let gematriaCompare = false;

function toolGematriaInit() {
    toolGematriaRender();
}

function toolGematriaPick(mode) {
    gematriaMode = GematriaCore.MODES.indexOf(mode) >= 0 ? mode : 'standard';
    toolGematriaRender();
}

// Ouvre ou ferme la comparaison. Le texte B est conservé à la fermeture : on peut le retrouver en rouvrant.
function toolGematriaToggleCompare() {
    gematriaCompare = !gematriaCompare;
    toolGematriaUpdate();
    if (gematriaCompare) toolEl('tool-gematria-input-b').focus();
}

// Permute les deux textes.
function toolGematriaSwap() {
    const a = toolEl('tool-gematria-input');
    const b = toolEl('tool-gematria-input-b');
    const text = a.value;
    a.value = b.value;
    b.value = text;
    toolGematriaUpdate();
}

// Les boutons des quatre modes, puis le résultat.
function toolGematriaRender() {
    const tabs = toolEl('tool-gematria-modes');
    toolClear(tabs);
    GematriaCore.MODES.forEach(mode => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'tool-gematria-mode-' + mode;
        btn.setAttribute('aria-pressed', mode === gematriaMode ? 'true' : 'false');
        btn.textContent = t('tools.gematria_mode_' + mode);
        btn.onclick = () => toolGematriaPick(mode);
        tabs.appendChild(btn);
    });
    toolEl('tool-gematria-help').textContent = t('tools.gematria_help_' + gematriaMode);
    toolGematriaUpdate();
}

// `common` : les lettres ordinaires présentes dans les deux textes (surlignées en mode comparaison).
function gematriaChip(letter, mode, common) {
    const chip = document.createElement('span');
    chip.className = 'tool-chip gem-chip' + (common && common.indexOf(letter.base) >= 0 ? ' gem-common' : '');
    chip.setAttribute('role', 'listitem');
    const glyph = document.createElement('strong');
    glyph.lang = 'he';
    glyph.textContent = letter.char;
    chip.appendChild(glyph);
    // Atbash : la lettre en miroir ; milui : le nom de la lettre écrit en toutes lettres. La valeur vient en dernier, dessous.
    if (letter.via) {
        const via = document.createElement('small');
        via.className = 'gem-via';
        via.lang = 'he';
        via.textContent = (mode === 'atbash' ? '→ ' : '') + letter.via;
        chip.appendChild(via);
    }
    const value = document.createElement('small');
    value.className = 'gem-value';
    value.textContent = String(letter.value);
    chip.appendChild(value);
    chip.setAttribute('aria-label', letter.char + ' : ' + letter.value);
    return chip;
}

// Le calcul d'un des deux textes (slot '' pour A, '-b' pour B) selon le mode et les options communes.
function gematriaCalc(slot) {
    const text = toolEl('tool-gematria-input' + slot).value;
    return { text: text, calc: GematriaCore.compute(text, gematriaMode, toolEl('tool-gematria-reduce').checked, toolEl('tool-gematria-gadol').checked) };
}

// Affiche le résultat d'un texte : message, total, lettres mot par mot, addition. Retourne vrai s'il y a un résultat.
function gematriaShow(slot, text, calc, common) {
    const msg = toolEl('tool-gematria-msg' + slot);
    const result = toolEl('tool-gematria-result' + slot);
    result.classList.add('hidden');
    msg.textContent = '';
    if (!calc.letters.length) {
        // Le champ B vide n'est pas une erreur : on attend simplement la saisie.
        msg.textContent = t(text.trim() ? 'tools.gematria_none' : (slot ? 'tools.gematria_empty_b' : 'tools.gematria_empty'));
        return false;
    }
    if (calc.ignored) msg.textContent = t('tools.gematria_ignored', { n: calc.ignored });
    result.classList.remove('hidden');
    toolEl('tool-gematria-big' + slot).textContent = String(calc.reduced ? calc.reduced[calc.reduced.length - 1] : calc.total);

    // Les lettres, mot par mot : un groupe par mot, pour que l'œil voie où il commence.
    const holder = toolEl('tool-gematria-parts' + slot);
    toolClear(holder);
    let word = null;
    calc.letters.forEach(letter => {
        if (letter.startsWord || !word) {
            word = document.createElement('span');
            word.className = 'gem-word';
            word.setAttribute('role', 'presentation');
            holder.appendChild(word);
        }
        word.appendChild(gematriaChip(letter, calc.mode, common));
    });

    // L'addition, dans l'ordre de lecture (de droite à gauche) : « 300 + 30 + 6 + 40 = 376 ».
    toolEl('tool-gematria-sum' + slot).textContent = calc.letters.map(l => l.value).join(' + ') + ' = ' + calc.total;
    toolEl('tool-gematria-reduced' + slot).textContent = calc.reduced && calc.reduced.length > 1
        ? t('tools.gematria_sum_reduced', { steps: calc.reduced.join(' → ') })
        : '';
    return true;
}

// Le bandeau sous les deux résultats : égalité ou écart, rapport, réduction commune, lettres communes.
function gematriaShowCompare(a, b) {
    const main = toolEl('tool-gematria-compare-main');
    const detail = toolEl('tool-gematria-compare-detail');
    const banner = toolEl('tool-gematria-compare');
    banner.classList.remove('is-equal');
    if (!a.letters.length || !b.letters.length) {
        main.textContent = '';
        detail.textContent = t('tools.gematria_compare_hint');
        return;
    }
    const cmp = GematriaCore.compare(a, b);
    main.textContent = cmp.equal ? a.total + ' = ' + b.total + ' ✓' : a.total + ' ≠ ' + b.total;
    const lines = [];
    if (cmp.equal) lines.push(t('tools.gematria_compare_equal'));
    else {
        lines.push(t('tools.gematria_compare_diff', { n: cmp.difference }));
        if (cmp.multiple) lines.push(t('tools.gematria_compare_multiple', { n: cmp.multiple }));
        if (cmp.sameReduced !== null) lines.push(t('tools.gematria_compare_reduced', { n: cmp.sameReduced }));
    }
    lines.push(cmp.common.length ? t('tools.gematria_compare_common', { n: cmp.common.length, letters: cmp.common.join(' ') }) : t('tools.gematria_compare_nocommon'));
    detail.textContent = lines.join('\n');
    if (cmp.equal) banner.classList.add('is-equal');
}

function toolGematriaUpdate() {
    // Le mispar gadol ne change rien à l'atbash : la case est alors grisée, avec son explication.
    const gadolBox = toolEl('tool-gematria-gadol');
    gadolBox.disabled = gematriaMode === 'atbash';
    toolEl('tool-gematria-gadol-note').textContent = gadolBox.disabled ? t('tools.gematria_gadol_atbash') : (gadolBox.checked ? t('tools.gematria_gadol_help') : '');

    // Le bouton « Comparer », le champ B et le bandeau n'existent que si la comparaison est ouverte.
    const btn = toolEl('tool-gematria-compare-btn');
    btn.setAttribute('aria-pressed', gematriaCompare ? 'true' : 'false');
    btn.textContent = t(gematriaCompare ? 'tools.gematria_compare_close' : 'tools.gematria_compare_open');
    toolEl('tool-gematria-label').textContent = t(gematriaCompare ? 'tools.gematria_label_a' : 'tools.gematria_label');
    toolEl('tool-gematria-swap').textContent = '⇄ ' + t('tools.gematria_swap');
    toolEl('tool-gematria-slot-b').classList.toggle('hidden', !gematriaCompare);
    toolEl('tool-gematria-compare').classList.toggle('hidden', !gematriaCompare);
    toolEl('tool-gematria-pair').classList.toggle('is-comparing', gematriaCompare);

    const a = gematriaCalc('');
    const b = gematriaCompare ? gematriaCalc('-b') : null;
    // Les lettres communes ne sont surlignées que si les deux textes ont des lettres.
    const common = b && a.calc.letters.length && b.calc.letters.length ? GematriaCore.compare(a.calc, b.calc).common : null;
    gematriaShow('', a.text, a.calc, common);
    if (b) {
        gematriaShow('-b', b.text, b.calc, common);
        gematriaShowCompare(a.calc, b.calc);
    }
}
