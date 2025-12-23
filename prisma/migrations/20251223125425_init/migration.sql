-- DropForeignKey
ALTER TABLE `produk` DROP FOREIGN KEY `Produk_id_kategori_produk_fkey`;

-- DropForeignKey
ALTER TABLE `ulasan` DROP FOREIGN KEY `Ulasan_id_produk_fkey`;

-- DropIndex
DROP INDEX `Produk_id_kategori_produk_fkey` ON `produk`;

-- DropIndex
DROP INDEX `Ulasan_id_produk_fkey` ON `ulasan`;

-- AddForeignKey
ALTER TABLE `Produk` ADD CONSTRAINT `Produk_id_kategori_produk_fkey` FOREIGN KEY (`id_kategori_produk`) REFERENCES `KategoriProduk`(`id_kategori_produk`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ulasan` ADD CONSTRAINT `Ulasan_id_produk_fkey` FOREIGN KEY (`id_produk`) REFERENCES `Produk`(`id_produk`) ON DELETE CASCADE ON UPDATE CASCADE;
