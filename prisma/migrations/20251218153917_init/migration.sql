-- AlterTable
ALTER TABLE `kategoriproduk` ADD COLUMN `urutan` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `Follow` (
    `id_follow` INTEGER NOT NULL AUTO_INCREMENT,
    `id_user` INTEGER NOT NULL,
    `id_umkm` INTEGER NOT NULL,

    UNIQUE INDEX `Follow_id_user_id_umkm_key`(`id_user`, `id_umkm`),
    PRIMARY KEY (`id_follow`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notifikasi` (
    `id_notifikasi` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(191) NOT NULL,
    `isi` VARCHAR(191) NOT NULL,
    `tanggal_kirim` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_notifikasi`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationSendTo` (
    `id_notifikasi` INTEGER NOT NULL,
    `id_user` INTEGER NOT NULL,
    `dikirim_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_notifikasi`, `id_user`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `KategoriProduk_id_umkm_urutan_idx` ON `KategoriProduk`(`id_umkm`, `urutan`);

-- AddForeignKey
ALTER TABLE `Follow` ADD CONSTRAINT `Follow_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `User`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Follow` ADD CONSTRAINT `Follow_id_umkm_fkey` FOREIGN KEY (`id_umkm`) REFERENCES `UMKM`(`id_umkm`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationSendTo` ADD CONSTRAINT `NotificationSendTo_id_notifikasi_fkey` FOREIGN KEY (`id_notifikasi`) REFERENCES `Notifikasi`(`id_notifikasi`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationSendTo` ADD CONSTRAINT `NotificationSendTo_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `User`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;
