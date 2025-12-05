import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const addUMKM = async (req, res) => {
  try {
    const {
      id_user,
      id_kategori_umkm,
      nama_umkm,
      alamat,
      no_telepon,
      deskripsi,
      link_lokasi,
    } = req.body;

    // Jika pakai multer
    const gambar = req.file ? req.file.filename : req.body.gambar || null;

    if (!id_user || !id_kategori_umkm || !nama_umkm) {
      return res.status(400).json({
        success: false,
        message: "id_user, id_kategori_umkm, dan nama_umkm wajib diisi",
      });
    }

    if (isNaN(id_user) || isNaN(id_kategori_umkm)) {
      return res.status(400).json({
        success: false,
        message: "id_user dan id_kategori_umkm harus angka",
      });
    }

    // cek user ada atau tidak
    const userExists = await prisma.user.findUnique({
      where: { id_user: Number(id_user) }
    });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    const newUmkm = await prisma.uMKM.create({
      data: {
        id_user: Number(id_user),
        id_kategori_umkm: Number(id_kategori_umkm),
        nama_umkm,
        alamat,
        no_telepon,
        deskripsi,
        link_lokasi,
        gambar,
      },
    });

    res.status(201).json({
      success: true,
      message: "UMKM berhasil ditambahkan",
      data: newUmkm,
    });
  } catch (error) {
    console.error("Error adding UMKM:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUMKMByUser = async (req, res) => {
  try {
    const { id_user } = req.params;

    const data = await prisma.uMKM.findMany({
      where: { id_user: Number(id_user) }
    });

    return res.json({
      success: true,
      data,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUMKM = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: "id tidak valid" });
    }

    // Cek record ada
    const umkm = await prisma.uMKM.findUnique({
      where: { id_umkm: Number(id) },
    });

    if (!umkm) {
      return res.status(404).json({ success: false, message: "UMKM tidak ditemukan" });
    }

    // Hapus file gambar jika ada dan file ada di filesystem
    if (umkm.gambar) {
      try {
        // __dirname relative from controller file — sesuaikan jika struktur beda
        const uploadsPath = path.join(process.cwd(), "public", "uploads", umkm.gambar);
        if (fs.existsSync(uploadsPath)) {
          fs.unlinkSync(uploadsPath);
        }
      } catch (e) {
        console.error("Gagal menghapus file gambar:", e);
      }
    }

    // Hapus record di DB
    await prisma.uMKM.delete({
      where: { id_umkm: Number(id) }
    });

    return res.status(200).json({ success: true, message: "UMKM berhasil dihapus" });
  } catch (error) {
    console.error("Error delete UMKM:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
  }
};
