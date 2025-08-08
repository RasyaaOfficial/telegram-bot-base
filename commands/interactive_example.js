module.exports = {
    name: "interactive",
    description: "Percobaan Fitur Button sesi",
    register: (bot) => {
        const userStates = new Map(); // Untuk menyimpan state sesi per user

        bot.command("interactive", async (ctx) => {
            userStates.set(ctx.from.id, { step: 1 });
            await ctx.reply(
                "Halo! Ini adalah contoh interaktif. Pilih opsi di bawah:",
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Opsi A", callback_data: "interactive_option_a" }],
                            [{ text: "Opsi B", callback_data: "interactive_option_b" }],
                        ],
                    },
                }
            );
        });

        bot.action("interactive_option_a", async (ctx) => {
            const userId = ctx.from.id;
            const state = userStates.get(userId);

            if (state && state.step === 1) {
                userStates.set(userId, { step: 2, selectedOption: "A" });
                await ctx.editMessageText("Anda memilih Opsi A. Sekarang, ketik pesan rahasia Anda:");
            } else {
                await ctx.reply("Sesi Anda tidak valid atau sudah berakhir. Silakan mulai lagi dengan /interactive.");
            }
            await ctx.answerCbQuery(); // Penting untuk menghilangkan loading di tombol
        });

        bot.action("interactive_option_b", async (ctx) => {
            const userId = ctx.from.id;
            const state = userStates.get(userId);

            if (state && state.step === 1) {
                userStates.set(userId, { step: 2, selectedOption: "B" });
                await ctx.editMessageText("Anda memilih Opsi B. Sekarang, ketik pesan rahasia Anda:");
            } else {
                await ctx.reply("Sesi Anda tidak valid atau sudah berakhir. Silakan mulai lagi dengan /interactive.");
            }
            await ctx.answerCbQuery();
        });

        // Handle pesan teks setelah memilih opsi
        bot.on("text", async (ctx, next) => {
            const userId = ctx.from.id;
            const state = userStates.get(userId);

            // Pastikan ini adalah pesan untuk sesi interaktif ini dan bukan command lain
            if (state && state.step === 2 && !ctx.message.text.startsWith("/")) {
                const secretMessage = ctx.message.text;
                await ctx.reply(`Pesan rahasia Anda ('${secretMessage}') telah diterima untuk Opsi ${state.selectedOption}. Sesi berakhir.`);
                userStates.delete(userId); // Hapus sesi setelah selesai
            } else {
                await next(); // Lanjutkan ke handler lain jika bukan bagian dari sesi ini
            }
        });
    },
};

