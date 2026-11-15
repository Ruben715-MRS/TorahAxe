// Les 4 frises de TorahAxe (3 thèmes "Judaïsme" + "Histoire de l'État d'Israël"), dupliquées depuis
// HistoriAxe (data/pack/fr/skeleton.json). Chargées une fois, par identifiant de thème.
let FRISE_THEMES = null;

function friseThemesLoad() {
    if (FRISE_THEMES) return Promise.resolve(FRISE_THEMES);
    return fetch('data/frises-themes.json')
        .then(r => r.json())
        .then(data => { FRISE_THEMES = data.themes; return FRISE_THEMES; });
}

function playFriseTheme(themeId) {
    friseThemesLoad().then(themes => {
        const theme = themes.find(t => t.id === themeId);
        if (!theme) return;
        openFriseTheme(theme, 'screen-main');
    });
}
