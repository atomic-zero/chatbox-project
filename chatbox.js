const fs = require('fs');
const path = require('path');
const login = require('./fca/index.js');
const { onChat, fonts } = require('./system/chat');
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
const commandFactories = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, 'cmd'))
    .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of commandFiles) {
    const commandFactory = require(path.join(__dirname, 'cmd', file));
    const command = commandFactory();
    commandFactories.set(command.name, commandFactory);
    if (command.aliases) {
        for (const alias of command.aliases) {
            commandFactories.set(alias, commandFactory);
        }
    }
}

// Define user roles and permissions
const userRoles = {
    'admin': ['user_id_1', 'user_id_2'],
    'moderator': ['user_id_3', 'user_id_4'],
    'group_admin': []
};

// Default command settings
const defaultPrefixEnabled = false;
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
    const commandArray = Array.from(commandFactories.values());
    const fuse = new Fuse(commandArray, {
        keys: ['name', 'aliases']
    });

    // Define a map to store command execution contexts for each sender
    const senderContexts = new Map();

    // Listen for messages
    api.listenMqtt(async (err, event) => {
        if (err) {
            return console.error(err);
        }

        if (event.body) {
            const chat = new onChat(api, event);
            const senderID = event.senderID;

            // Get or create a command execution context for the sender
            let context = senderContexts.get(senderID);
            if (!context) {
                context = {};
                senderContexts.set(senderID, context);
            }

            const messageBody = event.body.trim();

            // List of prefixes 
            const prefixes = ['!', '?', '/'];

            // Find the prefix that is used in the body then proceeds to execute command with prefix 
            const matchedPrefix = prefixes.find(p => messageBody.startsWith(p));

            if (messageBody.toLowerCase() === 'prefix') {
                chat.reply(fonts.monospace(`The prefixes of the bot are: ${JSON.stringify(prefixes)}`));
                return;
            }

            let commandBody = messageBody;
            if (matchedPrefix) {
                commandBody = messageBody.slice(matchedPrefix.length).trim();
            }

            const args = commandBody.split(/\s+/);
            const commandName = args.shift().toLowerCase();
            const params = { api, chat, event, args, fonts, context };

            // Check if user is a thread admin
            const threadInfo = await chat.threadInfo(event.threadID);
            userRoles.group_admin = threadInfo.adminIDs.map(admin => admin.id);

            // Handle commands with prefixes
            if (matchedPrefix) {
                const fuseResult = fuse.search(commandName);
                if (fuseResult.length > 0) {
                    const commandFactory = commandFactories.get(fuseResult[0].item.name);
                    if (commandFactory) {
                        const commandInstance = commandFactory(); // Call the factory function to get a new instance
                        const prefixEnabled = commandInstance.isPrefix !== undefined ? commandInstance.isPrefix : defaultPrefixEnabled;
                        if (!prefixEnabled) {
                            chat.reply(fonts.monospace(`Command ${commandInstance.name} does not need a prefix.`));
                            return;
                        }

                        const requiredRole = commandInstance.role !== undefined ? commandInstance.role : defaultRequiredRole;
                        if (requiredRole && !userRoles[requiredRole].includes(senderID)) {
                            chat.reply(fonts.monospace("You don't have permission to use this command."));
                            return;
                        }

                        try {
                            commandInstance.exec(params);
                        } catch (error) {
                            console.error(`Error executing command ${commandInstance.name}: ${error.message}`);
                            chat.reply(fonts.monospace('There was an error executing that command.'));
                        }
                    }
                } else {
                    chat.reply(fonts.monospace(`I'm not sure what you mean. Please check the command name.`));
                }
            } else {
                // Handle exact match commands without prefixes
                const commandFactory = commandFactories.get(commandName);
                if (commandFactory) {
                    const commandInstance = commandFactory(); // Call the factory function to get a new instance
                    const prefixEnabled = commandInstance.isPrefix !== undefined ? commandInstance.isPrefix : defaultPrefixEnabled;
                    if (prefixEnabled) {
                        chat.reply(fonts.monospace(`Command ${commandInstance.name} requires a prefix.`));
                        return;
                    }

                    const requiredRole = commandInstance.role !== undefined ? commandInstance.role : defaultRequiredRole;
                    if (requiredRole && !userRoles[requiredRole].includes(senderID)) {
                        chat.reply(fonts.monospace("You don't have permission to use this command."));
                        return;
                    }

                    try {
                        commandInstance.exec(params);
                    } catch (error) {
                        console.error(`Error executing command ${commandInstance.name}: ${error.message}`);
                        chat.reply(fonts.monospace('There was an error executing that command.'));
                    }
                }
            }
        } else {
            console.error('Received an event without a body:', event);
        }
    });
});
