const ownerOnly = require("../../middlewares/ownerOnly");
const logger = require("../../utils/logger");

module.exports = {
    name: "eval",
    description: "Eksekusi kode JavaScript",
    register: (bot) => {
        bot.command("eval", ownerOnly, async (ctx) => {
            const code = ctx.message.text.split(" ").slice(1).join(" ");
            if (!code) {
                return ctx.reply("Gunakan: /eval [kode JavaScript]");
            }

            try {
                // Menggunakan (async () => { ... })() untuk mendukung await di dalam eval
                const result = await (async () => {
                    // ctx, bot, dan logger tersedia di scope ini
                    const response = eval(code);
                    if (response instanceof Promise) {
                        return await response;
                    }
                    return response;
                })();

                let output = String(result);
                if (output.length > 4000) {
                    output = output.substring(0, 3990) + "... (output terlalu panjang)";
                }
                await ctx.reply(`Output:\n<pre>${output}</pre>`, { parse_mode: "HTML" });
                logger.info(`Eval by ${ctx.from.username || ctx.from.id}: ${code} -> ${output}`);
            } catch (error) {
                await ctx.reply(`Error:\n<pre>${error.message}</pre>`, { parse_mode: "HTML" });
                logger.error(`Eval error by ${ctx.from.username || ctx.from.id}: ${code} -> ${error.message}`);
            }
        });
    },
};

