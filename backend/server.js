const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const transferRoutes = require('./routes/transfer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, 'uploads', 'progress_photos');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `progress_${uniquePrefix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('只支持 JPG/PNG/GIF/WebP/BMP 图片格式'));
        }
    }
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', transferRoutes(upload));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: '上传的图片大小不能超过 5MB'
            });
        }
        return res.status(400).json({
            success: false,
            message: '文件上传错误: ' + err.message
        });
    }
    if (err.message && err.message.includes('只支持')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
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
            console.log(`  - 上传目录: ${UPLOAD_DIR}`);
        });
    } catch (error) {
        console.error('启动失败:', error.message);
        console.error('请检查MySQL服务是否启动，数据库配置是否正确');
        process.exit(1);
    }
}

startServer();
