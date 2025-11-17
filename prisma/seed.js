import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai proses seeding...");

  // Hapus data sesuai relasi
  await prisma.promo.deleteMany();
  await prisma.ulasan.deleteMany();
  await prisma.produk.deleteMany();
  await prisma.kategoriProduk.deleteMany();
  await prisma.uMKM.deleteMany();
  await prisma.kategoriUMKM.deleteMany();
  await prisma.user.deleteMany();

  // =============================
  // 1) USER
  // =============================
  console.log("🌱 Seeding User...");
  await prisma.user.createMany({
    data: [
      { nama: "Fahri Zamzami", email: "fahri@example.com", no_telepon: "081234567001", password: "password123" },
      { nama: "Siti Rahma", email: "siti@example.com", no_telepon: "081234567002", password: "password123" },
      { nama: "Budi Santoso", email: "budi@example.com", no_telepon: "081234567003", password: "password123" },
      { nama: "Dewi Lestari", email: "dewi@example.com", no_telepon: "081234567004", password: "password123" },
      { nama: "Ahmad Fauzi", email: "ahmad@example.com", no_telepon: "081234567005", password: "password123" },
    ],
  });

  const allUsers = await prisma.user.findMany();

  // =============================
  // 2) Kategori UMKM
  // =============================
  console.log("🌱 Seeding Kategori UMKM...");
  await prisma.kategoriUMKM.createMany({
    data: [
      { nama_kategori: "Kuliner", deskripsi: "Usaha makanan dan minuman" },
      { nama_kategori: "Fashion", deskripsi: "Usaha pakaian dan aksesori" },
      { nama_kategori: "Kerajinan", deskripsi: "Kerajinan tangan lokal" },
      { nama_kategori: "Jasa", deskripsi: "Berbagai jenis layanan" },
      { nama_kategori: "Pertanian", deskripsi: "Produk dan hasil tani" },
    ],
  });

  const allKategoriUMKM = await prisma.kategoriUMKM.findMany();

  // =============================
  // 3) UMKM
  // =============================
  console.log("🌱 Seeding UMKM...");
  await prisma.uMKM.createMany({
    data: [
      {
        id_user: allUsers[0].id_user,
        id_kategori_umkm: allKategoriUMKM[0].id_kategori_umkm,
        nama_umkm: "Warung Makan Sederhana",
        alamat: "Jl. Merdeka No. 10",
        no_telepon: "081222333111",
        deskripsi: "Warung makan menu rumahan",
        link_lokasi: "https://goo.gl/maps/abcd1",
      },
      {
        id_user: allUsers[1].id_user,
        id_kategori_umkm: allKategoriUMKM[1].id_kategori_umkm,
        nama_umkm: "Rahma Fashion Store",
        alamat: "Jl. Sudirman No. 22",
        no_telepon: "081222333112",
        deskripsi: "Toko fashion wanita",
        link_lokasi: "https://goo.gl/maps/abcd2",
      },
      {
        id_user: allUsers[2].id_user,
        id_kategori_umkm: allKategoriUMKM[2].id_kategori_umkm,
        nama_umkm: "Budi Craft Art",
        alamat: "Jl. Kenanga No. 3",
        no_telepon: "081222333113",
        deskripsi: "Kerajinan handmade",
        link_lokasi: "https://goo.gl/maps/abcd3",
      },
      {
        id_user: allUsers[3].id_user,
        id_kategori_umkm: allKategoriUMKM[3].id_kategori_umkm,
        nama_umkm: "Dewi Salon",
        alamat: "Jl. Melati No. 7",
        no_telepon: "081222333114",
        deskripsi: "Layanan kecantikan",
        link_lokasi: "https://goo.gl/maps/abcd4",
      },
      {
        id_user: allUsers[4].id_user,
        id_kategori_umkm: allKategoriUMKM[4].id_kategori_umkm,
        nama_umkm: "Fauzi Farm",
        alamat: "Jl. Pertiwi No. 15",
        no_telepon: "081222333115",
        deskripsi: "Hasil pertanian organik",
        link_lokasi: "https://goo.gl/maps/abcd5",
      },
    ],
  });

  const allUmkm = await prisma.uMKM.findMany();

  // =============================
  // 4) Kategori Produk
  // =============================
  console.log("🌱 Seeding Kategori Produk...");
  await prisma.kategoriProduk.createMany({
    data: [
      { nama_kategori: "Makanan", deskripsi: "Menu makanan umum" },
      { nama_kategori: "Minuman", deskripsi: "Minuman segar" },
      { nama_kategori: "Aksesori", deskripsi: "Aksesori fashion" },
      { nama_kategori: "Kerajinan", deskripsi: "Barang handmade" },
      { nama_kategori: "Pertanian", deskripsi: "Produk hasil tani" },
    ],
  });

  const allKategoriProduk = await prisma.kategoriProduk.findMany();

  // =============================
  // 5) Produk
  // =============================
  console.log("🌱 Seeding Produk...");
  await prisma.produk.createMany({
    data: [
      {
        id_umkm: allUmkm[0].id_umkm,
        id_kategori_produk: allKategoriProduk[0].id_kategori_produk,
        nama_produk: "Nasi Goreng Spesial",
        deskripsi: "Nasi goreng dengan bumbu khas",
        harga: 15000,
      },
      {
        id_umkm: allUmkm[0].id_umkm,
        id_kategori_produk: allKategoriProduk[1].id_kategori_produk,
        nama_produk: "Es Teh Manis",
        deskripsi: "Minuman segar favorit",
        harga: 5000,
      },
      {
        id_umkm: allUmkm[1].id_umkm,
        id_kategori_produk: allKategoriProduk[2].id_kategori_produk,
        nama_produk: "Gelang Wanita",
        deskripsi: "Aksesori elegan",
        harga: 25000,
      },
      {
        id_umkm: allUmkm[2].id_umkm,
        id_kategori_produk: allKategoriProduk[3].id_kategori_produk,
        nama_produk: "Vas Kayu Handmade",
        deskripsi: "Kerajinan kayu",
        harga: 45000,
      },
      {
        id_umkm: allUmkm[4].id_umkm,
        id_kategori_produk: allKategoriProduk[4].id_kategori_produk,
        nama_produk: "Sayur Organik Mix",
        deskripsi: "Sayuran segar",
        harga: 20000,
      },
    ],
  });

  const allProduk = await prisma.produk.findMany();

  // =============================
  // 6) Ulasan
  // =============================
  console.log("🌱 Seeding Ulasan...");
  await prisma.ulasan.createMany({
    data: [
      { id_user: allUsers[0].id_user, id_produk: allProduk[0].id_produk, rating: 5, komentar: "Enak sekali!" },
      { id_user: allUsers[1].id_user, id_produk: allProduk[1].id_produk, rating: 4, komentar: "Segar, tapi agak manis." },
      { id_user: allUsers[2].id_user, id_produk: allProduk[2].id_produk, rating: 5, komentar: "Kualitas bagus!" },
      { id_user: allUsers[3].id_user, id_produk: allProduk[3].id_produk, rating: 4, komentar: "Kerajinan seni yang indah." },
      { id_user: allUsers[4].id_user, id_produk: allProduk[4].id_produk, rating: 5, komentar: "Sayuran segar sekali." },
    ],
  });

  // =============================
  // 7) Promo
  // =============================
  console.log("🌱 Seeding Promo...");
  await prisma.promo.createMany({
    data: [
      {
        id_umkm: allUmkm[0].id_umkm,
        nama_promo: "Promo Hemat Minggu Ini",
        deskripsi: "Diskon menu spesial",
        syarat_penggunaan: "Minimal pembelian 20.000",
      },
      {
        id_umkm: allUmkm[1].id_umkm,
        nama_promo: "Promo Fashion",
        deskripsi: "Diskon pakaian wanita",
        syarat_penggunaan: "Tidak berlaku produk premium",
      },
      {
        id_umkm: allUmkm[2].id_umkm,
        nama_promo: "Craft Sale",
        deskripsi: "Diskon 10% kerajinan",
        syarat_penggunaan: "Hanya offline",
      },
      {
        id_umkm: allUmkm[3].id_umkm,
        nama_promo: "Salon Diskon",
        deskripsi: "Promo khusus hari Jumat",
        syarat_penggunaan: "Hanya hari Jumat",
      },
      {
        id_umkm: allUmkm[4].id_umkm,
        nama_promo: "Promo Sayuran",
        deskripsi: "Paket sayur hemat",
        syarat_penggunaan: "Minimal 2 item",
      },
    ],
  });

  console.log("🎉 SEEDING BERHASIL!");
}

main()
  .catch((e) => {
    console.error("❌ Gagal seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });