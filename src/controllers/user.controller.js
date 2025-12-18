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

        // Response sederhana
        res.json({
            message: "Login berhasil",
            token,
            user: {
                id_user: user.id_user,
                nama: user.nama,
                email: user.email,
                no_telepon: user.no_telepon,
                foto_profile: user.foto_profile
            },
        });

    } catch (err) {
        res.status(500).json({
            message: "Terjadi kesalahan server",
            error: err.message
        });
    }
};

export const getMyUMKM = async (req, res) => {
  try {
    // 1. Ambil ID User dari Middleware (req.user diset oleh auth.js)
    const userId = req.user.id_user;

    // 2. Query UMKM milik user tersebut
    const myUmkmList = await prisma.uMKM.findMany({
      where: {
        id_user: userId,
      },
      include: {
        // Kita butuh data produk & ulasan untuk menghitung rating rata-rata toko
        produk: {
          select: {
            ulasan: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
    });

    // 3. Helper URL Gambar Dinamis
    const generateUrl = (filename) => {
      if (!filename) return null;
      if (filename.startsWith("http")) return filename;
      const host = req.get("host");
      const protocol = req.protocol || "http";
      return `${protocol}://${host}/uploads/${filename}`;
    };

    // 4. Format Data untuk Response
    const formattedData = myUmkmList.map((umkm) => {
      // Hitung Rating Rata-rata UMKM (Rata-rata dari semua ulasan di semua produk)
      let totalRating = 0;
      let reviewCount = 0;

      umkm.produk.forEach((prod) => {
        prod.ulasan.forEach((rev) => {
          totalRating += rev.rating;
          reviewCount++;
        });
      });

      const averageRating = reviewCount > 0 ? (totalRating / reviewCount) : 0.0;

      return {
        id: umkm.id_umkm,
        name: umkm.nama_umkm,
        rating: parseFloat(averageRating.toFixed(1)), // Contoh: 4.5
        imageRes: generateUrl(umkm.gambar), // URL Foto Profil UMKM
      };
    });

    res.status(200).json({
      success: true,
      message: "Berhasil mengambil data UMKM Saya",
      data: formattedData,
    });

  } catch (error) {
    console.error("Error getMyUMKM:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
};