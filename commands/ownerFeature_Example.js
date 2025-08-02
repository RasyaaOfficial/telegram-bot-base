const premiumOnly = require("../middlewares/premiumOnly");

module.exports = {
    name: "premiumfeature",
    description: "Fitur khusus untuk user premium.",
    middleware: [premiumOnly],
    execute: async (ctx) => {
        await ctx.reply("Selamat! Anda adalah user premium dan bisa mengakses fitur ini.");
    },
};

