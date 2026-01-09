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

    // 2. Inisialisasi Market (Database Permanen & Hibrida)
    if (!db.market || !db.market.prices) {
        db.market = {
            lastUpdate: 0, 
            prices: { btc: 4800, eth: 2500, sol: 800, doge: 50, pepe: 5 },
            stocks: { btc: 50, eth: 100, sol: 200, doge: 5000, pepe: 20000 },
            lastStockChange: { btc: 0, eth: 0, sol: 0, doge: 0, pepe: 0 },
            currentNews: "Pasar stabil. Menunggu pembukaan sesi.",
            nextNews: "Rumor: Investor institusi mulai mengakumulasi aset.",
            pendingEffect: {},
            pendingStockMod: {},
            lastPriceUpdate: 0, // Timer Harga
            lastStockUpdate: 0  // Timer Stok
        };
        saveDB(db);
    }
    
    // Safety check field timer (untuk user lama)
    if (typeof db.market.lastPriceUpdate === 'undefined') db.market.lastPriceUpdate = 0;
    if (typeof db.market.lastStockUpdate === 'undefined') db.market.lastStockUpdate = 0;

    const marketData = db.market;
    const now = Date.now();
    
    // 🔥 KONFIGURASI WAKTU HIBRIDA
    const PRICE_INTERVAL = 15 * 60 * 1000; // Harga Update: 15 Menit
    const STOCK_INTERVAL = 3 * 60 * 1000;  // Stok Update: 3 Menit
    
    const TAX_SELL = 0.02; 
    const MARGIN_INTEREST = 0.05; 

    // ==========================================
    // A. LOGIKA UPDATE HARGA (Setiap 15 Menit)
    // ==========================================
    if (now - marketData.lastPriceUpdate > PRICE_INTERVAL) {
        
        for (let k in marketData.prices) {
            // 1. Hitung Volatilitas Normal
            let factor = marketData.pendingEffect.all || marketData.pendingEffect[k] || 1;
            let volatilityRange = (k === 'doge' || k === 'pepe') ? 30 : 15;
            let percentChange = Math.floor(Math.random() * (volatilityRange * 2 + 1)) - volatilityRange;
            let multiplier = 1 + (percentChange / 100);
            
            let rawPrice = marketData.prices[k] * factor * multiplier;
            let newPrice = Math.max(1, Math.floor(rawPrice));

            // 🔥 2. FITUR AUTO RECOVERY (ANTI-BANGKRUT)
            // Jika harga anjlok parah (< 10), Bandar pompa harga naik!
            if (newPrice < 10) {
                if (Math.random() < 0.8) { // 80% Peluang
                    newPrice += Math.floor(Math.random() * 15) + 5; // Naik 5-20 poin
                }
            }
            // Khusus Koin Besar (BTC/ETH/SOL) jangan biarkan di bawah 100
            else if ((k === 'btc' || k === 'eth' || k === 'sol') && newPrice < 100) {
                 newPrice += Math.floor(Math.random() * 50) + 20;
            }

            marketData.prices[k] = newPrice;
        }

        // Bunga Hutang
        Object.keys(db.users).forEach(id => {
            let u = db.users[id];
            if (u.debt > 0) u.debt = Math.floor(u.debt * (1 + MARGIN_INTEREST));
        });
        
        // Ganti Berita
        marketData.currentNews = marketData.nextNews;
        const randomNews = newsPool[Math.floor(Math.random() * newsPool.length)];
        marketData.nextNews = randomNews.txt;
        marketData.pendingEffect = randomNews.effect;
        marketData.pendingStockMod = randomNews.sMod;

        marketData.lastPriceUpdate = now;
        saveDB(db);
    }

    // ==========================================
    // B. LOGIKA UPDATE STOK (Setiap 3 Menit)
    // ==========================================
    if (now - marketData.lastStockUpdate > STOCK_INTERVAL) {
        
        for (let k in marketData.prices) {
            // Ambil efek stok dari berita aktif
            let sMod = marketData.pendingStockMod?.all || marketData.pendingStockMod?.[k] || 0;
            
            // Perubahan Stok Random
            let actualChange = (sMod < 1 && sMod > -1 && sMod !== 0) ? Math.floor(marketData.stocks[k] * sMod) : sMod;
            actualChange += (Math.floor(Math.random() * 41) - 20); 

            // 🔥 3. FITUR BANDAR RESTOCK (ANTI-LANGKA)
            // Jika stok kritis (< 20), suntik stok baru!
            if (marketData.stocks[k] < 20) {
                const suntikan = Math.floor(Math.random() * 50) + 30;
                actualChange += suntikan;
            }

            marketData.lastStockChange[k] = actualChange; 
            marketData.stocks[k] = Math.max(5, marketData.stocks[k] + actualChange);
        }

        marketData.lastStockUpdate = now;
        saveDB(db);
    }

    // COMMAND: MARKET
    if (command === 'market') {
        let priceTime = Math.max(0, PRICE_INTERVAL - (now - marketData.lastPriceUpdate));
        let pMin = Math.floor(priceTime / 60000);
        let pSec = Math.floor((priceTime % 60000) / 1000);

        let stockTime = Math.max(0, STOCK_INTERVAL - (now - marketData.lastStockUpdate));
        let sMin = Math.floor(stockTime / 60000);

        let txt = `📊 *BURSA CRYPTO* 🚀\n━━━━━━━━━━━━━━\n`;
        for (let k in marketData.prices) {
            let s = Math.floor(marketData.stocks[k]);
            let chg = marketData.lastStockChange[k];
            let icon = chg >= 0 ? '📈' : '📉'; 
            // Icon paket jika baru disuntik bandar
            let suntikIcon = (chg > 25) ? '📦' : ''; 

            txt += `${icon} *${k.toUpperCase()}* : 💰${fmt(marketData.prices[k])}\n`;
            txt += `   └ Stok: ${fmt(s)} (${chg >= 0 ? '+' : ''}${chg}) ${suntikIcon}\n`;
        }
        
        txt += `━━━━━━━━━━━━━━\n📢 NEWS: "${marketData.currentNews}"\n🔮 NEXT: "${marketData.nextNews}"\n\n`;
        txt += `⏳ Harga: *${pMin}m ${pSec}s*\n📦 Stok: *${sMin}m*\n💰 Saldo: 💰${fmt(user.balance)}`;
        
        return msg.reply(txt);
    }

    // COMMAND: BUY
    if (command === 'buycrypto') {
        const koin = args[0]?.toLowerCase();
        if (!marketData.prices[koin]) return msg.reply("❌ Koin salah.");

        let jml = 0;
        if (args[1]?.toLowerCase() === 'all') {
            if (marketData.prices[koin] <= 0) return msg.reply("❌ Error harga 0.");
            jml = Math.floor(user.balance / marketData.prices[koin]);
            if (jml > marketData.stocks[koin]) jml = marketData.stocks[koin];
        } else {
            jml = parseFloat(args[1]?.replace(',', '.')); 
        }
        
        if (isNaN(jml) || jml <= 0) return msg.reply("❌ Jumlah salah.");
        const total = Math.floor(marketData.prices[koin] * jml);
        
        if (user.balance < total) return msg.reply(`❌ Uang kurang! Butuh: 💰${fmt(total)}`);
        if (marketData.stocks[koin] < jml) return msg.reply(`❌ Stok kurang! Sisa: ${fmt(marketData.stocks[koin])}`);

        user.balance -= total; 
        marketData.stocks[koin] -= jml;
        user.crypto[koin] = (user.crypto[koin] || 0) + jml;
        saveDB(db);
        return msg.reply(`✅ Beli ${jml} ${koin.toUpperCase()} seharga 💰${fmt(total)}`);
    }

    // COMMAND: SELL
    if (command === 'sellcrypto') {
        const koin = args[0]?.toLowerCase();
        if (!user.crypto?.[koin]) return msg.reply("❌ Gak punya aset ini.");
        let jml = (args[1]?.toLowerCase() === 'all') ? user.crypto[koin] : parseFloat(args[1]?.replace(',', '.'));
        if (isNaN(jml) || jml <= 0 || user.crypto[koin] < jml) return msg.reply("❌ Aset tidak cukup.");
        const neto = Math.floor((marketData.prices[koin] * jml) * (1 - TAX_SELL));
        user.crypto[koin] -= jml;
        if (user.crypto[koin] <= 0.000001) delete user.crypto[koin];
        user.balance += neto; marketData.stocks[koin] += jml; saveDB(db);
        return msg.reply(`✅ Jual ${jml} ${koin.toUpperCase()} dapat 💰${fmt(neto)}`);
    }

    // MINING
    if (command === 'mining' || command === 'mine') {
        const COOLDOWN = 5 * 60 * 1000; 
        if (now - (user.lastMining || 0) < COOLDOWN) return msg.reply(`⏳ Tunggu ${Math.ceil((COOLDOWN - (now - user.lastMining))/60000)} menit lagi.`);
        
        const rand = Math.random() * 100;
        let coin = 'pepe', rarity = 'Common';
        if (rand < 2) { coin = 'btc'; rarity = '🔥 LEGENDARY'; }
        else if (rand < 10) { coin = 'eth'; rarity = '🟣 EPIC'; }
        else if (rand < 30) { coin = 'sol'; rarity = '🔵 RARE'; }
        else if (rand < 60) { coin = 'doge'; rarity = '🟢 UNCOMMON'; }
        
        const goldVal = Math.floor(Math.random() * 1850) + 150; 
        const qty = goldVal / Math.max(1, marketData.prices[coin]); 

        user.crypto[coin] = (user.crypto[coin] || 0) + qty;
        user.lastMining = now; saveDB(db);
        return msg.reply(`⛏️ *DAPAT:* ${qty.toLocaleString('id-ID', {maxFractionDigits:4})} ${coin.toUpperCase()} (Setara 💰${fmt(goldVal)})`);
    }

    // COMMAND LAIN (PF, TOP, MIGRASI)
    if (command === 'pf' || command === 'portofolio') {
        let txt = `💰 *PORTOFOLIO*\n`; let total = 0;
        for (let [k, v] of Object.entries(user.crypto)) {
            if (v > 0.0001) {
                let val = Math.floor(v * marketData.prices[k]); total += val;
                txt += `🔸 ${k.toUpperCase()}: ${v.toLocaleString('id-ID', {maxFractionDigits:4})} (≈💰${fmt(val)})\n`;
            }
        }
        txt += `\n💵 Tunai: 💰${fmt(user.balance)}\n💸 Hutang: 💰${fmt(user.debt)}\n📊 Bersih: 💰${fmt(total + user.balance - user.debt)}`;
        return msg.reply(txt);
    }

    if (command === 'topcrypto' || command === 'top') {
        let list = Object.entries(db.users).map(([id, u]) => {
            let ast = 0; if (u.crypto) for (let [k,v] of Object.entries(u.crypto)) ast += v * (marketData.prices[k]||0);
            return { id, total: (u.balance||0) + ast - (u.debt||0) };
        }).sort((a,b) => b.total - a.total).slice(0, 5);
        let txt = `🏆 *TOP SULTAN*\n` + list.map((x, i) => `${i+1}. @${x.id.split('@')[0]} - 💰${fmt(x.total)}`).join('\n');
        const chat = await msg.getChat(); await chat.sendMessage(txt, { mentions: list.map(x => x.id) });
    }

    // --- FITUR MARGIN (DIPERBAIKI) ---
    if (command === 'margin' || command === 'ngutang') {
        const koin = args[0]?.toLowerCase();
        if (!marketData.prices[koin]) return msg.reply("❌ Koin salah. Contoh: !margin btc 0.1");

        // 1. Hitung Limit (5x Saldo + 5000)
        const limitHutang = (user.balance * 5) + 5000;
        const sisaLimit = limitHutang - user.debt;
        
        if (sisaLimit <= 0) return msg.reply(`❌ Limit hutang habis! (Max: 💰${fmt(limitHutang)})`);

        let jml = 0;
        // 2. Logic "ALL" untuk Margin
        if (args[1]?.toLowerCase() === 'all') {
            // Margin All: Beli sebanyak sisa limit
            jml = sisaLimit / marketData.prices[koin];
            jml = Math.floor(jml * 10000) / 10000; // 4 desimal
        } else {
            jml = parseFloat(args[1]?.replace(',', '.'));
        }

        if (isNaN(jml) || jml <= 0) return msg.reply("❌ Jumlah salah.");

        const biaya = Math.floor(marketData.prices[koin] * jml);
        
        if (biaya > sisaLimit) return msg.reply(`❌ Melebihi limit! Kamu cuma bisa ngutang 💰${fmt(sisaLimit)} lagi.`);

        user.debt += biaya;
        user.crypto[koin] = (user.crypto[koin] || 0) + jml;
        saveDB(db);
        return msg.reply(`⚠️ *NGUTANG SUKSES*\nBeli: ${jml} ${koin.toUpperCase()}\nHutang Baru: 💰${fmt(biaya)}\nTotal Hutang: 💰${fmt(user.debt)}`);
    }

    // --- FITUR PAYDEBT (DIPERBAIKI) ---
    if (command === 'paydebt' || command === 'bayar') {
        const totalHutang = user.debt || 0;
        if (totalHutang <= 0) return msg.reply("✅ Kamu bebas hutang! Aman.");

        let bayar = 0;
        if (args[0]?.toLowerCase() === 'all') {
            bayar = totalHutang;
        } else {
            // Hapus titik agar parsing angka benar (misal 10.000 jadi 10000)
            bayar = parseInt(args[0]?.replace(/[.,]/g, '') || '0');
        }

        if (isNaN(bayar) || bayar <= 0) return msg.reply("❌ Nominal salah. Contoh: !bayar 1000 atau !bayar all");
        
        // Cek Saldo
        if (user.balance < bayar) return msg.reply(`❌ Saldo kurang! Butuh 💰${fmt(bayar)}`);

        // Jika bayar lebih dari hutang, bayar pas hutangnya saja
        if (bayar > totalHutang) bayar = totalHutang;

        user.balance -= bayar;
        user.debt -= bayar;
        saveDB(db);
        return msg.reply(`✅ Lunasin hutang 💰${fmt(bayar)}. Sisa Hutang: 💰${fmt(user.debt)}`);
    }

    if (command === 'migrasi') {
        const trg = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!trg) return msg.reply("❌ Tag tujuan.");
        if (!db.users[trg]) db.users[trg] = { balance:0, debt:0, xp:0, level:1, crypto:{} };
        db.users[trg].balance += user.balance; db.users[trg].debt += user.debt;
        for (let [k,v] of Object.entries(user.crypto)) db.users[trg].crypto[k] = (db.users[trg].crypto[k]||0)+v;
        delete db.users[msg.key.remoteJid]; saveDB(db);
        const chat = await msg.getChat(); await chat.sendMessage("✅ Migrasi sukses.", {mentions:[trg]});
    }
};
