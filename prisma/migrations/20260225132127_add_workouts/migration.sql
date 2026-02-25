-- CreateTable
CREATE TABLE `workouts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` ENUM('RUNNING', 'WALKING') NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `steps` INTEGER NOT NULL,
    `distance_km` DOUBLE NOT NULL,
    `location` VARCHAR(50) NOT NULL,
    `shoe_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `workouts_user_id_idx`(`user_id`),
    INDEX `workouts_shoe_id_idx`(`shoe_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `workouts` ADD CONSTRAINT `workouts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workouts` ADD CONSTRAINT `workouts_shoe_id_fkey` FOREIGN KEY (`shoe_id`) REFERENCES `shoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
