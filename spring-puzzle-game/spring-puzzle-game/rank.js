// 排行榜数据管理
const RankManager = {
    // 获取所有成绩
    getAllScores: function() {
        try {
            const scores = localStorage.getItem('puzzleScores');
            return scores ? JSON.parse(scores) : [];
        } catch (e) {
            console.error('读取成绩失败:', e);
            return [];
        }
    },
    
    // 保存成绩（去掉部门字段）
    saveScore: function(score) {
        try {
            const scores = this.getAllScores();
            scores.push(score);
            
            // 按用时排序（时间越少排名越高）
            scores.sort((a, b) => a.time - b.time);
            
            // 只保留前1000个记录
            if (scores.length > 1000) {
                scores.splice(1000);
            }
            
            localStorage.setItem('puzzleScores', JSON.stringify(scores));
            return true;
        } catch (e) {
            console.error('保存成绩失败:', e);
            return false;
        }
    },
    
    // 获取今日成绩
    getTodayScores: function() {
        const today = new Date().toISOString().split('T')[0];
        const allScores = this.getAllScores();
        return allScores.filter(score => score.date.startsWith(today));
    },
    
    // 获取玩家个人最佳成绩（去掉部门信息）
    getPlayerBestScore: function(playerName) {
        const scores = this.getAllScores();
        const playerScores = scores.filter(score => score.name === playerName);
        
        if (playerScores.length === 0) return null;
        
        // 找到最佳成绩
        const bestScore = playerScores.reduce((best, current) => 
            current.time < best.time ? current : best
        );
        
        // 计算排名
        const allTimes = scores.map(s => s.time).sort((a, b) => a - b);
        const rank = allTimes.indexOf(bestScore.time) + 1;
        
        return {
            ...bestScore,
            rank: rank,
            totalPlayers: scores.length
        };
    }
};

// 加载排行榜
function loadRankings() {
    const rankList = document.getElementById('rank-list');
    
    // 显示加载中
    rankList.innerHTML = `
        <div class="loading-ranks">
            <i class="fas fa-spinner fa-spin"></i> 加载排行榜中...
        </div>
    `;
    
    // 延迟加载，模拟网络请求
    setTimeout(() => {
        const tab = document.querySelector('.rank-tab.active');
        if (tab) {
            const tabType = tab.dataset.tab;
            renderRankings(tabType);
        }
    }, 500);
    
    // 更新我的成绩信息
    updateMyRankInfo();
}

// 渲染排行榜（去掉部门榜）
function renderRankings(type) {
    const rankList = document.getElementById('rank-list');
    
    let scores = [];
    let title = '';
    
    switch(type) {
        case 'today':
            scores = RankManager.getTodayScores();
            title = '今日排行榜';
            break;
            
        default: // total 或默认
            scores = RankManager.getAllScores();
            title = '总排行榜';
    }
    
    // 只显示前20名
    const topScores = scores.slice(0, 20);
    
    let html = `<div class="rank-title"><h3>${title}</h3><p>共 ${scores.length} 人参与</p></div>`;
    
    if (topScores.length === 0) {
        html += `
            <div class="no-scores">
                <i class="fas fa-chart-bar"></i>
                <p>暂无成绩，快来成为第一个挑战者吧！</p>
            </div>
        `;
    } else {
        topScores.forEach((score, index) => {
            const rank = index + 1;
            const isMe = score.name === GameState.playerName;
            
            html += `
                <div class="rank-item ${isMe ? 'me' : ''}">
                    <div class="rank-number">
                        ${rank <= 3 ? 
                            `<i class="fas fa-medal" style="color: ${getRankColor(rank)}"></i>` : 
                            rank
                        }
                    </div>
                    <div class="rank-info">
                        <h3>${score.name}</h3>
                        <p>${formatDate(score.date)}</p>
                    </div>
                    <div class="rank-time">${score.time}秒</div>
                </div>
            `;
        });
    }
    
    rankList.innerHTML = html;
}

// 获取排名颜色
function getRankColor(rank) {
    switch(rank) {
        case 1: return '#ffd700'; // 金色
        case 2: return '#c0c0c0'; // 银色
        case 3: return '#cd7f32'; // 铜色
        default: return '#666';
    }
}

// 格式化日期
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        
        // 如果是无效日期
        if (isNaN(date.getTime())) {
            return '未知时间';
        }
        
        // 如果是今天
        if (date.toDateString() === now.toDateString()) {
            return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        
        // 如果是昨天
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return '昨天';
        }
        
        // 其他情况显示日期
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    } catch (e) {
        return '未知时间';
    }
}

// 更新我的成绩信息（去掉部门显示）
function updateMyRankInfo() {
    const myRankInfo = document.getElementById('my-rank-info');
    
    if (!GameState.playerName) {
        myRankInfo.innerHTML = `
            <div class="my-rank-detail">
                <p>您还没有成绩，快去挑战吧！</p>
            </div>
        `;
        return;
    }
    
    const bestScore = RankManager.getPlayerBestScore(GameState.playerName);
    
    if (!bestScore) {
        myRankInfo.innerHTML = `
            <div class="my-rank-detail">
                <p><strong>${GameState.playerName}</strong></p>
                <p class="no-score">暂无成绩记录</p>
            </div>
        `;
    } else {
        const percentage = Math.round((bestScore.rank - 1) / bestScore.totalPlayers * 100) || 0;
        myRankInfo.innerHTML = `
            <div class="my-rank-detail">
                <p><strong>${bestScore.name}</strong> <span class="rank-badge">第${bestScore.rank}名</span></p>
                <p>最佳成绩：<span class="best-time">${bestScore.time}秒</span></p>
                <p>挑战日期：${formatDate(bestScore.date)}</p>
                <p class="rank-info">超越${percentage}%的玩家</p>
            </div>
        `;
    }
}

// 保存成绩（从game.js调用）
function saveScore(score) {
    const success = RankManager.saveScore(score);
    
    if (success) {
        console.log('成绩保存成功');
    } else {
        console.error('成绩保存失败');
    }
}

// 获取存储的成绩（从game.js调用）
function getStoredScores() {
    return RankManager.getAllScores();
}

// 排行榜标签切换
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.rank-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有标签的active类
            tabs.forEach(t => t.classList.remove('active'));
            
            // 为当前标签添加active类
            this.classList.add('active');
            
            // 加载对应类型的排行榜
            const tabType = this.dataset.tab;
            renderRankings(tabType);
        });
    });
    
    // 初始加载排行榜
    if (document.getElementById('rank-screen').classList.contains('active')) {
        loadRankings();
    }
});

// 样式补充
const style = document.createElement('style');
style.textContent = `
    .rank-title {
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #ffe0b2;
    }
    
    .rank-title h3 {
        color: #f57c00;
        font-size: 24px;
        margin-bottom: 5px;
    }
    
    .rank-title p {
        color: #666;
        font-size: 14px;
    }
    
    .no-scores {
        text-align: center;
        padding: 50px 20px;
        color: #999;
    }
    
    .no-scores i {
        font-size: 50px;
        margin-bottom: 20px;
        color: #ffcc80;
    }
    
    .my-rank-detail {
        padding: 20px;
        background: #fff8e1;
        border-radius: 10px;
        margin-top: 10px;
    }
    
    .rank-badge {
        background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
        margin-left: 10px;
    }
    
    .best-time {
        color: #d32f2f;
        font-weight: bold;
        font-size: 18px;
    }
    
    .rank-info {
        font-size: 12px;
        color: #666;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px dashed #ffcc80;
    }
    
    .no-score {
        color: #f57c00;
        font-weight: bold;
        margin-top: 10px;
    }
    
    .loading-ranks {
        text-align: center;
        padding: 50px;
        color: #666;
    }
    
    .loading-ranks i {
        font-size: 40px;
        margin-bottom: 20px;
        color: #ff9800;
    }
    
    .rank-item {
        display: grid;
        grid-template-columns: 60px 1fr 100px;
        align-items: center;
        padding: 15px 20px;
        margin-bottom: 10px;
        background: #fafafa;
        border-radius: 10px;
        transition: all 0.3s ease;
    }
    
    .rank-item:hover {
        transform: translateX(5px);
        background: #fff8e1;
    }
    
    .rank-item.me {
        background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
        border: 2px solid #ffb300;
    }
    
    .rank-number {
        font-size: 24px;
        font-weight: bold;
        color: #ff9800;
        text-align: center;
    }
    
    .rank-info h3 {
        color: #333;
        margin-bottom: 5px;
    }
    
    .rank-info p {
        color: #666;
        font-size: 14px;
    }
    
    .rank-time {
        font-size: 18px;
        font-weight: bold;
        color: #1565c0;
        text-align: right;
    }
    
    .my-rank h3 {
        color: #f57c00;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #ffe0b2;
    }
    
    .rank-actions {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #eee;
    }
    
    .rank-footer {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #eee;
        font-size: 12px;
        color: #999;
        text-align: center;
    }
    
    /* 响应式设计 */
    @media (max-width: 768px) {
        .rank-item {
            grid-template-columns: 50px 1fr 80px;
            padding: 12px 15px;
        }
        
        .rank-number {
            font-size: 20px;
        }
        
        .rank-time {
            font-size: 16px;
        }
    }
    
    @media (max-width: 480px) {
        .rank-item {
            grid-template-columns: 40px 1fr 70px;
            padding: 10px 12px;
        }
        
        .rank-number {
            font-size: 18px;
        }
        
        .rank-info h3 {
            font-size: 14px;
        }
        
        .rank-info p {
            font-size: 12px;
        }
        
        .rank-time {
            font-size: 14px;
        }
    }
`;
document.head.appendChild(style);

// 将函数暴露给全局作用域，供game.js调用
window.saveScore = saveScore;
window.getStoredScores = getStoredScores;