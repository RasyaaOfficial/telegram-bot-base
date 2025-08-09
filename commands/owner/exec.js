const { exec } = require("child_process");
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const logger = require("../../utils/logger");

module.exports = {
    name: "shell",
    description: "Akses shell via bot",
    register: (bot) => {
        const ownerOnly = require("../../middlewares/ownerOnly");
        const shellSessions = new Map(); // userId -> { active: boolean, process: ChildProcess }

        bot.command("shell", ownerOnly, async (ctx) => {
            const userId = ctx.from.id;
            if (shellSessions.has(userId) && shellSessions.get(userId).active) {
                return ctx.reply("Anda sudah memiliki sesi shell aktif. Ketik `exit` untuk mengakhiri.");
            }

            shellSessions.set(userId, { active: true });
            await ctx.reply("Sesi shell dimulai. Ketik `exit` untuk mengakhiri sesi.");
        });

        // PERBAIKAN: Hapus ownerOnly dari bot.on("text") dan cek manual di dalam handler
        bot.on("text", async (ctx, next) => {
            const userId = ctx.from.id;
            const messageText = ctx.message.text.trim();

            // Cek apakah user memiliki sesi shell aktif
            if (shellSessions.has(userId) && shellSessions.get(userId).active) {
                // MANUAL OWNER CHECK - hanya untuk sesi shell
                const ownersPath = path.join(__dirname, '../data/owners.json');
                let owners = [];
                if (fs.existsSync(ownersPath)) {
                    owners = JSON.parse(fs.readFileSync(ownersPath, 'utf8'));
                }
                
                // Jika bukan owner, batalkan sesi dan lanjutkan ke handler lain
                if (userId != config.ownerId && !owners.includes(userId)) {
                    shellSessions.delete(userId);
                    await next();
                    return;
                }

                if (messageText.toLowerCase() === "exit") {
                    shellSessions.delete(userId);
                    await ctx.reply("Sesi shell diakhiri.");
                    logger.info(`Shell session for user ${userId} ended.`);
                    return;
                }

                try {
                    exec(messageText, async (error, stdout, stderr) => {
                        if (error) {
                            await ctx.reply(`Error:\n${error.message}`);
                            logger.error(`Shell command error for user ${userId}: ${error.message}`);
                            return;
                        }
                        if (stderr) {
                            await ctx.reply(`Stderr:\n${stderr}`);
                            logger.warn(`Shell command stderr for user ${userId}: ${stderr}`);
                            return;
                        }
                        const output = stdout.trim();
                        if (output) {
                            await ctx.reply(`Output:\n${output}`);
                        } else {
                            await ctx.reply("Command executed, no output.");
                        }
                        logger.info(`Shell command by user ${userId}: ${messageText}`);
                    });
                } catch (e) {
                    await ctx.reply(`Gagal menjalankan command: ${e.message}`);
                    logger.error(`Failed to execute shell command for user ${userId}: ${e.message}`);
                }
            } else {
                await next(); // Lanjutkan ke handler lain jika bukan bagian dari sesi shell
            }
        });
    },
};