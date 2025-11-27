const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// Objet pour stocker l'historique de conversation de chaque utilisateur.
const conversationHistory = {};

/**
 * Fonction utilitaire pour formater l'historique en une seule chaîne.
 * Elle est conservée pour la personnalité.
 */
function formatHistory(senderId, currentPrompt) {
    let history = conversationHistory[senderId] || [];
    
    // Limiter l'historique à 3 messages pour une URL plus courte et plus rapide
    const historyLimit = 3; 
    const recentHistory = history.slice(-historyLimit); 

    let formattedHistory = recentHistory.map(item => `[${item.role}] : ${item.content}`).join('\n') + '\n';
    
    return formattedHistory + "[User] : " + currentPrompt;
}

// NOTE: La fonction performGoogleSearch a été complètement supprimée.

module.exports = {
  name: 'ai',
  description: 'Interact with Pollinations Text API (Optimized for speed).',
  usage: 'ai [votre message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) {
      return sendMessage(senderId, {
        text: "❓ Veuillez poser une question."
      }, pageAccessToken);
    }

    // Initialiser l'historique
    if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [];
    }
    
    // 1. Préparer le prompt final
    
    // INSTRUCTION SYSTÈME AVEC LA PERSONNALITÉ (sans mention de recherche Google)
    let systemInstruction = "Tu es Stanley Bot, un assistant conversationnel développé par Stanley Stawa. Quand on te demande ton créateur, tu dois répondre Stanley Stawa. Quand on te demande qui tu es, tu dois répondre Stanley Bot. Réponds de manière très concise.\n\n";
    
    const contextPrompt = systemInstruction + formatHistory(senderId, prompt);
    
    try {
      const encodedPrompt = encodeURIComponent(contextPrompt);
      const url = `https://text.pollinations.ai/${encodedPrompt}`;

      // Envoyer la requête à l'API Pollinations (le seul point d'attente)
      const { data } = await axios.get(url, {
        responseType: 'text'
      });

      const responseText = typeof data === 'string' ? data.trim() : 'Réponse vide.';

      // 2. Mettre à jour l'historique de conversation
      conversationHistory[senderId].push({ role: 'user', content: prompt });
      conversationHistory[senderId].push({ role: 'ai', content: responseText.split('\n')[0] || responseText });
      
      // 3. Découper et envoyer la réponse
      // J'ai utilisé votre format de message personnalisé pour l'envoi : Stanley Stawa 😙🚬
      const formattedResponse = `💬 | Stanley Stawa 😙🚬\n・───────────・\n${responseText}\n・──── 💫 ────・`;
      
      const parts = [];
      // Découpage en morceaux
      for (let i = 0; i < formattedResponse.length; i += 1900) {
        parts.push(formattedResponse.substring(i, i + 1900));
      }

      for (const part of parts) {
        await sendMessage(senderId, { text: part }, pageAccessToken);
      }

    } catch (error) {
      console.error('Erreur avec Pollinations Text API :', error.message);
      sendMessage(senderId, {
        text: "🤖 Une erreur est survenue avec Stanley.\nRéessayez plus tard ou posez une autre question."
      }, pageAccessToken);
    }
  }
};
