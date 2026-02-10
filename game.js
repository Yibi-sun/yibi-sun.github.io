// 游戏状态
const GameState = {
    currentLevel: 1,
    totalTime: 0,
    levelStartTime: 0,
    levelTime: 0,
    timer: null,
    timeLeft: 120,
    playerName: '',
    hintCount: 3,
    puzzleSize: 4,
    puzzlePieces: [],
    emptyIndex: 15, // 初始空白块位置
    isGameActive: false
};

// 游戏配置 - 使用在线图片
const GameConfig = {
    levels: [
        { size: 4, time: 120, image: 'puzzle1.jpg' },
        { size: 6, time: 120, image: 'puzzle2.jpg' },
        { size: 8, time: 120, image: 'puzzle3.jpg' }
    ],
    maxHints: 3
};

// DOM元素
const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    levelComplete: document.getElementById('level-complete-screen'),
    gameOver: document.getElementById('game-over-screen'),
    finalComplete: document.getElementById('final-complete-screen'),
    rank: document.getElementById('rank-screen')
};

// 初始化游戏
function initGame() {
    loadPlayerInfo();
    setupEventListeners();
    
    // 预加载图片
    preloadImages();
    
    // 检查是否有未完成的游戏
    const savedGame = localStorage.getItem('puzzleGameSave');
    if (savedGame) {
        const confirmResume = confirm('检测到未完成的游戏，是否继续？');
        if (confirmResume) {
            loadGameState(JSON.parse(savedGame));
        } else {
            localStorage.removeItem('puzzleGameSave');
        }
    }
}

// 预加载图片
function preloadImages() {
    GameConfig.levels.forEach(level => {
        const img = new Image();
        img.src = level.image;
        img.crossOrigin = 'anonymous'; // 允许跨域
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 开始按钮
    document.getElementById('start-btn').addEventListener('click', startGame);
    
    // 排行榜按钮
    document.getElementById('view-rank-btn').addEventListener('click', showRankings);
    document.getElementById('view-rank-btn2').addEventListener('click', showRankings);
    
    // 游戏控制按钮
    document.getElementById('hint-btn').addEventListener('click', useHint);
    document.getElementById('restart-btn').addEventListener('click', restartLevel);
    document.getElementById('quit-btn').addEventListener('click', quitGame);
    
    // 关卡完成按钮
    document.getElementById('next-level-btn').addEventListener('click', nextLevel);
    
    // 游戏结束按钮
    document.getElementById('restart-game-btn').addEventListener('click', restartGame);
    document.getElementById('back-to-home-btn').addEventListener('click', backToHome);
    
    // 最终完成按钮
    document.getElementById('submit-score-btn').addEventListener('click', submitScore);
    document.getElementById('play-again-btn').addEventListener('click', playAgain);
    
    // 分享按钮
    document.getElementById('share-wechat').addEventListener('click', shareToWeChat);
    document.getElementById('share-moment').addEventListener('click', shareToMoment);
    
    // 从排行榜返回
    document.getElementById('back-from-rank-btn').addEventListener('click', backFromRankings);
    
    // 输入框回车事件
    document.getElementById('player-name').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') startGame();
    });
}

// 开始游戏
function startGame() {
    const playerName = document.getElementById('player-name').value.trim();
    
    if (!playerName) {
        alert('请输入您的昵称');
        document.getElementById('player-name').focus();
        return;
    }
    
    GameState.playerName = playerName;
    
    // 保存玩家信息
    localStorage.setItem('puzzlePlayerName', playerName);
    
    // 重置游戏状态
    GameState.currentLevel = 1;
    GameState.totalTime = 0;
    GameState.hintCount = GameConfig.maxHints;
    
    showScreen('game');
    startLevel();
}

// 开始关卡
function startLevel() {
    const levelConfig = GameConfig.levels[GameState.currentLevel - 1];
    GameState.puzzleSize = levelConfig.size;
    GameState.timeLeft = levelConfig.time;
    GameState.levelStartTime = Date.now();
    GameState.isGameActive = true;
    
    // 更新UI
    updateLevelInfo();
    createPuzzle();
    startTimer();
    
    // 保存游戏状态
    saveGameState();
}

// 创建拼图
function createPuzzle() {
    const container = document.getElementById('puzzle-container');
    const size = GameState.puzzleSize;
    const totalPieces = size * size;
    
    // 设置容器网格
    container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    
    // 清空容器
    container.innerHTML = '';
    
    // 创建拼图块
    GameState.puzzlePieces = [];
    const levelConfig = GameConfig.levels[GameState.currentLevel - 1];
    const pieceSize = 100 / size;
    
    // 设置原图
    document.getElementById('original-img').src = levelConfig.image;
    document.getElementById('original-img').crossOrigin = 'anonymous';
    
    for (let i = 0; i < totalPieces; i++) {
        const piece = document.createElement('div');
        piece.className = 'puzzle-piece';
        
        // 计算背景位置
        const row = Math.floor(i / size);
        const col = i % size;
        
        piece.style.backgroundImage = `url('${levelConfig.image}')`;
        piece.style.backgroundPosition = `${-col * pieceSize}% ${-row * pieceSize}%`;
        piece.style.backgroundSize = `${size * 100}%`;
        
        piece.dataset.index = i;
        piece.dataset.correctIndex = i;
        
        piece.addEventListener('click', () => handlePieceClick(i));
        
        container.appendChild(piece);
        GameState.puzzlePieces.push({
            element: piece,
            currentIndex: i,
            correctIndex: i,
            isEmpty: (i === totalPieces - 1) // 最后一块是空白块
        });
    }
    
    // 设置空白块
    GameState.emptyIndex = totalPieces - 1;
    GameState.puzzlePieces[GameState.emptyIndex].element.classList.add('empty');
    GameState.puzzlePieces[GameState.emptyIndex].element.style.backgroundImage = 'none';
    
    // 打乱拼图
    shufflePuzzle();
}

// 打乱拼图（确保有解）
function shufflePuzzle() {
    const size = GameState.puzzleSize;
    const totalPieces = size * size;
    let shuffleCount = size * 100; // 打乱次数
    
    // 使用合法的移动来打乱
    for (let i = 0; i < shuffleCount; i++) {
        const possibleMoves = getPossibleMoves();
        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        movePiece(randomMove);
    }
    
    // 检查是否已经完成（概率极低，但需要处理）
    if (checkPuzzleComplete()) {
        // 如果打乱后刚好完成，再移动一次
        const possibleMoves = getPossibleMoves();
        if (possibleMoves.length > 0) {
            movePiece(possibleMoves[0]);
        }
    }
}

// 获取可移动的拼图块索引
function getPossibleMoves() {
    const size = GameState.puzzleSize;
    const emptyRow = Math.floor(GameState.emptyIndex / size);
    const emptyCol = GameState.emptyIndex % size;
    const moves = [];
    
    // 上
    if (emptyRow > 0) moves.push(GameState.emptyIndex - size);
    // 下
    if (emptyRow < size - 1) moves.push(GameState.emptyIndex + size);
    // 左
    if (emptyCol > 0) moves.push(GameState.emptyIndex - 1);
    // 右
    if (emptyCol < size - 1) moves.push(GameState.emptyIndex + 1);
    
    return moves;
}

// 处理拼图块点击
function handlePieceClick(clickedIndex) {
    if (!GameState.isGameActive) return;
    
    const size = GameState.puzzleSize;
    const emptyRow = Math.floor(GameState.emptyIndex / size);
    const emptyCol = GameState.emptyIndex % size;
    const clickedRow = Math.floor(clickedIndex / size);
    const clickedCol = clickedIndex % size;
    
    // 检查是否相邻
    const isAdjacent = 
        (Math.abs(emptyRow - clickedRow) === 1 && emptyCol === clickedCol) ||
        (Math.abs(emptyCol - clickedCol) === 1 && emptyRow === clickedRow);
    
    if (isAdjacent) {
        movePiece(clickedIndex);
        
        // 检查是否完成
        if (checkPuzzleComplete()) {
            completeLevel();
        }
    }
}

// 移动拼图块
function movePiece(fromIndex) {
    const fromPiece = GameState.puzzlePieces[fromIndex];
    const emptyPiece = GameState.puzzlePieces[GameState.emptyIndex];
    
    // 交换位置
    [fromPiece.currentIndex, emptyPiece.currentIndex] = 
    [emptyPiece.currentIndex, fromPiece.currentIndex];
    
    // 更新UI
    updatePuzzlePosition(fromIndex, GameState.emptyIndex);
    
    // 更新空白块索引
    GameState.emptyIndex = fromIndex;
    
    // 保存游戏状态
    saveGameState();
}

// 更新拼图位置
function updatePuzzlePosition(fromIndex, toIndex) {
    const fromPiece = GameState.puzzlePieces[fromIndex];
    const emptyPiece = GameState.puzzlePieces[toIndex];
    
    // 移除空白样式
    emptyPiece.element.classList.remove('empty');
    emptyPiece.element.style.backgroundImage = fromPiece.element.style.backgroundImage;
    emptyPiece.element.style.backgroundPosition = fromPiece.element.style.backgroundPosition;
    
    // 添加空白样式
    fromPiece.element.classList.add('empty');
    fromPiece.element.style.backgroundImage = 'none';
}

// 检查拼图是否完成
function checkPuzzleComplete() {
    for (let i = 0; i < GameState.puzzlePieces.length; i++) {
        if (GameState.puzzlePieces[i].currentIndex !== GameState.puzzlePieces[i].correctIndex) {
            return false;
        }
    }
    return true;
}

// 开始计时器
function startTimer() {
    clearInterval(GameState.timer);
    
    GameState.timer = setInterval(() => {
        if (!GameState.isGameActive) return;
        
        GameState.timeLeft--;
        updateTimer();
        
        if (GameState.timeLeft <= 0) {
            gameOver();
        }
        
        // 计算当前关卡用时
        GameState.levelTime = Math.floor((Date.now() - GameState.levelStartTime) / 1000);
        
        // 更新当前关卡用时显示
        document.getElementById('current-time').textContent = GameState.levelTime;
        
        // 更新进度条
        const levelConfig = GameConfig.levels[GameState.currentLevel - 1];
        const progress = (GameState.timeLeft / levelConfig.time) * 100;
        document.getElementById('time-progress').style.width = `${progress}%`;
        
        // 进度条颜色变化
        if (progress < 30) {
            document.getElementById('time-progress').style.background = 'linear-gradient(90deg, #f44336 0%, #ef5350 100%)';
        } else if (progress < 60) {
            document.getElementById('time-progress').style.background = 'linear-gradient(90deg, #ff9800 0%, #ffb74d 100%)';
        }
    }, 1000);
}

// 更新计时器显示
function updateTimer() {
    document.getElementById('time').textContent = GameState.timeLeft;
}

// 更新关卡信息
function updateLevelInfo() {
    document.getElementById('current-level').textContent = GameState.currentLevel;
    document.getElementById('grid-size').textContent = `${GameState.puzzleSize}×${GameState.puzzleSize}`;
    document.getElementById('hint-count').textContent = GameState.hintCount;
    document.getElementById('total-time').textContent = GameState.totalTime;
}

// 使用提示
function useHint() {
    if (!GameState.isGameActive || GameState.hintCount <= 0) return;
    
    GameState.hintCount--;
    document.getElementById('hint-count').textContent = GameState.hintCount;
    
    // 找到第一个位置错误的拼图块
    for (let i = 0; i < GameState.puzzlePieces.length; i++) {
        if (GameState.puzzlePieces[i].currentIndex !== GameState.puzzlePieces[i].correctIndex && 
            !GameState.puzzlePieces[i].isEmpty) {
            
            // 高亮显示该拼图块
            const piece = GameState.puzzlePieces[i].element;
            piece.style.boxShadow = '0 0 20px #ffeb3b';
            piece.style.border = '3px solid #ffeb3b';
            
            setTimeout(() => {
                piece.style.boxShadow = '';
                piece.style.border = '';
            }, 2000);
            
            break;
        }
    }
}

// 重新开始当前关卡
function restartLevel() {
    if (confirm('确定要重新开始当前关卡吗？当前进度将会丢失。')) {
        GameState.timeLeft = GameConfig.levels[GameState.currentLevel - 1].time;
        GameState.levelStartTime = Date.now();
        createPuzzle();
        updateTimer();
    }
}

// 退出游戏
function quitGame() {
    if (confirm('确定要退出游戏吗？当前进度将会保存。')) {
        saveGameState();
        showScreen('start');
        clearInterval(GameState.timer);
        GameState.isGameActive = false;
    }
}

// 关卡完成
function completeLevel() {
    clearInterval(GameState.timer);
    GameState.isGameActive = false;
    
    // 计算关卡用时
    GameState.levelTime = Math.floor((Date.now() - GameState.levelStartTime) / 1000);
    GameState.totalTime += GameState.levelTime;
    
    // 更新UI
    document.getElementById('complete-level').textContent = GameState.currentLevel;
    document.getElementById('level-time').textContent = GameState.levelTime;
    document.getElementById('cumulative-time').textContent = GameState.totalTime;
    
    // 显示关卡完成界面
    showScreen('level-complete');
    
    // 如果是最后一关，显示最终完成界面
    if (GameState.currentLevel === GameConfig.levels.length) {
        setTimeout(() => {
            finalComplete();
        }, 2000);
    }
}

// 下一关
function nextLevel() {
    GameState.currentLevel++;
    showScreen('game');
    startLevel();
}

// 游戏结束
function gameOver() {
    clearInterval(GameState.timer);
    GameState.isGameActive = false;
    
    document.getElementById('completed-levels').textContent = GameState.currentLevel - 1;
    document.getElementById('best-time').textContent = GameState.totalTime;
    
    showScreen('game-over');
    
    // 清除保存的游戏状态
    localStorage.removeItem('puzzleGameSave');
}

// 最终完成
function finalComplete() {
    document.getElementById('final-total-time').textContent = GameState.totalTime;
    
    // 估算排名
    const scores = getStoredScores();
    let estimatedRank = 1;
    for (const score of scores) {
        if (score.time < GameState.totalTime) {
            estimatedRank++;
        }
    }
    document.getElementById('estimated-rank').textContent = estimatedRank;
    
    showScreen('final-complete');
}

// 重新开始游戏
function restartGame() {
    GameState.currentLevel = 1;
    GameState.totalTime = 0;
    GameState.hintCount = GameConfig.maxHints;
    
    showScreen('game');
    startLevel();
}

// 返回首页
function backToHome() {
    showScreen('start');
}

// 再次游戏
function playAgain() {
    GameState.currentLevel = 1;
    GameState.totalTime = 0;
    GameState.hintCount = GameConfig.maxHints;
    
    showScreen('game');
    startLevel();
}

// 提交成绩
function submitScore() {
    const score = {
        name: GameState.playerName,
        time: GameState.totalTime,
        date: new Date().toISOString(),
        level: GameState.currentLevel
    };
    
    // 存储成绩
    saveScore(score);
    
    // 清除保存的游戏状态
    localStorage.removeItem('puzzleGameSave');
    
    // 显示排行榜
    showRankings();
}

// 显示排行榜
function showRankings() {
    showScreen('rank');
    loadRankings();
}

// 从排行榜返回
function backFromRankings() {
    if (GameState.currentLevel > 0 && GameState.isGameActive) {
        showScreen('game');
    } else {
        showScreen('start');
    }
}

// 显示指定屏幕
function showScreen(screenName) {
    // 隐藏所有屏幕
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    // 显示指定屏幕
    screens[screenName].classList.add('active');
}

// 加载玩家信息
function loadPlayerInfo() {
    const savedName = localStorage.getItem('puzzlePlayerName');
    
    if (savedName) {
        document.getElementById('player-name').value = savedName;
    }
}

// 保存游戏状态
function saveGameState() {
    const gameState = {
        currentLevel: GameState.currentLevel,
        totalTime: GameState.totalTime,
        timeLeft: GameState.timeLeft,
        levelStartTime: GameState.levelStartTime,
        hintCount: GameState.hintCount,
        puzzlePieces: GameState.puzzlePieces.map(p => ({
            currentIndex: p.currentIndex,
            correctIndex: p.correctIndex,
            isEmpty: p.isEmpty
        })),
        emptyIndex: GameState.emptyIndex,
        playerName: GameState.playerName
    };
    
    localStorage.setItem('puzzleGameSave', JSON.stringify(gameState));
}

// 加载游戏状态
function loadGameState(savedState) {
    Object.assign(GameState, savedState);
    
    // 恢复玩家信息
    document.getElementById('player-name').value = GameState.playerName;
    
    showScreen('game');
    continueLevel();
}

// 继续游戏
function continueLevel() {
    const levelConfig = GameConfig.levels[GameState.currentLevel - 1];
    GameState.isGameActive = true;
    
    updateLevelInfo();
    recreatePuzzle();
    
    // 重新计算剩余时间
    const elapsed = Math.floor((Date.now() - GameState.levelStartTime) / 1000);
    GameState.timeLeft = levelConfig.time - elapsed;
    if (GameState.timeLeft < 0) GameState.timeLeft = 0;
    
    updateTimer();
    startTimer();
}

// 重新创建拼图（从保存状态）
function recreatePuzzle() {
    const container = document.getElementById('puzzle-container');
    const size = GameState.puzzleSize;
    const totalPieces = size * size;
    
    // 设置容器网格
    container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    
    // 清空容器
    container.innerHTML = '';
    
    // 获取当前关卡的图片
    const levelConfig = GameConfig.levels[GameState.currentLevel - 1];
    const pieceSize = 100 / size;
    
    // 设置原图
    document.getElementById('original-img').src = levelConfig.image;
    document.getElementById('original-img').crossOrigin = 'anonymous';
    
    // 重新创建拼图块
    const newPieces = [];
    for (let i = 0; i < totalPieces; i++) {
        const piece = document.createElement('div');
        piece.className = 'puzzle-piece';
        
        // 从保存的状态中获取信息
        const savedPiece = GameState.puzzlePieces[i];
        
        // 计算背景位置（基于正确位置）
        const correctRow = Math.floor(savedPiece.correctIndex / size);
        const correctCol = savedPiece.correctIndex % size;
        
        piece.style.backgroundImage = `url('${levelConfig.image}')`;
        piece.style.backgroundPosition = `${-correctCol * pieceSize}% ${-correctRow * pieceSize}%`;
        piece.style.backgroundSize = `${size * 100}%`;
        
        piece.dataset.index = i;
        piece.dataset.correctIndex = savedPiece.correctIndex;
        
        if (savedPiece.isEmpty) {
            piece.classList.add('empty');
            piece.style.backgroundImage = 'none';
        }
        
        piece.addEventListener('click', () => handlePieceClick(i));
        
        container.appendChild(piece);
        
        newPieces.push({
            element: piece,
            currentIndex: savedPiece.currentIndex,
            correctIndex: savedPiece.correctIndex,
            isEmpty: savedPiece.isEmpty
        });
    }
    
    GameState.puzzlePieces = newPieces;
}

// 分享到微信
function shareToWeChat() {
    const shareData = {
        title: '春节拼图挑战赛',
        desc: `我在春节拼图挑战赛中用时${GameState.totalTime}秒完成全部关卡！快来挑战吧！`,
        link: window.location.href,
        imgUrl: 'share.png'
    };
    
    alert('请点击微信右上角分享给好友\n\n分享文案已复制到剪贴板');
    
    // 复制分享文案到剪贴板
    const shareText = `【春节拼图挑战赛】我用了${GameState.totalTime}秒完成全部关卡！你也来试试吧：${window.location.href}`;
    copyToClipboard(shareText);
}

// 分享到朋友圈
function shareToMoment() {
    alert('请点击微信右上角分享到朋友圈\n\n分享文案已复制到剪贴板');
    
    const shareText = `春节拼图挑战赛，我用了${GameState.totalTime}秒完成！挑战链接：${window.location.href}`;
    copyToClipboard(shareText);
}

// 复制到剪贴板
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// 页面加载完成后初始化游戏
window.addEventListener('DOMContentLoaded', initGame);

// 保存成绩函数（供其他文件调用）
function saveScore(score) {
    // 这个函数由rank.js提供实现
    if (typeof window.saveScore === 'function') {
        window.saveScore(score);
    }
}

// 获取存储的成绩（供其他文件调用）
function getStoredScores() {
    // 这个函数由rank.js提供实现
    if (typeof window.getStoredScores === 'function') {
        return window.getStoredScores();
    }
    return [];
}