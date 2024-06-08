const fs = require('fs');
const path = require('path');
const login = require('./fca/index.js');
const { onChat, fonts }  = require('./system/chat');
const tsNode = require('ts-node');
const Fuse = require('fuse.js');
// Register ts-node to handle TypeScript files
tsNode.register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs',
        target: 'es6'
    }
});

// Load all commands
const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, 'cmd')).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of commandFiles) {
    const commandModule = require(path.join(__dirname, 'cmd', file));
    const command = commandModule.meta || commandModule.config || commandModule;
    commands.set(command.name, command);
    if (command.aliases) {
        for (const alias of command.aliases) {
            commands.set(alias, command);
        }
    }
}

// Define user roles and permissions
const userRoles = {
    'admin': ['user_id_1', 'user_id_2'],
    'moderator': ['user_id_3', 'user_id_4'],
    // Add more roles and their associated user IDs as needed
};

// Default command settings
const defaultPrefixEnabled = true;
const defaultRequiredRole = null;

let credentials = { email: '61559890234441', password: '@Ken2024' };

if (fs.existsSync('appstate.json')) {
    credentials = { appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8')) };
}

// Login to Facebook
login(credentials, (err, api) => {
    if (err) {
        return console.error(err);
    }

    // Save appstate to avoid login every time
    fs.writeFileSync('appstate.json', JSON.stringify(api.getAppState(), null, '\t'));
    console.log('Bot logged in and AppState saved');

    // Convert commands map to array for Fuse
    const commandArray = Array.from(commands.values());
    const fuse = new Fuse(commandArray, {
        keys: ['name', 'aliases']
    });

    // Listen for messages
    api.listenMqtt((err, event) => {
        if (err) {
            return console.error(err);
        }

        if (event.body) {
            const chat = new onChat(api, event);
            const output = chat;  // alias for chat
            const box = chat;  // another alias for chat

            // List of prefixes
            const prefixes = ['!', '?', '/'];

            // Find the prefix
            const matchedPrefix = prefixes.find(p => event.body.startsWith(p));
            if (!matchedPrefix) {
                console.error(`Received message with unrecognized prefix: ${event.body}`);
                return;
            }

            // Remove prefix and trim the command body
            const commandBody = event.body.slice(matchedPrefix.length).trim();

            // Check if the message is asking for the prefix
            if (event?.body?.toLowerCase().startsWith('prefix')) {
                chat.reply(`The prefix of the bot is: ${matchedPrefix}`);
                return;
            }

            // Search for command
            const fuseResult = fuse.search(commandBody);
            if (fuseResult.length > 0) {
                // Execute the closest matched command
                const command = fuseResult[0].item; // Get the closest matched command

                // Check if the command supports prefixes
                const prefixEnabled = command.isPrefix !== undefined ? command.isPrefix : defaultPrefixEnabled;
                if (!prefixEnabled) {
                    console.error(`Command ${command.name} does not support prefixes.`);
                    return;
                }

                // Check if the user has the required role to execute the command
                const requiredRole = command.role !== undefined ? command.role : defaultRequiredRole;
                if (requiredRole && !userRoles[requiredRole].includes(event.senderID)) {
                    chat.reply("You don't have permission to use this command.");
                    return;
                }

                // Prepare arguments for the command execution
                const args = commandBody.split(/\s+/).slice(1);
                const params = { chat, event, args, output, box, fonts };

                // Execute the command
                try {
                    command.exec(params);
                } catch (error) {
                    console.error(`Error executing command ${command.name}: ${error.message}`);
                    chat.reply('There was an error executing that command.');
                }
            } else {
                // Handle unrecognized commands by suggesting the closest command
                const closestCommands = fuseResult.map(result => result.item.name);
                chat.reply(`I'm not sure what you mean. Did you mean ${closestCommands.join(', ')}?`);
            }
        } else {
            console.error('Received an event without a body:', event);
        }
    });
});
