# telegram-bot-base

Bot Telegram ini dibangun menggunakan Telegraf.js dengan arsitektur modular, memudahkan penambahan fitur dan pemeliharaan.

## Struktur Project

```
telegram-bot-base/
├── commands/             # Setiap command dalam 1 file, bisa dalam subfolder
│   ├── start.js
│   ├── ban.js
│   ├── tebak.js
│   ├── addowner.js
│   ├── delowner.js
│   ├── addprem.js
│   ├── delprem.js
│   ├── setnamebot.js
│   ├── setownername.js
│   ├── setthumb.js
│   └── cekid.js
     (....) # dan file lainnya
├── data/                 # File JSON lokal untuk penyimpanan data
│   ├── botinfo.json
│   ├── owners.json
│   ├── premiums.json
│   └── warns.json
├── middlewares/          # Middleware untuk validasi (groupOnly, ownerOnly, premiumOnly)
│   ├── groupOnly.js
│   ├── ownerOnly.js
│   └── premiumOnly.js
├── utils/                # Fungsi bantu seperti logger
│   └── logger.js
├── bot.js                # File utama bot
├── config.js             # Konfigurasi bot (token, owner ID)
├── package.json          # Informasi project dan dependensi
└── README.md             # Dokumentasi ini
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

## Fungsi Utama Bot

Berikut adalah ringkasan fungsionalitas utama yang disediakan oleh bot ini:

*   **Modular Command Handling:** Command dimuat secara dinamis dari folder `commands/`, memungkinkan penambahan dan pengelolaan command yang mudah. Setiap command dapat mendaftarkan handler-nya sendiri (command, action, text).
*   **Middleware System:** Penggunaan middleware untuk validasi akses (grup, owner, premium) sebelum command dieksekusi.
*   **Anti-Link:** Otomatis menghapus pesan yang mengandung link dari user non-admin di grup.
*   **Sistem Warn:** Menerapkan sistem warn (maksimal 3 warn sebelum user di-kick) untuk pelanggaran seperti pengiriman link.
*   **Manajemen Data Lokal:** Menggunakan file JSON (`data/`) untuk menyimpan konfigurasi bot yang dinamis (nama bot, owner, thumbnail) serta daftar owner, premium, dan data warn.
*   **Logging:** Mencatat aktivitas bot, termasuk setiap command yang dijalankan, ke konsol dan file log harian di folder `logs/`.

## Penjelasan Isi File dan Potongan Kode Penting

### `bot.js`

File inti yang mengorkestrasi seluruh bot. Ini adalah tempat bot diinisialisasi, command dimuat, dan middleware global diterapkan.

**Potongan Kode: Inisialisasi Data File**

```javascript
// Inisialisasi file data jika belum ada
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
```

Kode ini memastikan bahwa semua file data JSON yang diperlukan (`warns.json`, `owners.json`, `premiums.json`, `botinfo.json`) ada di folder `data/`. Jika tidak ada, file akan dibuat dengan konten default.

**Potongan Kode: Auto Load Command dan Registrasi Modul**

```javascript
// Auto load command
const commands = [];
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(fullPath); // Rekursif untuk subfolder
        } else if (file.isFile() && file.name.endsWith(".js")) {
            const commandModule = require(fullPath);
            if (commandModule.name && commandModule.register) {
                // Untuk command baru dengan fungsi register
                commandModule.register(bot); // Panggil fungsi register dan berikan instance bot
                logger.info(`Module registered: ${file.name}`);
                // Jika ada command name yang eksplisit, tambahkan ke daftar commands untuk setMyCommands
                if (commandModule.name) {
                    commands.push(commandModule);
                }
            } else if (commandModule.name && commandModule.execute) {
                // Kompatibilitas mundur untuk command lama (jika ada)
                commands.push(commandModule);
                logger.info(`Legacy command loaded: ${commandModule.name}`);
                if (commandModule.middleware && Array.isArray(commandModule.middleware)) {
                    bot.command(commandModule.name, ...commandModule.middleware, commandModule.execute);
                } else {
                    bot.command(commandModule.name, commandModule.execute);
                }
            }
        }
    }
};

loadCommands(path.join(__dirname, "commands"));
```

Fungsi `loadCommands` membaca semua file `.js` di folder `commands/` (termasuk subfolder). Jika modul mengekspor fungsi `register`, fungsi tersebut akan dipanggil dengan instance `bot` Telegraf, memungkinkan modul untuk mendaftarkan semua handler-nya sendiri. Ini adalah inti dari arsitektur modular yang baru.

**Potongan Kode: Logging Command**

```javascript
bot.use(async (ctx, next) => {
    if (ctx.message && ctx.message.text && ctx.message.text.startsWith("/")) {
        const commandName = ctx.message.text.split(" ")[0];
        const user = ctx.from;
        const chatType = ctx.chat.type;
        const chatName = ctx.chat.title || ctx.chat.username || chatType;
        logger.info(`Command: ${commandName} | User: ${user.first_name} (${user.id}) | Chat: ${chatName} (${chatType})`);
    }
    await next();
});
```

Middleware ini mencegat setiap pesan yang masuk. Jika pesan adalah command (diawali `/`), ia akan mencatat informasi command, user yang menjalankannya, dan detail chat (grup/private) menggunakan modul `logger`.

**Potongan Kode: Anti-Link dan Sistem Warn**

```javascript
bot.on("message", async (ctx, next) => {
    if (ctx.message.text) {
        const messageText = ctx.message.text.toLowerCase();
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        if (urlRegex.test(messageText)) {
            const chatMember = await ctx.getChatMember(ctx.from.id);
            if (!["administrator", "creator"].includes(chatMember.status)) {
                try {
                    await ctx.deleteMessage(ctx.message.message_id);
                    logger.warn(`Link terdeteksi dan dihapus dari ${ctx.chat.title || ctx.chat.type} oleh ${ctx.from.first_name} (${ctx.from.id})`);
                    
                    // Logika sistem warn
                    const warnsPath = path.join(__dirname, "data", "warns.json");
                    let warns = {};
                    if (fs.existsSync(warnsPath)) {
                        warns = JSON.parse(fs.readFileSync(warnsPath, "utf8"));
                    }

                    const userId = ctx.from.id.toString();
                    if (!warns[ctx.chat.id]) {
                        warns[ctx.chat.id] = {};
                    }
                    if (!warns[ctx.chat.id][userId]) {
                        warns[ctx.chat.id][userId] = 0;
                    }
                    warns[ctx.chat.id][userId]++;

                    fs.writeFileSync(warnsPath, JSON.stringify(warns, null, 2));

                    if (warns[ctx.chat.id][userId] >= 3) {
                        await ctx.kickChatMember(ctx.from.id);
                        ctx.reply(`${ctx.from.first_name} telah di-kick karena mencapai 3 warn.`);
                        delete warns[ctx.chat.id][userId]; // Reset warn setelah kick
                        fs.writeFileSync(warnsPath, JSON.stringify(warns, null, 2));
                    } else {
                        ctx.reply(`${ctx.from.first_name}, link tidak diizinkan! Warn ke-${warns[ctx.chat.id][userId]} (maks 3).`);
                    }
                } catch (error) {
                    logger.error(`Gagal menghapus pesan atau mengelola warn: ${error.message}`);
                }
            }
        }
    }
    next();
});
```

Middleware `bot.on("message")` ini mendeteksi pesan yang mengandung URL. Jika pengirim bukan admin, pesan akan dihapus dan user akan mendapatkan warn. Setelah 3 warn, user akan di-kick dari grup. Data warn disimpan di `data/warns.json`.

### `config.js`

Berisi konfigurasi dasar bot.

```javascript
module.exports = {
    botToken: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
    ownerId: process.env.OWNER_ID || null // Ganti dengan ID Telegram owner bot
};
```

`botToken` adalah token API bot dari BotFather. `ownerId` adalah ID Telegram dari owner utama bot yang memiliki akses penuh ke semua command `ownerOnly`.

### `utils/logger.js`

Modul utilitas untuk logging.

```javascript
const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatTime() {
        return new Date().toLocaleString('id-ID');
    }

    log(level, message) {
        const timestamp = this.formatTime();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        console.log(logMessage);
        
        const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, logMessage + '\n');
    }

    info(message) {
        this.log('info', message);
    }

    error(message) {
        this.log('error', message);
    }

    warn(message) {
        this.log('warn', message);
    }

    debug(message) {
        this.log('debug', message);
    }
}

module.exports = new Logger();
```

`Logger` mencatat pesan ke konsol dan juga menyimpannya ke file log harian di folder `logs/`. Ini sangat berguna untuk debugging dan memantau aktivitas bot.

### `middlewares/ownerOnly.js` (Contoh Middleware)

Middleware adalah fungsi yang dijalankan sebelum handler command utama. Ini adalah contoh middleware untuk membatasi akses.

```javascript
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = async (ctx, next) => {
    const userId = ctx.from.id;
    const ownersPath = path.join(__dirname, '../data/owners.json');
    
    let owners = [];
    if (fs.existsSync(ownersPath)) {
        owners = JSON.parse(fs.readFileSync(ownersPath, 'utf8'));
    }
    
    // Memeriksa apakah user adalah owner utama (dari config) atau owner tambahan (dari data/owners.json)
    if (userId != config.ownerId && !owners.includes(userId)) {
        return ctx.reply('Perintah ini hanya bisa digunakan oleh owner bot.');
    }
    
    await next(); // Lanjutkan ke handler command jika user adalah owner
};
```

Middleware ini memeriksa apakah `userId` pengirim pesan cocok dengan `ownerId` di `config.js` atau ada di daftar `owners.json`. Jika tidak, pesan balasan akan dikirim dan eksekusi command dihentikan.

## Fitur dan Command

### Command Minimal

*  `/addowner` - Menambahkan owner bot
*  `/addprem` - Menambahkan user premium
*  `/ban` - Ban user dari grup
*  `/cekid` - Menampilkan ID user
*  `/cmd` - Manajemen file command
*  `/delowner` - Menghapus owner bot
*  `/delprem` - Menghapus user premium
*  `/eval` - Eksekusi kode JavaScript
*  `/groupfeature` - Percobaan Khusus Grup.
*  `/help` - Menampilkan daftar perintah
*  `/interactive` - Percobaan Fitur Button sesi
*  `/ownerfeature` - Percobaan Fitur Owner.
*  `/premiumfeature` - Percobaan Fitur Premium.
*  `/setnamebot` - Mengubah nama bot
*  `/setownername` - Mengubah nama owner
*  `/setthumb` - Mengubah thumbnail bot
*  `/shell` - Akses shell via bot
*  `/start` - Menampilkan info bot
*  `/tebak` - Percobaan Fitur Game

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
*   **INI MASIH BASE, FITUR KALIAN SENDIRI YANG MENAMBAHKAN.** gimana caranya ?


## Menambah Fitur Baru (Command)

Menambahkan command baru sangat mudah berkat arsitektur modular. Setiap fitur (command, tombol interaktif, sesi) dapat dienkapsulasi dalam satu file command.

1.  **Buat File Command Baru:**
    Buat file JavaScript baru di dalam folder `commands/`. Misalnya, `commands/newcommand.js`.

2.  **Struktur File Command:**
    Setiap file command harus mengekspor sebuah objek dengan properti `name`, `description`, dan fungsi `register`. Fungsi `register` ini akan menerima instance `bot` Telegraf sebagai argumen, di mana Anda dapat mendaftarkan semua handler terkait fitur tersebut (command, action, text handler, dll.).

    ```javascript
    // commands/newcommand.js
    const ownerOnly = require("../middlewares/ownerOnly"); // Contoh jika perlu middleware

    module.exports = {
        name: "newcommand", // Nama command (misal: /newcommand)
        description: "Deskripsi singkat tentang command ini.",
        register: (bot) => {
            bot.command("newcommand", ownerOnly, async (ctx) => {
                // Logika command Anda di sini
                await ctx.reply("Ini adalah command baru!");
            });

            // Anda bisa menambahkan handler lain di sini, misalnya bot.action atau bot.on("text")
            // bot.action("my_button_action", async (ctx) => { /* ... */ });
            // bot.on("text", async (ctx, next) => { /* ... */ next(); });
        },
    };
    ```

3.  **Bot Akan Otomatis Memuat:**
    File `bot.js` akan secara otomatis mendeteksi dan memuat command baru ini saat bot dijalankan, serta menambahkannya ke daftar command bot Telegram (`setMyCommands`).

## Membuat Fitur Baru dengan Middleware, Session, dan Interaksi Tombol

Bot ini dirancang untuk memudahkan penambahan fitur baru, terutama yang memerlukan kontrol akses (owner, premium, grup), manajemen sesi, atau interaksi dengan tombol. Berikut panduannya:

### 1. Menggunakan Middleware untuk Kontrol Akses

Untuk membatasi akses command, Anda bisa menggunakan middleware yang sudah disediakan di folder `middlewares/`:

*   `ownerOnly.js`: Memastikan command hanya bisa diakses oleh owner bot (ID dari `config.js` atau `data/owners.json`).
*   `premiumOnly.js`: Memastikan command hanya bisa diakses oleh user premium atau owner bot.
*   `groupOnly.js`: Memastikan command hanya bisa digunakan di dalam grup, bukan di private chat.

**Contoh Penggunaan Middleware dalam Fungsi `register`:**

```javascript
// commands/fitur_owner.js
const ownerOnly = require("../middlewares/ownerOnly");

module.exports = {
    name: "fitur_owner",
    description: "Ini adalah fitur khusus owner.",
    register: (bot) => {
        bot.command("fitur_owner", ownerOnly, async (ctx) => {
            await ctx.reply("Anda adalah owner, jadi Anda bisa mengakses ini!");
        });
    },
};
```

### 2. Membuat Fitur dengan Session (Contoh: Game Tebak Angka)

Untuk fitur yang memerlukan penyimpanan status per user (sesi), Anda bisa menggunakan `Map` atau objek JavaScript sederhana yang disimpan di memori, atau menggunakan fitur sesi Telegraf (`ctx.session`). Contoh terbaik adalah game `/tebak` yang sudah diimplementasikan.

**Konsep Session dengan `Map` (seperti di `/tebak`):**

Pada file `commands/tebak.js`, sebuah `Map` bernama `gameSession` digunakan untuk menyimpan status game setiap user. Kunci `Map` adalah `userId` dan nilainya adalah objek yang berisi `correctNumber` dan `attemptsLeft`.

```javascript
// commands/tebak.js (potongan kode)
const gameSession = new Map(); // userId -> { correctNumber, attemptsLeft }

module.exports = {
    name: 'tebak',
    description: 'Game tebak angka 1-10 dengan 3 kesempatan',
    register: (bot) => {
        bot.command('tebak', async (ctx) => {
            // ... logika memulai game ...
        });

        // Handler untuk pesan teks yang merupakan tebakan angka
        bot.on('text', async (ctx, next) => {
            const userId = ctx.from.id;
            const messageText = ctx.message.text.trim();

            // Cek apakah user sedang dalam sesi game tebak angka dan pesan adalah angka
            if (gameSession.has(userId) && !isNaN(parseInt(messageText)) && !messageText.startsWith('/')) {
                // ... logika memproses tebakan ...
            } else {
                await next(); // Lanjutkan ke handler lain jika bukan tebakan angka
            }
        });
    }
};
```

**Penting:** Ketika menggunakan `bot.on('text')` di dalam fungsi `register` command, pastikan untuk selalu memanggil `next()` jika pesan tidak relevan dengan sesi command Anda. Ini memungkinkan handler `bot.on('text')` dari command lain atau middleware global untuk memproses pesan.

### 3. Membuat Fitur Interaktif dengan Tombol (Inline Keyboard)

Anda dapat membuat pesan dengan tombol interaktif (inline keyboard) dan menangani aksi tombol tersebut sepenuhnya di dalam file command. Gunakan `bot.action` untuk menangani `callback_data` dari tombol.

**Contoh Fitur Interaktif (`commands/interactive_example.js`):**

```javascript
// commands/interactive_example.js
module.exports = {
    name: "interactive",
    description: "Contoh fitur interaktif dengan tombol dan sesi.",
    register: (bot) => {
        const userStates = new Map(); // Untuk menyimpan state sesi per user

        bot.command("interactive", async (ctx) => {
            userStates.set(ctx.from.id, { step: 1 });
            await ctx.reply(
                "Halo! Ini adalah contoh interaktif. Pilih opsi di bawah:",
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Opsi A", callback_data: "interactive_option_a" }],
                            [{ text: "Opsi B", callback_data: "interactive_option_b" }],
                        ],
                    },
                }
            );
        });

        bot.action("interactive_option_a", async (ctx) => {
            const userId = ctx.from.id;
            const state = userStates.get(userId);

            if (state && state.step === 1) {
                userStates.set(userId, { step: 2, selectedOption: "A" });
                await ctx.editMessageText("Anda memilih Opsi A. Sekarang, ketik pesan rahasia Anda:");
            } else {
                await ctx.reply("Sesi Anda tidak valid atau sudah berakhir. Silakan mulai lagi dengan /interactive.");
            }
            await ctx.answerCbQuery(); // Penting untuk menghilangkan loading di tombol
        });

        bot.action("interactive_option_b", async (ctx) => {
            const userId = ctx.from.id;
            const state = userStates.get(userId);

            if (state && state.step === 1) {
                userStates.set(userId, { step: 2, selectedOption: "B" });
                await ctx.editMessageText("Anda memilih Opsi B. Sekarang, ketik pesan rahasia Anda:");
            } else {
                await ctx.reply("Sesi Anda tidak valid atau sudah berakhir. Silakan mulai lagi dengan /interactive.");
            }
            await ctx.answerCbQuery();
        });

        // Handle pesan teks setelah memilih opsi
        bot.on("text", async (ctx, next) => {
            const userId = ctx.from.id;
            const state = userStates.get(userId);

            // Pastikan ini adalah pesan untuk sesi interaktif ini dan bukan command lain
            if (state && state.step === 2 && !ctx.message.text.startsWith("/")) {
                const secretMessage = ctx.message.text;
                await ctx.reply(`Pesan rahasia Anda ('${secretMessage}') telah diterima untuk Opsi ${state.selectedOption}. Sesi berakhir.`);
                userStates.delete(userId); // Hapus sesi setelah selesai
            } else {
                await next(); // Lanjutkan ke handler lain jika bukan bagian dari sesi ini
            }
        });
    },
};
```

---

cukup sekian dokumentasi singkat pada repo ini, saya harap kalian semua suka dan bisa menggunakan base telegram ini secara maksimal
jangan lupa untuk berikan star pada repo ini dan follow akun github saya terima kasih