import { prisma } from "../config/prismaclient.js";

export const followUMKM = async (req, res) => {
try {
    const id_user = req.user.id_user;      
    const { id_umkm } = req.params;        

    const umkm = await prisma.uMKM.findUnique({
    where: { id_umkm: Number(id_umkm) }
    });

    if (!umkm) {
    return res.status(404).json({
        message: "UMKM tidak ditemukan"
    });
    }

    const alreadyFollow = await prisma.follow.findUnique({
    where: {
        id_user_id_umkm: {
        id_user,
        id_umkm: Number(id_umkm)
        }
    }
    });

    if (alreadyFollow) {
    return res.status(400).json({
        message: "UMKM sudah di-follow"
    });
    }

    await prisma.follow.create({
    data: {
        id_user,
        id_umkm: Number(id_umkm)
    }
    });

    return res.status(201).json({
    message: "Berhasil follow UMKM"
    });

} catch (error) {
    console.error(error);
    return res.status(500).json({
    message: "Terjadi kesalahan server"
    });
}
};

export const unfollowUMKM = async (req, res) => {
try {
    const id_user = req.user.id_user;
    const { id_umkm } = req.params;

    await prisma.follow.delete({
    where: {
        id_user_id_umkm: {
        id_user,
        id_umkm: Number(id_umkm)
        }
    }
    });

    return res.status(200).json({
    message: "Berhasil unfollow UMKM"
    });

} catch (error) {
    if (error.code === "P2025") {
    return res.status(404).json({
        message: "Follow tidak ditemukan"
    });
    }

    console.error(error);
    return res.status(500).json({
    message: "Terjadi kesalahan server"
    });
}
};

export const checkFollowStatus = async (req, res) => {
try {
    const id_user = req.user.id_user;
    const { id_umkm } = req.params;

    const follow = await prisma.follow.findUnique({
    where: {
        id_user_id_umkm: {
        id_user,
        id_umkm: Number(id_umkm)
        }
    }
    });

    return res.status(200).json({
    isFollowing: !!follow
    });

} catch (error) {
    console.error(error);
    return res.status(500).json({
    message: "Terjadi kesalahan server"
    });
}
};

export const getFollowedUMKM = async (req, res) => {
try {
    const id_user = req.user.id_user;

    const followed = await prisma.follow.findMany({
    where: { id_user },
    include: {
        umkm: {
        include: {
            kategori_umkm: true
        }
        }
    }
    });

    return res.status(200).json(followed);

} catch (error) {
    console.error(error);
    return res.status(500).json({
    message: "Terjadi kesalahan server"
    });
}
};