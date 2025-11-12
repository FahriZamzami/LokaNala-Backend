import jwt from "jsonwebtoken";
import { prisma } from "../config/prismaclient.js";

const JWT_SECRET = process.env.JWT_SECRET || "lokanala_secret";

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user)
            return res.status(404).json({ message: "User tidak ditemukan" });

        if (user.password !== password)
            return res.status(401).json({ message: "Password salah" });

        const token = jwt.sign(
            { id_user: user.id_user, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            message: "Login berhasil",
            token,
            user: {
                id_user: user.id_user,
                nama: user.nama,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        res.status(500).json({ message: "Terjadi kesalahan server", error: err.message });
    }
};
