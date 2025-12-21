import { prisma } from "../config/prismaclient.js";

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

export const getMerchantDetail = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: "ID UMKM diperlukan" });

        const umkmId = parseInt(id);

        const merchantData = await prisma.uMKM.findUnique({
            where: { id_umkm: umkmId },
            include: {
                kategori_umkm: true,
                promo: { orderBy: { id_promo: "desc" } },
                produk: {
                    orderBy: { id_produk: "desc" },
                    include: {
                        kategori_produk: true,
                        _count: { select: { ulasan: true } },
                    },
                },
            },
        });

        if (!merchantData) return res.status(404).json({ success: false, message: "UMKM tidak ditemukan" });

        // Response Sukses dengan pemrosesan URL Gambar
        res.status(200).json({
            success: true,
            message: "Berhasil mengambil detail UMKM",
            data: {
                id: merchantData.id_umkm,
                nama: merchantData.nama_umkm,
                deskripsi: merchantData.deskripsi,
                alamat: merchantData.alamat,
                link_lokasi: merchantData.link_lokasi,
                
                // ⭐ PERBAIKAN: Tambahkan URL untuk Logo/Gambar UMKM
                gambar_url: generateUrls(merchantData.gambar, req), 
                
                rating: 4.8, 
                kategori: merchantData.kategori_umkm?.nama_kategori || "Umkm",

                promos: merchantData.promo.map((p) => ({
                    id_promo: p.id_promo,
                    nama_promo: p.nama_promo,
                    deskripsi: p.deskripsi,
                    syarat: p.syarat_penggunaan,
                    berlaku_sampai: p.tanggal_berakhir,
                })),

                products: merchantData.produk.map((p) => ({
                    id_produk: p.id_produk,
                    nama_produk: p.nama_produk,
                    deskripsi: p.deskripsi,
                    harga: p.harga,
                    
                    // ⭐ PERBAIKAN: Tambahkan URL lengkap untuk Gambar Produk
                    gambar_url: generateUrls(p.gambar, req), 
                    
                    kategori_produk: p.kategori_produk?.nama_kategori || "Lainnya",
                    jumlah_ulasan: p._count.ulasan,
                })),
            },
        });
    } catch (error) {
        console.error("Error getting merchant detail:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};