// src/index.js
import express from 'express';
import dotenv from 'dotenv';
import router from './router.js';
import { prisma } from './config/prismaclient.js'; // import PrismaClient dari config

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Tes koneksi utama
app.get('/', (req, res) => {
    res.send('Server Prisma berjalan 🚀');
});

app.get('/ping', (req, res) => {
    res.send('pong');
});


// Tes koneksi ke database
app.get('/test-db', async (req, res) => {
    try {
        await prisma.$connect();
        res.send('Koneksi ke database berhasil!');
    } catch (err) {
        res.status(500).send('Koneksi gagal: ' + err.message);
    }
});

// Gunakan router utama untuk semua endpoint API
app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => 
    console.log(`Server berjalan di port ${PORT}`)
);