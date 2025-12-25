import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai proses seeding...");

  await prisma.promo.deleteMany();
  await prisma.ulasan.deleteMany();
  await prisma.produk.deleteMany(); 
  await prisma.kategoriProduk.deleteMany(); 
  await prisma.uMKM.deleteMany();
  await prisma.kategoriUMKM.deleteMany();
  await prisma.user.deleteMany();

  console.log("🌱 Seeding User...");
  await prisma.user.createMany({
    data: [
      { nama: "Fahri Zamzami", email: "fahri@example.com", no_telepon: "081234567001", password: "password123", foto_profile: "__mio_arknights_drawn_by_dadijiji__e1184e0bad753d2ee6fd89f63ab34129.jpg"},
      { nama: "Siti Rahma", email: "siti@example.com", no_telepon: "081234567002", password: "password123", foto_profile: "siti.jpeg" },
      { nama: "Budi Santoso", email: "budi@example.com", no_telepon: "081234567003", password: "password123", foto_profile: "budi.jpeg" },
      { nama: "Dewi Lestari", email: "dewi@example.com", no_telepon: "081234567004", password: "password123", foto_profile: "dewi.jpeg" },
      { nama: "Ahmad Fauzi", email: "ahmad@example.com", no_telepon: "081234567005", password: "password123", foto_profile: "fauzi.jpeg" },
    ],
  });

  const allUsers = await prisma.user.findMany({ orderBy: { id_user: 'asc' } });

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

  const allKategoriUMKM = await prisma.kategoriUMKM.findMany({ orderBy: { id_kategori_umkm: 'asc' } });

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
        gambar: "a.jpeg"
      },
      {
        id_user: allUsers[1].id_user,
        id_kategori_umkm: allKategoriUMKM[1].id_kategori_umkm, 
        nama_umkm: "Rahma Fashion Store",
        alamat: "Jl. Sudirman No. 22",
        no_telepon: "081222333112",
        deskripsi: "Toko fashion wanita",
        link_lokasi: "https://goo.gl/maps/abcd2",
        gambar: "b.jpeg"
      },
      {
        id_user: allUsers[2].id_user,
        id_kategori_umkm: allKategoriUMKM[2].id_kategori_umkm, 
        nama_umkm: "Budi Craft Art",
        alamat: "Jl. Kenanga No. 3",
        no_telepon: "081222333113",
        deskripsi: "Kerajinan handmade",
        link_lokasi: "https://goo.gl/maps/abcd3",
        gambar: "c.jpeg"
      },
      {
        id_user: allUsers[3].id_user,
        id_kategori_umkm: allKategoriUMKM[3].id_kategori_umkm, 
        nama_umkm: "Dewi Salon",
        alamat: "Jl. Melati No. 7",
        no_telepon: "081222333114",
        deskripsi: "Layanan kecantikan",
        link_lokasi: "https://goo.gl/maps/abcd4",
        gambar: "d.jpeg"
      },
      {
        id_user: allUsers[4].id_user,
        id_kategori_umkm: allKategoriUMKM[4].id_kategori_umkm, 
        nama_umkm: "Fauzi Farm",
        alamat: "Jl. Pertiwi No. 15",
        no_telepon: "081222333115",
        deskripsi: "Hasil pertanian organik",
        link_lokasi: "https://goo.gl/maps/abcd5",
        gambar: "e.jpeg"
      },
    ],
  });

  const allUmkm = await prisma.uMKM.findMany({ orderBy: { id_umkm: 'asc' } });

  console.log("🌱 Seeding Kategori Produk (Per UMKM + Urutan)...");

  const katUmkm1_Makanan = await prisma.kategoriProduk.create({
    data: {
      id_umkm: allUmkm[0].id_umkm,
      nama_kategori: "Makanan Berat",
      deskripsi: "Nasi dan Lauk",
      urutan: 1
    }
  });

  const katUmkm1_Minuman = await prisma.kategoriProduk.create({
    data: {
      id_umkm: allUmkm[0].id_umkm,
      nama_kategori: "Minuman Dingin",
      deskripsi: "Es dan Jus",
      urutan: 2
    }
  });

  const katUmkm2_Baju = await prisma.kategoriProduk.create({
    data: {
      id_umkm: allUmkm[1].id_umkm,
      nama_kategori: "Atasan Wanita",
      deskripsi: "Blouse dan Kemeja",
      urutan: 1
    }
  });

  const katUmkm2_Aksesori = await prisma.kategoriProduk.create({
    data: {
      id_umkm: allUmkm[1].id_umkm,
      nama_kategori: "Aksesori",
      deskripsi: "Kalung dan Gelang",
      urutan: 2
    }
  });

  const katUmkm3_Hiasan = await prisma.kategoriProduk.create({
    data: {
      id_umkm: allUmkm[2].id_umkm,
      nama_kategori: "Hiasan Rumah",
      deskripsi: "Vas dan Patung",
      urutan: 1
    }
  });

  const katUmkm5_Sayur = await prisma.kategoriProduk.create({
    data: {
      id_umkm: allUmkm[4].id_umkm,
      nama_kategori: "Sayuran Daun",
      deskripsi: "Bayam, Kangkung dll",
      urutan: 1
    }
  });


  console.log("🌱 Seeding Produk...");
  await prisma.produk.createMany({
    data: [
      {
        id_umkm: allUmkm[0].id_umkm,
        id_kategori_produk: katUmkm1_Makanan.id_kategori_produk, 
        nama_produk: "Nasi Goreng Spesial",
        deskripsi: "Nasi goreng dengan bumbu khas",
        harga: 15000,
      },
      {
        id_umkm: allUmkm[0].id_umkm,
        id_kategori_produk: katUmkm1_Minuman.id_kategori_produk,
        nama_produk: "Es Teh Manis",
        deskripsi: "Minuman segar favorit",
        harga: 5000,
      },
      {
        id_umkm: allUmkm[1].id_umkm,
        id_kategori_produk: katUmkm2_Aksesori.id_kategori_produk,
        nama_produk: "Gelang Emas Imitasi",
        deskripsi: "Aksesori elegan",
        harga: 25000,
      },
      {
        id_umkm: allUmkm[2].id_umkm,
        id_kategori_produk: katUmkm3_Hiasan.id_kategori_produk,
        nama_produk: "Vas Kayu Handmade",
        deskripsi: "Kerajinan kayu jati",
        harga: 45000,
      },
      {
        id_umkm: allUmkm[4].id_umkm,
        id_kategori_produk: katUmkm5_Sayur.id_kategori_produk,
        nama_produk: "Bayam Organik",
        deskripsi: "Sayuran segar bebas pestisida",
        harga: 5000,
      },
    ],
  });

  const allProduk = await prisma.produk.findMany({ orderBy: { id_produk: 'asc' } });

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

  console.log("🌱 Seeding Promo...");
  await prisma.promo.createMany({
    data: [
      {
        id_umkm: allUmkm[0].id_umkm,
        nama_promo: "Promo Hemat Minggu Ini",
        deskripsi: "Diskon menu spesial",
        syarat_penggunaan: "Minimal pembelian 20.000",
        cara_penggunaan: "Tunjukkan ke kasir saat bayar",
      },
      {
        id_umkm: allUmkm[1].id_umkm,
        nama_promo: "Promo Fashion",
        deskripsi: "Diskon pakaian wanita",
        syarat_penggunaan: "Tidak berlaku produk premium",
        cara_penggunaan: "Otomatis potong harga",
      },
      {
        id_umkm: allUmkm[2].id_umkm,
        nama_promo: "Craft Sale",
        deskripsi: "Diskon 10% kerajinan",
        syarat_penggunaan: "Hanya offline",
        cara_penggunaan: "Datang langsung ke toko",
      },
    ],
  });

  console.log("🎉 SEEDING BERHASIL DENGAN SCHEMA BARU!");
}

main()
  .catch((e) => {
    console.error("❌ Gagal seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });