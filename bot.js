const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const logger = require("./utils/logger");
const tebakCommand = require("./commands/tebak"); // Import tebak command untuk mengakses gameSession

// Inisialisasi bot
const bot = new Telegraf(config.botToken);

// Inisialisasi file data jika belum ada
const dataFiles = [
    "warns.json",
    "owners.json",
    "premiums.json",
    "botinfo.json",
];

dataFiles.forEach((file) => {
    const filePath = path.join(__dirname, "data", file);
    if (!fs.existsSync(filePath)) {
        let defaultContent = "{}";
        if (file === "owners.json" || file === "premiums.json") {
            defaultContent = "[]";
        } else if (file === "botinfo.json") {
            defaultContent = JSON.stringify({ botName: "My Telegram Bot", ownerName: "Bot Owner", thumbnail: null }, null, 2);
        }
        fs.writeFileSync(filePath, defaultContent);
        logger.info(`File data ${file} berhasil diinisialisasi.`);
    }
});

// Auto load command
const commands = [];
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(fullPath);
        } else if (file.isFile() && file.name.endsWith(".js")) {
            const command = require(fullPath);
            if (command.name && command.execute) {
                commands.push(command);
                logger.info(`Command loaded: ${command.name}`);

                // Register command with Telegraf
                if (command.middleware && Array.isArray(command.middleware)) {
                    bot.command(command.name, ...command.middleware, command.execute);
                } else {
                    bot.command(command.name, command.execute);
                }
            }
        }
    }
};

loadCommands(path.join(__dirname, "commands"));

// Logging setiap command yang dijalankan
bot.use(async (ctx, next) => {
    if (ctx.message && ctx.message.text && ctx.message.text.startsWith("/")) {
        const commandName = ctx.message.text.split(" ")[0];
        const user = ctx.from;
        const chatType = ctx.chat.type;
        const chatName = ctx.chat.title || ctx.chat.username || chatType;
        logger.info(`Command: ${commandName} | User: ${user.first_name} (${user.id}) | Chat: ${chatName} (${chatType})`);
    }
    await next();
});

// Handle tebakan angka untuk game /tebak
bot.on("text", async (ctx, next) => {
    const userId = ctx.from.id;
    const messageText = ctx.message.text.trim();

    // Cek apakah user sedang dalam sesi game tebak angka dan pesan adalah angka
    if (tebakCommand.gameSession.has(userId) && !isNaN(parseInt(messageText)) && !messageText.startsWith("/")) {
        // Panggil fungsi execute dari command tebak dengan argumen yang sesuai
        // Kita perlu membuat ctx.message.text seolah-olah itu adalah command /tebak [angka]
        ctx.message.text = `/tebak ${messageText}`;
        await tebakCommand.execute(ctx);
    } else {
        await next(); // Lanjutkan ke middleware atau handler lain jika bukan tebakan angka
    }
});

// Set bot commands (for /help and Telegram's command list)
bot.telegram.setMyCommands(
    commands.map((cmd) => ({
        command: cmd.name,
        description: cmd.description || "",
    }))
);

// Anti-link feature
bot.on("message", async (ctx, next) => {
    if (ctx.message.text) {
        const messageText = ctx.message.text.toLowerCase();
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        if (urlRegex.test(messageText)) {
            const chatMember = await ctx.getChatMember(ctx.from.id);
            if (!["administrator", "creator"].includes(chatMember.status)) {
                try {
                    await ctx.deleteMessage(ctx.message.message_id);
                    logger.warn(`Link terdeteksi dan dihapus dari ${ctx.chat.title || ctx.chat.type} oleh ${ctx.from.first_name} (${ctx.from.id})`);
                    
                    // Warn system
                    const warnsPath = path.join(__dirname, "data", "warns.json");
                    let warns = {};
                    if (fs.existsSync(warnsPath)) {
                        warns = JSON.parse(fs.readFileSync(warnsPath, "utf8"));
                    }

                    const userId = ctx.from.id.toString();
                    if (!warns[ctx.chat.id]) {
                        warns[ctx.chat.id] = {};
                    }
                    if (!warns[ctx.chat.id][userId]) {
                        warns[ctx.chat.id][userId] = 0;
                    }
                    warns[ctx.chat.id][userId]++;

                    fs.writeFileSync(warnsPath, JSON.stringify(warns, null, 2));

                    if (warns[ctx.chat.id][userId] >= 3) {
                        await ctx.kickChatMember(ctx.from.id);
                        ctx.reply(`${ctx.from.first_name} telah di-kick karena mencapai 3 warn.`);
                        delete warns[ctx.chat.id][userId]; // Reset warn after kick
                        fs.writeFileSync(warnsPath, JSON.stringify(warns, null, 2));
                    } else {
                        ctx.reply(`${ctx.from.first_name}, link tidak diizinkan! Warn ke-${warns[ctx.chat.id][userId]} (maks 3).`);
                    }
                } catch (error) {
                    logger.error(`Gagal menghapus pesan atau mengelola warn: ${error.message}`);
                }
            }
        }
    }
    next();
});

// Error handling
bot.catch((err, ctx) => {
    logger.error(`Error for ${ctx.updateType}: ${err}`);
});

// Start bot
bot.launch();
logger.info("Bot started!");

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));


