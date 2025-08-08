const fs = require("fs");
const path = require("path");

module.exports = {
    name: "help",
    description: "Menampilkan daftar perintah",
    register: (bot) => {
        bot.command("help", async (ctx) => {
            const commandsDir = path.join(__dirname, "..", "commands");
            const botInfoPath = path.join(__dirname, '..', 'data', 'botinfo.json');
            let botInfo = { botName: 'My Telegram Bot', ownerName: 'Bot Owner', thumbnail: null };

            if (fs.existsSync(botInfoPath)) {
                botInfo = JSON.parse(fs.readFileSync(botInfoPath, 'utf8'));
            }

            // Kategorisasi perintah
            const categories = {
                general: [],
                owner: [],
                premium: [],
                group: [],
                admin: []
            };

            const loadCommandDescriptions = (dir) => {
                const files = fs.readdirSync(dir, { withFileTypes: true });

                for (const file of files) {
                    const fullPath = path.join(dir, file.name);
                    if (file.isDirectory()) {
                        loadCommandDescriptions(fullPath);
                    } else if (file.isFile() && file.name.endsWith(".js")) {
                        try {
                            const commandModule = require(fullPath);
                            if (commandModule.name && commandModule.description) {
                                // Baca file untuk menentukan kategori berdasarkan middleware yang digunakan
                                const fileContent = fs.readFileSync(fullPath, 'utf8');
                                
                                let category = 'general';
                                if (fileContent.includes('ownerOnly')) {
                                    category = 'owner';
                                } else if (fileContent.includes('premiumOnly')) {
                                    category = 'premium';
                                } else if (fileContent.includes('groupOnly')) {
                                    category = 'group';
                                } else if (commandModule.name === 'ban' || commandModule.name === 'unban' || commandModule.name === 'kick') {
                                    category = 'admin';
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

            loadCommandDescriptions(commandsDir);

            // Susun pesan berdasarkan kategori
            let message = `📋 **Daftar Perintah ${botInfo.botName}**\n\n`;

            // Perintah Umum
            if (categories.general.length > 0) {
                message += "🔹 **Perintah Umum:**\n";
                categories.general.sort((a, b) => a.name.localeCompare(b.name));
                categories.general.forEach((cmd) => {
                    message += `  /${cmd.name} - ${cmd.description}\n`;
                });
                message += "\n";
            }

            // Perintah Grup
            if (categories.group.length > 0) {
                message += "👥 **Perintah Grup:**\n";
                categories.group.sort((a, b) => a.name.localeCompare(b.name));
                categories.group.forEach((cmd) => {
                    message += `  /${cmd.name} - ${cmd.description}\n`;
                });
                message += "\n";
            }

            // Perintah Admin (jika ada)
            if (categories.admin.length > 0) {
                message += "🛡️ **Perintah Admin Grup:**\n";
                categories.admin.sort((a, b) => a.name.localeCompare(b.name));
                categories.admin.forEach((cmd) => {
                    message += `  /${cmd.name} - ${cmd.description}\n`;
                });
                message += "\n";
            }

            // Perintah Premium
            if (categories.premium.length > 0) {
                message += "💎 **Perintah Premium:**\n";
                categories.premium.sort((a, b) => a.name.localeCompare(b.name));
                categories.premium.forEach((cmd) => {
                    message += `  /${cmd.name} - ${cmd.description}\n`;
                });
                message += "\n";
            }

            // Perintah Owner
            if (categories.owner.length > 0) {
                message += "👑 **Perintah Owner:**\n";
                categories.owner.sort((a, b) => a.name.localeCompare(b.name));
                categories.owner.forEach((cmd) => {
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