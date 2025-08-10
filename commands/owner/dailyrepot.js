// commands/owner/dailyreport.js
const fs = require("fs");
const path = require("path");
const ownerOnly = require("../../middlewares/ownerOnly");

module.exports = {
    name: "dailyreport",
    description: "Laporan harian penggunaan bot",
    register: (bot) => {
        bot.command("dailyreport", ownerOnly, async (ctx) => {
            const commandLogPath = path.join(__dirname, "..", "..", "logs", "commands.log");
            
            if (!fs.existsSync(commandLogPath)) {
                return ctx.reply("📋 Log command masih kosong.");
            }
            
            try {
                const logContent = fs.readFileSync(commandLogPath, "utf8");
                const logLines = logContent.trim().split('\n');
                
                const today = new Date().toDateString();
                const todayLogs = logLines.filter(line => {
                    try {
                        const log = JSON.parse(line);
                        return new Date(log.timestamp).toDateString() === today;
                    } catch (e) {
                        return false;
                    }
                });
                
                if (todayLogs.length === 0) {
                    return ctx.reply("📋 Tidak ada aktivitas hari ini.");
                }
                
                const commandStats = {};
                const userStats = {};
                const hourlyStats = {};
                
                todayLogs.forEach(line => {
                    const log = JSON.parse(line);
                    const hour = new Date(log.timestamp).getHours();
                    
                    commandStats[log.command] = (commandStats[log.command] || 0) + 1;
                    userStats[log.user.name] = (userStats[log.user.name] || 0) + 1;
                    hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
                });
                
                let message = `📊 **LAPORAN HARIAN BOT**\n`;
                message += `📅 ${new Date().toLocaleDateString('id-ID')}\n\n`;
                message += `📋 **Total Commands:** ${todayLogs.length}\n`;
                message += `👥 **Total Users:** ${Object.keys(userStats).length}\n\n`;
                
                // Top commands today
                const topCommands = Object.entries(commandStats)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5);
                
                message += `🏆 **Top Commands Hari Ini:**\n`;
                topCommands.forEach(([cmd, count]) => {
                    message += `• \`${cmd}\` - ${count}x\n`;
                });
                
                // Peak hours
                const peakHour = Object.entries(hourlyStats)
                    .sort(([,a], [,b]) => b - a)[0];
                
                message += `\n⏰ **Peak Hour:** ${peakHour[0]}:00 (${peakHour[1]} commands)\n`;
                
                // Most active user
                const topUser = Object.entries(userStats)
                    .sort(([,a], [,b]) => b - a)[0];
                
                message += `👑 **Most Active User:** ${topUser[0]} (${topUser[1]} commands)`;
                
                await ctx.reply(message, { parse_mode: "Markdown" });
                
            } catch (error) {
                await ctx.reply(`❌ Error generating report: ${error.message}`);
            }
        });
    },
};