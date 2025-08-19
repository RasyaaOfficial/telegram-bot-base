const { Octokit } = require("@octokit/rest");
const ownerOnly = require("../../middlewares/ownerOnly");
const config = require("../../config");
const logger = require("../../utils/logger");

module.exports = {
    name: "crepo",
    description: "Membuat repository GitHub baru.",
    category: "owner", // Kategori ini akan otomatis terdeteksi dari nama folder
    
    register: (bot) => {
        bot.command("crepo", ownerOnly, async (ctx) => {
            // Cek apakah token GitHub sudah dikonfigurasi
            if (!config.githubToken || config.githubToken === 'YOUR_GITHUB_PAT_HERE') {
                return ctx.reply("❌ Token GitHub belum diatur di file config.js. Fitur ini tidak dapat digunakan.");
            }
            
            // Mengambil argumen dari pesan
            const args = ctx.message.text.split(" ").slice(1);
            if (args.length < 1) {
                return ctx.reply("❌ Format salah!\n\n*Gunakan:* /crepo <nama-repo> [deskripsi]\n*Contoh:* /crepo my-bot Deskripsi singkat bot ini");
            }

            const [repoName, ...descParts] = args;
            const description = descParts.join(' ') || 'Dibuat melalui Telegram Bot';

            try {
                // Inisialisasi Octokit dengan token dari config
                const octokit = new Octokit({ auth: config.githubToken });
                
                await ctx.reply(`Membuat repository "${repoName}"...`);

                // Panggil API GitHub untuk membuat repo
                const response = await octokit.repos.createForAuthenticatedUser({
                    name: repoName,
                    description,
                    private: false, // Anda bisa ubah ke true jika ingin repo private
                    auto_init: true // Membuat repo dengan file README.md awal
                });

                // Format pesan sukses
                const successMsg = `✅ *Repository Berhasil Dibuat!*\n\n` +
                                   `📛 *Nama:* ${repoName}\n` +
                                   `📝 *Deskripsi:* ${description}\n` +
                                   `🔗 *URL:* ${response.data.html_url}\n` +
                                   `👤 *Owner:* ${response.data.owner.login}\n` +
                                   `📅 *Dibuat:* ${new Date(response.data.created_at).toLocaleString('id-ID')}`;

                await ctx.replyWithMarkdown(successMsg);

            } catch (e) {
                logger.error(`Gagal membuat repo GitHub: ${e.message}`);
                if (e.status === 422) {
                    await ctx.reply(`❌ Gagal! Repository dengan nama "${repoName}" sudah ada di akun Anda.`);
                } else {
                    await ctx.reply(`❌ Terjadi kesalahan saat membuat repository: ${e.message}`);
                }
            }
        });
    }
};
