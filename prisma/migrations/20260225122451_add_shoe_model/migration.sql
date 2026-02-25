-- CreateTable
CREATE TABLE `shoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `photo_url` VARCHAR(2048) NOT NULL,
    `brand_name` VARCHAR(75) NOT NULL,
    `shoe_name` VARCHAR(75) NOT NULL,
    `buying_date` DATE NOT NULL,
    `buying_location` VARCHAR(255) NULL,
    `kilometer_target` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `shoes_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `shoes` ADD CONSTRAINT `shoes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
