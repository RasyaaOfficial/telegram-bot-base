const fs = require("fs");
const path = require("path");
const ownerOnly = require("../../middlewares/ownerOnly");

module.exports = {
    name: "setnamebot",
    description: "Mengubah nama bot",
    register: (bot) => {
        bot.command("setnamebot", ownerOnly, async (ctx) => {
            const args = ctx.message.text.split(" ").slice(1);
            
            if (args.length === 0) {
                return ctx.reply("Gunakan: /setnamebot [nama_bot]");
            }

            const newName = args.join(" ");
            const botInfoPath = path.join(__dirname, "..", "..", "data", "botinfo.json");
            
            let botInfo = { botName: "My Telegram Bot", ownerName: "Bot Owner", thumbnail: null };
            if (fs.existsSync(botInfoPath)) {
                botInfo = JSON.parse(fs.readFileSync(botInfoPath, "utf8"));
            }

            botInfo.botName = newName;
            fs.writeFileSync(botInfoPath, JSON.stringify(botInfo, null, 2));
            
            ctx.reply(`Nama bot berhasil diubah menjadi: ${newName}`);
        });
    },
};

