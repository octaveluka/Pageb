// commands/ai.js
const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');
const dataManager = require('../utils/dataManager'); // VÉRIFIEZ CE CHEMIN !

const MAX_USES = 5; // Limite initiale d'utilisation
const CODE_REGEX = /^[A-Z0-9-]{8,}$/i; 
const API_URL = 'https://text.pollinations.ai/';

module.exports = {
  name: 'ai', // DOIT ÊTRE 'ai'
  description: 'AI Command avec limite d\'utilisation et activation par code.',
  usage: 'ai [votre message] | ai [votre code]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ').trim();
    if (!prompt) {
      return sendMessage(senderId, {
        text: "❓ Veuillez poser une question."
      }, pageAccessToken);
    }

    // --- LECTURE DES DONNÉES (DOIT ÊTRE RAPIDE) ---
    const usersData = dataManager.getUsers();
    
    // 1. Initialisation/Récupération du statut de l'utilisateur
    if (!usersData[senderId]) {
        usersData[senderId] = { count: 0, active: true, unlimited: false };
        dataManager.saveUsers(usersData);
    }

    let userStatus = usersData[senderId];

    // --- 2. Tentative de réactivation (Saisie d'un code) ---
    const enteredCode = args[0] ? args[0].toUpperCase() : null;
    const codesData = dataManager.getCodes();
    
    if (!userStatus.active || (CODE_REGEX.test(enteredCode) && args.length === 1)) {
        
        if (codesData.redeemed.hasOwnProperty(enteredCode)) {
            
            delete codesData.redeemed[enteredCode]; 
            userStatus.active = true;
            userStatus.count = 0;
            userStatus.unlimited = true; 
            
            dataManager.saveCodes(codesData);
            dataManager.saveUsers(usersData);
            
            return sendMessage(senderId, {
                text: `👑 Code **${enteredCode}** validé ! Votre compte est maintenant réactivé avec un **accès illimité** à la commande AI.`
            }, pageAccessToken);
        } 
        
        if (!userStatus.active) {
            return sendMessage(senderId, {
                text: `🚫 Votre accès est bloqué. Saisissez un code de réactivation valide.\nPour obtenir un code, demandez à un ami d'utiliser la commande **!code**.`
            }, pageAccessToken);
        }
    }


    // --- 3. Vérification du QUOTA ---
    if (!userStatus.unlimited && userStatus.count >= MAX_USES) {
        userStatus.active = false;
        dataManager.saveUsers(usersData); 
        
        return sendMessage(senderId, {
            text: `🚫 Limite de ${MAX_USES} questions atteinte ! Votre accès est bloqué.\nPour obtenir l'accès illimité, demandez à un ami d'utiliser la commande **!code** puis saisissez le code qu'il vous enverra.`
        }, pageAccessToken);
    }

    // --- 4. Exécution de la commande AI ---

    const contextPrompt = prompt; 
    
    try {
        const encodedPrompt = encodeURIComponent(contextPrompt);
        const url = API_URL + encodedPrompt;

        const { data } = await axios.get(url, { responseType: 'text' });
        const responseText = typeof data === 'string' ? data.trim() : 'Réponse vide.';

        let quotaMessage = "";
        
        if (!userStatus.unlimited) {
            userStatus.count++;
            const remaining = MAX_USES - userStatus.count;
            quotaMessage = `\n(Quota: ${remaining} questions restantes)`; 
        } else {
            quotaMessage = "\n(Quota: Accès Illimité)"; 
        }
        
        dataManager.saveUsers(usersData); 
        
        const formattedResponse = `${responseText}${quotaMessage}`;
        
        const parts = [];
        for (let i = 0; i < formattedResponse.length; i += 1800) {
            parts.push(formattedResponse.substring(i, i + 1800));
        }

        for (const part of parts) {
            await sendMessage(senderId, { text: part }, pageAccessToken);
        }
        
    } catch (error) {
        console.error('Erreur avec Pollinations Text API :', error.message);
        sendMessage(senderId, {
            text: "🤖 Une erreur est survenue avec l'API Pollinations.\nRéessayez plus tard."
        }, pageAccessToken);
    }
  }
};
