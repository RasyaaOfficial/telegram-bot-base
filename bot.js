const { Telegraf, session } = require("telegraf");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const logger = require("./utils/logger");
const bot = new Telegraf(config.botToken);

bot.use(session());

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

const commands = [];
const loadedCommandNames = new Set();

const loadCommands = (dir, category = 'main') => {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            // Gunakan nama folder sebagai kategori
            loadCommands(fullPath, file.name);
        } else if (file.isFile() && file.name.endsWith(".js")) {
            const commandModule = require(fullPath);
            if (typeof commandModule.register === "function") {
                commandModule.register(bot); 
                logger.info(`Module registered: ${file.name} (Category: ${category})`);
                
                if (commandModule.name && !loadedCommandNames.has(commandModule.name)) {
                    commands.push({ 
                        command: commandModule.name, 
                        description: commandModule.description || "",
                        category: category
                    });
                    loadedCommandNames.add(commandModule.name);
                }
            } else if (commandModule.name && commandModule.execute) {
                if (!loadedCommandNames.has(commandModule.name)) {
                    commands.push({ 
                        command: commandModule.name, 
                        description: commandModule.description || "",
                        category: category
                    });
                    loadedCommandNames.add(commandModule.name);
                }
                logger.info(`Legacy command loaded: ${commandModule.name} (Category: ${category})`);
                if (commandModule.middleware && Array.isArray(commandModule.middleware)) {
                    bot.command(commandModule.name, ...commandModule.middleware, commandModule.execute);
                } else {
                    bot.command(commandModule.name, commandModule.execute);
                }
            }
        }
    }
};
bot.use(async (ctx, next) => {
    if (ctx.message && ctx.message.text && ctx.message.text.startsWith("/")) {
        const commandName = ctx.message.text.split(" ")[0];
        const args = ctx.message.text.split(" ").slice(1);
        const user = ctx.from;
        const chat = ctx.chat;
        
        // Format user info
        const userName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
        const userHandle = user.username ? `@${user.username}` : `ID:${user.id}`;
        
        // Format chat info
        let chatInfo = "";
        let chatType = "";
        switch (chat.type) {
            case "private":
                chatInfo = "Private Message";
                chatType = "🔒 Private";
                break;
            case "group":
                chatInfo = `Group: ${chat.title || 'Unknown Group'}`;
                chatType = `👥 Group`;
                break;
            case "supergroup":
                chatInfo = `Supergroup: ${chat.title || 'Unknown Supergroup'}`;
                chatType = `👥 Supergroup`;
                break;
            case "channel":
                chatInfo = `Channel: ${chat.title || 'Unknown Channel'}`;
                chatType = `📢 Channel`;
                break;
        }
        
        // Create detailed log message
        const timestamp = new Date().toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const logMessage = [
            `┌─ 📋 COMMAND EXECUTED ─────────────────────────────`,
            `│ 🕒 Time: ${timestamp}`,
            `│ ⚡ Command: ${commandName}`,
            `│ 📝 Args: ${args.length > 0 ? args.join(' ') : 'None'}`,
            `├─ 👤 USER INFO ─────────────────────────────────`,
            `│ 📛 Name: ${userName}`,
            `│ 🏷️  Handle: ${userHandle}`,
            `│ 🆔 User ID: ${user.id}`,
            `├─ 💬 CHAT INFO ─────────────────────────────────`,
            `│ 📍 Type: ${chatType}`,
            `│ 📋 Info: ${chatInfo}`,
            `│ 🆔 Chat ID: ${chat.id}`,
            `└─────────────────────────────────────────────────`
        ].join('\n');
        
        logger.info(`\n${logMessage}`);
        
        // Optional: Save to command log file
        const commandLogPath = path.join(__dirname, "logs", "commands.log");
        const commandLogDir = path.dirname(commandLogPath);
        
        if (!fs.existsSync(commandLogDir)) {
            fs.mkdirSync(commandLogDir, { recursive: true });
        }
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            command: commandName,
            args: args,
            user: {
                id: user.id,
                name: userName,
                username: user.username || null
            },
            chat: {
                id: chat.id,
                type: chat.type,
                title: chat.title || null
            }
        };
        
        fs.appendFileSync(commandLogPath, JSON.stringify(logEntry) + '\n');
    }
    await next();
});

loadCommands(path.join(__dirname, "commands"));
bot.telegram.setMyCommands(commands.map(cmd => ({ command: cmd.command, description: cmd.description })));


// Error handling
bot.catch(async (err, ctx) => {
    logger.error(`Error for ${ctx.updateType}: ${err}`);

    const errorMessage = `Terjadi error pada bot!\n` +
                         `Update Type: ${ctx.updateType}\n` +
                         `Pesan: ${err.message}\n` +
                         `Stack: <pre>${err.stack}</pre>`;

    if (config.ownerId) {
        try {
            await bot.telegram.sendMessage(config.ownerId, errorMessage, { parse_mode: "HTML" });
            logger.info(`Error notification sent to owner ${config.ownerId}`);
        } catch (ownerError) {
            logger.error(`Gagal mengirim notifikasi error ke owner: ${ownerError.message}`);
        }
    }

    if (ctx.chat && ctx.chat.type !== "private") {
        await ctx.reply("Maaf, terjadi kesalahan. Owner bot telah diberitahu.");
    }
});

// Start bot
bot.launch();
logger.info("Bot started!");

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

