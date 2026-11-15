function openSettings() {
    openModal('modal-settings');
}

function closeSettings() {
    closeModal('modal-settings');
}

// Charge les traductions et textes (ui/fr.json) dont les outils migrés d'HistoriAxe ont besoin pour
// leur contenu généré dynamiquement (dates, tableaux…) : voir js/i18n.js. TorahAxe est en français
// uniquement ; la tentative de téléchargement du contenu de jeu d'HistoriAxe (data/fr.json) que fait
// i18n.js échoue silencieusement (voir sa gestion d'erreur), ce qui est normal : TorahAxe n'embarque
// pas ce contenu.
window.onload = async () => {
    if (typeof i18n !== 'undefined') await i18n.init();
};
