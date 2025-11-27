const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// La gestion de l'historique (conversationHistory et formatHistory) a été supprimée.

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
    
    // 1. Préparer le prompt final
    
    // Instruction Système de Personnalité : Reste courte pour la vitesse.
    const systemInstruction = "Tu es Stanley Bot, un assistant conversationnel développé par Stanley Stawa. Quand on te demande ton créateur, tu dois répondre Stanley Stawa. Quand on te demande qui tu es, tu dois répondre Stanley Bot. Réponds de manière très concise.\n\n";
    
    // Le prompt final est simplement l'instruction + la question de l'utilisateur.
    const contextPrompt = systemInstruction + "[User] : " + prompt;
    
    try {
      const encodedPrompt = encodeURIComponent(contextPrompt);
      const url = `https://text.pollinations.ai/${encodedPrompt}`;

      // Envoi de la requête à l'API Pollinations (le point critique de vitesse)
      const { data } = await axios.get(url, {
        responseType: 'text'
      });

      const responseText = typeof data === 'string' ? data.trim() : 'Réponse vide.';

      // 2. Découper et envoyer la réponse
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
