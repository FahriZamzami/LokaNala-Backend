import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const formatDate = (date) => {
    if (!date) return null; // ini penting agar tidak 1970-01-01

    const d = new Date(date);
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta" // Biar tidak pakai UTC
    }).format(d);
};

export const getPromosByUMKM = async (req, res) => {
    try {
        console.log("📌 ID UMKM diterima:", req.params.id_umkm);

        const id = Number(req.params.id_umkm);

        const promos = await prisma.promo.findMany({
            where: { id_umkm: id },
            orderBy: { id_promo: "desc" },
        });

        console.log("📦 Promo ditemukan:", promos);

        const formattedPromos = promos.map(p => ({
            ...p,
            tanggal_mulai: formatDate(p.tanggal_mulai),
            tanggal_berakhir: formatDate(p.tanggal_berakhir),
        }));

        res.status(200).json({ success: true, data: formattedPromos });
    } catch (error) {
        console.error("Error getPromosByUMKM:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getPromoDetail = async (req, res) => {
    try {
        const { id_promo } = req.params;

        const promo = await prisma.promo.findUnique({
        where: { id_promo: Number(id_promo) },
        });

        if (!promo) {
        return res.status(404).json({ success: false, message: "Promo not found" });
        }

        res.status(200).json({
        success: true,
        data: {
            ...promo,
            tanggal_mulai: formatDate(promo.tanggal_mulai),
            tanggal_berakhir: formatDate(promo.tanggal_berakhir)
        }
        });

    } catch (error) {
        console.error("Error getPromoDetail:", error);
        res.status(500).json({ success: false, message: "Error retrieving promo detail" });
    }
};

export const createPromo = async (req, res) => {
try {
    const { id_umkm } = req.params;
    const {
    nama_promo,
    deskripsi,
    syarat_penggunaan,
    cara_penggunaan,
    tanggal_mulai,
    tanggal_berakhir,
    } = req.body;

    const newPromo = await prisma.promo.create({
    data: {
        id_umkm: Number(id_umkm),
        nama_promo,
        deskripsi,
        syarat_penggunaan,
        cara_penggunaan,
        tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
        tanggal_berakhir: tanggal_berakhir ? new Date(tanggal_berakhir) : null,
    },
    });

    res.status(201).json({
    success: true,
    message: "Promo created successfully",
    data: newPromo,
    });
} catch (error) {
    console.error("Error createPromo:", error);
    res.status(500).json({ success: false, message: "Failed to create promo" });
}
};

export const updatePromo = async (req, res) => {
try {
    const { id_promo } = req.params;
    const {
    nama_promo,
    deskripsi,
    syarat_penggunaan,
    cara_penggunaan,
    tanggal_mulai,
    tanggal_berakhir,
    } = req.body;

    const updatedPromo = await prisma.promo.update({
    where: { id_promo: Number(id_promo) },
    data: {
        nama_promo,
        deskripsi,
        syarat_penggunaan,
        cara_penggunaan,
        tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
        tanggal_berakhir: tanggal_berakhir ? new Date(tanggal_berakhir) : null,
    },
    });

    res.status(200).json({
    success: true,
    message: "Promo updated successfully",
    data: updatedPromo,
    });
} catch (error) {
    console.error("Error updatePromo:", error);
    res.status(500).json({ success: false, message: "Failed to update promo" });
}
};

export const deletePromo = async (req, res) => {
try {
    const { id_promo } = req.params;

    await prisma.promo.delete({
    where: { id_promo: Number(id_promo) },
    });

    res.status(200).json({
    success: true,
    message: "Promo deleted successfully",
    });
} catch (error) {
    console.error("Error deletePromo:", error);
    res.status(500).json({ success: false, message: "Failed to delete promo" });
}
};