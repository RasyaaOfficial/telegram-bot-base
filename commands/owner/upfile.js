const fs = require('fs');
const path = require('path');
const { Octokit } = require("@octokit/rest");
const AdmZip = require("adm-zip");
const axios = require('axios');
const ownerOnly = require("../../middlewares/ownerOnly");
const config = require("../../config");
const logger = require("../../utils/logger");

/**
 * Fungsi helper untuk mengunggah atau memperbarui file di GitHub.
 * (Fungsi ini tidak berubah)
 */
async function uploadToGitHub(octokit, repoName, filePath, fileContent) {
    try {
        const content = fileContent.toString('base64');
        const owner = (await octokit.users.getAuthenticated()).data.login;
        
        let sha = null;
        try {
            const { data } = await octokit.repos.getContent({ owner, repo: repoName, path: filePath });
            sha = data.sha;
        } catch (error) {
            if (error.status !== 404) throw error;
        }

        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo: repoName,
            path: filePath,
            message: `feat: upload ${path.basename(filePath)}`,
            content: content,
            sha: sha
        });
    } catch (error) {
        logger.error(`Gagal mengunggah ${filePath} ke ${repoName}: ${error.message}`);
        throw new Error(`Gagal mengunggah ${filePath}: ${error.message}`);
    }
}

/**
 * [BARU] Logika cerdas untuk mendeteksi root folder tunggal di dalam ZIP.
 * @param {import("adm-zip").IZipEntry[]} zipEntries - Array entri dari file ZIP.
 * @returns {string} Nama root folder (misal: "SimpleAi/") atau string kosong jika tidak ada.
 */
function findSingleRootFolder(zipEntries) {
    if (zipEntries.length === 0) return '';
    
    // Ambil path bagian pertama dari entri pertama
    const firstEntryPathParts = zipEntries[0].entryName.split('/').filter(p => p);
    if (firstEntryPathParts.length === 0) return '';
    
    const potentialRoot = firstEntryPathParts[0] + '/';

    // Cek apakah SEMUA entri lain juga dimulai dengan path yang sama
    for (const entry of zipEntries) {
        if (!entry.entryName.startsWith(potentialRoot)) {
            // Jika ada satu saja yang tidak, berarti tidak ada root folder tunggal
            return '';
        }
    }
    
    // Jika semua konsisten, kembalikan nama root folder
    return potentialRoot;
}


module.exports = {
    name: "upfile",
    description: "Upload dan ekstrak file ZIP ke repository GitHub.",
    category: "owner",
    
    register: (bot) => {
        bot.command("upfile", ownerOnly, async (ctx) => {
            if (!config.githubToken || config.githubToken === 'YOUR_GITHUB_PAT_HERE') {
                return ctx.reply("❌ Token GitHub belum diatur di file config.js.");
            }

            const args = ctx.message.text.split(" ").slice(1);
            if (args.length !== 1) {
                return ctx.replyWithMarkdown("❌ Format salah!\n\n*Gunakan:* /upfile <nama-repo>\n*(Reply ke file ZIP)*");
            }
            if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.document) {
                return ctx.reply("❌ Perintah ini harus digunakan dengan me-reply sebuah file ZIP.");
            }

            const doc = ctx.message.reply_to_message.document;
            if (doc.mime_type !== 'application/zip' && doc.mime_type !== 'application/x-zip-compressed') {
                return ctx.reply(`❌ File yang di-reply harus berformat ZIP, bukan "${doc.mime_type}".`);
            }
            
            const repoName = args[0].trim();
            const thinkingMessage = await ctx.reply("⏳ Memproses file ZIP...");
            const octokit = new Octokit({ auth: config.githubToken });
            const owner = (await octokit.users.getAuthenticated()).data.login;

            let tempFilePath;
            try {
                // 1. Download file
                await ctx.telegram.editMessageText(ctx.chat.id, thinkingMessage.message_id, undefined, "⏳ Mengunduh file...");
                const fileLink = await ctx.telegram.getFileLink(doc.file_id);
                const response = await axios({ url: fileLink.href, responseType: 'arraybuffer' });
                const fileBuffer = Buffer.from(response.data);

                const tempDir = path.join(__dirname, '..', '..', 'tmp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
                tempFilePath = path.join(tempDir, doc.file_name);
                fs.writeFileSync(tempFilePath, fileBuffer);

                // 2. Proses file ZIP dengan logika baru
                await ctx.telegram.editMessageText(ctx.chat.id, thinkingMessage.message_id, undefined, `⏳ Mengekstrak dan mengunggah file ke *${repoName}*...`, { parse_mode: 'Markdown' });
                const zip = new AdmZip(tempFilePath);
                const zipEntries = zip.getEntries();
                
                // [PERBAIKAN UTAMA DI SINI]
                const rootFolder = findSingleRootFolder(zipEntries);
                let uploadedCount = 0;
                
                for (const entry of zipEntries) {
                    if (entry.isDirectory) continue;

                    // Hilangkan root folder HANYA JIKA terdeteksi sebagai root tunggal
                    const targetPath = entry.entryName.substring(rootFolder.length);
                    
                    if (!targetPath) continue; // Skip file kosong atau aneh di root

                    await uploadToGitHub(octokit, repoName, targetPath, entry.getData());
                    uploadedCount++;
                }

                // 3. Upload file ZIP asli sebagai backup
                await uploadToGitHub(octokit, repoName, doc.file_name, fileBuffer);

                const successMsg = `✅ *Proses Selesai!*\n\n` +
                                 `📦 *${uploadedCount}* file berhasil diekstrak dan diunggah.\n` +
                                 `🗄️ File ZIP asli (*${doc.file_name}*) juga diunggah sebagai backup.\n\n` +
                                 `🔗 *Lihat Repository:* https://github.com/${owner}/${repoName}`;

                await ctx.telegram.editMessageText(ctx.chat.id, thinkingMessage.message_id, undefined, successMsg, { parse_mode: 'Markdown', disable_web_page_preview: true });

            } catch (e) {
                logger.error(`Gagal dalam proses upfile: ${e}`);
                await ctx.telegram.editMessageText(ctx.chat.id, thinkingMessage.message_id, undefined, `❌ Terjadi kesalahan: ${e.message}`);
            } finally {
                // 4. Hapus file sementara
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            }
        });
    }
};