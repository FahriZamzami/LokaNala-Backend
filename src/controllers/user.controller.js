import jwt from "jsonwebtoken";
import { prisma } from "../config/prismaclient.js";

const JWT_SECRET = process.env.JWT_SECRET || "lokanala_secret";

export const loginUser = async (req, res) => {
    const { email, password, fcmToken } = req.body;

    console.log("📥 Login request:", { email, fcmToken });

    try {
        // 1. Cari user
        const user = await prisma.user.findUnique({
        where: { email },
        });

        if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
        }

        // 2. Cek password (sementara plaintext)
        if (user.password !== password) {
        return res.status(401).json({ message: "Password salah" });
        }

        // 3. Update FCM token jika dikirim
        if (fcmToken && fcmToken !== user.fcm_token) {
            await prisma.user.update({
                where: { id_user: user.id_user },
                data: { fcm_token: fcmToken },
            });
        }

        // 4. Generate JWT
        const token = jwt.sign(
        {
            id_user: user.id_user,
            email: user.email,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
        );

        const fotoProfileUrl = generateUrl(user.foto_profile, req);

        // 5. Response
        res.json({
        success: true,
        message: "Login berhasil",
        token,
        user: {
            id_user: user.id_user,
            nama: user.nama,
            email: user.email,
            no_telepon: user.no_telepon,
            foto_profile: fotoProfileUrl,
        },
        });

    } catch (err) {
        console.error("❌ Login error:", err);
        res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server",
        error: err.message,
        });
    }
};

// src/controllers/user.controller.js
export const logoutUser = async (req, res) => {
    try {
        // Logging body mentah untuk memastikan body-parser bekerja
        console.log("📥 [LOGOUT] Raw Body diterima:", req.body);

        const { id_user } = req.body;

        if (!id_user) {
            console.warn("⚠️ [LOGOUT] Request ditolak: id_user kosong/null");
            return res.status(400).json({
                success: false,
                message: "id_user diperlukan dalam body request"
            });
        }

        const numericId = Number(id_user);
        console.log(`🚪 [LOGOUT] Mencoba logout untuk User ID: ${numericId}`);

        // Cek apakah user ada sebelum diupdate
        const userCheck = await prisma.user.findUnique({
            where: { id_user: numericId }
        });

        if (!userCheck) {
            console.error(`❌ [LOGOUT] Gagal: User dengan ID ${numericId} tidak ditemukan di database`);
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan di database"
            });
        }

        // Jalankan update
        await prisma.user.update({
            where: { id_user: numericId },
            data: { fcm_token: null },
        });

        console.log(`✅ [LOGOUT] Berhasil: FCM token dihapus untuk user ${numericId}`);

        res.json({
            success: true,
            message: "Logout berhasil",
        });

    } catch (err) {
        console.error("❌ [LOGOUT] Error fatal saat proses update:", err);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat logout",
            error: err.message,
        });
    }
};  

export const getMyUMKM = async (req, res) => {
    try {
        // 1. Ambil ID User dari Middleware (req.user diset oleh auth.js)
        const userId = req.user.id_user;

        // 2. Query UMKM milik user tersebut
        const myUmkmList = await prisma.uMKM.findMany({
        where: {
            id_user: userId,
        },
        include: {
            // Kita butuh data produk & ulasan untuk menghitung rating rata-rata toko
            produk: {
            select: {
                ulasan: {
                select: {
                    rating: true,
                },
                },
            },
            },
        },
        });

        // 3. Helper URL Gambar Dinamis
        const generateUrl = (filename) => {
        if (!filename) return null;
        if (filename.startsWith("http")) return filename;
        const host = req.get("host");
        const protocol = req.protocol || "http";
        return `${protocol}://${host}/uploads/${filename}`;
        };

        // 4. Format Data untuk Response
        const formattedData = myUmkmList.map((umkm) => {
        // Hitung Rating Rata-rata UMKM (Rata-rata dari semua ulasan di semua produk)
        let totalRating = 0;
        let reviewCount = 0;

        umkm.produk.forEach((prod) => {
            prod.ulasan.forEach((rev) => {
            totalRating += rev.rating;
            reviewCount++;
            });
        });

        const averageRating = reviewCount > 0 ? (totalRating / reviewCount) : 0.0;

        return {
            id: umkm.id_umkm,
            name: umkm.nama_umkm,
            rating: parseFloat(averageRating.toFixed(1)), // Contoh: 4.5
            imageRes: generateUrl(umkm.gambar), // URL Foto Profil UMKM
        };
        });

        res.status(200).json({
        success: true,
        message: "Berhasil mengambil data UMKM Saya",
        data: formattedData,
        });

    } catch (error) {
        console.error("Error getMyUMKM:", error);
        res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server",
        error: error.message,
        });
    }
};

export const generateUrl = (filename, req) => {
    if (!filename) return null;

    const host = req.get("x-forwarded-host") || req.get("host");
    const protocol = req.get("x-forwarded-proto") || req.protocol;

    const BASE_URL = `${protocol}://${host}`;

    if (filename.startsWith("http")) return filename;

    return `${BASE_URL}/uploads/${filename}`;
};