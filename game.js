const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let totalCoins = parseInt(localStorage.getItem("cyber_coins")) || 0;
let highScore = parseInt(localStorage.getItem("cyber_highscore")) || 0;
let selectedCarIndex = parseInt(localStorage.getItem("cyber_selected_car")) || 0;
let unlockedCars = JSON.parse(localStorage.getItem("cyber_unlocked")) || [true, false, false];

const carsConfig = [
    { name: "Cyan Cyber", color: "#00ffcc", price: 0 },
    { name: "Neon Flame", color: "#ff3300", price: 3 },
    { name: "Royal Gold", color: "#ffd700", price: 5 }
];

let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    try {
        let osc = audioCtx.createOscillator();
        let gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        let now = audioCtx.currentTime;

        if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(40, now + 0.4);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'buy') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(800, now + 0.1);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch(e) {}
}

function updateLobbyUI() {
    const lCoins = document.getElementById("lobbyCoins");
    const lHigh = document.getElementById("lobbyHighScore");
    if (lCoins) lCoins.innerText = totalCoins;
    if (lHigh) lHigh.innerText = highScore;

    const grid = document.getElementById("garageGrid");
    if (!grid) return;
    grid.innerHTML = "";

    carsConfig.forEach((car, index) => {
        let card = document.createElement("div");
        let isUnlocked = unlockedCars[index];
        let isSelected = (selectedCarIndex === index);
        card.className = `car-card ${isSelected ? 'selected' : ''} ${isUnlocked ? 'unlocked' : ''}`;
        card.innerHTML = `
            <div class="car-preview" style="background: ${car.color}; box-shadow: 0 0 10px ${car.color}; width:40px; height:60px; margin:0 auto 8px auto; border-radius:6px;"></div>
            <div style="font-size:12px; font-weight:bold; margin-bottom:4px; color:#fff;">${car.name}</div>
            <div style="font-size:11px; color:${isUnlocked ? '#00ffcc' : '#ffd700'};">${isUnlocked ? (isSelected ? 'SELECTED' : 'SELECT') : '🔒 ' + car.price}</div>
        `;
        card.addEventListener("click", () => {
            initAudio();
            let msgBox = document.getElementById("msgBox");
            if (isUnlocked) {
                selectedCarIndex = index;
                localStorage.setItem("cyber_selected_car", selectedCarIndex);
                if (msgBox) msgBox.innerText = "";
                updateLobbyUI();
            } else {
                if (totalCoins >= car.price) {
                    totalCoins -= car.price;
                    unlockedCars[index] = true;
                    selectedCarIndex = index;
                    localStorage.setItem("cyber_coins", totalCoins);
                    localStorage.setItem("cyber_unlocked", JSON.stringify(unlockedCars));
                    localStorage.setItem("cyber_selected_car", selectedCarIndex);
                    playSound('buy');
                    if (msgBox) msgBox.innerText = "";
                    updateLobbyUI();
                } else {
                    if (msgBox) msgBox.innerText = "Not enough coins! Collect more in game.";
                }
            }
        });
        grid.appendChild(card);
    });
}
updateLobbyUI();

const startBtn = document.getElementById("startBtn");
if (startBtn) {
    startBtn.addEventListener("click", () => {
        initAudio();
        const lobbyScreen = document.getElementById("lobbyScreen");
        if (lobbyScreen) lobbyScreen.style.display = "none";
        resetGame();
        gameRunning = true;
        loop();
    });
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 125;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const scoreVal = document.getElementById("scoreVal");
const highScoreVal = document.getElementById("highScoreVal");
const coinVal = document.getElementById("coinVal");
if (highScoreVal) highScoreVal.innerText = highScore;

let score = 0;
let sessionCoins = 0;
let isGameOver = false;
let gameRunning = false;
let baseSpeed = 4;
let player = {
    x: canvas.width / 2 - 18,
    y: canvas.height - 90,
    width: 36,
    height: 58,
    currentSpeed: 7
};
let obstacles = [];
let coins = [];
let frameCount = 0;
let leftPressed = false;
let rightPressed = false;

window.addEventListener("keydown", (e) => {
    initAudio();
    if (e.key === "ArrowLeft" || e.key === "a") leftPressed = true;
    if (e.key === "ArrowRight" || e.key === "d") rightPressed = true;
    if (e.key === " " && isGameOver) goToLobby();
});

window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") leftPressed = false;
    if (e.key === "ArrowRight" || e.key === "d") rightPressed = false;
});

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

if (leftBtn) {
    leftBtn.addEventListener("touchstart", (e) => { e.preventDefault(); initAudio(); leftPressed = true; });
    leftBtn.addEventListener("touchend", (e) => { e.preventDefault(); leftPressed = false; });
    leftBtn.addEventListener("mousedown", () => { initAudio(); leftPressed = true; });
    leftBtn.addEventListener("mouseup", () => { leftPressed = false; });
    leftBtn.addEventListener("mouseleave", () => { leftPressed = false; });
}

if (rightBtn) {
    rightBtn.addEventListener("touchstart", (e) => { e.preventDefault(); initAudio(); rightPressed = true; });
    rightBtn.addEventListener("touchend", (e) => { e.preventDefault(); rightPressed = false; });
    rightBtn.addEventListener("mousedown", () => { initAudio(); rightPressed = true; });
    rightBtn.addEventListener("mouseup", () => { rightPressed = false; });
    rightBtn.addEventListener("mouseleave", () => { rightPressed = false; });
}

function goToLobby() {
    isGameOver = false;
    gameRunning = false;
    const lobbyScreen = document.getElementById("lobbyScreen");
    if (lobbyScreen) lobbyScreen.style.display = "flex";
    updateLobbyUI();
}

function resetGame() {
    score = 0;
    sessionCoins = 0;
    isGameOver = false;
    obstacles = [];
    coins = [];
    frameCount = 0;
    player.x = canvas.width / 2 - 18;
}

function getCurrentSpeed() {
    return baseSpeed + Math.floor(score / 100);
}

function spawnEntity() {
    let width = 36;
    let height = 58;
    let x = Math.random() * (canvas.width - width - 40) + 20;
    let currentSpeed = getCurrentSpeed();
    if (Math.random() < 0.75) {
        obstacles.push({ x: x, y: -90, width: width, height: height, speed: currentSpeed });
    } else {
        coins.push({ x: x + 6, y: -90, radius: 12, speed: currentSpeed });
    }
}

function update() {
    if (isGameOver || !gameRunning) return;

    if (leftPressed) player.x -= player.currentSpeed;
    if (rightPressed) player.x += player.currentSpeed;

    if (player.x < 10) player.x = 10;
    if (player.x + player.width > canvas.width - 10) player.x = canvas.width - player.width - 10;

    frameCount++;
    if (frameCount % Math.max(25, 50 - Math.floor(score / 50)) === 0) {
        spawnEntity();
    }

    // Obstacles collision
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].y += obstacles[i].speed;

        if (player.x < obstacles[i].x + obstacles[i].width &&
            player.x + player.width > obstacles[i].x &&
            player.y < obstacles[i].y + obstacles[i].height &&
            player.y + player.height > obstacles[i].y) {
            isGameOver = true;
            gameRunning = false;
            playSound('crash');
            totalCoins += sessionCoins;
            localStorage.setItem("cyber_coins", totalCoins);
            if (score > highScore) {
                highScore = score;
                localStorage.setItem("cyber_highscore", highScore);
            }
        }

        if (obstacles[i].y > canvas.height) {
            obstacles.splice(i, 1);
            score += 10;
        }
    }

    // Coins collection
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].y += coins[i].speed;
        let dx = (player.x + player.width / 2) - coins[i].x;
        let dy = (player.y + player.height / 2) - coins[i].y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.width / 2 + coins[i].radius) {
            sessionCoins += 1;
            playSound('coin');
            coins.splice(i, 1);
        } else if (coins[i].y > canvas.height) {
            coins.splice(i, 1);
        }
    }

    if (scoreVal) scoreVal.innerText = score;
    if (highScoreVal) highScoreVal.innerText = highScore;
    if (coinVal) coinVal.innerText = sessionCoins;
}

function drawPlayerCar(x, y, w, h, primaryColor) {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = primaryColor;
    ctx.fillStyle = primaryColor;
    ctx.fillRect(x + 4, y + 10, w - 8, h - 20);
    ctx.fillRect(x, y + 15, w, h - 30);
    ctx.fillStyle = "#0b0b1a";
    ctx.fillRect(x + 6, y + 14, w - 12, 12);
    ctx.fillRect(x + 8, y + 32, w - 16, 10);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 3, y + 2, 6, 4);
    ctx.fillRect(x + w - 9, y + 2, 6, 4);
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Road Grid Effect
    ctx.strokeStyle = "#1a1a3a";
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }

    // Draw Player Car
    let activeCarColor = carsConfig[selectedCarIndex] ? carsConfig[selectedCarIndex].color : "#00ffcc";
    drawPlayerCar(player.x, player.y, player.width, player.height, activeCarColor);

    // Draw Obstacles
    for (let obs of obstacles) {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ff0055";
        ctx.fillStyle = "#ff0055";
        ctx.fillRect(obs.x + 4, obs.y + 10, obs.width - 8, obs.height - 20);
        ctx.fillRect(obs.x, obs.y + 15, obs.width, obs.height - 30);
        ctx.restore();
    }

    // Draw Coins
    for (let c of coins) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ffd700";
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Game Over Screen Text on Canvas
    if (isGameOver) {
        ctx.fillStyle = "rgba(11, 11, 26, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ff0055";
        ctx.font = "bold 32px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px 'Segoe UI', sans-serif";
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
        ctx.fillText("Tap or Click anywhere to return to Lobby", canvas.width / 2, canvas.height / 2 + 45);
    }
}

canvas.addEventListener("click", () => {
    initAudio();
    if (isGameOver) goToLobby();
});
canvas.addEventListener("touchstart", () => {
    initAudio();
    if (isGameOver) goToLobby();
});

function loop() {
    update();
    draw();
    if (gameRunning || isGameOver) {
        requestAnimationFrame(loop);
    }
}
