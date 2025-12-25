-- AlterTable
ALTER TABLE `produk` MODIFY `deskripsi` VARCHAR(1000) NULL;

-- AlterTable
ALTER TABLE `promo` MODIFY `deskripsi` VARCHAR(1000) NULL,
    MODIFY `syarat_penggunaan` VARCHAR(1000) NULL,
    MODIFY `cara_penggunaan` VARCHAR(1000) NULL;

-- AlterTable
ALTER TABLE `ulasan` MODIFY `komentar` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `umkm` MODIFY `deskripsi` VARCHAR(1000) NULL;
