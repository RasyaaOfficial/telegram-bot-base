const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const ownerOnly = require("../../middlewares/ownerOnly");

module.exports = {
  name: "backup",
  description: "Backup file penting bot dalam format ZIP",
  register: (bot) => {
    bot.command("backup", ownerOnly, async (ctx) => {
      const backupName = `backup_${Date.now()}.zip`;
      const outputPath = path.join(__dirname, "..", "..", backupName);
      const output = fs.createWriteStream(outputPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);

      // List isi yang akan di-backup
      const backupItems = [
        "README.md",
        "bot.js",
        "config.js",
        "package.json",
        "commands",
        "middlewares",
        "data",
        "utils"
      ];

      for (const item of backupItems) {
        const fullPath = path.join(__dirname, "..", "..", item);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            archive.directory(fullPath, item);
          } else {
            archive.file(fullPath, { name: item });
          }
        }
      }

      await archive.finalize();

      output.on("close", async () => {
        await ctx.replyWithDocument({ source: outputPath, filename: backupName });
        fs.unlinkSync(outputPath); // Hapus setelah dikirim
      });

      output.on("error", (err) => {
        console.error("Backup error:", err.message);
        ctx.reply("❌ Gagal membuat backup.");
      });
    });
  },
};
