import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getProductDetail = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
        return res.status(400).json({
            success: false,
            message: "ID Produk diperlukan",
        });
        }

        const productId = parseInt(id);

        // --- 1. Hitung Rata-rata Rating & Jumlah Ulasan ---
        const ratingAgg = await prisma.ulasan.aggregate({
        where: { id_produk: productId },
        _avg: { rating: true },
        _count: { rating: true },
        });

        const averageRating = ratingAgg._avg.rating || 0.0; // Default 0.0 jika belum ada rating
        const totalReviews = ratingAgg._count.rating;

        // --- 2. Ambil Detail Produk & 1 Ulasan Terbaik ---
        const productData = await prisma.produk.findUnique({
        where: { id_produk: productId },
        include: {
            // Ambil info UMKM pemilik produk
            umkm: {
            select: {
                id_umkm: true,
                nama_umkm: true,
                gambar: true, // Foto profil UMKM
            },
            },
            // Ambil Kategori
            kategori_produk: true,

            // Ambil 1 Ulasan Terbaik
            ulasan: {
            orderBy: [
                { rating: "desc" }, // Rating tertinggi
                { tanggal_ulasan: "desc" }, // Jika rating sama, ambil yang terbaru
            ],
            take: 1, // Cuma ambil 1
            include: {
                user: {
                select: {
                    nama: true,
                    foto_profile: true,
                },
                },
            },
            },
        },
        });

        if (!productData) {
        return res.status(404).json({
            success: false,
            message: "Produk tidak ditemukan",
        });
        }

        // --- 3. Helper URL Gambar (DevTunnels/Localhost) ---
        const generateUrl = (filename) => {
        if (!filename) return null;
        if (filename.startsWith("http")) return filename; // Jika user input link manual

        // Ambil host dinamis (DevTunnels / Localhost)
        const host = req.get("host");
        const protocol =
            req.headers["x-forwarded-proto"] === "https" || req.secure
            ? "https"
            : "http";
        return `${protocol}://${host}/uploads/${filename}`;
        };

        // --- 4. Susun Response Data ---
        const responseData = {
        id: productData.id_produk,
        nama_produk: productData.nama_produk,
        deskripsi: productData.deskripsi,
        harga: productData.harga,
        gambar: generateUrl(productData.gambar),
        
        // Statistik Rating
        rating_rata_rata: parseFloat(averageRating.toFixed(1)), // Pembulatan 1 desimal (misal 4.5)
        jumlah_ulasan: totalReviews,
        
        // Info UMKM
        umkm: {
            id: productData.umkm.id_umkm,
            nama: productData.umkm.nama_umkm,
            logo: generateUrl(productData.umkm.gambar),
        },

        // Info Ulasan Terbaik (Top Review)
        ulasan_terbaik:
            productData.ulasan.length > 0
            ? {
                id_ulasan: productData.ulasan[0].id_ulasan,
                nama_user: productData.ulasan[0].user.nama,
                foto_user: generateUrl(productData.ulasan[0].user.foto_profile),
                rating: productData.ulasan[0].rating,
                komentar: productData.ulasan[0].komentar,
                tanggal: productData.ulasan[0].tanggal_ulasan,
                }
            : null, // Null jika belum ada ulasan
        };

        res.status(200).json({
        success: true,
        message: "Berhasil mengambil detail produk",
        data: responseData,
        });

    } catch (error) {
        console.error("Error detail produk:", error);
        res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server",
        });
    }
};