const fs = require("fs");
const path = require("path");

module.exports = {
    name: "start",
    description: "Menampilkan info bot",
    register: (bot) => {
        bot.command("start", async (ctx) => {
            const botInfoPath = path.join(__dirname, "..", "data", "botinfo.json");
            let botInfo = { botName: "My Telegram Bot", ownerName: "Bot Owner", thumbnail: null };

            if (fs.existsSync(botInfoPath)) {
                botInfo = JSON.parse(fs.readFileSync(botInfoPath, "utf8"));
            }

            let message = `Halo! Saya ${botInfo.botName}.\n`;
            message += `Owner saya adalah ${botInfo.ownerName}.\n\n`;
            message += `Gunakan /help untuk melihat daftar perintah.`;

            if (botInfo.thumbnail) {
                await ctx.replyWithPhoto(botInfo.thumbnail, { caption: message });
            } else {
                await ctx.reply(message);
            }
        });
    },
};

