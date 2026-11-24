// =========================================================================
// === LA BOÎTE À OUTILS DE TORAHAXE (écrans) ===
// =========================================================================
// Équivalent, réduit aux 21 outils migrés depuis HistoriAxe (groupe Atelier « Bible et tradition »),
// du js/app/tools.js d'HistoriAxe. Même convention : openTool(id, from) ouvre l'écran et appelle son
// init ; toolBack(id) revient à l'écran indiqué par `from` (toujours 'screen-main' dans TorahAxe,
// qui n'a pas d'Atelier séparé de l'accueil).
const TOOL_SCREENS = {
    biblical: 'screen-tool-biblical', measures: 'screen-tool-measures', commandments: 'screen-tool-commandments',
    korbanot: 'screen-tool-korbanot', hebrewCalendar: 'screen-tool-hebrew-calendar', zmanim: 'screen-tool-zmanim',
    siddur: 'screen-tool-siddur', kotel: 'screen-tool-kotel', mishkan: 'screen-tool-mishkan',
    statuts: 'screen-tool-statuts', tsaraat: 'screen-tool-tsaraat', gematria: 'screen-tool-gematria',
    tanakh: 'screen-tool-tanakh', michna: 'screen-tool-michna', talmud: 'screen-tool-talmud', lexicon: 'screen-tool-lexicon', glossary: 'screen-tool-glossary', gemara: 'screen-tool-gemara',
    genealogy: 'screen-tool-genealogy', transmission: 'screen-tool-transmission', hassidout: 'screen-tool-hassidout',
    library: 'screen-tool-library', chronologie: 'screen-tool-chronologie', foodlaws: 'screen-tool-foodlaws', benedictions: 'screen-tool-benedictions', periods: 'screen-tool-periods', torahReader: 'screen-torah-reader',
    specialReadings: 'screen-tool-readings', messiah: 'screen-tool-messiah'
};
const toolReturns = {};

function toolEl(id) { return document.getElementById(id); }

// --- Briques communes, reprises telles quelles du js/app/tools.js d'HistoriAxe -----------------------
// (toolReadYear/toolSetYear, qui dépendent de js/toolsCore.js, ne sont pas reprises : aucun des 21
// outils migrés ne les utilise.)
function toolClear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
}

// Une ligne de résultat : un titre, la valeur, une remarque, et la règle repliable.
function toolRow(container, row) {
    const el = document.createElement('div');
    el.className = 'tool-row' + (row.available === false ? ' is-off' : '');
    const head = document.createElement('div');
    head.className = 'tool-row-head';
    const title = document.createElement('strong');
    title.textContent = (row.icon ? row.icon + ' ' : '') + row.name;
    const value = document.createElement('span');
    value.className = 'tool-row-value';
    value.textContent = row.available === false ? (row.offText || '—') : row.text;
    head.appendChild(title);
    head.appendChild(value);
    el.appendChild(head);
    if (row.note && row.available !== false) {
        const note = document.createElement('small');
        note.className = 'tool-row-note';
        note.textContent = row.note;
        el.appendChild(note);
    }
    if (row.rule) {
        const details = document.createElement('details');
        details.className = 'tool-row-rule';
        const summary = document.createElement('summary');
        summary.textContent = t('tools.rule');
        const p = document.createElement('p');
        p.textContent = row.rule;
        details.appendChild(summary);
        details.appendChild(p);
        el.appendChild(details);
    }
    container.appendChild(el);
}

function toolResult(container, lines) {
    toolClear(container);
    lines.forEach(line => {
        const p = document.createElement('p');
        p.className = line.cls || 'tool-small';
        p.textContent = line.text;
        container.appendChild(p);
    });
}

// Ouvre un outil. `from` : l'écran à retrouver au retour (toujours l'accueil, sauf si précisé autrement).
function openTool(id, from) {
    toolReturns[id] = from || 'screen-main';
    showScreen(TOOL_SCREENS[id], 'forward');
    const init = {
        biblical: toolBiblicalInit, measures: toolMeasuresInit, commandments: toolCommandmentsInit,
        korbanot: toolKorbanotInit, hebrewCalendar: toolHebrewCalendarInit, zmanim: toolZmanimInit,
        siddur: toolSiddurInit, kotel: toolKotelInit, mishkan: toolMishkanInit, statuts: toolStatutsInit,
        tsaraat: toolTsaraatInit, gematria: toolGematriaInit, tanakh: toolTanakhInit, michna: toolMichnaInit, talmud: toolTalmudInit, lexicon: toolLexiconInit, glossary: toolGlossaryInit,
        gemara: toolGemaraInit, genealogy: toolGenealogyInit, transmission: toolTransmissionInit,
        hassidout: toolHassidoutInit, library: toolLibraryInit, chronologie: toolChronologieInit, foodlaws: toolFoodLawsInit, benedictions: toolBenedictionsInit, periods: toolPeriodsInit,
        torahReader: toolTorahReaderInit, specialReadings: toolSpecialReadingsInit, messiah: toolMessiahInit
    }[id];
    if (init) init();
}

function toolBack(id) {
    showScreen(toolReturns[id] || 'screen-main', 'back');
}
