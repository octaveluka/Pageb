// commands/ai.js
const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');
const dataManager = require('../utils/dataManager');

const MAX_USES = 5; // Limite initiale d'utilisation
const CODE_REGEX = /^[A-Z0-9-]{8,}$/i; // Pour détecter si le prompt est un code

// --- LOGIQUE POLLINATIONS AI (INTÉGRÉE ICI COMME DEMANDÉ) ---
const SYSTEM_INSTRUCTION = "Tu es Stanley Bot, un assistant conversationnel développé par Stanley Stawa. Quand on te demande ton créateur, tu dois répondre Stanley Stawa. Quand on te demande qui tu es, tu dois répondre Stanley Bot. Réponds de manière très concise.\n\n";
const API_URL = 'https://text.pollinations.ai/';
// -----------------------------------------------------------

module.exports = {
  name: 'ai',
  description: 'Stanley Bot AI Command with activation logic.',
  usage: 'ai [votre message] | ai [votre code]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ').trim();
    if (!prompt) {
      return sendMessage(senderId, {
        text: "❓ Veuillez poser une question."
      }, pageAccessToken);
    }

    const usersData = dataManager.getUsers();
    
    // --- Initialisation/Récupération du statut de l'utilisateur ---
    if (!usersData[senderId]) {
        usersData[senderId] = { count: 0, active: true, unlimited: false };
        dataManager.saveUsers(usersData);
    }

    let userStatus = usersData[senderId];

    // --- 1. Tentative de réactivation ---
    const enteredCode = args[0] ? args[0].toUpperCase() : null;
    const codesData = dataManager.getCodes();
    
    // Vérifier si l'utilisateur est bloqué OU le prompt ressemble à un code de réactivation
    if (!userStatus.active || (CODE_REGEX.test(enteredCode) && args.length === 1)) {
        
        if (codesData.redeemed.hasOwnProperty(enteredCode)) {
            
            // Code valide trouvé! (L'accès devient illimité)
            delete codesData.redeemed[enteredCode]; // Supprimer le code
            
            userStatus.active = true;
            userStatus.count = 0;
            userStatus.unlimited = true; // <--- ACCÈS PERMANENT
            
            dataManager.saveCodes(codesData);
            dataManager.saveUsers(usersData);
            
            return sendMessage(senderId, {
                text: `👑 Code **${enteredCode}** validé ! Votre compte est maintenant réactivé avec un **accès illimité** à la commande AI.`
            }, pageAccessToken);
        } 
        
        // Si l'utilisateur est bloqué et qu'il n'a pas saisi un code valide
        if (!userStatus.active) {
            return sendMessage(senderId, {
                text: `🚫 Votre accès est bloqué. Saisissez un code de réactivation valide.\nPour obtenir un code, demandez à un ami d'utiliser la commande **!code**.`
            }, pageAccessToken);
        }
    }


    // --- 2. Vérification du QUOTA (Seulement si NON illimité) ---
    if (!userStatus.unlimited && userStatus.count >= MAX_USES) {
        // L'utilisateur est limité et a atteint la limite.
        userStatus.active = false;
        dataManager.saveUsers(usersData); 
        
        return sendMessage(senderId, {
            text: `🚫 Limite de ${MAX_USES} questions atteinte ! Votre accès est bloqué.\nPour obtenir l'accès illimité, demandez à un ami d'utiliser la commande **!code** puis saisissez le code qu'il vous enverra.`
        }, pageAccessToken);
    }

    // --- 3. Exécution de la commande AI (SI ACTIF ou ILLIMITÉ) ---

    // Préparation du prompt pour Pollinations
    const contextPrompt = SYSTEM_INSTRUCTION + "[User] : " + prompt;
    
    try {
        const encodedPrompt = encodeURIComponent(contextPrompt);
        const url = API_URL + encodedPrompt;

        const { data } = await axios.get(url, { responseType: 'text' });
        const responseText = typeof data === 'string' ? data.trim() : 'Réponse vide.';

        let quotaMessage = "";
        
        if (!userStatus.unlimited) {
            // Décompter uniquement si l'accès n'est pas illimité
            userStatus.count++;
            const remaining = MAX_USES - userStatus.count;
            quotaMessage = `(${remaining} questions restantes)`;
        } else {
            quotaMessage = "(Accès Illimité)";
        }
        
        dataManager.saveUsers(usersData); // Sauvegarder le nouveau compteur ou le statut illimité
        
        // Réponse formatée
        const formattedResponse = `💬 | Stanley Stawa 😙🚬\n・───────────・\n${responseText}\n・${quotaMessage}・──── 💫 ────・`;
        
        // Découpe et envoi du message
        const parts = [];
        for (let i = 0; i < formattedResponse.length; i += 1900) {
            parts.push(formattedResponse.substring(i, i + 1900));
        }

        for (const part of parts) {
            await sendMessage(senderId, { text: part }, pageAccessToken);
        }
        
    } catch (error) {
        // En cas d'échec de l'API, ne pas décompter l'utilisation
        sendMessage(senderId, {
            text: "🤖 Une erreur est survenue avec l'API Pollinations de Stanley.\nRéessayez plus tard."
        }, pageAccessToken);
    }
  }
};
