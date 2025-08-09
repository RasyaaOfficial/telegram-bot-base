const fs = require("fs");
const path = require("path");
const ownerOnly = require("../../middlewares/ownerOnly");

module.exports = {
    name: "addprem",
    description: "Menambahkan user premium",
    register: (bot) => {
        bot.command("addprem", ownerOnly, async (ctx) => {
            const args = ctx.message.text.split(" ");
            
            if (args.length < 2) {
                return ctx.reply("Gunakan: /addprem [user_id]");
            }

            const userId = parseInt(args[1]);
            if (isNaN(userId)) {
                return ctx.reply("ID user harus berupa angka.");
            }

            const premiumsPath = path.join(__dirname, "..", "..", "data", "premiums.json");
            let premiums = [];

            if (fs.existsSync(premiumsPath)) {
                premiums = JSON.parse(fs.readFileSync(premiumsPath, "utf8"));
            }

            if (premiums.includes(userId)) {
                return ctx.reply("User sudah premium.");
            }

            premiums.push(userId);
            fs.writeFileSync(premiumsPath, JSON.stringify(premiums, null, 2));
            
            ctx.reply(`User ${userId} berhasil ditambahkan sebagai premium.`);
        });
    },
};

