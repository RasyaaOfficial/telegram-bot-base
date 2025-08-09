const groupOnly = require("../../middlewares/groupOnly");

module.exports = {
    name: "ban",
    description: "Ban user dari grup",
    register: (bot) => {
        bot.command("ban", groupOnly, async (ctx) => {
            try {
                const chatMember = await ctx.getChatMember(ctx.from.id);
                if (!["administrator", "creator"].includes(chatMember.status)) {
                    return ctx.reply("Hanya admin yang bisa menggunakan perintah ini.");
                }

                let targetUser = null;
                
                if (ctx.message.reply_to_message) {
                    targetUser = ctx.message.reply_to_message.from;
                } else if (ctx.message.text.split(" ")[1]) {
                    const userId = ctx.message.text.split(" ")[1];
                    try {
                        const member = await ctx.getChatMember(userId);
                        targetUser = member.user;
                    } catch (error) {
                        return ctx.reply("User tidak ditemukan.");
                    }
                } else {
                    return ctx.reply("Reply pesan user yang ingin di-ban atau gunakan: /ban [user_id]");
                }

                if (!targetUser) {
                    return ctx.reply("User tidak ditemukan.");
                }

                const targetMember = await ctx.getChatMember(targetUser.id);
                if (["administrator", "creator"].includes(targetMember.status)) {
                    return ctx.reply("Tidak bisa ban admin atau creator grup.");
                }

                await ctx.banChatMember(targetUser.id);
                ctx.reply(`User ${targetUser.first_name} (${targetUser.id}) telah di-ban dari grup.`);
            } catch (error) {
                ctx.reply("Terjadi kesalahan saat melakukan ban.");
            }
        });
    },
};

