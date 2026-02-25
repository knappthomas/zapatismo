-- Enforce kilometer_target range 0-100000 at DB level (AC-10).
ALTER TABLE `shoes` ADD CONSTRAINT `shoes_kilometer_target_range` CHECK (`kilometer_target` >= 0 AND `kilometer_target` <= 100000);