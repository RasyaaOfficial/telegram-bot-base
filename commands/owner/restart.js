const { exec } = require("child_process");
const ownerOnly = require("../../middlewares/ownerOnly");
const logger = require("../../utils/logger");

module.exports = {
    name: "restart",
    description: "Restart bot",
    register: (bot) => {
        bot.command("restart", ownerOnly, async (ctx) => {
            try {
                await ctx.reply("🔄 Bot sedang direstart...");
                logger.info(`Bot restart initiated by ${ctx.from.username || ctx.from.id}`);
                
                // Delay sebentar untuk memastikan pesan terkirim
                setTimeout(() => {
                    process.exit(0); // Exit dengan code 0 (normal exit)
                }, 1000);
                
            } catch (error) {
                await ctx.reply("❌ Gagal melakukan restart.");
                logger.error(`Restart failed: ${error.message}`);
            }
        });
    },
};