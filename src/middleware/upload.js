import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../public/uploads");

if (!fs.existsSync(uploadDir)) {
fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
destination: (req, file, cb) => {
    cb(null, uploadDir);
},
filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
},
});

const fileFilter = (req, file, cb) => {

console.log("--- [MULTER CHECK] ---");
console.log("Filename:", file.originalname);
console.log("Mimetype:", file.mimetype); 

const allowedExt = /jpeg|jpg|png|gif/i;
const extname = allowedExt.test(path.extname(file.originalname).toLowerCase());
const allowedMime = /jpeg|jpg|png|gif|octet-stream|image\/.*/i; 
const mimetype = allowedMime.test(file.mimetype);

if (extname && mimetype) {
    return cb(null, true); 
} else {
    console.error("REJECTED: Tipe file tidak diizinkan.");
    cb(new Error(`Hanya boleh upload gambar! Diterima: ${file.mimetype}`));
}
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, 
    });