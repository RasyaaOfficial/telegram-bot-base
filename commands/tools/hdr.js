const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { Markup } = require("telegraf");

const userState = new Map();

module.exports = {
  name: "hdr",
  description: "Perbesar resolusi gambar",
  register: (bot) => {
    bot.command("hdr", async (ctx) => {
      userState.set(ctx.from.id, { step: "awaiting_image" });
      await ctx.reply("Kirim gambar yang ingin di-upscale:");
    });

    bot.on("photo", async (ctx) => {
      const state = userState.get(ctx.from.id);
      if (!state || state.step !== "awaiting_image") return;

      const photo = ctx.message.photo.pop(); // ambil resolusi tertinggi
      const fileId = photo.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);

      const tempDir = path.join(__dirname, "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      const filePath = path.join(tempDir, `img_${ctx.from.id}.jpg`);
      const imgBuffer = await fetch(fileLink.href).then((r) => r.arrayBuffer());
      fs.writeFileSync(filePath, Buffer.from(imgBuffer));

      // hapus pesan foto
      await ctx.deleteMessage();

      userState.set(ctx.from.id, { step: "choose_scale", filePath });

      await ctx.reply("Pilih skala perbesaran:", Markup.inlineKeyboard([
        [Markup.button.callback("2x", "upscale_2x"), Markup.button.callback("4x", "upscale_4x")]
      ]));
    });

    bot.action(/^upscale_(\dx)$/, async (ctx) => {
      const scale = ctx.match[1].replace("x", "");
      const state = userState.get(ctx.from.id);
      if (!state || !state.filePath) return;

      await ctx.deleteMessage();

      const loadingMsg = await ctx.reply(`⏳ Sedang memperbesar gambar ${scale}x...`);

      try {
        const form = new FormData();
        form.append("image", fs.createReadStream(state.filePath));
        form.append("scale", scale);

        const response = await axios.post("https://api.siputzx.my.id/api/iloveimg/upscale", form, {
          headers: form.getHeaders(),
          responseType: "arraybuffer",
        });

        const outputPath = path.join(__dirname, "..", "temp", `result_${ctx.from.id}.jpg`);
        fs.writeFileSync(outputPath, response.data);

        await ctx.deleteMessage(loadingMsg.message_id);

        await ctx.replyWithPhoto({ source: outputPath }, {
          caption: `Gambar berhasil diperbesar ${scale}x!`,
        });

        // bersihkan file
        fs.unlinkSync(state.filePath);
        fs.unlinkSync(outputPath);
        userState.delete(ctx.from.id);
      } catch (err) {
        console.error(err);
        await ctx.editMessageText("❌ Gagal memproses gambar.");
      }
    });
  },
};