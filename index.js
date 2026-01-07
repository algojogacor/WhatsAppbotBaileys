// --- 1. IMPORT MODUL UTAMA (BAILEYS) ---
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// Cloud Couchbase
const { connectToCloud, loadDB, saveDB, addQuestProgress } = require('./helpers/database');

// --- IMPORT COMMANDS ---
const economyCmd = require('./commands/economy');   
const toolsCmd = require('./commands/tools');       
const bolaCmd = require('./commands/bola');         
const profileCmd = require('./commands/profile');   
const battleCmd = require('./commands/battle');     
const ttsCmd = require('./commands/tts');           
const gameTebakCmd = require('./commands/gameTebak'); 
const cryptoCmd = require('./commands/crypto');     
const pdfCmd = require('./commands/pdf');           
const robCmd = require('./commands/rob');           
const wikiKnowCmd = require('./commands/WikiKnow'); 
const adminCmd = require('./commands/admin');       
const aiCmd = require('./commands/ai');             

// --- 2. KONFIGURASI WHITELIST GRUP (Hanya grup ini yang bisa akses bot) ---
const ALLOWED_GROUPS = [
    "120363310599817766@g.us",       // Grup Sodara
    "6282140693010-1590052322@g.us", // Grup Keluarga Wonoboyo
    "120363253471284606@g.us",       // Grup Ambarya
    "120363328759898377@g.us"        // Grup Testingbot
];

// --- TAMBAHAN UNTUK KOYEB (Supaya bot tidak mati) ---
const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.send('<h1>Bot Arya is Running! 🚀</h1>');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// --- 3. FUNGSI UTAMA KONEKSI BAILEYS ---
async function startBot() {
    
    // PERBAIKAN 1: Try-Catch Database (Agar Bot TIDAK MATI jika internet/DB lemot)
    try {
        console.log("🔄 Menghubungkan ke Database...");
        await connectToCloud();
        console.log("✅ Database Terhubung!");
    } catch (err) {
        console.log("⚠️ GAGAL KONEK DB: Bot jalan dalam Mode Darurat (Tanpa Save Cloud).");
        // Bot tetap lanjut ke bawah walau DB error
    }

    // Setup Auth (Session disimpan di folder 'auth_baileys')
    const { state, saveCreds } = await useMultiFileAuthState('auth_baileys');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }), // Log bersih
        printQRInTerminal: true, // QR otomatis muncul
        auth: state,
        browser: ['Bot Arya', 'Chrome', '1.0.0'], // Menyamar jadi Chrome
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
    });

    // --- EVENT KONEKSI (QR & RECONNECT) ---
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n================================================');
            console.log('👇 SALIN KODE PANJANG DI BAWAH KE GOQR.ME JIKA PERLU 👇');
            console.log(qr);
            console.log('================================================\n');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Koneksi terputus. Mencoba connect ulang...', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ BOT SIAP! 🚀 (Mode: Baileys)');
            console.log('🔒 Mode: Hanya Grup Whitelist');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // --- 4. EVENT MESSAGE ---
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const m = messages[0];
        if (!m.message) return;
        
        // ⛔ PENGAMAN 1: Abaikan pesan dari Bot sendiri
        // if (m.key.fromMe) return; 

        try {
            // ==========================================================
            //  ADAPTOR KOMPATIBILITAS (MSG & CHAT PALSU)
            // ==========================================================
            const remoteJid = m.key.remoteJid;
            const isGroup = remoteJid.endsWith('@g.us');
            const sender = isGroup ? (m.key.participant || m.participant) : remoteJid;
            const pushName = m.pushName || "Tanpa Nama"; // Ambil nama user
            
            // Ambil body pesan
            const msgType = Object.keys(m.message)[0];
            const body = m.message.conversation || 
                         m.message.extendedTextMessage?.text || 
                         m.message.imageMessage?.caption || "";
            
            // 🔥 PERBAIKAN 2: CCTV LOG (Cek apakah pesan masuk terbaca di terminal)
            if (body) console.log(`📨 PESAN DARI ${pushName}: ${body.slice(0, 30)}...`);

            // Cek Media
            const hasMedia = (msgType === 'imageMessage' || msgType === 'videoMessage' || msgType === 'documentMessage');

            // --- CHAT ADAPTOR (SMART SEND) ---
            const chat = {
                id: { _serialized: remoteJid },
                isGroup: isGroup,
                sendMessage: async (content) => {
                    if (typeof content === 'string') {
                        await sock.sendMessage(remoteJid, { text: content });
                    } else {
                        await sock.sendMessage(remoteJid, content);
                    }
                }
            };

            // --- MSG ADAPTOR (TAMBAHAN REACT & PUSHNAME) ---
            const msg = {
                body: body,
                from: remoteJid,
                author: sender,
                pushName: pushName, // ✅ Fix Error Profile (notifyName)
                hasMedia: hasMedia,
                type: msgType,
                getChat: async () => chat,
                
                // ✅ Fix Error AI (msg.react)
                react: async (emoji) => {
                    await sock.sendMessage(remoteJid, { 
                        react: { text: emoji, key: m.key } 
                    });
                },

                reply: async (text) => {
                    await sock.sendMessage(remoteJid, { text: text + "" }, { quoted: m });
                },
                key: m.key,
                message: m.message
            };

            // ==========================================================
            //  LOGIKA SECURITY GATEKEEPER
            // ==========================================================
            
            // PENGAMAN 2: KHUSUS GRUP

            // (Matikan baris ini jika ingin tes bot di JAPRI)
            if (!chat.isGroup) return;

            // IDGRUP Check
            if (msg.body === '!idgrup') {
                return msg.reply(`🆔 *ID GRUP INI:*\n\`${chat.id._serialized}\``);
            }

            // PENGAMAN 3: WHITELIST ONLY
            if (!ALLOWED_GROUPS.includes(chat.id._serialized)) {
                // console.log("⛔ Grup tidak terdaftar, diabaikan.");
                return; 
            }

            // ==========================================================
            //  DATABASE & LOGIKA UTAMA
            // ==========================================================

            const db = loadDB();

            // --- PENGAMAN DATABASE ---
            if (!db.users) db.users = {};
            if (!db.market || Object.keys(db.market).length === 0) db.market = {};
            
            const today = new Date().toISOString().split("T")[0];

            // --- B. INISIALISASI USER ---
            const defaultQuest = {
                daily: [
                    { id: "chat", name: "Ngobrol Aktif", progress: 0, target: 10, reward: 200, claimed: false },
                    { id: "game", name: "Main Casino", progress: 0, target: 3, reward: 300, claimed: false },
                    { id: "sticker", name: "Bikin Stiker", progress: 0, target: 2, reward: 150, claimed: false }
                ],
                weekly: { id: "weekly", name: "Weekly Warrior", progress: 0, target: 100, reward: 2000, claimed: false },
                lastReset: today
            };

            if (!db.users[sender]) {
                db.users[sender] = {
                    balance: 1000, xp: 0, level: 1, inv: [], buffs: {}, lastDaily: 0,
                    bolaWin: 0, bolaTotal: 0, bolaProfit: 0,
                    crypto: {}, debt: 0, bank: 0, 
                    quest: JSON.parse(JSON.stringify(defaultQuest))
                };
                saveDB(db);
            }

            const user = db.users[sender];
            if (!user) return; 

            user.lastSeen = Date.now();

            // Auto-Fix Data User
            if (!user.crypto) user.crypto = {};
            if (typeof user.debt === 'undefined') user.debt = 0;
            if (typeof user.bank === 'undefined') user.bank = 0; 
            if (typeof user.balance === 'undefined') user.balance = 0;
            if (!user.quest) user.quest = JSON.parse(JSON.stringify(defaultQuest));
            if (user.xp === undefined) user.xp = 0;
            if (user.level === undefined) user.level = 1;

            // --- A. ANTI TOXIC ---
            const toxicWords = ["anjing", "kontol", "memek", "goblok", "idiot", "babi", "tolol", "ppq", "jembut"];
            if (toxicWords.some(k => body.toLowerCase().includes(k))) {
                return msg.reply("⚠️ Jaga ketikan bro, jangan toxic!");
            }

            // --- C. SISTEM RESET & BUFF ---
            if (user.quest?.lastReset !== today) {
                user.quest.daily.forEach(q => { q.progress = 0; q.claimed = false; });
                user.quest.lastReset = today;
                saveDB(db);
            }

            if (user.buffs) {
                for (let key in user.buffs) {
                    if (user.buffs[key].active && Date.now() >= user.buffs[key].until) {
                        user.buffs[key].active = false;
                    }
                }
            }

            // --- D. XP & LEVELING ---
            let xpGain = user.buffs?.xp?.active ? 5 : 2; 
            user.xp += xpGain;

            if (user.quest.weekly && !user.quest.weekly.claimed) {
                user.quest.weekly.progress++;
            }

            let nextLvl = Math.floor(user.xp / 100) + 1;
            if (nextLvl > user.level) {
                user.level = nextLvl;
                msg.reply(`🎊 *LEVEL UP!* Sekarang kamu Level *${user.level}*`);
            }

            const qMsg = addQuestProgress(user, "chat");
            if (qMsg) msg.reply(qMsg);
            saveDB(db);

            // --- E. PREPARASI COMMAND ---
            const isCommand = body.startsWith('!');
            const args = isCommand ? body.slice(1).trim().split(/ +/) : [];
            const command = isCommand ? args.shift().toLowerCase() : "";

            // ==========================================================
            //  MODUL INTERAKTIF (Jalan Tanpa Prefix !)
            // ==========================================================

            // MODUL PDF
            if (typeof pdfCmd !== 'undefined') {
                await pdfCmd(command, args, msg, sender, sock).catch(e => console.error("Error PDF:", e.message));
            }

            await gameTebakCmd(command, args, msg, user, db, body).catch(e => console.error("Error Game:", e.message));
            
            const cryptoCommands = ['market', 'buycrypto', 'sellcrypto', 'pf', 'portofolio', 'topcrypto', 'top', 'mining', 'mine', 'margin', 'paydebt', 'migrasi', 'gabungakun'];
            if (cryptoCommands.includes(command)) {
                await cryptoCmd(command, args, msg, user, db).catch(e => console.error("Error Crypto:", e.message));
            }

            const robCommands = ['bank', 'atm', 'depo', 'deposit', 'tarik', 'withdraw', 'rob', 'maling'];
            if (robCommands.includes(command)) {
                await robCmd(command, args, msg, user, db).catch(e => console.error("Error Rob:", e.message));
            }

            const battleCommands = ['pvp', 'battle', 'terima', 'stopbattle', 'surrender', 'nyerah'];
            if (battleCommands.includes(command)) {
                await battleCmd(command, args, msg, user, db).catch(e => console.error("Error Battle:", e.message));
            }

            // ==========================================================
            //  MODUL COMMAND (Wajib Prefix !)
            // ==========================================================
            if (!isCommand) return;

            await economyCmd(command, args, msg, user, db).catch(e => console.error("Error Economy:", e.message));
            await toolsCmd(command, args, msg, user, db, chat).catch(e => console.error("Error Tools:", e.message));
            await bolaCmd(command, args, msg, user, db, sender).catch(e => console.error("Error Bola:", e.message));
            await profileCmd(command, args, msg, user, db, chat, sock).catch(e => console.error("Error Profile:", e.message));
            await ttsCmd(command, args, msg).catch(e => console.error("Error TTS:", e.message));
            await wikiKnowCmd(command, args, msg).catch(e => console.error("Error WikiKnow:", e.message));
            await adminCmd(command, args, msg, user, db).catch(e => console.error("Error Admin:", e.message));
            await aiCmd(command, args, msg, user, db).catch(e => console.error("Error AI:", e.message));

            // --- 6. MENU UTAMA ---
            if (command === "menu" || command === "help") {
                const menuText = `📜 *MENU BOT MULTIFUNGSI (Versi Ringan)*

👤 *USER & PROFILE*
• !me | !rank | !inv | !daily | !quest
• !migrasi @akun_asli (Gabung Akun)

🏦 *BANK & KRIMINAL*
• !bank | !depo <jml> | !tarik <jml>
• !rob @user (Maling Dompet)

🚀 *CRYPTO & MINING*
• !market | !pf | !topcrypto
• !buycrypto <koin> <jml>
• !sellcrypto <koin> <jml>
• !mining | !margin | !paydebt

🎮 *GAMES*
• !gacha (Jackpot 10k!)
• !casino <jml> | !slot <jml>
• !tebakgambar | !asahotak | !susunkata
• !pvp @user | !battle @user (Tantang Duel)
• !terima (Terima Tantangan)
• !stopbattle | !surrender (Stop Battle)

⚽ *SPORT BETTING*
• !updatebola | !bola | !topbola | !resultbola

🧠 *AI SUPER TIERS*
• !ai0 <tanya> (Terbaik namun terbatas)
• !ai1 <tanya> (Flagship/Smart)
• !ai2 <tanya> (Roleplay/Asik)
• !ai3 <tanya> (Speed/Cepat)
• !ask <tanya> (Auto-Pilot)
• !sharechat (Buat Link History) 

📸 *EDITOR & MEDIA*
• !sticker !toimg (Buat Stiker WA)
• !topdf (Ubah Gambar ke PDF)
• !scan (Gambar B&W) 
• !pdfdone (Selesai & Buat PDF)
• !tts (text to speech)

🛠️ *TOOLS & ADMIN*
• !idgrup (Cek ID Grup)`;
                
                return msg.reply(menuText);
            }

        } catch (e) {
            console.error("Critical Error di Index.js:", e.message);
        }
    });
}

// Jalankan Bot
startBot();