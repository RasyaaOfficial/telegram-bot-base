# telegram-bot-base

Bot Telegram ini dibangun menggunakan Telegraf.js dengan arsitektur modular, memudahkan penambahan fitur dan pemeliharaan.

## Struktur Project

```
telegram-bot-base/
├── commands/             # Berisi semua command bot. Setiap command adalah file JS terpisah.
│   ├── start.js
│   ├── ban.js
│   └── ... (command lainnya)
├── data/                 # Penyimpanan data lokal dalam format JSON.
│   ├── botinfo.json      # Informasi dasar bot (nama, owner, thumbnail).
│   ├── owners.json       # Daftar ID user yang memiliki akses owner.
│   ├── premiums.json     # Daftar ID user yang memiliki akses premium.
│   └── warns.json        # Data warn user di setiap grup.
├── middlewares/          # Fungsi middleware untuk validasi atau pre-processing request.
│   ├── groupOnly.js      # Memastikan command hanya berjalan di grup.
│   ├── ownerOnly.js      # Memastikan command hanya berjalan untuk owner.
│   └── premiumOnly.js    # Memastikan command hanya berjalan untuk user premium/owner.
├── utils/                # Fungsi-fungsi bantu yang digunakan di berbagai bagian bot.
│   └── logger.js         # Modul untuk logging aktivitas bot.
├── bot.js                # File utama yang menginisialisasi bot, memuat command, dan mengatur middleware global.
├── config.js             # Konfigurasi penting bot seperti token dan ID owner utama.
├── package.json          # Metadata project dan daftar dependensi Node.js.
└── README.md             # Instruksi instalasi dan penggunaan dasar.
```

## Instalasi

1.  **Clone repository ini:**
    ```bash
    git clone https://github.com/FlowFalcon/telegram-bot-base
    cd telegram-bot-base
    ```

2.  **Instal dependensi:**
    ```bash
    npm install
    ```
*rekomendasi menggunakan nodejs versi 20 keatas*

## Konfigurasi

Edit file `config.js` dan ganti placeholder dengan informasi bot Anda:

```javascript
module.exports = {
    botToken: 'YOUR_BOT_TOKEN_HERE', // Ganti dengan token bot Telegram Anda
    ownerId: null // Ganti dengan ID Telegram owner bot (angka)
};
```

**Penting:** Untuk `botToken`, sangat disarankan di jaga kerahasiannya karena dapat di salah gunakan. jadi simpan dengan baik


Edit juga file `data/botinfo.js` untuk konfigurasi tampilan menu saat start nanti **CONTOH:**

```json
{
  "botName": "FlowFalcon TeleBot Project's",
  "ownerName": "@FlowFalcon",
  "thumbnail": "AgACAgUAAxkBAAMGaI4O9KPTvmFU1TAkw4i2_cygOl8AAjnEMRtQd3FUZkMJdM9MUnwBAAMCAAN4AAM2BA"
      // ganti thumbnail bisa di atur di bot nanti menggunakan fitur /setthumbnail sambil reply media
}
```

## Menjalankan Bot

```bash
npm start
# atau
node bot.js
```

## Fitur dan Command

### Command Minimal

*   `/start` - Menampilkan info bot (nama bot, nama owner, thumbnail).
*   `/ban` - Ban user dari grup (hanya admin grup).
*   `/tebak` - Game tebak angka 1-10 dengan 3 kesempatan. Setelah memulai game, user hanya perlu mengetik angka tebakan tanpa command.
*   `/addowner [id]` - Menambahkan user sebagai owner bot (hanya owner utama).
*   `/delowner [id]` - Menghapus user dari daftar owner bot (hanya owner utama).
*   `/addprem [id]` - Menambahkan user sebagai premium (hanya owner utama).
*   `/delprem [id]` - Menghapus user dari daftar premium (hanya owner utama).
*   `/setnamebot [text]` - Mengubah nama bot (hanya owner).
*   `/setownername [text]` - Mengubah nama owner (hanya owner).
*   `/setthumb` - Mengubah thumbnail bot (reply foto, hanya owner).
*   `/cekid` - Menampilkan ID user yang mengirim command.
*   `/premiumfeature` - Contoh fitur khusus untuk user premium.
*   `/ownerfeature` - Contoh fitur khusus untuk owner bot.
*   `/groupfeature` - Contoh fitur khusus untuk grup.

### Fitur Tambahan

*   **Anti-link:** Secara otomatis menghapus pesan yang mengandung link dari user non-admin.
*   **Sistem Warn:** User yang mengirim link akan mendapatkan warn. Setelah 3 warn, user akan otomatis di-kick dari grup. Data warn disimpan di `data/warns.json`.
*   **Middleware:**
    *   `groupOnly`: Memastikan command hanya bisa digunakan di grup.
    *   `ownerOnly`: Memastikan command hanya bisa digunakan oleh owner bot.
    *   `premiumOnly`: Memastikan command hanya bisa digunakan oleh user premium atau owner.
*   **Info Bot Dinamis:** Nama bot, nama owner, dan thumbnail disimpan di `data/botinfo.json` dan dapat diubah melalui command.
*   **Logger:** Sistem logging sederhana di `utils/logger.js` untuk mencatat aktivitas bot ke konsol dan file log.

## Catatan

*   Pastikan Anda telah membuat bot di BotFather dan mendapatkan token bot.
*   Untuk fitur `ban`, bot harus memiliki hak admin di grup.
*   ID owner awal bisa diatur di `config.js` atau melalui variabel lingkungan `OWNER_ID`.
*   PERLU DI INGAT INI HANYA BASE. KALIAN HARUS MENYEMPURNAKAN SENDIRI SISANYA

---

## Membuat Fitur Baru dengan Middleware dan Session

Bot ini dirancang untuk memudahkan penambahan fitur baru, terutama yang memerlukan kontrol akses (owner, premium, grup) atau manajemen sesi. Berikut panduannya:

### 1. Menggunakan Middleware untuk Kontrol Akses

Untuk membatasi akses command, Anda bisa menggunakan middleware yang sudah disediakan di folder `middlewares/`:

*   `ownerOnly.js`: Memastikan command hanya bisa diakses oleh owner bot (ID dari `config.js` atau `data/owners.json`).
*   `premiumOnly.js`: Memastikan command hanya bisa diakses oleh user premium atau owner bot.
*   `groupOnly.js`: Memastikan command hanya bisa digunakan di dalam grup, bukan di private chat.

**Contoh Penggunaan Middleware:**

```javascript
// commands/premiumfeature.js
const premiumOnly = require("../middlewares/premiumOnly");

module.exports = {
    name: "premiumfeature",
    description: "Fitur khusus untuk user premium.",
    middleware: [premiumOnly], // Tambahkan middleware di sini
    execute: async (ctx) => {
        await ctx.reply("Selamat! Anda adalah user premium dan bisa mengakses fitur ini.");
    },
};
```

```javascript
// commands/ownerfeature.js
const ownerOnly = require("../middlewares/ownerOnly");

module.exports = {
    name: "ownerfeature",
    description: "Fitur khusus untuk owner bot.",
    middleware: [ownerOnly],
    execute: async (ctx) => {
        await ctx.reply("Halo owner! Ini adalah fitur khusus untuk Anda.");
    },
};
```

```javascript
// commands/groupfeature.js
const groupOnly = require("../middlewares/groupOnly");

module.exports = {
    name: "groupfeature",
    description: "Fitur khusus untuk grup.",
    middleware: [groupOnly],
    execute: async (ctx) => {
        const groupName = ctx.chat.title || "grup ini";
        await ctx.reply(`Fitur ini hanya bisa digunakan di grup. Selamat datang di ${groupName}!`);
    },
};
```

### 2. Membuat Fitur dengan Session (Contoh: Game Tebak Angka)

Untuk fitur yang memerlukan penyimpanan status per user (sesi), Anda bisa menggunakan `Map` atau objek JavaScript sederhana yang disimpan di memori. Contoh terbaik adalah game `/tebak` yang sudah diimplementasikan.

**Konsep Session:**

Pada file `commands/tebak.js`, sebuah `Map` bernama `gameSession` digunakan untuk menyimpan status game setiap user. Kunci `Map` adalah `userId` dan nilainya adalah objek yang berisi `correctNumber` dan `attemptsLeft`.

```javascript
// commands/tebak.js
const gameSession = new Map(); // userId -> { correctNumber, attemptsLeft }

module.exports = {
    name: 'tebak',
    description: 'Game tebak angka 1-10 dengan 3 kesempatan',
    execute: async (ctx) => {
        const userId = ctx.from.id;
        const args = ctx.message.text.split(' ');

        if (args.length === 1) { // User memulai game baru
            if (gameSession.has(userId)) {
                return ctx.reply('Kamu sudah memiliki game yang sedang berjalan. Tebak angkanya atau ketik /tebak untuk memulai ulang.');
            }
            const randomNumber = Math.floor(Math.random() * 10) + 1;
            gameSession.set(userId, { correctNumber: randomNumber, attemptsLeft: 3 });
            return ctx.reply(`Game tebak angka dimulai! Tebak angka dari 1-10. Kamu punya 3 kesempatan.`);
        }

        // User menebak angka
        if (gameSession.has(userId)) {
            const guess = parseInt(args[1]);
            if (isNaN(guess) || guess < 1 || guess > 10) {
                return ctx.reply('Masukkan angka yang valid (1-10).');
            }
            
            const session = gameSession.get(userId);
            session.attemptsLeft--;

            if (guess === session.correctNumber) {
                gameSession.delete(userId);
                return ctx.reply(`🎉 Selamat! Tebakan kamu benar. Angkanya adalah ${session.correctNumber}.`);
            } else if (session.attemptsLeft > 0) {
                gameSession.set(userId, session); 
                return ctx.reply(`❌ Salah! Sisa kesempatan: ${session.attemptsLeft}.`);
            } else {
                gameSession.delete(userId);
                return ctx.reply(`😔 Kesempatanmu habis! Angka yang benar adalah ${session.correctNumber}. Ketik /tebak untuk bermain lagi.`);
            }
        } else {
            return ctx.reply('Kamu belum memulai game. Ketik /tebak untuk memulai.');
        }
    },
    gameSession: gameSession // Penting: Export gameSession agar bisa diakses oleh bot.js
};
```

**Integrasi dengan `bot.js`:**

Untuk memungkinkan user menebak angka tanpa harus mengetik `/tebak` setiap kali, `bot.js` memiliki handler `bot.on("text")` yang memeriksa apakah user sedang dalam sesi game tebak angka dan pesan yang dikirim adalah angka. Jika ya, pesan tersebut akan diproses oleh logika command `/tebak`.

```javascript
// bot.js (potongan kode)
const tebakCommand = require("./commands/tebak"); // Import tebak command untuk mengakses gameSession

// ... kode lainnya ...

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
```

Dengan pola ini, Anda bisa membuat fitur interaktif lainnya yang memerlukan sesi atau state per user.

## 6. Pengujian

Untuk menguji bot, pastikan Anda telah mengatur `BOT_TOKEN` dan `OWNER_ID` di `config.js` atau sebagai variabel lingkungan. Kemudian jalankan bot:

```bash
npm start
```

Anda bisa mencoba command-command yang tersedia dan mengamati log di konsol atau di file log di folder `logs/`.


---

Dukung aku dengan memberikan star pada repo ini dan follow akun ku
terimakasih