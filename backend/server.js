const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const transferRoutes = require('./routes/transfer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api', transferRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在'
    });
});

async function startServer() {
    try {
        const connection = await db.pool.getConnection();
        console.log('✓ 数据库连接成功');
        connection.release();

        app.listen(PORT, () => {
            console.log(`✓ 服务器启动成功，运行在 http://localhost:${PORT}`);
            console.log(`  - 用户查询页面: http://localhost:${PORT}/`);
            console.log(`  - 管理后台页面: http://localhost:${PORT}/admin`);
            console.log(`  - API接口前缀: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('启动失败:', error.message);
        console.error('请检查MySQL服务是否启动，数据库配置是否正确');
        process.exit(1);
    }
}

startServer();
