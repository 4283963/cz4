CREATE DATABASE IF NOT EXISTS car_transfer DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE car_transfer;

DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS progress_nodes;
DROP TABLE IF EXISTS transfers;

CREATE TABLE transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vin VARCHAR(50) NOT NULL UNIQUE COMMENT '车架号',
    plate_number VARCHAR(20) NOT NULL COMMENT '原车牌号',
    car_model VARCHAR(100) NOT NULL COMMENT '车型',
    owner_name VARCHAR(50) NOT NULL COMMENT '原车主姓名',
    buyer_name VARCHAR(50) NOT NULL COMMENT '买方姓名',
    buyer_phone VARCHAR(20) NOT NULL COMMENT '买方电话',
    target_city VARCHAR(50) NOT NULL COMMENT '转入城市',
    status INT DEFAULT 0 COMMENT '当前阶段 0-待提档 1-北京提档中 2-外地落户中 3-新车牌制作中 4-完成',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vin (vin),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='过户记录表';

CREATE TABLE progress_nodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transfer_id INT NOT NULL COMMENT '过户记录ID',
    stage INT NOT NULL COMMENT '阶段 0-创建记录 1-北京提档完成 2-外地落户完成 3-新车牌制作完成 4-全部完成',
    stage_name VARCHAR(50) NOT NULL COMMENT '阶段名称',
    operator VARCHAR(50) COMMENT '经办人',
    remark VARCHAR(500) COMMENT '备注',
    node_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
    INDEX idx_transfer (transfer_id),
    INDEX idx_stage (stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='进度节点表';

CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transfer_id INT NOT NULL COMMENT '过户记录ID',
    item_name VARCHAR(100) NOT NULL COMMENT '费用项目',
    amount DECIMAL(10,2) NOT NULL COMMENT '金额',
    payer VARCHAR(50) COMMENT '支付人',
    expense_time DATE COMMENT '费用日期',
    remark VARCHAR(500) COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
    INDEX idx_transfer (transfer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='费用表';

INSERT INTO transfers (vin, plate_number, car_model, owner_name, buyer_name, buyer_phone, target_city, status) VALUES
('LBV1Z3108KM000001', '京A12345', '宝马3系 2019款', '张三', '李四', '13800138001', '上海', 2),
('LFV3A24F2C3000002', '京B67890', '大众迈腾 2020款', '王五', '赵六', '13800138002', '广州', 1),
('JTEBU5JR3K5000003', '京C11111', '丰田汉兰达 2021款', '孙七', '周八', '13800138003', '成都', 4);

INSERT INTO progress_nodes (transfer_id, stage, stage_name, operator, remark) VALUES
(1, 0, '创建过户记录', '管理员', '2024年6月1日提交过户申请'),
(1, 1, '北京提档完成', '刘经办', '档案已提出，EMS寄出'),
(1, 2, '外地落户中', '上海代办', '档案已到达上海车管所，正在办理落户'),
(2, 0, '创建过户记录', '管理员', '2024年6月5日提交过户申请'),
(2, 1, '北京提档完成', '刘经办', '档案已提出，等待寄出'),
(3, 0, '创建过户记录', '管理员', '2024年5月20日提交过户申请'),
(3, 1, '北京提档完成', '刘经办', '档案已提出'),
(3, 2, '外地落户完成', '成都代办', '落户成功，等待制牌'),
(3, 3, '新车牌制作完成', '车管所', '车牌已制作完成，等待邮寄'),
(3, 4, '全部完成', '系统', '过户流程已全部完成');

INSERT INTO expenses (transfer_id, item_name, amount, payer, expense_time, remark) VALUES
(1, '过户服务费', 500.00, '李四', '2024-06-01', '中介服务费'),
(1, '提档费', 200.00, '李四', '2024-06-03', '车管所提档费用'),
(1, 'EMS快递费', 50.00, '李四', '2024-06-03', '档案邮寄费'),
(2, '过户服务费', 500.00, '赵六', '2024-06-05', '中介服务费'),
(2, '提档费', 200.00, '赵六', '2024-06-07', '车管所提档费用'),
(3, '过户服务费', 800.00, '周八', '2024-05-20', 'SUV车型服务费'),
(3, '提档费', 200.00, '周八', '2024-05-22', '车管所提档费用'),
(3, 'EMS快递费', 60.00, '周八', '2024-05-22', '档案邮寄费'),
(3, '落户费', 300.00, '周八', '2024-05-28', '成都当地落户费用'),
(3, '车牌制作费', 120.00, '周八', '2024-05-30', '新车牌费用');
