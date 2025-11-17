/*
  Warnings:

  - You are about to drop the column `stok` on the `produk` table. All the data in the column will be lost.
  - You are about to drop the column `diskon_persen` on the `promo` table. All the data in the column will be lost.
  - You are about to drop the column `id_produk` on the `promo` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `user` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[no_telepon]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_umkm` to the `Promo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `no_telepon` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `promo` DROP FOREIGN KEY `Promo_id_produk_fkey`;

-- DropIndex
DROP INDEX `Promo_id_produk_fkey` ON `promo`;

-- AlterTable
ALTER TABLE `produk` DROP COLUMN `stok`;

-- AlterTable
ALTER TABLE `promo` DROP COLUMN `diskon_persen`,
    DROP COLUMN `id_produk`,
    ADD COLUMN `id_umkm` INTEGER NOT NULL,
    ADD COLUMN `syarat_penggunaan` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ulasan` ADD COLUMN `foto` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `umkm` ADD COLUMN `link_lokasi` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `role`,
    ADD COLUMN `no_telepon` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_no_telepon_key` ON `User`(`no_telepon`);

-- AddForeignKey
ALTER TABLE `Promo` ADD CONSTRAINT `Promo_id_umkm_fkey` FOREIGN KEY (`id_umkm`) REFERENCES `UMKM`(`id_umkm`) ON DELETE RESTRICT ON UPDATE CASCADE;
