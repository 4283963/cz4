const API_BASE = '/api';

const STAGE_NAMES = [
    '创建过户记录',
    '北京提档完成',
    '外地落户完成',
    '新车牌制作完成',
    '全部完成'
];

const STATUS_BADGE_CLASSES = [
    'bg-secondary',
    'bg-info',
    'bg-warning',
    'bg-orange text-white',
    'bg-success'
];

let currentTransfers = [];
let currentStageNames = [];

document.addEventListener('DOMContentLoaded', () => {
    initStageSelect();
    loadStats();
    loadTransfers();

    document.getElementById('createSubmitBtn').addEventListener('click', handleCreate);
    document.getElementById('progressSubmitBtn').addEventListener('click', handleProgressUpdate);
    document.getElementById('expenseAddBtn').addEventListener('click', handleAddExpense);

    document.getElementById('createModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('createForm').reset();
    });
});

async function initStageSelect() {
    try {
        const response = await fetch(`${API_BASE}/stages`);
        const data = await response.json();
        if (data.success) {
            currentStageNames = data.data;
            const select = document.getElementById('stageSelect');
            select.innerHTML = '';
            data.data.forEach((name, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `阶段 ${index}: ${name}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载阶段列表失败:', error);
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        if (data.success) {
            const stats = data.data;
            document.getElementById('statTotal').textContent = stats.total;
            document.getElementById('statPending').textContent = stats.pending;
            document.getElementById('statTiDang').textContent = stats.tiDang;
            document.getElementById('statLuoHu').textContent = stats.luoHu;
            document.getElementById('statMaking').textContent = stats.makingPlate;
            document.getElementById('statCompleted').textContent = stats.completed;
        }
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

async function loadTransfers() {
    try {
        const response = await fetch(`${API_BASE}/transfers`);
        const data = await response.json();
        if (data.success) {
            currentTransfers = data.data;
            renderTransferTable(data.data);
        }
    } catch (error) {
        console.error('加载过户记录失败:', error);
        showAlert('加载数据失败，请刷新页面重试', 'danger');
    }
}

function renderTransferTable(transfers) {
    const tbody = document.getElementById('transferTable');
    tbody.innerHTML = '';

    if (transfers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">暂无过户记录</td>
            </tr>
        `;
        return;
    }

    transfers.forEach(transfer => {
        const tr = document.createElement('tr');
        const badgeClass = STATUS_BADGE_CLASSES[transfer.status] || 'bg-secondary';
        const statusName = STAGE_NAMES[transfer.status] || '未知';

        tr.innerHTML = `
            <td>${transfer.id}</td>
            <td><code>${transfer.vin}</code></td>
            <td>${transfer.plate_number}</td>
            <td>${transfer.car_model}</td>
            <td>${transfer.buyer_name}</td>
            <td>${transfer.target_city}</td>
            <td><span class="badge ${badgeClass}">${statusName}</span></td>
            <td><small class="text-muted">${formatDateTime(transfer.created_at)}</small></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewDetail('${transfer.vin}')">详情</button>
                    <button class="btn btn-outline-info" onclick="openProgressModal(${transfer.id})">进度</button>
                    <button class="btn btn-outline-warning" onclick="openExpenseModal(${transfer.id})">费用</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleCreate() {
    const form = document.getElementById('createForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const required = ['vin', 'plate_number', 'car_model', 'owner_name', 'buyer_name', 'buyer_phone', 'target_city'];
    for (const field of required) {
        if (!data[field] || !data[field].trim()) {
            showAlert('请填写所有必填项', 'warning');
            return;
        }
    }

    if (data.vin.length < 17) {
        showAlert('车架号应为17位', 'warning');
        return;
    }

    const btn = document.getElementById('createSubmitBtn');
    btn.disabled = true;
    btn.textContent = '创建中...';

    try {
        const response = await fetch(`${API_BASE}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            showAlert('创建成功', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('createModal'));
            modal.hide();
            loadStats();
            loadTransfers();
        } else {
            showAlert(result.message || '创建失败', 'danger');
        }
    } catch (error) {
        console.error('创建失败:', error);
        showAlert('网络错误，请稍后重试', 'danger');
    } finally {
        btn.disabled = false;
        btn.textContent = '创建';
    }
}

function openProgressModal(transferId) {
    const transfer = currentTransfers.find(t => t.id === transferId);
    if (!transfer) return;

    document.getElementById('progressCarInfo').innerHTML = `
        <strong>${transfer.car_model}</strong> (${transfer.plate_number})<br>
        车架号: <code>${transfer.vin}</code>
    `;
    document.querySelector('#progressForm input[name="transfer_id"]').value = transferId;
    document.getElementById('stageSelect').value = transfer.status;
    document.querySelector('#progressForm input[name="operator"]').value = '';
    document.querySelector('#progressForm textarea[name="remark"]').value = '';

    const photoInput = document.getElementById('photoInput');
    const previewWrap = document.getElementById('photoPreviewWrap');
    const previewImg = document.getElementById('photoPreview');
    const clearBtn = document.getElementById('clearPhotoBtn');

    photoInput.value = '';
    previewWrap.classList.add('d-none');
    previewImg.src = '';

    if (!photoInput.dataset.bound) {
        photoInput.addEventListener('change', () => {
            const file = photoInput.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showAlert('图片大小不能超过 5MB', 'warning');
                    photoInput.value = '';
                    previewWrap.classList.add('d-none');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    previewWrap.classList.remove('d-none');
                };
                reader.readAsDataURL(file);
            } else {
                previewWrap.classList.add('d-none');
            }
        });
        clearBtn.addEventListener('click', () => {
            photoInput.value = '';
            previewImg.src = '';
            previewWrap.classList.add('d-none');
        });
        photoInput.dataset.bound = '1';
    }

    const modal = new bootstrap.Modal(document.getElementById('progressModal'));
    modal.show();
}

async function handleProgressUpdate() {
    const form = document.getElementById('progressForm');
    const formData = new FormData(form);
    const transferId = formData.get('transfer_id');
    const stage = formData.get('stage');
    const operator = formData.get('operator');
    const remark = formData.get('remark');

    if (!operator || !operator.trim()) {
        showAlert('请填写经办人', 'warning');
        return;
    }

    const btn = document.getElementById('progressSubmitBtn');
    btn.disabled = true;
    btn.textContent = '更新中...';

    try {
        const response = await fetch(`${API_BASE}/transfer/${transferId}/progress`, {
            method: 'PUT',
            body: formData
        });
        const result = await response.json();

        if (result.success) {
            showAlert('进度更新成功', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('progressModal'));
            modal.hide();
            loadStats();
            loadTransfers();
        } else {
            showAlert(result.message || '更新失败', 'danger');
        }
    } catch (error) {
        console.error('更新进度失败:', error);
        showAlert('网络错误，请稍后重试', 'danger');
    } finally {
        btn.disabled = false;
        btn.textContent = '更新';
    }
}

async function openExpenseModal(transferId) {
    const transfer = currentTransfers.find(t => t.id === transferId);
    if (!transfer) return;

    document.getElementById('expenseCarInfo').innerHTML = `
        <strong>${transfer.car_model}</strong> (${transfer.plate_number})<br>
        车架号: <code>${transfer.vin}</code>
    `;
    document.querySelector('#expenseForm input[name="transfer_id"]').value = transferId;

    await loadExpenseList(transferId);

    const modal = new bootstrap.Modal(document.getElementById('expenseModal'));
    modal.show();
}

async function loadExpenseList(transferId) {
    try {
        const response = await fetch(`${API_BASE}/transfer/${currentTransfers.find(t => t.id === transferId).vin}`);
        const data = await response.json();
        if (data.success) {
            renderExpenseList(data.data.expenses, data.data.totalAmount);
        }
    } catch (error) {
        console.error('加载费用列表失败:', error);
    }
}

function renderExpenseList(expenses, totalAmount) {
    const tbody = document.getElementById('expenseList');
    tbody.innerHTML = '';

    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-3">暂无费用记录</td>
            </tr>
        `;
    } else {
        expenses.forEach(expense => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${expense.item_name}</td>
                <td class="text-primary fw-bold">¥${parseFloat(expense.amount).toFixed(2)}</td>
                <td>${expense.payer || '-'}</td>
                <td>${expense.expense_time || '-'}</td>
                <td class="text-muted small">${expense.remark || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense(${expense.id})">删除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('expenseTotal').textContent = `¥${parseFloat(totalAmount).toFixed(2)}`;
}

async function handleAddExpense() {
    const form = document.getElementById('expenseForm');
    const formData = new FormData(form);
    const transferId = formData.get('transfer_id');
    const itemName = formData.get('item_name');
    const amount = formData.get('amount');
    const payer = formData.get('payer');
    const expenseTime = formData.get('expense_time');
    const remark = formData.get('remark');

    if (!itemName || !itemName.trim()) {
        showAlert('请填写费用项目', 'warning');
        return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        showAlert('请填写有效的金额', 'warning');
        return;
    }

    const btn = document.getElementById('expenseAddBtn');
    btn.disabled = true;
    btn.textContent = '添加中...';

    try {
        const response = await fetch(`${API_BASE}/transfer/${transferId}/expense`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_name: itemName,
                amount: parseFloat(amount),
                payer,
                expense_time: expenseTime || null,
                remark
            })
        });
        const result = await response.json();

        if (result.success) {
            showAlert('费用添加成功', 'success');
            form.reset();
            document.querySelector('#expenseForm input[name="transfer_id"]').value = transferId;
            await loadExpenseList(parseInt(transferId));
            loadStats();
        } else {
            showAlert(result.message || '添加失败', 'danger');
        }
    } catch (error) {
        console.error('添加费用失败:', error);
        showAlert('网络错误，请稍后重试', 'danger');
    } finally {
        btn.disabled = false;
        btn.textContent = '添加';
    }
}

async function deleteExpense(expenseId) {
    if (!confirm('确定要删除这条费用记录吗？')) return;

    try {
        const response = await fetch(`${API_BASE}/expense/${expenseId}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (result.success) {
            showAlert('删除成功', 'success');
            const transferId = parseInt(document.querySelector('#expenseForm input[name="transfer_id"]').value);
            await loadExpenseList(transferId);
            loadStats();
        } else {
            showAlert(result.message || '删除失败', 'danger');
        }
    } catch (error) {
        console.error('删除费用失败:', error);
        showAlert('网络错误，请稍后重试', 'danger');
    }
}

async function viewDetail(vin) {
    try {
        const response = await fetch(`${API_BASE}/transfer/${vin}`);
        const data = await response.json();
        if (data.success) {
            renderDetailModal(data.data);
            const modal = new bootstrap.Modal(document.getElementById('detailModal'));
            modal.show();
        }
    } catch (error) {
        console.error('加载详情失败:', error);
        showAlert('加载详情失败', 'danger');
    }
}

function renderDetailModal(data) {
    const { transfer, progress, expenses, totalAmount, progressPercent, currentStageName } = data;

    let progressHtml = '';
    progress.forEach(node => {
        progressHtml += `
            <div class="mb-2 p-2 border rounded">
                <div class="d-flex justify-content-between">
                    <strong>${node.stage_name}</strong>
                    <small class="text-muted">${formatDateTime(node.node_time)}</small>
                </div>
                <div class="text-muted small">经办人: ${node.operator || '-'}</div>
                ${node.remark ? `<div class="small">${node.remark}</div>` : ''}
            </div>
        `;
    });

    let expenseHtml = '';
    expenses.forEach(exp => {
        expenseHtml += `
            <tr>
                <td>${exp.item_name}</td>
                <td>¥${parseFloat(exp.amount).toFixed(2)}</td>
                <td>${exp.payer || '-'}</td>
                <td>${exp.expense_time || '-'}</td>
                <td>${exp.remark || '-'}</td>
            </tr>
        `;
    });

    document.getElementById('detailContent').innerHTML = `
        <div class="mb-4">
            <h6 class="text-primary">基本信息</h6>
            <div class="row small">
                <div class="col-md-6">车架号: <code>${transfer.vin}</code></div>
                <div class="col-md-6">车牌号: ${transfer.plate_number}</div>
                <div class="col-md-6">车型: ${transfer.car_model}</div>
                <div class="col-md-6">转入城市: ${transfer.target_city}</div>
                <div class="col-md-6">原车主: ${transfer.owner_name}</div>
                <div class="col-md-6">买方: ${transfer.buyer_name} (${transfer.buyer_phone})</div>
                <div class="col-md-6">当前进度: <span class="badge ${STATUS_BADGE_CLASSES[transfer.status]}">${currentStageName}</span> (${progressPercent}%)</div>
                <div class="col-md-6">创建时间: ${formatDateTime(transfer.created_at)}</div>
            </div>
        </div>

        <div class="mb-4">
            <h6 class="text-success">进度记录</h6>
            ${progressHtml || '<div class="text-muted small">暂无进度记录</div>'}
        </div>

        <div>
            <h6 class="text-warning">费用明细 (合计: <span class="text-primary">¥${parseFloat(totalAmount).toFixed(2)}</span>)</h6>
            <div class="table-responsive">
                <table class="table table-sm table-hover">
                    <thead>
                        <tr>
                            <th>项目</th>
                            <th>金额</th>
                            <th>支付人</th>
                            <th>日期</th>
                            <th>备注</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expenseHtml || '<tr><td colspan="5" class="text-center text-muted small">暂无费用记录</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
