// commands/code.js
const { sendMessage } = require('../handles/sendMessage');
const dataManager = require('../utils/dataManager'); 

module.exports = {
    name: 'code', // Nom de la commande : !code
    description: "Reçoit un code unique pour réactiver l'accès AI d'un ami (Usage unique).",
    usage: 'code',
    author: 'Stanley Stawa',

    async execute(senderId, args, pageAccessToken) {
        const codesData = dataManager.getCodes();
        
        // 1. VÉRIFICATION DE L'USAGE UNIQUE
        const hasClaimedCode = Object.entries(codesData.redeemed).some(([code, status]) => status.friendId === senderId);
        
        if (hasClaimedCode) {
             return sendMessage(senderId, {
                text: `❌ Vous avez déjà réclamé un code. La commande **!code** est à usage unique par utilisateur.`
            }, pageAccessToken);
        }

        // 2. Vérifier s'il y a des codes disponibles
        if (codesData.available.length === 0) {
            return sendMessage(senderId, {
                text: "❌ Désolé, tous les codes d'invitation ont été utilisés. Réessayez plus tard."
            }, pageAccessToken);
        }

        // 3. Distribuer le code - LOGIQUE DE SÉLECTION ALÉATOIRE
        
        // Choisir un index aléatoire dans le tableau des codes disponibles
        const randomIndex = Math.floor(Math.random() * codesData.available.length);
        
        // Retirer le code à cet index et le récupérer. splice retourne un tableau, [0] donne l'élément.
        const newCode = codesData.available.splice(randomIndex, 1)[0]; 
        
        // Stocker le code, en notant l'ami qui l'a reçu (pour le contrôle d'usage unique).
        codesData.redeemed[newCode] = { friendId: senderId, claimed: false }; 
        
        dataManager.saveCodes(codesData);

        const friendMessage = `🎉 Félicitations ! Votre code de réactivation est : **${newCode}**\n\nEnvoyez ce code à votre ami pour qu'il puisse le saisir dans le chat AI.`;
        
        return sendMessage(senderId, { text: friendMessage }, pageAccessToken);
    }
};
