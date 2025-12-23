import { prisma } from "../config/prismaclient.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../public/uploads");

import { sendFirebaseNotification } from "../utility/firebase.js";
import { countProductRating } from "./rating.controller.js";

// ------------------------------------------------------------------
// HELPER: Generate URL Gambar (Versi Perbaikan & Fail-Safe)
// ------------------------------------------------------------------
export const generateUrls = (filenameString, req) => {
    if (!filenameString) return null;

    /**
     * Dengan 'trust proxy' aktif:
     * req.protocol akan mengambil nilai dari X-Forwarded-Proto
     * req.get('host') akan mengambil nilai dari X-Forwarded-Host
     */
    
    // Ambil host dari proxy atau host request saat ini
    let host = req.get("x-forwarded-host") || req.get("host");
    let protocol = req.get("x-forwarded-proto") || req.protocol;

    // Log untuk pengecekan di Console
    console.log(`--- Trust Proxy Check ---`);
    console.log(`Original Host: ${req.get("host")}`);
    console.log(`Proxy Host: ${req.get("x-forwarded-host")}`);
    console.log(`Final URL Protocol: ${protocol}`);

    // LOGIC FALLBACK: Jika terdeteksi localhost, arahkan ke DevTunnel
    // if (host.includes("localhost") || host.includes("127.0.0.1")) {
    //     host = "9l45jg26-3000.asse.devtunnels.ms";
    //     protocol = "https";
    //     console.log(`Fallback Active: Localhost detected, redirecting to DevTunnel`);
    // }

    const BASE_URL = `${protocol}://${host}`;

    const urls = filenameString
        .split(",")
        .map(name => {
            let filename = name.trim();
            if (filename.startsWith("http")) return filename; 
            
            // Bersihkan path jika ada prefix
            filename = filename.replace(/^\/uploads\//, "").replace(/^uploads\//, "");
            return `${BASE_URL}/uploads/${filename}`;
        })
        .join(",");

    console.log(`Resulting URLs: ${urls}`);
    console.log(`-------------------------`);
    
    return urls;
};

// ------------------------------------------------------------------
// 1. DETAIL PRODUK
// ------------------------------------------------------------------
export const getProductDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);

        // 1. Ambil data detail produk
        const productData = await prisma.produk.findUnique({
            where: { id_produk: productId },
            include: {
                umkm: { select: { id_umkm: true, nama_umkm: true, gambar: true } },
                kategori_produk: true,
                ulasan: {
                    orderBy: [{ rating: "desc" }, { tanggal_ulasan: "desc" }],
                    take: 1,
                    include: { user: { select: { nama: true, foto_profile: true } } },
                },
            },
        });

        if (!productData) {
            return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
        }

        // 2. Gunakan fungsi helper countProductRating untuk menghitung rata-rata
        const ratingAvg = await countProductRating(productId);

        // 3. Ambil jumlah ulasan (untuk field jumlah_ulasan)
        const totalUlasan = await prisma.ulasan.count({
            where: { id_produk: productId }
        });

        // 4. Susun Response Data
        const responseData = {
            id: productData.id_produk,
            nama_produk: productData.nama_produk,
            deskripsi: productData.deskripsi,
            harga: productData.harga,
            gambar: generateUrls(productData.gambar, req),
            rating_rata_rata: ratingAvg, // Hasil dari fungsi countProductRating
            jumlah_ulasan: totalUlasan,   // Menggunakan count()
            umkm: {
                id: productData.umkm.id_umkm,
                nama: productData.umkm.nama_umkm,
                logo: generateUrls(productData.umkm.gambar, req),
            },
            ulasan_terbaik: productData.ulasan.length > 0 ? {
                id_ulasan: productData.ulasan[0].id_ulasan,
                nama_user: productData.ulasan[0].user.nama,
                foto_user: generateUrls(productData.ulasan[0].user.foto_profile, req),
                rating: productData.ulasan[0].rating,
                komentar: productData.ulasan[0].komentar,
                tanggal: productData.ulasan[0].tanggal_ulasan,
            } : null,
        };

        res.status(200).json({ success: true, data: responseData });
    } catch (error) {
        console.error("Error getProductDetail:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ------------------------------------------------------------------
// 2. PRODUK BY UMKM (DENGAN RATING)
// ------------------------------------------------------------------
export const getProductsByUmkm = async (req, res) => {
    try {
        const { umkmId } = req.params;
        const products = await prisma.produk.findMany({
            where: { id_umkm: parseInt(umkmId) },
            include: { 
                kategori_produk: true, // WAJIB: Agar data kategori tidak null
                _count: { select: { ulasan: true } } 
            },
            orderBy: { tanggal_ditambahkan: "desc" }
        });

        const formattedProducts = await Promise.all(products.map(async (product) => {
            // Hitung rating menggunakan helper yang sudah Anda import
            const ratingAvg = await countProductRating(product.id_produk);

            return {
                id_produk: product.id_produk,
                nama_produk: product.nama_produk,
                deskripsi: product.deskripsi || "",
                harga: product.harga,
                // Pastikan menggunakan field 'gambar' sesuai DTO Android
                gambar: generateUrls(product.gambar, req), 
                
                // ⭐ SOLUSI BEGIN_OBJECT: Kirim sebagai Object, bukan String
                kategori_produk: {
                    id_kategori_produk: product.kategori_produk?.id_kategori_produk || 0,
                    nama_kategori: product.kategori_produk?.nama_kategori || "Lainnya",
                    deskripsi: ""
                },
                
                // ⭐ SOLUSI RATING 0.0: Gunakan key 'rating_rata_rata' sesuai DTO Android
                rating_rata_rata: ratingAvg, 
                
                jumlah_ulasan: product._count.ulasan || 0,
                tanggal_ditambahkan: product.tanggal_ditambahkan
            };
        }));

        res.status(200).json({ success: true, data: formattedProducts });
    } catch (error) {
        console.error("Error getProductsByUmkm:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ------------------------------------------------------------------
// 3. ADD PRODUK
// ------------------------------------------------------------------
export const addProduct = async (req, res) => {
    try {
        const { id_umkm, id_kategori_produk, nama_produk, deskripsi, harga } = req.body;
        const file = req.file;

        // 1. Ambil data UMKM dan Follower terlebih dahulu
        const umkm = await prisma.uMKM.findUnique({
            where: { id_umkm: parseInt(id_umkm) },
            include: {
                user: { select: { id_user: true, fcm_token: true } }, // Owner
                follow: { // Followers
                    select: { id_user: true }
                }
            }
        });

        if (!umkm) {
            if (file) fs.unlinkSync(file.path);
            return res.status(404).json({ success: false, message: "UMKM tidak ditemukan" });
        }

        // 2. Simpan Produk ke Database
        const newProduct = await prisma.produk.create({
            data: {
                id_umkm: parseInt(id_umkm),
                id_kategori_produk: id_kategori_produk ? parseInt(id_kategori_produk) : null,
                nama_produk,
                deskripsi: deskripsi || "",
                harga: parseFloat(harga),
                gambar: file ? file.filename : null,
            },
        });

        // --- LOGIKA NOTIFIKASI ---

        // 3. Buat Notifikasi Master di Database
        const notifFollower = await prisma.notifikasi.create({
            data: {
                judul: "Produk Baru! 🛍️",
                isi: `${umkm.nama_umkm} baru saja menambahkan produk: ${nama_produk}`,
            }
        });

        // 4. Kirim ke Follower (DB & Firebase)
        const followerIds = umkm.follow.map(f => f.id_user);
        if (followerIds.length > 0) {
            await prisma.notificationSendTo.createMany({
                data: followerIds.map(id => ({
                    id_notifikasi: notifFollower.id_notifikasi,
                    id_user: id
                }))
            });

            const followerUsers = await prisma.user.findMany({
                where: { id_user: { in: followerIds }, fcm_token: { not: null } },
                select: { id_user: true, fcm_token: true }
            });

            const fcmFollowerPromises = followerUsers.map(u => 
                sendFirebaseNotification(u.fcm_token, notifFollower.judul, notifFollower.isi, {
                    targetUserId: u.id_user, // ⭐ PERBAIKAN: Tambahkan targetUserId di sini
                    type: "new_product",
                    id_produk: String(newProduct.id_produk),
                    id_umkm: String(id_umkm)
                }).catch(e => console.log(`FCM Follower Error: ${e.message}`))
            );
            await Promise.all(fcmFollowerPromises);
        }

        // 5. Kirim Notifikasi ke Owner (Konfirmasi Berhasil)
        if (umkm.user && umkm.user.fcm_token) {
            await sendFirebaseNotification(
                umkm.user.fcm_token,
                "Produk Berhasil Ditambahkan",
                `Produk "${nama_produk}" Anda sudah live dan tersedia untuk pembeli.`,
                {
                    targetUserId: umkm.user.id_user, // ⭐ PERBAIKAN: Tambahkan targetUserId di sini
                    type: "product_created",
                    id_produk: String(newProduct.id_produk)
                }
            ).catch(e => console.log(`FCM Owner Error: ${e.message}`));
        }

        res.status(201).json({
            success: true,
            message: "Produk ditambahkan & notifikasi terkirim",
            data: { ...newProduct, gambar: generateUrls(newProduct.gambar, req) }
        });

    } catch (error) {
        if (req.file) {
            const p = path.join(uploadDir, req.file.filename);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        console.error("Error addProduct:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ------------------------------------------------------------------
// 4. UPDATE PRODUK
// ------------------------------------------------------------------
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_produk, deskripsi, harga } = req.body;
        const file = req.file;

        const existing = await prisma.produk.findUnique({ where: { id_produk: parseInt(id) } });
        if (!existing) {
            if (file) fs.unlinkSync(file.path);
            return res.status(404).json({ success: false, message: "Tidak ditemukan" });
        }

        if (file && existing.gambar) {
            existing.gambar.split(",").forEach(img => {
                const name = img.split("/").pop();
                const p = path.join(uploadDir, name);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            });
        }

        const updated = await prisma.produk.update({
            where: { id_produk: parseInt(id) },
            data: {
                nama_produk,
                deskripsi,
                harga: harga ? parseFloat(harga) : undefined,
                gambar: file ? file.filename : undefined,
            },
        });

        res.status(200).json({
            success: true,
            data: { ...updated, gambar: generateUrls(updated.gambar, req) }
        });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ------------------------------------------------------------------
// 5. DELETE PRODUK
// ------------------------------------------------------------------
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.produk.findUnique({ where: { id_produk: parseInt(id) } });

        if (existing && existing.gambar) {
            existing.gambar.split(",").forEach(img => {
                const name = img.split("/").pop();
                const p = path.join(uploadDir, name);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            });
        }

        await prisma.produk.delete({ where: { id_produk: parseInt(id) } });
        res.status(200).json({ success: true, message: "Dihapus" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};