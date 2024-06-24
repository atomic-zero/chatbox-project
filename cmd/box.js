const { chatbox, toggle, clear } = require('chatbox-dev-ai');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "chatbox",
    aliases: ["chatterbox"],
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with chatterbox AI. Use 'box toggle' to toggle web search mode.",
    usage: "[prompt]",
    guide: "chatbox How does nuclear fusion work?",
    cd: 6
};

module.exports["exec"] = async ({ chat, args, event, fonts }) => {
    const mono = txt => fonts.monospace(txt);
    const { senderID } = event;
    const query = args.join(" ");

    if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
        const clearResult = await clear(senderID);
        return chat.reply(mono(clearResult));
    }

    if (query === 'toggle') {
        const message = await toggle();
        return chat.reply(mono(message));
    }

    if (!query) {
        chat.reply(mono("Please provide a question!"));
        return;
    }

    const answering = await chat.reply(mono("🕐 | Answering..."));

    try {
        const response = await chatbox(senderID, query);
        let answer = response;

        // Replace double asterisks with bold text
        answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => fonts.bold(text));

        const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
        const line = "\n" + '━'.repeat(18) + "\n";
        const message = fonts.bold("📦 | CHATBOX DEV AI") + line + answer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.\n◉ USE "TOGGLE" TO SWITCH WEBSEARCH`);

        await answering.edit(message);

        if (codeBlocks.length > 0) {
            const allCode = codeBlocks.map(block => block.replace(/```/g, '').trim()).join('\n\n\n');
            const cacheFolderPath = path.join(__dirname, "cache");

            if (!fs.existsSync(cacheFolderPath)) {
                fs.mkdirSync(cacheFolderPath);
            }

            const uniqueFileName = `code_snippet_${Math.floor(Math.random() * 1e6)}.txt`;
            const filePath = path.join(cacheFolderPath, uniqueFileName);

            fs.writeFileSync(filePath, allCode, 'utf8');

            const fileStream = fs.createReadStream(filePath);
            await chat.reply({ attachment: fileStream });

            fs.unlinkSync(filePath);
        }
    } catch (error) {
        await answering.edit(mono("No response from Chatbox AI. Please try again later: " + error.message));
    }
};
