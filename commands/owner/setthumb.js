const fs = require("fs");
const path = require("path");
const ownerOnly = require("../../middlewares/ownerOnly");

module.exports = {
    name: "setthumb",
    description: "Mengubah thumbnail bot",
    register: (bot) => {
        bot.command("setthumb", ownerOnly, async (ctx) => {
            if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) {
                return ctx.reply("Reply foto untuk mengubah thumbnail bot.");
            }

            const photo = ctx.message.reply_to_message.photo;
            const fileId = photo[photo.length - 1].file_id;
            
            const botInfoPath = path.join(__dirname, "..", "..", "data", "botinfo.json");
            
            let botInfo = { botName: "My Telegram Bot", ownerName: "Bot Owner", thumbnail: null };
            if (fs.existsSync(botInfoPath)) {
                botInfo = JSON.parse(fs.readFileSync(botInfoPath, "utf8"));
            }

            botInfo.thumbnail = fileId;
            fs.writeFileSync(botInfoPath, JSON.stringify(botInfo, null, 2));
            
            ctx.reply("Thumbnail bot berhasil diubah.");
        });
    },
};

