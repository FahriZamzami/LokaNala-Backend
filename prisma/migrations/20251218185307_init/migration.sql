/*
  Warnings:

  - You are about to drop the `follow` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `follow` DROP FOREIGN KEY `Follow_id_umkm_fkey`;

-- DropForeignKey
ALTER TABLE `follow` DROP FOREIGN KEY `Follow_id_user_fkey`;

-- DropTable
DROP TABLE `follow`;

-- CreateTable
CREATE TABLE `Following` (
    `id_follow` INTEGER NOT NULL AUTO_INCREMENT,
    `id_user` INTEGER NOT NULL,
    `id_umkm` INTEGER NOT NULL,

    UNIQUE INDEX `Following_id_user_id_umkm_key`(`id_user`, `id_umkm`),
    PRIMARY KEY (`id_follow`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Following` ADD CONSTRAINT `Following_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `User`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Following` ADD CONSTRAINT `Following_id_umkm_fkey` FOREIGN KEY (`id_umkm`) REFERENCES `UMKM`(`id_umkm`) ON DELETE RESTRICT ON UPDATE CASCADE;
