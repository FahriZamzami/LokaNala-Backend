import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Memulai seeding data User...");

  // Hapus data lama (optional, untuk clean start)
    await prisma.user.deleteMany();

  // Tambahkan data dummy
    const users = await prisma.user.createMany({
    data: [
        {
        nama: "Fahri Zamzami",
        email: "fahri@example.com",
        password: "password123",
        role: "admin",
        },
        {
        nama: "Siti Rahma",
        email: "siti@example.com",
        password: "password123",
        role: "pelanggan",
        },
        {
        nama: "Budi Santoso",
        email: "budi@example.com",
        password: "password123",
        role: "pemilik_umkm",
        },
        {
        nama: "Dewi Lestari",
        email: "dewi@example.com",
        password: "password123",
        role: "pelanggan",
        },
    ],
    });

    console.log(`${users.count} data User berhasil ditambahkan.`);
}

main()
    .catch((e) => {
    console.error("Gagal seeding:", e);
    process.exit(1);
    })
    .finally(async () => {
    await prisma.$disconnect();
    });
