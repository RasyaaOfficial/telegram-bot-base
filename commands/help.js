const fs = require("fs");
const path = require("path");

module.exports = {
    name: "help",
    description: "Menampilkan daftar perintah",
    register: (bot) => {
        bot.command("help", async (ctx) => {
            const commandsDir = path.join(__dirname, "..");
            const botInfoPath = path.join(__dirname, '..', 'data', 'botinfo.json');
            let botInfo = { botName: 'My Telegram Bot', ownerName: 'Bot Owner', thumbnail: null };

            if (fs.existsSync(botInfoPath)) {
                botInfo = JSON.parse(fs.readFileSync(botInfoPath, 'utf8'));
            }

            const categories = {};

            const loadCommandDescriptions = (dir, category = 'main') => {
                const files = fs.readdirSync(dir, { withFileTypes: true });

                for (const file of files) {
                    const fullPath = path.join(dir, file.name);
                    if (file.isDirectory()) {
                        loadCommandDescriptions(fullPath, file.name);
                    } else if (file.isFile() && file.name.endsWith(".js")) {
                        try {
                            const commandModule = require(fullPath);
                            if (commandModule.name && commandModule.description) {
                                if (!categories[category]) {
                                    categories[category] = [];
                                }
                                
                                categories[category].push({
                                    name: commandModule.name,
                                    description: commandModule.description
                                });
                            }
                        } catch (error) {
                            console.log(`Error loading command ${file.name}:`, error.message);
                        }
                    }
                }
            };

            loadCommandDescriptions(path.join(commandsDir, "commands"));

            // Susun pesan berdasarkan kategori
            let message = `📋 **Daftar Perintah ${botInfo.botName}**\n\n`;

            // Emoji untuk kategori
            const categoryEmojis = {
                main: "🔹",
                owner: "👑",
                tools: "🛠️",
                admin: "🛡️",
                premium: "💎",
                group: "👥",
                game: "🎮",
                helper: "⚙️"
            };

            // Urutkan kategori dengan main di depan
            const sortedCategories = Object.keys(categories).sort((a, b) => {
                if (a === 'main') return -1;
                if (b === 'main') return 1;
                return a.localeCompare(b);
            });

            for (const category of sortedCategories) {
                const emoji = categoryEmojis[category] || "📁";
                const categoryName = category === 'main' ? 'Perintah Umum' : 
                                   category.charAt(0).toUpperCase() + category.slice(1);
                
                message += `${emoji} **${categoryName}:**\n`;
                categories[category].sort((a, b) => a.name.localeCompare(b.name));
                categories[category].forEach((cmd) => {
                    message += `  /${cmd.name} - ${cmd.description}\n`;
                });
                message += "\n";
            }

            message += `\n🔸 Total: ${Object.values(categories).flat().length} perintah`;

            if (botInfo.thumbnail) {
                await ctx.replyWithPhoto(botInfo.thumbnail, { 
                    caption: message,
                    parse_mode: "Markdown"
                });
            } else {
                await ctx.reply(message, { parse_mode: "Markdown" });
            }
        });
    },
};