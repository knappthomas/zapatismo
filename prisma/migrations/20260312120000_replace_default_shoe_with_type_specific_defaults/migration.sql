-- AlterTable
-- Add type-specific default columns (default false)
ALTER TABLE `shoes` ADD COLUMN `is_default_for_running` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `shoes` ADD COLUMN `is_default_for_walking` BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing single default becomes default for both running and walking (FR-8 / AC-4)
UPDATE `shoes` SET `is_default_for_running` = true, `is_default_for_walking` = true WHERE `is_default` = true;

-- Drop legacy column
ALTER TABLE `shoes` DROP COLUMN `is_default`;
