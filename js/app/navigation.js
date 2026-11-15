// Aides génériques d'ouverture/fermeture de modale, partagées par tous les écrans de TorahAxe.
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}
