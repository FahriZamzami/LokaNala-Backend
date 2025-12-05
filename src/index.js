import express from 'express';
import dotenv from 'dotenv';
import router from './router.js';
import { prisma } from './config/prismaclient.js'; 
import { fileURLToPath } from "url";
import path from "path"; // <-- 1. Tambahkan import path

dotenv.config();

// 2. Konfigurasi __filename dan __dirname manual untuk ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

// Sekarang path dan __dirname sudah bisa digunakan
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

app.get('/', (req, res) => {
    res.send('Server Prisma berjalan 🚀');
});

app.get('/ping', (req, res) => {
    res.send('pong');
});

app.get('/test-db', async (req, res) => {
    try {
        await prisma.$connect();
        res.send('Koneksi ke database berhasil!');
    } catch (err) {
        res.status(500).send('Koneksi gagal: ' + err.message);
    }
});

app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => 
    console.log(`Server berjalan di port ${PORT}`)
);

app.set('trust proxy', true);