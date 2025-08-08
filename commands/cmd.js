const fs = require("fs");
const path = require("path");
const { Markup } = require("telegraf");
const ownerOnly = require("../middlewares/ownerOnly");

const session = new Map(); // userId -> { state, filename }

module.exports = {
  name: "cmd",
  description: "Manajemen file command",
  register: (bot) => {
    const commandsDir = path.join(__dirname);

    const listCommandFiles = () => {
      return fs.readdirSync(commandsDir).filter(f => f.endsWith(".js") && f !== "cmd.js");
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
      const files = listCommandFiles();
      const buttons = [];

      // susun 3 kolom per baris
      for (let i = 0; i < files.length; i += 3) {
        buttons.push(
          files.slice(i, i + 3).map((file) =>
            Markup.button.callback(file, `cmd_select_${file}`)
          )
        );
      }

      // tombol tambah di paling bawah
      buttons.push([Markup.button.callback("➕ Tambah Fitur Baru", "cmd_add")]);

      await ctx.reply("📂 Pilih command yang ingin dikelola:", Markup.inlineKeyboard(buttons));
    });

    bot.action(/^cmd_select_(.+\.js)$/, ownerOnly, async (ctx) => {
      const file = ctx.match[1];
      const filePath = path.join(commandsDir, file);
      if (!fs.existsSync(filePath)) return ctx.reply("❌ File tidak ditemukan.");

      const meta = parseCommandMeta(filePath);
      await ctx.answerCbQuery();
      await ctx.replyWithDocument({ source: filePath, filename: file });
      await ctx.reply(
        `📄 *${file}*\n🏷 Fitur: \`${meta.name}\`\n📝 Deskripsi: ${meta.description}`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("✏️ Edit", `cmd_edit_${file}`),
              Markup.button.callback("🗑️ Delete", `cmd_delete_${file}`),
            ],
          ]),
        }
      );
    });

    bot.action("cmd_add", ownerOnly, async (ctx) => {
      session.set(ctx.from.id, { state: "await_new_file" });
      await ctx.answerCbQuery();
      await ctx.reply("📥 Kirim file .js baru untuk ditambahkan sebagai fitur.");
    });

    bot.action(/^cmd_edit_(.+\.js)$/, ownerOnly, async (ctx) => {
      const file = ctx.match[1];
      session.set(ctx.from.id, { state: "await_upload", filename: file });
      await ctx.answerCbQuery();
      await ctx.reply(`📤 Kirim file .js baru untuk mengganti \`${file}\`.`);
    });

    bot.on("document", async (ctx) => {
      const state = session.get(ctx.from.id);
      if (!state) return;

      const doc = ctx.message.document;
      if (!doc.file_name.endsWith(".js")) {
        session.delete(ctx.from.id);
        return ctx.reply("❌ Format / file tidak didukung.");
      }

      const link = await ctx.telegram.getFileLink(doc.file_id);
      const fileBuffer = await fetch(link.href).then(res => res.arrayBuffer());

      const filePath = path.join(commandsDir, state.filename || doc.file_name);
      fs.writeFileSync(filePath, Buffer.from(fileBuffer));
      const meta = parseCommandMeta(filePath);

      session.delete(ctx.from.id);
      await ctx.reply(
        `✅ File \`${path.basename(filePath)}\` berhasil disimpan.\n🏷 Nama fitur: \`${meta.name}\`\n📝 Deskripsi: ${meta.description}\n\nSilahkan restart bot untuk menerapkan.`,
        { parse_mode: "Markdown" }
      );
    });

    bot.action(/^cmd_delete_(.+\.js)$/, ownerOnly, async (ctx) => {
      const file = ctx.match[1];
      const filePath = path.join(commandsDir, file);
      if (!fs.existsSync(filePath)) return ctx.reply("❌ File tidak ditemukan.");

      fs.unlinkSync(filePath);
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        `🗑️ File \`${file}\` berhasil dihapus.\nSilahkan restart bot untuk menerapkan.`,
        { parse_mode: "Markdown" }
      );
    });
  },
};
