const premiumOnly = require("../../middlewares/premiumOnly");

module.exports = {
    name: "premiumfeature",
    description: "Percobaan Fitur Premium.",
    register: (bot) => {
        bot.command("premiumfeature", premiumOnly, async (ctx) => {
            await ctx.reply("Selamat! Anda adalah user premium dan bisa mengakses fitur ini.");
        });
    },
};

