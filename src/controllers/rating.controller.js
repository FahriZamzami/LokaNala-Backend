import { prisma } from "../config/prismaclient.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../public/uploads");

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

export const addRating = async (req, res) => {
    const { id_produk, id_user, komentar, nilai_rating } = req.body;
    const files = req.files || []; // Ambil array files

    if (!id_produk || !id_user || !nilai_rating) {
        // Hapus file jika gagal
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

        // Gabungkan nama file jadi string "a.jpg,b.jpg"
        const filenameString = files.map(f => f.filename).join(",");

        const newReview = await prisma.ulasan.create({
            data: {
                id_produk: parseInt(id_produk),
                id_user: parseInt(id_user),
                rating: parseInt(nilai_rating),
                komentar: komentar || "",
                foto: filenameString || null,
            },
            include: { user: true }
        });

        res.status(201).json({
            success: true, 
            message: "Berhasil", 
            data: { 
                ...newReview, 
                foto: generateUrls(newReview.foto, req) 
            } 
        });
    } catch (error) {
        files.forEach(f => fs.unlinkSync(f.path));
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