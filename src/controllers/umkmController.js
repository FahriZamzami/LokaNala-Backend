import { prisma } from "../config/prismaclient.js";
import { generateUrls } from "./product.controller.js"; 

import fs from "fs";
import path from "path";

export const getAllKategoriUMKM = async (req, res) => {
    try {
        const categories = await prisma.kategoriUMKM.findMany({
            orderBy: {
                nama_kategori: 'asc' 
            }
        });

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyUmkm = async (req, res) => {
    try {
        const userId = parseInt(req.query.id_user);
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ success: false, message: "id_user is required" });
        }

        const response = await prisma.uMKM.findMany({
            where: { id_user: userId },
            include: {
                kategori_umkm: true,
                produk: {
                    include: { ulasan: true }
                }
            },
            orderBy: { tanggal_terdaftar: "desc" }
        });

        const formattedResponse = response.map(umkm => {
            const allReviews = umkm.produk.flatMap(p => p.ulasan);
            const totalUlasan = allReviews.length;
            let finalRating = 0.0;

            if (totalUlasan > 0) {
                const totalBintang = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
                finalRating = Number((totalBintang / totalUlasan).toFixed(1));
            }

            return {
                id_umkm: umkm.id_umkm,
                id_kategori_umkm: umkm.id_kategori_umkm, 
                nama_umkm: umkm.nama_umkm,
                deskripsi: umkm.deskripsi || "",
                alamat: umkm.alamat || "",
                no_telepon: umkm.no_telepon || "",
                link_lokasi: umkm.link_lokasi || "", 
                gambar: generateUrls(umkm.gambar, req), 
                rating: finalRating,
                total_ulasan: totalUlasan
            };
        });

        res.status(200).json({
            success: true,
            message: "Data retrieved successfully",
            data: formattedResponse
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createUmkm = async (req, res) => {
    try {
        const { id_user, id_kategori_umkm, nama_umkm, alamat, no_telepon, deskripsi, link_lokasi } = req.body;
        
        const namaFileGambar = req.file ? req.file.filename : null;

        const userExists = await prisma.user.findUnique({ where: { id_user: parseInt(id_user) } });
        if (!userExists) return res.status(404).json({ success: false, message: "User tidak ditemukan" });

        const newUmkm = await prisma.uMKM.create({
            data: {
                id_user: parseInt(id_user),
                id_kategori_umkm: id_kategori_umkm ? parseInt(id_kategori_umkm) : null,
                nama_umkm,
                alamat,
                no_telepon,
                deskripsi,
                link_lokasi,
                gambar: namaFileGambar, 
            }
        });

        res.status(201).json({
            success: true,
            message: "UMKM berhasil didaftarkan",
            data: { ...newUmkm, gambar: generateUrls(newUmkm.gambar, req) }
        });
    } catch (error) {
        console.error("Error Create UMKM:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateUmkm = async (req, res) => {
    try {
        const { id_umkm } = req.params;
        const { id_kategori_umkm, nama_umkm, alamat, no_telepon, deskripsi, link_lokasi } = req.body;
        
        const existingUmkm = await prisma.uMKM.findUnique({ where: { id_umkm: parseInt(id_umkm) } });
        if (!existingUmkm) return res.status(404).json({ success: false, message: "UMKM tidak ditemukan" });

        const newImage = req.file ? req.file.filename : null;
        let finalImage = existingUmkm.gambar; 

        if (newImage) {
            if (existingUmkm.gambar) {
                const oldPath = path.join(process.cwd(), "public/uploads", existingUmkm.gambar);
                fs.unlink(oldPath, (err) => {
                    if (err) console.error("Gagal hapus gambar lama saat update:", err);
                });
            }
            finalImage = newImage; 
        }

        const updatedUmkm = await prisma.uMKM.update({
            where: { id_umkm: parseInt(id_umkm) },
            data: {
                id_kategori_umkm: id_kategori_umkm ? parseInt(id_kategori_umkm) : undefined,
                nama_umkm: nama_umkm || undefined,
                alamat: alamat || undefined,
                no_telepon: no_telepon || undefined,
                deskripsi: deskripsi || undefined,
                link_lokasi: link_lokasi || undefined,
                gambar: finalImage 
            }
        });

        res.status(200).json({
            success: true,
            message: "Data UMKM berhasil diperbarui",
            data: { 
                ...updatedUmkm, 
                gambar: generateUrls(updatedUmkm.gambar, req) 
            }
        });
    } catch (error) {
        console.error("Error Update UMKM:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteUmkm = async (req, res) => {
    try {
        const { id_umkm } = req.params;
        const id = parseInt(id_umkm);

        const umkm = await prisma.uMKM.findUnique({
            where: { id_umkm: id },
            select: { gambar: true }
        });

        if (!umkm) {
            return res.status(404).json({ success: false, message: "UMKM tidak ditemukan" });
        }

        await prisma.ulasan.deleteMany({
            where: { produk: { id_umkm: id } }
        });
        await prisma.produk.deleteMany({ where: { id_umkm: id } });
        await prisma.promo.deleteMany({ where: { id_umkm: id } });
        await prisma.kategoriProduk.deleteMany({ where: { id_umkm: id } });
        await prisma.follow.deleteMany({ where: { id_umkm: id } });

        await prisma.uMKM.delete({
            where: { id_umkm: id }
        });

        if (umkm.gambar) {
            const filePath = path.join(process.cwd(), "public/uploads", umkm.gambar);
            
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error("Gagal menghapus file gambar:", err);
                } else {
                    console.log(`File ${umkm.gambar} berhasil dihapus dari server`);
                }
            });
        }

        res.status(200).json({ success: true, message: "UMKM dan file gambar berhasil dihapus" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Gagal menghapus data" });
    }
};

export const getUmkmById = async (req, res) => {
    try {
        const { id_umkm } = req.params;

        const umkm = await prisma.uMKM.findUnique({
            where: { id_umkm: parseInt(id_umkm) },
            include: {
                kategori_umkm: true,
                produk: {
                    include: { ulasan: true }
                },
                _count: {
                    select: { produk: true, promo: true, follow: true }
                }
            }
        });

        if (!umkm) {
            return res.status(404).json({ success: false, message: "UMKM tidak ditemukan" });
        }

        const allReviews = umkm.produk.flatMap(p => p.ulasan);
        const totalUlasan = allReviews.length;
        let finalRating = 0.0;

        if (totalUlasan > 0) {
            const totalBintang = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
            finalRating = Number((totalBintang / totalUlasan).toFixed(1));
        }

        const formattedResponse = {
            id_umkm: umkm.id_umkm,
            id_kategori_umkm: umkm.id_kategori_umkm,
            nama_umkm: umkm.nama_umkm,
            deskripsi: umkm.deskripsi || "",
            alamat: umkm.alamat || "",
            no_telepon: umkm.no_telepon || "",
            link_lokasi: umkm.link_lokasi || "",
            gambar: generateUrls(umkm.gambar, req),
            rating: finalRating,
            total_ulasan: totalUlasan,
            jumlah_produk: umkm._count.produk,
            jumlah_follow: umkm._count.follow
        };

        res.status(200).json({
            success: true,
            message: "Detail UMKM ditemukan",
            data: formattedResponse
        });

    } catch (error) {
        console.error("Error Get Detail UMKM:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};