import { prisma } from "../config/prismaclient.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup path untuk manajemen file (hapus gambar)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../public/uploads");

// ------------------------------------------------------------------
// HELPER: Generate URL Gambar
// ------------------------------------------------------------------
// Fungsi ini memastikan 'gambar' yang dikembalikan ke Android adalah
// URL lengkap dengan devtunnel URL. Jika ada banyak gambar (koma), kita ambil yang PERTAMA
// sebagai thumbnail agar tidak merusak UI Android yang mengharapkan String.
const generateUrl = (req, filenameString) => {
  if (!filenameString) return null;

  // Ambil file pertama saja jika ada koma (untuk kompatibilitas UI List)
  let firstFilename = filenameString.includes(",") 
    ? filenameString.split(",")[0] 
    : filenameString;

  // Jika sudah URL lengkap, pastikan tidak mengandung localhost
  if (firstFilename.startsWith("http://") || firstFilename.startsWith("https://")) {
    // Jika mengandung localhost atau 127.0.0.1, ganti dengan devtunnel URL
    if (firstFilename.includes("localhost") || firstFilename.includes("127.0.0.1")) {
      const filename = firstFilename.split("/").pop();
      return `https://9l45jg26-3000.asse.devtunnels.ms/uploads/${filename}`;
    }
    return firstFilename;
  }

  // Extract filename jika ada path (misal: /uploads/filename.jpg atau uploads/filename.jpg)
  firstFilename = firstFilename.replace(/^\/uploads\//, "").replace(/^uploads\//, "");

  // Gunakan req.protocol dan req.get('host') yang sudah mendukung trust proxy
  let host = req.get("host");
  const protocol = req.protocol || (req.secure ? "https" : "http");
  
  // ⭐ PENTING: Jika host mengandung localhost atau 127.0.0.1, ganti dengan devtunnel URL
  if (host && (host.includes("localhost") || host.includes("127.0.0.1"))) {
    host = "9l45jg26-3000.asse.devtunnels.ms";
    return `https://${host}/uploads/${firstFilename}`;
  }
  
  // Jika host tidak ada atau kosong, gunakan devtunnel URL sebagai fallback
  if (!host) {
    host = "9l45jg26-3000.asse.devtunnels.ms";
    return `https://${host}/uploads/${firstFilename}`;
  }
  
  return `${protocol}://${host}/uploads/${firstFilename}`;
};

export const getProductDetail = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
        return res.status(400).json({
            success: false,
            message: "ID Produk diperlukan",
        });
        }

        const productId = parseInt(id);

        // --- 1. Hitung Rata-rata Rating & Jumlah Ulasan ---
        const ratingAgg = await prisma.ulasan.aggregate({
        where: { id_produk: productId },
        _avg: { rating: true },
        _count: { rating: true },
        });

        const averageRating = ratingAgg._avg.rating || 0.0; // Default 0.0 jika belum ada rating
        const totalReviews = ratingAgg._count.rating;

        // --- 2. Ambil Detail Produk & 1 Ulasan Terbaik ---
        const productData = await prisma.produk.findUnique({
        where: { id_produk: productId },
        include: {
            // Ambil info UMKM pemilik produk
            umkm: {
            select: {
                id_umkm: true,
                nama_umkm: true,
                gambar: true, // Foto profil UMKM
            },
            },
            // Ambil Kategori
            kategori_produk: true,

            // Ambil 1 Ulasan Terbaik
            ulasan: {
            orderBy: [
                { rating: "desc" }, // Rating tertinggi
                { tanggal_ulasan: "desc" }, // Jika rating sama, ambil yang terbaru
            ],
            take: 1, // Cuma ambil 1
            include: {
                user: {
                select: {
                    nama: true,
                    foto_profile: true,
                },
                },
            },
            },
        },
        });

        if (!productData) {
        return res.status(404).json({
            success: false,
            message: "Produk tidak ditemukan",
        });
        }

        // --- 3. Susun Response Data ---
        const responseData = {
        id: productData.id_produk,
        nama_produk: productData.nama_produk,
        deskripsi: productData.deskripsi,
        harga: productData.harga,
        gambar: generateUrl(req, productData.gambar),
        
        // Statistik Rating
        rating_rata_rata: parseFloat(averageRating.toFixed(1)), // Pembulatan 1 desimal (misal 4.5)
        jumlah_ulasan: totalReviews,
        
        // Info UMKM
        umkm: {
            id: productData.umkm.id_umkm,
            nama: productData.umkm.nama_umkm,
            logo: generateUrl(req, productData.umkm.gambar),
        },

        // Info Ulasan Terbaik (Top Review)
        ulasan_terbaik:
            productData.ulasan.length > 0
            ? {
                id_ulasan: productData.ulasan[0].id_ulasan,
                nama_user: productData.ulasan[0].user.nama,
                foto_user: generateUrl(req, productData.ulasan[0].user.foto_profile),
                rating: productData.ulasan[0].rating,
                komentar: productData.ulasan[0].komentar,
                tanggal: productData.ulasan[0].tanggal_ulasan,
                }
            : null, // Null jika belum ada ulasan
        };

        res.status(200).json({
        success: true,
        message: "Berhasil mengambil detail produk",
        data: responseData,
        });

    } catch (error) {
        console.error("Error detail produk:", error);
        res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server",
        });
    }
};

// Mendapatkan semua produk berdasarkan ID UMKM
export const getProductsByUmkm = async (req, res) => {
    try {
        const { umkmId } = req.params;

        // Validasi umkmId
        if (!umkmId) {
            return res.status(400).json({
                success: false,
                message: "ID UMKM diperlukan",
            });
        }

        const umkmIdInt = parseInt(umkmId);

        if (isNaN(umkmIdInt)) {
            return res.status(400).json({
                success: false,
                message: "ID UMKM harus berupa angka",
            });
        }

        // Cek apakah UMKM ada
        const umkmExists = await prisma.uMKM.findUnique({
            where: { id_umkm: umkmIdInt },
            select: { id_umkm: true }
        });

        if (!umkmExists) {
            return res.status(404).json({
                success: false,
                message: "UMKM tidak ditemukan",
            });
        }

        // Query produk berdasarkan id_umkm
        const products = await prisma.produk.findMany({
            where: {
                id_umkm: umkmIdInt
            },
            include: {
                kategori_produk: true,
                _count: {
                    select: { ulasan: true }
                }
            },
            orderBy: {
                tanggal_ditambahkan: "desc"
            }
        });

        // ⭐ AMBIL DATA RATING UNTUK SEMUA PRODUK
        // Query aggregate rating untuk menghitung rating_rata_rata dan jumlah_ulasan
        const productIds = products.map(p => p.id_produk);

        // Query aggregate rating untuk semua produk sekaligus (lebih efisien daripada loop)
        const ratingAggregates = await Promise.all(
            productIds.map(productId =>
                prisma.ulasan.aggregate({
                    where: { id_produk: productId },
                    _avg: { rating: true },  // Rata-rata rating
                    _count: { rating: true }  // Jumlah ulasan
                })
            )
        );

        // Buat map untuk akses cepat rating berdasarkan productId
        const ratingMap = new Map();
        productIds.forEach((productId, index) => {
            const aggregate = ratingAggregates[index];
            ratingMap.set(productId, {
                // ⚠️ PENTING: Pastikan selalu number, bukan null
                // Jika tidak ada rating, kembalikan 0 (bukan null)
                rating_rata_rata: aggregate._avg.rating ? parseFloat(aggregate._avg.rating.toFixed(2)) : 0,
                jumlah_ulasan: aggregate._count.rating || 0
            });
        });

        // Format response data dengan rating
        const formattedProducts = products.map(product => {
            const ratingData = ratingMap.get(product.id_produk) || { rating_rata_rata: 0, jumlah_ulasan: 0 };
            
            return {
                id_produk: product.id_produk,
                nama_produk: product.nama_produk,
                deskripsi: product.deskripsi || "",
                harga: product.harga,
                gambar: generateUrl(req, product.gambar),
                kategori_produk: product.kategori_produk ? {
                    id_kategori_produk: product.kategori_produk.id_kategori_produk,
                    nama_kategori: product.kategori_produk.nama_kategori,
                    deskripsi: product.kategori_produk.deskripsi || ""
                } : null,
                rating_rata_rata: ratingData.rating_rata_rata, // ⚠️ WAJIB: number, bukan null
                jumlah_ulasan: ratingData.jumlah_ulasan,       // ⚠️ WAJIB: number, bukan null
                tanggal_ditambahkan: product.tanggal_ditambahkan
            };
        });

        res.status(200).json({
            success: true,
            message: "Data retrieved successfully",
            data: formattedProducts
        });

    } catch (error) {
        console.error("Error fetching products by UMKM:", error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server",
            msg: error.message || "Internal server error"
        });
    }
};

// ------------------------------------------------------------------
// 3. CREATE PRODUK (SINGLE IMAGE)
// ------------------------------------------------------------------
export const addProduct = async (req, res) => {
  try {
    const { id_umkm, id_kategori_produk, nama_produk, deskripsi, harga } = req.body;
    const file = req.file; // <-- KEMBALI KE SINGLE FILE

    if (!id_umkm || !nama_produk || !harga) {
      if (file) fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: "Data wajib tidak lengkap" });
    }

    const newProduct = await prisma.produk.create({
      data: {
        id_umkm: parseInt(id_umkm),
        id_kategori_produk: id_kategori_produk ? parseInt(id_kategori_produk) : null,
        nama_produk: nama_produk,
        deskripsi: deskripsi || "",
        harga: parseFloat(harga),
        gambar: file ? file.filename : null, // Simpan 1 nama file
      },
    });

    res.status(201).json({
      success: true,
      message: "Produk berhasil ditambahkan",
      data: {
        ...newProduct,
        gambar: generateUrl(req, newProduct.gambar)
      },
    });

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path); // Cleanup single file
    console.error("Error addProduct:", error);
    res.status(500).json({ success: false, message: "Gagal menambahkan produk", error: error.message });
  }
};

// ------------------------------------------------------------------
// 4. UPDATE PRODUK
// ------------------------------------------------------------------
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_umkm, id_kategori_produk, nama_produk, deskripsi, harga } = req.body;
    const file = req.file; // Gambar baru (opsional)

    // Validasi ID
    if (!id) {
      if (file) fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: "ID Produk diperlukan" });
    }

    const productId = parseInt(id, 10);

    // Cek apakah produk ada
    const existingProduct = await prisma.produk.findUnique({
      where: { id_produk: productId }
    });

    if (!existingProduct) {
      if (file) fs.unlinkSync(file.path);
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    // Validasi data wajib
    if (!nama_produk || !harga) {
      if (file) fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: "Nama produk dan harga wajib diisi" });
    }

    // Data untuk update
    const updateData = {
      nama_produk: nama_produk,
      deskripsi: deskripsi || "",
      harga: parseFloat(harga),
    };

    // Update id_umkm jika diberikan
    if (id_umkm) {
      updateData.id_umkm = parseInt(id_umkm);
    }

    // Update kategori jika diberikan
    if (id_kategori_produk) {
      updateData.id_kategori_produk = parseInt(id_kategori_produk);
    }

    // Jika ada gambar baru, update gambar dan hapus gambar lama
    if (file) {
      // Hapus gambar lama jika ada
      if (existingProduct.gambar) {
        const oldFilenames = existingProduct.gambar.split(",");
        oldFilenames.forEach(filenameOrUrl => {
          // Extract filename dari URL jika memang URL lengkap (untuk backward compatibility)
          let filename = filenameOrUrl.trim();
          if (filename.startsWith("http://") || filename.startsWith("https://")) {
            // Extract filename dari URL: https://domain.com/uploads/filename.jpg -> filename.jpg
            filename = filename.split("/").pop();
          }
          // Hapus prefix path jika ada: /uploads/filename.jpg atau uploads/filename.jpg -> filename.jpg
          filename = filename.replace(/^\/uploads\//, "").replace(/^uploads\//, "");
          
          const filePath = path.join(uploadDir, filename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (e) {
              console.warn(`Gagal menghapus file lama ${filename}:`, e.message);
            }
          }
        });
      }
      updateData.gambar = file.filename; // Simpan hanya filename, bukan URL lengkap
    }
    // Jika tidak ada gambar baru, tetap gunakan gambar lama (tidak di-update)

    // Update produk
    const updatedProduct = await prisma.produk.update({
      where: { id_produk: productId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Produk berhasil diperbarui",
      data: {
        ...updatedProduct,
        gambar: generateUrl(req, updatedProduct.gambar)
      },
    });

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error("Error updateProduct:", error);
    res.status(500).json({ 
      success: false, 
      message: "Gagal memperbarui produk", 
      error: error.message 
    });
  }
};

// ------------------------------------------------------------------
// 5. DELETE PRODUK (Hapus Semua File Terkait)
// ------------------------------------------------------------------
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id);

    const existingProduct = await prisma.produk.findUnique({
      where: { id_produk: productId }
    });

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    // Hapus file fisik dari server
    if (existingProduct.gambar) {
      // Pecah string berdasarkan koma untuk mendapatkan semua nama file
      const filenames = existingProduct.gambar.split(",");
      
      filenames.forEach(filenameOrUrl => {
        // Extract filename dari URL jika memang URL lengkap (untuk backward compatibility)
        let filename = filenameOrUrl.trim();
        if (filename.startsWith("http://") || filename.startsWith("https://")) {
          // Extract filename dari URL: https://domain.com/uploads/filename.jpg -> filename.jpg
          filename = filename.split("/").pop();
        }
        // Hapus prefix path jika ada: /uploads/filename.jpg atau uploads/filename.jpg -> filename.jpg
        filename = filename.replace(/^\/uploads\//, "").replace(/^uploads\//, "");
        
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.warn(`Gagal menghapus file ${filename}:`, e.message);
          }
        }
      });
    }

    // Hapus data dari DB
    await prisma.produk.delete({
      where: { id_produk: productId },
    });

    res.status(200).json({ success: true, message: "Produk berhasil dihapus" });

  } catch (error) {
    console.error("Error deleteProduct:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};