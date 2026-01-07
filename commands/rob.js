const { saveDB } = require('../helpers/database');

module.exports = async (command, args, msg, user, db) => {
    // Pastikan variabel bank user (pelaku) ada
    if (typeof user.bank === 'undefined') user.bank = 0;

    const now = Date.now();
    
    // KONFIGURASI
    const BANK_COOLDOWN = 10 * 60 * 1000; // 10 Menit
    const ROB_COOLDOWN = 30 * 60 * 1000;  // 30 Menit

    // 1. COMMAND CEK BANK (!bank)
    if (command === 'bank' || command === 'atm') {
        let txt = `🏦 *BANK ARYA* 🏦\n\n`;
        txt += `👤 Nasabah: ${msg.author ? `@${msg.author.split('@')[0]}` : 'Kamu'}\n`;
        txt += `💳 Saldo Bank: 💰${Math.floor(user.bank).toLocaleString()} (Aman)\n`;
        txt += `👛 Dompet: 💰${Math.floor(user.balance).toLocaleString()} (Rawan Maling)\n\n`;
        txt += `_Gunakan !depo dan !tarik untuk kelola uang._`;
        return msg.reply(txt, null, { mentions: [msg.author] });
    }

    // 2. COMMAND DEPOSIT (!depo)
    if (command === 'depo' || command === 'deposit') {
        const lastBank = user.lastBank || 0;
        if (now - lastBank < BANK_COOLDOWN) {
            const sisa = Math.ceil((BANK_COOLDOWN - (now - lastBank)) / 60000);
            return msg.reply(`⏳ *ANTRIAN BANK PENUH!*\nHarap tunggu ${sisa} menit lagi.`);
        }

        let amount = args[0];
        if (!amount) return msg.reply("❌ Contoh: `!depo 1000` atau `!depo all`");
        
        if (amount.toLowerCase() === 'all') amount = user.balance;
        else amount = parseInt(amount);

        if (isNaN(amount) || amount <= 0) return msg.reply("❌ Nominal salah.");
        if (user.balance < amount) return msg.reply("❌ Uang dompet kurang!");

        user.balance -= amount;
        user.bank += amount;
        user.lastBank = now;
        saveDB(db);
        
        return msg.reply(`✅ Berhasil setor 💰${amount.toLocaleString()} ke Bank.`);
    }

    // 3. COMMAND TARIK (!tarik)
    if (command === 'tarik' || command === 'withdraw') {
        const lastBank = user.lastBank || 0;
        if (now - lastBank < BANK_COOLDOWN) {
            const sisa = Math.ceil((BANK_COOLDOWN - (now - lastBank)) / 60000);
            return msg.reply(`⏳ *ANTRIAN BANK PENUH!*\nHarap tunggu ${sisa} menit lagi.`);
        }

        let amount = args[0];
        if (!amount) return msg.reply("❌ Contoh: `!tarik 1000` atau `!tarik all`");
        
        if (amount.toLowerCase() === 'all') amount = user.bank;
        else amount = parseInt(amount);

        if (isNaN(amount) || amount <= 0) return msg.reply("❌ Nominal salah.");
        if (user.bank < amount) return msg.reply("❌ Saldo Bank kurang!");

        user.bank -= amount;
        user.balance += amount;
        user.lastBank = now;
        saveDB(db);

        return msg.reply(`✅ Berhasil tarik 💰${amount.toLocaleString()} ke Dompet.`);
    }

    // 4. COMMAND MALING (!rob)
    if (command === 'rob' || command === 'maling') {
        const lastRob = user.lastRob || 0;
        if (now - lastRob < ROB_COOLDOWN) {
            const sisa = Math.ceil((ROB_COOLDOWN - (now - lastRob)) / 60000);
            return msg.reply(`👮 Polisi sedang patroli! Tunggu ${sisa} menit lagi.`);
        }

        if (!msg.mentionedIds || msg.mentionedIds.length === 0) {
            return msg.reply("❌ Tag korban yang mau dimaling! Contoh: `!rob @user`");
        }

        const targetId = msg.mentionedIds[0];
        let targetUser = db.users[targetId];

        // AUTOREGISTER TARGET JIKA BELUM ADA
        if (!targetUser) {
            console.log(`[ROB] Mendaftarkan user baru: ${targetId}`);
            
            // Template Data User Baru
            db.users[targetId] = {
                balance: 1000, xp: 0, level: 1, inv: [], buffs: {}, lastDaily: 0,
                bolaWin: 0, bolaTotal: 0, bolaProfit: 0,
                crypto: {}, debt: 0, bank: 0, 
                quest: { // Quest default kosong dulu biar simpel
                    daily: [], weekly: { id: "weekly", progress: 0, target: 100, claimed: false }, 
                    lastReset: new Date().toISOString().split("T")[0]
                }
            };
            // Simpan database
            saveDB(db);
            // Ambil lagi datanya
            targetUser = db.users[targetId];
        }

        if (targetId === msg.author) return msg.reply("❌ Gak bisa maling diri sendiri.");

        const targetWallet = targetUser.balance || 0;
        
        if (targetWallet < 100) {
            return msg.reply("❌ Target terlalu miskin (Saldo < 100). Gak tega...");
        }

        // Logika: 40% Sukses, 60% Gagal
        const chance = Math.random();
        
        if (chance < 0.4) {
            // Sukses Maling (10-30% dari dompet)
            const percentage = 0.1 + Math.random() * 0.2; 
            const stolen = Math.floor(targetWallet * percentage);

            targetUser.balance -= stolen;
            user.balance += stolen;
            user.lastRob = now;
            saveDB(db);

            return msg.reply(`🥷 *BERHASIL MALING!*\nKamu mencuri 💰${stolen.toLocaleString()} dari @${targetId.split('@')[0]}!`, null, { mentions: [targetId] });
        } else {
            // Gagal (Denda 500)
            const fine = 500;
            user.balance = Math.max(0, user.balance - fine);
            user.lastRob = now;
            saveDB(db);

            return msg.reply(`👮 *TERTANGKAP POLISI!*\nAksi gagal. Kamu didenda 💰${fine}.`);
        }
    }
};