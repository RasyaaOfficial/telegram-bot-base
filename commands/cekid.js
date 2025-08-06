module.exports = {
    name: "cekid",
    description: "Menampilkan ID user",
    register: (bot) => {
        bot.command("cekid", async (ctx) => {
            const user = ctx.from;
            let message = `ID kamu: ${user.id}\n`;
            message += `Nama: ${user.first_name}`;
            
            if (user.last_name) {
                message += ` ${user.last_name}`;
            }
            
            if (user.username) {
                message += `\nUsername: @${user.username}`;
            }

            if (ctx.chat.type !== "private") {
                message += `\nID Grup: ${ctx.chat.id}`;
            }

            ctx.reply(message);
        });
    },
};

