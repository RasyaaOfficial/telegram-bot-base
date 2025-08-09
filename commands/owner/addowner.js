const fs = require("fs");
const path = require("path");
const ownerOnly = require("../../middlewares/ownerOnly");

module.exports = {
    name: "addowner",
    description: "Menambahkan owner bot",
    register: (bot) => {
        bot.command("addowner", ownerOnly, async (ctx) => {
            const args = ctx.message.text.split(" ");
            
            if (args.length < 2) {
                return ctx.reply("Gunakan: /addowner [user_id]");
            }

            const userId = parseInt(args[1]);
            if (isNaN(userId)) {
                return ctx.reply("ID user harus berupa angka.");
            }

            const ownersPath = path.join(__dirname, "..", "..", "data", "owners.json");
            let owners = [];

            if (fs.existsSync(ownersPath)) {
                owners = JSON.parse(fs.readFileSync(ownersPath, "utf8"));
            }

            if (owners.includes(userId)) {
                return ctx.reply("User sudah menjadi owner.");
            }

            owners.push(userId);
            fs.writeFileSync(ownersPath, JSON.stringify(owners, null, 2));
            
            ctx.reply(`User ${userId} berhasil ditambahkan sebagai owner.`);
        });
    },
};

