const fs = require("fs");
const path = require("path");
const { Markup } = require("telegraf");
const ownerOnly = require("../../middlewares/ownerOnly");

const session = new Map(); // userId -> { state, filename, category }

module.exports = {
  name: "cmd",
  description: "Manajemen file command",
  register: (bot) => {
    const commandsDir = path.join(__dirname, "..", "..",);

    const getAllCommandFiles = (dir = path.join(commandsDir, "commands"), category = 'main') => {
      let files = [];
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          files = files.concat(getAllCommandFiles(fullPath, item.name));
        } else if (item.name.endsWith(".js")) {
          files.push({
            name: item.name,
            path: fullPath,
            category: category,
            relativePath: path.relative(path.join(commandsDir, "commands"), fullPath)
          });
        }
      }
      return files;
    };

    const parseCommandMeta = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const nameMatch = content.match(/name:\s*["'](.+?)["']/);
        const descMatch = content.match(/description:\s*["'](.+?)["']/);
        return {
          name: nameMatch ? nameMatch[1] : "(Tidak ditemukan)",
          description: descMatch ? descMatch[1] : "(Tidak ditemukan)",
        };
      } catch {
        return { name: "(Error parsing)", description: "(Error parsing)" };
      }
    };

    bot.command("cmd", ownerOnly, async (ctx) => {
      const allFiles = getAllCommandFiles();
      const categories = {};

      // Kelompokkan berdasarkan kategori
      allFiles.forEach(file => {
        if (!categories[file.category]) {
          categories[file.category] = [];
        }
        categories[file.category].push(file);
      });

      let buttons = [];

      // Buat tombol untuk setiap kategori
      const categoryKeys = Object.keys(categories).sort((a, b) => {
        if (a === 'main') return -1;
        if (b === 'main') return 1;
        return a.localeCompare(b);
      });

      for (const category of categoryKeys) {
        const categoryName = category === 'main' ? '📋 Main' : 
                           `📁 ${category.charAt(0).toUpperCase() + category.slice(1)}`;
        buttons.push([Markup.button.callback(`${categoryName} (${categories[category].length})`, `cmd_category_${category}`)]);
      }

      // tombol tambah di paling bawah
      buttons.push([Markup.button.callback("➕ Tambah Fitur Baru", "cmd_add")]);

      await ctx.reply("📂 Pilih kategori command yang ingin dikelola:", Markup.inlineKeyboard(buttons));
    });

    // Handle kategori selection
    bot.action(/^cmd_category_(.+)$/, ownerOnly, async (ctx) => {
      const category = ctx.match[1];
      const allFiles = getAllCommandFiles();
      const categoryFiles = allFiles.filter(f => f.category === category);
      
      const buttons = [];
      for (let i = 0; i < categoryFiles.length; i += 2) {
        const row = categoryFiles.slice(i, i + 2).map((file) =>
          Markup.button.callback(file.name.replace('.js', ''), `cmd_select_${file.relativePath}`)
        );
        buttons.push(row);
      }
      
      buttons.push([Markup.button.callback("⬅️ Kembali", "cmd_back")]);

      const categoryName = category === 'main' ? 'Main' : 
                         category.charAt(0).toUpperCase() + category.slice(1);

      await ctx.editMessageText(
        `📁 Commands in ${categoryName} category:`, 
        Markup.inlineKeyboard(buttons)
      );
    });

    // Handle back to main menu
    bot.action("cmd_back", ownerOnly, async (ctx) => {
      const allFiles = getAllCommandFiles();
      const categories = {};

      allFiles.forEach(file => {
        if (!categories[file.category]) {
          categories[file.category] = [];
        }
        categories[file.category].push(file);
      });

      let buttons = [];
      const categoryKeys = Object.keys(categories).sort((a, b) => {
        if (a === 'main') return -1;
        if (b === 'main') return 1;
        return a.localeCompare(b);
      });

      for (const category of categoryKeys) {
        const categoryName = category === 'main' ? '📋 Main' : 
                           `📁 ${category.charAt(0).toUpperCase() + category.slice(1)}`;
        buttons.push([Markup.button.callback(`${categoryName} (${categories[category].length})`, `cmd_category_${category}`)]);
      }

      buttons.push([Markup.button.callback("➕ Tambah Fitur Baru", "cmd_add")]);

      await ctx.editMessageText("📂 Pilih kategori command yang ingin dikelola:", Markup.inlineKeyboard(buttons));
    });

    bot.action(/^cmd_select_(.+)$/, ownerOnly, async (ctx) => {
      const relativePath = ctx.match[1];
      const filePath = path.join(commandsDir, "commands", relativePath);
      const fileName = path.basename(filePath);
      
      if (!fs.existsSync(filePath)) return ctx.reply("❌ File tidak ditemukan.");

      const meta = parseCommandMeta(filePath);
      const category = path.dirname(relativePath) === '.' ? 'main' : path.dirname(relativePath);
      
      await ctx.answerCbQuery();
      await ctx.replyWithDocument({ source: filePath, filename: fileName });
      await ctx.reply(
        `📄 *${fileName}*\n📁 Category: \`${category}\`\n🏷 Fitur: \`${meta.name}\`\n📝 Deskripsi: ${meta.description}`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("✏️ Edit", `cmd_edit_${relativePath}`),
              Markup.button.callback("🗑️ Delete", `cmd_delete_${relativePath}`),
            ],
          ]),
        }
      );
    });

    bot.action("cmd_add", ownerOnly, async (ctx) => {
      // Tampilkan pilihan kategori untuk file baru
      const allFiles = getAllCommandFiles();
      const categories = [...new Set(allFiles.map(f => f.category))];
      
      const buttons = categories.map(cat => {
        const categoryName = cat === 'main' ? '📋 Main' : 
                           `📁 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
        return [Markup.button.callback(categoryName, `cmd_add_to_${cat}`)];
      });
      
      buttons.push([Markup.button.callback("📁 Buat Kategori Baru", "cmd_new_category")]);
      
      await ctx.answerCbQuery();
      await ctx.reply("📁 Pilih kategori untuk file baru:", Markup.inlineKeyboard(buttons));
    });

    bot.action(/^cmd_add_to_(.+)$/, ownerOnly, async (ctx) => {
      const category = ctx.match[1];
      session.set(ctx.from.id, { state: "await_new_file", category: category });
      await ctx.answerCbQuery();
      await ctx.reply(`📥 Kirim file .js baru untuk ditambahkan ke kategori ${category}.`);
    });

    bot.action("cmd_new_category", ownerOnly, async (ctx) => {
      session.set(ctx.from.id, { state: "await_category_name" });
      await ctx.answerCbQuery();
      await ctx.reply("📝 Ketik nama kategori baru:");
    });

    bot.action(/^cmd_edit_(.+)$/, ownerOnly, async (ctx) => {
      const relativePath = ctx.match[1];
      const category = path.dirname(relativePath) === '.' ? 'main' : path.dirname(relativePath);
      session.set(ctx.from.id, { state: "await_upload", filename: relativePath, category: category });
      await ctx.answerCbQuery();
      await ctx.reply(`📤 Kirim file .js baru untuk mengganti \`${path.basename(relativePath)}\`.`);
    });

    // Handle text input untuk nama kategori
    bot.on("text", async (ctx, next) => {
      const state = session.get(ctx.from.id);
      if (state && state.state === "await_category_name") {
        const categoryName = ctx.message.text.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (categoryName.length === 0) {
          return ctx.reply("❌ Nama kategori tidak valid. Gunakan huruf dan angka saja.");
        }
        
        session.set(ctx.from.id, { state: "await_new_file", category: categoryName });
        await ctx.reply(`📁 Kategori "${categoryName}" dibuat. Kirim file .js untuk kategori ini:`);
      } else {
        await next();
      }
    });

    bot.on("document", async (ctx, next) => {
      const state = session.get(ctx.from.id);
      if (!state) return next();

      const doc = ctx.message.document;
      if (!doc.file_name.endsWith(".js")) {
        session.delete(ctx.from.id);
        return ctx.reply("❌ Format file tidak didukung.");
      }

      try {
        const link = await ctx.telegram.getFileLink(doc.file_id);
        const fileBuffer = await fetch(link.href).then(res => res.arrayBuffer());

        let filePath;
        if (state.category === 'main') {
          filePath = path.join(commandsDir, "commands", doc.file_name);
        } else {
          const categoryDir = path.join(commandsDir, "commands", state.category);
          if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
          }
          filePath = path.join(categoryDir, doc.file_name);
        }

        fs.writeFileSync(filePath, Buffer.from(fileBuffer));
        const meta = parseCommandMeta(filePath);

        session.delete(ctx.from.id);
        await ctx.reply(
          `✅ File \`${doc.file_name}\` berhasil disimpan di kategori "${state.category}".\n🏷 Nama fitur: \`${meta.name}\`\n📝 Deskripsi: ${meta.description}\n\nSilahkan restart bot untuk menerapkan.`,
          { parse_mode: "Markdown" }
        );
      } catch (error) {
        session.delete(ctx.from.id);
        await ctx.reply(`❌ Gagal menyimpan file: ${error.message}`);
      }
    });

    bot.action(/^cmd_delete_(.+)$/, ownerOnly, async (ctx) => {
      const relativePath = ctx.match[1];
      const filePath = path.join(commandsDir, "commands", relativePath);
      const fileName = path.basename(filePath);
      
      if (!fs.existsSync(filePath)) return ctx.reply("❌ File tidak ditemukan.");

      fs.unlinkSync(filePath);
      
      // Hapus folder jika kosong (kecuali main)
      const dirPath = path.dirname(filePath);
      const category = path.basename(dirPath);
      if (category !== 'commands' && fs.readdirSync(dirPath).length === 0) {
        fs.rmdirSync(dirPath);
      }

      await ctx.answerCbQuery();
      await ctx.editMessageText(
        `🗑️ File \`${fileName}\` berhasil dihapus.\nSilahkan restart bot untuk menerapkan.`,
        { parse_mode: "Markdown" }
      );
    });
  },
};