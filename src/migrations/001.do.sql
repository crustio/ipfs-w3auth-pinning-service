ALTER TABLE `pinning_service`.`user`
MODIFY COLUMN `chain_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'chain type as: crust, cru' AFTER `id`;
update `user` set chain_type = 'substrate' where chain_type = '0';
update `user` set chain_type = 'ethereum' where chain_type = '1';
update `user` set chain_type = 'solana' where chain_type = '2';
update `user` set chain_type = 'avalanche' where chain_type = '3';
update `user` set chain_type = 'flow' where chain_type = '4';
update `user` set chain_type = 'elrond' where chain_type = '5';
