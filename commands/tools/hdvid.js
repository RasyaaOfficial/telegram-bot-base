const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { Markup } = require("telegraf");

const userState = new Map();

const resolutions = {
  "480p": "480",
  "720p": "720",
  "1080p": "1080",
  "2K": "1440",
  "4K": "2160",
  "8K": "4320"
};

const fpsOptions = ["30", "60", "120", "240"];

module.exports = {
  name: "hdvid",
  description: "Tingkatkan kualitas video",
  register: (bot) => {
    bot.command("hdvid", async (ctx) => {
      userState.set(ctx.from.id, { step: "awaiting_video" });
      await ctx.reply("Kirim video yang ingin di-HD-kan:");
    });

    bot.on("video", async (ctx) => {
      const state = userState.get(ctx.from.id);
      if (!state || state.step !== "awaiting_video") return;

      const video = ctx.message.video;
      const fileId = video.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);

      const filePath = `./temp/input_${ctx.from.id}.mp4`;
      const videoBuffer = await fetch(fileLink.href).then((r) => r.arrayBuffer());
      fs.writeFileSync(filePath, Buffer.from(videoBuffer));

      // Hapus video user
      await ctx.deleteMessage();

      userState.set(ctx.from.id, { step: "choose_resolution", filePath });

      const buttons = Object.keys(resolutions).map((res) =>
        Markup.button.callback(res, `hdvid_res_${res}`)
      );

      const grouped = [];
      for (let i = 0; i < buttons.length; i += 3) {
        grouped.push(buttons.slice(i, i + 3));
      }

      await ctx.reply(`Pilih resolusi yang diinginkan:

[!] Semakin tinggi, semakin berat proses dan hasil video`, Markup.inlineKeyboard(grouped));
    });

    bot.action(/^hdvid_res_(.+)$/, async (ctx) => {
      const selectedRes = ctx.match[1];
      const state = userState.get(ctx.from.id);
      if (!state || !state.filePath) return;

      await ctx.deleteMessage();
      userState.set(ctx.from.id, { ...state, resolution: resolutions[selectedRes], step: "choose_fps" });

      const fpsButtons = fpsOptions.map((f) =>
        Markup.button.callback(`${f} FPS`, `hdvid_fps_${f}`)
      );

      const grouped = [];
      for (let i = 0; i < fpsButtons.length; i += 3) {
        grouped.push(fpsButtons.slice(i, i + 3));
      }

      await ctx.reply(
        `Pilih Tingkat FPS 

[!] Semakin tinggi, semakin berat proses dan hasil video:`,
        Markup.inlineKeyboard(grouped)
      );
    });

    bot.action(/^hdvid_fps_(\d+)$/, async (ctx) => {
      const fps = ctx.match[1];
      const state = userState.get(ctx.from.id);
      if (!state || !state.resolution || !state.filePath) return;

      await ctx.deleteMessage();

      const loadingMsg = await ctx.reply("⏳ Sedang memproses video, mohon tunggu...");

      const form = new FormData();
      form.append("video", fs.createReadStream(state.filePath));
      form.append("resolution", state.resolution);
      form.append("fps", fps);

      const outputPath = `./temp/output_${ctx.from.id}.mp4`;

      try {
        const response = await axios.post("http://193.149.164.168:4167/hdvideo", form, {
          headers: form.getHeaders(),
          responseType: "stream",
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        writer.on("finish", async () => {
          await ctx.deleteMessage(loadingMsg.message_id);

          const buffer = fs.readFileSync(outputPath);
          await ctx.replyWithVideo({ source: buffer }, {
            caption: `Berhasil! Video ditingkatkan ke ${state.resolution} @ ${fps}FPS`,
          });

          fs.unlinkSync(state.filePath);
          fs.unlinkSync(outputPath);
          userState.delete(ctx.from.id);
        });

        writer.on("error", async () => {
          await ctx.editMessageText("❌ Gagal menyimpan video hasil.");
        });
      } catch (err) {
        console.error(err);
        await ctx.editMessageText("❌ Terjadi kesalahan saat mengirim ke server.");
        if (fs.existsSync(state.filePath)) fs.unlinkSync(state.filePath);
        userState.delete(ctx.from.id);
      }
    });
  },
};