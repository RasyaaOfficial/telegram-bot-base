const ownerOnly = require("../../middlewares/ownerOnly");

module.exports = {
    name: "ownerfeature",
    description: "Percobaan Fitur Owner.",
    register: (bot) => {
        bot.command("ownerfeature", ownerOnly, async (ctx) => {
            await ctx.reply("Halo owner! Ini adalah fitur khusus untuk Anda.");
        });
    },
};

