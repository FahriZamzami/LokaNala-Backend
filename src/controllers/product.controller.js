import { prisma } from "../config/prismaclient.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../public/uploads");

// ------------------------------------------------------------------
// HELPER: Generate URL Gambar (Versi Perbaikan & Fail-Safe)
// ------------------------------------------------------------------
export const generateUrls = (filenameString, req) => {
    if (!filenameString) return null;

    /**
     * Dengan 'trust proxy' aktif:
     * req.protocol akan mengambil nilai dari X-Forwarded-Proto
     * req.get('host') akan mengambil nilai dari X-Forwarded-Host
     */
    
    // Ambil host dari proxy atau host request saat ini
    let host = req.get("x-forwarded-host") || req.get("host");
    let protocol = req.get("x-forwarded-proto") || req.protocol;

    // Log untuk pengecekan di Console
    console.log(`--- Trust Proxy Check ---`);
    console.log(`Original Host: ${req.get("host")}`);
    console.log(`Proxy Host: ${req.get("x-forwarded-host")}`);
    console.log(`Final URL Protocol: ${protocol}`);

    // LOGIC FALLBACK: Jika terdeteksi localhost, arahkan ke DevTunnel
    // if (host.includes("localhost") || host.includes("127.0.0.1")) {
    //     host = "9l45jg26-3000.asse.devtunnels.ms";
    //     protocol = "https";
    //     console.log(`Fallback Active: Localhost detected, redirecting to DevTunnel`);
    // }

    const BASE_URL = `${protocol}://${host}`;

    const urls = filenameString
        .split(",")
        .map(name => {
            let filename = name.trim();
            if (filename.startsWith("http")) return filename; 
            
            // Bersihkan path jika ada prefix
            filename = filename.replace(/^\/uploads\//, "").replace(/^uploads\//, "");
            return `${BASE_URL}/uploads/${filename}`;
        })
        .join(",");

    console.log(`Resulting URLs: ${urls}`);
    console.log(`-------------------------`);
    
    return urls;
};

// ------------------------------------------------------------------
// 1. DETAIL PRODUK
// ------------------------------------------------------------------
export const getProductDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);

        const ratingAgg = await prisma.ulasan.aggregate({
            where: { id_produk: productId },
            _avg: { rating: true },
            _count: { rating: true },
        });

        const productData = await prisma.produk.findUnique({
            where: { id_produk: productId },
            include: {
                umkm: { select: { id_umkm: true, nama_umkm: true, gambar: true } },
                kategori_produk: true,
                ulasan: {
                    orderBy: [{ rating: "desc" }, { tanggal_ulasan: "desc" }],
                    take: 1,
                    include: { user: { select: { nama: true, foto_profile: true } } },
                },
            },
        });

        if (!productData) return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });

        const responseData = {
            id: productData.id_produk,
            nama_produk: productData.nama_produk,
            deskripsi: productData.deskripsi,
            harga: productData.harga,
            gambar: generateUrls(productData.gambar, req), // Gunakan generateUrls
            rating_rata_rata: parseFloat((ratingAgg._avg.rating || 0).toFixed(1)),
            jumlah_ulasan: ratingAgg._count.rating,
            umkm: {
                id: productData.umkm.id_umkm,
                nama: productData.umkm.nama_umkm,
                logo: generateUrls(productData.umkm.gambar, req),
            },
            ulasan_terbaik: productData.ulasan.length > 0 ? {
                id_ulasan: productData.ulasan[0].id_ulasan,
                nama_user: productData.ulasan[0].user.nama,
                foto_user: generateUrls(productData.ulasan[0].user.foto_profile, req),
                rating: productData.ulasan[0].rating,
                komentar: productData.ulasan[0].komentar,
                tanggal: productData.ulasan[0].tanggal_ulasan,
            } : null,
        };

        res.status(200).json({ success: true, data: responseData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ------------------------------------------------------------------
// 2. PRODUK BY UMKM (DENGAN RATING)
// ------------------------------------------------------------------
export const getProductsByUmkm = async (req, res) => {
    try {
        const { umkmId } = req.params;
        const products = await prisma.produk.findMany({
            where: { id_umkm: parseInt(umkmId) },
            include: { kategori_produk: true },
            orderBy: { tanggal_ditambahkan: "desc" }
        });

        const formattedProducts = await Promise.all(products.map(async (product) => {
            const agg = await prisma.ulasan.aggregate({
                where: { id_produk: product.id_produk },
                _avg: { rating: true },
                _count: { rating: true }
            });

            return {
                id_produk: product.id_produk,
                nama_produk: product.nama_produk,
                deskripsi: product.deskripsi || "",
                harga: product.harga,
                gambar: generateUrls(product.gambar, req), // Sudah diperbaiki
                kategori_produk: product.kategori_produk ? {
                    id_kategori_produk: product.kategori_produk.id_kategori_produk,
                    nama_kategori: product.kategori_produk.nama_kategori,
                } : null,
                rating_rata_rata: agg._avg.rating ? parseFloat(agg._avg.rating.toFixed(1)) : 0,
                jumlah_ulasan: agg._count.rating || 0,
                tanggal_ditambahkan: product.tanggal_ditambahkan
            };
        }));

        res.status(200).json({ success: true, data: formattedProducts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ------------------------------------------------------------------
// 3. ADD PRODUK
// ------------------------------------------------------------------
export const addProduct = async (req, res) => {
    try {
        const { id_umkm, id_kategori_produk, nama_produk, deskripsi, harga } = req.body;
        const file = req.file;

        const newProduct = await prisma.produk.create({
            data: {
                id_umkm: parseInt(id_umkm),
                id_kategori_produk: id_kategori_produk ? parseInt(id_kategori_produk) : null,
                nama_produk,
                deskripsi: deskripsi || "",
                harga: parseFloat(harga),
                gambar: file ? file.filename : null,
            },
        });

        res.status(201).json({
            success: true,
            data: { ...newProduct, gambar: generateUrls(newProduct.gambar, req) }
        });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ------------------------------------------------------------------
// 4. UPDATE PRODUK
// ------------------------------------------------------------------
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_produk, deskripsi, harga } = req.body;
        const file = req.file;

        const existing = await prisma.produk.findUnique({ where: { id_produk: parseInt(id) } });
        if (!existing) {
            if (file) fs.unlinkSync(file.path);
            return res.status(404).json({ success: false, message: "Tidak ditemukan" });
        }

        if (file && existing.gambar) {
            existing.gambar.split(",").forEach(img => {
                const name = img.split("/").pop();
                const p = path.join(uploadDir, name);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            });
        }

        const updated = await prisma.produk.update({
            where: { id_produk: parseInt(id) },
            data: {
                nama_produk,
                deskripsi,
                harga: harga ? parseFloat(harga) : undefined,
                gambar: file ? file.filename : undefined,
            },
        });

        res.status(200).json({
            success: true,
            data: { ...updated, gambar: generateUrls(updated.gambar, req) }
        });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ------------------------------------------------------------------
// 5. DELETE PRODUK
// ------------------------------------------------------------------
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.produk.findUnique({ where: { id_produk: parseInt(id) } });

        if (existing && existing.gambar) {
            existing.gambar.split(",").forEach(img => {
                const name = img.split("/").pop();
                const p = path.join(uploadDir, name);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            });
        }

        await prisma.produk.delete({ where: { id_produk: parseInt(id) } });
        res.status(200).json({ success: true, message: "Dihapus" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};