import { prisma } from "../config/prismaclient.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../public/uploads");

import { sendFirebaseNotification } from "../utility/firebase.js";

export const generateUrls = (filenameString, req) => {
    if (!filenameString) return null;

    const host = req.get("x-forwarded-host") || req.get("host");
    const protocol = req.get("x-forwarded-proto") || req.protocol;

    const BASE_URL = `${protocol}://${host}`;

    return filenameString
        .split(",")
        .map(name => {
            if (name.startsWith("http")) return name; 
            return `${BASE_URL}/uploads/${name}`;
        })
        .join(",");
};

export const getRatingByProduct = async (req, res) => {
    const { id_produk } = req.params;
    try {
        const reviews = await prisma.ulasan.findMany({
            where: { id_produk: parseInt(id_produk) },
            include: { user: { select: { id_user: true, nama: true, foto_profile: true } } },
            orderBy: { tanggal_ulasan: "desc" },
        });

        const responseData = reviews.map((review) => ({
            ...review,
            id_rating: review.id_ulasan,
            nilai_rating: review.rating,
            foto: generateUrls(review.foto, req), 
            user: {
                ...review.user,
                foto_profile: generateUrls(review.user.foto_profile, req), 
            },
        }));

        res.status(200).json({ success: true, message: "Berhasil", data: responseData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error", error: error.message });
    }
};

export const addRating = async (req, res) => {
    const { id_produk, id_user, komentar, nilai_rating } = req.body;
    const files = req.files || [];

    if (!id_produk || !id_user || !nilai_rating) {
        files.forEach(f => fs.unlinkSync(f.path));
        return res.status(400).json({ success: false, message: "Data tidak lengkap" });
    }

    try {
        const existing = await prisma.ulasan.findFirst({
            where: { id_produk: parseInt(id_produk), id_user: parseInt(id_user) }
        });

        if (existing) {
            files.forEach(f => fs.unlinkSync(f.path));
            return res.status(409).json({ success: false, message: "Sudah review" });
        }

        const produk = await prisma.produk.findUnique({
            where: { id_produk: parseInt(id_produk) },
            include: {
                umkm: {
                    include: {
                        user: {
                            select: { id_user: true, fcm_token: true }
                        }
                    }
                }
            }
        });

        if (!produk) {
            files.forEach(f => fs.unlinkSync(f.path));
            return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
        }

        const filenameString = files.map(f => f.filename).join(",");
        const newReview = await prisma.ulasan.create({
            data: {
                id_produk: parseInt(id_produk),
                id_user: parseInt(id_user),
                rating: parseInt(nilai_rating),
                komentar: komentar || "",
                foto: filenameString || null,
            },
            include: { user: { select: { nama: true } } }
        });

        const notificationTitle = "Ulasan Baru ⭐";
        const notificationBody = `${newReview.user.nama} memberikan rating ${nilai_rating} pada produk ${produk.nama_produk}`;

        const notifikasi = await prisma.notifikasi.create({
            data: {
                judul: notificationTitle,
                isi: notificationBody,
            }
        });

        const owner = produk.umkm.user;
        if (owner) {
            await prisma.notificationSendTo.create({
                data: {
                    id_notifikasi: notifikasi.id_notifikasi,
                    id_user: owner.id_user,
                }
            });

            if (owner.fcm_token) {
                try {
                    await sendFirebaseNotification(
                        owner.fcm_token,
                        notificationTitle,
                        notificationBody,
                        {
                            targetUserId: owner.id_user, 
                            type: "new_review",
                            promoId: String(id_produk) 
                        }
                    );
                } catch (fcmErr) {
                    console.error("Gagal kirim Firebase Notification:", fcmErr.message);
                }
            }
        }

        res.status(201).json({
            success: true,
            message: "Ulasan berhasil ditambahkan dan pemilik telah dinotifikasi",
            data: {
                ...newReview,
                foto: generateUrls(newReview.foto, req)
            }
        });

    } catch (error) {
        files.forEach(f => fs.unlinkSync(f.path));
        console.error("Error addRating:", error);
        res.status(500).json({ success: false, message: "Gagal", error: error.message });
    }
};

export const updateRating = async (req, res) => {
    const { id_rating } = req.params;
    const { komentar, nilai_rating } = req.body;
    
    let keepPhotos = req.body.keep_photos || [];
    if (!Array.isArray(keepPhotos)) keepPhotos = [keepPhotos]; 

    const newFiles = req.files || [];

    try {
        const idUlasan = parseInt(id_rating);
        const existing = await prisma.ulasan.findUnique({ where: { id_ulasan: idUlasan } });

        if (!existing) {
            newFiles.forEach(f => fs.unlinkSync(f.path));
            return res.status(404).json({ success: false, message: "Tidak ketemu" });
        }

        const newFilenames = newFiles.map(f => f.filename);
        const cleanKeepPhotos = keepPhotos.map(url => url.split("/").pop()).filter(n => n);
        
        const finalPhotos = [...cleanKeepPhotos, ...newFilenames];
        const finalPhotoString = finalPhotos.join(",") || null;

        if (existing.foto) {
            const oldPhotos = existing.foto.split(",");
            oldPhotos.forEach(oldName => {
                if (!cleanKeepPhotos.includes(oldName)) {
                    const p = path.join(uploadDir, oldName);
                    if (fs.existsSync(p)) fs.unlinkSync(p);
                }
            });
        }

        const updated = await prisma.ulasan.update({
            where: { id_ulasan: idUlasan },
            data: {
                rating: nilai_rating ? parseInt(nilai_rating) : undefined,
                komentar: komentar !== undefined ? komentar : undefined,
                foto: finalPhotoString 
            },
            include: { user: true }
        });

        res.status(200).json({
            success: true, 
            message: "Berhasil update", 
            data: { 
                ...updated, 
                foto: generateUrls(updated.foto, req) 
            } 
        });

    } catch (error) {
        newFiles.forEach(f => fs.unlinkSync(f.path));
        console.error(error);
        res.status(500).json({ success: false, message: "Gagal update", error: error.message });
    }
};

export const deleteRating = async (req, res) => {
    const { id_rating } = req.params;
    try {
        const idUlasan = parseInt(id_rating);
        const existing = await prisma.ulasan.findUnique({ where: { id_ulasan: idUlasan } });
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        if (existing.foto) {
            const photos = existing.foto.split(",");
            photos.forEach(name => {
                const p = path.join(uploadDir, name);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            });
        }
        await prisma.ulasan.delete({ where: { id_ulasan: idUlasan } });
        res.status(200).json({ success: true, message: "Dihapus" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error", error: error.message });
    }
};

export const checkProductOwner = async (req, res) => {
    const { id_produk, id_user } = req.params;

    try {
        const product = await prisma.Produk.findUnique({
            where: { id_produk: Number(id_produk) },
            select: { id_umkm: true },
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                isOwner: false,
                message: "Produk tidak ditemukan",
            });
        }

        const umkm = await prisma.UMKM.findUnique({
            where: { id_umkm: product.id_umkm },
            select: { id_user: true },
        });

        if (!umkm) {
            return res.status(404).json({
                success: false,
                isOwner: false,
                message: "UMKM tidak ditemukan",
            });
        }

        const isOwner = (umkm.id_user === Number(id_user));

        return res.status(200).json({
            success: true,
            isOwner: isOwner,
        });

    } catch (error) {
        console.error("OWNER CHECK ERROR =>", error)
        return res.status(500).json({
            success: false,
            isOwner: false,
            message: error.message
        });
    }
};

export const countProductRating = async (id_produk) => {
    const reviews = await prisma.ulasan.findMany({
        where: { id_produk: Number(id_produk) },
        select: { rating: true }
    });

    if (reviews.length === 0) return 0;

    const total = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = total / reviews.length;

    return Number(avg.toFixed(1));
};

export const getProductRating = async (req, res) => {
    try {
        const { id_produk } = req.params;

        const rating = await countProductRating(id_produk);

        return res.status(200).json({
            success: true,
            message: "Product rating fetched successfully",
            data: { rating }
        });

    } catch (error) {
        console.error("Error fetching product rating:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getUMKMRating = async (req, res) => {
    try {
        const id_umkm = Number(req.params.id_umkm);

        if (!id_umkm || isNaN(id_umkm)) {
            return res.status(400).json({
                success: false,
                message: "id_umkm tidak valid"
            });
        }

        const allReviews = await prisma.ulasan.findMany({
            where: {
                produk: {
                    id_umkm: id_umkm
                }
            },
            select: {
                rating: true
            }
        });

        if (allReviews.length === 0) {
            return res.json({
                success: true,
                rating: 0,
                total_ulasan: 0
            });
        }

        const totalBintang = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
        const finalRating = totalBintang / allReviews.length;

        return res.json({
            success: true,
            rating: Number(finalRating.toFixed(1)),
            total_ulasan: allReviews.length
        });

    } catch (error) {
        console.error("Error UMKMRating:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server",
            error: error.message
        });
    }
};