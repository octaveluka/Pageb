// commands/code.js
const { sendMessage } = require('../handles/sendMessage');
const dataManager = require('../utils/dataManager');

module.exports = {
    name: 'code', // Nom de la commande : !code
    description: "Reçoit un code unique pour réactiver l'accès AI d'un ami.",
    usage: 'code',
    author: 'Stanley Stawa',

    async execute(senderId, args, pageAccessToken) {
        const codesData = dataManager.getCodes();
        
        // 1. Vérifier si l'utilisateur a déjà un code non validé
        // Nous cherchons dans 'redeemed' si cet utilisateur (friendId) a déjà réclamé un code.
        const userCodeEntry = Object.entries(codesData.redeemed).find(([code, status]) => status.friendId === senderId);
        
        if (userCodeEntry) {
             const userCode = userCodeEntry[0];
             return sendMessage(senderId, {
                text: `🔒 Vous avez déjà un code actif : **${userCode}**\nDonnez ce code à votre ami pour qu'il le saisisse dans le chat AI !`
            }, pageAccessToken);
        }

        // 2. Vérifier s'il y a des codes disponibles
        if (codesData.available.length === 0) {
            return sendMessage(senderId, {
                text: "❌ Désolé, tous les codes d'invitation ont été utilisés. Réessayez plus tard."
            }, pageAccessToken);
        }

        // 3. Distribuer le code
        const newCode = codesData.available.pop();
        
        // Stocker le code dans la liste redeemed, avec l'ID de l'ami qui l'a reçu.
        codesData.redeemed[newCode] = { friendId: senderId, claimed: false }; 
        
        dataManager.saveCodes(codesData);

        const friendMessage = `🎉 Félicitations ! Votre code de réactivation est : **${newCode}**\n\nEnvoyez ce code à votre ami pour qu'il puisse le saisir dans le chat AI.`;
        
        return sendMessage(senderId, { text: friendMessage }, pageAccessToken);
    }
};
