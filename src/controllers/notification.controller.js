import { prisma } from "../config/prismaclient.js";

// GET /api/user/notifications
export const getUserNotifications = async (req, res) => {
    try {
        // Ambil id_user dari token yang sudah di-decode di middleware
        const userId = req.user.id_user; // dari token JWT
        
        // Query database menggunakan Prisma
        const notifications = await prisma.notificationSendTo.findMany({
        where: {
            id_user: userId
        },
        include: {
            notifikasi: true // Join dengan tabel Notifikasi
        },
        orderBy: {
            dikirim_pada: 'desc' // Urutkan dari yang terbaru
        }
        });
        
        // Format response sesuai dengan NotificationApiItem
        const formattedNotifications = notifications.map(item => ({
        id_notifikasi: item.notifikasi.id_notifikasi,
        judul: item.notifikasi.judul,
        isi: item.notifikasi.isi,
        tanggal_kirim: item.notifikasi.tanggal_kirim.toISOString(),
        dikirim_pada: item.dikirim_pada.toISOString(),
        id_user: item.id_user
        }));
        
        res.json({
        success: true,
        message: "Berhasil mengambil notifikasi",
        data: formattedNotifications
        });
        
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
        success: false,
        message: "Gagal mengambil notifikasi",
        data: null
        });
    }
};