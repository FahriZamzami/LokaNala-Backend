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
            foto: generateUrls(review.foto, req), // Mengembalikan string URL dipisah koma
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

// export const addRating = async (req, res) => {
//     const { id_produk, id_user, komentar, nilai_rating } = req.body;
//     const files = req.files || []; // Ambil array files

//     if (!id_produk || !id_user || !nilai_rating) {
//         // Hapus file jika gagal
//         files.forEach(f => fs.unlinkSync(f.path));
//         return res.status(400).json({ success: false, message: "Data tidak lengkap" });
//     }

//     try {
//         const existing = await prisma.ulasan.findFirst({
//             where: { id_produk: parseInt(id_produk), id_user: parseInt(id_user) }
//         });

//         if (existing) {
//             files.forEach(f => fs.unlinkSync(f.path));
//             return res.status(409).json({ success: false, message: "Sudah review" });
//         }

//         // Gabungkan nama file jadi string "a.jpg,b.jpg"
//         const filenameString = files.map(f => f.filename).join(",");

//         const newReview = await prisma.ulasan.create({
//             data: {
//                 id_produk: parseInt(id_produk),
//                 id_user: parseInt(id_user),
//                 rating: parseInt(nilai_rating),
//                 komentar: komentar || "",
//                 foto: filenameString || null,
//             },
//             include: { user: true }
//         });

//         res.status(201).json({
//             success: true, 
//             message: "Berhasil", 
//             data: { 
//                 ...newReview, 
//                 foto: generateUrls(newReview.foto, req) 
//             } 
//         });
//     } catch (error) {
//         files.forEach(f => fs.unlinkSync(f.path));
//         res.status(500).json({ success: false, message: "Gagal", error: error.message });
//     }
// };

export const addRating = async (req, res) => {
    const { id_produk, id_user, komentar, nilai_rating } = req.body;
    const files = req.files || [];

    if (!id_produk || !id_user || !nilai_rating) {
        files.forEach(f => fs.unlinkSync(f.path));
        return res.status(400).json({ success: false, message: "Data tidak lengkap" });
    }

    try {
        // 1. Cek apakah user sudah pernah review produk ini
        const existing = await prisma.ulasan.findFirst({
            where: { id_produk: parseInt(id_produk), id_user: parseInt(id_user) }
        });

        if (existing) {
            files.forEach(f => fs.unlinkSync(f.path));
            return res.status(409).json({ success: false, message: "Sudah review" });
        }

        // 2. Ambil data Produk, UMKM, dan Owner untuk kebutuhan notifikasi
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

        // 3. Simpan ulasan ke Database
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

        // --- LOGIKA NOTIFIKASI ---

        // 4. Buat Notifikasi di Database (untuk Owner UMKM)
        const notificationTitle = "Ulasan Baru ⭐";
        const notificationBody = `${newReview.user.nama} memberikan rating ${nilai_rating} pada produk ${produk.nama_produk}`;

        const notifikasi = await prisma.notifikasi.create({
            data: {
                judul: notificationTitle,
                isi: notificationBody,
            }
        });

        // 5. Hubungkan notifikasi ke ID User Pemilik UMKM
        const owner = produk.umkm.user;
        if (owner) {
            // 1. Simpan ke Database (untuk riwayat di aplikasi)
            await prisma.notificationSendTo.create({
                data: {
                    id_notifikasi: notifikasi.id_notifikasi,
                    id_user: owner.id_user,
                }
            });

            // 2. Kirim Real-time via Firebase
            if (owner.fcm_token) {
                try {
                    await sendFirebaseNotification(
                        owner.fcm_token,
                        notificationTitle,
                        notificationBody,
                        {
                            // Parameter ini WAJIB sesuai definisi helper Anda
                            targetUserId: owner.id_user, 
                            type: "new_review",
                            promoId: String(id_produk) // Anda bisa menyisipkan id_produk di sini
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
    
    // 'keep_photos' adalah nama file lama yang ingin dipertahankan (dikirim dari Android)
    // Bisa berupa string "a.jpg" atau array ["a.jpg", "b.jpg"]
    let keepPhotos = req.body.keep_photos || [];
    if (!Array.isArray(keepPhotos)) keepPhotos = [keepPhotos]; // Pastikan jadi array

    const newFiles = req.files || [];

    try {
        const idUlasan = parseInt(id_rating);
        const existing = await prisma.ulasan.findUnique({ where: { id_ulasan: idUlasan } });

        if (!existing) {
            newFiles.forEach(f => fs.unlinkSync(f.path));
            return res.status(404).json({ success: false, message: "Tidak ketemu" });
        }

        // 1. Tentukan Foto Final (Yang Lama Dipertahankan + Yang Baru Diupload)
        const newFilenames = newFiles.map(f => f.filename);
        // keepPhotos mungkin berisi URL lengkap atau cuma filename, kita ambil filename-nya saja
        const cleanKeepPhotos = keepPhotos.map(url => url.split("/").pop()).filter(n => n);
        
        const finalPhotos = [...cleanKeepPhotos, ...newFilenames];
        const finalPhotoString = finalPhotos.join(",") || null;

        // 2. Hapus Foto Lama yang Dibuang User
        if (existing.foto) {
            const oldPhotos = existing.foto.split(",");
            oldPhotos.forEach(oldName => {
                // Jika foto lama TIDAK ADA di daftar keep, hapus dari disk
                if (!cleanKeepPhotos.includes(oldName)) {
                    const p = path.join(uploadDir, oldName);
                    if (fs.existsSync(p)) fs.unlinkSync(p);
                }
            });
        }

        // 3. Update DB
        const updated = await prisma.ulasan.update({
            where: { id_ulasan: idUlasan },
            data: {
                rating: nilai_rating ? parseInt(nilai_rating) : undefined,
                komentar: komentar !== undefined ? komentar : undefined,
                foto: finalPhotoString // Simpan string baru
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
    // Logika sama seperti sebelumnya, tapi split koma dulu sebelum unlink
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
        // 1. Cari produk berdasarkan id_produk, ambil id_umkm
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

        // 2. Cari UMKM berdasarkan id_umkm, ambil id_user pemilik
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

        // 3. Cek apakah user login = id_user pemilik UMKM
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

        // Hitung rating dengan fungsi yang sudah kamu buat
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

        // 1. Ambil semua ulasan dari semua produk yang dimiliki UMKM ini
        // Kita gunakan ulasan -> produk -> id_umkm untuk filtering
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

        // 2. Jika tidak ada ulasan sama sekali di semua produknya
        if (allReviews.length === 0) {
            return res.json({
                success: true,
                rating: 0,
                total_ulasan: 0
            });
        }

        // 3. Hitung Total Bintang dan bagi dengan Total Ulasan
        const totalBintang = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
        const finalRating = totalBintang / allReviews.length;

        return res.json({
            success: true,
            // Hasil pembulatan 1 desimal (misal 4.5)
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