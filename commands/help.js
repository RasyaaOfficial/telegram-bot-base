const fs = require("fs");
const path = require("path");
const { Markup } = require("telegraf");

module.exports = {
    name: "help",
    description: "Menampilkan daftar perintah",
    register: (bot) => {
        const helpSessions = new Map(); // userId -> { categories, currentPage, totalPages, botInfo }
        
        const loadAllCommands = () => {
            const rootDir = path.join(__dirname, "..");
            const categories = {};

            const loadCommandDescriptions = (dir, category = 'main') => {
                if (!fs.existsSync(dir)) {
                    return;
                }
                
                const files = fs.readdirSync(dir, { withFileTypes: true });

                for (const file of files) {
                    const fullPath = path.join(dir, file.name);
                    if (file.isDirectory()) {
                        loadCommandDescriptions(fullPath, file.name);
                    } else if (file.isFile() && file.name.endsWith(".js")) {
                        try {
                            delete require.cache[require.resolve(fullPath)];
                            const commandModule = require(fullPath);
                            if (commandModule.name && commandModule.description) {
                                if (!categories[category]) {
                                    categories[category] = [];
                                }
                                
                                categories[category].push({
                                    name: commandModule.name,
                                    description: commandModule.description
                                });
                            }
                        } catch (error) {
                            console.log(`Error loading command ${file.name}:`, error.message);
                        }
                    }
                }
            };

            loadCommandDescriptions(path.join(rootDir, "commands"));
            return categories;
        };

        const getBotInfo = () => {
            const rootDir = path.join(__dirname, "..");
            const botInfoPath = path.join(rootDir, 'data', 'botinfo.json');
            let botInfo = { botName: 'My Telegram Bot', ownerName: 'Bot Owner', thumbnail: null };

            if (fs.existsSync(botInfoPath)) {
                botInfo = JSON.parse(fs.readFileSync(botInfoPath, 'utf8'));
            }
            return botInfo;
        };

        const generateHelpPage = (categories, page = 0, botInfo) => {
            const categoryEmojis = {
                main: "🔹",
                owner: "👑",
                tools: "🛠️",
                admin: "🛡️",
                premium: "💎",
                group: "👥",
                game: "🎮",
                utility: "⚙️",
                helper: "📁"
            };

            const sortedCategories = Object.keys(categories).sort((a, b) => {
                if (a === 'main') return -1;
                if (b === 'main') return 1;
                return a.localeCompare(b);
            });

            const COMMANDS_PER_PAGE = 15;
            let currentCommandCount = 0;
            let startPage = page * COMMANDS_PER_PAGE;
            let endPage = (page + 1) * COMMANDS_PER_PAGE;
            
            let message = `📋 **Daftar Perintah ${botInfo.botName}** (Hal ${page + 1})\n\n`;
            
            let commandsShown = 0;
            let totalCommands = Object.values(categories).flat().length;
            let totalPages = Math.ceil(totalCommands / COMMANDS_PER_PAGE);

            for (const category of sortedCategories) {
                const emoji = categoryEmojis[category] || "📁";
                const categoryName = category === 'main' ? 'Perintah Umum' : 
                                   category.charAt(0).toUpperCase() + category.slice(1);
                
                categories[category].sort((a, b) => a.name.localeCompare(b.name));
                
                let categoryCommands = [];
                for (const cmd of categories[category]) {
                    if (currentCommandCount >= startPage && currentCommandCount < endPage) {
                        categoryCommands.push(cmd);
                        commandsShown++;
                    }
                    currentCommandCount++;
                    
                    if (commandsShown >= COMMANDS_PER_PAGE) break;
                }
                
                if (categoryCommands.length > 0) {
                    message += `${emoji} **${categoryName}:**\n`;
                    categoryCommands.forEach((cmd) => {
                        message += `  /${cmd.name} - ${cmd.description}\n`;
                    });
                    message += "\n";
                }
                
                if (commandsShown >= COMMANDS_PER_PAGE) break;
            }

            message += `\n🔸 Menampilkan ${commandsShown} dari ${totalCommands} perintah`;
            
            return { message, totalPages, currentPage: page };
        };

        const createHelpButtons = (currentPage, totalPages, userId) => {
            const buttons = [];
            if (totalPages > 1) {
                const navigationRow = [];
                
                if (currentPage > 0) {
                    navigationRow.push(Markup.button.callback("⬅️ Sebelumnya", `help_prev_${currentPage - 1}_${userId}`));
                }
                navigationRow.push(Markup.button.callback(`📄 ${currentPage + 1}/${totalPages}`, `help_info_${userId}`));              
                if (currentPage < totalPages - 1) {
                    navigationRow.push(Markup.button.callback("Selanjutnya ➡️", `help_next_${currentPage + 1}_${userId}`));
                }
                
                buttons.push(navigationRow);
                
                if (totalPages > 3) {
                    const jumpButtons = [];
                    if (currentPage > 1) {
                        jumpButtons.push(Markup.button.callback("1️⃣", `help_page_0_${userId}`));
                    }
                    if (currentPage > 2) {
                        jumpButtons.push(Markup.button.callback("...", `help_info_${userId}`));
                    }
                    if (currentPage < totalPages - 2) {
                        jumpButtons.push(Markup.button.callback("...", `help_info_${userId}`));
                    }
                    if (currentPage < totalPages - 1) {
                        jumpButtons.push(Markup.button.callback(`${totalPages}️⃣`, `help_page_${totalPages - 1}_${userId}`));
                    }
                    
                    if (jumpButtons.length > 0) {
                        buttons.push(jumpButtons);
                    }
                }
            }
            
            buttons.push([Markup.button.callback("🗑️ Hapus Pesan", `help_delete_${userId}`)]);
            
            return buttons;
        };

        bot.command("help", async (ctx) => {
            try {
                const categories = loadAllCommands();
                const botInfo = getBotInfo();
                const userId = ctx.from.id;
                
                if (Object.keys(categories).length === 0) {
                    return ctx.reply("❌ Tidak ada command yang ditemukan.");
                }
                
                const { message, totalPages, currentPage } = generateHelpPage(categories, 0, botInfo);
                
                helpSessions.set(userId, {
                    categories,
                    botInfo,
                    lastMessageId: null
                });
                
                const buttons = createHelpButtons(currentPage, totalPages, userId);
                
                if (botInfo.thumbnail && totalPages === 1) {
                    await ctx.replyWithPhoto(botInfo.thumbnail, {
                        caption: message,
                        parse_mode: "Markdown",
                        ...Markup.inlineKeyboard(buttons)
                    });
                } else {
                    const sentMessage = await ctx.reply(message, {
                        parse_mode: "Markdown",
                        ...Markup.inlineKeyboard(buttons)
                    });
                    
                    const session = helpSessions.get(userId);
                    if (session) {
                        session.lastMessageId = sentMessage.message_id;
                    }
                }
            } catch (error) {
                console.error("Help command error:", error);
                await ctx.reply("❌ Terjadi kesalahan saat memuat help. Silakan coba lagi.");
            }
        });

        bot.action(/^help_(prev|next|page)_(\d+)_(\d+)$/, async (ctx) => {
            const action = ctx.match[1];
            const pageNum = parseInt(ctx.match[2]);
            const userId = parseInt(ctx.match[3]);
            
            if (ctx.from.id !== userId) {
                return ctx.answerCbQuery("❌ Ini bukan session Anda!", { show_alert: true });
            }
            
            const session = helpSessions.get(userId);
            if (!session) {
                return ctx.answerCbQuery("❌ Session expired. Gunakan /help lagi.", { show_alert: true });
            }
            
            try {
                const { message, totalPages, currentPage } = generateHelpPage(session.categories, pageNum, session.botInfo);
                const buttons = createHelpButtons(currentPage, totalPages, userId);
                
                await ctx.editMessageText(message, {
                    parse_mode: "Markdown",
                    ...Markup.inlineKeyboard(buttons)
                });
                
                await ctx.answerCbQuery(`📄 Halaman ${currentPage + 1}`);
            } catch (error) {
                console.error("Help navigation error:", error);
                await ctx.answerCbQuery("❌ Terjadi kesalahan.", { show_alert: true });
            }
        });

        bot.action(/^help_info_(\d+)$/, async (ctx) => {
            const userId = parseInt(ctx.match[1]);
            
            if (ctx.from.id !== userId) {
                return ctx.answerCbQuery("❌ Ini bukan session Anda!", { show_alert: true });
            }
            
            const session = helpSessions.get(userId);
            if (session) {
                const totalCommands = Object.values(session.categories).flat().length;
                await ctx.answerCbQuery(
                    `ℹ️ Total: ${totalCommands} commands\n🗑️ Klik "Hapus Pesan" untuk menghapus help ini`,
                    { show_alert: true }
                );
            } else {
                await ctx.answerCbQuery("❌ Session expired.", { show_alert: true });
            }
        });

        bot.action(/^help_delete_(\d+)$/, async (ctx) => {
            const userId = parseInt(ctx.match[1]);
            
            if (ctx.from.id !== userId) {
                return ctx.answerCbQuery("❌ Ini bukan session Anda!", { show_alert: true });
            }
            
            try {
                await ctx.deleteMessage();
                
                helpSessions.delete(userId);
                
                await ctx.answerCbQuery("🗑️ Pesan help dihapus");
            } catch (error) {
                try {
                    await ctx.editMessageText("🗑️ **Pesan Dihapus**\n\n_Help menu ditutup_", { 
                        parse_mode: "Markdown" 
                    });
                    helpSessions.delete(userId);
                    await ctx.answerCbQuery("🗑️ Help ditutup");
                } catch (editError) {
                    helpSessions.delete(userId);
                    await ctx.answerCbQuery("🗑️ Help ditutup", { show_alert: true });
                }
            }
        });

        setInterval(() => {
            helpSessions.clear();
        }, 60 * 60 * 1000);
    },
};