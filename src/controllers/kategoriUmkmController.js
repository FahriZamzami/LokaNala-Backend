import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getKategoriUmkm = async (req, res) => {
  try {
    const kategori = await prisma.kategoriUMKM.findMany();
    res.json({
      success: true,
      data: kategori
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil kategori" });
  }
};
