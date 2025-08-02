const gameSession = new Map(); 
module.exports = {
    name: 'tebak',
    description: 'Game tebak angka 1-10 dengan 3 kesempatan',
    execute: async (ctx) => {
        const userId = ctx.from.id;
        const args = ctx.message.text.split(' ');

        if (args.length === 1) {
            if (gameSession.has(userId)) {
                return ctx.reply('Kamu sudah memiliki game yang sedang berjalan. Tebak angkanya atau ketik /tebak untuk memulai ulang.');
            }
            const randomNumber = Math.floor(Math.random() * 10) + 1;
            gameSession.set(userId, { correctNumber: randomNumber, attemptsLeft: 3 });
            return ctx.reply(`Game tebak angka dimulai! Tebak angka dari 1-10. Kamu punya 3 kesempatan.`);
        }

        if (gameSession.has(userId)) {
            const guess = parseInt(args[1]);
            if (isNaN(guess) || guess < 1 || guess > 10) {
                return ctx.reply('Masukkan angka yang valid (1-10).');
            }
            
            const session = gameSession.get(userId);
            session.attemptsLeft--;

            if (guess === session.correctNumber) {
                gameSession.delete(userId);
                return ctx.reply(`🎉 Selamat! Tebakan kamu benar. Angkanya adalah ${session.correctNumber}.`);
            } else if (session.attemptsLeft > 0) {
                gameSession.set(userId, session); 
                return ctx.reply(`❌ Salah! Sisa kesempatan: ${session.attemptsLeft}.`);
            } else {
                gameSession.delete(userId);
                return ctx.reply(`😔 Kesempatanmu habis! Angka yang benar adalah ${session.correctNumber}. Ketik /tebak untuk bermain lagi.`);
            }
        } else {
            return ctx.reply('Kamu belum memulai game. Ketik /tebak untuk memulai.');
        }
    },
    gameSession: gameSession
};

