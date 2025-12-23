import jwt from "jsonwebtoken";
import { prisma } from "../config/prismaclient.js";
import { generateUrls } from "./product.controller.js";

const JWT_SECRET = process.env.JWT_SECRET || "lokanala_secret";

export const registerUser = async (req, res) => {
    try {
        const { nama, email, no_telepon, password, fcm_token } = req.body;
        const foto_profile = req.file ? req.file.filename : null;

        // 1. Validasi input wajib
        if (!nama || !email || !no_telepon || !password || !foto_profile) {
            return res.status(400).json({ success: false, message: "Semua data dan foto profil wajib diisi" });
        }

        // 2. Cek apakah email sudah terdaftar
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email sudah digunakan" });
        }

        // 3. Simpan user baru (Password sebaiknya dihash, namun sesuaikan dengan login Anda)
        const newUser = await prisma.user.create({
            data: {
                nama,
                email,
                no_telepon,
                password,
                foto_profile,
                fcm_token: fcm_token || null
            }
        });

        // 4. AUTO LOGIN: Generate JWT Token langsung
        const token = jwt.sign(
            { id_user: newUser.id_user, email: newUser.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            success: true,
            message: "Akun berhasil dibuat",
            token,
            user: {
                id_user: newUser.id_user,
                nama: newUser.nama,
                email: newUser.email,
                no_telepon: newUser.no_telepon,
                foto_profile: generateUrl(newUser.foto_profile, req),
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

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

export const getUserFollowing = async (req, res) => {
    try {
        const userId = req.user.id_user; // Dari middleware auth
        
        // Ambil semua UMKM yang di-follow oleh user ini
        const followingList = await prisma.follow.findMany({
        where: {
            id_user: userId
        },
        include: {
            umkm: {
            include: {
                kategori_umkm: true,
                promo: {
                where: {
                    tanggal_mulai: { lte: new Date() },
                    tanggal_berakhir: { gte: new Date() }
                },
                take: 1, // Ambil 1 promo terbaru saja
                orderBy: {
                    tanggal_mulai: 'desc'
                }
                }
            }
            }
        },
        orderBy: {
            id_follow: 'desc' // Urutkan berdasarkan yang terbaru di-follow
        }
        });

        // Hitung rating untuk setiap UMKM (jika ada)
        const umkmWithRating = await Promise.all(
        followingList.map(async (follow) => {
            const umkm = follow.umkm;
            
            // Hitung rating dari produk-produk UMKM ini
            const products = await prisma.produk.findMany({
            where: { id_umkm: umkm.id_umkm },
            select: { id_produk: true }
            });

            let totalRating = 0;
            let ratingCount = 0;

            for (const product of products) {
            const ratings = await prisma.ulasan.findMany({
                where: { id_produk: product.id_produk },
                select: { rating: true }
            });

            ratings.forEach(r => {
                totalRating += r.rating;
                ratingCount++;
            });
            }

            const avgRating = ratingCount > 0 ? totalRating / ratingCount : null;

            return {
            id_umkm: umkm.id_umkm,
            id_user: umkm.id_user,
            id_kategori_umkm: umkm.id_kategori_umkm,
            nama_umkm: umkm.nama_umkm,
            alamat: umkm.alamat,
            no_telepon: umkm.no_telepon,
            deskripsi: umkm.deskripsi,
            gambar_url: generateUrl(umkm.gambar, req),
            link_lokasi: umkm.link_lokasi,
            tanggal_terdaftar: umkm.tanggal_terdaftar.toISOString(),
            kategori_umkm: umkm.kategori_umkm ? {
                id_kategori_umkm: umkm.kategori_umkm.id_kategori_umkm,
                nama_kategori: umkm.kategori_umkm.nama_kategori,
                deskripsi: umkm.kategori_umkm.deskripsi
            } : null,
            rating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
            promos: umkm.promo.map(promo => ({
                id_promo: promo.id_promo,
                nama_promo: promo.nama_promo,
                deskripsi: promo.deskripsi
            }))
            };
        })
        );

        res.json({
        success: true,
        message: "Berhasil mengambil UMKM yang di-follow",
        data: umkmWithRating
        });
    } catch (error) {
        console.error('Error fetching following:', error);
        res.status(500).json({
        success: false,
        message: "Gagal mengambil UMKM yang di-follow",
        data: null
        });
    }
};