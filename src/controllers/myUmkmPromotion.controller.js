import { prisma } from "../config/prismaclient.js";
import { sendFirebaseNotification } from "../utility/firebase.js";

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
        const { nama_promo, deskripsi, syarat_penggunaan, cara_penggunaan, tanggal_mulai, tanggal_berakhir } = req.body;

        // Ambil UMKM + owner
        const umkm = await prisma.UMKM.findUnique({
            where: { id_umkm: Number(id_umkm) },
            include: {
                user: {
                    select: {
                        id_user: true,      // ⬅️ TAMBAH
                        fcm_token: true
                    }
                }
            }
        });

        if (!umkm) {
            return res.status(404).json({ success: false, message: "UMKM tidak ditemukan" });
        }

        // Ambil follower (hanya id_user)
        const followers = await prisma.follow.findMany({
            where: { id_umkm: Number(id_umkm) },
            select: { id_user: true }
        });

        // Ambil fcm_token dari user berdasarkan id_user follower
        const followerIds = followers.map(f => f.id_user);
        const followerUsers = await prisma.user.findMany({
            where: {
                id_user: { in: followerIds }
            },
            select: {
                id_user: true,
                fcm_token: true
            }
        });

        // Simpan promo
        const promo = await prisma.promo.create({
            data: {
                id_umkm: Number(id_umkm),
                nama_promo,
                deskripsi,
                syarat_penggunaan,
                cara_penggunaan,
                tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
                tanggal_berakhir: tanggal_berakhir ? new Date(tanggal_berakhir) : null,
            }
        });

        // Buat notifikasi DB
        const notifikasi = await prisma.notifikasi.create({
            data: {
                judul: "Promo Baru 🎉",
                isi: `${umkm.nama_umkm} menambahkan promo baru: ${nama_promo}`,
            }
        });

        // Kirim notifikasi ke follower (simpan ke DB)
        if (followers.length > 0) {
            await prisma.notificationSendTo.createMany({
                data: followers.map(f => ({
                    id_notifikasi: notifikasi.id_notifikasi,
                    id_user: f.id_user,
                }))
            });

            // Kirim Firebase notification ke semua follower yang punya FCM token
            const fcmPromises = followerUsers
                .filter(user => user.fcm_token)
                .map(user =>
                    sendFirebaseNotification(
                        user.fcm_token,
                        "Promo Baru 🎉",
                        `${umkm.nama_umkm} menambahkan promo baru: ${nama_promo}`,
                        {
                            targetUserId: user.id_user,
                            type: "promo",
                            promoId: promo.id_promo
                        }
                    ).catch(err => {
                        console.error(`Failed to send FCM to user ${user.id_user}:`, err);
                        return null;
                    })
                );

            await Promise.all(fcmPromises);
            console.log(`Notifikasi terkirim ke ${fcmPromises.length} follower`);
        }

        // Firebase ke owner UMKM
        if (umkm.user?.fcm_token) {
            await sendFirebaseNotification(
                umkm.user.fcm_token,
                "Promo berhasil ditambahkan",
                `Promo "${nama_promo}" berhasil ditambahkan`,
                {
                    targetUserId: umkm.user.id_user, 
                    type: "promo_created",
                    promoId: promo.id_promo
                }
            );
        }

        res.status(201).json({
            success: true,
            message: "Promo berhasil ditambahkan & notifikasi terkirim",
            data: promo,
            notificationsSent: followerUsers.filter(u => u.fcm_token).length
        });

    } catch (error) {
        console.error("Error createPromo:", error);
        res.status(500).json({ success: false, message: "Failed to create promo", error: error.message });
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