import express from "express";
import { loginUser } from "./controllers/user.controller.js";

const router = express.Router();

router.post("/user/login", loginUser);

export default router;
