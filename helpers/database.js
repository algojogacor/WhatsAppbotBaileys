require('dotenv').config();
const couchbase = require('couchbase');

let collection = null;
let localData = {}; 

async function connectToCloud() {
    console.log("🔄 Menghubungkan ke Couchbase Capella...");
    
    // Ambil data rahasia dari file .env
    const clusterConnStr = process.env.DB_URL;
    const username = process.env.DB_USER;
    const password = process.env.DB_PASS;
    const bucketName = process.env.BUCKET_NAME;

    if (!clusterConnStr) {
        console.error("❌ ERROR: File .env belum diisi!");
        return;
    }

    try {
        // 1. Konek ke Cluster
        const cluster = await couchbase.connect(clusterConnStr, {
            username: username,
            password: password,
            configProfile: 'wanDevelopment', // Mode internet publik
        });

        // 2. Buka Bucket
        const bucket = cluster.bucket(bucketName);
        collection = bucket.defaultCollection();

        // 3. Coba ambil data lama
        try {
            const result = await collection.get('data_bot_utama');
            localData = result.content;
            console.log("✅ SUKSES: Data lama berhasil dimuat dari Cloud!");
        } catch (e) {
            console.log("ℹ️ Database Cloud masih kosong. Membuat data baru...");
            localData = {}; 
        }

    } catch (err) {
        console.error("❌ GAGAL KONEK: Pastikan Username/Pass di .env benar!", err.message);
    }
}

const loadDB = () => localData;

const saveDB = async (data) => {
    localData = data;
    // Upload background process
    if (collection) {
        collection.upsert('data_bot_utama', localData).catch(err => console.error("⚠️ Gagal Save Cloud:", err.message));
    }
};

// Fungsi bantuan Quest (biar tidak error di index.js)
const addQuestProgress = (user, questId) => {
    if (!user.quest || !user.quest.daily) return null;
    const quest = user.quest.daily.find(q => q.id === questId);
    if (quest && !quest.claimed && quest.progress < quest.target) {
        quest.progress++;
        if (quest.progress >= quest.target) {
            return `🎉 Quest *${quest.name}* Selesai! Ketik !daily klaim untuk hadiah.`;
        }
    }
    return null;
};

module.exports = { connectToCloud, loadDB, saveDB, addQuestProgress };