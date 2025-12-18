import express from "express";
// 1. Import middleware upload yang baru dibuat
import { upload } from "./middleware/upload.js";
import { authenticateToken } from "./middleware/auth.js"; 

import { loginUser, getMyUMKM } from "./controllers/user.controller.js";
import {
  getRatingByProduct,
  addRating,
  updateRating,
  deleteRating
} from "./controllers/rating.controller.js";
import { getAllUMKM } from "./controllers/home.controller.js";
import { getMerchantDetail } from "./controllers/merchant.controller.js";
import { 
  getProductDetail, 
  getProductsByUmkm, 
  addProduct, 
  updateProduct,
  deleteProduct 
} from "./controllers/product.controller.js";
import { getMyUmkm } from "./controllers/umkmController.js";

import {
    createCategory,
    getCategoriesByUmkm,
    updateCategory,
    deleteCategory,
    updateCategoryOrder
} from "./controllers/category.controller.js";

const router = express.Router();

// -------------------- USER -------------------- //
// Login
router.post("/user/login", loginUser);
router.get("/user/my-umkm", authenticateToken, getMyUMKM);

// -------------------- RATING / ULASAN -------------------- //
// GET semua rating berdasarkan id_produk
router.get("/rating/:id_produk", getRatingByProduct);

// UBAH MENJADI ARRAY
router.post("/rating", upload.array("foto", 5), addRating);

// UBAH MENJADI ARRAY
router.put("/rating/:id_rating", upload.array("foto", 5), updateRating);

// DELETE hapus rating
router.delete("/rating/:id_rating", deleteRating);

// -------------------- UMKM (HOME) -------------------- //
// GET semua UMKM
router.get("/umkm", getAllUMKM);

// -------------------- MERCHANT DETAIL -------------------- //
// Detail Merchant (Promo & Produk)
// Client request: GET /merchant/1
router.get("/merchant/:id", getMerchantDetail);

// -------------------- MYUMKM -------------------- //
router.get("/umkm/my", getMyUmkm);

// -------------------- KATEGORI PRODUK (BARU) -------------------- //
// 1. Tambah Kategori Baru (Body: id_umkm, nama_kategori, deskripsi)
router.post("/kategori-produk", createCategory);

// 2. Ambil List Kategori Spesifik UMKM (Param: id_umkm)
router.get("/kategori-produk/umkm/:id_umkm", getCategoriesByUmkm);

// 3. Update Kategori (Param: id_kategori_produk)
router.put("/kategori-produk/:id", updateCategory);

// 4. Hapus Kategori (Param: id_kategori_produk)
router.delete("/kategori-produk/:id", deleteCategory);

// 5. Update Urutan Kategori (Body: array of { id_kategori_produk, urutan })
router.put("/kategori-produk/urutan/:umkmId", updateCategoryOrder);

// -------------------- PRODUK (CRUD) -------------------- //

// 1. Get Detail Produk (Publik/Merchant)
router.get("/produk/:id", getProductDetail);

// 2. Get List Produk per UMKM (Untuk MyMerchantScreen)
// Endpoint: /api/umkm/:umkmId/produk
router.get("/umkm/:umkmId/produk", getProductsByUmkm);

// 3. Add Produk (Upload Gambar)
// Menggunakan middleware 'upload.single("gambar")' sesuai nama field di Android
router.post("/produk", upload.single("gambar"), addProduct);

// 4. Update Produk (Upload Gambar - Opsional)
router.put("/produk/:id", upload.single("gambar"), updateProduct);

// 5. Delete Produk
router.delete("/produk/:id", deleteProduct);

export default router;