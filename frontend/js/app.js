const API_BASE = '/api';

const STAGE_COLORS = [
    'bg-secondary',
    'bg-info',
    'bg-warning',
    'bg-orange',
    'bg-success'
];

const STATUS_BADGE_CLASSES = [
    'bg-secondary',
    'bg-info',
    'bg-warning',
    'bg-orange text-white',
    'bg-success'
];

document.addEventListener('DOMContentLoaded', () => {
    const vinInput = document.getElementById('vinInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchBtnText = document.getElementById('searchBtnText');
    const searchBtnLoading = document.getElementById('searchBtnLoading');
    const resultContainer = document.getElementById('resultContainer');
    const errorContainer = document.getElementById('errorContainer');

    searchBtn.addEventListener('click', handleSearch);
    vinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    async function handleSearch() {
        const vin = vinInput.value.trim().toUpperCase();

        if (!vin) {
            showError('请输入车架号');
            return;
        }

        if (vin.length < 17) {
            showError('车架号应为17位，请检查输入');
            return;
        }

        setLoading(true);
        hideResult();
        hideError();

        try {
            const response = await fetch(`${API_BASE}/transfer/${vin}`);
            const data = await response.json();

            if (data.success) {
                renderResult(data.data);
                showResult();
            } else {
                showError(data.message || '查询失败');
            }
        } catch (error) {
            showError('网络错误，请稍后重试');
            console.error('查询错误:', error);
        } finally {
            setLoading(false);
        }
    }

    function setLoading(loading) {
        searchBtn.disabled = loading;
        vinInput.disabled = loading;
        if (loading) {
            searchBtnText.classList.add('d-none');
            searchBtnLoading.classList.remove('d-none');
        } else {
            searchBtnText.classList.remove('d-none');
            searchBtnLoading.classList.add('d-none');
        }
    }

    function showResult() {
        resultContainer.classList.remove('d-none');
        errorContainer.classList.add('d-none');
    }

    function hideResult() {
        resultContainer.classList.add('d-none');
    }

    function showError(message) {
        document.getElementById('errorMessage').textContent = message;
        errorContainer.classList.remove('d-none');
        resultContainer.classList.add('d-none');
    }

    function hideError() {
        errorContainer.classList.add('d-none');
    }

    function renderResult(data) {
        const { transfer, progress, expenses, totalAmount, progressPercent, currentStageName } = data;

        document.getElementById('vinDisplay').textContent = transfer.vin;
        document.getElementById('plateDisplay').textContent = transfer.plate_number;
        document.getElementById('modelDisplay').textContent = transfer.car_model;
        document.getElementById('cityDisplay').textContent = transfer.target_city;
        document.getElementById('buyerDisplay').textContent = transfer.buyer_name;

        const statusBadge = document.getElementById('statusBadge');
        statusBadge.textContent = currentStageName;
        statusBadge.className = `badge fs-6 ${STATUS_BADGE_CLASSES[transfer.status] || 'bg-secondary'}`;

        document.getElementById('progressPercent').textContent = `${progressPercent}%`;
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = `${progressPercent}%`;
        progressBar.setAttribute('aria-valuenow', progressPercent);

        renderTimeline(progress, transfer.status);
        renderExpenses(expenses, totalAmount);
    }

    function renderTimeline(progress, currentStatus) {
        const timeline = document.getElementById('progressTimeline');
        timeline.innerHTML = '';

        const fullStages = [
            { stage: 0, name: '创建过户记录', desc: '提交过户申请' },
            { stage: 1, name: '北京提档完成', desc: '北京车管所提取车辆档案' },
            { stage: 2, name: '外地落户中', desc: '档案到达转入地车管所' },
            { stage: 3, name: '新车牌制作中', desc: '车管所制作新车牌' },
            { stage: 4, name: '全部完成', desc: '过户流程完成，收到新牌' }
        ];

        fullStages.forEach((item, index) => {
            const node = progress.find(p => p.stage === item.stage);
            const isCompleted = item.stage <= currentStatus;
            const isCurrent = item.stage === currentStatus;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'timeline-item';

            const dotClass = isCompleted ? `timeline-dot ${STAGE_COLORS[item.stage] || 'bg-secondary'}` : 'timeline-dot bg-light border';
            const lineClass = index < fullStages.length - 1
                ? (isCompleted && fullStages[index + 1].stage <= currentStatus ? 'timeline-line bg-success' : 'timeline-line bg-light')
                : '';

            const timeStr = node ? formatDateTime(node.node_time) : '-';
            const remarkStr = node ? node.remark : item.desc;
            const operatorStr = node ? node.operator : '-';

            let borderClass = '';
            if (isCurrent) {
                borderClass = 'border-primary shadow-sm';
            } else if (isCompleted) {
                borderClass = 'border-success';
            }

            itemDiv.innerHTML = `
                <div class="timeline-content ${borderClass}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1 ${isCompleted ? 'text-dark' : 'text-muted'}">
                                ${isCurrent ? '<span class="badge bg-primary me-2">当前</span>' : ''}
                                ${item.name}
                            </h6>
                            <p class="mb-1 text-muted small">${remarkStr}</p>
                            <div class="text-muted small">
                                <span>经办人: ${operatorStr}</span>
                            </div>
                        </div>
                        <div class="text-end">
                            <small class="text-muted">${timeStr}</small>
                        </div>
                    </div>
                </div>
                <div class="${dotClass}"></div>
                ${lineClass ? `<div class="${lineClass}"></div>` : ''}
            `;

            timeline.appendChild(itemDiv);
        });
    }

    function renderExpenses(expenses, totalAmount) {
        const tbody = document.getElementById('expenseTable');
        tbody.innerHTML = '';

        if (expenses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">暂无费用记录</td>
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
                `;
                tbody.appendChild(tr);
            });
        }

        document.getElementById('totalAmount').textContent = `¥${parseFloat(totalAmount).toFixed(2)}`;
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
});
