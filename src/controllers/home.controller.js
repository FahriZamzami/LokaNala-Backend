import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAllUMKM = async (req, res) => {
    try {
        const rawUmkm = await prisma.uMKM.findMany({
        include: {
            kategori_umkm: true,
            user: {
            select: {
                nama: true,
                no_telepon: true,
            },
            },
        },
        orderBy: {
            tanggal_terdaftar: "desc",
        },
        });

        const umkmWithUrl = rawUmkm.map((item) => {
        let imageUrl = null;

        if (item.gambar) {
            // -----------------------------------------------------------
            // PERBAIKAN: MENGGUNAKAN URL DINAMIS (RECOMMENDED)
            // -----------------------------------------------------------
            // 1. Ambil host secara otomatis (bisa localhost, 10.0.2.2, atau devtunnels)
            const baseUrl = "https://j4nxkf7k-3000.asse.devtunnels.ms"; 

            imageUrl = `${baseUrl}/uploads/${item.gambar}`;
        } 
        else if (item.link_lokasi && !item.link_lokasi.includes("goo.gl") && !item.link_lokasi.includes("maps")) {
            imageUrl = item.link_lokasi;
        }

        return {
            ...item,
            // Timpa field ini agar Android menerima URL gambar yang benar
            link_lokasi: imageUrl, 
            gambar: imageUrl
        };
        });

        res.status(200).json({
        success: true,
        message: "Berhasil mengambil data UMKM",
        data: umkmWithUrl,
        });

    } catch (error) {
        console.error("Error fetching UMKM:", error);
        res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
        });
    }
};