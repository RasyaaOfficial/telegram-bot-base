const groupOnly = require("../../middlewares/groupOnly");

module.exports = {
    name: "groupfeature",
    description: "Percobaan Khusus Grup.",
    register: (bot) => {
        bot.command("groupfeature", groupOnly, async (ctx) => {
            const groupName = ctx.chat.title || "grup ini";
            await ctx.reply(`Fitur ini hanya bisa digunakan di grup. Selamat datang di ${groupName}!`);
        });
    },
};

