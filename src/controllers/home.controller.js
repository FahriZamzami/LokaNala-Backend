import { prisma } from "../config/prismaclient.js";

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
                const host = req.get("x-forwarded-host") || req.get("host");
                const protocol = req.get("x-forwarded-proto") || req.protocol;
                const baseUrl = `${protocol}://${host}`;

                imageUrl = `${baseUrl}/uploads/${item.gambar}`;
            } 
            else if (item.link_lokasi && !item.link_lokasi.includes("goo.gl") && !item.link_lokasi.includes("maps")) {
                imageUrl = item.link_lokasi;
            }

            return {
                ...item,
                link_lokasi: imageUrl, 
                gambar_url: imageUrl
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