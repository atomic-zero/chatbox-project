module.exports = {
  name: "install",
  role: "moderator",
  isPrefix: true,
  aliases: ["installer", "loadcmd", "cmdload", "command", "cmd"],
  usage: "[filename.js or ts] or [reply to message body containing code with filename.js or ts]",
  info: "Install or uninstall a command from provided code or by replying to a message with the command code.",
  guide: "cmd [filename.js or ts] or reply to message body with [filename.js or ts] to install the command. Use 'cmd uninstall [filename.js or ts]' keyword to remove a command. Use 'cmd list' to list all installed commands.",
  credits: "Kenneth Panio",
  version: "1.1.0",
  async exec({ chat, event, args, fonts }) {
    var mono = txt => fonts.monospace(txt);
    const fs = require('fs');
    const path = require('path');
    const { transpileModule } = require('typescript');

    const uninstallKeywords = ["uninstall", "delete", "remove", "rm", "del"];

    const listCommands = () => {
      const files = fs.readdirSync(__dirname);
      const commandFiles = files.filter(file => file.endsWith('.js') || file.endsWith('.ts'));
      const commands = commandFiles.map((file, index) => `${index + 1}. ${file.replace(/\.[^/.]+$/, '')}`);
      return commands.length ? commands.join('\n') : 'No commands installed.';
    };

    if (args[0] === 'list') {
      return chat.reply(mono(listCommands()), 120000);
    }

    if (uninstallKeywords.includes(args[0])) {
      if (args.length !== 2) {
        return chat.reply(mono('Please provide the filename of the command to uninstall.'));
      }
      const fileName = args[1];
      const filePath = path.join(__dirname, fileName);

      fs.unlink(filePath, function(err) {
        if (err) {
          return chat.reply(mono(`An error occurred while uninstalling the command: ${err.message}`));
        } else {
          return chat.reply(mono(`Command ${fileName} successfully uninstalled.`));
        }
      });
    } else {
      if (event.type === "message_reply") {
        const snippet = args.slice(1).join(' ');
        const text = event.messageReply.body || snippet;

        if (!text.trim()) {
          return chat.reply(mono('No code provided for installation.'));
        }

        const fileName = args[0];
        const fileExtension = fileName.split('.').pop()?.toLowerCase();

        if (fileExtension !== 'js' && fileExtension !== 'ts') {
          return chat.reply(mono('Invalid file extension. Please provide a .js or .ts file.'));
        }

        if (fileExtension === 'js') {
          try {
            eval(text); 
          } catch (error) {
            return chat.reply(`Syntax error detected in the provided JavaScript code: ${error.message}`);
          }
        }

        if (fileExtension === 'ts') {
          try {
            transpileModule(text, {}); 
          } catch (error) {
            return chat.reply(mono(`Syntax error detected in the provided TypeScript code: ${error.message}`));
          }
        }

        const filePath = path.join(__dirname, fileName);
        
        fs.writeFile(filePath, text, "utf-8", async function (err) {
          if (err) {
            return chat.reply(`An error occurred while installing the command: ${err.message}`);
          } else {
            await chat.reply(mono(`Command ${fileName} successfully installed.`));
            process.exit(1);
          }
        });
      } else {
        if (args.length < 2) {
          return chat.reply(mono('Please reply to a message containing the command code or provide the code directly in the format install [filename.js or ts]. or use cmd uninstall [filename.js or ts]'));
        } else {
          const snippet = args.slice(1).join(' ');
          if (!snippet.trim()) {
            return chat.reply(mono('No code provided for installation.'));
          }

          const fileName = args[0];
          const fileExtension = fileName.split('.').pop()?.toLowerCase();

          if (fileExtension !== 'js' && fileExtension !== 'ts') {
            return chat.reply(mono('Invalid file extension. Please provide a .js or .ts file.'));
          }

          if (fileExtension === 'js') {
            try {
              eval(snippet); 
            } catch (error) {
              return chat.reply(mono(`Syntax error detected in the provided JavaScript code: ${error.message}`));
            }
          }

          if (fileExtension === 'ts') {
            try {
              transpileModule(snippet, {});
            } catch (error) {
              return chat.reply(mono(`Syntax error detected in the provided TypeScript code: ${error.message}`));
            }
          }

          const filePath = path.join(__dirname, fileName);
          
          fs.writeFile(filePath, snippet, "utf-8", async function (err) {
            if (err) {
              return chat.reply(mono(`An error occurred while installing the command: ${err.message}`));
            } else {
              await chat.reply(mono(`Command ${fileName} successfully installed.`));
              process.exit(1);
            }
          });
        }
      }
    }
  }
};
