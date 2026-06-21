USE car_transfer;

ALTER TABLE progress_nodes
ADD COLUMN photo_url VARCHAR(500) COMMENT '现场照片URL' AFTER remark;
