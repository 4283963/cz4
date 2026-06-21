const express = require('express');
const router = express.Router();
const transferModel = require('../models/transfer');

router.get('/transfer/:vin', async (req, res) => {
    try {
        const { vin } = req.params;
        const detail = await transferModel.getTransferDetail(vin.toUpperCase());
        
        if (!detail) {
            return res.status(404).json({
                success: false,
                message: '未找到该车架号对应的过户记录'
            });
        }

        res.json({
            success: true,
            data: detail
        });
    } catch (error) {
        console.error('查询过户详情失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

router.get('/transfers', async (req, res) => {
    try {
        const transfers = await transferModel.findAll();
        res.json({
            success: true,
            data: transfers
        });
    } catch (error) {
        console.error('获取过户记录列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

router.post('/transfer', async (req, res) => {
    try {
        const { vin, plate_number, car_model, owner_name, buyer_name, buyer_phone, target_city } = req.body;

        if (!vin || !plate_number || !car_model || !owner_name || !buyer_name || !buyer_phone || !target_city) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }

        const existing = await transferModel.findByVin(vin.toUpperCase());
        if (existing) {
            return res.status(400).json({
                success: false,
                message: '该车架号已存在过户记录'
            });
        }

        const transferId = await transferModel.createTransfer({
            vin: vin.toUpperCase(),
            plate_number,
            car_model,
            owner_name,
            buyer_name,
            buyer_phone,
            target_city
        });

        res.status(201).json({
            success: true,
            message: '过户记录创建成功',
            data: { id: transferId }
        });
    } catch (error) {
        console.error('创建过户记录失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

router.put('/transfer/:id/progress', async (req, res) => {
    try {
        const { id } = req.params;
        const { stage, operator, remark } = req.body;

        if (stage === undefined || !operator) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }

        const transfer = await transferModel.findById(id);
        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: '过户记录不存在'
            });
        }

        await transferModel.updateProgress(id, parseInt(stage), operator, remark || '');

        res.json({
            success: true,
            message: '进度更新成功'
        });
    } catch (error) {
        console.error('更新进度失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

router.post('/transfer/:id/expense', async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, amount, payer, expense_time, remark } = req.body;

        if (!item_name || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }

        const transfer = await transferModel.findById(id);
        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: '过户记录不存在'
            });
        }

        const expenseId = await transferModel.addExpense(
            id,
            item_name,
            parseFloat(amount),
            payer || '',
            expense_time || null,
            remark || ''
        );

        res.status(201).json({
            success: true,
            message: '费用添加成功',
            data: { id: expenseId }
        });
    } catch (error) {
        console.error('添加费用失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

router.delete('/expense/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await transferModel.deleteExpense(id);

        res.json({
            success: true,
            message: '费用删除成功'
        });
    } catch (error) {
        console.error('删除费用失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const stats = await transferModel.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('获取统计数据失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

router.get('/stages', (req, res) => {
    res.json({
        success: true,
        data: transferModel.STAGE_NAMES
    });
});

module.exports = router;
