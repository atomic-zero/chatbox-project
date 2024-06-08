const axios = require("axios");

let conversationHistories = {};
let webSearchMode = false;

module.exports = {
  name: "box",
  aliases: ["bb", "blackbox", "blackbox-ai"],
  version: "1.0.0",
  isPrefix: false,
  credits: "Kenneth Panio",
  type: "artificial-intelligence",
  info: "Interact with Blackbox AI. Use 'box toggle' to toggle web search mode.",
  usage: "[prompt]",
  guide: "blackbox How does nuclear fusion work?",
  cd: 6,
  exec: async ({ chat, args, event, fonts }) => {
    const mono = txt => fonts.monospace(txt);
    const { threadID, senderID } = event;
    const query = args.join(" ");

    if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
      conversationHistories[senderID] = [];
      chat.reply(mono("Conversation history cleared."));
      return;
    }

    if (query === 'toggle') {
      webSearchMode = !webSearchMode;
      chat.reply(mono(`Web search mode has been ${webSearchMode ? 'enabled' : 'disabled'}.`));
      return;
    }

    if (!query) {
      chat.reply(mono("Please provide a question!"));
      return;
    }

    const answering = await chat.reply(mono("🕐 | Answering..."));

    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({ content: query, role: senderID });

    try {
      const response = await axios.post("https://www.blackbox.ai/api/chat", {
        messages: conversationHistories[senderID],
        id: senderID,
        previewToken: null,
        userId: senderID,
        codeModelMode: true,
        agentMode: [],
        trendingAgentMode: [],
        isMicMode: false,
        isChromeExt: false,
        githubToken: null,
        webSearchMode,
        maxTokens: '10240'
      });

      const answer = response.data.replace(/\$@\$(.*?)\$@\$/g, '') || mono("I don't understand could you please rephrase that!");

      conversationHistories[senderID].push({ content: answer, role: "assistant" });

      const line = "\n" + '━'.repeat(18) + "\n";
      answering.edit(mono("◼️ BLACKBOX AI") + line + answer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.\n◉ USE "TOGGLE" TO SWITCH WEBSEARCH`));
    } catch (error) {
      answering.edit(mono("No response from Blackbox AI. Please try again later: " + error.message));
      answering.unsend(5000);
    }
  }
}
