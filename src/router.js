import express from "express";
// 1. Import middleware upload yang baru dibuat
import { upload } from "./middleware/upload.js"; 

import { loginUser } from "./controllers/user.controller.js";
import {
  getRatingByProduct,
  addRating,
  updateRating,
  deleteRating
} from "./controllers/rating.controller.js";
import { getAllUMKM } from "./controllers/home.controller.js";
import { getMerchantDetail } from "./controllers/merchant.controller.js";
import { getProductDetail } from "./controllers/product.controller.js";
import { addUMKM } from "./controllers/umkm.controller.js";
import { getKategoriUmkm } from "./controllers/kategoriUmkmController.js";
import { getUMKMByUser } from "./controllers/umkm.controller.js";
import { deleteUMKM } from "./controllers/umkm.controller.js";
const router = express.Router();

// -------------------- USER -------------------- //
// Login
router.post("/user/login", loginUser);

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

// router.post("/umkm", addUMKM);
// router.post("/umkm", upload.single("gambar"), addUMKM);
router.post("/umkm/add", upload.single("gambar"), addUMKM);

router.get("/umkm/user/:id_user", getUMKMByUser);

router.delete("/umkm/:id", deleteUMKM);

// Kategori
router.get("/kategori", getKategoriUmkm);

// -------------------- MERCHANT DETAIL -------------------- //
// Detail Merchant (Promo & Produk)
// Client request: GET /merchant/1
router.get("/merchant/:id", getMerchantDetail);

// -------------------- PRODUK DETAIL -------------------- //
// GET /produk/1
router.get("/produk/:id", getProductDetail);

export default router;