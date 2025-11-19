import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// 1. Setup Path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../public/uploads");

// 2. Buat folder jika belum ada
if (!fs.existsSync(uploadDir)) {
fs.mkdirSync(uploadDir, { recursive: true });
}

// 3. Konfigurasi Penyimpanan
const storage = multer.diskStorage({
destination: (req, file, cb) => {
    cb(null, uploadDir);
},
filename: (req, file, cb) => {
    // Nama file unik: timestamp + angka acak + ekstensi asli
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
},
});

// 4. Filter File (PERBAIKAN UTAMA DI SINI)
const fileFilter = (req, file, cb) => {
// Debugging Log
console.log("--- [MULTER CHECK] ---");
console.log("Filename:", file.originalname);
console.log("Mimetype:", file.mimetype); 

// A. Cek Ekstensi (Tetap Ketat demi Keamanan)
// File harus berakhiran .jpg, .jpeg, .png, atau .gif
const allowedExt = /jpeg|jpg|png|gif/i;
const extname = allowedExt.test(path.extname(file.originalname).toLowerCase());

// B. Cek Mimetype (DILONGGARKAN)
// Kita izinkan:
// 1. Tipe standar (image/jpeg, image/png)
// 2. Tipe binary umum (application/octet-stream)
// 3. Tipe wildcard (image/*) <-- INI YANG DITAMBAHKAN
const allowedMime = /jpeg|jpg|png|gif|octet-stream|image\/.*/i; 
const mimetype = allowedMime.test(file.mimetype);

if (extname && mimetype) {
    return cb(null, true); // Terima file
} else {
    console.error("REJECTED: Tipe file tidak diizinkan.");
    cb(new Error(`Hanya boleh upload gambar! Diterima: ${file.mimetype}`));
}
};

// 5. Export Middleware
export const upload = multer({
storage: storage,
fileFilter: fileFilter,
limits: { fileSize: 5 * 1024 * 1024 }, // Limit 5MB
});