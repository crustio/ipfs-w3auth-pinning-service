DROP TABLE IF EXISTS `pinning_service`.`chain`;
CREATE TABLE `pinning_service`.`chain` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `chain_name` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'chain name',
  `chain_type` int NOT NULL COMMENT '0:polkadot,1:eth,2: solana',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_chain_name_type` (`chain_name`,`chain_type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `pinning_service`.`pin_object`;
CREATE TABLE `pinning_service`.`pin_object` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'name default:cid',
  `request_id` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'request_id',
  `user_id` bigint NOT NULL COMMENT 'user.id',
  `cid` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'ipfs cid',
  `status` varchar(16) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'status',
  `info` json DEFAULT NULL COMMENT 'info',
  `meta` json DEFAULT NULL COMMENT 'meta',
  `delegates` text COLLATE utf8mb4_general_ci COMMENT 'delegates (join with ,)',
  `origins` text COLLATE utf8mb4_general_ci COMMENT 'origins (join with ,)',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'update time',
  `deleted` int NOT NULL DEFAULT '0' COMMENT '1:deleted, 0:undeleted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_pin_object_request_id` (`request_id`) USING BTREE,
  UNIQUE KEY `uniq_pin_object_user_id_cid` (`user_id`,`cid`) USING BTREE,
  KEY `index_pin_object_status` (`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `pinning_service`.`user`;
CREATE TABLE `pinning_service`.`user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `chain_type` int NOT NULL COMMENT '0: polkadot, 1: eth, 2: solana',
  `address` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'address',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create_time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_address_chain_type` (`address`,`chain_type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `pinning_service`.`chain` (`chain_name`, `chain_type`) VALUES ('substrate', 0);
