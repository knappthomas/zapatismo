-- AlterTable
ALTER TABLE `users` ADD COLUMN `last_strava_sync_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `strava_connections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `strava_athlete_id` VARCHAR(32) NOT NULL,
    `refresh_token` VARCHAR(512) NOT NULL,
    `access_token` VARCHAR(512) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `strava_connections_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `workouts` ADD COLUMN `external_id` VARCHAR(64) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `workouts_external_id_key` ON `workouts`(`external_id`);

-- CreateIndex
CREATE INDEX `workouts_external_id_idx` ON `workouts`(`external_id`);

-- AddForeignKey
ALTER TABLE `strava_connections` ADD CONSTRAINT `strava_connections_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
