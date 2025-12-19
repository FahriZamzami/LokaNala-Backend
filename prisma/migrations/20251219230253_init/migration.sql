/*
  Warnings:

  - You are about to drop the `following` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `following` DROP FOREIGN KEY `Following_id_umkm_fkey`;

-- DropForeignKey
ALTER TABLE `following` DROP FOREIGN KEY `Following_id_user_fkey`;

-- DropTable
DROP TABLE `following`;

-- CreateTable
CREATE TABLE `Follow` (
    `id_follow` INTEGER NOT NULL AUTO_INCREMENT,
    `id_user` INTEGER NOT NULL,
    `id_umkm` INTEGER NOT NULL,

    UNIQUE INDEX `Follow_id_user_id_umkm_key`(`id_user`, `id_umkm`),
    PRIMARY KEY (`id_follow`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Follow` ADD CONSTRAINT `Follow_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `User`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Follow` ADD CONSTRAINT `Follow_id_umkm_fkey` FOREIGN KEY (`id_umkm`) REFERENCES `UMKM`(`id_umkm`) ON DELETE RESTRICT ON UPDATE CASCADE;
