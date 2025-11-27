const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// Objet pour stocker l'historique de conversation de chaque utilisateur.
// Clé: senderId (ID de l'utilisateur Facebook) | Valeur: Tableau de chaînes de caractères (messages)
const conversationHistory = {};

// Fonction utilitaire pour formater l'historique en une seule chaîne.
function formatHistory(senderId, currentPrompt) {
    let history = conversationHistory[senderId] || [];
    
    // Concaténer les messages précédents pour donner du contexte à l'IA.
    // Limiter l'historique à X messages pour éviter de dépasser la limite de l'URL/prompt.
    const historyLimit = 5; 
    const recentHistory = history.slice(-historyLimit); 

    let formattedHistory = recentHistory.join('\n[User] : ') + '\n';
    
    return formattedHistory + "[User] : " + currentPrompt;
}

module.exports = {
  name: 'ai',
  description: 'Interact with Pollinations Text API (GET prompt in URL) with conversation history.',
  usage: 'ai [votre message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) {
      return sendMessage(senderId, {
        text: "❓ Veuillez poser une question ou tapez 'help' pour voir les commandes."
      }, pageAccessToken);
    }

    // 1. Préparer le prompt en incluant l'historique
    const fullPromptWithHistory = formatHistory(senderId, prompt);
    
    try {
      const encodedPrompt = encodeURIComponent(fullPromptWithHistory);
      const url = `https://text.pollinations.ai/${encodedPrompt}`;

      // Envoyer la requête à l'API Pollinations
      const { data } = await axios.get(url, {
        responseType: 'text'
      });

      const responseText = typeof data === 'string' ? data.trim() : 'Réponse vide.';

      // 2. Mettre à jour l'historique de conversation
      if (!conversationHistory[senderId]) {
          conversationHistory[senderId] = [];
      }
      // Enregistrer le prompt de l'utilisateur
      conversationHistory[senderId].push(`[User] : ${prompt}`);
      // Enregistrer la réponse de l'IA (formatée pour le prochain prompt)
      conversationHistory[senderId].push(`[AI] : ${responseText.split('\n')[0] || responseText}`);
      
      // 3. Découper et envoyer la réponse
      const finalResponse = `Stanley Stawa 😙🚬\n・───────────・\n${responseText}\n・──── 💫 ────・`;
      const parts = [];
      for (let i = 0; i < finalResponse.length; i += 1800) {
        parts.push(finalResponse.substring(i, i + 1800));
      }

      for (const part of parts) {
        await sendMessage(senderId, { text: part }, pageAccessToken);
      }
    } catch (error) {
      console.error('Erreur avec Pollinations Text API :', error.message);
      sendMessage(senderId, {
        text: "🤖 Pas de chance .\nRéessayez plus tard ou posez une autre question."
      }, pageAccessToken);
    }
  }
};
