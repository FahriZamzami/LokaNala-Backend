import jwt from "jsonwebtoken";
import { prisma } from "../config/prismaclient.js";

const JWT_SECRET = process.env.JWT_SECRET || "lokanala_secret";

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Cari user berdasarkan email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }

        // Cek password (belum hashing)
        if (user.password !== password) {
            return res.status(401).json({ message: "Password salah" });
        }

        // Generate token
        const token = jwt.sign(
            {
                id_user: user.id_user,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        const fotoProfileUrl = generateUrl(user.foto_profile, req);

        // Response sederhana
        res.json({
            message: "Login berhasil",
            token,
            user: {
                id_user: user.id_user,
                nama: user.nama,
                email: user.email,
                no_telepon: user.no_telepon,
                foto_profile: fotoProfileUrl
            },
        });

    } catch (err) {
        res.status(500).json({
            message: "Terjadi kesalahan server",
            error: err.message
        });
    }
};

export const generateUrl = (filename, req) => {
    if (!filename) return null;

    const host = req.get("x-forwarded-host") || req.get("host");
    const protocol = req.get("x-forwarded-proto") || req.protocol;

    const BASE_URL = `${protocol}://${host}`;

    if (filename.startsWith("http")) return filename;

    return `${BASE_URL}/uploads/${filename}`;
};