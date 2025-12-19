// src/middleware/auth.middleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "lokanala_secret";

export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authorization token tidak ditemukan"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // SIMPAN USER DARI JWT KE REQUEST
        req.user = {
            id_user: decoded.id_user,
            email: decoded.email
        };

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Token tidak valid atau kadaluarsa"
        });
    }
};