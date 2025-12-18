/*
  Warnings:

  - Added the required column `id_umkm` to the `KategoriProduk` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `kategoriproduk` ADD COLUMN `id_umkm` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `KategoriProduk` ADD CONSTRAINT `KategoriProduk_id_umkm_fkey` FOREIGN KEY (`id_umkm`) REFERENCES `UMKM`(`id_umkm`) ON DELETE RESTRICT ON UPDATE CASCADE;
