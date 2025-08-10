// commands/owner/viewlogs.js
const fs = require("fs");
const path = require("path");
const ownerOnly = require("../../middlewares/ownerOnly");

module.exports = {
    name: "viewlogs",
    description: "Melihat log command bot",
    register: (bot) => {
        bot.command("viewlogs", ownerOnly, async (ctx) => {
            const args = ctx.message.text.split(" ");
            const limit = parseInt(args[1]) || 10;
            
            const commandLogPath = path.join(__dirname, "..", "..", "logs", "commands.log");
            
            if (!fs.existsSync(commandLogPath)) {
                return ctx.reply("📋 Log command masih kosong.");
            }
            
            try {
                const logContent = fs.readFileSync(commandLogPath, "utf8");
                const logLines = logContent.trim().split('\n');
                const recentLogs = logLines.slice(-limit);
                
                if (recentLogs.length === 0) {
                    return ctx.reply("📋 Log command masih kosong.");
                }
                
                let message = `📋 **${recentLogs.length} Command Log Terbaru**\n\n`;
                
                recentLogs.reverse().forEach((line, index) => {
                    try {
                        const log = JSON.parse(line);
                        const time = new Date(log.timestamp).toLocaleString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        
                        const chatType = log.chat.type === 'private' ? '🔒' : 
                                       log.chat.type === 'group' ? '👥' : 
                                       log.chat.type === 'supergroup' ? '👥' : '📢';
                        
                        const chatName = log.chat.title || 'Private';
                        const userName = log.user.username ? `@${log.user.username}` : log.user.name;
                        
                        message += `**${index + 1}.** \`${log.command}\`\n`;
                        message += `   🕒 ${time} | ${chatType} ${chatName}\n`;
                        message += `   👤 ${userName}\n`;
                        if (log.args && log.args.length > 0) {
                            message += `   📝 Args: ${log.args.join(' ')}\n`;
                        }
                        message += `\n`;
                    } catch (e) {
                        // Skip invalid JSON lines
                    }
                });
                
                await ctx.reply(message, { parse_mode: "Markdown" });
                
            } catch (error) {
                await ctx.reply(`❌ Error reading logs: ${error.message}`);
            }
        });
        
        bot.command("clearlog", ownerOnly, async (ctx) => {
            const commandLogPath = path.join(__dirname, "..", "..", "logs", "commands.log");
            
            if (fs.existsSync(commandLogPath)) {
                fs.writeFileSync(commandLogPath, "");
                await ctx.reply("🗑️ Log command berhasil dibersihkan.");
            } else {
                await ctx.reply("📋 Log command sudah kosong.");
            }
        });
        
        bot.command("logstats", ownerOnly, async (ctx) => {
            const commandLogPath = path.join(__dirname, "..", "..", "logs", "commands.log");
            
            if (!fs.existsSync(commandLogPath)) {
                return ctx.reply("📋 Log command masih kosong.");
            }
            
            try {
                const logContent = fs.readFileSync(commandLogPath, "utf8");
                const logLines = logContent.trim().split('\n');
                
                const stats = {};
                const userStats = {};
                const chatStats = {};
                
                logLines.forEach(line => {
                    try {
                        const log = JSON.parse(line);
                        
                        // Command stats
                        stats[log.command] = (stats[log.command] || 0) + 1;
                        
                        // User stats
                        const userKey = log.user.username || log.user.name;
                        userStats[userKey] = (userStats[userKey] || 0) + 1;
                        
                        // Chat stats
                        const chatKey = log.chat.title || `Private (${log.chat.id})`;
                        chatStats[chatKey] = (chatStats[chatKey] || 0) + 1;
                    } catch (e) {
                        // Skip invalid JSON
                    }
                });
                
                let message = `📊 **Statistik Command Bot**\n\n`;
                message += `📋 Total Commands: ${logLines.length}\n\n`;
                
                // Top commands
                const topCommands = Object.entries(stats)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5);
                
                message += `🏆 **Top 5 Commands:**\n`;
                topCommands.forEach(([cmd, count], index) => {
                    message += `${index + 1}. \`${cmd}\` - ${count}x\n`;
                });
                
                message += `\n👤 **Top 5 Users:**\n`;
                const topUsers = Object.entries(userStats)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5);
                
                topUsers.forEach(([user, count], index) => {
                    message += `${index + 1}. ${user} - ${count}x\n`;
                });
                
                await ctx.reply(message, { parse_mode: "Markdown" });
                
            } catch (error) {
                await ctx.reply(`❌ Error processing stats: ${error.message}`);
            }
        });
    },
};