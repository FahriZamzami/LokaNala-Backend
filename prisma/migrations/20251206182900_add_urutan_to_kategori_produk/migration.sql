-- AlterTable
ALTER TABLE `kategoriproduk` ADD COLUMN `urutan` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `KategoriProduk_id_umkm_urutan_idx` ON `KategoriProduk`(`id_umkm`, `urutan`);
