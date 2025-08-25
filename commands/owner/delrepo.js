const { Octokit } = require("@octokit/rest");
const ownerOnly = require("../../middlewares/ownerOnly");
const config =require("../../config");
const logger = require("../../utils/logger");

module.exports = {
    name: "delrepo",
    description: "Menghapus repository GitHub.",
    category: "owner",
    
    register: (bot) => {
        // Tahap 1: Meminta konfirmasi saat perintah /delrepo dipanggil
        bot.command("delrepo", ownerOnly, async (ctx) => {
            // Cek konfigurasi token
            if (!config.githubToken || config.githubToken === 'YOUR_GITHUB_PAT_HERE') {
                return ctx.reply("❌ Token GitHub belum diatur di file config.js. Fitur ini tidak dapat digunakan.");
            }

            const args = ctx.message.text.split(" ").slice(1);
            if (args.length !== 1) {
                return ctx.replyWithMarkdown("❌ Format salah!\n\n*Gunakan:* /delrepo <nama-repo>\n*Contoh:* /delrepo bot-lama-saya");
            }

            const repoName = args[0].trim();
            
            // Kirim pesan konfirmasi dengan tombol inline
            await ctx.reply(
                `❓ Anda yakin ingin menghapus repository *"${repoName}"* secara permanen?\n\n⚠️ *Tindakan ini tidak dapat diurungkan!*`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "✅ Ya, Hapus Sekarang", callback_data: `delrepo_confirm_${repoName}` },
                                { text: "❌ Batal", callback_data: `delrepo_cancel_${repoName}` }
                            ]
                        ]
                    }
                }
            );
        });

        // Tahap 2: Menangani aksi saat tombol "Ya, Hapus Sekarang" ditekan
        bot.action(/^delrepo_confirm_(.+)/, ownerOnly, async (ctx) => {
            const repoName = ctx.match[1];
            
            try {
                await ctx.editMessageText(`⏳ Menghapus repository "${repoName}"...`);

                const octokit = new Octokit({ auth: config.githubToken });
                const { data: user } = await octokit.users.getAuthenticated();

                await octokit.repos.delete({
                    owner: user.login,
                    repo: repoName
                });

                await ctx.editMessageText(`✅ Repository *"${repoName}"* berhasil dihapus secara permanen.`, { parse_mode: 'Markdown' });

            } catch (e) {
                logger.error(`Gagal menghapus repo GitHub: ${e.message}`);
                if (e.status === 404) {
                    await ctx.editMessageText(`❌ Gagal! Repository "${repoName}" tidak ditemukan di akun Anda.`);
                } else if (e.status === 403) {
                    await ctx.editMessageText(`❌ Gagal! Pastikan Personal Access Token Anda memiliki izin 'delete_repo'.`);
                } else {
                    await ctx.editMessageText(`❌ Terjadi kesalahan saat menghapus repository: ${e.message}`);
                }
            }
        });
        
        // Tahap 3: Menangani aksi saat tombol "Batal" ditekan
        bot.action(/^delrepo_cancel_(.+)/, ownerOnly, async (ctx) => {
            const repoName = ctx.match[1];
            await ctx.editMessageText(`☑️ Penghapusan repository "${repoName}" telah dibatalkan.`);
        });
    }
};