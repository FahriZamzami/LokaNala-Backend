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
import {
  getPromosByUMKM,
  getPromoDetail,
  createPromo,
  updatePromo,
  deletePromo
} from "./controllers/myUmkmPromotion.controller.js";


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

// -------------------- MERCHANT DETAIL -------------------- //
// Detail Merchant (Promo & Produk)
// Client request: GET /merchant/1
router.get("/merchant/:id", getMerchantDetail);

// -------------------- PRODUK DETAIL -------------------- //
// GET /produk/1
router.get("/produk/:id", getProductDetail);

// -------------------- PROMO UMKM -------------------- //

router.get('/:id_umkm/promos', getPromosByUMKM);
router.get('/promo/:id_promo', getPromoDetail);
router.post('/:id_umkm/promos', createPromo);
router.put('/promo/:id_promo', updatePromo);
router.delete('/promo/:id_promo', deletePromo);


export default router;