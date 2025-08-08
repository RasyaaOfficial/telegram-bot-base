const fs = require("fs");
const path = require("path");

module.exports = {
    name: "help",
    description: "Menampilkan daftar perintah",
    register: (bot) => {
        bot.command("help", async (ctx) => {
            const commandsDir = path.join(__dirname, "..", "commands");
            let commandList = [];
const botInfoPath = path.join(__dirname, '..', 'data', 'botinfo.json');
        let botInfo = { botName: 'My Telegram Bot', ownerName: 'Bot Owner', thumbnail: null };

        if (fs.existsSync(botInfoPath)) {
            botInfo = JSON.parse(fs.readFileSync(botInfoPath, 'utf8'));
        }
            const loadCommandDescriptions = (dir) => {
                const files = fs.readdirSync(dir, { withFileTypes: true });

                for (const file of files) {
                    const fullPath = path.join(dir, file.name);
                    if (file.isDirectory()) {
                        loadCommandDescriptions(fullPath);
                    } else if (file.isFile() && file.name.endsWith(".js")) {
                        const commandModule = require(fullPath);
                        if (commandModule.name && commandModule.description) {
                            commandList.push({ name: commandModule.name, description: commandModule.description });
                        }
                    }
                }
            };

            loadCommandDescriptions(commandsDir);

            let message = "Daftar perintah yang tersedia:\n\n";
            commandList.sort((a, b) => a.name.localeCompare(b.name)); // Urutkan berdasarkan nama
            commandList.forEach((cmd) => {
                message += `/${cmd.name} - ${cmd.description}\n`;
            });

   
            if (botInfo.thumbnail) {
                await ctx.replyWithPhoto(botInfo.thumbnail, { caption: message });
            } else {
                await ctx.reply(message);
            }
        });
    },
};