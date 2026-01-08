require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Variabel penampung data di RAM
let localData = {
    users: {},
    groups: {},
    chats: {},
    settings: {}
};

// Pastikan variabel ini konsisten namanya
const dbPath = path.join(__dirname, '../database/db.json');

// Fungsi 1: Load Database (Pengganti connectToCloud)
// Kita biarkan namanya connectToCloud biar index.js kamu gak error
async function connectToCloud() {
    console.log("🔄 Memuat database lokal...");
    try {
        // Cek apakah file ada?
        if (fs.existsSync(dbPath)) {
            const data = fs.readFileSync(dbPath, 'utf8');
            localData = JSON.parse(data);
            console.log("✅ Database lokal berhasil dimuat!");
        } else {
            // Jika tidak ada, buat file baru dengan struktur default
            console.log("ℹ️ Database kosong. Membuat file baru...");
            saveDB(localData);
        }
    } catch (err) {
        console.error("❌ Gagal memuat database lokal:", err.message);
        // Jangan reset ke {} kosong, bahaya. Tetap pakai struktur default.
    }
    return localData;
}

// Fungsi 2: Ambil Data
const loadDB = () => localData;

// Fungsi 3: Simpan Data
const saveDB = async (data) => {
    // Update data di memori
    if (data) localData = data;
    
    try {
        // Tulis ke file (gunakan dbPath, bukan dbFilePath)
        fs.writeFileSync(dbPath, JSON.stringify(localData, null, 2));
        // console.log("💾 DB Saved."); // Komentar biar log gak berisik
    } catch (err) {
        console.error("⚠️ Gagal menyimpan database lokal:", err.message);
    }
};

// Fungsi 4: Quest Progress (Logic Game)
const addQuestProgress = (user, questId) => {
    if (!user.quest || !user.quest.daily) return null;
    
    // Cari quest berdasarkan ID
    const quest = user.quest.daily.find(q => q.id === questId);
    
    // Cek kondisi
    if (quest && !quest.claimed && quest.progress < quest.target) {
        quest.progress++; // Tambah progress
        
        // Cek apakah selesai?
        if (quest.progress >= quest.target) {
            return `🎉 Quest *${quest.name}* Selesai! Ketik !daily klaim untuk hadiah.`;
        }
    }
    return null;
};

module.exports = { connectToCloud, loadDB, saveDB, addQuestProgress };