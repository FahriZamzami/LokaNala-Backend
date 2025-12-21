import { prisma } from "../config/prismaclient.js";

// 1. Buat Kategori Baru (POST)
export const createCategory = async (req, res) => {
    const { id_umkm, nama_kategori, deskripsi } = req.body;

    // Validasi input dasar
    if (!id_umkm || !nama_kategori) {
        return res.status(400).json({
            success: false,
            message: "ID UMKM dan Nama Kategori wajib diisi"
        });
    }

    try {
        // ⭐ Set urutan otomatis: ambil urutan terbesar untuk UMKM ini, lalu +1
        const maxUrutan = await prisma.kategoriProduk.findFirst({
            where: { id_umkm: parseInt(id_umkm) },
            orderBy: { urutan: 'desc' },
            select: { urutan: true }
        });
        
        const nextUrutan = maxUrutan ? maxUrutan.urutan + 1 : 0;

        const newCategory = await prisma.kategoriProduk.create({
            data: {
                id_umkm: parseInt(id_umkm),
                nama_kategori: nama_kategori,
                deskripsi: deskripsi || null,
                urutan: nextUrutan // Set urutan otomatis
            }
        });

        res.status(201).json({
            success: true,
            message: "Kategori berhasil dibuat",
            data: newCategory
        });
    } catch (error) {
        console.error("Error create category:", error);
        res.status(500).json({
            success: false,
            message: "Gagal membuat kategori",
            error: error.message
        });
    }
};

// 2. Ambil Semua Kategori Milik UMKM Tertentu (GET)
export const getCategoriesByUmkm = async (req, res) => {
    try {
        // Support both parameter names: umkmId (from route) or id_umkm (legacy)
        const umkmId = req.params.umkmId || req.params.id_umkm;

        // Validasi umkmId
        if (!umkmId) {
            return res.status(400).json({
                success: false,
                message: "ID UMKM diperlukan"
            });
        }

        const umkmIdInt = parseInt(umkmId);

        if (isNaN(umkmIdInt)) {
            return res.status(400).json({
                success: false,
                message: "ID UMKM harus berupa angka"
            });
        }

        // Cek apakah UMKM ada
        const umkmExists = await prisma.uMKM.findUnique({
            where: { id_umkm: umkmIdInt },
            select: { id_umkm: true }
        });

        if (!umkmExists) {
            return res.status(404).json({
                success: false,
                message: "UMKM tidak ditemukan"
            });
        }

        // Query kategori produk berdasarkan id_umkm
        // ⭐ PERBAIKAN: Urutkan berdasarkan field urutan (ASC) untuk tampilan yang konsisten
        const categories = await prisma.kategoriProduk.findMany({
            where: {
                id_umkm: umkmIdInt
            },
            orderBy: {
                urutan: 'asc' // Urutkan berdasarkan urutan (0, 1, 2, ...)
            }
        });

        // Jika tidak ada kategori, return empty array (bukan error)
        res.status(200).json({
            success: true,
            message: "Data retrieved successfully",
            data: categories // Akan berupa empty array [] jika tidak ada kategori
        });
    } catch (error) {
        console.error("Error fetching categories by UMKM:", error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server",
            msg: error.message || "Internal server error"
        });
    }
};

// 3. Update Kategori (PUT)
export const updateCategory = async (req, res) => {
    const { id } = req.params; // ID Kategori
    const { nama_kategori, deskripsi } = req.body;

    try {
        const updatedCategory = await prisma.kategoriProduk.update({
            where: { id_kategori_produk: parseInt(id) },
            data: {
                nama_kategori,
                deskripsi
            }
        });

        res.status(200).json({
            success: true,
            message: "Kategori berhasil diupdate",
            data: updatedCategory
        });
    } catch (error) {
        // Handle jika ID tidak ditemukan (Error Code Prisma P2025)
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: "Kategori tidak ditemukan" });
        }
        res.status(500).json({ success: false, message: "Gagal update", error: error.message });
    }
};

// 4. Hapus Kategori (DELETE)
export const deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.kategoriProduk.delete({
            where: { id_kategori_produk: parseInt(id) }
        });

        res.status(200).json({
            success: true,
            message: "Kategori berhasil dihapus"
        });
    } catch (error) {
        // Error P2003: Foreign Key Constraint (Jika kategori masih dipakai oleh Produk)
        if (error.code === 'P2003') {
            return res.status(400).json({ 
                success: false, 
                message: "Gagal hapus: Kategori ini sedang digunakan oleh produk. Hapus atau ubah produk terkait terlebih dahulu." 
            });
        }
        // Error P2025: Record not found
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: "Kategori tidak ditemukan" });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

// 5. Update Urutan Kategori (PUT) - ENDPOINT BARU
export const updateCategoryOrder = async (req, res) => {
    try {
        const { umkmId } = req.params;
        const { urutan } = req.body; // Array of { id_kategori_produk, urutan }

        // Validasi umkmId
        if (!umkmId) {
            return res.status(400).json({
                success: false,
                message: "ID UMKM diperlukan"
            });
        }

        const umkmIdInt = parseInt(umkmId);

        if (isNaN(umkmIdInt)) {
            return res.status(400).json({
                success: false,
                message: "ID UMKM harus berupa angka"
            });
        }

        // Validasi request body
        if (!urutan || !Array.isArray(urutan) || urutan.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Data urutan harus berupa array yang tidak kosong"
            });
        }

        // Validasi struktur array
        for (const item of urutan) {
            if (!item.id_kategori_produk || item.urutan === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "Setiap item harus memiliki id_kategori_produk dan urutan"
                });
            }
        }

        // Ambil semua id_kategori_produk dari request
        const kategoriIds = urutan.map(item => parseInt(item.id_kategori_produk));

        // ⭐ Validasi: Pastikan semua kategori milik UMKM ini
        const existingCategories = await prisma.kategoriProduk.findMany({
            where: {
                id_umkm: umkmIdInt,
                id_kategori_produk: { in: kategoriIds }
            },
            select: { id_kategori_produk: true }
        });

        if (existingCategories.length !== kategoriIds.length) {
            return res.status(400).json({
                success: false,
                message: "Beberapa kategori tidak ditemukan atau bukan milik UMKM ini"
            });
        }

        // ⭐ Validasi: Pastikan urutan tidak duplikat
        const urutanValues = urutan.map(item => parseInt(item.urutan));
        const uniqueUrutan = [...new Set(urutanValues)];
        if (urutanValues.length !== uniqueUrutan.length) {
            return res.status(400).json({
                success: false,
                message: "Urutan tidak boleh duplikat"
            });
        }

        // ⭐ Validasi: Pastikan urutan berurutan (0, 1, 2, 3, ...)
        const sortedUrutan = [...urutanValues].sort((a, b) => a - b);
        for (let i = 0; i < sortedUrutan.length; i++) {
            if (sortedUrutan[i] !== i) {
                return res.status(400).json({
                    success: false,
                    message: `Urutan harus berurutan mulai dari 0. Ditemukan: ${sortedUrutan.join(', ')}`
                });
            }
        }

        // ⭐ Update urutan menggunakan transaction untuk memastikan konsistensi
        await prisma.$transaction(
            urutan.map(item =>
                prisma.kategoriProduk.update({
                    where: { id_kategori_produk: parseInt(item.id_kategori_produk) },
                    data: { urutan: parseInt(item.urutan) }
                })
            )
        );

        res.status(200).json({
            success: true,
            message: "Urutan kategori berhasil diperbarui",
            data: {
                umkmId: umkmIdInt,
                totalUpdated: urutan.length
            }
        });

    } catch (error) {
        console.error("Error updating category order:", error);
        res.status(500).json({
            success: false,
            message: "Gagal memperbarui urutan kategori",
            error: error.message
        });
    }
};