import { prisma } from "../config/prismaclient.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../public/uploads");

import { sendFirebaseNotification } from "../utility/firebase.js";
import { countProductRating } from "./rating.controller.js";

export const generateUrls = (filenameString, req) => {
    if (!filenameString) return null;

    let host = req.get("x-forwarded-host") || req.get("host");
    let protocol = req.get("x-forwarded-proto") || req.protocol;

    console.log(`--- Trust Proxy Check ---`);
    console.log(`Original Host: ${req.get("host")}`);
    console.log(`Proxy Host: ${req.get("x-forwarded-host")}`);
    console.log(`Final URL Protocol: ${protocol}`);

    const BASE_URL = `${protocol}://${host}`;

    const urls = filenameString
        .split(",")
        .map(name => {
            let filename = name.trim();
            if (filename.startsWith("http")) return filename; 
            
            filename = filename.replace(/^\/uploads\//, "").replace(/^uploads\//, "");
            return `${BASE_URL}/uploads/${filename}`;
        })
        .join(",");

    console.log(`Resulting URLs: ${urls}`);
    console.log(`-------------------------`);
    
    return urls;
};

export const getProductDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);

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

        const ratingAvg = await countProductRating(productId);

        const totalUlasan = await prisma.ulasan.count({
            where: { id_produk: productId }
        });

        const responseData = {
            id: productData.id_produk,
            nama_produk: productData.nama_produk,
            deskripsi: productData.deskripsi,
            harga: productData.harga,
            gambar: generateUrls(productData.gambar, req),
            rating_rata_rata: ratingAvg, 
            jumlah_ulasan: totalUlasan,  
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

export const getProductsByUmkm = async (req, res) => {
    try {
        const { umkmId } = req.params;
        const products = await prisma.produk.findMany({
            where: { id_umkm: parseInt(umkmId) },
            include: { 
                kategori_produk: true, 
                _count: { select: { ulasan: true } } 
            },
            orderBy: { tanggal_ditambahkan: "desc" }
        });

        const formattedProducts = await Promise.all(products.map(async (product) => {
            const ratingAvg = await countProductRating(product.id_produk);

            return {
                id_produk: product.id_produk,
                nama_produk: product.nama_produk,
                deskripsi: product.deskripsi || "",
                harga: product.harga,
                gambar: generateUrls(product.gambar, req), 
                
                kategori_produk: {
                    id_kategori_produk: product.kategori_produk?.id_kategori_produk || 0,
                    nama_kategori: product.kategori_produk?.nama_kategori || "Lainnya",
                    deskripsi: ""
                },
                
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

export const addProduct = async (req, res) => {
    try {
        const { id_umkm, id_kategori_produk, nama_produk, deskripsi, harga } = req.body;
        const file = req.file;

        const umkm = await prisma.uMKM.findUnique({
            where: { id_umkm: parseInt(id_umkm) },
            include: {
                user: { select: { id_user: true, fcm_token: true } }, 
                follow: { 
                    select: { id_user: true }
                }
            }
        });

        if (!umkm) {
            if (file) fs.unlinkSync(file.path);
            return res.status(404).json({ success: false, message: "UMKM tidak ditemukan" });
        }

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

        const notifFollower = await prisma.notifikasi.create({
            data: {
                judul: "Produk Baru! 🛍️",
                isi: `${umkm.nama_umkm} baru saja menambahkan produk: ${nama_produk}`,
            }
        });

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
                    targetUserId: u.id_user, 
                    type: "new_product",
                    id_produk: String(newProduct.id_produk),
                    id_umkm: String(id_umkm)
                }).catch(e => console.log(`FCM Follower Error: ${e.message}`))
            );
            await Promise.all(fcmFollowerPromises);
        }

        if (umkm.user && umkm.user.fcm_token) {
            await sendFirebaseNotification(
                umkm.user.fcm_token,
                "Produk Berhasil Ditambahkan",
                `Produk "${nama_produk}" Anda sudah live dan tersedia untuk pembeli.`,
                {
                    targetUserId: umkm.user.id_user, 
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

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_produk, deskripsi, harga, id_kategori_produk } = req.body;
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
                id_kategori_produk: id_kategori_produk
                    ? parseInt(id_kategori_produk)
                    : undefined,
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

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);

        const existing = await prisma.produk.findUnique({
            where: { id_produk: productId }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Produk tidak ditemukan"
            });
        }

        await prisma.ulasan.deleteMany({
            where: { id_produk: productId }
        });

        if (existing.gambar) {
            existing.gambar.split(",").forEach(img => {
                const name = img.split("/").pop();
                const p = path.join(uploadDir, name);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            });
        }

        await prisma.produk.delete({
            where: { id_produk: productId }
        });

        res.status(200).json({
            success: true,
            message: "Produk berhasil dihapus"
        });

    } catch (error) {
        console.error("Delete product error:", error);

        res.status(500).json({
            success: false,
            message: "Produk gagal dihapus",
            error: error.message
        });
    }
};