/**
 * 拾光扭蛋 - 主应用脚本
 * 情绪记录应用
 *
 * ============================================
 * 版权声明
 * ============================================
 * 本代码为拾光扭蛋应用的核心组成部分，受中华人民共和国著作权法保护。
 * 未经授权，禁止任何形式的复制、分发、修改、使用于商业目的。
 *
 * ============================================
 * 反爬虫与AI使用声明
 * ============================================
 * 本应用代码包含以下保护措施：
 * 1. 禁止任何自动化抓取、爬取行为（包括但不限于AI爬虫、机器学习数据采集）
 * 2. 禁止将本代码用于训练任何形式的AI模型
 * 3. 禁止将本代码或相关数据用于任何AI应用、服务或产品
 * 4. 禁止通过技术手段绕过或破坏本应用的任何保护机制
 *
 * 如需合法使用本应用，请联系开发者获取授权。
 * 违反上述声明的行为将承担相应的法律责任。
 *
 * ============================================
 * 技术说明
 * ============================================
 * 本应用为纯前端实现，使用localStorage存储用户数据。
 * 数据的完整性和安全性由用户自行负责，建议定期备份。
 */

 // ==================== 配置 ====================
const CONFIG = {
    STORAGE_KEY: 'shiguang_memories',
    GACHA_HISTORY_KEY: 'shiguang_gacha_history',
    MILESTONES: [100, 300, 500],
    EMOTIONS: {
        joy: { name: '快乐', color: '#ffd966', rgb: '255, 217, 102', icon: '😊' },
        sadness: { name: '悲伤', color: '#7ec8e3', rgb: '126, 200, 227', icon: '😢' },
        anger: { name: '愤怒', color: '#ff8a80', rgb: '255, 138, 128', icon: '😠' },
        disgust: { name: '厌恶', color: '#a8e6cf', rgb: '168, 230, 207', icon: '😒' },
        fear: { name: '恐惧', color: '#c5a3ff', rgb: '197, 163, 255', icon: '😨' }
    },
    MAX_MEMORIES: 10000
};

// ==================== 状态 ====================
let state = {
    memories: [],
    gachaHistory: [],
    currentEmotions: [],
    chart: null,
    heatmapMonth: 0  // 0 = 本月, 1 = 上月, 12 = 全年
};

// ==================== 工具函数 ====================

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 格式化日期
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();

    // 今天
    if (date.toDateString() === now.toDateString()) {
        return '今天';
    }

    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return '昨天';
    }

    // 本周
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (date > weekAgo) {
        return date.toLocaleDateString('zh-CN', { weekday: 'long' });
    }

    // 本月
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        return date.getDate() + '日';
    }

    // 更早
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// 完整日期时间
function formatFullDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 生成交织彩虹效果的颜色样式 (头脑特工队风格)
function generateIntertwinedColors(emotions) {
    if (emotions.length === 0) {
        return 'rgba(255, 255, 255, 0.3)';
    }
    if (emotions.length === 1) {
        return CONFIG.EMOTIONS[emotions[0].type].color;
    }

    // 多种情绪：使用交织/彩虹效果
    // 使用 conic-gradient 创建旋转的彩虹效果
    const colors = emotions.map(e => CONFIG.EMOTIONS[e.type].color);
    return colors;
}

// 生成交织彩虹球的CSS样式
function getIntertwinedBallStyle(emotions) {
    if (emotions.length === 0) {
        return {
            background: 'rgba(255, 245, 235, 0.5)',
            boxShadow: 'inset 0 -5px 10px rgba(180, 140, 100, 0.15), 0 3px 10px rgba(180, 140, 100, 0.15)'
        };
    }
    if (emotions.length === 1) {
        const color = CONFIG.EMOTIONS[emotions[0].type].color;
        return {
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            boxShadow: `inset 0 -5px 10px rgba(0, 0, 0, 0.1), 0 3px 15px ${color}66`
        };
    }

    // 多种情绪：使用交织彩虹效果
    const colors = emotions.map(e => CONFIG.EMOTIONS[e.type].color);
    const gradient = `conic-gradient(from 0deg, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(', ')})`;

    return {
        background: gradient,
        boxShadow: 'inset 0 -5px 10px rgba(0, 0, 0, 0.15), 0 3px 15px rgba(0, 0, 0, 0.2)'
    };
}

// 获取热力图单元格的交织颜色
function getHeatmapCellStyle(memoriesForDay) {
    if (memoriesForDay.length === 0) {
        return 'rgba(180, 140, 100, 0.1)';
    }

    // 收集所有情绪
    const allEmotions = memoriesForDay.flatMap(m => m.emotions);

    if (allEmotions.length === 0) {
        return 'rgba(180, 140, 100, 0.1)';
    }

    // 获取唯一的情绪类型
    const uniqueEmotions = [...new Set(allEmotions.map(e => e.type))];

    if (uniqueEmotions.length === 1) {
        return CONFIG.EMOTIONS[uniqueEmotions[0]].color;
    }

    // 多种情绪：使用交织效果
    const colors = uniqueEmotions.map(type => CONFIG.EMOTIONS[type].color);
    return `conic-gradient(from 0deg, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(', ')})`;
}

// 混合颜色 (保留用于兼容)
function mixColors(emotions) {
    if (emotions.length === 0) return 'rgba(255, 255, 255, 0.1)';
    if (emotions.length === 1) return CONFIG.EMOTIONS[emotions[0].type].color;

    // 返回交织效果的颜色
    const colors = emotions.map(e => CONFIG.EMOTIONS[e.type].color);
    return `conic-gradient(from 0deg, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(', ')})`;
}

// 获取主导情绪
function getDominantEmotion(emotions) {
    if (emotions.length === 0) return null;
    return emotions.reduce((max, e) => e.weight > max.weight ? e : max, emotions[0]);
}

// 本地存储
function saveMemories() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.memories));
    } catch (e) {
        console.error('保存失败:', e);
        showToast('保存失败，请清理一些记忆');
    }
}

function loadMemories() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (data) {
            state.memories = JSON.parse(data);
        }
    } catch (e) {
        console.error('加载失败:', e);
        state.memories = [];
    }
}

function saveGachaHistory() {
    try {
        const history = state.gachaHistory.slice(0, 50);
        localStorage.setItem(CONFIG.GACHA_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('保存扭蛋历史失败:', e);
    }
}

function loadGachaHistory() {
    try {
        const data = localStorage.getItem(CONFIG.GACHA_HISTORY_KEY);
        if (data) {
            state.gachaHistory = JSON.parse(data);
        }
    } catch (e) {
        state.gachaHistory = [];
    }
}

// 显示提示
function showToast(message, icon = '🎉') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.querySelector('.toast-icon');

    toastMessage.textContent = message;
    toastIcon.textContent = icon;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 粒子效果
function createParticles(x, y, colors) {
    const container = document.getElementById('particles');

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 8 + 4;
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 100 + 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        particle.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            --tx: ${tx}px;
            --ty: ${ty}px;
            animation: particleFly 1s ease-out forwards;
        `;

        container.appendChild(particle);

        setTimeout(() => particle.remove(), 1000);
    }
}

// 添加粒子飞行动画
const style = document.createElement('style');
style.textContent = `
    @keyframes particleFly {
        0% { opacity: 1; transform: translate(0, 0) scale(1); }
        100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0); }
    }
`;
document.head.appendChild(style);

// 庆祝动画
function celebrate() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffd966', '#7ec8e3', '#ff8a80', '#a8e6cf', '#c5a3ff']
    });
}

// 检查里程碑
function checkMilestone() {
    const count = state.memories.length;
    const milestone = CONFIG.MILESTONES.find(m => m === count);

    if (milestone) {
        const notice = document.getElementById('backup-notice');
        const countEl = document.getElementById('milestone-count');
        countEl.textContent = milestone;
        notice.style.display = 'flex';
    }
}

// ==================== 页面导航 ====================
function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const pages = document.querySelectorAll('.page');
    const viewAllBtns = document.querySelectorAll('.view-all-btn');

    function switchPage(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        tabs.forEach(tab => tab.classList.remove('active'));

        document.getElementById(pageId + '-page').classList.add('active');
        document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');

        if (pageId === 'home') {
            renderHomePage();
        } else if (pageId === 'gacha') {
            renderGachaPage();
        } else if (pageId === 'archive') {
            renderArchivePage();
        } else if (pageId === 'settings') {
            renderSettingsPage();
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = tab.dataset.page;
            switchPage(pageId);
            history.pushState(null, '', '#' + pageId);
        });
    });

    viewAllBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = btn.dataset.page;
            switchPage(pageId);
            history.pushState(null, '', '#' + pageId);
        });
    });

    const hash = window.location.hash.slice(1);
    if (hash && ['home', 'gacha', 'archive', 'settings'].includes(hash)) {
        switchPage(hash);
    } else {
        switchPage('home');
    }

    window.addEventListener('popstate', () => {
        const hash = window.location.hash.slice(1) || 'home';
        switchPage(hash);
    });
}

// ==================== 首页 ====================
function renderHomePage() {
    loadMemories();

    const totalBalls = state.memories.length;
    const uniqueDays = new Set(state.memories.map(m => new Date(m.timestamp).toDateString())).size;

    let streakDays = 0;
    const sortedDates = [...new Set(state.memories.map(m => new Date(m.timestamp).toDateString()))]
        .sort((a, b) => new Date(b) - new Date(a));

    if (sortedDates.length > 0) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        if (sortedDates[0] === today || sortedDates[0] === yesterday) {
            streakDays = 1;
            for (let i = 1; i < sortedDates.length; i++) {
                const prev = new Date(sortedDates[i - 1]);
                const curr = new Date(sortedDates[i]);
                const diff = (prev - curr) / 86400000;

                if (diff === 1) {
                    streakDays++;
                } else {
                    break;
                }
            }
        }
    }

    document.getElementById('total-balls').textContent = totalBalls;
    document.getElementById('active-days').textContent = uniqueDays;
    document.getElementById('streak-days').textContent = streakDays;

    renderHeatmap();
    renderEmotionChart();
    renderRecentRecords();
}

function renderHeatmap() {
    const container = document.getElementById('heatmap');
    const monthOffset = state.heatmapMonth;
    const days = [];
    const now = new Date();

    let startDate, endDate;

    if (monthOffset === 12) {
        // 全年：显示过去12个月
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
    } else {
        // 按月选择：计算该月的开始和结束日期
        const targetMonth = now.getMonth() - monthOffset;
        const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
        const adjustedMonth = ((targetMonth % 12) + 12) % 12;

        startDate = new Date(targetYear, adjustedMonth, 1);
        endDate = new Date(targetYear, adjustedMonth + 1, 0); // 该月最后一天
    }

    // 生成该月所有日期
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }

    container.innerHTML = days.map(date => {
        const dateStr = date.toDateString();
        const dayMemories = state.memories.filter(m =>
            new Date(m.timestamp).toDateString() === dateStr
        );

        const bgColor = getHeatmapCellStyle(dayMemories);
        let tooltip = formatDate(date.getTime());

        if (dayMemories.length > 0) {
            tooltip += ` · ${dayMemories.length}条记录`;
        }

        return `<div class="heatmap-cell" style="background: ${bgColor}" data-tooltip="${tooltip}"></div>`;
    }).join('');

    // 绑定月份选择器事件
    const monthSelect = document.getElementById('heatmap-month');
    if (monthSelect) {
        monthSelect.value = monthOffset.toString();
        monthSelect.onchange = function() {
            state.heatmapMonth = parseInt(this.value);
            renderHeatmap();
        };
    }
}

function renderEmotionChart() {
    const ctx = document.getElementById('emotion-chart').getContext('2d');

    const emotionCounts = {};
    Object.keys(CONFIG.EMOTIONS).forEach(e => emotionCounts[e] = 0);

    state.memories.forEach(m => {
        const dominant = getDominantEmotion(m.emotions);
        if (dominant) {
            emotionCounts[dominant.type]++;
        }
    });

    const data = {
        labels: Object.values(CONFIG.EMOTIONS).map(e => e.name),
        datasets: [{
            data: Object.keys(CONFIG.EMOTIONS).map(e => emotionCounts[e]),
            backgroundColor: Object.keys(CONFIG.EMOTIONS).map(e => CONFIG.EMOTIONS[e].color),
            borderWidth: 0,
            hoverOffset: 10
        }]
    };

    if (state.chart) {
        state.chart.destroy();
    }

    state.chart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#7d6b5d',
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            cutout: '60%'
        }
    });
}

function renderRecentRecords() {
    const container = document.getElementById('recent-records');
    const recent = state.memories.slice(-10).reverse();

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💭</div>
                <p class="empty-text">还没有记录</p>
                <p class="empty-hint">点击下方按钮记录第一个心情</p>
            </div>
        `;
        return;
    }

    container.innerHTML = recent.map(m => {
        const ballStyle = getIntertwinedBallStyle(m.emotions);
        return `
            <div class="recent-record" data-id="${m.id}">
                <div class="record-ball" style="background: ${ballStyle.background}; box-shadow: ${ballStyle.boxShadow}"></div>
                <div class="record-content">
                    <p class="record-text">${escapeHtml(m.content)}</p>
                    <div class="record-meta">
                        <span>${formatDate(m.timestamp)}</span>
                        ${m.emotions.map(e =>
                            `<span class="emotion-tag" style="color: ${CONFIG.EMOTIONS[e.type].color}">${CONFIG.EMOTIONS[e.type].icon}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== 扭蛋机 ====================
function renderGachaPage() {
    loadMemories();
    renderGachaBalls();
    renderGachaHistory();
}

function renderGachaBalls() {
    const container = document.getElementById('gacha-balls');

    if (state.memories.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 80px 0;">暂无记忆</p>';
        return;
    }

    const balls = [];
    const colors = Object.values(CONFIG.EMOTIONS).map(e => e.color);

    for (let i = 0; i < 12; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 70 + 15;
        const top = Math.random() * 70 + 15;
        const delay = Math.random() * 2;

        balls.push(`
            <div class="gacha-ball" style="
                left: ${left}%;
                top: ${top}%;
                background: ${color};
                animation-delay: ${delay}s;
            "></div>
        `);
    }

    container.innerHTML = balls.join('');
}

function initGacha() {
    const gachaBtn = document.getElementById('gacha-btn');
    const gachaAgain = document.getElementById('gacha-again');
    const dial = document.querySelector('.gacha-dial');

    function spin() {
        if (state.memories.length === 0) {
            showToast('还没有记忆可扭', '💭');
            return;
        }

        dial.classList.add('spinning');
        gachaBtn.disabled = true;

        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * state.memories.length);
            const memory = state.memories[randomIndex];

            showGachaResult(memory);

            state.gachaHistory.unshift({
                id: memory.id,
                content: memory.content,
                emotions: memory.emotions,
                mixColor: memory.mixColor,
                timestamp: Date.now()
            });
            saveGachaHistory();

            dial.classList.remove('spinning');
            gachaBtn.disabled = false;
        }, 2000);
    }

    gachaBtn.addEventListener('click', spin);
    gachaAgain?.addEventListener('click', spin);
    dial.addEventListener('click', spin);
}

function showGachaResult(memory) {
    const result = document.getElementById('gacha-result');
    const ball = document.getElementById('result-ball');
    const text = document.getElementById('result-text');
    const date = document.getElementById('result-date');
    const emotions = document.getElementById('result-emotions');

    const ballStyle = getIntertwinedBallStyle(memory.emotions);
    ball.style.background = ballStyle.background;
    ball.style.boxShadow = ballStyle.boxShadow;

    text.textContent = memory.content;
    date.textContent = formatFullDate(memory.timestamp);

    emotions.innerHTML = memory.emotions.map(e => `
        <span style="font-size: 1.25rem" title="${CONFIG.EMOTIONS[e.type].name}">
            ${CONFIG.EMOTIONS[e.type].icon}
        </span>
    `).join('');

    result.style.display = 'block';
    result.scrollIntoView({ behavior: 'smooth' });
}

function renderGachaHistory() {
    const container = document.getElementById('gacha-history');

    if (state.gachaHistory.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">还没有扭过</p>';
        return;
    }

    container.innerHTML = state.gachaHistory.map(h => {
        const ballStyle = getIntertwinedBallStyle(h.emotions || []);
        return `
            <div class="gacha-history-item">
                <div class="gacha-history-ball" style="background: ${ballStyle.background}; box-shadow: ${ballStyle.boxShadow}"></div>
                <span class="gacha-history-text">${escapeHtml(h.content)}</span>
                <span class="gacha-history-time">${formatDate(h.timestamp)}</span>
            </div>
        `;
    }).join('');
}

// ==================== 归档页 ====================
function renderArchivePage() {
    loadMemories();
    filterAndRender();
}

function filterAndRender() {
    const timeFilter = document.getElementById('filter-time').value;
    const emotionFilter = document.getElementById('filter-emotion').value;

    let filtered = [...state.memories];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (timeFilter === 'today') {
        filtered = filtered.filter(m => new Date(m.timestamp) >= today);
    } else if (timeFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(m => new Date(m.timestamp) >= weekAgo);
    } else if (timeFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(m => new Date(m.timestamp) >= monthAgo);
    } else if (timeFilter === 'older') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(m => new Date(m.timestamp) < monthAgo);
    }

    if (emotionFilter !== 'all') {
        filtered = filtered.filter(m =>
            m.emotions.some(e => e.type === emotionFilter)
        );
    }

    document.getElementById('archive-count').textContent = filtered.length;

    const container = document.getElementById('archive-grid');
    const emptyState = document.getElementById('empty-state');

    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // 按日期分组到不同货架层级
    const now2 = new Date();
    const today2 = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate());
    const thisWeekStart = new Date(today2);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const thisMonthStart = new Date(now2.getFullYear(), now2.getMonth(), 1);

    const shelves = {
        today: [],
        thisWeek: [],
        thisMonth: [],
        older: []
    };

    filtered.forEach(m => {
        const date = new Date(m.timestamp);
        if (date >= today2) {
            shelves.today.push(m);
        } else if (date >= thisWeekStart) {
            shelves.thisWeek.push(m);
        } else if (date >= thisMonthStart) {
            shelves.thisMonth.push(m);
        } else {
            shelves.older.push(m);
        }
    });

    // 生成货架HTML
    const shelfNames = {
        today: '今日',
        thisWeek: '本周',
        thisMonth: '本月',
        older: '往昔'
    };

    let shelfHtml = '<div class="shelf-container">';

    Object.keys(shelves).forEach((key, index) => {
        const memories = shelves[key];
        if (memories.length === 0) return;

        shelfHtml += `
            <div class="shelf-row" style="animation-delay: ${index * 0.1}s">
                <div class="shelf-back"></div>
                <span class="shelf-level-label">${shelfNames[key]}</span>
                <div class="shelf-balls">
        `;

        memories.forEach((m, ballIndex) => {
            const ballStyle = getIntertwinedBallStyle(m.emotions);
            const shortContent = m.content.length > 12 ? m.content.substring(0, 12) + '...' : m.content;
            shelfHtml += `
                <div class="shelf-ball-item" data-id="${m.id}" style="animation-delay: ${(index * 0.1) + (ballIndex * 0.05)}s">
                    <div class="shelf-ball" style="background: ${ballStyle.background}; box-shadow: ${ballStyle.boxShadow}"></div>
                    <span class="shelf-ball-label">${escapeHtml(shortContent)}</span>
                </div>
            `;
        });

        shelfHtml += `
                </div>
            </div>
        `;
    });

    shelfHtml += '</div>';

    container.innerHTML = shelfHtml;

    // 添加点击删除事件
    container.querySelectorAll('.shelf-ball-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            const memory = state.memories.find(m => m.id === id);
            if (memory) {
                if (confirm('确定要删除这条记忆吗？')) {
                    state.memories = state.memories.filter(m => m.id !== id);
                    saveMemories();
                    renderArchivePage();
                    showToast('已删除', '🗑️');
                }
            }
        });
    });
}

function initArchiveFilters() {
    document.getElementById('filter-time').addEventListener('change', filterAndRender);
    document.getElementById('filter-emotion').addEventListener('change', filterAndRender);
}

// ==================== 设置页 ====================
function renderSettingsPage() {
    loadMemories();

    document.getElementById('data-total').textContent = state.memories.length;

    if (state.memories.length > 0) {
        const sorted = [...state.memories].sort((a, b) => a.timestamp - b.timestamp);
        document.getElementById('data-first').textContent = formatDate(sorted[0].timestamp);
        document.getElementById('data-latest').textContent = formatDate(sorted[sorted.length - 1].timestamp);
    } else {
        document.getElementById('data-first').textContent = '-';
        document.getElementById('data-latest').textContent = '-';
    }

    checkMilestone();
}

// ==================== 记录功能 ====================
function initRecordModal() {
    const modal = document.getElementById('record-modal');
    const closeBtn = document.getElementById('modal-close');
    const overlay = document.querySelector('.modal-overlay');
    const floatBtn = document.getElementById('float-add-btn');
    const saveBtn = document.getElementById('save-btn');
    const input = document.getElementById('memory-input');
    const charCount = document.getElementById('char-count');
    const palette = document.getElementById('color-palette');
    const ball = document.getElementById('memory-ball');
    const selectedContainer = document.getElementById('selected-emotions');

    floatBtn.addEventListener('click', () => {
        modal.classList.add('active');
        input.focus();
    });

    function closeModal() {
        modal.classList.remove('active');
        resetRecordForm();
    }

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    input.addEventListener('input', () => {
        charCount.textContent = input.value.length;
    });

    let draggedEmotion = null;

    palette.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('dragstart', (e) => {
            draggedEmotion = swatch.dataset.emotion;
            swatch.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'copy';
        });

        swatch.addEventListener('dragend', () => {
            swatch.classList.remove('dragging');
            draggedEmotion = null;
        });

        swatch.addEventListener('click', () => {
            addEmotion(swatch.dataset.emotion);
        });
    });

    ball.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    ball.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedEmotion) {
            addEmotion(draggedEmotion);
        }
    });

    function addEmotion(emotionType) {
        if (state.currentEmotions.some(e => e.type === emotionType)) {
            showToast('已添加该情绪', 'ℹ️');
            return;
        }

        state.currentEmotions.push({
            type: emotionType,
            weight: 1
        });

        updateBallColor();
        renderSelectedEmotions();
    }

    function removeEmotion(emotionType) {
        state.currentEmotions = state.currentEmotions.filter(e => e.type !== emotionType);
        updateBallColor();
        renderSelectedEmotions();
    }

    function updateBallColor() {
        if (state.currentEmotions.length === 0) {
            ball.classList.remove('has-color');
            ball.querySelector('.ball-inner').style.background = '';
            // 移除交织颜色层
            const colorsContainer = ball.querySelector('.ball-colors');
            if (colorsContainer) {
                colorsContainer.remove();
            }
        } else {
            ball.classList.add('has-color', 'coloring');

            // 创建交织颜色层
            const colors = state.currentEmotions.map(e => CONFIG.EMOTIONS[e.type].color);

            // 移除旧的
            const oldContainer = ball.querySelector('.ball-colors');
            if (oldContainer) {
                oldContainer.remove();
            }

            // 创建新的交织层
            if (colors.length > 1) {
                const colorsContainer = document.createElement('div');
                colorsContainer.className = 'ball-colors';
                colorsContainer.style.cssText = `
                    position: absolute;
                    top: 5%;
                    left: 5%;
                    width: 90%;
                    height: 90%;
                    border-radius: 50%;
                    background: conic-gradient(from 0deg, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(', ')});
                    animation: rotate 4s linear infinite;
                `;

                // 添加旋转动画
                if (!document.getElementById('ball-rotate-style')) {
                    const rotateStyle = document.createElement('style');
                    rotateStyle.id = 'ball-rotate-style';
                    rotateStyle.textContent = `
                        @keyframes rotate {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    `;
                    document.head.appendChild(rotateStyle);
                }

                ball.insertBefore(colorsContainer, ball.querySelector('.ball-inner'));
            } else {
                // 单一颜色
                const singleColor = colors[0];
                ball.querySelector('.ball-inner').style.background = `linear-gradient(135deg, ${singleColor}, ${singleColor}dd)`;
            }

            setTimeout(() => ball.classList.remove('coloring'), 600);
        }
    }

    function renderSelectedEmotions() {
        if (state.currentEmotions.length === 0) {
            selectedContainer.innerHTML = '<span class="no-emotion">请选择情绪颜色</span>';
            return;
        }

        selectedContainer.innerHTML = state.currentEmotions.map(e => `
            <div class="selected-emotion-tag">
                <span class="emotion-dot" style="background: ${CONFIG.EMOTIONS[e.type].color}"></span>
                <span>${CONFIG.EMOTIONS[e.type].name}</span>
                <span class="remove-emotion" data-type="${e.type}">×</span>
            </div>
        `).join('');

        selectedContainer.querySelectorAll('.remove-emotion').forEach(btn => {
            btn.addEventListener('click', () => {
                removeEmotion(btn.dataset.type);
            });
        });
    }

    function resetRecordForm() {
        input.value = '';
        charCount.textContent = '0';
        state.currentEmotions = [];
        updateBallColor();
        renderSelectedEmotions();
    }

    saveBtn.addEventListener('click', () => {
        const content = input.value.trim();

        if (!content) {
            showToast('请输入心情文字', '📝');
            input.focus();
            return;
        }

        if (state.currentEmotions.length === 0) {
            showToast('请选择情绪颜色', '🎨');
            return;
        }

        const memory = {
            id: generateId(),
            content: content,
            emotions: state.currentEmotions.map(e => ({
                type: e.type,
                weight: 1 / state.currentEmotions.length
            })),
            mixColor: mixColors(state.currentEmotions),
            dominantEmotion: getDominantEmotion(state.currentEmotions.map(e => ({
                type: e.type,
                weight: 1 / state.currentEmotions.length
            })))?.type,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5)
        };

        state.memories.push(memory);
        saveMemories();

        const rect = ball.getBoundingClientRect();
        const colors = state.currentEmotions.map(e => CONFIG.EMOTIONS[e.type].color);
        createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, colors);
        celebrate();

        showToast('保存成功！', '✨');

        setTimeout(() => {
            closeModal();
            checkMilestone();
        }, 500);
    });
}

// ==================== 导入导出 ====================
function initImportExport() {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const clearBtn = document.getElementById('clear-btn');

    exportBtn.addEventListener('click', () => {
        if (state.memories.length === 0) {
            showToast('没有数据可导出', '💭');
            return;
        }

        exportToExcel();
    });

    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importFromExcel(file);
            importFile.value = '';
        }
    });

    clearBtn.addEventListener('click', () => {
        if (state.memories.length === 0) {
            showToast('没有数据可清空', '💭');
            return;
        }

        if (confirm('确定要清空所有记忆吗？此操作不可恢复！')) {
            if (confirm('再次确认：真的要从地球抹去这些记忆吗？')) {
                state.memories = [];
                saveMemories();
                showToast('已清空', '🗑️');
                renderSettingsPage();
            }
        }
    });
}

function exportToExcel() {
    const data = state.memories.map(m => ({
        '内容': m.content,
        '主导情绪': CONFIG.EMOTIONS[m.dominantEmotion]?.name || '',
        '情绪构成': m.emotions.map(e => `${CONFIG.EMOTIONS[e.type].name}(${Math.round(e.weight * 100)}%)`).join(' + '),
        '记录日期': new Date(m.timestamp).toLocaleDateString('zh-CN'),
        '记录时间': m.time,
        '时间戳': m.timestamp
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '拾光扭蛋');

    ws['!cols'] = [
        { wch: 40 },
        { wch: 10 },
        { wch: 30 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 }
    ];

    const fileName = `拾光扭蛋_备份_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showToast('导出成功！', '📤');
}

function importFromExcel(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(firstSheet);

            if (!json || json.length === 0) {
                showToast('文件为空', '❌');
                return;
            }

            const mode = document.querySelector('input[name="import-mode"]:checked').value;

            if (mode === 'replace') {
                state.memories = [];
            }

            let importedCount = 0;
            json.forEach(row => {
                if (row['内容'] && row['时间戳']) {
                    let emotions = [];
                    if (row['主导情绪']) {
                        const emotionType = Object.keys(CONFIG.EMOTIONS).find(
                            k => CONFIG.EMOTIONS[k].name === row['主导情绪']
                        );
                        if (emotionType) {
                            emotions = [{ type: emotionType, weight: 1 }];
                        }
                    }

                    state.memories.push({
                        id: generateId(),
                        content: row['内容'],
                        emotions: emotions,
                        mixColor: emotions.length > 0 ? mixColors(emotions) : 'rgba(255,255,255,0.1)',
                        dominantEmotion: emotions[0]?.type,
                        timestamp: parseInt(row['时间戳']) || Date.now(),
                        date: new Date(parseInt(row['时间戳']) || Date.now()).toISOString().split('T')[0],
                        time: row['记录时间'] || ''
                    });
                    importedCount++;
                }
            });

            saveMemories();
            showToast(`成功导入 ${importedCount} 条记忆！`, '📥');

            renderHomePage();
            renderSettingsPage();

        } catch (err) {
            console.error('导入失败:', err);
            showToast('导入失败，文件格式可能不正确', '❌');
        }
    };

    reader.onerror = () => {
        showToast('读取文件失败', '❌');
    };

    reader.readAsArrayBuffer(file);
}

// ==================== 工具 ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 初始化 ====================
function init() {
    loadMemories();
    loadGachaHistory();

    initNavigation();
    initRecordModal();
    initGacha();
    initArchiveFilters();
    initImportExport();

    renderHomePage();

    console.log('拾光扭蛋 已启动 💫');
}

document.addEventListener('DOMContentLoaded', init);
