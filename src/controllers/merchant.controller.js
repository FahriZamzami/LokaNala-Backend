import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getMerchantDetail = async (req, res) => {
try {
    // Ambil ID dari parameter URL (misal: /merchant/1)
    const { id } = req.params;

    // Validasi ID
    if (!id) {
    return res.status(400).json({
        success: false,
        message: "ID UMKM diperlukan",
    });
    }

    const umkmId = parseInt(id);

    // Query ke Database
    const merchantData = await prisma.uMKM.findUnique({
    where: {
        id_umkm: umkmId,
    },
    include: {
        // 1. Ambil Kategori UMKM
        kategori_umkm: true,

        // 2. Ambil Promo
        // PERBAIKAN: Menghapus filter tanggal agar data NULL tetap muncul
        promo: {
        orderBy: {
            id_promo: "desc", // Urutkan berdasarkan ID (Promo inputan terakhir muncul duluan)
        },
        },

        // 3. Ambil Daftar Produk
        produk: {
        orderBy: {
            id_produk: "desc", // Produk terbaru di atas
        },
        include: {
            kategori_produk: true, // Sertakan nama kategori produk
            _count: {
            select: { ulasan: true }, // Menghitung jumlah ulasan per produk
            },
        },
        },
    },
    });

    // Cek apakah UMKM ditemukan
    if (!merchantData) {
    return res.status(404).json({
        success: false,
        message: "UMKM tidak ditemukan",
    });
    }

    // Response Sukses
    res.status(200).json({
    success: true,
    message: "Berhasil mengambil detail UMKM",
    data: {
        // Info Dasar
        id: merchantData.id_umkm,
        nama: merchantData.nama_umkm,
        deskripsi: merchantData.deskripsi,
        alamat: merchantData.alamat,
        link_lokasi: merchantData.link_lokasi, // Foto Header/Profil
        rating: 4.8, // Placeholder
        kategori: merchantData.kategori_umkm?.nama_kategori || "Umkm",

        // List Promo
        promos: merchantData.promo.map((p) => ({
        id_promo: p.id_promo,
        nama_promo: p.nama_promo,
        deskripsi: p.deskripsi,
        syarat: p.syarat_penggunaan,
        berlaku_sampai: p.tanggal_berakhir,
        })),

        // List Produk
        products: merchantData.produk.map((p) => ({
        id_produk: p.id_produk,
        nama_produk: p.nama_produk,
        deskripsi: p.deskripsi,
        harga: p.harga,
        gambar: p.gambar,
        kategori_produk: p.kategori_produk?.nama_kategori || "Lainnya",
        jumlah_ulasan: p._count.ulasan,
        })),
    },
    });
} catch (error) {
    console.error("Error getting merchant detail:", error);
    res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server",
    });
}
};