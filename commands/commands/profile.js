const { saveDB } = require('../helpers/database');

module.exports = async (command, args, msg, user, db, chat, sock) => {
    const today = new Date().toISOString().split("T")[0];

    // Helper: Tentukan Title berdasarkan Level
    const getTitle = (lvl) => {
        if (lvl >= 100) return "🐲 Dragon Slayer";
        if (lvl >= 50) return "👑 Crypto King";
        if (lvl >= 30) return "🧛 Lord";
        if (lvl >= 20) return "⚔️ Commander";
        if (lvl >= 10) return "🛡️ Warrior";
        if (lvl >= 5) return "🗡️ Soldier";
        return "🥚 Newbie";
    };

    // Ambil Harga Pasar Asli (Real-time)
    const marketPrices = db.market?.prices || { btc: 0, eth: 0, sol: 0, doge: 0, pepe: 0 };

    // Helper Hitung Kekayaan Crypto
    const calculateCryptoWealth = (cryptoData) => {
        let total = 0;
        if (cryptoData) {
            for (let [coin, amount] of Object.entries(cryptoData)) {
                // Gunakan harga dari database market
                const price = marketPrices[coin] || 0; 
                total += Math.floor(amount * price);
            }
        }
        return total;
    };

    // 1. PROFILE USER (!me, !profile)
    if (command === "me" || command === "profile" || command === "level" || command === "status") {
        
        // 1. Cek Buff Aktif
        let buffList = [];
        if (user.buffs) {
            if (user.buffs.xp?.active) buffList.push("⚡ XP Boost");
            if (user.buffs.gacha?.active) buffList.push("🍀 Luck Charm");
        }

        // 2. Hitung Aset
        const cryptoValue = calculateCryptoWealth(user.crypto);
        // Rumus: Uang Tunai + Bank + Aset Crypto - Hutang
        const totalNetWorth = user.balance + (user.bank || 0) + cryptoValue - (user.debt || 0);

        // 3. Info Level
        const xpToNextLevel = user.level * 100;
        
        // 4. Nama
        const name = msg.pushName || "Warga Sipil";

        return msg.reply(
`👤 *IDENTITAS PENGGUNA*
━━━━━━━━━━━━━━━━━
🏷️ Nama: *${name}*
🎖️ Title: *${getTitle(user.level)}*
⭐ Level: *${user.level}*
✨ XP: *${Math.floor(user.xp)} / ${xpToNextLevel}*
━━━━━━━━━━━━━━━━━
💵 Dompet: Rp ${Math.floor(user.balance).toLocaleString('id-ID')}
🏦 Bank: Rp ${(user.bank || 0).toLocaleString('id-ID')}
📈 Aset Crypto: Rp ${cryptoValue.toLocaleString('id-ID')}
💸 Hutang: Rp ${(user.debt || 0).toLocaleString('id-ID')}
💰 *Total Kekayaan: Rp ${totalNetWorth.toLocaleString('id-ID')}*
━━━━━━━━━━━━━━━━━
🎒 Isi Tas: *${user.inv ? user.inv.length : 0}* Item
💊 Buff: ${buffList.length > 0 ? buffList.join(", ") : "_Tidak ada_"}
━━━━━━━━━━━━━━━━━
_Ketik !quest untuk melihat misi harian!_`
        );
    }

    // 2. LEADERBOARD (!rank / !top)
    if (command === "rank" || command === "leaderboard" || command === "top") {
        
        let targetIds = [];
        let titleHeader = "";

        try {
            // LOGIKA FILTER GRUP
            if (chat.isGroup) {
                // Jika di Grup: Ambil daftar anggota grup saja
                const metadata = await sock.groupMetadata(chat.id._serialized);
                targetIds = metadata.participants.map(p => p.id);
                titleHeader = `🏆 *TOP SULTAN GRUP* 🏆\n_(Khusus Member Sini)_`;
            } else {
                // Jika Japri: Ambil semua user di database (Global)
                targetIds = Object.keys(db.users);
                titleHeader = `🌍 *TOP SULTAN GLOBAL* 🏆\n_(Semua Server)_`;
            }

            // Filter & Hitung Kekayaan
            let allPlayers = targetIds
                .filter(id => db.users[id]) // Hanya ambil yg ada di DB bot
                .map(id => {
                    const data = db.users[id];
                    // Hitung Crypto pakai harga REAL-TIME dari database
                    const cVal = calculateCryptoWealth(data.crypto);
                    
                    // Rumus Net Worth Konsisten
                    const netWorth = (data.balance || 0) + (data.bank || 0) + cVal - (data.debt || 0);

                    return {
                        id: id,
                        level: data.level || 1,
                        netWorth: netWorth
                    };
                });

            // Urutkan dari yang terkaya (Net Worth)
            allPlayers.sort((a, b) => b.netWorth - a.netWorth);

            // Ambil Top 10
            const top5 = allPlayers.slice(0, 10);
            
            let text = `${titleHeader}\n━━━━━━━━━━━━━━━━━\n`;
            
            if (top5.length === 0) {
                text += "_Belum ada data member yang main bot di sini._";
            } else {
                top5.forEach((u, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
                    text += `${medal} @${u.id.split('@')[0]}\n`;
                    text += `   └ Lv.${u.level} | Rp ${Math.floor(u.netWorth).toLocaleString('id-ID')}\n`;
                });
            }

            // Cari posisi sendiri
            const myRank = allPlayers.findIndex(u => u.id === (msg.author || msg.from));
            if (myRank !== -1) {
                text += `━━━━━━━━━━━━━━━━━\n👤 Posisi Kamu: #${myRank + 1}`;
            }

            // Kirim dengan Mentions (Agar nama @user jadi biru)
            await chat.sendMessage(text, { mentions: top5.map(u => u.id) });

        } catch (err) {
            console.error("Error Rank:", err);
            // Fallback kalau gagal ambil metadata grup
            msg.reply("⚠️ Gagal mengambil data grup. Coba lagi nanti.");
        }
    }

    // 3. DAFTAR QUEST (!quest)
    if (command === "quest" || command === "misi") {
        if (!user.quest) return msg.reply("❌ Data quest rusak/belum ada.");

        let text = `📜 *PAPAN MISI HARIAN*\n📅 ${today}\n\n`;
        
        // Daily Quests
        user.quest.daily.forEach(q => {
            const percent = Math.min(100, Math.floor((q.progress / q.target) * 100));
            // Visual Bar: [████░░░░░░]
            const completedBlocks = Math.floor(percent / 10);
            const bar = '█'.repeat(completedBlocks) + '░'.repeat(10 - completedBlocks);
            
            const statusIcon = q.claimed ? "✅ Selesai" : (percent >= 100 ? "🎁 SIAP KLAIM" : "🔄 Proses");

            text += `🔹 *${q.name}* (${statusIcon})\n`;
            text += `   ${bar} ${percent}%\n`;
            text += `   Target: ${q.progress}/${q.target} | Reward: 💰${q.reward}\n\n`;
        });

        // Weekly Quest
        if (user.quest.weekly) {
            const w = user.quest.weekly;
            const wPercent = Math.min(100, Math.floor((w.progress / w.target) * 100));
            const wStatus = w.claimed ? "✅ Selesai" : (wPercent >= 100 ? "🎁 SIAP KLAIM" : "🔥 Mingguan");
            
            text += `🏆 *${w.name}* (${wStatus})\n`;
            text += `   Target: ${w.progress}/${w.target} | Reward: 💰${w.reward}\n`;
        }

        text += `\n💡 _Ketik *!claim* untuk mengambil hadiah!_`;
        return msg.reply(text);
    }

    // 4. CLAIM HADIAH (!claim)
    if (command === "claim") {
        if (!user.quest) return;

        let totalGift = 0;
        let totalXP = 0;
        let count = 0;
        const rewardList = [];

        // Loop Cek Daily
        user.quest.daily.forEach(q => {
            if (q.progress >= q.target && !q.claimed) {
                q.claimed = true;
                totalGift += q.reward;
                totalXP += 50; // Bonus XP per quest
                count++;
                rewardList.push(q.name);
            }
        });

        // Cek Weekly
        const w = user.quest.weekly;
        if (w && w.progress >= w.target && !w.claimed) {
            w.claimed = true;
            totalGift += w.reward;
            totalXP += 500;
            count++;
            rewardList.push("🏆 Weekly Warrior");
        }

        if (count === 0) {
            return msg.reply("❌ Tidak ada misi yang siap diklaim.\nSelesaikan misi dulu atau cek *!quest*.");
        }

        user.balance += totalGift;
        user.xp += totalXP;
        saveDB(db);

        return msg.reply(`🎉 *KLAIM BERHASIL!*\n\n✅ Misi Selesai:\n- ${rewardList.join('\n- ')}\n\n🎁 Total Hadiah:\n💰 +Rp ${totalGift.toLocaleString('id-ID')}\n⚡ +${totalXP} XP`);
    }

    // 5. INVENTORY (!inv)
    if (command === "inv" || command === "inventory" || command === "tas") {
        if (!user.inv || user.inv.length === 0) return msg.reply("🎒 Tas kamu kosong melompong.\nBelanja dulu di *!shop*");
        
        const counts = {};
        user.inv.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
        
        let list = `🎒 *ISI TAS PETUALANG*\n━━━━━━━━━━━━━━━━━\n`;
        Object.keys(counts).forEach((item, i) => {
            list += `${i + 1}. *${item.toUpperCase()}* (x${counts[item]})\n`;
        });

        return msg.reply(list);
    }
};
