import express from "express";
// 1. Import middleware upload yang baru dibuat
import { upload } from "./middleware/upload.js"; 
import { authenticate } from "./middleware/auth.js"; 

import { loginUser, logoutUser, getMyUMKM } from "./controllers/user.controller.js";
import {
  getRatingByProduct,
  addRating,
  updateRating,
  deleteRating,
  checkProductOwner,
  getProductRating,
  getUMKMRating
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
  getPromosByUMKM,
  getPromoDetail,
  createPromo,
  updatePromo,
  deletePromo
} from "./controllers/myUmkmPromotion.controller.js";

import {
  createCategory,
  getCategoriesByUmkm,
  updateCategory,
  deleteCategory,
  updateCategoryOrder
} from "./controllers/category.controller.js";

import { followUMKM, unfollowUMKM, checkFollowStatus, getFollowedUMKM } from "./controllers/follow.controller.js";

const router = express.Router();

// -------------------- USER -------------------- //
router.post("/user/login", loginUser);
router.post("/user/logout", logoutUser); // (tetap, walau tanpa slash)
router.get("/user/my-umkm", authenticate, getMyUMKM);

// -------------------- RATING / ULASAN -------------------- //
router.get("/rating/:id_produk", getRatingByProduct);
router.post("/rating", upload.array("foto", 5), addRating);
router.put("/rating/:id_rating", upload.array("foto", 5), updateRating);
router.delete("/rating/:id_rating", deleteRating);

router.get("/produk/:id_produk/is-owner/:id_user", checkProductOwner);
router.get("/rating/product/:id_produk", getProductRating);
router.get("/rating/umkm/:id_umkm", getUMKMRating);

// -------------------- UMKM (HOME) -------------------- //
router.get("/umkm", getAllUMKM);

// -------------------- MERCHANT DETAIL -------------------- //
router.get("/merchant/:id", getMerchantDetail);

// -------------------- MY UMKM -------------------- //
router.get("/umkm/my", getMyUmkm);

// -------------------- PRODUK DETAIL -------------------- //
router.get("/produk/:id", getProductDetail);

// -------------------- PRODUK (CRUD) -------------------- //
router.get("/umkm/:umkmId/produk", getProductsByUmkm);
router.post("/produk", upload.single("gambar"), addProduct);
router.put("/produk/:id", upload.single("gambar"), updateProduct);
router.delete("/produk/:id", deleteProduct);

// -------------------- PROMO UMKM -------------------- //
router.get("/:id_umkm/promos", getPromosByUMKM);
router.get("/promo/:id_promo", getPromoDetail);
router.post("/:id_umkm/promos", createPromo);
router.put("/promo/:id_promo", updatePromo);
router.delete("/promo/:id_promo", deletePromo);

// -------------------- KATEGORI PRODUK -------------------- //
router.post("/kategori-produk", createCategory);
router.get("/kategori-produk/umkm/:id_umkm", getCategoriesByUmkm);
router.put("/kategori-produk/:id", updateCategory);
router.delete("/kategori-produk/:id", deleteCategory);
router.put("/kategori-produk/urutan/:umkmId", updateCategoryOrder);

router.post("/follow/:id_umkm", authenticate, followUMKM);
router.delete("/follow/:id_umkm", authenticate, unfollowUMKM);
router.get("/follow/status/:id_umkm", authenticate, checkFollowStatus);
router.get("/follow", authenticate, getFollowedUMKM);

export default router;