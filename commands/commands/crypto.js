const { saveDB } = require('../helpers/database');

// HELPER FORMAT ANGKA (Titik Ribuan, Tanpa Desimal)
const fmt = (num) => {
    return Math.floor(Number(num) || 0).toLocaleString('id-ID');
};

// BERITA PASAR CRYPTO (TIDAK DIUBAH/DIKURANGI)
const newsPool = [
    { txt: "🚀 BLACKROCK ajukan ETF Bitcoin Spot, institusi masuk pasar!", effect: { btc: 1.5, all: 1.2 }, sMod: { btc: -15 } },
    { txt: "🔥 EL SALVADOR umumkan 'Bitcoin City' bebas pajak!", effect: { btc: 1.3 }, sMod: { btc: -10 } },
    { txt: "🐦 X (Twitter) resmi integrasikan wallet DOGE & SOL!", effect: { doge: 2.5, sol: 1.8 }, sMod: { doge: -800, sol: -50 } },
    { txt: "🐸 PEPE MANIA! Volume transaksi tembus $1 Miliar!", effect: { pepe: 3.0 }, sMod: { pepe: -3000 } },
    { txt: "💎 ETHEREUM selesaikan upgrade Sharding, gas fee jadi murah!", effect: { eth: 1.6 }, sMod: { eth: -40 } },
    { txt: "🌍 CHINA mencabut larangan crypto, 1 Miliar user masuk pasar!", effect: { all: 1.8 }, sMod: { all: -0.3 } },
    { txt: "🛍️ AMAZON menerima pembayaran Crypto secara global!", effect: { all: 1.4 }, sMod: { all: -0.2 } },
    { txt: "🛢️ ARAB SAUDI mulai terima pembayaran minyak pakai BTC!", effect: { btc: 1.7, all: 1.3 }, sMod: { btc: -20 } },
    { txt: "📈 MicroStrategy kembali memborong 500 BTC.", effect: { btc: 1.1 }, sMod: { btc: -5 } },
    { txt: "🎮 Game NFT baru di jaringan Solana viral.", effect: { sol: 1.2 }, sMod: { sol: -20 } },
    { txt: "💰 Inflasi AS turun, The Fed hentikan kenaikan suku bunga.", effect: { all: 1.15 }, sMod: { all: -0.05 } },
    { txt: "🐳 Whale misterius memindahkan 1 Triliun PEPE ke wallet dingin.", effect: { pepe: 1.3 }, sMod: { pepe: -500 } },
    { txt: "🟢 Google Cloud menjadi validator jaringan Ethereum.", effect: { eth: 1.2 }, sMod: { eth: -10 } },
    { txt: "📱 Apple izinkan fitur NFT di App Store.", effect: { eth: 1.1, sol: 1.1 }, sMod: { eth: -5 } },
    { txt: "💳 VISA luncurkan kartu debit crypto global.", effect: { all: 1.1 }, sMod: { all: -0.1 } },
    { txt: "📉 Profit Taking: Trader jangka pendek mulai menjual aset.", effect: { all: 0.95 }, sMod: { all: 0.05 } },
    { txt: "⚠️ Jaringan Solana macet (congestion) selama 4 jam.", effect: { sol: 0.85 }, sMod: { sol: 30 } },
    { txt: "📉 Pemerintah AS menjual Bitcoin hasil sitaan Silk Road.", effect: { btc: 0.85 }, sMod: { btc: 10 } },
    { txt: "🏦 Binance dituntut oleh regulator di Eropa.", effect: { all: 0.9 }, sMod: { all: 0.1 } },
    { txt: "🐕 Hype koin meme mereda, investor beralih ke saham.", effect: { doge: 0.8, pepe: 0.8 }, sMod: { doge: 200, pepe: 1000 } },
    { txt: "🔌 Mining Difficulty naik, penambang kecil gulung tikar.", effect: { btc: 0.9 }, sMod: { btc: 5 } },
    { txt: "🗣️ Tokoh ekonomi kritik dampak lingkungan Bitcoin.", effect: { btc: 0.92 }, sMod: { btc: 2 } },
    { txt: "🚨 HACK ALERT: Bridge penghubung Ethereum dieksploitasi!", effect: { eth: 0.6 }, sMod: { eth: 50 } },
    { txt: "📉 MT GOX mulai mengembalikan ribuan BTC ke kreditur (Dump Incoming!)", effect: { btc: 0.7 }, sMod: { btc: 20 } },
    { txt: "☠️ RUG PULL: Developer token meme kabur membawa likuiditas!", effect: { pepe: 0.4, doge: 0.5 }, sMod: { pepe: 5000, doge: 500 } },
    { txt: "🚫 INDIA & RUSIA kompak melarang total aset crypto!", effect: { all: 0.6 }, sMod: { all: 0.3 } },
    { txt: "📉 FTX 2.0: Bursa crypto besar bangkrut, user panik!", effect: { all: 0.5 }, sMod: { all: 0.4 } },
    { txt: "📉 Tether (USDT) kehilangan peg $1, pasar chaos!", effect: { all: 0.4 }, sMod: { all: 0.5 } },
    { txt: "⚖️ Sidang SEC vs Ripple ditunda, pasar bingung.", effect: { all: 1.0 }, sMod: { all: 0 } },
    { txt: "⛏️ Difficulty Mining Bitcoin mencapai rekor tertinggi baru.", effect: { btc: 1.05 }, sMod: { btc: -2 } },
    { txt: "🤖 Bot trading mengalami error, harga flash dump lalu pump!", effect: { all: 0.9 }, sMod: { all: -0.1 } },
    { txt: "📊 Volume perdagangan rendah karena hari libur global.", effect: { all: 1.0 }, sMod: { all: 0 } }
];

module.exports = async (command, args, msg, user, db) => {
    // 1. Inisialisasi User (Auto-Heal)
    if (typeof user.balance === 'undefined' || isNaN(user.balance)) user.balance = 0;
    if (typeof user.crypto === 'undefined') user.crypto = {};
    if (typeof user.debt === 'undefined' || isNaN(user.debt)) user.debt = 0;

    // 2. Inisialisasi Market (Database Permanen)
    if (!db.market || !db.market.prices) {
        db.market = {
            lastUpdate: 0, 
            prices: { btc: 4800, eth: 2500, sol: 800, doge: 50, pepe: 5 },
            stocks: { btc: 50, eth: 100, sol: 200, doge: 5000, pepe: 20000 },
            lastStockChange: { btc: 0, eth: 0, sol: 0, doge: 0, pepe: 0 },
            currentNews: "Pasar stabil. Menunggu pembukaan sesi.",
            nextNews: "Rumor: Investor institusi mulai mengakumulasi aset.",
            pendingEffect: {},
            pendingStockMod: {}
        };
        saveDB(db);
    }

    const marketData = db.market;
    const now = Date.now();
    const UPDATE_INTERVAL = 15 * 60 * 1000; 
    const TAX_SELL = 0.02; 
    const MARGIN_INTEREST = 0.05; 

    // 3. LOGIKA UPDATE HARGA (PERGERAKAN LIAR & BULAT)
    if (now - marketData.lastUpdate > UPDATE_INTERVAL) {
        
        for (let k in marketData.prices) {
            // A. Efek Berita (Multiplier Dasar)
            let factor = marketData.pendingEffect.all || marketData.pendingEffect[k] || 1;
            
            // B. Tentukan Tingkat Keliaran (Range Persen Integer)
            let volatilityRange = 20; // Default 20%

            if (k === 'btc' || k === 'eth') volatilityRange = 10; // +/- 10%
            else if (k === 'sol') volatilityRange = 15;           // +/- 15%
            else if (k === 'doge' || k === 'pepe') volatilityRange = 30; // +/- 30% (Sangat Liar)

            // C. Hitung Persentase Acak (Bilangan Bulat)
            let percentChange = Math.floor(Math.random() * (volatilityRange * 2 + 1)) - volatilityRange;
            
            // D. Terapkan Harga (KELIPATAN/COMPOUNDING)
            let multiplier = 1 + (percentChange / 100);
            let rawPrice = marketData.prices[k] * factor * multiplier;
            
            // PEMBULATAN KE BAWAH (FLOOR)
            marketData.prices[k] = Math.floor(rawPrice);
            
            // CEGAH HARGA 0 (Minimal 1)
            if (marketData.prices[k] < 1) marketData.prices[k] = 1;

            // E. Update Stok (Acak Liar -20 s/d +20)
            let sMod = marketData.pendingStockMod?.all || marketData.pendingStockMod?.[k] || 0;
            let actualChange = (sMod < 1 && sMod > -1 && sMod !== 0) ? Math.floor(marketData.stocks[k] * sMod) : sMod;
            actualChange += (Math.floor(Math.random() * 41) - 20);
            
            marketData.lastStockChange[k] = actualChange; 
            marketData.stocks[k] = Math.max(5, marketData.stocks[k] + actualChange);
        }

        // Bunga Hutang
        Object.keys(db.users).forEach(id => {
            let u = db.users[id];
            if (u.debt > 0) {
                u.debt = Math.floor(u.debt * (1 + MARGIN_INTEREST));
                let assetVal = 0;
                if (u.crypto) for (let [k, v] of Object.entries(u.crypto)) assetVal += v * (marketData.prices[k] || 0);
                if (u.debt > (assetVal + (u.balance || 0))) {
                    u.crypto = {}; u.balance = 0; u.debt = 0; 
                }
            }
        });
        
        // Ganti Berita
        marketData.currentNews = marketData.nextNews;
        const randomNews = newsPool[Math.floor(Math.random() * newsPool.length)];
        marketData.nextNews = randomNews.txt;
        marketData.pendingEffect = randomNews.effect;
        marketData.pendingStockMod = randomNews.sMod;

        marketData.lastUpdate = now;
        saveDB(db);
    }

    // COMMAND !market
    if (command === 'market') {
        let timeLeft = UPDATE_INTERVAL - (now - marketData.lastUpdate);
        if (timeLeft < 0) timeLeft = 0;
        let minutesLeft = Math.floor(timeLeft / 60000);
        let secondsLeft = Math.floor((timeLeft % 60000) / 1000);

        let txt = `📊 *BURSA CRYPTO* 🚀\n━━━━━━━━━━━━━━\n`;
        for (let k in marketData.prices) {
            let s = Math.floor(marketData.stocks[k]);
            let chg = marketData.lastStockChange[k];
            
            // Format Harga Bulat
            let priceStr = fmt(marketData.prices[k]);
            let icon = chg >= 0 ? '📈' : '📉'; 

            txt += `${icon} *${k.toUpperCase()}* : 💰${priceStr}\n`;
            txt += `   └ Stok: ${fmt(s)} (${chg >= 0 ? '+' : ''}${chg})\n`;
        }
        txt += `━━━━━━━━━━━━━━\n📢 BERITA: "${marketData.currentNews}"\n🔮 PREDIKSI: "${marketData.nextNews}"\n\n⏳ Update: *${minutesLeft}m ${secondsLeft}s*\n💰 Saldo: 💰${fmt(user.balance)}`;
        return msg.reply(txt);
    }

    // 5. COMMAND !BUYCRYPTO (!buycrypto btc 0.5 atau !buycrypto btc all)
    if (command === 'buycrypto') {
        const koin = args[0]?.toLowerCase();
        
        if (!marketData.prices[koin]) return msg.reply("❌ Koin tidak valid. Cek !market");

        let jml = 0;
        let total = 0;

        // FITUR BELI ALL
        if (args[1]?.toLowerCase() === 'all') {
            const maxBeli = user.balance / marketData.prices[koin];
            jml = parseFloat(maxBeli.toFixed(4)); // Max 4 desimal
            if (jml > marketData.stocks[koin]) jml = marketData.stocks[koin]; // Cek stok
        } else {
            jml = parseFloat(args[1]?.replace(',', '.')); 
        }
        
        if (isNaN(jml) || jml <= 0) return msg.reply("❌ Contoh: !buycrypto btc 0.5 atau !buycrypto btc all");
        
        const pricePerCoin = marketData.prices[koin];
        total = Math.floor(pricePerCoin * jml); // Total bayar dibulatkan
        
        if (user.balance < total) return msg.reply(`❌ Saldo kurang! Butuh: 💰${fmt(total)}`);
        if (marketData.stocks[koin] < jml) return msg.reply(`❌ Stok pasar habis!`);

        user.balance -= total; 
        marketData.stocks[koin] -= jml;
        user.crypto[koin] = (user.crypto[koin] || 0) + jml;
        saveDB(db);
        return msg.reply(`✅ *BELI SUKSES*\nBeli: ${jml} ${koin.toUpperCase()}\nTotal: 💰${fmt(total)}`);
    }

    // 6. COMMAND !SELLCRYPTO (!sellcrypto btc 0.5 atau !sellcrypto btc all)
    if (command === 'sellcrypto') {
        const koin = args[0]?.toLowerCase();
        
        if (!user.crypto?.[koin]) return msg.reply(`❌ Kamu tidak punya aset ${koin?.toUpperCase()}!`);

        let jml = 0;

        // FITUR JUAL ALL
        if (args[1]?.toLowerCase() === 'all') {
            jml = user.crypto[koin];
        } else {
            jml = parseFloat(args[1]?.replace(',', '.'));
        }

        if (isNaN(jml) || jml <= 0) return msg.reply("❌ Contoh: !sellcrypto btc 0.5 atau !sellcrypto btc all");
        if (user.crypto[koin] < jml) return msg.reply(`❌ Aset tidak cukup! Punya: ${user.crypto[koin]}`);

        const bruto = marketData.prices[koin] * jml;
        const pajak = bruto * TAX_SELL;
        const neto = Math.floor(bruto - pajak); // Hasil jual dibulatkan

        user.crypto[koin] -= jml;
        
        // Hapus key jika aset 0 biar rapi
        if (user.crypto[koin] <= 0.000001) delete user.crypto[koin];

        user.balance += neto; 
        marketData.stocks[koin] += jml;
        saveDB(db);
        return msg.reply(`✅ *JUAL SUKSES*\nTerima: 💰${fmt(neto)} (Pajak 2%)`);
    }

    // 7. COMMAND !MINING
    if (command === 'mining' || command === 'mine') {
        const COOLDOWN = 450000; 
        if (now - (user.lastMining || 0) < COOLDOWN) {
            return msg.reply(`⏳ Mesin panas! Tunggu ${Math.floor((COOLDOWN - (now - user.lastMining)) / 60000)} menit lagi.`);
        }

        const rand = Math.random() * 100;
        let coin = 'pepe', rarity = 'Common';
        if (rand < 2) { coin = 'btc'; rarity = '🔥 LEGENDARY'; }
        else if (rand < 10) { coin = 'eth'; rarity = '🟣 EPIC'; }
        else if (rand < 30) { coin = 'sol'; rarity = '🔵 RARE'; }
        else if (rand < 60) { coin = 'doge'; rarity = '🟢 UNCOMMON'; }
        
        const goldVal = Math.floor(Math.random() * 1850) + 150; 
        const qty = goldVal / marketData.prices[coin]; // Qty tetap desimal agar adil

        user.crypto[coin] = (user.crypto[coin] || 0) + qty;
        user.lastMining = now;
        saveDB(db);

        // Tampilkan 4 desimal untuk qty koin
        let qDisplay = qty.toLocaleString('id-ID', { maximumFractionDigits: 6 });
        return msg.reply(`⛏️ *MINING BERHASIL!* (${rarity})\n💎 Dapat: ${qDisplay} ${coin.toUpperCase()}\n💰 Nilai Setara: 💰${fmt(goldVal)}`);
    }

    // 8. COMMAND PORTOFOLIO
    if (command === 'pf' || command === 'portofolio') {
        let txt = `💰 *PORTOFOLIO ASET*\n\n`;
        let assetTotal = 0;
        for (let [k, v] of Object.entries(user.crypto)) {
            if (v > 0.0001) {
                let val = Math.floor(v * marketData.prices[k]); // Nilai aset dibulatkan
                assetTotal += val;
                
                // Format jumlah koin dengan koma (ID) tapi maksimal 4 desimal
                let qtyDisplay = v.toLocaleString('id-ID', { maximumFractionDigits: 4 });
                
                txt += `🔸 *${k.toUpperCase()}*: ${qtyDisplay} (≈💰${fmt(val)})\n`;
            }
        }
        txt += `\n💵 Tunai: 💰${fmt(user.balance)}\n📊 Total Kekayaan: 💰${fmt(assetTotal + user.balance - user.debt)}`;
        return msg.reply(txt);
    }
    
    // 9. COMMAND TOP ranking crypto
    if (command === 'topcrypto' || command === 'top') {
        let consolidated = {};
        Object.keys(db.users).forEach(id => {
            let u = db.users[id];
            let cleanId = id.replace(/:[0-9]+/, ''); 
            let assets = 0;
            if (u.crypto) for (let [k, v] of Object.entries(u.crypto)) assets += v * (marketData.prices[k] || 0);
            let totalWealth = (u.balance || 0) + assets - (u.debt || 0);

            if (!consolidated[cleanId]) consolidated[cleanId] = { id: cleanId, originalId: id, total: 0 };
            consolidated[cleanId].total += totalWealth;
        });

        const top = Object.values(consolidated).sort((a, b) => b.total - a.total).slice(0, 5);
        let res = `🏆 *TOP 5 SULTAN* 🏆\n\n` + top.map((u, i) => `${i+1}. @${u.id.split('@')[0]} - 💰${fmt(u.total)}`).join('\n');
        
        // Mention di Baileys
        const chat = await msg.getChat();
        await chat.sendMessage(res, { mentions: top.map(u => u.originalId) });
    }

    // 10. COMMAND MARGIN
    if (command === 'margin') {
        const koin = args[0]?.toLowerCase();
        const jml = parseFloat(args[1]?.replace(',', '.'));
        if (!marketData.prices[koin] || isNaN(jml) || jml <= 0) return msg.reply("❌ Format: !margin btc 0.1");
        
        const biaya = Math.floor(marketData.prices[koin] * jml);
        if ((user.debt + biaya) > (user.balance * 2 + 1000)) return msg.reply("❌ Limit hutang habis.");

        user.debt = (user.debt || 0) + biaya;
        user.crypto[koin] = (user.crypto[koin] || 0) + jml;
        saveDB(db);
        return msg.reply(`⚠️ Hutang 💰${fmt(biaya)} untuk beli aset.`);
    }

    if (command === 'paydebt') {
        const bayar = parseInt(args[0]);
        const nominal = Math.min(isNaN(bayar) ? 0 : bayar, user.debt || 0);
        if (nominal <= 0) return msg.reply("❌ Masukkan nominal valid.");
        if (user.balance < nominal) return msg.reply("❌ Saldo kurang.");
        
        user.balance -= nominal;
        user.debt -= nominal;
        saveDB(db);
        return msg.reply(`✅ Hutang lunas 💰${fmt(nominal)}. Sisa: 💰${fmt(user.debt)}`);
    }

    // 11. COMMAND MIGRASI
    if (command === 'migrasi' || command === 'gabungakun') {
        const targetJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const senderId = msg.key.remoteJid || msg.author; 

        if (!targetJid || targetJid === senderId) return msg.reply("❌ Tag akun utama! Contoh: `!migrasi @628xxx`");

        if (!db.users[targetJid]) db.users[targetJid] = { balance: 0, debt: 0, xp: 0, level: 1, crypto: {} };
        const targetUser = db.users[targetJid];

        targetUser.balance = (targetUser.balance || 0) + (user.balance || 0);
        targetUser.debt = (targetUser.debt || 0) + (user.debt || 0);
        targetUser.xp = (targetUser.xp || 0) + (user.xp || 0);
        targetUser.level = Math.max(targetUser.level, user.level);
        
        for (let [k, v] of Object.entries(user.crypto || {})) {
            targetUser.crypto[k] = (targetUser.crypto[k] || 0) + v;
        }

        delete db.users[senderId];
        saveDB(db);

        const chat = await msg.getChat();
        await chat.sendMessage(`✅ Migrasi ke @${targetJid.split('@')[0]} berhasil.`, { mentions: [targetJid] });
    }
};
