const fs = require("fs");
const path = require("path");
const ownerOnly = require("../../middlewares/ownerOnly");

module.exports = {
    name: "setownername",
    description: "Mengubah nama owner",
    register: (bot) => {
        bot.command("setownername", ownerOnly, async (ctx) => {
            const args = ctx.message.text.split(" ").slice(1);
            
            if (args.length === 0) {
                return ctx.reply("Gunakan: /setownername [nama_owner]");
            }

            const newOwnerName = args.join(" ");
            const botInfoPath = path.join(__dirname, "..", "..", "data", "botinfo.json");
            
            let botInfo = { botName: "My Telegram Bot", ownerName: "Bot Owner", thumbnail: null };
            if (fs.existsSync(botInfoPath)) {
                botInfo = JSON.parse(fs.readFileSync(botInfoPath, "utf8"));
            }

            botInfo.ownerName = newOwnerName;
            fs.writeFileSync(botInfoPath, JSON.stringify(botInfo, null, 2));
            
            ctx.reply(`Nama owner berhasil diubah menjadi: ${newOwnerName}`);
        });
    },
};

