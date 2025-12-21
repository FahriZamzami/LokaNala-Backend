import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mendapatkan UMKM berdasarkan ID User
export const getMyUmkm = async (req, res) => {
    try {
        // Mengambil id_user dari query parameter (misal: /umkm/my?id_user=1)
        const userId = parseInt(req.query.id_user);

        if (!userId || isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: "id_user is required and must be a valid number"
            });
        }

        // Mencari data UMKM di database menggunakan Prisma
        // PERBAIKAN: Menggunakan prisma.uMKM (bukan prisma.umkm) sesuai dengan schema Prisma
        const response = await prisma.uMKM.findMany({
            where: {
                id_user: userId
            },
            include: {
                kategori_umkm: true
            },
            orderBy: {
                tanggal_terdaftar: "desc"
            }
        });

        // Format response agar sesuai dengan field di Android (UmkmResponse.kt)
        // Pastikan nama field database (kiri) di-map ke nama JSON yang diharapkan Android (kanan)
        const formattedResponse = response.map(umkm => ({
            id_umkm: umkm.id_umkm,
            nama_umkm: umkm.nama_umkm,
            deskripsi: umkm.deskripsi || "",
            alamat: umkm.alamat || "",
            no_telepon: umkm.no_telepon || "",
            gambar: umkm.gambar || "", // Pastikan ini berisi URL gambar yang valid
            rating: 0.0 // Default rating 0.0 karena di tabel umkm belum tentu ada kolom rating yang terhitung
        }));

        res.status(200).json({
            success: true,
            message: "Data retrieved successfully",
            data: formattedResponse
        });

    } catch (error) {
        // Log error ke console backend untuk debugging
        console.error("Error fetching My UMKM:", error); 
        res.status(500).json({
            success: false,
            msg: error.message || "Internal server error"
        });
    }
};