// Aides génériques d'ouverture/fermeture de modale, partagées par tous les écrans de TorahAxe.
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// Bascule entre les écrans plein écran (body > div), avec le même glissement qu'HistoriAxe
// (screen-slide-forward/back, voir css/style.css). Version réduite de js/app/navigation.js
// d'HistoriAxe : TorahAxe n'a ni Atelier, ni Chemin, ni onboarding à coordonner au passage d'écran.
function showScreen(screenId, direction) {
    document.querySelectorAll('body > div').forEach(div => {
        if (div.id !== 'modal-settings') div.classList.add('hidden');
    });
    const target = document.getElementById(screenId);
    target.classList.remove('hidden');
    target.classList.remove('screen-slide-forward', 'screen-slide-back');
    if (direction === 'forward' || direction === 'back') {
        void target.offsetWidth; // force le reflow pour rejouer l'animation
        target.classList.add(direction === 'forward' ? 'screen-slide-forward' : 'screen-slide-back');
    }
}
