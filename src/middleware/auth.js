// File: src/middleware/auth.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "lokanala_secret";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({ message: "Akses ditolak, token tidak ada" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token tidak valid" });
    }
    
    // Simpan data user (dari token) ke request agar bisa dipakai di controller
    req.user = user; 
    next();
  });
};