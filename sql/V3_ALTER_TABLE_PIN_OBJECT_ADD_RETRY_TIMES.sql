ALTER TABLE `pinning_service`.`pin_object`
ADD COLUMN `retry_times` int NOT NULL DEFAULT 0 COMMENT 'retry order times' AFTER `deleted`;
