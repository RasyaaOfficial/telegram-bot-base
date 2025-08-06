const { exec } = require("child_process");
const ownerOnly = require("../middlewares/ownerOnly");
const logger = require("../utils/logger");

module.exports = {
    name: "shell",
    description: "Akses shell via bot",
    register: (bot) => {
        const shellSessions = new Map(); // userId -> { active: boolean, process: ChildProcess }

        bot.command("shell", ownerOnly, async (ctx) => {
            const userId = ctx.from.id;
            if (shellSessions.has(userId) && shellSessions.get(userId).active) {
                return ctx.reply("Anda sudah memiliki sesi shell aktif. Ketik `exit` untuk mengakhiri.");
            }

            shellSessions.set(userId, { active: true });
            await ctx.reply("Sesi shell dimulai. Ketik `exit` untuk mengakhiri sesi.");
        });

        bot.on("text", ownerOnly, async (ctx, next) => {
            const userId = ctx.from.id;
            const messageText = ctx.message.text.trim();

            if (shellSessions.has(userId) && shellSessions.get(userId).active) {
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

