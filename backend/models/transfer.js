const db = require('../db');

const STAGE_NAMES = [
    '创建过户记录',
    '北京提档完成',
    '外地落户完成',
    '新车牌制作完成',
    '全部完成'
];

async function findByVin(vin) {
    const transfers = await db.query(
        'SELECT * FROM transfers WHERE vin = ?',
        [vin]
    );
    if (transfers.length === 0) return null;
    return transfers[0];
}

async function findById(id) {
    const transfers = await db.query(
        'SELECT * FROM transfers WHERE id = ?',
        [id]
    );
    if (transfers.length === 0) return null;
    return transfers[0];
}

async function findAll() {
    return await db.query(
        'SELECT * FROM transfers ORDER BY created_at DESC'
    );
}

async function getProgressNodes(transferId) {
    return await db.query(
        'SELECT * FROM progress_nodes WHERE transfer_id = ? ORDER BY stage, node_time',
        [transferId]
    );
}

async function getExpenses(transferId) {
    return await db.query(
        'SELECT * FROM expenses WHERE transfer_id = ? ORDER BY expense_time',
        [transferId]
    );
}

async function getTotalExpense(transferId) {
    const result = await db.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE transfer_id = ?',
        [transferId]
    );
    return result[0].total;
}

async function getTransferDetail(vin) {
    const transfer = await findByVin(vin);
    if (!transfer) return null;

    const [progress, expenses] = await Promise.all([
        getProgressNodes(transfer.id),
        getExpenses(transfer.id)
    ]);

    const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    return {
        transfer,
        progress,
        expenses,
        totalAmount,
        progressPercent: Math.round((transfer.status / 4) * 100),
        currentStageName: STAGE_NAMES[transfer.status] || '未知'
    };
}

async function createTransfer(data) {
    const { vin, plate_number, car_model, owner_name, buyer_name, buyer_phone, target_city } = data;
    
    const result = await db.query(
        `INSERT INTO transfers (vin, plate_number, car_model, owner_name, buyer_name, buyer_phone, target_city, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [vin, plate_number, car_model, owner_name, buyer_name, buyer_phone, target_city]
    );

    const transferId = result.insertId;

    await db.query(
        `INSERT INTO progress_nodes (transfer_id, stage, stage_name, operator, remark)
         VALUES (?, 0, ?, ?, ?)`,
        [transferId, STAGE_NAMES[0], '系统', '过户记录已创建']
    );

    return transferId;
}

async function updateProgress(transferId, stage, operator, remark) {
    const stageName = STAGE_NAMES[stage];
    if (!stageName) {
        throw new Error('无效的阶段值');
    }

    await db.query(
        `INSERT INTO progress_nodes (transfer_id, stage, stage_name, operator, remark)
         VALUES (?, ?, ?, ?, ?)`,
        [transferId, stage, stageName, operator, remark]
    );

    await db.query(
        'UPDATE transfers SET status = ? WHERE id = ?',
        [stage, transferId]
    );

    return true;
}

async function addExpense(transferId, itemName, amount, payer, expenseTime, remark) {
    const result = await db.query(
        `INSERT INTO expenses (transfer_id, item_name, amount, payer, expense_time, remark)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [transferId, itemName, amount, payer, expenseTime, remark]
    );
    return result.insertId;
}

async function deleteExpense(expenseId) {
    await db.query('DELETE FROM expenses WHERE id = ?', [expenseId]);
    return true;
}

async function getStats() {
    const rows = await db.query(
        'SELECT status, COUNT(*) as count FROM transfers GROUP BY status'
    );

    const stats = {
        total: 0,
        pending: 0,
        tiDang: 0,
        luoHu: 0,
        makingPlate: 0,
        completed: 0
    };

    rows.forEach(row => {
        stats.total += row.count;
        switch (row.status) {
            case 0: stats.pending = row.count; break;
            case 1: stats.tiDang = row.count; break;
            case 2: stats.luoHu = row.count; break;
            case 3: stats.makingPlate = row.count; break;
            case 4: stats.completed = row.count; break;
        }
    });

    return stats;
}

module.exports = {
    STAGE_NAMES,
    findByVin,
    findById,
    findAll,
    getProgressNodes,
    getExpenses,
    getTotalExpense,
    getTransferDetail,
    createTransfer,
    updateProgress,
    addExpense,
    deleteExpense,
    getStats
};
