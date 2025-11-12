import express from "express";
import { loginUser } from "./controllers/user.controller.js";
// import controller lain kalau nanti ada, misalnya:
// import { registerUser } from "../controllers/user.controller.js";
// import { getAllProducts } from "../controllers/product.controller.js";

const router = express.Router();

/* ================================
🔐 AUTH / USER
================================ */
router.post("/user/login", loginUser);
// router.post("/user/register", registerUser); // bisa ditambahkan nanti

/* ================================
📦 PRODUCT / UMKM (contoh)
================================ */
// router.get("/products", getAllProducts);

export default router;
