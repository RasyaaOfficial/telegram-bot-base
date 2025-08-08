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

            // Hitung runtime bot (asumsi bot dimulai saat process dimulai)
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);

            let runtimeText = "";
            if (days > 0) runtimeText += `${days} hari, `;
            if (hours > 0) runtimeText += `${hours} jam, `;
            if (minutes > 0) runtimeText += `${minutes} menit, `;
            runtimeText += `${seconds} detik`;

            // Informasi tambahan
            const currentDate = new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            let message = `🤖 **${botInfo.botName}**\n\n`;
            message += `👑 **Owner:** ${botInfo.ownerName}\n`;
            message += `⏰ **Runtime:** ${runtimeText}\n`;
            message += `📅 **Tanggal:** ${currentDate}\n`;
            message += `💾 **Memory Usage:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n\n`;
            message += `📋 Gunakan /help untuk melihat daftar perintah.`;

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